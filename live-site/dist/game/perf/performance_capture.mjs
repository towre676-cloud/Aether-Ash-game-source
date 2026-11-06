/** Bounded development telemetry. Import explicitly; do not ship enabled by default.
 * Latency means host input acceptance -> submitted frame, not physical display latency.
 */
class Samples {
  constructor(capacity) { this.values = new Float64Array(capacity); this.length = 0; this.dropped = 0; }
  add(value) {
    if (!Number.isFinite(value) || value < 0) throw new Error('Expected a finite nonnegative measurement');
    if (this.length === this.values.length) { this.dropped++; return; }
    this.values[this.length++] = value;
  }
  array() { return Array.from(this.values.subarray(0, this.length)); }
}

export class GamePerformanceCapture {
  constructor(metadata, {maxSamples = 250000, maxPendingInputs = 1024} = {}) {
    if (!metadata || typeof metadata !== 'object') throw new Error('Run metadata is required');
    this.metadata = {...metadata}; this.maxPendingInputs = maxPendingInputs;
    this.render = new Samples(maxSamples); this.raf = new Samples(maxSamples);
    this.core = new Samples(maxSamples); this.input = new Samples(maxSamples);
    this.audioQueue = new Samples(maxSamples); this.longTasks = new Samples(20000);
    this.pending = new Map(); this.coverage = []; this.sceneChanges = [];
    this.simulationFrames = 0; this.presentationFrames = 0; this.presentationSegments = 0;
    this.underruns = 0; this.resyncs = 0;
    this.audioObserved = false; this.timingObserved = false; this.discardedTimeMs = 0;
    this.inputReceivedCount = 0; this.inputAppliedCount = 0; this.pendingOverflow = 0;
    this.inputToken = 0; this.running = false; this.paused = false; this.pausedMs = 0;
    this.longTaskSupported = false; this.sceneId = String(metadata.scene_id || 'unknown');
  }

  start() {
    if (this.running || this.started !== undefined) throw new Error('Create one capture per run');
    this.started = performance.now(); this.running = true;
    this.lastRaf = null; this.lastPresent = null; this.lastSimulationPresented = null;
    const tick = now => {
      if (!this.running) return;
      if (!this.paused && this.lastRaf !== null) this.raf.add(now - this.lastRaf);
      this.lastRaf = this.paused ? null : now;
      this.rafHandle = requestAnimationFrame(tick);
    };
    this.rafHandle = requestAnimationFrame(tick);
    if (typeof PerformanceObserver !== 'undefined' &&
        PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      this.observer = new PerformanceObserver(list => {
        if (this.running && !this.paused) for (const entry of list.getEntries()) this.longTasks.add(entry.duration);
      });
      this.observer.observe({type: 'longtask', buffered: false});
      this.longTaskSupported = true;
    }
    this.setScene(this.sceneId);
    return this;
  }

  setScene(sceneId) {
    this.sceneId = String(sceneId);
    if (this.running) {
      if (this.sceneChanges.length >= 10000) throw new Error('Scene log limit reached');
      this.sceneChanges.push({scene_id: this.sceneId, at_ms: performance.now() - this.started});
    }
  }

  noteCoverage(flag, evidence = '', source = 'operator') {
    if (!this.running) return;
    if (this.coverage.length >= 10000) throw new Error('Coverage log limit reached');
    this.coverage.push({flag: String(flag), scene_id: this.sceneId,
      at_ms: performance.now() - this.started, source: String(source), evidence: String(evidence)});
  }

  setPaused(paused) {
    if (!this.running || Boolean(paused) === this.paused) return;
    const now = performance.now();
    if (paused) this.pauseStarted = now;
    else { this.pausedMs += now - this.pauseStarted; this.pauseStarted = null; }
    this.paused = Boolean(paused); this.lastRaf = this.lastPresent = null;
    // Inputs held across pause must be released by the game; exclude them from this latency window.
    this.pending.clear();
  }

  recordSimulationFrame(durationMs) {
    if (!this.running || this.paused) return;
    this.core.add(durationMs); this.simulationFrames++;
  }

  recordTimingDiscard(discardedMs) {
    if (!this.running || this.paused) return;
    if (!Number.isFinite(discardedMs) || discardedMs < 0) throw new Error('Invalid discarded time');
    this.timingObserved = true; this.discardedTimeMs += discardedMs;
  }

  recordAudio(queueMs, underrunsSinceLastCall, resyncsSinceLastCall) {
    if (!this.running || this.paused) return;
    if (!Number.isInteger(underrunsSinceLastCall) || underrunsSinceLastCall < 0) throw new Error('Invalid underrun count');
    if (!Number.isInteger(resyncsSinceLastCall) || resyncsSinceLastCall < 0) throw new Error('Invalid resync count');
    this.audioQueue.add(queueMs); this.audioObserved = true; this.underruns += underrunsSinceLastCall;
    this.resyncs += resyncsSinceLastCall;
  }

  recordInputAccepted(kind, receivedAt = performance.now()) {
    if (!this.running || this.paused) return null;
    this.inputReceivedCount++;
    if (this.pending.size >= this.maxPendingInputs) { this.pendingOverflow++; return null; }
    if (!Number.isFinite(receivedAt) || receivedAt < this.started || receivedAt > performance.now()) throw new Error('Invalid input timestamp');
    const id = ++this.inputToken;
    this.pending.set(id, {at: receivedAt, kind: String(kind), appliedFrame: null});
    return id;
  }

  recordInputApplied(id, simulationFrameNumber) {
    if (!this.running || this.paused || !this.pending.has(id)) return;
    if (!Number.isInteger(simulationFrameNumber) || simulationFrameNumber < 0) throw new Error('Invalid simulation frame');
    const input = this.pending.get(id);
    if (input.appliedFrame === null) this.inputAppliedCount++;
    input.appliedFrame = simulationFrameNumber;
  }

  recordPresent(simulationFrameNumber) {
    if (!this.running || this.paused) return;
    if (!Number.isInteger(simulationFrameNumber) || simulationFrameNumber < 0) throw new Error('Invalid simulation frame');
    if (simulationFrameNumber === this.lastSimulationPresented) return;
    if (this.lastSimulationPresented !== null && simulationFrameNumber < this.lastSimulationPresented) throw new Error('Use a monotonic session frame counter, including after save restore');
    const now = performance.now();
    if (this.lastPresent !== null) this.render.add(now - this.lastPresent);
    else this.presentationSegments++;
    this.lastPresent = now; this.lastSimulationPresented = simulationFrameNumber; this.presentationFrames++;
    for (const [id, input] of this.pending) {
      if (input.appliedFrame !== null && input.appliedFrame <= simulationFrameNumber) {
        this.input.add(Math.max(0, now - input.at)); this.pending.delete(id);
      }
    }
  }

  stop() {
    if (!this.running) throw new Error('Capture is not running');
    this.ended = performance.now();
    if (this.paused) this.pausedMs += this.ended - this.pauseStarted;
    if (this.observer && !this.paused) for (const entry of this.observer.takeRecords()) this.longTasks.add(entry.duration);
    this.running = false; cancelAnimationFrame(this.rafHandle); this.observer?.disconnect();
    return this.report();
  }

  report() {
    if (this.running || this.ended === undefined) throw new Error('Stop before exporting large arrays');
    return {
      schema: 'ash-aether.performance-capture/1', metadata: this.metadata,
      elapsed_ms: this.ended - this.started - this.pausedMs,
      wall_elapsed_ms: this.ended - this.started, excluded_pause_ms: this.pausedMs,
      render_intervals_ms: this.render.array(), raf_callback_intervals_ms: this.raf.array(),
      core_frame_ms: this.core.array(), simulation_frames: this.simulationFrames,
      presentation_frames: this.presentationFrames, presentation_segments: this.presentationSegments,
      timing_accounting: {observed: this.timingObserved, discarded_ms: this.discardedTimeMs},
      audio: {observed: this.audioObserved, underruns: this.underruns, resync_count: this.resyncs, queue_ms: this.audioQueue.array()},
      input: {observed: this.inputAppliedCount > 0, samples_ms: this.input.array(),
        received_count: this.inputReceivedCount, applied_count: this.inputAppliedCount,
        pending_count: this.pending.size, overflow_count: this.pendingOverflow,
        definition: 'host input acceptance to first newly submitted emulated frame that consumed it; not physical device/display latency'},
      longtasks: {observed: this.longTaskSupported, samples_ms: this.longTasks.array()},
      coverage: this.coverage, scene_changes: this.sceneChanges,
      sample_overflows: {render: this.render.dropped, raf: this.raf.dropped, core: this.core.dropped,
        input: this.input.dropped, audio: this.audioQueue.dropped, longtasks: this.longTasks.dropped}
    };
  }
}
