import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatState, useAction, advanceCombat, drainCombatEvents, cooldownRemaining } from '../live-site/dist/game/action-rpg-combat-core.mjs';
test('cooldown, mana, range and enemy defeat', () => {
  const s=createCombatState({player:{x:0,y:0,hp:100,mana:100},enemies:[{id:'a',x:1,y:0,hp:10,xp:17}],seed:5});
  assert.deepEqual(useAction(s,'strike','a'),{ok:true});
  assert.equal(s.enemies[0].hp,0);
  assert.equal(s.defeated.length,1);
  assert.equal(drainCombatEvents(s).find(e=>e.type==='defeat').xp,17);
  assert.equal(useAction(s,'strike','a').reason,'cooldown');
  advanceCombat(s,0.25);advanceCombat(s,0.05);
  assert.equal(cooldownRemaining(s,'strike'),0);
  assert.equal(useAction(s,'ember','missing').reason,'range-or-target');
});
test('enemy pursues, telegraphs, and dodge prevents damage', () => {
  const s=createCombatState({player:{x:0,y:0,hp:100,mana:100},enemies:[{id:'b',x:2,y:0,hp:100,speed:4,attackWindup:0.2,damage:20}]});
  advanceCombat(s,0.25);
  assert.ok(s.enemies[0].x < 2);
  advanceCombat(s,0.25);
  assert.equal(s.enemies[0].state,'windup');
  assert.equal(useAction(s,'dodge').ok,true);
  advanceCombat(s,0.2);
  assert.equal(s.player.hp,100);
});
test('seeded loot is reproducible and invalid dt rejected', () => {
  const make=()=>createCombatState({player:{x:0,y:0,hp:100,mana:100},enemies:[{id:'c',x:1,y:0,hp:1}],seed:42});
  const a=make(),b=make();
  useAction(a,'strike','c');useAction(b,'strike','c');
  assert.deepEqual(drainCombatEvents(a),drainCombatEvents(b));
  assert.throws(()=>advanceCombat(a,1),RangeError);
});

test('guard halves telegraphed damage, and cooldown prevents repeat guarding', () => {
  const s=createCombatState({player:{x:0,y:0,hp:100,mana:100},enemies:[{id:'guard-test',x:1,y:0,hp:100,attackWindup:0.2,damage:15}]});
  advanceCombat(s,0.1);
  assert.equal(s.enemies[0].state,'windup');
  assert.equal(useAction(s,'guard').ok,true);
  assert.equal(useAction(s,'guard').reason,'cooldown');
  advanceCombat(s,0.2);
  assert.equal(s.player.hp,92);
  assert.equal(s.player.mana,90);
});
test('moving out of range during windup avoids damage', () => {
  const s=createCombatState({player:{x:0,y:0,hp:100,mana:100},enemies:[{id:'kite',x:1,y:0,hp:100,attackWindup:0.2,damage:20}]});
  advanceCombat(s,0.1);
  s.player.x=8;
  advanceCombat(s,0.2);
  assert.equal(s.player.hp,100);
});
