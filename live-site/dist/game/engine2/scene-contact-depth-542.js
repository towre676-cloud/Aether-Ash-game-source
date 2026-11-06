/** Structural contact belongs to actual native floor edges and authored roots.
 * These are translucent floor washes for the existing shadow pass, never
 * collision, raised scenery, a new input or a change to the World model. */
import {isInteriorScene} from './scene-identity.js';
import {adventureLandscapePlan} from './adventure-landscape.js?v=5.42';

const CACHE=new WeakMap(),MAX_TRIANGLES=1800,MAX_CASTERS=22,FADE_START=8,CULL_DISTANCE=10;
const INK=[.018,.030,.034],Y=.026,CAST=[.789,-.614],TAU=Math.PI*2;
const key=(x,z)=>x+','+z;
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const CONTROL_TYPES=new Set(['portal','origin-exit','embodied-action','puzzle','switch','riddle','frontier-landmark']);
const point=o=>Array.isArray(o?.xy)&&o.xy.slice(0,2).every(Number.isFinite)?[o.xy[0]+.5,o.xy[1]+.5]:null;
const signedArea=p=>p.reduce((a,v,i)=>{const q=p[(i+1)%p.length];return a+v[0]*q[1]-q[0]*v[1];},0)/2;
function cleanPoly(poly){
 const p=poly.filter((v,i)=>!i||Math.hypot(v[0]-poly[i-1][0],v[1]-poly[i-1][1])>1e-9);
 if(p.length>1&&Math.hypot(p[0][0]-p.at(-1)[0],p[0][1]-p.at(-1)[1])<1e-9)p.pop();
 for(let i=p.length-1;i>=0&&p.length>2;i--){const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length];if(Math.abs((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))<1e-9)p.splice(i,1);}return p;
}
function clip(p,axis,bound,greater){
 if(!p.length)return p;const out=[];let a=p.at(-1),da=(a[axis]-bound)*(greater?1:-1);
 for(const b of p){const db=(b[axis]-bound)*(greater?1:-1);if((da>=0)!==(db>=0)){const t=da/(da-db),v=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];v[axis]=bound;out.push(v);}if(db>=0)out.push(b);a=b;da=db;}return out;
}
function clippedFloor(poly,paintable){
 const out=[],lo=poly.reduce((p,v)=>[Math.min(p[0],v[0]),Math.min(p[1],v[1])],[Infinity,Infinity]),hi=poly.reduce((p,v)=>[Math.max(p[0],v[0]),Math.max(p[1],v[1])],[-Infinity,-Infinity]);
 for(let z=Math.floor(lo[1]);z<=Math.floor(hi[1]);z++)for(let x=Math.floor(lo[0]);x<=Math.floor(hi[0]);x++)if(paintable(x,z)){
  let q=clip(poly,0,x,true);q=clip(q,0,x+1,false);q=clip(q,1,z,true);q=clip(q,1,z+1,false);if(q.length>=3&&Math.abs(signedArea(q))>1e-9)out.push(q);
 }return out;
}
function active(scene){return !!scene?.floor&&scene.originId!=='veyr-storm';}
function protectedCells(objects){
 const cells=new Set();for(const o of objects){if(o.hidden||o.revealed===false||!CONTROL_TYPES.has(o.type))continue;const p=point(o);if(p)cells.add(key(Math.floor(p[0]),Math.floor(p[1])));}return cells;
}
function rootDescriptors(scene,objects,sites,worksites,buildings){
 const roots=[],add=(x,z,rx,rz,height,kind,source)=>{
  if(![x,z,rx,rz,height].every(Number.isFinite)||rx<=0||rz<=0)return;
  const xx=Math.floor(x),zz=Math.floor(z);if(xx<0||zz<0||xx>=scene.width||zz>=scene.height||scene.floor[zz]?.[xx]==='.')return;
  if(roots.some(r=>Math.hypot(x-r.x,z-r.z)<.45))return;
  roots.push({x,z,rx:clamp(rx,.18,2.6),rz:clamp(rz,.18,2.6),height:clamp(height,.35,4.5),kind,source});
 };
 // Only real supplied rooted models cast. No landscape coordinate generator
 // lives here, and visible actors retain their existing independent contacts.
 for(const s of [...sites,...worksites]){
  const r=finite(s.radius,finite(s.width,1)*.5),h=finite(s.height,/canopy|roots|collector/.test(s.kind)?3.3:/shelter|market|care/.test(s.kind)?3:2.3);
  add(s.x,s.z,r,finite(s.depth,r*2)*.5,h,s.kind||'worksite','authored');
 }
 for(const b of buildings)for(const r of (b.bodyRects||[]).slice(0,3))add(r.x+r.w/2,r.z+r.d/2,r.w*.5,r.d*.5,finite(b.height,2.6),'building','building');
 for(const o of objects){const f=o.footprint;if(o.hidden||o.revealed===false||o.type!=='furnishing'||!f)continue;add(f.x+f.w/2,f.y+f.h/2,f.w*.43,f.h*.43,finite(o.height,.95),'furnishing','native');}
 return roots;
}
function wallRuns(scene,paintable,walk,water){
 const groups=new Map(),edge=(axis,fixed,sign,start)=>{const k=[axis,fixed,sign].join(':');if(!groups.has(k))groups.set(k,{axis,fixed,sign,cells:[]});groups.get(k).cells.push(start);};
 for(let z=0;z<scene.height;z++)for(let x=0;x<scene.width;x++)if(paintable(x,z)){
  if(!walk(x,z-1)&&!water.has(key(x,z-1)))edge('x',z,1,x);
  if(!walk(x,z+1)&&!water.has(key(x,z+1)))edge('x',z+1,-1,x);
  if(!walk(x-1,z)&&!water.has(key(x-1,z)))edge('z',x,1,z);
  if(!walk(x+1,z)&&!water.has(key(x+1,z)))edge('z',x+1,-1,z);
 }
 const runs=[];
 for(const {axis,fixed,sign,cells}of groups.values()){
  cells.sort((a,b)=>a-b);let start=cells[0],last=start;
  const emit=()=>runs.push({axis,fixed,sign,start,end:last+1});
  for(const n of cells.slice(1)){if(n!==last+1){emit();start=n;}last=n;}if(cells.length)emit();
 }return runs;
}
const EMPTY=Object.freeze({active:false,shapes:[],triangles:0,wallRuns:0,casters:0,discarded:0});

export function sceneContactDepthPlan542(world,{objects:provided,sites=[],worksites=[],buildings=[]}={}){
 const scene=world?.scene;if(!active(scene))return EMPTY;
 const objects=provided??scene.objects??[],indoor=isInteriorScene(scene),blocked=new Set((scene.affordanceBlocked||[]).map(p=>key(...p))),controls=protectedCells(objects);
 const roots=rootDescriptors(scene,objects,sites,worksites,buildings),signature=JSON.stringify([scene.floor,scene.affordanceBlocked,[...controls],roots]);
 const previous=CACHE.get(scene);if(previous?.signature===signature)return previous.plan;
 const walk=(x,z)=>scene.floor[z]?.[x]==='.'&&!blocked.has(key(x,z)),paintable=(x,z)=>walk(x,z)&&!controls.has(key(x,z));
 const water=new Set();if(!indoor){const landscape=adventureLandscapePlan(world);for(const r of landscape.terraces||[])if(r.water)for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)water.add(key(x,z));}
 const shapes=[];let triangles=0,discarded=0,usedRuns=0,usedCasters=0;
 const append=(raw,alpha,kind,level=0)=>{
  const poly=cleanPoly(raw);
  const n=poly.length-2;if(n<=0||Math.abs(signedArea(poly))<1e-9)return false;if(triangles+n>MAX_TRIANGLES){discarded++;return false;}
  const points=signedArea(poly)>0?[...poly].reverse():poly,bounds={x0:Infinity,z0:Infinity,x1:-Infinity,z1:-Infinity};
  for(const p of points){bounds.x0=Math.min(bounds.x0,p[0]);bounds.z0=Math.min(bounds.z0,p[1]);bounds.x1=Math.max(bounds.x1,p[0]);bounds.z1=Math.max(bounds.z1,p[1]);}
  shapes.push({points,alpha,y:Y+level*.0003,kind,bounds,triangles:n});triangles+=n;return true;
 };
 // Connected wall contacts are continuous strips. Their checked one-cell
 // receiver run permits a single broad face instead of an internal tile grid.
 const runs=wallRuns(scene,paintable,walk,water),at=scene.authoredOpening?.arrival||scene.arrive?.map(v=>v+.5)||[scene.width/2,scene.height/2];
 runs.sort((a,b)=>{const dist=r=>Math.hypot((r.axis==='x'?(r.start+r.end)/2:r.fixed)-at[0],(r.axis==='z'?(r.start+r.end)/2:r.fixed)-at[1]);return dist(a)-dist(b)||a.fixed-b.fixed||a.start-b.start;});
 for(const r of runs.slice(0,190)){
  let emitted=false;
  for(const [width,alpha,level]of [[indoor?.42:.36,indoor?.045:.038,0],[indoor?.24:.20,indoor?.075:.065,1],[.075,indoor?.13:.105,2]]){
   const near=r.fixed+r.sign*.008,far=r.fixed+r.sign*width,p=r.axis==='x'?[[r.start,near],[r.end,near],[r.end,far],[r.start,far]]:[[near,r.start],[near,r.end],[far,r.end],[far,r.start]];
   emitted=append(p,alpha,'wall-contact',level)||emitted;
  }if(emitted)usedRuns++;
 }
 // The key comes from (-.438,+.341) horizontally in both existing renderers.
 // Short opposing casts and a close soft apron attach the supplied structure
 // without a new shadow-map owner or a broad opaque patch over the route.
 roots.sort((a,b)=>Number(a.source==='native')-Number(b.source==='native')||Math.hypot(a.x-at[0],a.z-at[1])-Math.hypot(b.x-at[0],b.z-at[1]));
 for(const root of roots.slice(0,MAX_CASTERS)){
  const throwLength=Math.min(indoor?.48:1.32,root.height*(indoor?.18:.40)),spread=Math.max(root.rx,root.rz),cx=root.x+CAST[0]*throwLength*.45,cz=root.z+CAST[1]*throwLength*.45;
  let emitted=false;
  for(const [scale,alpha,level]of [[1.28,.042,0],[1.07,.075,1],[.83,.11,2]]){
   const rx=(root.rx+.17+throwLength*.46)*scale,rz=(root.rz+.14+throwLength*.32)*scale;
   const poly=Array.from({length:12},(_,i)=>{const a=i*TAU/12;return[cx+Math.cos(a)*rx,cz+Math.sin(a)*rz];});
   for(const p of clippedFloor(poly,paintable))emitted=append(p,alpha,'cast-shadow',level)||emitted;
  }
  // A second narrow receiver beside the exact root is soft contact rather
  // than a circular UI plinth; clipping removes the occupied base and water.
  if(spread<2.4){const poly=Array.from({length:10},(_,i)=>{const a=i*TAU/10;return[root.x+Math.cos(a)*(root.rx+.24),root.z+Math.sin(a)*(root.rz+.24)];});for(const p of clippedFloor(poly,paintable))emitted=append(p,.085,'root-contact',3)||emitted;}
  if(emitted)usedCasters++;
 }
 const plan={active:true,shapes,triangles,wallRuns:usedRuns,casters:usedCasters,discarded};CACHE.set(scene,{signature,plan});return plan;
}

export function appendSceneContactDepth542(mesh,options={}){
 const plan=sceneContactDepthPlan542(options.world,options);if(!plan.active)return{...EMPTY,shapes:undefined,planTriangles:0,visibleTriangles:0,visibleShapes:0,skippedShapes:0,fadedShapes:0};
 const state=options.world?.state,position=Number.isFinite(state?.x)&&Number.isFinite(state?.y)?[state.x,state.y]:null;
 let triangles=0,visibleShapes=0,skippedShapes=0,fadedShapes=0;
 for(const s of plan.shapes){
  let fade=1;
  if(position){
   const b=s.bounds,dx=Math.max(b.x0-position[0],0,position[0]-b.x1),dz=Math.max(b.z0-position[1],0,position[1]-b.z1),d2=dx*dx+dz*dz;
   if(d2>=CULL_DISTANCE*CULL_DISTANCE){skippedShapes++;continue;}
   if(d2>FADE_START*FADE_START){const t=(Math.sqrt(d2)-FADE_START)/(CULL_DISTANCE-FADE_START);fade=1-t*t*(3-2*t);fadedShapes++;}
  }
  // Bounds and clipped receiver polygons are cached in the static plan.
  // Movement changes only visibility and this outer feather, not topology.
  const p=s.points,alpha=s.alpha*fade;for(let i=1;i+1<p.length;i++)mesh.tri([p[0][0],s.y,p[0][1]],[p[i][0],s.y,p[i][1]],[p[i+1][0],s.y,p[i+1][1]],INK,8,0,alpha,[0,1,0]);
  triangles+=s.triangles;visibleShapes++;
 }
 return{active:true,triangles,visibleTriangles:triangles,planTriangles:plan.triangles,visibleShapes,skippedShapes,fadedShapes,wallRuns:plan.wallRuns,casters:plan.casters,discarded:plan.discarded};
}
