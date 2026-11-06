import test from 'node:test';
import assert from 'node:assert/strict';
import {touchControlLayout,targetGap} from '../touch-layout.js?v=5.6.0';
import {bindTouchControls} from '../../input-ui.js?v=5.6.0';
class Button{
 constructor(key){this.dataset={button:key};this.disabled=false;this.handlers=new Map();this.classes=new Set();this.classList={add:k=>this.classes.add(k),remove:k=>this.classes.delete(k)};}
 addEventListener(type,fn){this.handlers.set(type,fn);}
 removeEventListener(type,fn){if(this.handlers.get(type)===fn)this.handlers.delete(type);}
 setPointerCapture(){}
 getBoundingClientRect(){return {left:100,top:100,right:152,bottom:152};}
 fire(type,id=1,x=120,y=120){this.handlers.get(type)?.({pointerId:id,clientX:x,clientY:y,preventDefault(){}});}
}
function fixture(){const events=[],buttons=['a','b','x','y'].map(k=>new Button(k));let now=0,id=0,enabled=true;const timers=new Map(),owner={buttonDown:(b,s)=>events.push(['down',b,s]),buttonUp:(b,s)=>events.push(['up',b,s])};const binding=bindTouchControls(buttons,{player:()=>owner,active:()=>enabled,now:()=>now,delay:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},cancel:id=>timers.delete(id)});return {buttons:Object.fromEntries(buttons.map(b=>[b.dataset.button,b])),events,binding,set enabled(v){enabled=v;},tick(t){now=t;for(const[id,v]of timers)if(v.at<=now){timers.delete(id);v.fn();}}};}
test('portrait and short landscape touch targets keep inactive gaps and safe edges in both presets',()=>{
 for(const [w,h]of [[320,568],[360,740],[390,844],[412,915],[844,390],[740,360],[915,412],[568,320],[480,320]])for(const preset of ['spaced','large'])for(const safe of [{},{left:20,right:20,bottom:24}]){
  const l=touchControlLayout(w,h,{preset,safe}),values=Object.entries(l.buttons);
  for(const [name,b]of values){assert.ok(b.w>=52&&b.h>=52,name+' below deliberate touch target');assert.ok(b.x>=(safe.left||0)&&b.x+b.w<=w-(safe.right||0),name+' outside horizontal safe area');assert.ok(b.y>0&&b.y+b.h<=h-(safe.bottom||0),name+' outside vertical safe area');assert.ok(targetGap(b,l.joystick)>=14,name+' overlaps or crowds movement pad');}
  for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++){const [a,ar]=values[i],[b,br]=values[j];assert.ok(targetGap(ar,br)>=20,`${w}x${h} ${preset}: ${a}/${b} no inactive moat`);}
  assert.ok(l.reserve>=h-Math.min(...values.map(([,b])=>b.y)));assert.ok(l.reserve<h*(h<=340?.63:.55),'controls consume too much viewport');
 }
});
test('Y waits for a release inside its own target and emits only one press',()=>{const f=fixture();f.buttons.y.fire('pointerdown');assert.deepEqual(f.events,[]);f.buttons.y.fire('pointerup');assert.equal(f.events.length,1);assert.deepEqual(f.events[0].slice(0,2),['down','y']);f.tick(70);assert.deepEqual(f.events.map(e=>e.slice(0,2)),[['down','y'],['up','y']]);});
test('Y drag-out stays cancelled even after sliding back across the target',()=>{const f=fixture();f.buttons.y.fire('pointerdown');f.buttons.y.fire('pointermove',1,170,120);f.buttons.y.fire('pointermove',1,120,120);f.buttons.y.fire('pointerup');f.tick(70);assert.deepEqual(f.events,[]);assert.equal(f.buttons.y.classes.size,0);});
test('cancellation, lost capture, disabled and paused states cannot activate Y',()=>{for(const end of ['pointercancel','lostpointercapture']){const f=fixture();f.buttons.y.fire('pointerdown');f.buttons.y.fire(end);f.tick(70);assert.deepEqual(f.events,[]);}const f=fixture();f.buttons.y.fire('pointerdown');f.enabled=false;f.buttons.y.fire('pointerup');f.tick(70);assert.deepEqual(f.events,[]);f.enabled=true;f.buttons.y.disabled=true;f.buttons.y.fire('pointerdown');f.buttons.y.fire('pointerup');assert.deepEqual(f.events,[]);});
test('primary actions remain immediate hold controls and sliding does not activate a neighbor',()=>{const f=fixture();f.buttons.b.fire('pointerdown');assert.deepEqual(f.events[0].slice(0,2),['down','b']);f.buttons.b.fire('pointermove',1,170,120);assert.equal(f.events.length,1);f.tick(100);f.buttons.b.fire('pointerup',1,170,120);assert.deepEqual(f.events.map(e=>e.slice(0,2)),[['down','b'],['up','b']]);assert.ok(f.events.every(e=>e[1]!=='y'));});
test('releaseAll clears minimum-duration primary presses without duplicate delayed releases',()=>{const f=fixture();f.buttons.a.fire('pointerdown');f.buttons.a.fire('pointerup');f.binding.releaseAll();f.tick(100);assert.deepEqual(f.events.map(e=>e.slice(0,2)),[['down','a'],['up','a']]);assert.equal(f.buttons.a.classes.size,0);f.binding.destroy();assert.equal(f.buttons.a.handlers.size,0);});
test('release-triggered menu opening can synchronously release all controls without leaving Y held',()=>{const y=new Button('y'),events=[];let binding;const owner={buttonDown:(b,s)=>{events.push(['down',b]);binding.releaseAll();},buttonUp:b=>events.push(['up',b])};binding=bindTouchControls([y],{player:()=>owner,active:()=>true,now:()=>100});y.fire('pointerdown');y.fire('pointerup');assert.deepEqual(events,[['down','y'],['up','y']]);assert.equal(y.classes.size,0);binding.destroy();});

test('narrow notched screens keep the isolated crew target inside their safe area',()=>{
 for(const preset of ['spaced','large']){
  const l=touchControlLayout(320,568,{preset,safe:{left:44,right:44,bottom:24}});
  for(const [name,b]of Object.entries(l.buttons))assert.ok(b.x>=44&&b.x+b.w<=276,name+' crossed the cutout-safe bounds');
 }
});
test('compact landscape uses its horizontal space instead of reserving a portrait-height control column',()=>{
 for(const preset of ['spaced','large']){
  const l=touchControlLayout(568,320,{preset,safe:{left:20,right:20,bottom:16}});
  assert.equal(l.wide,true);assert.ok(l.reserve<=192,'compact landscape retained the tall portrait control column');
 }
});

test('cancelling a quick tap releases the held action immediately, including its pending minimum duration',()=>{
 const f=fixture();f.buttons.a.fire('pointerdown');f.buttons.a.fire('pointerup');
 assert.equal(f.events.length,1);f.buttons.a.fire('pointercancel');
 assert.deepEqual(f.events.map(e=>e.slice(0,2)),[['down','a'],['up','a']]);assert.equal(f.buttons.a.classes.size,0);
 f.tick(100);assert.equal(f.events.length,2);
});
test('an unrelated control cannot release another pointer owner',()=>{
 const f=fixture();f.buttons.b.fire('pointerdown',1);f.buttons.y.fire('pointerup',1);f.buttons.x.fire('pointercancel',1);
 assert.equal(f.events.length,1);f.buttons.b.fire('pointercancel',1);assert.equal(f.events.length,2);
});

test('normal automatic capture loss after pointerup preserves the native minimum tap duration',()=>{
 const f=fixture();f.buttons.a.fire('pointerdown');f.buttons.a.fire('pointerup');f.buttons.a.fire('lostpointercapture');
 assert.equal(f.events.length,1);f.tick(64);assert.equal(f.events.length,1);f.tick(65);assert.equal(f.events.length,2);
});
