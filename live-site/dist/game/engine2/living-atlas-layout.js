/** Host geometry -> Living Grass v6. One tile is one simulation metre.
 * The existing floor, routes, furniture, buildings and doors remain authoritative.
 */
import {isInteriorScene} from './scene-identity.js?v=5.22.0';
import {environmentFor} from './environment.js?v=5.22.0';
import {terrainKind,terrainTrails,terrainNoise} from './terrain-materials.js?v=5.22.0';
import {streetPlan} from './wayfinding.js?v=5.22.0';
import {authoredGroundMaterial} from './reconciled-ground.js?v=5.41';
import {getGroundMaterial} from './reconciled-content/ground/ground-materials.mjs?v=5.22.0';
import {buildingReservations,buildingGroundContains,pointInGroundRect} from './environmental-grounding.js?v=5.22.0';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const HABITATS={grass:'orchard',woodland:'woodland',spore:'bog',mangrove:'riverbank',soil:'riverbank',highland:'alpine',sand:'savanna',salt:'moor',coral:'marsh',crystal:'aether',ice:'tundra',aurora:'tundra',storm:'highlands',ruins:'ruins',cactus:'savanna',lava:'ashlands',foundry:'ashlands',stone:'ruins',marble:'ruins'};
export function atlasLayout(world){
 const scene=world.scene,indoor=isInteriorScene(scene),kind=terrainKind(environmentFor(scene).style),biome=HABITATS[kind]||'meadow';
 const urban=['town','market','hub'].includes(scene.key),roads=urban?streetPlan(scene):new Set(),trails=urban?new Set():new Set(terrainTrails(scene).flat().map(p=>p.join(',')));
 const points=[...(scene.arrive?[{xy:scene.arrive,type:'arrival'}]:[]),...(scene.doors||[]),...(scene.objects||[]).filter(o=>o.type!=='patrol'&&o.type!=='boss')].filter(o=>o.xy).map(o=>({x:o.xy[0]+.5,y:o.xy[1]+.5,r:o.type==='arrival'?1.5:['portal','transport','npc','shop','guide'].includes(o.type)?1.15:.8}));
 const footprints=(scene.objects||[]).flatMap(o=>o.footprint?[o.footprint]:[]),buildings=buildingReservations(scene),routes=new Set([...roads,...trails]);
 let canopy=new Map(),canopyKey=null,numericalAt=null;
 const floor=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&y>=0&&x<scene.width&&y<scene.height&&scene.floor?.[Math.floor(y)]?.[Math.floor(x)]==='.';
 const path=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),key=ix+','+iy;if(roads.has(key))return 1;if(trails.has(key))return .94;let weight=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(routes.has((ix+dx)+','+(iy+dy)))weight=Math.max(weight,smooth((1.5-Math.hypot(x-ix-dx-.5,y-iy-dy-.5))/.9)*.86);return weight;};
 const blocked=(x,y)=>indoor||!floor(x,y)||roads.has(Math.floor(x)+','+Math.floor(y))||buildingGroundContains(buildings,x,y,.1)||buildings.some(b=>pointInGroundRect(b.approach,x,y,.12))||footprints.some(p=>pointInGroundRect(p,x,y,.18))||points.some(p=>Math.hypot(p.x-x,p.y-y)<p.r)||!!scene.affordanceBlocked?.some(p=>Math.floor(x)===p[0]&&Math.floor(y)===p[1]);
 const eligibleTiles=new Map();
 const eligible=(x,y)=>{const key=x+','+y;if(!eligibleTiles.has(key))eligibleTiles.set(key,!blocked(x+.5,y+.5)&&authoredGroundMaterial(scene,x+.5,y+.5).grassAllowed);return eligibleTiles.get(key);};
 // Density thins before material and architecture edges; the plant jitter then
 // breaks up the last row instead of outlining a rectangular material tile.
 const edgeCover=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;let edge=1;if(!eligible(ix-1,iy))edge=Math.min(edge,fx/.8);if(!eligible(ix+1,iy))edge=Math.min(edge,(1-fx)/.8);if(!eligible(ix,iy-1))edge=Math.min(edge,fy/.8);if(!eligible(ix,iy+1))edge=Math.min(edge,(1-fy)/.8);return clamp(edge);};
 const baseGreen=['grass','woodland','spore','mangrove','soil','highland','coral','cactus','sand','ice','aurora','crystal','storm','ruins'].includes(kind);
 // Plant communities follow broad habitat pockets and verges. Open urban courts
 // stay calm; source species retain their identity inside a coherent stand.
 const edgeDepth=new Map();
 function plantingAt(x,y){
  const ix=Math.floor(x),iy=Math.floor(y),key=ix+','+iy;
  if(!edgeDepth.has(key)){let depth=5;for(let r=1;r<=4;r++){if([[r,0],[-r,0],[0,r],[0,-r]].some(([dx,dy])=>!floor(ix+dx+.5,iy+dy+.5))){depth=r;break;}}edgeDepth.set(key,depth);}
  const verge=clamp((5-edgeDepth.get(key))/4),warp=(terrainNoise(x,y,11,37)-.5)*3;
  const patch=smooth((terrainNoise(x+warp,y-warp,8,(Number(scene.location)||1)+211)-.3)/.42);
  return clamp((urban?verge:baseGreen?.52+.48*verge:.12*verge)*patch);
 }
 function materialAt(x,y,baseline=false){
  const authored=authoredGroundMaterial(scene,x,y),definition=getGroundMaterial(authored.id),g=baseline?{...authored,physics:definition.physics}:world.reconciledGround?.surface?.(x,y)||world.groundForge?.surface?.(x,y)||{...authored,physics:definition.physics},physics=g?.physics||definition.physics;
  const n=baseline?null:numericalAt?.(x,y),wet=Math.max(n?.moisture||0,baseline?0:g?.wetness||0,definition.realm==='Water'?.55:(physics.permeability??.6)*.38);
  const allow=!blocked(x,y)&&(g?g.grassAllowed!==false:baseGreen);
  return {id:g?.id||'host:'+kind,vegetationAllowed:allow,isInterior:indoor,organic:/orchard|woodland|bog/.test(biome)?.84:.58,porous:physics.permeability??g?.permeability??.65,hardness:1-(physics.permeability??g?.permeability??.65),moisture:wet,heat:Math.max(n?.fire||0,g?.temperature??0),grip:g?.traction??.78,conductivity:g?.conduction??physics.conductivity??.12,resonance:Math.max(n?.resonance||0,g?.resonance??physics.resonance??.2),shielding:g?.groundShield??physics.shelter??.1,wear:g?.traffic??0,vegetationSuitability:allow?clamp((/savanna|tundra|ashlands/.test(biome)?.44:.92)*edgeCover(x,y)*plantingAt(x,y)*(n?clamp(n.biomass/Math.max(.01,n.baselineBiomass),.15,1.3):1)):0};
 }
 return {scene,indoor,kind,biome,roads,trails,buildings,blocked,path,plantingAt,materialAt,baselineMaterialAt:(x,y)=>materialAt(x,y,true),setNumerics:fn=>{numericalAt=fn;},
  setCanopy(sites=[]){if(sites===canopyKey)return false;canopyKey=sites;canopy=new Map();for(const t of sites)for(let y=Math.floor(t.y-3);y<=t.y+3;y++)for(let x=Math.floor(t.x-3);x<=t.x+3;x++){const d=Math.hypot(x+.5-t.x,y+.5-t.y),s=clamp(1-d/3)*.65;if(s)canopy.set(x+','+y,Math.max(canopy.get(x+','+y)||0,s));}return true;},
  groundOptions:{materialAt,regionAt:(x,y)=>({outdoor:!indoor,biome,biomeMix:biome==='orchard'?{orchard:.72,meadow:.28}:null}),heightAt:()=>0,pathAt:path,obstacleAt:blocked,shadeAt:(x,y)=>canopy.get(Math.floor(x)+','+Math.floor(y))||0,seasonAt:()=>world.state.chronicle?.cycle%4===1?'autumn':world.state.chronicle?.cycle%4===2?'spring':'summer',weatherAt:()=>({rain:0,wind:.28})}
 };
}
