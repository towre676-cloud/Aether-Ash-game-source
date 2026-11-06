import { Snes, setLogger } from './vendor/snesjs/core.js';

const BUTTON = {b:0,y:1,select:2,start:3,up:4,down:5,left:6,right:7,a:8,x:9,l:10,r:11};
const KEYS = {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyX:'a',KeyZ:'b',KeyS:'x',KeyA:'y',KeyQ:'l',KeyW:'r',Enter:'start',ShiftRight:'select',ShiftLeft:'select'};
const KEY_NAMES = {arrowup:'up',arrowdown:'down',arrowleft:'left',arrowright:'right',up:'up',down:'down',left:'left',right:'right',x:'a',z:'b',s:'x',a:'y',q:'l',w:'r',enter:'start',shift:'select'};
export {BUTTON,STEP};
export function keyboardButton(event) { return KEYS[event.code] || KEY_NAMES[String(event.key || '').toLowerCase()]; }
function keyboardSource(event) { return 'keyboard:'+(event.code||String(event.key||'').toLowerCase()); }
const STEP = 1000/60;
function crc32(bytes) { let c=0xffffffff;for(const b of bytes){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0; }

/** Snapshot data only. Existing constructor objects, functions and cycles remain intact. */
export function captureState(core) {
  const seen=new WeakSet();
  function visit(value) {
    if(typeof value==='function'||value===undefined)return undefined;
    if(value===null||typeof value!=='object')return value;
    if(seen.has(value))return undefined;seen.add(value);
    if(ArrayBuffer.isView(value))return {$typed:value.constructor.name,values:Array.from(value)};
    if(Array.isArray(value))return value.map(v=>visit(v)??null);
    const out={};
    for(const key of Object.keys(value)) {
      if(value===core.cart && ['data','header'].includes(key))continue;
      const child=visit(value[key]);if(child!==undefined)out[key]=child;
    }
    return out;
  }
  return visit(core);
}

export function restoreState(core, data) {
  const writes=[], expectedRoot=captureState(core);
  function validate(target,source,depth=0,expected=expectedRoot,path='core') {
    if(depth>24)throw Error('State nesting is too deep');
    if(ArrayBuffer.isView(target)) {
      if(!source||Object.keys(source).sort().join(',')!=='$typed,values')throw Error('Invalid typed-array state fields');
      if(!source||source.$typed!==target.constructor.name||!Array.isArray(source.values)||source.values.length!==target.length)throw Error('State typed-array layout does not match');
      const float=/^Float/.test(target.constructor.name);
      const bits=target.BYTES_PER_ELEMENT*8,signed=/^Int/.test(target.constructor.name);
      const min=signed?-(2**(bits-1)):0,max=signed?2**(bits-1)-1:2**bits-1;
      if(source.values.some(v=>!Number.isFinite(v)||(!float&&(!Number.isInteger(v)||v<min||v>max))))throw Error('State has invalid array data');
      writes.push(()=>target.set(source.values));return;
    }
    if(!source||typeof source!=='object'||Array.isArray(target)!==Array.isArray(source))throw Error('State object layout does not match');
    if(Array.isArray(target)&&target.length!==source.length)throw Error('State array length does not match');
    if(Object.keys(source).sort().join(',')!==Object.keys(expected).sort().join(','))throw Error('State fields are incomplete or unknown');
    for(const key of Object.keys(source)) {
      if(['__proto__','prototype','constructor'].includes(key)||!Object.hasOwn(target,key))throw Error('Unknown state field');
      if(target===core.cart&&['data','header'].includes(key))throw Error('ROM data is not part of a save state');
      const current=target[key],value=source[key];
      if(typeof current==='function'){if(value!==null)throw Error('State cannot replace code');continue;}
      if(current&&typeof current==='object'){validate(current,value,depth+1,expected[key],path+'.'+key);continue;}
      // Original PPU reset uses false as the OAM latch's zero sentinel; writes
      // at $2104 replace it with an unsigned16-bit word. Both are valid state.
      if(path==='core.ppu'&&key==='oamBuffer') {
        if(value!==false&&(!Number.isInteger(value)||value<0||value>0xffff))throw Error('Invalid OAM latch state at '+path+'.'+key);
      } else if(typeof current!==typeof value||(typeof value==='number'&&!Number.isFinite(value)))throw Error('Invalid state field type at '+path+'.'+key+' ('+typeof current+' -> '+typeof value+')');
      writes.push(()=>{target[key]=value});
    }
  }
  validate(core,data);for(const write of writes)write();
}

export class SoftwareSNES {
  static async create(canvas, bytes, {sram,state,debug=false,onLog=()=>{},onPauseRequest=()=>{}}={}) {
    const self=new SoftwareSNES(canvas,onLog,onPauseRequest);
    self.debug=!!debug;self.romCRC=crc32(bytes);
    if(!self.core.loadRom(bytes,true))throw Error('Unable to load SNES HiROM');
    self.core.reset(true);
    if(sram){const b=new Uint8Array(await sram.arrayBuffer());if(b.length!==self.core.cart.sram.length)throw Error('SRAM size does not match game');self.core.cart.sram.set(b);}
    if(state)await self.loadState(state);
    self._initializeAudio();self._bindKeys();
    self.running=true;self.lastTick=performance.now();self.loop=setTimeout(()=>self._tick(performance.now()),4);
    onLog({level:'info',source:'core',message:'SnesJs Canvas2D emulation active; actual CPU, PPU and APU; no GPU required'});
    if(self.debug)self.diagnosticTimer=setInterval(()=>onLog({level:'info',source:'core',message:'Timing diagnostic '+JSON.stringify({frames:self.frames,core_frames:self.core.frames,hidden:document.hidden,focus:document.hasFocus(),running:self.running,last_tick:self.lastTick,now:performance.now(),accumulator:self.accumulator,pc:self.core.cpu.br[4],bank:self.core.cpu.r[1],frame_ms:self.lastFrameMs,audio_state:self.audio?.state})}),1000);
    return self;
  }

  constructor(canvas,onLog,onPauseRequest=()=>{},{threaded=false}={}) {
    this.canvas=canvas;this.onLog=onLog;this.onPauseRequest=onPauseRequest;
    if(!threaded)setLogger(message=>onLog({level:'info',source:'core',message}));
    // A threaded subclass keeps the core in its worker; only input, canvas
    // and audio live here.
    this.core=threaded?null:new Snes();this.running=false;this.closed=false;this.sources=new Set();this.inputSources=new Map();this.pauseChordHeld=false;
    canvas.width=512;canvas.height=480;
    this.context=canvas.getContext('2d',{alpha:false});
    if(!this.context)throw Error('Canvas2D is unavailable');
    this.image=this.context.createImageData(512,480);this.context.imageSmoothingEnabled=false;
    this.accumulator=0;this.frames=0;this.audioTime=0;
  }

  _initializeAudio() {
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)return;
    try {
      this.audio=new Context();this.gain=this.audio.createGain();this.gain.gain.value=0;this.gain.connect(this.audio.destination);
      this.samples=Math.floor(this.audio.sampleRate/60);
      this.left=new Float64Array(this.samples);this.right=new Float64Array(this.samples);
      this.audio.resume().catch(()=>{});
    }catch(error){this.onLog({level:'warn',source:'core',message:'Game effects audio unavailable: '+error.message})}
  }

  _queueAudio() {
    if(!this.audio||this.audio.state!=='running')return;
    this.core.setSamples(this.left,this.right,this.samples);
    const buffer=this.audio.createBuffer(2,this.samples,this.audio.sampleRate);
    buffer.getChannelData(0).set(this.left);buffer.getChannelData(1).set(this.right);
    const source=this.audio.createBufferSource();source.buffer=buffer;source.connect(this.gain);
    const now=this.audio.currentTime;
    if(this.audioTime<now+.005||this.audioTime>now+.15)this.audioTime=now+.025;
    source.start(this.audioTime);this.audioTime+=buffer.duration;this.sources.add(source);source.onended=()=>this.sources.delete(source);
  }

  _tick(time) {
    if(this.closed)return;
    this.loop=setTimeout(()=>this._tick(performance.now()),4);
    if(!this.running){this.lastTick=time;this.accumulator=0;return;}
    this.accumulator=Math.min(6*STEP,this.accumulator+Math.max(0,Math.min(100,time-this.lastTick)));this.lastTick=time;
    let count=Math.min(6,Math.floor(this.accumulator/STEP));
    if(!count)return;
    this._gamepad();
    if(!this.running)return; // A controller pause chord may have paused us.
    try {
      while(count-->0){const began=performance.now();this.core.runFrame();this.lastFrameMs=performance.now()-began;this.frames++;this.accumulator-=STEP;this._queueAudio();}
      this.core.setPixels(this.image.data);this.context.putImageData(this.image,0,0);
      if((this.debug&&this.frames-this.lastDiagnosticFrame>=120)||this.lastDiagnosticFrame===undefined){
        this.lastDiagnosticFrame=this.frames;let colored=0;const words=new Uint32Array(this.image.data.buffer);
        for(const pixel of words)if(pixel&0xffffff)colored++;
        this.onLog({level:'info',source:'core',message:'Frame diagnostic '+JSON.stringify({frames:this.frames,colored_pixels:colored,pc:this.core.cpu.br[4],bank:this.core.cpu.r[1],forced_blank:this.core.ppu.forcedBlank,canvas:[this.canvas.width,this.canvas.height]})});
      }
    }catch(error){this.pause();this.onLog({level:'error',source:'core',message:'RuntimeError: SnesJs '+error.message});}
  }

  _bindKeys() {
    this.keyDown=e=>{const button=keyboardButton(e),source=keyboardSource(e);if(!button||!this.running||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(e.target?.tagName)||e.target?.isContentEditable)return;e.preventDefault();if(e.repeat&&!this.inputSources.has(source))return;this._input(button,true,source);this.audio?.resume().catch(()=>{});};
    this.keyUp=e=>{const source=keyboardSource(e);if(!this.inputSources.has(source))return;this.inputSources.delete(source);this._applyInputs();};
    this.blur=()=>this._releaseAll();
    window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);window.addEventListener('blur',this.blur);
  }

  _input(button,pressed,source) {
    if(!Object.hasOwn(BUTTON,button))throw new RangeError('Unknown SNES button: '+button);
    let set=this.inputSources.get(source);if(!set){set=new Set();this.inputSources.set(source,set)}
    if(pressed)set.add(button);else set.delete(button);
    if(!set.size)this.inputSources.delete(source);
    this._applyInputs();
  }
  _applyInputs() {
    const held=new Set();for(const values of this.inputSources.values())for(const button of values)held.add(button);
    // Opposite directions cannot be pressed on an original SNES D-pad. Keep
    // conflicting input neutral until one source releases its direction.
    for(const [a,b]of [['left','right'],['up','down']])if(held.has(a)&&held.has(b)){held.delete(a);held.delete(b)}
    for(const [button,index]of Object.entries(BUTTON)){
      if(held.has(button))this.core.setPad1ButtonPressed(index);else this.core.setPad1ButtonReleased(index);
    }
  }
  _releaseAll(){this.inputSources.clear();this.core.joypad1State=0;}
  _gamepad() {
    let pad;try{pad=[...(navigator.getGamepads?.()||[])].find(p=>p&&p.connected!==false)}catch{}
    const active=new Set();
    if(pad){const map={0:'b',1:'a',2:'y',3:'x',4:'l',5:'r',8:'select',9:'start',12:'up',13:'down',14:'left',15:'right'};for(const [index,button]of Object.entries(map))if(pad.buttons[index]?.pressed)active.add(button);if(pad.axes?.[0]<-.4)active.add('left');if(pad.axes?.[0]>.4)active.add('right');if(pad.axes?.[1]<-.4)active.add('up');if(pad.axes?.[1]>.4)active.add('down');}
    const chord=active.has('start')&&active.has('select'),requestPause=chord&&!this.pauseChordHeld;
    if(chord)this.pauseChordHeld=true;
    if(!active.has('start')&&!active.has('select'))this.pauseChordHeld=false;
    if(this.pauseChordHeld){active.delete('start');active.delete('select')}
    for(const button of Object.keys(BUTTON))this._input(button,active.has(button),'gamepad');
    if(requestPause)this.onPauseRequest();
  }
  _clearAudio(){for(const source of this.sources){try{source.stop()}catch{}}this.sources.clear();this.audioTime=0;}
  pause(){this.running=false;this._releaseAll();this._clearAudio();}
  resume(){this.lastTick=performance.now();this.accumulator=0;this.running=true;this.audio?.resume().catch(()=>{});}
  pressDown(button){if(!this.running)return;this._input(button,true,'external');this.audio?.resume().catch(()=>{});}
  pressUp(button){this._input(button,false,'external');}
  getEmscriptenModule(){return {_cmd_set_volume:db=>{if(this.gain)this.gain.gain.value=10**(db/20)}};}
  readMemory(address,length){const offset=address-0x7e0000;if(offset<0||offset+length>this.core.ram.length)throw Error('Software memory API supports WRAM only');return this.core.ram.slice(offset,offset+length);}
  writeMemory(address,bytes){const offset=address-0x7e0000;if(offset<0||offset+bytes.length>this.core.ram.length)throw Error('Software memory API supports WRAM only');this.core.ram.set(bytes,offset);return bytes.length;}
  getDiagnostics(){return {frames:this.frames,frame_ms:this.lastFrameMs,running:this.running,clock:'monotonic-timer-60hz',pc:this.core.cpu.br[4],bank:this.core.cpu.r[1]};}
  async saveState(){return {state:new Blob([JSON.stringify({schema:'hydrophone.snesjs-state/1',rom_crc32:this.romCRC,data:captureState(this.core)})],{type:'application/json'})};}
  async loadState(blob){const state=JSON.parse(await blob.text());if(state.schema!=='hydrophone.snesjs-state/1'||state.rom_crc32!==this.romCRC)throw Error('Save state does not match this game and emulator');restoreState(this.core,state.data);this._releaseAll();this._clearAudio();this.core.setPixels(this.image.data);this.context.putImageData(this.image,0,0);}
  async saveSRAM(){return new Blob([this.core.cart.sram],{type:'application/octet-stream'});}
  exit(){clearInterval(this.diagnosticTimer);this.closed=true;this.running=false;clearTimeout(this.loop);this._releaseAll();this._clearAudio();window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.blur);this.audio?.close().catch(()=>{});}
}
