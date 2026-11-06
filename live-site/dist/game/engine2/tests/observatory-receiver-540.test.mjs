import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {migrateEmbodiedOrigins} from '../embodied-origins.js';
import {observatoryScenePlan,observatoryVisualState} from '../observatory-art.js';
import {appendObservatoryReceiver} from '../observatory-receiver.js';

const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url)));
function setup(scene=50012){
 const world=new World(source);world.newGame({originId:'veyr-storm',quiet:true});world.state.scene=scene;world.state.mode='field';migrateEmbodiedOrigins(world.state);
 return {world,record:world.state.embodiedOrigins.origins['veyr-storm'],plan:observatoryScenePlan(world)};
}
function draw(world,feedback=null,time=2){
 const mesh=new Geometry(),glow=new Geometry(),plan=observatoryScenePlan(world);
 const result=appendObservatoryReceiver(mesh,glow,{world,plan,state:observatoryVisualState(world,feedback),time});
 return {mesh,glow,result,data:[...mesh.v,...glow.v]};
}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);

test('the actual receiver is a bounded handcrafted instrument carried above the closed native mast',()=>{
 for(const scene of[50012,50013]){
  const {world,record,plan}=setup(scene);
  for(const repair of[undefined,0,1])for(const grounded of[false,true]){
   record.repair=repair;record.grounded=grounded;record.receiver=true;
   const saved=world.save(),floor=JSON.stringify(world.scene.floor),a=draw(world),b=draw(world);
   assert.ok(a.result&&a.result.triangles>500&&a.result.triangles<=1200,'the complete bowl, copper exterior, ribs, gimbal, iris and signal fit the mobile budget');
   assert.deepEqual(a.data,b.data,'the same native state and clock produce the exact same instrument');
   assert.ok(a.data.every(Number.isFinite));
   for(const mesh of[a.mesh,a.glow])for(let i=0;i<mesh.v.length;i+=12){
    assert.ok(Math.hypot(mesh.v[i]-plan.body.x,mesh.v[i+2]-plan.body.z)<=1.3,'receiver stays inside the existing mast silhouette');
    assert.ok(mesh.v[i+1]>=2.6&&mesh.v[i+1]<=5.1,'receiver does not add low fixtures to the walkable court');
   }
   assert.equal(world.save(),saved);assert.equal(JSON.stringify(world.scene.floor),floor);
  }
 }
});

test('native receiver, grounding, repair and reply states have distinct visible shapes and previews',()=>{
 const {world,record}=setup(),waiting=draw(world);record.receiver=true;const listening=draw(world);assert.notDeepEqual(listening.data,waiting.data);assert.equal(listening.result.phase,'listening');
 const saved=world.save(),groundPreview=draw(world,{pending:{object:{originId:'veyr-storm',embodiedAction:'ground',manipulation:'cable'},progress:.5}});
 assert.notDeepEqual(groundPreview.data,listening.data,'the native cable drag previews the physical gimbal and iris');assert.equal(world.save(),saved);
 record.grounded=true;const grounded=draw(world);assert.notDeepEqual(grounded.data,groundPreview.data);assert.equal(grounded.result.phase,'grounded');
 const vanePreview=draw(world,{pending:{object:{originId:'veyr-storm',manipulation:'lever'},progress:.5}}),coilPreview=draw(world,{pending:{object:{originId:'veyr-storm',manipulation:'coil'},progress:.5}});
 assert.notDeepEqual(vanePreview.data,grounded.data);assert.notDeepEqual(coilPreview.data,grounded.data);assert.notDeepEqual(vanePreview.data,coilPreview.data);
 record.repair=0;const raised=draw(world);record.repair=1;const opened=draw(world);assert.notDeepEqual(raised.data,opened.data,'raising and separating the receiver are distinct native outcomes');
 record.choice=0;const shared=draw(world);record.choice=1;const independent=draw(world);assert.notDeepEqual(shared.data,independent.data);assert.equal(independent.result.phase,'answering');
 const quiet=draw(world,null,2),next=draw(world,null,4);assert.notDeepEqual(quiet.data,next.data,'the existing animation clock controls the three reply shutters');
 world.state.scene=5;const mesh=new Geometry(),glow=new Geometry();assert.equal(appendObservatoryReceiver(mesh,glow,{world,plan:observatoryScenePlan(world)}),null);assert.equal(mesh.v.length+glow.v.length,0,'other game locations receive no receiver geometry');
});

test('the real ceramic bowl has front-facing winding and remains visible to the east/front game camera',()=>{
 const {world,record}=setup();record.grounded=true;record.receiver=true;
 const {mesh,result}=draw(world),eye=result.center.map((v,i)=>v+[.35,.92,.78][i]*14);let ceramic=0;
 for(let i=result.bowlStart*12;i<result.bowlEnd*12;i+=36){
  if(mesh.v[i+9]!==6||mesh.v[i+6]<.7)continue;
  const a=mesh.v.slice(i,i+3),b=mesh.v.slice(i+12,i+15),c=mesh.v.slice(i+24,i+27),n=cross(b.map((v,j)=>v-a[j]),c.map((v,j)=>v-a[j]));
  assert.ok(dot(n,result.axis)>0,'the actual emitted front triangles face out of the open bowl');
  const centroid=a.map((v,j)=>(v+b[j]+c[j])/3),towardEye=eye.map((v,j)=>v-centroid[j]);
  assert.ok(dot(n,towardEye)>0,'the native software culling rule retains the ceramic surface');ceramic++;
 }
 assert.equal(ceramic,144,'all radial ceramic strips are real visible geometry rather than a solid plate');
});

test('the iris and reply shutters clear the entire tall mast silhouette in the actual camera projection',()=>{
 const {world,record,plan}=setup(),right=[.78,-.35],length=Math.hypot(...right);right[0]/=length;right[1]/=length;
 for(const repair of[undefined,0,1])for(const grounded of[false,true]){
  record.receiver=true;record.grounded=grounded;record.repair=repair;record.choice=0;
  const {mesh}=draw(world);let vertices=0;
  for(let i=0;i<mesh.v.length;i+=12)if(mesh.v[i+9]===4){
   const dx=mesh.v[i]-plan.body.x,dz=mesh.v[i+2]-plan.body.z;
   // Camera direction is [.35,.92,.78]. Its screen-right vector has no Y
   // component, so the 3..6m mast projects into the same horizontal band at
   // every height. Test actual signal vertices against that whole band.
   assert.ok(dx*right[0]+dz*right[1]>.23,'the iris and all three shutters clear the .19m shaft silhouette, including their edges');vertices++;
  }
  assert.equal(vertices,96,'the real iris and three open reply shutters are all included');
 }
});
