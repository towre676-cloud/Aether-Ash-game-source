import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {observatoryScenePlan} from '../observatory-art.js';
import {appendObservatoryDetail,OBSERVATORY_BACKDROP_BOUNDS} from '../observatory-detail.js';
const raw=JSON.parse(readFileSync(new URL('../world.json',import.meta.url)));
function setup(id){const world=new World(raw);world.newGame({originId:'veyr-storm',quiet:true});world.state.scene=id;world.state.mode='field';return world;}
function triangles(mesh){const out=[];for(let i=0;i<mesh.v.length;i+=36){const points=[0,12,24].map(j=>mesh.v.slice(i+j,i+j+3));out.push({points,normal:mesh.v.slice(i+3,i+6),color:mesh.v.slice(i+6,i+9),material:mesh.v[i+9],center:points.reduce((a,p)=>a.map((n,k)=>n+p[k]/3),[0,0,0])});}return out;}

test('authored secondary craft is deterministic, bounded and leaves native state and collision untouched',()=>{
 for(const id of[50012,50013]){
  const world=setup(id),plan=observatoryScenePlan(world),saved=world.save(),scene=JSON.stringify(world.scene),mesh=new Geometry(),result=appendObservatoryDetail(mesh,plan),again=new Geometry();
  assert.ok(result.triangles>3500&&result.triangles<6000,'meaningful secondary craft stays inside the mobile geometry budget');
  assert.ok(mesh.v.every(Number.isFinite));assert.equal(mesh.v.length/36,result.triangles);appendObservatoryDetail(again,plan);assert.deepEqual(again.v,mesh.v);
  assert.deepEqual(result.groups.map(g=>g.name),['lodge','mast','edge','arrival','backdrop']);for(const group of result.groups)assert.ok(group.triangles>=100,'each architectural family contributes actual geometry');
  assert.equal(world.save(),saved);assert.equal(JSON.stringify(world.scene),scene);
 }
 assert.deepEqual(appendObservatoryDetail(new Geometry(),null),{triangles:0,groups:[]});
});

test('detailed walls, gauges, coping and grass keep nontrivial solid faces out of all native walking cells',()=>{
 for(const id of[50012,50013]){
  const world=setup(id),mesh=new Geometry();appendObservatoryDetail(mesh,observatoryScenePlan(world));const intrusions=[];
  for(const tri of triangles(mesh)){
   const [x,y,z]=tri.center;
   if(y>.1&&y<2.4&&world.scene.floor[Math.floor(z)]?.[Math.floor(x)]==='.')intrusions.push({x,y,z});
  }
  assert.deepEqual(intrusions,[],id+' keeps functional walking floor clear');
  for(const anchor of Object.values(world.scene.observatory.anchors))assert.equal(world.walkable(anchor[0]+.5,anchor[1]+.5),true,'native approach stations remain on the same usable floor');
 }
});

test('the reply station sits on a compact dry tidal shelf connected below the actual sea',()=>{
 const world=setup(50013),plan=observatoryScenePlan(world),mesh=new Geometry(),result=appendObservatoryDetail(mesh,plan),sea=-5.25;
 const count=result.groups.find(g=>g.name==='backdrop').triangles,backdrop=triangles(mesh).slice(-count),cliff=backdrop.filter(t=>t.material===6.25);
 assert.ok(cliff.length>=60,'the whole tidal cliff uses the shared coastal rock surface');
 assert.ok(backdrop.some(t=>t.points.some(p=>p[1]<sea-.9)),'connected station foundation reaches the bedrock below the actual sea');
 const highest=Math.max(...backdrop.flatMap(t=>t.points.map(p=>p[1])));assert.ok(highest>-1.8&&highest<-1,'the beacon remains below the main courtyard instead of becoming a giant skyline plinth');
 const terrain=backdrop.filter(t=>t.points.some(p=>Math.abs(p[0]-5)<1e-8&&Math.abs(p[1]+4.4)<1e-8&&Math.abs(p[2])<1e-8));assert.equal(terrain.length,12,'the dry tidal surface has one continuous central fan');
 assert.ok(terrain.every(t=>t.normal[1]>.95&&t.points.every(p=>p[1]>sea)),'the whole eroded top faces up and remains above the actual waterline');
 for(const t of cliff){const [x,,z]=t.center,n=t.normal;assert.ok(n[0]*(x-5)+n[2]*z>0,'textured tidal cliff skins face outward');}
 const levels=new Set(cliff.flatMap(t=>t.points.map(p=>p[1].toFixed(3))));assert.ok(levels.size>20,'the eroded shore retains irregular strata rather than uniform stacked bands');
 const b=OBSERVATORY_BACKDROP_BOUNDS;
 assert.ok(backdrop.every(t=>t.points.every(p=>p[0]>=b.x&&p[0]<=b.x+b.w&&p[2]>=b.z&&p[2]<=b.z+b.d)),'draw bounds enclose every part of the one tidal station');
 assert.ok(b.w<=7.8&&b.d<=6.4&&b.z+b.d<3,'the compact station remains outside the main court');
 assert.ok(backdrop.every(t=>world.scene.floor[Math.floor(t.center[2])]?.[Math.floor(t.center[0])]!=='.'),'the entire tidal composition stays off native playable floor');
});

test('two tended lodge-corner planters have broad living foliage and visible copper bodies while a warm bulkhead lamp marks the gable',()=>{
 for(const id of[50012,50013]){
  const world=setup(id),plan=observatoryScenePlan(world),mesh=new Geometry();appendObservatoryDetail(mesh,plan);const all=triangles(mesh),r=plan.lodge,cx=r.x+r.w/2,front=r.z+r.d;
  for(const side of[-1,1]){
   const x=cx+side*(r.w/2-.44),leaves=all.filter(t=>Math.abs(t.center[0]-x)<.46&&t.center[1]>.82&&t.center[1]<1.5&&t.center[2]>front-.06&&t.center[2]<front&&t.color[1]>t.color[0]*1.05&&t.color[1]>t.color[2]*1.20);
   assert.ok(leaves.length>=60,'each of the two attached boxes contains readable folded herb leaves');
   const body=all.filter(t=>Math.abs(t.center[0]-x)<.38&&t.center[1]>.45&&t.center[1]<.80&&t.center[2]>front-.025&&t.center[2]<front&&t.normal[2]>.9&&t.color[0]>t.color[1]*1.4);
   assert.ok(body.length>=2,'copper planter front faces present toward the porch instead of being hidden inside the wall');
  }
  const lamp=all.filter(t=>Math.abs(t.center[0]-cx)<.35&&t.center[1]>3&&t.center[1]<3.6&&t.center[2]>front+.2&&t.material===4);
  assert.ok(lamp.length>=20,'the fixed gable lamp has a real warm glass chamber');assert.ok(lamp.every(t=>t.points.every(p=>p[1]>2.4)),'the added porch fixture stays clear of traveller head height');
 }
});

test('the sea edge uses low varied hewn coping instead of repeated raised parapet blocks',()=>{
 for(const id of[50012,50013]){
  const world=setup(id),mesh=new Geometry(),result=appendObservatoryDetail(mesh,observatoryScenePlan(world)),start=result.groups.slice(0,2).reduce((sum,g)=>sum+g.triangles,0),edge=triangles(mesh).slice(start,start+result.groups.find(g=>g.name==='edge').triangles);
  const caps=edge.filter(t=>t.normal[1]>.8&&t.points.every(p=>p[1]>.03&&p[1]<.13));
  assert.ok(caps.length>=60,'the sea edge has a continuous readable low stone lip');
  const heights=new Set(caps.map(t=>t.center[1].toFixed(3)));assert.ok(heights.size>12,'individual cut-stone caps retain varied weathered top planes');
  assert.ok(caps.every(t=>world.scene.floor[Math.floor(t.center[2])]?.[Math.floor(t.center[0])]!=='.'),'coping remains seaward of native walking floor');
 }
});
