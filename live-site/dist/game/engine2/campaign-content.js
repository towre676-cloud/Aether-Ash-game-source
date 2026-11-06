import {routeObjective} from './objective-routing.js?v=5.11.0';
import {assistanceMode,noteName} from './quest-assistance.js?v=5.18.0';
/** Content integration only. Combat, renderer and Mako implementations stay owned by engine2. */
export const CONTENT_VERSION='1.3.0';
export function choices(data){return data.campaign.portable_story?.choices||[];}
export function choiceCondition(world,pair){
 const ownership=world.data.campaign.state_ownership?.find(x=>x.owner==='ash.full-arc/1');
 if(!ownership||pair[0]!==ownership.native_address)return null;
 const choice=choices(world.data).find(c=>ownership.symbolic_flags[c.state]===pair[1]);
 if(!choice)return null;
 const value=world.state.storyChoices?.[choice.id];
 return {id:choice.id,known:value===0||value===1,value};
}
export function migrateContent(data,state){
 const previous=state.contentVersion;state.storyChoices??={};state.storyRewards??={};state.cacheBonuses??={};state.pendingStoryRewards??=[];state.discoveryLog??=[];
 for(const c of choices(data)){
  const value=state.storyChoices[c.id];
  if(value===undefined)state.storyChoices[c.id]=null;
  else if(value!==null&&value!==0&&value!==1)throw Error('Invalid saved story choice');
 }
 // The old engine set the carpenter flag when any regional project was funded.
 // A real carpenter project always has a corresponding settlement bit.
 if(!previous&&!(state.project&48)&&!((state.flags[0x7f01c1]||0)&48))state.flags[0x7f01c3]=(state.flags[0x7f01c3]||0)&~1;
 state.contentVersion=CONTENT_VERSION;
 return state;
}
const cacheKey=(world,o,i)=>`${world.scene.location}:${world.flagFor(o)}:${o.bit}:${i}`;
export function hasClaimableBonus(world,o){return(o.bonus_variants||[]).some((b,i)=>!world.state.cacheBonuses[cacheKey(world,o,i)]&&choiceCondition(world,b.when)?.known!==false);}
export function cacheBonus(world,o){
 for(const[b,i]of(o.bonus_variants||[]).map((b,i)=>[b,i])){
  const key=cacheKey(world,o,i);if(world.state.cacheBonuses[key]||choiceCondition(world,b.when)?.known===false)continue;
  world.state.cacheBonuses[key]=true;const yes=world.bit(...b.when);world.grant([{items:yes?b.yes:b.no,text:yes?b.yes_text:b.no_text}]);
 }
}
export function recordChoice(world,o,index){
 if(!o.choice_id)return;
 world.state.storyChoices[o.choice_id]=index;
}
export function reconcileRewards(world){
 const remaining=[];
 for(const p of world.state.pendingStoryRewards){
  if(choiceCondition(world,p.action.if_flag)?.known===false){remaining.push(p);continue;}
  if(world.state.storyRewards[p.key])continue;
  world.state.storyRewards[p.key]=true;world.grant(world.bit(...p.action.if_flag)?p.action.yes:p.action.no);
 }
 world.state.pendingStoryRewards=remaining;
}
export function endingPages(world){
 const pages=[];let unknown=false;
 for(const e of world.data.campaign.epilogue_conditions||[]){
  if(choiceCondition(world,e.when)?.known===false){unknown=true;continue;}
  pages.push(world.bit(...e.when)?e.yes:e.no);
 }
 if(unknown)pages.push('Some earlier decisions were not recorded in this older journey. Their stories remain with the people who lived them.');
 return pages;
}
const DISTRICTS=['','Loading Yard','Glass Viaduct','Undercity Well','Chapel of Rain','Archive Vaults','Sky Engine','Burned Orchard','Last Reactor','Lowbank Shelter','Last Prison Train','Flood Spillway','Name Vault','Unfinished House','Glass Chamber','Refugee Checkpoint','Mountain Relays','Observatory','Relief Store','Storm Anchorage','Witness Vault','Pottery Floor','Mine Vent House','Common Assembly','Listening Chamber'];
export const TASK_ACTIONS=['','Open the cells and restore their voices','Open the carriage lock','Restore the well and open the river valve','Sound the rain bells','Restore the archive index','Secure the dock cables','Protect the living root','Free the recordings and cool the reactor','Free the children from the ward','Choose what to save from the train','Choose how to rebuild the riverbank','Protect the recovered register','Open the house circuit and read the letter','Help the child and decide the echo’s fate','Open a safe route for the refugees','Keep the mountain voices distinct','Repair the lens and choose its use','Supply the clinic or the kitchen','Open the wind locks','Release the testimony and protect its witnesses','Preserve the old recording marks','Turn the mine intake outward','Choose the city’s first public work','Finish the phrase before entering the chamber'];
export function roomName(r){return r.title||((r.key==='field')?DISTRICTS[r.chapter]:r.key.replaceAll('_',' '));}
export function objectiveText(world){
 const s=world.state;if(s.complete)return 'The city is free. Revisit the people and roads you changed.';
 const m=world.data.campaign.missions[s.chapter-1];if(!m)return '';
 if(s.chapter===1&&!world.bit(0x7f01c6,0))return 'Help Rook mend the festival instrument.';
 if(s.chapter===1&&!world.bit(0x7f01c6,1))return "Meet Nell beside the lantern and hear her father’s song.";
 if(world.scene.chapter!==m.id)return m.objective||m.briefing;
 const all=m.rooms.flatMap(r=>r.objects.map(o=>({o,r}))),flag=m.flag_address;
 const clue=all.find(({o})=>o.type==='npc'&&o.sets_bit===6&&!world.bit(flag,6));
 if(clue){const name=clue.o.text.match(/(?:^|\n)([A-Z][A-Z ]{1,25}):/)?.[1]||'the people waiting';return `Speak to ${name} in ${roomName(clue.r)}.`;}
 const aid=all.find(({o})=>o.type==='aid'&&!world.done(o));
 if(aid)return `Help the survivors in ${roomName(aid.r)}.`;
 const evidence=all.find(({o})=>o.type==='cache'&&o.bit===5&&!world.done(o));
 if(evidence)return `Recover the evidence in ${roomName(evidence.r)}.`;
 const notes=all.filter(({o})=>o.type==='note');
 if(notes.length&&!world.bit(flag,notes[0].o.completes_bit)){
  const seq=s.flags['sequence:'+notes[0].o.sequence_address]||0,n=notes[0].o.pattern[seq],next=notes.find(v=>v.o.note===n);
  if(next)return assistanceMode(s)==='full'?`Play the ${noteName(next.o)} ${next.o.played?.includes('stone')?'stone':'bell'} in ${roomName(next.r)}.`:`Listen at the sounding ${notes.some(({o})=>o.played?.includes('stone'))?'stones':'bells'} and try the remembered phrase.`;
 }
 const task=all.find(({o})=>['puzzle','project'].includes(o.type)&&!world.done(o)&&((o.flag_address??flag)===flag));
 if(task){
  const locked=(task.o.requires_flags||[]).find(v=>!world.bit(...v));
  if(locked){const patrol=all.find(({o})=>o.type==='patrol'&&(o.flag_address??flag)===locked[0]&&o.bit===locked[1]);if(patrol)return `Clear the patrol in ${roomName(patrol.r)}.`;}
  return `${TASK_ACTIONS[m.id]||m.objective} — ${roomName(task.r)}.`;
 }
 const boss=all.find(({o})=>o.type==='boss');if(boss)return `Face ${m.enemy_name} in ${roomName(boss.r)}.`;
 return m.objective||m.briefing;
}
/** Resolve the next causal task and its first usable local passage for the HUD button. */
export function campaignObjective(world){
 const s=world.state;if(s.complete||s.chapter===1&&(!s.story?.weapon||!s.story?.firstCore||!s.recruited.includes(1)))return null;
 const m=world.data.campaign.missions[s.chapter-1];if(!m)return null;
 const rooms=world.data.scenes.filter(r=>r.chapter===m.id&&!r.originId&&!r.biome),all=rooms.flatMap(r=>r.objects.map(o=>({r,o}))),flag=m.flag_address;
 let goal=all.find(({o})=>o.type==='npc'&&o.sets_bit===6&&!world.bit(o.flag_address??flag,6));
 goal??=all.find(({o})=>o.type==='aid'&&!world.bit(o.flag_address??flag,o.bit));
 goal??=all.find(({o})=>o.type==='cache'&&o.bit===5&&!world.bit(o.flag_address??flag,5));
 const notes=all.filter(({o})=>o.type==='note');
 if(!goal&&notes.length&&!world.bit(notes[0].o.flag_address??flag,notes[0].o.completes_bit)){
  const at=s.flags['sequence:'+notes[0].o.sequence_address]||0;goal=assistanceMode(s)==='full'?notes.find(({o})=>o.note===notes[0].o.pattern[at]):notes.find(({r})=>r.location===s.scene)||notes[0];
 }
 goal??=all.find(({o})=>['puzzle','project','switch'].includes(o.type)&&(o.flag_address??flag)===flag&&(o.choice_id?s.storyChoices[o.choice_id]==null:!world.bit(flag,o.bit)));
 goal??=all.find(({o})=>o.type==='boss');if(!goal)return null;
 const requirements=[...(goal.o.requires_flags||[]),...(goal.o.requires===undefined?[]:[[goal.o.flag_address??flag,goal.o.requires]])];const missing=requirements.find(p=>!world.bit(...p));
 if(missing)goal=all.find(({o})=>((o.flag_address??flag)===missing[0])&&(o.bit===missing[1]||o.sets_bit===missing[1]))||goal;
 const speaker=goal.o.type==='npc'&&goal.o.text?.match(/^([A-Z][A-Z ]+):/)?.[1];const label=goal.o.type==='patrol'?'Clear the patrol · '+roomName(goal.r):speaker?'Speak to '+speaker[0]+speaker.slice(1).toLowerCase()+' · '+(goal.r.key==='bridge'&&m.id===2?'Glass Viaduct':roomName(goal.r)):objectiveText(world);return routeObjective(world,{label,scene:goal.r,object:goal.o},{allowGuide:true});
}
