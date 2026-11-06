import test from 'node:test';import assert from 'node:assert/strict';
import {createAshAetherArmoryBridge} from '../src/host-bridge.mjs';
import {Armory,rollItem} from '../src/armory.mjs';
const base={hasCommittedLoot:()=>false,commitLootOnce:()=>true};
test('host combat bridge refuses to use unsynced prototype gear',()=>{
 const b=createAshAetherArmoryBridge({host:base,armory:new Armory({seedStarter:false})});
 assert.deepEqual(b.readCombatContributions(),{ready:false,reason:'missing-canonical-equipment'});
});
test('host bridge rejects untranslated or unknown equipment slots',()=>{
 const b=createAshAetherArmoryBridge({host:{...base,getCanonicalEquipmentState:()=>({gear:{mainhand:'broken'}})}});
 assert.equal(b.readCombatContributions().reason,'untranslated-canonical-item');
 const c=createAshAetherArmoryBridge({host:{...base,getCanonicalEquipmentState:()=>({gear:{wings:null}})}});
 assert.equal(c.readCombatContributions().reason,'unknown-host-equipment-slot');
});
test('host bridge computes canonical gear and restores the offline prototype untouched',()=>{
 const a=new Armory({seedStarter:false,level:55});const item=rollItem({seed:'bridge',eventId:'canonical',level:34,region:'ash',forceSlot:'mainhand'});
 const baseline=a.snapshot(),host={...base,getCanonicalEquipmentState:()=>({gear:{mainhand:item}})};
 const b=createAshAetherArmoryBridge({host,armory:a});
 const canonical=b.readCombatContributions({attackElement:'ember',ground:{element:'ember',shielding:.2,resonance:.6},defender:{naturalShielding:.4}});
 const empty=a.combatModifiers({attackElement:'ember',terrainElement:'ember',terrainShielding:.2,terrainResonance:.6,enemyShielding:.4});
 assert.equal(canonical.ready,true);assert.ok(canonical.stats.attack>empty.stats.attack||canonical.stats.ember>empty.stats.ember);
 assert.deepEqual(a.snapshot(),baseline);
});
