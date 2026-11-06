/** Production-only bridge, independent of the archived 5.32 dungeon/scene APIs.
 * Takes the CURRENT game's native scene and explicit world-coordinate callbacks.
 * Opt-in: nothing attaches to a live game or modifies its canonical state by import.
 */
import {createEnvironmentRenderer} from './environment-renderer.mjs';
const noop=()=>{};
export function createProductionArtBridge({THREE,scene,world={},quality='high',setOriginalVisibility=null,telemetry=null,replaceFlatGround=false,lightingMode='host-owned'}={}){
 if(!THREE||!scene?.add||!scene?.remove)throw new TypeError('Existing Three.js dependency and scene required');
 const report=e=>telemetry?.reportEnvironmentFallback?.(e);
 // A positive visibility callback cannot be inferred from the game's DOM.
 const visible=setOriginalVisibility||noop;
 let renderer=null,kind='none',error=null,closed=false,renderedOnce=false;
 try{
  renderer=createEnvironmentRenderer({THREE,scene,quality,lightingMode,
   heightAt:(x,z)=>world.heightAt?.(x,z)??0,
   obstacleAt:(x,z)=>world.obstacleAt?.(x,z)??false,
   pathAt:(x,z)=>world.pathAt?.(x,z)??0,
   biomassAt:(x,z)=>world.biomassAt?.(x,z)??1,
   materialAt:(x,z)=>world.materialAt?.(x,z)??world.surfaceAt?.(x,z)??null});
 }catch(e){error=e;report(e);visible(true);}
 const fallback=(e)=>{error=e;try{renderer?.clear();}catch{}visible(true);report(e);return null;};
 const drawSafely=(mode,fn)=>{
  if(!renderer||closed)return null;
  try{
   const out=fn();const stats=renderer.stats();
   if(stats.meshes<1)throw new Error(`No art meshes for ${mode}`);
   kind=mode;renderedOnce=true;visible(false);error=null;return out;
  }catch(e){return fallback(e);}
 };
 return {
  renderScene(layout,{region='clay',surfaceMode=replaceFlatGround?'replace-flat':'none',excludeExistingArchitecture=false}={}){
   // Layout must come from the real map's authored anchors; never synthesize
   // collision or change actor positions to match what the new art drew.
   return drawSafely('world',()=>renderer.draw(layout,{region,quality,surfaceMode,
    excludeExistingArchitecture,materialAt:world.materialAt?((x,z)=>world.materialAt(x,z)):null,
    biomassAt:world.biomassAt?((x,z)=>world.biomassAt(x,z)):null}));
  },
  renderDungeon(dungeon,{region=dungeon?.region||'ash',activeIndex=0,activeOnly=true,solvedRoomIds=[]}={}){
   return drawSafely('dungeon',()=>renderer.drawDungeon(dungeon,{region,activeIndex,activeOnly,solvedRoomIds}));
  },
  update(delta,elapsed){if(!closed)renderer?.tick(delta,elapsed);},
  onEnvironmentEvent({type,anchorId,inside,open,weather,dungeon,roomIndex,consequence}={}){
   if(!renderer||closed)return false;
   switch(type){
    case 'building-visibility':return renderer.revealInterior(anchorId,!!inside);
    case 'door-visibility':return renderer.setDoorState(anchorId,!!open);
    case 'weather-mood':return renderer.environmentMood(weather||{});
    case 'dungeon-room':return !!drawSafely('dungeon',()=>renderer.drawDungeon(dungeon,{activeOnly:true,activeIndex:roomIndex,region:dungeon?.region||'ash'}));
    case 'dungeon-solved':return renderer.showDungeonConsequence(consequence);
    case 'level-unloaded':renderer.clear();kind='none';visible(true);return true;
    default:return false;
   }
  },
  stats(){return renderer?.stats()||null;},
  get status(){return {kind,rendererAvailable:!!renderer,renderedOnce,closed,error:error?.message||null};},
  clear(){renderer?.clear();kind='none';visible(true);},
  dispose(){if(closed)return;closed=true;renderer?.dispose();visible(true);}
 };
}
