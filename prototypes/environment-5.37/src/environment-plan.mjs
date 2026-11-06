/** Ash & Aether — authored environment art plan.
 * Pure deterministic, conservative and host-compatible; never decides collision or rewards.
 * Neither free-space filling nor object count is a design objective.
 */
import {hash32} from './util.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const unit=s=>(hash32(String(s))>>>0)/4294967295;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const norm=(a,b)=>{const d=Math.hypot(b.x-a.x,b.z-a.z)||1;return {x:(b.x-a.x)/d,z:(b.z-a.z)/d};};
// Radius includes the visible foundation, eaves, steps, and a character-width apron.
// These footprints are VISUAL ONLY. They never alter the game's collision truth.
const FOOTPRINT_RADIUS=Object.freeze({dwelling:4.20,workshop:4.90,tower:2.20,sanctuary:3.90,well:1.85,threshold:.85,bridge:1.25,mechanism:2.0,camp:1.55,grove:2.7});
export function footprintRadius(role){return FOOTPRINT_RADIUS[role]||1.05;}
export function distanceFromFootprint(point,footprint){return Math.hypot(point.x-footprint.x,point.z-footprint.z)-footprint.radius;}
const segments=route=>{const pts=route.points?.length>1?route.points:[route.from,route.to];return pts.slice(1).map((p,i)=>[pts[i],p]);};
// Bounded 8-neighbour search: paths approach actual entrances and skirt foundations,
// rather than drawing straight lines through rooms or across the center of a well.
export function routeAroundArchitecture(start,end,bounds,footprints=[],obstacleAt=()=>false){
 const blocked=p=>footprints.some(f=>distanceFromFootprint(p,f)<.16)||obstacleAt(p.x,p.z);
 const segmentOpen=(a,b)=>{const length=distance(a,b),steps=Math.max(1,Math.ceil(length/.6));
  for(let i=1;i<steps;i++){const t=i/steps,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};if(blocked(p))return false;}return true;};
 if(segmentOpen(start,end))return [start,end];
 const area=(bounds.maxX-bounds.minX)*(bounds.maxZ-bounds.minZ);
 const cell=Math.max(1.25,1.08*Math.sqrt(Math.max(area,1)/30000)),cols=Math.ceil((bounds.maxX-bounds.minX)/cell)+1,rows=Math.ceil((bounds.maxZ-bounds.minZ)/cell)+1;
 if(cols<2||rows<2||cols*rows>36000)return null; // fail closed, never cut through architecture
 const toCell=p=>({i:clamp(Math.round((p.x-bounds.minX)/cell),0,cols-1),j:clamp(Math.round((p.z-bounds.minZ)/cell),0,rows-1)});
 const source=toCell(start),target=toCell(end),index=(i,j)=>j*cols+i,S=index(source.i,source.j),E=index(target.i,target.j);
 // Snapping door aprons to grid centres can put the cell INSIDE its own
 // foundation. Source/target nodes must retain their exact world positions.
 const toPoint=(i,j)=>i===source.i&&j===source.j?start:i===target.i&&j===target.j?end:({x:bounds.minX+i*cell,z:bounds.minZ+j*cell});
 const g=new Float64Array(cols*rows);g.fill(Infinity);g[S]=0;
 const came=new Int32Array(cols*rows);came.fill(-1);
 // Priority queue implemented as a binary heap, without shifting O(n) arrays.
 const heap=[],push=(f,id)=>{let i=heap.length;heap.push([f,id]);while(i>0){let q=(i-1)>>1;if(heap[q][0]<=f)break;heap[i]=heap[q];i=q;}heap[i]=[f,id];};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=last[0])break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
 const h=(i,j)=>Math.hypot(target.i-i,target.j-j);push(h(source.i,source.j),S);
 const seen=new Uint8Array(cols*rows),dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
 let done=false,visits=0;
 while(heap.length&&visits++<cols*rows){const [,id]=pop();if(seen[id])continue;seen[id]=1;if(id===E){done=true;break;}
  const i=id%cols,j=Math.floor(id/cols);
  for(const [di,dj] of dirs){const ii=i+di,jj=j+dj;if(ii<0||ii>=cols||jj<0||jj>=rows)continue;
   const next=index(ii,jj);if(seen[next])continue;
   const from=toPoint(i,j),to=toPoint(ii,jj);if(next!==S&&(blocked(to)||!segmentOpen(from,to)))continue;
   const ng=g[id]+(di&&dj?Math.SQRT2:1);if(ng<g[next]){g[next]=ng;came[next]=id;push(ng+h(ii,jj),next);}
  }
 }
 if(!done)return null; // omit unsafe roads rather than rendering a line through a house
 const reversed=[];for(let at=E,limit=0;at!==S&&limit++<cols*rows;at=came[at]){
  if(at<0)break;reversed.push(toPoint(at%cols,Math.floor(at/cols)));
 }
 reversed.push(toPoint(source.i,source.j));reversed.reverse();
 const raw=[start,...reversed.slice(1,-1),end],out=[start];
 for(let i=1;i<raw.length-1;){let furthest=i;for(let j=i;j<raw.length;j++){if(segmentOpen(out[out.length-1],raw[j]))furthest=j;else break;}
  out.push(raw[furthest]);i=furthest+1;
 }
 if(distance(out[out.length-1],end)>.001)out.push(end);
 if(out.some((p,i)=>i>0&&!segmentOpen(out[i-1],p)))return null;
 return out;
}
export function pathClearance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz||1,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/l,0,1);return Math.hypot(p.x-(a.x+t*dx),p.z-(a.z+t*dz));}
const ROLE_RULES=[[/gate|exit|threshold|door|portal/i,'threshold'],[/\b(well|spring|fountain|water)\b/i,'well'],[/forge|kiln|furnace/i,'workshop'],[/\b(inn|houses?|homes?|resident|dwelling|shops?)\b/i,'dwelling'],[/shrine|temple|sanctum|choir|memory/i,'sanctuary'],[/bridge|crossing|sluice/i,'bridge'],[/tower|watch|beacon|signal/i,'tower'],[/\b(camp|fire|rest)\b/i,'camp'],[/\b(garden|orchard|farm|grove|trees?)\b/i,'grove'],[/mechanism|puzzle|lock|counterweight|engine|control/i,'mechanism']];
export function landmarkRole(anchor){if(anchor.visualRole)return anchor.visualRole;const value=[anchor.kind,anchor.id,anchor.name].filter(Boolean).join(' ');for(const [re,role] of ROLE_RULES)if(re.test(value))return role;return 'landmark';}
export const ENVIRONMENT_PALETTES=Object.freeze({
 ash:{stone:0x665c57,plaster:0x9e8b78,roof:0x67534d,wood:0x4d342f,metal:0xad8057,foliage:0x68755f,leaf:0x8b916f,accent:0xf1aa70,ground:0x756a60,deep:0x302f31,water:0x677f7a},
 water:{stone:0x869a99,plaster:0xb9bfb1,roof:0x506b72,wood:0x554e43,metal:0xb5a178,foliage:0x577a6b,leaf:0x8fa89b,accent:0xffd9a1,ground:0x697f7a,deep:0x354d54,water:0x4d9ca1},
 clay:{stone:0x8b8c7a,plaster:0xd0b69a,roof:0xa16e5b,wood:0x60493a,metal:0xae986b,foliage:0x4d7152,leaf:0x89a35f,accent:0xf5d7a3,ground:0x7d785d,deep:0x393a32,water:0x59978f},
 aether:{stone:0x7e8996,plaster:0xb4b9b0,roof:0x63727e,wood:0x535467,metal:0xc2a77b,foliage:0x547b75,leaf:0x9aada4,accent:0xb2efe5,ground:0x697787,deep:0x2b3d54,water:0x4d869c}
});
export function biomeFamily(input='clay') {const s=String(input).toLowerCase();if(/ash|burn|volcan|cinder|forge/.test(s))return 'ash';if(/coast|marsh|river|wet|water|reed/.test(s))return 'water';if(/aether|sky|phase|crystal|engine/.test(s))return 'aether';return 'clay';}
function ensureBounds(b){const x=b||{};return {minX:Number.isFinite(x.minX)?x.minX:-30,maxX:Number.isFinite(x.maxX)?x.maxX:30,minZ:Number.isFinite(x.minZ)?x.minZ:-30,maxZ:Number.isFinite(x.maxZ)?x.maxZ:30};}
/** Designed placements: architecture follows social function, groves protect horizons,
 * and walking lines remain clear. An empty plaza is not classified as a defect.
 */
export function planEnvironment(layout,{region='clay',quality='high',obstacleAt=()=>false,pathAt=()=>0,excludeExistingArchitecture=false}={}){
 if(!layout||!Array.isArray(layout.anchors))throw new TypeError('authored scene with anchors required');
 const bounds=ensureBounds(layout.bounds),family=biomeFamily(region),kind=layout.kind||'wilderness';
 const anchors=layout.anchors.filter(a=>Number.isFinite(a.x)&&Number.isFinite(a.z));
 const ordered=[...anchors].sort((a,b)=>(b.importance||0)-(a.importance||0)||String(a.id).localeCompare(String(b.id)));
 const placements=[],walkways=[],landscapes=[],lighting=[],footprints=[];
 const sceneId=String(layout.id||'scene');const low=quality==='low'||quality==='battery';
 const cap={settlement:low?7:13,wilderness:low?4:8,interior:low?9:16,dungeon:low?9:16};
 const walklines=[];
 // Prefer authored route links; otherwise construct the least-total-length
 // anchor skeleton, never importance-ordered straight lines across a plaza.
 const explicit=Array.isArray(layout.routes)?layout.routes:[];
 const links=[];
 if(explicit.length){
  for(const route of explicit){
   const a=typeof route.from==='string'?anchors.find(x=>x.id===route.from):route.from;
   const b=typeof route.to==='string'?anchors.find(x=>x.id===route.to):route.to;
   if(a&&b&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Number.isFinite(b.x)&&Number.isFinite(b.z))links.push([a,b]);
  }
 }else if(ordered.length>1){
  const reached=[ordered[0]],remaining=new Set(ordered.slice(1));
  while(remaining.size){
   let best=null,score=Infinity;
   for(const a of reached)for(const b of remaining){
    const weight=distance(a,b);
    if(weight<score){score=weight;best=[a,b];}
   }
   if(!best)break;links.push(best);reached.push(best[1]);remaining.delete(best[1]);
  }
 }
 // Choose a real entrance orientation using the closest graph neighbour.
 // A residence faces its street; a settlement is not a field of arbitrarily rotated cubes.
 const neighbors=new Map();for(const [a,b] of links){for(const [from,to] of [[a,b],[b,a]]){
  const q=neighbors.get(from.id);if(!q||distance(from,to)<q.distance)neighbors.set(from.id,{to,distance:distance(from,to)});
 }}
 const approachPoint=(a,target)=>{const role=landmarkRole(a);
  if(!['dwelling','workshop','tower','sanctuary','well','mechanism','grove'].includes(role))return {x:a.x,z:a.z};
  const r=footprintRadius(role),v=norm(a,target);
  const radius=r+.48; // outside eaves and foundation, regardless of neighbour separation
  return {x:a.x+v.x*radius,z:a.z+v.z*radius};
 };
 for(let i=0;i<ordered.length;i++){
  const a=ordered[i],role=landmarkRole(a);if(excludeExistingArchitecture&&['dwelling','tower','workshop'].includes(role))continue;
  if(placements.length >= (cap[kind] ?? 12))break;
  const closest=neighbors.get(a.id)?.to||ordered.find(x=>x!==a)||{x:a.x,z:a.z+1};
  const v=norm(a,closest),facing=Math.atan2(v.x,v.z);
  const scale=role==='dwelling'?1:role==='tower'?1.12:role==='sanctuary'?1.32:role==='well'?.72:1;
  placements.push({id:`art:${a.id}`,anchorId:a.id,x:a.x,z:a.z,role,scale,rotation:facing,source:'authored-anchor',importance:a.importance||1,
   entrance:approachPoint(a,closest)});
  if(['dwelling','workshop','tower','sanctuary','well','mechanism','grove'].includes(role)){
   footprints.push({id:a.id,role,x:a.x,z:a.z,radius:footprintRadius(role)*Math.min(1.15,scale)});
  }
  if(['threshold','well','dwelling','sanctuary','workshop','camp'].includes(role))lighting.push({id:`light:${a.id}`,anchorId:a.id,x:a.x,z:a.z,kind:role==='well'?'reflected':'warm',radius:role==='sanctuary'?5:2.7});
 }
 for(const [a,b] of links){
  if(distance(a,b)<1)continue;
  const va=placements.find(p=>p.anchorId===a.id),vb=placements.find(p=>p.anchorId===b.id);
  const source=va?.entrance||approachPoint(a,b),target=vb?.entrance||approachPoint(b,a);
  // If an anchor has several neighbours, its one canonical entrance is used by all.
  const points=routeAroundArchitecture(source,target,bounds,footprints,obstacleAt);
  if(!points)continue;
  const path={id:`route:${a.id||a.x}:${b.id||b.x}`,from:source,to:target,points,
   width:kind==='interior'||kind==='dungeon'?1.85:1.55,semantic:'primary-route'};
  walkways.push(path);
 }
 const nearPath=(p,r=1.8)=>walkways.some(w=>segments(w).some(([a,b])=>pathClearance(p,a,b)<r+w.width*.5))||Number(pathAt(p.x,p.z))>.38;
 const protectedSurface=(p,r=0)=>footprints.some(f=>distanceFromFootprint(p,f)<r);
 const canPlace=(p,clearance=2)=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>bounds.minX+clearance&&p.x<bounds.maxX-clearance&&p.z>bounds.minZ+clearance&&p.z<bounds.maxZ-clearance&&!obstacleAt(p.x,p.z)&&!protectedSurface(p,clearance);
 // Landscape bands follow the outer scene, not the playable route. Four clusters
 // per side produce an authored horizon; no mid-map void spam or random clutter.
 const borders=['north','south','east','west'];let patchN=0;
 if(kind==='wilderness'||kind==='settlement'){
  for(const side of borders){const steps=low?3:6;
   for(let j=0;j<steps;j++){
    const t=(j+.5)/steps,span=side==='north'||side==='south'?bounds.maxX-bounds.minX:bounds.maxZ-bounds.minZ;
    const v=t*span+(unit(`${sceneId}:${side}:${j}`)-.5)*span/steps*.52;
    const p=(side==='north'||side==='south')?{x:bounds.minX+v,z:side==='north'?bounds.minZ+2.8:bounds.maxZ-2.8}:{x:side==='west'?bounds.minX+2.8:bounds.maxX-2.8,z:bounds.minZ+v};
    const radius=(low?2.2:3.3)*(0.7+unit(`${sceneId}:radius:${patchN}`)*.65);
    if(!canPlace(p,1.2)||nearPath(p,2.4)||ordered.some(a=>distance(a,p)<4.3))continue;
    const wet=family==='water',ash=family==='ash',type=wet&&j%3===0?'reeds':ash&&j%3===0?'cinder-rocks':family==='aether'&&j%3===0?'crystal-bush':'trees';
    landscapes.push({id:`edge:${side}:${j}`,x:p.x,z:p.z,role:type,radius,seed:hash32(`${sceneId}:${side}:${j}`),edge:side,semantic:'framed-horizon'});patchN++;
   }
  }
  // Only deliberate street furniture near settlements' usable landmarks.
  if(kind==='settlement')for(const p of placements){if(!['well','sanctuary','dwelling'].includes(p.role))continue;
   const x=p.x+3.1*Math.cos(p.rotation),z=p.z+3.1*Math.sin(p.rotation);
   if(canPlace({x,z},1.1)&&!nearPath({x,z},.2))landscapes.push({id:`garden:${p.id}`,x,z,role:family==='ash'?'planter':'flowers',radius:1.6,seed:hash32(p.id),semantic:'inhabited-threshold'});
  }
 }
 const plan={id:sceneId,kind,region:family,bounds,quality,placements,walkways,landscapes,lighting,footprints,
  stats:{buildings:placements.filter(p=>['dwelling','workshop','tower','sanctuary'].includes(p.role)).length,authoredLandmarks:placements.length,walkways:walkways.length,horizonClusters:landscapes.length,blindVoidFillers:0},
  hasClearRoute(point,radius=1.4){return nearPath(point,radius);},
  isProtectedSurface(point,radius=.3){return protectedSurface(point,radius);}};
 return plan;
}
/** Fewer independent planes; major gameplay entrances and routes deliberately stay unobstructed. */
export function validateEnvironmentPlan(plan){const ids=new Set();const issues=[];
 for(const v of [...plan.placements,...plan.walkways,...plan.landscapes]){if(ids.has(v.id))issues.push(`duplicate id ${v.id}`);ids.add(v.id);}
 for(const p of plan.landscapes){if(plan.hasClearRoute(p,0))issues.push(`landscape blocks route ${p.id}`);if(plan.isProtectedSurface(p,0))issues.push(`landscape blocks footprint ${p.id}`);}
 return {ok:!issues.length,issues,landmarkCount:plan.placements.length};
}
