import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy} from '../battle.js';
import {defaultHero,compileTechnique} from '../mako.js';
import {applySupply} from '../repertoire.js';
import {fieldCommand} from '../battlefield.js';
import {anatomyActions,validAnatomy} from '../functional-anatomy.js';
import {patternHits,patternGeometry} from '../boss-patterns.js';
import {combatAdvice} from '../combat-advice.js';
import {enemyBattleReadout} from '../battle-flow.js';
import {livingBattleActions} from '../living-world-ui.js';

const floor=Array.from({length:25},(_,y)=>Array.from({length:25},(_,x)=>[x,y])).flat();
function setup(chapter,context={}){
 const heroes=[0,1,2].map(id=>Object.assign(defaultHero(id,20),{x:8.5+id*.5,y:10.5}));
 const enemy=Object.assign(makeEnemy('boss',chapter,0,true),{x:10.5,y:10.5,name:'Guardian',hp:20000,maxHp:20000});
 const battle=new Battle({chapter,heroes,enemies:[enemy],context:{version:1,tags:[],walkable:floor,...context}});
 return {battle,heroes,enemy};
}
const ready=h=>{h.atb=1;h.mp=h.maxMp;h.strain=0;};
function breakWith(b,e,h){ready(h);assert.equal(b.command(h.id,'tech',e.id,compileTechnique('earth','break',{character:h.id})),true);}
function release(b,e){const intent=e.intent;assert.ok(intent);e.intent=null;b.executeIntent(e,intent);return intent;}

test('ordinary enemies and the first guardian retain the complete paid Break response',()=>{
 for(const boss of [false,true]){
  const {battle:b,heroes:[h],enemy:e}=setup(1);e.boss=boss;e.intent={kind:'strike',shape:'line',left:2,total:2,power:20};
  const armor=e.armor;breakWith(b,e,h);assert.equal(e.intent,null);assert.ok(e.armor<armor);assert.equal(e.status.stagger,2.2);assert.equal(e.status.exposed,5);assert.equal(h.atb,0);
 }
});

test('Ash Herald has a real second wave; Break silences that wave without cancelling the toll',()=>{
 const {battle:b,heroes:[h],enemy:e}=setup(4);b.planEnemy(e);const toll=e.intent;
 assert.equal(toll.returnWave.bellReturn,true);assert.match(enemyBattleReadout(b,e).tell,/return ring/);
 breakWith(b,e,h);assert.equal(e.intent,toll);assert.equal(toll.returnWave,undefined);assert.match(toll.counterplay,/remaining toll/);
 const left=toll.left;breakWith(b,e,h);assert.equal(e.intent,toll);assert.equal(toll.left,left,'repeated Break cannot indefinitely extend or cancel the toll');
 release(b,e);assert.equal(e.intent,null);
 const next=setup(4);next.battle.planEnemy(next.enemy);release(next.battle,next.enemy);assert.equal(next.enemy.intent.bellReturn,true);assert.match(enemyBattleReadout(next.battle,next.enemy).tell,/Answering bell/);
 breakWith(next.battle,next.enemy,next.heroes[0]);assert.equal(next.enemy.intent,null,'a return already ringing can itself be interrupted');
});

test('the bell return rewards a deliberate Guard with real prevention and an opening',()=>{
 const {battle:b,heroes:[h],enemy:e}=setup(4);b.planEnemy(e);release(b,e);
 h.x=e.x-2;h.y=e.y;ready(h);b.command(h.id,'guard');const hp=h.hp,armor=e.armor,enemyHP=e.hp;
 release(b,e);assert.equal(h.hp,hp);assert.ok(e.armor<armor);assert.ok(e.hp<enemyHP);assert.ok(e.status.stagger>=3.2);assert.ok(e.status.exposed>=3.2);
 assert.ok(b.events.some(event=>event.response==='guard-return'));
});

test('bell repair benefits are bounded and old preparation fields retain their original effects',()=>{
 const legacy=setup(4,{bellPreparation:'shelter'});assert.ok(legacy.heroes.every(h=>h.status.shield===24));
 const plain=setup(4),oldLure=setup(4,{bellPreparation:'lure'});plain.battle.planEnemy(plain.enemy);oldLure.battle.planEnemy(oldLure.enemy);
 assert.ok(Math.abs(oldLure.enemy.intent.left-plain.enemy.intent.left-1.4)<1e-9);
 const repaired=setup(4,{bellPreparation:'shelter',bellCircuit:{version:1,mode:'shelter',repaired:true}});
 repaired.battle.planEnemy(repaired.enemy);release(repaired.battle,repaired.enemy);const h=repaired.heroes[0];h.x=repaired.enemy.x-2;h.y=repaired.enemy.y;h.status={};const before=h.hp;
 release(repaired.battle,repaired.enemy);assert.equal(h.hp,before);assert.equal(repaired.enemy.guardianRuleState.shelterReturnSpent,true);
 repaired.battle.planEnemy(repaired.enemy);release(repaired.battle,repaired.enemy);h.status={};const later=h.hp;release(repaired.battle,repaired.enemy);assert.ok(h.hp<later,'the repaired shelter does not catch every future return');
 const lure=setup(4,{bellPreparation:'lure',bellCircuit:{version:1,mode:'lure',repaired:true}});lure.battle.planEnemy(lure.enemy);release(lure.battle,lure.enemy);
 assert.equal(lure.enemy.intent.left,3.6);assert.equal(lure.enemy.status.exposed,3.6);
});

test('supplies, ground reactions and a carried hook cannot bypass the bell response',()=>{
 for(const source of ['shatterCharge','breakerChime','ground','hook']){
  const {battle:b,heroes:[h],enemy:e}=setup(4,{fieldProps:[{type:'hook',x:8.5,y:10.5}]});b.planEnemy(e);const toll=e.intent;ready(h);
  if(source==='ground'){e.status.shock=3;b.damage(h,e,10,{core:'earth'});}
  else if(source==='hook'){assert.equal(fieldCommand(b,h,e,{action:'take',propId:b.field.props[0].id}),true);ready(h);e.status.exposed=5;b.command(h.id,'attack',e.id);}
  else assert.equal(applySupply(b,{[source]:1},source,h,e),true);
  assert.equal(e.intent,toll,source);assert.equal(e.intent.returnWave,undefined,source);
 }
});

test('Crown conduits retain other moves, let Break cut one end, and reward actual crew separation',()=>{
 const {battle:b,heroes,enemy:e}=setup(8);b.planEnemy(e);assert.equal(e.intent.guardianRule,undefined,'ordinary Crown movements keep their ordinary response');
 e.intent=null;e.turn=2;b.planEnemy(e);assert.equal(e.intent.points.length,2);
 const i=e.intent,first=heroes.find(h=>h.id===i.conduitCrew[0]);first.magic=10;breakWith(b,e,first);assert.equal(e.intent,i);assert.equal(i.points.length,1);
 breakWith(b,e,first);assert.equal(i.points.length,1);
 const [a,z]=i.conduitCrew.map(id=>heroes.find(h=>h.id===id));a.x=3.5;z.x=9.5;a.y=z.y=10.5;const hp=heroes.map(h=>h.hp),armor=e.armor;
 release(b,e);assert.deepEqual(heroes.map(h=>h.hp),hp);assert.ok(e.armor<armor);assert.ok(e.status.stagger>=3);assert.ok(b.events.some(event=>event.response==='ground-conduits'));
});

test('a visible paid Spread command grounds the named Crown pair without manual crew movement',()=>{
 const {battle:b,heroes,enemy:e}=setup(8);e.turn=2;b.planEnemy(e);const [h,partner]=e.intent.conduitCrew.map(id=>heroes.find(a=>a.id===id));ready(h);
 const action=livingBattleActions(b,h,e).find(a=>a.action==='separate');assert.ok(action,'Tactics exposes Spread before any walking');assert.equal(action.system,'position');assert.equal(action.enabled,true);assert.match(e.intent.counterplay,/Tactics → Spread/);
 const hp=heroes.map(a=>a.hp),positions=heroes.filter(a=>a!==h).map(a=>[a.id,a.x,a.y]),armor=e.armor;
 assert.equal(b.command(h.id,action.system,e.id,action),true);assert.equal(h.atb,0);assert.deepEqual([h.x,h.y],[action.preview.to.x,action.preview.to.y]);assert.deepEqual(heroes.filter(a=>a!==h).map(a=>[a.id,a.x,a.y]),positions);assert.ok(Math.hypot(h.x-partner.x,h.y-partner.y)>=4);
 release(b,e);assert.deepEqual(heroes.map(a=>a.hp),hp);assert.ok(e.armor<armor);assert.ok(e.status.stagger>=3);assert.ok(b.events.some(event=>event.response==='ground-conduits'));
});

test('the Giant exposes real targetable resonators, and broken parts remove later hit geometry',()=>{
 const {battle:b,heroes,enemy:e}=setup(16),h=heroes[0];b.planEnemy(e);ready(h);
 assert.equal(b.anatomy.actors[0].profile,'mountain');assert.ok(anatomyActions(b,h,e).every(a=>!a.enabled&&/Break/.test(a.reason)));
 breakWith(b,e,h);assert.ok(e.intent,'opening a resonator does not cancel its wave');assert.equal(e.status.resonatorOpening,6);
 const first=b.anatomy.actors[0].parts[0];heroes[1].power=300;ready(heroes[1]);assert.equal(b.command(heroes[1].id,'anatomy',e.id,{action:'target-part',partId:first.id}),true);assert.equal(first.broken,true);assert.equal(heroes[1].atb,0);
 e.intent=null;e.turn=1;b.planEnemy(e);assert.equal(e.intent.shape,'cross');assert.equal(patternHits(e.intent,{x:e.x+3,y:e.y}),false,'horizontal arm was removed');assert.equal(patternHits(e.intent,{x:e.x,y:e.y+3}),true,'remaining arm is still dangerous');
 assert.equal(patternGeometry(e.intent).length,1);assert.ok(validAnatomy(b.anatomy,b.enemies,b.field));
 const second=b.anatomy.actors[0].parts[1];ready(heroes[1]);b.command(heroes[1].id,'anatomy',e.id,{action:'target-part',partId:second.id});assert.equal(second.broken,true);assert.equal(patternHits(e.intent,{x:e.x,y:e.y+3}),false);assert.equal(patternHits(e.intent,{x:e.x+.5,y:e.y}),true,'the body pulse remains');
});

test('the Choir needs two different voices and a genuinely different kind of hit',()=>{
 const {battle:b,heroes,enemy:e}=setup(24);b.planEnemy(e);breakWith(b,e,heroes[0]);const i=e.intent;
 assert.deepEqual(i.answer,{actorId:0,core:'earth'});const left=i.left;
 b.damage(heroes[0],e,10,{core:'flame'});assert.equal(e.intent,i,'the same actor cannot answer itself');
 b.damage(heroes[1],e,10,{core:'earth'});assert.equal(e.intent,i,'a matching element does not finish the answer');
 breakWith(b,e,heroes[0]);assert.equal(i.left,left,'repeated first voices do not extend the window');
 ready(heroes[1]);b.command(heroes[1].id,'attack',e.id);assert.equal(e.intent,null);assert.equal(e.status.stagger,3);assert.equal(e.status.exposed,3);
 assert.ok(b.events.some(event=>event.response==='complete-answer'));
});

test('milestone advice describes the actual response instead of promising universal cancellation',()=>{
 for(const chapter of [4,16,24]){
  const {battle:b,enemy:e}=setup(chapter);b.planEnemy(e);const advice=combatAdvice(b,e);
  assert.ok(advice.text.includes(e.intent.interruptHint));assert.doesNotMatch(advice.text,/can interrupt this charge\./);
 }
});

test('pending returns, split conduits, broken resonators and answers survive snapshots; legacy snapshots remain valid',()=>{
 for(const chapter of [4,8,16,24]){
  const {battle:b,heroes,enemy:e}=setup(chapter);if(chapter===8)e.turn=2;b.planEnemy(e);
  if(chapter!==4)breakWith(b,e,heroes[0]);else release(b,e);
  const snapshot=b.snapshot(),copy=setup(1).battle;copy.restore(snapshot);assert.equal(copy.chapter,chapter);assert.deepEqual(copy.snapshot(),snapshot);
 }
 const legacy=setup(1).battle.snapshot();for(const h of legacy.heroes){delete h.personalState;delete h.guardianUses;}assert.doesNotThrow(()=>setup(1).battle.restore(legacy));
 const bad=setup(4);bad.battle.planEnemy(bad.enemy);const forged=bad.battle.snapshot();forged.enemies[0].intent.returnWave.left=Infinity;assert.throws(()=>setup(4).battle.restore(forged),/saved creature/);
});

test('earned origin support is local, bounded, serialized and cannot stack onto the chapel',()=>{
 const support=mode=>({originSupport:{version:1,mode,originId:'test-origin',region:6}});
 const care=setup(6,support('care'));assert.ok(care.heroes.every(h=>h.status.shield===12));
 const plain=setup(6),releaseRoute=setup(6,support('release'));plain.battle.planEnemy(plain.enemy);releaseRoute.battle.planEnemy(releaseRoute.enemy);
 assert.ok(Math.abs(releaseRoute.enemy.intent.left-plain.enemy.intent.left-.6)<1e-9);assert.equal(releaseRoute.battle.context.originSupport.spent,true);
 const saved=releaseRoute.battle.snapshot(),copy=setup(6);copy.battle.restore(saved);copy.enemy=copy.battle.enemies[0];copy.enemy.intent=null;copy.battle.planEnemy(copy.enemy);assert.ok(!copy.enemy.intent.label.includes('opened route'));
 for(const context of [support('care'),{...support('care'),friendly:true},{...support('care'),tutorial:true}]){const chapter=context.friendly||context.tutorial?6:5;assert.ok(setup(chapter,context).heroes.every(h=>!h.status.shield));}
 const chapel=setup(4,{originSupport:{version:1,mode:'care',region:4}});assert.ok(chapel.heroes.every(h=>!h.status.shield));
});
