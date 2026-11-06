import test from 'node:test';import assert from 'node:assert/strict';import {GroundContacts,contactMaterial} from '../ground-contact.js';
import {characterPose} from '../character-motion.js';
test('footfall materials follow actual ground and do not emit dirt inside houses',()=>{assert.equal(contactMaterial({biome:{style:'aurora'}}),'snow');assert.equal(contactMaterial({biome:{style:'mangrove'}}),'wet');assert.equal(contactMaterial({biome:{style:'cactus'}}),'dust');assert.equal(contactMaterial({key:'home'},true),null);});
test('contacts occur only on new planted steps and stay behind in world space',()=>{const g=new GroundContacts(),s={key:'field'};g.record(0,{x:1,y:1,phase:1,moving:true},s,false);g.record(0,{x:1.05,y:1,phase:2,moving:true,gait:'walk'},s,false);assert.equal(g.marks.length,1);const first={...g.marks[0]};g.record(0,{x:1.08,y:1,phase:2.5,moving:true,gait:'walk'},s,false);assert.deepEqual(g.marks[0],first);g.record(0,{x:1.08,y:1,phase:2.5,moving:false},s,false);assert.equal(g.marks.length,1);g.reset();assert.equal(g.marks.length,0);});

const field={key:'field'};
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-9,`${message}: ${actual} != ${expected}`);
function traceFootplants(hz,gait,speed){
 const contacts=new GroundContacts();
 let pose=characterPose({x:0,y:0,phase:1.3,gait},0,0,1/hz);
 contacts.record('lead',pose,field,false);
 for(let frame=1;frame<=hz*4;frame++){
  const distance=frame*speed/hz;
  pose=characterPose(pose,distance*.6,distance*.8,1/hz,{gait});
  contacts.record('lead',pose,field,false);
 }
 return contacts.marks;
}

test('real walk and run footplants keep their count and world spacing at 10 through 144 Hz',()=>{
 for(const {gait,speed,count,first,spacing} of [
  {gait:'walk',speed:2.65,count:15,first:.25375,spacing:.725},
  {gait:'run',speed:4.2,count:21,first:.28,spacing:.8},
 ]){
  const reference=traceFootplants(144,gait,speed);
  for(const hz of [10,15,30,60,120,144]){
   const marks=traceFootplants(hz,gait,speed);
   assert.equal(marks.length,count,`${gait} at ${hz} Hz`);
   marks.forEach((mark,index)=>{
    const label=`${gait}, ${hz} Hz, plant ${index}`;
    near(mark.x*.6+mark.y*.8,first+index*spacing,`${label} travel`);
    near(-mark.x*.8+mark.y*.6,index%2?-.075:.075,`${label} foot side`);
    near(mark.x,reference[index].x,`${label} x across rates`);
    near(mark.y,reference[index].y,`${label} y across rates`);
   });
  }
 }
});

test('a slow moving update emits a plant it crossed even when the final pose is airborne',()=>{
 const contacts=new GroundContacts(),old={x:0,y:0,phase:1.8,moving:true};
 contacts.record('lead',old,field,false);
 const pose=characterPose(old,.5,0,.1,{gait:'run'});
 assert.equal(Math.floor(pose.phase),3);
 contacts.record('lead',pose,field,false);
 assert.equal(contacts.marks.length,1);
 near(contacts.marks[0].x,.08,'plant lies inside the travelled segment');
 near(contacts.marks[0].y,.075,'phase two uses the first foot');
});

test('one resolved update can cross both feet and wrap the four-pose clock',()=>{
 const contacts=new GroundContacts(),old={x:0,y:0,phase:1.9,moving:true};
 contacts.record('lead',old,field,false);
 const pose=characterPose(old,.79,0,.1,{gait:'walk'});
 assert.ok(pose.strideAdvance>2);assert.ok(pose.phase<.1);
 contacts.record('lead',pose,field,false);
 assert.equal(contacts.marks.length,2);
 near(contacts.marks[0].x,.03625,'first interpolated foot');
 near(contacts.marks[1].x,.76125,'second interpolated foot');
 near(contacts.marks[0].y,.075,'phase two side');
 near(contacts.marks[1].y,-.075,'wrapped phase zero side');
});

test('legacy poses use a short modulo interval and emit an endpoint plant only once',()=>{
 const contacts=new GroundContacts();
 for(const [x,phase] of [[0,3.5],[.4,.5],[.8,1.5],[1,2],[1.1,2.25]]){
  contacts.record('lead',{x,y:0,phase,moving:true,gait:'walk'},field,false);
 }
 assert.equal(contacts.marks.length,2);
 near(contacts.marks[0].x,.2,'legacy wrap is interpolated');
 near(contacts.marks[0].y,-.075,'legacy wrapped foot');
 near(contacts.marks[1].x,1,'plant at the update endpoint');
 near(contacts.marks[1].y,.075,'legacy second foot');
});

test('invalid or discontinuous phase and position jumps never create marks',()=>{
 const invalid=[
  {strideAdvance:0},{strideAdvance:-1},{strideAdvance:NaN},{strideAdvance:Infinity},
  {strideAdvance:5},{strideAdvance:.25},{phase:-1},{phase:4},{phase:NaN},
  {x:1},{x:NaN},{y:Infinity},{x:0},{moving:false},
  {phase:1.4,strideAdvance:undefined},
 ];
 for(const change of invalid){
  const contacts=new GroundContacts();
  contacts.record('lead',{x:0,y:0,phase:1.5,moving:true},field,false);
  contacts.record('lead',{x:.2,y:0,phase:2.5,strideAdvance:1,moving:true,...change},field,false);
  assert.equal(contacts.marks.length,0,`invalid pose ${JSON.stringify(change)}`);
 }
});

test('stops and teleports stay silent while a resumed stride can cross a real plant',()=>{
 const contacts=new GroundContacts();
 let pose=characterPose({x:0,y:0,phase:1.8},0,0,1/60);
 const record=()=>contacts.record('lead',pose,field,false);
 record();
 pose=characterPose(pose,0,0,1/60,{intent:{x:1,y:0},gait:'run'});record();
 assert.equal(contacts.marks.length,0,'blocked intent does not stamp a foot');
 pose=characterPose(pose,.1,0,1/60,{gait:'run'});record();
 assert.equal(contacts.marks.length,1,'first resumed interval crosses phase two');
 near(contacts.marks[0].x,.08,'resumed plant position');
 pose=characterPose(pose,.1,0,1/60);record();
 pose=characterPose(pose,.12,0,1/60,{gait:'run'});record();
 assert.equal(contacts.marks.length,1,'stopping and resuming alone do not emit');
 pose=characterPose(pose,100,100,1/60);record();
 assert.equal(pose.strideAdvance,0);assert.equal(contacts.marks.length,1);
 for(let step=1;step<=8;step++){
  pose=characterPose(pose,100+step*.1,100,1/60,{gait:'run'});record();
 }
 assert.equal(contacts.marks.length,2,'only subsequent actual travel emits after a teleport');
 near(contacts.marks[1].x,100.76,'next plant starts from the new world position');
 near(contacts.marks[1].y,99.925,'next plant uses the other foot');
});

test('indoor intervals update the clock without leaving marks or an outdoor backlog',()=>{
 const contacts=new GroundContacts();
 let pose=characterPose({x:0,y:0,phase:0},0,0,1/15);
 contacts.record('lead',pose,field,true);
 for(let step=1;step<=8;step++){
  pose=characterPose(pose,step*.28,0,1/15,{gait:'run'});
  contacts.record('lead',pose,field,true);
 }
 assert.equal(contacts.marks.length,0);
 pose=characterPose(pose,2.52,0,1/15,{gait:'run'});
 contacts.record('lead',pose,field,false);
 assert.equal(contacts.marks.length,1);
 near(contacts.marks[0].x,2.4,'outdoor mark belongs to the latest interval');
});

test('crossed plants retain material lifetimes and the mark history stays bounded',()=>{
 for(const [style,gait,material,life] of [
  ['aurora','walk','snow',4.5],['mangrove','run','wet',1.25],
  ['cactus','run','dust',.65],['meadow','walk','grass',.4],
 ]){
  const contacts=new GroundContacts(),scene={key:'field',biome:{style}},old={x:0,y:0,phase:1.8};
  contacts.record('lead',old,scene,false);
  contacts.record('lead',characterPose(old,.2,0,.1,{gait}),scene,false);
  assert.equal(contacts.marks.length,1);
  const mark=contacts.marks[0];
  assert.equal(mark.material,material);assert.equal(mark.life,life);
  assert.equal(mark.running,gait==='run');assert.equal(mark.t,0);
 }
 const contacts=new GroundContacts();
 let pose=characterPose({x:0,y:0,phase:0},0,0,1/10);
 contacts.record('lead',pose,field,false);
 for(let frame=1;frame<=200;frame++){
  pose=characterPose(pose,frame*.42,0,1/10,{gait:'run'});
  contacts.record('lead',pose,field,false);
  assert.ok(contacts.marks.length<=54);
 }
 assert.equal(contacts.marks.length,54);
 for(let index=1;index<contacts.marks.length;index++)near(contacts.marks[index].x-contacts.marks[index-1].x,.8,'retained plant spacing');
 near(contacts.marks.at(-1).x,84,'latest endpoint plant is retained');
});
