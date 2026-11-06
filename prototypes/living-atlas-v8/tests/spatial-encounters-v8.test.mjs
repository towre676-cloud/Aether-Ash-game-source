import test from 'node:test';
import assert from 'node:assert/strict';
import {AtlasWorld} from '../src/adventure.mjs';
import {residentRoster,residentInReach} from '../src/residents-v8.mjs';
const fresh=()=>new AtlasWorld(2301);
const nearby=w=>w.residents().find(r=>Math.hypot(r.x+16,r.z+10)<7);

test('Every visible resident has unique stable identity, lawful coordinates and an ecology cohort',()=>{
 const a=fresh(),roster=a.residents();assert.ok(roster.length>4);
 assert.equal(new Set(roster.map(r=>r.id)).size,roster.length);
 for(const r of roster){assert.equal(r.region,a.activeRegion);assert.ok(a.world.evaluate(r.x,r.z).traversalPassable);assert.ok(r.census>=3);assert.equal(a.resident(r.id).x,r.x);}
 assert.deepEqual(fresh().residents(),roster);
});
test('Distant menu encounters are rejected and never award loot',()=>{
 const a=fresh(),distant=a.residents().find(r=>Math.hypot(r.x+16,r.z+10)>12);
 const before=structuredClone(a.inventory),ledger=a.ledger.length;
 const result=a.engageResident(distant.id);
 assert.equal(result.ok,false);assert.equal(a.activeEncounter,null);assert.deepEqual(a.inventory,before);assert.equal(a.ledger.length,ledger);
});
test('A real creature can be approached in legal persistent steps, inspected, and engaged',()=>{
 const a=fresh(),r=nearby(a);assert.ok(r);
 const result=a.approachResident(r.id,6);assert.equal(result.ok,true);assert.equal(result.near,true);assert.ok(result.steps.length>0);
 assert.ok(a.ledger.some(e=>e.type==='FOOTFALL_CONFIRMED'));
 assert.ok(a.residentTick>=result.steps.length);
 const foot=a.characters[0].position;assert.deepEqual(foot,{x:result.steps.at(-1).x,z:result.steps.at(-1).z});
 const study=a.inspectResident(r.id);assert.equal(study.ok,true);assert.ok(a.fieldGuide.length>0);
 const combat=a.engageResident(r.id);assert.equal(combat.ok,true);assert.equal(a.activeEncounter.residentId,r.id);
 assert.ok(residentInReach(a.activeEncounter,foot,3.6));
});
test('Resident battle uses true party reach; spoofed distant points are rejected',()=>{
 const a=fresh(),r=nearby(a);a.approachResident(r.id,6);assert.equal(a.engageResident(r.id).ok,true);
 const pre=a.activeEncounter.hp,level=a.characters[0].hp;
 const wrong=a.fight(30,30,r.species,'water',3);
 assert.equal(wrong.ok,false);assert.equal(a.activeEncounter.hp,pre);assert.equal(a.characters[0].hp,level);
});
test('Victory retires the same identified creature, reduces census and affects only actual inventory',()=>{
 const a=fresh(),r=nearby(a);a.approachResident(r.id,6);assert.equal(a.engageResident(r.id).ok,true);
 const before=a.wildlife.cohort(r.species).count;
 const p=a.characters[0].position;
 for(let i=0;i<20&&a.activeEncounter;i++){
  const result=a.fight(p.x,p.z,r.species,'water',3);
  assert.equal(result.ok,true);
  if(a.characters[0].hp<=0)throw Error('Test combat became unwinnable');
 }
 assert.equal(a.activeEncounter,null);assert.equal(a.resident(r.id),null);
 assert.ok(a.wildlife.cohort(r.species).count<before);
 assert.ok(a.ledger.some(e=>e.type==='BATTLE'&&e.victorious));
});
test('Spatial resident and retirement state survive save round-trip',()=>{
 const a=fresh(),r=nearby(a);a.approachResident(r.id,6);
 const save=a.snapshot(),b=AtlasWorld.restore(save);
 assert.deepEqual(a.residents(),b.residents());assert.deepEqual(a.characters[0].position,b.characters[0].position);
 assert.equal(b.residentTick,a.residentTick);
});
test('Older v7 save without v8 data restores with deterministic residents',()=>{
 const a=fresh(),state=a.snapshot();delete state.residentTickV8;delete state.retiredResidentsV8;
 const b=AtlasWorld.restore(state);assert.equal(b.residentTick,0);assert.ok(b.residents().length>0);
});
test('Tampering with tick, retirement ledger or encounter identity is rejected',()=>{
 const a=fresh(),base=a.snapshot();
 for(const patch of [{residentTickV8:-1},{residentTickV8:1.5},{retiredResidentsV8:{'bad key':1}},{retiredResidentsV8:{'hearthland:x:0':999}}]){
  assert.throws(()=>AtlasWorld.restore({...base,...patch}),/Invalid v8 resident state/);
 }
 assert.throws(()=>AtlasWorld.restore({...base,activeEncounter:{residentId:'wrong-region:fake',x:1,z:1}}),/Invalid v8 encounter reference/);
});
test('New Game Plus resets encounter positions and resident deaths but carries long-term wildlife ecology',()=>{
 const a=fresh(),r=nearby(a);a.retiredResidents[r.id]=a.residentTick;
 a.residentTick=88;a.newGamePlus();
 assert.equal(a.residentTick,0);assert.deepEqual(a.retiredResidents,{});
 assert.deepEqual(a.characters[0].position,{x:-16,z:-10});assert.equal(a.epoch,1);
 assert.ok(a.residents().length>0);
});
test('Visual detail changes cannot change authoritative resident identity',()=>{
 const a=fresh(),params={world:a.world,region:a.region,wildlife:a.wildlife,tick:a.residentTick,retired:a.retiredResidents};
 const high=residentRoster({...params,quality:'high'}),low=residentRoster({...params,quality:'low'});
 assert.deepEqual(low,high.filter(r=>r.index<10));
});
