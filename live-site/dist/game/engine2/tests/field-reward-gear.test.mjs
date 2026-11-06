import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultHero} from '../mako.js';
import {Armory,rollItem} from '../living-armory/src/armory.mjs';
import {ensureLivingArmory,transactLivingArmory,validateLivingArmory,claimLivingArmoryVictory,livingArmoryDamage} from '../living-armory/campaign.js';
import {claimBossGear} from '../boss-gear.js';
import {captureFieldProgress,fieldVictoryReport,refreshFieldRewardReport,equipFieldReward} from '../field-journey-model.js';
import {captureRewardGear} from '../field-reward-gear.js';

function fixture(){
 const state={scene:15,x:1,y:2,chapter:1,mode:'field',xp:0,gold:20,bosses:[],items:{},cores:['earth'],supports:['focus'],
  party:[0,1,2],recruited:[0,1,2,3,4,5,6],heroes:Array.from({length:7},(_,id)=>({...defaultHero(id,12),unlockedSlots:1})),timeline:{id:'receipt-test',era:'present'}};
 return {state,scene:{key:'trail',tags:[]},currentBattle:{object:{type:'patrol'}},notice(){},reconciledGround:{sample:()=>({element:'earth',shielding:.25,resonance:.25,traction:.55,organic:false,rooted:false,water:false})}};
}
function grant(s,slot,serial=0,stats=null){
 const p=ensureLivingArmory(s),item=rollItem({seed:'receipt-test',eventId:'award-'+serial,level:1,region:'clay',forceSlot:slot,forceRarity:'uncommon'});
 if(stats)item.stats=stats;item.requiredLevel=1;p.snapshot.overflow.push(item);return item;
}
const recommendation=report=>report.gear.choices.find(choice=>choice.id===report.gear.recommendedId);

test('reward snapshots include storage and all bearers without creating or retaining campaign state',()=>{
 const w=fixture(),blank=JSON.stringify(w.state);captureRewardGear(w.state);assert.equal(JSON.stringify(w.state),blank);assert.equal(w.state.livingArmory,undefined);
 const item=grant(w.state,'ring');transactLivingArmory(w.state,6,'equip',[item.id,'ring2']);const before=captureFieldProgress(w),saved=JSON.stringify(w.state);
 assert.deepEqual(before.gear.armoryIds,[item.id]);assert.equal(JSON.stringify(w.state),saved);
 w.state.livingArmory.snapshot.resources.scrap=44;w.state.livingArmory.gearByHero[6].ring2.name='Changed later';
 assert.equal(before.gear.forge.scrap,0);assert.deepEqual(before.gear.armoryIds,[item.id]);
});

test('a real victory receipt names actual artifacts and forge deltas while award claims remain single-use',()=>{
 const w=fixture(),before=captureFieldProgress(w),battle={ended:'win',chapter:1,context:{encounterSerial:1,tags:[]},enemies:[{hp:0,species:'receipt-moth',name:'Trail moth',role:'scout',element:'gale'}]};
 const award=claimLivingArmoryVictory(w,battle);assert.ok(award.ok);w.state.xp+=25;w.state.gold+=20;
 const settled=JSON.stringify(w.state),report=fieldVictoryReport(w,before,{type:'patrol'});
 assert.equal(JSON.stringify(w.state),settled,'comparison mutated live inventory or stats');
 assert.deepEqual(report.gear.items.map(item=>item.itemId),award.items.map(item=>item.id));
 for(const item of award.items)assert.ok(report.gear.items.some(found=>found.name===item.name));
 assert.ok(report.rewards.includes('+'+award.resources.scrap+' Forge scrap'));
 assert.ok(report.rewards.includes('+25 XP'));assert.ok(report.rewards.includes('+20 credits'));
 assert.equal(claimLivingArmoryVictory(w,battle).reason,'already-claimed');assert.equal(JSON.stringify(w.state),settled);
 assert.deepEqual(fieldVictoryReport(w,captureFieldProgress(w),{type:'patrol'}).gear.items,[]);
});

test('all seven recruited heroes can compare both named ring slots; a large loss is not recommended',()=>{
 const w=fixture(),old=grant(w.state,'ring',1,{attack:160});transactLivingArmory(w.state,0,'equip',[old.id,'ring1']);
 const before=captureFieldProgress(w),item=grant(w.state,'ring',2,{attack:30,focus:20}),report=fieldVictoryReport(w,before,{type:'patrol'});
 const choices=report.gear.choices.filter(choice=>choice.itemId===item.id);
 assert.equal(choices.length,14);assert.deepEqual([...new Set(choices.map(choice=>choice.heroId))],[0,1,2,3,4,5,6]);
 assert.deepEqual([...new Set(choices.map(choice=>choice.slotLabel))],['Ring 1','Ring 2']);
 const loss=choices.find(choice=>choice.heroId===0&&choice.slot==='ring1');assert.ok(loss.deltas.some(delta=>delta.key==='power'&&delta.delta<0));assert.equal(loss.replacesId,old.id);
 assert.equal(recommendation(report).clearImprovement,true);assert.notEqual(recommendation(report).id,loss.id);
});

test('a low-level mantle with no rounded headline stat still exposes its actual direct-hit protection',()=>{
 const w=fixture(),before=captureFieldProgress(w);grant(w.state,'shoulders',3,{ward:4,aether:1,discovery:2});
 const report=fieldVictoryReport(w,before,{type:'patrol'}),choice=recommendation(report);assert.ok(choice);assert.deepEqual(choice.deltas,[]);assert.ok(choice.protectionDelta>0);assert.match(choice.protectionText,/percentage points here/);
 assert.ok(equipFieldReward(w,choice).ok);const h={...w.state.heroes[choice.heroId],status:{},x:0,y:0},foe={x:2,y:0,armor:0,status:{}};
 const actual=100-livingArmoryDamage({heroes:[h],context:{ground:w.reconciledGround.sample()}},foe,h,100,{core:'earth',physical:true});
 assert.ok(Math.abs(actual-choice.protectionDelta)<.0001);
});

test('the actual Prismatic Emberthread Loop explains Precision 8 and Aether 7 through canonical hit multipliers',()=>{
 const w=fixture(),before=captureFieldProgress(w),item=grant(w.state,'ring',30,{precision:8,aether:7});Object.assign(item,{name:'Prismatic Emberthread Loop',level:4,requiredLevel:3,material:'Astral Silver',element:'aether',sockets:0,runes:[]});
 const original=JSON.stringify(w.state),report=fieldVictoryReport(w,before,{type:'patrol'}),choice=recommendation(report);assert.equal(JSON.stringify(w.state),original);assert.ok(choice);
 assert.deepEqual(choice.deltas,[]);assert.deepEqual(report.gear.items[0].attributes.map(attribute=>attribute.text),['Precision +8','Aether +7']);assert.equal(choice.conditionalHighlights.length,2);
 const aether=choice.conditional.find(row=>row.cores?.includes('gale')),other=choice.conditional.find(row=>row.cores?.includes('earth'));
 assert.match(aether.text,/Gale \/ Volt \/ Gravity.*\+5\.88%/);assert.match(other.text,/Other direct hits.*\+3\.1%/);
 const beforeHero={...w.state.heroes[choice.heroId],status:{},x:0,y:0},enemy={x:2,y:0,armor:0,status:{}},context={ground:w.reconciledGround.sample()};
 const beforeHit=livingArmoryDamage({heroes:[beforeHero],context},beforeHero,enemy,100,{core:'gale'});assert.ok(equipFieldReward(w,choice).ok);
 const afterHero={...w.state.heroes[choice.heroId],status:{},x:0,y:0},afterHit=livingArmoryDamage({heroes:[afterHero],context},afterHero,enemy,100,{core:'gale'});
 assert.ok(Math.abs((afterHit/beforeHit-1)*100-aether.delta)<.0001);
});

test('conditional replacement losses remain visible and prevent a misleading default recommendation',()=>{
 const w=fixture(),old=grant(w.state,'ring',31,{precision:8,aether:7});transactLivingArmory(w.state,0,'equip',[old.id,'ring1']);
 const before=captureFieldProgress(w);grant(w.state,'ring',32,{precision:4,ember:7});const report=fieldVictoryReport(w,before,{type:'patrol'}),choice=report.gear.choices.find(choice=>choice.heroId===0&&choice.slot==='ring1');
 assert.ok(choice.conditionalHighlights.some(row=>row.delta<0));assert.ok(choice.conditional.some(row=>row.cores?.includes('gale')&&row.delta<0));
 assert.deepEqual(choice.traitDeltas.filter(row=>row.delta<0).map(row=>row.text).sort(),['Aether -7','Precision -4']);assert.equal(choice.hasTradeoff,true);assert.notEqual(report.gear.recommendedId,choice.id);
});

test('receipt equip applies the compared host deltas exactly once, preserves injury, and refreshes its wearer',()=>{
 const w=fixture(),before=captureFieldProgress(w),item=grant(w.state,'chest',4,{focus:25,vigor:5,ward:12});
 w.state.heroes[6].hp=31;w.state.heroes[6].mp=7;
 const report=fieldVictoryReport(w,before,{type:'wild'}),choice=report.gear.choices.find(choice=>choice.heroId===6),base=structuredClone(w.state.heroes),materials=structuredClone(w.state.livingArmory.snapshot.resources),gold=w.state.gold;
 const result=equipFieldReward(w,choice);assert.ok(result.ok);assert.equal(result.itemId,item.id);assert.match(result.message,/Veyr equipped/);
 for(const delta of choice.deltas)assert.ok(Math.abs(w.state.heroes[6][delta.key]-base[6][delta.key]-delta.delta)<1e-8);
 assert.equal(w.state.heroes[6].hp,31);assert.equal(w.state.heroes[6].mp,7);assert.equal(w.state.gold,gold);assert.deepEqual(w.state.livingArmory.snapshot.resources,materials);
 for(const id of [0,1,2,3,4,5])for(const key of ['power','magic','maxHp','maxMp','speed'])assert.equal(w.state.heroes[id][key],base[id][key]);
 const equipped=JSON.stringify(w.state);assert.equal(equipFieldReward(w,choice).ok,false);assert.equal(JSON.stringify(w.state),equipped);
 const refresh=refreshFieldRewardReport(w,report);assert.match(refresh.gear.items[0].status,/Equipped by Veyr/);assert.equal(refresh.gear.recommendedId,null);assert.deepEqual(refresh.rewards,report.rewards);assert.equal(JSON.stringify(w.state),equipped);assert.match(refresh.summary,/Your recovered equipment is equipped/);
 transactLivingArmory(w.state,6,'unequip',['chest']);assert.match(refreshFieldRewardReport(w,refresh).summary,/ready to compare/);
});

test('stale, incompatible and battle equipment requests fail without touching ownership or currencies',()=>{
 const w=fixture(),before=captureFieldProgress(w),first=grant(w.state,'mainhand',5,{attack:50}),report=fieldVictoryReport(w,before,{type:'patrol'}),choice=recommendation(report),other=grant(w.state,'mainhand',6,{attack:10});
 transactLivingArmory(w.state,choice.heroId,'equip',[other.id,'mainhand']);let saved=JSON.stringify(w.state);
 assert.equal(equipFieldReward(w,choice).reason,'changed');assert.equal(JSON.stringify(w.state),saved);
 assert.equal(equipFieldReward(w,{...choice,slot:'chest'}).reason,'incompatible');assert.equal(JSON.stringify(w.state),saved);
 w.state.mode='battle';saved=JSON.stringify(w.state);assert.equal(equipFieldReward(w,choice).reason,'battle');assert.equal(JSON.stringify(w.state),saved);
 assert.ok(w.state.livingArmory.snapshot.overflow.some(item=>item.id===first.id));
});

test('guardian equipment and actual core, support, and socket unlocks appear alongside ordinary rewards',()=>{
 const w=fixture(),before=captureFieldProgress(w);claimBossGear(w.state,1);w.state.bosses.push(1);w.state.cores.push('flame');w.state.supports.push('break');w.state.heroes[0].unlockedSlots=2;
 const saved=JSON.stringify(w.state),report=fieldVictoryReport(w,before,{type:'boss'});assert.equal(JSON.stringify(w.state),saved);
 assert.equal(report.gear.items[0].name,'Freed Conduit');assert.match(report.progress.join(' '),/New core · Flame/);assert.match(report.progress.join(' '),/New support · Break/);assert.match(report.progress.join(' '),/Sable can now equip 2 techniques/);
 const choice=recommendation(report);assert.equal(choice.slot,'weapon');assert.equal(choice.slotLabel,'Guardian weapon');assert.deepEqual(choice.deltas.map(delta=>[delta.key,delta.delta]),[['power',2],['magic',1]]);
 assert.ok(equipFieldReward(w,choice).ok);assert.equal(w.state.heroes[choice.heroId].guardianGear.weapon.id,'guardian-1');
 const refresh=refreshFieldRewardReport(w,report);assert.equal(refresh.gear.recommendedId,null);assert.match(refresh.gear.items[0].status,/Equipped by/);
});

test('refresh after salvage preserves the original receipt and never presents a later forged item as battle loot',()=>{
 const w=fixture(),before=captureFieldProgress(w),item=grant(w.state,'chest',7,{focus:25});w.state.livingArmory.snapshot.resources={scrap:24,essence:8,starshard:1};w.state.gold=700;
 const report=fieldVictoryReport(w,before,{type:'wild'}),original=structuredClone(report.rewards);
 assert.ok(transactLivingArmory(w.state,0,'salvage',[item.id]).ok);assert.ok(transactLivingArmory(w.state,0,'craftItem',[{slot:'mainhand',region:'clay',rarity:'rare'}]).ok);
 const saved=JSON.stringify(w.state),refresh=refreshFieldRewardReport(w,report);assert.equal(JSON.stringify(w.state),saved);assert.deepEqual(refresh.rewards,original);
 assert.deepEqual(refresh.gear.items.map(found=>found.itemId),[item.id]);assert.equal(refresh.gear.items[0].where,'missing');assert.equal(refresh.gear.recommendedId,null);
});

test('equipping an overflow reward into full storage keeps every displaced and pending item',()=>{
 const w=fixture(),old=grant(w.state,'ring',8,{focus:4});transactLivingArmory(w.state,0,'equip',[old.id,'ring1']);
 const model=new Armory({seedStarter:false});model.load(w.state.livingArmory.snapshot);
 for(let serial=0;serial<142;serial++){const item=rollItem({seed:'full',eventId:'full-'+serial,level:1,forceSlot:'ring',forceRarity:'common'});model.grantItem(item);}
 w.state.livingArmory.snapshot=model.snapshot();const before=captureFieldProgress(w),item=grant(w.state,'ring',9,{focus:80}),report=fieldVictoryReport(w,before,{type:'boss'});
 const choice=report.gear.choices.find(choice=>choice.heroId===0&&choice.slot==='ring1'),count=captureRewardGear(w.state).armoryIds.length,pending=w.state.livingArmory.snapshot.overflow.length;
 assert.equal(report.gear.items[0].where,'overflow');assert.ok(equipFieldReward(w,choice).ok);assert.equal(captureRewardGear(w.state).armoryIds.length,count);
 assert.ok(w.state.livingArmory.snapshot.overflow.some(found=>found.id===old.id));assert.equal(w.state.livingArmory.snapshot.overflow.length,pending);assert.equal(w.state.livingArmory.gearByHero[0].ring1.id,item.id);assert.ok(validateLivingArmory(w.state));
});
