import {findPath} from './navigation.js?v=5.5.0';

/** Optional, overheard observations use current world objects. They never open a
 * dialog, set quest flags, choose an action, or write the player's save. Existing
 * town-life advice remains available when a player actually talks to someone. */
export const FIELD_RUMOR_LIFE=4,FIELD_RUMOR_GAP=45,FIELD_RUMOR_SCAN=1/3;
const finiteXY=o=>Array.isArray(o?.xy)&&Number.isFinite(o.xy[0])&&Number.isFinite(o.xy[1]);
const center=o=>[o.xy[0]+.5,o.xy[1]+.5];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const label=o=>String(o.label||o.travel_label||o.name||o.to||'passage').replaceAll('_',' ').replace(/\s+/g,' ').trim().slice(0,72);
const objectKey=o=>String(o.affordanceId||o.rumorId||o.originId&&[o.originId,o.originStep??'',o.originTravel??'',o.type].join(':')||[o.type||'door',o.to||'',o.to_region||'',o.xy?.map(v=>Number(v).toFixed(2)).join(',')].join(':'));
const sceneKey=w=>String(w?.scene?.location??w?.state?.scene??'');
function personName(o){
 if(o.lifeKind==='resident'&&typeof o.name==='string'&&o.name.trim())return o.name.trim().slice(0,30);
 if(['npc','guide','mentor','shop','aid'].includes(o.type)){
  if(typeof o.name==='string'&&o.name.trim())return o.name.trim().slice(0,30);
  const name=String(o.text||o.steps?.[0]?.prompt||'').match(/^([A-Z][A-Z '’-]{1,24}):/m)?.[1];
  if(name)return name.toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase());
 }
 return null;
}
function available(w,o){try{return typeof w.available!=='function'||w.available(o)!==false;}catch{return false;}}
function complete(w,o){
 if(o.solved||o.completed)return true;
 if(o.affordanceId)return false;
 if(['portal','door','listen'].includes(o.type)||o.originTravel)return false;
 try{return typeof w.done==='function'&&!!w.done(o);}catch{return true;}
}
function kindOf(o){
 if(o.affordanceKind==='site')return 'repair';
 if(o.affordanceKind==='scout')return 'listening';
 if(o.affordanceKind==='salvage')return 'salvage';
 if(o.originTravel||o.type==='portal'||o.type==='door')return 'passage';
 if(['puzzle','switch','project'].includes(o.type))return 'repair';
 if(o.type==='listen')return 'listening';
 return null;
}
function reachable(scene,from,o,max=18){
 const to=center(o);if(dist(from,to)<1.45)return true;
 const route=findPath(scene,from,o.xy,1);return route.length>0&&route.length<=max;
}
function inspected(w,o){return (w.state.fieldNotes||[]).some(n=>String(n.scene)===sceneKey(w)&&String(n.label||'').trim()===label(o));}
function observation(o,kind,name){
 const what=label(o),source=name?name+': ':'';
 if(name){
  if(kind==='repair')return source+'“'+what+' still needs a careful look.”';
  if(kind==='listening')return source+'“There is something to hear at the '+what+'.”';
  if(kind==='salvage')return source+'“There is '+what+' left nearby.”';
  return source+'“The way toward '+what+' is just over there.”';
 }
 if(kind==='repair')return what+' · signs of unfinished work.';
 if(kind==='listening')return what+' · a sound carries through the ground.';
 if(kind==='salvage')return what+' · materials have been set aside here.';
 return what+' · a passage continues from here.';
}

export function fieldRumorCandidates(world,objects,{seen=new Set(),objectiveObject=null}={}){
 const s=world?.state,scene=world?.scene;if(!s||!scene?.floor||!Number.isFinite(s.x+s.y))return[];
 const here=[s.x,s.y],id=sceneKey(world),all=(objects||[]).filter(finiteXY),people=all.map(o=>({o,name:personName(o)})).filter(p=>p.name&&dist(here,center(p.o))<=4.5&&reachable(scene,here,p.o,12));
 const opportunities=[...all,...(scene.doors||[]).map(d=>({...d,type:'door'}))],unique=new Set(),out=[];
 for(const o of opportunities){
  const kind=kindOf(o);if(!kind||!finiteXY(o)||!available(world,o)||complete(world,o)||inspected(world,o))continue;
  const key=id+':'+objectKey(o),target=center(o),range=dist(here,target);
  if(seen.has(key)||unique.has(key)||range<1.6||range>6.5)continue;
  if(objectiveObject&&objectKey(objectiveObject)===objectKey(o)&&range<3)continue;
  if(!reachable(scene,here,o))continue;
  unique.add(key);
  const speaker=people.filter(p=>p.o!==o&&dist(center(p.o),target)<=6).sort((a,b)=>dist(center(a.o),target)-dist(center(b.o),target))[0];
  // Without a named person, the observation belongs to the real object. Do not
  // invent an unseen resident, conversation, reward or destination.
  const anchor=speaker?center(speaker.o):target;
  out.push({key,scene:id,opportunityKey:objectKey(o),speakerKey:speaker?objectKey(speaker.o):null,kind,text:observation(o,kind,speaker?.name),speaker:speaker?.name||null,x:anchor[0],y:anchor[1],targetX:target[0],targetY:target[1],life:FIELD_RUMOR_LIFE,range,priority:(speaker?-10:0)+(kind==='repair'?0:kind==='listening'?1:kind==='salvage'?2:4)});
 }
 return out.sort((a,b)=>a.priority-b.priority||a.range-b.range||a.key.localeCompare(b.key));
}

/** update(world, dt, {blocked, guideActive, otherCueActive, objectiveObject})
 * returns a new {type:'field-rumor', ...cue} or a {type:'field-rumor-clear',key}.
 * null means no event. Call clear() on application lifecycle transitions too.
 * Session memory persists between scenes; no state or schema is attached to World. */
export function createFieldRumors(){
 const seen=new Set();let scene=null,clock=0,entered=0,lastEmit=-Infinity,scanAt=0,active=null,remaining=0;
 function clear(){if(!active)return null;const event={type:'field-rumor-clear',key:active.key};active=null;remaining=0;return event;}
 return {
  update(world,dt,options={}){
   const current=sceneKey(world),step=Number.isFinite(dt)?Math.max(0,Math.min(1,dt)):0;
   if(current!==scene){const old=clear();scene=current;entered=0;scanAt=clock;if(old)return old;}
   if(options.blocked||options.guideActive||options.otherCueActive||world?.state?.mode!=='field')return clear();
   clock+=step;entered+=step;
   if(active){remaining-=step;if(remaining<=0)return clear();}
   if(clock+1e-9<scanAt)return null;
   scanAt=clock+FIELD_RUMOR_SCAN;
   // During cooldown no object scan is needed. Active captions are checked only
   // at the same bounded scan cadence, so stale repairs vanish promptly.
   if(!active&&(entered<8||clock-lastEmit<FIELD_RUMOR_GAP))return null;
   let objects;try{objects=world.objects();}catch{return clear();}
   if(active){const currentObjects=(objects||[]).filter(finiteXY),target=currentObjects.find(o=>objectKey(o)===active.opportunityKey)||(world.scene.doors||[]).map(d=>({...d,type:'door'})).find(o=>objectKey(o)===active.opportunityKey);if(!target||!available(world,target)||complete(world,target))return clear();return null;}
   const candidate=fieldRumorCandidates(world,objects,{seen,objectiveObject:options.objectiveObject})[0];if(!candidate)return null;
   active=candidate;remaining=FIELD_RUMOR_LIFE;lastEmit=clock;seen.add(candidate.key);return {type:'field-rumor',...candidate};
  },
  clear,
  get active(){return active?{...active,remaining}:null;}
 };
}
