/** Flight host bridge: canonical game retains authority over geography, collision,
 * rendering, camera, vehicle ownership and saves. Never imports prototype geography. */
import {STEP,makeVehicle,stepVehicle} from './continuous-world-core.mjs';
const valid=p=>p&&['x','y','z','heading'].every(k=>Number.isFinite(p[k]));
const required=['terrainHeight','sweepFlight','resolveRegion','commitFlightPose','cameraFlight','canTakeoff','canLand','onFlightEvent'];
const name='ash-aether-flight-v1';
export function createContinuousFlightBridge(host,{step=STEP,maxSteps=5}={}){
 for(const k of required)if(typeof host?.[k]!=='function')throw Error('Missing authoritative flight host adapter: '+k);
 if(!Number.isFinite(step)||step<=0||step>1/30||!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>8)throw Error('Invalid step budget');
 let mode='grounded',craft=null,region=null,acc=0,clock=0,events=0;
 const stats={updates:0,steps:0,collisions:0,landings:0,droppedSeconds:0};
 const emit=(type,data={})=>{events++;host.onFlightEvent({type,...data});};
 const regionAt=p=>{const x=host.resolveRegion({x:p.x,y:p.y,z:p.z});if(typeof x!=='string'||!x.trim())throw Error('Unmapped flight region');return x;};
 const present=phase=>{host.commitFlightPose({...craft},{region,phase});host.cameraFlight({...craft},{region,phase});};
 function takeoff(source,input={}){
  if(mode!=='grounded'||!valid(source)||source.type==='flight')return false;
  const h=host.terrainHeight(source.x,source.z);
  if(!Number.isFinite(h)||Math.abs(source.y-h)>5)return false;
  const area=regionAt(source);
  if(host.canTakeoff({source:{...source},region:area,input})!==true)return false;
  const next=makeVehicle({x:source.x,y:Math.max(h+1,source.y),z:source.z,heading:source.heading,type:'flight'});
  if(host.sweepFlight({from:{...source},to:{...next},phase:'takeoff'})?.allowed!==true)return false;
  mode='flying';craft=next;region=regionAt(next);acc=0;present('takeoff');emit('takeoff',{region});return true;
 }
 function update(elapsed,input={}){
  if(mode!=='flying')return {steps:0,alpha:0,mode};
  if(!Number.isFinite(elapsed)||elapsed<0)throw Error('Invalid flight elapsed time');
  stats.updates++;acc+=Math.min(.25,elapsed);
  const limit=step*maxSteps;if(acc>limit){stats.droppedSeconds+=acc-limit;acc=limit;}
  let count=0;
  while(acc+1e-12>=step&&count<maxSteps){
   const before={...craft},next=stepVehicle(before,input,step,(x,z)=>host.terrainHeight(x,z));
   if(!valid(next)||!Number.isFinite(next.speed)||!Number.isFinite(next.verticalSpeed))throw Error('Invalid physics pose');
   const collision=host.sweepFlight({from:before,to:{...next},phase:'flight'});
   if(typeof collision?.allowed!=='boolean')throw Error('Collision host must return allowed boolean');
   if(collision.allowed){
    const accepted=collision.pose?{...next,...collision.pose}:next;
    if(!valid(accepted)||!Number.isFinite(accepted.speed))throw Error('Invalid resolved collision pose');
    const to=regionAt(accepted);craft=accepted;
    if(to!==region){const from=region;region=to;emit('region',{from,to});}
   }else{craft={...before,speed:0,verticalSpeed:0};stats.collisions++;emit('collision',{region});}
   acc-=step;count++;clock+=step;stats.steps++;
  }
  present('flight');return {steps:count,alpha:Math.max(0,acc/step),mode};
 }
 function land(input={}){
  if(mode!=='flying')return false;
  const h=host.terrainHeight(craft.x,craft.z);
  if(!Number.isFinite(h))return false;
  const destinationRegion=regionAt({...craft,y:h});
  if(host.canLand({pose:{...craft},ground:h,region:destinationRegion,input})!==true)return false;
  const next={...craft,y:h,pitch:0,roll:0,verticalSpeed:0,speed:0};
  if(host.sweepFlight({from:{...craft},to:{...next},phase:'landing'})?.allowed!==true)return false;
  craft=next;region=destinationRegion;mode='grounded';acc=0;stats.landings++;present('landing');emit('landing',{region});return true;
 }
 const snapshot=()=>({version:1,kind:name,mode,craft:craft?{...craft}:null,region,clock,events});
 function restore(saved){
  if(saved?.version!==1||saved.kind!==name||!['grounded','flying'].includes(saved.mode))return false;
  if(saved.craft!==null&&!valid(saved.craft))return false;
  if(saved.mode==='flying'&&saved.craft?.type!=='flight')return false;
  if(!Number.isFinite(saved.clock)||saved.clock<0)return false;
  if(saved.craft&&regionAt(saved.craft)!==saved.region)return false;
  mode=saved.mode;craft=saved.craft?{...saved.craft}:null;region=saved.region??null;
  clock=saved.clock;events=Number.isSafeInteger(saved.events)&&saved.events>=0?saved.events:0;acc=0;
  if(craft)present('restore');return true;
 }
 const current=()=>({mode,craft:craft?{...craft}:null,region,stats:{...stats}});
 return Object.freeze({takeoff,update,land,snapshot,restore,current});
}
