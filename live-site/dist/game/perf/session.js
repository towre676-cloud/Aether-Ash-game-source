/** Development-only telemetry session (loaded only with ?perf=1).
 *
 * The engine always talks to `relay`; nothing is recorded until a capture is
 * started (after warm-up) with window.ashPerf.start({...}), and
 * window.ashPerf.stop() returns the finished capture for analysis with
 * perf_tools/analyze_performance.py. performance_capture.mjs is copied
 * unchanged from the handoff's perf_tools/. */
import { GamePerformanceCapture } from './performance_capture.mjs';

const forward = ['recordSimulationFrame', 'recordPresent', 'recordInputApplied', 'recordAudio', 'recordTimingDiscard', 'setPaused', 'setScene', 'noteCoverage'];

export function createSession(params) {
  let target = null;
  const relay = {recordInputAccepted: (kind, at) => target ? target.recordInputAccepted(kind, at) : null};
  for (const name of forward) relay[name] = (...args) => target?.[name](...args);
  const session = {
    capture: relay,
    async begin() {},
    start(metadata = {}) {
      if (target) throw Error('A capture is already running');
      target = new GamePerformanceCapture({
        hardware: params.get('hw') || 'unrecorded', browser: navigator.userAgent,
        backend: 'snesjs-worker', display_hz: Number(params.get('hz') || 60),
        scene_id: metadata.scene_id || 'unknown', chapter_id: metadata.chapter_id ?? null,
        music_mode: metadata.music_mode || 'unknown', power_profile: params.get('power') || 'unrecorded',
        run_kind: metadata.run_kind || 'chapter', ...metadata,
      }).start();
      return true;
    },
    stop() { const result = target.stop(); target = null; return result; },
  };
  window.ashPerf = session;
  return session;
}
