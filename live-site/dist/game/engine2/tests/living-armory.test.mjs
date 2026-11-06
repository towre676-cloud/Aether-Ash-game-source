import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {defaultHero} from '../mako.js';
import {World} from '../world.js';
import {Battle,makeEnemy} from '../battle.js';
import {rollItem} from '../living-armory/src/armory.mjs';
import {ensureLivingArmory,validateLivingArmory,transactLivingArmory,syncLivingArmoryStats,stripLivingArmoryStats,livingArmoryStats,claimLivingArmoryVictory,claimLivingArmoryCache,livingArmoryDamage,livingArmoryGround,prepareLivingArmoryBattle,livingArmoryGuard,livingArmoryAfterHit,livingArmoryFieldTraits,armoryLegacy,restoreArmoryLegacy,createCampaignArmoryController} from '../living-armory/campaign.js';
import {legacyFrom,convergeOrigin} from '../origins.js';
import {ORIGINS} from '../origin-content.js';
const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
const state=()=>({heroes:Array.from({length:7},(_,id)=>defaultHero(id,12)),recruited:[0,1,2],party:[0,1],gold:1800,chapter:6,mode:'field',timeline:{id:'campaign-test',era:'present'}});
function world(s=state()){return {state:s,scene:{key:'workshop',tags:[]},mission:{flag_address:123},currentBattle:{object:{type:'patrol'}},notice(){}};}
function battle(serial=1){return {ended:'win',chapter:6,context:{encounterSerial:serial,tags:['living']},enemies:[{id:'e0',species:'test-moth',name:'Orchard moth',role:'scout',element:'gale',hp:0}]};}
function award(s,slot='mainhand',serial=0){const p=ensureLivingArmory(s),item=rollItem({seed:'test',eventId:'fixture-'+serial,level:12,forceSlot:slot,forceRarity:'rare',region:'clay'});p.snapshot.overflow.push(item);p.revision++;return item;}

test('new and existing campaigns receive no prototype gear, materials or credits',()=>{
 const s=state(),before=s.gold,p=ensureLivingArmory(s);assert.equal(s.gold,before);assert.equal(p.snapshot.coins,0);assert.deepEqual(p.snapshot.resources,{scrap:0,essence:0,starshard:0});assert.equal(p.snapshot.placements.length,0);assert.equal(p.snapshot.overflow.length,0);assert.ok(Object.values(p.snapshot.gear).every(v=>v===null));syncLivingArmoryStats(s);assert.deepEqual(s.heroes[0].livingArmoryBonuses,{power:0,magic:0,maxHp:0,maxMp:0,speed:0});
});
test('real hostile victory awards once across save/restore and never duplicates canonical gold',()=>{
 const w=world(),before=w.state.gold,first=claimLivingArmoryVictory(w,battle());assert.ok(first.ok);assert.ok(first.items.length>=1);assert.equal(w.state.gold,before);assert.ok(first.resources.scrap>0);const snapshot=JSON.stringify(w.state);assert.equal(claimLivingArmoryVictory(w,battle()).reason,'already-claimed');assert.equal(JSON.stringify(w.state),snapshot);const recovered=world(JSON.parse(snapshot));validateLivingArmory(recovered.state);assert.equal(claimLivingArmoryVictory(recovered,battle()).reason,'already-claimed');assert.ok(claimLivingArmoryVictory(recovered,battle(2)).ok);
});
test('practice, friendly sparring, defeat and peaceful withdrawals do not mint creature equipment',()=>{
 for(const kind of ['practice','rival']){const w=world();w.currentBattle.object.type=kind;assert.equal(claimLivingArmoryVictory(w,battle()).ok,false);assert.equal(w.state.livingArmory,undefined);}
 const w=world();const loss=battle();loss.ended='loss';assert.equal(claimLivingArmoryVictory(w,loss).ok,false);const peaceful=battle();peaceful.enemies[0].hp=1;assert.equal(claimLivingArmoryVictory(w,peaceful).reason,'no-defeated-creature');assert.equal(ensureLivingArmory(w.state).snapshot.placements.length,0);
});
test('boss victories guarantee multiple actual artifacts; caches have separate durable one-time identities',()=>{
 const w=world(),boss=battle();w.currentBattle.object.type='boss';boss.enemies[0].boss=true;const reward=claimLivingArmoryVictory(w,boss);assert.ok(reward.items.length>=2);assert.equal(reward.resources.starshard,1);const cache={type:'cache',bit:4,label:'Temple cache'};assert.ok(claimLivingArmoryCache(w,cache).ok);assert.equal(claimLivingArmoryCache(w,cache).ok,false);assert.ok(validateLivingArmory(w.state));
});
test('shared storage and individual equipment preserve unique item ownership and battle locks',()=>{
 const s=state(),item=award(s);assert.ok(transactLivingArmory(s,0,'equip',[item.id]).ok);assert.equal(transactLivingArmory(s,1,'equip',[item.id]).ok,false);assert.equal(s.livingArmory.gearByHero[0].mainhand.id,item.id);assert.equal(s.livingArmory.gearByHero[1],undefined);assert.ok(transactLivingArmory(s,0,'unequip',['mainhand']).ok);assert.ok(transactLivingArmory(s,1,'equip',[item.id]).ok);assert.equal(s.livingArmory.gearByHero[0].mainhand,null);s.mode='battle';assert.equal(transactLivingArmory(s,1,'unequip',['mainhand']).reason,'battle');assert.ok(validateLivingArmory(s));
});
test('canonical forge spends actual campaign credits once and rolls back unaffordable transactions',()=>{
 const s=state(),p=ensureLivingArmory(s);p.snapshot.resources={scrap:30,essence:12,starshard:1};const before=s.gold;const first=transactLivingArmory(s,0,'craftItem',[{slot:'mainhand',region:'ash',rarity:'rare'}]);assert.ok(first.ok);assert.equal(s.gold,before-220);assert.equal(p.snapshot.resources.scrap,12);const snapshot=JSON.stringify(s);assert.equal(transactLivingArmory(s,0,'craftItem',[{slot:'mainhand',region:'ash',rarity:'rare'}]).ok,false);assert.equal(JSON.stringify(s),snapshot);
});
test('repeated equipment sync never stacks contributions or heals injured travellers',()=>{
 const s=state(),base=structuredClone(s.heroes[0]),item=award(s,'chest');s.heroes[0].hp=5;s.heroes[0].mp=1;transactLivingArmory(s,0,'equip',[item.id]);const bonus=livingArmoryStats(s,0);for(let i=0;i<80;i++)syncLivingArmoryStats(s);for(const key of ['power','magic','maxHp','maxMp','speed'])assert.ok(Math.abs(s.heroes[0][key]-base[key]-bonus[key])<1e-8,key);assert.equal(s.heroes[0].hp,5);assert.equal(s.heroes[0].mp,1);stripLivingArmoryStats(s);for(const key of ['power','magic','maxHp','maxMp','speed'])assert.ok(Math.abs(s.heroes[0][key]-base[key])<1e-8,key);
});
test('material harmonics sample the real floor while combat contributions stay bounded and skip secondary damage',()=>{
 const s=state(),item=award(s,'mainhand');item.stats={attack:300,precision:400,armor:400,ward:100,ember:300,resonance:300};transactLivingArmory(s,0,'equip',[item.id]);const h=s.heroes[0],enemy={x:3,y:3,status:{},shell:{material:'mineral',integrity:1}};h.x=1;h.y=2;const b={heroes:[h],context:{tags:[]},reconciledGround:{sample:(x,y)=>({element:'flame',shielding:.4,resonance:.8,traction:.7,organic:true,rooted:true,water:false})}};assert.equal(livingArmoryGround(b,h).element,'ember');assert.equal(livingArmoryGround(b,h).organic,true);const outgoing=livingArmoryDamage(b,h,enemy,100,{core:'flame'});assert.ok(outgoing>100&&outgoing<=155);const incoming=livingArmoryDamage(b,enemy,h,100,{core:'flame'});assert.ok(incoming>=70&&incoming<100);assert.equal(livingArmoryDamage(b,h,enemy,100,{core:'flame',secondary:true}),100);
});
test('malformed imported armories cannot duplicate gear across companions or corrupt currencies',()=>{
 const s=state(),item=award(s);transactLivingArmory(s,0,'equip',[item.id]);const duplicate=structuredClone(s);duplicate.livingArmory.gearByHero[1]=structuredClone(duplicate.livingArmory.gearByHero[0]);assert.throws(()=>validateLivingArmory(duplicate),/two places/);const money=structuredClone(s);money.livingArmory.snapshot.resources.scrap=-1;assert.throws(()=>validateLivingArmory(money),/materials/);
});
test('NG+ inherits discovered patterns, not items, materials, raw power or reward claims',()=>{
 const old=state(),item=award(old);transactLivingArmory(old,0,'equip',[item.id]);const legacy=armoryLegacy(old),next=state();next.timeline.id='another-telling';restoreArmoryLegacy(next,legacy);assert.ok(next.livingArmory.discoveries.includes(item.baseId));assert.equal(next.livingArmory.snapshot.placements.length,0);assert.deepEqual(next.livingArmory.snapshot.resources,{scrap:0,essence:0,starshard:0});assert.deepEqual(next.livingArmory.gearByHero,{});assert.ok(legacyFrom(old).armory);
});
test('full World save restores exact equipped stats and preserves all existing gear systems',()=>{
 const w=new World(data);w.state.mode='field';w.state.recruited=[0,1];w.state.gold=800;const item=award(w.state);item.requiredLevel=1;transactLivingArmory(w.state,0,'equip',[item.id]);const baseline=structuredClone(w.state.heroes[0]);const restored=new World(data);restored.restore(w.save());for(let i=0;i<12;i++)restored.restore(restored.save());for(const key of ['power','magic','maxHp','maxMp','speed'])assert.ok(Math.abs(restored.state.heroes[0][key]-baseline[key])<1e-8,key);assert.equal(restored.state.livingArmory.gearByHero[0].mainhand.id,item.id);
});
test('canonical controller changes actual selected traveller, persists actions and exposes only campaign rewards',()=>{
 const s=state();let changes=0;const item=award(s),controller=createCampaignArmoryController({getState:()=>s,onChange:()=>changes++});assert.ok(controller.equip(item.id).ok);assert.equal(changes,1);assert.equal(controller.selectedHero,0);controller.selectHero(1);assert.equal(controller.state.character,s.heroes[1].name);assert.equal(controller.state.gear.mainhand,null);assert.equal(controller.claimEncounter,undefined);assert.equal(controller.load,undefined);assert.equal(controller.newTimeline,undefined);
});
test('origin convergence preserves earned gear and mount history in the same journey',()=>{
 const w=new World(data);w.newGame({originId:ORIGINS[0].id});const id=w.state.party[0],item=award(w.state);item.requiredLevel=1;transactLivingArmory(w.state,id,'equip',[item.id]);w.state.trailLife={version:1,bond:3};w.state.chronicle.step=4;w.state.chronicle.choices={repair:0,destiny:0,approach:'battle'};convergeOrigin(w);assert.equal(w.state.livingArmory.gearByHero[id].mainhand.id,item.id);assert.equal(w.state.trailLife.bond,3);assert.ok(validateLivingArmory(w.state));
});
test('actual campaign victories and level changes preserve gear deltas without erasing other progression',()=>{
 const worn=new World(data),bare=new World(data);worn.state.mode='field';bare.state.mode='field';const item=award(worn.state);item.requiredLevel=1;transactLivingArmory(worn.state,0,'equip',[item.id]);
 for(let n=1;n<=5;n++){
  for(const w of [worn,bare]){w.state.mode='field';w.state.chapter=n;w.currentBattle={mission:w.data.campaign.missions[n-1],object:{type:'boss',bit:7},scene:w.scene.location};w.winBattle();w.state.mode='field';}
  const bonus=livingArmoryStats(worn.state,0);for(const key of ['power','magic','maxHp','maxMp','speed'])assert.ok(Math.abs(worn.state.heroes[0][key]-bare.state.heroes[0][key]-bonus[key])<1e-8,key+' at '+n);
 }
});
test('unique powers execute bounded real battle events, retain stronger shields, and do not recurse',()=>{
 const s=state(),reprise=award(s),stone=award(s,'offhand',1),ring=award(s,'ring',2),clock=award(s,'relic',3),hands=award(s,'hands',4);reprise.effect='harmonic-reprise';stone.effect='unbroken-oath';ring.effect='seven-waves';clock.effect='backwash';hands.effect='founders-touch';
 for(const item of [reprise,stone,ring,clock,hands])transactLivingArmory(s,0,'equip',[item.id]);const h=s.heroes[0];h.status={};h.x=1;h.y=1;const target={hp:1000,armor:80,x:3,y:3,status:{},shell:{material:'mineral',integrity:.9}};const events=[],echoes=[];const b={time:1,heroes:[h],context:{encounterSerial:4,tags:['resonant']},event:e=>events.push(e),damage:(...args)=>echoes.push(args)};
 prepareLivingArmoryBattle(b);assert.ok(h.status.shield>0);h.status.shield=200;livingArmoryGuard(b,h);assert.equal(h.status.shield,200,'another system’s stronger barrier is preserved');h.status.guard=7;h.status.shield=0;
 livingArmoryAfterHit(b,h,target,100,{core:'flame',physical:true});assert.ok(Math.abs(target.shell.integrity-.78)<1e-8);livingArmoryAfterHit(b,h,target,80,{core:'tide'});assert.equal(echoes.length,1);assert.equal(echoes[0][2],25.6);assert.equal(echoes[0][3].secondary,true);
 livingArmoryAfterHit(b,h,target,80,{core:'flame',secondary:true});assert.equal(echoes.length,1);livingArmoryAfterHit(b,target,h,20,{core:'frost'});assert.ok(h.status.shield>0);assert.ok(events.length>=4);
});
test('rooted boots and remembered sigils use actual worn ownership and preserve only earned memory',()=>{
 const s=state(),boots=award(s,'feet'),sigil=award(s,'sigil',1);boots.effect='living-stride';sigil.effect='second-timeline';transactLivingArmory(s,0,'equip',[boots.id]);transactLivingArmory(s,0,'equip',[sigil.id]);assert.deepEqual(livingArmoryFieldTraits(s,{rooted:true}),{grip:.16,patrolDetectionMultiplier:.92});assert.equal(livingArmoryFieldTraits(s,{}).grip,0);assert.equal(livingArmoryFieldTraits(s,{rooted:0,organic:.06}).grip,0);const w=world(s);claimLivingArmoryVictory(w,battle());const legacy=armoryLegacy(s);assert.equal(legacy.memories.length,1);const next=state();restoreArmoryLegacy(next,legacy);assert.equal(next.livingArmory.memories[0].name,'Orchard moth');assert.equal(next.livingArmory.snapshot.placements.length,0);
});
test('leech recovers bounded health from actual primary damage, excluding shields, overkill and secondary hits',()=>{
 const s=state(),item=award(s,'ring');item.stats={leech:1000};transactLivingArmory(s,0,'equip',[item.id]);const h=s.heroes[0],enemy=makeEnemy('predator',6);h.x=1;h.y=1;enemy.x=3;enemy.y=1;const b=new Battle({heroes:[h],enemies:[enemy],context:{tutorial:true,tags:[]}});h.hp=50;enemy.hp=50;
 const hit=b.damage(h,enemy,100000,{core:'earth'});assert.equal(hit.damage,50);assert.equal(h.hp,54,'recovery uses 50 actual damage, not the overkill amount');assert.ok(b.events.some(e=>e.type==='heal'&&e.armory&&e.amount===4));
 enemy.hp=50;enemy.status.shield=100000;b.damage(h,enemy,100,{core:'earth'});assert.equal(h.hp,54,'absorbed damage grants no recovery');enemy.status={};b.damage(h,enemy,20,{core:'earth',secondary:true});assert.equal(h.hp,54);enemy.hp=50;b.damage(h,enemy,20,{core:'earth',dot:true});assert.equal(h.hp,54);h.hp=0;livingArmoryAfterHit(b,h,enemy,100,{core:'earth'});assert.equal(h.hp,0,'leech cannot resurrect a defeated attacker');
});
test('campaign UI opens empty, preserves valid selection, and survives an empty bearer and last-item salvage',async()=>{
 const s=state();ensureLivingArmory(s);const controller=createCampaignArmoryController({getState:()=>s}),nodes=new Map(),old={document:globalThis.document,window:globalThis.window};let closes=0;
 const node=id=>{if(nodes.has(id))return nodes.get(id);const classes=new Set(),handlers={};const element={id,innerHTML:'',textContent:'',value:'',selectedOptions:[],classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){if(on)classes.add(k);else classes.delete(k);}},setAttribute(){},replaceChildren(){this.innerHTML='';},addEventListener(type,fn){(handlers[type]??=[]).push(fn);},fire(type,target=this){for(const fn of handlers[type]||[])fn({target});}};nodes.set(id,element);return element;};
 globalThis.document={getElementById:node,querySelectorAll:()=>[],addEventListener(){},body:node('body')};globalThis.window={parent:{__aaArmoryHost:{controller,close:()=>closes++}}};
 try{
  const original=JSON.stringify(s);await import('../living-armory/src/ui.mjs?empty-selection-regression');assert.equal(JSON.stringify(s),original);assert.match(node('inspector').innerHTML,/Choose an artifact/);
  const item=award(s,'ring',400);node('bagGrid').fire('click',{closest:selector=>selector==='[data-id]'?{dataset:{id:item.id}}:null});assert.match(node('inspector').innerHTML,new RegExp(item.name));
  node('inspector').fire('click',{closest:selector=>selector==='#equipAction'?{}:null});assert.equal(s.livingArmory.gearByHero[0].ring1.id,item.id);assert.match(node('inspector').innerHTML,/UNEQUIP THIS ARTIFACT/);
  node('swapCharacter').fire('click');assert.equal(controller.selectedHero,1);assert.match(node('inspector').innerHTML,/Choose an artifact/);
  const empty=JSON.stringify(s);node('upgradeBtn').fire('click');assert.match(node('toast').textContent,/Select an item/);assert.equal(JSON.stringify(s),empty);
  const stored=award(s,'feet',401);node('bagGrid').fire('click',{closest:selector=>selector==='[data-id]'?{dataset:{id:stored.id}}:null});node('salvageBtn').fire('click');assert.match(node('inspector').innerHTML,/Choose an artifact/);assert.equal(controller.get(stored.id),null);assert.equal(s.livingArmory.gearByHero[0].ring1.id,item.id);assert.ok(validateLivingArmory(s));
  node('closeArmory').fire('click');assert.equal(closes,1);
 }finally{globalThis.document=old.document;globalThis.window=old.window;}
});
