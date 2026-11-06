/**
 * Physical origin actions over the existing narrative state machine.
 * Native origin interactions still own repair rewards, encounter outcomes,
 * journal entries and the fourteen possible inheritances. The selected world
 * control supplies its explicit native choice; routine prose becomes a brief
 * field response instead of opening a blocking paragraph panel.
 */
import {ORIGINS,originById} from './origin-content.js?v=5.18.0';
import {inPast} from './origins.js?v=5.38';
const SCHEMA='ash-aether.embodied-origins/1';
const INSTALL=Symbol.for('ash-aether.embodied-origins.install');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
const copy=v=>JSON.parse(JSON.stringify(v));
const V='veyr-storm';
const IDS=new Set(ORIGINS.map(o=>o.id));
const FLAGS=['receiver','grounded','vaneRaised','coilSeparated','diverted','witnessed'];
const CONTENT={
 'sable-reed':{witness:'Set the reed on Mara’s table',signal:'Mara points to the speaker clamp.',repair:['Release the reed clamp','Fit the removable sleeve'],repairKinds:['lever','coil'],destiny:['Place the case on the family shelf','Place the case on the workshop loan bench'],peace:'Unwind the scavenger’s discarded wire'},
 'iona-lowbank':{witness:'Lift the shelter bed above the waterline',signal:'Dara steadies the bed. The old doorstep marks are still visible.',repair:['Restore the doorstep gauge','Run the shelter’s bell rope'],repairKinds:['gauge','cable'],destiny:['Stock the neighbourhood clinic','Load the travelling relief boat'],peace:'Float the spare plank downstream'},
 'rook-regulator':{witness:'Open the heater’s voice intake',signal:'The microphone is on the intake. Rook reaches for the release tools.',repair:['Fit the external pressure release','Unclip the removable voice plate'],repairKinds:['lever','panel'],destiny:['Pin the release drawings to the public bench','Store the duplicate plate with the unsigned contract'],peace:'Open the crawler’s cold escape line'},
 'brass-rail':{witness:'Hold the crossing gate for the porter',signal:'The porter carries a stretcher through. The signal still runs through the lock.',repair:['Ground the gate signal independently','Mount the low hand crank'],repairKinds:['cable','lever'],destiny:['Turn the public crossing sign outward','Raise the protected relief-platform sign'],peace:'Roll the maintenance trolley onto the siding'},
 'riven-tide':{witness:'Read the old doorstep tide mark',signal:'The keeper points downstream. Both side channels are exposed.',repair:['Open both side-channel valves','Set the visible third-tide latch'],repairKinds:['lever','gauge'],destiny:['Hang a key on each bank’s gatepost','Post the tide record at the shared ferry'],peace:'Open the empty brine channel'},
 'mira-archive':{witness:'Turn the side lamp over the overwritten register',signal:'The clerk slides the saved scraps into the light.',repair:['Sweep the tablets with the side lamp','Roll a reversible clay rubbing'],repairKinds:['lamp','roller'],destiny:['Seal the family copies for their owners','Open the protected witness desk'],peace:'Lay blank starch sheets beside the sealed register'},
 [V]:{witness:'Sound the operator’s receiver',signal:'OPERATOR: Can you hear the quiet stations?',repair:['Raise the grounded weather vane','Separate the listening coil'],repairKinds:['lever','coil'],destiny:['Open the shared listening watch','Set independent reply windows'],peace:'Ground the spare vane away from the mast'}
};

/** Strict but backwards-compatible validation: absent data belongs to an old save. */
export function validateEmbodiedOrigins(state){
 const value=state?.embodiedOrigins;if(value===undefined)return true;
 if(!value||value.schema!==SCHEMA||!value.origins||typeof value.origins!=='object'||Array.isArray(value.origins)||Object.keys(value.origins).length>7)throw Error('Invalid physical origin history');
 for(const[id,record]of Object.entries(value.origins)){
  if(!IDS.has(id)||!record||typeof record!=='object'||Array.isArray(record))throw Error('Invalid physical origin history');
  for(const key of FLAGS)if(record[key]!==undefined&&typeof record[key]!=='boolean')throw Error('Invalid physical origin mechanism');
  for(const key of ['repair','choice'])if(record[key]!==undefined&&record[key]!==null&&![0,1].includes(record[key]))throw Error('Invalid physical origin decision');
 }
 return true;
}
export function migrateEmbodiedOrigins(state){
 validateEmbodiedOrigins(state);state.embodiedOrigins??={schema:SCHEMA,origins:{}};
 const c=state.chronicle;if(!c||!IDS.has(c.originId))return state.embodiedOrigins;
 const record=state.embodiedOrigins.origins[c.originId]??={};
 if(c.step>=1){record.witnessed=true;record.receiver=true;}
 if([0,1].includes(c.choices?.repair)){record.repair=c.choices.repair;record.grounded=true;if(c.originId===V){record.vaneRaised=c.choices.repair===0;record.coilSeparated=c.choices.repair===1;}}
 if(c.choices?.approach==='diversion')record.diverted=true;
 if([0,1].includes(c.choices?.destiny))record.choice=c.choices.destiny;
 return state.embodiedOrigins;
}
function recordFor(world){const data=migrateEmbodiedOrigins(world.state);const id=world.state.chronicle?.originId;return id?data.origins[id]??(data.origins[id]={}):{};}
function clearCell(world,x,y){
 const scene=world.scene;if(!scene||!Number.isInteger(x)||!Number.isInteger(y)||!world.walkable(x+.5,y+.5))return false;
 return !scene.objects.some(o=>o.footprint&&x>=o.footprint.x&&x<o.footprint.x+o.footprint.w&&y>=o.footprint.y&&y<o.footprint.y+o.footprint.h);
}
function nearbyCells(world,base,count=2){
 const choices=[];for(let radius=0;radius<=5;radius++)for(let y=base[1]-radius;y<=base[1]+radius;y++)for(let x=base[0]-radius;x<=base[0]+radius;x++)if(Math.max(Math.abs(x-base[0]),Math.abs(y-base[1]))===radius&&clearCell(world,x,y))choices.push([x,y]);
 const picked=[];for(let i=0;i<count;i++){
  const desired=[base[0]+(i%2?2:-2),base[1]+(i>1?2:0)];
  const cell=choices.filter(p=>picked.every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])>=1.75)).sort((a,b)=>Math.hypot(a[0]-desired[0],a[1]-desired[1])-Math.hypot(b[0]-desired[0],b[1]-desired[1]))[0]||choices.find(p=>picked.every(q=>q[0]!==p[0]||q[1]!==p[1]))||base;
  picked.push(cell.slice());
 }return picked;
}
function socketFor(world,xy){
 const from={x:xy[0]+.5,y:xy[1]+.5};
 for(const[dx,dy]of[[2,0],[-2,0],[0,2],[0,-2],[1,1],[-1,1],[1,-1],[-1,-1]]){
  const to={x:from.x+dx,y:from.y+dy};if(!clearCell(world,xy[0]+dx,xy[1]+dy))continue;let clear=true;
  for(let i=1;i<=12;i++)if(!world.walkable(from.x+(to.x-from.x)*i/12,from.y+(to.y-from.y)*i/12)){clear=false;break;}if(clear)return {from,to};
 }return {from,to:{x:from.x+.55,y:from.y}};
}
function nativeMarker(world,step,type){return world.scene?.objects.find(o=>o.originId===world.state.chronicle?.originId&&o.originStep===step&&(!type||o.type===type));}
function descriptor(world,action,step,xy,label,manipulation,extra={}){
 const id=world.state.chronicle.originId,obj={type:'embodied-action',role:'embodiedAction',originId:id,originStep:step,embodiedAction:action,id:'embodied:'+id+':'+action,label,xy:xy.slice(),manipulation,duration:manipulation==='receiver'?.75:manipulation==='departure'?.45:1.2,...extra};
 if(manipulation==='cable')Object.assign(obj,socketFor(world,xy));return obj;
}

/** Add these objects to World.objects and hide replaced routine origin markers.
 * Native patrols and travel portals remain, so combat and map travel stay native.
 */
export function embodiedOriginObjects(world){
 if(!inPast(world)||!world.scene?.originId)return[];
 const c=world.state.chronicle,o=originById(c.originId),text=CONTENT[o.id],r=recordFor(world),step=c.step;
 if(world.scene.originPart!==(step<2?0:1))return[];
 const marker=nativeMarker(world,step,step===2?'puzzle':undefined);if(!marker?.xy)return[];
 const xy=marker.xy;
 if(step===0)return [descriptor(world,'witness',step,xy,text.witness,o.id===V?'receiver':'work')];
 if(step===1){
  if(o.id===V&&!r.grounded)return [descriptor(world,'ground',step,xy,'Attach the mast’s ground conductor','cable',{hint:'Connect the loose cable to the grounding socket before raising the vane.'})];
  return nearbyCells(world,xy,2).map((p,i)=>descriptor(world,'repair-'+i,step,p,text.repair[i],text.repairKinds[i],{choiceIndex:i,requiresChoice:true,choiceGroup:'repair',hint:o.repair[i]}));
 }
 if(step===2)return [descriptor(world,'divert',step,xy,text.peace,o.id===V?'cable':'lure',{choiceIndex:0,peaceful:true,hint:'Change the worksite so the creature can leave without a fight.'})];
 if(step===3)return nearbyCells(world,xy,2).map((p,i)=>descriptor(world,'destiny-'+i,step,p,text.destiny[i],'switch',{choiceIndex:i,requiresChoice:true,choiceGroup:'destiny',hint:o.choices[i]}));
 if(step===4)return [descriptor(world,'depart',step,xy,'Step into the festival','departure',{choiceIndex:0})];
 return[];
}
export function replacesEmbodiedOriginObject(world,obj){
 return !!(inPast(world)&&obj?.originId===world.state.chronicle.originId&&obj.originStep===world.state.chronicle.step&&!obj.originTravel&&obj.type!=='patrol'&&obj.role!=='embodiedAction');
}

/** Installation owns wrappers only, and is idempotent for a World instance. */
export function installEmbodiedOrigins(world,{onFeedback=()=>{},onSave=()=>{},onScene=()=>{}}={}){
 if(world[INSTALL])return world[INSTALL];
 const originals={interact:world.interact,newGame:world.newGame,winBattle:world.winBattle};
 let pending=null,clock=0,effects=[],sequence=0,destroyed=false;
 const emit=(type,kind,object,text,extra={})=>{
  const xy=object?.xy||[world.state.x-.5,world.state.y-.5],e={type,kind,object,id:object?.id||'origin-effect-'+sequence++,x:xy[0]+.5,y:xy[1]+.5,scene:world.state.scene,duration:extra.duration??1.2,color:kind==='ground'||kind==='coil'?'#63dccb':'#e5b366',sound:kind,progress:extra.progress??0,text,...extra};
  if(type!=='progress'){effects.push({...e,age:0});if(effects.length>12)effects.shift();}onFeedback(e);return e;
 };
 const save=()=>{migrateEmbodiedOrigins(world.state);onSave();};
 const nativePresentation=(run,choiceIndex=null)=>{
  const previous=world.callbacks.onDialog,previousNotice=world.callbacks.onNotice;let callbacks=0;
  world.callbacks.onNotice=()=>{};
  world.callbacks.onDialog=dialog=>{
   if(++callbacks>16)throw Error('The physical origin action could not settle.');
   if(dialog.choices){
    if(!Number.isInteger(choiceIndex)||!dialog.choices[choiceIndex]){
     // Unexpected meaningful choices are still explicit, never silently chosen.
     previous({...dialog,pages:['Choose how this work should continue.']});return;
    }
    dialog.choices[choiceIndex].action();
   }else dialog.after?.();
  };
  try{return run();}finally{world.callbacks.onDialog=previous;world.callbacks.onNotice=previousNotice;}
 };
 const validObject=obj=>embodiedOriginObjects(world).find(v=>v.id===obj?.id||v.embodiedAction===obj?.embodiedAction&&v.originId===obj?.originId);
 function commit(action){
  if(!action||world.state!==action.state||world.state.scene!==action.scene||world.state.chronicle?.step!==action.step||world.state.chronicle?.originId!==action.originId)return false;
  const object=validObject(action.object);if(!object)return false;
  const c=world.state.chronicle,r=recordFor(world),o=originById(c.originId),kind=object.embodiedAction;
  if(kind==='ground'){
   r.grounded=true;emit('complete','ground',object,'The conductor locks into the ground. The mast’s feedback fades.',{progress:1,from:object.from,to:object.to});save();onScene(world.scene);return true;
  }
  const step=c.step,native=nativeMarker(world,step,step===2?'puzzle':undefined);if(!native)return false;
  nativePresentation(()=>originals.interact.call(world,native),object.choiceIndex??null);
  migrateEmbodiedOrigins(world.state);
  const after=world.state.chronicle;
  if(kind==='witness')emit('signal','receiver',object,CONTENT[o.id].signal,{progress:1});
  else if(kind.startsWith('repair-'))emit('complete',o.id===V?(object.choiceIndex===0?'vane':'coil'):object.manipulation,object,object.choiceIndex===0?'The mechanism settles into its new position.':'The alternate connection is secure.',{progress:1,from:0,to:1,choiceIndex:object.choiceIndex});
  else if(kind==='divert')emit('complete','lure',object,o.id===V?'The Storm Kite settles on the grounded spare vane.':'The creature follows the changed worksite away.',{progress:1,peaceful:true});
  else if(kind.startsWith('destiny-'))emit('choice','choice',object,o.id===V?(object.choiceIndex===0?'The channel falls quiet. A distant station answers.':'Independent reply lamps begin taking turns.'):o.consequences[object.choiceIndex],{progress:1,choiceIndex:object.choiceIndex});
  else if(kind==='depart')emit('complete','departure',object,'Your choice travels with you.',{progress:1,originId:o.id});
  save();onScene(world.scene);return after?.step!==step||after?.phase!=='past';
 }
 const controller={
  objects:()=>embodiedOriginObjects(world),
  get active(){return !!pending;},
  get pending(){return pending?controller.snapshot().pending:null;},
  beginAction(obj,{manual=false,hold=false}={}){
   if(destroyed||world.state.mode!=='field'||!inPast(world))return false;
   const object=validObject(obj);if(!object)return false;
   if(pending)return pending.object.id===object.id;
   if(Math.hypot(world.state.x-object.xy[0]-.5,world.state.y-object.xy[1]-.5)>2.3){emit('blocked','approach',object,'Move within reach of the control.');return false;}
   pending={object,state:world.state,scene:world.state.scene,step:world.state.chronicle.step,originId:world.state.chronicle.originId,elapsed:0,duration:object.duration,manual:!!manual,hold:!!hold,dragPoint:object.from?{...object.from}:null};
   emit('begin',object.embodiedAction==='ground'?'ground':object.manipulation,object,'',{duration:object.duration,from:object.from,to:object.to});return true;
  },
  setProgress(value,{point}={}){
   if(!pending||!Number.isFinite(value))return false;pending.elapsed=clamp(value,0,1)*pending.duration;
   if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))pending.dragPoint={x:point.x,y:point.y};
   emit('progress',pending.object.manipulation,pending.object,'',{progress:pending.elapsed/pending.duration,from:pending.object.from,to:pending.object.to,point:pending.dragPoint});return true;
  },
  setManipulationPoint(point){if(!pending||!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return false;pending.dragPoint={x:point.x,y:point.y};return true;},
  completeAction(){if(!pending||pending.elapsed/pending.duration<.98)return false;const action=pending;pending=null;return commit(action);},
  cancelAction(reason='Released before the control settled.'){
   if(!pending)return false;const action=pending;pending=null;emit('cancel',action.object.manipulation,action.object,reason,{progress:action.elapsed/action.duration});return true;
  },
  advance(dt,{held=true,active=true}={}){
   if(destroyed)return;dt=clamp(finite(dt),0,.1);clock+=dt;effects=effects.filter(e=>(e.age+=dt)<Math.max(2.5,e.duration||0));
   if(!pending)return;
   if(!active||world.state!==pending.state||world.state.scene!==pending.scene||world.state.chronicle?.step!==pending.step||world.state.mode!=='field')return controller.cancelAction('The action is safely interrupted.');
   if(Math.hypot(world.state.x-pending.object.xy[0]-.5,world.state.y-pending.object.xy[1]-.5)>2.65)return controller.cancelAction('Move back within reach to finish.');
   if(pending.hold&&!held)return controller.cancelAction();
   if(!pending.manual){pending.elapsed=Math.min(pending.duration,pending.elapsed+dt);emit('progress',pending.object.manipulation,pending.object,'',{progress:pending.elapsed/pending.duration,from:pending.object.from,to:pending.object.to});if(pending.elapsed>=pending.duration)controller.completeAction();}
  },
  snapshot(){
   const c=world.state.chronicle,r=c?recordFor(world):{},action=pending;
   return {originId:c?.originId||null,step:c?.step??null,phase:c?.phase||null,scene:world.state.scene,time:clock,devices:{receiver:!!r.receiver,grounded:!!r.grounded,vaneRaised:!!r.vaneRaised,coilSeparated:!!r.coilSeparated,diverted:!!r.diverted,choice:r.choice??null,repair:r.repair??null},pending:action?{id:action.object.id,kind:action.object.embodiedAction==='ground'?'ground':action.object.manipulation,manipulation:action.object.manipulation,object:action.object,xy:action.object.xy.slice(),from:action.object.from,to:action.object.to,dragPoint:action.dragPoint?{...action.dragPoint}:null,progress:action.elapsed/action.duration,duration:action.duration,manual:action.manual,hold:action.hold}:null,effects:effects.map(e=>({...e}))};
  },
  destroy(){if(destroyed)return;destroyed=true;pending=null;for(const [name,method]of Object.entries(originals))if(world[name]===wrappers[name])world[name]=method;if(world.embodiedOrigins===controller)delete world.embodiedOrigins;delete world[INSTALL];}
 };
 const wrappers={
  interact(obj){
   if(obj?.role==='embodiedAction'||obj?.type==='embodied-action')return controller.beginAction(obj);
   if(!inPast(world)||!obj?.originId||obj.originId!==world.state.chronicle.originId)return originals.interact.call(world,obj);
   if(obj.originTravel){controller.cancelAction('Leaving the worksite.');return originals.interact.call(world,obj);}
   if(obj.type==='patrol'&&world.state.chronicle.step===2){controller.cancelAction('The creature is approaching.');return originals.interact.call(world,obj);}
   // Old objective markers remain compatible with callers that retained one.
   // A menu-like marker never resolves either repair or civic choice for them.
   if(obj.originStep===world.state.chronicle.step){const targets=controller.objects();if(targets.length===1&&!targets[0].requiresChoice)return controller.beginAction(targets[0]);emit('signal','choice',obj,'Choose one of the two physical controls.');return;}
   return originals.interact.call(world,obj);
  },
  newGame(options={}){
   controller.cancelAction('Beginning another journey.');effects=[];
   const result=options.originId?nativePresentation(()=>originals.newGame.call(world,options)):originals.newGame.call(world,options);
   if(options.originId){
    // Stage only a newly begun Veyr life on the southern approach, with the
    // listening mast ahead of the camera. Saved positions and either map's
    // canonical arrival/return coordinates remain authoritative elsewhere.
    if(options.originId===V&&world.scene?.originPart===0&&world.walkable(54.5,28.5)){world.state.x=54.5;world.state.y=28.5;}
    migrateEmbodiedOrigins(world.state);const object=controller.objects()[0];emit('signal','arrival',object,CONTENT[options.originId]?.signal||'Your work is waiting.');
   }return result;
  },
  winBattle(...args){
   const originBattle=inPast(world)&&world.currentBattle?.object?.originId;
   const result=originBattle?nativePresentation(()=>originals.winBattle.apply(world,args)):originals.winBattle.apply(world,args);
   if(originBattle){migrateEmbodiedOrigins(world.state);emit('complete','encounter',null,'The creature withdraws. The worksite is clear.');save();onScene(world.scene);}return result;
  }
 };
 for(const[name,method]of Object.entries(wrappers))world[name]=method;
 world.embodiedOrigins=controller;world[INSTALL]=controller;
 migrateEmbodiedOrigins(world.state);return controller;
}
export function advanceEmbodiedOrigins(world,dt,input){return world.embodiedOrigins?.advance(dt,input);}
export function beginEmbodiedAction(world,object,options){return world.embodiedOrigins?.beginAction(object,options)||false;}
