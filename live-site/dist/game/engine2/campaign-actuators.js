/** Physical previews over native campaign controls. World owns every outcome.
 * This controller never selects a native answer and never adds save data.
 */
import {PHYSICAL_LORE} from './physical-lore-content.js';

const INSTALL=Symbol.for('ash-aether.campaign-actuators.install');
const TYPES=new Set(['puzzle','switch','note','project','lore-device','riddle','frontier-landmark','network','life']);
const CHAPTER_FAMILIES=['relay','relay','crank','valve','bell','archive','winch','garden','reactor','clinic','signal','valve','archive','lamp','lens','gate','relay','lens','heater','windlock','archive','pottery','vent','assembly','phrase'];
const SPECS={relay:['lever','Work the relay',1],crank:['gauge','Turn the lock dials',1],valve:['gauge','Turn the valve',1.15],bell:['receiver','Sound the bell',.65],archive:['roller','Turn the record wheel',1],winch:['lever','Set the mooring brake',1.15],garden:['work','Tend the living root',1.1],reactor:['gauge','Set the coolant control',1.15],clinic:['receiver','Sound the ward stone',.65],signal:['lever','Set the signal',1],register:['roller','Turn the register',1],lamp:['lamp','Turn the lamp circuit',1],lens:['gauge','Align the lens',1.1],gate:['lever','Raise the gate control',1.1],heater:['gauge','Set the heat regulator',1.1],windlock:['lever','Work the wind lock',1.1],pottery:['roller','Turn the clay wheel',1.1],vent:['lever','Turn the vent control',1.1],assembly:['work','Prepare the assembly',1.2],phrase:['receiver','Sound the listening plate',.65]};
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
const copy=value=>value==null?value:JSON.parse(JSON.stringify(value));
const nativeKey=(world,o)=>[world.state.scene,o.type,o.xy?.[0],o.xy?.[1],o.id??'',o.householdId??'',o.physicalId??'',o.networkId??'',o.frontierId??'',o.flag_address??'',o.bit??'',o.sequence_address??'',o.note??'',o.completes_bit??'',o.encoreIndex??'',o.encoreScene??'',o.exploreId??'',o.investigationRole??'',o.frontierStep??'',o.bellArc??'',o.networkStage??'',o.lifeKind??'',o.grass??'',o.profile?.chapter??'',o.family?.id??''].join(':');
const inPast=world=>world.state.chronicle?.phase==='past'||!!world.scene?.originId;

/** Shared classification for visuals and controls; original choice labels stay native. */
export function campaignActuatorSpec(world,object){
 const chapter=world.scene?.chapter||world.state.chapter||1;
 let actuatorFamily=CHAPTER_FAMILIES[Math.max(1,Math.min(24,chapter))]||'relay';
 let [manipulation,controlLabel,duration]=SPECS[actuatorFamily];
 const source=[object.label,object.text,object.steps?.[0]?.prompt].filter(Boolean).join(' ');
 if(object.investigationRole){
  actuatorFamily=chapter===3?'valve':chapter===4?'bell':chapter===7?'garden':'archive';manipulation=object.investigationRole==='evidence'||actuatorFamily==='bell'?'receiver':actuatorFamily==='valve'?'gauge':actuatorFamily==='archive'?'roller':'work';controlLabel=object.label||'Inspect the mechanism';duration=.8;
 }
 else if(object.type==='project'){actuatorFamily='assembly';manipulation='work';controlLabel='Prepare the public work';duration=1.2;}
 else if(object.type==='note'){actuatorFamily=chapter===4?'bell':'phrase';manipulation='receiver';controlLabel=object.note===0?'Sound the low note':object.note===1?'Sound the middle note':object.note===2?'Sound the high note':'Sound the bell phrase';duration=.55;}
 else if(object.type==='switch'){manipulation='lever';controlLabel=/gate|door/i.test(source)?'Pull the gate lever':'Pull the switch';duration=.9;}
 else if(object.type==='lore-device'){
  const entry=PHYSICAL_LORE.find(e=>e.id===object.physicalId),mode=entry?.mode;
  actuatorFamily=mode==='listen'?'bell':mode==='grow'?'garden':mode==='pump'?'valve':mode==='turn'?/lens|light|lantern/i.test(source)?'lens':'crank':'workbench';
  manipulation=mode==='listen'?'receiver':mode==='turn'?'gauge':mode==='pump'?'lever':'work';controlLabel=object.label||'Work the device';duration=mode==='listen'?.55:1;
 }
 else if(object.type==='riddle'){
  actuatorFamily=['workbench','workbench','lamp','valve','bell','archive','heater','garden','valve','workbench','signal','winch','archive','crank','lens','assembly','phrase','lens','relay','winch','workbench','pottery','phrase','archive','phrase'][Math.max(1,Math.min(24,chapter))];
  manipulation=['bell','phrase'].includes(actuatorFamily)?'receiver':['lens','valve','crank','pottery'].includes(actuatorFamily)?'gauge':actuatorFamily==='lamp'?'lamp':actuatorFamily==='archive'?'roller':'work';
  controlLabel='Adjust '+String(object.label||'the concealed latch').replace(/^the /i,'');duration=.95;
 }
 else if(object.type==='frontier-landmark'){
  if(object.frontierStep===0){actuatorFamily='survey';manipulation='receiver';controlLabel='Read the survey instrument';duration=.65;}
  else{const style=world.scene?.biome?.style||'';actuatorFamily=/salt|coral|mangrove|sand/.test(style)?'valve':/lava/.test(style)?'vent':/crystal|aurora/.test(style)?'lens':/ice/.test(style)?'winch':/spore|cactus/.test(style)?'garden':/storm/.test(style)?'windlock':'gate';manipulation=['valve','lens'].includes(actuatorFamily)?'gauge':['garden'].includes(actuatorFamily)?'work':'lever';controlLabel='Work the field apparatus';duration=1.1;}
 }
 else if(object.type==='network'){
  const id=object.networkId||'',stage=object.networkStage||'';
  actuatorFamily=id==='root-cradle'?'garden':id==='assembly-board'?'assembly':id==='chapel-diagram'?(stage==='chapel-inspected'?'archive':'bell'):id==='relay-collar'?'bell':id==='heat-gauge'?'heater':'valve';
  manipulation=actuatorFamily==='bell'?'receiver':actuatorFamily==='archive'?'roller':['garden','assembly'].includes(actuatorFamily)?'work':'gauge';controlLabel=object.label||'Work the return connection';duration=manipulation==='receiver'?.65:1;
 }
 else if(object.type==='life'){
  actuatorFamily=object.lifeKind==='project'?CHAPTER_FAMILIES[Math.max(1,Math.min(24,chapter))]:'garden';manipulation='work';controlLabel=object.lifeKind==='project'?'Work at the community bench':object.lifeKind==='grass'?'Tend the fodder patch':'Tend the plant bed';duration=.85;
 }
 else if(/NELL:|listen beside|second verse/i.test(source)){actuatorFamily='phrase';manipulation='receiver';controlLabel='Listen beside Nell';duration=.65;}
 else if(/clay reader|reader.s groove/i.test(source)){actuatorFamily='archive';manipulation='roller';controlLabel='Turn the clay reader';duration=1;}
 else if(/cell speaker|recovered voices/i.test(source)){actuatorFamily='phrase';manipulation='receiver';controlLabel='Sound the recovered voices';duration=.8;}
 return {actuatorFamily,manipulation,controlLabel:String(controlLabel).slice(0,48),duration};
}

/** Add only to the composite control model, not back into World.objects(). */
export function installCampaignActuators(world,{onFeedback=()=>{},onSave=()=>{}}={}){
 if(world[INSTALL])return world[INSTALL];
 const interact=world.interact;
 let pending=null,presentation=null,effects=[],clock=0,sequence=0,destroyed=false;
 const bindings=new WeakMap();
 const eligible=o=>!destroyed&&!inPast(world)&&!!o&&(TYPES.has(o.type)||['evidence','control','work'].includes(o.investigationRole))&&(o.type!=='life'||['grass','herb','project'].includes(o.lifeKind))&&!o.originId&&!o.originHero&&!o.storyEvent&&!o.legacyId&&o.role!=='embodiedAction'&&Array.isArray(o.xy)&&o.xy.length===2&&o.xy.every(Number.isFinite);
 const nativeObjects=()=>{if(destroyed||inPast(world)||!world.scene)return[];return world.objects().filter(o=>eligible(o)&&(!world.available||world.available(o)));};
 function descriptor(o){
  const actuatorId=nativeKey(world,o),spec=campaignActuatorSpec(world,o);
  const object={...o,...spec,xy:o.xy.slice(),role:'worldActuator',embodiedAction:'world:'+actuatorId,actuatorId,actuatorScene:world.state.scene};
  bindings.set(object,{state:world.state,scene:world.state.scene,native:o,key:actuatorId});return object;
 }
 function resolve(object){
  if(!eligible(object))return null;
  const binding=bindings.get(object);
  if(binding&&(binding.state!==world.state||binding.scene!==world.state.scene))return null;
  if(object.actuatorScene!==undefined&&object.actuatorScene!==world.state.scene)return null;
  const key=object.actuatorId||nativeKey(world,object);
  // Known native scene objects from a different scene cannot masquerade as a
  // local object with the same bit and coordinate after a transition.
  if(!binding&&!object.actuatorId&&world.data?.scenes?.some(s=>s!==world.scene&&s.objects?.includes(object)))return null;
  const native=nativeObjects().find(o=>nativeKey(world,o)===key);
  return native?descriptor(native):null;
 }
 function reachable(object){
  const from=[world.state.x,world.state.y],target=[object.xy[0]+.5,object.xy[1]+.5];
  const reach=object.physicalId||object.networkId||object.investigationRole?2.05:2.3;
  if(!from.every(Number.isFinite)||Math.hypot(target[0]-from[0],target[1]-from[1])>reach)return false;
  const steps=Math.max(1,Math.ceil(Math.hypot(target[0]-from[0],target[1]-from[1])*8)),gx=Math.floor(target[0]),gy=Math.floor(target[1]);
  for(let i=1;i<steps;i++){const x=Math.floor(from[0]+(target[0]-from[0])*i/steps),y=Math.floor(from[1]+(target[1]-from[1])*i/steps);if(x===gx&&y===gy)continue;if(world.scene.floor[y]?.[x]!=='.'||world.scene.affordanceBlocked?.some(p=>p[0]===x&&p[1]===y))return false;}
  return true;
 }
 // Only discrete author-owned ledgers belong here. Continuous growth clocks,
 // town minutes and actor poses change while a handle is held and must not
 // invalidate it. Resources and current native stages do invalidate choices.
 const fingerprint=()=>{const s=world.state,p=s.physicalLore,t=s.townLife;return JSON.stringify([
  s.flags,s.project,s.storyChoices,s.gold,s.items,s.cores,s.recruited,s.bosses,
  s.frontiers,s.exploration,s.answeringNetwork,s.regionalLife,s.expeditions,
  s.worldAffordances,s.bellWitness,s.encore,s.economy,
  p&&[p.held,p.bag,p.installed,p.completed,p.steps,p.claimed],
  t&&[t.day,t.care,t.fodder]
 ]);};
 function emit(type,object,extra={}){
  const at=object?.xy||[world.state.x-.5,world.state.y-.5],event={type,kind:object?.manipulation||'work',object,id:'campaign-effect-'+sequence++,x:at[0]+.5,y:at[1]+.5,scene:world.state.scene,duration:extra.duration??.9,color:'#b8d5b4',progress:extra.progress??0,...extra};
  if(type!=='progress'){effects.push({...event,age:0});if(effects.length>16)effects.shift();}onFeedback(event);return event;
 }
 function within(object,run){const previous=presentation;presentation=object;try{return run();}finally{presentation=previous;}}
 function stillValid(action){return action&&world.state===action.state&&world.state.scene===action.scene&&world.scene===action.sceneRef&&world.state.mode==='field'&&fingerprint()===action.fingerprint&&reachable(action.object)&&resolve(action.object);}
 function commit(action){
  const object=stillValid(action);if(!object)return false;
  const native=bindings.get(object)?.native;if(!native)return false;
  // The original interaction creates every native choice and applies only the
  // same immediate outcomes it applied before physical previews existed.
  within(object,()=>interact.call(world,native));
  emit('complete',object,{progress:1});onSave();return true;
 }
 const controller={
  objects:()=>nativeObjects().map(descriptor),
  isControl:object=>!!resolve(object),
  get active(){return !!pending;},
  get pending(){return pending?controller.snapshot().pending:null;},
  get presenting(){if(!presentation)return null;const native=bindings.get(presentation)?.native;if(!native)return null;const token=descriptor(native),binding=bindings.get(token);binding.choiceReady=true;binding.choiceFingerprint=fingerprint();return token;},
  beginAction(object,{manual=false,hold=false}={}){
   if(destroyed||world.state.mode!=='field')return false;
   const local=resolve(object);if(!local)return false;
   if(pending)return pending.object.actuatorId===local.actuatorId;
   if(!reachable(local)){emit('blocked',local);return false;}
   pending={object:local,state:world.state,scene:world.state.scene,sceneRef:world.scene,fingerprint:fingerprint(),elapsed:0,duration:local.duration,manual:!!manual,hold:!!hold,point:null};
   emit('begin',local,{duration:local.duration});return true;
  },
  setProgress(value,{point}={}){if(!pending||!Number.isFinite(value))return false;pending.elapsed=clamp(value)*pending.duration;if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))pending.point={x:point.x,y:point.y};emit('progress',pending.object,{progress:pending.elapsed/pending.duration,duration:pending.duration,point:pending.point});return true;},
  setManipulationPoint(point){if(!pending||!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return false;pending.point={x:point.x,y:point.y};return true;},
  completeAction(){if(!pending||pending.elapsed/pending.duration<.98)return false;const action=pending;pending=null;const valid=commit(action);if(!valid)emit('cancel',action.object,{progress:action.elapsed/action.duration});return valid;},
  cancelAction(){if(!pending)return false;const action=pending;pending=null;emit('cancel',action.object,{progress:action.elapsed/action.duration});return true;},
  performChoice(object,action){
   const binding=bindings.get(object);if(typeof action!=='function'||!binding?.choiceReady||binding.consumed||binding.state!==world.state||binding.scene!==world.state.scene||binding.choiceFingerprint!==fingerprint()||world.state.mode!=='field')return false;
   const local=resolve(object);if(!local||!reachable(local))return false;
   binding.consumed=true;const result=within(local,()=>action());emit('complete',local,{progress:1});onSave();return result===false?false:true;
  },
  advance(dt,{held=true,active=true}={}){
   if(destroyed)return;dt=clamp(finite(dt),0,.1);clock+=dt;effects=effects.filter(e=>(e.age+=dt)<Math.max(2.5,e.duration||0));if(!pending)return;
   if(!active||pending.hold&&!held||!stillValid(pending)){controller.cancelAction();return;}
   if(!pending.manual){pending.elapsed=Math.min(pending.duration,pending.elapsed+dt);emit('progress',pending.object,{progress:pending.elapsed/pending.duration,duration:pending.duration});if(pending.elapsed>=pending.duration)controller.completeAction();}
  },
  snapshot(){const action=pending;return {phase:'world',scene:world.state.scene,time:clock,hasControls:controller.objects().length>0,pending:action?{id:action.object.actuatorId,kind:action.object.manipulation,manipulation:action.object.manipulation,object:copy(action.object),xy:action.object.xy.slice(),progress:action.elapsed/action.duration,duration:action.duration,manual:action.manual,hold:action.hold,dragPoint:copy(action.point)}:null,effects:effects.map(e=>copy(e))};},
  destroy(){if(destroyed)return;destroyed=true;pending=null;effects=[];if(world.interact===wrapped)world.interact=interact;if(world.campaignActuators===controller)delete world.campaignActuators;delete world[INSTALL];}
 };
 const wrapped=function(object){return controller.isControl(object)?controller.beginAction(object):interact.call(world,object);};
 world.interact=wrapped;world.campaignActuators=controller;world[INSTALL]=controller;return controller;
}
