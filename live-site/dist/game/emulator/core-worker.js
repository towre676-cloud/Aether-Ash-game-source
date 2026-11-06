/** SNES core thread. Runs SnesJs off the page's main thread so input, menus,
 * saves and garbage collection there cannot stall emulation, and vice versa.
 * The page asks for N frames at a time (paced by its display clock) and gets
 * back the last frame's pixels plus every frame's audio. */
import { Snes, setLogger } from './vendor/snesjs/core.js';
import { captureState, restoreState } from './software.js';

let core = null, romCRC = 0, sampleRate = 48000, sampleDebt = 0, frames = 0;
let left = new Float64Array(1024), right = new Float64Array(1024);
const pool = []; // returned pixel buffers, reused to avoid per-frame allocation

function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let n = 0; n < 8; n++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; }
const reply = (id, value, transfer = []) => postMessage({id, ok: true, value}, transfer);
const fail = (id, error) => postMessage({id, ok: false, error: String(error?.message || error)});

function setButtons(mask) {
  for (let i = 0; i < 12; i++) {
    if (mask & (1 << i)) core.setPad1ButtonPressed(i); else core.setPad1ButtonReleased(i);
  }
}

function run({frames: count, buttons}) {
  setButtons(buttons);
  const durations = new Float32Array(count);
  // Exact long-run sample rate: carry the fractional samples between frames.
  let total = 0;
  const per = [];
  for (let i = 0; i < count; i++) { sampleDebt += sampleRate / 60; const n = Math.floor(sampleDebt); sampleDebt -= n; per.push(n); total += n; }
  const audio = new Float32Array(total * 2);
  let at = 0;
  for (let i = 0; i < count; i++) {
    const began = performance.now();
    core.runFrame();
    durations[i] = performance.now() - began;
    const n = per[i];
    if (left.length < n) { left = new Float64Array(n); right = new Float64Array(n); }
    core.setSamples(left, right, n);
    for (let k = 0; k < n; k++) { audio[at++] = left[k]; audio[at++] = right[k]; }
    frames++;
  }
  const buffer = pool.pop() || new ArrayBuffer(512 * 480 * 4);
  core.setPixels(new Uint8ClampedArray(buffer));
  return {pixels: buffer, audio, durations, frame: frames};
}

onmessage = async ({data}) => {
  const {id, type} = data;
  try {
    if (type === 'init') {
      setLogger(message => postMessage({log: String(message)}));
      core = new Snes();
      if (!core.loadRom(data.rom, true)) throw Error('Unable to load SNES HiROM');
      core.reset(true);
      romCRC = crc32(data.rom); sampleRate = data.sampleRate || 48000; frames = 0;
      if (data.sram) {
        if (data.sram.length !== core.cart.sram.length) throw Error('SRAM size does not match game');
        core.cart.sram.set(data.sram);
      }
      if (data.state) loadState(data.state);
      reply(id, {crc: romCRC});
    } else if (type === 'run') {
      const out = run(data);
      reply(id, out, [out.pixels, out.audio.buffer, out.durations.buffer]);
    } else if (type === 'recycle') {
      if (pool.length < 3) pool.push(data.buffer);
    } else if (type === 'read') {
      const offset = data.address - 0x7e0000;
      if (offset < 0 || offset + data.length > core.ram.length) throw Error('Software memory API supports WRAM only');
      reply(id, core.ram.slice(offset, offset + data.length));
    } else if (type === 'write') {
      const offset = data.address - 0x7e0000;
      if (offset < 0 || offset + data.bytes.length > core.ram.length) throw Error('Software memory API supports WRAM only');
      core.ram.set(data.bytes, offset); reply(id, data.bytes.length);
    } else if (type === 'saveState') {
      // Serialised here, off the page thread; the page only stores the text.
      reply(id, JSON.stringify({schema: 'hydrophone.snesjs-state/1', rom_crc32: romCRC, data: captureState(core)}));
    } else if (type === 'loadState') {
      loadState(data.text); reply(id, {frame: frames});
    } else if (type === 'saveSRAM') {
      reply(id, core.cart.sram.slice());
    } else if (type === 'pixels') {
      const buffer = pool.pop() || new ArrayBuffer(512 * 480 * 4);
      core.setPixels(new Uint8ClampedArray(buffer)); reply(id, buffer, [buffer]);
    }
  } catch (error) { fail(id, error); }
};

function loadState(text) {
  const state = JSON.parse(text);
  if (state.schema !== 'hydrophone.snesjs-state/1' || state.rom_crc32 !== romCRC) throw Error('Save state does not match this game and emulator');
  restoreState(core, state.data);
  sampleDebt = 0;
}
