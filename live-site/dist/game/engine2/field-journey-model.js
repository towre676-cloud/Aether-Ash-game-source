import {availablePoints} from './skill-grid-model.js?v=5.16.0';
import {CORES,CREW,SUPPORTS} from './mako.js?v=5.24.0';
import {ITEMS} from './repertoire.js?v=5.38';
import {captureRewardGear,fieldRewardGear,refreshFieldRewardGear} from './field-reward-gear.js?v=5.33.0';
export {equipFieldReward} from './field-reward-gear.js?v=5.33.0';

const number=n=>Number.isFinite(n)?n:0;
const counts=values=>Object.fromEntries(Object.entries(values||{}).filter(([,n])=>Number.isFinite(n)).map(([id,n])=>[id,n]));
const rank=ap=>ap>=120?3:ap>=35?2:1;
const aidText={
 escort:'Shelter route cleared: future local escorts take a shorter route and gain 12 integrity.',
 regulator:'Regulator bypass fitted: local objectives need one fewer adjustment, down to a minimum of two.',
 supply:'Field stores secured: future local encounters include a spare brace.',
 signal:'Relay quieted: future local objectives gain six seconds.'
};
const goodNames={metal:'Reclaimed metal',fiber:'Living fibre',glass:'Resonant glass'};
const itemNames=new Map(ITEMS.map(item=>[item.id,item.name]));
const coreNames=new Map(CORES.map(core=>[core.id,core.name]));
const supportNames=new Map(SUPPORTS.map(support=>[support.id,support.name]));
const forgeNames={scrap:'Forge scrap',essence:'Essence',starshard:'Starshard'};
const gearReadySummary='Recovered equipment is ready to compare. Choose a bearer below, or keep exploring.';
const gearEquippedSummary='Your recovered equipment is equipped. Try it in the next encounter, or keep exploring.';

/** Capture before settlement. The report compares actual changes; taking a
 * snapshot never creates ledgers, grants points or changes the player's crew. */
export function captureFieldProgress(world){
 const s=world?.state||{};
 return {scene:s.scene,chapter:s.chapter,xp:number(s.xp),gold:number(s.gold),items:counts(s.items),goods:counts(s.economy?.goods),gear:captureRewardGear(s),
  cores:[...(s.cores||[])],supports:[...(s.supports||[])],
  heroes:[...new Set(s.party||[])].filter(id=>Number.isInteger(id)&&id>=0&&id<7&&s.heroes?.[id]).map(id=>{
   const h=s.heroes[id];return {id,name:h.name||CREW[id]?.name||'Traveller',level:number(h.level),ap:counts(h.ap),cores:[...new Set((h.loadout||[]).map(slot=>slot.core).filter(core=>coreNames.has(core)))],growth:availablePoints(s,id),slots:number(h.unlockedSlots)};
  }),
  aids:Object.fromEntries(Object.entries(s.objectiveHistory?.aids||{}).map(([scene,local])=>[scene,Object.fromEntries(Object.entries(local||{}).filter(([,on])=>on===true))])),
  bosses:[...(s.bosses||[])],chronicleStep:s.chronicle?.step};
}

/** Results fit the quiet post-battle handoff. They describe rewards that have
 * already been settled, including spent supplies as negative inventory deltas. */
export function fieldVictoryReport(world,before,origin,expeditionReport=null){
 const after=captureFieldProgress(world),prior=before||after,o=origin?.object||origin||{},rewards=[],progress=[],changes=[];
 const xp=after.xp-number(prior.xp),gold=after.gold-number(prior.gold);
 if(xp)rewards.push((xp>0?'+':'')+xp+' XP');
 if(gold)rewards.push((gold>0?'+':'')+gold+' credits');
 for(const id of new Set([...Object.keys(prior.goods||{}),...Object.keys(after.goods)])){
  const delta=number(after.goods[id])-number(prior.goods?.[id]);if(delta)rewards.push((delta>0?'+':'')+delta+' '+(goodNames[id]||id));
 }
 for(const id of new Set([...Object.keys(prior.items||{}),...Object.keys(after.items)])){
  const delta=number(after.items[id])-number(prior.items?.[id]);if(delta)rewards.push((delta>0?'+':'')+delta+' '+(itemNames.get(id)||id));
 }
 for(const [id,label]of Object.entries(forgeNames)){
  const delta=number(after.gear.forge[id])-number(prior.gear?.forge?.[id]);if(delta)rewards.push((delta>0?'+':'')+delta+' '+label+(id==='starshard'&&Math.abs(delta)!==1?'s':''));
 }
 const unlockedCores=after.cores.filter(id=>!prior.cores?.includes(id)&&coreNames.has(id));
 const unlockedSupports=after.supports.filter(id=>!prior.supports?.includes(id)&&supportNames.has(id));
 if(unlockedCores.length)progress.push('New '+(unlockedCores.length===1?'core':'cores')+' · '+unlockedCores.map(id=>coreNames.get(id)).join(', ')+' · available in Crew setup.');
 if(unlockedSupports.length)progress.push('New '+(unlockedSupports.length===1?'support':'supports')+' · '+unlockedSupports.map(id=>supportNames.get(id)).join(', ')+' · available in Crew setup.');
 const mastery=[];
 for(const h of after.heroes){
  const old=(prior.heroes||[]).find(hero=>hero.id===h.id);if(!old)continue;
  if(h.level>old.level)progress.push(h.name+' reached level '+h.level+'.');
  const growth=h.growth-number(old.growth);
  if(growth>0)progress.push(h.name+' earned '+growth+' growth '+(growth===1?'point':'points')+' · '+h.growth+' available in Crew setup.');
  if(h.slots>number(old.slots))progress.push(h.name+' can now equip '+h.slots+' techniques · choose them in Crew setup.');
  for(const core of h.cores){
   const ap=number(h.ap[core]),gain=ap-number(old.ap?.[core]);if(gain<=0)continue;
   const current=rank(ap),oldRank=rank(number(old.ap?.[core])),remaining=current===3?0:(current===1?35:120)-ap;
   const earned=current>oldRank?'Rank '+current+' earned · ':'';
   mastery.push({earned:current>oldRank,remaining,text:h.name+' · '+coreNames.get(core)+' · '+earned+'+'+gain+' AP · '+(current===3?'mastered':remaining+' AP to rank '+(current+1))});
  }
 }
 mastery.sort((a,b)=>Number(b.earned)-Number(a.earned)||a.remaining-b.remaining);
 progress.push(...mastery.slice(0,2).map(entry=>entry.text));
 for(const [scene,local]of Object.entries(after.aids))for(const [kind,on]of Object.entries(local))if(on&&!prior.aids?.[scene]?.[kind]&&aidText[kind])changes.push(aidText[kind]);
 if(expeditionReport){
  if(expeditionReport.refugeUnlocked)changes.push('Trail refuge restored · recover 25% max HP and 20% max MP there after each new local victory.');
  else if(Number.isFinite(expeditionReport.wins))changes.push('Trail refuge: '+Math.min(3,Math.max(0,Math.floor(expeditionReport.wins)))+' / 3 encounters resolved.');
 }
 if(o.type==='patrol'&&world?.done?.(o))changes.push('This patrol is gone; its stretch of the trail is clear.');
 if(o.type==='boss'&&after.bosses.some(chapter=>!prior.bosses?.includes(chapter)))changes.push('The guardian is defeated; its story milestone is complete.');
 const title=o.nonlethal||o.objectiveOutcome?.nonlethal?'Encounter resolved peacefully':o.type==='boss'?'Guardian defeated':'Encounter complete';
 const gear=fieldRewardGear(world,prior.gear||after.gear);
 const summary=gear.items.length?gearReadySummary:progress.some(line=>line.includes('earned')||line.includes('reached level')||line.startsWith('New '))?'Your crew has new options. Explore, then choose how to develop them in Crew setup.':'Take a moment to explore and prepare before the next encounter.';
 return {title,summary,rewards,progress,worldChange:changes.join(' '),gear};
}

/** Keep the settled reward receipt intact while showing the current equipment
 * choices after an equip, forge, salvage, or a visit to the full Armory. */
export function refreshFieldRewardReport(world,report={}){
 const gear=refreshFieldRewardGear(world,report.gear),allEquipped=gear.items.length>0&&gear.items.every(item=>item.where==='equipped');
 return {...report,summary:allEquipped?gearEquippedSummary:report.summary===gearEquippedSummary?gearReadySummary:report.summary,gear};
}
