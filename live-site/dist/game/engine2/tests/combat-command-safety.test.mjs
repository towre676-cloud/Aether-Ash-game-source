import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy} from '../battle.js?v=5.6.0';
import {defaultHero,compileTechnique} from '../mako.js';
import {combatAdvice} from '../combat-advice.js?v=5.6.0';
import {shellFor} from '../environment-shells.js';

function setup(){
 const heroes=[defaultHero(0,4),defaultHero(1,4)];heroes.forEach((h,i)=>{h.x=i;h.y=0;});
 const e=makeEnemy('predator',4);e.x=3;e.y=0;e.hp=e.maxHp=2000;
 const b=new Battle({heroes,enemies:[e]});heroes.forEach(h=>h.atb=1);return b;
}
test('wrong-side and stale technique targets never pay MP, HP, strain, AP or partner readiness',()=>{
 for(const [core,support,which] of [['flame','focus','ally'],['mend','focus','enemy'],['flame','burst','ally'],['mend','burst','enemy'],['flame','link','ally'],['flame','focus','stale']]){
  const b=setup(),h=b.heroes[0],tech=compileTechnique(core,support),before=b.snapshot();
  const target=which==='ally'?b.heroes[1].id:which==='enemy'?b.enemies[0].id:'missing';
  assert.equal(b.command(h.id,'tech',target,tech),false,core+':'+support+':'+which);
  assert.deepEqual(b.snapshot(),before);
 }
});
test('valid healing, offensive Link and Counter techniques still spend exactly one action',()=>{
 let b=setup(),h=b.heroes[0],ally=b.heroes[1];ally.hp-=80;
 assert.equal(b.command(h.id,'tech',ally.id,compileTechnique('mend')),true);assert.ok(ally.hp>ally.maxHp-80);assert.equal(h.atb,0);
 b=setup();h=b.heroes[0];const mp=b.heroes[1].mp;assert.equal(b.command(h.id,'tech',b.enemies[0].id,compileTechnique('flame','link')),true);assert.equal(b.heroes[1].mp,mp-4);assert.equal(b.heroes[1].atb,0);
 b=setup();h=b.heroes[0];assert.equal(b.command(h.id,'tech',b.enemies[0].id,compileTechnique('flame','counter')),true);assert.ok(h.counter);assert.equal(h.atb,0);
});
test('a Siphon heals from damage actually dealt after defenses, without overkill or overheal credit',()=>{
 const b=setup(),h=b.heroes[0],e=b.enemies[0],tech=compileTechnique('shade','leech');h.hp-=100;e.hp=10;
 const before=h.hp;b.apply(h,e,tech);assert.equal(h.hp-before,3);assert.equal(b.events.filter(e=>e.type==='heal').at(-1).amount,3);
 e.hp=100;e.status.shield=10000;const health=h.hp;b.apply(h,e,tech);assert.equal(h.hp,health);
 e.status.shield=0;e.hp=1000;h.hp=h.maxHp-1;b.apply(h,e,tech);assert.equal(h.hp,h.maxHp);assert.equal(b.events.filter(e=>e.type==='heal').at(-1).amount,1);
});
test('a defeated enemy cannot execute a previously queued attack',()=>{
 const b=setup(),e=b.enemies[0],h=b.heroes[0],hp=h.hp;e.hp=0;
 b.executeIntent(e,{kind:'strike',shape:'single',target:h.id,power:500});assert.equal(h.hp,hp);
});
test('selected-target guidance follows material state and urgent intent',()=>{
 const b=setup(),e=b.enemies[0];b.heroes[0].loadout=[{core:'tide',support:'focus'},{core:'frost',support:'focus'},{core:'earth',support:'break'}];e.shell=shellFor('clay');assert.match(combatAdvice(b,e).text,/Tide Lance soaks/);e.shell.soaked=true;assert.match(combatAdvice(b,e).text,/Rime Lance cracks/);e.shell.brittle=true;assert.match(combatAdvice(b,e).text,/Strike now/);
 e.intent={kind:'alarm',shape:'single'};assert.equal(combatAdvice(b,e).urgent,true);assert.match(combatAdvice(b,e).text,/can interrupt before/);
 e.intent={kind:'strike',shape:'line'};assert.match(combatAdvice(b,e).text,/move clear or Guard/);e.hp=0;assert.equal(combatAdvice(b,e),null);
});
test('guard interception and wet reactions have usable advice after a shell is shed',()=>{
 const b=setup(),e=b.enemies[0];e.shell={...shellFor('ash'),integrity:0};e.status.wet=4;b.heroes[0].loadout=[{core:'volt',support:'focus'}];assert.match(combatAdvice(b,e).text,/Lightning Lance conducts/);delete e.status.wet;
 const guard=makeEnemy('guard',4,1);guard.x=e.x+1;guard.y=e.y;b.enemies.push(guard);assert.match(combatAdvice(b,e).text,/intercepts strikes/);
});
import {applySupply} from '../repertoire.js?v=5.6.0';
test('draining supplies respect shields and remaining HP instead of generating health from blocked or excess damage',()=>{
 for(const id of ['leechSeed','rootHeart']){
  const b=setup(),h=b.heroes[0],e=b.enemies[0],inv={[id]:2};h.hp-=100;e.status.shield=10000;const old=h.hp;
  assert.equal(applySupply(b,inv,id,h,e),true);assert.equal(h.hp,old);assert.equal(inv[id],1);
  h.atb=1;e.status.shield=0;e.hp=7;assert.equal(applySupply(b,inv,id,h,e),true);assert.equal(h.hp-old,7);assert.equal(inv[id],0);
 }
});
