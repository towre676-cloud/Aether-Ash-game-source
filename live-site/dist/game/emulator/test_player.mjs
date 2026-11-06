import test from 'node:test';
import assert from 'node:assert/strict';
import { SNESPlayer } from './player.js';

globalThis.window = { addEventListener() {}, removeEventListener() {} };

function player() {
  const events = [];
  const p = new SNESPlayer({ tagName: 'CANVAS', focus() {} }, { onStatus: (s) => events.push(s) });
  const calls = [];
  const replies = [];
  const module = {
    _cmd_set_volume: (v) => calls.push(['volume', v]),
    EmscriptenReceiveCommandReply: () => replies.shift(),
    EmscriptenSendCommand(command) {
      calls.push(['command', command]);
      const parts = command.split(' ');
      if (parts[0] === 'READ_CORE_MEMORY') replies.push(`${parts[0]} ${parts[1]} 10 FF\n`);
      else replies.push(`${parts[0]} ${parts[1]} ${parts.length - 2}\n`);
    },
  };
  p.instance = {
    getEmscriptenModule: () => module,
    pressDown: (b) => calls.push(['down', b]),
    pressUp: (b) => calls.push(['up', b]),
    pause: () => calls.push(['pause']), resume: () => calls.push(['resume']),
    saveState: async () => ({ state: new Blob(['state']) }),
    loadState: async (b) => calls.push(['state', await b.text()]),
  };
  p.status = 'running';
  return { p, calls, events, module };
}

test('linear volume maps to native decibels and exact mute', () => {
  const { p, calls } = player();
  p.setVolume(1); p.setVolume(.5); p.setVolume(0);
  assert.equal(calls[0][1], 0);
  assert.ok(Math.abs(calls[1][1] + 6.020599913279624) < 1e-10);
  assert.equal(calls[2][1], -1000);
  assert.throws(() => p.setVolume(NaN), RangeError);
  assert.throws(() => p.setVolume(2), RangeError);
});

test('touch/button repeats and pause release cannot leave a stuck key', () => {
  const { p, calls, events } = player();
  p.buttonDown('a'); p.buttonDown('a'); p.buttonDown('left'); p.pause();
  p.buttonDown('b'); p.resume(); p.buttonDown('b'); p.releaseButtons();
  assert.deepEqual(calls, [['down', 'a'], ['down', 'left'], ['up', 'a'], ['up', 'left'], ['pause'], ['resume'], ['down', 'b'], ['up', 'b']]);
  assert.deepEqual(events, ['paused', 'running']);
  assert.throws(() => p.buttonDown('fire'), RangeError);
});

test('independent touch pointers preserve another pointer holding the same button', () => {
  const {p,calls}=player();
  p.buttonDown('a','touch:1');p.buttonDown('a','touch:2');p.buttonUp('a','touch:1');
  assert.deepEqual(calls,[['down','a']]);assert.equal(p.held.has('a'),true);
  p.buttonUp('a','touch:2');assert.deepEqual(calls,[['down','a'],['up','a']]);
  p.buttonDown('left','touch:3');p.pause();p.resume();p.buttonUp('left','touch:3');
  assert.equal(p.held.size,0);assert.equal(p.inputSources.size,0);
});

test('loading a state clears wrapper holds so the same touch can press again', async () => {
  const {p,calls}=player();p.buttonDown('a','touch:1');
  await p.importState(new Blob(['saved']));p.buttonDown('a','touch:1');
  assert.deepEqual(calls,[['down','a'],['up','a'],['state','saved'],['down','a']]);
});

test('WRAM reads use SNES bus map and preserve unsigned bytes', async () => {
  const { p, calls } = player();
  assert.deepEqual([...await p.readMemory(0x1e00, 2)], [16, 255]);
  assert.deepEqual(calls, [['command', 'READ_CORE_MEMORY 7e1e00 2']]);
  assert.deepEqual([...await p.readMemory(0x7e1e00, 2)], [16, 255]);
  assert.throws(() => p.readMemory(-1, 2), RangeError);
  assert.throws(() => p.readMemory(0xffffff, 2), RangeError);
});

test('failed memory response cannot become a fabricated cue', async () => {
  const { p, module } = player();
  let reply;
  module.EmscriptenReceiveCommandReply = () => { const value = reply; reply = undefined; return value; };
  module.EmscriptenSendCommand = () => { reply = 'READ_CORE_MEMORY 7e1e00 -1 no descriptor\n'; };
  await assert.rejects(p.readMemory(0x1e00, 2), /memory read failed/);
});

test('memory writes encode bytes and validate native acknowledgement', async () => {
  const { p, calls } = player();
  assert.equal(await p.writeMemory(0x1eff, Uint8Array.from([0, 255, 9])), 3);
  assert.deepEqual(calls, [['command', 'WRITE_CORE_MEMORY 7e1eff 00 ff 09']]);
});

test('state export/import preserves Blob bytes', async () => {
  const { p, calls } = player();
  const state = await p.exportState();
  assert.equal(await state.text(), 'state');
  await p.importState(state);
  assert.deepEqual(calls, [['state', 'state']]);
  await assert.rejects(p.importState('state'), TypeError);
});

test('native fatal log latches error rather than leaving a running claim', () => {
  const { p, events } = player();
  p._log({ level: 'error', message: 'RuntimeError: null function', source: 'frontend' });
  assert.equal(p.status, 'error');
  assert.match(p.getDiagnostics().nativeError, /null function/);
  assert.equal(p.getDiagnostics().logs.length, 1);
  assert.equal(events.at(-1), 'error');
});
