import test from 'node:test';
import assert from 'node:assert/strict';
import {createEcology,BIOMES} from './grass-ecology.mjs';
import {classifyGroundMaterial,createGroundForgeVegetationBridge,evaluateVegetationMaterialEffects} from './ground-forge-compat.mjs';
import {createAAGameVegetationBridge} from './aa-game-integration.mjs';

const materialAt=(x,z)=>x<0?{id:'material-1',tags:['soil'],organic:.95,porous:.9,moisture:.6,grip:.6}:
  z<0?{id:'material-2',tags:['metal','floor'],conductivity:.9}:
  {id:'material-3',tags:['soil'],organic:.55,moisture:.2,grip:.85};
const groundOptions={materialAt,regionAt:(x,z)=>({biome:x<0?'orchard':'marsh'}),heightAt:(x,z)=>Math.sin(x*.1)*.2,
  pathAt:(x,z)=>Math.abs(z)<.35?1:0,obstacleAt:(x,z)=>x>5,
  weatherAt:()=>({rain:0,wind:.3})};
const withBridge=(rest={})=>createAAGameVegetationBridge({renderMode:'none',seed:991,groundOptions,
  ...rest});

test('Ground Forge compatibility respects hard surfaces, interiors, flooding and unknown material ids',()=>{
  for(const mat of [{tags:['floor']},{isInterior:true},{deepWater:true},
    {waterDepth:2},{vegetationAllowed:false},{tags:['pavement']}]){
    const m=classifyGroundMaterial(mat);assert.equal(m.vegetationSuitability,0);assert.equal(m.blocked,true);
  }
  const a=classifyGroundMaterial({id:'any-uuid',organic:.9,porous:.9});
  assert.ok(a.vegetationSuitability>.5);assert.equal(a.materialId,'any-uuid');
  assert.equal(classifyGroundMaterial({id:'totally-novel'}).blocked,false);
});
test('all 48 synthetic material samples are accepted without hardcoding external IDs',()=>{
  const list=Array.from({length:48},(_,i)=>({id:`f-ground-${i}`,organic:i/47,porous:1-i/47,grip:(i%8)/7,wear:(i%9)/8}));
  const result=list.map(classifyGroundMaterial);
  assert.equal(new Set(result.map(v=>v.materialId)).size,48);
  assert.ok(result.every(v=>Number.isFinite(v.vegetationSuitability)&&Number.isFinite(v.grip)));
});
test('ground adapter shares coordinates, dynamic weather, seasons, height and mask with vegetation',()=>{
  let season='summer',rain=0,calls=0;
  const bridge=createGroundForgeVegetationBridge({...groundOptions,materialAt:(x,z)=>{calls++;return materialAt(x,z)},
    weatherAt:()=>({rain}),seasonAt:()=>season});
  const e=createEcology({...bridge.ecologyOptions,seed:1});
  const before=e.sample(-4,3);
  assert.equal(before.y,Math.sin(-.4)*.2);assert.equal(before.biome,'orchard');
  assert.equal(e.sample(2,-2).density,0);
  assert.equal(e.sample(7,2).density,0);
  assert.ok(e.sample(-4,3).density>0);
  bridge.invalidate();season='winter';rain=1;
  const after=e.sample(-4,3);
  assert.ok(after.density<before.density*.4);
  assert.ok(after.moisture>=before.moisture);
  bridge.invalidate();calls=0;e.sample(-4,3);assert.equal(calls,1,'all material callbacks at a point must share one sample');
});
test('biology lives on bare soil and stays away from roads and walls across all 15 biomes',()=>{
  for(const biome of Object.keys(BIOMES)){
    const eco=createEcology({biome,seed:77,substrateAt:()=>({vegetationSuitability:0})});
    assert.equal(eco.sample(10,11).density,0,biome);
  }
});
test('heat, shielding, resonance and electrical transfer remain finite and bounded',()=>{
  for(let i=0;i<50;i++){
    const material=classifyGroundMaterial({grip:i/49,moisture:i/49,heat:i/49,conductivity:i/49,resonance:i/49,shielding:i/49});
    const values=evaluateVegetationMaterialEffects({material},{cover:i/49,moisture:i/49,flammability:i/49},
      {speed:i/49,mass:1-i/49});
    for(const [k,v] of Object.entries(values))assert.ok(Number.isFinite(v)&&v>=0&&v<=1.5,k+v);
  }
});
test('persistent vegetation modifies cover, and quality/reduced-motion change visuals only',()=>{
  const b=withBridge();const cover=b.sample(-2,2).gameplay.concealment;
  b.applyEvent({type:'fire',x:-2,z:2,radius:2,strength:1,eventId:'burn-1'});
  assert.ok(b.sample(-2,2).gameplay.concealment<cover);
  const before=b.sample(-2,2);
  b.setVisualSettings({quality:'ultra',reducedMotion:true,highContrast:true});
  assert.deepEqual(b.sample(-2,2),before);
  assert.equal(b.getStats().reducedMotion,true);
  b.dispose();
});
test('same harvesting transaction id returns zero additional rewards, including after save/reload',()=>{
  const b=withBridge();const item=b.applyEvent({type:'harvest',eventId:'quest-a-1',x:-3,z:3,effort:1});
  assert.ok(item.changed>0);assert.ok(item.quantity>=0);
  assert.deepEqual(b.applyEvent({type:'harvest',eventId:'quest-a-1',x:-3,z:3}).quantity,0);
  const save=b.snapshot();b.dispose();
  const restored=withBridge({initialSave:save});
  assert.equal(restored.applyEvent({type:'harvest',eventId:'quest-a-1',x:-3,z:3}).quantity,0);
  assert.throws(()=>restored.applyEvent({type:'harvest',x:-3,z:3}),/eventId/);
  restored.dispose();
});
test('save/restore preserves environment values, rejects cross-timeline journals and does not corrupt progress',()=>{
  const b=withBridge({timelineId:'original'});
  b.applyEvent({type:'footfall',eventId:'step',x:-2,z:2});
  const before=b.snapshot(),sample=b.sample(-2,2).vegetation;
  assert.throws(()=>b.restore({...before,timelineId:'wrong'}),/timeline/);
  assert.throws(()=>b.restore({...before,recentEventIds:['x','x']}),/journal/);
  assert.deepEqual(b.snapshot(),before);
  assert.ok(b.restore(before));assert.deepEqual(b.sample(-2,2).vegetation,sample);
  assert.equal(b.restore(null),false);b.dispose();
});
test('new game plus histories are independent; returning to earlier timeline restores effects',()=>{
  const b=withBridge();b.applyEvent({type:'water',x:-2,z:2,amount:1,eventId:'wet-first'});
  const original=b.sample(-2,2).vegetation;
  b.switchTimeline({timelineId:'ng-plus',seed:992});
  const second=b.sample(-2,2).vegetation;
  assert.ok(second.wet<original.wet);assert.equal(b.snapshot().recentEventIds.length,0);
  b.applyEvent({type:'fire',eventId:'burn-second',x:-2,z:2});
  b.switchTimeline({timelineId:'main',seed:991});
  assert.deepEqual(b.sample(-2,2).vegetation,original);
  assert.equal(b.snapshot().recentEventIds[0],'wet-first');
  b.dispose();
});
test('invalid timeline switch is transactional and leaves original changes accessible',()=>{
  const b=withBridge();b.applyEvent({type:'footfall',x:-2,z:2});
  const before=b.snapshot();
  assert.throws(()=>b.switchTimeline({timelineId:'invalid',seed:993,initialSave:{version:999}}),/incompatible/);
  assert.deepEqual(b.snapshot(),before);b.dispose();
});
test('host event names explicitly mapped; subscriptions are reversible',()=>{
  const handlers=new Map(),b=withBridge();
  const detach=b.bindHostEvents((name,cb)=>{handlers.set(name,cb);return ()=>handlers.delete(name)},
    {'actor:footstep':p=>({type:'footfall',x:p.x,z:p.z}),
     'combat:fire':p=>({type:'fire',x:p.x,z:p.z,eventId:p.id})});
  assert.equal(handlers.size,2);
  handlers.get('actor:footstep')({x:-3,z:4});
  assert.ok(b.getStats().state.changedCells>0);
  detach();assert.equal(handlers.size,0);b.dispose();
});
test('monotonic day updates and rejected event types do not modify state',()=>{
  const b=withBridge();b.applyEvent({type:'day',worldDay:8,eventId:'time-8'});
  const before=b.snapshot();
  assert.throws(()=>b.applyEvent({type:'day',worldDay:7,eventId:'time-7'}),/nondecreasing/);
  assert.throws(()=>b.applyEvent({type:'unrecognized',eventId:'no-op'}),/unrecognized/);
  assert.deepEqual(b.snapshot(),before);b.dispose();
});
test('Canvas fallback draws on the same game samples, while GPU layer remains optional',()=>{
  const f=withBridge({renderMode:'canvas',quality:'low',worldToScreen:(x,z,y)=>({x:x*10,y:z*10-y*2})});
  const fn=()=>{};let fills=0,strokes=0;
  const ctx={save:fn,restore:fn,beginPath:fn,moveTo:fn,quadraticCurveTo:fn,closePath:fn,ellipse:fn,
    fill:()=>fills++,stroke:()=>strokes++};
  f.setVisualSettings({highContrast:true});
  const out=f.draw(ctx,{bounds:{minX:-6,maxX:3,minZ:-4,maxZ:4},dt:.01,pixelScale:14});
  assert.ok(out.plants>0);assert.ok(fills>0&&strokes>0);
  f.dispose();
  assert.throws(()=>f.sample(0,0),/disposed/);
});
test('invalid event numeric payload does not poison persistent vegetation save',()=>{
 const b=withBridge();const before=b.snapshot();
 assert.throws(()=>b.applyEvent({type:'footfall',x:-2,z:2,mass:NaN,eventId:'bad'}),/finite/);
 assert.throws(()=>b.applyEvent({type:'fire',x:-2,z:2,strength:Infinity,eventId:'bad2'}),/finite/);
 assert.deepEqual(b.snapshot(),before);b.dispose();
});
