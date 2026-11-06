/** Near-field composition belongs to real arrivals and activities. Root sites
 * are selected from closed native ground supported by the actual landscape. */
import {adventureLandscapePlan} from './adventure-landscape.js?v=5.42';
import {buildingReservations,intersectsGroundRect} from './environmental-grounding.js';
import {isExteriorArtScene} from './exterior-art-selection-541.js?v=5.41';

const CACHE=new WeakMap(),FULL=1.36,SLIM=.34,SEPARATION=3.6,MAX_SITES=12;
const key=(x,z)=>x+','+z;
const kindFor={village:'canopy',woodland:'canopy',mangrove:'roots',spore:'collector',sand:'aqueduct',cactus:'cactus',coral:'coral',salt:'tideglass',riverbank:'waterwheel',highland:'windharp',storm:'windharp',foundry:'conduit',lava:'basalt',caldera:'basalt',crystal:'mineral',ice:'ice-rib',aurora:'aurora-rib',ruins:'ruin',marble:'marble'};
const ANCHOR_TYPES=new Set(['portal','camp','shop','project','frontier-landmark','frontier-board','puzzle','switch','aid','mentor','npc','guide','patrol','boss','origin-exit','clue','riddle']);
const PRIORITY={portal:1,'frontier-landmark':2,'frontier-board':2,project:2,camp:2,shop:2,aid:2,mentor:2,puzzle:3,switch:3,boss:3,patrol:4,npc:5,guide:5,clue:6,riddle:6};
const finitePoint=p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite);
const RIGHT=[.78/Math.hypot(.35,.78),-.35/Math.hypot(.35,.78)],FORWARD=[-RIGHT[1],RIGHT[0]];
function arrival(scene,walk){
 const a=scene.authoredOpening?.arrival;if(finitePoint(a)&&walk(Math.floor(a[0]),Math.floor(a[1])))return [...a];
 const b=scene.arrive;if(finitePoint(b)&&walk(Math.floor(b[0]),Math.floor(b[1])))return[b[0]+.5,b[1]+.5];
 for(let z=0;z<scene.height;z++)for(let x=0;x<scene.width;x++)if(walk(x,z))return[x+.5,z+.5];return null;
}
function nativeAnchors(scene,objects,at){
 const out=[{id:'arrival:'+scene.location,x:at[0],z:at[1],type:'arrival',priority:0}],seen=new Set([key(...at)]);
 const add=(id,xy,type,priority)=>{if(!finitePoint(xy))return;const x=xy[0]+.5,z=xy[1]+.5,k=key(x,z);if(seen.has(k))return;seen.add(k);out.push({id,x,z,type,priority});};
 for(const o of objects){
  if(o.hidden||o.revealed===false||!ANCHOR_TYPES.has(o.type))continue;
  const id=String(o.id||o.householdId||o.physicalId||[o.type,...(o.xy||[])].join(':'));add(id,o.xy,o.type,PRIORITY[o.type]??6);
  if(['patrol','boss'].includes(o.type))for(let i=0;i<(o.enemies||[]).length;i++)add(id+':enemy:'+i,o.enemies[i]?.[1],'patrol',4);
 }
 return out.sort((a,b)=>a.priority-b.priority||Math.hypot(a.x-at[0],a.z-at[1])-Math.hypot(b.x-at[0],b.z-at[1])||a.id.localeCompare(b.id));
}
function supportingTerrain(landscape){
 const cells=new Map();for(const r of landscape.terraces||[])for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)cells.set(key(x,z),{y:r.height,water:!!r.water});return cells;
}
function rootCells(x,z,radius){
 const out=[];for(let zz=Math.floor(z-radius);zz<=Math.floor(z+radius);zz++)for(let xx=Math.floor(x-radius);xx<=Math.floor(x+radius);xx++){
  const dx=Math.max(xx-x,0,x-xx-1),dz=Math.max(zz-z,0,z-zz-1);if(dx*dx+dz*dz<radius*radius-1e-9)out.push([xx,zz]);
 }return out;
}
function support(x,z,radius,walk,terrain,waterAllowed){
 const cells=rootCells(x,z,radius),heights=[];let water=false;
 for(const[xx,zz]of cells){if(walk(xx,zz))return null;const t=terrain.get(key(xx,zz));if(!t||!Number.isFinite(t.y)||t.water&&!waterAllowed)return null;heights.push(t.y);water||=t.water;}
 if(!heights.length||Math.max(...heights)-Math.min(...heights)>(radius===FULL?.75:.025))return null;
 // Natural roots embed in the low side of a bank; an elevated bounding box
 // would leave the whole tree or rock hovering above its downhill footing.
 const supportMin=Math.min(...heights),supportMax=Math.max(...heights);
 return{y:supportMin,supportMin,supportMax,water};
}
function reservations(scene,objects){
 const rects=[];
 for(const b of buildingReservations(scene))for(const r of b.groundRects||[])rects.push({x:r.x,y:r.y,w:r.w,h:r.h});
 for(const o of objects){const f=o.footprint;if(f&&[f.x,f.y,f.w,f.h].every(Number.isFinite))rects.push({x:f.x,y:f.y,w:f.w,h:f.h});}
 return rects;
}
function occupied(objects){
 const out=[];
 for(const o of objects){
  if(o.hidden||o.revealed===false)continue;
  if(finitePoint(o.xy)&&o.type!=='furnishing')out.push([o.xy[0]+.5,o.xy[1]+.5]);
  if(finitePoint(o.from))out.push([o.from[0]+.5,o.from[1]+.5]);else if(Number.isFinite(o.from?.x)&&Number.isFinite(o.from?.y))out.push([o.from.x,o.from.y]);
  if(finitePoint(o.to))out.push([o.to[0]+.5,o.to[1]+.5]);else if(Number.isFinite(o.to?.x)&&Number.isFinite(o.to?.y))out.push([o.to.x,o.to.y]);
  if(['patrol','boss'].includes(o.type))for(const enemy of o.enemies||[])if(finitePoint(enemy?.[1]))out.push([enemy[1][0]+.5,enemy[1][1]+.5]);
 }return out;
}
function candidates(anchor,context){
 const {walk,terrain,rects,actors,waterAllowed,family}=context,rows=[];
 for(let dz=-7;dz<=7;dz++)for(let dx=-7;dx<=7;dx++){
  const x=Math.floor(anchor.x)+dx+.5,z=Math.floor(anchor.z)+dz+.5,ax=x-anchor.x,az=z-anchor.z,distance=Math.hypot(ax,az);if(distance<2.7||distance>7)continue;
  const forward=ax*FORWARD[0]+az*FORWARD[1],lateral=ax*RIGHT[0]+az*RIGHT[1];
  // A tall object directly between the camera and a lead/control obscures the
  // reason for visiting it. Back and side positions compose that activity.
  if(forward>1.0&&Math.abs(lateral)<2.6)continue;
  if(['village','woodland','mangrove','spore'].includes(family)&&forward>.3)continue;
  for(const radius of[FULL,SLIM]){
   const r={x:x-radius,y:z-radius,w:radius*2,h:radius*2};if(rects.some(q=>intersectsGroundRect(r,q,.18)))continue;
   if(actors.some(p=>Math.hypot(p[0]-x,p[1]-z)<1.6+radius))continue;
   const ground=support(x,z,radius,walk,terrain,waterAllowed);if(!ground)continue;
   rows.push({x,z,...ground,slim:radius===SLIM,radius,distance,forward,lateral});break;
  }
 }
 return rows;
}
export function exteriorAnchorSites(world,{objects:provided,landscapePlan:providedLandscape,reservedRects=[]}={}){
 const scene=world?.scene;if(!isExteriorArtScene(scene))return[];
 const objects=(provided??scene.objects??[]).filter(o=>!o.hidden&&o.revealed!==false),landscape=providedLandscape||adventureLandscapePlan(world);
 const signature=JSON.stringify([scene.floor,scene.affordanceBlocked,scene.arrive,scene.authoredOpening?.arrival,reservedRects,objects.map(o=>[o.id,o.type,o.xy,o.footprint,o.from,o.to,o.enemies])]);
 const old=CACHE.get(scene);if(old?.landscape===landscape&&old.signature===signature)return old.sites;
 const blocked=new Set((scene.affordanceBlocked||[]).map(p=>key(...p))),walk=(x,z)=>scene.floor[z]?.[x]==='.'&&!blocked.has(key(x,z)),at=arrival(scene,walk);if(!at)return[];
 const family=landscape.family,anchors=nativeAnchors(scene,objects,at),context={walk,family,terrain:supportingTerrain(landscape),rects:[...reservations(scene,objects),...reservedRects],actors:occupied(objects),waterAllowed:['riverbank','mangrove','coral','salt'].includes(family)},sites=[];
 const choose=(anchor,target,index)=>{
  const rows=candidates(anchor,context).filter(p=>sites.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=SEPARATION));if(!rows.length)return false;
  const score=p=>Math.hypot(p.x-target[0],p.z-target[1])+Math.max(0,p.forward)*.65+Math.abs(p.distance-4.8)*.15;
  rows.sort((a,b)=>Number(a.slim)-Number(b.slim)||score(a)-score(b)||a.z-b.z||a.x-b.x);const p=rows[0],market=/market|hub/.test(scene.key||'');
  sites.push({x:p.x,z:p.z,y:p.y,supportMin:p.supportMin,supportMax:p.supportMax,kind:market&&!p.slim&&p.supportMax-p.supportMin<=.025?'pavilion':kindFor[family]||'canopy',family,index:sites.length,near:p.forward>1.5,slim:p.slim,radius:p.radius,water:p.water,anchorId:anchor.id,anchor:[anchor.x,anchor.z],arrival:index<3});return true;
 };
 const entry=anchors[0];for(const[lateral,back]of[[-4.3,-2.6],[4.3,-2.6],[0,-5.5]])choose(entry,[entry.x+RIGHT[0]*lateral+FORWARD[0]*back,entry.z+RIGHT[1]*lateral+FORWARD[1]*back],sites.length);
 for(const anchor of anchors.slice(1)){if(sites.length>=MAX_SITES)break;choose(anchor,[anchor.x-FORWARD[0]*4.7,anchor.z-FORWARD[1]*4.7],3);}
 context.terrain.clear();CACHE.set(scene,{landscape,signature,sites});return sites;
}
