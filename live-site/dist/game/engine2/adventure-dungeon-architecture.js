/** Chapter architecture for the ordinary campaign and its hidden rooms.
 * Every upright fixture is confined to authored closed space. Flush service
 * routes follow real floor cells; none of this code changes World or collision.
 */
import {isInteriorScene} from './scene-identity.js?v=4.0.0';
import {investigationView} from './exploration-investigations.js?v=5.31.0';

const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const tint=(c,n)=>c.map(v=>clamp(v*n));
const MOTIFS=[null,
 ['relay','Voice-glass works','#526773','#ad9763','#6cbbba'],
 ['rail','Dawn carriage ironwork','#5b686e','#ad8952','#d4bb7c'],
 ['sluice','Undercity waterworks','#466a71','#8b997d','#64b4b9'],
 ['chapel','Rain chapel stonework','#737c88','#b4a06d','#95c5ca'],
 ['archive','The archive of names','#666278','#b9a27a','#b4b0c8'],
 ['mooring','Sky engine moorings','#5d7480','#b8a16c','#83babe'],
 ['roots','Orchard rootworks','#56684d','#9c8661','#80b478'],
 ['reactor','Reactor cooling galleries','#475e68','#b79b64','#79c6ba'],
 ['shelter','Lowbank ward stones','#657b79','#bba67f','#a2c5b0'],
 ['rail','Prison train manifest depot','#58646b','#af8d59','#d0b478'],
 ['sluice','River spillway chambers','#456b75','#a5a68b','#7ec5c0'],
 ['archive','The name vault','#626778','#b5a37e','#b4c2d2'],
 ['timber','The unfinished house','#77634d','#bd9d6e','#b4c9a0'],
 ['glass','Glass echo chambers','#526a78','#b0ab83','#91c7d8'],
 ['gate','Refuge gate chambers','#637075','#baa477','#aecbb5'],
 ['resonance','Mountain resonance galleries','#686c80','#b5a87f','#b4b2db'],
 ['observatory','The lower observatory','#4e6179','#b5a379','#8cb8d4'],
 ['heat','Warm room relief works','#71645a','#ba9363','#e8b276'],
 ['wind','Storm anchorage works','#4a6474','#ac986c','#95c1cb'],
 ['witness','Witness vault chambers','#696378','#bba57c','#bdafd0'],
 ['clay','The clay working floors','#8c6e5b','#c1a27d','#d5b195'],
 ['vent','Choir breath channels','#536c73','#ab9d79','#9fc6b4'],
 ['assembly','The common assembly','#746b58','#bca87c','#b9c7a1'],
 ['listening','The answering chamber','#62677d','#b9a77b','#aac7db']
];
const QUIET_KEYS=new Set(['town','home','inn','market','guild','clinic','carpenter','hub','forest','grove','river','bridge','field','catwalk','summit','refugee_gate','storm_anchorage','bypass']);
const PLANS=new WeakMap();
const DRAINAGE_ROUTES=new WeakMap();
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);

/** Explicit scope: native dungeon interiors and all 24 authored secret rooms. */
export function dungeonArchitectureSpec(world){
 const scene=world?.scene;if(!scene||scene.originId||scene.biome||!(scene.chapter>=1&&scene.chapter<=24))return null;
 const secret=/^secret_\d+$/.test(scene.key||'');
 if(!secret&&(QUIET_KEYS.has(scene.key)||!isInteriorScene(scene)))return null;
 const [family,title,stone,trim,light]=MOTIFS[scene.chapter];
 return {family,title,chapter:scene.chapter,secret,stone:rgb(stone),trim:rgb(trim),light:rgb(light),dark:rgb('#26343b'),wood:rgb('#6e533d'),metal:rgb('#384c58')};
}
function nativeControls(world){
 let objects=[];try{objects=world.objects();}catch{objects=world.scene.objects||[];}
 return objects.filter(o=>Array.isArray(o.xy)&&!o.hidden&&!o.originId&&(['puzzle','switch','note','project','lore-device'].includes(o.type)||o.investigationRole));
}
const keyFor=o=>[o.type,...(o.xy||[]),o.id??o.bit??o.sequence_address??'',o.note??''].join(':');
function walk(world,x,z){return world.scene.floor[z]?.[x]==='.'&&!(world.scene.affordanceBlocked||[]).some(p=>p[0]===x&&p[1]===z);}
function shortestRoute(world,start,end){
 const scene=world.scene,w=scene.width,h=scene.height,queue=[],seen=new Set(),previous=new Map();
 const [sx,sz]=start,[ex,ez]=end;if(!walk(world,sx,sz)||!walk(world,ex,ez))return[];
 queue.push([sx,sz]);seen.add(sx+','+sz);let found=false;
 for(let i=0;i<queue.length&&i<Math.min(w*h,16000);i++){
  const [x,z]=queue[i],key=x+','+z;if(x===ex&&z===ez){found=true;break;}
  for(const[dx,dz]of[[0,-1],[-1,0],[1,0],[0,1]]){const nx=x+dx,nz=z+dz,k=nx+','+nz;if(nx<0||nz<0||nx>=w||nz>=h||seen.has(k)||!walk(world,nx,nz))continue;seen.add(k);previous.set(k,key);queue.push([nx,nz]);}
 }
 if(!found)return[];const out=[];let key=ex+','+ez;while(key){out.push(key.split(',').map(Number));if(key===sx+','+sz)break;key=previous.get(key);}return out.reverse();
}
function plan(world){
 const scene=world.scene,spec=dungeonArchitectureSpec(world);if(!spec)return {spec:null,fixtures:[],routes:[],controls:[],investigations:[],latches:[]};
 const floor=scene.household?.floorBase||scene.floor,partitions=new Set((scene.household?.partitions||[]).map(p=>p.x+','+p.y));
 const open=(x,z)=>floor[z]?.[x]==='.'&&!partitions.has(x+','+z),controls=nativeControls(world),candidates=[];
 const doorPoints=[...(scene.doors||[]),...(scene.objects||[]).filter(o=>o.type==='portal')].filter(o=>o.xy).map(o=>o.xy);
 for(let z=0;z<scene.height;z++)for(let x=0;x<scene.width;x++){
  if(open(x,z)||(scene.objects||[]).some(o=>o.footprint&&x>=o.footprint.x&&x<o.footprint.x+o.footprint.w&&z>=o.footprint.y&&z<o.footprint.y+o.footprint.h))continue;
  if(doorPoints.some(p=>Math.hypot(p[0]-x,p[1]-z)<1.35))continue;
  const front=open(x,z+1)&&walk(world,x,z+1)?[0,1]:open(x+1,z)&&walk(world,x+1,z)?[1,0]:null;if(!front)continue;
  candidates.push({x:x+.5,z:z+.5,front,cell:[x,z],floor:[x+front[0],z+front[1]],nearest:controls.reduce((n,o)=>Math.min(n,Math.hypot(o.xy[0]-x,o.xy[1]-z)),Infinity)});
 }
 // Begin beside the scene's machinery, then spread along the actual rooms.
 candidates.sort((a,b)=>a.nearest-b.nearest||a.z-b.z||a.x-b.x);
 const investigations=[];
 for(const o of controls.filter(o=>o.investigationRole)){
  const start=walk(world,...o.xy)?o.xy:[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dz])=>[o.xy[0]+dx,o.xy[1]+dz]).find(q=>walk(world,...q));if(!start)continue;
  const ordered=candidates.filter(c=>!investigations.some(v=>v.x===c.x&&v.z===c.z)&&Math.hypot(c.x-o.xy[0]-.5,c.z-o.xy[1]-.5)<5).sort((a,b)=>Math.hypot(a.x-o.xy[0]-.5,a.z-o.xy[1]-.5)-Math.hypot(b.x-o.xy[0]-.5,b.z-o.xy[1]-.5));
  for(const c of ordered){const wire=shortestRoute(world,start,c.floor);if(!wire.length||wire.length>96)continue;investigations.push({...c,object:o,role:o.investigationRole,wire});break;}
 }
 const latches=[];
 if(spec.secret&&!investigations.length){const o=(world.scene.objects||[]).find(o=>o.type==='riddle'&&o.exploreId==='district:'+scene.chapter+':latch');if(o){const c=[...candidates].sort((a,b)=>Math.hypot(a.x-o.xy[0]-.5,a.z-o.xy[1]-.5)-Math.hypot(b.x-o.xy[0]-.5,b.z-o.xy[1]-.5))[0];if(c&&Math.hypot(c.x-o.xy[0]-.5,c.z-o.xy[1]-.5)<5)latches.push({...c,object:o,role:'latch'});}}
 const fixtures=[];for(const c of candidates){if(fixtures.length>=10)break;if([...investigations,...latches].some(v=>Math.hypot(v.x-c.x,v.z-c.z)<1.1))continue;if(fixtures.every(v=>Math.hypot(v.x-c.x,v.z-c.z)>3.1))fixtures.push({...c,index:fixtures.length});}
 const routes=[],used=new Set();
 for(const o of controls.slice(0,8)){
  const xy=o.xy,start=walk(world,...xy)?xy:[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dz])=>[xy[0]+dx,xy[1]+dz]).find(p=>walk(world,...p));if(!start)continue;
  const ordered=fixtures.map(f=>({f,d:Math.hypot(f.x-xy[0]-.5,f.z-xy[1]-.5)})).sort((a,b)=>a.d-b.d);
  for(const {f} of ordered.slice(0,8)){
   const points=shortestRoute(world,start,f.floor);if(!points.length||points.length>96)continue;
   const id=keyFor(o);if(used.has(id))break;used.add(id);f.controlKey??=id;routes.push({id,object:o,fixture:f.index,points});break;
  }
 }
 return {spec,fixtures,routes,controls,investigations,latches};
}
/** Read-only placement data lets coverage checks enforce the real collision map. */
export function dungeonArchitecturePlan(world){return plan(world);}
export function dungeonInvestigationStation(world,object){if(!object?.investigationRole||!world?.scene)return null;const p=PLANS.get(world.scene)||plan(world);return p.investigations?.find(s=>s.object.exploreId===object.exploreId&&s.role===object.investigationRole)||null;}
function local(mesh,f){
 const [fx,fz]=f.front,rx=fz,rz=-fx,angle=Math.atan2(-rz,rx),p=(x,y,z)=>[f.x+x*rx+z*fx,y,f.z+x*rz+z*fz];
 return {
  box:(x,y,z,w,h,d,c,mat=6,em=0,rot=0)=>mesh.box(...p(x,y,z),w,h,d,c,mat,em,angle+rot),
  tube:(a,b,r0,r1,c,mat=1,n=6,em=0)=>mesh.tube(p(...a),p(...b),r0,r1,c,mat,n,em),
  cylinder:(x,y,z,r,h,c,mat=1,n=8,rt=r,em=0)=>mesh.cylinder(...p(x,y,z),r,h,c,mat,n,rt,em),
  sphere:(x,y,z,r,c,mat=6,em=0,n=7,rows=4,scale)=>mesh.sphere(...p(x,y,z),r,c,mat,em,n,rows,scale),
  quad:(a,b,c,d,col,mat=6,em=0,alpha=1)=>mesh.quad(p(...a),p(...b),p(...c),p(...d),col,mat,em,alpha)
 };
}
function wallFrame(g,c){
 g.box(0,1.10,-.11,.78,2.20,.30,tint(c.stone,.68));
 for(const side of[-1,1]){g.box(side*.34,1.15,.10,.12,2.30,.16,c.stone);g.box(side*.34,.17,.10,.18,.20,.24,c.trim,1);}
 g.box(0,2.30,.10,.84,.13,.20,c.trim,1);g.box(0,.25,.13,.72,.10,.25,c.trim,1);
}
function staticFixture(g,c,f){
 const family=c.family;wallFrame(g,c);
 if(['relay','reactor','mooring'].includes(family)){
  for(const x of[-.19,.19]){g.tube([x,.43,.16],[x,1.87,.16],.067,.067,c.metal,1);for(const y of[.67,1.20,1.73])g.cylinder(x,y,.16,.10,.045,c.trim,1,6);}
  g.box(0,1.98,.19,.56,.13,.17,c.metal,1);return;
 }
 if(['sluice','vent','heat'].includes(family)){
  g.box(0,1.22,.18,.54,1.48,.14,c.dark);for(let i=0;i<6;i++)g.box(0,.57+i*.24,.28,.61,.065,.065,c.metal,1);
  for(const x of[-.26,.26])g.tube([x,.35,.32],[x,2.10,.32],.038,.038,c.trim,1,5);return;
 }
 if(['chapel','resonance','listening'].includes(family)){
  for(let i=0;i<5;i++){const x=(i-2)*.12,h=1.00+Math.cos((i-2)*.62)*.55;g.tube([x,.51,.17],[x,.51+h,.17],.045,.045,c.trim,1,7);g.cylinder(x,.51+h,.17,.065,.06,c.trim,1,7);}
  g.box(0,.50,.17,.66,.12,.22,c.stone);g.box(0,2.03,.17,.22,.13,.22,c.trim,1);return;
 }
 if(['archive','witness'].includes(family)){
  for(const y of[.44,.91,1.38,1.85]){g.box(0,y,.14,.61,.07,.29,c.trim,1);for(let i=0;i<4;i++)g.box(-.23+i*.15,y+.19,.13,.11,.31,.22,tint(i%2?c.stone:c.trim,.82+i*.035));}
  if(family==='witness')g.box(0,2.05,.28,.22,.17,.025,c.light,6);return;
 }
 if(['glass','observatory'].includes(family)){
  g.box(0,1.21,.16,.53,1.44,.09,c.dark);
  const diamond=[[0,1.99,.23],[-.27,1.21,.27],[0,.45,.23],[.27,1.21,.27]];g.quad(...diamond,tint(c.light,.72),6,.07);g.quad(diamond[3],diamond[2],diamond[1],diamond[0],tint(c.light,.72),6,.07);
  for(let i=0;i<4;i++)g.tube(diamond[i],diamond[(i+1)%4],.026,.026,c.trim,1,5);
  return;
 }
 if(['roots','timber','assembly','shelter'].includes(family)){
  for(const side of[-1,1])g.tube([side*.28,.39,.12],[side*.16,2.10,.16],.065,.042,c.wood,2,6);
  for(const y of[.65,1.25,1.85])g.box(0,y,.18,.62,.10,.14,c.wood,2);
  if(family==='roots'){for(const side of[-1,1]){g.tube([0,.49,.23],[side*.27,1.18,.23],.08,.025,c.wood,2,6);g.sphere(side*.19,1.33,.23,.12,c.light,5,0,6,4,[.7,1.2,.5]);}}
  else if(family==='shelter')g.box(0,1.26,.22,.48,1.06,.035,tint(c.light,.75));
  else for(let i=0;i<3;i++)g.box(-.20+i*.20,1.20,.25,.12,.54,.08,c.stone);
  return;
 }
 if(family==='clay'){
  g.box(0,1.06,.06,.60,1.50,.46,tint(c.stone,.78));g.box(0,.97,.31,.41,.78,.025,c.dark);g.box(0,1.48,.23,.59,.12,.18,c.trim,6);
  for(const y of[.57,.79,1.01])g.box(0,y,.34,.43,.045,.05,c.metal,1);g.cylinder(0,1.74,.08,.16,.32,c.stone,6,8,.11);return;
 }
 if(family==='wind'){
  for(const y of[.55,1.91])g.box(0,y,.18,.62,.09,.22,c.trim,1);
  for(const x of[-.29,.29])g.box(x,1.23,.18,.065,1.45,.14,c.metal,1);g.cylinder(0,1.23,.12,.23,.16,c.metal,1,10);return;
 }
 // Train ribs and open gate ironwork remain inside the blocked tile.
 for(let i=0;i<4;i++)g.box(-.25+i*.17,1.18,.15,.046,1.74,.08,c.metal,1);
 for(const y of[.56,1.82])g.box(0,y,.22,.64,.08,.11,c.trim,1);
}
function floorQuad(m,a,b,width,c,mat=1,em=0,y=.034){
 const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(!len)return;
 const ox=-dz/len*width/2,oz=dx/len*width/2;
 m.quad([a[0]+.5-ox,y,a[1]+.5-oz],[a[0]+.5+ox,y,a[1]+.5+oz],[b[0]+.5+ox,y,b[1]+.5+oz],[b[0]+.5-ox,y,b[1]+.5-oz],c,mat,em,1,[0,1,0]);
}
export function appendDungeonArchitecture(mesh,{world}={}){
 if(!world?.scene)return null;const p=plan(world);PLANS.set(world.scene,p);if(!p.spec)return p;
 for(const f of p.fixtures)staticFixture(local(mesh,f),p.spec,f);
 for(const station of p.investigations){investigationArchitecture(local(mesh,station),p.spec,station);investigationRemote(mesh,p.spec,station,world,false);for(let i=1;i<station.wire.length;i++)floorQuad(mesh,station.wire[i-1],station.wire[i],.023,tint(p.spec.trim,.60),1);if(station.wire.length)floorQuad(mesh,station.wire.at(-1),station.cell,.023,tint(p.spec.trim,.60),1);}
 for(const latch of p.latches)latchArchitecture(local(mesh,latch),p.spec);
 for(const r of p.routes)for(let i=1;i<r.points.length;i++){
  floorQuad(mesh,r.points[i-1],r.points[i],.14,tint(p.spec.dark,.9),6);
  floorQuad(mesh,r.points[i-1],r.points[i],.035,tint(p.spec.trim,.72),1,0,.035);
 }
 return p;
}
function nativeState(world,o,feedback){
 let done=false;try{done=o.type==='note'?Number.isInteger(o.completes_bit)&&!!world.bit?.(world.flagFor(o),o.completes_bit):!!world.done?.(o);}catch{}
 const stage=Array.isArray(o.stage_flag)&&!!world.bit?.(...o.stage_flag),seq=o.type==='note'?Number(world.state.flags?.['sequence:'+o.sequence_address])||0:0;
 const pending=feedback?.pending?.object,preview=pending&&keyFor(pending)===keyFor(o)?clamp(feedback.pending.progress):0;
 const phase=done?1:stage?.5:o.type==='note'?clamp(seq/Math.max(1,o.pattern?.length||1)):0;
 return {done,value:Math.max(phase,preview),preview,sequence:seq};
}
function dynamicFixture(g,c,value,time,family){
 const col=value>.01?c.light:tint(c.light,.28);
 if(['sluice','vent','heat','clay'].includes(family)){
  // Actual control progress opens the architectural louvres and flow chamber.
  for(let i=0;i<4;i++){const y=.66+i*.31;g.box(0,y+value*.10,.30,.43,.21*(1-value*.72),.035,c.stone,6);}
  g.box(0,.61+value*.52,.25,.39,.07+value*.78,.02,col,6,value*.13);
  if(value>.05)for(let i=0;i<3;i++)g.box(-.13+i*.13,.62+((time*.45+i*.22)%1)*.82,.28,.025,.09,.012,col,6,.09);
  return;
 }
 if(['relay','reactor','mooring'].includes(family)){
  for(const x of[-.19,.19])g.box(x,.58+value*.56,.24,.07,.14+value*1.13,.035,col,6,value*.16);
  g.tube([-.21,1.94,.27],[.21,1.94-value*.29,.27],.024,.024,c.trim,1,5);return;
 }
 if(['archive','witness','timber','assembly','shelter'].includes(family)){
  for(let i=0;i<3;i++)g.box(-.20+i*.20,1.30,.31,.12,.12,.025,i/3<value?c.light:c.dark,6,value*.09);
  if(family==='archive'||family==='witness')g.box(0,2.04,.29,.31,.045+value*.12,.025,col,6,value*.11);return;
 }
 if(['chapel','resonance','listening'].includes(family)){
  for(let i=0;i<5;i++){const y=.48+value*.07,x=(i-2)*.12;g.box(x,y,.28,.07,.08,.025,i/5<value?c.light:c.dark,6,value*.09);}
  if(value>.01)g.box(0,2.03,.29,.13,.065+value*.065,.02,col,6,value*.15);return;
 }
 if(['glass','observatory'].includes(family)){
  const angle=value*Math.PI*.65;g.tube([0,1.21,.34],[Math.cos(angle)*.21,1.21+Math.sin(angle)*.56,.34],.018,.018,c.trim,1,5);
  g.box(0,.48+value*1.35,.34,.11,.055,.018,col,6,value*.2);return;
 }
 if(family==='roots'){
  for(const side of[-1,1])g.sphere(side*.19,1.39+value*.12,.25,.08+value*.035,col,5,0,6,4,[1,1.3,.5]);return;
 }
 if(family==='wind'){
  const angle=value>.98?time*1.2:value*TAU;for(let i=0;i<3;i++){const a=angle+i*TAU/3;g.tube([0,1.23,.29],[Math.cos(a)*.25,1.23+Math.sin(a)*.25,.29],.035,.016,c.trim,1,5);}g.sphere(0,1.23,.31,.07,col,1,.04,6,4);return;
 }
 // Sliding rail / gate shutter, never across a traversable opening.
 for(let i=0;i<3;i++)g.box(-.21+i*.21,.72+value*.74,.28,.07,.93,.04,c.trim,1);
 g.box(0,1.98,.28,.22,.08,.025,col,6,value*.1);
}
export function appendDungeonDynamics(mesh,glow,{world,time=0,feedback=null,range=24}={}){
 if(!world?.scene)return;const p=PLANS.get(world.scene)||plan(world);if(!p.spec)return;
 appendInvestigationDrainage(mesh,glow,world,p,time,range);
 const controls=new Map(nativeControls(world).map(o=>[keyFor(o),o])),states=new Map();
 for(const r of p.routes){const o=controls.get(r.id)||r.object;states.set(r.id,nativeState(world,o,feedback));}
 const lead={x:world.state.x,z:world.state.y};
 for(const station of p.investigations){if(Math.hypot(station.x-lead.x,station.z-lead.z)>range)continue;const progress=feedback?.pending?.object?.exploreId===station.object.exploreId?clamp(feedback.pending.progress):0;investigationDynamics(local(mesh,station),p.spec,station,world,time,progress);investigationRemote(mesh,p.spec,station,world,true,progress);}
 for(const latch of p.latches){if(Math.hypot(latch.x-lead.x,latch.z-lead.z)>range)continue;latchDynamics(local(mesh,latch),p.spec,world);}
 for(const f of p.fixtures){if(Math.hypot(f.x-lead.x,f.z-lead.z)>range)continue;const state=states.get(f.controlKey)||{value:0};dynamicFixture(local(mesh,f),p.spec,state.value,time,p.spec.family);}
 for(const r of p.routes){
  const state=states.get(r.id);if(!state?.value)continue;
  const limit=Math.max(1,Math.floor((r.points.length-1)*state.value));
  for(let i=1;i<=Math.min(limit,r.points.length-1);i++){const a=r.points[i-1],b=r.points[i];if(Math.hypot(a[0]+.5-lead.x,a[1]+.5-lead.z)>range)continue;floorQuad(mesh,a,b,.033,tint(p.spec.light,.70),6,.07,.037);}
 }
}

/** The pump room already owns an inlet, relief and drain in its saved
 * investigation. This shallow inspection channel only makes that sequence
 * visible on their existing connected service floor; it is never a new route. */
export function dungeonDrainageView(world,p=PLANS.get(world?.scene)){
 if(!world?.scene||world.scene.chapter!==3||!p?.spec||!p.investigations?.length)return null;
 let path=DRAINAGE_ROUTES.get(p);
 if(!path){
  const work=p.investigations.find(s=>s.role==='work'),control=p.investigations.find(s=>s.role==='control');
  if(!work?.wire?.length)return null;
  const same=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
  const linked=control?.wire?.length&&same(control.wire.at(-1),work.wire[0]);
  const points=(linked?[...control.wire,...work.wire.slice(1)]:work.wire).slice(-5);
  path={segments:points.slice(1).map((to,i)=>({from:points[i].slice(),to:to.slice()})),grate:work.wire.at(-1).slice()};
  DRAINAGE_ROUTES.set(p,path);
 }
 // A floor edit can precede the next static rebuild. Fail closed for that
 // small segment set rather than drawing water through a newly closed tile.
 const segments=path.segments.filter(s=>walk(world,...s.from)&&walk(world,...s.to));
 if(!segments.length)return null;
 const state=investigationView(world.state,3)||{},drained=!!state.drained||!!world.state.exploration?.solved?.includes('district:3:latch');
 const phase=drained?'drained':state.isolated?(state.vented?'vented':'isolated'):'flowing';
 const width=phase==='drained'?0:phase==='vented'?.13:.38;
 return {phase,segments,grate:walk(world,...path.grate)?path.grate.slice():null,width,flow:phase==='flowing'?1:phase==='vented'?.32:0,level:phase==='vented'?.043:.048};
}
function appendInvestigationDrainage(mesh,glow,world,p,time,range){
 const view=dungeonDrainageView(world,p);if(!view)return;
 const t=Number.isFinite(time)?time:0,c=p.spec,dry=view.phase==='drained',bed=dry?[.40,.37,.30]:[.20,.24,.23];
 for(const {from:a,to:b}of view.segments){
  if(Math.min(Math.hypot(a[0]+.5-world.state.x,a[1]+.5-world.state.y),Math.hypot(b[0]+.5-world.state.x,b[1]+.5-world.state.y))>range)continue;
  floorQuad(mesh,a,b,.48,tint(c.metal,.65),6,0,.038);
  floorQuad(mesh,a,b,.42,bed,6,0,.040);
  if(view.width){
   floorQuad(mesh,a,b,view.width,view.phase==='isolated'?[.12,.29,.30]:[.10,.28,.30],view.phase==='isolated'?6:3,0,view.level);
   if(view.flow){
    const at=(t*(view.phase==='vented'?.38:.80)+.17)%1,dx=b[0]-a[0],dz=b[1]-a[1],x=a[0]+.5+dx*at,z=a[1]+.5+dz*at,r=view.width*.23;
    glow.quad([x-dz*r,view.level+.001,z+dx*r],[x+dz*r,view.level+.001,z-dx*r],[x+dz*r+dx*.055,view.level+.001,z-dx*r+dz*.055],[x-dz*r+dx*.055,view.level+.001,z+dx*r+dz*.055],tint(c.light,.62),9,0,.27,[0,1,0]);
   }
  }
 }
 if(view.grate&&Math.hypot(view.grate[0]+.5-world.state.x,view.grate[1]+.5-world.state.y)<=range){
  const [gx,gz]=view.grate,x=gx+.5,z=gz+.5;
  // Stone ledge, drain opening and cleared silt are all below five centimetres.
  mesh.box(x,.041,z,.40,.008,.40,dry?tint(c.stone,1.18):bed,6);
  mesh.box(x,.046,z,.28,.004,.25,c.dark,6);
  for(let i=0;i<5;i++)mesh.box(x-.12+i*.06,.049,z,.024,.002,.29,dry?c.trim:c.metal,1);
  for(let i=0;i<3;i++)mesh.disc(x+.19,.045,z-.12+i*.12,.035,.055,dry?[.31,.27,.20]:[.16,.20,.18],6);
 }
}

function investigationArchitecture(g,c,station){
 const chapter=c.chapter,role=station.role;
 g.box(0,.20,.03,.78,.24,.70,c.stone);g.box(0,.35,.03,.72,.055,.66,c.trim,1);
 if(chapter===3){
  if(role==='evidence'){g.tube([-.25,.45,.08],[-.25,1.85,.08],.09,.09,c.metal,1,7);g.tube([-.25,1.35,.08],[.26,1.35,.08],.075,.075,c.metal,1,7);g.box(.20,1.15,.13,.17,.45,.02,c.light);}
  else if(role==='control'){g.tube([0,.43,0],[0,1.59,0],.12,.12,c.metal,1,8);g.box(0,1.82,.06,.56,.25,.16,c.stone);}
  else{g.box(0,1.05,-.11,.68,1.39,.33,c.stone);g.box(0,1.04,.065,.51,1.06,.025,c.dark);for(const side of[-1,1])g.box(side*.28,1.06,.12,.045,1.14,.06,c.trim,1);}
 }else if(chapter===4){
  if(role==='evidence')for(const side of[-1,1]){g.cylinder(side*.18,.63,.04,.15,.12,c.trim,1,8,.19);g.cylinder(side*.18,.70,.04,.13,.018,c.light,6);}
  else if(role==='control'){for(const side of[-1,1])g.box(side*.31,1.08,0,.06,1.44,.07,c.wood,2);g.box(0,1.80,0,.72,.07,.10,c.wood,2);}
  else{g.box(0,.81,-.14,.61,.90,.28,c.stone);g.box(0,.80,.015,.44,.58,.025,c.dark);}
 }else if(chapter===5){
  if(role==='evidence'){g.box(0,.41,0,.74,.08,.58,c.wood,2);for(const side of[-1,1])g.box(side*.34,.52,-.19,.045,.28,.045,c.metal,1);}
  else if(role==='control'){g.box(0,.71,-.08,.64,.63,.48,c.wood,2);g.box(0,.68,.17,.48,.27,.025,c.dark);g.box(0,1.07,-.08,.72,.08,.55,c.trim,1);}
  else for(const x of[-.24,0,.24])g.box(x,.39,0,.05,.025,.57,c.metal,1);
 }else if(chapter===7){
  if(role==='control'){g.box(0,.62,0,.65,.49,.54,c.wood,2);g.box(0,.88,0,.51,.022,.40,c.dark);}
  else if(role==='work'){g.box(0,.49,.02,.55,.20,.43,c.wood,2);for(let i=0;i<5;i++)g.tube([-.22+i*.11,.62,-.13],[-.20+i*.10,.64,.18],.018,.018,c.trim,2,4);}
  else{g.box(0,.43,0,.52,.12,.38,c.wood,2);for(const side of[-1,1])g.tube([side*.18,.49,0],[side*.18,.84,0],.017,.006,c.light,5,4);}
 }
 // The visible compartment is part of each investigation's worksite, not a
 // newly revealed reward. Its native solved id alone opens the front shutter.
 if(role==='work'){g.box(0,.53,.27,.48,.045,.08,c.trim,1);for(const side of[-1,1])g.box(side*.25,.76,.25,.05,.47,.10,c.trim,1);}
}
function moth(g,c,x,y,z,time){
 const spread=.095+Math.sin(time*5)*.018;g.tube([x,y-.04,z],[x,y+.05,z],.015,.009,c.dark,1,5);
 for(const side of[-1,1])g.quad([x,y,z+.01],[x+side*spread,y+.055,z],[x+side*spread*.75,y-.05,z+.025],[x,y-.02,z+.01],c.trim,6);
}
function investigationDynamics(g,c,station,world,time,progress=0){
 const s=investigationView(world.state,c.chapter)||{},role=station.role,solved=!!world.state.exploration?.solved?.includes('district:'+c.chapter+':latch');
 if(c.chapter===3){
  if(role==='evidence'){g.box(.20,1.15,.155,.13,.40,.015,s.traced?tint(c.metal,.65):c.light);if(!s.isolated)for(let i=0;i<3;i++){const p=(time*.7+i*.29)%1;g.sphere(.24,1.30-p*.64,.12,.022,c.light,6,.025,5,3);}}
  else if(role==='control'){
   const a=s.isolated?Math.PI*.78:progress*Math.PI*.78;for(let i=0;i<10;i++){const p=i*TAU/10,q=(i+1)*TAU/10;g.tube([Math.cos(p)*.23,1.18+Math.sin(p)*.23,.20],[Math.cos(q)*.23,1.18+Math.sin(q)*.23,.20],.023,.023,c.trim,1,4);}
   for(let i=0;i<3;i++){const q=a+i*TAU/3;g.tube([0,1.18,.20],[Math.cos(q)*.23,1.18+Math.sin(q)*.23,.20],.018,.018,c.trim,1,4);}
   g.tube([.23,.78,.20],[s.vented?.06:.23,s.vented?.98:.59,.20],.026,.026,c.trim,1,5);
  }else{
   const level=s.drained?.04:s.vented?.23:s.isolated?.62:.88;g.box(0,.50+level/2,.09,.45,level,.025,c.light,6,.055);
   for(let i=0;i<5;i++)g.box(-.20+i*.10,.45+(s.drained?.19:0),.23,.025,.055,.36,c.metal,1);
   if(s.vented&&!s.drained)for(let i=0;i<3;i++)g.box(-.14+i*.14,.64+((time*.65+i*.24)%1)*.25,.12,.022,.05,.014,c.light,6,.04);
  }
 }else if(c.chapter===4){
  if(role==='evidence'){for(const side of[-1,1]){const t=(time*.65+(side<0?.2:.7))%1;g.sphere(side*.18,1.43-t*.68,.04,.018,c.light,6,.035,5,3);}g.box(0,.43,.27,.14,.045,.025,s.heard?c.light:c.dark,6,s.heard?.1:0);}
  else if(role==='control'){
   for(const side of[-1,1]){const x=side*.18,r=side<0?.105:.15,h=side<0?.24:.34;g.tube([x,1.76,0],[x,1.49,0],.016,.016,c.trim,1,5);g.cylinder(x,1.34,0,r,h,c.trim,1,8,r*.52);g.cylinder(x,1.34-h/2,0,r*1.08,.035,c.trim,1,8);const swing=(s.phrase===(side<0?1:3)?.05:0)+Math.sin(progress*Math.PI)*.07;g.tube([x,1.40,.04],[x+swing,1.16,.05],.012,.012,c.metal,1,4);}
   for(let i=0;i<4;i++)g.box(-.24+i*.16,.43,.26,.09,.05,.08,i<(s.phrase||0)?c.light:c.dark,6,i<(s.phrase||0)?.10:0);
  }else g.box(0,.80+(solved?.35:0),.07,.38,.12,.055,c.trim,1);
 }else if(c.chapter===5){
  if(role==='evidence'){
   const phase=clamp(s.phase||0,0,2),x=(phase-1)*.17;g.box(x,.61,.02,.39,.08,.40,c.wood,2);for(const side of[-1,1])g.cylinder(x+side*.15,.52,.02,.065,.07,c.metal,1,7);
   g.box(x,.77,.01,.34,.20,.32,c.light);g.box(x,.89,.01,.36,.035,.34,c.wood,2);g.tube([x-.17,.65,-.14],[x-.17,1.02,-.14],.015,.015,c.metal,1,5);
   for(let i=0;i<3;i++)g.box(-.22+i*.22,.45,.28,.07,.04,.025,i===phase?c.trim:c.dark,6);
  }else if(role==='control'){const out=solved?.15:s.phase===2?.09:progress*.075;g.box(0,.64,.18+out,.42,.06,.29,c.wood,2);g.box(0,.68,.18+out,.32,.018,.22,c.light);g.box(0,.75,.32+out,.10,.09,.025,c.trim,1);}
  else for(let i=0;i<3;i++)g.box(-.24+i*.24,.43,.17,.06,.04,.025,i<(s.observations||0)?c.light:c.dark,6);
 }else if(c.chapter===7){
  if(role==='evidence'){if(!s.food&&!s.custody)g.sphere(0,.55,.07,.075,c.trim,6,0,7,4,[1.5,.5,.6]);}
  else if(role==='control'){
   if(s.shelter){g.quad([-.27,.91,-.22],[-.27,.91,.22],[0,1.18,.22],[0,1.18,-.22],c.trim,2);g.quad([0,1.18,-.22],[0,1.18,.22],[.27,.91,.22],[.27,.91,-.22],c.trim,2);}
   else g.box(.19-progress*.10,.95+progress*.13,.04,.16+progress*.14,.08,.30,c.trim,2);
   if(s.food)g.sphere(-.15,.96,.12,.05,c.trim,6,0,6,4,[1.4,.6,.6]);
   if(s.custody)moth(g,c,s.custody==='released'?Math.sin(time*.7)*.12:0,s.custody==='released'?1.39:1.01,.10,time);
  }else{
   if(!s.custody){moth(g,c,0,.78,.04,time);for(const x of[-.055,0,.055])g.sphere(x,.66,.09,.021,c.light,6,0,5,3);}
  }
 }
 if(role==='work'){
  // Fold the compartment shutter upward when the exact latch is solved.
  g.box(0,solved?1.06:.78,.30,solved?.42:.43,solved?.055:.43,.035,c.wood,2);
  if(solved)g.box(0,.60,.29,.35,.09,.025,c.dark,6);
 }
}
function latchArchitecture(g,c){
 g.box(0,.86,-.10,.73,1.25,.40,c.stone);g.box(0,.84,.115,.54,.86,.025,c.dark);
 for(const side of[-1,1])g.box(side*.30,.84,.17,.06,.96,.10,c.trim,1);
 for(const y of[.36,1.32])g.box(0,y,.17,.66,.065,.10,c.trim,1);
}
function latchDynamics(g,c,world){
 const open=!!world.state.exploration?.solved?.includes('district:'+world.scene.chapter+':latch');
 g.box(0,open?1.36:.84,.21,.53,open?.075:.84,.045,c.wood,2);
 g.box(open?.21:0,open?1.40:.85,.245,.08,.09,.025,c.trim,1);
 if(open)g.box(0,.43,.19,.45,.075,.035,c.dark);
}
function investigationRemote(mesh,c,station,world,dynamic,progress=0){
 const o=station.object,x=o.xy[0]+.5,z=o.xy[1]+.5,s=investigationView(world.state,c.chapter)||{};
 if(!dynamic){mesh.box(x,.030,z,.58,.016,.42,c.metal,1);for(const side of[-1,1])mesh.box(x+side*.27,.041,z,.025,.008,.43,c.trim,1);return;}
 const role=station.role;
 if(c.chapter===3&&role==='control'){
  const angle=s.isolated?Math.PI*.78:progress*Math.PI*.78;mesh.ring(x,.046,z,.145,.17,c.trim,1,0,1,12);
  for(let i=0;i<3;i++){const a=angle+i*TAU/3;mesh.tube([x,.046,z],[x+Math.cos(a)*.16,.046,z+Math.sin(a)*.16],.003,.003,c.trim,1,4);}
  mesh.box(x+.23,.046,z,.025,.005,s.vented?.24:.10,c.light,6);
 }else if(c.chapter===4&&role==='control'){
  for(const side of[-1,1])mesh.cylinder(x+side*.13,.045,z,side<0?.075:.105,.006,c.trim,1,8);
  for(let i=0;i<4;i++)mesh.box(x-.21+i*.14,.046,z+.17,.065,.005,.025,i<(s.phrase||0)?c.light:c.dark,6);
 }else if(c.chapter===5){
  const phase=clamp(s.phase||0,0,2);mesh.box(x+(phase-1)*.14,.045,z,.11,.006,.24,c.trim,1);for(let i=0;i<3;i++)mesh.box(x-.20+i*.20,.045,z+.15,.08,.005,.03,i===phase?c.light:c.dark,6);
 }else if(c.chapter===7){
  mesh.box(x,.045,z,.39,.006,.24,s.shelter?c.trim:c.dark,6);if(s.food)mesh.cylinder(x-.12,.046,z,.033,.005,c.light,6,7);
 }else{
  const lit=c.chapter===3?(role==='evidence'?s.traced:s.drained):c.chapter===4?(role==='evidence'?s.heard:(s.phrase||0)>=4):false;
  for(let i=0;i<3;i++)mesh.box(x-.16+i*.16,.045,z,.09,.006,.22,lit?c.light:c.dark,6);
 }
}
