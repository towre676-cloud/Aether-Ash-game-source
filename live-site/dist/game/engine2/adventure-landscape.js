/** Contiguous landscape around the actual playable footprint. Closed ground is
 * a bank, wood, cliff, shore or garden belonging to this place, never an empty
 * display pad. This layer neither moves actors nor opens a route. */
import {isInteriorScene} from './scene-identity.js?v=4.0.0';
import {environmentFor} from './environment.js?v=5.18.0';
import {terrainEdgeCraftPlan542,appendTerrainEdgeCraft542} from './terrain-edge-craft-542.js?v=5.42';
import {buildingReservations,intersectsGroundRect} from './environmental-grounding.js?v=5.22.0';
import {originStagingPlan} from './adventure-origin-staging.js?v=5.41';
import {regionalArtStyle} from './environment-art-v17.js?v=5.22.0';
import {exteriorHeroFeatures} from './exterior-art-selection-541.js?v=5.41';

const CACHE=new WeakMap(),TAU=Math.PI*2;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const MATERIALS={
 village:['#283c29','#304b2e','#2d542f'],woodland:['#22382a','#2a442c','#315c35'],spore:['#3b4940','#666b58','#637c64'],
 riverbank:['#335350','#728273','#48685b'],mangrove:['#294b43','#5c7460','#325b43'],coral:['#356967','#b4b39b','#6b8c79'],salt:['#657f79','#bec5b0','#8f9d88'],
 sand:['#87724c','#bba073','#7c8257'],cactus:['#65734b','#a0a077','#5f754c'],
 foundry:['#3d3931','#7b715b','#645c45'],lava:['#3c302a','#76604d','#80543e'],
 highland:['#46575b','#88938c','#657a6a'],storm:['#3b515c','#7e9199','#576e73'],
 crystal:['#405568','#8397a1','#78b9bb'],ice:['#607f8c','#a8c4c8','#d0d8c6'],aurora:['#4d667a','#9db4bb','#9fbfc2'],
 ruins:['#4c4d50','#8f9183','#68775c'],marble:['#697a79','#b3c2b8','#879a8a']
};
const WATER=new Set(['riverbank','mangrove','coral','salt']);
const WOODS=new Set(['village','woodland','spore','mangrove']);
const ROCKS=new Set(['highland','storm','crystal','ice','aurora','ruins','marble','foundry','lava']);
const key=(x,z)=>x+','+z;
const finitePoint=p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite);

export function adventureLandscapeFamily(world){
 const s=world?.scene;if(!s)return'village';
 let style=regionalArtStyle(s)||environmentFor(s)?.style||'village';
 if(isInteriorScene(s)){
  const kind=[s.key,s.interior,s.household?.kind].join(' ');
  if(/home|inn|quarters|clinic|carpenter|guild|attic/.test(kind))return'village';
  if(/cistern|drain|pump|flood|spillway/.test(kind))return'riverbank';
  if(/kiln|forge|pottery|workshop|instrumentworks|security|catwalk|hold|depot/.test(kind))return'foundry';
  return /lens|reactor|observatory|console/.test(kind)?'highland':'ruins';
 }
 return MATERIALS[style]?style:'village';
}
function rectangles(cells){
 const byKey=new Map(cells.map(c=>[key(c.x,c.z),c])),used=new Set(),out=[];
 for(const c of cells){const k=key(c.x,c.z);if(used.has(k))continue;let w=1,h=1;
  while(byKey.get(key(c.x+w,c.z))?.group===c.group&&!used.has(key(c.x+w,c.z)))w++;
  outer:while(true){for(let x=c.x;x<c.x+w;x++)if(byKey.get(key(x,c.z+h))?.group!==c.group||used.has(key(x,c.z+h)))break outer;h++;}
  for(let z=c.z;z<c.z+h;z++)for(let x=c.x;x<c.x+w;x++)used.add(key(x,z));
  out.push({...c,w,h});
 }return out;
}
function boundsFor(scene){
 const floor=scene.household?.floorBase||scene.floor,points=[];
 for(let z=0;z<scene.height;z++)for(let x=0;x<scene.width;x++)if(floor[z]?.[x]==='.'||scene.floor[z]?.[x]==='.')points.push([x,z]);
 return points.length?{x0:Math.min(...points.map(p=>p[0])),z0:Math.min(...points.map(p=>p[1])),x1:Math.max(...points.map(p=>p[0]))+1,z1:Math.max(...points.map(p=>p[1]))+1}:{x0:0,z0:0,x1:scene.width,z1:scene.height};
}

/** Public composition plan permits independent footprint and density checks. */
export function adventureLandscapePlan(world){
 const s=world?.scene;if(!s?.floor)return{family:'village',indoor:false,coastalStorm:false,base:-.06,water:false,bounds:{x0:0,z0:0,x1:1,z1:1},terraces:[],walls:[],waves:[],features:[],shore:[],authoredGroups:0};
 const signature=[s.floor.join(''),s.household?.floorBase?.join(''),JSON.stringify(s.exteriorBuildings||[]),JSON.stringify(s.authoredOpening?.clusters||[])].join('|'),old=CACHE.get(s);if(old?.signature===signature)return old.plan;
 const family=adventureLandscapeFamily(world),indoor=isInteriorScene(s),coastalStorm=s.originId==='veyr-storm',b=boundsFor(s),floor=s.household?.floorBase||s.floor,open=(x,z)=>floor[z]?.[x]==='.'||s.floor[z]?.[x]==='.';
 const buildings=buildingReservations(s),reserved=buildings.flatMap(v=>v.groundRects.map(r=>({...r,pad:.12}))),doors=[...(s.doors||[]),...(s.objects||[]).filter(o=>o.type==='portal')].filter(o=>finitePoint(o.xy)).map(o=>o.xy);
 // Existing work tables, receiver bays and furniture have their own native
 // foundations. Terraces approach those foundations instead of burying them.
 for(const o of s.objects||[]){
  if(o.hidden)continue;
  if(o.footprint&&! [16,18].includes(o.furniture))reserved.push({...o.footprint,pad:.12});
  else if(finitePoint(o.xy)&&(['puzzle','switch','note','project','lore-device','listen','shop','camp','aid','frontier-landmark','frontier-board'].includes(o.type)||o.investigationRole)){
   const r=s.originId?3:2.35;reserved.push({x:o.xy[0]+.5-r,y:o.xy[1]+.5-r,w:r*2,h:r*2,pad:0});
  }
 }
 if(s.originId)for(const site of originStagingPlan(world).worksites||[])reserved.push({x:site.x,y:site.z,w:site.width,h:site.depth,pad:.16});
 // A real device bay remains legible. Natural scenery grows around its region,
 // not between an operator and the exact native control they are using.
 const working=(s.objects||[]).filter(o=>!o.hidden&&finitePoint(o.xy)&&!['patrol','boss','furnishing','secret'].includes(o.type));
 const clearRect=r=>!reserved.some(q=>intersectsGroundRect(r,q,q.pad))&&!doors.some(p=>p[0]+.5>=r.x-1.1&&p[0]+.5<=r.x+r.w+1.1&&p[1]+.5>=r.y-1.1&&p[1]+.5<=r.y+r.h+1.1);
 const expanded={x0:b.x0-32,z0:b.z0-32,x1:b.x1+32,z1:b.z1+32},distance=new Map(),queue=[];
 for(let z=b.z0;z<b.z1;z++)for(let x=b.x0;x<b.x1;x++)if(open(x,z)){distance.set(key(x,z),0);queue.push([x,z]);}
 for(let i=0;i<queue.length;i++){const[x,z]=queue[i],d=distance.get(key(x,z));if(d>=38)continue;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,k=key(xx,zz);if(xx<expanded.x0||zz<expanded.z0||xx>=expanded.x1||zz>=expanded.z1||distance.has(k))continue;distance.set(k,d+1);queue.push([xx,zz]);}}
 const water=coastalStorm||WATER.has(family)&&!indoor,base=coastalStorm?-3:indoor?-.13:-.06,bandHeight=indoor?[0,.12,.35,.73,1.33,2.20]:water?[0,.10,.21,.40,.72,1.12]:family==='sand'?[0,.42,.82,1.40,2.20,3.10]:[0,.50,.95,1.65,2.65,3.40];
 const terrain=[],shore=[],backCut=b.z0+(b.z1-b.z0)*.63;
 const bandFor=d=>d<=1?1:d<=3?2:d<=7?3:d<=15?4:5;
 const validCell=(x,z)=>!open(x,z)&&!(coastalStorm&&x>=b.x0&&x<b.x1&&z>=b.z0&&z<b.z1)&&clearRect({x,y:z,w:1,h:1});
 for(let z=expanded.z0;z<expanded.z1;z++)for(let x=expanded.x0;x<expanded.x1;x++){
  const d=distance.get(key(x,z));if(!(d>0)||!validCell(x,z))continue;
  const band=bandFor(d),near=z>backCut,scale=near?.24:1;
  if(coastalStorm){
   const internal=x>=b.x0&&x<b.x1&&z>=b.z0&&z<b.z1;
   const sea=!internal&&d>=7,height=internal?-.035:sea?-3:d<=2?-.08:d<=4?-.80:-1.60;
   terrain.push({x,z,group:sea?'coastal-sea':'coastal-cliff:'+height,band:sea?0:band,height,water:sea,masonry:internal,coastal:true});continue;
  }
  // Shores remain a real connected water surface, edged by a low land bank.
  if(water&&d>=2&&d<=14){terrain.push({x,z,group:'water',band:0,height:.018,water:true});continue;}
  const masonry=indoor&&x>=b.x0&&x<b.x1&&z>=b.z0&&z<b.z1,h=bandHeight[band]*scale*(indoor?.50:1)+(near&&!water&&!indoor?.18:0),group=[band,near?'near':'far',masonry?'masonry':indoor?'outside-room':'field'].join(':');
  terrain.push({x,z,group,band,height:h,water:false,masonry});
  if(water&&d===1&&shore.length<150)shore.push({x:x+.5,z:z+.5,near});
 }
 const terraces=rectangles(terrain),terrainMap=new Map(terrain.map(t=>[key(t.x,t.z),t])),edgeGroups=new Map(),walls=[];
 for(const cell of terrain){if(cell.water)continue;for(const[dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]]){
  const n=terrainMap.get(key(cell.x+dx,cell.z+dz)),low=n?.height??base;if(cell.height<=low+.025)continue;
  const axis=dx?'z':'x',fixed=dx?cell.x+(dx>0?1:0):cell.z+(dz>0?1:0),start=dx?cell.z:cell.x,k=[axis,fixed,dx,dz,cell.height,low,!!cell.masonry].join(':');
  if(!edgeGroups.has(k))edgeGroups.set(k,{axis,fixed,dx,dz,top:cell.height,low,band:cell.band,masonry:cell.masonry,spans:[]});edgeGroups.get(k).spans.push(start);
 }}
 for(const g of edgeGroups.values()){g.spans.sort((a,c)=>a-c);for(let i=0;i<g.spans.length;){let start=g.spans[i],end=start+1;i++;while(g.spans[i]===end){end++;i++;}walls.push({...g,start,end,spans:undefined});}}
 const waveGroups=new Map(),waves=[];
 if(coastalStorm)for(const cell of terrain){if(!cell.water)continue;const d=distance.get(key(cell.x,cell.z));if(![8,12,18].includes(d))continue;
  for(const[dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]])if((distance.get(key(cell.x+dx,cell.z+dz))??99)<d){const axis=dx?'z':'x',fixed=dx?cell.x+(dx>0?1:0):cell.z+(dz>0?1:0),start=dx?cell.z:cell.x,k=[axis,fixed,d,dx,dz].join(':');if(!waveGroups.has(k))waveGroups.set(k,{axis,fixed,d,dx,dz,spans:[]});waveGroups.get(k).spans.push(start);}
 }
 for(const g of waveGroups.values()){g.spans.sort((a,c)=>a-c);for(let i=0;i<g.spans.length;){let start=g.spans[i],end=start+1;i++;while(g.spans[i]===end){end++;i++;}if(end-start>=2)waves.push({...g,start,end,spans:undefined});}}
 const features=[],featureCandidates=[];
 const closedPatch=(x,z,r)=>{
  const rect={x:x-r,y:z-r,w:r*2,h:r*2};if(!clearRect(rect))return false;
  for(let zz=Math.floor(z-r);zz<=Math.floor(z+r);zz++)for(let xx=Math.floor(x-r);xx<=Math.floor(x+r);xx++)if(!validCell(xx,zz))return false;
  return !working.some(o=>Math.hypot(x-o.xy[0]-.5,z-o.xy[1]-.5)<(s.originId?4.0:2.0)+r);
 };
 const heightAt=(x,z)=>{
  const d=distance.get(key(Math.floor(x),Math.floor(z)))||0,band=bandFor(d);if(water&&d>=2&&d<=14)return .018;
  return bandHeight[band]*(z>backCut?.24:1)*(indoor?.50:1)+(z>backCut&&!water&&!indoor?.18:0);
 };
 function candidate(x,z,kind,authored=false,index=0){
  if(coastalStorm)return false;
  const d=distance.get(key(Math.floor(x),Math.floor(z)))||0,near=z>backCut;
  if(indoor&&x>=b.x0&&x<b.x1&&z>=b.z0&&z<b.z1)return false;
  if(d<3||d>13||near&&d<5||!closedPatch(x,z,1.55))return false;
  if(water&&d<15&&!['mangrove','coral'].includes(family))return false;
  if(features.some(p=>Math.hypot(p.x-x,p.z-z)<3.4))return false;
  const p={x,z,y:heightAt(x,z),near,kind,authored,index,band:d};features.push(p);return true;
 }
 // Authored clusters establish the local vocabulary. Nearby eligible bank
 // positions preserve that arrangement while keeping the original paths open.
 let authoredGroups=0;
 for(const cluster of s.authoredOpening?.clusters||[]){
  if(features.length>=24)break;const candidates=[];
  for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++){const x=Math.floor(cluster.x)+dx+.5,z=Math.floor(cluster.y)+dz+.5,d=Math.hypot(x-cluster.x,z-cluster.y);if(d<=5)candidates.push({x,z,d});}
  candidates.sort((a,c)=>a.d-c.d||a.z-c.z||a.x-c.x);
  for(const p of candidates)if(candidate(p.x,p.z,cluster.kind,true,authoredGroups)){authoredGroups++;break;}
 }
 // One recurrent contour gives continuity; this is a border rhythm, not a draw
 // of unrelated objects from an art catalogue. Far/west banks carry height;
 // the near-camera bank remains an open low foreground.
 for(let z=b.z0-10;z<=b.z1+10;z+=4)for(let x=b.x0-10;x<=b.x1+10;x+=4){
  const d=distance.get(key(x,z))||0;if(d>=3&&d<=10)featureCandidates.push({x:x+.5,z:z+.5,d,near:z>backCut});
 }
 featureCandidates.sort((a,c)=>a.near-c.near||Math.abs(a.d-5)-Math.abs(c.d-5)||a.z-c.z||a.x-c.x);
 for(const p of featureCandidates){if(features.length>=24)break;candidate(p.x,p.z,family,false,features.length);}
 const plan={family,indoor,bounds:b,base,water,coastalStorm,terraces,walls,waves,features,shore,authoredGroups,open,closedPatch};distance.clear();terrainMap.clear();queue.length=0;terrain.length=0;CACHE.set(s,{signature,plan});return plan;
}
function terrace(m,p,c){
 const x=p.x+.001,z=p.z+.001,x1=p.x+p.w-.001,z1=p.z+p.h-.001,y=p.height;
 const top=p.water?c.water:tint(p.masonry?c.masonry:c.top,1+(p.band-3)*.025),mat=p.water?3:p.masonry?6.2:0;
 // Every planned terrace owns a real upward cap. Side walls alone leave
 // vegetation suspended above the underlying continuity plane.
 m.quad([x,y,z],[x,y,z1],[x1,y,z1],[x1,y,z],top,mat,0,1,[0,1,0]);
}
function tree(m,p,c,trunkOnly=false){
 const x=p.x,z=p.z,y=p.y,h=p.near?.72:2.6+(p.index%3)*.32,r=p.near?.56:1.25;
 m.cylinder(x,y+h*.45,z,.13,h*.90,[.24,.25,.17],2,7,.08);
 if(trunkOnly)return;
 for(let i=0;i<2;i++){const a=i*Math.PI+.35,px=x+Math.cos(a)*r*.31,pz=z+Math.sin(a)*r*.31;
  m.tube([x,y+h*.6,z],[px,y+h*.91,pz],.07,.025,[.24,.25,.17],2,5);
  m.sphere(px,y+h*(.88+i*.09),pz,r*.88,tint(c.leaf,.82+i*.09),5,0,8,4,[1,.78,1]);
 }
 if(c.family==='mangrove')for(let i=0;i<3;i++){const a=i*TAU/3;m.tube([x,y+.85,z],[x+Math.cos(a)*.95,y,z+Math.sin(a)*.95],.06,.025,[.28,.31,.20],2,4);}
}
function rock(m,p,c){
 const x=p.x,z=p.z,y=p.y,h=p.near?.25:1.2+(p.index%3)*.22;
 if(['crystal','ice','aurora'].includes(c.family)){
  // A mineral wall grows from one shared ledge rather than isolated needles.
  m.box(x,y+.10,z,2.15,.20,1.45,tint(c.base,.9),7);
  for(let i=0;i<3;i++){const xx=x+(i-1)*.47,zz=z+(i%2)*.25,r=.23+(i%2)*.08,hh=h*(.8+i*.18);m.cylinder(xx,y+hh*.45,zz,r,hh*.9,tint(c.leaf,.82+i*.08),6,5,r*.85);m.cylinder(xx,y+hh,zz,r*.85,hh*.2,tint(c.leaf,1.10),6,5,0);}
 }else if(c.family==='sand'||c.family==='cactus'){
  m.sphere(x,y+.21,z,1.25,tint(c.top,.95),7,0,9,4,[1,.35,.75]);
  if(c.family==='cactus'&&!p.near){m.cylinder(x,y+.95,z,.15,1.8,c.leaf,5,7,.10);for(const side of[-1,1]){m.tube([x,y+.8,z],[x+side*.46,y+.86,z],.09,.07,c.leaf,5,6);m.cylinder(x+side*.46,y+1.15,z,.075,.62,c.leaf,5,6,.055);}}
 }else{
  m.sphere(x,y+h*.36,z,1.2,tint(c.top,.86),7,0,8,4,[1,h*.60,.76]);
  if(!p.near)m.sphere(x-.40,y+h*.72,z-.22,.70,tint(c.top,1.02),7,0,7,4,[1,.65,1]);
 }
}
function fungus(m,p,c){
 const y=p.y;for(let i=0;i<2;i++){const x=p.x+(i-.5)*.65,z=p.z+(i%2)*.35,h=(p.near?.45:1.45)+(i%2)*.50,r=.47+(i%2)*.22;m.cylinder(x,y+h*.5,z,.085,h,[.65,.66,.51],6,7,.065);m.sphere(x,y+h,z,r,tint(c.leaf,.80+i*.06),5,0,7,3,[1,.31,1]);m.cylinder(x,y+h-.015,z,r*.88,.020,[.67,.68,.53],6,7);}
}

export function appendAdventureLandscape(mesh,{world,exteriorSites=[],terrainCraft=true}={}){
 if(!world?.scene)return mesh;const p=adventureLandscapePlan(world),values=MATERIALS[p.family]||MATERIALS.village,c={family:p.family,masonry:rgb('#46545a'),base:rgb(values[0]),top:rgb(values[1]),leaf:rgb(values[2]),water:rgb(p.family==='coral'?'#347574':p.family==='salt'?'#6d918c':'#345d59')},b=p.bounds,extent=64;
 // This buried continuity surface only appears beyond the composed terrain.
 // Its existing elevations/materials remain compatible with the game's mask
 // and backdrop contracts; visible near ground is now the shaped landscape.
 mesh.quad([b.x0-extent,p.base,b.z0-extent],[b.x0-extent,p.base,b.z1+extent],[b.x1+extent,p.base,b.z1+extent],[b.x1+extent,p.base,b.z0-extent],tint(c.base,.9),p.water?3:.25,0,1,[0,1,0]);
 for(const t of p.terraces)terrace(mesh,t,c);
 const edgeCraft=terrainCraft?terrainEdgeCraftPlan542(world,{landscapePlan:p}):{replacedIndices:[]},replacedWalls=new Set(edgeCraft.replacedIndices);
 for(const[index,w]of p.walls.entries()){if(replacedWalls.has(index))continue;const col=tint(w.masonry?c.masonry:c.base,.85+w.band*.025),a=w.start,b=w.end,f=w.fixed,y=w.top,lo=w.low;
  if(w.axis==='x'){if(w.dz<0)mesh.quad([a,lo,f],[a,y,f],[b,y,f],[b,lo,f],col,6.2);else mesh.quad([b,lo,f],[b,y,f],[a,y,f],[a,lo,f],col,6.2);}
  else if(w.dx>0)mesh.quad([f,lo,a],[f,y,a],[f,y,b],[f,lo,b],col,6.2);else mesh.quad([f,lo,b],[f,y,b],[f,y,a],[f,lo,a],col,6.2);
 }
 if(terrainCraft)appendTerrainEdgeCraft542(mesh,{world,landscapePlan:p,colors:c});
 const authoredReplacements=new Set(exteriorHeroFeatures(world.scene,p.features));
 for(const f of p.features){
  if(exteriorSites.some(site=>Math.hypot(site.x-f.x,site.z-f.z)<3.1))continue;
  if(authoredReplacements.has(f)){if(WOODS.has(p.family)&&p.family!=='spore')tree(mesh,f,c,true);continue;}
  if(p.indoor&&f.near)continue;
  if(p.family==='spore')fungus(mesh,f,c);else if(WOODS.has(p.family))tree(mesh,f,c);
  else if(['crystal','ice','aurora'].includes(p.family)){if(f.authored||f.index%4===0)rock(mesh,f,c);}
  else if(['sand','cactus','coral','salt'].includes(p.family))rock(mesh,f,c);
  // Rock country is made by the continuous cliff/terrace bodies above. Loose
  // geospheres around the perimeter read as a floating necklace, not geology.
 }
 return mesh;
}

/** Landscape vegetation is grounded mesh geometry. Keep the optional sprite
 * hook for the host renderer, but omit bitmap terrain cutouts whose padding and
 * depth ordering made them appear detached from distant crests. Actor and pet
 * sprites are owned by their separate native rendering paths. */
export function adventureLandscapeSprites(){return [];}



/** Long white-water contours belong to the sea surface. They are never floating
 * rock billboards or particles above the station, and do not invent a route. */
export function appendAdventureLandscapeDynamics(mesh,glow,{world,time=0,range=44}={}){
 if(!world?.scene||!Number.isFinite(time))return;const p=adventureLandscapePlan(world);if(!p.coastalStorm)return;
 for(const line of p.waves){const mid=(line.start+line.end)/2,x=line.axis==='x'?mid:line.fixed,z=line.axis==='x'?line.fixed:mid;if(Math.hypot(x-world.state.x,z-world.state.y)>range)continue;
  const phase=time*.42+line.d*.21,offset=Math.sin(phase)*.14,width=.025+.012*Math.sin(phase+.8),alpha=.18+.06*Math.sin(phase),fixed=line.fixed+offset*(line.dx||line.dz),y=-2.977;
  if(line.axis==='x')glow.quad([line.start,y,fixed-width],[line.start,y,fixed+width],[line.end,y,fixed+width],[line.end,y,fixed-width],[.43,.66,.69],9,.20,alpha,[0,1,0]);
  else glow.quad([fixed-width,y,line.start],[fixed-width,y,line.end],[fixed+width,y,line.end],[fixed+width,y,line.start],[.43,.66,.69],9,.20,alpha,[0,1,0]);
 }
}
