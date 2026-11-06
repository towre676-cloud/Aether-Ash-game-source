/** Stable boundary for production adapters. Game internals retain ownership of progression. */
import {createGroundWorldBridge,identifyGround} from './world-ground-bridge.mjs';
export {identifyGround};
export function createReconciledRuntime(world,{groundSave,onEvent}={}){
 const ground=createGroundWorldBridge(world,{onEvent});
 if(groundSave){try{ground.restore(groundSave);}catch{/* Legacy snapshot is kept; ground restarts independently. */}}
 return {
  world,ground,
  evaluate:(x,z)=>ground.gameplayAt(x,z),
  attack:(x,z,element,power)=>ground.previewAttack(x,z,element,power),
  material:(x,z)=>ground.surface(x,z),
  step:(x,z,opts)=>ground.footstep(x,z,opts),
  impact:(x,z,element,strength)=>ground.impact(x,z,element,strength),
  dispatch:(event)=>ground.dispatch(event),
  ingest:(event)=>{
   const pos={x:event.x,z:event.z};
   const mapped={
    WORLD_WEATHER_CHANGED:{type:'rain',mode:event.weather},
    QUEST_SLUICE_OPENED:{type:'sluice',open:true},
    QUEST_SLUICE_CLOSED:{type:'sluice',open:false},
    HYDROPHONE_PLAYED:{type:'hydrophone',...pos,phase:event.phase??0,intensity:event.intensity??.85},
    ENVIRONMENT_IGNITED:{type:'ignite',...pos},SEED_PLANTED:{type:'plant',...pos},
    RESOURCE_HARVESTED:{type:'harvest',...pos},BRIDGE_REPAIRED:{type:'bridge'},
    ELEMENTAL_SKILL_CAST:{type:'cast',...pos,element:event.element,power:event.power},
    DAYS_PASSED:{type:'advance',days:event.days}
   }[event.kind];
   if(!mapped)return {ok:false,reason:'No living-world mapping for '+event.kind};
   return {...ground.dispatch(mapped),groundEvent:mapped};
  },
  save:()=>({world:world.snapshot(),environment:{ground:ground.save()}}),
 };
}
