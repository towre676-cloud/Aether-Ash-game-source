import test from 'node:test';import assert from 'node:assert/strict';import{growth,mastery,autoAttack}from '../battle-flow.js?v=5.6.0';import{Battle,makeEnemy}from '../battle.js?v=5.6.0';import{defaultHero}from '../mako.js';
test('XP boundaries and maximum level reflect real world formula',()=>{assert.equal(growth(0).value,0);assert.equal(growth(64).remaining,1);assert.equal(growth(65).level,2);assert.equal(growth(65).value,0);assert.equal(growth(65*44**2).value,1);});
test('mastery bars show actual rank thresholds',()=>{assert.equal(mastery(34).remaining,1);assert.equal(mastery(35).rank,2);assert.equal(mastery(119).remaining,1);assert.equal(mastery(120).value,1);});
test('auto attack spends readiness and stops cleanly after last target',()=>{const h=defaultHero(0,4),e=makeEnemy('predator',1);const b=new Battle({heroes:[h],enemies:[e]});h.atb=1;const hp=e.hp;autoAttack(b);assert.ok(e.hp<hp);assert.equal(h.atb,0);e.hp=0;h.atb=1;autoAttack(b);assert.equal(h.atb,1);});
import {earnOpening}from './opening-flow.mjs';
test('repeat practice earns growth without story milestones or unique item duplication',()=>{const{w}=earnOpening();const flags=JSON.stringify(w.state.flags),bosses=JSON.stringify(w.state.bosses),xp=w.state.xp;for(let i=0;i<3;i++){w.currentBattle={scene:w.scene.location,object:{type:'practice'},mission:w.mission};w.winBattle();}assert.equal(w.state.xp,xp+195);assert.equal(w.state.practiceWins,3);assert.equal(JSON.stringify(w.state.flags),flags);assert.equal(JSON.stringify(w.state.bosses),bosses);assert.equal(w.state.mode,'field');});

import {createBattlePacing} from '../battle-flow.js?v=5.6.0';
test('Wait freezes every battle clock and auto attack while choosing, then resumes normally',()=>{
 const hero=defaultHero(0,4),enemy=makeEnemy('predator',4);hero.x=0;hero.y=0;enemy.x=3;enemy.y=0;
 const b=new Battle({heroes:[hero],enemies:[enemy]}),pace=createBattlePacing();hero.atb=1;enemy.intent={kind:'strike',shape:'single',target:hero.id,left:2,total:2,power:10};
 const before=b.snapshot();assert.equal(pace.mode,'wait');assert.equal(pace.step(b,.1,{choosing:true,auto:true}).paused,true);assert.deepEqual(b.snapshot(),before);
 pace.step(b,.1);assert.equal(b.time,.1);assert.ok(enemy.intent.left<2);assert.equal(hero.atb,1);
 pace.step(b,.1,{auto:true});assert.equal(hero.atb,0);assert.ok(enemy.hp<enemy.maxHp);
});
test('Active mode keeps time running while choosing and stores the preference when storage is supplied',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},pace=createBattlePacing({storage});
 assert.equal(pace.setMode('active'),true);assert.equal(createBattlePacing({storage}).mode,'active');assert.equal(pace.setMode('invalid'),false);
 const b=new Battle({heroes:[defaultHero(0)],enemies:[makeEnemy('predator',1)]});assert.equal(pace.step(b,.1,{choosing:true}).paused,false);assert.equal(b.time,.1);
 pace.setMode('wait');assert.equal(createBattlePacing({storage}).mode,'wait');
});
test('blocked preference storage retains a usable default and does not prevent an explicit mode change',()=>{
 const pace=createBattlePacing({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});assert.equal(pace.mode,'wait');assert.equal(pace.setMode('active'),true);assert.equal(pace.mode,'active');
});
test('auto attack respects the selected living target and falls back when it falls',()=>{
 const h=defaultHero(0,4),a=makeEnemy('predator',1,0),z=makeEnemy('predator',1,1);a.x=0;a.y=3;z.x=3;z.y=0;
 const b=new Battle({heroes:[h],enemies:[a,z]});h.atb=1;const hp=a.hp;autoAttack(b,z.id);assert.equal(a.hp,hp);assert.ok(z.hp<z.maxHp);
 z.hp=0;h.atb=1;autoAttack(b,z.id);assert.ok(a.hp<hp);
});

test('an early Goal or Tactics picker keeps charging until someone is ready, then Wait freezes',()=>{
 const h=defaultHero(0),e=makeEnemy('predator',1),b=new Battle({heroes:[h],enemies:[e]}),pace=createBattlePacing();h.atb=.9;
 assert.equal(pace.step(b,.1,{choosing:true}).paused,false);assert.ok(h.atb>.9&&h.atb<1);assert.equal(b.time,.1);
 for(let i=0;i<20&&h.atb<1;i++)pace.step(b,.1,{choosing:true,auto:true});assert.equal(h.atb,1);
 const ready=b.snapshot();assert.equal(pace.step(b,.1,{choosing:true,auto:true}).paused,true);assert.deepEqual(b.snapshot(),ready);
 assert.equal(pace.step(b,.1,{choosing:false}).paused,false);assert.ok(b.time>ready.time);
});
