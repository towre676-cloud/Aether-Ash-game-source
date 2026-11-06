import {CORES,compileLoadoutTechnique,personalTechnique,payTechnique} from './mako.js?v=5.16.0';
import {ITEMS} from './repertoire.js?v=5.38';
import {supplyCore} from './combat-reactions.js?v=5.38';
import {bossPresentation} from './boss-patterns.js?v=5.16.0';

const names=Object.fromEntries(CORES.map(c=>[c.id,c.name]));
// Only these supply effects call damage. A Shatter charge strips armor, but it
// never hits a material coat; Smoke pod likewise cannot frost-crack clay.
const damagingSupplies=new Set(['burn','slow','wet','exposed','shock','leech','blastAll','tideAll','mpSiphon']);

/** Advice uses the same earned recipes and resource rules as actual commands.
 * Readiness is deliberately excluded: a useful lesson should not flicker while
 * its owner charges. We never ask the player to overdraw HP for a tutorial. */
export function combatOptions(battle,{state=null,skills=null}={}){
 const heroes=(battle?.heroes||[]).filter(h=>h.hp>0&&!h.withdrawn),sources=[];
 for(const hero of heroes){
  const recipes=[];
  for(const slot of hero.loadout||[]){
   try{recipes.push({...compileLoadoutTechnique(slot,hero,state||{}),menu:'Mako'});}catch{}
  }
  if(Number.isInteger(hero.id)&&hero.id>=0&&hero.id<7)for(let rank=1;rank<=8;rank++){
   if(!((hero.learned||0)&(1<<(8-rank))))continue;
   const label=skills?.characters?.[hero.id]?.skills?.find(s=>s.rank===rank)?.name;
   try{const tech=personalTechnique(hero,rank,label);recipes.push({...tech,name:label||names[tech.core]+' personal art',menu:'Personal'});}catch{}
  }
  for(const tech of recipes){
   if(tech.healing||tech.counter||hero.mp<tech.cost||!payTechnique({...hero},tech))continue;
   if(tech.link&&!heroes.some(other=>other!==hero&&other.atb>=.5&&other.mp>=4))continue;
   sources.push({kind:'tech',core:tech.core,label:(hero.name||'Companion')+'’s '+tech.name,hero,tech,interrupt:!!tech.interrupt});
  }
 }
 const inventory=state?.items||battle?.inventory||{};
 if(heroes.length)for(const item of ITEMS){
  if(!(inventory[item.id]>0))continue;
  const damaging=damagingSupplies.has(item.effect),interrupt=['shatter','interruptAll'].includes(item.effect);
  if(damaging||interrupt)sources.push({kind:'supply',core:damaging?supplyCore(item):null,label:item.name,quantity:inventory[item.id],item,interrupt});
 }
 return {heroes,sources,core:id=>sources.find(s=>s.core===id),interrupt:sources.find(s=>s.interrupt)};
}

function canSequence(first,second){
 if(!first||!second)return false;
 if(first.kind==='supply'&&second.kind==='supply'&&first.item.id===second.item.id)return first.quantity>=2;
 if(first.kind!=='tech'||second.kind!=='tech'||first.hero!==second.hero)return true;
 const copy={...first.hero};return copy.mp>=first.tech.cost+second.tech.cost&&payTechnique(copy,first.tech)&&payTechnique(copy,second.tech);
}
const activeGoal=b=>!!b.objective&&!b.objective.complete&&!b.objective.failed;
const simpleAlternative=(b,what='coat')=>activeGoal(b)?'Goal offers another way to win; you can also wear the '+what+' down with ordinary strikes.':'Ordinary strikes wear the '+what+' down. Guard recovers MP for your next technique.';
const shellState=s=>s.brittle?'brittle':s.fired?'fired':s.soaked?'soaked':s.charred?'charred':s.charged?'charged':'intact';

function materialAdvice(b,target,options){
 const s=target.shell;if(!(s?.integrity>0))return null;
 const tide=options.core('tide'),frost=options.core('frost'),flame=options.core('flame'),gale=options.core('gale'),volt=options.core('volt'),earth=options.core('earth');
 if(s.material==='clay'){
  if(s.brittle)return {text:'Strike now to shatter the cracked clay.',step:'strike'};
  if(s.fired&&tide)return {text:tide.label+' fractures the fired clay.',step:'tide'};
  if(s.soaked&&frost)return {text:frost.label+' cracks the soaked clay; then strike.',step:'frost'};
  if(s.soaked&&flame)return {text:flame.label+' loosens the soaked clay.',step:'flame'};
  if(!s.fired&&!s.soaked&&tide)return {text:tide.label+' soaks and wears the clay.'+(canSequence(tide,frost)?' Follow with '+frost.label+' to crack it.':''),step:'tide'};
  return {text:simpleAlternative(b),step:'ordinary'};
 }
 if(s.material==='reed'){
  if(s.charred&&gale)return {text:gale.label+' strips the charred reeds.',step:'gale'};
  if(flame)return {text:flame.label+' chars the reeds.'+(canSequence(flame,gale)?' Follow with '+gale.label+' to strip them.':''),step:'flame'};
  if(gale)return {text:gale.label+' strips the reeds; ordinary strikes also wear them down.',step:'gale'};
 }
 if(s.material==='ash'){
  if(tide)return {text:tide.label+' washes away the packed ash.',step:'tide'};
  if(gale)return {text:gale.label+' scatters the packed ash.',step:'gale'};
 }
 if(s.material==='rime')return flame?{text:flame.label+' melts the rime.',step:'flame'}:{text:'Ordinary strikes chip the rime. Guard recovers MP.',step:'ordinary'};
 if(s.material==='mineral'){
  if(s.charged&&earth)return {text:earth.label+' fractures the charged plates.',step:'earth'};
  if(earth&&canSequence(volt,earth))return {text:volt.label+' charges the plates; '+earth.label+' then fractures them.',step:'volt-earth'};
  if(earth)return {text:earth.label+' chips the mineral plates; repeated hits wear them down.',step:'earth'};
 }
 return {text:simpleAlternative(b),step:'ordinary'};
}

/** Short, kit-aware coaching in the command dock. No pauses or popups. */
export function combatAdvice(battle,target,context={}){
 if(!battle||battle.ended||!target||target.hp<=0||target.withdrawn)return null;
 const options=combatOptions(battle,context),s=target.shell,charged=target.intent;
 const covered=(battle.livingEnemies||battle.enemies||[]).find(e=>e!==target&&e.hp>0&&!e.withdrawn&&e.role==='guard'&&e.armor>0&&Math.hypot(e.x-target.x,e.y-target.y)<=2.5);
 const material=materialAdvice(battle,target,options);let counter='',lesson='watch';
 // Strikes hit the intercepting guard, so never promise a material shatter on
 // this selected enemy while an armored guard stands beside it.
 if(covered){
  const direct=options.sources.find(s=>s.core);
  counter=covered.name+' intercepts strikes nearby. '+(direct?direct.label+' can hit this creature directly.':activeGoal(battle)?'Target the guard first, or use Goal.':'Target the guard first.');lesson='guard:'+covered.id;
 }else if(material){counter=material.text;lesson='shell:'+s.material+':'+shellState(s)+':'+material.step;}
 else if(target.status?.brittle){counter='A strike breaks the brittle opening.';lesson='brittle';}
 else if(target.status?.wet&&(options.core('volt')||options.core('frost'))){
  const source=options.core('volt')||options.core('frost');counter=source.label+(source.core==='volt'?' conducts through water.':' freezes the water into a brittle opening.');lesson='wet:'+source.core;
 }else if(target.status?.exposed){counter='Exposed: follow with your strongest ready attack.';lesson='exposed';}
 else if(target.armor>0){counter=options.interrupt?options.interrupt.label+' strips armor and can cancel a charged attack.':simpleAlternative(battle,'armor');lesson='armor:'+(options.interrupt?'break':'ordinary');}
 let threat='';
 if(charged){
  if(charged.kind==='alarm')threat=options.interrupt?'Calling help: '+options.interrupt.label+' can interrupt before the call completes.':activeGoal(battle)?'Calling help: finish the Goal or defeat the caller before help arrives.':'Calling help: focus attacks on the caller before reinforcements arrive.';
  else if(charged.kind==='repair')threat=options.interrupt?'Repair charging: '+options.interrupt.label+' can interrupt it.':'Repair charging: focus attacks on this creature.';
  else if(['line','burst','ring','cone'].includes(charged.shape))threat='Attack marked on the ground: move clear or Guard.';
  else if(!['guard','molt','chorus'].includes(charged.kind))threat='Attack charging: Guard reduces damage and recovers MP.';
 }
 const boss=target.boss?bossPresentation(target,battle.chapter):null;
 if(boss&&charged){
  // The boss supplies the same geometric counterplay used by its telegraph.
  // Equipment advice still comes only from the crew's actual usable kit.
  threat=boss.counterplay||threat;
  counter=options.interrupt?options.interrupt.label+(boss.interruptHint?' · '+boss.interruptHint:' can interrupt this charge.'):'';
 }else if(boss?.recovering){
  threat='Recovery · '+boss.recoveryLeft.toFixed(1)+'s to answer.';
  if(!counter)counter='Use a ready attack while the guardian is exposed.';
 }
 if(!counter&&!threat)counter='Guard recovers MP. Watch for a charged attack before spending your turn.';
 if(!boss&&threat&&options.interrupt&&lesson==='armor:break')counter='';
 const bossLesson=boss?'boss:'+boss.phaseIndex+':'+(charged?'windup:'+charged.shape:boss.recovering?'recovery':lesson):lesson;
 return {targetId:target.id,label:target.name,text:[boss?.phaseName&&boss.phaseName+' ·',[threat,counter].filter(Boolean).join(' ')].filter(Boolean).join(' '),lessonKey:bossLesson,threatKey:charged?.kind||'',urgent:!!charged&&['alarm','repair'].includes(charged.kind),bossPhase:boss?.phaseIndex??null};
}

/** Ordinary attack tells may cycle every few seconds. Announce a lesson only
 * once per enemy per encounter, and an urgent alarm/repair only once per kind. */
export function createCombatAnnouncer(){
 let previous=null;const seen=new Set();
 return {next(battle,tip){
  if(battle!==previous){previous=battle;seen.clear();}
  if(!tip)return '';
  const key=tip.targetId+':'+(tip.urgent?'urgent:'+tip.threatKey:tip.lessonKey);
  if(seen.has(key))return null;seen.add(key);return tip.text;
 }};
}
