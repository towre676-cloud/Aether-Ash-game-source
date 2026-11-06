import {Armory,rollItem,hash32} from './src/armory.mjs?v=5.33.0';
import {EQUIP_SLOTS,EQUIPMENT_BASES,UNIQUES} from './src/catalog.mjs?v=5.21.0';

// The campaign owns this state, its credits, and every award. The recovered
// Armory is a transaction implementation, never a second save or loot owner.
const clone=value=>JSON.parse(JSON.stringify(value));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const emptyGear=()=>Object.fromEntries(EQUIP_SLOTS.map(slot=>[slot,null]));
const validHero=(s,id)=>Number.isInteger(id)&&s.heroes?.[id]&&s.recruited?.includes(id);
const heroId=s=>s.party?.find(id=>validHero(s,id))??s.recruited?.[0]??0;
const timeline=s=>String(s.timeline?.id||('journey-'+(s.chronicle?.cycle||0)+'-'+(s.chronicle?.originId||'main'))).slice(0,160);
const snapshotItems=s=>[...s.placements.map(p=>p.item),...s.overflow,...Object.values(s.gear).filter(Boolean)];
const modelCache=new WeakMap();

function freshSnapshot(s){
 const a=new Armory({seedStarter:false,seed:'aa-campaign-armory-v3',timeline:timeline(s),level:1});
 a.state.coins=0;a.state.resources={scrap:0,essence:0,starshard:0};
 return a.snapshot();
}

export function ensureLivingArmory(s){
 if(!s.livingArmory)s.livingArmory={version:1,revision:0,snapshot:freshSnapshot(s),gearByHero:{},loadoutsByHero:{},seenEnemies:{},discoveries:[],lastReward:null};
 return s.livingArmory;
}

function openModel(s,id=heroId(s)){
 if(!validHero(s,id))throw Error('Choose a recruited traveller.');
 const p=ensureLivingArmory(s),h=s.heroes[id],snapshot=clone(p.snapshot);
 snapshot.coins=s.gold;snapshot.level=clamp(Math.floor(h.level||1),1,99);snapshot.character=h.name;
 snapshot.gear=clone(p.gearByHero[id]||emptyGear());snapshot.loadouts=clone(p.loadoutsByHero[id]||[null,null,null]);
 const a=new Armory({seedStarter:false});a.load(snapshot);return a;
}

function commitModel(s,id,a){
 const p=ensureLivingArmory(s),snapshot=a.snapshot();
 p.gearByHero[id]=snapshot.gear;p.loadoutsByHero[id]=snapshot.loadouts;
 snapshot.gear=emptyGear();snapshot.loadouts=[null,null,null];
 s.gold=Math.max(0,snapshot.coins);snapshot.coins=0;p.snapshot=snapshot;p.revision=(p.revision||0)+1;
 for(const item of snapshotItems(a.state))if(!p.discoveries.includes(item.baseId))p.discoveries.push(item.baseId);
}

export function validateLivingArmory(s){
 const p=s.livingArmory;if(p==null)return true;
 if(p.version!==1||!p.snapshot||!p.gearByHero||Array.isArray(p.gearByHero)||!p.loadoutsByHero||!p.seenEnemies||!Array.isArray(p.discoveries))throw Error('The saved armory is incomplete.');
 const a=new Armory({seedStarter:false});a.load(p.snapshot);
 if(Object.values(a.state.gear).some(Boolean))throw Error('The shared armory contains unassigned equipped items.');
 const r=a.state.resources;
 if(!['scrap','essence','starshard'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0&&r[k]<=1e9)||!Number.isSafeInteger(a.state.pity)||a.state.pity<0||!Number.isSafeInteger(a.state.nextAction)||a.state.nextAction<0)throw Error('The saved forge materials are invalid.');
 const ids=new Set(snapshotItems(a.state).map(i=>i.id));
 for(const [key,gear]of Object.entries(p.gearByHero)){
  if(!/^\d$/.test(key)||Number(key)>6||!gear||Array.isArray(gear))throw Error('The saved bearer is invalid.');
  const local={...clone(p.snapshot),placements:[],overflow:[],gear,loadouts:p.loadoutsByHero[key]||[null,null,null]};
  const check=new Armory({seedStarter:false});check.load(local);
  for(const item of Object.values(gear).filter(Boolean)){if(ids.has(item.id))throw Error('An artifact is owned in two places.');ids.add(item.id);}
 }
 for(const h of s.heroes||[])if(h.livingArmoryBonuses&&Object.values(h.livingArmoryBonuses).some(v=>!Number.isFinite(v)||v<0||v>250))throw Error('The saved artifact contribution is invalid.');
 if(p.snapshot.claimedEvents&&Object.entries(p.snapshot.claimedEvents).some(([key,value])=>key.length>300||!value||typeof value!=='object'))throw Error('The saved artifact reward ledger is invalid.');
 if(p.memories!==undefined&&(!Array.isArray(p.memories)||p.memories.length>64||p.memories.some(m=>!m||typeof m.name!=='string'||typeof m.eventId!=='string'||typeof m.timeline!=='string')))throw Error('The saved artifact memories are invalid.');
 return true;
}

export function livingArmoryStats(s,id=heroId(s)){
 const a=openModel(s,id),worn=a.stats(),bare=a.stats(emptyGear());
 const delta=Object.fromEntries(Object.keys(worn).map(key=>[key,worn[key]-(bare[key]||0)]));
 const elements=['ember','tide','aether','verdant','echo','stone'].reduce((n,k)=>n+(delta[k]||0),0);
 return {power:Math.min(32,Math.floor((delta.attack||0)*.16+(delta.precision||0)*.025)),
  magic:Math.min(32,Math.floor((delta.focus||0)*.18+(delta.resonance||0)*.07+elements*.025)),
  maxHp:Math.min(220,Math.floor((delta.vigor||0)*2+(delta.armor||0)*.2)),
  maxMp:Math.min(38,Math.floor((delta.ward||0)*.12+(delta.focus||0)*.12)),
  speed:Math.min(.1,(delta.haste||0)*.0018)};
}

export function stripLivingArmoryStats(s){
 for(const h of s.heroes||[]){for(const [key,value]of Object.entries(h.livingArmoryBonuses||{}))if(Number.isFinite(value)&&Number.isFinite(h[key]))h[key]-=value;h.livingArmoryBonuses={};h.livingArmoryGear=null;modelCache.delete(h);}
}

export function syncLivingArmoryStats(s){
 stripLivingArmoryStats(s);if(!s.livingArmory)return;
 for(const id of s.recruited||[]){const h=s.heroes[id],bonuses=livingArmoryStats(s,id);for(const [key,value]of Object.entries(bonuses))h[key]+=value;
  h.livingArmoryBonuses=bonuses;h.livingArmoryGear=clone(s.livingArmory.gearByHero[id]||emptyGear());
  h.hp=Math.min(h.hp,h.maxHp);h.mp=Math.min(h.mp,h.maxMp);}
}

const ACTIONS=new Set(['equip','unequip','move','sort','setLocked','salvage','upgrade','socketRune','extractRune','craftItem','imprintItem','saveLoadout','equipLoadout']);
export function transactLivingArmory(s,id,action,args=[]){
 if(s.mode==='battle')return {ok:false,reason:'battle'};
 if(!validHero(s,id)||!ACTIONS.has(action))return {ok:false,reason:'action'};
 const a=openModel(s,id),result=a[action](...args);
 if(result===true||result?.ok){commitModel(s,id,a);syncLivingArmoryStats(s);}
 return result;
}

export const armoryElement=core=>({flame:'ember',earth:'stone',tide:'tide',frost:'tide',gale:'aether',volt:'aether',gravity:'aether',shade:'echo',ward:'echo',mend:'verdant'})[core]||(['ember','stone','aether','echo','verdant'].includes(core)?core:'stone');
function regionFor(world,b){const tags=b?.context?.tags||[];const label=String(world.scene?.key||'')+' '+String(world.scene?.interior||'');
 if(/bell/.test(label))return 'bellrun';if(tags.includes('wet')||tags.includes('cold'))return 'water';if(tags.includes('living'))return 'glade';if(tags.includes('heat')||tags.includes('arid'))return 'ash';if(tags.includes('resonant'))return 'hollow';if(tags.includes('conductive'))return 'aether';return 'clay';}
function bodyFor(enemy){const text=[enemy.species,enemy.name,enemy.role,enemy.trait].join(' ').toLowerCase();
 if(/wing|moth|bird|raptor|harrier/.test(text))return 'wings';if(/shell|turtle|beetle|mossback/.test(text))return 'shell';if(/antler|stag|horn/.test(text))return 'horns';if(/wraith|ghost|veil|shade/.test(text))return 'veil';if(/choir|choral|cantor|bell/.test(text))return 'choral';if(/glass|prism|crystal/.test(text))return 'prism';if(/guard|construct|kiln|plate/.test(text))return 'plate';return 'sinew';}
function rememberAward(s,id,a,reward,source){
 const p=ensureLivingArmory(s);a.state.claimedEvents[reward.eventId]={source,enemyId:reward.enemyId};
 a.state.defeated[reward.enemyId]=(a.state.defeated[reward.enemyId]||0)+1;
 for(const key of ['scrap','essence','starshard'])a.state.resources[key]+=reward.resources[key]||0;
 const items=[];for(const item of reward.equipment){const granted=a.grantItem(item);if(!granted.ok)continue;items.push({...item,container:granted.container});a.state.discovered[item.baseId]=(a.state.discovered[item.baseId]||0)+1;}
 a.state.pity=items.some(i=>['epic','legendary','mythic'].includes(i.rarity))?0:a.state.pity+1;
 const history={eventId:reward.eventId,enemy:reward.enemy,region:reward.region,items:items.map(i=>i.id),resources:{...reward.resources,coins:0}};
 a.state.history.unshift(history);a.state.history=a.state.history.slice(0,40);commitModel(s,id,a);
 p.lastReward={...history,itemNames:items.map(i=>i.name),source};
 p.seenEnemies[reward.enemyId]={id:reward.enemyId,name:reward.enemy,region:reward.region,body:reward.body||'sinew',defeats:a.state.defeated[reward.enemyId],boss:!!reward.boss,elite:!!reward.elite};
 return {ok:true,items,resources:history.resources,eventId:reward.eventId};
}

export function claimLivingArmoryVictory(world,battle){
 const s=world.state,o=world.currentBattle?.object;if(!o||battle?.ended!=='win'||['practice','rival'].includes(o.type)||o.rivalId||battle.context?.friendly)return {ok:false,reason:'not-hostile-victory'};
 const serial=battle.context?.encounterSerial;if(!Number.isSafeInteger(serial)||serial<1)return {ok:false,reason:'missing-encounter-identity'};
 const id=heroId(s),a=openModel(s,id),eventId=timeline(s)+':encounter:'+serial+':'+s.scene+':'+o.type;
 if(a.state.claimedEvents[eventId])return {ok:false,reason:'already-claimed'};
 const defeated=battle.enemies.filter(e=>e.hp<=0&&!e.withdrawn),enemy=defeated.find(e=>e.boss)||defeated[0];
 if(!enemy)return {ok:false,reason:'no-defeated-creature'};
 const region=regionFor(world,battle),body=bodyFor(enemy),enemyId=String(enemy.species||('chapter-'+battle.chapter+'-'+enemy.role)),level=Math.max(1,Math.min(99,s.heroes[id].level+Math.floor((battle.chapter||1)/4)));
 const spec={id:enemyId,name:enemy.name,body,region,level,signature:armoryElement(enemy.element||o.salvageCore),shielding:clamp(enemy.shell?.integrity*.32||0,0,1),boss:!!enemy.boss,elite:!!o.elite};
 const reward=a.previewEncounter({eventId,enemyId,enemySpec:spec,level,region,boss:spec.boss,elite:spec.elite,difficulty:1+Math.min(2,(s.encore?.cycle||0)*.15)});
 reward.body=body;reward.resources.coins=0;
 // The first genuinely defeated creature supplies one usable piece. Later drops
 // retain the recovered deterministic rarity/anatomy distribution.
 if(!Object.keys(a.state.claimedEvents).length&&!reward.equipment.length)reward.equipment.push(rollItem({seed:a.state.seed,eventId,serial:0,level,region,forceRarity:'uncommon',forceSlot:'mainhand'}));
 // Make the first earned artifact a weapon within the existing loot budget.
 // Discovery history survives salvage; previously claimed events and existing
 // equipment are never rerolled or migrated by this new-claim rule.
 const p=ensureLivingArmory(s),weaponPatterns=new Set([...EQUIPMENT_BASES,...UNIQUES].filter(base=>base.slot==='mainhand').map(base=>base.id));
 const recoveredWeapon=p.discoveries.some(baseId=>weaponPatterns.has(baseId))||snapshotItems(a.state).some(item=>item.slot==='mainhand')||Object.values(p.gearByHero).some(gear=>Object.values(gear).some(item=>item?.slot==='mainhand'));
 if(!recoveredWeapon&&reward.equipment.length&&!reward.equipment.some(item=>item.slot==='mainhand')){
  const first=reward.equipment[0],replacement=rollItem({seed:`${a.state.seed}|${a.state.timeline}`,eventId,serial:0,level:first.level,region,forceRarity:first.rarity,forceSlot:'mainhand'});
  replacement.itemPower=first.itemPower;replacement.value=first.value;
  reward.equipment[0]=replacement;
 }
 const result=rememberAward(s,id,a,reward,'victory');
 if(result.items.length)world.notice('Armory recovered · '+result.items.map(i=>i.name).join(' · ')+' · Open Living Armory in Pause.');
 return result;
}

export function claimLivingArmoryCache(world,o){
 const s=world.state,id=heroId(s),a=openModel(s,id),eventId=timeline(s)+':cache:'+s.scene+':'+String(o.flag_address??world.mission?.flag_address??'')+':'+String(o.bit);
 if(o.type!=='cache'||!Number.isInteger(o.bit)||a.state.claimedEvents[eventId])return {ok:false,reason:'already-claimed'};
 const region=regionFor(world,{context:{tags:world.scene?.tags||[]}}),level=s.heroes[id].level,item=rollItem({seed:a.state.seed,eventId,serial:0,level,region,forceRarity:hash32(eventId)%5===0?'rare':'uncommon'});
 const result=rememberAward(s,id,a,{eventId,enemyId:'cache-'+s.scene+'-'+o.bit,enemy:o.label||'Recovered field cache',body:'cache',region,equipment:[item],resources:{coins:0,scrap:1,essence:0,starshard:0}},'cache');
 if(result.items.length)world.notice('Field cache · '+item.name+' · Stored in Living Armory.');return result;
}

function battleModel(h){
 if(!h?.livingArmoryGear||!Object.values(h.livingArmoryGear).some(Boolean))return null;
 const cached=modelCache.get(h);if(cached?.gear===h.livingArmoryGear&&cached.level===h.level)return cached;
 const a=new Armory({seedStarter:false,level:h.level||1}),bare=new Armory({seedStarter:false,level:h.level||1});a.state.gear=h.livingArmoryGear;
 const record={gear:h.livingArmoryGear,level:h.level,a,bare};modelCache.set(h,record);return record;
}
export function livingArmoryGround(b,caster){
 const tags=b.context?.tags||[],given=b.reconciledGround?.sample(caster?.x||0,caster?.y||0)||b.context?.armoryGround||b.context?.ground||{};
 const flag=(value,fallback,threshold)=>typeof value==='boolean'?value:Number.isFinite(value)?value>=threshold:fallback;
 return {element:armoryElement(given.element||(tags.includes('wet')?'tide':tags.includes('living')?'mend':tags.includes('heat')?'flame':tags.includes('resonant')?'shade':'earth')),
  shielding:Number.isFinite(given.shielding)?given.shielding:tags.includes('shelter')?.55:.25,
  resonance:Number.isFinite(given.resonance)?given.resonance:tags.includes('resonant')?.6:.25,
  traction:Number.isFinite(given.traction)?given.traction:.55,organic:flag(given.organic,tags.includes('living'),.2),rooted:flag(given.rooted,tags.includes('living'),.15),water:flag(given.water,tags.includes('wet'),.15)};
}
function modifiers(record,b,caster,target,options){
 const ground=livingArmoryGround(b,caster),args={attackElement:armoryElement(options.tech?.core||options.core||'earth'),terrainElement:ground.element,
  terrainShielding:ground.shielding,terrainResonance:ground.resonance,environmentGrip:ground.traction,organicTerrain:ground.organic,rootedTerrain:ground.rooted,waterTerrain:ground.water,
  enemyShielding:clamp((target?.shell?.integrity||0)*.32||(target?.armor>0?.35:0),0,.7),harmonicShield:target?.shell?.material==='mineral'||target?.trait==='chorus',longRange:Math.hypot((caster?.x||0)-(target?.x||0),(caster?.y||0)-(target?.y||0))>4};
 return {worn:record.a.combatModifiers(args),bare:record.bare.combatModifiers(args)};
}
export function livingArmoryDamage(b,caster,target,amount,options={}){
 if(options.dot||options.secondary)return amount;
 if(b.heroes.includes(caster)){const r=battleModel(caster);if(r){const m=modifiers(r,b,caster,target,options);amount*=clamp(m.worn.damageFactor/m.bare.damageFactor,1,1.55);}}
 if(b.heroes.includes(target)){const r=battleModel(target);if(r){const m=modifiers(r,b,target,caster,options),protection=clamp(m.worn.protection-m.bare.protection,0,.25),guard=target.status?.guard?clamp(m.worn.guard-m.bare.guard,0,.12):0;amount*=1-clamp(protection+guard,0,.3);}}
 return amount;
}

const hasPower=(h,id)=>Object.values(h?.livingArmoryGear||{}).some(item=>item?.effect===id);
const powerNotice=(b,h,label,target)=>b.event?.({type:'armory-power',actor:h,target,label});
function grantBarrier(h,amount){const cap=Math.min(90,Math.ceil(h.maxHp*.22)),before=h.status.shield||0;h.status.shield=Math.max(before,Math.min(cap,before+Math.max(0,Math.ceil(amount))));}

export function prepareLivingArmoryBattle(b){
 for(const h of b.heroes){h.armoryPowerState={};
  if(hasPower(h,'backwash')&&(b.context?.encounterSerial||0)>0&&b.context.encounterSerial%4===0){grantBarrier(h,h.maxHp*.1);powerNotice(b,h,'A Minute Before the Flood · fourth-encounter Tide barrier');}
 }
}
export function livingArmoryGuard(b,h){
 const record=battleModel(h);if(!record)return;
 if(hasPower(h,'unbroken-oath')){const stats=record.a.stats(),reserve=Math.max(h.status.shield||0,(stats.stone||0)+(stats.block||0))*.25;grantBarrier(h,Math.min(25,reserve));powerNotice(b,h,'The Red Kiln keeps one quarter of its stone guard');}
 if(hasPower(h,'memory-ward')&&livingArmoryGround(b,h).water){grantBarrier(h,Math.min(25,(record.a.stats().tide||0)*.18));powerNotice(b,h,'The remembered crown answers the water');}
}
export function livingArmoryAfterHit(b,caster,target,dealt,options={}){
 if(options.dot||options.secondary||dealt<=0)return;
 const core=armoryElement(options.tech?.core||options.core||'earth');
 if(b.heroes.includes(caster)){
  // Leech uses actual HP removed after shields and overkill, never raw damage.
  // Keep the recovered rune/set stat useful without enabling recursive healing.
  if(caster.hp>0&&!b.heroes.includes(target)){
   const record=battleModel(caster),leech=record?record.a.stats().leech-record.bare.stats().leech:0;
   const healed=Math.min(caster.maxHp-caster.hp,25,Math.ceil(caster.maxHp*.03),Math.floor(dealt*clamp(leech/250,0,.08)));
   if(healed>0){caster.hp+=healed;b.event?.({type:'heal',actor:caster,amount:healed,color:'#9dd3a0',armory:true});}
  }
  if(hasPower(caster,'founders-touch')&&options.physical&&target.hp>0){
   if(target.shell?.material==='mineral'&&target.shell.integrity>0){target.shell.integrity=Math.max(0,target.shell.integrity-.12);powerNotice(b,caster,'Bellfounder · harmonic cohesion −12%',target);}
   else if(target.trait==='chorus'&&target.armor>0){target.armor*=.88;powerNotice(b,caster,'Bellfounder · harmonic defense −12%',target);}
  }
  if(hasPower(caster,'harmonic-reprise')){
   const state=caster.armoryPowerState??={},prior=state.reprise,now=b.time||0;
   if(prior&&prior.until>=now&&prior.element!==core){delete state.reprise;if(target.hp>0){b.damage(caster,target,dealt*.32,{core:options.tech?.core||options.core||'shade',color:'#d7b2f3',secondary:true});powerNotice(b,caster,'The unfinished phrase echoes through a different element',target);}}
   if(livingArmoryGround(b,caster).resonance>=.4)state.reprise={element:core,until:now+12};
  }
 }
 if(b.heroes.includes(target)&&target.hp>0&&target.status?.guard&&core==='tide'&&hasPower(target,'seven-waves')){const record=battleModel(target);grantBarrier(target,Math.min(25,(record?.a.stats().ward||0)*.1));powerNotice(b,target,'The seventh wave returns a tenth of its ward');}
}

export function livingArmoryFieldTraits(s,surface={}){
 const id=heroId(s),gear=s.livingArmory?.gearByHero?.[id]||{},rooted=surface.rooted===true||surface.organic===true||Number(surface.rooted)>=.15||Number(surface.organic)>=.2;
 const active=rooted&&Object.values(gear).some(item=>item?.effect==='living-stride');
 return {grip:active?.16:0,patrolDetectionMultiplier:active?.92:1};
}

export function armoryLegacy(s){
 const p=s?.livingArmory;if(!p)return null;
 const memories=clone(p.memories||[]),remembering=Object.values(p.gearByHero||{}).some(gear=>Object.values(gear).some(item=>item?.effect==='second-timeline'));
 const last=p.snapshot.history[0];if(remembering&&last&&!memories.some(m=>m.timeline===timeline(s)&&m.eventId===last.eventId))memories.push({timeline:timeline(s),eventId:last.eventId,name:last.enemy,region:last.region});
 return {version:1,discoveries:[...new Set(p.discoveries||[])].slice(0,512),memories:memories.slice(-64)};
}
export function restoreArmoryLegacy(s,legacy){if(!legacy||legacy.version!==1||!Array.isArray(legacy.discoveries))return;const allowed=new Set([...EQUIPMENT_BASES,...UNIQUES].map(i=>i.id)),p=ensureLivingArmory(s);p.discoveries=[...new Set(legacy.discoveries)].filter(id=>allowed.has(id)).slice(0,512);p.memories=(Array.isArray(legacy.memories)?legacy.memories:[]).filter(m=>m&&typeof m.name==='string'&&typeof m.eventId==='string'&&typeof m.timeline==='string').slice(-64).map(m=>({name:m.name.slice(0,100),eventId:m.eventId.slice(0,300),timeline:m.timeline.slice(0,160),region:String(m.region||'hollow').slice(0,24)}));}

export function createCampaignArmoryController({getState,onChange=()=>{}}){
 let selected=heroId(getState()),cached=null,quoteSerial=0;const listeners=new Set(),growthQuotes=new Map();
 // Quotes are session-local capabilities, never save data. Ignore movement,
 // clocks and health; invalidate on restored state, bearer, scene or economy.
 const growthFingerprint=s=>JSON.stringify({hero:selected,level:s.heroes[selected]?.level,gold:s.gold,mode:s.mode,scene:s.scene,chapter:s.chapter,timeline:timeline(s),recruited:s.recruited,armory:ensureLivingArmory(s)});
 const read=()=>{const s=getState();if(!validHero(s,selected))selected=heroId(s);const p=ensureLivingArmory(s),key=[selected,p.revision||0,s.gold,s.heroes[selected].level].join(':');if(cached?.state===s&&cached.key===key)return cached.model;const model=openModel(s,selected);cached={state:s,key,model};return model;};
 const emit=(kind,result)=>{onChange(result);for(const fn of listeners)fn({kind},read().state);};
 const controller={get state(){return read().state;},get selectedHero(){return selected;},get campaignBonuses(){return livingArmoryStats(getState(),selected);},
  get heroes(){return getState().recruited.map(id=>({id,name:getState().heroes[id].name}));},
  selectHero(id){if(!validHero(getState(),id))return false;if(selected!==id)growthQuotes.clear();selected=id;emit('character');return true;},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  snapshot:()=>read().snapshot(),lootJournal:()=>Object.values(ensureLivingArmory(getState()).seenEnemies),
  get lastReward(){return ensureLivingArmory(getState()).lastReward;},get memories(){return ensureLivingArmory(getState()).memories||[];},
  weaponGrowthView(itemId=null,options={}){
   read();const s=getState(),view=openModel(s,selected).weaponGrowthView(itemId,options),fingerprint=growthFingerprint(s);
   view.bearer={id:selected,name:s.heroes[selected].name,level:s.heroes[selected].level};
   for(const action of view.actions){
    const {method,args}=action;delete action.method;delete action.args;
    if(s.mode==='battle'){action.enabled=false;action.reason='battle';action.reasonText='Finish the battle before changing your weapon.';}
    action.quote=null;
    if(action.enabled){const token=`weapon-growth-${++quoteSerial}`;growthQuotes.set(token,{state:s,hero:selected,itemId:view.itemId,actionId:action.id,method,args,fingerprint});action.quote=token;}
   }
   while(growthQuotes.size>256)growthQuotes.delete(growthQuotes.keys().next().value);
   view.primaryAction=view.actions.find(action=>action.enabled)||view.actions.find(action=>action.id==='temper')||null;
   return view;
  },
  growWeapon(itemId,actionId,quote){
   const offer=growthQuotes.get(quote);growthQuotes.delete(quote);
   const s=getState();
   if(s.mode==='battle')return {ok:false,reason:'battle'};
   if(!offer||offer.state!==s||offer.hero!==selected||offer.itemId!==itemId||offer.actionId!==actionId||offer.fingerprint!==growthFingerprint(s))return {ok:false,reason:'stale-quote'};
   const result=transactLivingArmory(s,selected,offer.method,offer.args);
   if(result===true||result?.ok){cached=null;growthQuotes.clear();emit(offer.method,result);}
   return result;
  }
 };
 for(const method of ['get','has','stats','compare','setProgress','effectiveItemStats','gearResonance','runeResonance','combatModifiers','effects'])controller[method]=(...args)=>read()[method](...args);
 for(const method of ACTIONS)controller[method]=(...args)=>{const result=transactLivingArmory(getState(),selected,method,args);if(result===true||result?.ok)emit(method,result);return result;};
 return controller;
}
