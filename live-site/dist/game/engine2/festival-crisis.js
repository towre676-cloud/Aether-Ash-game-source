/** The Festival of Mended Things becomes a playable emergency, not another cutscene.
 * Uses the original Cinderfall town, Nell, Rook, Chapter 1, and saved story.
 * No separate combat, economy, renderer, or scene authority is introduced. */
import {routeObjective} from './objective-routing.js?v=5.11.0';

export const FESTIVAL_CRISIS_VERSION = 1;
const FESTIVAL_FLAG = 8323526;
const TOWN = 5;
const PEOPLE = Object.freeze([
  Object.freeze({id:'nell',type:'npc',xy:[33,35],sprite:0,label:'Nell at the lantern',text:'Nell is trying to reach her father through the crowd.'}),
  Object.freeze({id:'baker',type:'npc',xy:[30,33],sprite:1,label:'Baker at the carts',text:'The market baker is trying to move water and bread out of the crush.'})
]);
const RELAY = Object.freeze({id:'relay',type:'switch',xy:[36,36],label:'Festival return relay',text:'The festival bell is collecting sound without returning an answer.'});
const validPeople=new Set(PEOPLE.map(p=>p.id));
export function newFestivalCrisis(){return {version:FESTIVAL_CRISIS_VERSION,phase:'waiting',safe:[],reliefClaimed:false,legacyBypass:false};}
/** Old saves that already passed the festival are never rolled backwards. */
export function festivalCrisisState(world){
 const story=world?.state?.story;
 if(!story||world.state.chronicle?.phase==='past')return null;
 if(story.festivalCrisis===undefined){
  const previous=world.bit?.(FESTIVAL_FLAG,1)||world.state.chapter>1;
  story.festivalCrisis={...newFestivalCrisis(),phase:previous?'complete':'waiting',legacyBypass:!!previous};
 }
 return story.festivalCrisis;
}
export function validateFestivalCrisis(save){
 const v=save?.story?.festivalCrisis;
 if(v===undefined)return true;
 if(!v||v.version!==FESTIVAL_CRISIS_VERSION||!['waiting','active','complete'].includes(v.phase)||!Array.isArray(v.safe)||v.safe.length>2||new Set(v.safe).size!==v.safe.length||v.safe.some(x=>!validPeople.has(x))||typeof v.reliefClaimed!=='boolean'||typeof v.legacyBypass!=='boolean')throw Error('Invalid festival crisis save');
 if(v.phase==='complete'&&v.safe.length!==2&&!(v.legacyBypass&&v.safe.length===0)&&!save.complete&&save.chapter===1)throw Error('Festival rescue must be resolved before the relay closes');
 return true;
}
const active=w=>w.state.chapter===1&&!w.state.complete&&w.state.chronicle?.phase!=='past'&&festivalCrisisState(w)?.phase==='active'&&w.bit(FESTIVAL_FLAG,1);
const note=(w,id,title,text)=>{const journal=w.state.story?.journal;if(!Array.isArray(journal)||journal.some(entry=>entry.id===id))return;journal.push({id,title,text,chapter:1});};
export function beginFestivalCrisis(world){
 const c=festivalCrisisState(world);
 if(!c||c.phase!=='waiting'||world.state.chapter!==1||!world.bit(FESTIVAL_FLAG,1))return false;
 c.phase='active';
 note(world,'festival-failure','The bells take the voices','The festival bells rang out of order. Nell’s father lost his voice; the relay can hear people but its return line has been closed. Get people clear before changing it.');
 world.notice('Bells out of sequence · reach Nell and the market carts');
 return true;
}
export function festivalCrisisObjects(world){
 if(world.scene?.location!==TOWN)return [];
 const c=festivalCrisisState(world);
 // The physically repaired connection persists on later visits, not just in
 // the rescue journal. Historical saves do not acquire an invented repair.
 if(c?.phase==='complete'&&!c.legacyBypass)return [{...RELAY,type:'furnishing',festivalCrisis:'relay-restored',label:'Reopened return vane'}];
 if(!active(world))return [];
 return [...PEOPLE.filter(p=>!c.safe.includes(p.id)).map(p=>({...p,festivalCrisis:p.id})),{...RELAY,festivalCrisis:'relay'}];
}
export function festivalCrisisObjective(world){
 if(!active(world))return null;
 const c=festivalCrisisState(world);
 const id=PEOPLE.find(p=>!c.safe.includes(p.id))?.id||'relay';
 const obj=festivalCrisisObjects(world).find(o=>o.festivalCrisis===id)||{...(id==='relay'?RELAY:PEOPLE.find(p=>p.id===id)),festivalCrisis:id};
 const label=id==='nell'?'Get Nell clear of the ringing bells':id==='baker'?'Help the baker move food and water':'Disconnect the bell intake and open its return';
 if(world.scene?.location===TOWN)return {label,object:obj};
 const scene=world.scenes?.get(TOWN);
 return scene?routeObjective(world,{label:'Return to the festival · '+label,scene,object:obj},{allowGuide:true}):{label};
}
function evacuate(world,id){
 const c=festivalCrisisState(world);
 if(!active(world)||c.safe.includes(id))return false;
 c.safe.push(id);
 if(id==='nell'){
  note(world,'festival-nell','Nell reaches shelter','Nell stays within sight of the covered steps. Her father is still alive, but his voice has been taken. He must be freed from the collector later.');
  world.notice('Nell safe · her father is still missing');
  world.text('NELL: I can wait here. Please get my father out. He was singing and then there was nothing.');
 }else{
  if(!c.reliefClaimed){world.state.items.tonic=(world.state.items.tonic||0)+1;c.reliefClaimed=true;}
  note(world,'festival-relief','Food reaches shelter','The baker and bystanders move bread and water into a sheltered entrance; the baker offers a Tonic to the rescue crew.');
  world.notice('Bread and water sheltered · received 1 Tonic');
  world.text('BAKER: The ovens can wait. These people cannot. Take this for whoever is hurt.');
 }
 return true;
}
export function festivalCrisisInteraction(world,o){
 if(!o?.festivalCrisis)return false;
 if(o.festivalCrisis==='relay-restored'){
  if(world.scene?.location===TOWN)world.text('The bell collector is isolated. The return vane stays open, and the square can answer its own calls.');
  return true;
 }
 if(!active(world)||world.scene?.location!==TOWN)return true;
 const c=festivalCrisisState(world);
 if(o.festivalCrisis==='nell'){
  if(c.safe.includes('nell'))return true;
  world.choose('The bells are sounding the same stolen syllable. Nell cannot hear the warnings over the crowd.',[
   ['Guide Nell behind the covered steps',()=>evacuate(world,'nell')],
   ['Listen for her father',()=>world.text('The call returns through the bell, not from her father. The signal is being copied.')],
   ['Leave for now',()=>{}]
  ]);return true;
 }
 if(o.festivalCrisis==='baker'){
  if(c.safe.includes('baker'))return true;
  world.choose('A broken cart blocks the market exit. Bread and water will be lost if the crowd overturns it.',[
   ['Clear the wheels and move the supplies',()=>evacuate(world,'baker')],
   ['Check the nearest safe door',()=>world.text('The covered entrance beside the market is still clear. The loaded cart can pass if the wheel is freed.')],
   ['Leave for now',()=>{}]
  ]);return true;
 }
 if(o.festivalCrisis!=='relay')return true;
 if(c.safe.length!==PEOPLE.length){world.text('ROOK: That relay is loaded with the crowd’s voices. We cannot force it open while Nell and the market workers are under the bell. Get them clear first.');return true;}
 world.choose('The return vane is clamped shut. The bell takes every voice, but nobody can answer through it.',[
  ['Isolate the collector and reopen the return',()=>{
   if(!active(world)||c.safe.length!==PEOPLE.length)return;
   c.phase='complete';
   note(world,'festival-return','The crowd can answer','The bell intake is isolated and its original return vane freed. The gathered voices stop feeding the collector. Nell’s father has not regained his voice; the crew must enter the service works and find him.');
   world.notice('Festival intake isolated · return path opened');
   world.text('The bell loses its borrowed chorus. Real voices rise from the square again. Rook points to the service hatch: Nell’s father is still inside the works.');
  }],
  ['Trace the shut vane',()=>world.text('One conduit leads from the square to the carriage collector. The other points back into town, but its brass return vane has been pinned shut.')],
  ['Leave for now',()=>{}]
 ]);return true;
}
export function festivalCrisisBlocksWorkshop(world,next){
 return !!(next?.key==='workshop'&&active(world));
}
