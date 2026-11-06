/** Example: optional bridge for the active Ash & Aether runtime.
 * Import where world scene, movement, hit resolution and chapter-saving already exist.
 * This file is intentionally a function, NOT a top-level patch to any game globals.
 */
import {createGroundSystem,materialOfRoom} from './ground-runtime.mjs';
import {GroundDynamics} from './ground-dynamics.mjs';
import {createMaterialLocator,createNarrativeWearField} from './ground-synthesis.mjs';
export function installGroundPass(THREE,scene,{
 room={tags:['plaza']},bounds={x:0,z:0,width:40,depth:40},
 entrances=[],materialRegions=[],terrainHeight=()=>0,
 quality='balanced',seed=61029,
 onWorldEvent=()=>{}
}={}){
 const originX=bounds.x,originZ=bounds.z;
 const regionMaterial=createMaterialLocator(materialRegions,materialOfRoom(room));
 const wear=createNarrativeWearField({paths:entrances.map(e=>({points:e.path,width:e.width??1,wear:e.wear??.75}))});
 const flooring=createGroundSystem(THREE,scene,{
  materialAt:regionMaterial,originX,originZ,metresX:bounds.width,metresZ:bounds.depth,
  resolution:quality==='mobile'?192:quality==='ultra'?768:384,
  terrainHeight,seed,weatherAt:wear,onGameplayEvent:onWorldEvent,
  segments:quality==='mobile'?32:96
 });
 const grid=new GroundDynamics({
  columns:Math.min(128,Math.max(2,Math.ceil(bounds.width))),
  rows:Math.min(128,Math.max(2,Math.ceil(bounds.depth))),
  cellSize:Math.max(bounds.width/Math.min(128,Math.max(2,Math.ceil(bounds.width))),bounds.depth/Math.min(128,Math.max(2,Math.ceil(bounds.depth)))),
  originX:originX-bounds.width/2,originZ:originZ-bounds.depth/2,
  materialAt:regionMaterial,seed,onEvent:onWorldEvent
 });
 // Entrances, aisles, drains can be passed to generateGroundMaps(weatherAt: ...)
 // for baked doorway-specific scuffs. It is optional to avoid visual overpainting.
 return {
  flooring,grid,wear,
  onFootstep(x,z,{actor='player',weight=1,speed=1,stealth=0}={}){
   flooring.onStep(x,z,actor,speed);
   return grid.step(x,z,{actor,weight,speed,stealth});
  },
  onHit(x,z,{element='kinetic',strength=.6,actor='player'}={}){
   flooring.impact(x,z,{element,force:strength});
   return grid.impact(x,z,{element,strength,actor});
  },
  update(dt,climate){flooring.update(dt);grid.tick(dt,climate);},
  save(){return grid.save();},
  load(snapshot){return grid.load(snapshot);},
  dispose(){flooring.dispose();}
 };
}
