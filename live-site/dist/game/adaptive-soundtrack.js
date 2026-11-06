import {Soundtrack} from './soundtrack.js?v=5.33.0';

/** Short decoded arrangements share the media transport's request ownership,
 * measured gain and finite-segment contract. Legacy loop:true remains opt-in. */
export class AdaptiveSoundtrack extends Soundtrack {
  constructor(options = {}) {
    super(options);
    this.buffers = new Map();
    this.requests = new Map();
    this.voices = new Set();
    this.adaptive = null;
    this.preloadJob = null;
  }

  get playbackState() {
    const a=this.adaptive;if(!a)return super.playbackState;
    const contextState=this.context?.state||'unknown';
    const position=a.offset+(this.playing?Math.max(0,(this.context?.currentTime||0)-a.start):0);
    return {playing:!!(this.playing&&!this.endDelivered&&!a.ended&&!a.voice?.retired&&(!this.context?.state||contextState==='running')),requested:!!this.playing,blocked:!!this.blocked,contextState,transport:'buffer',position,duration:a.bounds.end-a.bounds.start,remaining:Math.max(0,a.bounds.end-position),trackId:a.track?.id||null};
  }

  preload(track) {
    if(!track?.rpg||!this.context)return super.preload(track);
    if(!track.audio||!this.playing)return false;
    const url=this.options.resolve?.(track.audio)||track.audio;
    if(this.buffers.has(url))return true;
    if(this.preloadJob)return this.preloadJob.url===url;
    const job={url};this.preloadJob=job;
    job.promise=this.load(url).catch(()=>null).finally(()=>{if(this.preloadJob===job)this.preloadJob=null;});
    return true;
  }

  async load(url) {
    if (this.buffers.has(url)) return this.buffers.get(url);
    if (this.requests.has(url)) return this.requests.get(url);
    const job = (async () => {
      const response = await fetch(url);
      if (!response.ok) throw Error('Soundtrack unavailable');
      const bytes = url.endsWith('.ogg.json')
        ? Uint8Array.from(atob((await response.json()).base64), c => c.charCodeAt(0)).buffer
        : await response.arrayBuffer();
      const buffer = await this.context.decodeAudioData(bytes);
      this.buffers.set(url, buffer);
      while (this.buffers.size > 4) this.buffers.delete(this.buffers.keys().next().value);
      return buffer;
    })();
    this.requests.set(url, job);
    try { return await job; }
    finally { this.requests.delete(url); }
  }

  clearVoices() {
    for (const voice of this.voices) {
      voice.retired = true;
      try { voice.source.stop(); } catch {}
      voice.gain.disconnect();
    }
    this.voices.clear();
  }

  fadeVoices(seconds) {
    const now = this.context?.currentTime || 0;
    for (const voice of this.voices) {
      voice.retired = true;
      const remaining = Math.min(seconds, Math.max(0, (voice.stopAt ?? Infinity) - now));
      this.ramp(voice.gain.gain, 0, remaining);
      voice.stopAt = now + remaining;
      try { voice.source.stop(voice.stopAt); } catch {}
      if (!remaining) { voice.gain.disconnect(); this.voices.delete(voice); }
    }
  }

  retireOtherTransport(seconds) {
    this.adaptive = null;
    this.fadeVoices(seconds);
  }

  bufferBounds(track, buffer) {
    const {start, end} = this.bounds(track, buffer);
    if (!(end > start)) throw Error('This performance has no playable segment.');
    const loopStart = Math.max(start, Math.min(end, track.loopStart ?? start));
    const loopEnd = Math.max(loopStart, Math.min(end, track.loopEnd ?? end));
    return {start, end, loopStart, loopEnd, loop: !!track.loop && loopEnd > loopStart};
  }

  makeVoice(buffer, track, offset, bounds, fade) {
    const now = this.context.currentTime;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = bounds.loop;
    source.loopStart = bounds.loopStart;
    source.loopEnd = bounds.loopEnd;
    source.connect(gain);
    gain.connect(this.master);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.trackGain(track), now + fade);
    const voice = {source, gain, retired: false};
    source.onended = () => {
      this.voices.delete(voice);
      gain.disconnect();
      if (voice.retired || !this.playing || this.adaptive?.voice !== voice || bounds.loop || this.endDelivered) return;
      this.adaptive.offset = bounds.end;
      this.adaptive.ended = true;
      this.endDelivered = true;
      this.playing = false;
      this.options.onState?.(false);
      this.options.onEnd?.();
    };
    try {
      if (bounds.loop) source.start(now, offset);
      else source.start(now, offset, bounds.end - offset);
    } catch (error) { gain.disconnect(); throw error; }
    return voice;
  }

  async play(track) {
    if (!track?.rpg) return super.play(track);
    if (!track.audio) return false;
    this.cancelPending();
    const token = this.fadeToken;
    try {
      this.setup();
      if (!this.context) return super.play(track);
      await this.context.resume();
      if (token !== this.fadeToken) return null;
      const url = this.options.resolve?.(track.audio) || track.audio;
      const buffer = await this.load(url);
      if (token !== this.fadeToken) return null;
      const bounds = this.bufferBounds(track, buffer);
      const fade = this.transitionFade(track,bounds.end-bounds.start,.65);
      const voice = this.makeVoice(buffer, track, bounds.start, bounds, fade);
      this.clearEndTimer();
      this.fadeMedia(fade);
      this.fadeVoices(fade);
      this.activeTrack = null;
      this.voices.add(voice);
      this.adaptive = {track, buffer, voice, bounds, offset: bounds.start, start: this.context.currentTime, ended: false};
      this.endDelivered = false;
      this.playing = true;
      this.blocked = false; this.lastError = null;
      this.select(track);
      this.options.onState?.(true);
      return true;
    } catch (error) {
      if (token !== this.fadeToken) return null;
      this.reportError(error);
      return false;
    }
  }

  pause() {
    const a = this.adaptive;
    if (a && this.playing) {
      a.offset += Math.max(0, this.context.currentTime - a.start);
      if (a.bounds.loop && a.offset >= a.bounds.loopEnd) {
        a.offset = a.bounds.loopStart + (a.offset - a.bounds.loopStart) % (a.bounds.loopEnd - a.bounds.loopStart);
      } else a.offset = Math.min(a.offset, a.bounds.end);
    }
    super.pause();
    this.clearVoices();
  }

  async resume() {
    const a = this.adaptive;
    if (!a) return super.resume();
    if (this.playing) return true;
    if (a.ended || this.endDelivered || (!a.bounds.loop && a.offset >= a.bounds.end)) return false;
    this.cancelPending();
    const token = this.fadeToken;
    try {
      await this.context.resume();
      if (token !== this.fadeToken || this.adaptive !== a) return null;
      const voice = this.makeVoice(a.buffer, a.track, a.offset, a.bounds, Math.min(.08, (a.bounds.end - a.offset) / 2));
      this.voices.add(voice);
      this.adaptive = {...a, voice, start: this.context.currentTime};
      this.playing = true;
      this.blocked = false; this.lastError = null;
      this.options.onState?.(true);
      return true;
    } catch (error) {
      if (token !== this.fadeToken) return null;
      this.reportError(error);
      return false;
    }
  }

  stop(options = {}) {
    this.adaptive = null;
    this.fadeVoices(this.fadeSeconds({fadeSeconds: options.fadeSeconds ?? 0}, 0));
    super.stop(options);
  }

  async cue(track) {
    const token = this.fadeToken;
    this.setup();
    if (!this.context) return false;
    await this.context.resume();
    const url = this.options.resolve?.(track.audio) || track.audio;
    const buffer = await this.load(url);
    if (token !== this.fadeToken) return null;
    const bounds = this.bufferBounds({...track, loop: false}, buffer);
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.value = .65 * this.trackGain(track);
    source.connect(gain);
    gain.connect(this.master);
    const voice = {source, gain};
    source.onended = () => { this.voices.delete(voice); gain.disconnect(); };
    source.start(this.context.currentTime, bounds.start, bounds.end - bounds.start);
    this.voices.add(voice);
    return true;
  }
}
