#!/usr/bin/env node
/** Headless worker pacing check. No GPU, desktop, display scanout or speaker
 * latency is measured. Uses the actual SNES worker, ROM, audio production,
 * pixel transfer and display scheduler, with a no-op canvas at 60 Hz.
 * Usage: node benchmark_worker.mjs ROM [seconds] [./threaded.js] [--state EARNED.json]
 */
import fs from 'node:fs';
import {Worker} from 'node:worker_threads';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
import {pathToFileURL} from 'node:url';
const args = process.argv.slice(2), stateIndex = args.indexOf('--state');
const stateFile = stateIndex < 0 ? null : args.splice(stateIndex, 2)[1];
if (stateIndex >= 0 && !stateFile) throw Error('--state requires an earned snapshot file');
const rom = args[0], seconds = Number(args[1] || 10), warmup = Number(process.env.ASH_BENCH_WARMUP_MS || 2000);
if (!rom) throw Error('Supply a private original or patched ROM path');
const schedulerURL = args[2] ? pathToFileURL(args[2]) : new URL('./threaded.js', import.meta.url);
const {ThreadedSNES} = await import(schedulerURL.href);
const schedulerHash = createHash('sha256').update(fs.readFileSync(schedulerURL)).digest('hex');
const bytes = new Uint8Array(fs.readFileSync(rom));
const romHash = createHash('sha256').update(bytes).digest('hex');
let earned = null, stateMetadata = null;
if (stateFile) {
  const source = fs.readFileSync(stateFile); earned = JSON.parse(source);
  if (earned.schema !== 'hydrophone.romhack-earned-snapshot/1' || earned.rom_sha256 !== romHash || earned.rebased === true) {
    throw Error('Earned snapshot ROM lineage mismatch or rebased state');
  }
  if (!Number.isSafeInteger(earned.total_emulated_frames) || earned.total_emulated_frames <= 0 || !Array.isArray(earned.input_transcript)) {
    throw Error('Missing earned snapshot provenance');
  }
  stateMetadata = {sha256: createHash('sha256').update(source).digest('hex'), earned_frames: earned.total_emulated_frames, rom_sha256: earned.rom_sha256, rebased: false};
}
globalThis.ImageData = class {};
const p = new ThreadedSNES({getContext: () => ({createImageData: () => ({}), putImageData() {}})}, () => {});
const workerUrl = new URL('./core-worker.js', import.meta.url).href;
const worker = new Worker(`const {parentPort} = require('node:worker_threads');
  globalThis.onmessage = null;
  globalThis.postMessage = (data, transfer) => parentPort.postMessage(data, transfer);
  import(${JSON.stringify(workerUrl)}).then(() => parentPort.on('message', data => globalThis.onmessage({data})));`, {eval: true});
p.worker = {postMessage: (...args) => worker.postMessage(...args)};
worker.on('message', data => p._message(data));
worker.on('error', error => {console.error(error); process.exitCode = 1;});
const {crc} = await p._request('init', {rom: bytes, sampleRate: 48000}, [bytes.buffer]);
if (earned) await p._request('loadState', {text: JSON.stringify({schema: 'hydrophone.snesjs-state/1', rom_crc32: crc, data: earned.data})});
p._gamepad = () => {};
p.immediateInput = process.env.ASH_BENCH_IMMEDIATE_INPUT === '1';
let measurementStart = Infinity;
const capture = {core: [], intervals: [], inputs: [], discarded: 0, previous: 0,
  recordSimulationFrame(ms) {this.core.push(ms);},
  recordTimingDiscard(ms) {this.discarded += ms;},
  recordInputAccepted() {return performance.now();},
  recordInputApplied(at) {if (at >= measurementStart) this.inputs.push(performance.now() - at);},
  recordPresent() {const now = performance.now(); if (this.previous) this.intervals.push(now - this.previous); this.previous = now;}
};
p.capture = capture; p.running = true;
const start = performance.now(); p.lastTick = start;
let timer, nextPresent = start + 1000 / 60;
function tick() {
  p._frame(performance.now(), true);
  do {nextPresent += 1000 / 60;} while (nextPresent <= performance.now());
  timer = setTimeout(tick, Math.max(0, nextPresent - performance.now()));
}
timer = setTimeout(tick, 1000 / 60);
let index = 0;
const input = setInterval(() => {p._input('a', (index++ & 1) === 0, 'benchmark');}, 83);
await new Promise(resolve => setTimeout(resolve, warmup));
capture.core = []; capture.intervals = []; capture.inputs = []; capture.discarded = 0; capture.previous = 0;
measurementStart = performance.now(); const firstFrame = p.frames;
await new Promise(resolve => setTimeout(resolve, seconds * 1000));
const elapsed = performance.now() - measurementStart, measuredFrames = p.frames - firstFrame;
clearTimeout(timer); clearInterval(input); p.closed = true; p.running = false; await worker.terminate();
const pct = (values, percent) => {const a = values.slice().sort((x, y) => x - y); return a.length ? +a[Math.min(a.length - 1, Math.ceil(a.length * percent / 100) - 1)].toFixed(3) : null;};
console.log(JSON.stringify({rom_sha256: romHash, earned_snapshot: stateMetadata, immediate_input_submission: p.immediateInput, scheduler_sha256: schedulerHash, host: {os: process.platform, arch: process.arch, node: process.version, cpu: cpus()[0]?.model}, scope: 'headless Node worker; no-op 60Hz canvas; not a Windows gameplay or physical latency measurement', seconds: +(elapsed / 1000).toFixed(4), warmup_ms: warmup, frames: measuredFrames,
  simulation_fps: +(measuredFrames / elapsed * 1000).toFixed(3), core_p95_ms: pct(capture.core, 95), core_p99_ms: pct(capture.core, 99),
  present_p95_ms: pct(capture.intervals, 95), present_p99_ms: pct(capture.intervals, 99),
  accepted_to_presented_input_p50_ms: pct(capture.inputs, 50), accepted_to_presented_input_p95_ms: pct(capture.inputs, 95), input_samples: capture.inputs.length,
  discarded_time_ms: +capture.discarded.toFixed(3)}, null, 2));
