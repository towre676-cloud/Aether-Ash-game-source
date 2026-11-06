import { SoftwareSNES, BUTTON, STEP } from './software.js';

/** SnesJs on a worker thread, paced by the display.
 *
 * Each animation frame converts elapsed time into whole emulated frames and
 * asks the core thread for them; the reply's last frame is drawn at once and
 * its audio goes to an AudioWorklet ring buffer. Emulation time is never
 * skipped while the game is in the foreground: a reply that arrives late
 * simply makes the next request larger. Only a stall longer than MAX_DEBT
 * (a suspended tab, a debugger) drops time, and that drop is reported.
 * Input changes are sent with the next request and stamped so telemetry can
 * pair each one with the first frame that consumed it. */
const MAX_BACKLOG_MS = 100, MAX_DEBT_MS = 250, LOOKAHEAD_MS = 3;

export class ThreadedSNES extends SoftwareSNES {
  static async create(canvas, bytes, {sram, state, debug = false, onLog = () => {}, onPauseRequest = () => {}, capture = null, immediateInput = false} = {}) {
    const self = new ThreadedSNES(canvas, onLog, onPauseRequest, {threaded: true});
    self.debug = !!debug; self.capture = capture; self.immediateInput = !!immediateInput;
    self.worker = new Worker(new URL('./core-worker.js', import.meta.url), {type: 'module'});
    self.worker.onmessage = ({data}) => self._message(data);
    self.worker.onerror = event => { self.pause(); onLog({level: 'error', source: 'core', message: 'RuntimeError: SnesJs worker ' + (event.message || 'failed')}); };
    await self._initializeThreadedAudio();
    const init = {rom: bytes.slice(), sampleRate: self.audio?.sampleRate || 48000};
    if (sram) init.sram = new Uint8Array(await sram.arrayBuffer());
    if (state) init.state = await state.text();
    const {crc} = await self._request('init', init, [init.rom.buffer]);
    self.romCRC = crc;
    self._bindKeys();
    self.running = true; self.lastTick = performance.now();
    self.raf = requestAnimationFrame(t => self._frame(t));
    // rAF stops when the page is hidden (we pause then) and is throttled in
    // some headless browsers; a slow watchdog keeps a visible game moving.
    self.watchdog = setInterval(() => { if (performance.now() - self.lastRaf > 60) self._frame(performance.now(), true); }, 20);
    onLog({level: 'info', source: 'core', message: 'SnesJs on a worker thread; display-paced; AudioWorklet output'});
    return self;
  }

  constructor(...args) {
    super(...args);
    this.buttons = 0; this.sessionFrame = 0; this.inflight = 0; this.ready = []; this.applied = []; this.requests = new Map(); this.nextId = 1;
    this.lastRaf = 0; this.tokens = []; this.pendingButtons = 0; this.generation = 0; this.immediateInput = false; this.lastAudio = {underruns: 0, resyncs: 0}; this.frames = 0;
  }

  async _initializeThreadedAudio() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      this.audio = new Context({latencyHint: 'interactive'});
      this.gain = this.audio.createGain(); this.gain.gain.value = 0; this.gain.connect(this.audio.destination);
      await this.audio.audioWorklet.addModule(new URL('./audio-worklet.js', import.meta.url));
      this.sink = new AudioWorkletNode(this.audio, 'snes-audio', {numberOfInputs: 0, outputChannelCount: [2]});
      this.sink.connect(this.gain);
      this.sink.port.onmessage = ({data}) => this._audioReport(data);
      this.audio.resume().catch(() => {});
    } catch (error) {
      this.sink = null;
      this.onLog({level: 'warn', source: 'core', message: 'Game effects audio unavailable: ' + error.message});
    }
  }

  _audioReport({queuedMs, underruns, resyncs}) {
    this.audioState = {queuedMs, underruns, resyncs};
    if (this.capture && this.running) {
      this.capture.recordAudio(queuedMs, underruns - this.lastAudio.underruns, resyncs - this.lastAudio.resyncs);
    }
    this.lastAudio = {underruns, resyncs};
  }

  _request(type, payload = {}, transfer = []) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.requests.set(id, {resolve, reject});
      this.worker.postMessage({id, type, ...payload}, transfer);
    });
  }

  _message(data) {
    if (data.log !== undefined) { this.onLog({level: 'info', source: 'core', message: data.log}); return; }
    const request = this.requests.get(data.id); if (!request) return;
    this.requests.delete(data.id);
    if (data.ok) request.resolve(data.value); else request.reject(new Error(data.error));
  }

  _frame(now, fromWatchdog = false) {
    if (this.closed) return;
    if (!fromWatchdog) { this.lastRaf = now; this.raf = requestAnimationFrame(t => this._frame(t)); }
    // A completed old picture must never add another refresh of latency.
    // All frames are still simulated and their audio is delivered; only
    // superseded pictures are omitted, as on a missed display refresh.
    while (this.ready.length > 1) this._recycle(this.ready.shift().pixels);
    if (this.ready.length) this._draw(this.ready.shift());
    this._pump(now);
  }

  /** Convert elapsed time into frame requests. A frame may be requested up
   * to LOOKAHEAD_MS before it is due, so the core thread starts on it as soon
   * as it is free instead of waiting for the next vsync; emulated time still
   * advances exactly one frame per 1/60 s of wall time. */
  _pump(now) {
    if (!this.running) { this.lastTick = now; this.accumulator = 0; return; }
    const elapsed = Math.max(0, now - this.lastTick); this.lastTick = now;
    let discarded = 0;
    if (elapsed > MAX_DEBT_MS) discarded = elapsed; else this.accumulator += elapsed;
    // Keep at most one frame in the worker mailbox. Multi-frame jobs and a
    // second queued job both bake an old button state into future frames.
    // Catch up by requesting individual frames as replies arrive, sampling
    // the latest input before each one.
    if (this.accumulator > MAX_BACKLOG_MS) {
      discarded += this.accumulator - MAX_BACKLOG_MS;
      this.accumulator = MAX_BACKLOG_MS;
    }
    if (!this.inflight && this.accumulator >= STEP - LOOKAHEAD_MS) {
      this.accumulator -= STEP;
      this._gamepad();
      if (!this.running) return;
      const generation = this.generation;
      let buttons = this.buttons | this.pendingButtons;
      // A new held direction wins over a released, latched opposite.
      for (const [a, b] of [[BUTTON.left, BUTTON.right], [BUTTON.up, BUTTON.down]]) {
        const both = (1 << a) | (1 << b);
        if ((buttons & both) === both) {
          const held = this.buttons & both;
          buttons = (buttons & ~both) | (held === both ? 0 : held);
        }
      }
      this.pendingButtons = 0;
      const tokens = [], waiting = [];
      for (const change of this.tokens) {
        if ((buttons & change.changed) === (change.mask & change.changed)) tokens.push(change.token);
        else if ((this.buttons & change.changed) === (change.mask & change.changed)) waiting.push(change);
        // A newer contradictory input may cancel an unconsumed transition.
        // It has no consuming frame and must not become a fake latency sample.
      }
      this.tokens = waiting;
      this.inflight++;
      this._request('run', {frames: 1, buttons})
        .then(result => this._arrive(result, tokens, generation))
        .catch(error => { this.pause(); this.onLog({level: 'error', source: 'core', message: 'RuntimeError: SnesJs ' + error.message}); })
        .finally(() => { this.inflight--; if (!this.closed) this._pump(performance.now()); });
    }
    this.capture?.recordTimingDiscard(discarded);
  }

  _arrive({pixels, audio, durations}, tokens, generation = this.generation) {
    // Audio and frame accounting happen on arrival, so nothing is lost when
    // two replies land between vsyncs; only the newest picture is drawn.
    if (this.closed) return;
    for (const ms of durations) this.capture?.recordSimulationFrame(ms);
    this.lastFrameMs = durations[durations.length - 1];
    const first = this.sessionFrame + 1;
    this.sessionFrame += durations.length; this.frames = this.sessionFrame;
    if (generation !== this.generation || !this.running) { this._recycle(pixels); return; }
    if (this.running && this.sink && this.audio.state === 'running') this.sink.port.postMessage({type: 'samples', samples: audio}, [audio.buffer]);
    if (tokens.length) this.applied.push({tokens, first});
    if (this.immediateInput && this.applied.length) {
      // Developer comparison mode only; the default keeps submissions on
      // the display clock. Submit an input response as soon as it is ready, rather than holding
      // it for the next JS animation callback. Chromium still controls the
      // actual compositor/display time. Recycle older queued pictures so a
      // later animation callback cannot paint an earlier state over it.
      while (this.ready.length) this._recycle(this.ready.shift().pixels);
      this._draw({pixels, frame: this.sessionFrame});
    } else this.ready.push({pixels, frame: this.sessionFrame});
  }

  _draw({pixels, frame}) {
    if (this.closed) return;
    this.context.putImageData(new ImageData(new Uint8ClampedArray(pixels), 512, 480), 0, 0);
    for (const {tokens, first} of this.applied) if (first <= frame) {
      for (const token of tokens) if (token !== null) this.capture?.recordInputApplied(token, first);
    }
    this.applied = this.applied.filter(({first}) => first > frame);
    this.capture?.recordPresent(frame);
    this._recycle(pixels);
  }
  _recycle(pixels) { this.worker.postMessage({type: 'recycle', buffer: pixels}, [pixels]); }

  _applyInputs() {
    const held = new Set(); for (const values of this.inputSources.values()) for (const button of values) held.add(button);
    for (const [a, b] of [['left', 'right'], ['up', 'down']]) if (held.has(a) && held.has(b)) {
      held.delete(a); held.delete(b);
      // Gamepad polling updates buttons one by one. Do not latch the
      // transient first direction of an actually contradictory D-pad state.
      this.pendingButtons &= ~((1 << BUTTON[a]) | (1 << BUTTON[b]));
    }
    let mask = 0; for (const button of held) mask |= 1 << BUTTON[button];
    if (mask !== this.buttons && this.running) this.tokens.push({
      token: this.capture?.recordInputAccepted('button', performance.now()) ?? null,
      mask, changed: mask ^ this.buttons,
    });
    this.pendingButtons |= mask & ~this.buttons;
    this.buttons = mask;
  }
  _releaseAll() { this.inputSources.clear(); this.buttons = 0; this.pendingButtons = 0; this.tokens = []; }
  _clearAudio() { this.sink?.port.postMessage({type: 'clear'}); }
  _discardPresentation() {
    this.generation++;
    for (const {pixels} of this.ready) this._recycle(pixels);
    this.ready = []; this.applied = []; this.tokens = [];
  }
  pause() { super.pause(); this._discardPresentation(); this.capture?.setPaused(true); }
  resume() { super.resume(); this.capture?.setPaused(false); }
  getDiagnostics() { return {frames: this.sessionFrame, frame_ms: this.lastFrameMs, running: this.running, clock: 'display-paced-worker', audio: this.audioState || null, queued_frames: this.inflight, ready_frames: this.ready.length}; }
  readMemory(address, length) { return this._request('read', {address, length}); }
  writeMemory(address, bytes) { return this._request('write', {address, bytes}); }
  async saveState() { return {state: new Blob([await this._request('saveState')], {type: 'application/json'})}; }
  async loadState(blob) {
    this._discardPresentation();
    await this._request('loadState', {text: await blob.text()});
    this._releaseAll(); this._clearAudio();
    const pixels = await this._request('pixels');
    this.context.putImageData(new ImageData(new Uint8ClampedArray(pixels), 512, 480), 0, 0);
    this.worker.postMessage({type: 'recycle', buffer: pixels}, [pixels]);
  }
  async saveSRAM() { return new Blob([await this._request('saveSRAM')], {type: 'application/octet-stream'}); }
  exit() {
    this.closed = true; this.running = false;
    cancelAnimationFrame(this.raf); clearInterval(this.watchdog);
    this._releaseAll();
    window.removeEventListener('keydown', this.keyDown); window.removeEventListener('keyup', this.keyUp); window.removeEventListener('blur', this.blur);
    for (const {reject} of this.requests.values()) reject(new Error('Emulator closed'));
    this.requests.clear(); this.worker?.terminate(); this.audio?.close().catch(() => {});
  }
}
