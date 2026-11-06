import test from 'node:test';
import assert from 'node:assert/strict';
import {Armory,rollItem,IMPRINT_STATS,HARMONIC_CHORDS} from '../src/armory.mjs';

const fresh=()=>new Armory({seed:'v3-test',seedStarter:false,level:45});
const base=(id,slot,region)=>rollItem({seed:'v3-test',eventId:id,forceSlot:slot,forceRarity:'rare',level:25,region});

test('all engraving stats are whitelisted with no dupes',()=>{
 assert.equal(IMPRINT_STATS.length,new Set(IMPRINT_STATS).size);
 assert.equal(HARMONIC_CHORDS.length,new Set(HARMONIC_CHORDS.map(x=>x.id)).size);
 assert.ok(HARMONIC_CHORDS.every(x=>x.elements.length===2 && x.elements.every(e=>['ember','verdant','tide','echo','stone','aether'].includes(e))));
});
test('engraving debits canonical resources once and adds a real stat',()=>{
 const a=fresh(),item=base('focus','mainhand','ash');a.grantItem(item);a.state.resources.scrap=100;a.state.resources.essence=100;
 const old=a.effectiveItemStats(item).precision||0, before=a.snapshot(),r=a.imprintItem(item.id,'precision');
 assert.equal(r.ok,true);assert.equal(a.effectiveItemStats(item).precision,old+r.value);
 assert.equal(a.state.resources.scrap,before.resources.scrap-r.cost.scrap);
 assert.equal(a.state.resources.essence,before.resources.essence-r.cost.essence);
 assert.equal(item.imprint.rolls,1);assert.equal(item.id,before.placements[0].id);
});
test('focused retuning replaces its last imprint and cannot inflate item power forever',()=>{
 const a=fresh(),item=base('focus2','head','water');a.grantItem(item);a.state.resources.scrap=10000;a.state.resources.essence=10000;a.state.resources.starshard=30;
 const baseline=item.itemPower;const r=a.imprintItem(item.id,'ward');assert.ok(r.ok);
 for(let i=0;i<11;i++)assert.ok(a.imprintItem(item.id,i%2?'focus':'armor').ok);
 assert.equal(item.imprint.rolls,12);assert.ok(item.itemPower<=baseline+Math.ceil(item.imprint.value/3));
 assert.deepEqual(a.imprintItem(item.id,'ward'),{ok:false,reason:'maxed'});
});
test('invalid engraving never costs resources or mutates item',()=>{
 const a=fresh(),item=base('bad-stat','ring','orchard');a.grantItem(item);const before=a.snapshot();
 assert.equal(a.imprintItem(item.id,'__proto__').reason,'stat');assert.deepEqual(a.snapshot(),before);
});
test('no resources means no engraving at all',()=>{
 const a=fresh(),item=base('cost','head','water');a.grantItem(item);a.state.resources.scrap=0;
 const before=a.snapshot();assert.equal(a.imprintItem(item.id,'ward').reason,'resources');assert.deepEqual(a.snapshot(),before);
});
test('elemental chord requires two items from each element',()=>{
 const a=fresh();a.state.gear.head=base('e1','head','ash');a.state.gear.chest=base('e2','chest','ash');
 a.state.gear.hands=base('v1','hands','orchard');
 assert.equal(a.gearResonance().active.some(x=>x.id==='kindled-orchard'),false);
 a.state.gear.feet=base('v2','feet','glade');
 const c=a.gearResonance();assert.ok(c.active.some(x=>x.id==='kindled-orchard'));assert.equal(c.counts.ember,2);assert.equal(c.counts.verdant,2);
});
test('organic Kindled Orchard chord actually affects offense only on organic ground',()=>{
 const a=fresh();a.state.gear.head=base('e1','head','ash');a.state.gear.chest=base('e2','chest','ash');a.state.gear.hands=base('v1','hands','orchard');a.state.gear.feet=base('v2','feet','glade');
 const opts={attackElement:'ember',terrainElement:'stone',terrainResonance:.35,enemyShielding:.4};
 const flat=a.combatModifiers({...opts,organicTerrain:false}),living=a.combatModifiers({...opts,organicTerrain:true});
 assert.ok(living.damageFactor>flat.damageFactor*1.055 && living.damageFactor<flat.damageFactor*1.065);
 assert.ok(living.harmonies.find(x=>x.id==='kindled-orchard').engaged);
 assert.equal(flat.harmonies.find(x=>x.id==='kindled-orchard').engaged,false);
});
test('overtone activates only with matching attack and ground and is bounded',()=>{
 const a=fresh();a.state.gear.head=base('e1','head','ash');a.state.gear.chest=base('e2','chest','ash');a.state.gear.hands=base('e3','hands','ash');
 assert.ok(a.gearResonance().active.some(x=>x.id==='overtone-ember'));
 const opts={attackElement:'ember',terrainElement:'ember',enemyShielding:0,terrainResonance:.5};
 assert.ok(a.combatModifiers(opts).harmonies.find(x=>x.id==='overtone-ember').engaged);
 assert.equal(a.combatModifiers({...opts,terrainElement:'water'}).harmonies.find(x=>x.id==='overtone-ember').engaged,false);
});
test('harmonic piercing reduces shield and remains capped',()=>{
 const a=fresh();a.state.gear.head=base('s1','head','clay');a.state.gear.chest=base('s2','chest','clay');a.state.gear.hands=base('a1','hands','aether');a.state.gear.feet=base('a2','feet','aether');
 const low=a.combatModifiers({terrainResonance:.2,enemyShielding:.75}),high=a.combatModifiers({terrainResonance:.65,enemyShielding:.75});
 assert.ok(high.harmonyPierce>.06);assert.ok(high.shieldBroken>low.shieldBroken);
 assert.ok(high.damageFactor>low.damageFactor);assert.ok(high.protection>=0&&high.protection<=.92);
});
test('new bonuses survive saves, preserve old schema, and reject unsafe imports',()=>{
 const a=fresh(),item=base('saveload','mainhand','ash');a.grantItem(item);a.state.resources.scrap=300;a.state.resources.essence=300;a.imprintItem(item.id,'attack');
 const snapshot=a.snapshot(),b=fresh();assert.equal(b.load(snapshot),true);assert.deepEqual(b.get(item.id).item.imprint,item.imprint);
 snapshot.placements[0].item.imprint.stat='inject';const before=b.snapshot();assert.throws(()=>b.load(snapshot),/Invalid attunement imprint/);assert.deepEqual(b.snapshot(),before);
});
test('v2 snapshots without imprint fields migrate without modification',()=>{
 const a=fresh();a.grantItem(base('legacy','head','clay'));const snap=a.snapshot();assert.equal(fresh().load(snap),true);
});
test('equipment harmonies are derived, not persisted, so render settings cannot alter them',()=>{
 const a=fresh();a.state.gear.head=base('e1','head','ash');a.state.gear.chest=base('e2','chest','ash');a.state.gear.hands=base('v1','hands','orchard');a.state.gear.feet=base('v2','feet','glade');
 const before=a.gearResonance();a.state.settings={renderer:'low',reducedMotion:true};assert.deepEqual(a.gearResonance(),before);
});
