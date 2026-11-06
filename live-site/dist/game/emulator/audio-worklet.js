/** Native game audio consumer. A fixed ring buffer filled by the emulator
 * thread's per-frame samples; the audio thread drains it every render
 * quantum. Starvation is counted as an underrun (once per starved stretch),
 * and a queue grown past its ceiling is trimmed and counted as a resync.
 * A compact summary is posted about four times a second. */
class SnesAudio extends AudioWorkletProcessor {
  constructor() {
    super();
    this.capacity = Math.ceil(sampleRate * 0.5);
    this.left = new Float32Array(this.capacity); this.right = new Float32Array(this.capacity);
    this.read = 0; this.size = 0; this.started = false; this.starved = false;
    this.target = Math.round(sampleRate / 30); // two 60 Hz frames, about 33 ms
    this.ceiling = Math.round(sampleRate * 0.10);
    this.high = Math.round(sampleRate * 0.060); this.low = Math.round(sampleRate * 0.036); this.correcting = false;
    this.underruns = 0; this.resyncs = 0; this.sinceReport = 0;
    this.port.onmessage = ({data}) => {
      if (data.type === 'samples') this.push(data.samples);
      else if (data.type === 'clear') { this.size = 0; this.started = false; this.starved = false; }
    };
  }
  push(interleaved) {
    const frames = interleaved.length >> 1;
    for (let i = 0; i < frames; i++) {
      if (this.size === this.capacity) { this.read = (this.read + 1) % this.capacity; this.size--; }
      const at = (this.read + this.size) % this.capacity;
      this.left[at] = interleaved[2 * i]; this.right[at] = interleaved[2 * i + 1]; this.size++;
    }
    if (this.size > this.ceiling) {
      // Producer ran ahead (e.g. a catch-up burst): drop the oldest audio
      // instead of letting latency grow without bound.
      const drop = this.size - this.target;
      this.read = (this.read + drop) % this.capacity; this.size -= drop; this.resyncs++;
    }
    if (!this.started && this.size >= this.target) this.started = true;
  }
  process(inputs, outputs) {
    const out = outputs[0], l = out[0], r = out[1] || out[0], n = l.length;
    if (this.started) {
      // Drift control: after a burst the queue would otherwise stay long
      // forever (producer and consumer then run at the same rate). Above the
      // high-water mark, skip one input sample in 64 (a brief 1.5 % speed-up,
      // far gentler than dropping a block) until latency is back; each
      // episode counts as a resync. Hysteresis (start above `high`, stop
      // below `low`) keeps per-frame delivery jitter from starting a new
      // episode every few frames.
      if (!this.correcting && this.size > this.high) { this.correcting = true; this.resyncs++; }
      else if (this.correcting && this.size < this.low) this.correcting = false;
      const draining = this.correcting;
      const take = Math.min(n, this.size);
      for (let i = 0; i < take; i++) {
        l[i] = this.left[this.read]; r[i] = this.right[this.read]; this.read = (this.read + 1) % this.capacity;
        if (draining && (i & 63) === 63 && this.size > take + 1) { this.read = (this.read + 1) % this.capacity; this.size--; }
      }
      this.size -= take;
      for (let i = take; i < n; i++) { l[i] = 0; r[i] = 0; }
      if (take < n) {
        if (!this.starved) this.underruns++;
        this.starved = true; this.started = false; // rebuffer before resuming
      } else this.starved = false;
    } else { l.fill(0); if (r !== l) r.fill(0); }
    this.sinceReport += n;
    if (this.sinceReport >= sampleRate / 4) {
      this.sinceReport = 0;
      this.port.postMessage({queuedMs: this.size * 1000 / sampleRate, underruns: this.underruns, resyncs: this.resyncs});
    }
    return true;
  }
}
registerProcessor('snes-audio', SnesAudio);
