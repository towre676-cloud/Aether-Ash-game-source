import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry,C} from '../cistern-renderer.js';
import {buildObservatoryGeometry,appendObservatoryDynamics,observatoryScenePlan} from '../observatory-art.js';

const raw=JSON.parse(readFileSync(new URL('../world.json',import.meta.url)));
const SEA=-5.25,FOAM=-5.19,EPS=1e-8;
function setup(id){const w=new World(raw);w.newGame({originId:'veyr-storm',quiet:true});w.state.scene=id;w.state.mode='field';return w;}
const point=(v,i)=>({x:v[i],y:v[i+1],z:v[i+2],nx:v[i+3],ny:v[i+4],nz:v[i+5],material:v[i+9],alpha:v[i+11]});
function triangles(mesh,end=mesh.v.length){const out=[];for(let i=0;i<end;i+=36)out.push([0,12,24].map(j=>point(mesh.v,i+j)));return out;}
const key=p=>[p.x,p.y,p.z].map(n=>n.toFixed(9)).join(',');
const edgeKey=(a,b)=>[key(a),key(b)].sort().join('|');
function shell(mesh){return triangles(mesh,mesh.observatory.foundationVertices*12).filter(t=>t.every(p=>p.material===6.25));}
const rect=(x,z,r)=>x>=r.x&&x<r.x+r.w&&z>=r.z&&z<r.z+r.d;
function land(plan,x,z){return plan.scene.floor[Math.floor(z)]?.[Math.floor(x)]==='.'||rect(x,z,plan.mast)||rect(x,z,plan.lodge);}
function distance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
const nearest=(p,segments)=>Math.min(...segments.map(([a,b])=>distance(p,a,b)));
function waterline(mesh){
 const lines=[];
 for(const t of shell(mesh)){
  const cuts=[];
  for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3];if((a.y-SEA)*(b.y-SEA)<0){const q=(SEA-a.y)/(b.y-a.y);cuts.push({x:a.x+(b.x-a.x)*q,z:a.z+(b.z-a.z)*q});}}
  if(cuts.length===2)lines.push(cuts);
 }
 return lines;
}
function dynamic(w,time,objects){const mesh=new Geometry(),glow=new Geometry();appendObservatoryDynamics(mesh,glow,{world:w,time,objects});return {mesh,glow,foam:triangles(glow).filter(t=>t.every(p=>Math.abs(p.y-FOAM)<EPS))};}

test('native coast has an exact walking rim and closed, weathered geological courses without changing the scene',()=>{
 for(const id of[50012,50013]){
  const w=setup(id),saved=w.save(),scene=JSON.stringify(w.scene),mesh=buildObservatoryGeometry(Geometry,C,w),plan=observatoryScenePlan(w),faces=shell(mesh);
  assert.ok(mesh.v.every(Number.isFinite));assert.ok(mesh.v.length/36<15000,'complete authored scene stays within its mobile static budget');
  const edges=new Map(),levels=new Map(),courses=new Map();
  for(const t of faces){
   for(const p of t){if(!levels.has(p.y))levels.set(p.y,new Map());levels.get(p.y).set(key(p),p);}
   const band=[...new Set(t.map(p=>p.y))].sort((a,b)=>a-b).join(',');courses.set(band,(courses.get(band)||0)+1);
   for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],k=edgeKey(a,b);if(!edges.has(k))edges.set(k,{a,b,count:0});edges.get(k).count++;}
  }
  assert.deepEqual([...levels.keys()].sort((a,b)=>a-b),[-5.9,-2.4,-.55,.005]);
  assert.equal(courses.size,3);assert.equal(new Set(courses.values()).size,1,'all three courses retain the same perimeter face count');
  assert.equal(new Set([...levels.values()].map(p=>p.size)).size,1,'every depth shares the same boundary topology');
  const boundaryDegrees=new Map();
  for(const {a,b,count} of edges.values()){
   assert.ok(count===1||count===2,'no overlapping or non-manifold geological seam');
   if(count===2)continue;
   assert.equal(a.y,b.y,'a vertical seam cannot be left open');assert.ok(a.y===.005||a.y===-5.9,'only upper and lower perimeter edges may be open');
   for(const p of[a,b])boundaryDegrees.set(key(p),(boundaryDegrees.get(key(p))||0)+1);
  }
  assert.ok(boundaryDegrees.size>40);assert.ok([...boundaryDegrees.values()].every(n=>n===2),'upper and lower outlines form closed contours');
  for(const p of levels.get(.005).values()){
   assert.ok(Math.min(Math.abs(p.x-Math.round(p.x)),Math.abs(p.z-Math.round(p.z)))<EPS,'upper rim remains on the exact native cell outline');
   const samples=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].map(([x,z])=>land(plan,p.x+x*.001,p.z+z*.001));
   assert.ok(samples.some(Boolean)&&samples.some(v=>!v),'upper rim belongs to the actual land boundary');
  }
  let weathered=0;
  for(const p of levels.get(-5.9).values()){
   const x=plan.scene.width/2+(p.x-plan.scene.width/2)/1.14,z=plan.scene.height*.48+(p.z-plan.scene.height*.48)/1.14;
   if(Math.min(Math.abs(x-Math.round(x)),Math.abs(z-Math.round(z)))>1e-4)weathered++;
  }
  assert.ok(weathered>levels.get(-5.9).size*.75,'deep rock is visibly perturbed rather than a rigid extrusion of the square grid');
  assert.equal(w.save(),saved);assert.equal(JSON.stringify(w.scene),scene,'coast construction cannot change floor cells, stations or native state');
 }
});

test('shore foam stays short, translucent and close to the actual closed geological waterline',()=>{
 for(const id of[50012,50013]){
  const w=setup(id),mesh=buildObservatoryGeometry(Geometry,C,w),coast=waterline(mesh),{foam}=dynamic(w,0,w.objects()),foamEdges=[];
  assert.ok(coast.length>50);assert.ok(foam.length>coast.length,'foam traces the full headland rather than a few horizon lines');
  for(const t of foam){
   const [a,b,c]=t,area=Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))/2;
   assert.ok(area>1e-4,'foam faces must not collapse into lines');
   for(let j=0;j<3;j++){
    const p=t[j],q=t[(j+1)%3];assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<1.5,'no giant near-plane-crossing foam face');
    assert.ok(nearest(p,coast)<.9,'every foam vertex stays local to the emitted cliff at sea level');
    assert.equal(p.material,9);assert.ok(p.alpha>0&&p.alpha<=.12,'the sea surface remains visible through subtle foam');
    assert.ok(Math.abs(p.ny-1)<EPS&&Math.abs(p.nx)<EPS&&Math.abs(p.nz)<EPS);foamEdges.push([p,q]);
   }
  }
  for(const [a,b] of coast)assert.ok(nearest({x:(a.x+b.x)/2,z:(a.z+b.z)/2},foamEdges)<.9,'every native coast segment receives nearby foam');
 }
});

test('coastal animation is deterministic, time-driven and read-only within the complete dynamic budget',()=>{
 for(const id of[50012,50013]){
  const w=setup(id),objects=w.objects(),saved=w.save(),scene=JSON.stringify(w.scene),a=dynamic(w,0,objects),b=dynamic(w,1.7,objects),repeat=dynamic(w,0,objects);
  assert.deepEqual(repeat.foam,a.foam,'fixed time and native flags produce exact repeatable foam');assert.notDeepEqual(a.foam,b.foam,'water visibly moves without advancing a game flag');
  for(const frame of[a,b]){assert.ok(frame.mesh.v.every(Number.isFinite)&&frame.glow.v.every(Number.isFinite));assert.ok((frame.mesh.v.length+frame.glow.v.length)/36<=5000,'dish, controls, shoreline and atmosphere share the mobile dynamic budget');}
  assert.equal(w.save(),saved);assert.equal(JSON.stringify(w.scene),scene,'rendering cannot edit floor, camera metadata or game state');
 }
});
