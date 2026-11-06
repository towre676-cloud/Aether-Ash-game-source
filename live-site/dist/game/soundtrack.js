import {DyletskyInstrument} from './engine2/instrument.js?v=5.23.0';

/** Two media decks. A request returns true once started, false on failure and
 * null when superseded. Selection callbacks describe audible starts only. */
export class Soundtrack {
  constructor(options = {}) {
    this.options = options;
    this.track = null;
    this.activeTrack = null;
    this.playing = false;
    this.blocked = false;
    this.lastError = null;
    this.volume = .72;
    this.deck = 0;
    this.audios = [new Audio(), new Audio()];
    this.context = null;
    this.gains = [];
    this.fadeToken = 0;
    this.deckTokens = [0, 0];
    this.deckFadeTokens = [0, 0];
    this.deckTimers = [null, null];
    this.endDelivered = false;
    this.pendingCancel = null;
    this.endTimer = null;
    this.preloaded = null;
    this.audios.forEach((audio, i) => {
      audio.preload = 'metadata';
      audio.addEventListener('timeupdate', () => {
        if (i !== this.deck || !this.activeTrack) return;
        const {start, end} = this.bounds(this.activeTrack, audio);
        this.options.onTime?.(Math.max(0, Math.min(end - start, audio.currentTime - start)), end - start);
        if (this.playing && audio.currentTime >= end - .015) this.finish();
      });
      audio.addEventListener('ended', () => {
        if (i === this.deck && this.activeTrack && this.playing) this.finish();
      });
    });
  }

  bounds(track, audio) {
    const duration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
    const start = Math.max(0, Number.isFinite(track.start_s) ? track.start_s : 0);
    const end = Math.min(duration, Number.isFinite(track.end_s) ? track.end_s : duration);
    return {start, end};
  }

  trackGain(track) {
    return Number.isFinite(track?.gain) ? Math.max(0, Math.min(1, track.gain)) : 1;
  }

  fadeSeconds(track, fallback = .8) {
    const value = track?.fadeSeconds ?? this.options.fadeSeconds ?? fallback;
    return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : fallback;
  }

  transitionFade(track,duration,fallback=.8) {
    let seconds=Math.min(this.fadeSeconds(track,fallback),duration/2);
    if(track.handoff){const previous=this.playbackState;seconds=Math.min(seconds,previous.playing?Math.max(.12,previous.remaining):.2);}
    return seconds;
  }

  /** Prime only the idle half of this player's existing two-deck transport.
   * No selection, playback, gain or request-generation change happens here. */
  preload(track) {
    if(!track?.audio||!this.playing||this.pendingCancel)return false;
    const deck=1-this.deck,audio=this.audios[deck];
    if(audio.paused===false)return false; // The previous crossfade still owns it.
    const url=this.options.resolve?.(track.audio)||track.audio;
    if(this.preloaded?.deck===deck&&this.preloaded.url===url)return true;
    try{audio.preload='auto';if(audio.src!==url){audio.src=url;audio.load();}this.preloaded={deck,url};return true;}catch{return false;}
  }

  ramp(param, value, seconds) {
    const now = this.context.currentTime;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else { param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); }
    if (seconds > 0) param.linearRampToValueAtTime(value, now + seconds);
    else param.setValueAtTime(value, now);
  }

  setDeckGain(i, value, seconds = 0, pauseAfter = false) {
    clearTimeout(this.deckTimers[i]);
    const version = ++this.deckFadeTokens[i];
    if (this.context) this.ramp(this.gains[i].gain, value, seconds);
    else this.audios[i].volume = Math.max(0, Math.min(1, this.volume * value));
    if (!pauseAfter) return;
    if (!this.context || seconds <= 0) this.audios[i].pause();
    else {
      this.deckTimers[i] = setTimeout(() => {
        if (version === this.deckFadeTokens[i]) this.audios[i].pause();
      }, seconds * 1000 + 20);
      this.deckTimers[i].unref?.();
    }
  }

  fadeMedia(seconds = 0) {
    this.audios.forEach((_, i) => this.setDeckGain(i, 0, seconds, true));
  }

  clearEndTimer() { clearTimeout(this.endTimer); this.endTimer = null; }

  armEndTimer() {
    this.clearEndTimer();
    if (!this.playing || !this.activeTrack) return;
    const audio = this.audios[this.deck], track = this.activeTrack;
    const {end} = this.bounds(track, audio);
    if (!Number.isFinite(end)) return;
    // timeupdate is too infrequent to bound a movement cut on its own.
    this.endTimer = setTimeout(() => {
      if (!this.playing || this.activeTrack !== track || this.audios[this.deck] !== audio) return;
      if (audio.currentTime >= end - .015) this.finish();
      else this.armEndTimer(); // A stalled download must not end unheard music.
    }, Math.max(25, (end - audio.currentTime) * 1000 / (audio.playbackRate || 1)));
    this.endTimer.unref?.();
  }

  finish() {
    if (this.endDelivered || !this.activeTrack) return;
    this.endDelivered = true;
    this.clearEndTimer();
    this.fadeMedia(0);
    this.playing = false;
    this.options.onState?.(false);
    this.options.onEnd?.();
  }

  select(track) {
    this.track = track;
    this.options.onTrack?.(track);
  }

  setup() {
    if (this.context) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.context = new C();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = .82;
    if (this.options.instrument) {
      this.instrument = new DyletskyInstrument(this.context, this.analyser);
      this.master.connect(this.instrument.input);
      this.instrument.setMode(this.options.instrumentEnabled !== false);
    } else this.master.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    this.audios.forEach(audio => {
      const gain = this.context.createGain();
      gain.gain.value = 0;
      this.context.createMediaElementSource(audio).connect(gain);
      gain.connect(this.master);
      this.gains.push(gain);
    });
  }

  /** Called synchronously inside a player gesture, including after Android
   * interrupts the audio context. It never changes the chosen recording. */
  unlock() {
    try {
      this.setup();
      const pending = this.context?.resume?.();
      return Promise.resolve(pending).then(() => {
        const running = !this.context || !this.context.state || this.context.state === 'running';
        if (running) { this.blocked = false; this.lastError = null; }
        return running;
      }, error => { this.reportError(error); return false; });
    } catch (error) { this.reportError(error); return Promise.resolve(false); }
  }

  reportError(error) {
    this.blocked = error?.name === 'NotAllowedError';
    this.lastError = {name:error?.name||'Error',message:error?.message||'Music could not start.'};
    this.options.onError?.(this.lastError.message, error);
  }

  get playbackState() {
    const audio=this.audios[this.deck], contextState=this.context?.state||'media',position=Number(audio?.currentTime)||0,bounds=this.activeTrack?this.bounds(this.activeTrack,audio):{start:0,end:0};
    return {playing:!!(this.playing&&!this.endDelivered&&audio?.paused===false&&(!this.context||!this.context.state||contextState==='running')),requested:!!this.playing,blocked:!!this.blocked,contextState,transport:'media',position,duration:Math.max(0,bounds.end-bounds.start),remaining:Math.max(0,bounds.end-position),trackId:this.activeTrack?.id||null};
  }

  cancelPending() {
    ++this.fadeToken;
    this.pendingCancel?.();
    this.pendingCancel = null;
  }

  metadata(audio, token) {
    if (audio.readyState >= 1) return Promise.resolve(true);
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        audio.removeEventListener('loadedmetadata', loaded);
        audio.removeEventListener('error', failed);
        if (this.pendingCancel === cancelled) this.pendingCancel = null;
      };
      const loaded = () => { cleanup(); resolve(token === this.fadeToken); };
      const failed = () => { cleanup(); reject(Error('Could not load this performance.')); };
      const cancelled = () => { cleanup(); resolve(false); };
      const timer = setTimeout(() => { cleanup(); reject(Error('Audio download timed out.')); }, 30000);
      audio.addEventListener('loadedmetadata', loaded);
      audio.addEventListener('error', failed);
      this.pendingCancel = cancelled;
    });
  }

  // The decoded transport retires its previous source only after media starts.
  retireOtherTransport() {}

  async play(track) {
    if (!track?.audio) return false;
    this.cancelPending();
    const token = this.fadeToken;
    const old = this.deck, next = 1 - old, audio = this.audios[next];
    try {
      this.setup();
      await this.context?.resume();
      if (token !== this.fadeToken) return null;
      audio.pause();
      this.deckTokens[next] = token;
      this.setDeckGain(next, 0);
      const url = this.options.resolve?.(track.audio) || track.audio;
      if (audio.src !== url) { audio.src = url; audio.load(); }
      if (!await this.metadata(audio, token) || token !== this.fadeToken) return null;
      const {start, end} = this.bounds(track, audio);
      if (!(end > start)) throw Error('This performance has no playable segment.');
      audio.loop = false;
      audio.currentTime = start;
      if (!this.context) audio.volume = this.volume * this.trackGain(track);
      await audio.play();
      if (token !== this.fadeToken) {
        if (this.deckTokens[next] === token) audio.pause();
        return null;
      }
      const fade = this.transitionFade(track,end-start);
      this.clearEndTimer();
      this.retireOtherTransport(fade);
      this.deck = next;
      this.preloaded = null;
      this.activeTrack = track;
      this.endDelivered = false;
      this.setDeckGain(old, 0, fade, true);
      this.setDeckGain(next, this.trackGain(track), fade);
      this.playing = true;
      this.blocked = false; this.lastError = null;
      this.select(track);
      this.options.onState?.(true);
      this.armEndTimer();
      return true;
    } catch (error) {
      if (token !== this.fadeToken) return null;
      if (this.deckTokens[next] === token) { audio.pause(); this.setDeckGain(next, 0); }
      this.reportError(error);
      return false;
    }
  }

  pause() {
    this.cancelPending();
    this.clearEndTimer();
    this.fadeMedia(0);
    this.playing = false;
    this.options.onState?.(false);
  }

  async resume() {
    if (this.playing) return true;
    if (!this.activeTrack || this.endDelivered) return false;
    const audio = this.audios[this.deck], {end} = this.bounds(this.activeTrack, audio);
    if (audio.currentTime >= end - .015) return false;
    this.cancelPending();
    const token = this.fadeToken, deck = this.deck;
    this.deckTokens[deck] = token;
    try {
      this.setup();
      await this.context?.resume();
      if (token !== this.fadeToken) return null;
      await audio.play();
      if (token !== this.fadeToken) {
        if (this.deckTokens[deck] === token) audio.pause();
        return null;
      }
      this.setDeckGain(deck, this.trackGain(this.activeTrack), .08);
      this.playing = true;
      this.blocked = false; this.lastError = null;
      this.options.onState?.(true);
      this.armEndTimer();
      return true;
    } catch (error) {
      if (token !== this.fadeToken) return null;
      this.reportError(error);
      return false;
    }
  }

  /** Synchronous ownership change; an old fade timer cannot stop a later play. */
  stop({fadeSeconds = 0} = {}) {
    this.cancelPending();
    this.clearEndTimer();
    this.fadeMedia(this.fadeSeconds({fadeSeconds}, 0));
    this.track = null;
    this.activeTrack = null;
    this.endDelivered = true;
    this.playing = false;
    this.options.onState?.(false);
  }

  seek(fraction) {
    if (!this.activeTrack || this.track !== this.activeTrack) return;
    const audio = this.audios[this.deck], {start, end} = this.bounds(this.activeTrack, audio);
    if (Number.isFinite(end)) audio.currentTime = start + Math.max(0, Math.min(1, fraction)) * (end - start);
    this.endDelivered = false;
    this.armEndTimer();
  }

  setVolume(value) {
    if (!Number.isFinite(value)) throw new TypeError('Volume must be finite');
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.ramp(this.master.gain, this.volume, .06);
    else this.audios[this.deck].volume = this.volume * this.trackGain(this.activeTrack);
  }

  frequencies() {
    if (!this.analyser || !this.playing) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}
