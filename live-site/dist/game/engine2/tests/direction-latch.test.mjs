import test from 'node:test';
import assert from 'node:assert/strict';
import {latchedJoystick,axisDirections} from '../direction-latch.js';
import {bindDigitalJoystick,joystickDirections} from '../../input-ui.js';

const vector=(degrees,length=40)=>[Math.cos(degrees*Math.PI/180)*length,Math.sin(degrees*Math.PI/180)*length];
const update=(previous,degrees,length=40)=>latchedJoystick(previous,...vector(degrees,length),50);

test('touch radial deadband engages deliberately and releases immediately at the centre',()=>{
 assert.deepEqual(latchedJoystick(null,10,0,50).directions,[]);
 let p=latchedJoystick(null,12,0,50);assert.deepEqual(p.directions,['right']);
 p=latchedJoystick(p,9,0,50);assert.deepEqual(p.directions,['right']);
 p=latchedJoystick(p,7,0,50);assert.equal(p.sector,null);assert.deepEqual(p.directions,[]);
 assert.deepEqual(latchedJoystick(p,10,0,50).directions,[]);
 assert.deepEqual(latchedJoystick(p,0,0,50).directions,[]);
});

test('small angle jitter cannot alternate cardinal and diagonal presses',()=>{
 let p=update(null,20);
 for(const angle of [22,24,21,25,23,26,22,24]){p=update(p,angle);assert.deepEqual(p.directions,['right']);}
 p=update(p,29);assert.deepEqual(p.directions,['right','down']);
 for(const angle of [26,22,20,18,23]){p=update(p,angle);assert.deepEqual(p.directions,['right','down']);}
 p=update(p,16);assert.deepEqual(p.directions,['right']);
});

test('all sector boundaries wrap correctly while deliberate turns and reversals are immediate',()=>{
 for(let sector=0;sector<8;sector++){
  let p=update(null,sector*45);assert.equal(p.sector,sector);
  for(const offset of [-26,-24,24,26]){p=update(p,sector*45+offset);assert.equal(p.sector,sector);}
  p=update(p,sector*45+90);assert.equal(p.sector,(sector+2)%8);
  p=update(p,sector*45+270);assert.equal(p.sector,(sector+6)%8);
  p=latchedJoystick(p,0,0,50);assert.equal(p.sector,null);
 }
});

test('touch state is isolated between callers and the legacy stateless helper is unchanged',()=>{
 const a=update(null,0),b=update(null,90);a.directions.push('invalid');
 assert.deepEqual(update(null,0).directions,['right']);assert.deepEqual(update(b,180).directions,['left']);
 assert.deepEqual(joystickDirections(...vector(24),50),['right','down']);
 assert.deepEqual(joystickDirections(10,0,50),[]);
 assert.deepEqual(latchedJoystick(a,NaN,0,50).directions,[]);
});

test('gamepad axes retain engagement through threshold jitter without adding inertia',()=>{
 let p=axisDirections(.39,0);assert.deepEqual(p,[]);
 p=axisDirections(.42,0,p);assert.deepEqual(p,['right']);
 for(const x of [.38,.41,.34,.4,.33]){p=axisDirections(x,0,p);assert.deepEqual(p,['right']);}
 p=axisDirections(.31,0,p);assert.deepEqual(p,[]);
 p=axisDirections(-.8,.9,p);assert.deepEqual(p,['left','down']);
 p=axisDirections(.8,-.9,p);assert.deepEqual(p,['right','up']);
 assert.deepEqual(axisDirections(0,0,p),[]);
});

test('gamepad axis history is independent per axis and invalid samples cannot latch a direction',()=>{
 let p=axisDirections(.7,-.7);p=axisDirections(.35,-.2,p);assert.deepEqual(p,['right']);
 p=axisDirections(.35,-.35,p);assert.deepEqual(p,['right']);
 p=axisDirections(.2,-.5,p);assert.deepEqual(p,['up']);
 assert.deepEqual(axisDirections(Infinity,NaN,p),[]);
 assert.deepEqual(axisDirections(-.35,0,['right']),[],'a reverse below engage threshold releases the old side');
});

class Stick{
 constructor(){this.handlers=new Map();this.properties=new Map();this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x)};this.style={setProperty:(k,v)=>this.properties.set(k,v)};}
 getBoundingClientRect(){return {left:100,top:100,width:100,height:100};}
 setPointerCapture(){}
 addEventListener(name,fn){this.handlers.set(name,fn);}
 removeEventListener(name,fn){if(this.handlers.get(name)===fn)this.handlers.delete(name);}
 fire(name,dx=0,dy=0,id=1){this.handlers.get(name)?.({pointerId:id,clientX:150+dx,clientY:150+dy,preventDefault(){}});}
}
function fixture(){const element=new Stick(),events=[];let enabled=true;
 const owner={buttonDown:(b,s)=>events.push(['down',b,s]),buttonUp:(b,s)=>events.push(['up',b,s])};
 const binding=bindDigitalJoystick(element,{player:()=>owner,active:()=>enabled});
 return {element,events,binding,set enabled(x){enabled=x;}};
}

test('bound touch stick holds its selected heading through jitter and shows that heading on the knob',()=>{
 const f=fixture();f.element.fire('pointerdown',...vector(20));
 for(const angle of [23,25,21,24])f.element.fire('pointermove',...vector(angle));
 assert.deepEqual(f.events.map(e=>e.slice(0,2)),[['down','right']]);assert.equal(f.element.properties.get('--stick-y'),'0px');
 f.element.fire('pointermove',...vector(30));assert.deepEqual(f.events.map(e=>e.slice(0,2)),[['down','right'],['down','down']]);assert.ok(parseFloat(f.element.properties.get('--stick-y'))>0);
 f.element.fire('pointermove',0,0);assert.deepEqual(f.events.slice(-2).map(e=>e.slice(0,2)),[['up','right'],['up','down']]);assert.equal(f.element.properties.get('--stick-x'),'0px');
});

test('pointer release, capture loss, cancellation and disabled controls clear every held direction once',()=>{
 for(const end of ['pointerup','pointercancel','lostpointercapture']){
  const f=fixture();f.element.fire('pointerdown',30,30);f.element.fire(end,30,30);f.element.fire(end,30,30);
  assert.deepEqual(f.events.map(e=>e.slice(0,2)),[['down','right'],['down','down'],['up','right'],['up','down']]);
  assert.equal(f.element.classes.has('engaged'),false);assert.equal(f.element.properties.get('--stick-x'),'0px');
  f.element.fire('pointerdown',9,0);assert.equal(f.events.length,4,'a new gesture must engage afresh');f.binding.destroy();assert.equal(f.element.handlers.size,0);
 }
 const f=fixture();f.element.fire('pointerdown',30,0);f.enabled=false;f.element.fire('pointermove',30,0);assert.deepEqual(f.events.map(e=>e.slice(0,2)),[['down','right'],['up','right']]);
});

test('unrelated pointers cannot steer the gesture and synchronous release does not leave stale latch state',()=>{
 const f=fixture();f.element.fire('pointerdown',30,0,1);f.element.fire('pointermove',-30,0,2);f.element.fire('pointerup',0,0,2);assert.equal(f.events.length,1);f.binding.releaseAll();assert.equal(f.events.length,2);
 const element=new Stick(),events=[];let binding;
 const owner={buttonDown:b=>{events.push(['down',b]);binding.releaseAll();},buttonUp:b=>events.push(['up',b])};
 binding=bindDigitalJoystick(element,{player:()=>owner,active:()=>true});assert.doesNotThrow(()=>element.fire('pointerdown',30,0));assert.deepEqual(events,[['down','right'],['up','right']]);assert.equal(element.classes.has('engaged'),false);
});
