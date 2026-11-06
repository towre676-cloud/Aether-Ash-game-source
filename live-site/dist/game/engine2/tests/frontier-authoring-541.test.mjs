import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {findPath} from '../navigation.js';
import {FIELD_ORIGINS,startOrigin,exitOrigin} from '../field-origins.js';
import {APPROACHES} from '../battle-approaches.js';
import {SIDE_CAMPAIGNS,frontierObjects} from '../frontiers.js';
import {installReconciledGround} from '../reconciled-ground.js';
import {installLivingAtlas,validateLivingAtlas} from '../living-atlas.js';
import {FRONTIER_ANCHORS_541,frontierFloorPlan541,legacyFrontierFloor541,isAuthoredFrontier541,stampFrontierPosition541,migrateFrontierPosition541} from '../frontier-authoring-541.js';
const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
function reachable(scene){const start=FRONTIER_ANCHORS_541.arrival,queue=[start],seen=new Set([start.join(',')]);for(let i=0;i<queue.length;i++)for(const[dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]]){const q=[queue[i][0]+dx,queue[i][1]+dz],key=q.join(',');if(scene.floor[q[1]]?.[q[0]]==='.'&&!seen.has(key)){seen.add(key);queue.push(q);}}return seen;}
function make(){const w=new World(data);w.newGame({quiet:true});w.state.complete=true;w.state.chapter=25;w.loadScene(2000);w.state.mode='field';return w;}
function removedPoint(plan,legacy){for(let z=1;z<plan.height-1;z++)for(let x=1;x<plan.width-1;x++)if(legacy.floor[z][x]==='.'&&plan.floor[z][x]==='#')return[x+.5,z+.5];throw Error('expected a removed old open platform cell');}

test('all sixty frontiers have five connected circulation grammars and broad closed regional landmasses at unchanged anchors',()=>{
 const phaseIds=new Set();let minimumMass=Infinity;
 for(let region=0;region<12;region++){
  const signatures=new Set();
  for(let phase=0;phase<5;phase++){
   const p=frontierFloorPlan541(region,phase),legacy=legacyFrontierFloor541(region,phase),open=p.floor.join('').split('.').length-1,oldOpen=legacy.floor.join('').split('.').length-1,seen=reachable(p);signatures.add(p.floor.join(''));phaseIds.add(p.frontierAuthoring541.phaseId);
   assert.equal(p.width,34);assert.equal(p.height,28);assert.equal(p.floor.length,28);assert.ok(p.floor.every(r=>r.length===34));assert.equal(seen.size,open,'every clearing and route is connected through native four-way movement');
   assert.ok(open>=250&&open<400,'working courts and two/three-wide circulation replace the old empty platform');assert.ok(oldOpen-open>100,'the former broad open substrate is materially reduced');
   for(const [role,xy]of Object.entries(FRONTIER_ANCHORS_541)){assert.equal(p.floor[xy[1]][xy[0]],'.',role+' retains its exact native coordinate');assert.ok(seen.has(xy.join(',')));}
   for(let z=16;z<=24;z++)for(let x=21;x<=30;x++)assert.equal(p.floor[z][x],'.','the complete original encounter court survives');
   for(const r of p.frontierAuthoring541.closedMasses){assert.ok(r.w>=4&&r.d>=4);minimumMass=Math.min(minimumMass,r.w*r.d);for(let z=r.z;z<r.z+r.d;z++)for(let x=r.x;x<r.x+r.w;x++)assert.equal(p.floor[z][x],'#','the advertised regional model mass is actually closed ground');}
   assert.deepEqual(frontierFloorPlan541(region,phase),p,'native layout generation is deterministic');
  }
  assert.equal(signatures.size,5,'each phase has a different native route grammar');
 }
 assert.equal(phaseIds.size,5);assert.ok(minimumMass>=40,'full landforms have room beyond a thin decorative pole');
});
test('generated commissions, actors and portal destinations keep their original identities and coordinates',()=>{
 const w=make(),scenes=[...w.scenes.values()].filter(s=>isAuthoredFrontier541(s)&&s.fieldOrigin===undefined);assert.equal(scenes.length,60);assert.equal(SIDE_CAMPAIGNS.length,240);
 for(const s of scenes){assert.deepEqual(s.arrive,[4,23]);for(const o of s.objects){if(!o.xy)continue;const expected=o.type==='frontier-board'?[6,22]:o.type==='camp'?[8,23]:o.frontierStep===0?[10,8]:o.frontierStep===1?[24,7]:o.to==='hub'?[4,23]:o.to?.endsWith('_'+(s.frontierAuthoring541.phase-1))?[4,13]:[29,13];assert.deepEqual(o.xy,expected);assert.ok(findPath(s,s.arrive,o.xy,1).length||Math.hypot(s.arrive[0]-o.xy[0],s.arrive[1]-o.xy[1])<1.5);if(o.type==='portal'&&o.to!=='hub'){const to=[...w.scenes.values()].find(v=>v.key===o.to);assert.ok(to);assert.equal(to.floor[o.arrive[1]][o.arrive[0]],'.');}}
  const c=SIDE_CAMPAIGNS.find(c=>c.regionIndex===s.frontierAuthoring541.regionIndex&&c.area===s.frontierAuthoring541.phase);w.state.scene=s.location;w.state.frontiers={version:1,active:c.id,stages:{[c.id]:2},claimed:[],visited:[]};const patrol=frontierObjects(w)[0];assert.equal(patrol.frontierId,c.id);assert.deepEqual(patrol.enemies.map(e=>e[1]),[[25,20],[27,20]]);assert.equal(patrol.flag_address,0x920000+c.number);
 }
 for(const origin of FIELD_ORIGINS){const s=w.scenes.get(origin.location);for(const xy of[s.arrive,[12,21],[14,21],[6,22]])assert.equal(s.floor[xy[1]][xy[0]],'.','borrowed-kit origins keep their actual native trial positions');}
});
test('position migration changes only now-invalid coordinates and preserves all commission and resource history',()=>{
 const scene={...frontierFloorPlan541(0,0),location:2000},legacy=legacyFrontierFloor541(0,0),invalid=removedPoint(scene,legacy),state={scene:2000,x:invalid[0],y:invalid[1],gold:817,xp:41,items:{tonic:3},flags:{12:7},frontiers:{version:1,active:'commission-0',stages:{'commission-0':2},claimed:['commission-9'],visited:[2000]},heroes:[{hp:57,mp:11}],battle:{clock:8.4,cast:{remaining:.42}}},before=structuredClone(state),result=migrateFrontierPosition541(state,scene);
 assert.equal(result.migrated,true);assert.equal(scene.floor[Math.floor(state.y)][Math.floor(state.x)],'.');
 const expected=structuredClone(before);expected.x=state.x;expected.y=state.y;expected.frontierLayoutVersion=1;assert.deepEqual(state,expected,'there is no translation of progress, resources or any separate battle payload');
 const once=structuredClone(state);assert.equal(migrateFrontierPosition541(state,scene).migrated,false);assert.deepEqual(state,once);
 const valid={scene:2000,x:4.25,y:23.75,frontiers:before.frontiers};assert.equal(migrateFrontierPosition541(valid,scene).migrated,false);assert.equal(valid.x,4.25);assert.equal(valid.y,23.75);assert.equal(valid.frontierLayoutVersion,1);
 const outside={scene:2,x:21.5,y:8.5};assert.deepEqual(stampFrontierPosition541(outside,{location:2}),outside);assert.equal(outside.frontierLayoutVersion,undefined);
});
test('real older frontier restores settle onto current floor while keeping canonical commission progress',()=>{
 const w=make(),copy=make(),legacy=legacyFrontierFloor541(0,0),old=removedPoint(w.scene,legacy);w.state.x=old[0];w.state.y=old[1];w.state.frontiers={version:1,active:'commission-0',stages:{'commission-0':2},claimed:['commission-9'],visited:[2000]};w.state.gold=817;w.state.items.tonic=3;delete w.state.frontierLayoutVersion;const saved=JSON.parse(w.save());copy.restore(saved);
 assert.ok(copy.walkable(copy.state.x,copy.state.y));assert.equal(copy.state.scene,2000);for(const key of['frontiers','gold','xp','items','flags','heroes'])assert.deepEqual(copy.state[key],saved[key]);
});
test('unchanged Atlas coordinates keep saved ecology and numerical fields while passability follows the authored native floor',()=>{
 const old=make();old.scene.floor=legacyFrontierFloor541(0,0).floor;delete old.scene.frontierAuthoring541;old.activeHeroes[0].mp=20;installReconciledGround(old);installLivingAtlas(old);assert.ok(old.livingAtlas.listen({phase:.2}).ok);const saved=JSON.parse(old.save()),map=saved.livingAtlasV1.maps.s2000;map.ecology.defeated=3;map.ecology.peaceful=2;delete saved.frontierLayoutVersion;
 const copy=make();installReconciledGround(copy);installLivingAtlas(copy);copy.restore(saved);assert.equal(validateLivingAtlas(copy.state,copy.scenes),true);assert.deepEqual(copy.state.livingAtlasV1.maps.s2000,map,'no field or ecology is discarded for an unchanged coordinate system');
 const removed=removedPoint(copy.scene,legacyFrontierFloor541(0,0));assert.equal(copy.livingAtlas.sample(...removed).fields.passable,false);assert.equal(copy.livingAtlas.sample(4.5,23.5).fields.passable,true);assert.equal(copy.livingAtlas.status().defeated,3);assert.equal(copy.livingAtlas.status().peaceful,2);assert.deepEqual(map.kernel.size,[34,28]);
});

test('all seven cloned field trials receive the exact authored-position migration scope while ordinary scenes remain untouched',()=>{
 const w=make();for(const origin of FIELD_ORIGINS){const scene=w.scenes.get(origin.location);assert.equal(isAuthoredFrontier541(scene),true);const legacy=legacyFrontierFloor541(scene.frontierAuthoring541.regionIndex,0),xy=removedPoint(scene,legacy),state={scene:scene.location,x:xy[0],y:xy[1],items:{tonic:2}};migrateFrontierPosition541(state,scene);assert.equal(scene.floor[Math.floor(state.y)][Math.floor(state.x)],'.');assert.equal(state.items.tonic,2);assert.equal(state.frontierLayoutVersion,1);}
 for(const id of[2,5,50000,50012,50013]){const state={scene:id,x:4.5,y:4.5},before=structuredClone(state);assert.equal(isAuthoredFrontier541(w.scenes.get(id)),false);migrateFrontierPosition541(state,w.scenes.get(id));assert.deepEqual(state,before);}
});
test('a legacy save inside a borrowed trial returns to a legal frontier base without losing its saved campaign',()=>{
 const old=make(),xy=removedPoint(old.scene,legacyFrontierFloor541(0,0));[old.state.x,old.state.y]=xy;old.state.frontiers={version:1,active:'commission-0',stages:{'commission-0':2},claimed:['commission-9'],visited:[2000]};old.state.gold=913;old.state.items.tonic=4;delete old.state.frontierLayoutVersion;assert.ok(startOrigin(old,0,APPROACHES[0].id));const saved=JSON.parse(old.save());delete saved.frontierLayoutVersion;delete saved.fieldOrigins.active.base.frontierLayoutVersion;
 const baseBefore=structuredClone(saved.fieldOrigins.active.base),copy=make();copy.restore(saved);const base=copy.state.fieldOrigins.active.base,scene=copy.scenes.get(base.scene);assert.equal(scene.floor[Math.floor(base.y)][Math.floor(base.x)],'.');assert.equal(base.frontierLayoutVersion,1);
 for(const key of['frontiers','gold','xp','items','flags','heroes','timeline','chronicle'])assert.deepEqual(base[key],baseBefore[key],'nested base '+key+' is not reset');
 exitOrigin(copy,false);assert.equal(copy.state.scene,2000);assert.ok(copy.walkable(copy.state.x,copy.state.y));assert.deepEqual(copy.state.frontiers,baseBefore.frontiers);assert.equal(copy.state.gold,913);assert.equal(copy.state.items.tonic,4);
 const trial={...frontierFloorPlan541(10,0),location:4700,fieldOrigin:0},valid={scene:4700,x:9.5,y:22.5,fieldOrigins:{active:{base:{scene:2000,x:4.25,y:23.75,gold:73,items:{tonic:7}}}}};migrateFrontierPosition541(valid,trial);assert.equal(valid.fieldOrigins.active.base.x,4.25);assert.equal(valid.fieldOrigins.active.base.y,23.75);assert.equal(valid.fieldOrigins.active.base.gold,73);assert.equal(valid.fieldOrigins.active.base.items.tonic,7);
});
