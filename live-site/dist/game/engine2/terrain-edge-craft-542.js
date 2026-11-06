/** Broad, recessed rock faces belong to the existing terrain body. This
 * replaces selected vertical risers, without moving a rim, cap or floor cell.
 * End profiles meet the original face exactly; the middle cuts into the high
 * closed bank so adjoining walls and the authoritative walking edge stay put.
 */
import {sceneArtSpec} from './scene-art-materials-541.js';
import {exteriorHeroFeatures} from './exterior-art-selection-541.js';

const CACHE=new WeakMap(),MAX_TRIANGLES=1800,LANDSCAPE_TRIANGLES=9996;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const tint=(a,t)=>a.map(v=>clamp(v*t,0,1));
const hash=(a,b,c=0)=>{let n=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul(c|0,1274126177);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
const EMPTY=Object.freeze({active:false,walls:Object.freeze([]),replacedIndices:Object.freeze([]),stats:Object.freeze({replacedWalls:0,triangles:0,maxInset:0})});
const finiteWall=w=>w&&['fixed','start','end','top','low','dx','dz'].every(k=>Number.isFinite(w[k]))&&['x','z'].includes(w.axis);

function distanceToBounds(x,z,b){return Math.hypot(Math.max(b.x0-x,0,x-b.x1),Math.max(b.z0-z,0,z-b.z1));}
function nativeLandscapeTriangles(scene,p){
 // Exact face counts of the host's retained primitive recipes. The ordinary
 // standalone landscape is also a supported entry point: dense old woods
 // must not spend their remaining budget as if the original trees were gone.
 let triangles=2+(p.terraces?.length||0)*2+p.walls.length*2;
 const woods=new Set(['village','woodland','spore','mangrove']),replaced=new Set(exteriorHeroFeatures(scene,p.features));
 for(const f of p.features||[]){
  if(replaced.has(f)){if(woods.has(p.family)&&p.family!=='spore')triangles+=28;continue;}
  if(p.family==='spore')triangles+=196;
  else if(woods.has(p.family))triangles+=p.family==='mangrove'?244:196;
  else if(['crystal','ice','aurora'].includes(p.family)){if(f.authored||f.index%4===0)triangles+=132;}
  else if(['sand','cactus'].includes(p.family))triangles+=p.family==='cactus'&&!f.near?196:72;
  else if(['coral','salt'].includes(p.family))triangles+=f.near?64:120;
 }
 return triangles;
}
function activityAnchors(scene,p){
 const at=scene.authoredOpening?.arrival||scene.arrive?.map(v=>v+.5),out=at?[at]:[];
 for(const o of scene.objects||[])if(!o.hidden&&Array.isArray(o.xy)&&['portal','camp','shop','project','frontier-landmark','puzzle','switch','aid'].includes(o.type))out.push(o.xy.map(v=>v+.5));
 return out.length?out:[[(p.bounds.x0+p.bounds.x1)/2,(p.bounds.z0+p.bounds.z1)/2]];
}
function wallProfile(w,scene,family){
 const length=w.end-w.start,height=w.top-w.low,segments=Math.max(2,Math.ceil(length/3.4));
 const hard=/ice|crystal|aurora|marble|ruins/.test(family),depth=clamp(.045+height*(hard?.075:.12),.055,hard?.18:.24);
 const section=[];
 for(let j=0;j<=segments;j++){
  const t=j/segments,u=w.start+length*t,seed=hash(Math.round(u*11),Math.round(w.fixed*13),scene.location||0),weight=Math.sin(Math.PI*t);
  // Broad non-level fracture planes avoid a repeating horizontal brick band.
  // Their closed endpoints retain the exact native corner at every height.
  section.push({u,levels:[
   {y:w.low,inset:0},
   {y:w.low+height*(.25+seed*.20),inset:depth*weight*(.82+seed*.18)},
   {y:w.low+height*(.74+seed*.10),inset:depth*weight*.36},
   {y:w.top,inset:0}
  ]});
 }
 return{source:w,sections:section,segments,depth,triangles:segments*6};
}

/** The host supplies its already-cached native landscape plan. There is no
 * second terrain owner or independent interpretation of the walking mask. */
export function terrainEdgeCraftPlan542(world,{landscapePlan}={}){
 const scene=world?.scene,p=landscapePlan;
 if(!scene?.floor||!p?.bounds||!Array.isArray(p.walls)||p.indoor||p.water||p.coastalStorm||scene.originId==='veyr-storm')return EMPTY;
 const old=CACHE.get(p);if(old?.scene===scene)return old.plan;
 const b=p.bounds,candidates=[],anchors=activityAnchors(scene,p),legacyTriangles=nativeLandscapeTriangles(scene,p),headroom=Math.max(0,LANDSCAPE_TRIANGLES-legacyTriangles);
 for(let index=0;index<p.walls.length;index++){
  const w=p.walls[index];if(!finiteWall(w)||w.masonry||w.top-w.low<.24||w.end-w.start<2)continue;
  const u=(w.start+w.end)/2,x=w.axis==='x'?u:w.fixed,z=w.axis==='x'?w.fixed:u,distance=distanceToBounds(x,z,b);
  if(distance>8)continue;
  const profile=wallProfile(w,scene,p.family);
  const activityDistance=Math.min(...anchors.map(a=>Math.hypot(x-a[0],z-a[1])));
  candidates.push({...profile,index,score:distance*2+activityDistance*.10-Math.min(w.end-w.start,18)*.15-(w.top-w.low)*.1});
 }
 candidates.sort((a,b)=>a.score-b.score||a.index-b.index);
 const walls=[];let triangles=0,maxInset=0;
 for(const row of candidates){if(triangles+row.triangles>MAX_TRIANGLES||triangles+row.triangles-(walls.length+1)*2>headroom)continue;walls.push(row);triangles+=row.triangles;maxInset=Math.max(maxInset,row.depth);}
 walls.sort((a,b)=>a.index-b.index);
 const plan={active:walls.length>0,family:p.family,walls,replacedIndices:walls.map(w=>w.index),stats:{replacedWalls:walls.length,triangles,maxInset,legacyTriangles,netAddedTriangles:triangles-walls.length*2}};
 CACHE.set(p,{scene,plan});return plan;
}

function point(w,u,level){return w.axis==='x'?[u,level.y,w.fixed-w.dz*level.inset]:[w.fixed-w.dx*level.inset,level.y,u];}
function face(mesh,w,a,b,c,d,color){
 // Match the native riser's real outward winding. Facets keep their own
 // geometric normal instead of being lit as one flat rectangular wall.
 if(w.axis==='x'?w.dz>0:w.dx<0)mesh.quad(d,c,b,a,color,6.25);
 else mesh.quad(a,b,c,d,color,6.25);
}

export function appendTerrainEdgeCraft542(mesh,{world,landscapePlan,colors}={}){
 const plan=terrainEdgeCraftPlan542(world,{landscapePlan});if(!plan.active)return plan;
 const spec=sceneArtSpec(world),palette=spec?.palette||{},rock=palette.rock||colors?.base||[.30,.36,.35],leaf=palette.foliage||rock;
 const vegetated=/village|woodland|spore/.test(plan.family),base=vegetated?mix(rock,leaf,.55):rock;
 const start=mesh.v.length;
 for(const row of plan.walls){const w=row.source;
  for(let j=0;j<row.segments;j++){
   const a=row.sections[j],b=row.sections[j+1],variation=hash(Math.round((a.u+b.u)*7),Math.round(w.fixed*17),world.scene.location||0);
   for(let level=0;level<3;level++){
    const shade=(vegetated?.56:.63)+variation*.09+level*.075;
    face(mesh,w,point(w,a.u,a.levels[level]),point(w,a.u,a.levels[level+1]),point(w,b.u,b.levels[level+1]),point(w,b.u,b.levels[level]),tint(base,shade));
   }
  }
 }
 mesh.terrainEdgeCraft542={...plan.stats,triangles:(mesh.v.length-start)/36};return plan;
}
