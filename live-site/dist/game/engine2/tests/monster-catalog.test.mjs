import test from 'node:test';
import assert from 'node:assert/strict';
import {MONSTER_CATALOG,MONSTER_HABITATS,MONSTER_SILHOUETTES,monsterPool,monsterById,decorateWildEnemy} from '../monster-catalog.js';
import {BESTIARY,FRONTIER_BESTIARY,ITEMS} from '../repertoire.js?v=5.6.0';
import {Battle,makeEnemy} from '../battle.js?v=5.6.0';
import {defaultHero} from '../mako.js';

test('hundreds of varieties retain all legacy IDs and truthful art-family count',()=>{
 assert.equal(MONSTER_CATALOG.length,432);assert.equal(new Set(MONSTER_CATALOG.map(s=>s.id)).size,432);
 assert.equal(MONSTER_SILHOUETTES,48);assert.equal(new Set(MONSTER_CATALOG.map(s=>s.atlas+':'+s.sprite)).size,48);
 for(const s of [...BESTIARY,...FRONTIER_BESTIARY])assert.ok(monsterById(s.id),s.id);
});
test('all habitats have multiple viable starter creatures and every variety is reachable by midgame',()=>{
 const seen=new Set();for(const key of Object.keys(MONSTER_HABITATS)){
  const early=monsterPool(key);assert.ok(early.length>=8,key+': '+early.length);assert.ok(early.every(s=>s.chapter===1));
  for(const s of monsterPool(key,{chapter:24}))seen.add(s.id);
 }
 assert.equal(seen.size,MONSTER_CATALOG.length);
 assert.deepEqual(monsterPool('river'),monsterPool('wetland'));assert.deepEqual(monsterPool('not-a-place'),monsterPool('meadow'));
});
test('adaptations change actual tactical profiles rather than only names or levels',()=>{
 const family=MONSTER_CATALOG.filter(s=>s.family==='mossback'&&s.ecotype&&s.adaptation!=='regional');
 assert.equal(family.length,6);
 const tactics=new Set(family.map(s=>JSON.stringify([s.role,s.element,s.trait,s.status,s.shape,s.profile])));
 assert.equal(tactics.size,6);assert.equal(new Set(family.map(s=>s.element)).size,6);
 const enemies=family.map(s=>decorateWildEnemy(makeEnemy('predator',1),s.id));
 assert.ok(new Set(enemies.map(e=>e.power)).size>=3);assert.ok(new Set(enemies.map(e=>e.maxHp)).size>=3);
 assert.ok(enemies.some(e=>e.armor>0)&&enemies.some(e=>!e.armor));
});
test('all records use delivered art cells and supported battle mechanics and drops',()=>{
 const drops=new Set(ITEMS.map(i=>i.id)),traits=new Set(['pressure','siphon','forge','erase','tempo','molt','chorus']);
 for(const s of MONSTER_CATALOG){
  assert.ok(['bestiary','bestiary2','bestiary3'].includes(s.atlas),s.id);assert.ok(s.sprite>=0&&s.sprite<(s.atlas==='bestiary3'?24:12));
  assert.ok(['predator','guard','mender','scout'].includes(s.role));assert.ok(['burst','line'].includes(s.shape));
  assert.ok(['burn','slow','shock','wet','exposed'].includes(s.status));assert.ok(!s.trait||traits.has(s.trait));assert.ok(drops.has(s.drop));
  assert.ok(Object.values(s.profile).every(v=>Number.isFinite(v)&&v>=0));
 }
});
test('decoration preserves actor identity and supports a real battle turn for every variety',()=>{
 for(const s of MONSTER_CATALOG){
  const base=makeEnemy('predator',1,3);base.x=4;base.y=2;const original=structuredClone(base),e=decorateWildEnemy(base,s.id);
  assert.deepEqual(base,original);assert.equal(e.id,'e3');assert.equal(e.x,4);assert.equal(e.y,2);assert.equal(e.hp,e.maxHp);
  const h=defaultHero(0);h.x=1;h.y=2;const b=new Battle({heroes:[h],enemies:[e],chapter:1});b.planEnemy(e);
  assert.ok(e.intent&&e.intent.label);assert.ok(Number.isFinite(e.intent.power));b.advance(.1);
 }
 const boss=makeEnemy('boss',1,0,true);assert.equal(decorateWildEnemy(boss,MONSTER_CATALOG[0].id),boss);
 const base=makeEnemy('predator',1);assert.equal(decorateWildEnemy(base,'missing'),base);
});
