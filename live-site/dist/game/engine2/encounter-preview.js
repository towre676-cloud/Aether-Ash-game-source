import {combatAdvice,combatOptions} from './combat-advice.js?v=5.38';
import {bossBrief} from './boss-patterns.js?v=5.24.0';
import {WORLD_AFFORDANCE_PROFILES,WORLD_TOOL_NAMES} from './world-affordances.js?v=5.38';
import {revealedPatrolFormation} from './patrol-formations.js?v=5.38';

export const FIELD_PREVIEW_LIMITS=Object.freeze({title:80,text:360,rewardHint:220});
const profiles=new Map(WORLD_AFFORDANCE_PROFILES.map(p=>[p.id,p]));
const clean=(value,max)=>{const text=String(value||'').replace(/\s+/g,' ').trim();return text.length<=max?text:text.slice(0,max-1).replace(/\s+\S*$/,'')+'…';};
const name=value=>clean(value,48);
const result=(title,text,rewardHint='')=>Object.fromEntries(Object.entries({title,text,rewardHint}).map(([key,value])=>[key,clean(value,FIELD_PREVIEW_LIMITS[key])]));
const chapter=id=>Number.isInteger(id)&&id>=1&&id<=24;
const finite=value=>Number.isFinite(value)&&value>=0;
const sentences=(text,count=2)=>(String(text||'').match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)||[]).slice(0,count).map(s=>s.trim()).join(' ');
const goalVerbs={escort:'Lead the patient',regulator:'Stabilize the regulator',supply:'Secure a supply bundle',signal:'Ground the relay'};
const geometry={line:'Step sideways out of the marked lane, then attack during recovery.',rails:'Stand between the marked rails, then attack during recovery.',ring:'Move into the calm center or beyond the marked ring.',cross:'Move through a gap between the marked arms, then attack during recovery.',cleave:'Move behind the marked fan or past its outside edge.',pair:'Move both marked companions out of their circles.',burst:'Leave the marked circle, then return during recovery.'};

function activeCrew(state){
 // Battle starts with new readiness. Never infer an affordable Link from a
 // previous battle's stale ATB, and never offer a reserve hero's technique.
 return (state?.party||[]).map(id=>state.heroes?.find(h=>h?.id===id)||state.heroes?.[id]).filter(h=>h?.hp>0&&!h.withdrawn).map(h=>({...h,atb:0}));
}
function standardEncounter(object){return !object.originId&&object.originHero===undefined&&!object.frontierId&&!object.rivalId&&object.type!=='origin';}
function payoff(world,object,mission,objective){
 const state=world?.state||{},id=object.type==='wild'?object.tier:mission?.id;
 if(!standardEncounter(object))return 'Resolve this encounter to continue its local story; its outcome determines the reward.';
 if(object.type==='boss'&&state.bosses?.includes(id))return 'This guardian’s milestone has already been claimed.';
 let reward='';
 if(chapter(id)){
  if(object.type==='wild'&&Number.isInteger(object.count||1)&&(object.count||1)>0){const count=object.count||1;reward='Resolution: '+(24+id*4)*count+' base XP · '+(8+id*3)*count+' base credits.';}
  else if(object.type==='practice')reward='Training: '+(50+id*15)+' XP and equipped-core mastery; the crew recovers afterward.';
  else if(object.type==='patrol')reward='Clear this patrol: '+(50+id*15)+' XP · '+(object.gold||15+id*5)+' credits.';
  else if(object.type==='boss'&&finite(mission?.xp)&&finite(object.gold||mission?.gold))reward='Victory: '+mission.xp+' XP · '+(object.gold||mission.gold)+' credits, plus this guardian’s story milestone.';
 }
 if(object.type==='wild'&&goalVerbs[objective?.kind])reward+=' Goal → '+goalVerbs[objective.kind]+' can resolve this without defeating every creature.';
 return reward.trim()||'Watch the first warning before committing; the outcome determines the reward.';
}
function threatRank(enemy){return enemy.boss?0:enemy.intent?.kind==='alarm'?1:enemy.intent?.kind==='repair'?2:enemy.shell?.integrity>0?3:enemy.role==='scout'?4:enemy.role==='mender'?5:enemy.armor>0?6:7;}

function formationAdvice(profile,enemies,options){
 if(!profile)return '';
 const guard=enemies.find(e=>e.role==='guard'&&e.armor>0),caller=enemies.find(e=>e.role==='scout'),mender=enemies.find(e=>e.role==='mender'),striker=enemies.find(e=>e.role==='predator');
 const direct=options.sources.find(s=>s.kind==='tech'),healthy=enemies.every(e=>e.hp>=e.maxHp*.7);
 if(profile.tactic==='caller-striker'&&caller&&striker){
  const mark=striker.moveShape==='line'?'lane':'circle';
  return name(striker.name)+' threatens a marked '+mark+'; '+name(caller.name)+' can call reinforcements. Defeat the striker before release, or focus the caller while moving clear of the mark. '+(options.interrupt?name(options.interrupt.label)+' can interrupt the call when ready.':'Guard reduces damage if you cannot move clear.');
 }
 const partner=profile.tactic==='guard-caller'?caller:profile.tactic==='guard-mender'?mender:profile.tactic==='guard-striker'?striker:null;
 if(!guard||!partner)return '';
 const first=partner===caller?name(partner.name)+' can call reinforcements. ':partner===mender?(healthy?'Watch '+name(partner.name)+'’s first mark; it can also repair wounded allies. ':name(partner.name)+' can repair wounded allies. '):'Watch '+name(partner.name)+'’s first mark. ';
 const cover=name(guard.name)+' can intercept ordinary strikes for a nearby partner. ';
 const answer=direct?name(direct.label)+' can target '+name(partner.name)+' directly. ':'Focus ready attacks on the guard, or draw its partner away. ';
 return first+cover+answer+(partner===caller?'Stop the caller before its alarm completes.':'Move clear of attack marks or Guard.');
}

/** A read-only handoff. `enemies` must be the host's already selected preview:
 * object.enemies is placement metadata, not an authoritative species list.
 * We do not generate/dress a pack, construct Battle, inspect world.objects(),
 * consume scouting preparations, or initialize any save ledger. */
export function encounterPreview(world,object,{enemies=[],objective=null,mission=world?.mission}={}){
 if(!object||!['wild','patrol','boss','practice','origin'].includes(object.type))return null;
 const state=world?.state||{},heroes=activeCrew(state),known=(Array.isArray(enemies)?enemies:[]).filter(e=>e&&typeof e==='object'&&!Array.isArray(e)&&e.hp>0&&!e.withdrawn);
 const target=known.slice().sort((a,b)=>threatRank(a)-threatRank(b))[0],boss=object.type==='boss'||target?.boss;
 const title=objective?.label||object.originName||object.label||object.name||(boss?mission?.enemy_name:'')||(known.length===1?target.name:known.length?'Revealed formation · '+known.length:'Unrevealed formation');
 const rewardHint=payoff(world,object,mission,objective);
 if(!heroes.length)return result(title,'The travelling crew needs recovery before another encounter.',rewardHint);
 const battle={heroes,enemies:known,chapter:mission?.id,objective,inventory:state.items||{}},options=combatOptions(battle,{state,skills:world?.data?.skills});
 if(boss&&chapter(mission?.id)&&standardEncounter(object)){
  const brief=bossBrief(mission.id),response=geometry[brief.sequence[0]]||'Read the marked ground, then Guard or move clear.';
  return result(title,(name(target?.name||mission.enemy_name||brief.guardian))+' uses '+name(brief.moves[0])+' in its opening movement. '+response,rewardHint);
 }
 if(!target)return result(title,'This formation has not been revealed. Watch its first warning; move clear of marked ground or Guard to reduce damage and recover MP.',rewardHint);
 const label=name(target.name)||'This creature';
 if(target.shell?.integrity>0){
  const coat=name(target.shell.material)||'material',tip=combatAdvice(battle,target,{state,skills:world?.data?.skills});
  return result(title,label+' has a '+coat+' coat; '+sentences(tip?.text||'ordinary strikes wear it down, and Guard restores MP.'),rewardHint);
 }
 if(target.intent){const tip=combatAdvice(battle,target,{state,skills:world?.data?.skills});return result(title,label+' is preparing an action; '+sentences(tip?.text),rewardHint);}
 const ordinary=standardEncounter(object)&&['patrol','practice'].includes(object.type)&&!objective&&!known.some(e=>e.boss),mender=known.find(e=>e.role==='mender');
 const formation=ordinary?revealedPatrolFormation(world?.scene,object,known,mission?.id):null,formationText=formationAdvice(formation,known,options);
 if(formationText)return result(title,formationText,rewardHint);
 if(ordinary&&mender&&known.every(e=>Number.isFinite(e.maxHp)&&e.hp>=e.maxHp*.7)){
  const caller=known.find(e=>e.role==='scout');
  return result(title,name(mender.name)+' opens with a marked strike while the formation is healthy. Defeat that striker before release, move clear of its mark, or Guard. '+(caller?name(caller.name)+' is the alarm caller; watch for a call after the first mark.':'Later, the mender can repair wounded allies.'),rewardHint);
 }
 if(target.role==='scout')return result(title,label+' is an alarm caller. If it starts calling, '+(options.interrupt?name(options.interrupt.label)+' can interrupt when ready.':'focus ready attacks on it before help arrives.'),rewardHint);
 if(target.role==='mender')return result(title,label+' can repair its allies. '+(options.interrupt?'If it begins a repair, '+name(options.interrupt.label)+' can interrupt when ready.':'Focus ready attacks on the mender before working through the rest.'),rewardHint);
 if(target.armor>0)return result(title,label+' carries armor. '+(options.interrupt?name(options.interrupt.label)+' strips armor when ready.':'Ordinary strikes wear it down; Guard restores MP for your next technique.'),rewardHint);
 if(goalVerbs[objective?.kind])return result(title,label+' threatens '+name(objective.asset?.name||'the objective')+'. Move a ready companion within reach and use Goal → '+goalVerbs[objective.kind]+'.',rewardHint);
 return result(title,'Watch '+label+'’s attack marks. Move clear of the marked ground, or Guard to reduce damage and recover MP.',rewardHint);
}

/** Explains a real finite field object without invoking the mutating action
 * catalogue. Approach/range checks remain with the canonical interaction UI. */
export function affordancePreview(world,object){
 if(object?.type!=='affordance')return null;
 const p=profiles.get(object.profileId);if(!p)return result(object.label||'Field work','Approach to inspect the available work.');
 const ledger=world?.state?.worldAffordances||{},kit=ledger.kit||{},site=ledger.sites?.[object.affordanceId]||{},title=object.label||p.label;
 if(object.affordanceKind==='salvage'){
  const tool=object.toolType,toolName=WORLD_TOOL_NAMES[tool];if(!toolName)return result(title,'Approach to inspect this spare.');
  if(object.solved||ledger.sources?.includes(object.affordanceId))return result(title,'This spare is already in the field record. Use the stock you carry at a matching repair.','No second pickup from this source.');
  if((kit[tool]||0)>=30)return result(title,'The kit already holds 30 of these. Use carried stock before collecting another.','No stock is consumed by inspecting it.');
  if((ledger.sources?.length||0)>=1024)return result(title,'The field record is full. Existing carried stock can still be used for repairs.');
  const partner=p.primary.includes(tool)?p.primary.find(t=>t!==tool):null,joining=partner?' Pair it with '+WORLD_TOOL_NAMES[partner]+' at the matching repair.':' Pack it for the next eligible local contact, where either side can claim it.';
  return result(title,'Take one '+toolName+' into your field kit.'+joining,'One finite spare, with no credit cost; '+(partner?(kit[partner]>0?'you already carry its repair partner.':'its repair partner is '+WORLD_TOOL_NAMES[partner]+'.'):'packing it consumes the carried tool.'));
 }
 if(object.affordanceKind==='site'){
  const domestic=object.art==='floorboard',place=domestic?'floor patch':'optional shortcut';
  if(object.solved||site.solved)return result(title,'This '+place+' is already repaired; its local preparation remains in effect.','The first repair’s credits and supply have already been claimed.');
  let text;
  if(p.primary.every(t=>kit[t]>0))text='At this repair, combine '+p.primary.map(t=>WORLD_TOOL_NAMES[t]).join(' + ')+'. Both carried tools are consumed.';
  else if(kit[p.alternate]>0)text='Use the '+WORLD_TOOL_NAMES[p.alternate]+' you carry for a direct repair. This consumes one tool.';
  else if(ledger.knowledge?.includes(p.id))text='Tap the remembered three-part rhythm: '+p.pattern.map(i=>['low','middle','high'][i]).join(' → ')+'. No tool is consumed.';
  else text='Listen to learn the three-part return, then tap it back to repair by hand. No tool is required.';
  return result(title,text,'First repair: +8 credits +1 '+(p.effect==='grounded'?'Ether':'Tonic')+'; restores this '+place+' and improves later eligible local encounters.');
 }
 if(object.affordanceKind==='scout'){
  const location=world?.scene?.location??world?.state?.scene,plan=ledger.plans?.[String(location)];
  if(plan?.spent)return result(title,'This room’s prepared approach has already been used. The listening evidence stays in your record.','An approach is available once per room.');
  if(plan?.plan)return result(title,'A '+name(plan.plan)+' approach is ready for the next eligible local contact.','The preparation is saved; it is consumed when that contact begins.');
  const heard=site.scouted||object.solved;
  return result(title,(heard?'Choose “Approach between the calls”.':'Listen here, then choose “Approach between the calls”.')+' This quiet approach costs no tools.','The next eligible local contact starts with slower first charges and fewer possible reinforcement calls; guardians are excluded.');
 }
 return result(title,'Approach to inspect the available work.');
}
