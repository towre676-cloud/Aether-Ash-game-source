import test from 'node:test';import assert from 'node:assert/strict';
import {LivingWorld,riverX} from '../src/world.mjs';
import {GroundWorldBridge,identifyGround} from '../src/world-ground-bridge.mjs';
import {createReconciledRuntime} from '../src/reconciled-runtime.mjs';
import {getGroundMaterial} from '../lib/ground/ground-materials.mjs';
const make=()=>new LivingWorld(71);
test('Every ground cell selects a catalogued material',()=>{
 const world=make();for(let x=-32;x<=32;x++)for(let z=-32;z<=32;z++)assert.ok(getGroundMaterial(identifyGround(world,x,z).id));
});
test('Authored landmark floors and open riverbed do not grow grass',()=>{
 const w=make();for(const [x,z,expected] of [[-16,-10,'aether-celestial'],[17,14,'clay-floorboards'],[22,1,'clay-floorboards'],[riverX(0),0,'water-silt']]){
  const s=identifyGround(w,x,z);assert.equal(s.id,expected);assert.ok(s.built);
 }
});
test('Bridge repair changes ground construction, not other region tags',()=>{
 const w=make(),x=riverX(5);assert.notEqual(identifyGround(w,x,5).id,'water-dock');
 w.supplies.timber=5;w.supplies.stone=5;assert.ok(w.dispatch({type:'bridge'}).ok);assert.equal(identifyGround(w,x,5).id,'water-dock');
 assert.equal(identifyGround(w,-16,-10).id,'aether-celestial');
});
test('Physical surface properties alter walk cost without replacing canonical world',()=>{
 const w=make(),b=new GroundWorldBridge(w),xy=[17,14],orig=w.evaluate(...xy),result=b.gameplayAt(...xy);
 assert.equal(w.evaluate(...xy).walkCost,orig.walkCost);assert.equal(result.ground.id,'clay-floorboards');
 assert.ok(result.walkCost>=orig.walkCost);assert.ok(result.cover>=0&&result.cover<=1);
});
test('Actions change persistent ground state and augmented attack outcomes',()=>{
 const w=make(),g=new GroundWorldBridge(w),before=g.surface(17,14).wetness;
 const canonical=w.resolveAttack(17,14,'water',2);
 const act=g.dispatch({type:'cast',x:17,z:14,element:'water',power:2});assert.ok(act.ok);
 assert.equal(act.attack.baseDamage,canonical.damage);
 assert.ok(g.surface(17,14).wetness>before);
 assert.equal(act.attack.groundMaterial,'clay-floorboards');
 const echo=g.dispatch({type:'hydrophone',x:-16,z:-10,phase:0.4});assert.ok(echo.ok);assert.ok(g.surface(-16,-10).phase>0);
});
test('Ground save roundtrip with world state, and invalid saves isolated',()=>{
 const w=make(),g=new GroundWorldBridge(w);g.impact(2,4,'lightning',1);g.footstep(2,4,{speed:1.3});
 const snap=g.save(),other=new GroundWorldBridge(make());other.restore(snap);
 assert.equal(other.surface(2,4).charge,g.surface(2,4).charge);
 assert.equal(other.surface(2,4).traffic,g.surface(2,4).traffic);
 assert.throws(()=>other.restore({...snap,seed:555}));
 const r=createReconciledRuntime(make(),{groundSave:{invalid:1}});assert.ok(r.ground.surface(0,0));
});
test('Resource identity remains stable through world material synchronization',()=>{
 const w=make(),g=new GroundWorldBridge(w);g.impact(20,20,'kinetic',1);const crack=g.surface(20,20).fracture;
 g.dispatch({type:'advance',days:3});assert.ok(g.surface(20,20).fracture>0);assert.ok(g.surface(20,20).fracture<=crack);
});
test('Maps classify paths and built floors as vegetation exclusions',()=>{
 const w=make();for(const p of [[-16,-10],[17,14],[riverX(0),0]])assert.ok(identifyGround(w,...p).built);
 const path=identifyGround(w,7,10);assert.ok(path.trail>=0&&path.trail<=1);
});
test('Ground lifecycle does not overwrite underlying world snapshots',()=>{
 const w=make(),r=createReconciledRuntime(w);const before=JSON.stringify(w.snapshot());r.step(0,0);r.impact(0,0,'kinetic',.75);
 assert.equal(JSON.stringify(w.snapshot()),before);assert.ok(r.save().environment.ground.grid.fields.fracture.some(x=>x>0));
});

test('Production event adapter routes a single world event and a single ground impact',()=>{
 const w=make(),r=createReconciledRuntime(w),x=17,z=14;
 const before=r.ground.surface(x,z).wetness;
 const e=r.ingest({kind:'ELEMENTAL_SKILL_CAST',x,z,element:'water',power:2});
 assert.ok(e.ok);assert.ok(e.groundEvent);assert.equal(w.events.filter(e=>e.type==='cast').length,1);
 assert.equal(r.ground.events.filter(e=>e.type==='ground-impact').length,1);
 assert.ok(r.ground.surface(x,z).wetness>before);
 assert.equal(r.ingest({kind:'UNKNOWN'}).ok,false);
});
