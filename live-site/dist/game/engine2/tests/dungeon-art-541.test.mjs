import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {dungeonArchitectureSpec} from '../adventure-dungeon-architecture.js';
import {appendDungeonArt541,appendDungeonArtDynamics541,dungeonArt541Plan,dungeonArt541Applies} from '../dungeon-art-541.js';

const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
const setup=()=>{const w=new World(source);w.newGame({quiet:true});return w;};
function enter(w,id){w.state.scene=id;w.state.chapter=w.scene.chapter;w.state.mode='field';const s=w.scene;w.state.x=s.arrive[0]+.5;w.state.y=s.arrive[1]+.5;w.objects();return w;}
const structural=(s,x,z)=>(s.household?.floorBase||s.floor)[z]?.[x]==='.'&&!(s.household?.partitions||[]).some(p=>p.x===x&&p.y===z);
function finite(m){assert.equal(m.v.length%36,0);assert.ok(m.v.every(Number.isFinite));}

test('all53real campaign and secret dungeons have substantial bounded structural craft without changing native state or walking clearance',()=>{
 const w=setup(),families=new Set(),chapters=new Set();let scenes=0,arches=0,max=0;
 for(const [id,s] of w.scenes){w.state.scene=id;if(!dungeonArt541Applies(w))continue;enter(w,id);const saved=w.save(),floor=JSON.stringify(s.floor),mesh=new Geometry(),p=appendDungeonArt541(mesh,{world:w});finite(mesh);scenes++;families.add(p.spec.family);chapters.add(s.chapter);arches+=p.arches.length;max=Math.max(max,p.triangles);
  assert.ok(p.hero,'a scene head is attached to an actual existing wall instrument');assert.ok(p.triangles>=140&&p.triangles<2400,'the room has real craft at a bounded mobile cost: '+id+' / '+p.triangles);
  const again=new Geometry();appendDungeonArt541(again,{world:w});assert.deepEqual(mesh.v,again.v,'same actual floor and station layout produce exactly the same architecture');
  for(let i=0;i<mesh.v.length;i+=12)if(mesh.v[i+1]>.05&&mesh.v[i+1]<2.91)assert.equal(structural(s,Math.floor(mesh.v[i]),Math.floor(mesh.v[i+2])),false,'piers and lower caps stay in native closed cells '+id);
  for(const a of p.arches){assert.equal(structural(s,Math.floor(a.x0),Math.floor(a.z)),false);assert.equal(structural(s,Math.floor(a.x1),Math.floor(a.z)),false);assert.ok(a.x1-a.x0>=4&&a.x1-a.x0<=8,'arches bridge measured native aisles');}
  const moving=new Geometry(),glow=new Geometry();appendDungeonArtDynamics541(moving,glow,{world:w,time:3,range:1000});finite(moving);finite(glow);assert.ok(moving.v.length/36<180,'one current head has bounded moving geometry');
  assert.equal(JSON.stringify(s.floor),floor);assert.equal(w.save(),saved,'art never advances progression or edits a save');
 }
 assert.equal(scenes,53);assert.equal(chapters.size,24);assert.ok(families.size>=20);assert.ok(arches>10,'the pass adds measured structural arches, not just fixture labels');assert.ok(max<2400);
});

test('the enlarged actual waterworks head shows before, drag preview, intermediate and committed native valve states',()=>{
 const w=enter(setup(),47),p=dungeonArt541Plan(w),o=p.hero.control;assert.ok(o&&o.type==='puzzle'&&o.stage_flag,'the existing valve owns this head');
 const draw=feedback=>{const m=new Geometry(),g=new Geometry();const state=appendDungeonArtDynamics541(m,g,{world:w,time:3,feedback,range:1000});return {data:m.data(),state};};
 const before=w.save(),idle=draw(),preview=draw({pending:{object:{...o},progress:.63}});assert.equal(idle.state.progress,0);assert.equal(preview.state.progress,.63);assert.notDeepEqual(preview.data,idle.data,'dragging visibly moves broad shutters before committing');assert.equal(w.save(),before);
 w.setBit(...o.stage_flag);const intermediate=draw();assert.equal(intermediate.state.progress,.5);assert.notDeepEqual(intermediate.data,idle.data);
 w.unsetBit(...o.stage_flag);w.setBit(w.flagFor(o),o.bit);const complete=draw();assert.equal(complete.state.progress,1);assert.notDeepEqual(complete.data,intermediate.data,'the committed native valve opens the final shutter section');
});

test('the real chamfered piers and aisle arch faces point outward for native renderer culling',()=>{
 const w=enter(setup(),230),m=new Geometry(),p=appendDungeonArt541(m,{world:w});assert.ok(p.arches.length);let shafts=0,front=0,back=0;
 for(let i=p.ranges.start*12;i<p.ranges.arches*12;i+=36){
  const points=[m.v.slice(i,i+3),m.v.slice(i+12,i+15),m.v.slice(i+24,i+27)];if(!points.every(a=>Math.abs(a[1]-.23)<1e-7||Math.abs(a[1]-2.67)<1e-7))continue;
  const center=points[0].map((_,j)=>points.reduce((sum,a)=>sum+a[j],0)/3),s=p.supports.slice().sort((a,b)=>Math.hypot(a.x-center[0],a.z-center[2])-Math.hypot(b.x-center[0],b.z-center[2]))[0];
  assert.ok(m.v[i+3]*(center[0]-s.x)+m.v[i+5]*(center[2]-s.z)>0,'each actual shaft face exposes its outer stone rather than its invisible interior');shafts++;
 }
 for(let i=p.ranges.arches*12;i<p.ranges.hero*12;i+=36){
  const points=[m.v.slice(i,i+3),m.v.slice(i+12,i+15),m.v.slice(i+24,i+27)];if(!points.every(a=>a[1]>=2.919))continue;
  for(const a of p.arches){if(points.every(v=>Math.abs(v[2]-a.z-.18)<1e-7)){assert.ok(m.v[i+5]>.99,'front voussoirs face the south camera');front++;}if(points.every(v=>Math.abs(v[2]-a.z+.18)<1e-7)){assert.ok(m.v[i+5]<-.99,'rear voussoirs face the opposite side');back++;}}
 }
 assert.ok(shafts>=16&&front>=20&&back===front,'actual emitted structural faces were checked');
});

test('the pass leaves other domains alone and rebuilds supports after real structural floor changes',()=>{
 const w=setup();for(const id of[2,5,12,13,17,50,61,226,50012,50013,2000]){enter(w,id);assert.equal(dungeonArchitectureSpec(w),null);const m=new Geometry();assert.equal(appendDungeonArt541(m,{world:w}).spec,null);assert.equal(m.v.length,0);}
 enter(w,701);const before=dungeonArt541Plan(w),chosen=before.supports[0];assert.ok(chosen);const x=Math.floor(chosen.x),z=Math.floor(chosen.z),rows=w.scene.floor.map(r=>Array.isArray(r)?r.slice():r.split(''));rows[z][x]='.';w.scene.floor=rows.map(r=>r.join(''));
 if(w.scene.household?.floorBase){const base=w.scene.household.floorBase.map(r=>Array.isArray(r)?r.slice():r.split(''));base[z][x]='.';w.scene.household.floorBase=base.map(r=>r.join(''));}
 const after=dungeonArt541Plan(w);assert.notEqual(after,before);assert.ok(!after.supports.some(p=>p.x===chosen.x&&p.z===chosen.z),'newly walkable native ground is never left with an old solid pier');
});
