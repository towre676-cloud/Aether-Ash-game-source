/** Remembered lives are places of work, not a scatter of isolated controls.
 * Native people, mechanisms and portals keep their exact coordinates. These
 * connected work bays and service walks read that authored layout only. */
import {isInteriorScene} from './scene-identity.js?v=4.0.0';
import {personFor} from './presentation.js?v=5.41';
import {civilianStyle,civilianStance} from './npc-art.js?v=5.38';

const TAU=Math.PI*2,PLANS=new WeakMap();
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const RGB=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const ROOF={deck:RGB('#18343b'),seam:RGB('#10262b'),service:RGB('#37483c'),edge:RGB('#98885c'),banks:RGB('#61452c'),bankTop:RGB('#785635'),grille:RGB('#2b3433'),panel:RGB('#163f43'),frame:RGB('#22383c'),signal:RGB('#60c5b3')};
const THEMES={
 'sable-reed':{family:'reed',name:'Family reed room',surface:'#75634c',edge:'#b1a077',metal:'#465759',accent:'#a5ba9e',wood:'#6c4f35'},
 'iona-lowbank':{family:'waterline',name:'Shelter waterline and relief work',surface:'#6b776b',edge:'#b3b998',metal:'#435c62',accent:'#7cb7b3',wood:'#705b42'},
 'rook-regulator':{family:'furnace',name:'Winter heater service floor',surface:'#756c5b',edge:'#b39b69',metal:'#3b5158',accent:'#d19b62',wood:'#6b503b'},
 'brass-rail':{family:'rail',name:'Public crossing service platform',surface:'#6b7370',edge:'#b7a579',metal:'#3a515a',accent:'#bba575',wood:'#6c5843'},
 'riven-tide':{family:'sluice',name:'Shared sluice and ferry landing',surface:'#6d807b',edge:'#b1b795',metal:'#3a5960',accent:'#74b5b5',wood:'#70573c'},
 'mira-archive':{family:'archive',name:'Witness register working aisle',surface:'#746e74',edge:'#b9ad8a',metal:'#4c5c6a',accent:'#b0b6ca',wood:'#6d5747'},
 'veyr-storm':{family:'observatory',name:'Listening observatory service walk',surface:'#314f57',edge:'#a79569',metal:'#21373e',accent:'#4fbaad',wood:'#63482e'}
};
const key=(x,z)=>x+','+z;
const center=o=>({x:o.xy[0]+.5,z:o.xy[1]+.5});
const same=(a,b)=>a?.[0]===b?.[0]&&a?.[1]===b?.[1];
export function originStagingSpec(world){
 const s=world?.scene,t=THEMES[s?.originId];if(!t)return null;
 return {...t,id:s.originId,part:s.originPart,indoor:isInteriorScene(s),surface:RGB(t.surface),edge:RGB(t.edge),metal:RGB(t.metal),accent:RGB(t.accent),wood:RGB(t.wood),dark:RGB('#26383c'),paper:RGB('#c4c5ad')};
}
function walk(scene,x,z){return scene.floor[z]?.[x]==='.'&&!(scene.affordanceBlocked||[]).some(p=>p[0]===x&&p[1]===z);}
function structural(scene,x,z){const floor=scene.household?.floorBase||scene.floor;return floor[z]?.[x]==='.'&&!(scene.household?.partitions||[]).some(p=>p.x===x&&p.y===z);}
function nearestWalk(scene,point){
 const x=Math.floor(point.x),z=Math.floor(point.z);if(walk(scene,x,z))return [x,z];
 const choices=[];for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++)if(walk(scene,x+dx,z+dz))choices.push([x+dx,z+dz]);
 choices.sort((a,b)=>Math.hypot(a[0]+.5-point.x,a[1]+.5-point.z)-Math.hypot(b[0]+.5-point.x,b[1]+.5-point.z)||a[1]-b[1]||a[0]-b[0]);return choices[0]||null;
}
function route(scene,start,end){
 if(!start||!end)return[];const queue=[start],seen=new Set([key(...start)]),previous=new Map();
 for(let i=0;i<queue.length&&i<scene.width*scene.height;i++){
  const p=queue[i];if(same(p,end)){const out=[];let k=key(...end);while(k){out.push(k.split(',').map(Number));k=previous.get(k);}return out.reverse();}
  for(const[dx,dz]of[[0,-1],[-1,0],[1,0],[0,1]]){const q=[p[0]+dx,p[1]+dz],k=key(...q);if(!seen.has(k)&&walk(scene,...q)){seen.add(k);previous.set(k,key(...p));queue.push(q);}}
 }return[];
}
function closedRect(scene,x,z,w,d){
 if(x-w/2<0||z-d/2<0||x+w/2>=scene.width||z+d/2>=scene.height)return false;
 for(let zz=Math.floor(z-d/2);zz<=Math.floor(z+d/2);zz++)for(let xx=Math.floor(x-w/2);xx<=Math.floor(x+w/2);xx++)if(structural(scene,xx,zz))return false;
 return !(scene.objects||[]).some(o=>o.footprint&&x+w/2>o.footprint.x&&x-w/2<o.footprint.x+o.footprint.w&&z+d/2>o.footprint.y&&z-d/2<o.footprint.y+o.footprint.h);
}
function bodyAt(scene,preferred,anchor,used,{kind='cabinet',reach=4.5,exact=false,clearSpeaker=false}={}){
 const candidates=[],doors=(scene.objects||[]).filter(o=>o.type==='portal');
 for(let dz=-Math.ceil(reach);dz<=Math.ceil(reach);dz++)for(let dx=-Math.ceil(reach);dx<=Math.ceil(reach);dx++){
  const x=Math.floor(preferred.x)+dx+.5,z=Math.floor(preferred.z)+dz+.5,distance=Math.hypot(x-preferred.x,z-preferred.z);
  if(distance>reach||Math.hypot(x-anchor.x,z-anchor.z)>7||used.some(p=>Math.hypot(p.x-x,p.z-z)<1.65)||doors.some(o=>Math.hypot(x-o.xy[0]-.5,z-o.xy[1]-.5)<1.35))continue;
  const landing=nearestWalk(scene,{x,z});if(!landing||Math.hypot(landing[0]+.5-x,landing[1]+.5-z)>2.2)continue;
  for(const[w,d]of[[1.80,1.35],[1.26,1.04],[.84,.84]])if(closedRect(scene,x,z,w,d)){
   const connection=route(scene,nearestWalk(scene,anchor),landing);if(!connection.length)break;
   candidates.push({x,z,width:w,depth:d,kind,anchor,landing,connection,score:distance+(w<1?1.1:0)+(z>anchor.z?.4:0)+(exact&&distance>.01?5:0)+(clearSpeaker&&Math.abs(x-anchor.x)<1.6?12:0)});break;
  }
 }
 candidates.sort((a,b)=>a.score-b.score||a.z-b.z||a.x-b.x);const chosen=candidates[0];if(chosen)used.push(chosen);return chosen||null;
}
/** A shared plan exposes the actual purpose/extent of each occupied worksite. */
export function originStagingPlan(world){
 const scene=world?.scene,spec=originStagingSpec(world);if(!spec)return {spec:null,nodes:[],routes:[],bays:[],bodies:[],worksites:[]};
 const signature=JSON.stringify([scene.floor,scene.household?.floorBase,scene.household?.partitions,scene.affordanceBlocked,scene.objects.filter(o=>o.originId).map(o=>[o.type,o.originStep,o.xy]),scene.authoredOpening]);
 const prior=PLANS.get(scene);if(prior?.signature===signature)return prior.plan;
 const native=scene.objects.filter(o=>o.originId===scene.originId&&Array.isArray(o.xy)),nodes=native.filter(o=>!o.originTravel||o.originTravel===1).map(o=>({object:o,...center(o),role:o.type==='npc'?'person':o.type==='patrol'?'creature':o.type==='portal'?'threshold':'mechanism'}));
 const arrival=spec.id==='veyr-storm'&&spec.part===0&&walk(scene,54,28)?[54,28]:[...scene.arrive],start={x:arrival[0]+.5,z:arrival[1]+.5},routes=[],used=[],bodies=[];
 const ordered=[...nodes].sort((a,b)=>(a.object.originStep??(spec.part===0?2:5))-(b.object.originStep??(spec.part===0?2:5))),points=[{...start,role:'arrival'},...ordered];
 for(let i=1;i<points.length;i++){const cells=route(scene,nearestWalk(scene,points[i-1]),nearestWalk(scene,points[i]));if(cells.length)routes.push({from:points[i-1],to:points[i],cells});}
 // The old arrival remains part of legacy saves. It joins the designed route,
 // rather than becoming a disconnected blank patch behind the new approach.
 const old=scene.authoredOpening?.arrival;if(old&&Math.hypot(old[0]-start.x,old[1]-start.z)>1){const cells=route(scene,nearestWalk(scene,{x:old[0],z:old[1]}),arrival);if(cells.length)routes.push({from:{x:old[0],z:old[1]},to:start,cells});}
 const landmarkPoint=scene.authoredOpening?.landmark?.xy,focus=scene.authoredOpening?.landmark?.focus;
 const landmarkAnchor=focus?{x:focus[0],z:focus[1]}:nodes.find(n=>n.role==='mechanism')||start;
 const landmark=landmarkPoint?bodyAt(scene,{x:landmarkPoint[0],z:landmarkPoint[1]},landmarkAnchor,used,{kind:spec.family,reach:3,exact:true}):null;
 if(landmark)bodies.push({...landmark,role:'landmark'});
 for(const node of nodes){
  if(node.role==='threshold'||node.role==='creature')continue;
  // A single master mechanism serves its actual input. The operator's own
  // desk/receiver is separate and clearly belongs beside that native person.
  if(spec.part===0&&node.role==='mechanism'&&landmark&&Math.hypot(node.x-landmark.x,node.z-landmark.z)<5.5){node.body=landmark;continue;}
  const body=bodyAt(scene,{x:node.x+(node.role==='person'? -2:0),z:node.z-(node.role==='person'?0:.8)},node,used,{kind:node.role==='person'?'desk':spec.part===1?'diversion':spec.family,clearSpeaker:node.role==='person'});if(body){body.role=node.role;body.object=node.object;bodies.push(body);node.body=body;}
 }
 const bays=nodes.filter(n=>n.role!=='creature').map(n=>({...n,cells:[]}));
 for(const b of bays)for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const x=Math.floor(b.x)+dx,z=Math.floor(b.z)+dz;if(walk(scene,x,z))b.cells.push([x,z]);}
 const worksites=bodies.map(b=>({x:b.x-b.width/2,z:b.z-b.depth/2,width:b.width,depth:b.depth,role:b.role,anchor:{x:b.anchor.x,z:b.anchor.z}}));
 const roof=spec.family==='observatory'?observatoryRoofPlan(scene,bodies):null;
 if(roof?.north){const b=roof.bounds,hub=nearestWalk(scene,{x:(b.x0+b.x1)/2,z:b.z0+(b.z1-b.z0)*.57}),north=nearestWalk(scene,{x:(roof.north.x0+roof.north.x1)/2,z:roof.north.z+2});roof.serviceHub=hub&&{x:hub[0]+.5,z:hub[1]+.5};
  if(hub&&north){const cells=route(scene,hub,north);if(cells.length)routes.push({from:roof.serviceHub,to:{x:north[0]+.5,z:north[1]+.5},role:'array-service',cells});}
  const person=nodes.find(n=>n.role==='person');if(hub&&person){const cells=route(scene,nearestWalk(scene,person),hub);if(cells.length)routes.push({from:person,to:roof.serviceHub,role:'console-service',cells});}
  if(hub){const bay={...roof.serviceHub,role:'service-junction',cells:[]};for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(walk(scene,hub[0]+dx,hub[1]+dz))bay.cells.push([hub[0]+dx,hub[1]+dz]);bays.push(bay);}
 }
 const plan={spec,arrival:start,nodes,routes,bays,bodies,landmark,worksites,roof,actionRoutes:new Map()};PLANS.set(scene,{signature,plan});return plan;
}
function observatoryRoofPlan(scene,bodies){
 const open=[];for(let z=0;z<scene.height;z++)for(let x=0;x<scene.width;x++)if(walk(scene,x,z))open.push([x,z]);
 const bounds={x0:Math.min(...open.map(p=>p[0])),x1:Math.max(...open.map(p=>p[0]))+1,z0:Math.min(...open.map(p=>p[1])),z1:Math.max(...open.map(p=>p[1]))+1};
 const reserved=(x,z)=>bodies.some(b=>Math.abs(x+.5-b.x)<b.width/2+.35&&Math.abs(z+.5-b.z)<b.depth/2+.35),closed=[];
 for(let z=bounds.z0;z<bounds.z1;z++)for(let x=bounds.x0;x<bounds.x1;x++)if(!structural(scene,x,z)&&!reserved(x,z))closed.push([x,z]);
 const used=new Set(),has=new Set(closed.map(p=>key(...p))),banks=[];
 for(const[x,z]of closed){if(used.has(key(x,z)))continue;let width=1,depth=1;while(has.has(key(x+width,z))&&!used.has(key(x+width,z)))width++;outer:while(z+depth<bounds.z1){for(let xx=x;xx<x+width;xx++)if(!has.has(key(xx,z+depth))||used.has(key(xx,z+depth)))break outer;depth++;}for(let zz=z;zz<z+depth;zz++)for(let xx=x;xx<x+width;xx++)used.add(key(xx,zz));banks.push({x,z,width,depth});}
 // Roof-edge screens are long connected runs, rather than a perimeter of
 // unrelated little plinths. All supports stand in actual closed cells.
 const screens=[];for(const side of[-1,1]){const x=side<0?bounds.x0-.5:bounds.x1+.5;let start=null;for(let z=bounds.z0;z<=bounds.z1;z++){const clear=z<bounds.z1&&!structural(scene,Math.floor(x),z)&&!reserved(Math.floor(x),z);if(clear&&start===null)start=z;if((!clear||z===bounds.z1)&&start!==null){if(z-start>=2)screens.push({x,z:(start+z)/2,length:z-start,side,height:side<0?.90:1.30});start=null;}}}
 const north=scene.originPart===1?{x0:3.15,x1:9.85,z:4.5}:null;
 return {bounds,open,banks,screens,north};
}
/** Chamfered service covers stay inside their original closed-cell bank.
 * Their softened lip, recessed panel joints and fasteners describe real roof
 * maintenance construction rather than another stack of opaque boxes. */
function roofServiceCover(mesh,q){
 const x=q.x+q.width/2,z=q.z+q.depth/2,w=q.width-.06,d=q.depth-.06,b=Math.min(.085,w*.12,d*.12),y=.31;
 const outline=(inset=0)=>{const W=w/2-inset,D=d/2-inset,r=Math.max(.018,b-inset*.35);return[[-W+r,-D],[W-r,-D],[W,-D+r],[W,D-r],[W-r,D],[-W+r,D],[-W,D-r],[-W,-D+r]].map(([a,c])=>[x+a,z+c]);};
 const outer=outline(),inner=outline(.035),top=.351;
 mesh.box(x,.17,z,w,.25,d,ROOF.banks,2);
 mesh.box(x,.068,z,w+.012,.035,d+.012,ROOF.grille,6);
 for(let i=0;i<8;i++){const j=(i+1)%8,a=outer[i],b=outer[j],c=inner[j],d=inner[i];mesh.quad([b[0],y,b[1]],[a[0],y,a[1]],[d[0],top,d[1]],[c[0],top,c[1]],ROOF.bankTop,2);mesh.tri([x,top,z],[c[0],top,c[1]],[d[0],top,d[1]],ROOF.bankTop,2,0,1,[0,1,0]);}
 const alongX=q.width>=q.depth,length=alongX?w:d,breadth=alongX?d:w;
 for(let u=1.6;u<length-.4;u+=1.6){const at=-length/2+u,extent=Math.max(.08,breadth/2-.10);if(alongX)mesh.quad([x+at-.012,top+.003,z-extent],[x+at-.012,top+.003,z+extent],[x+at+.012,top+.003,z+extent],[x+at+.012,top+.003,z-extent],ROOF.grille,6);else mesh.quad([x-extent,top+.003,z+at-.012],[x-extent,top+.003,z+at+.012],[x+extent,top+.003,z+at+.012],[x+extent,top+.003,z+at-.012],ROOF.grille,6);}
 if(w>.5&&d>.5)for(const dx of[-1,1])for(const dz of[-1,1]){const xx=x+dx*(w/2-.15),zz=z+dz*(d/2-.15),r=.025;mesh.quad([xx-r,top+.004,zz],[xx,top+.004,zz+r],[xx+r,top+.004,zz],[xx,top+.004,zz-r],ROOF.edge,6);}
}
function observatoryDeck(mesh,c,roof){
 const b=roof.bounds;
 // The landscape excludes the roof footprint. Its foundation must therefore
 // reach the sea, rather than leave the entire station as a thin floating slab.
 mesh.box((b.x0+b.x1)/2,-1.53,(b.z0+b.z1)/2,b.x1-b.x0+1.8,3.09,b.z1-b.z0+1.4,tint(c.metal,.62),6);
 for(const[x,z]of roof.open){const tone=((Math.floor(x/2)+Math.floor(z/2))%2)?.94:1.04,col=tint(ROOF.deck,tone);mesh.quad([x,.041,z],[x,.041,z+1],[x+1,.041,z+1],[x+1,.041,z],col,0,0,1,[0,1,0]);
  if(x%2===0)mesh.quad([x+.005,.046,z],[x+.005,.046,z+1],[x+.031,.046,z+1],[x+.031,.046,z],ROOF.seam,6);
  if(z%2===0)mesh.quad([x,.046,z+.005],[x,.046,z+.031],[x+1,.046,z+.031],[x+1,.046,z+.005],ROOF.seam,6);
 }
 for(const q of roof.banks)roofServiceCover(mesh,q);
 for(const q of roof.screens){mesh.box(q.x,q.height/2,q.z,.76,q.height,q.length-.025,ROOF.frame,6.2);mesh.box(q.x,q.height+.035,q.z,.85,.065,q.length+.02,ROOF.edge,6);mesh.box(q.x,q.height*.48,q.z,.78,.055,q.length,ROOF.banks,6);
  for(let z=q.z-q.length/2+.35;z<q.z+q.length/2;z+=2.5)mesh.box(q.x,q.height/2,z,.84,q.height+.10,.08,ROOF.frame,6);
 }
 if(roof.north){const n=roof.north;mesh.box((n.x0+n.x1)/2,.72,n.z,n.x1-n.x0,1.44,.80,ROOF.frame,6);for(const y of[.18,1.48,3.60])mesh.box((n.x0+n.x1)/2,y,n.z,n.x1-n.x0,.095,.12,ROOF.edge,6,.12);
  for(const x of[3.5,6.5,9.5]){mesh.box(x,2.14,n.z,.10,4.20,.12,ROOF.banks,6);mesh.box(x,3.05,n.z+.13,1.55,1.78,.10,ROOF.panel,6,.045);for(const off of[-.52,0,.52])mesh.box(x+off,3.05,n.z+.19,.035,1.76,.035,ROOF.edge,6);for(const y of[2.48,3.05,3.62])mesh.box(x,y,n.z+.19,1.52,.035,.035,ROOF.edge,6);}
 }
}
function local(mesh,p,flatMetal=false){const sx=p.width,sz=p.depth,material=mat=>flatMetal&&mat===1?6:mat;return {
 box:(x,y,z,w,h,d,c,mat=6,em=0,rot=0)=>mesh.box(p.x+x*sx,y,p.z+z*sz,w*sx,h,d*sz,c,material(mat),em,rot),
 cylinder:(x,y,z,r,h,c,mat=1,n=8,rt=r,em=0)=>mesh.cylinder(p.x+x*sx,y,p.z+z*sz,r*Math.min(sx,sz),h,c,material(mat),n,rt*Math.min(sx,sz),em),
 tube:(a,b,r0,r1,c,mat=1,n=6,em=0)=>mesh.tube([p.x+a[0]*sx,a[1],p.z+a[2]*sz],[p.x+b[0]*sx,b[1],p.z+b[2]*sz],r0*Math.min(sx,sz),r1*Math.min(sx,sz),c,material(mat),n,em),
 sphere:(x,y,z,r,c,mat=6,em=0,n=7,rows=4,shape=[1,1,1])=>mesh.sphere(p.x+x*sx,y,p.z+z*sz,r*Math.min(sx,sz),c,material(mat),em,n,rows,shape),
 quad:(a,b,c,d,col,mat=6,em=0)=>mesh.quad(...[a,b,c,d].map(v=>[p.x+v[0]*sx,v[1],p.z+v[2]*sz]),col,material(mat),em)
};}
function wheel(g,c,x,y,z,r,angle=0){for(let i=0;i<12;i++){const a=i*TAU/12,b=(i+1)*TAU/12;g.tube([x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],.018,.018,c.edge,1,4);}for(let i=0;i<3;i++){const a=angle+i*TAU/3;g.tube([x,y,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],.016,.016,c.edge,1,4);}}
function frame(g,c,h=1.5){for(const x of[-.35,.35])g.box(x,h/2+.20,-.22,.07,h,.08,c.wood,2);g.box(0,h+.20,-.22,.78,.09,.09,c.edge,2);}
function bodyStatic(g,c,b){
 g.box(0,.12,0,.86,.24,.82,tint(c.surface,.76),6);g.box(0,.26,0,.84,.06,.80,c.edge,6);
 if(b.kind==='diversion'){
  if(c.family==='observatory'){g.cylinder(0,.98,0,.06,1.42,c.metal,1,8);g.box(0,1.67,0,.66,.065,.08,c.edge,1);g.box(.22,1.78,0,.24,.16,.035,c.edge,1);for(let i=0;i<3;i++)g.cylinder(0,.45+i*.13,0,.16,.045,c.edge,1,9);}
  else if(c.family==='waterline'||c.family==='sluice'){frame(g,c,.72);g.box(0,.50,.05,.72,.07,.56,c.wood,2);for(const x of[-.23,.23])g.box(x,.61,.05,.055,.14,.60,c.edge,1);}
  else if(c.family==='rail'){g.box(0,.44,0,.78,.10,.64,c.wood,2);for(const x of[-.31,.31])g.tube([x,.26,-.21],[x,.26,.21],.11,.11,c.dark,1,8);g.box(0,.88,-.25,.72,.065,.07,c.metal,1);for(const x of[-.32,.32])g.box(x,.66,-.25,.04,.46,.05,c.metal,1);}
  else if(c.family==='archive'){g.box(0,.64,0,.76,.08,.60,c.wood,2);for(const x of[-.32,.32])g.box(x,.42,0,.055,.40,.48,c.wood,2);}
  else if(c.family==='furnace'){g.tube([-.37,.59,0],[.37,.59,0],.065,.065,c.metal,1,8);g.tube([0,.29,0],[0,1.18,0],.06,.06,c.metal,1,8);}
  else{g.box(0,.45,0,.74,.09,.58,c.wood,2);for(const x of[-.23,.23])g.cylinder(x,.63,0,.12,.23,c.metal,1,8);}
  return;
 }
 if(b.kind==='desk'&&c.family==='observatory'&&c.part===1){
  g.box(0,.64,0,.82,.10,.64,c.metal,1);for(const x of[-.32,.32])g.box(x,.42,0,.06,.36,.50,c.metal,1);g.box(0,.71,0,.65,.025,.45,c.dark,6);for(const x of[-.23,.23])g.cylinder(x,.76,.04,.075,.08,c.edge,1,8);g.box(0,.76,-.13,.21,.08,.18,c.paper,6);return;
 }
 if(b.kind==='desk'){
  frame(g,c,c.family==='observatory'?1.55:1.25);g.box(0,.83,.02,.80,.09,.62,c.wood,2);g.box(0,.88,.02,.62,.014,.40,c.paper,6);
  if(c.family==='observatory'){g.box(0,1.32,-.21,.57,.55,.12,c.dark,6);for(const x of[-.18,.18])g.cylinder(x,1.32,-.12,.10,.035,c.edge,1,9);g.tube([-.31,.94,.20],[.31,.94,.20],.025,.025,c.metal,1,6);g.box(.25,1.60,-.13,.13,.12,.09,c.edge,1);}
  else if(c.family==='waterline'){g.box(0,.43,.04,.78,.10,.58,c.wood,2);for(const x of[-.30,.30])g.box(x,.25,.04,.055,.35,.52,c.wood,2);g.box(.27,1.03,-.20,.17,.25,.16,c.accent,6);}
  else if(c.family==='archive')for(let i=0;i<3;i++)g.box(-.17,.92+i*.05,.03,.40,.04,.30,i%2?c.paper:c.wood,6);
  else{g.tube([-.25,.94,.06],[.25,.94,.06],.035,.035,c.edge,1,7);g.box(.18,.96,-.11,.17,.08,.22,c.metal,1);}return;
 }
 if(c.family==='observatory'){
  const h=5.6;g.cylinder(0,h/2+.28,0,.085,h,c.metal,1,10,.055);for(let i=0;i<6;i++)g.cylinder(0,.85+i*.78,0,.14,.065,c.edge,1,10);
  g.box(0,3.95,0,.76,.09,.12,c.edge,1);for(const x of[-.31,.31])g.cylinder(x,4.20,0,.075,.42,c.paper,6,8,.055);
  for(const side of[-1,1])g.tube([0,.40,0],[side*.34,.10,side*.26],.05,.035,c.metal,1,6);
  g.box(0,.72,.28,.50,.43,.12,c.metal,1);g.box(0,.75,.35,.35,.25,.025,c.dark,6);return;
 }
 if(c.family==='waterline'||c.family==='sluice'){
  frame(g,c,1.67);g.box(0,1.10,-.22,.52,1.50,.07,c.dark,6);for(let i=0;i<8;i++)g.box(i%2?-.10:0,.48+i*.18,-.17,i%2?.24:.43,.022,.025,c.edge,6);
  g.tube([-.38,.46,.16],[.38,.46,.16],.07,.07,c.metal,1,8);g.box(0,.44,.28,.64,.12,.12,c.wood,2);return;
 }
 if(c.family==='furnace'){
  g.box(0,1.0,0,.72,1.43,.64,c.metal,1);g.box(0,.86,.33,.50,.54,.025,c.dark,6);for(let i=0;i<4;i++)g.box(-.17+i*.115,.86,.36,.035,.48,.035,c.edge,1);
  g.cylinder(0,2.0,-.10,.12,.60,c.metal,1,8);g.box(0,2.34,-.10,.40,.07,.38,c.edge,1);g.tube([-.38,.57,0],[.38,.57,0],.055,.055,c.edge,1,7);return;
 }
 if(c.family==='rail'){
  frame(g,c,2.2);g.box(0,2.02,-.18,.30,.68,.16,c.metal,1);for(const y of[1.84,2.15])g.cylinder(0,y,-.08,.075,.045,c.paper,6,8);
  g.box(0,.59,.14,.68,.36,.18,c.metal,1);g.tube([-.34,.46,.15],[.34,.46,.15],.06,.06,c.edge,1,8);return;
 }
 if(c.family==='archive'){
  frame(g,c,1.60);g.box(0,.82,0,.80,.10,.61,c.wood,2);g.box(0,.90,0,.65,.06,.43,c.paper,6);
  for(let i=0;i<3;i++)g.box(-.23+i*.23,1.29,-.20,.17,.56,.22,i%2?c.wood:c.paper,6);g.cylinder(.30,1.06,.15,.055,.30,c.metal,1,7);return;
 }
 // The family reed's clamp and case are on a real work surface, with enough
 // empty surround to read the object when the player reaches it.
 g.box(0,.78,0,.80,.10,.64,c.wood,2);g.box(0,.86,0,.64,.045,.38,c.paper,6);for(const x of[-.20,.20])g.box(x,.96,0,.07,.17,.25,c.metal,1);g.tube([-.30,.96,.05],[.30,.96,.05],.026,.026,c.edge,1,7);
}
function wire(mesh,cells,end,color,{height=.047,material=1,emission=0}={}){
 const points=cells.map(p=>[p[0]+.5,height,p[1]+.5]);if(end)points.push([end.x,height,end.z]);for(let i=1;i<points.length;i++)if(Math.hypot(points[i][0]-points[i-1][0],points[i][2]-points[i-1][2])>.001)mesh.tube(points[i-1],points[i],.010,.010,color,material,4,emission);
}
function groundTile(m,x,z,c,indoor=false){m.box(x+.5,indoor?.026:.025,z+.5,.94,.015,.94,c,0);}
export function appendOriginStaging(mesh,{world}={}){
 const p=originStagingPlan(world),c=p.spec;if(!c)return p;
 if(p.roof)observatoryDeck(mesh,c,p.roof);
 const cells=new Map();for(const r of p.routes)for(const point of r.cells)cells.set(key(...point),point);for(const b of p.bays)for(const point of b.cells)cells.set(key(...point),point);
 for(const[x,z]of cells.values()){
  // Walking surfaces share the scene's real material finish. Matte instrument
  // and paper material 6 remains reserved for those objects, not large roads.
  if(!p.roof)groundTile(mesh,x,z,tint(c.surface,c.indoor?.92:.96),c.indoor);else mesh.quad([x,.050,z],[x,.050,z+1],[x+1,.050,z+1],[x+1,.050,z],ROOF.service,0,0,1,[0,1,0]);
  // A continuous edge traces the service walk instead of repeating floating
  // circles at unrelated interactions. The route follows actual native floor.
  for(const[dx,dz]of[[0,-1],[-1,0],[0,1],[1,0]])if(!cells.has(key(x+dx,z+dz)))mesh.box(x+.5+dx*.45,p.roof?.055:.039,z+.5+dz*.45,dx?.025:.90,.007,dx?.90:.025,p.roof?ROOF.edge:tint(c.edge,.83),6);
  if(['rail','waterline','sluice'].includes(c.family)&&!c.indoor)for(const off of[-.25,.25])mesh.box(x+.5,.038,z+.5+off,.89,.006,.025,tint(c.wood,1.10),2);
 }
 for(const b of p.bodies){bodyStatic(local(mesh,b,c.family==='observatory'),c,b);wire(mesh,b.connection,b,c.metal,{material:c.family==='observatory'?6:1});}
 for(const b of p.bays){const role=b.role,stone=role==='person'?c.wood:c.edge;mesh.box(b.x,.045,b.z,.58,.018,.46,stone,6);if(role==='threshold')for(const side of[-1,1])mesh.box(b.x+side*.23,.057,b.z,.05,.010,.42,c.edge,6);}
 return p;
}
function stateFor(world,feedback){const id=world.scene.originId,r=world.state.embodiedOrigins?.origins?.[id]||{},choices=world.state.chronicle?.originId===id?world.state.chronicle?.choices||{}:{};
 const pending=feedback?.pending,progress=pending?.object?.originId===id?clamp(pending.progress):0;
 return {grounded:!!r.grounded,repair:r.repair??choices.repair,choice:r.choice??choices.destiny,receiver:!!r.receiver,witnessed:!!r.witnessed,diverted:!!r.diverted,progress,pending:pending?.object||null};
}
export function appendOriginStagingDynamics(mesh,glow,{world,time=0,feedback=null,objects=[],range=26}={}){
 const p=originStagingPlan(world),c=p.spec;if(!c)return p;const s=stateFor(world,feedback),col=s.grounded||s.repair!==undefined?c.accent:c.edge;
 if(p.roof?.north){const n=p.roof.north,lit=s.grounded||s.repair!==undefined;
  for(let i=0;i<3;i++){const x=[3.5,6.5,9.5][i],reply=s.choice===1?Math.floor(time*.7)%3===i:true,signal=lit&&reply?ROOF.signal:ROOF.edge;
   mesh.box(x,1.08,n.z+.43,1.13,.24,.035,signal,6,lit&&reply?.14:0);
   for(const off of[-.26,.26])mesh.box(x+off,3.05,n.z+.205,.055,1.35,.025,lit?ROOF.signal:ROOF.edge,6,lit?.08:0);
   mesh.box(x,2.47,n.z+.21,.55,.045,.026,signal,6,lit?.08:0);mesh.box(x,3.63,n.z+.21,.55,.045,.026,signal,6,lit?.08:0);
  }
 }
 for(const b of p.bodies){if(Math.hypot(b.x-world.state.x,b.z-world.state.y)>range)continue;const g=local(mesh,b,c.family==='observatory');
  if(b.kind==='diversion'){
   if(c.family==='observatory'&&c.part===1){for(let i=0;i<3;i++){const x=-.18+i*.18,lit=s.choice!==undefined&&(s.choice===0||i!==1);g.box(x,.75,.12,.08,.025,.07,lit?c.accent:c.edge,6,lit?.1:0);}g.box(s.choice===1?.14:0,.78,-.10,.10,.025,.16,c.edge,6);}
   else if(c.family==='observatory'){g.tube([-.28,.31,.22],[.28,.31,.22],.025,.025,s.diverted?c.accent:c.edge,1,6);g.sphere(0,.33,.22,.04,s.diverted?c.accent:c.paper,s.diverted?4:6,s.diverted?.18:0,6,4);}
   else if(c.family==='waterline'||c.family==='sluice'){if(!s.diverted)for(let i=0;i<3;i++)g.box(0,.63+i*.055,.05,.66,.035,.13,c.wood,2);}
   else if(c.family==='rail')g.box(s.diverted?.15:0,.66,0,.49,.34,.44,c.edge,2);
   else if(c.family==='archive')for(let i=0;i<(s.diverted?1:4);i++)g.box(0,.71+i*.025,.02,.54,.022,.35,c.paper,6);
   else if(c.family==='furnace')wheel(g,c,0,.93,.12,.21,s.diverted?Math.PI*.7:s.progress*Math.PI*.7);
   else for(let i=0;i<(s.diverted?1:4);i++)g.cylinder((i%2?1:-1)*.23,.60+i*.035,0,.12,.035,c.edge,1,8);
   continue;
  }
  if(b.kind==='desk'){
   if(c.family==='observatory'&&c.part===1){for(let i=0;i<3;i++){const x=-.18+i*.18,lit=s.choice!==undefined&&(s.choice===0||i!==1);g.box(x,.75,.12,.08,.025,.07,lit?c.accent:c.edge,6,lit?.1:0);}g.box(s.choice===1?.14:0,.78,-.10,.10,.025,.16,c.edge,6);}
   else if(c.family==='observatory'){g.tube([-.24,.96,.20],[-.24,1.10+s.progress*.06,.20],.035,.035,s.receiver?c.accent:c.edge,1,7);g.tube([.24,.96,.20],[.24,1.10,.20],.035,.035,c.edge,1,7);for(let i=0;i<3;i++)g.sphere(-.17+i*.17,1.32,-.10,.025,s.receiver?c.accent:c.paper,4,s.receiver?.20:0,5,3);}
   else if(c.family==='waterline'){const y=s.witnessed?.68:.53;g.box(0,y,.04,.72,.15,.52,c.paper,6);g.box(-.23,y+.10,.04,.20,.08,.43,c.accent,6);}
   else if(c.family==='archive')g.box(0,.94,.04,.40,.025,.28,s.witnessed?c.accent:c.paper,6);
   else g.box(s.witnessed?.12:0,.96,.12,.28,.025,.18,s.witnessed?c.accent:c.paper,6);
   continue;
  }
  if(c.family==='observatory'){
   const raised=s.repair===0,split=s.repair===1,a=(raised?1:s.pending?.manipulation==='lever'?s.progress:0)*.8;
   g.tube([0,5.85,0],[Math.sin(a)*.34,5.85+Math.cos(a)*.22,0],.025,.025,c.edge,1,6);g.box(Math.sin(a)*.27,6.04+Math.cos(a)*.08,0,.28,.14,.045,c.edge,1,0,-a);
   for(const side of[-1,1])for(let i=0;i<4;i++)g.cylinder(side*(split?.25:.15),.56+i*.13,.20,.065,.045,c.edge,1,8);
   g.sphere(0,.76,.36,.045,s.grounded?c.accent:c.paper,s.grounded?4:6,s.grounded?.18:0,7,4);
   if(s.grounded)wire(mesh,b.connection,b,c.accent,{height:.052,material:4,emission:.12});
  }else if(c.family==='waterline'||c.family==='sluice'){
   const q=s.repair!==undefined?1:s.progress;wheel(g,c,.18,.91,.31,.20,q*Math.PI*.8);g.box(0,.52+(s.repair===0?.25:0),.20,.51,.12,.07,c.wood,2);
   if(s.repair!==undefined)g.box(0,.70,-.15,.32,.045,.016,c.accent,4,.08);
  }else if(c.family==='furnace'){
   const q=s.repair!==undefined?1:s.progress;g.tube([.23,1.32,.34],[.23-q*.18,1.55,.34],.027,.027,c.edge,1,6);g.box(s.repair===1?.28:0,1.23,.34,.28,.23,.035,col,6);g.box(0,.90,.35,.32,.28,.012,s.repair!==undefined?c.accent:tint(c.accent,.65),6,.05);
  }else if(c.family==='rail'){
   const q=s.repair!==undefined?1:s.progress;g.tube([-.20,.59,.26],[.21,.59+q*.20,.26],.023,.023,c.edge,1,6);g.sphere(.21,.59+q*.20,.26,.055,col,6,0,6,4);g.box(0,1.83,-.055,.10,.08,.015,s.repair!==undefined?c.accent:c.paper,6);if(s.repair===1)wheel(g,c,.18,.76,.28,.16,Math.PI*.7);else g.tube([-.25,.35,.22],[-.25,.73,.22],.018,.018,s.repair===0?c.accent:c.metal,1,5);
  }else if(c.family==='archive'){
   const a=(s.repair===0?1:s.progress)*.7;g.tube([.30,1.21,.15],[.30-Math.sin(a)*.28,1.42,.15],.019,.019,c.metal,1,6);g.box(.30-Math.sin(a)*.28,1.42,.15,.18,.045,.20,c.edge,1);g.box(0,.95,.06,.42,.022,.29,s.repair===1?c.accent:c.paper,6);
  }else{const spread=s.repair===0?.09:0;for(const side of[-1,1])g.box(side*(.20+spread),1.06,0,.07,.08,.25,c.metal,1);g.tube([-.27,1.07,.05],[.27,1.07,.05],.018,.018,s.repair===1?c.accent:c.edge,1,6);}
 }
 for(const o of objects.filter(o=>o.originId===c.id&&o.type==='embodied-action'&&o.xy)){
  const at=center(o);if(Math.hypot(at.x-world.state.x,at.z-world.state.y)>range)continue;
  const active=s.pending?.id===o.id,q=active?s.progress:0,kind=o.manipulation,g=local(mesh,{...at,width:1,depth:1},c.family==='observatory');
  g.box(0,.063,0,.44,.032,.34,c.metal,6);g.box(0,.084,0,.36,.010,.27,c.dark,6);
  if(kind==='lever'||kind==='switch'){const a=q*1.1-.55;g.tube([0,.10,0],[Math.sin(a)*.13,.10+Math.cos(a)*.13,0],.018,.018,c.edge,1,5);g.sphere(Math.sin(a)*.13,.10+Math.cos(a)*.13,0,.035,c.edge,6,0,6,4);}
  else if(kind==='coil')for(const side of[-1,1])for(let i=0;i<3;i++)g.cylinder(side*(.08+q*.05),.105+i*.025,0,.055,.015,c.edge,1,8);
  else if(kind==='gauge'||kind==='roller'||kind==='lamp'){g.cylinder(0,.115,0,.105,.040,c.edge,1,10);g.tube([0,.14,0],[Math.sin(q*Math.PI)*.08,.14,Math.cos(q*Math.PI)*.08],.012,.012,c.paper,1,4);}
  else if(kind==='receiver'){g.tube([-.12,.13,0],[.12,.13,0],.025,.025,s.receiver?c.accent:c.edge,1,6);for(const x of[-.12,.12])g.cylinder(x,.13,0,.043,.07,c.edge,1,8);}
  else if(kind!=='cable')g.box(-.10+q*.20,.11,0,.10,.025,.18,c.edge,6);
  const node=p.nodes.find(n=>n.object.originStep===o.originStep&&n.role!=='creature'&&n.role!=='threshold');
  if(node&&Math.hypot(at.x-node.x,at.z-node.z)>.1){const k=key(...o.xy)+':'+key(node.x,node.z);let cells=p.actionRoutes.get(k);if(!cells){cells=route(world.scene,nearestWalk(world.scene,at),nearestWalk(world.scene,node));p.actionRoutes.set(k,cells);}wire(mesh,cells,null,active?c.accent:c.metal,{height:.057,material:c.family==='observatory'?6:1});}
 }
 for(const node of p.nodes.filter(n=>n.role==='mechanism')){
  const done=c.part===0?s.repair!==undefined:s.diverted,active=s.pending?.xy&&same(s.pending.xy,node.object.xy),amount=active?s.progress:done?1:0;
  mesh.box(node.x,.061,node.z,.34,.018,.27,c.dark,6);mesh.box(node.x-.11+amount*.22,.076,node.z,.075,.012,.20,done?c.accent:c.edge,6);
 }
 return p;
}
/** Restore the authored speaker's picture when a physical control replaces
 * their dialog marker. Completed speakers remain at their own work stations. */
export function originStagingActors(world,{objects=[],time=0}={}){
 const c=world?.state?.chronicle,s=world?.scene;if(!s?.originId||c?.phase!=='past'||c.originId!==s.originId)return[];
 const out=[];for(const o of s.objects||[]){if(o.type!=='npc'||o.originId!==s.originId||o.originStep>c.step)continue;
  if(objects.some(v=>v.type==='npc'&&v.originId===o.originId&&same(v.xy,o.xy)))continue;
  const person=personFor(o);if(!person)continue;const style=civilianStyle(o,person),at=center(o),stance=civilianStance(o,time,world.state,at.x,at.z);
  out.push({object:o,x:at.x,y:at.z,person:style===null?person:{...person,npcKind:'npcs',row:style,child:[1,12].includes(style),flip:stance.flip}});
 }return out;
}
