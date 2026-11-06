import { Nostalgist } from './vendor/nostalgist.js';

const BUTTONS = new Set(['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'l', 'r', 'start', 'select']);
const BASE = new URL('./vendor/', import.meta.url);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Local SNES player. No game bytes or save data leave the browser. */
export class SNESPlayer {
  constructor(canvas, { onStatus = () => {}, onError = () => {}, onLog = () => {}, onPauseRequest = () => {}, backend = 'snesjs', debug = false, mainThread = false, capture = null } = {}) {
    if (!canvas || canvas.tagName !== 'CANVAS') throw new TypeError('SNESPlayer requires a canvas');
    this.canvas = canvas;
    this.backend = backend;
    this.debug = !!debug;
    // The default SnesJs engine runs on a worker thread when the browser has
    // workers and AudioWorklet; mainThread forces the original single-thread
    // engine. capture is optional development telemetry.
    this.mainThread = !!mainThread;
    this.capture = capture;
    this.onStatus = onStatus;
    this.onError = onError;
    this.onLog = onLog;
    this.onPauseRequest = onPauseRequest;
    this.logs = [];
    this._nativeError = null;
    this.renderer = null;
    this.softwareFrames = 0;
    this._generation = 0;
    this.instance = null;
    this.volume = 0;
    this.status = 'idle';
    this.held = new Set();
    this.inputSources = new Map();
    this._memoryQueue = Promise.resolve();
    this._blur = () => this.releaseButtons();
    window.addEventListener('blur', this._blur);
  }

  _status(value) { this.status = value; this.onStatus(value); }

  /** File, Uint8Array or ArrayBuffer; optional initial state/SRAM are Blobs. */
  async load(input, { name = 'Chrono Trigger.sfc', sram, state } = {}) {
    if (this.status === 'loading') throw new Error('An emulator is already loading');
    if (this.instance) this.exit();
    this._nativeError = null;
    this.logs = [];
    this._status('loading');
    this.renderer = this.backend === 'snes9x' ? 'webgl' : 'canvas2d';
    this.softwareFrames = 0;
    ++this._generation;
    try {
      const rom = input instanceof File ? input : {
        fileName: name,
        fileContent: input instanceof ArrayBuffer ? new Uint8Array(input) : input,
      };
      if (!(input instanceof File) && !(rom.fileContent instanceof Uint8Array)) {
        throw new TypeError('ROM must be a File, Uint8Array or ArrayBuffer');
      }
      if (this.backend === 'snesjs') {
        const threaded = !this.mainThread && typeof Worker === 'function' && typeof AudioWorkletNode === 'function';
        const Engine = threaded ? (await import('./threaded.js')).ThreadedSNES : (await import('./software.js')).SoftwareSNES;
        this.engine = threaded ? 'snesjs-worker' : 'snesjs-main';
        const bytes = input instanceof File ? new Uint8Array(await input.arrayBuffer()) : rom.fileContent;
        this.instance = await Engine.create(this.canvas, bytes, {sram,state,debug:this.debug,capture:this.capture,onLog:entry=>this._log(entry),onPauseRequest:()=>this.onPauseRequest()});
      } else {
      this.instance = await Nostalgist.launch({
        element: this.canvas,
        core: {
          name: 'snes9x',
          js: new URL('snes9x_libretro.js', BASE).href,
          wasm: new URL('snes9x_libretro.wasm', BASE).href,
        },
        rom,
        ...(sram ? { sram } : {}),
        ...(state ? { state } : {}),
        cache: false,
        onLog: (entry) => this._log(entry),
        respondToGlobalEvents: true,
        style: { width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', outline: 'none' },
        retroarchConfig: {
          video_driver: 'gl',
          video_gpu_screenshot: false,
          video_context_driver: 'webgl_emscripten',
          audio_volume: this.volume === 0 ? -1000 : 20 * Math.log10(this.volume),
          video_smooth: false,
          video_vsync: true,
          video_shader_enable: false,
          video_font_enable: false,
          menu_enable_widgets: false,
          rewind_enable: false,
          input_player1_a: 'x', input_player1_b: 'z',
          input_player1_x: 's', input_player1_y: 'a',
          input_player1_l: 'q', input_player1_r: 'w',
          input_player1_start: 'enter', input_player1_select: 'rshift',
          input_player1_up: 'up', input_player1_down: 'down',
          input_player1_left: 'left', input_player1_right: 'right',
        },
      });
      }
      if (this._nativeError) throw this._nativeError;
      this.setVolume(this.volume);
      this.canvas.tabIndex = 0;
      this.canvas.focus();
      this._status('running');
      return this;
    } catch (error) {
      this._status('error'); this.onError(error); throw error;
    }
  }

  _log(entry) {
    this.logs.push(entry);
    if (this.logs.length > 100) this.logs.shift();
    this.onLog(entry);
    const message = String(entry?.message || '');
    if (/RuntimeError|Aborted\(|exception thrown:|null function|memory access out of bounds/i.test(message)) {
      this._nativeError = new Error(`SNES runtime failed: ${message}`);
      try { this.instance?.pause(); } catch {}
      this._status('error'); this.onError(this._nativeError);
    }
  }

  getDiagnostics() { return { status: this.status, engine: this.engine, renderer: this.renderer, softwareFrames: this.instance?.frames ?? this.softwareFrames, backend: this.backend, runtime: this.instance?.getDiagnostics?.() || null, nativeError: this._nativeError?.message || null, logs: [...this.logs] }; }

  pause() {
    if (!this.instance || this.status !== 'running') return;
    this.releaseButtons(); this.instance.pause(); this._status('paused');
  }

  resume() {
    if (!this.instance || this.status !== 'paused') return;
    this.instance.resume(); this.canvas.focus(); this._status('running');
  }

  setVolume(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Volume must be in [0,1]');
    this.volume = value;
    // RetroArch's cmd_set_volume takes decibels, not a linear amplitude.
    this.instance?.getEmscriptenModule()._cmd_set_volume(value === 0 ? -1000 : 20 * Math.log10(value));
  }

  buttonDown(button, source = 'external') {
    if (!BUTTONS.has(button)) throw new RangeError(`Unknown SNES button: ${button}`);
    if (this.status !== 'running') return;
    let held=this.inputSources.get(source);
    if(!held){held=new Set();this.inputSources.set(source,held)}
    if(held.has(button))return;
    held.add(button);
    if(this.held.has(button))return;
    this.held.add(button); this.instance.pressDown(button);
  }

  buttonUp(button, source = 'external') {
    if (!BUTTONS.has(button)) throw new RangeError(`Unknown SNES button: ${button}`);
    const held=this.inputSources.get(source);
    if(!held?.delete(button))return;
    if(!held.size)this.inputSources.delete(source);
    if([...this.inputSources.values()].some(buttons=>buttons.has(button)))return;
    if (!this.held.delete(button)) return;
    this.instance?.pressUp(button);
  }

  releaseButtons() { this.inputSources.clear();for(const button of this.held)this.instance?.pressUp(button);this.held.clear(); }

  async exportState() {
    if (!this.instance) throw new Error('Load the game first');
    return (await this.instance.saveState()).state;
  }

  async importState(blob) {
    if (!this.instance) throw new Error('Load the game first');
    if (!(blob instanceof Blob)) throw new TypeError('State must be a Blob or File');
    if (blob.size > 32 * 1024 * 1024) throw new RangeError('State exceeds 32 MB');
    this.releaseButtons();
    await this.instance.loadState(blob);
  }

  async exportSRAM() {
    if (!this.instance) throw new Error('Load the game first');
    return this.instance.saveSRAM();
  }

  /** Read WRAM offset 0..0x1ffff, or an explicit SNES bus address. */
  readMemory(offset, length = 1) {
    const address = this._address(offset, length);
    if (this.instance?.readMemory) return Promise.resolve(this.instance.readMemory(address, length));
    return this._serializeMemory(async () => {
      const reply = await this._command(`READ_CORE_MEMORY ${address.toString(16)} ${length}`, 'READ_CORE_MEMORY', address);
      const bytes = reply.trim().split(/\s+/).slice(2);
      if (bytes.length !== length || bytes.some((x) => !/^[0-9a-f]{2}$/i.test(x))) {
        throw new Error(`Core memory read failed: ${reply.trim()}`);
      }
      return Uint8Array.from(bytes, (x) => Number.parseInt(x, 16));
    });
  }

  /** Writes are explicit and bounded; caller must validate the exact ROM revision. */
  writeMemory(offset, bytes) {
    if (!(bytes instanceof Uint8Array)) throw new TypeError('Write data must be Uint8Array');
    const address = this._address(offset, bytes.length);
    if (this.instance?.writeMemory) return Promise.resolve(this.instance.writeMemory(address, bytes));
    return this._serializeMemory(async () => {
      const data = [...bytes].map((x) => x.toString(16).padStart(2, '0')).join(' ');
      const reply = await this._command(`WRITE_CORE_MEMORY ${address.toString(16)} ${data}`, 'WRITE_CORE_MEMORY', address);
      const count = Number(reply.trim().split(/\s+/)[2]);
      if (count !== bytes.length) throw new Error(`Core memory write failed: ${reply.trim()}`);
      return count;
    });
  }

  _address(offset, length) {
    if (!Number.isInteger(offset) || offset < 0 || offset > 0xffffff ||
        !Number.isInteger(length) || length < 1 || length > 4096) {
      throw new RangeError('Invalid memory address or length (1..4096)');
    }
    const address = offset < 0x20000 ? 0x7e0000 + offset : offset;
    if (address + length > 0x1000000) throw new RangeError('Memory range overflow');
    return address;
  }

  _serializeMemory(operation) {
    const pending = this._memoryQueue.then(operation);
    this._memoryQueue = pending.catch(() => {});
    return pending;
  }

  async _command(command, expected, address) {
    if (!this.instance || !['running', 'paused'].includes(this.status)) throw new Error('Load the game first');
    const module = this.instance.getEmscriptenModule();
    if (typeof module.EmscriptenReceiveCommandReply !== 'function') throw new Error('Core has no command reply interface');
    // Drain stale replies. Memory commands are serialized, so no other read is pending.
    while (module.EmscriptenReceiveCommandReply()) {}
    module.EmscriptenSendCommand(command);
    const deadline = performance.now() + 2000;
    while (performance.now() < deadline) {
      const reply = module.EmscriptenReceiveCommandReply();
      if (typeof reply === 'string' && reply.startsWith(`${expected} ${address.toString(16)}`)) return reply;
      await wait(16);
    }
    throw new Error(`${expected} unavailable or timed out in this core`);
  }

  exit() {
    this._generation++;
    this.releaseButtons();
    this.instance?.exit({ removeCanvas: false });
    this.instance = null; this._status('idle');
  }

  destroy() { this.exit(); window.removeEventListener('blur', this._blur); }
}
