/** Game-facing coordinator for the Ash & Aether ecosystem.
 * One shared source of truth supplies visuals, stealth, traversal, fire, harvesting, and saves.
 * This is an integration API; host game must wire real world coordinates, NPCs and inventory.
 */
import {createGrassField} from './grass-renderer.mjs';
import {createVegetationState} from './grass-state.mjs';
export function createLivingLandscape(THREE,scene,options={}){
  const seed=options.seed??316;
  const state=options.state??createVegetationState({seed,cellSize:options.stateCellSize??.8,
    maxCells:options.stateMaxCells??18000,initialDay:options.initialDay??0});
  if(state.getStats().seed!==seed)throw Error('external vegetation state seed mismatch');
  if(options.initialSave)state.restore(options.initialSave);
  let quality=options.quality??'medium';
  let field=null,disposed=false,dirty=false,refreshClock=0;
  let player={x:options.origin?.x??0,z:options.origin?.z??0};
  const growthAt=(x,z)=>state.sample(x,z);
  function makeField(){
    field?.dispose();field=createGrassField(THREE,scene,{...options,seed,quality,growthAt,
      origin:player});
  }
  makeField();
  function ensure(){if(disposed)throw Error('living landscape disposed');}
  function markDirty(){dirty=true;}
  function update(dt=0,actor=null,{worldDay}={}){
    ensure();
    if(actor && Number.isFinite(actor.x) && Number.isFinite(actor.z))player={x:actor.x,z:actor.z};
    if(worldDay!==undefined){const oldDay=state.getStats().day;state.setDay(worldDay);if(worldDay>oldDay)markDirty();}
    refreshClock+=Math.max(0,Math.min(.15,dt));
    field.update(dt,player);
    if(dirty && refreshClock>=.55){field.build(player.x,player.z);refreshClock=0;dirty=false;}
  }
  function step(x,z,radius=.65,mass=1){ensure();field.step(x,z,radius);const changed=state.trample(x,z,{radius,mass});markDirty();return changed;}
  function harvest(x,z,opts={}){
    ensure();
    const biome=field.ecology.sample(x,z).biome;
    const result=state.harvest(x,z,{...opts,biome});markDirty();return result;
  }
  function ignite(x,z,opts={}){
    ensure();const changed=state.ignite(x,z,{...opts,
      moistureAt:opts.moistureAt??((a,b)=>field.ecology.sample(a,b).moisture)});
    markDirty();return changed;
  }
  function water(x,z,opts={}){ensure();const changed=state.water(x,z,opts);markDirty();return changed;}
  function advanceDays(days){ensure();const day=state.advanceDays(days);markDirty();return day;}
  function restore(save){ensure();state.restore(save);markDirty();field.build(player.x,player.z);dirty=false;}
  function setQuality(next){ensure();if(next===quality)return;quality=next;makeField();dirty=false;refreshClock=0;}
  function getGameplay(x,z){ensure();return {...field.getGameplay(x,z),vegetation:state.sample(x,z)};}
  function getStats(){return {...field.getStats(),state:state.getStats()};}
  function dispose(){if(disposed)return;field.dispose();disposed=true;}
  return {update,step,harvest,ignite,water,advanceDays,restore,serialize:()=>state.serialize(),
    setQuality,setAtmosphere:(args)=>{ensure();field.setAtmosphere(args);},getGameplay,getStats,dispose,
    state,get field(){return field;}};
}
