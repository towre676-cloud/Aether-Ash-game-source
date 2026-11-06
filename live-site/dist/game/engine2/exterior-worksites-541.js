/** Shelter and machinery belong to actual services and controls. These models
 * are read-only scenery; native World/CampaignActuators own every outcome. */
import {isExteriorArtScene} from './exterior-art-selection-541.js?v=5.41';
import {adventureLandscapePlan} from './adventure-landscape.js?v=5.42';
import {buildingReservations,intersectsGroundRect} from './environmental-grounding.js';
import {sceneArtSpec} from './scene-art-materials-541.js?v=5.41';
import {adventurePropFamily} from './adventure-world-props.js?v=5.41';
import {SIDE_CAMPAIGNS} from './frontiers.js?v=5.41';

const TAU=Math.PI*2,CACHE=new WeakMap(),clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const key=(x,z)=>x+','+z;
const point=o=>Array.isArray(o?.xy)&&o.xy.slice(0,2).every(Number.isFinite)?{x:o.xy[0]+.5,z:o.xy[1]+.5}:null;
const identity=o=>[o.type||'portal',o.id||o.householdId||o.physicalId||'',o.xy?.join(','),o.frontierStep??'',o.bit??''].join(':');
const TYPES=new Set(['camp','shop','aid','mentor','project','puzzle','riddle','switch','frontier-landmark','frontier-board','portal','origin-exit','listen']);
const PRI={camp:0,'frontier-landmark':1,shop:2,aid:2,mentor:3,project:3,puzzle:3,riddle:3,switch:3,listen:4,'frontier-board':5,portal:6,'origin-exit':6};
const FWD=[.35/Math.hypot(.35,.78),.78/Math.hypot(.35,.78)],RIGHT=[FWD[1],-FWD[0]];

function bodyKind(world,o){
 if(o.type==='camp')return'shelter';
 if(o.type==='shop')return'market';
 if(o.type==='aid')return'care';
 if(o.type==='frontier-board')return'survey';
 if(o.type==='portal'||o.type==='origin-exit')return'waystation';
 const f=adventurePropFamily(world,o)||'assembly';
 return f==='survey'?'survey':f==='clinic'?'care':f==='market'?'market':f==='camp'||f==='refuge'?'shelter':
  ['valve','vent','lens','winch','garden','windlock','gate'].includes(f)?f:
  ['heater','reactor','pottery'].includes(f)?'vent':['lamp','signal','archive','phrase','bell','instrument'].includes(f)?'lens':'winch';
}
function rootCells(x,z,r){
 const out=[];for(let zz=Math.floor(z-r);zz<=Math.floor(z+r);zz++)for(let xx=Math.floor(x-r);xx<=Math.floor(x+r);xx++){
  const dx=Math.max(xx-x,0,x-xx-1),dz=Math.max(zz-z,0,z-zz-1);if(dx*dx+dz*dz<r*r-1e-8)out.push([xx,zz]);
 }return out;
}
function terrainMap(p){const map=new Map();for(const r of p.terraces||[])for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)map.set(key(x,z),r.height);return map;}
function findBay(scene,anchor,objects,landscape,terrain,used){
 const blocked=new Set((scene.affordanceBlocked||[]).map(p=>key(...p))),walk=(x,z)=>scene.floor[z]?.[x]==='.'&&!blocked.has(key(x,z));
 const parcels=buildingReservations(scene).flatMap(b=>b.groundRects||[]);for(const o of objects)if(o.footprint)parcels.push(o.footprint);
 const occupants=objects.filter(o=>o!==anchor&&point(o)&&o.type!=='furnishing').map(o=>point(o)),a=point(anchor),rows=[];
 if(!a)return null;
 for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++){
  const x=Math.floor(a.x)+dx+.5,z=Math.floor(a.z)+dz+.5,vx=x-a.x,vz=z-a.z,d=Math.hypot(vx,vz);if(d<1.8||d>4.55)continue;
  const forward=vx*FWD[0]+vz*FWD[1],lateral=vx*RIGHT[0]+vz*RIGHT[1];if(forward>.8&&Math.abs(lateral)<2.0)continue;
  for(const radius of[1.02,.82,.62,.36]){
   if(x-radius<.02||z-radius<.02||x+radius>scene.width-.02||z+radius>scene.height-.02)continue;
   const rect={x:x-radius,y:z-radius,w:radius*2,h:radius*2};
   if(parcels.some(p=>intersectsGroundRect(rect,p,.14))||occupants.some(p=>Math.hypot(p.x-x,p.z-z)<radius+.88)||used.some(p=>Math.hypot(p.x-x,p.z-z)<radius+p.radius+.45))continue;
   const cells=rootCells(x,z,radius);if(cells.some(([xx,zz])=>walk(xx,zz)))continue;
   const heights=cells.map(([xx,zz])=>terrain.get(key(xx,zz))??landscape.base);
   if(Math.max(...heights)-Math.min(...heights)>.98)continue;
   rows.push({x,z,y:Math.min(...heights),radius,anchor:anchor,at:a,kind:null,forward,lateral,score:(1.02-radius)*8+Math.abs(d-3.1)+Math.max(0,forward)*2.8-Math.min(2.5,Math.abs(lateral))*.12});break;
  }
 }
 rows.sort((a,b)=>a.score-b.score||a.z-b.z||a.x-b.x);return rows[0]||null;
}
function nativeAnchors(world,objects){
 const scene=world.scene,seen=new Set(),list=[];
 // Machinery remains visible between commissions. Its interaction eligibility
 // and completion flags are still supplied by the native commission system.
 for(const o of [...objects,...(scene.biome?(scene.objects||[]).filter(o=>o.type==='frontier-landmark'):[]),...(scene.doors||[])]){
  const type=o.type||(o.to?'portal':null);if(!TYPES.has(type)||!point(o)||o.hidden||o.revealed===false)continue;
  const object=o.type?o:{...o,type},id=identity(object);if(seen.has(id))continue;seen.add(id);list.push(object);
 }
 const arrival=scene.arrive||[world.state.x-.5,world.state.y-.5];
 list.sort((a,b)=>(PRI[a.type]??8)-(PRI[b.type]??8)||Number(a.frontierStep??0)-Number(b.frontierStep??0)||Math.hypot(a.xy[0]-arrival[0],a.xy[1]-arrival[1])-Math.hypot(b.xy[0]-arrival[0],b.xy[1]-arrival[1])||identity(a).localeCompare(identity(b)));
 return list;
}
export function exteriorWorksitePlan541(world,{objects:provided}={}){
 const scene=world?.scene;if(!isExteriorArtScene(scene))return{active:false,sites:[],owned:[],spec:null};
 const objects=provided??scene.objects??[],landscape=adventureLandscapePlan(world),signature=JSON.stringify([scene.floor,scene.affordanceBlocked,objects.map(o=>[o.type,o.id,o.xy,o.footprint,o.hidden,o.revealed]),scene.objects?.filter(o=>o.type==='frontier-landmark')]);
 const old=CACHE.get(scene);if(old?.signature===signature&&old.landscape===landscape)return old.plan;
 const sites=[],owned=[],terrain=terrainMap(landscape),anchors=nativeAnchors(world,objects),groups=new Set();
 for(const o of anchors){
  const kind=bodyKind(world,o),group=o.type==='frontier-landmark'?kind:kind==='shelter'||kind==='market'||kind==='care'?kind:'machine';
  if(sites.length>=4||groups.has(group)&&!(o.type==='frontier-landmark'&&kind==='survey'))continue;
  const b=findBay(scene,o,objects,landscape,terrain,sites);if(!b)continue;
  b.kind=kind;b.id=identity(o);b.index=sites.length;sites.push(b);owned.push(b.id);groups.add(group);
 }
 terrain.clear();const plan={active:true,sites,owned,spec:sceneArtSpec(world)};CACHE.set(scene,{signature,landscape,plan});return plan;
}
export function ownsExteriorProp541(world,o,{objects}={}){return !!o&&exteriorWorksitePlan541(world,{objects}).owned.includes(identity(o));}

function local(mesh,s){const scale=s.radius/1.05,p=a=>[s.x+a[0]*scale,s.y+a[1],s.z+a[2]*scale];return{
 scale,box:(x,y,z,w,h,d,c,mat=6,em=0,rot=0)=>mesh.box(s.x+x*scale,s.y+y,s.z+z*scale,w*scale,h,d*scale,c,mat,em,rot),
 tube:(a,b,r0,r1,c,mat=6,n=6,em=0)=>mesh.tube(p(a),p(b),r0*scale,r1*scale,c,mat,n,em),
 cylinder:(x,y,z,r,h,c,mat=6,n=8,rt=r,em=0)=>mesh.cylinder(s.x+x*scale,s.y+y,s.z+z*scale,r*scale,h,c,mat,n,rt*scale,em),
 sphere:(x,y,z,r,c,mat=6,em=0,n=7,rows=3,shape=[1,1,1])=>mesh.sphere(s.x+x*scale,s.y+y,s.z+z*scale,r*scale,c,mat,em,n,rows,[shape[0],shape[1]/scale,shape[2]]),
 quad:(a,b,c,d,col,mat=6,em=0,alpha=1,normal=null)=>mesh.quad(p(a),p(b),p(c),p(d),col,mat,em,alpha,normal),
 tri:(a,b,c,col,mat=6,em=0)=>mesh.tri(p(a),p(b),p(c),col,mat,em),
 };}
function disc(g,x,y,z,r,c,mat=6,em=0,n=12){for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;g.tri([x,y,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],c,mat,em);}}
function rim(g,x,y,z,r,c,n=12){for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;g.tube([x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],.035,.035,c,6,4);}}
function footing(g,c){g.cylinder(0,.12,0,.84,.24,tint(c.rock,.82),6.25,10,.79);g.cylinder(0,.27,0,.73,.06,c.edge,6,10,.73);}
function roof(mesh,s,c,small=false){
 const w=small?1.12:1.43,d=small?.79:1.09,y=s.y+2.93,peak=y+.40,cloth=mix(c.accent,c.wall,.30),points=[[-w,y,-d],[-w,y,d],[0,peak,d],[0,peak,-d],[w,y,-d],[w,y,d]].map(([x,Y,z])=>[s.x+x,Y,s.z+z]);
 mesh.quad(points[0],points[1],points[2],points[3],cloth,6);mesh.quad(points[3],points[2],points[5],points[4],tint(cloth,.88),6);
 for(const side of[-1,1])for(const front of[-1,1]){const x=s.x+side*w,z=s.z+front*d;mesh.tube([s.x+side*.58*s.radius/1.05,s.y+2.84,s.z+front*.43*s.radius/1.05],[x,y,z],.025,.025,c.edge,6,4);}
 for(let i=0;i<4;i++){const x0=s.x-w+i*w*.5,x1=x0+w*.5,drop=.14+(i%2)*.035;mesh.quad([x0,y,s.z+d],[x0,y-drop,s.z+d],[x1,y-drop,s.z+d],[x1,y,s.z+d],i%2?cloth:tint(cloth,.82),6);}
 mesh.tube([s.x,peak+.035,s.z-d],[s.x,peak+.035,s.z+d],.045,.045,c.metal,6,5);
}
function shelter(mesh,g,s,c,kind){
 footing(g,c);
 for(const side of[-1,1])for(const z of[-.43,.43])g.box(side*.58,1.46,z,.075,2.92,.075,c.metal,6);
 roof(mesh,s,c,kind==='waystation');
 if(kind==='waystation'){
  for(const side of[-1,1])g.box(side*.54,1.16,-.29,.11,1.83,.11,c.edge,6);
  g.box(0,2.03,-.29,1.20,.11,.12,c.edge,6);disc(g,0,1.60,-.22,.34,c.accent,6);rim(g,0,1.60,-.20,.36,c.metal);
  g.box(0,.62,.28,.97,.18,.43,c.metal,6);
 }else{
  g.box(-.39,.58,-.24,.62,.57,.48,c.metal,6);g.box(-.39,.89,-.24,.66,.08,.51,c.edge,6);
  g.box(.35,.44,-.25,.53,.43,.49,tint(c.wall,.70),2);g.box(.35,.69,-.25,.57,.08,.53,c.edge,6);
  for(const side of[-1,1])g.tube([side*.37,.91,-.23],[side*.37,.91,.13],.11,.11,mix(c.accent,c.wall,.30),6,7);
  g.cylinder(.05,.39,.35,.35,.25,c.rock,6.25,9,.34);g.cylinder(.05,.56,.35,.27,.12,c.metal,6,9,.30);
  if(kind==='care'){g.box(.05,.68,.35,.50,.09,.37,c.wall,6);for(const x of[-.12,.08,.28])g.cylinder(x,.82,.32,.075,.23,c.accent,6,7,.055);}
  if(kind==='market'){g.box(0,1.12,.05,1.37,.12,.60,c.metal,6);for(let i=0;i<3;i++){g.cylinder((i-1)*.36,1.27,.06,.13,.18,c.wall,6,7,.11);g.sphere((i-1)*.36,1.43,.06,.12,c.accent,6,0,6,3,[1,.8,1]);}}
 }
}
function instrument(g,c,kind){
 footing(g,c);g.box(0,.74,0,1.23,.91,.82,c.metal,6);g.box(0,1.23,0,1.36,.11,.91,c.edge,6);
 for(const side of[-1,1])g.box(side*.62,1.74,-.20,.085,1.02,.09,c.edge,6);
 g.box(0,2.28,-.20,1.37,.10,.12,c.metal,6);
 const centerY=kind==='survey'?1.72:1.78;disc(g,0,centerY,.20,.43,mix(c.wall,c.accent,.25),6);rim(g,0,centerY,.23,.45,c.edge);
 for(const side of[-1,1])g.tube([side*.55,1.28,-.06],[side*.55,2.17,-.06],.055,.055,c.metal,6,5);
 g.box(0,1.31,.31,.93,.035,.34,c.wall,6);
 for(let i=0;i<3;i++)g.box((i-1)*.27,1.34,.31,.20,.025,.26,i%2?c.accent:c.edge,6);
 g.tube([-.53,2.31,-.21],[0,2.66,-.21],.035,.035,c.edge,6,5);g.tube([0,2.66,-.21],[.53,2.31,-.21],.035,.035,c.edge,6,5);
}
function machine(g,c,kind){
 footing(g,c);
 for(const side of[-1,1]){g.box(side*.62,1.35,-.13,.13,2.15,.17,c.metal,6);g.box(side*.62,.37,-.13,.29,.16,.29,c.edge,6);}
 g.box(0,2.48,-.13,1.46,.16,.25,c.edge,6);
 if(kind==='vent'){
  g.cylinder(0,1.25,0,.57,1.72,c.metal,6,10,.46);g.cylinder(0,2.20,0,.49,.22,c.edge,6,10,.40);g.cylinder(0,2.56,0,.38,.48,c.rock,6.25,8,.31);
  for(const side of[-1,1])g.tube([side*.42,.70,.11],[side*.64,1.83,.11],.09,.07,c.edge,6,6);
 }else if(kind==='garden'){
  g.box(0,.62,0,1.37,.67,1.03,c.metal,6);g.box(0,.98,0,1.43,.09,1.10,c.edge,6);g.box(0,1.04,0,1.22,.035,.91,c.dark,6);
  for(let i=0;i<4;i++){const x=(i%2?1:-1)*.31,z=(i<2?1:-1)*.22;g.tube([x,1.06,z],[x,1.60,z],.035,.02,c.foliage,6,5);for(const side of[-1,1]){g.quad([x,1.20,z],[x+side*.24,1.49,z+.07],[x+side*.20,1.63,z+.04],[x,1.37,z],c.foliage,6);g.quad([x,1.37,z],[x+side*.20,1.63,z+.04],[x+side*.24,1.49,z+.07],[x,1.20,z],tint(c.foliage,1.15),6);}}
  g.tube([-.61,2.33,-.13],[.61,2.33,-.13],.065,.065,c.edge,6,7);
 }else if(kind==='winch'||kind==='gate'){
  g.tube([-.48,1.22,.05],[.48,1.22,.05],.36,.36,c.metal,6,10);
  for(const side of[-1,1]){g.box(side*.46,1.20,.08,.10,.92,.88,c.edge,6);g.tube([side*.28,.67,.51],[side*.28,2.31,.51],.028,.028,c.edge,6,4);}
  if(kind==='gate'){g.box(0,2.64,-.13,1.56,.21,.40,c.rock,6.25);for(const side of[-1,1])g.box(side*.58,2.79,-.13,.36,.09,.48,c.wall,6);}
 }else if(kind==='windlock'){
  disc(g,0,1.48,.03,.58,c.dark,6);rim(g,0,1.48,.08,.60,c.edge);
  for(const side of[-1,1])for(let i=0;i<4;i++)g.cylinder(side*.48,.56+i*.18,-.24,.16,.075,c.wall,6,8,.145);
 }else{
  g.cylinder(0,1.20,0,.53,1.50,c.metal,6,10,.46);
  for(const side of[-1,1])g.tube([side*.54,.60,-.20],[side*.54,2.20,-.20],.075,.075,c.edge,6,7);
  disc(g,0,1.50,.585,.40,c.dark,6);rim(g,0,1.50,.610,.43,c.edge);
  if(kind==='lens'){for(let i=0;i<6;i++){const a=i*TAU/6,b=(i+1)*TAU/6;g.tri([0,1.5,.617],[Math.cos(a)*.34,1.5+Math.sin(a)*.34,.617],[Math.cos(b)*.34,1.5+Math.sin(b)*.34,.617],i%2?c.wall:c.accent,6);}}
 }
}
function feed(mesh,world,s,c,active=false){
 const dx=s.at.x-s.x,dz=s.at.z-s.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)*3)),r=.065;
 for(let i=0;i<n;i++){const t=(i+.15)/n,u=(i+.85)/n,a={x:s.x+dx*t,z:s.z+dz*t},b={x:s.x+dx*u,z:s.z+dz*u};
  if(!world.walkable?.(a.x,a.z)||!world.walkable?.(b.x,b.z))continue;
  const len=Math.hypot(b.x-a.x,b.z-a.z)||1,ox=-(b.z-a.z)/len*r,oz=(b.x-a.x)/len*r;
  mesh.quad([a.x+ox,.035,a.z+oz],[a.x-ox,.035,a.z-oz],[b.x-ox,.035,b.z-oz],[b.x+ox,.035,b.z+oz],active?c.accent:tint(c.metal,.72),6,0,active?.70:.55,[0,1,0]);
 }
}
export function appendExteriorWorksites(mesh,{world,objects}={}){
 const p=exteriorWorksitePlan541(world,{objects});if(!p.active)return p;const start=mesh.v.length,c=p.spec.palette,ranges=[];
 for(const s of p.sites){const first=mesh.v.length/12,g=local(mesh,s);if(['shelter','market','care','waystation'].includes(s.kind))shelter(mesh,g,s,c,s.kind);else if(s.kind==='survey')instrument(g,c,s.kind);else machine(g,c,s.kind);feed(mesh,world,s,c);ranges.push({id:s.id,kind:s.kind,start:first,end:mesh.v.length/12});}
 const stats={sites:p.sites.length,kinds:p.sites.map(s=>s.kind),owned:p.owned.slice(),ranges,triangles:(mesh.v.length-start)/36};mesh.exteriorWorksites541=stats;return{...p,stats};
}
function siteProgress(world,s,feedback){
 const pending=feedback?.pending,object=pending?.object,match=object&&(identity(object)===s.id||object.native&&identity(object.native)===s.id||point(object)&&Math.hypot(point(object).x-s.at.x,point(object).z-s.at.z)<.1);
 if(match)return clamp(pending.progress);
 if(s.anchor.type==='frontier-landmark'){
  const f=world.state.frontiers||{},commissions=SIDE_CAMPAIGNS.filter(c=>2000+c.regionIndex*5+c.area===world.scene.location),active=commissions.find(c=>c.id===f.active),stage=active?Number(f.stages?.[active.id])||0:commissions.reduce((n,c)=>Math.max(n,Number(f.stages?.[c.id])||0),0);
  return stage>s.anchor.frontierStep?1:0;
 }
 try{return world.done?.(s.anchor)?1:0;}catch{return 0;}
}
function moving(g,c,s,q,time){
 if(['shelter','market','care','waystation'].includes(s.kind)){
  if(s.kind==='shelter')for(let i=0;i<3;i++){const a=i*TAU/3+.2,h=.35+.055*Math.sin(time*3+i);g.tri([.05,.63,.35],[.05+Math.cos(a)*.20,.65,.35+Math.sin(a)*.20],[.05,.65+h,.35],mix(c.accent,[.98,.58,.23],.72),4,.25);}
  return;
 }
 if(s.kind==='survey'||s.kind==='lens'){
  const y=s.kind==='survey'?1.72:1.5,z=s.kind==='survey'?.25:.64,angle=-1.0+q*1.7;g.tube([0,y,z],[Math.sin(angle)*.32,y+Math.cos(angle)*.32,z],.035,.035,c.edge,6,5);disc(g,0,y,z+.015,q?.23:.17,q?c.accent:c.wall,4,q?.15:0,8);
 }else if(s.kind==='vent'){
  for(let i=0;i<3;i++){const y=.76+i*.34,open=.06+q*.15;g.box(0,y,.59,.67,.18,.06,c.dark,6);g.box(0,y+open,.64,.69,.075,.065,c.edge,6);g.box(0,y,.641,.48,.10,.02,mix(c.accent,[.95,.36,.13],.58),4,q?.19:.035);}
 }else if(s.kind==='garden'){
  g.box(0,2.20+q*.18,-.13,1.10,.09,.10,c.metal,6);for(const side of[-1,1])g.cylinder(side*.48,2.44,-.13,.105,.11,q?c.accent:c.wall,6,7,.08);
 }else if(s.kind==='winch'||s.kind==='gate'){
  for(const side of[-1,1])g.box(side*.28,.83+q*.75,.51,.30,.37,.23,c.edge,6);
  for(let i=0;i<4;i++){const a=i*TAU/4+q*1.6;g.tube([.51,1.22,.05],[.51,1.22+Math.cos(a)*.32,.05+Math.sin(a)*.32],.025,.025,c.wall,6,4);}
 }else if(s.kind==='windlock'){
  for(let i=0;i<4;i++){const a=i*TAU/4+q*.80,b=a+.44,r=.50;g.tri([0,1.48,.10],[Math.cos(a)*r,1.48+Math.sin(a)*r,.10],[Math.cos(b)*r*.68,1.48+Math.sin(b)*r*.68,.12],q?c.accent:c.wall,6);}
 }else{
  const angle=q*2.1;rim(g,0,1.5,.63,.32,c.edge,10);for(let i=0;i<3;i++){const a=i*TAU/3+angle;g.tube([0,1.5,.65],[Math.cos(a)*.30,1.5+Math.sin(a)*.30,.65],.026,.026,c.wall,6,4);}
 }
}
export function appendExteriorWorksiteDynamics(mesh,glow,{world,objects,time=0,feedback=null}={}){
 const p=exteriorWorksitePlan541(world,{objects});if(!p.active)return null;const start=mesh.v.length,c=p.spec.palette;
 for(const s of p.sites){const q=siteProgress(world,s,feedback);moving(local(mesh,s),c,s,q,time);}
 return{sites:p.sites.length,triangles:(mesh.v.length-start)/36};
}
