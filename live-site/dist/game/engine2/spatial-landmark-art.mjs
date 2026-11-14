/**
 * Small, readable architectural landmarks for expanded zones.
 * All solid scenery is placed in authored nonwalkable cells. Inlays on a route
 * are flush with the floor, not invisible collision blockers. This is a fixed
 * geometry budget; no per-frame object generation or runtime RNG.
 */
const PALETTES=Object.freeze({
 sand:[[.72,.54,.30],[.49,.39,.28],[.90,.69,.39]],
 salt:[[.70,.82,.78],[.30,.51,.55],[.88,.91,.78]],
 cactus:[[.66,.59,.40],[.31,.48,.32],[.87,.74,.42]],
 lava:[[.43,.35,.30],[.18,.21,.23],[.97,.45,.20]],
 coral:[[.42,.70,.68],[.20,.43,.47],[.88,.68,.53]],
 mangrove:[[.42,.55,.40],[.27,.42,.36],[.76,.70,.40]],
 crystal:[[.45,.44,.62],[.26,.35,.47],[.71,.58,.93]],
 ice:[[.60,.77,.83],[.40,.62,.70],[.88,.94,.96]],
 aurora:[[.49,.65,.69],[.34,.45,.63],[.57,.85,.73]],
 spore:[[.49,.54,.48],[.28,.40,.37],[.82,.70,.67]],
 storm:[[.43,.52,.62],[.30,.34,.47],[.88,.72,.39]],
 marble:[[.70,.68,.61],[.45,.49,.53],[.92,.83,.58]],
 village:[[.60,.53,.39],[.35,.34,.32],[.88,.70,.48]],
 dungeon:[[.48,.52,.52],[.26,.32,.36],[.73,.67,.45]]
});
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
function palette(scene){
 const style=scene.biome?.style||scene.spatialExpansion?.archetype==='wild'?'village':'dungeon';
 return PALETTES[scene.biome?.style]||PALETTES[scene.spatialExpansion?.archetype==='dungeon'?'dungeon':'village'];
}
function stoneNear(scene,xy,taken){
 const oldW=scene.spatialExpansion.originalWidth,oldH=scene.spatialExpansion.originalHeight;
 const blockers=[scene.arrive,...(scene.doors||[]).map(o=>o.xy),...(scene.objects||[]).filter(o=>o.type!=='furnishing').map(o=>o.xy)].filter(valid);
 const [cx,cy]=xy,candidates=[];
 for(let dy=-12;dy<=12;dy++)for(let dx=-12;dx<=12;dx++){
  const x=cx+dx,y=cy+dy,d=Math.hypot(dx,dy);
  if(d<4||d>12||x<2||y<2||x>=scene.width-2||y>=scene.height-2||x<oldW&&y<oldH)continue;
  if(scene.floor[y]?.[x]!=='#'||taken.some(p=>Math.hypot(p[0]-x,p[1]-y)<6))continue;
  if(blockers.some(p=>Math.hypot(p[0]-x,p[1]-y)<2.6))continue;
  candidates.push({xy:[x,y],distance:d,order:Math.abs(dx)+Math.abs(dy)});
 }
 candidates.sort((a,b)=>a.distance-b.distance||a.order-b.order||a.xy[1]-b.xy[1]||a.xy[0]-b.xy[0]);
 return candidates[0]?.xy||null;
}
/** Read-only plan; the renderer and test suite consume exactly the same anchors. */
export function spatialLandmarkPlan(scene){
 const meta=scene?.spatialExpansion;
 if(meta?.version!==1)return {inlays:[],structures:[],courts:[]};
 const taken=[],structures=[],inlays=[];
 const points=(meta.landmarks||[]).filter(p=>valid(p.xy));
 for(let i=0;i<points.length;i++){
  const p=points[i],xy=p.xy;
  if(scene.floor[xy[1]]?.[xy[0]]!=='.')continue;
  if([1,3,5,6,7].includes(i))inlays.push({xy:xy.slice(),style:meta.archetype,ordinal:i});
  if(![1,3,5,6,7].includes(i))continue;
  const at=stoneNear(scene,xy,taken);
  if(at){taken.push(at);structures.push({xy:at,ordinal:i,kind:meta.archetype});}
 }
 const courts=(scene.mainlineCourts?.centers||[]).filter(p=>valid(p)&&scene.floor[p[1]]?.[p[0]]==='.')
  .slice(0,20).map(p=>p.slice());
 return {inlays,structures,courts};
}
const dim=(v,f=.6)=>v.map(x=>Math.max(0,Math.min(1,x*f)));
export function appendSpatialLandmarks(mesh,{world}={}){
 const scene=world?.scene;if(!mesh||!scene?.spatialExpansion)return mesh;
 const art=spatialLandmarkPlan(scene),[base,shadow,accent]=palette(scene),kind=scene.spatialExpansion.archetype;
 for(const c of art.courts){
  const x=c[0]+.5,z=c[1]+.5;
  // Very low floor seams identify a broad mainline court without changing movement.
  for(const delta of[-1.35,1.35]){
   mesh.box(x+delta,.033,z,.055,.015,2.45,dim(accent,.78),1);
   mesh.box(x,.033,z+delta,2.45,.015,.055,dim(accent,.78),1);
  }
 }
 for(const e of art.inlays){
  const [x,z]=e.xy.map(a=>a+.5),a=e.ordinal;
  // Clearly visible material transitions and directional patterns, all below 5cm.
  mesh.box(x,.027,z,3.10,.018,2.8,dim(base,.70),0);
  for(const sign of [-1,1]){
   mesh.box(x+sign*1.16,.045,z,.12,.018,2.60,dim(accent,.75),1);
   mesh.box(x,.045,z+sign*1.05,2.40,.018,.12,dim(accent,.75),1);
  }
  mesh.box(x,.045,z,.38,.014,.38,accent,1);
  if(a===7){for(const d of[-.52,.52])mesh.box(x+d,.047,z,.16,.012,.60,accent,1);}
 }
 for(const {xy:[gx,gy],ordinal,kind:k} of art.structures){
  const x=gx+.5,z=gy+.5,height=k==='civic'?3.5:k==='dungeon'?3.05:2.6;
  mesh.box(x,.16,z,1.65,.30,1.65,shadow,6);
  mesh.box(x,.36,z,1.28,.11,1.28,base,0);
  if(k==='wild'){
   // Cairns, geological strata and boundary standards.
   mesh.box(x,.82,z,.88,.97,.89,base,6);
   mesh.box(x,1.42,z,.66,.24,.64,accent,1);
   mesh.box(x,1.92,z,.39,.85,.42,shadow,6);
   mesh.box(x,2.36,z,.46,.09,.49,accent,1);
   for(const side of[-1,1])mesh.box(x+side*.63,.52,z+.45,.30,.60,.34,dim(base,.75),6);
  }else if(k==='civic'){
   // A real colonnade fragment at the perimeter, not a tiny freestanding house.
   for(const side of[-1,1]){
    mesh.box(x+side*.54,height/2+.22,z,.20,height,.24,base,6);
    mesh.box(x+side*.54,.48,z,.37,.20,.39,accent,1);
   }
   mesh.box(x,height+.27,z,1.50,.24,.44,shadow,6);
   mesh.box(x,height+.42,z,1.65,.09,.53,accent,1);
   mesh.box(x,1.91,z+.18,.66,.55,.075,accent,4,.10);
  }else{
   // Structural service gantry with cutaway access; metal is built on solid floor.
   for(const side of[-1,1])mesh.box(x+side*.59,1.65,z,.23,2.70,.30,base,1);
   mesh.box(x,3.02,z,1.66,.26,.44,shadow,1);
   for(const side of[-1,1])mesh.box(x+side*.55,2.39,z+.19,.32,.32,.18,accent,4,.08);
   mesh.box(x,.54,z+.22,1.25,.29,.32,shadow,6);
  }
 }
 return mesh;
}
