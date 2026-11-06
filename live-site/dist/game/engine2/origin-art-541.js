/** Six remembered lives, drawn as places of work rather than service boxes.
 * Native staging owns anchors/routes and World owns every interaction and save.
 * These readers replace only the old staging meshes. */
import {originStagingPlan} from './adventure-origin-staging.js?v=5.41';
const TAU=Math.PI*2;
const RGB=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const THEMES={
 reed:{wood:'#68452e',body:'#a17c4b',light:'#e6d6ad',accent:'#789665',metal:'#3d5e5b',shade:'#213633'},
 waterline:{wood:'#6e5a3d',body:'#b6bba0',light:'#dfe2bf',accent:'#4eaaa2',metal:'#537d79',shade:'#233f45'},
 furnace:{wood:'#654630',body:'#945e3f',light:'#d0a276',accent:'#eeac55',metal:'#3c5559',shade:'#262d31'},
 rail:{wood:'#62503a',body:'#405e67',light:'#cbb68a',accent:'#e5ac51',metal:'#93794e',shade:'#1d303a'},
 sluice:{wood:'#7d6748',body:'#73958c',light:'#c8c5a3',accent:'#53b8a6',metal:'#437e78',shade:'#203b42'},
 archive:{wood:'#64503d',body:'#7e6c78',light:'#ded2aa',accent:'#b4abbf',metal:'#7d866f',shade:'#2b343d'}
};
const COLORS=Object.fromEntries(Object.entries(THEMES).map(([k,p])=>[k,Object.fromEntries(Object.entries(p).map(([a,h])=>[a,RGB(h)]))]));
const PLANS=new WeakMap();
const furnishingKey=o=>o?.footprint?[o.footprint.x,o.footprint.y,o.footprint.w,o.footprint.h,o.furniture??''].join(':'):null;
function floorWalk(scene,x,z){return scene.floor[z]?.[x]==='.'&&!(scene.affordanceBlocked||[]).some(p=>p[0]===x&&p[1]===z);}
function nearestWalk(scene,point){
 const x=Math.floor(point.x),z=Math.floor(point.z);if(floorWalk(scene,x,z))return[x,z];
 const choices=[];for(let dz=-6;dz<=6;dz++)for(let dx=-6;dx<=6;dx++)if(floorWalk(scene,x+dx,z+dz))choices.push({point:[x+dx,z+dz],distance:Math.hypot(x+dx+.5-point.x,z+dz+.5-point.z)});
 return choices.sort((a,b)=>a.distance-b.distance||a.point[1]-b.point[1]||a.point[0]-b.point[0])[0]?.point||null;
}
function furnitureClosed(scene,o){
 const r=o?.footprint;if(o?.type!=='furnishing'||[16,18].includes(o.furniture)||!r||![r.x,r.y,r.w,r.h].every(Number.isInteger)||r.w<1||r.h<1||r.x<0||r.y<0||r.x+r.w>scene.width||r.y+r.h>scene.height)return false;
 for(let z=r.y;z<r.y+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)if(scene.floor[z]?.[x]!== '#')return false;
 return true;
}
function connectionToFurnishing(scene,anchor,furnishing){
 const start=nearestWalk(scene,anchor);if(!start)return null;const r=furnishing.footprint,targets=new Map();
 for(let z=r.y-1;z<=r.y+r.h;z++)for(let x=r.x-1;x<=r.x+r.w;x++){
  if(!floorWalk(scene,x,z)||x>=r.x&&x<r.x+r.w&&z>=r.y&&z<r.y+r.h)continue;
  // The carved fronts face the ordinary east/front game camera. Prefer their
  // actual southern approach over a wire entering through the back of a case.
  targets.set(x+','+z,z===r.y+r.h?0:x===r.x-1||x===r.x+r.w?4:8);
 }
 const queue=[start],previous=new Map(),distance=new Map([[start.join(','),0]]),seen=new Set([start.join(',')]),landings=[];
 for(let i=0;i<queue.length;i++){
  const p=queue[i],id=p.join(',');if(targets.has(id))landings.push({id,score:targets.get(id)+distance.get(id)});
  for(const [dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]]){const q=[p[0]+dx,p[1]+dz],key=q.join(',');if(!seen.has(key)&&floorWalk(scene,...q)){seen.add(key);previous.set(key,id);distance.set(key,distance.get(id)+1);queue.push(q);}}
 }
 const best=landings.sort((a,b)=>a.score-b.score||a.id.localeCompare(b.id))[0];if(!best)return null;
 const cells=[];let id=best.id;while(id){cells.push(id.split(',').map(Number));id=previous.get(id);}cells.reverse();return{cells,landing:cells.at(-1)};
}
export function originArtPlan541(world){
 const base=originStagingPlan(world);if(!COLORS[base.spec?.family])return null;const scene=world.scene;
 const furnishings=(scene.objects||[]).filter(o=>o.type==='furnishing'),signature=JSON.stringify(furnishings.map(o=>[furnishingKey(o),o.label]));
 const cached=PLANS.get(scene);if(cached?.base===base&&cached.signature===signature)return cached.plan;
 const bodies=base.bodies.map(b=>({...b,anchor:{x:b.anchor.x,z:b.anchor.z,role:b.anchor.role,object:b.anchor.object}})),owned=[];
 if(base.spec.indoor){
  const primary=bodies.find(b=>b.kind===base.spec.family);
  if(primary){
   const candidates=furnishings.filter(o=>furnitureClosed(scene,o)).map(o=>({object:o,distance:Math.hypot(o.footprint.x+o.footprint.w/2-primary.anchor.x,o.footprint.y+o.footprint.h/2-primary.anchor.z)})).filter(o=>o.distance<=5).sort((a,b)=>a.distance-b.distance||furnishingKey(a.object).localeCompare(furnishingKey(b.object)));
   for(const candidate of candidates){
    const connection=connectionToFurnishing(scene,primary.anchor,candidate.object);if(!connection)continue;
    const r=candidate.object.footprint;
    Object.assign(primary,{x:r.x+r.w/2,z:r.y+r.h/2,width:r.w-.16,depth:r.h-.16,connection:connection.cells,landing:connection.landing,furnishing:candidate.object,furnishingKey:furnishingKey(candidate.object),rebound:true});
    owned.push(candidate.object);break;
   }
  }
 }
 const match=b=>bodies.find(v=>v.kind===b?.kind&&(b?.role===undefined||v.role===b.role)&&v.anchor.x===b?.anchor?.x&&v.anchor.z===b?.anchor?.z);
 const plan={...base,art:COLORS[base.spec.family],bodies,nodes:base.nodes.map(n=>({...n,body:n.body?match(n.body)||n.body:undefined})),landmark:match(base.landmark)||base.landmark,worksites:bodies.map(b=>({x:b.x-b.width/2,z:b.z-b.depth/2,width:b.width,depth:b.depth,role:b.role,anchor:{x:b.anchor.x,z:b.anchor.z}})),actionRoutes:new Map(),ownedFurnishings:owned};
 PLANS.set(scene,{base,signature,plan});return plan;
}
/** Only this exact visual is replaced. Its native descriptor, collision and
 * saved household history continue to belong to World. Rugs/windows survive. */
export function originArtOwnsFurnishing541(world,object){
 if(object?.type!=='furnishing'||[16,18].includes(object.furniture))return false;
 const key=furnishingKey(object);return key!==null&&!!originArtPlan541(world)?.ownedFurnishings.some(o=>furnishingKey(o)===key);
}
function local(mesh,b){const s=Math.min(b.width,b.depth),pt=p=>[b.x+p[0]*b.width,p[1],b.z+p[2]*b.depth];return{
 box:(x,y,z,w,h,d,c,mat=6,em=0,rot=0)=>mesh.box(b.x+x*b.width,y,b.z+z*b.depth,w*b.width,h,d*b.depth,c,mat,em,rot),
 cylinder:(x,y,z,r,h,c,mat=6,n=10,rt=r,em=0)=>mesh.cylinder(b.x+x*b.width,y,b.z+z*b.depth,r*s,h,c,mat,n,rt*s,em),
 tube:(a,c,r0,r1,col,mat=6,n=6,em=0)=>mesh.tube(pt(a),pt(c),r0*s,r1*s,col,mat,n,em),
 sphere:(x,y,z,r,c,mat=6,em=0,n=8,rows=4,shape=[1,1,1])=>mesh.sphere(b.x+x*b.width,y,b.z+z*b.depth,r*s,c,mat,em,n,rows,shape),
 quad:(a,c,d,e,col,mat=6,em=0,alpha=1)=>mesh.quad(pt(a),pt(c),pt(d),pt(e),col,mat,em,alpha),
 tri:(a,c,d,col,mat=6,em=0)=>mesh.tri(pt(a),pt(c),pt(d),col,mat,em)
};}
function front(g,x,y,z,w,h,c,mat=6,em=0){g.quad([x-w/2,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],[x-w/2,y+h/2,z],c,mat,em);}
function disc(g,x,y,z,r,c,mat=6,em=0,n=8){for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;g.tri([x,y,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],c,mat,em);}}
function rim(g,x,y,z,r,w,c,mat=6,n=12){for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n,p=(q,t)=>[x+Math.cos(t)*q,y+Math.sin(t)*q,z];g.quad(p(r-w,a),p(r,a),p(r,b),p(r-w,b),c,mat);}}
function wheel(g,c,x,y,z,r,a=0){rim(g,x,y,z,r,.065,c.light,1,12);disc(g,x,y,z+.008,.085,c.metal,1);for(let i=0;i<4;i++){const t=a+i*TAU/4;g.tube([x,y,z+.012],[x+Math.cos(t)*(r-.03),y+Math.sin(t)*(r-.03),z+.012],.027,.027,c.light,1,5);}}
function arch(g,c,y,r=.43,z=-.15){for(let i=0;i<8;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8,p=(q,t,d)=>[Math.cos(t)*q,y+Math.sin(t)*q,d];g.quad(p(r-.09,a,z+.11),p(r,a,z+.11),p(r,b,z+.11),p(r-.09,b,z+.11),c.body,6);g.quad(p(r,a,z-.11),p(r,b,z-.11),p(r,b,z+.11),p(r,a,z+.11),c.wood,2);}for(const x of[-r+.045,r-.045])g.box(x,y/2+.12,z,.09,y-.24,.22,c.wood,2);}
function base(g,c){g.box(0,.13,0,.88,.20,.88,c.shade,6);g.box(0,.25,0,.87,.055,.87,c.light,6);}
function page(g,c,x,y,z,w=.58,d=.42){const crease=y+.025;g.quad([x-w/2,y,z-d/2],[x,y+.065,z-d/2],[x,crease,z+d/2],[x-w/2,y-.025,z+d/2],c.light);g.quad([x,y+.065,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y-.025,z+d/2],[x,crease,z+d/2],tint(c.light,.92));}
function desk(g,c,family){
 base(g,c);for(const x of[-.31,.31])g.box(x,.59,0,.11,.65,.63,c.wood,2);
 g.box(0,.96,0,.86,.12,.80,c.wood,2);g.box(0,1.025,0,.80,.035,.72,c.body,6);
 if(family==='waterline'){
  for(const x of[-.34,.34])g.box(x,1.12,-.26,.075,.23,.13,c.light,6);
  g.box(0,.54,.05,.68,.12,.57,c.wood,2);
 }else if(family==='sluice'){
  arch(g,c,1.63,.40,-.18);for(const x of[-.22,0,.22]){g.tube([x,1.52,-.04],[x,1.34,-.04],.035,.035,c.light,1,5);rim(g,x,1.30,-.035,.07,.025,c.light,1,8);}page(g,c,0,1.08,.09);
 }else if(family==='archive'){
  g.box(0,1.10,-.06,.66,.08,.54,c.body,6);page(g,c,0,1.18,.03,.68,.54);
  g.tube([.27,1.08,-.23],[.27,1.86,-.23],.035,.025,c.metal,1);g.tube([.27,1.86,-.23],[.10,1.86,-.06],.025,.025,c.metal,1);
  g.cylinder(.08,1.84,-.03,.13,.12,c.body,1,10,.08);
 }else if(family==='rail'){
  g.box(0,1.11,-.24,.68,.11,.15,c.light,6);for(const x of[-.23,.23])g.cylinder(x,1.14,.13,.13,.13,c.metal,1,10);
  front(g,0,.70,.334,.54,.27,c.body);disc(g,0,.70,.343,.11,c.light,1);
 }else if(family==='furnace'){
  page(g,c,0,1.10,0,.66,.48);g.cylinder(-.27,1.13,-.20,.075,.18,c.metal,1,8);g.box(.23,1.11,.18,.20,.12,.22,c.body,6);
 }else{
  g.box(0,1.08,.04,.66,.08,.40,c.body,2);for(const side of[-1,1])g.box(side*.23,1.20,.04,.11,.17,.38,c.metal,1);
  g.tube([-.28,1.22,.04],[.28,1.22,.04],.032,.032,c.light,1,7);
  g.box(0,1.10,-.27,.64,.10,.14,c.light,6);
 }
}
function reedStatic(g,c){
 base(g,c);g.box(0,.98,-.06,.75,1.40,.64,c.wood,2);front(g,0,1.02,.27,.60,1.13,c.body);
 arch(g,c,1.67,.42,-.03);for(const x of[-.24,0,.24]){g.cylinder(x,1.53,-.02,.065,.86,c.light,1,8,.045);g.box(x,1.12,.10,.08,.16,.12,c.metal,1);}
 g.box(0,.74,.34,.66,.16,.12,c.shade);g.box(0,.82,.35,.66,.055,.14,c.light,1);
 for(const x of[-.32,.32])g.box(x,.43,.30,.09,.19,.14,c.body,6);
 // A broad pierced acoustic crown reads as instrument craft above the case.
 rim(g,0,2.28,-.015,.39,.09,c.light,1,12);disc(g,0,2.28,-.010,.22,c.shade);for(let i=0;i<5;i++){const x=(i-2)*.105;front(g,x,2.28,-.001,.045,.30,c.body);}
}
function hearthReedStatic(g,c){
 // The native heat source remains a recognizable hearth. Reed craft occupies
 // its mantel and chimney shelf; rebinding never erases the room's purpose.
 const stone=RGB('#9e9076'),ash=RGB('#3a3631'),ember=RGB('#d58b43');
 base(g,{...c,light:stone});g.box(0,.43,0,.88,.31,.80,stone);
 for(const x of[-.34,.34])g.box(x,.78,.04,.16,.58,.69,stone);
 g.box(0,1.10,.04,.89,.15,.79,stone);g.box(0,1.23,.02,.94,.10,.87,c.wood,2);
 front(g,0,.75,.392,.52,.49,ash);g.tri([-.20,.55,.400],[.19,.55,.400],[-.04,.92,.400],ember,6,.08);g.tri([.01,.55,.405],[.20,.55,.405],[.14,.80,.405],c.light,6,.06);
 g.box(0,1.80,-.21,.66,1.09,.30,stone);g.box(0,2.37,-.21,.72,.10,.39,c.wood,2);
 g.box(0,1.74,-.028,.55,.62,.045,c.shade);for(const x of[-.19,0,.19])g.cylinder(x,1.78,.025,.052,.51,c.light,1,8,.041);
 g.box(0,1.45,.16,.66,.09,.46,c.wood,2);for(const x of[-.25,.25])g.box(x,1.63,.15,.09,.28,.18,c.metal,1);
 rim(g,0,2.12,-.035,.19,.045,c.light,1,10);
}
function waterStatic(g,c){
 base(g,c);g.box(0,1.22,-.14,.78,1.86,.39,c.body);front(g,0,1.33,.069,.52,1.63,c.shade);
 for(const x of[-.33,.33])g.box(x,1.27,.15,.10,2.02,.16,c.light,6);
 g.box(0,2.31,.10,.82,.13,.32,c.light,6);for(let i=0;i<5;i++)front(g,-.18, .75+i*.29,.17,.17,.055,c.light);
 arch(g,c,2.55,.36,-.10);g.cylinder(0,2.67,-.10,.18,.24,c.metal,1,12,.11);g.sphere(0,2.47,-.10,.065,c.light,1);
 g.tube([.28,2.55,.05],[.28,.39,.05],.032,.032,c.wood,2,5);
}
function furnaceStatic(g,c){
 base(g,c);g.cylinder(0,.99,0,.40,1.40,c.body,6,12,.33);g.cylinder(0,1.75,0,.33,.17,c.light,6,12,.26);
 g.cylinder(0,2.10,-.03,.18,.66,c.metal,1,10,.17);g.cylinder(0,2.47,-.03,.27,.13,c.light,1,10,.24);
 g.cylinder(0,2.86,-.03,.16,.63,c.body,6,10,.13);g.cylinder(0,3.21,-.03,.23,.11,c.metal,1,10,.21);
 front(g,0,.98,.372,.53,.69,c.shade);rim(g,0,1.08,.383,.28,.055,c.light,1,12);
 for(const x of[-.20,0,.20])g.box(x,.79,.36,.04,.28,.055,c.metal,1);
 for(const side of[-1,1])g.tube([side*.35,.55,-.12],[side*.35,1.37,-.12],.055,.055,c.metal,1,6);
}
function railStatic(g,c){
 base(g,c);g.box(0,.75,0,.74,.96,.62,c.body);g.box(0,1.30,0,.76,.13,.66,c.light,1);
 for(const x of[-.29,.29])g.box(x,1.93,-.13,.11,1.30,.16,c.metal,1);
 g.box(0,2.55,-.13,.78,.12,.22,c.light,1);g.box(0,2.13,-.08,.57,.69,.24,c.shade,6);
 for(const y of[1.96,2.30]){rim(g,0,y,.06,.15,.04,c.light,1,10);disc(g,0,y,.066,.10,c.body);}
 g.box(0,.76,.33,.54,.54,.035,c.shade);wheel(g,c,0,.76,.365,.24);
}
function sluiceStatic(g,c){
 base(g,c);for(const x of[-.33,.33]){g.box(x,1.36,-.07,.15,2.18,.32,c.wood,2);g.box(x,2.47,-.07,.18,.11,.38,c.light,1);}
 g.box(0,2.23,-.07,.72,.22,.34,c.wood,2);g.box(0,1.33,-.12,.52,1.42,.16,c.shade);
 for(let i=0;i<5;i++)g.box(0,.76+i*.23,-.015,.52,.07,.055,c.body,2);
 g.tube([-.28,1.93,.05],[.28,1.93,.05],.075,.075,c.metal,1,10);
 for(const x of[-.14,0,.14])g.cylinder(x,1.79,.05,.075,.055,c.light,1,8);
 rim(g,0,1.59,.25,.33,.07,c.light,1,12);
}
function archiveStatic(g,c){
 base(g,c);g.box(0,1.13,-.06,.78,1.73,.64,c.wood,2);front(g,0,1.18,.27,.61,1.48,c.shade);
 for(const y of[.70,1.17,1.63])g.box(0,y,.03,.65,.075,.55,c.light,6);
 for(let row=0;row<3;row++)for(let i=0;i<3;i++){const x=-.21+i*.21,y=.88+row*.46;g.box(x,y,.10,.16,.29,.27,(i+row)%3===0?c.accent:c.light);g.box(x,y,.245,.10,.12,.025,c.body);}
 arch(g,c,2.00,.42,-.05);disc(g,0,2.19,.082,.18,c.light);rim(g,0,2.19,.089,.19,.035,c.metal,1,10);
 g.tube([.27,1.34,.20],[.27,2.53,.20],.035,.025,c.metal,1,6);g.tube([.27,2.53,.20],[-.02,2.53,.31],.028,.028,c.metal,1,6);g.cylinder(-.04,2.49,.32,.14,.12,c.body,1,10,.08);
}
const STATIC={reed:reedStatic,waterline:waterStatic,furnace:furnaceStatic,rail:railStatic,sluice:sluiceStatic,archive:archiveStatic};
function diversionStatic(g,c,family){
 base(g,c);
 if(family==='waterline'||family==='sluice'){
  for(const x of[-.32,.32])g.box(x,.55,0,.12,.56,.72,c.wood,2);g.box(0,.84,0,.82,.13,.75,c.wood,2);
  for(const z of[-.25,0,.25])g.box(0,.93,z,.78,.055,.12,c.light,2);
 }else if(family==='rail'){
  for(const x of[-.28,.28])for(const z of[-.26,.26])g.cylinder(x,.39,z,.13,.15,c.shade,6,8);
  g.box(0,.59,0,.76,.20,.72,c.wood,2);for(const x of[-.30,.30])g.box(x,.91,-.26,.065,.56,.06,c.metal,1);g.box(0,1.21,-.26,.67,.07,.06,c.light,1);
 }else if(family==='furnace'){
  g.cylinder(0,.70,0,.35,.84,c.body,6,12,.31);g.tube([-.34,.75,.10],[.34,.75,.10],.09,.09,c.metal,1,8);rim(g,0,1.03,.32,.24,.06,c.light,1,10);
 }else if(family==='archive'){
  g.box(0,.68,0,.80,.13,.69,c.wood,2);for(const x of[-.30,.30])g.box(x,.46,0,.10,.34,.62,c.wood,2);g.box(0,.79,0,.72,.08,.53,c.body,6);
 }else{
  g.box(0,.64,0,.79,.22,.66,c.wood,2);g.box(0,.81,0,.72,.065,.60,c.light);for(const x of[-.24,.24])g.cylinder(x,.98,0,.12,.27,c.body,1,10);
 }
}
function strip(mesh,a,b,width,y,c,mat=6,em=0){const dx=b[0]-a[0],dz=b[1]-a[1],n=Math.hypot(dx,dz);if(n<.001)return;const ox=-dz/n*width/2,oz=dx/n*width/2;mesh.quad([a[0]+ox,y,a[1]+oz],[a[0]-ox,y,a[1]-oz],[b[0]-ox,y,b[1]-oz],[b[0]+ox,y,b[1]+oz],c,mat,em,1,[0,1,0]);}
function routeWire(mesh,b,c,active=false){const points=b.connection.map(p=>[p[0]+.5,p[1]+.5]);points.push([b.x,b.z]);for(let i=1;i<points.length;i++)strip(mesh,points[i-1],points[i],active?.045:.035,.052,active?c.accent:tint(c.metal,.8),active?4:6,active?.10:0);}
export function appendOriginArt541(mesh,{world}={}){
 const p=originArtPlan541(world);if(!p)return null;const before=mesh.v.length,c=p.art,cells=new Map();
 for(const r of p.routes)for(const point of r.cells)cells.set(point.join(','),point);for(const bay of p.bays)for(const point of bay.cells)cells.set(point.join(','),point);
 for(const [x,z]of cells.values()){
  // A broad service material reads as a connected purposeful walk. It never
  // changes the native traversable floor and has no repeating raised kerb.
  mesh.quad([x,.032,z],[x,.032,z+1],[x+1,.032,z+1],[x+1,.032,z],tint(p.spec.surface,.98),0,0,1,[0,1,0]);
 }
 for(const b of p.bodies){const g=local(mesh,b);if(b.kind==='desk')desk(g,c,p.spec.family);else if(b.kind==='diversion')diversionStatic(g,c,p.spec.family);else if(p.spec.family==='reed'&&b.furnishing?.furniture===4)hearthReedStatic(g,c);else STATIC[p.spec.family](g,c);routeWire(mesh,b,c);}
 const info={id:p.spec.id,family:p.spec.family,part:p.spec.part,bodies:p.bodies.length,ownedFurnishings:p.ownedFurnishings.length,serviceCells:cells.size,triangles:(mesh.v.length-before)/36};mesh.originArt541=info;return {...p,stats:info};
}
function visualState(world,feedback){const id=world.scene.originId,r=world.state.embodiedOrigins?.origins?.[id]||{},choices=world.state.chronicle?.originId===id?world.state.chronicle.choices||{}:{};const pending=feedback?.pending,active=pending?.object?.originId===id;return{receiver:!!r.receiver,witnessed:!!r.witnessed,grounded:!!r.grounded,repair:r.repair??choices.repair,choice:r.choice??choices.destiny,diverted:!!r.diverted,pending:active?pending.object:null,progress:active?clamp(pending.progress):0};}
function bodyDynamic(g,c,family,b,s,time){
 const repair=s.repair!==undefined,preview=s.pending&&['lever','gauge','cable','panel','coil','lamp','roller'].includes(s.pending.manipulation)?s.progress:0,q=repair?1:preview;
 if(b.kind==='desk'){
  if(family==='waterline'){const lift=s.witnessed?.16:s.pending?.embodiedAction==='witness'?s.progress*.16:0;g.box(0,.79+lift,.04,.63,.15,.51,c.light);g.box(-.21,.90+lift,.03,.21,.075,.41,c.accent);}
  else if(family==='archive'){page(g,c,0,1.20,.02,.63,.46);front(g,.19,1.22,.26,.14,.055,s.witnessed?c.accent:c.body);}
  else{const shift=s.witnessed?.13:0;g.box(shift,1.13,.06,.29,.065,.26,s.choice===0?c.accent:c.light);}
  if(s.choice!==undefined){const x=s.choice===0?-.22:.22;g.box(x,1.15,.20,.16,.055,.17,c.accent,4,.1);}
  return;
 }
 if(b.kind==='diversion'){
  if(family==='waterline'||family==='sluice'){const x=s.diverted?.27:0;for(let i=0;i<3;i++)g.box(x,.99+i*.05,0,.66,.035,.16,s.diverted?c.accent:c.wood,2);}
  else if(family==='rail')g.box(s.diverted?.17:0,.87,.01,.49,.32,.43,s.diverted?c.accent:c.body);
  else if(family==='furnace')wheel(g,c,0,1.03,.34,.22,s.diverted?Math.PI*.72:s.progress*Math.PI*.72);
  else if(family==='archive')for(let i=0;i<(s.diverted?1:4);i++)g.box(0,.86+i*.04,.01,.60,.035,.42,c.light);
  else for(let i=0;i<(s.diverted?1:3);i++)g.cylinder(0,1.16+i*.055,.02,.24,.045,s.diverted?c.accent:c.light,6,10);
  return;
 }
 if(family==='reed'){
  const spread=s.repair===0?.10:s.pending?.manipulation==='lever'?preview*.10:0,raised=b.furnishing?.furniture===4?.69:0;
  for(const side of[-1,1])g.box(side*(.20+spread),.98+raised,.38,.12,.24,.10,c.metal,1);
  g.box(s.repair===1?.15:0,1.02+raised,.40,.32,.095,.075,s.repair===1?c.accent:c.light);
  g.tube([-.25,1.12+raised,.35],[.25,1.12+raised,.35],.030,.030,repair?c.accent:c.light,1,6);
 }else if(family==='waterline'){
  const level=s.repair===0?1.58:1.09+q*.24;front(g,.08,level,.183,.22,.17,repair?c.accent:c.light,repair?4:6,repair?.09:0);wheel(g,c,0,.58,.29,.23,q*Math.PI*.9);
  g.box(.28,.63+q*.20,.08,.08,.16,.08,c.light,1);
 }else if(family==='furnace'){
  const angle=s.repair===0?.75:q*.75;g.tube([.27,1.30,.31],[.27-Math.sin(angle)*.20,1.68,.31],.035,.035,c.light,1,6);
  front(g,0,1.07,.388,.28,.28,repair?c.accent:tint(c.accent,.62),6,repair?.16:.035);
  g.box(s.repair===1?.20:0,.69,.40,.29,.15,.055,s.repair===1?c.light:c.metal,1);
 }else if(family==='rail'){
  disc(g,0,repair?2.30:1.96,.074,.105,repair?c.accent:tint(c.accent,.55),6,repair?.15:.02,8);
  const a=(s.repair===1?1:q)*.9-.35;g.tube([-.22,.90,.39],[.12+Math.sin(a)*.16,1.02+Math.cos(a)*.15,.39],.035,.035,c.light,1,6);
  if(s.repair===0)front(g,0,.61,.40,.34,.11,c.accent,4,.1);
 }else if(family==='sluice'){
  wheel(g,c,0,1.59,.27,.29,q*Math.PI*.8);g.box(0,.65+(s.repair===0?.46:q*.20),.075,.50,.15,.08,repair?c.accent:c.light,2);
  const split=s.repair===1?.20:0;for(const side of[-1,1])g.box(side*(.16+split),1.00,.11,.11,.34,.055,repair?c.accent:c.metal,1);
 }else if(family==='archive'){
  const angle=(s.repair===0?1:q)*.9;g.tube([.27,2.53,.22],[.27-Math.sin(angle)*.33,2.53,.34],.03,.03,c.metal,1,6);
  page(g,c,0,.55,.31,.54,.30);g.cylinder(s.repair===1?.15:0,.63,.31,.08,.25,c.light,6,10);
  front(g,0,2.19,.10,.22,.18,s.witnessed?c.accent:c.light,6,s.witnessed?.10:0);
 }
}
function controlFace(mesh,c,o,s){
 if(!Array.isArray(o.xy))return;const x=o.xy[0]+.5,z=o.xy[1]+.5,active=s.pending?.id===o.id,q=active?s.progress:0,kind=o.manipulation;
 mesh.quad([x-.26,.061,z-.22],[x-.26,.061,z+.22],[x+.26,.061,z+.22],[x+.26,.061,z-.22],c.metal,6,0,1,[0,1,0]);
 const g=local(mesh,{x,z,width:1,depth:1});
 if(kind==='cable'&&o.from&&o.to){strip(mesh,[o.from.x,o.from.y],[o.to.x,o.to.y],.04,.067,active?c.accent:c.wood,active?4:6,active?.09:0);for(const p of[o.from,o.to]){mesh.cylinder(p.x,.074,p.y,.13,.02,c.light,6,8);}}
 else if(kind==='lever'||kind==='switch'){const a=q-.5;g.tube([0,.075,0],[Math.sin(a)*.15,.075+Math.cos(a)*.15,0],.022,.022,c.light,1,5);}
 else if(kind==='coil')for(const side of[-1,1])g.box(side*(.07+q*.07),.09,0,.09,.025,.22,c.light,1);
 else if(kind==='gauge'||kind==='roller'||kind==='lamp')g.cylinder(q*.09,.09,0,.13,.025,active?c.accent:c.light,6,8);
 else g.box(-.09+q*.18,.084,0,.12,.022,.21,c.light,6);
}
function controlRoute(p,scene,o){
 const node=p.nodes.find(n=>n.object.originStep===o.originStep&&n.role!=='creature'&&n.role!=='threshold');if(!node)return[];
 const start=o.xy,end=[Math.floor(node.x),Math.floor(node.z)],key=start.join(',')+':'+end.join(',');
 if(p.actionRoutes.has(key))return p.actionRoutes.get(key);
 const queue=[start],seen=new Set([start.join(',')]),previous=new Map();let result=[];
 for(let i=0;i<queue.length;i++){
  const point=queue[i],id=point.join(',');if(point[0]===end[0]&&point[1]===end[1]){let at=id;while(at){result.push(at.split(',').map(Number));at=previous.get(at);}result.reverse();break;}
  for(const [dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]]){const next=[point[0]+dx,point[1]+dz],nextId=next.join(',');if(!seen.has(nextId)&&scene.floor[next[1]]?.[next[0]]==='.'&&!(scene.affordanceBlocked||[]).some(q=>q[0]===next[0]&&q[1]===next[1])){seen.add(nextId);previous.set(nextId,id);queue.push(next);}}
 }
 p.actionRoutes.set(key,result);return result;
}
export function appendOriginArtDynamics541(mesh,glow,{world,time=0,feedback=null,objects=[],range=26}={}){
 const p=originArtPlan541(world);if(!p)return null;const s=visualState(world,feedback),before=mesh.v.length,c=p.art;
 for(const b of p.bodies){if(Math.hypot(b.x-world.state.x,b.z-world.state.y)>range)continue;bodyDynamic(local(mesh,b),c,p.spec.family,b,s,time);if(s.grounded)routeWire(mesh,b,c,true);}
 for(const o of objects)if(o.originId===p.spec.id&&o.type==='embodied-action'&&o.xy&&Math.hypot(o.xy[0]+.5-world.state.x,o.xy[1]+.5-world.state.y)<=range){controlFace(mesh,c,o,s);const route=controlRoute(p,world.scene,o);for(let i=1;i<route.length;i++)strip(mesh,[route[i-1][0]+.5,route[i-1][1]+.5],[route[i][0]+.5,route[i][1]+.5],.035,.055,s.pending?.id===o.id?c.accent:c.metal,6);}
 return {...p,stats:{id:p.spec.id,family:p.spec.family,triangles:(mesh.v.length-before)/36,state:s}};
}
