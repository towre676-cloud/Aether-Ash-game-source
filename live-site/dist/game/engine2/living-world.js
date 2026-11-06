import {affordanceEncounterContext,applyWorldAffordance,settleAffordanceEncounter} from './world-affordances.js?v=5.38';
import {settleCreatureMemory} from './creature-ecology.js?v=5.18.0';
import {recordLegacyDeed,syncHeroLegacies} from './hero-legacy.js?v=5.5.0';

/** One current-room topology is shared by preparation, creatures and displacement. */
export function livingEncounterContext(world,object,base={}){
 const s=world.state,start=[Math.floor(s.x),Math.floor(s.y)],queue=[start],seen=new Set([start.join(',')]),walkable=[];
 for(let i=0;i<queue.length&&walkable.length<512;i++){
  const [x,y]=queue[i];if(!world.walkable(x+.5,y+.5))continue;walkable.push([x,y]);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[x+dx,y+dy],key=p.join(',');if(!seen.has(key)&&Math.hypot(p[0]-start[0],p[1]-start[1])<=14&&world.walkable(p[0]+.5,p[1]+.5)){seen.add(key);queue.push(p);}}
 }
 return affordanceEncounterContext(world,object,{...base,walkable,creatureMemory:s.creatureMemory,heroLegacies:s.heroLegacies});
}

/** The same paid world action feeds character history and immediate world feedback. */
export function applyLivingWorldAction(world,object,request){
 const result=applyWorldAffordance(world,object,request);
 if(result?.ok&&result.deed){recordLegacyDeed(world.state,{...result.deed,heroId:result.deed.heroId??world.state.party[0],success:true});syncHeroLegacies(world.state);}
 return result;
}

/** Settle before the Battle is released; no campaign flag or defeat is inferred here. */
export function settleLivingEncounter(world,battle,result){
 if(!world||!battle)return;
 const state=world.state,object=world.currentBattle?.object;
 settleCreatureMemory(state,battle,result);
 if(object)settleAffordanceEncounter(state,object,result);
 const lead=state.party[0],identity=battle.objective?.id||[state.timeline?.id||'present',state.scene,object?.serial??battle.context?.encounterSerial??0].join(':'),signature=battle.instruments?.sample||battle.instruments?.patterns?.at(-1);
 if(result==='win'&&battle.objective)recordLegacyDeed(state,{id:'goal:'+identity,heroId:lead,kind:'objective',goal:battle.objective.kind,success:true,label:battle.objective.label,pattern:signature});
 for(const event of battle.events||[]){
  if(event.type!=='ecology'||!['soothe','rescue','food','feed','lure','redirect','shelter','release','rival'].includes(event.action))continue;
  recordLegacyDeed(state,{id:'creature:'+identity+':'+(event.target?.id??event.actor?.id??'')+':'+event.action,heroId:battle.heroes.includes(event.actor)?event.actor.id:lead,kind:'ecology',goal:({food:'feed',shelter:'repair',release:'peace',rival:'rival'})[event.action]||event.action,success:true,label:event.label||event.action,pattern:signature});
 }
 syncHeroLegacies(state);
}
