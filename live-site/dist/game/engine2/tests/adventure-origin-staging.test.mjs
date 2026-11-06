import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry,C} from '../cistern-renderer.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';
import {findPath} from '../navigation.js';
import {isObservatory,buildObservatoryGeometry,appendObservatoryDynamics,observatoryScenePlan,observatoryVisualState} from '../observatory-art.js';
import {ORIGINS} from '../origin-content.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../embodied-origins.js';
import {originStagingSpec,originStagingPlan,appendOriginStaging,appendOriginStagingDynamics,originStagingActors} from '../adventure-origin-staging.js';
import {adventureLandscapePlan} from '../adventure-landscape.js';
const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
function setup(origin,part=0){const w=new World(source);const controller=installEmbodiedOrigins(w);w.newGame({originId:origin.id,quiet:true});w.state.scene=origin.location+part;w.state.chronicle.step=part?2:0;w.state.mode='field';w.objects();controller.snapshot();return {w,controller};}
function structural(scene,x,z){return (scene.household?.floorBase||scene.floor)[z]?.[x]==='.'&&!(scene.household?.partitions||[]).some(p=>p.x===x&&p.y===z);}
function finite(mesh){assert.equal(mesh.v.length%36,0);assert.ok(mesh.v.every(Number.isFinite));}
function dynamic(w,feedback=null){const m=new Geometry(),g=new Geometry();(isObservatory(w)?appendObservatoryDynamics:appendOriginStagingDynamics)(m,g,{world:w,time:2,range:1000,feedback,objects:w.embodiedOrigins?.objects()||[]});finite(m);finite(g);return new Float32Array([...m.v,...g.v]);}
function nativeObservatory(w){const renderer={world:w,effectiveQuality(){throw Error('the compact observatory must not enter generic art assembly');}};const mesh=Adventure3DRenderer.prototype.buildArchitecture.call(renderer);assert.equal(renderer.environmentArt537,null);assert.equal(renderer.compositionPlan.stats.authored,'listening-headland');assert.deepEqual(mesh.v,buildObservatoryGeometry(Geometry,C,w).v);return mesh;}

function assertAuthoredSea(mesh,palette){
 const cells=new Map(),topology=new Map(),points=[],base=palette.water;let triangles=0;
 for(let i=0;i<mesh.v.length;i+=36){const p=[0,12,24].map(j=>mesh.v.slice(i+j,i+j+3));if(!p.every(v=>Math.abs(v[1]+5.25)<1e-8))continue;
  assert.equal(mesh.v[i+9],6,'authored sea uses its native quiet color, not the retired photographic water texture');assert.ok(mesh.v[i+4]>.99,'sea faces are upward and cannot vanish by backface culling');
  for(let j=0;j<3;j++)for(let k=j+1;k<3;k++)assert.ok(Math.hypot(p[j][0]-p[k][0],p[j][2]-p[k][2])<=Math.sqrt(32)+1e-6,'small sea faces cannot span the software near plane');
  const minX=Math.min(...p.map(v=>v[0])),minZ=Math.min(...p.map(v=>v[2])),area=Math.abs((p[1][0]-p[0][0])*(p[2][2]-p[0][2])-(p[2][0]-p[0][0])*(p[1][2]-p[0][2]))/2;
  assert.ok(Math.abs(area-8)<1e-8,'each cell has two nondegenerate half-quads');const id=minX+','+minZ;cells.set(id,(cells.get(id)||0)+1);if(!topology.has(id))topology.set(id,[]);topology.get(id).push(p.map(v=>[v[0],v[2]]));points.push(...p);triangles++;
  const tone=mesh.v[i+6]/base[0];assert.ok(tone>=.85&&tone<=1.03);for(let c=0;c<3;c++)assert.ok(Math.abs(mesh.v[i+6+c]-base[c]*tone)<1e-7,'sea keeps the native blue palette under broad coherent tone variation');
 }
 assert.ok(triangles>=1250&&triangles<=2000,'100m+ sea stays inside the authored static face budget');assert.equal(cells.size,triangles/2);assert.ok([...cells.values()].every(n=>n===2),'every sea cell has two triangles');
 for(const faces of topology.values()){const ids=faces.map(ps=>ps.map(p=>p.join(','))),corners=new Set(ids.flat()),shared=ids[0].filter(p=>ids[1].includes(p)).map(p=>p.split(',').map(Number));assert.equal(corners.size,4);assert.equal(shared.length,2);assert.ok(Math.abs(Math.hypot(shared[0][0]-shared[1][0],shared[0][1]-shared[1][1])-Math.sqrt(32))<1e-8,'complementary triangles share the4mquad diagonal, leaving no hidden half-cell hole');}
 const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]),minX=Math.min(...xs),minZ=Math.min(...zs),maxX=Math.max(...xs),maxZ=Math.max(...zs);
 assert.equal(maxX-minX,100);assert.ok(maxZ-minZ>=100&&maxZ-minZ<=160,'the current camera horizon has bounded100m+ connected sea coverage');assert.equal(cells.size,(maxX-minX)*(maxZ-minZ)/16);
 for(let z=minZ;z<maxZ;z+=4)for(let x=minX;x<maxX;x+=4)assert.equal(cells.get(x+','+z),2,'connected sea contains no missing4m cell at '+x+','+z);
}

test('fourteen remembered places retain their native architecture owner, connected floor and read-only visual state',()=>{
 const styles=new Set();let count=0,generic=0,compact=0;
 for(const o of ORIGINS)for(const part of[0,1]){const {w}=setup(o,part),before=w.save(),floor=[...w.scene.floor],native=w.scene.objects.map(o=>({type:o.type,xy:o.xy&&[...o.xy]}));count++;styles.add(originStagingSpec(w).family);let mesh;
  if(isObservatory(w)){
   compact++;mesh=nativeObservatory(w);const p=observatoryScenePlan(w),arrival=w.scene.arrive.map(n=>n+.5);assert.ok(mesh.observatory);assert.deepEqual(p.anchors.arrival,{x:arrival[0],z:arrival[1]});
   for(let z=0;z<w.scene.height;z++)for(let x=0;x<w.scene.width;x++)if(w.scene.floor[z][x]==='.')assert.ok(findPath(w.scene,arrival,[x,z],0).length||x===w.scene.arrive[0]&&z===w.scene.arrive[1],'every compact floor cell joins the native arrival');
   for(const object of w.scene.objects)assert.ok(findPath(w.scene,arrival,object.xy,1).length||Math.hypot(arrival[0]-object.xy[0]-.5,arrival[1]-object.xy[1]-.5)<2.3,'native station remains reachable');
   assert.ok(mesh.v.length/36<15000,'bounded authored headland, equipment and reply-station geometry');
  }else{
   generic++;mesh=new Geometry();const p=appendOriginStaging(mesh,{world:w});assert.ok(p.routes.length,'connected service routes '+o.id+':'+part);assert.ok(p.bays.length);assert.ok(p.bodies.length,'worksite bodies '+o.id+':'+part);
   for(const r of p.routes)for(let i=0;i<r.cells.length;i++){const c=r.cells[i];assert.equal(w.scene.floor[c[1]]?.[c[0]],'.');if(i)assert.equal(Math.abs(c[0]-r.cells[i-1][0])+Math.abs(c[1]-r.cells[i-1][1]),1,'walk uses actual connected floor');}
   for(const b of p.bodies){assert.ok(b.connection.length);assert.ok(Math.hypot(b.x-b.anchor.x,b.z-b.anchor.z)<=7);}
   for(let i=0;i<mesh.v.length;i+=12)if(mesh.v[i+1]>.075)assert.equal(structural(w.scene,Math.floor(mesh.v[i]),Math.floor(mesh.v[i+2])),false,'raised structure stays off walkable footprint '+o.id+':'+part);
   assert.ok(mesh.v.length/36<7000,'bounded generic origin geometry');
  }
  finite(mesh);dynamic(w);assert.deepEqual(w.scene.floor,floor);assert.deepEqual(w.scene.objects.map(o=>({type:o.type,xy:o.xy&&[...o.xy]})),native);assert.equal(w.save(),before);
 }
 assert.equal(count,14);assert.equal(generic,12);assert.equal(compact,2);assert.equal(styles.size,7);
});
test('Veyr arrives through the real south approach with a mast, receiver and repair station anchored in the compact court',()=>{
 const o=ORIGINS.find(o=>o.id==='veyr-storm'),{w,controller}=setup(o),p=observatoryScenePlan(w),spec=w.scene.observatory;
 assert.deepEqual([w.state.x,w.state.y],[10.5,21.5]);assert.deepEqual(p.anchors.arrival,{x:10.5,z:21.5});assert.deepEqual(p.body,{x:9.5,z:9.5,w:3,d:3});
 for(const [name,role]of[['operator','operator'],['repair','repair'],['transfer','transfer']]){const xy=spec.anchors[name];assert.ok(w.scene.objects.some(n=>n.observatoryRole===role&&n.xy[0]===xy[0]&&n.xy[1]===xy[1]),'explicit native '+role);assert.ok(findPath(w.scene,[w.state.x,w.state.y],xy,1).length);}
 const receiver=controller.objects()[0];assert.equal(receiver.manipulation,'receiver');assert.deepEqual(receiver.xy,spec.anchors.operator);assert.ok(p.lodge.z+p.lodge.d<=p.anchors.operator.z+.01,'receiver belongs to the lodge front');
 const mesh=nativeObservatory(w);assert.ok(Math.max(...mesh.v.filter((_,i)=>i%12===1))>6.2,'the real master mast establishes the arrival silhouette');
});
test('each saved repair and peaceful worksite change is visible at the same clock without advancing the narrative',()=>{
 for(const o of ORIGINS){const {w}=setup(o),r=w.state.embodiedOrigins.origins[o.id],idle=dynamic(w);r.repair=0;r.grounded=true;const before=w.save(),first=dynamic(w);assert.notDeepEqual(first,idle,o.id+' repair0 visible');assert.equal(w.save(),before);r.repair=1;const second=dynamic(w);assert.notDeepEqual(second,first,o.id+' alternate repair visibly different');
  const part=setup(o,1).w,record=part.state.embodiedOrigins.origins[o.id],unresolved=dynamic(part);record.diverted=true;assert.notDeepEqual(dynamic(part),unresolved,o.id+' peaceful diversion changes worksite');
 }
});
test('Veyr ground and handle previews affect machinery before committing state',()=>{
 const o=ORIGINS.find(o=>o.id==='veyr-storm'),{w}=setup(o),r=w.state.embodiedOrigins.origins[o.id];const idle=dynamic(w);r.grounded=true;assert.notDeepEqual(dynamic(w),idle,'conductor becomes continuous after grounding');const before=w.save(),base=dynamic(w);assert.notDeepEqual(dynamic(w,{pending:{object:{originId:o.id,manipulation:'lever'},progress:.7}}),base);assert.equal(w.save(),before);
});
test('physical replacements keep authored people at their stations and completed people remain visible without new interactions',()=>{
 for(const o of ORIGINS){const {w,controller}=setup(o),native=w.scene.objects.find(n=>n.type==='npc'),before=w.save();const visible=[...w.objects().filter(n=>!replacesEmbodiedOriginObject(w,n)),...controller.objects()],actors=originStagingActors(w,{objects:visible,time:2});assert.equal(actors.length,1,o.id+' physical witness remains visible');assert.deepEqual([actors[0].x,actors[0].y],[native.xy[0]+.5,native.xy[1]+.5]);assert.equal(w.save(),before);assert.ok(actors[0].person.npcKind==='npcs'||actors[0].person.row!==undefined);
  assert.equal(originStagingActors(w,{objects:[native]}).length,0,'never duplicate a native NPC already rendered');w.state.chronicle.step=1;assert.equal(originStagingActors(w,{objects:[]}).length,1,'completed witness stays at work');w.state.chronicle.phase='present';assert.equal(originStagingActors(w,{objects:[]}).length,0,'never invent an origin actor in the present');
 }
});
test('ordinary campaign and frontier scenes are outside the origin staging scope',()=>{
 const {w}=setup(ORIGINS[0]);for(const id of[5,47,703,2000]){w.state.scene=id;assert.equal(originStagingSpec(w),null);const mesh=new Geometry();appendOriginStaging(mesh,{world:w});assert.equal(mesh.v.length,0);}
});
test('repair-choice sockets remain at exact native descriptors and preview both remote mechanisms without spending a choice',()=>{
 const o=ORIGINS.find(o=>o.id==='veyr-storm'),{w,controller}=setup(o);w.state.chronicle.step=1;w.state.embodiedOrigins.origins[o.id].grounded=true;const objects=controller.objects();assert.equal(objects.length,2);const before=w.save(),base=new Geometry(),glow=new Geometry();appendObservatoryDynamics(base,glow,{world:w,time:2,objects,range:1000});
 for(const object of objects){const x=object.xy[0]+.5,z=object.xy[1]+.5;assert.equal(w.scene.floor[object.xy[1]][object.xy[0]],'.');assert.ok(base.v.some((v,i)=>i%12===0&&Math.abs(v-x)<.25&&Math.abs(base.v[i+2]-z)<.25&&Math.abs(base.v[i+1]-.042)<1e-6),'visible flush working socket at exact descriptor '+object.id);}
 for(const object of objects){const next=new Geometry();appendObservatoryDynamics(next,new Geometry(),{world:w,time:2,objects,range:1000,feedback:{pending:{id:object.id,object,progress:.7}}});assert.notDeepEqual(next.data(),base.data(),object.manipulation+' preview changes the anchored receiver mechanism');}assert.equal(w.save(),before);
});
test('the upper station is one compact listening court with a collision-backed mast and separated civic controls',()=>{
 const o=ORIGINS.find(o=>o.id==='veyr-storm'),{w,controller}=setup(o,1),p=observatoryScenePlan(w),mesh=nativeObservatory(w);
 assert.equal(w.scene.width,18);assert.equal(w.scene.height,20);assert.ok(w.scene.floor.join('').split('.').length-1<220);assert.equal(p.part,1);
 for(let z=p.mast.z;z<p.mast.z+p.mast.d;z++)for(let x=p.mast.x;x<p.mast.x+p.mast.w;x++)assert.equal(w.scene.floor[z][x],'#','the visible mast has its real native foundation');
 assert.deepEqual(p.anchors.operator,{x:13.5,z:5.5});assert.ok(p.lodge.z+p.lodge.d<=p.anchors.operator.z-.5,'lodge receiver cannot cover the witness');
 w.state.chronicle.step=3;const controls=controller.objects();assert.equal(controls.length,2);assert.deepEqual(controls.map(o=>o.choiceIndex),[0,1]);assert.notDeepEqual(controls[0].xy,controls[1].xy);
 for(const c of controls){assert.equal(w.scene.floor[c.xy[1]][c.xy[0]],'.');assert.ok(findPath(w.scene,w.scene.arrive.map(n=>n+.5),c.xy,1).length);}
 assert.ok(mesh.observatory.triangles<15000);assert.equal(mesh.observatory.groundY,.02);
});
test('paving, copper receiver and native saved signal status remain distinct in the authored headland',()=>{
 const o=ORIGINS.find(o=>o.id==='veyr-storm'),{w}=setup(o,1),m=nativeObservatory(w),colors=new Set(),deck=[];
 for(let i=0;i<m.v.length;i+=12){colors.add(m.v.slice(i+6,i+9).join(','));if(Math.abs(m.v[i+1]-.02)<.0001&&m.v[i+4]>.99)deck.push(m.v.slice(i+6,i+9));}
 assert.ok(colors.size>10);assert.ok(deck.length>100);assert.ok(deck.every(c=>c[0]>c[2]&&c[0]>.6),'the compact station owns quiet warm paving rather than the retired blue roof atlas');
 const record=w.state.embodiedOrigins.origins[o.id],start=dynamic(w);record.grounded=true;const grounded=dynamic(w);assert.notDeepEqual(grounded,start,'receiver calibration rings show native grounding');record.choice=1;assert.notDeepEqual(dynamic(w),grounded,'independent reply changes the lodge indicators');
 assert.equal(observatoryVisualState(w).grounded,true);assert.equal(observatoryVisualState(w).choice,1);
});
test('both authored headlands descend continuously below their actual sea and support every walking cell',()=>{
 const o=ORIGINS.find(o=>o.id==='veyr-storm');
 for(const part of[0,1]){
  const {w}=setup(o,part),before=w.save(),mesh=nativeObservatory(w),p=observatoryScenePlan(w);const sides=[],caps=new Set(),foundationEnd=mesh.observatory.foundationVertices*12;
  assert.ok(Number.isInteger(foundationEnd)&&foundationEnd>0&&foundationEnd<mesh.v.length&&foundationEnd%36===0,'the native shell has a bounded complete triangle range before decorative geometry');
  for(let i=0;i<mesh.v.length;i+=36){const points=[0,12,24].map(j=>mesh.v.slice(i+j,i+j+3)),low=Math.min(...points.map(v=>v[1])),high=Math.max(...points.map(v=>v[1]));
   if(i<foundationEnd&&mesh.v[i+9]===6.25&&high>low+.1&&low<-.4)sides.push({low,high,points});
   if(points.every(v=>Math.abs(v[1]-p.groundY)<1e-6)&&mesh.v[i+4]>.99){const x=points.reduce((n,v)=>n+v[0]/3,0),z=points.reduce((n,v)=>n+v[2]/3,0);caps.add(Math.floor(x)+','+Math.floor(z));}
  }
  assertAuthoredSea(mesh,p.palette);
  const levels=[...new Set(sides.flatMap(f=>[f.low,f.high]))].sort((a,b)=>a-b);assert.equal(levels.length,4);assert.ok(levels[0]<-5.5&&levels.at(-1)>.0,'foundation joins the court and descends beneath the sea');
  const counts=[];for(let i=1;i<levels.length;i++){const n=sides.filter(f=>f.low===levels[i-1]&&f.high===levels[i]).length;assert.ok(n>20,'every adjacent foundation layer is joined by real faces');counts.push(n);}assert.equal(new Set(counts).size,1,'every perimeter segment continues through all geological layers');
  for(let z=0;z<w.scene.height;z++)for(let x=0;x<w.scene.width;x++)if(w.scene.floor[z][x]==='.')assert.ok(caps.has(x+','+z),'foundation carries a paved native court cell '+x+','+z);
  assert.equal(w.save(),before,'deep foundations and receiver art cannot advance the origin');
 }
});
