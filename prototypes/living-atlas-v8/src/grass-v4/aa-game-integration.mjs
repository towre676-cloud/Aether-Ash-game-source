/** Ash & Aether v3 vegetation compatibility layer.
 * Designed for 5.16+ game source, Ground Forge and Living World Laboratory.
 * None of their source APIs are assumed: a game-owned terrain sampler, events,
 * save slot, camera, and inventory/battle logic must be explicitly injected.
 *
 * Source-of-truth contract:
 *   GAME  owns world/day, regions, doors/interiors, camera, mobs, inventory, saves.
 *   GROUND FORGE owns soil/floor/weather/material facts and physical ground.
 *   THIS  owns vegetation disturbances and derived gameplay-readable samples.
 * Renderer selection NEVER changes simulation or inventory rewards.
 */
import {createVegetationState} from './grass-state.mjs';
import {createEcology} from './grass-ecology.mjs';
import {createLivingLandscape} from './living-landscape.mjs';
import {createCanvasGrassFallback} from './canvas-grass-fallback.mjs';
import {createGroundForgeVegetationBridge,evaluateVegetationMaterialEffects} from './ground-forge-compat.mjs';
import {createFoliageQualityGovernor} from './foliage-quality-governor.mjs';

export const AA_VEGETATION_BRIDGE_VERSION=4;
const PREVIOUS_BRIDGE_VERSION=3;
const REWARD_RECEIPT_LIMIT=50000;
const EVENT_LIMIT=768;
const finite=(n)=>typeof n==='number' && Number.isFinite(n);
const validId=(s)=>typeof s==='string'&&s.length>0&&s.length<=160;
const safeString=(s)=>{if(!validId(s))throw Error('invalid timeline or event id');return s;};
const ensure=(v)=>{if(!finite(v))throw Error('expected finite number');return v;};
const cap=(v,lo,hi)=>Math.min(hi,Math.max(lo,ensure(v)));

export function createAAGameVegetationBridge(config={}){
  const ground=config.groundBridge??createGroundForgeVegetationBridge(config.groundOptions??{});
  if(typeof ground.sample!=='function'||!ground.ecologyOptions)throw Error('ground bridge missing sample/ecologyOptions');
  const initialTimeline=config.timelineId??'main';safeString(initialTimeline);
  const renderMode=config.renderMode??(config.THREE&&config.scene?'gpu':'canvas');
  if(!['gpu','canvas','none'].includes(renderMode))throw Error('renderMode must be gpu, canvas or none');
  if(renderMode==='gpu'&&(!config.THREE||!config.scene))throw Error('GPU mode requires THREE and scene');
  const slots=new Map();
  let current=null,disposed=false,quality=config.quality??'medium';
  let settings={reducedMotion:!!config.reducedMotion,highContrast:!!config.highContrast};
  const governor=createFoliageQualityGovernor({quality,minimum:config.minimumQuality??'low',
    maximum:config.maximumQuality??'ultra',targetFrameMs:config.targetFrameMs??33.3,
    enabled:!!config.autoQuality});
  let unsubscribers=[];const counters={events:0,duplicates:0,harvests:0,timelineSwitches:0};
  const assertLive=()=>{if(disposed)throw Error('vegetation bridge disposed');};

  function createRuntime(id,seed,initialSave=null){
    const state=createVegetationState({seed,cellSize:config.cellSize??.8,
      maxCells:config.maxCells??18000,initialDay:config.initialDay??0});
    const seen=[];const seenSet=new Set();
    const rewardIds=[];const rewardSet=new Set();
    // Validation occurs BEFORE any mutation, including unsupported saves.
    if(initialSave){
      let veg=initialSave;
      if([PREVIOUS_BRIDGE_VERSION,AA_VEGETATION_BRIDGE_VERSION].includes(initialSave.bridgeVersion)){
        if(initialSave.timelineId!==id||initialSave.seed!==seed || !Array.isArray(initialSave.recentEventIds) ||
           initialSave.recentEventIds.length>EVENT_LIMIT || initialSave.recentEventIds.some(x=>!validId(x)))throw Error('incompatible vegetation timeline');
        if(new Set(initialSave.recentEventIds).size!==initialSave.recentEventIds.length)throw Error('duplicate event ids in save');
        veg=initialSave.vegetation;
        seen.push(...initialSave.recentEventIds);seen.forEach(x=>seenSet.add(x));
        if(initialSave.bridgeVersion===AA_VEGETATION_BRIDGE_VERSION){
          const ids=initialSave.rewardEventIds;
          if(!Array.isArray(ids)||ids.length>REWARD_RECEIPT_LIMIT || ids.some(x=>!validId(x)) ||
             new Set(ids).size!==ids.length)throw Error('invalid persistent reward receipts');
          rewardIds.push(...ids);ids.forEach(x=>rewardSet.add(x));
        }
      }
      state.restore(veg);  // Accept old v2 bare grass-state snapshots.
    }
    const options={...ground.ecologyOptions,seed,quality,
      growthAt:(x,z)=>state.sample(x,z),state,origin:config.origin??{x:0,z:0},
      maxPlants:config.maxPlants,wind:settings.reducedMotion?0:(config.wind??.27)};
    const ecology=createEcology(options);
    const gpu=renderMode==='gpu'?createLivingLandscape(config.THREE,config.scene,options):null;
    const canvas=renderMode==='canvas'?createCanvasGrassFallback({...options,
      quality:quality==='ultra'?'high':quality,highContrast:settings.highContrast,ecology,
      worldToScreen:config.worldToScreen}):null;
    return {id,seed,state,seen,seenSet,rewardIds,rewardSet,options,ecology,gpu,canvas};
  }
  function remember(rt,id){
    if(!id)return;
    rt.seen.push(id);rt.seenSet.add(id);
    while(rt.seen.length>EVENT_LIMIT){rt.seenSet.delete(rt.seen.shift());}
  }
  function snapshot(rt=current){return {bridgeVersion:AA_VEGETATION_BRIDGE_VERSION,timelineId:rt.id,
    seed:rt.seed,vegetation:rt.state.serialize(),recentEventIds:[...rt.seen],rewardEventIds:[...rt.rewardIds]};}
  function start(id,seed,save=null){
    current=createRuntime(id,seed,save);
  }
  start(initialTimeline,config.seed??316,config.initialSave??null);

  /** Only called after game confirms an authoritative event.
   * Reward is returned to caller; we NEVER mutate game's inventory.
   * `harvest` requires stable eventId for once-only rewards per saved timeline.
   */
  function applyEvent(event){
    assertLive();ground.invalidate?.();if(!event||typeof event.type!=='string')throw Error('typed event required');
    if(event.timelineId!==undefined && event.timelineId!==current.id)throw Error('event belongs to a different timeline');
    const id=event.eventId;if(id!==undefined)safeString(id);
    if(event.type==='harvest'&&!id)throw Error('harvest requires stable eventId to prevent repeat rewards');
    if(id&&(current.seenSet.has(id)||current.rewardSet.has(id))){counters.duplicates++;return {duplicate:true,type:event.type,changed:0,quantity:0};}
    // A full receipt journal fails closed rather than silently re-enabling old rewards.
    if(event.type==='harvest' && current.rewardIds.length>=REWARD_RECEIPT_LIMIT)
      throw Error('vegetation reward receipt limit reached; host must compact authoritative transactions');
    let changed=0,result;
    const x=event.x,z=event.z;
    if(['footfall','harvest','fire','water'].includes(event.type)){
      ensure(x);ensure(z);
      if(ground.sample(x,z).blocked)return {type:event.type,blocked:true,changed:0,quantity:0};
    }
    switch(event.type){
      case 'footfall':
        changed=current.gpu?current.gpu.step(x,z,cap(event.radius??.65,.1,2),cap(event.mass??1,0,3)):
          current.state.trample(x,z,{radius:cap(event.radius??.65,.1,2),mass:cap(event.mass??1,0,3)});
        break;
      case 'harvest': {
        const biome=current.ecology.sample(x,z).biome;
        result=current.gpu?current.gpu.harvest(x,z,{radius:cap(event.radius??1,.1,4),effort:cap(event.effort??1,0,1)}):
          current.state.harvest(x,z,{radius:cap(event.radius??1,.1,4),effort:cap(event.effort??1,0,1),biome});
        changed=result.changed;counters.harvests++;
        break;
      }
      case 'fire': {
        const cfg={radius:cap(event.radius??1.2,.1,6),strength:cap(event.strength??1,0,1),
          moistureAt:(a,b)=>ground.sample(a,b).moisture};
        changed=current.gpu?current.gpu.ignite(x,z,cfg):current.state.ignite(x,z,cfg);
        break;
      }
      case 'water':{
        const args={radius:cap(event.radius??1.2,.1,6),amount:cap(event.amount??1,0,1)};
        changed=current.gpu?current.gpu.water(x,z,args):current.state.water(x,z,args);
        break;
      }
      case 'day': {
        const day=ensure(event.worldDay);
        if(current.gpu)current.gpu.update(0,null,{worldDay:day});
        else current.state.setDay(day);
        break;
      }
      default: throw Error('unrecognized vegetation event type: '+event.type);
    }
    // Journal is committed after the effect, so a rejected event is not cached.
    remember(current,id);
    if(event.type==='harvest' && !result?.blocked){
      current.rewardIds.push(id);current.rewardSet.add(id);
    }
    counters.events++;
    return {type:event.type,changed,...(result||{}),duplicate:false};
  }
  function sample(x,z,actor={}){
    assertLive();ensure(x);ensure(z);
    const base=ground.sample(x,z);
    const eco=current.ecology.sample(x,z),gameplay=current.ecology.gameplay(x,z);
    return {ground:base,vegetation:eco,gameplay,
      combined:evaluateVegetationMaterialEffects(base,eco,actor)};
  }
  function tick(dt=0,actor=null,{worldDay,wind,rain,fogColor,sunTint,windDirection}={}){
    assertLive();
    if(worldDay!==undefined && !current.gpu){current.state.setDay(ensure(worldDay));}
    ground.invalidate?.();
    const tier=governor.observe(dt);
    if(tier){quality=tier;current.gpu?.setQuality(tier);
      if(current.canvas)current.canvas=createCanvasGrassFallback({...current.options,
        quality:tier==='ultra'?'high':tier,highContrast:settings.highContrast,
        ecology:current.ecology,worldToScreen:config.worldToScreen});}
    if(current.gpu){
      current.gpu.setAtmosphere({wind:settings.reducedMotion?0:wind,rain,fogColor,sunTint,windDirection});
      current.gpu.update(cap(ensure(dt),0,.1),actor,{worldDay});
    }
  }
  /** Call after the HOST updates material/biome/ground masks. Does not modify
   * gameplay state or create a second terrain scheduler. Visuals rebuild on tick.
   */
  function notifyTerrainChanged(){assertLive();ground.invalidate?.();current.gpu?.requestRebuild();}
  function draw(ctx,options){
    assertLive();if(!current.canvas)throw Error('Canvas draw is not active for this renderer mode');
    return current.canvas.draw(ctx,{...options,wind:settings.reducedMotion?0:options?.wind});
  }
  function setVisualSettings(next={}){
    assertLive();settings={...settings,reducedMotion:next.reducedMotion??settings.reducedMotion,
      highContrast:next.highContrast??settings.highContrast};
    if(next.autoQuality!==undefined)governor.setEnabled(next.autoQuality);
    if(next.quality && next.quality!==quality){
      governor.setQuality(next.quality);
      quality=next.quality;
      if(current.gpu)current.gpu.setQuality(quality);
    }
    if(current.canvas)current.canvas=createCanvasGrassFallback({...current.options,
      quality:quality==='ultra'?'high':quality,ecology:current.ecology,
      highContrast:settings.highContrast,worldToScreen:config.worldToScreen});
    current.gpu?.setAtmosphere({wind:settings.reducedMotion?0:config.wind??.27,
      contrast:settings.highContrast?1.28:1});
  }
  function switchTimeline({timelineId,seed,initialSave=null}={}){
    assertLive();safeString(timelineId);if(!Number.isSafeInteger(seed))throw Error('timeline world seed must be an integer');
    const id=timelineId;
    if(id===current.id&&seed===current.seed && !initialSave)return snapshot();
    slots.set(current.id,snapshot());
    const previous=current;
    // Snapshot persisted before replacing anything. Invalid incoming data leaves current live.
    let next;
    try{
      previous.gpu?.dispose();
      next=createRuntime(id,seed,initialSave??slots.get(id)??null);
    }catch(error){
      current=createRuntime(previous.id,previous.seed,slots.get(previous.id));
      throw error;
    }
    current=next;counters.timelineSwitches++;
    return snapshot();
  }
  function restore(save){
    assertLive();if(!save)return false; // Old saves lacking vegetation are untouched.
    if([PREVIOUS_BRIDGE_VERSION,AA_VEGETATION_BRIDGE_VERSION].includes(save.bridgeVersion) && (save.timelineId!==current.id||save.seed!==current.seed)){
      throw Error('vegetation save does not belong to this timeline');
    }
    // Validate using a fresh state first; failed restore does not corrupt progress.
    const verified=createVegetationState({seed:current.seed,cellSize:config.cellSize??.8,maxCells:config.maxCells??18000});
    const isBridge=[PREVIOUS_BRIDGE_VERSION,AA_VEGETATION_BRIDGE_VERSION].includes(save.bridgeVersion);
    const entries=isBridge?save.vegetation:save;
    verified.restore(entries);
    if(isBridge){
      if(!Array.isArray(save.recentEventIds)||save.recentEventIds.length>EVENT_LIMIT||
        save.recentEventIds.some(x=>!validId(x))||new Set(save.recentEventIds).size!==save.recentEventIds.length)throw Error('invalid vegetation journal');
      if(save.bridgeVersion===AA_VEGETATION_BRIDGE_VERSION &&
        (!Array.isArray(save.rewardEventIds)||save.rewardEventIds.length>REWARD_RECEIPT_LIMIT||
         save.rewardEventIds.some(x=>!validId(x)) ||
         new Set(save.rewardEventIds).size!==save.rewardEventIds.length))throw Error('invalid persistent reward receipts');
    }
    current.state.restore(entries);
    current.seen.splice(0,current.seen.length,...(save.recentEventIds??[]));
    current.seenSet.clear();for(const x of current.seen)current.seenSet.add(x);
    current.rewardIds.splice(0,current.rewardIds.length,...(save.rewardEventIds??[]));
    current.rewardSet.clear();for(const x of current.rewardIds)current.rewardSet.add(x);
    if(current.gpu)current.gpu.restore(entries);
    return true;
  }
  /** Host events are not guessed. Explicit map keys are host event names;
   * map values are synchronous converters to typed events, or null to skip.
   */
  function bindHostEvents(subscribe,mapping){
    assertLive();if(typeof subscribe!=='function')throw Error('subscribe must be a function');
    if(!mapping||typeof mapping!=='object')throw Error('explicit host event mapping required');
    const offs=[];
    try{
      for(const [eventType,toVegetation] of Object.entries(mapping)){
        if(typeof toVegetation!=='function')throw Error('event adapter must be a function');
        const off=subscribe(eventType,payload=>{
          const converted=toVegetation(payload);
          if(converted)applyEvent(converted);
        });
        if(typeof off!=='function')throw Error('subscribe must return an unsubscriber');
        offs.push(off);
      }
    }catch(error){offs.forEach(off=>off());throw error;}
    unsubscribers.push(...offs);
    return ()=>{for(const off of offs){off();unsubscribers=unsubscribers.filter(x=>x!==off);}};
  }
  function getStats(){assertLive();return {version:AA_VEGETATION_BRIDGE_VERSION,mode:renderMode,
    quality,timelineId:current.id,materialAdapter:'injected',state:current.state.getStats(),
    gpu:current.gpu?.getStats()??null,journalSize:current.seen.length,permanentRewardReceipts:current.rewardIds.length,...counters,
    reducedMotion:settings.reducedMotion,adaptive:governor.getStats()};}
  function dispose(){if(disposed)return;unsubscribers.forEach(fn=>fn());unsubscribers=[];
    current.gpu?.dispose();slots.clear();disposed=true;}
  return {applyEvent,sample,tick,draw,notifyTerrainChanged,snapshot,restore,switchTimeline,
    bindHostEvents,setVisualSettings,getStats,dispose,
    get timelineId(){return current.id;},get ground(){return ground;}};
}
