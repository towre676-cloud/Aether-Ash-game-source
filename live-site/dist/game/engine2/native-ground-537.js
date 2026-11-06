/** A&A 5.37 ground art adapted to the native shared material atlas.
 * Source: other-session Production Integration Modules, ground-materials.mjs
 * and ground-synthesis.mjs (retained unchanged in aa-env537/). These painted
 * albedo finishes are visual only. The canonical Ground Forge owns mechanics.
 * No route or weather is invented: a repeating swatch cannot encode a real
 * street, and scene-local wear remains with the host's world-space surfaces.
 */
import {getGroundMaterial} from './aa-env537/ground-materials.mjs?v=5.37.0';
import {generateGroundMaps} from './aa-env537/ground-synthesis.mjs?v=5.37.0';
import {environmentFor} from './environment.js?v=5.18.0';
import {isInteriorScene} from './scene-identity.js?v=4.0.0';

const TILE_CACHE=new Map(),MAX_TILES=12,RESOLUTION=128;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const OUTDOOR=Object.freeze({village:'clay-road',woodland:'clay-loam',riverbank:'water-limestone',highland:'clay-fieldstone',ruins:'clay-fieldstone',foundry:'ash-soot-cobble',storm:'water-limestone',salt:'water-salt',coral:'water-coral',mangrove:'water-mud',sand:'water-sand',cactus:'water-sand',ice:'water-salt',aurora:'aether-cloudstone',lava:'ash-basalt',caldera:'ash-slag',spore:'clay-loam',crystal:'aether-shale',marble:'aether-marble'});
const SUBSTRATE=Object.freeze({village:'clay-loam',woodland:'clay-loam',riverbank:'water-silt',highland:'clay-fieldstone',ruins:'clay-fieldstone',foundry:'ash-basalt',storm:'water-slate',salt:'water-salt',coral:'water-coral',mangrove:'water-mud',sand:'water-sand',cactus:'water-sand',ice:'water-salt',aurora:'aether-cloudstone',lava:'ash-basalt',caldera:'ash-slag',spore:'clay-loam',crystal:'aether-shale',marble:'aether-marble'});

/** Select a finish from the actual scene identity, never by player/camera XY. */
export function nativeGroundFinishPlan(world,{style=null}={}){
 const s=world?.scene||{},env=environmentFor(s),kind=style?.style||(typeof env==='string'?env:env?.style)||'village';
 const indoor=style?.indoor??isInteriorScene(s),key=[s.key,s.interior,s.household?.kind].join(' ').toLowerCase();
 const timber=style?.timber??(indoor&&/home|inn|quarters|carpenter|guild|instrumentworks|attic|assembly/.test(key));
 let floor=OUTDOOR[kind]||'clay-fieldstone';
 if(indoor){
  floor=timber?'clay-floorboards':/clinic|washroom|kitchen/.test(key)?'clay-terracotta':/archive|vault|temple/.test(key)?'aether-marble':/chapel|music|listening/.test(key)?'clay-mosaic':/cistern|drain|canal|pump/.test(key)?'water-seep':/catwalk|security|reactor|console/.test(key)?'aether-enamel':/kiln|forge|pottery/.test(key)?'ash-kiln':'clay-thresh';
 }
 // Underlying soil stays quiet; architectural floors receive readable courses.
 const organic=/loam|silt|mud|sand/.test(floor);
 return {floor,substrate:indoor?'clay-fieldstone':SUBSTRATE[kind]||'clay-fieldstone',floorAlpha:timber?.42:organic?.42:.72,substrateAlpha:.70,metres:3.2,indoor,timber,kind};
}

/** Blend opposite boundaries in a narrow strip. The upstream geology is world
 * aligned; this native repeat atlas additionally needs identical outer pixels.
 * Interior courses and painted mineral variation remain intact.
 */
export function seamlessGroundAlbedo(source,width,height,edge=6){
 if(!(source instanceof Uint8ClampedArray)||source.length!==width*height*4||!Number.isInteger(width)||!Number.isInteger(height)||width<4||height<4)throw new RangeError('Native ground albedo bounds');
 const out=new Uint8ClampedArray(source),band=Math.min(Math.max(1,Math.floor(edge)),Math.floor(Math.min(width,height)/4));
 for(let y=0;y<height;y++)for(let d=0;d<band;d++){
  const a=(y*width+d)*4,b=(y*width+width-1-d)*4,t=1-d/band;
  for(let c=0;c<3;c++){const average=(out[a+c]+out[b+c])*.5;out[a+c]=out[a+c]*(1-t)+average*t;out[b+c]=out[b+c]*(1-t)+average*t;}
 }
 for(let x=0;x<width;x++)for(let d=0;d<band;d++){
  const a=(d*width+x)*4,b=((height-1-d)*width+x)*4,t=1-d/band;
  for(let c=0;c<3;c++){const average=(out[a+c]+out[b+c])*.5;out[a+c]=out[a+c]*(1-t)+average*t;out[b+c]=out[b+c]*(1-t)+average*t;}
 }
 return out;
}

/** One small synthesis per material, held in a bounded LRU across scene loads.
 * Camera motion and animation never call this path. No pixel reads from art.
 */
export function nativeGroundFinishTile(materialId,{documentRef=typeof document==='undefined'?null:document,resolution=RESOLUTION,weather={}}={}){
 getGroundMaterial(materialId);
 if(!documentRef?.createElement)return null;
 const width=Math.max(32,Math.min(128,Math.floor(Number(resolution)||RESOLUTION)));
 const conditions={age:clamp(weather.age??.34),rain:clamp(weather.rain),moss:clamp(weather.moss),heat:clamp(weather.heat),waterline:clamp(weather.waterline),dust:clamp(weather.dust)};
 const key=JSON.stringify([materialId,width,conditions]);
 const previous=TILE_CACHE.get(key);
 if(previous?.owner===documentRef){TILE_CACHE.delete(key);TILE_CACHE.set(key,previous);return previous.canvas;}
 const canvas=documentRef.createElement('canvas');canvas.width=canvas.height=width;
 const context=canvas.getContext?.('2d');if(!context?.createImageData||!context?.putImageData)return null;
 // At128px this supplies large courses, seams and broad substrate variation;
 // the native1024px atlas retains the game's fine painted grain above it.
 const maps=generateGroundMaps({materialId,seed:61029,width,height:width,originX:1.6,originZ:1.6,metresX:3.2,metresZ:3.2,weather:conditions});
 const pixels=context.createImageData(width,width);pixels.data.set(seamlessGroundAlbedo(maps.albedo,width,width));context.putImageData(pixels,0,0);
 canvas.nativeGround537={materialId,resolution:width,metres:3.2};
 TILE_CACHE.set(key,{owner:documentRef,canvas});while(TILE_CACHE.size>MAX_TILES)TILE_CACHE.delete(TILE_CACHE.keys().next().value);
 return canvas;
}

/** Call after the original atlas crops and before the scene's colour wash.
 * The same atlas then goes through both native WebGL and software paths.
 * Returns false on unavailable canvas support so original art remains usable.
 */
export function paintNativeGroundFinish(ctx,world,{style=null,size=512,documentRef=typeof document==='undefined'?null:document,weather={}}={}){
 if(!ctx?.save||!ctx?.restore||!ctx?.drawImage||!Number.isFinite(size)||size<=0)return false;
 const plan=nativeGroundFinishPlan(world,{style});
 let floor,substrate;try{floor=nativeGroundFinishTile(plan.floor,{documentRef,weather});substrate=nativeGroundFinishTile(plan.substrate,{documentRef,weather});}catch{return false;}
 if(!floor||!substrate)return false;
 ctx.save();
 try{
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.globalAlpha=plan.floorAlpha;ctx.drawImage(floor,0,0,floor.width,floor.height,0,0,size,size);
  ctx.globalAlpha=plan.substrateAlpha;ctx.drawImage(substrate,0,0,substrate.width,substrate.height,size,size,size,size);
 }catch{return false;}finally{ctx.restore();}
 return plan;
}

export function nativeGroundFinishCacheStats(){return {tiles:TILE_CACHE.size,maxTiles:MAX_TILES,resolution:RESOLUTION};}
