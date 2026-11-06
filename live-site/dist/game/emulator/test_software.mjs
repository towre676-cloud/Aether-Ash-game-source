import test from 'node:test';
import assert from 'node:assert/strict';
import { Snes } from './vendor/snesjs/core.js';
import { captureState, restoreState, SoftwareSNES, keyboardButton } from './software.js';

test('software core state restores registers, typed views and original circular links', () => {
  const core=new Snes();core.ram[42]=197;core.cpu.br[0]=0xabcd;
  const state=JSON.parse(JSON.stringify(captureState(core)));
  core.ram[42]=0;core.cpu.br[0]=0;restoreState(core,state);
  assert.equal(core.ram[42],197);assert.equal(core.cpu.br[0],0xabcd);
  assert.equal(core.cpu.mem,core);assert.equal(core.ppu.snes,core);assert.equal(core.apu.snes,core);
  assert.equal(typeof core.runFrame,'function');
});

test('malformed state fails before any valid preceding field is applied', () => {
  const core=new Snes(),state=JSON.parse(JSON.stringify(captureState(core)));
  state.ram.values[2]=257;state.frames=123;
  assert.throws(()=>restoreState(core,state),/invalid array/);
  assert.equal(core.frames,0);assert.equal(core.ram[2],0);
});

test('partial states and added object/prototype fields are rejected', () => {
  const core=new Snes();assert.throws(()=>restoreState(core,{}),/incomplete/);
  const state=JSON.parse(JSON.stringify(captureState(core)));state.extra=1;
  assert.throws(()=>restoreState(core,state),/incomplete|unknown/);
  delete state.extra;Object.defineProperty(state,'__proto__',{value:{polluted:1},enumerable:true});
  assert.throws(()=>restoreState(core,state),/incomplete|unknown/);
  assert.equal({}.polluted,undefined);
});

test('timer-paced core catches up real elapsed time and bounds a suspended backlog', () => {
  const saved=globalThis.setTimeout;let scheduled=0;
  globalThis.setTimeout=()=>{scheduled++;return 1};
  try {
    let frames=0;
    const self={closed:false,running:true,lastTick:0,accumulator:0,frames:0,lastDiagnosticFrame:0,
      _gamepad(){},_queueAudio(){},onLog(){},core:{runFrame(){frames++},setPixels(){},cpu:{br:[],r:[]},ppu:{}},
      image:{data:new Uint8ClampedArray(4)},context:{putImageData(){}},canvas:{width:512,height:480}};
    const {prototype}=SoftwareSNES;
    prototype._tick.call(self,16.667);prototype._tick.call(self,33.334);prototype._tick.call(self,50.001);
    assert.equal(frames,3);assert.equal(scheduled,3);
    prototype._tick.call(self,10000);
    assert.equal(frames,9);assert.ok(self.accumulator<1000/60);
  } finally {globalThis.setTimeout=saved;}
});


test('keyboard accepts physical codes and key-only browser/automation events', () => {
  assert.equal(keyboardButton({code:'KeyX',key:'x'}),'a');
  assert.equal(keyboardButton({key:'x'}),'a');
  assert.equal(keyboardButton({key:'X'}),'a');
  assert.equal(keyboardButton({code:'ArrowUp',key:'ArrowUp'}),'up');
  assert.equal(keyboardButton({key:'ArrowUp'}),'up');
  assert.equal(keyboardButton({key:'ArrowDown'}),'down');
  assert.equal(keyboardButton({key:'Enter'}),'start');
  assert.equal(keyboardButton({key:'z'}),'b');
  assert.equal(keyboardButton({key:'Shift'}),'select');
  assert.equal(keyboardButton({key:'Escape'}),undefined);
});

function inputCore() {
  const listeners=new Map();
  globalThis.window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)}};
  const context={createImageData:()=>({data:new Uint8ClampedArray(512*480*4)}),putImageData(){}};
  const self=new SoftwareSNES({getContext:()=>context},()=>{});self.running=true;self._bindKeys();
  const event=(code,key,extra={})=>({code,key,target:{tagName:'CANVAS'},preventDefault(){this.prevented=true},...extra});
  return {self,listeners,event,mask:()=>self.core.joypad1State};
}

test('all twelve physical keyboard controls reach the actual SNES joypad bits', () => {
  const {self,event,mask}=inputCore();
  for(const [code,key,bit]of [['KeyZ','z',0],['KeyA','a',1],['ShiftRight','Shift',2],['Enter','Enter',3],['ArrowUp','ArrowUp',4],['ArrowDown','ArrowDown',5],['ArrowLeft','ArrowLeft',6],['ArrowRight','ArrowRight',7],['KeyX','x',8],['KeyS','s',9],['KeyQ','q',10],['KeyW','w',11]]){
    self.keyDown(event(code,key));assert.equal(mask(),1<<bit,code+' presses the proper core bit');
    self.keyUp(event(code,key));assert.equal(mask(),0,code+' releases');
  }
});

test('aliased keyboard keys and overlapping sources release independently', () => {
  const {self,event,mask}=inputCore();
  self.keyDown(event('ShiftLeft','Shift'));self.keyDown(event('ShiftRight','Shift'));
  self.keyUp(event('ShiftLeft','Shift'));assert.equal(mask(),1<<2);
  self.keyUp(event('ShiftRight','Shift'));assert.equal(mask(),0);
  self.keyDown(event('KeyX','x'));self.pressDown('a');self.keyUp(event('KeyX','x'));
  assert.equal(mask(),1<<8,'touch hold survives keyboard release');
  self.pressUp('a');assert.equal(mask(),0);
});

test('keyboard shortcuts and focused form controls are not consumed by gameplay', () => {
  const {self,event,mask}=inputCore();
  for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{target:{tagName:'INPUT'}},{target:{tagName:'BUTTON'}},{target:{tagName:'A'}},{target:{isContentEditable:true}}]){
    const e=event('KeyS','s',extra);self.keyDown(e);assert.equal(mask(),0);assert.equal(e.prevented,undefined);
  }
  self.keyDown(event('KeyX','x'));self.keyUp(event('KeyX','x',{target:{tagName:'INPUT'}}));
  assert.equal(mask(),0,'release is honored even if focus moved to a form');
});

test('conflicting directions neutralize and the remaining held direction resumes', () => {
  const {self,event,mask}=inputCore();
  self.keyDown(event('ArrowLeft','ArrowLeft'));self._input('right',true,'gamepad');
  assert.equal(mask(),0);
  self._input('right',false,'gamepad');assert.equal(mask(),1<<6);
  self.keyUp(event('ArrowLeft','ArrowLeft'));assert.equal(mask(),0);
  self._input('up',true,'touch:1');self._input('down',true,'touch:2');assert.equal(mask(),0);
  self._input('up',false,'touch:1');assert.equal(mask(),1<<5);
});

test('blur, pause, and state reload release inputs without resurrecting stale repeats', async () => {
  const {self,event,mask}=inputCore();
  self.keyDown(event('KeyX','x'));self.blur();assert.equal(mask(),0);
  self.keyDown(event('KeyX','x',{repeat:true}));assert.equal(mask(),0);
  self.keyDown(event('KeyX','x'));self.pause();assert.equal(mask(),0);
  self.pressDown('a');assert.equal(mask(),0,'paused touch cannot latch');
  self.resume();self.romCRC=123;const {state}=await self.saveState();
  self.keyDown(event('KeyX','x'));self.pressDown('left');await self.loadState(state);
  assert.equal(mask(),0);assert.equal(self.inputSources.size,0);
});

function mockGamepad(pad) { Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pad?[null,pad]:[]}}); }
function pad() { return {connected:true,buttons:Array.from({length:16},()=>({pressed:false})),axes:[0,0]}; }

test('all twelve standard gamepad controls, stick axes, and disconnect reach the core', () => {
  const {self,mask}=inputCore(),p=pad();mockGamepad(p);
  for(const [index,bit]of [[0,0],[2,1],[8,2],[9,3],[12,4],[13,5],[14,6],[15,7],[1,8],[3,9],[4,10],[5,11]]){
    p.buttons[index].pressed=true;self._gamepad();assert.equal(mask(),1<<bit,'gamepad button '+index);
    p.buttons[index].pressed=false;self._gamepad();assert.equal(mask(),0);
  }
  p.axes=[-.8,.8];self._gamepad();assert.equal(mask(),(1<<6)|(1<<5));
  p.axes=[.8,-.8];self._gamepad();assert.equal(mask(),(1<<7)|(1<<4));
  mockGamepad(null);self._gamepad();assert.equal(mask(),0,'disconnect releases every gamepad bit');
});

test('gamepad pause chord is suppressed, latches through resume, and preserves native Start', () => {
  const {self,mask}=inputCore(),p=pad();mockGamepad(p);let pauses=0;
  self.onPauseRequest=()=>{pauses++;self.pause()};
  p.buttons[8].pressed=p.buttons[9].pressed=true;self._gamepad();assert.equal(pauses,1);assert.equal(mask(),0);
  self.resume();self._gamepad();assert.equal(pauses,1);assert.equal(mask(),0);
  p.buttons[8].pressed=false;self._gamepad();assert.equal(mask(),0,'partial chord release remains suppressed');
  p.buttons[9].pressed=false;self._gamepad();p.buttons[9].pressed=true;self._gamepad();assert.equal(mask(),1<<3,'Start works natively after chord release');
  p.buttons[8].pressed=true;self._gamepad();assert.equal(pauses,2);
});

test('blocked gamepad API releases stale gamepad input without stopping keyboard input', () => {
  const {self,event,mask}=inputCore();self.keyDown(event('KeyX','x'));self._input('left',true,'gamepad');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads(){throw Error('blocked')}}});
  self._gamepad();assert.equal(mask(),1<<8);
});
