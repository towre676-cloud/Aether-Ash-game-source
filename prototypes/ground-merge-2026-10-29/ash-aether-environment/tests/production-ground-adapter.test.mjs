import test from 'node:test';import assert from 'node:assert/strict';
import {createProductionGroundAdapter} from '../src/production-ground-adapter.mjs';
const make=()=>{const a=createProductionGroundAdapter({seed:42});a.registerMap('chapter-1/meadow',{columns:10,rows:10,cellSize:1,originX:0,originZ:0,
 surfaceAt:(x,z)=>x<4?{id:'clay-floorboards',built:true,structuralTag:'cottage'}:{id:'clay-loam',built:false}});return a;};
test('Production attachment does not need world simulator or a renderer',()=>{const g=make();assert.equal(g.surface('chapter-1/meadow',2,3).id,'clay-floorboards');assert.equal(g.movement('chapter-1/meadow',2,3).vegetationAllowed,false);assert.equal(g.movement('chapter-1/meadow',7,3).vegetationAllowed,true);});
test('Gameplay query is bounded and read only',()=>{const a=make(),before=JSON.stringify(a.save());const r=a.movement('chapter-1/meadow',2,3),m=a.battleModifier({mapId:'chapter-1/meadow',x:2,z:3,element:'fire'});assert.ok(r.traction>=0&&r.traction<=1);assert.ok(m.multiplier>=.65&&m.multiplier<=1.4);assert.equal(JSON.stringify(a.save()),before);});
test('Double-delivered events cannot apply footprints or strikes twice',()=>{const g=make(),event={mapId:'chapter-1/meadow',x:2,z:3,eventId:'move-123'};g.footstep(event);const before=g.surface(event.mapId,event.x,event.z).traffic;assert.equal(g.footstep(event).duplicate,true);assert.equal(g.surface(event.mapId,event.x,event.z).traffic,before);g.impact({...event,eventId:'strike-77',element:'lightning'});const charge=g.surface(event.mapId,event.x,event.z).charge;g.impact({...event,eventId:'strike-77',element:'lightning'});assert.equal(g.surface(event.mapId,event.x,event.z).charge,charge);});
test('Post-hit calculation never invokes host combat resolver and is applied once',()=>{const g=make(),hit={damage:12,critical:true},where={mapId:'chapter-1/meadow',x:2,z:3,element:'lightning'},withGround=g.augmentResolvedHit(hit,where);assert.equal(withGround.groundBaseDamage,12);assert.equal(withGround.critical,true);assert.equal(g.augmentResolvedHit(withGround,where),withGround);assert.deepEqual(hit,{damage:12,critical:true});});
test('Saves are additive and restore ledger across a new game host',()=>{const g=make(),event={mapId:'chapter-1/meadow',x:2,z:3,eventId:'player-travel:1'};g.footstep(event);const a=g.save(),other=make();other.restore(a);assert.equal(other.surface(event.mapId,2,3).traffic,g.surface(event.mapId,2,3).traffic);assert.equal(other.footstep(event).duplicate,true);assert.deepEqual(Object.keys(a),['schema','seed','maps','seenEventIds']);});
test('Invalid save cannot partially restore valid map then clobber later state',()=>{const g=make();g.registerMap('interior',{columns:3,rows:3,cellSize:1,originX:0,originZ:0,surfaceAt:()=>({id:'clay-terracotta',built:true})});g.impact({mapId:'chapter-1/meadow',x:2,z:3,eventId:'hit1',element:'fire'});const before=JSON.stringify(g.save()),corrupted=structuredClone(g.save());corrupted.maps.interior.fields.wet[3]=99;assert.throws(()=>g.restore(corrupted));assert.equal(JSON.stringify(g.save()),before);});
test('Material changes require explicit map sync; state survives bridge construction',()=>{let repaired=false;const g=createProductionGroundAdapter();g.registerMap('bridge',{columns:3,rows:3,cellSize:1,originX:0,originZ:0,surfaceAt:()=>({id:repaired?'water-dock':'water-silt',grassAllowed:false})});assert.equal(g.surface('bridge',1,1).id,'water-silt');repaired=true;assert.equal(g.syncMap('bridge'),9);assert.equal(g.surface('bridge',1,1).id,'water-dock');assert.equal(g.movement('bridge',1,1).vegetationAllowed,false);});
test('No ghost map creation; validated bounds and idempotency ledger',()=>{const g=make();assert.equal(g.surface('chapter-1/meadow',55,55),null);assert.throws(()=>g.surface('missing',0,0));assert.throws(()=>g.impact({mapId:'chapter-1/meadow',x:NaN,z:1,eventId:'bad'}));assert.ok(g.footstep({mapId:'chapter-1/meadow',x:2,z:2,eventId:'bad'}));assert.throws(()=>g.registerMap('oops',{columns:1,rows:2,cellSize:1,originX:0,originZ:0,surfaceAt:()=>"clay-earth"}));});

// Integration regressions against campaign streaming / New Game Plus.
test('Unloaded maps retain their environment state until the player returns',()=>{
 const g=make();const boss=()=>({columns:4,rows:4,cellSize:1,originX:-4,originZ:-4,surfaceAt:()=>({id:'ash-kiln',type:'interior'})});
 g.registerMap('future/boss-room',boss());
 g.impact({mapId:'future/boss-room',x:-2,z:-2,eventId:'boss:heat',element:'fire',strength:.8});
 const original=g.save(),other=make();const restored=other.restore(original);
 assert.equal(restored.deferredMaps,1);
 assert.deepEqual(other.save().maps['future/boss-room'],original.maps['future/boss-room']);
 assert.throws(()=>other.registerMap('future/boss-room',{...boss(),originX:-5}),/Incompatible/);
 assert.deepEqual(other.save().maps['future/boss-room'],original.maps['future/boss-room']);
 other.registerMap('future/boss-room',boss());
 assert.ok(other.surface('future/boss-room',-2,-2).temperature>0);
 assert.equal(other.impact({mapId:'future/boss-room',x:-2,z:-2,eventId:'boss:heat',element:'fire'}).duplicate,true);
});
test('Map unregistration retains footprints by default but supports deliberate deletion',()=>{
 const g=make(),mapId='chapter-1/meadow';g.footstep({mapId,x:1,z:1,eventId:'walk:1'});
 const before=g.surface(mapId,1,1).traffic;
 assert.equal(g.unregisterMap(mapId),true);
 assert.ok(g.save().maps[mapId]);
 g.registerMap(mapId,{columns:10,rows:10,cellSize:1,originX:0,originZ:0,surfaceAt:x=>x<4?{id:'clay-floorboards',built:true}:{id:'clay-loam'}});
 assert.equal(g.surface(mapId,1,1).traffic,before);
 g.unregisterMap(mapId,{preserve:false});
 assert.equal(g.save().maps[mapId],undefined);
});
test('Future environmental save extensions survive untouched without leaking into game root',()=>{
 const g=make(),v=g.save();v.futureTimeline={chapter:91,flags:['clay','aether'],nested:{temperatureScale:17}};
 const other=make();other.restore(v);
 assert.deepEqual(other.save().futureTimeline,v.futureTimeline);
 assert.deepEqual(g.save().seenEventIds,other.save().seenEventIds);
});
test('Authored roads, masonry and riverbeds mask grass, while natural soil permits it',()=>{
 const g=createProductionGroundAdapter({seed:42});
 g.registerMap('biome',{columns:5,rows:5,cellSize:1,originX:0,originZ:0,
  surfaceAt:(x,z)=> x<1?{id:'clay-gravel',type:'road'}:x<2?{id:'clay-floorboards'}:x<3?{id:'water-silt',type:'riverbed'}:x<4?{id:'clay-loam'}:{id:'clay-road',grassAllowed:true}});
 for(const x of [.5,1.5,2.5])assert.equal(g.movement('biome',x,1).vegetationAllowed,false);
 assert.equal(g.movement('biome',3.5,1).vegetationAllowed,true);
 assert.equal(g.movement('biome',4.5,1).vegetationAllowed,true); // explicit map override
});
test('Ground snapshot rejects shifted cell origins without altering any saved state',()=>{
 const a=make(),original=a.save(),corrupted=structuredClone(original);
 corrupted.maps['chapter-1/meadow'].originZ+=1;
 assert.throws(()=>a.restore(corrupted),/Incompatible/);
 assert.deepEqual(a.save(),original);
});
test('A faulty visual event listener never duplicates canonical terrain mutations',()=>{
 let calls=0;
 const g=createProductionGroundAdapter({seed:42,onEnvironmentEvent:()=>{calls++;throw Error('visual subscriber failed');}});
 g.registerMap('foo',{columns:3,rows:3,cellSize:1,originX:0,originZ:0,surfaceAt:()=>({id:'clay-earth'})});
 const event={mapId:'foo',x:1,z:1,eventId:'walk:broken-listener'};
 assert.equal(g.footstep(event).type,'ground-step');
 const value=g.surface('foo',1,1).traffic;
 assert.equal(g.footstep(event).duplicate,true);
 assert.equal(g.surface('foo',1,1).traffic,value);
 assert.equal(g.listenerFailures,1);assert.equal(calls,1);
});
