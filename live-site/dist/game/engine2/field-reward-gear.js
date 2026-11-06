import {CREW} from './mako.js?v=5.24.0';
import {BOSS_GEAR,GEAR_ERAS,equipBossGear,gearEra,syncBossGear} from './boss-gear.js?v=5.24.0';
import {EQUIP_SLOTS,SLOT_GROUPS,SLOT_LABELS,RARITY_LABELS,STAT_LABELS} from './living-armory/src/catalog.mjs?v=5.24.0';
import {Armory} from './living-armory/src/armory.mjs?v=5.33.0';
import {transactLivingArmory,syncLivingArmoryStats,livingArmoryDamage} from './living-armory/campaign.js?v=5.33.0';

const clone=value=>JSON.parse(JSON.stringify(value));
const number=value=>Number.isFinite(value)?value:0;
const stats=[['power','Power'],['magic','Magic'],['maxHp','Max HP'],['maxMp','Max MP'],['speed','Speed']];
const slotName=slot=>slot==='ring1'?'Ring 1':slot==='ring2'?'Ring 2':SLOT_LABELS[slot]||({weapon:'Guardian weapon',mantle:'Guardian mantle',focus:'Guardian focus'})[slot]||slot;
const heroName=(s,id)=>s.heroes?.[id]?.name||CREW[id]?.name||'Traveller';
const heroIds=s=>[...new Set(s.recruited||[])].filter(id=>Number.isInteger(id)&&id>=0&&id<7&&s.heroes?.[id]);
const signed=value=>(value>0?'+':'')+Number(value.toFixed(4));
const choiceId=(kind,itemId,heroId,slot)=>[kind,itemId,heroId,slot].join(':');

function ownedArmoryItems(s){
 const p=s.livingArmory,items=[];
 for(const entry of p?.snapshot?.placements||[])if(entry?.item?.id)items.push({item:entry.item,where:entry.container});
 for(const item of p?.snapshot?.overflow||[])if(item?.id)items.push({item,where:'overflow'});
 for(const [heroId,gear]of Object.entries(p?.gearByHero||{}))for(const [slot,item]of Object.entries(gear||{}))if(item?.id)items.push({item,where:'equipped',heroId:Number(heroId),slot});
 return items;
}

/** A read-only inventory fingerprint. In particular, a pre-battle snapshot must
 * not initialize the Armory or turn a discovered guardian pattern into gear. */
export function captureRewardGear(s={}){
 return {armoryIds:ownedArmoryItems(s).map(entry=>entry.item.id),guardianIds:[...(s.bossGear?.owned||[])],
  forge:Object.fromEntries(['scrap','essence','starshard'].map(key=>[key,number(s.livingArmory?.snapshot?.resources?.[key])]))};
}

function armoryDescriptor(entry){
 const item=entry.item,model=new Armory({seedStarter:false}),attributes=Object.entries(model.effectiveItemStats(item)).filter(([,value])=>Number.isFinite(value)&&value!==0).map(([key,value])=>({key,label:STAT_LABELS[key]||key,value,text:(STAT_LABELS[key]||key)+' '+signed(value)})).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value));
 return {kind:'armory',itemId:item.id,name:item.name,icon:item.icon,rarity:item.rarity,rarityLabel:RARITY_LABELS[item.rarity]||'',
  group:item.slot,slotLabel:item.slot==='ring'?'Ring':slotName(item.slot),requiredLevel:Math.max(1,number(item.requiredLevel)),effectText:item.effectText||'',effect:item.effect||null,attributes};
}
function guardianDescriptor(item){
 return {kind:'guardian',itemId:item.id,name:item.name,icon:null,rarityLabel:'Guardian equipment',group:item.slot,slotLabel:slotName(item.slot),requiredLevel:1,
  effectText:item.rule?.detail||'',effect:item.rule?item.id:null};
}

function itemLocation(s,item){
 if(item.kind==='armory'){
  const found=ownedArmoryItems(s).find(entry=>entry.item.id===item.itemId);
  if(!found)return {where:'missing',status:'No longer in inventory',item:null};
  const status=found.where==='equipped'?'Equipped by '+heroName(s,found.heroId)+' · '+slotName(found.slot):found.where==='overflow'?'Overflow · kept safely until equipped or collected':found.where==='stash'?'Stored in the Armory stash':'Stored in the Armory bag';
  return {...found,status};
 }
 const found=BOSS_GEAR.find(entry=>entry.id===item.itemId);
 if(!found||!s.bossGear?.owned?.includes(item.itemId))return {where:'missing',status:'No longer owned',item:null};
 for(const h of s.heroes||[])for(const [slot,worn]of Object.entries(h.guardianGear||{}))if(worn?.id===item.itemId)return {item:found,where:'equipped',heroId:h.id,slot,status:'Equipped by '+(h.name||heroName(s,h.id))+' · '+slotName(slot)};
 return {item:found,where:'guardian',status:'Recovered guardian equipment'};
}

// Comparisons run the same transaction as the real equipment button on an
// isolated equipment state. Neither campaign ledgers nor the source heroes are
// touched. This also applies host stat caps and preserves other gear systems.
function comparisonState(s){
 const copy=clone({mode:'field',gold:number(s.gold),chapter:s.chapter,timeline:s.timeline,bosses:s.bosses||[],bossGear:s.bossGear,
  party:s.party||[],recruited:heroIds(s),heroes:s.heroes||[],livingArmory:s.livingArmory});
 if(copy.bossGear)syncBossGear(copy);
 syncLivingArmoryStats(copy);
 return copy;
}
function wornAt(s,kind,heroId,slot){return kind==='armory'?s.livingArmory?.gearByHero?.[heroId]?.[slot]||null:s.heroes?.[heroId]?.guardianGear?.[slot]||null;}
function wornName(kind,item){return !item?'Empty':kind==='armory'?item.name:BOSS_GEAR.find(g=>g.id===item.id)?.name||item.id;}
function wornEffect(kind,item){return !item?null:kind==='armory'?item.effect:BOSS_GEAR.find(g=>g.id===item.id)?.rule?item.id:null;}
function groundContext(world){
 const surface=world?.reconciledGround?.sample?.(number(world.state?.x),number(world.state?.y));
 return {tags:[...(world?.scene?.tags||[])],...(surface?{ground:clone(surface)}:{})};
}
function protection(s,id,context,guard=false){
 const h={...s.heroes[id],x:0,y:0,status:guard?{guard:1}:{}},foe={x:2,y:0,armor:0,status:{}};
 return 100-livingArmoryDamage({heroes:[h],context},foe,h,100,{core:'earth',physical:true});
}
const hitFamilies=[['earth','Strike / Earth'],['flame','Flame'],['tide','Tide / Frost'],['gale','Gale / Volt / Gravity'],['shade','Shade']];
function outgoingHit(s,id,context,core,armored){
 const h={...s.heroes[id],x:0,y:0,status:{}},foe={x:2,y:0,armor:armored?1:0,status:{}};
 return livingArmoryDamage({heroes:[h],context},h,foe,100,{core,physical:core==='earth'});
}
function armoryStats(s,id){const a=new Armory({seedStarter:false,level:s.heroes[id].level||1});a.state.gear=s.livingArmory?.gearByHero?.[id]||{};return a.stats();}
function conditionalComparison(base,next,id,context){
 const beforeStats=armoryStats(base,id),afterStats=armoryStats(next,id),traits=Object.entries(afterStats).flatMap(([key,value])=>{
  const delta=number(value)-number(beforeStats[key]);return delta?[{key,label:STAT_LABELS[key]||key,delta,text:(STAT_LABELS[key]||key)+' '+signed(delta)}]:[];
 });
 const rows=[],ordinary=new Map();
 for(const armored of [false,true]){
  const groups=new Map();
  for(const [core,label]of hitFamilies){
   const before=outgoingHit(base,id,context,core,armored),after=outgoingHit(next,id,context,core,armored),delta=Number(((after/before-1)*100).toFixed(4));
   if(!armored)ordinary.set(core,delta);
   if(Math.abs(delta)<.01||armored&&Math.abs(delta-ordinary.get(core))<.01)continue;
   // Identical changes share one line; an Aether ring can show its stronger
   // Gale/Volt/Gravity gain without repeating four equal Precision gains.
   const key=delta.toFixed(2),group=groups.get(key)||{delta,cores:[],labels:[]};group.cores.push(core);group.labels.push(label);groups.set(key,group);
  }
  for(const group of groups.values()){
   const label=group.cores.length===5?'All direct hits':group.cores.length>2?'Other direct hits':group.labels.join(' / ');
   rows.push({key:(armored?'armored:':'hit:')+group.cores.join(','),delta:group.delta,cores:group.cores,armored,
    text:label+(armored?' against armor':'')+' '+signed(Number(group.delta.toFixed(2)))+'% damage here',detail:'Applies to '+group.labels.join(', ')+'. This is the change in the Armory’s actual direct-hit multiplier before hit rounding; it excludes separate Power and Magic changes.'});
  }
 }
 const plain=protection(next,id,context)-protection(base,id,context),guarded=protection(next,id,context,true)-protection(base,id,context,true);
 if(Math.abs(guarded-plain)>=.01)rows.push({key:'guard',delta:Number(guarded.toFixed(4)),text:'While guarding: protection '+signed(Number(guarded.toFixed(2)))+' percentage points here',detail:'The Armory’s total direct Earth-hit reduction while guarding on the current ground, including its campaign caps.'});
 const leechBefore=Math.min(.08,Math.max(0,beforeStats.leech/250)),leechAfter=Math.min(.08,Math.max(0,afterStats.leech/250));
 if(Math.abs(leechAfter-leechBefore)>=.0001)rows.push({key:'leech',delta:(leechAfter-leechBefore)*100,text:'Leech '+signed(Number(((leechAfter-leechBefore)*100).toFixed(2)))+' percentage points of direct damage while injured',detail:'Recovery uses actual damage removed, rounds down, and is capped per hit at 25 HP or 3% max HP, whichever is smaller. It never revives a fallen bearer.'});
 const lead=base.party.find(heroId=>base.recruited.includes(heroId))??base.recruited[0];
 if(id===lead){const before=Math.min(.23,Math.max(0,beforeStats.discovery/400)),after=Math.min(.23,Math.max(0,afterStats.discovery/400));if(Math.abs(after-before)>=.0001)rows.push({key:'discovery',delta:(after-before)*100,text:'Bonus artifact-roll chance '+signed(Number(((after-before)*100).toFixed(2)))+' percentage points while leading',detail:'Discovery contributes to the existing encounter drop roll, capped at +23 percentage points before the overall 95% chance cap. It does not guarantee a drop.'});}
 const gains=rows.filter(row=>row.delta>0).sort((a,b)=>b.delta-a.delta),losses=rows.filter(row=>row.delta<0).sort((a,b)=>a.delta-b.delta);
 const highlights=losses.length?[...gains.slice(0,2),losses[0]]:gains.slice(0,3);
 return {rows,highlights,traits};
}
const failureText={level:'This traveller needs a higher level.',battle:'Equip between encounters.',missing:'This item is no longer available.',incompatible:'Choose a compatible equipment slot.',changed:'That equipment slot changed. Review its current comparison.',hero:'Choose a recruited traveller.','not-in-inventory':'This item is already equipped or no longer in storage.'};

function comparison(world,base,item,location,id,slot,context){
 const s=world.state,h=base.heroes[id],old=wornAt(base,item.kind,id,slot),key=choiceId(item.kind,item.itemId,id,slot);
 const common={id:key,kind:item.kind,itemId:item.itemId,heroId:id,heroName:heroName(s,id),slot,slotLabel:slotName(slot),
  replacesId:old?.id||null,replacesName:wornName(item.kind,old),era:item.kind==='guardian'?gearEra(s):null,
  effectText:item.effectText,lostEffect:!!wornEffect(item.kind,old)&&wornEffect(item.kind,old)!==item.effect,
  lostEffectText:item.kind==='armory'?(old?.effectText||''):(BOSS_GEAR.find(g=>g.id===old?.id)?.rule?.detail||''),deltas:[],conditional:[],conditionalHighlights:[],traitDeltas:[]};
 if(location.where==='equipped'||location.where==='missing')return {...common,ok:false,reason:location.status};
 const copy=clone(base),result=item.kind==='armory'?transactLivingArmory(copy,id,'equip',[item.itemId,slot]):{ok:equipBossGear(copy,id,item.itemId,common.era)};
 if(!result?.ok)return {...common,ok:false,reason:failureText[result?.reason]||'This item cannot be equipped here.'};
 const next=copy.heroes[id],deltas=stats.flatMap(([key,label])=>{
  const before=number(h[key]),after=number(next[key]),delta=Number((after-before).toFixed(6));
  return delta?[{key,label,before,after,delta,text:label+' '+signed(delta)}]:[];
 });
 // Armor and ward can matter before rounding produces a whole host stat.
 // Label this measured, terrain-dependent contribution separately from stats.
 const protectionBefore=protection(base,id,context),protectionAfter=protection(copy,id,context),protectionDelta=Number((protectionAfter-protectionBefore).toFixed(4));
 const protectionText=Math.abs(protectionDelta)>=.01?'Direct-hit protection '+signed(Number(protectionDelta.toFixed(2)))+' percentage points here':'';
 const conditional=item.kind==='armory'?conditionalComparison(base,copy,id,context):{rows:[],highlights:[],traits:[]};
 const hpLost=Math.max(0,number(h.hp)-number(next.hp)),mpLost=Math.max(0,number(h.mp)-number(next.mp));
 const gains=deltas.filter(d=>d.delta>0),losses=deltas.filter(d=>d.delta<0),clear=gains.length>0||protectionDelta>=.01||conditional.rows.some(row=>row.delta>0);
 const hasTradeoff=losses.length>0||protectionDelta<-.01||common.lostEffect||conditional.rows.some(row=>row.delta<0)||conditional.traits.some(row=>row.delta<0);
 const reason=(old?'Replaces '+common.replacesName+'.':'Fills '+common.heroName+'’s empty '+common.slotLabel.toLowerCase()+' slot.')+' '+
  (deltas.length?deltas.map(d=>d.text).join(' · ')+'.':conditional.highlights.length?conditional.highlights.map(row=>row.text).join(' · ')+'.':protectionText?protectionText+'.':item.effectText?'Adds this item’s special trait.':'Its artifact traits are shown below; no measured headline-stat or direct-hit change here.');
 return {...common,ok:true,deltas,protectionDelta,protectionText,hpLost,mpLost,hasTradeoff,clearImprovement:clear&&!hasTradeoff,
  conditional:conditional.rows,conditionalHighlights:conditional.highlights,traitDeltas:conditional.traits,
  reason,inParty:(s.party||[]).includes(id),largestRelativeGain:Math.max(0,...gains.map(d=>d.delta/Math.max(1,d.before)),...conditional.rows.map(row=>row.delta/100),protectionDelta/100)};
}

function recommendation(choices){
 // First prefer an active crew member and a gain without a listed loss. Within
 // that group choose the largest single proportional stat improvement. There
 // is no blended item-power score: every gain and loss remains visible.
 const usable=choices.filter(c=>c.ok&&(c.clearImprovement||c.effectText&&!c.hasTradeoff));
 usable.sort((a,b)=>Number(b.inParty)-Number(a.inParty)||Number(b.clearImprovement)-Number(a.clearImprovement)||b.largestRelativeGain-a.largestRelativeGain||a.heroId-b.heroId||a.id.localeCompare(b.id));
 return usable[0]?.id||null;
}

/** Build the earned-item section once, after canonical victory settlement. */
export function fieldRewardGear(world,before={}){
 const s=world?.state||{},prior=new Set(before.armoryIds||[]),guardians=new Set(before.guardianIds||[]);
 const items=ownedArmoryItems(s).filter(entry=>!prior.has(entry.item.id)).map(armoryDescriptor);
 for(const id of s.bossGear?.owned||[])if(!guardians.has(id)){const item=BOSS_GEAR.find(g=>g.id===id);if(item)items.push(guardianDescriptor(item));}
 return refreshFieldRewardGear(world,{items});
}

/** Refreshing an old receipt changes only its comparisons/location badges.
 * Forging, salvaging or equipping never rewrites what the encounter awarded. */
export function refreshFieldRewardGear(world,gear={}){
 const s=world?.state||{},items=(gear.items||[]).map(item=>({...item}));
 if(!items.length)return {items:[],choices:[],recommendedId:null};
 const base=comparisonState(s),context=groundContext(world),choices=[];
 for(const item of items){
  const location=itemLocation(s,item);item.where=location.where;item.status=location.status;item.equippedBy=location.heroId??null;
  if(item.kind==='armory'&&location.item)item.attributes=armoryDescriptor(location).attributes;
  const slots=item.kind==='armory'?EQUIP_SLOTS.filter(slot=>SLOT_GROUPS[slot]===item.group):[item.group];
  for(const id of heroIds(s))for(const slot of slots)choices.push(comparison(world,base,item,location,id,slot,context));
 }
 return {items,choices,recommendedId:recommendation(choices)};
}

/** The receipt is only another entrance to the canonical equipment operation.
 * Stale selections cannot overwrite a newly chosen slot or re-grant an item. */
export function equipFieldReward(world,choice){
 const s=world?.state;
 const fail=reason=>({ok:false,reason,message:failureText[reason]||'That equipment choice is no longer available.'});
 if(!s||s.mode!=='field')return fail('battle');
 if(!choice||!heroIds(s).includes(choice.heroId))return fail('hero');
 const {kind,itemId,heroId,slot}=choice;
 if(!['armory','guardian'].includes(kind)||typeof itemId!=='string')return fail('missing');
 const item=kind==='armory'?ownedArmoryItems(s).find(entry=>entry.item.id===itemId)?.item:BOSS_GEAR.find(g=>g.id===itemId&&s.bossGear?.owned?.includes(itemId));
 if(!item)return fail('missing');
 if(kind==='armory'?!EQUIP_SLOTS.includes(slot)||SLOT_GROUPS[slot]!==item.slot:slot!==item.slot)return fail('incompatible');
 if(!Object.hasOwn(choice,'replacesId')||(wornAt(s,kind,heroId,slot)?.id||null)!==choice.replacesId)return fail('changed');
 if(kind==='guardian'&&!GEAR_ERAS.includes(choice.era))return fail('incompatible');
 const result=kind==='armory'?transactLivingArmory(s,heroId,'equip',[itemId,slot]):{ok:equipBossGear(s,heroId,itemId,choice.era)};
 if(!result?.ok)return fail(result?.reason||'missing');
 return {ok:true,kind,itemId,heroId,slot,name:item.name,heroName:heroName(s,heroId),message:heroName(s,heroId)+' equipped '+item.name+' · '+slotName(slot)+'.'};
}
