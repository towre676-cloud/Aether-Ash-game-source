/** Structural craft for the real campaign dungeons.
 * Read-only: boundary piers, high-clearance arches and an enlarged head to one
 * existing wall instrument. Native stations, controls and collision stay owned
 * by adventure-dungeon-architecture and World. */
import {dungeonArchitectureSpec,dungeonArchitecturePlan} from './adventure-dungeon-architecture.js';
import {nativeDungeonPlan} from './native-dungeon-director.js?v=5.41';

const TAU=Math.PI*2,CACHE=new WeakMap();
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const tint=(c,n)=>c.map(v=>clamp(v*n));
const key=(x,z)=>x+','+z;
export const dungeonArt541Applies=world=>!!dungeonArchitectureSpec(world);
const GROUPS={relay:'power',reactor:'power',mooring:'power',sluice:'flow',vent:'flow',heat:'flow',clay:'flow',chapel:'choir',resonance:'choir',listening:'choir',archive:'archive',witness:'archive',roots:'organic',timber:'organic',assembly:'organic',shelter:'organic',glass:'optical',observatory:'optical',rail:'iron',gate:'iron',wind:'wind'};

function structural(scene,x,z){
 const floor=scene.household?.floorBase||scene.floor;
 return floor?.[z]?.[x]==='.'&&!(scene.household?.partitions||[]).some(p=>p.x===x&&p.y===z);
}
function local(mesh,f){
 const [fx,fz]=f.front,rx=fz,rz=-fx,angle=Math.atan2(-rz,rx),p=(x,y,z)=>[f.x+x*rx+z*fx,y,f.z+x*rz+z*fz];
 return {
  point:p,
  box:(x,y,z,w,h,d,c,mat=6,em=0,rot=0)=>mesh.box(...p(x,y,z),w,h,d,c,mat,em,angle+rot),
  tube:(a,b,r0,r1,c,mat=6,n=6,em=0)=>mesh.tube(p(...a),p(...b),r0,r1,c,mat,n,em),
  cylinder:(x,y,z,r,h,c,mat=6,n=8,rt=r,em=0)=>mesh.cylinder(...p(x,y,z),r,h,c,mat,n,rt,em),
  quad:(a,b,c,d,col,mat=6,em=0,alpha=1)=>mesh.quad(p(...a),p(...b),p(...c),p(...d),col,mat,em,alpha),
  tri:(a,b,c,col,mat=6,em=0,alpha=1)=>mesh.tri(p(...a),p(...b),p(...c),col,mat,em,alpha)
 };
}
const intersect=(x,z,w,d,o)=>o?.footprint&&x+w/2>o.footprint.x&&x-w/2<o.footprint.x+o.footprint.w&&z+d/2>o.footprint.y&&z-d/2<o.footprint.y+o.footprint.h;
function plan(world){
 const s=world?.scene,c=dungeonArchitectureSpec(world);if(!c)return {spec:null,supports:[],arches:[],hero:null};
 const signature=JSON.stringify([s.floor,s.household?.floorBase,s.household?.partitions,s.objects?.map(o=>[o.type,o.xy,o.footprint]),s.affordanceBlocked]);
 const previous=CACHE.get(s);if(previous?.signature===signature)return previous.plan;
 const native=dungeonArchitecturePlan(world),closed=(x,z)=>x>=0&&z>=0&&x<s.width&&z<s.height&&!structural(s,x,z);
 const walk=(x,z)=>s.floor?.[z]?.[x]==='.'&&!(s.affordanceBlocked||[]).some(p=>p[0]===x&&p[1]===z);
 const doors=[...(s.doors||[]),...(s.objects||[]).filter(o=>o.type==='portal')].filter(o=>o.xy),reserved=[...native.fixtures,...native.investigations,...native.latches];
 const allowed=(x,z)=>closed(x,z)&&!(s.objects||[]).some(o=>intersect(x+.5,z+.5,.90,.90,o))&&!doors.some(o=>Math.hypot(x-o.xy[0],z-o.xy[1])<1.5);
 const candidates=[];
 for(let z=0;z<s.height;z++)for(let x=0;x<s.width;x++){
  if(!allowed(x,z)||reserved.some(f=>Math.hypot(f.x-x-.5,f.z-z-.5)<1.10))continue;
  const front=walk(x,z+1)?[0,1]:walk(x+1,z)?[1,0]:null;if(!front)continue;
  candidates.push({x:x+.5,z:z+.5,front});
 }
 const arrival=s.arrive||[s.width/2,s.height/2],supportCount=Math.min(24,Math.max(5,Math.ceil(candidates.length/9))),supports=[];
 // Farthest-first coverage is measured against actual wall candidates. It
 // prevents a single busy corner leaving the remaining chambers unfinished.
 if(candidates.length){candidates.sort((a,b)=>Math.hypot(a.x-arrival[0],a.z-arrival[1])-Math.hypot(b.x-arrival[0],b.z-arrival[1])||a.z-b.z||a.x-b.x);supports.push(candidates.shift());}
 while(candidates.length&&supports.length<supportCount){
  let best=-1,distance=0;for(let i=0;i<candidates.length;i++){const p=candidates[i],d=Math.min(...supports.map(q=>Math.hypot(q.x-p.x,q.z-p.z)));if(d>distance){best=i;distance=d;}}
  if(best<0||distance<3.2)break;supports.push(candidates.splice(best,1)[0]);
 }
 const archCandidates=[];
 for(let z=1;z<s.height-1;z++)for(let x=1;x<s.width-3;x++){
  if(!walk(x,z)||walk(x-1,z)||!allowed(x-1,z))continue;let end=x;while(end<s.width&&walk(end,z))end++;
  const span=end-x;if(span<3||span>7||!allowed(end,z))continue;
  if([x-1,end].some(xx=>reserved.some(f=>Math.hypot(f.x-xx-.5,f.z-z-.5)<.95)))continue;
  const near=Math.min(Math.hypot((x+end)/2-arrival[0],z-arrival[1]),...native.controls.map(o=>Math.hypot((x+end)/2-o.xy[0],z-o.xy[1])));
  archCandidates.push({x0:x-.5,x1:end+.5,z:z+.5,near});x=end;
 }
 archCandidates.sort((a,b)=>a.near-b.near||a.z-b.z||a.x0-b.x0);const arches=[];
 for(const a of archCandidates){if(arches.length===2)break;if(arches.every(b=>Math.hypot((a.x0+a.x1-b.x0-b.x1)/2,a.z-b.z)>8))arches.push(a);}
 const widthAt=f=>{
  const [fx,fz]=f.front,rx=fz,rz=-fx;
  for(const width of[2.55,1.66,.78]){let ok=true;for(let t=-width/2;t<=width/2+.01;t+=.12){const x=Math.floor(f.x+t*rx),z=Math.floor(f.z+t*rz);if(!closed(x,z)||!allowed(x,z)){ok=false;break;}}if(ok)return width;}
  return .78;
 };
 const ranked=native.fixtures.map(f=>({...f,width:widthAt(f)})).sort((a,b)=>b.width-a.width||a.index-b.index);
 const hero=ranked[0]||null;if(hero)hero.control=(native.routes.find(r=>r.fixture===hero.index)?.object)||native.controls.slice().sort((a,b)=>Math.hypot(a.xy[0]+.5-hero.x,a.xy[1]+.5-hero.z)-Math.hypot(b.xy[0]+.5-hero.x,b.xy[1]+.5-hero.z))[0]||null;
 const out={spec:{...c,group:GROUPS[c.family]||'iron'},supports,arches,hero};CACHE.set(s,{signature,plan:out});return out;
}
export function dungeonArt541Plan(world){return plan(world);}

function pier(mesh,x,z,c,wood=false){
 mesh.box(x,.13,z,.74,.22,.74,tint(c.stone,.68),wood?2:0);
 // Chamfered, tapered shafts have a broad light face and narrow worn edges.
 const n=8,r0=.235,r1=.17,lo=.23,hi=2.67;
 for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;mesh.quad([x+Math.cos(a)*r0,lo,z+Math.sin(a)*r0],[x+Math.cos(a)*r1,hi,z+Math.sin(a)*r1],[x+Math.cos(b)*r1,hi,z+Math.sin(b)*r1],[x+Math.cos(b)*r0,lo,z+Math.sin(b)*r0],tint(wood?c.wood:c.stone,.83+(i%3)*.07),wood?2:0);}
 mesh.box(x,2.71,z,.70,.14,.70,c.trim,wood?2:6);
 mesh.box(x,2.88,z,.79,.16,.79,tint(c.stone,.84),wood?2:0);
}
function arch(mesh,a,c){
 const wood=c.group==='organic',mid=(a.x0+a.x1)/2,r=(a.x1-a.x0)/2,base=2.92,rise=Math.min(1.4,r*.46);
 for(const x of[a.x0,a.x1])pier(mesh,x,a.z,c,wood);
 const point=(t,outer,z)=>[mid+Math.cos(t)*(r+(outer?.19:0)),base+Math.sin(t)*(rise+(outer?.20:0)),z];
 for(let i=0;i<10;i++){
  const t=i*Math.PI/10,u=(i+1)*Math.PI/10,A=point(t,false,a.z+.18),B=point(u,false,a.z+.18),C=point(u,true,a.z+.18),D=point(t,true,a.z+.18),E=point(t,false,a.z-.18),F=point(u,false,a.z-.18),G=point(u,true,a.z-.18),H=point(t,true,a.z-.18),col=tint(wood?c.wood:c.stone,.91+(i%3)*.045),mat=wood?2:0;
  mesh.quad(D,C,B,A,col,mat);mesh.quad(E,F,G,H,col,mat);mesh.quad(D,H,G,C,tint(c.trim,.84),6);mesh.quad(E,A,B,F,tint(c.stone,.64),mat);
 }
 mesh.box(mid,base+rise+.12,a.z,.30,.39,.43,c.trim,6);
}
function radial(g,x,y,z,inner,outer,color,mat=6,em=0,segments=12,rotation=0){
 for(let i=0;i<segments;i++){const a=i*TAU/segments+rotation,b=(i+1)*TAU/segments+rotation;g.quad([x+Math.cos(a)*inner,y+Math.sin(a)*inner,z],[x+Math.cos(a)*outer,y+Math.sin(a)*outer,z],[x+Math.cos(b)*outer,y+Math.sin(b)*outer,z],[x+Math.cos(b)*inner,y+Math.sin(b)*inner,z],color,mat,em);}
}
function disc(g,x,y,z,r,color,mat=6,em=0,n=8){for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;g.tri([x,y,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],color,mat,em);}}
function heroStatic(mesh,h,c){
 const g=local(mesh,h),w=h.width*.43,scale=Math.min(1.05,h.width/1.9),r=.60*scale;
 // The head is carried by the existing physical station, above its old2.3m
 // frame. Both broad backing and stone/copper rim stay inside checked wall.
 g.box(0,2.39,0,h.width,.14,.64,c.trim,6);
 for(const side of[-1,1])g.tube([side*w,2.40,-.10],[side*w*.83,4.02,-.10],.085,.06,c.group==='organic'?c.wood:c.stone,c.group==='organic'?2:0,6);
 if(c.group==='choir'){
  for(let i=0;i<5;i++){const x=(i-2)*w*.38,top=3.38+Math.cos((i-2)*.48)*.68;g.tube([x,2.47,.03],[x,top,.03],.065*scale,.065*scale,c.trim,1,7);g.box(x,2.62,.16,.08*scale,.18,.035,c.dark,6);}
  g.box(0,2.47,.08,w*1.95,.14,.34,c.stone,0);
 }else if(c.group==='archive'){
  for(let i=0;i<3;i++){const x=(i-1)*w*.61;g.box(x,3.03,-.04,w*.48,.98,.20,tint(c.stone,.65),0);g.box(x,3.03,.08,w*.36,.81,.07,tint(c.trim,.86),6);for(const y of[2.74,3.32])g.cylinder(x,y,.08,w*.22,.075,c.trim,1,8);}
  radial(g,0,3.83,.08,r*.60,r*.74,c.trim,6,0,10);disc(g,0,3.83,.075,r*.52,tint(c.light,.50),6);
 }else if(c.group==='flow'){
  g.box(0,3.04,-.07,w*1.73,1.02,.20,c.dark,6);
  for(const x of[-w*.72,w*.72])g.tube([x,2.48,.11],[x,3.70,.11],.055,.055,c.trim,1,6);
  for(let i=0;i<3;i++){const x=(i-1)*w*.56;g.cylinder(x,3.79,-.07,.11*scale,.40,c.stone,0,7,.075*scale);g.cylinder(x,4.0,-.07,.15*scale,.075,c.trim,6,7);}
  g.box(0,3.60,.04,w*1.93,.16,.41,c.stone,0);
 }else if(c.group==='organic'){
  for(const side of[-1,1]){g.tube([side*w*.85,2.45,.04],[side*w*.52,3.49,.04],.12,.07,c.wood,2,6);g.tube([side*w*.52,3.49,.04],[0,4.10,.04],.07,.035,c.wood,2,6);}
  g.quad([-w*.65,2.64,.02],[w*.65,2.64,.02],[w*.47,3.47,.02],[-w*.47,3.47,.02],tint(c.light,.64),6);
  for(const side of[-1,1])g.tube([side*w*.54,2.62,.07],[-side*w*.34,3.48,.07],.035,.025,c.trim,2,5);
 }else if(c.group==='optical'){
  for(const x of[-w*.40,w*.40]){const diamond=[[x,3.89,.02],[x-w*.36,3.20,.08],[x,2.51,.02],[x+w*.36,3.20,.08]];g.quad(...diamond,tint(c.light,.58),6,.02);for(let i=0;i<4;i++)g.tube(diamond[i],diamond[(i+1)%4],.033,.033,c.trim,1,5);}
 }else{
  radial(g,0,3.22,.07,r*.82,r,c.trim,6,0,14);
  radial(g,0,3.22,.03,r*.63,r*.76,c.metal,6,0,14);
  for(let i=0;i<8;i++){const a=i*TAU/8;g.tube([Math.cos(a)*r*.22,3.22+Math.sin(a)*r*.22,.07],[Math.cos(a)*r*.81,3.22+Math.sin(a)*r*.81,.07],.025,.025,c.trim,1,4);}
  for(const side of[-1,1]){g.tube([side*w*.84,2.46,-.08],[side*w*.84,3.88,-.08],.045,.045,c.metal,1,5);g.cylinder(side*w*.84,3.91,-.08,.11*scale,.09,c.trim,6,7);}
 }
 return {width:w,scale,radius:r};
}
export function appendDungeonArt541(mesh,{world}={}){
 const p=plan(world);if(!p.spec)return p;const before=mesh.v.length,c=p.spec;
 for(const f of p.supports)pier(mesh,f.x,f.z,c,c.group==='organic');
 const archStart=mesh.v.length/12;
 for(const a of p.arches)arch(mesh,a,c);
 const heroStart=mesh.v.length/12;
 if(p.hero)heroStatic(mesh,p.hero,c);
 return {...p,triangles:(mesh.v.length-before)/36,ranges:{start:before/12,arches:archStart,hero:heroStart,end:mesh.v.length/12}};
}
function progress(world,p,feedback){
 const native=nativeDungeonPlan(world,{feedback}),h=p.hero;if(!h)return 0;
 const controls=native.mechanisms.filter(m=>m.object.xy);
 const match=h.control&&controls.find(m=>m.object.type===h.control.type&&m.object.xy[0]===h.control.xy[0]&&m.object.xy[1]===h.control.xy[1]);
 const closest=match||controls.sort((a,b)=>Math.hypot(a.object.xy[0]+.5-h.x,a.object.xy[1]+.5-h.z)-Math.hypot(b.object.xy[0]+.5-h.x,b.object.xy[1]+.5-h.z))[0];
 return clamp(closest?.progress?.value||0);
}
export function appendDungeonArtDynamics541(mesh,glow,{world,time=0,feedback=null,range=30}={}){
 const p=plan(world),h=p.hero;if(!p.spec||!h||Math.hypot(h.x-world.state.x,h.z-world.state.y)>range)return null;
 const c=p.spec,g=local(mesh,h),v=progress(world,p,feedback),w=h.width*.43,scale=Math.min(1.05,h.width/1.9),r=.60*scale,col=v>.015?c.light:tint(c.light,.32),before=mesh.v.length;
 if(c.group==='flow'){
  for(let i=0;i<3;i++){const y=2.65+i*.29;g.box(0,y+v*.12,.16,w*1.30,.21*(1-v*.77),.065,c.stone,0);}
  g.box(0,2.55+v*.49,.11,w*1.08,.05+v*.95,.04,col,6,v*.11);
 }else if(c.group==='choir'){
  for(let i=0;i<5;i++){const x=(i-2)*w*.38;g.box(x,2.72+v*.10,.18,Math.max(.09,.11*scale),.19,.04,i/5<v?c.light:c.metal,6,v*.12);}
  g.tube([0,3.56,.18],[Math.sin(v*1.1)*w*.34,3.29,.18],.032,.04,c.trim,1,5);
  disc(g,0,3.93,.18,.16,col,6,v*.16,8);
 }else if(c.group==='archive'){
  for(const side of[-1,1])g.box(side*w*(.20+v*.28),3.03,.16,w*.47,.81,.045,tint(c.stone,.91),0);
  disc(g,0,3.83,.10,Math.max(.16,r*.37),col,6,v*.18,8);
 }else if(c.group==='organic'){
  const y=3.0+v*.35;g.tube([-w*.64,2.60,.15],[-w*.26,y,.15],.04,.035,c.wood,2,5);g.tube([w*.64,2.60,.15],[w*.26,y,.15],.04,.035,c.wood,2,5);
  for(const side of[-1,1]){const leaf=[[0,y-.18,.18],[side*w*.26,y+.08,.18],[side*w*.70,y+.20,.17],[side*w*.40,y-.09,.18]];g.quad(...(side>0?leaf.reverse():leaf),tint(col,.83),6,v*.06);}
 }else if(c.group==='optical'){
  const angle=-.68+v*1.36;for(const side of[-1,1])g.tube([side*w*.45,3.18,.18],[side*w*.45+Math.sin(angle)*w*.30,3.18+Math.cos(angle)*.49,.18],.035,.025,c.trim,1,5);
  disc(g,0,3.18,.20,Math.max(.16,.18*scale),col,6,v*.16,8);
 }else{
  const angle=v*1.38+(c.group==='wind'&&v>.98?time*.55:0);
  for(let i=0;i<3;i++){const a=angle+i*TAU/3;g.quad([Math.cos(a)*r*.21,3.22+Math.sin(a)*r*.21,.13],[Math.cos(a+.20)*r*.76,3.22+Math.sin(a+.20)*r*.76,.13],[Math.cos(a+.55)*r*.76,3.22+Math.sin(a+.55)*r*.76,.13],[Math.cos(a+.55)*r*.28,3.22+Math.sin(a+.55)*r*.28,.13],c.trim,6);}
  disc(g,0,3.22,.16,Math.max(.16,.17*scale),col,6,v*.20,8);
  for(const side of[-1,1])g.box(side*w*.84,2.68+v*.91,.05,Math.max(.13,.18*scale),.29,.18,c.trim,1);
 }
 return {family:c.family,progress:v,triangles:(mesh.v.length-before)/36};
}
