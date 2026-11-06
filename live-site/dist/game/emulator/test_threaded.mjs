import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ThreadedSNES} from './threaded.js';
import {BUTTON, STEP} from './software.js';

const canvas = () => ({getContext: () => ({createImageData: () => ({}), putImageData() {}})});
function fixture() {
  const p = new ThreadedSNES(canvas(), () => {}), pending = [], recycled = [];
  p.running = true; p.lastTick = 0; p._gamepad = () => {};
  p._request = (type, payload) => new Promise(resolve => pending.push({type, payload, resolve}));
  p._recycle = pixels => recycled.push(pixels);
  return {p, pending, recycled};
}
const result = () => ({pixels: new ArrayBuffer(4), audio: new Float32Array(0), durations: new Float32Array([8])});

// Do not complete jobs in these tests: inspect the exact worker mailbox at
// an input transition while a slow frame is still executing.
test('slow core cannot accumulate jobs containing stale controller state', () => {
  const {p, pending} = fixture();
  p._pump(17); p._input('right', true, 'keyboard'); p._pump(34); p._pump(51);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].payload.frames, 1);
  assert.equal(pending[0].payload.buttons, 0);
  p.inflight = 0; // equivalent to receiving that completed frame
  p._pump(52);
  assert.equal(pending.length, 2);
  assert.equal(pending[1].payload.frames, 1);
  assert.equal(pending[1].payload.buttons, 1 << BUTTON.right);
});

test('a press and release between worker requests survives for one frame only', () => {
  const {p, pending} = fixture();
  p._input('a', true, 'touch'); p._input('a', false, 'touch');
  assert.equal(p.buttons, 0);
  p._pump(17);
  assert.equal(pending[0].payload.buttons, 1 << BUTTON.a);
  p.inflight = 0; p._pump(34);
  assert.equal(pending[1].payload.buttons, 0);
});

test('held opposite direction replaces an old short directional tap', () => {
  const {p, pending} = fixture();
  p._input('left', true, 'keyboard'); p._input('left', false, 'keyboard');
  p._input('right', true, 'keyboard'); p._pump(17);
  assert.equal(pending[0].payload.buttons, 1 << BUTTON.right);
});

test('display presents newest finished picture and recycles superseded pictures', () => {
  const {p, recycled} = fixture(), drawn = [];
  p._draw = ({frame}) => drawn.push(frame); p._pump = () => {};
  p.ready = [1, 2, 3].map(frame => ({frame, pixels: frame}));
  p._frame(17, true);
  assert.deepEqual(drawn, [3]); assert.deepEqual(recycled, [1, 2]);
});

test('pause invalidates a late frame instead of displaying or sounding it', () => {
  const {p, recycled} = fixture(), generation = p.generation;
  p.pause(); const frame = result(); p._arrive(frame, [], generation);
  assert.equal(p.ready.length, 0); assert.equal(recycled.length, 1);
  assert.equal(p.frames, 1); // completed emulation is still accounted for
});

test('backlog is bounded and any discarded time is explicitly reported', () => {
  const {p} = fixture(); let discarded = 0;
  p.capture = {recordTimingDiscard: ms => discarded += ms};
  p._pump(200);
  assert.ok(p.accumulator <= 100); assert.equal(discarded, 100);
  assert.equal(p.inflight, 1);
});

test('input telemetry is applied only when its consuming frame is presented', () => {
  const {p} = fixture(), applied = [];
  p.context.putImageData = () => {}; globalThis.ImageData = class {};
  p.capture = {recordInputApplied: token => applied.push(token), recordPresent() {}};
  p.applied = [{tokens: [1], first: 1}, {tokens: [2], first: 2}];
  p._draw({pixels: new ArrayBuffer(4), frame: 1});
  assert.deepEqual(applied, [1]); assert.equal(p.applied.length, 1);
});

function audioProcessor(rate) {
  let Audio;
  class Base {constructor() {this.port = {postMessage() {}};}}
  const context = {sampleRate: rate, AudioWorkletProcessor: Base, registerProcessor: (_, value) => Audio = value};
  vm.runInNewContext(fs.readFileSync(new URL('./audio-worklet.js', import.meta.url), 'utf8'), context);
  return new Audio();
}
for (const rate of [44100, 48000]) test(`audio queue tolerates 60-second jittered delivery at ${rate} Hz`, () => {
  const audio = audioProcessor(rate), arrivals = [], duration = 60000;
  let debt = 0;
  for (let frame = 0; frame < duration / STEP; frame++) {
    debt += rate / 60; const count = Math.floor(debt); debt -= count;
    // No long-term clock drift; deterministic +/-6 ms delivery jitter.
    arrivals.push({at: (frame + 1) * STEP + Math.sin(frame * 1.7) * 6, count});
  }
  let index = 0, maximum = 0;
  const out = [new Float32Array(128), new Float32Array(128)];
  for (let t = 0; t < duration; t += 128 * 1000 / rate) {
    while (index < arrivals.length && arrivals[index].at <= t) {
      audio.push(new Float32Array(arrivals[index++].count * 2));
    }
    maximum = Math.max(maximum, audio.size * 1000 / rate);
    audio.process([], [out]);
  }
  assert.equal(audio.underruns, 0);
  assert.ok(maximum < 70, `maximum ${maximum}ms`);
  assert.ok(audio.target * 1000 / rate <= 33.34);
});

test('audio backlog and reset cannot leave old sound playing after resume', () => {
  const audio = audioProcessor(48000);
  audio.push(new Float32Array(48000));
  assert.ok(audio.size <= audio.target); assert.equal(audio.resyncs, 1);
  audio.port.onmessage({data: {type: 'clear'}});
  assert.equal(audio.size, 0); assert.equal(audio.started, false);
});

test('short-tap release telemetry waits for the frame that actually releases it', () => {
  const {p} = fixture(); let token = 0;
  p.capture = {recordInputAccepted: () => ++token, recordTimingDiscard() {}};
  p._input('a', true, 'touch'); p._input('a', false, 'touch');
  p._pump(17);
  // Press is consumed in this frame; release must wait until the next frame.
  assert.equal(p.tokens.length, 1); assert.equal(p.tokens[0].token, 2);
  p.inflight = 0; p._pump(34);
  assert.equal(p.tokens.length, 0);
});

test('a completed input response is submitted immediately and never overwritten by an older picture', () => {
  const {p, recycled} = fixture(), drawn = [];
  p.immediateInput = true;
  p.capture = {recordSimulationFrame() {}};
  p._draw = frame => {drawn.push(frame); p.applied = [];};
  const old = new ArrayBuffer(4); p.ready = [{pixels: old, frame: 0}];
  const current = result(); p._arrive(current, [123], p.generation);
  assert.equal(drawn.length, 1); assert.equal(drawn[0].pixels, current.pixels);
  assert.equal(p.ready.length, 0); assert.deepEqual(recycled, [old]);
  p._pump = () => {}; p._frame(17, true);
  assert.equal(drawn.length, 1);
});

test('production inputs track consuming frames even when telemetry is disabled', () => {
  const {p} = fixture(); assert.equal(p.capture, undefined);
  p._input('a', true, 'keyboard');
  assert.equal(p.tokens.length, 1); assert.equal(p.tokens[0].token, null);
});

test('contradictory gamepad directions cannot latch a transient first direction', () => {
  const {p, pending} = fixture();
  p._input('left', true, 'gamepad'); p._input('right', true, 'gamepad');
  p._pump(17);
  assert.equal(pending[0].payload.buttons, 0);
  p._input('left', false, 'gamepad'); p.inflight = 0; p._pump(34);
  assert.equal(pending[1].payload.buttons, 1 << BUTTON.right);
});

test('production default presents input-consuming frames on the display clock', () => {
  const {p} = fixture(), drawn = [];
  assert.equal(p.immediateInput, false);
  p.capture = {recordSimulationFrame() {}};
  p._draw = frame => {drawn.push(frame); p.applied = [];};
  const current = result(); p._arrive(current, [123], p.generation);
  assert.equal(drawn.length, 0); assert.equal(p.ready.length, 1);
  p._pump = () => {}; p._frame(17, true);
  assert.equal(drawn.length, 1); assert.equal(drawn[0].pixels, current.pixels);
});
