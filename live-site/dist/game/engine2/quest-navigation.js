import {advanceRoute} from './player-locomotion.js?v=5.14.0';
import {routeObjective} from './objective-routing.js?v=5.11.0';
import {assistanceMode,musicDestinations} from './quest-assistance.js?v=5.18.0';
const targetKey=o=>o&&[o.type,o.id,o.originId,o.originStep,o.frontierId,o.physicalId,o.bellArc,o.rivalId,o.exploreId,o.investigationRole,o.networkId,o.networkStage,o.note,o.sequence_address,o.bit,o.flag_address,o.sets_bit,o.to,o.to_region,o.to_room,o.label,o.name,o.sprite].join(':');
const finitePoint=p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]);
/** Furniture can be the destination, but a wall between the player and it cannot. */
export function clearInteractionApproach(scene,from,object){
 if(!finitePoint(object?.xy)||!finitePoint(from))return false;
 const tx=object.xy[0]+.5,ty=object.xy[1]+.5,d=Math.hypot(tx-from[0],ty-from[1]);
 if(d>2.05)return false;
 const gx=Math.floor(tx),gy=Math.floor(ty),steps=Math.max(1,Math.ceil(d*8));
 for(let i=1;i<steps;i++){
  const x=Math.floor(from[0]+(tx-from[0])*i/steps),y=Math.floor(from[1]+(ty-from[1])*i/steps);
  if(x===gx&&y===gy)continue;
  if(scene.floor[y]?.[x]!=='.'||(scene.affordanceBlocked||[]).some(p=>p[0]===x&&p[1]===y))return false;
 }
 return true;
}
/** One flood fill chooses an actually visible interaction approach, rather than
 * stopping at an arbitrary radius cell on the other side of a wall. */
export function interactionPath(scene,from,object){
 if(!finitePoint(from)||!finitePoint(object?.xy))return null;
 if(clearInteractionApproach(scene,from,object))return [];
 const start=from.map(Math.floor),key=p=>p.join(','),queue=[start],seen=new Set([key(start)]),prior=new Map(),blocked=new Set((scene.affordanceBlocked||[]).map(key));
 const open=p=>scene.floor[p[1]]?.[p[0]]==='.'&&!blocked.has(key(p));let found=null;
 for(let i=0;i<queue.length;i++){
  const p=queue[i],center=p.map(v=>v+.5);
  if(open(p)&&clearInteractionApproach(scene,center,object)){found=p;break;}
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[p[0]+dx,p[1]+dy],k=key(q);if(open(q)&&!seen.has(k)){seen.add(k);prior.set(k,p);queue.push(q);}}
 }
 if(!found)return null;const path=[];
 while(key(found)!==key(start)){path.unshift(found.map(v=>v+.5));found=prior.get(key(found));}
 if(!path.length)path.push(start.map(v=>v+.5));return path;
}
// Exclude animation, clock, HP and the player's coordinates: they do not unlock
// a closed passage. Include collision changes, supplies and actual quest ledgers.
function contextKey(w){const s=w.state,p=s.physicalLore,physical=p?{...p,clocks:Object.fromEntries(Object.entries(p.clocks||{}).map(([id,t])=>[id,t>=4?2:t>=1.6?1:0]))}:p;return JSON.stringify([s.chapter,s.complete,s.flags,s.storyChoices,s.bosses,s.project,s.recruited,s.party,s.items,s.gold,s.story&&[s.story.parcel,s.story.weapon,s.story.firstCore,s.story.returnedHome],s.chronicle&&[s.chronicle.originId,s.chronicle.step,s.chronicle.choices],s.frontiers,s.kakeya,physical,s.worldAffordances,s.exploration,s.bellWitness,s.answeringNetwork,assistanceMode(s),w.scene?.floor,w.scene?.affordanceBlocked]);}
function sameJourney(a,b){if(a?.journey&&b?.journey)return a.journey.hero===b.journey.hero&&a.journey.seed===b.journey.seed;if(a?.chronicle&&b?.chronicle)return a.chronicle.originId===b.chronicle.originId&&a.chronicle.cycle===b.chronicle.cycle&&a.chronicle.phase==='past'&&b.chronicle.phase==='present';return false;}
/** A selected guide remains selected through decisions and encounters. Explicit
 * handoffs keep the selection but return movement to the player until resumed.
 * The guide never chooses an answer or battle action. */
export function createQuestGuide(world,{resolve,onNotice=()=>{},beforeInteract=()=>true}){
 let selected=false,held=null,runState=null,path=[],object=null,scene=null,plannedKey=null,plannedXY=null,plannedContext=null,plannedLabel=null,goalLabel='',status={state:'idle',reason:null,label:''};
 let visitTarget=null,visitedTarget=null;
 let elapsed=0,pollAt=0,retryAt=0,retries=0,stalled=0,lastContext=null,lastGoal=null;
 const attempts=new Map();let motion=null;
 function setStatus(state,reason,label=goalLabel){status={state,reason,label:label||''};}
 function clearPlan(){motion=null;path=[];object=null;scene=null;plannedKey=null;plannedXY=null;plannedContext=null;plannedLabel=null;stalled=0;}
 function cancel(){selected=false;held=null;runState=null;visitTarget=null;visitedTarget=null;clearPlan();attempts.clear();setStatus('idle',null,'');}
 function wait(reason,label,state='waiting'){clearPlan();setStatus(state,reason,label);}
 function remember(key,context){attempts.delete(key);attempts.set(key,context);if(attempts.size>64)attempts.delete(attempts.keys().next().value);}
 function blocked(label){retries++;retryAt=elapsed+Math.min(4,.5*2**(retries-1));wait('route',label,'blocked');}
 function plan(goal,context){
  const route=interactionPath(world.scene,[world.state.x,world.state.y],goal.object);
  if(route===null){blocked('Waiting for an open route · '+(goal.label||'the next objective'));return false;}
  object=goal.object;scene=world.state.scene;plannedKey=targetKey(object);plannedXY=[...object.xy];plannedContext=context;plannedLabel=goal.label;goalLabel=goal.label||object.label||'Next objective';path=route;stalled=0;setStatus('following',null,goalLabel);return true;
 }
 const api={
  get running(){return selected;},get held(){return !!held;},get path(){return path;},get status(){return {...status};},get motion(){return motion;},
  get destination(){const target=visitTarget||(held?.reason==='destination'?visitedTarget:null);return target?{...target,object:{...target.object,xy:[...target.object.xy]}}:null;},
  start(){cancel();selected=true;runState=world.state;elapsed=0;pollAt=0;retryAt=0;retries=0;lastContext=null;lastGoal=null;setStatus('following',null,'Finding the next objective');onNotice('Guide on · following at walking pace. Move to take control.');return true;},
  cancel,
  /** A player-selected clue, instrument or service uses the same checked
   * walking route as the story. It never moves the player by assignment. */
  visit(goal){
   if(!finitePoint(goal?.object?.xy)||!Number.isInteger(goal.scene??world.state.scene))return false;
   if(!selected)api.start();
   visitTarget={...goal,scene:goal.scene??world.state.scene,object:{...goal.object,xy:[...goal.object.xy]}};visitedTarget=null;
   held=null;clearPlan();attempts.clear();pollAt=0;retryAt=0;retries=0;lastContext=null;lastGoal=null;goalLabel=goal.label||goal.object.label||'Your chosen destination';setStatus('following',null,goalLabel);return true;
  },
  hold(reason='explore',label){if(!selected)return false;held={reason,label:label||(reason==='spoils'?'Take a moment with your spoils':'Explore at your own pace')};clearPlan();setStatus('exploring',held.reason,held.label);return true;},
  resume(){if(!selected||!held)return false;const arrived=held.reason==='destination';held=null;if(arrived){visitTarget=null;visitedTarget=null;}clearPlan();pollAt=0;retryAt=0;retries=0;lastContext=null;lastGoal=null;setStatus('following',null,visitTarget?.label||'Finding the next objective');return true;},
  interrupt(reason='pause'){if(!selected||held)return;wait(reason,reason==='dialog'?'Waiting for your conversation':reason==='battle'?'Waiting for the encounter':'Guide paused');pollAt=0;retries=0;},
  sceneChanged(){
   if(!selected)return;
   if(world.state!==runState){if(!sameJourney(runState,world.state)){cancel();return;}runState=world.state;}
   if(visitedTarget?.scene!==world.state.scene)visitedTarget=null;
   clearPlan();pollAt=0;retries=0;retryAt=0;lastContext=null;lastGoal=null;if(held)setStatus('exploring',held.reason,held.label);else setStatus('following',null,'Finding the next objective');
  },
  update(dt,{paused=false}={}){
   motion=null;if(!selected)return;
   if(world.state!==runState){cancel();return;}
   // A takeover is an explicit choice to explore. UI interruptions and passage
   // transitions cannot restart locomotion before the player resumes the trail.
   if(held){setStatus('exploring',held.reason,held.label);return;}
   elapsed+=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
   const pause=paused||(world.state.mode!=='field'?world.state.mode:null);
   if(pause){if(status.state!=='paused'||status.reason!==pause){wait(pause,pause==='dialog'?'Waiting for your conversation':pause==='battle'?'Waiting for the encounter':'Guide paused','paused');pollAt=0;}return;}
   // Polling is bounded even when an objective is missing or a path is closed.
   const shouldResolve=elapsed>=pollAt||scene!==world.state.scene||!object;
   if(shouldResolve){
    // A blocked or waiting guide checks at most four times a second.
    if(elapsed<pollAt&&!object)return;
    pollAt=elapsed+.25;
    const goal=visitTarget?routeObjective(world,visitTarget):resolve(),context=contextKey(world),key=finitePoint(goal?.object?.xy)?world.state.scene+':'+targetKey(goal.object):null;
    const goalContext=key+':'+JSON.stringify(goal?.object?.xy)+':'+goal?.label;
    if(context!==lastContext||goalContext!==lastGoal){lastContext=context;lastGoal=goalContext;retries=0;retryAt=0;}
    if(!key){wait('objective',goal?.label||'Waiting for the next story step');return;}
    const destination=goal.object;
    if(attempts.get(key)===context){wait(destination.type==='portal'||destination.questTransit?'passage':'interaction',destination.type==='portal'||destination.questTransit?'Waiting for this passage to open':'Waiting for your next decision · '+(goal.label||destination.label||'the objective'));return;}
    const changed=plannedKey!==targetKey(destination)||scene!==world.state.scene||plannedContext!==context||goal.label!==plannedLabel;
    const moved=plannedXY&&Math.hypot(destination.xy[0]-plannedXY[0],destination.xy[1]-plannedXY[1])>=.6;
    if(!object||changed||moved){
     if(!changed&&!moved&&(elapsed<retryAt||retries>=3)){wait('route','Waiting for an open route · '+(goal.label||destination.label||'the objective'),'blocked');return;}
     // Repeated stalls remain latched, without recomputing the same route forever.
     if(!object&&status.reason==='route'&&(elapsed<retryAt||retries>=3)){return;}
     if(!plan(goal,context))return;
    }else object=destination;
   }
   if(!object)return;
   const stepTime=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
   if(path.length){
    motion=advanceRoute(world,path,stepTime);
    stalled=motion.distance<.001?stalled+stepTime:0;
    if(motion.interrupted){clearPlan();pollAt=0;return;}
    if(stalled>.8)blocked('Waiting for an open route · '+goalLabel);
    return;
   }
   if(!clearInteractionApproach(world.scene,[world.state.x,world.state.y],object)){clearPlan();pollAt=0;return;}
   const key=world.state.scene+':'+targetKey(object),o=object;
   // The field director can hand control back before an automatic interaction.
   // A declined attempt is not a story action and must stay retryable on resume.
   if(beforeInteract(o)===false||held)return;
   // A closed door or declined choice cannot be reopened every frame. Actual
   // flag/stage changes after the player's answer enable the next puzzle step.
   remember(key,lastContext);clearPlan();pollAt=0;
   const arrived=visitTarget&&world.state.scene===visitTarget.scene&&targetKey(o)===targetKey(visitTarget.object),playNote=arrived&&visitTarget.playNote;
   if(arrived){visitedTarget=visitTarget;visitTarget=null;}
   if(o.type==='note'&&assistanceMode(world.state)!=='full'&&!playNote&&!world.bit(o.flag_address??world.mission.flag_address,o.completes_bit)){
    api.hold('destination','Choose a sound, or ask for a hint.');
    world.choose('The instruments wait. Which sound do you want to try? The guide can take you to any of them.',musicDestinations(world,o).map(goal=>[goal.label,()=>api.visit(goal)]).concat([['Keep listening for now',()=>{}]]));
   }else{
    // Mark the handoff before interaction so a synchronous follow-up route can
    // replace it. Arrival itself is not an instruction to solve a mechanism.
    if(arrived)api.hold('destination','You have reached '+(o.label||'your chosen destination')+'. Continue the story route when you are ready.');
    world.interact(o);
   }
   if(world.state.mode!=='field')setStatus('paused',world.state.mode,world.state.mode==='dialog'?'Waiting for your conversation':'Waiting for the encounter');
  }
 };return api;
}
