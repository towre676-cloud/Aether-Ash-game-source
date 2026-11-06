import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Armory,rollItem} from '../living-armory/src/armory.mjs';
import {createAshAetherArmoryBridge} from '../living-armory/src/host-bridge.mjs';
import {createCampaignArmoryController,ensureLivingArmory,transactLivingArmory,validateLivingArmory,claimLivingArmoryVictory} from '../living-armory/campaign.js';
import {defaultHero} from '../mako.js';
import {World} from '../world.js';

const state=()=>({heroes:Array.from({length:7},(_,id)=>defaultHero(id,20)),recruited:[0,1],party:[0],gold:1300,chapter:6,scene:73,mode:'field',timeline:{id:'growth-test'}});
const weapon=(serial=0)=>rollItem({seed:'growth',eventId:`earned-${serial}`,level:20,forceSlot:'mainhand',forceRarity:'epic'});
function campaign(){const s=state(),p=ensureLivingArmory(s),item=weapon();p.snapshot.overflow.push(item);p.snapshot.resources={scrap:500,essence:200,starshard:10};p.revision++;return {s,item,controller:createCampaignArmoryController({getState:()=>s})};}
const action=(view,id)=>view.actions.find(action=>action.id===id);
const grow=(controller,itemId,id,options={})=>{const offer=action(controller.weaponGrowthView(itemId,options),id);assert.ok(offer.enabled,offer.reasonText);return controller.growWeapon(itemId,id,offer.quote);};

test('empty campaign growth view does not grant gear, materials, currency or fictitious mastery',()=>{
 const s=state();ensureLivingArmory(s);const before=JSON.stringify(s),controller=createCampaignArmoryController({getState:()=>s}),view=controller.weaponGrowthView();
 assert.equal(view.ready,false);assert.equal(view.reason,'no-weapon');assert.deepEqual(view.actions,[]);assert.equal(JSON.stringify(s),before);assert.equal(view.weaponXP,undefined);
});

test('native previews are pure, show exact unaffordable costs and prefer a usable owned weapon',()=>{
 const a=new Armory({seedStarter:false,level:20}),item=weapon(),overlevel=weapon(1);overlevel.requiredLevel=90;overlevel.itemPower=99999;a.grantItem(item);a.grantItem(overlevel);a.state.resources={scrap:0,essence:0,starshard:0};
 const before=JSON.stringify(a.snapshot()),view=a.weaponGrowthView(),temper=action(view,'temper');
 assert.equal(JSON.stringify(a.snapshot()),before);assert.equal(view.itemId,item.id);assert.deepEqual(temper.cost,{scrap:8});assert.equal(temper.enabled,false);assert.equal(temper.reason,'resources');assert.deepEqual(temper.missing,[{resource:'scrap',required:8,available:0,amount:8}]);assert.match(temper.reasonText,/8 more scrap/);assert.equal(temper.after.upgrade,1);assert.equal(temper.after.itemPower,item.itemPower+14);assert.equal(view.progress.current,0);
});

test('every growth preview matches its actual native cost, resulting stats and power',()=>{
 const a=new Armory({seedStarter:false,level:20}),item=weapon();a.grantItem(item);a.state.resources={scrap:500,essence:200,starshard:10};
 for(const id of ['equip','temper','attune','socket']){
  const offer=action(a.weaponGrowthView(item.id,{stat:'focus'}),id);assert.ok(offer.enabled,id);const before={coins:a.state.coins,...a.state.resources},result=a[offer.method](...offer.args);assert.ok(result.ok,id);const found=a.get(item.id).item;
  assert.deepEqual(a.effectiveItemStats(found),offer.after.stats,id);assert.equal(found.itemPower,offer.after.itemPower,id);for(const [key,cost]of Object.entries(offer.cost))assert.equal(before[key]-(key==='coins'?a.state.coins:a.state.resources[key]),cost,id);
 }
 const extract=action(a.weaponGrowthView(item.id),'extract'),before=a.state.resources.essence;assert.deepEqual(extract.cost,{essence:2});assert.ok(a.extractRune(...extract.args).ok);assert.equal(a.state.resources.essence,before-2);assert.deepEqual(a.effectiveItemStats(a.get(item.id).item),extract.after.stats);
});

test('retuning displays removed stats; an unchanged imprint cannot waste materials',()=>{
 const a=new Armory({seedStarter:false}),item=weapon();a.grantItem(item);a.state.resources={scrap:500,essence:200,starshard:10};assert.ok(a.imprintItem(item.id,'attack').ok);
 const same=action(a.weaponGrowthView(item.id,{stat:'attack'}),'attune');assert.equal(same.enabled,false);assert.equal(same.reason,'unchanged');
 const retune=action(a.weaponGrowthView(item.id,{stat:'focus'}),'attune');assert.ok(retune.enabled);assert.ok(retune.changes.attack<0);assert.ok(retune.changes.focus>0);assert.match(retune.detail,/Replaces/);
});

test('temper and socket limits explain the actual unavailable next step',()=>{
 const a=new Armory({seedStarter:false}),item=weapon();a.grantItem(item);a.state.resources={scrap:5000,essence:5000,starshard:100};for(let i=0;i<8;i++)assert.ok(a.upgrade(item.id).ok);
 const max=action(a.weaponGrowthView(item.id),'temper');assert.equal(max.enabled,false);assert.equal(max.reason,'maxed');assert.equal(max.after.upgrade,8);for(let i=0;i<item.sockets;i++)assert.ok(a.socketRune(item.id,'ember_fang').ok);
 const full=action(a.weaponGrowthView(item.id),'socket');assert.equal(full.reason,'full');assert.match(full.reasonText,/Extract/);assert.ok(action(a.weaponGrowthView(item.id),'extract').enabled);
 for(let i=0;i<12;i++)assert.ok(a.imprintItem(item.id,'attack').ok);const exhausted=action(a.weaponGrowthView(item.id),'attune');assert.equal(exhausted.enabled,false);assert.match(exhausted.reasonText,/12 attunements/);
});

test('controller growth spends the single canonical pouch, updates worn bonuses and consumes quotes once',()=>{
 const {s,item,controller}=campaign(),gold=s.gold;assert.ok(grow(controller,item.id,'equip').ok);const powerBefore=s.heroes[0].power,p=s.livingArmory,before=p.snapshot.resources.scrap,view=controller.weaponGrowthView(),offer=action(view,'temper');
 assert.equal(offer.method,undefined);assert.equal(offer.args,undefined);assert.ok(controller.growWeapon(item.id,'temper',offer.quote).ok);assert.equal(p.snapshot.resources.scrap,before-8);assert.equal(s.gold,gold);assert.equal(p.snapshot.coins,0);assert.equal(p.gearByHero[0].mainhand.upgrade,1);assert.ok(s.heroes[0].power>=powerBefore);const saved=JSON.stringify(s);assert.equal(controller.growWeapon(item.id,'temper',offer.quote).reason,'stale-quote');assert.equal(JSON.stringify(s),saved);assert.ok(validateLivingArmory(s));
});

test('quotes reject changed materials, scene, bearer, item, restored state and battle without spending',()=>{
 for(const change of [({s})=>s.livingArmory.snapshot.resources.scrap--,({s})=>s.scene++,({controller})=>controller.selectHero(1),({s})=>s.livingArmory.snapshot.overflow[0].stats.attack++,({s})=>s.mode='battle']){
  const fixture=campaign(),offer=action(fixture.controller.weaponGrowthView(fixture.item.id),'temper');change(fixture);const before=JSON.stringify(fixture.s),result=fixture.controller.growWeapon(fixture.item.id,'temper',offer.quote);assert.equal(result.ok,false);assert.equal(JSON.stringify(fixture.s),before);
 }
 const {s:initial,item}=campaign();let current=initial;const controller=createCampaignArmoryController({getState:()=>current}),offer=action(controller.weaponGrowthView(item.id),'temper');current=structuredClone(initial);const before=JSON.stringify(current);assert.equal(controller.growWeapon(item.id,'temper',offer.quote).reason,'stale-quote');assert.equal(JSON.stringify(current),before);
});

test('quotes survive movement and health changes, while a weapon owned by another bearer stays unavailable',()=>{
 const {s,item,controller}=campaign(),offer=action(controller.weaponGrowthView(item.id),'temper');s.x=123;s.heroes[0].hp--;assert.ok(controller.growWeapon(item.id,'temper',offer.quote).ok);assert.ok(transactLivingArmory(s,0,'equip',[item.id]).ok);controller.selectHero(1);assert.equal(controller.weaponGrowthView(item.id).reason,'missing-weapon');assert.equal(controller.weaponGrowthView().ready,false);
});

test('paid growth survives repeated full campaign saves with identical ownership, materials and bonuses',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),w=new World(data);w.state.mode='field';const p=ensureLivingArmory(w.state),item=weapon();item.requiredLevel=1;p.snapshot.overflow.push(item);p.snapshot.resources={scrap:500,essence:200,starshard:10};p.revision++;w.state.gold=777;
 const controller=createCampaignArmoryController({getState:()=>w.state});for(const id of ['equip','temper','attune','socket','extract'])assert.ok(grow(controller,item.id,id,{stat:'attack'}).ok);const expected=structuredClone(w.state),restored=new World(data);restored.restore(w.save());for(let n=0;n<6;n++)restored.restore(restored.save());assert.deepEqual(restored.state.livingArmory,expected.livingArmory);assert.equal(restored.state.gold,777);for(const key of ['power','magic','maxHp','maxMp','speed'])assert.equal(restored.state.heroes[0][key],expected.heroes[0][key]);assert.ok(validateLivingArmory(restored.state));
});

test('host bridge refuses prototype growth in host mode and delegates canonical offers unchanged',()=>{
 const a=new Armory(),before=JSON.stringify(a.snapshot()),host={hasCommittedLoot:()=>false,commitLootOnce:()=>true},bridge=createAshAetherArmoryBridge({host,armory:a});assert.equal(bridge.weaponGrowthView().reason,'missing-canonical-growth');assert.equal(bridge.growWeapon('x','temper','x').ok,false);assert.equal(JSON.stringify(a.snapshot()),before);
 const offer={ready:true,itemId:'native',actions:[]};host.weaponGrowthView=()=>offer;host.growWeapon=(...args)=>({ok:true,args});assert.equal(bridge.weaponGrowthView(),offer);assert.deepEqual(bridge.growWeapon('native','temper','canonical-token'),{ok:true,args:['native','temper','canonical-token']});assert.equal(JSON.stringify(a.snapshot()),before);
});

test('standalone bridge uses one native transaction, saves once and rejects replayed growth',()=>{
 const a=new Armory({seedStarter:false}),item=weapon();a.grantItem(item);let saves=0;const bridge=createAshAetherArmoryBridge({ownership:'armory',armory:a,host:{saveArmorySnapshot:()=>saves++}}),offer=action(bridge.weaponGrowthView(item.id),'temper'),before=a.state.resources.scrap;assert.ok(bridge.growWeapon(item.id,'temper',offer.quote).ok);assert.equal(a.state.resources.scrap,before-8);assert.equal(saves,1);assert.equal(bridge.growWeapon(item.id,'temper',offer.quote).reason,'stale-quote');assert.equal(saves,1);
});

function encounterFixture(){
 const s=state(),p=ensureLivingArmory(s),native=new Armory({seedStarter:false});native.load(p.snapshot);native.state.level=s.heroes[0].level;
 const world={state:s,scene:{key:'workshop',tags:[]},currentBattle:{object:{type:'patrol'}},notice(){}};
 const battle=serial=>({ended:'win',chapter:6,context:{encounterSerial:serial,tags:['living']},enemies:[{hp:0,species:'test-moth',name:'Orchard moth',role:'scout',element:'gale'}]});
 const preview=serial=>native.previewEncounter({eventId:`growth-test:encounter:${serial}:73:patrol`,enemyId:'test-moth',enemySpec:{id:'test-moth',name:'Orchard moth',body:'wings',region:'glade',level:21,signature:'aether',shielding:0,boss:false,elite:false},level:21,region:'glade',boss:false,elite:false,difficulty:1});
 const find=(predicate,start=1)=>{for(let serial=start;serial<1000;serial++){const reward=preview(serial);if(predicate(reward))return {serial,reward};}throw Error('No deterministic fixture');};
 return {s,p,world,battle,preview,find};
}

test('first earned armor roll becomes a weapon within the exact original loot budget; existing gear is untouched',()=>{
 const f=encounterFixture(),{serial,reward}=f.find(reward=>reward.equipment.length>0&&reward.equipment.every(item=>item.slot!=='mainhand'));
 const existing=rollItem({seed:'old-armor',eventId:'already-earned',forceSlot:'chest',level:8});Object.freeze(existing.stats);Object.freeze(existing);f.p.snapshot.overflow.push(existing);f.p.discoveries.push(existing.baseId);const original=structuredClone(existing),captured=JSON.stringify(reward),result=claimLivingArmoryVictory(f.world,f.battle(serial));
 assert.ok(result.ok);assert.equal(result.items.length,reward.equipment.length);assert.equal(result.items[0].slot,'mainhand');for(const key of ['level','rarity','itemPower','value'])assert.equal(result.items[0][key],reward.equipment[0][key],key);assert.deepEqual(result.resources,{...reward.resources,coins:0});assert.equal(JSON.stringify(reward),captured);assert.deepEqual(f.p.snapshot.overflow.find(item=>item.id===existing.id),original);
 const saved=JSON.stringify(f.s);assert.equal(claimLivingArmoryVictory(f.world,f.battle(serial)).reason,'already-claimed');assert.equal(JSON.stringify(f.s),saved);
 const recovered=structuredClone(f.s);f.world.state=recovered;assert.equal(claimLivingArmoryVictory(f.world,f.battle(serial)).reason,'already-claimed');assert.equal(JSON.stringify(recovered),saved);
});

test('first empty hostile reward retains its existing one-weapon fallback and material award',()=>{
 const f=encounterFixture(),{serial,reward}=f.find(reward=>!reward.equipment.length),result=claimLivingArmoryVictory(f.world,f.battle(serial));assert.equal(result.items.length,1);assert.equal(result.items[0].slot,'mainhand');assert.equal(result.items[0].rarity,'uncommon');assert.deepEqual(result.resources,{...reward.resources,coins:0});
});

test('discovered weapons prevent repeat replacement after salvage; old claimed armor stays unchanged',()=>{
 const f=encounterFixture(),first=f.find(reward=>reward.equipment.length>0&&reward.equipment.every(item=>item.slot!=='mainhand')),earned=claimLivingArmoryVictory(f.world,f.battle(first.serial));assert.ok(transactLivingArmory(f.s,0,'salvage',[earned.items[0].id]).ok);
 const next=f.find(reward=>reward.equipment.length>0&&reward.equipment.every(item=>item.slot!=='mainhand'),first.serial+1),result=claimLivingArmoryVictory(f.world,f.battle(next.serial));assert.deepEqual(result.items.map(item=>item.id),next.reward.equipment.map(item=>item.id));assert.ok(result.items.every(item=>item.slot!=='mainhand'));
 const legacy=encounterFixture(),old=legacy.find(reward=>reward.equipment.length>0&&reward.equipment.every(item=>item.slot!=='mainhand'));legacy.p.snapshot.overflow.push(structuredClone(old.reward.equipment[0]));legacy.p.snapshot.claimedEvents[old.reward.eventId]={source:'victory',enemyId:'test-moth'};const before=JSON.stringify(legacy.s);assert.equal(claimLivingArmoryVictory(legacy.world,legacy.battle(old.serial)).reason,'already-claimed');assert.equal(JSON.stringify(legacy.s),before);
});

test('town interaction, practice, defeat and withdrawal cannot trigger first-weapon awards',()=>{
 for(const kind of ['town','practice','defeat','withdrawal']){
  const f=encounterFixture(),battle=f.battle(1);if(kind==='town')f.world.currentBattle=null;if(kind==='practice')f.world.currentBattle.object.type='practice';if(kind==='defeat')battle.ended='loss';if(kind==='withdrawal')battle.enemies[0].withdrawn=true;
  const before=JSON.stringify(f.s);assert.equal(claimLivingArmoryVictory(f.world,battle).ok,false);assert.equal(JSON.stringify(f.s),before);
 }
});

test('malformed imported growth ranks, levels and material purses cannot become negative prices',()=>{
 const a=new Armory({seedStarter:false});a.grantItem(weapon());const original=a.snapshot();
 for(const mutate of [s=>s.placements[0].item.upgrade=-3,s=>s.placements[0].item.upgrade=1.5,s=>s.placements[0].item.upgrade=9,s=>s.placements[0].item.level=-60,s=>s.resources.essence=-1,s=>s.resources.scrap=1.5,s=>s.coins=-10]){
  const broken=structuredClone(original);mutate(broken);assert.throws(()=>a.load(broken),/Invalid/);assert.deepEqual(a.snapshot(),original);
 }
 const legacy=structuredClone(original);delete legacy.placements[0].item.upgrade;assert.ok(a.load(legacy));assert.equal(a.get(legacy.placements[0].item.id).item.upgrade,0);
});
