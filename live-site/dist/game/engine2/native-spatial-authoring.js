/** Scene composition projected from the native world.
 * The 5.32 handoff supplies the anchor/cluster/route vocabulary. Native floor
 * masks and existing positions supply the actual plan; this module never
 * generates a replacement coordinate or an automatic filler object.
 */
import {isInteriorScene} from './scene-identity.js?v=4.0.0';

const CACHE=new WeakMap();
const key=(x,z)=>x+','+z;
const STEPS=[[0,-1],[-1,0],[1,0],[0,1]];
const PEOPLE=new Set(['npc','guide','mentor','shop','transport','aid']);
const ROLES={portal:'threshold','embodied-action':'mechanism',puzzle:'mechanism',switch:'mechanism',project:'workplace','lore-device':'mechanism',listen:'listening',camp:'rest',shop:'workplace',aid:'care',mentor:'workplace','frontier-board':'destination','frontier-landmark':'landmark'};
const PRIORITY={threshold:0,mechanism:1,workplace:2,care:3,rest:4,listening:5,destination:6,landmark:7};
const point=o=>Array.isArray(o?.xy)&&o.xy.length===2&&o.xy.every(Number.isFinite)?{x:o.xy[0]+.5,z:o.xy[1]+.5}:null;

function topology(scene){
 const blocked=new Set((scene.affordanceBlocked||[]).map(p=>key(...p)));
 const cells=new Map();
 for(let z=0;z<scene.height;z++)for(let x=0;x<scene.width;x++)if(scene.floor[z]?.[x]==='.'&&!blocked.has(key(x,z)))cells.set(key(x,z),{x,z,component:-1});
 const components=[];
 for(const cell of cells.values()){
  if(cell.component>=0)continue;
  const id=components.length,queue=[cell],members=[];cell.component=id;
  for(let i=0;i<queue.length;i++){
   const current=queue[i];members.push([current.x,current.z]);
   for(const[dx,dz]of STEPS){const next=cells.get(key(current.x+dx,current.z+dz));if(next&&next.component<0){next.component=id;queue.push(next);}}
  }
  components.push({id,cells:members});
 }
 const landing=p=>{
  const direct=cells.get(key(Math.floor(p.x),Math.floor(p.z)));if(direct)return direct;
  let best=null;
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
   const c=cells.get(key(Math.floor(p.x)+dx,Math.floor(p.z)+dz));if(!c)continue;
   const distance=Math.hypot(c.x+.5-p.x,c.z+.5-p.z);
   if(distance<=2.1&&(!best||distance<best.distance))best={cell:c,distance};
  }
  return best?.cell||null;
 };
 return {cells,components,landing};
}

function search(cells,start){
 const queue=[start],seen=new Map([[key(start.x,start.z),null]]);
 for(let i=0;i<queue.length;i++)for(const[dx,dz]of STEPS){
  const current=queue[i],next=cells.get(key(current.x+dx,current.z+dz));
  if(!next||seen.has(key(next.x,next.z)))continue;
  seen.set(key(next.x,next.z),key(current.x,current.z));queue.push(next);
 }
 return end=>{
  let at=key(end.x,end.z);if(!seen.has(at))return null;
  const path=[];while(at!==null){path.push(at.split(',').map(Number));at=seen.get(at);}
  return path.reverse();
 };
}

/** Complete transitive social groups, independent of input ordering. */
export function nativeSocialClusters(actors,{radius=4.5}={}){
 const remaining=new Set(actors.map((_,i)=>i)),groups=[];
 while(remaining.size){
  const seed=remaining.values().next().value,queue=[seed],members=[];remaining.delete(seed);
  for(let i=0;i<queue.length;i++){
   const actor=actors[queue[i]];members.push(actor);
   for(const j of [...remaining])if(actor.component===actors[j].component&&Math.hypot(actor.x-actors[j].x,actor.z-actors[j].z)<=radius){remaining.delete(j);queue.push(j);}
  }
  groups.push(members.sort((a,b)=>a.id.localeCompare(b.id)));
 }
 return groups.sort((a,b)=>a[0].id.localeCompare(b[0].id));
}

export function nativeSpatialPlan(world,{objects=[]}={}){
 const scene=world?.scene;
 if(!scene?.floor)return {scene:null,anchors:[],actors:[],clusters:[],routes:[],openSpaces:[],stats:{}};
 // Callers supply their already-visible descriptors. Calling World.objects()
 // here could migrate an old save; reading raw scene objects could expose a
 // hidden destination. With no snapshot the plan deliberately has no actors.
 const visible=objects.filter(o=>!o.hidden&&o.revealed!==false);
 const signature=JSON.stringify([scene.floor,scene.affordanceBlocked,visible.map(o=>[o.id,o.type,o.xy,o.lifeKind,o.originStep,o.householdId])]);
 const prior=CACHE.get(scene);if(prior?.signature===signature)return prior.plan;
 const map=topology(scene),anchors=[],actors=[],ids=new Map();
 for(const o of visible){
  const at=point(o);if(!at)continue;
  const base=String(o.id||o.householdId||o.physicalId||[o.type,o.originStep??o.bit??'',...o.xy].join(':'));
  const duplicate=ids.get(base)||0;ids.set(base,duplicate+1);const id=duplicate?base+':'+duplicate:base;
  const floor=map.landing(at),descriptor={id,nativeId:o.id||o.householdId||o.physicalId||null,nativeType:o.type,xy:[...o.xy],...at,component:floor?.component??-1,landing:floor?[floor.x,floor.z]:null};
  if(ROLES[o.type]&&floor)anchors.push({...descriptor,role:ROLES[o.type],label:o.label||o.name||o.role||o.type,priority:PRIORITY[ROLES[o.type]]});
  if(PEOPLE.has(o.type)||o.lifeKind==='resident')actors.push({...descriptor,role:o.activity||o.lifeRole||o.role||'resident'});
 }
 // A small tree connects the actual functional destinations in each connected
 // region. Every segment is a cardinal route through the exact native mask.
 const routes=[];
 for(const component of map.components){
  const targets=anchors.filter(a=>a.component===component.id).sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id)).slice(0,18);
  if(targets.length<2)continue;
  const searches=new Map(),connected=new Set([0]),pending=new Set(targets.map((_,i)=>i).slice(1));
  const pathBetween=(a,b)=>{
   if(!searches.has(a))searches.set(a,search(map.cells,map.cells.get(key(...targets[a].landing))));
   return searches.get(a)(map.cells.get(key(...targets[b].landing)));
  };
  while(pending.size){
   let best=null;
   for(const a of connected)for(const b of pending){const cells=pathBetween(a,b);if(cells&&(!best||cells.length<best.cells.length))best={a,b,cells};}
   if(!best)break;
   const from=targets[best.a],to=targets[best.b];
   routes.push({id:from.id+'→'+to.id,from:from.id,to:to.id,component:component.id,cells:best.cells,role:from.role==='mechanism'||to.role==='mechanism'?'service':'circulation'});
   connected.add(best.b);pending.delete(best.b);
  }
 }
 const clusters=nativeSocialClusters(actors).map(members=>{
  const center={x:members.reduce((n,a)=>n+a.x,0)/members.length,z:members.reduce((n,a)=>n+a.z,0)/members.length};
  const anchor=anchors.filter(a=>a.component===members[0].component).sort((a,b)=>Math.hypot(a.x-center.x,a.z-center.z)-Math.hypot(b.x-center.x,b.z-center.z)||a.id.localeCompare(b.id))[0];
  return {id:'social:'+members.map(m=>m.id).join('|'),anchorId:anchor?.id||null,members,center,component:members[0].component};
 });
 const occupied=new Set();for(const a of anchors)occupied.add(key(...a.landing));for(const r of routes)for(const p of r.cells)occupied.add(key(...p));
 const distance=new Map(),queue=[];for(const k of occupied){distance.set(k,0);queue.push(map.cells.get(k));}
 for(let i=0;i<queue.length;i++)for(const[dx,dz]of STEPS){const p=queue[i],k=key(p.x+dx,p.z+dz),next=map.cells.get(k);if(next&&!distance.has(k)){distance.set(k,distance.get(key(p.x,p.z))+1);queue.push(next);}}
 const openSpaces=[];
 for(const component of map.components){
  const broad=component.cells.filter(p=>(distance.get(key(...p))??Infinity)>5);if(broad.length<16)continue;
  const threats=visible.flatMap(o=>['patrol','boss'].includes(o.type)?[o.xy,...(o.enemies||[]).map(e=>e[1])].filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)):[]);
  const encounter=threats.some(p=>map.cells.get(key(Math.floor(p[0]),Math.floor(p[1])))?.component===component.id);
  openSpaces.push({component:component.id,area:broad.length,cells:broad,purpose:encounter?'encounter lanes':isInteriorScene(scene)?'room circulation':'traversal and habitat',automaticFill:false});
 }
 const plan={scene:scene.location,kind:scene.originId?'remembered life':isInteriorScene(scene)?'interior':['town','market','hub'].includes(scene.key)?'settlement':'landscape',anchors,actors,clusters,routes,openSpaces,stats:{anchorCount:anchors.length,actorCount:actors.length,clusterCount:clusters.length,routeCount:routes.length,walkableCells:map.cells.size,unconnectedRegions:map.components.filter(c=>!anchors.some(a=>a.component===c.id)).length}};
 CACHE.set(scene,{signature,plan});return plan;
}
