import test from 'node:test';
import assert from 'node:assert/strict';
import {source} from './opening-flow.mjs';
import {World} from '../world.js';
import {economyState} from '../economy.js';
import {expeditionObjects,recoverAtExpedition,refineExpeditionCore} from '../field-expeditions.js';

const clone=value=>JSON.parse(JSON.stringify(value));
function journey(){
 const w=new World(source);w.newGame({quiet:true});w.state.scene=5;w.state.x=w.scene.arrive[0]+.5;w.state.y=w.scene.arrive[1]+.5;w.state.mode='field';
 w.state.story.parcel=true;w.state.story.weapon=true;w.state.story.firstCore=true;w.state.cores=['flame'];w.state.supports=['focus'];w.state.heroes[0].loadout=[{core:'flame',support:'focus'}];
 return w;
}
function encounter(w,serial,extras={}){
 const o={type:'wild',randomEncounter:true,habitat:'meadow',tier:w.scene.chapter||1,count:1,serial,seed:serial*997,xy:[Math.floor(w.state.x),Math.floor(w.state.y)],salvageCore:'flame',...extras};
 assert.ok(w.startWildEncounter(o));assert.equal(w.state.mode,'battle');assert.equal(w.currentBattle.object,o);return o;
}
function win(w,serial,extras){const o=encounter(w,serial,extras);w.winBattle();assert.equal(w.currentBattle,null);assert.equal(w.state.mode,'field');return o;}
function approach(w){const o=w.objects().find(o=>o.type==='trail-refuge');assert.ok(o);w.state.x=o.xy[0]+.5;w.state.y=o.xy[1]+.5;return o;}

test('real World wild victories preserve normal XP and mastery while awarding one field material',()=>{
 const w=journey(),story=clone(w.state.story),flags=clone(w.state.flags),before={xp:w.state.xp,gold:w.state.gold,ap:w.state.heroes[0].ap.flame||0};
 win(w,1);assert.equal(w.state.xp,before.xp+28);assert.equal(w.state.gold,before.gold+11);assert.equal(w.state.heroes[0].ap.flame,before.ap+4);assert.equal(w.state.economy.goods.metal,1);assert.equal(w.state.expeditions.regions[1].wins,1);assert.equal(w.lastExpeditionReport.quantity,1);
 assert.deepEqual(w.state.story,story);assert.deepEqual(w.state.flags,flags);assert.equal(w.state.chapter,1);assert.deepEqual(w.state.bosses,[]);
 w.winBattle();assert.equal(w.state.economy.goods.metal,1);assert.equal(w.state.expeditions.regions[1].wins,1,'A repeated completion without a current encounter cannot mint progress');
});

test('nonlethal objective resolutions advance the same refuge while retreat awards nothing',()=>{
 const w=journey();win(w,1,{nonlethal:true,defeatedSpecies:[],objectiveOutcome:{id:'integration-peaceful-signal',kind:'signal',result:'win',nonlethal:true,integrity:100}});
 assert.equal(w.state.expeditions.regions[1].wins,1);assert.equal(w.state.economy.goods.metal,1);assert.equal(w.state.objectiveHistory.records[0].nonlethal,true);assert.equal(w.state.objectiveHistory.aids['5'].signal,true);assert.deepEqual(w.state.monsterJournal.victories,{});
 const before={xp:w.state.xp,gold:w.state.gold,goods:clone(w.state.economy.goods),expeditions:clone(w.state.expeditions)};
 encounter(w,2,{objectiveOutcome:{id:'integration-failed-signal',kind:'signal',result:'loss',nonlethal:false,integrity:0}});w.loseBattle();assert.equal(w.currentBattle,null);assert.equal(w.state.mode,'field');assert.equal(w.state.xp,before.xp);assert.equal(w.state.gold,before.gold);assert.deepEqual(w.state.economy.goods,before.goods);assert.deepEqual(w.state.expeditions,before.expeditions);
 win(w,3);assert.equal(w.state.expeditions.regions[1].wins,2);assert.equal(w.state.economy.goods.metal,2);
});

test('actual authored patrol victory shares one economy claim and cannot be re-engaged after clearing',()=>{
 const w=journey();w.state.chapter=2;w.state.scene=135;w.state.x=w.scene.arrive[0]+.5;w.state.y=w.scene.arrive[1]+.5;const o=w.objects().find(o=>o.type==='patrol');assert.ok(o);o.salvageCore='tide';const before=economyState(w.state).goods.glass;
 w.interact(o);assert.equal(w.currentBattle.object,o);w.winBattle();assert.equal(w.state.economy.goods.glass,before+1);assert.equal(w.state.expeditions.regions[2].wins,1);assert.equal(w.lastExpeditionReport.material,'glass');assert.equal(w.lastExpeditionReport.quantity,1);
 const key='encounter:135:patrol:'+o.bit+':';assert.equal(w.state.economy.claims.filter(k=>k===key).length,1);assert.equal(w.state.expeditions.patrolClaims.filter(k=>'encounter:'+k===key).length,1);assert.equal(w.available(o),false);
 w.state.mode='field';w.interact(o);assert.equal(w.currentBattle,null);w.winBattle();assert.equal(w.state.economy.goods.glass,before+1);assert.equal(w.state.expeditions.regions[2].wins,1);
});

test('three first-chapter victories repair the same real town site and materials fund actual mastery',()=>{
 const w=journey(),damaged=w.objects().find(o=>o.type==='trail-refuge');assert.ok(damaged,'The first chapter needs a reachable public worksite');assert.equal(damaged.ready,false);const xy=[...damaged.xy];
 for(let serial=1;serial<=3;serial++)win(w,serial);
 const repaired=approach(w);assert.equal(repaired.ready,true);assert.deepEqual(repaired.xy,xy);assert.equal(w.lastExpeditionReport.refugeUnlocked,true);assert.equal(w.state.expeditions.regions[1].refuge.scene,5);
 const h=w.state.heroes[0],ap=h.ap.flame,materials=w.state.economy.goods.metal;assert.equal(ap,12);assert.ok(refineExpeditionCore(w,0,'flame'));assert.equal(h.ap.flame,ap+8);assert.equal(w.state.economy.goods.metal,materials-2);assert.equal(refineExpeditionCore(w,0,'flame'),false,'One remaining material cannot fund another refinement');
 h.hp=1;h.mp=0;assert.ok(recoverAtExpedition(w));const hp=h.hp,mp=h.mp;assert.equal(recoverAtExpedition(w),false);assert.equal(h.hp,hp);assert.equal(h.mp,mp);
 const saved=w.save(),copy=new World(source);copy.restore(saved);const again=approach(copy);assert.deepEqual(again.xy,xy);assert.equal(again.ready,true);assert.equal(copy.state.heroes[0].ap.flame,ap+8);assert.equal(copy.state.economy.goods.metal,materials-2);assert.equal(recoverAtExpedition(copy),false,'Loading a save does not renew a spent recovery');
 win(copy,4);approach(copy);copy.state.heroes[0].hp=1;assert.ok(recoverAtExpedition(copy),'Another actual resolved encounter renews the refuge rest');
});

test('World.restore accepts older saves and rejects corrupted new expedition history before replacing a journey',()=>{
 const original=journey(),old=clone(original.state);delete old.expeditions;const w=new World(source);w.restore(old);assert.equal(w.state.expeditions,undefined);w.objects();assert.equal(w.state.expeditions.version,1);assert.equal(w.state.expeditions.regions[1].wins,0);
 win(w,1);const valid=clone(w.state);for(const corrupt of [s=>s.expeditions.wildSerial=-4,s=>s.expeditions.regions[1].wins=-1,s=>s.expeditions.regions[1].restedAt=9,s=>s.expeditions.patrolClaims=['duplicate','duplicate'],s=>s.expeditions.regions[1].refuge.xy=[-1,4]]){const bad=clone(valid);corrupt(bad);assert.throws(()=>w.restore(bad),/expedition|refuge/i);assert.equal(w.state.expeditions.regions[1].wins,1);}
 const copy=new World(source);copy.restore(valid);assert.equal(copy.state.expeditions.regions[1].wins,1);assert.equal(copy.state.economy.goods.metal,1);
});
