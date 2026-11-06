/**
 * Production-safe A&A environment attachment for an EXTERNAL canonical game.
 * No Site source, renderer, world simulation, inventory or battle resolver is owned here.
 * Explicit map registration, map-scoped state, idempotent events and opt-in visual queries.
 */
import {GroundDynamics} from './ground-dynamics.mjs?v=5.21.0';
import {getGroundMaterial} from './ground-materials.mjs?v=5.21.0';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const elementNames=new Set(['water','fire','lightning','aether','frost','kinetic']);
// Structural metadata is authoritative. An explicit grassAllowed flag wins.
const NON_GRASS_CLASSES=new Set(['water','interior','pavement','road','floor','bridge','dock','stairs','roof','temple','house','courtyard','plaza','canal','riverbed','broken-crossing']);
const NON_GRASS_MATERIALS=new Set(['clay-road','clay-herringbone','clay-floorboards','clay-terracotta','clay-rug','clay-mosaic','clay-thresh','water-dock','water-canal','water-deep','water-seep','aether-enamel','aether-glass','aether-celestial','aether-brass','ash-grate','ash-kiln','ash-fire-mosaic']);
export function groundAllowsVegetation(meta){
 if(meta?.grassAllowed===true||meta?.grassAllowed===false)return meta.grassAllowed;
 if(!meta||typeof meta!=='object')return true;
 if(meta.built===true)return false;
 if([meta.type,meta.surfaceClass,meta.structuralTag].some(v=>typeof v==='string' && NON_GRASS_CLASSES.has(v.toLowerCase())))return false;
 return !NON_GRASS_MATERIALS.has(meta.id);
}
function validId(id){if(typeof id!=='string'||!id||id.length>128)throw new TypeError('Expected nonempty map/event id (max 128 chars)');return id;}
function validatePosition(x,z){if(!Number.isFinite(x)||!Number.isFinite(z))throw new TypeError('Position must have finite x and z');}
function definitionMaterial(spec,x,z){
 const source=spec.surfaceAt(x,z);
 const object=typeof source==='string'?{id:source}:source;
 if(!object||typeof object.id!=='string')throw new TypeError('surfaceAt must return a material ID or {id,...}');
 getGroundMaterial(object.id);
 return object;
}
function gridConfig(spec){
 if(!spec||typeof spec!=='object'||typeof spec.surfaceAt!=='function')throw new TypeError('A map requires a surfaceAt function');
 const {columns,rows,cellSize,originX,originZ}=spec;
 if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<2||rows<2||columns*rows>65536)throw new RangeError('Invalid map dimensions');
 if(!Number.isFinite(cellSize)||cellSize<=0||!Number.isFinite(originX)||!Number.isFinite(originZ))throw new RangeError('Invalid map coordinates');
 return {columns,rows,cellSize,originX,originZ};
}

export function createProductionGroundAdapter({seed=61029,onEnvironmentEvent=()=>{},maxMaps=48,maxEventIds=4096}={}){
 if(!Number.isInteger(maxMaps)||maxMaps<1||maxMaps>100)throw new RangeError('Invalid map budget');
 if(!Number.isInteger(maxEventIds)||maxEventIds<1||maxEventIds>100000)throw new RangeError('Invalid event budget');
 const maps=new Map(),pending=new Map(),seen=new Set(),order=[];
 let extensions={},listenerFailures=0;
 // Presentation/telemetry listeners must never roll back an already-mutated cell.
 const notify=event=>{try{onEnvironmentEvent(event);}catch{listenerFailures++;}};
 const withEvent=(eventId,handler)=>{
  if(eventId!==undefined&&eventId!==null){
   validId(eventId);
   if(seen.has(eventId))return {ok:false,duplicate:true,eventId};
  }
  const output=handler();
  if(eventId!==undefined&&eventId!==null&&output!==null){
   seen.add(eventId);order.push(eventId);
   while(order.length>maxEventIds)seen.delete(order.shift());
  }
  return output;
 };
 function registerMap(mapId,spec){
  validId(mapId);
  if(maps.has(mapId))throw new RangeError('Map already registered: '+mapId);
  if(maps.size>=maxMaps)throw new RangeError('Ground map budget exceeded');
  const opts=gridConfig(spec);
  const grid=new GroundDynamics({...opts,seed,materialAt:(x,z)=>definitionMaterial(spec,x,z).id,
   onEvent:event=>notify({mapId,...event})});
  // Reload a previously visited map when its geometry becomes available.
  // Incompatible geometry fails without altering the map registry.
  const cached=pending.get(mapId);
  if(cached)grid.load(cached);
  maps.set(mapId,{grid,spec});
  pending.delete(mapId);
  return {mapId,cells:grid.columns*grid.rows};
 }
 function entry(mapId){validId(mapId);const target=maps.get(mapId);if(!target)throw new RangeError('Unregistered map: '+mapId);return target;}
 function surface(mapId,x,z){validatePosition(x,z);const {grid,spec}=entry(mapId),g=grid.surface(x,z);
  if(!g)return null;
  const meta=definitionMaterial(spec,x,z);
  const built=meta.built===true,grassAllowed=groundAllowsVegetation(meta);
  return {...g,mapId,built,grassAllowed,structuralTag:meta.structuralTag??null};
 }
 function movement(mapId,x,z){const g=surface(mapId,x,z);if(!g)return null;
  return {surface:g,traction:g.traction,noise:g.noise,trackPersistence:g.tracePersistence,
   movementMultiplier:clamp(g.movementCost,1,3),coverDelta:clamp((g.groundShield-.25)*.16,-.12,.12),
   vegetationAllowed:g.grassAllowed};
 }
 function battleModifier({mapId,x,z,element='kinetic'}={}){
  const g=surface(mapId,x,z);if(!g)return {multiplier:1,coverDelta:0,materialId:null};
  const delta={fire:.11*g.temperature-.13*g.wetness,water:.10*g.temperature+.06*g.wetness,
   kinetic:.10*g.groundShield-.12*g.fracture,lightning:.17*g.conduction+.12*g.charge,
   frost:.08*g.wetness-.05*g.temperature,aether:.14*g.phase+.10*g.resonance}[element]??0;
  return {multiplier:clamp(1+delta,.65,1.4),coverDelta:clamp((g.groundShield-.25)*.16,-.12,.12),
   materialId:g.id,environment:{wet:g.wetness,heat:g.temperature,charge:g.charge,phase:g.phase,fracture:g.fracture}};
 }
 /** Pure transformation of an ALREADY resolved hit. No canonical combat call. Apply ONCE. */
 function augmentResolvedHit(result,where){
  if(!result||!Number.isFinite(result.damage))throw new TypeError('A resolved hit must have numeric damage');
  if(result._aaGroundAppliedVersion===1)return result;
  const modifier=battleModifier(where);
  return {...result,damage:+(result.damage*modifier.multiplier).toFixed(6),
   groundBaseDamage:result.damage,groundMultiplier:modifier.multiplier,groundMaterial:modifier.materialId,
   _aaGroundAppliedVersion:1};
 }
 function footstep({mapId,x,z,eventId,actor='player',weight=1,speed=1,stealth=0}={}){
  return withEvent(eventId,()=>{validatePosition(x,z);return entry(mapId).grid.step(x,z,{actor,weight,speed,stealth});});
 }
 function impact({mapId,x,z,eventId,element='kinetic',strength=.6,actor='world'}={}){
  return withEvent(eventId,()=>{validatePosition(x,z);if(!elementNames.has(element))throw new RangeError('Unsupported element');return entry(mapId).grid.impact(x,z,{element,strength,actor});});
 }
 function tick({mapId,eventId,elapsed=1,rain=0,ambientHeat=.16,wind=.2}={}){
  return withEvent(eventId,()=>{if(!Number.isFinite(elapsed)||elapsed<0)throw new RangeError('Invalid elapsed duration');
   entry(mapId).grid.tick(elapsed,{rain,ambientHeat,wind});return {ok:true,mapId,elapsed};});
 }
 function syncMap(mapId){const {grid,spec}=entry(mapId);let changed=0;
  // Authored rebuilds can fail while an asynchronous map/editor update is
  // incomplete. Validate every material before committing any change.
  const nextMaterials=grid.materials.map((_,i)=>definitionMaterial(spec,...grid.world(i)).id);
  for(let i=0;i<nextMaterials.length;i++)if(nextMaterials[i]!==grid.materials[i])changed++;
  if(changed)grid.materials=nextMaterials;
  return changed;
 }
 function save(){return {schema:'aa-production-ground-v1',seed,
  maps:Object.fromEntries([...pending.entries(),...Array.from(maps,([id,{grid}])=>[id,grid.save()])]),seenEventIds:[...order],
  ...structuredClone(extensions)};}
 /** Transactional restore: invalid one-map state never partially changes other maps. */
 function restore(saved){
  if(saved?.schema!=='aa-production-ground-v1'||saved.seed!==seed||!saved.maps||typeof saved.maps!=='object')throw new RangeError('Incompatible environment save');
  if(Array.isArray(saved.maps)||Object.keys(saved.maps).length>maxMaps*4)throw new RangeError('Invalid saved map index');
  const loaded=new Map(),unloaded=new Map();
  for(const [id,snap] of Object.entries(saved.maps)){
   validId(id);
   const old=maps.get(id);if(!old){unloaded.set(id,structuredClone(snap));continue;} // Preserve unloaded map snapshots
   const {grid,spec}=old;
   const candidate=new GroundDynamics({...gridConfig(spec),seed,materialAt:(x,z)=>definitionMaterial(spec,x,z).id});
   candidate.load(snap);loaded.set(id,candidate);
  }
  const ids=saved.seenEventIds??[];
  if(!Array.isArray(ids)||ids.length>maxEventIds||ids.some(id=>typeof id!=='string'||id.length>128))throw new RangeError('Malformed event ledger');
  // Preserve future schema extensions and defer unknown maps without losing them.
  const extras=Object.fromEntries(Object.entries(saved).filter(([key])=>!['schema','seed','maps','seenEventIds'].includes(key)));
  const safeExtras=structuredClone(extras);
  for(const [id,candidate] of loaded){candidate.onEvent=event=>notify({mapId:id,...event});maps.get(id).grid=candidate;}
  pending.clear();for(const [id,snap] of unloaded)pending.set(id,snap);
  extensions=safeExtras;
  seen.clear();order.length=0;for(const id of ids){if(!seen.has(id)){seen.add(id);order.push(id);}}
  return {restoredMaps:loaded.size,deferredMaps:unloaded.size,skippedMaps:unloaded.size};
 }
 return {registerMap,get listenerFailures(){return listenerFailures;},unregisterMap:(id,{preserve=true}={})=>{
  const old=maps.get(id);if(!old)return false;
  if(preserve)pending.set(id,old.grid.save());else pending.delete(id);
  return maps.delete(id);
 },surface,movement,battleModifier,augmentResolvedHit,
  footstep,impact,tick,syncMap,save,restore,get registeredMaps(){return [...maps.keys()];}};
}
