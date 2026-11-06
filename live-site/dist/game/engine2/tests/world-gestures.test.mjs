import test from 'node:test';
import assert from 'node:assert/strict';
import {bindWorldGestures} from '../world-gestures.js';

class Surface {
  constructor() { this.handlers = new Map(); this.captures = new Set(); this.captureFails = false; }
  addEventListener(type, fn) { const list = this.handlers.get(type) || []; list.push(fn); this.handlers.set(type, list); }
  removeEventListener(type, fn) { const list = (this.handlers.get(type) || []).filter(value => value !== fn); if (list.length) this.handlers.set(type, list); else this.handlers.delete(type); }
  getBoundingClientRect() { return {left: 30, top: 40, width: 700, height: 600, right: 730, bottom: 640}; }
  setPointerCapture(id) { if (this.captureFails) throw Error('capture unavailable'); this.captures.add(id); }
  releasePointerCapture(id) { if (this.captures.delete(id)) this.fire('lostpointercapture', {pointerId: id}); }
  fire(type, values = {}) {
    const event = {type, pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100,
      button: 0, detail: 1, cancelable: true, defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...values};
    if (type === 'lostpointercapture') this.captures.delete(event.pointerId);
    for (const handler of [...(this.handlers.get(type) || [])]) { handler(event); if (event.stopped) break; }
    return event;
  }
}
function fixture(initialZoom = 1, options = {}) {
  const canvas = new Surface(), lifecycle = new Surface(), taps = [], zooms = [], starts = [], ends = [];
  let zoom = initialZoom, enabled = true;
  const binding = bindWorldGestures(canvas, {active: () => enabled, getZoom: () => zoom,
    onTap: event => taps.push({type: event.type, pointerType: event.pointerType, x: event.clientX, y: event.clientY}),
    onPinchStart: () => starts.push(true), onZoom: (value, point) => { zoom = value; zooms.push({zoom: value, point}); },
    onPinchEnd: event => ends.push(event), lifecycleTarget: lifecycle, ...options});
  const fire = (type, id = 1, x = 100, y = 100, extra = {}) => canvas.fire(type, {pointerId: id, clientX: x, clientY: y, ...extra});
  return {canvas, lifecycle, binding, fire, taps, zooms, starts, ends,
    get zoom() { return zoom; }, set zoom(value) { zoom = value; },
    set enabled(value) { enabled = value; }};
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('two canvas fingers zoom outward and inward from the actual lens with a CSS-pixel midpoint', () => {
  const f = fixture(1.25);
  const first = f.fire('pointerdown', 1, 100, 100);
  assert.equal(first.defaultPrevented, true); assert.deepEqual(f.taps, []);
  f.fire('pointerdown', 2, 200, 100);
  assert.equal(f.binding.pinching, true); assert.equal(f.starts.length, 1);
  f.fire('pointermove', 1, 50, 100);
  close(f.zoom, 1.875); assert.deepEqual(f.zooms[0].point, {x: 95, y: 60});
  f.fire('pointermove', 2, 150, 100);
  close(f.zoom, 1.25); assert.deepEqual(f.zooms[1].point, {x: 70, y: 60});
  f.fire('pointerup', 1, 50, 100);
  assert.equal(f.binding.pinching, true); assert.equal(f.ends.length, 0);
  f.fire('pointermove', 2, 190, 100);
  assert.equal(f.zooms.length, 2);
  f.fire('pointerup', 2, 190, 100);
  assert.deepEqual(f.taps, []); assert.deepEqual(f.ends, [{cancelled: false, zoom: 1.25}]);
  assert.equal(f.binding.pinching, false); assert.equal(f.binding.touching, false); assert.equal(f.canvas.captures.size, 0);
});

test('a later pinch starts at the last chosen zoom instead of resetting to one', () => {
  const f = fixture();
  f.fire('pointerdown', 1, 100, 100); f.fire('pointerdown', 2, 200, 100); f.fire('pointermove', 2, 250, 100);
  close(f.zoom, 1.5); f.fire('pointerup', 1); f.fire('pointerup', 2, 250, 100);
  f.fire('pointerdown', 3, 100, 100); f.fire('pointerdown', 4, 200, 100); f.fire('pointermove', 4, 300, 100);
  close(f.zoom, 3); assert.equal(f.starts.length, 2);
});

test('zoom limits clamp safely and reverse immediately without a dead stretch', () => {
  const high = fixture(2.5);
  high.fire('pointerdown', 1, 100, 100); high.fire('pointerdown', 2, 200, 100);
  high.fire('pointermove', 2, 300, 100); assert.equal(high.zoom, 3);
  high.fire('pointermove', 2, 280, 100); close(high.zoom, 2.7);
  const low = fixture();
  low.fire('pointerdown', 1, 100, 100); low.fire('pointerdown', 2, 200, 100);
  low.fire('pointermove', 2, 110, 100); assert.equal(low.zoom, .5);
  low.fire('pointermove', 2, 112, 100); close(low.zoom, .6);
});

test('a single touch taps once on release while mouse and pen act immediately', () => {
  const f = fixture();
  f.fire('pointerdown'); assert.equal(f.taps.length, 0);
  f.fire('pointermove', 1, 105, 104); f.fire('pointerup', 1, 105, 104);
  assert.deepEqual(f.taps, [{type: 'pointerup', pointerType: 'touch', x: 105, y: 104}]);
  f.fire('pointerup', 1, 105, 104); assert.equal(f.taps.length, 1);
  f.fire('pointerdown', 10, 120, 120, {pointerType: 'mouse'});
  f.fire('pointerdown', 11, 130, 130, {pointerType: 'pen'});
  assert.deepEqual(f.taps.slice(1).map(value => value.type), ['pointerdown', 'pointerdown']);
  assert.equal(f.binding.touching, false);
  f.fire('pointerdown', 12, 130, 130, {pointerType: 'mouse', button: 2});
  assert.equal(f.taps.length, 3);
});

test('dragging out and back, ending outside, or cancellation cannot become a tap', () => {
  const f = fixture();
  f.fire('pointerdown'); f.fire('pointermove', 1, 120, 100); f.fire('pointermove', 1, 100, 100); f.fire('pointerup');
  f.fire('pointerdown', 2, 35, 100); f.fire('pointerup', 2, 29, 100);
  f.fire('pointerdown', 3); f.fire('pointercancel', 3); f.fire('pointerup', 3);
  assert.deepEqual(f.taps, []); assert.equal(f.binding.touching, false);
});

test('a third finger can replace a lifted pair member without a jump or extra lifecycle callbacks', () => {
  const f = fixture();
  f.fire('pointerdown', 1, 100, 100); f.fire('pointerdown', 2, 200, 100); f.fire('pointermove', 2, 300, 100);
  f.fire('pointerdown', 3, 500, 100); f.fire('pointermove', 3, 550, 100);
  assert.equal(f.zooms.length, 1); assert.equal(f.zoom, 2);
  f.fire('pointerup', 1, 100, 100);
  assert.equal(f.zooms.length, 1); assert.equal(f.starts.length, 1); assert.equal(f.ends.length, 0);
  f.fire('pointermove', 3, 600, 100); close(f.zoom, 2.4);
  f.fire('pointerup', 3, 600, 100); f.fire('pointerup', 2, 300, 100);
  assert.deepEqual(f.ends, [{cancelled: false, zoom: 2.4}]); assert.deepEqual(f.taps, []);
});

test('after a pinch drops to one finger all remaining and newly added contacts stay quarantined until release', () => {
  const f = fixture();
  f.fire('pointerdown', 1, 100, 100); f.fire('pointerdown', 2, 200, 100); f.fire('pointermove', 2, 250, 100);
  f.fire('pointerup', 1, 100, 100); f.fire('pointerdown', 3, 350, 100); f.fire('pointermove', 3, 450, 100);
  assert.equal(f.binding.pinching, true); assert.equal(f.zooms.length, 1); assert.equal(f.starts.length, 1);
  f.fire('pointerup', 2, 250, 100); f.fire('pointerup', 3, 450, 100);
  assert.equal(f.ends.length, 1); assert.deepEqual(f.taps, []);
  f.fire('pointerdown', 4, 200, 100); f.fire('pointerup', 4, 200, 100); assert.equal(f.taps.length, 1);
});

test('pointer cancel, lost capture and explicit cancellation end once and discard surviving fingers', () => {
  for (const action of ['pointercancel', 'lostpointercapture', 'cancel']) {
    const f = fixture();
    f.fire('pointerdown', 1, 100, 100); f.fire('pointerdown', 2, 200, 100); f.fire('pointermove', 2, 250, 100);
    if (action === 'cancel') f.binding.cancel(); else f.fire(action, 1);
    assert.equal(f.binding.pinching, false, action); assert.deepEqual(f.ends, [{cancelled: true, zoom: 1.5}]);
    f.fire('pointerup', 1); f.fire('pointerup', 2, 250, 100);
    assert.deepEqual(f.taps, []); assert.equal(f.binding.touching, false); assert.equal(f.ends.length, 1);
  }
});

test('blur and pagehide discard pointers that may never send a final up, without poisoning the next tap', () => {
  for (const type of ['blur', 'pagehide']) {
    const f = fixture();
    f.fire('pointerdown', 1, 100, 100); f.fire('pointerdown', 2, 200, 100); f.lifecycle.fire(type);
    assert.equal(f.binding.touching, false); assert.equal(f.binding.pinching, false);
    assert.deepEqual(f.ends, [{cancelled: true, zoom: null}]);
    f.fire('pointerup', 1); f.fire('pointerup', 2); assert.equal(f.taps.length, 0);
    f.fire('pointerdown', 3); f.fire('pointerup', 3); assert.equal(f.taps.length, 1);
  }
});

test('inactive surfaces reject gestures and deactivation before release cannot dispatch a world action', () => {
  const f = fixture();
  f.enabled = false; f.fire('pointerdown'); f.fire('pointerup'); assert.equal(f.binding.touching, false);
  f.enabled = true; f.fire('pointerdown'); f.enabled = false; f.fire('pointerup'); assert.deepEqual(f.taps, []);
  f.enabled = true; f.fire('pointerdown', 2, 100, 100); f.fire('pointerdown', 3, 200, 100);
  f.enabled = false; f.fire('pointerup', 2, 100, 100);
  assert.equal(f.binding.pinching, false); assert.deepEqual(f.ends, [{cancelled: true, zoom: null}]);
  f.fire('pointerup', 3, 200, 100); assert.equal(f.binding.touching, false);
});

test('only contacts that begin on the world surface are counted; captured orphans are ignored', () => {
  const f = fixture(), joystick = new Surface();
  joystick.fire('pointerdown', {pointerId: 2, clientX: 200});
  f.fire('pointermove', 2, 200, 100); f.fire('pointerup', 2, 200, 100);
  f.fire('pointerdown', 1, 100, 100);
  assert.equal(f.binding.pinching, false); f.fire('pointerup', 1, 100, 100);
  assert.equal(f.taps.length, 1); assert.equal(f.starts.length, 0);
});

test('coincident or malformed touches never emit a nonfinite zoom', () => {
  const f = fixture();
  f.fire('pointerdown', 9, NaN, 100); assert.equal(f.binding.touching, false);
  f.fire('pointerdown', 1, 100, 100); f.fire('pointerdown', 2, 100, 100);
  f.fire('pointermove', 2, 101, 100); f.fire('pointermove', 2, 110, 100); assert.equal(f.zooms.length, 0);
  f.fire('pointermove', 2, 120, 100); assert.equal(f.zoom, 2);
  f.fire('pointermove', 2, Infinity, 100); assert.equal(f.zooms.length, 1);
});

test('a touch-generated click is suppressed while a genuine mouse or keyboard click stays usable', () => {
  const f = fixture();
  f.fire('pointerdown'); f.fire('pointerup');
  assert.equal(f.canvas.fire('click').stopped, true);
  assert.equal(f.canvas.fire('click', {pointerType: undefined}).stopped, true);
  assert.equal(f.canvas.fire('click', {pointerType: undefined, detail: 0}).stopped, false);
  f.fire('pointerdown', 2, 100, 100, {pointerType: 'mouse'});
  assert.equal(f.canvas.fire('click', {pointerType: 'mouse'}).stopped, false);
  assert.equal(f.canvas.fire('click', {pointerType: undefined}).stopped, false);
  f.fire('pointerdown', 3, 100, 100, {pointerType: 'mouse', sourceCapabilities: {firesTouchEvents: true}});
  assert.equal(f.taps.length, 2);
});

test('capture rejection and outside release clean up without selecting the world', () => {
  const f = fixture(); f.canvas.captureFails = true;
  f.fire('pointerdown'); assert.equal(f.binding.touching, true);
  f.lifecycle.fire('pointerup', {pointerId: 1, clientX: 900});
  assert.equal(f.binding.touching, false); assert.deepEqual(f.taps, []);
});

test('callbacks can synchronously cancel or destroy without stale zoom updates, duplicate endings or held captures', () => {
  let f = fixture(1, {onPinchStart: () => f.binding.cancel()});
  f.fire('pointerdown', 1, 100, 100); f.fire('pointerdown', 2, 200, 100); f.fire('pointermove', 2, 300, 100);
  assert.deepEqual(f.zooms, []); assert.deepEqual(f.ends, [{cancelled: true, zoom: null}]);
  f.fire('pointerup', 1); f.fire('pointerup', 2, 300, 100); assert.deepEqual(f.taps, []);
  f = fixture(1, {onZoom: () => f.binding.destroy()});
  f.fire('pointerdown', 1, 100, 100); f.fire('pointerdown', 2, 200, 100); f.fire('pointermove', 2, 300, 100);
  assert.deepEqual(f.ends, [{cancelled: true, zoom: 2}]); assert.equal(f.binding.touching, false);
  assert.equal(f.canvas.captures.size, 0); assert.equal(f.canvas.handlers.size, 0); assert.equal(f.lifecycle.handlers.size, 0);
  f.binding.destroy(); assert.equal(f.ends.length, 1);
});
