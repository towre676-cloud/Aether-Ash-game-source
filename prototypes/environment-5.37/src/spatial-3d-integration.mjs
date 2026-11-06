/** A&A 5.37 additive visual host adapter.
 * Host owns the one scene, animation clock, save, characters and every gameplay action.
 * A failed texture/shader/geometry pass never leaves an empty game scene.
 */
import {authorScene,placementHealth} from './scene-composer.mjs';
import {buildDungeonSequence,applyDungeonAction} from './dungeon-director.mjs';
import {buildMusicPlan} from './music-continuity.mjs';
import {createEnvironmentRenderer} from './environment-renderer.mjs';

export function createSpatialAuthoringLayer(host){
 if(!host)throw new Error('host required');
 const graphics=host.graphics||{};
 let ownedRenderer=null,art=graphics.environmentRenderer||null,lastBuild=null,lastDungeon=null,destroyed=false;
 const report=(err)=>host.telemetry?.reportEnvironmentFallback?.(err);
 const showLegacy=(visible)=>graphics.setLegacySceneryVisible?.(visible);
 if(!art&&graphics.THREE&&graphics.scene){
  try{ownedRenderer=createEnvironmentRenderer({THREE:graphics.THREE,scene:graphics.scene,
   heightAt:(x,z)=>host.world?.heightAt?.(x,z)??0,
   obstacleAt:(x,z)=>host.world?.obstacleAt?.(x,z)??false,
   pathAt:(x,z)=>host.world?.pathAt?.(x,z)??0,
   materialAt:(x,z)=>host.world?.materialAt?.(x,z)??host.world?.surfaceAt?.(x,z)??null,
   biomassAt:(x,z)=>host.world?.biomassAt?.(x,z)??1,
   quality:graphics.environmentQuality||'high',
   lightingMode:graphics.useAuthoredLights?'authored':'host-owned'});art=ownedRenderer;
  }catch(err){report(err);showLegacy(true);}
 }
 const guardedDraw=(kind,spec,operation)=>{
  if(!art||graphics.enableAuthoredEnvironment===false)return null;
  try{
   const result=operation();const stats=art.stats?.();
   // Do not conceal the original world if the art render produced nothing.
   if(stats&&typeof stats.meshes==='number'&&stats.meshes===0){
    throw new Error(`Authored ${kind} drew zero visible meshes`);
   }
   showLegacy(false);return result;
  }catch(err){
   art.clear?.();showLegacy(true);report(err);return null;
  }
 };
 const bridge={
  get environmentRenderer(){return art||null;},
  get status(){return {visualAttached:!!art&&graphics.enableAuthoredEnvironment!==false,lastBuild,lastDungeon,ownsRenderer:!!ownedRenderer};},
  composeScene(spec){
   if(destroyed)throw new Error('Environment layer already disposed');
   const authored=authorScene(spec);
   // This inherited 5.32 gameplay/layout callback stays unchanged; renderer
   // itself NEVER writes actor poses, doors, collision, quests or saves.
   host.world?.applyAuthoredLayout?.(authored);
   guardedDraw('scene',spec,()=>art.draw(authored,{region:spec?.region||host.world?.region||'clay',
    quality:graphics.environmentQuality||'high',
    surfaceMode:graphics.replaceFlatGround===true?'replace-flat':'none',
    materialAt:host.world?.materialAt?((x,z)=>host.world.materialAt(x,z)):(host.world?.surfaceAt?((x,z)=>host.world.surfaceAt(x,z)):null),
    biomassAt:host.world?.biomassAt?((x,z)=>host.world.biomassAt(x,z)):null,
    excludeExistingArchitecture:graphics.excludeExistingArchitecture===true}));
   lastBuild=authored.id;lastDungeon=null;
   return {authored,health:placementHealth(authored),environmentStats:art?.stats?.()||null};
  },
  composeDungeon(spec){
   if(destroyed)throw new Error('Environment layer already disposed');
   const dungeon=buildDungeonSequence(spec);host.world?.registerDungeonSequence?.(dungeon);
   guardedDraw('dungeon',spec,()=>art.drawDungeon(dungeon,{
    region:spec?.region||'ash',activeOnly:graphics.activeDungeonRoomOnly!==false,
    activeIndex:graphics.activeDungeonRoomIndex||0,
    solvedRoomIds:host.world?.getSolvedDungeonRoomIds?.(dungeon.id)||[]}));
   lastDungeon=dungeon;lastBuild=null;return dungeon;
  },
  showDungeonRoom(dungeon,roomIndex){
   if(!art||!dungeon?.rooms?.[roomIndex]||destroyed)return false;
   return !!guardedDraw('dungeon-room',dungeon,()=>art.drawDungeon(dungeon,{
    region:dungeon.region,activeOnly:true,activeIndex:roomIndex,
    solvedRoomIds:host.world?.getSolvedDungeonRoomIds?.(dungeon.id)||[]}));
  },
  act(room,verb){
   // An existing 5.32 gameplay hook: no new combat resolver or extra action.
   const result=applyDungeonAction(room,verb);
   if(result.success){host.world?.applyVisibleConsequence?.(result);art?.showDungeonConsequence?.(result);}
   return result;
  },
  music(spec){const plan=buildMusicPlan(spec);host.audio?.setAdaptivePlan?.(plan);return plan;},
  tick(delta,elapsed){if(!destroyed)art?.tick?.(delta,elapsed);},
  clearVisuals(){art?.clear?.();showLegacy(true);lastBuild=null;lastDungeon=null;},
  // Host code calls this after the *real* game event has already been resolved.
  // Dispatch only reversible visual effects; no action, save, item, or collision.
  onVisualEvent(type,payload={}){
   if(destroyed)return false;
   switch(type){
    case 'building-entered':return art?.revealInterior?.(payload.anchorId,true)??false;
    case 'building-left':return art?.revealInterior?.(payload.anchorId,false)??false;
    case 'building-door-opened':return art?.setDoorState?.(payload.anchorId,true)??false;
    case 'building-door-closed':return art?.setDoorState?.(payload.anchorId,false)??false;
    case 'weather-changed':return art?.environmentMood?.(payload)??false;
    case 'dungeon-room-entered':return bridge.showDungeonRoom(payload.dungeon||lastDungeon,payload.index);
    case 'dungeon-consequence':return art?.showDungeonConsequence?.(payload)??false;
    case 'scene-unloaded':bridge.clearVisuals();return true;
    default:return false;
   }
  },
  /** Opt-in bindings, source event names supplied by the real game author.
   * No assumed A&A event schema and no silent duplicate registration.
   */
  wireVisualEvents(bus,eventNames={}){
   if(!bus?.on)throw new TypeError('existing host event bus required');
   const events=['building-entered','building-left','building-door-opened','building-door-closed','weather-changed','dungeon-room-entered','dungeon-consequence','scene-unloaded'];
   const off=events.map(kind=>bus.on(eventNames[kind]||kind,data=>bridge.onVisualEvent(kind,data)));
   let active=true;return ()=>{if(!active)return;active=false;for(const f of off)if(typeof f==='function')f();};
  },
  dispose(){if(destroyed)return;destroyed=true;ownedRenderer?.dispose?.();showLegacy(true);}
 };
 return bridge;
}
