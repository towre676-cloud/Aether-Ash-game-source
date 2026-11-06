import {buildingReservations,intersectsGroundRect,pointInGroundRect} from './environmental-grounding.js?v=5.22.0';
import {streetPlan} from './wayfinding.js?v=5.22.0';
import {terrainTrails} from './terrain-materials.js?v=5.22.0';
import {outdoorLayout} from './outdoor-layout.js?v=5.22.0';
import {worldAffordanceReservations} from './world-affordances.js?v=5.38';
import {isInteriorScene} from './scene-identity.js?v=5.22.0';

const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// Whole drawn extents: the stable awning, wide work tables, painted herb beds,
// and the largest animal pose all fit these presentation-only rectangles.
const SIZES={stable:[2.5,1.85],work:[1.7,1.65],plant:[.9,.8],fauna:[1.15,1.05],pet:[1.15,.85],resident:[.85,.85]};
const key=([x,y])=>x+','+y;
export function activityThreatPoints(scene,objects=[]){const unique=new Map();for(const o of [...(scene.objects||[]),...objects])if(['patrol','boss'].includes(o.type)){for(const p of [o.xy,...(o.enemies||[]).map(e=>e[1])])if(Array.isArray(p)&&p.every(Number.isFinite))unique.set(key(p),p);}return [...unique.values()];}
const planCache=new WeakMap(),stationary=new Set(['stable','work','plant','fauna']);
const objectRole=o=>o?.trailService?'stable':o?.regional&&o.lifeKind==='project'?'work':['herb','grass'].includes(o?.lifeKind)?'plant':o?.lifeKind==='fauna'?'fauna':null;
export function activityBounds(p,role='resident'){const [w,h]=SIZES[role]||SIZES.resident;return{x:p[0]+.5-w/2,y:p[1]+.5-h,w,h:h+.18};}
function activityPlan(scene){
 if(planCache.has(scene))return planCache.get(scene);
 const urban=['town','market','hub'].includes(scene.key),scenery=outdoorLayout(scene),paths=urban?streetPlan(scene):new Set(terrainTrails(scene).flat().map(key));
 for(const p of scene.authoredOpening?.approach||[])if(Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))paths.add(key(p.map(Math.floor)));
 const repairs=worldAffordanceReservations(scene),value={indoor:isInteriorScene(scene),buildings:buildingReservations(scene),paths,repairs:new Map(repairs.map(o=>[o.id,o.bounds])),decor:[...scenery.trees,...scenery.sites,...scenery.landmarks,...repairs].map(o=>o.bounds).filter(Boolean)};
 planCache.set(scene,value);return value;
}
/** Exact existing footprints are useful in tight rooms: a spare on a shelf
 * does not occupy a three-by-three patch of otherwise available floor. */
export function activityObstacles(scene,objects=[]){
 const {repairs}=activityPlan(scene);
 return objects.flatMap(o=>{
  if(!o?.xy)return[];
  if(o.affordanceId){const bounds=repairs.get(o.affordanceId);return bounds?[bounds]:[];}
  if(o.footprint)return [16,18].includes(o.furniture)?[]:[o.footprint];
  const role=objectRole(o);if(role)return [activityBounds(o.xy,role)];
  return [{x:o.xy[0]+.05,y:o.xy[1]-.7,w:.9,h:1.38}];
 });
}

/** Native entrances, useful furniture and existing services define a place.
 * Targets are cell coordinates, just like actor xy; no generated person's
 * position is used to move an authored door, story actor or collision cell. */
export function activityPlaceAnchors(scene,objects=[],activity=''){
 const list=[...(scene.objects||[]),...objects].filter(o=>o?.xy&&!o.hidden&&!o.life&&!o.trailService),text=String(activity).toLowerCase();
 const buildings=(scene.exteriorBuildings||[]).filter(b=>b.exit?.xy||b.projection?.outside);
 const building=parts=>{for(const part of parts){const b=buildings.find(b=>[b.exit?.to,b.projection?.material,b.projection?.style].some(v=>String(v||'').includes(part)));if(b)return (b.exit?.xy||b.projection.outside).slice();}return null;};
 const item=types=>list.find(o=>types.includes(o.type))?.xy?.slice();
 const furniture=ids=>{for(const id of ids){const o=list.find(o=>o.type==='furnishing'&&o.furniture===id&&o.footprint);if(o)return[o.footprint.x+o.footprint.w/2-.5,o.footprint.y+o.footprint.h-.5];}return null;};
 const arrival=(scene.arrive||[1,1]).slice(),home=furniture([0,11])||building(['home','inn','refuge','attic','quarters','shelter'])||furniture([3,4])||item(['camp'])||arrival;
 const priorities=/oven|baker|cook|soup|serving|steward|kitchen|portion/.test(text)?['inn','home','refuge']:/water|rain|sieve|condensation|cooling|spillway/.test(text)?['cistern','vent','clinic']:/clay|pottery|kiln/.test(text)?['pottery','workshop']:/record|document|letter|diarist|tally|signal|reader/.test(text)?['archive','guild','chapel']:/rope|mooring|luggage|rail|freight|runner|carrier|ferry/.test(text)?['depot','security','guild','instrumentworks']:/lens|glass|polish/.test(text)?['lens','instrumentworks','workshop']:['carpenter','instrumentworks','workshop','refuge'];
 let work=building(priorities);
 if(!work){const names=/oven|cook|soup|portion/.test(text)?[3,4,6]:/letter|record|paper|document|diarist/.test(text)?[5,7,8,9]:/water|rain|cool|spillway|sieve/.test(text)?[6,7,8,5]:/lens|glass/.test(text)?[7,8,5]:[7,8,5,6];work=furniture(names)||item(['shop','mentor','project','puzzle','switch','lore-device'])||home;}
 const common=item(['camp','listen'])||furniture([5,7,8,3,4])||building(['guild','inn','refuge','home'])||home;
 const window=furniture([18]),garden=window||home,stable=building(['inn','refuge','home','attic','shelter'])||(buildings[0]?.exit?.xy||buildings[0]?.projection?.outside)?.slice()||item(['camp','guide'])||arrival;
 const offset=(p,x,y)=>[p[0]+x,p[1]+y];
 return {home:offset(home,-1.8,1.6),work:offset(work,2.2,1.6),common:offset(common,0,2.5),plant:offset(garden,-2.6,1.2),fauna:offset(garden,-.5,2.5),pet:offset(home,1.8,1.8),stable:offset(stable,3.4,2.6),features:{home,work,common,garden,stable}};
}

/** Last-resort actor placement stays beside its own activity, never a
 * percentage of the map's flood fill. All bodies still use real clear floor. */
export function nearestActivityPoint(scene,candidates,target,{occupied=[],role='resident'}={}){
 const bodies=[...(scene.objects||[]),...(scene.doors||[]),...occupied].filter(o=>o?.xy),buildings=buildingReservations(scene),threats=activityThreatPoints(scene,occupied),danger=isInteriorScene(scene)?2.5:5;
 const safe=(p,separation)=>scene.floor?.[p[1]]?.[p[0]]==='.'&&threats.every(q=>distance(p,q)>=danger)&&!buildings.some(b=>b.groundRects.some(r=>pointInGroundRect(r,p[0]+.5,p[1]+.5))&&!pointInGroundRect(b.approach,p[0]+.5,p[1]+.5))&&bodies.every(o=>distance(p,o.xy)>=separation);
 const ranked=[...candidates].sort((a,b)=>distance(a,target)-distance(b,target)||a[1]-b[1]||a[0]-b[0]);
 const point=ranked.find(p=>safe(p,role==='pet'?1.05:1.35))||ranked.find(p=>safe(p,.85));return point?.slice()||null;
}

function crossesPath(rect,paths){
 // Inspect just the cells under this sprite, never every path in the scene.
 for(let y=Math.floor(rect.y);y<Math.ceil(rect.y+rect.h);y++)for(let x=Math.floor(rect.x);x<Math.ceil(rect.x+rect.w);x++)if(paths.has(x+','+y))return true;
 return false;
}

/** Supplemental life belongs to an existing place: work beside workshops,
 * fodder in a garden, animals beside a household, stables off the travel lane.
 * Only generated service positions change. Story objects, doors and saves do not. */
export function createActivityPlacer(scene,candidates,occupied=[]){
 const {indoor,buildings,paths:roads,decor}=activityPlan(scene),used=[],pockets=new Map(),threats=activityThreatPoints(scene,occupied);
 const fixedActivities=occupied.filter(o=>o?.xy&&objectRole(o)).map(o=>activityBounds(o.xy,objectRole(o)));
 const indoorBodies=indoor?activityObstacles(scene,[...(scene.objects||[]),...(scene.doors||[]),...occupied]):[];
 const fixed=[...(scene.objects||[]),...(scene.doors||[]),...occupied].map(o=>Array.isArray(o)?o:o.xy).filter(p=>Array.isArray(p)&&p.every(Number.isFinite));
 const cells=[...new Map((candidates||[]).filter(p=>scene.floor?.[p[1]]?.[p[0]]==='.').map(p=>[key(p),p])).values()];
 const doors=[...(scene.doors||[]),...(scene.objects||[]).filter(o=>o.type==='portal')].map(o=>o.xy).filter(Boolean);
 const edges=new Set(cells.filter(([x,y])=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>scene.floor?.[y+dy]?.[x+dx]!=='.')).map(key)),edgeDistances=new Map();
 function edgeDistance(p){const k=key(p);if(edgeDistances.has(k))return edgeDistances.get(k);let d=3;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(edges.has((p[0]+dx)+','+(p[1]+dy)))d=Math.min(d,Math.hypot(dx,dy));edgeDistances.set(k,d);return d;}
 function anchor(role,activity=''){
  const anchors=activityPlaceAnchors(scene,occupied,activity);return anchors[role]||anchors.common;
 }
 function safe(p,role){
  if(threats.some(q=>distance(p,q)<(indoor?2.5:role==='stable'?7:5)))return false;
  const rect=activityBounds(p,role),small=['plant','fauna','pet'].includes(role);
  if(buildings.some(b=>intersectsGroundRect(rect,b.visual,.18)||pointInGroundRect(b.approach,p[0]+.5,p[1]+.5,.25)))return false;
  if(stationary.has(role)&&decor.some(b=>intersectsGroundRect(rect,b,.12)))return false;
  if(stationary.has(role)&&fixedActivities.some(b=>intersectsGroundRect(rect,b,.12)))return false;
  if(doors.some(d=>distance(p,d)<2.35)||scene.arrive&&distance(p,scene.arrive)<2.1)return false;
  if(indoor?indoorBodies.some(b=>intersectsGroundRect(rect,b,.1)):fixed.some(o=>distance(p,o)<(small?1.3:1.85)))return false;
  if(used.some(o=>intersectsGroundRect(rect,o.rect,.18)||distance(p,o.p)<(small?.95:1.5)))return false;
  // Stalls and stables need a real landing to walk around, not a one-tile neck.
  if(['stable','work'].includes(role)&&[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>scene.floor?.[p[1]+dy]?.[p[0]+dx]==='.').length<3)return false;
  return true;
 }
 return {
  pick(role='resident',index=0,{reserve=true,activity='',target:providedTarget=null}={}){
   let target=Array.isArray(providedTarget)?providedTarget:pockets.get(role)||anchor(role,activity);
   let candidates=cells.filter(p=>safe(p,role));if(!candidates.length)return null;
   // Prefer a clear roadside landing. A compact scene can still retain its
   // optional service when the only safe landing touches an existing path.
   if(stationary.has(role)){const nearest=Math.min(...candidates.map(p=>distance(p,target))),local=candidates.filter(p=>distance(p,target)<=nearest+5),roadside=local.filter(p=>!crossesPath(activityBounds(p,role),roads));if(roadside.length)candidates=roadside;}
   if(role==='plant'&&!pockets.has(role)){
    const nearest=Math.min(...candidates.map(p=>distance(p,target))),garden=candidates.filter(p=>distance(p,target)<=nearest+4&&edgeDistance(p)<1.5&&!roads.has(key(p))).sort((a,b)=>distance(a,target)-distance(b,target)||a[1]-b[1]||a[0]-b[0]);
    if(garden[0])target=garden[0];
   }
   const score=p=>distance(p,target)+(roads.has(key(p))?(['plant','stable','work'].includes(role)?6:1.5):0)+(role==='plant'?edgeDistance(p)*.65:0)+((p[0]+p[1]+index)%3)*.035;
   const ranked=candidates.map(p=>({p,score:score(p)}));ranked.sort((a,b)=>a.score-b.score||a.p[1]-b.p[1]||a.p[0]-b.p[0]);
   const p=ranked[0].p.slice();if(reserve)used.push({p,role,rect:activityBounds(p,role)});
   if(!pockets.has(role)&&['plant','work','stable'].includes(role))pockets.set(role,p.slice());
   return p;
  },
  reserve(p,role='resident'){if(Array.isArray(p)&&p.every(Number.isFinite)&&!used.some(v=>key(v.p)===key(p)))used.push({p:p.slice(),role,rect:activityBounds(p,role)});},
  get placements(){return used.map(p=>({...p,p:p.p.slice()}));}
 };
}
