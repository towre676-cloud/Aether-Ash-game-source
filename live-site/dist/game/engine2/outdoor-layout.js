import {environmentFor} from './environment.js?v=5.18.0';
import {isInteriorScene} from './scene-identity.js';
import {streetPlan} from './wayfinding.js?v=5.22.0';
import {terrainTrails} from './terrain-materials.js?v=4.0.0';
import {regionalSiteSpec,regionalGroundSpec,regionalWorkKind} from './environment-art-v17.js?v=5.22.0';
import {CANOPY_STYLE_POOLS,environmentCanopyGeometry} from './environment-canopies-v17.js?v=5.18.0';
import {canopyVariationGeometry} from './environment-canopies-v19.js?v=5.18.1';
import {buildingReservations,intersectsGroundRect} from './environmental-grounding.js?v=5.22.0';

/** One presentation plan for the outdoor scene. All three drawing layers use
 * these same reservations. Collision, functional objects and saves are inputs,
 * never outputs. Authored banks are group anchors, not a second scatter pass. */
const T=48,cache=new WeakMap(),image=Object.freeze({width:1774,height:887,complete:true});
const finitePoint=p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=(x,y,s=1)=>{let n=Math.imul((x|0)+137,374761393)^Math.imul((y|0)+257,668265263)^Math.imul(s,1597334677);n=Math.imul(n^(n>>>13),1274126177);return(n^(n>>>16))>>>0;};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const centre=p=>({x:p[0]+.5,y:p[1]+.5});
const rect=(x,y,w,h)=>({x,y,w,h});
const area=b=>b.w*b.h;
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const open=(scene,x,y)=>scene.floor?.[Math.floor(y)]?.[Math.floor(x)]==='.';
const key=(x,y)=>x+','+y;
const naturalKind=style=>/river|mangrove/.test(style)?'reeds':/ice|highland|storm|sand|cactus|ruin|marble|foundry|lava|salt/.test(style)?'stone':/crystal/.test(style)?'glass':'fern';

/** These are the exact displayed regional crop dimensions, including the local
 * scale applied by scene-craft. Landmarks reserve their larger fallback too. */
export function projectedPropBounds(site,scene){
 const scale=Number.isFinite(site.scale)?site.scale:1;
 if(site.landmark||site.role==='landmark')return rect(site.x-1.68*scale,site.y-3.2*scale,3.36*scale,3.3*scale);
 const spec=regionalSiteSpec(site,scene),w=(spec?.width||80)*scale/T,h=(spec?.height||80)*scale/T;
 return rect(site.x-w/2,site.y-h+3*scale/T,w,h);
}

export function plannedCanopy(seed,style){return canopyVariationGeometry(seed,style,image)||environmentCanopyGeometry(seed,style,image);}
export function projectedTreeBounds(site,style){
 const b=plannedCanopy(site.seed,style)?.opaque;
 return b?rect(site.x+b.left/T,site.y+b.top/T,(b.right-b.left)/T,(b.bottom-b.top)/T):rect(site.x-2.35,site.y-5.25,4.7,5.4);
}
export function projectedGroundBounds(site,scene){const s=regionalGroundSpec(scene,site.seed);return s?rect(site.x-s.width/T/2,site.y-s.height/T,s.width/T,s.height/T):rect(site.x-.8,site.y-.72,1.6,.72);}

function blockedBanks(scene){
 const w=scene.width|0,h=scene.height|0,ids=new Int32Array(w*h).fill(-1),components=[],steps=[[1,0],[-1,0],[0,1],[0,-1]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(open(scene,x,y)||ids[y*w+x]>=0)continue;
  const id=components.length,cells=[[x,y]],boundary=[];ids[y*w+x]=id;
  for(let i=0;i<cells.length;i++){
   const [cx,cy]=cells[i];let edge=false;
   for(const [dx,dy]of steps){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;if(open(scene,nx,ny)){edge=true;continue;}if(ids[ny*w+nx]<0){ids[ny*w+nx]=id;cells.push([nx,ny]);}}
   if(edge&&cx>0&&cy>0&&cx<w-1&&cy<h-1)boundary.push({x:cx+.5,y:cy+.65,cellX:cx,cellY:cy,componentId:id,seed:hash(cx,cy,scene.location||1)});
  }
  components.push({id,size:cells.length,cells,boundary});
 }
 return {ids,components,idAt:(x,y)=>ids[Math.floor(y)*w+Math.floor(x)]??-1};
}

function sceneReservations(scene,quietRadius){
 const buildings=buildingReservations(scene),urban=['town','market','hub'].includes(scene.key),paths=urban?new Set(streetPlan(scene)):new Set();
 if(!urban)for(const route of terrainTrails(scene))for(const p of route)paths.add(key(...p));
 for(const p of scene.authoredOpening?.approach||[])if(finitePoint(p)&&open(scene,...p))paths.add(key(Math.floor(p[0]),Math.floor(p[1])));
 const pathRects=[...paths].map(k=>{const [x,y]=k.split(',').map(Number);return rect(x-.08,y-.8,1.16,1.9);});
 const anchors=[finitePoint(scene.arrive)?centre(scene.arrive):null,...(scene.doors||[]).filter(o=>finitePoint(o.xy)).map(o=>centre(o.xy)),...(scene.objects||[]).filter(o=>o.type!=='furnishing'&&finitePoint(o.xy)).map(o=>centre(o.xy))].filter(Boolean);
 const courts=anchors.map(p=>rect(p.x-.9,p.y-1.75,1.8,2.65));
 if(finitePoint(scene.arrive)){const p=centre(scene.arrive);courts.push(rect(p.x-1.55,p.y-2.05,3.1,3.55));}
 for(const d of scene.doors||[])if(finitePoint(d.xy)){const p=centre(d.xy);courts.push(rect(p.x-1.2,p.y-1.35,2.4,3.1));}
 for(const b of buildings)courts.push(b.approach);
 const focus=scene.authoredOpening?.landmark?.focus;
 if(finitePoint(focus))courts.push(rect(focus[0]-1.3,focus[1]-1.7,2.6,3));
 return {buildings,paths,pathRects,courts,anchors,quietRadius};
}

function workAnchors(scene){
 const list=[];
 for(const b of scene.exteriorBuildings||[]){
  const p=b.projection;if(!finitePoint(p?.outside))continue;
  const text=[b.purpose,b.kind,b.key,b.label,b.name,b.exit?.to,b.exit?.travel_label].filter(Boolean).join(' '),workKind=regionalWorkKind(text);
  // A house may have a small domestic group. A generic town is not a workshop.
  if(workKind&&!['ruins','storm','weather'].includes(workKind))list.push({...centre(p.outside),id:'building-'+b.id,workKind});
 }
 for(const [i,o]of (scene.objects||[]).entries()){
  if(!finitePoint(o.xy)||!['puzzle','switch','project','shop','camp','transport','ferry'].includes(o.type)||o.originStep===2||/^find a way past/i.test(o.label||''))continue;
  const text=[o.workKind,o.mechanism,o.artRole,o.label,o.puzzle_kind].filter(Boolean).join(' '),workKind=regionalWorkKind(text);
  if(workKind&&!['household','ruins'].includes(workKind))list.push({...centre(o.xy),id:'object-'+(o.id||i),workKind});
 }
 return list.filter((p,i)=>!list.slice(0,i).some(q=>q.workKind===p.workKind&&distance(p,q)<5));
}

function narrativeKind(kind,style){return /furnace|kiln|forge/.test(kind)?'furnace':/rail|signal/.test(kind)?'signal':/archive|lamp/.test(kind)?'lamp':/sluice|flood|gauge/.test(kind)?'gauge':/mast|relay|listen/.test(kind)?'mast':/water|river|mangrove/.test(style)?'gauge':/foundry|forge/.test(style)?'furnace':'mast';}
function cohortSeed(base,style,desired){
 for(let i=0;i<1024;i++){const seed=hash(base,i,73),p=plannedCanopy(seed,style);if(p?.id===desired)return seed;}
 return base>>>0;
}
function canopyFamily(style,sceneSeed,groupIndex){
 const pool=CANOPY_STYLE_POOLS[style];if(!pool)return null;
 // Most nearby groves use the local dominant. One in four can be a secondary
 // family; age and handedness vary inside that family, not the whole catalogue.
 const primary=sceneSeed%pool.length,index=groupIndex%4===3?(primary+1)%pool.length:primary;
 return pool[index];
}

export function outdoorLayout(scene){
 if(!scene||typeof scene!=='object'||isInteriorScene(scene))return {sites:[],trees:[],groundSites:[],groups:[],landmarks:[],reservations:null};
 if(cache.has(scene))return cache.get(scene);
 const style=environmentFor(scene).style||'village',town=['town','market','hub'].includes(scene.key),w=scene.width||0,h=scene.height||0,quietRadius=clamp(scene.authoredOpening?.quietRadius||2.3,1.8,4),banks=blockedBanks(scene),reservations=sceneReservations(scene,quietRadius);
 const groupBudget=clamp(Math.round(w*h/280),3,town?8:8),limits={props:town?24:Math.min(30,groupBudget*3+4),trees:town?16:Math.min(20,groupBudget*3),groups:groupBudget,ground:town?10:groupBudget};
 const sites=[],trees=[],groundSites=[],groups=[],landmarks=[],occupied=[],sceneSeed=hash(w,h,scene.location||1);
 const banksFlat=banks.components.filter(c=>c.size>=6).flatMap(c=>c.boundary),treesAllowed=!!CANOPY_STYLE_POOLS[style];
 const rootSafe=(p,allowOpen=false)=>p.x>=.6&&p.y>=.6&&p.x<w-.6&&p.y<h-.6&&(allowOpen?open(scene,p.x,p.y):!open(scene,p.x,p.y))&&!reservations.anchors.some(a=>distance(a,p)<quietRadius);
 const clear=(bounds,p,{tree=false,ground=false,landmark=false}={})=>{
  if(bounds.x<.1||bounds.y<.1||bounds.x+bounds.w>w-.1||bounds.y+bounds.h>h-.1)return false;
  if(reservations.buildings.some(b=>intersectsGroundRect(bounds,b.visual,.12))||reservations.courts.some(b=>intersectsGroundRect(bounds,b,.08)))return false;
  if(reservations.pathRects.some(b=>intersectsGroundRect(bounds,b,ground?.12:0)))return false;
  for(const q of occupied){
   if(ground){if(q.role==='landmark'&&intersectsGroundRect(bounds,q.bounds,.4))return false;continue;}
   const shared=p.groupId===q.groupId;
   if(tree&&q.tree&&shared){if(overlap(bounds,q.bounds)>Math.min(area(bounds),area(q.bounds))*.24||distance(p,q)<2.45)return false;}
   else if(tree&&shared&&!q.tree&&q.role==='bank'&&q.y>=p.y-.05&&q.bounds.y>=p.y-1.35&&Math.abs(q.x-p.x)>=.75){
    // Deliberate low understory at the roots may share the empty lower trunk
    // envelope. The plant stays in front, below the crown, and off the trunk.
   }else if(!tree&&shared&&q.tree&&p.role==='bank'&&p.y>=q.y-.05&&bounds.y>=q.y-1.35&&Math.abs(p.x-q.x)>=.75){
    // The same intentional root planting is safe whichever layer was admitted first.
   }else if(intersectsGroundRect(bounds,q.bounds,shared?.12:.36))return false;
  }
  return true;
 };
 const occupy=(p,bounds,tree=false)=>{p.bounds=bounds;occupied.push({...p,tree});};
 const rawLandmark=scene.authoredOpening?.landmark;
 if(rawLandmark&&finitePoint(rawLandmark.xy)){
  const p={x:rawLandmark.xy[0],y:rawLandmark.xy[1],focus:(finitePoint(rawLandmark.focus)?rawLandmark.focus:rawLandmark.xy).slice(0,2),kind:narrativeKind(rawLandmark.kind||'',style),storyKind:rawLandmark.kind||'',radius:rawLandmark.radius,seed:hash(scene.location||1,83),scale:clamp(rawLandmark.scale||1,.75,1.35),label:rawLandmark.label||'',role:'landmark',groupId:'landmark',landmark:true,indoor:false};
  const bounds=projectedPropBounds(p,scene);
  if(rootSafe(p)&&clear(bounds,p,{landmark:true})){landmarks.push(p);occupy(p,bounds);}
 }
 // Two useful objects beside a real workplace are enough to describe its job.
 for(const anchor of workAnchors(scene).slice(0,town?4:3)){
  const groupId='work:'+anchor.id,motifSeed=hash(anchor.x*9,anchor.y*9,sceneSeed),group={id:groupId,role:'work',anchor:{x:anchor.x,y:anchor.y},workKind:anchor.workKind,motifSeed,memberCount:0};
  const candidates=banksFlat.filter(p=>distance(p,anchor)>=2.5&&distance(p,anchor)<=5.2).sort((a,b)=>distance(a,anchor)-distance(b,anchor)||a.seed-b.seed);
  for(let memberIndex=0;memberIndex<2&&sites.length<limits.props;memberIndex++){
   let placed=null;
   for(const q of candidates){const p={x:q.x,y:q.y,kind:'stone',scale:1,flip:false,seed:hash(motifSeed,memberIndex,41),role:'work',groupId,motifSeed,memberIndex,workKind:anchor.workKind,anchorId:anchor.id,componentId:q.componentId};if(memberIndex&&distance(p,group.first)>2.8)continue;const b=projectedPropBounds(p,scene);if(rootSafe(p)&&clear(b,p)){placed=p;sites.push(p);occupy(p,b);group.first??={x:p.x,y:p.y};group.memberCount++;break;}}
   if(!placed)break;
  }
  if(group.memberCount)groups.push(group);
 }
 const authored=scene.authoredOpening?.clusters,hasAuthored=Array.isArray(authored)&&authored.length>0;
 let candidates=hasAuthored?authored.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&!open(scene,p.x,p.y)).map((p,i)=>({...p,componentId:banks.idAt(p.x,p.y),authoredIndex:i,seed:(p.seed??hash(p.x*7,p.y*7,sceneSeed))>>>0})):banksFlat.slice().sort((a,b)=>a.seed-b.seed);
 candidates=candidates.filter(p=>banks.components[p.componentId]?.size>=6);
 const naturalGroups=[];
 for(const anchor of candidates){
  if(naturalGroups.length>=limits.groups||sites.length>=limits.props)break;
  if(naturalGroups.some(g=>distance(g.anchor,anchor)<6.5))continue;
  const groupId='bank:'+(hasAuthored?anchor.authoredIndex:naturalGroups.length),motifSeed=anchor.seed,group={id:groupId,role:'bank',anchor:{x:anchor.x,y:anchor.y},motifSeed,componentId:anchor.componentId,authored:hasAuthored,memberCount:0,treeCount:0};
  const local=banks.components[anchor.componentId].boundary.filter(p=>distance(p,anchor)<=4.5);
  const makeProp=(q,memberIndex,authoredMember=false)=>({x:q.x,y:q.y,kind:authoredMember?anchor.kind||naturalKind(style):naturalKind(style),scale:clamp(authoredMember?anchor.scale||1:.9,.7,1.12),flip:!!(hash(motifSeed,memberIndex)&1),seed:hash(motifSeed,memberIndex,29),role:'bank',groupId,motifSeed,memberIndex,componentId:anchor.componentId,authored:authoredMember,indoor:false});
  const first=makeProp(anchor,0,hasAuthored),firstBounds=projectedPropBounds(first,scene);
  if(!rootSafe(first)||!clear(firstBounds,first))continue;
  sites.push(first);occupy(first,firstBounds);group.memberCount++;
  const family=canopyFamily(style,sceneSeed,naturalGroups.length);group.canopyFamily=family;
  if(treesAllowed){
   // The grove grows behind and beside its small bank plants. Trees may share
   // a little canopy within a grove, but no other layer can occupy that crown.
   const treeCells=banks.components[anchor.componentId].cells.filter(([x,y])=>Math.hypot(x+.5-anchor.x,y+.85-anchor.y)<=6).map(([x,y])=>({x:x+.5,y:y+.85}));
   for(let memberIndex=0;memberIndex<3&&trees.length<limits.trees;memberIndex++){
    const target={x:anchor.x+(memberIndex===0?-1.1:memberIndex===1?1.8:-2.4),y:anchor.y-(memberIndex===2?2.6:1.1)},oldFamily={'orchard-apple':'elder-orchard','hazel-coppice':'open-coppice','river-alder':'leaning-alder','mangrove-cypress':'stilt-mangrove','snow-spruce':'broken-spruce','storm-juniper':'low-juniper'}[family],desired=memberIndex===2&&naturalGroups.length%4===3&&oldFamily?oldFamily:family,seed=cohortSeed(hash(motifSeed,memberIndex,137),style,desired);
    treeCells.sort((a,b)=>distance(a,target)-distance(b,target)||a.y-b.y||a.x-b.x);
    for(const q of treeCells){const p={...q,seed,groupId,motifSeed,memberIndex,role:'bank',componentId:anchor.componentId,canopyFamily:family},bounds=projectedTreeBounds(p,style);if(rootSafe(p)&&clear(bounds,p,{tree:true})){trees.push(p);occupy(p,bounds,true);group.treeCount++;break;}}
   }
  }
  for(let memberIndex=1;memberIndex<3&&sites.length<limits.props;memberIndex++){
   const target={x:anchor.x+(memberIndex===1?1.55:-1.65),y:anchor.y+(memberIndex===1?.75:1.15)};
   local.sort((a,b)=>distance(a,target)-distance(b,target)||a.seed-b.seed);
   for(const q of local){const p=makeProp(q,memberIndex),bounds=projectedPropBounds(p,scene);if(distance(p,anchor)<1.1||distance(p,anchor)>3.4)continue;if(rootSafe(p)&&clear(bounds,p)){sites.push(p);occupy(p,bounds);group.memberCount++;break;}}
  }
  naturalGroups.push(group);groups.push(group);
 }
 // Ground accents belong to a planted edge, never to an arbitrary hash hit on
 // a plaza. Their whole visible stamp must fit beside the protected route.
 for(const group of naturalGroups){
  if(groundSites.length>=limits.ground)break;
  const a=group.anchor,nearby=[];
  for(let y=Math.floor(a.y)-3;y<=a.y+3;y++)for(let x=Math.floor(a.x)-3;x<=a.x+3;x++)if(open(scene,x,y)){const p={x:x+.5,y:y+.7,seed:hash(group.motifSeed,x,y),groupId:group.id,motifSeed:group.motifSeed,role:'bank'};if(distance(p,a)<3)nearby.push(p);}
  nearby.sort((a,b)=>distance(a,group.anchor)-distance(b,group.anchor)||a.seed-b.seed);
  for(const p of nearby){const bounds=projectedGroundBounds(p,scene);if(!rootSafe(p,true)||!clear(bounds,p,{ground:true})||groundSites.some(q=>intersectsGroundRect(bounds,q.bounds,.25)))continue;groundSites.push({...p,bounds});break;}
 }
 const result={sites:Object.freeze(sites.map(Object.freeze)),trees:Object.freeze(trees.map(Object.freeze)),groundSites:Object.freeze(groundSites.map(Object.freeze)),groups:Object.freeze(groups.map(Object.freeze)),landmarks:Object.freeze(landmarks.map(Object.freeze)),reservations,limits,style,authored:hasAuthored};
 cache.set(scene,result);return result;
}
