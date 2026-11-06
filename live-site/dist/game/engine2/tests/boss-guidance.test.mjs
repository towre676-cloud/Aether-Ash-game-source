import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy} from '../battle.js?v=5.6.0';
import {defaultHero} from '../mako.js';
import {bossIntent,bossBrief,bossPresentation} from '../boss-patterns.js';
import {combatAdvice,createCombatAnnouncer} from '../combat-advice.js';
import {enemyBattleReadout} from '../battle-flow.js';

function setup(chapter=1){
 const h=defaultHero(0,10);Object.assign(h,{x:3,y:3,learned:0,loadout:[{core:'earth',support:'focus'}]});
 const e=makeEnemy('boss',chapter,0,true);Object.assign(e,{name:bossBrief(chapter).guardian,x:8,y:8});
 const b=new Battle({heroes:[h],enemies:[e],chapter});e.shell=null;h.atb=1;return {h,e,b};
}
test('every boss movement exposes its actual phase, named tell and geometric counterplay in the existing readout',()=>{
 for(let chapter=1;chapter<=24;chapter++)for(const ratio of [1,.6,.2]){
  const {h,e,b}=setup(chapter);e.hp=e.maxHp*ratio;e.intent=bossIntent(e,chapter,h,{heroes:[h]});
  const readout=enemyBattleReadout(b,e),tip=combatAdvice(b,e),p=bossPresentation(e,chapter);
  assert.match(readout.phase,new RegExp('Phase '+(p.phaseIndex+1)));assert.ok(readout.phase.includes(p.phaseName));assert.ok(readout.tell.includes(bossBrief(chapter).moves[e.intent.bossMove]));assert.match(readout.tell,/\d\.\ds$/);
  assert.ok(tip.text.includes(e.intent.counterplay));assert.equal(tip.bossPhase,e.intent.bossPhase);assert.doesNotMatch(tip.text,/Rupture|can interrupt|Break|Link/);
 }
});
test('a committed tell keeps its displayed phase after damage until the next movement is planned',()=>{
 const {h,e,b}=setup();e.intent=bossIntent(e,1,h);e.hp=e.maxHp*.2;
 assert.match(enemyBattleReadout(b,e).phase,/Phase 1/);assert.equal(combatAdvice(b,e).bossPhase,0);
 e.intent=bossIntent(e,1,h);assert.match(enemyBattleReadout(b,e).phase,/Phase 3/);assert.equal(combatAdvice(b,e).bossPhase,2);
});
test('boss interrupt advice requires an equipped affordable technique or a finite owned supply',()=>{
 const {h,e,b}=setup(2);e.intent=bossIntent(e,2,h);
 assert.doesNotMatch(combatAdvice(b,e).text,/can interrupt/);h.loadout=[{core:'earth',support:'break'}];assert.match(combatAdvice(b,e).text,/Fault Rupture can interrupt/);
 h.mp=0;assert.doesNotMatch(combatAdvice(b,e).text,/Rupture|can interrupt/);b.inventory.shatterCharge=1;assert.match(combatAdvice(b,e).text,/Shatter charge can interrupt/);b.inventory.shatterCharge=0;assert.doesNotMatch(combatAdvice(b,e).text,/Shatter charge|can interrupt/);
});
test('actual recovery has a bounded counterattack window and a new charge always takes priority',()=>{
 const {h,e,b}=setup();e.armor=0;e.status={stagger:1.8,exposed:1.8};
 assert.match(enemyBattleReadout(b,e).tell,/Recovery.*1.8s/);assert.match(combatAdvice(b,e).text,/Recovery · 1.8s/);
 e.intent=bossIntent(e,1,h);const tip=combatAdvice(b,e);assert.ok(tip.text.includes(e.intent.counterplay));assert.doesNotMatch(tip.text,/Recovery/);assert.ok(enemyBattleReadout(b,e).tell.includes(bossBrief(1).moves[e.intent.bossMove]));
 e.intent=null;e.status={};assert.doesNotMatch(enemyBattleReadout(b,e).tell,/Recovery/);
});
test('phase and recovery lessons announce once without repeating every changing countdown',()=>{
 const {h,e,b}=setup(),announcer=createCombatAnnouncer();e.intent=bossIntent(e,1,h);
 assert.ok(announcer.next(b,combatAdvice(b,e)));e.intent.left-=.7;assert.equal(announcer.next(b,combatAdvice(b,e)),null);
 e.intent=null;e.status={stagger:1.7,exposed:1.7};assert.match(announcer.next(b,combatAdvice(b,e)),/Recovery/);e.status.stagger=.5;e.status.exposed=.5;assert.equal(announcer.next(b,combatAdvice(b,e)),null);
 e.status={};e.hp=e.maxHp*.2;e.intent=bossIntent(e,1,h);assert.ok(announcer.next(b,combatAdvice(b,e)));
});
test('ordinary armored enemy cards never promise an unavailable Break technique',()=>{
 const {b}=setup(),e=makeEnemy('guard',1);Object.assign(e,{x:2,y:2});b.enemies=[e];
 const readout=enemyBattleReadout(b,e);assert.equal(readout.phase,'');assert.match(readout.tell,/Armored/);assert.doesNotMatch(readout.tell,/Break/);
});
