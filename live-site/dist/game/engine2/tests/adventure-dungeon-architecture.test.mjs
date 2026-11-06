import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {dungeonArchitectureSpec,dungeonArchitecturePlan,dungeonInvestigationStation,appendDungeonArchitecture,appendDungeonDynamics} from '../adventure-dungeon-architecture.js';
const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
function setup(id){const w=new World(source);w.newGame({quiet:true});w.state.scene=id;w.state.chapter=w.scene.chapter;w.state.mode='field';w.state.x=w.scene.arrive[0]+.5;w.state.y=w.scene.arrive[1]+.5;w.objects();return w;}
function dynamic(w,feedback=null){const m=new Geometry(),g=new Geometry();appendDungeonDynamics(m,g,{world:w,time:3,feedback,range:1000});return m.data();}
function finite(m){assert.equal(m.v.length%36,0);for(const v of m.v)assert.ok(Number.isFinite(v));}
function structural(w,x,z){const s=w.scene,f=s.household?.floorBase||s.floor;return f[z]?.[x]==='.'&&!(s.household?.partitions||[]).some(p=>p.x===x&&p.y===z);}

test('every campaign dungeon and all twenty-four secret rooms receive finite, collision-faithful architecture',()=>{
 const w=setup(230),chapters=new Set(),secrets=new Set();let count=0;
 for(const[id,scene]of w.scenes){w.state.scene=id;w.state.chapter=scene.chapter||1;w.objects();const before=w.save(),m=new Geometry(),p=appendDungeonArchitecture(m,{world:w});if(!p?.spec)continue;
  count++;chapters.add(scene.chapter);if(p.spec.secret)secrets.add(scene.chapter);finite(m);
  assert.ok(m.v.length/36<6000,'bounded added architecture budget in '+id);
  for(const f of [...p.fixtures,...p.investigations,...p.latches]){assert.equal(structural(w,...f.cell),false,'upright fixture belongs in structural blocked tile');assert.equal(structural(w,...f.floor),true,'fixture faces a real open cell');}
  // Every emitted upright vertex remains inside structural closed terrain.
  for(let i=0;i<m.v.length;i+=12)if(m.v[i+1]>.05)assert.equal(structural(w,Math.floor(m.v[i]),Math.floor(m.v[i+2])),false,'tall architecture never crosses walkable floor '+id);
  for(const route of p.routes)for(let i=0;i<route.points.length;i++){const point=route.points[i];assert.equal(scene.floor[point[1]]?.[point[0]],'.');if(i)assert.equal(Math.abs(point[0]-route.points[i-1][0])+Math.abs(point[1]-route.points[i-1][1]),1,'conduits use connected native floor');}
  const d=new Geometry(),g=new Geometry();appendDungeonDynamics(d,g,{world:w,time:2,range:1000});finite(d);finite(g);assert.equal(w.save(),before,'building architecture cannot alter progression or save');
 }
 assert.equal(count,53);assert.equal(chapters.size,24);assert.equal(secrets.size,24);
});

test('household rooms and outdoor/origin scenes stay in their own architecture scopes',()=>{
 for(const id of[2,5,12,13,17,50,61,226,19,135,2000])assert.equal(dungeonArchitectureSpec(setup(id)),null,'excluded '+id);
 const w=setup(230);w.scene.originId='test-origin';assert.equal(dungeonArchitectureSpec(w),null);delete w.scene.originId;
});

test('real undercity valve intermediate and committed states change connected architectural waterworks',()=>{
 const w=setup(47),o=w.objects().find(o=>o.type==='puzzle');assert.ok(o.stage_flag);const p=dungeonArchitecturePlan(w);assert.ok(p.routes.some(r=>r.object===o));appendDungeonArchitecture(new Geometry(),{world:w});const idle=dynamic(w),before=w.save();
 const preview=dynamic(w,{pending:{object:{...o},progress:.64}});assert.notDeepEqual(preview,idle,'physical input previews wall shutters before state commit');assert.equal(w.save(),before);
 w.setBit(...o.stage_flag);const staged=dynamic(w);assert.notDeepEqual(staged,idle,'authoritative intermediate valve affects waterworks');
 w.unsetBit(...o.stage_flag);w.setBit(w.flagFor(o),o.bit);const complete=dynamic(w);assert.notDeepEqual(complete,staged,'committed valve opens the remaining architectural shutter');
});

test('recorded note order changes answering pipe returns while wrong-note reset restores the unlit phrase',()=>{
 const w=setup(404),o=w.objects().find(o=>o.type==='note');assert.ok(o);const p=appendDungeonArchitecture(new Geometry(),{world:w});assert.ok(p.routes.some(r=>r.object===o));const start=dynamic(w);
 w.state.flags['sequence:'+o.sequence_address]=2;const part=dynamic(w);assert.notDeepEqual(part,start);w.state.flags['sequence:'+o.sequence_address]=0;assert.deepEqual(dynamic(w),start);
 w.setBit(w.flagFor(o),o.completes_bit);assert.notDeepEqual(dynamic(w),part);
});

test('rebuilding after real collision changes never leaves a service route through a newly closed tile',()=>{
 const w=setup(47),p=appendDungeonArchitecture(new Geometry(),{world:w}),route=p.routes.find(r=>r.points.length>3);assert.ok(route);const [x,z]=route.points[1],old=w.scene.floor;
 const next=old.map(row=>Array.isArray(row)?row.slice():row.split(''));next[z][x]='#';w.scene.floor=next.map(r=>r.join(''));
 const updated=appendDungeonArchitecture(new Geometry(),{world:w});for(const r of updated.routes)assert.ok(!r.points.some(q=>q[0]===x&&q[1]===z));w.scene.floor=old;
});

test('all four native investigations show each actual partial stage without changing the save',()=>{
 const scenarios=[
  [703,[{traced:true},{traced:true,isolated:true},{traced:true,isolated:true,vented:true},{traced:true,isolated:true,vented:true,drained:true}]],
  [704,[{heard:true},{heard:true,phrase:1},{heard:true,phrase:2},{heard:true,phrase:3},{heard:true,phrase:4}]],
  [705,[{observations:1,phase:1},{observations:2,phase:2},{observations:3,phase:0}]],
  [707,[{food:true},{food:true,shelter:true},{food:false,shelter:true,custody:'sheltered'},{food:false,shelter:true,custody:'released'}]]
 ];
 for(const[id,stages]of scenarios){const w=setup(id),p=appendDungeonArchitecture(new Geometry(),{world:w});assert.equal(p.investigations.length,3);let previous=dynamic(w);
  for(const state of stages){w.state.exploration.investigations??={};w.state.exploration.investigations[w.scene.chapter]=state;const before=w.save(),next=dynamic(w);assert.notDeepEqual(next,previous,'visible native stage '+id+':'+JSON.stringify(state));assert.equal(w.save(),before);previous=next;}
  w.state.exploration.solved.push('district:'+w.scene.chapter+':latch');assert.notDeepEqual(dynamic(w),previous,'the actual solved latch opens its worksite compartment');
 }
});

test('all twenty-four secret compartments open only from their own saved latch and preserve hidden loot',()=>{
 const w=setup(701);for(let chapter=1;chapter<=24;chapter++){
  w.state.scene=700+chapter;w.state.chapter=chapter;w.state.x=w.scene.arrive[0]+.5;w.state.y=w.scene.arrive[1]+.5;w.objects();const p=appendDungeonArchitecture(new Geometry(),{world:w});assert.equal(p.investigations.length?1:p.latches.length,1,'chapter has one physical compartment');const before=w.save(),closed=dynamic(w);assert.equal(w.save(),before);
  const hidden=w.scene.objects.filter(o=>o.hidden).map(o=>o.exploreId);w.state.exploration.solved.push('district:'+chapter+':latch');const opened=dynamic(w);assert.notDeepEqual(opened,closed,'native latch '+chapter+' opens');assert.deepEqual(w.scene.objects.filter(o=>o.hidden).map(o=>o.exploreId),hidden,'rendering does not reveal or award hidden loot');
 }
});

test('dedicated investigation input plates retain native coordinates and preview the connected machinery',()=>{
 for(const id of[703,704,705,707]){const w=setup(id),p=appendDungeonArchitecture(new Geometry(),{world:w});for(const station of p.investigations){assert.equal(dungeonInvestigationStation(w,station.object),station);assert.ok(station.wire.length,'native control and physical station share a connected floor route');assert.deepEqual(station.wire[0],station.object.xy);}
  const o=p.investigations.find(s=>s.role==='control').object,before=w.save(),idle=dynamic(w),preview=dynamic(w,{pending:{object:{...o},progress:.64}});assert.notDeepEqual(preview,idle,'hold/drag previews the real mechanism '+id);assert.equal(w.save(),before,'mechanical preview cannot commit a puzzle answer');
 }
});
