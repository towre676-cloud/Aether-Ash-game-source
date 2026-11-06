/** Craft belongs to the room's actual walls, windows and furniture.
 * This pass is visual only. World retains every footprint, door and state. */
import {isInteriorScene} from './scene-identity.js';
import {sceneArtSpec} from './scene-art-materials-541.js?v=5.41';

const TAU=Math.PI*2,MAX_TRIANGLES=3400;
const clamp=v=>Math.max(0,Math.min(1,v));
const tint=(c,n)=>c.map(v=>clamp(v*n));
const mix=(a,b,n)=>a.map((v,i)=>v*(1-n)+b[i]*n);
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const IVORY=rgb('#ded5b5'),WOOD=rgb('#705039'),INK=rgb('#293e47'),COPPER=rgb('#a87948');
const FAMILIES={home:'home',quarters:'home',nursery:'home',inn:'hospitality',mess:'hospitality',kitchen:'hospitality',store:'hospitality',cargo:'hospitality',clinic:'care',washroom:'care',workshop:'craft',carpenter:'craft',instrumentworks:'craft',tailor:'craft',pottery:'craft',printshop:'craft',optics:'craft',archive:'archive',guild:'archive',waiting:'civic',assembly:'civic',chapel:'civic',listening:'civic',music:'civic',cistern:'water',garden:'garden'};

export function interiorCraftSpec(world){
 const s=world?.scene;if(!s||s.originId||!isInteriorScene(s)||!s.floor)return null;
 const art=sceneArtSpec(world),program=s.household?.kind||s.interior||s.key||'workshop';
 const family=art?.family==='industrial'?'industrial':FAMILIES[program]||art?.family||'craft',p=art?.palette||{};
 return {program,family,palette:{wall:p.wall||rgb('#9a9986'),edge:p.edge||rgb('#b3a47c'),metal:p.metal||rgb('#456467'),accent:p.accent||rgb('#7eaaa0'),dark:p.dark||rgb('#293b40'),foliage:p.foliage||rgb('#667c4f'),wood:WOOD,ivory:IVORY,copper:COPPER}};
}

function plan(world){
 const scene=world.scene,base=scene.household?.floorBase||scene.floor,partitions=new Set((scene.household?.partitions||[]).map(p=>p.x+','+p.y));
 const structural=(x,z)=>base[z]?.[x]==='.'&&!partitions.has(x+','+z),walk=(x,z)=>scene.floor[z]?.[x]==='.';
 const doors=[...(scene.doors||[]),...(scene.objects||[]).filter(o=>o.type==='portal')].filter(o=>o.xy);
 const doorway=(x,z,dx,dz)=>doors.some(o=>Math.hypot(o.xy[0]+.5-(x+.5+dx*.5),o.xy[1]+.5-(z+.5+dz*.5))<.86);
 const runs=new Map();
 for(let z=0;z<scene.height;z++)for(let x=0;x<scene.width;x++)if(structural(x,z))for(const [dx,dz]of[[0,-1],[-1,0]]){
  // Native room dividers are only .85m high. A full-height wall panel cannot
  // be carried by one of those low partitions.
  if(structural(x+dx,z+dz)||partitions.has((x+dx)+','+(z+dz))||doorway(x,z,dx,dz))continue;
  const axis=dx?'z':'x',fixed=dx?x:z,key=axis+':'+fixed;
  if(!runs.has(key))runs.set(key,{axis,fixed,spans:[]});runs.get(key).spans.push(dx?z:x);
 }
 const walls=[];for(const r of runs.values()){
  r.spans.sort((a,b)=>a-b);for(let i=0;i<r.spans.length;){const start=r.spans[i];let end=start+1;i++;while(i<r.spans.length&&r.spans[i]===end){end++;i++;}if(end-start>=1.6)walls.push({axis:r.axis,fixed:r.fixed,start,end});}
 }
 const furnishings=(scene.objects||[]).filter(o=>o.type==='furnishing'&&o.footprint);
 const windows=furnishings.filter(o=>o.furniture===18);
 return {scene,structural,walk,walls,windows,furnishings};
}

function wallPoint(r,u,y,inset=-.004){return r.axis==='x'?[u,y,r.fixed+inset]:[r.fixed+inset,y,u];}
function wallBox(mesh,r,u,y,w,h,d,color,mat=6,em=0,front=-.012){
 // Each layer has its own exposed skin. A common front plane causes the
 // software painter and GPU depth buffer to disagree across panel diagonals.
 const at=wallPoint(r,u,y,front-d/2);mesh.box(...at,r.axis==='x'?w:d,h,r.axis==='x'?d:w,color,mat,em);
}
function wallQuad(mesh,r,points,color,mat=6,em=0,alpha=1){
 const signed=points.reduce((sum,q,i)=>{const n=points[(i+1)%points.length];return sum+q[0]*n[1]-n[0]*q[1];},0);
 const p=(signed<0?points.slice().reverse():points).map(([u,y])=>wallPoint(r,u,y,-.004));
 if(r.axis==='x')mesh.quad(p[0],p[1],p[2],p[3],color,mat,em,alpha,[0,0,1]);
 else mesh.quad(p[3],p[2],p[1],p[0],color,mat,em,alpha,[1,0,0]);
}

function wallCraft(mesh,r,spec,windows){
 const c=spec.palette,f=spec.family,length=r.end-r.start,industrial=f==='industrial'||/reactor|console|security|pump|vent/.test(spec.program),wet=f==='water'||spec.program==='washroom',timber=['home','hospitality','craft'].includes(f)&&!industrial;
 const lower=timber?mix(c.wood,c.accent,.13):wet?mix(c.metal,c.accent,.35):mix(c.wall,c.dark,.25);
 wallBox(mesh,r,(r.start+r.end)/2,.36,length-.025,.62,.045,lower,timber?2:6);
 wallBox(mesh,r,(r.start+r.end)/2,.73,length-.02,.075,.065,c.edge);
 const count=Math.max(1,Math.min(4,Math.floor(length/2.4))),step=length/count;
 for(let i=0;i<count;i++){
  const u=r.start+step*(i+.5),w=Math.min(2.05,step-.22),y=1.58,h=1.18;
  if(windows.some(o=>{const q=o.footprint,x=q.x+q.w/2,z=q.y+q.h/2;return r.axis==='x'?Math.abs(z-r.fixed)<1.3&&Math.abs(x-u)<(w+q.w)/2+.18:Math.abs(x-r.fixed)<1.3&&Math.abs(z-u)<(w+q.h)/2+.18;}))continue;
  const panel=industrial?mix(c.metal,c.dark,.36):f==='archive'?mix(c.accent,c.dark,.42):f==='care'?mix(c.ivory,c.accent,.15):f==='garden'?mix(c.foliage,c.dark,.28):mix(c.wall,c.ivory,.28);
  wallBox(mesh,r,u,y,w,h,.028,tint(c.dark,.82),6,0,-.040);
  wallBox(mesh,r,u,y,w-.10,h-.10,.022,panel,6,0,-.026);
  for(const side of[-1,1])wallBox(mesh,r,u+side*(w/2+.018),y,.065,h+.12,.055,c.edge);
  for(const yy of[y-h/2-.025,y+h/2+.025])wallBox(mesh,r,u,yy,w+.11,.065,.055,c.edge);
  if(industrial){
   for(let j=0;j<3;j++)wallBox(mesh,r,u+(j-1)*w*.21,y,w*.12,h*.72,.033,tint(c.accent,.78));
   wallQuad(mesh,r,[[u-w*.33,y-h*.23],[u-w*.1,y-h*.23],[u+w*.33,y+h*.23],[u+w*.1,y+h*.23]],c.copper);
  }else if(wet||f==='care'){
   for(const yy of[y-.27,y+.27])wallBox(mesh,r,u,yy,w*.86,.052,.033,tint(c.accent,.86));
   wallQuad(mesh,r,[[u-.18,y],[u,y+.21],[u+.18,y],[u,y-.21]],mix(c.edge,c.ivory,.45));
  }else if(['archive','civic'].includes(f)){
   // A broad carved fan is an architectural relief, not another text plaque.
   const top=wallPoint(r,u,y+.38);
   for(let k=0;k<5;k++){
    const a=-Math.PI*.92+k*Math.PI*.21,b=a+Math.PI*.19,rad=Math.min(.55,w*.3),A=wallPoint(r,u+Math.cos(a)*rad,y+.02+Math.sin(a)*rad),B=wallPoint(r,u+Math.cos(b)*rad,y+.02+Math.sin(b)*rad);
    if(r.axis==='x')mesh.tri(top,A,B,k%2?c.edge:mix(c.edge,c.ivory,.30),6);else mesh.tri(top,B,A,k%2?c.edge:mix(c.edge,c.ivory,.30),6);
   }
   wallBox(mesh,r,u,y-.38,w*.56,.08,.038,c.edge);
  }else if(f==='garden'){
   for(const side of[-1,1])wallQuad(mesh,r,[[u+side*.1,y-.43],[u+side*.35,y-.09],[u+side*.26,y+.33],[u+side*.05,y+.06]],tint(c.foliage,side>0?1.18:.88));
  }else{
   wallQuad(mesh,r,[[u-w*.32,y-.30],[u-w*.32,y+.30],[u+w*.32,y+.30],[u+w*.32,y-.30]],mix(c.accent,c.ivory,.43));
   for(const side of[-1,1])wallBox(mesh,r,u+side*w*.22,y,.055,h*.60,.03,tint(c.wood,1.15));
  }
 }
}

function verticalRing(mesh,x,y,z,inner,outer,color,n=12){
 for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;mesh.quad([x+Math.cos(a)*inner,y+Math.sin(a)*inner,z],[x+Math.cos(a)*outer,y+Math.sin(a)*outer,z],[x+Math.cos(b)*outer,y+Math.sin(b)*outer,z],[x+Math.cos(b)*inner,y+Math.sin(b)*inner,z],color,6);}
}
function leaf(mesh,x,y,z,w,h,color,turn=0){
 const ux=Math.cos(turn)*w,uz=Math.sin(turn)*w;
 const points=[[x-ux,y,z-uz],[x,y+h*.55,z+.025],[x+ux,y,z+uz],[x,y-h*.12,z-.015]];
 if(ux>0)points.reverse();mesh.quad(...points,color,6,0,1,[0,.35,1]);
}
function solidFootprint(scene,f){
 for(let z=Math.floor(f.y);z<Math.ceil(f.y+f.h);z++)for(let x=Math.floor(f.x);x<Math.ceil(f.x+f.w);x++)if(scene.floor[z]?.[x]==='.')return false;
 return true;
}
function topQuad(mesh,x,z,w,d,y,color,alpha=1){mesh.quad([x-w/2,y,z-d/2],[x-w/2,y,z+d/2],[x+w/2,y,z+d/2],[x+w/2,y,z-d/2],color,6,0,alpha,[0,1,0]);}
function cup(mesh,x,y,z,r,c){mesh.cylinder(x,y+r*.55,z,r,r*1.1,c,6,8,r*.90);mesh.cylinder(x,y+r*1.12,z,r*.76,.015,INK,6,8);}

function furnishingCraft(mesh,o,spec){
 const f=o.footprint,x=f.x+f.w/2,z=f.y+f.h/2,w=f.w*.79,d=f.h*.79,c=spec.palette,id=o.furniture,visual=o.visual||'',kind=spec.program;
 if([0,11].includes(id)){
  const quilt=id===11?mix(c.ivory,c.accent,.15):mix(c.accent,rgb('#497686'),.48),back=z-d*.28;
  for(let k=0;k<3;k++)topQuad(mesh,x+(k-1)*w*.24,z+d*.14,w*.235,d*.47,.654,k===1?mix(quilt,c.ivory,.32):quilt);
  for(const side of[-1,1])mesh.box(x+side*w*.27,.702,back,w*.37,.11,d*.18,c.ivory,6);
  if(id===11){
   for(const side of[-1,1])mesh.box(x+side*w*.44,1.12,z-d*.43,.045,1.38,.045,c.metal,6);
   mesh.box(x,1.78,z-d*.43,w*.92,.045,.045,c.metal,6);
   for(const side of[-1,1]){mesh.box(x+side*w*.31,1.26,z-d*.43,w*.20,.92,.026,mix(c.ivory,c.accent,.12),6);mesh.box(x+side*w*.31,1.28,z-d*.41,w*.036,.84,.014,tint(c.accent,.83),6);}
  }else{
   for(const side of[-1,1])mesh.box(x+side*w*.39,.97,z-d*.44,.09,.48,.08,c.edge,6);
   mesh.box(x,.98,z-d*.44,w*.84,.09,.08,c.edge,6);
  }
 }else if(id===5){
  topQuad(mesh,x,z,w*.30,d*.94,.842,mix(c.ivory,c.accent,.2));
  for(const side of[-1,1])cup(mesh,x+side*w*.28,.84,z+d*.19,.10,side>0?c.accent:c.ivory);
  mesh.cylinder(x,.87,z-d*.12,Math.min(w,d)*.18,.055,c.ivory,6,10);
  mesh.box(x,.929,z-d*.13,w*.26,.07,d*.13,rgb('#bd8d51'),6);
 }else if(id===3||id===4){
  // The range's existing stone mass remains. Copper vessels make its purpose
  // and the warm side of the room readable from the normal game camera.
  const y=id===3?1.24:1.16;
  for(const side of[-1,1]){const xx=x+side*w*.24;mesh.cylinder(xx,y,z,Math.min(w,d)*.12,.19,c.copper,6,9);mesh.cylinder(xx,y+.115,z,Math.min(w,d)*.10,.035,c.metal,6,9);}
  if(id===4)mesh.box(x,1.12,z+d*.22,w*.76,.06,.12,c.edge,6);
 }else if(id===6){
  mesh.box(x-w*.28,.86,z+d*.22,w*.31,.055,d*.24,c.ivory,6);
  for(let k=0;k<3;k++)mesh.box(x-w*.28,.89+k*.035,z+d*.22,w*.28,.025,d*.20,mix(c.ivory,c.accent,k*.12),6);
  mesh.tube([x+w*.23,.87,z-d*.17],[x+w*.23,1.18,z-d*.17],.035,.035,c.copper,6,5);
  mesh.tube([x+w*.23,1.18,z-d*.17],[x+w*.23,1.18,z+.03],.035,.035,c.copper,6,5);
 }else if(id===21||visual==='textiles'){
  for(const side of[-1,1])mesh.box(x+side*w*.34,1.28,z-d*.2,.09,1.12,.10,c.wood,2);
  mesh.box(x,1.80,z-d*.2,w*.77,.10,.12,c.edge,6);mesh.box(x,.92,z-d*.2,w*.77,.10,.12,c.wood,2);
  mesh.quad([x-w*.29,.97,z-d*.18],[x+w*.29,.97,z-d*.18],[x+w*.29,1.72,z-d*.18],[x-w*.29,1.72,z-d*.18],mix(c.accent,rgb('#8f687d'),.46),6,0,1,[0,0,1]);
  for(const side of[-1,1])mesh.box(x+side*w*.21,1.34,z-d*.16,w*.055,.69,.022,c.ivory,6);
  mesh.cylinder(x,1.78,z-d*.21,.10,w*.1,c.copper,6,8);
 }else if(id===23||visual==='hydrophone'){
  mesh.cylinder(x+w*.23,.98,z+d*.15,Math.min(w,d)*.21,.15,c.copper,6,12);
  mesh.cylinder(x+w*.23,1.07,z+d*.15,Math.min(w,d)*.18,.018,mix(c.accent,c.ivory,.28),4,12,Math.min(w,d)*.18,.09);
  for(let k=0;k<4;k++){const xx=x-w*.33+k*w*.14,h=.72+k*.12;mesh.cylinder(xx,.88+h/2,z-d*.19,.055,h,k%2?c.copper:c.metal,6,7);mesh.cylinder(xx,.90+h,z-d*.19,.074,.06,c.edge,6,7);}
  mesh.box(x,1.11,z+d*.34,w*.44,.06,.12,c.wood,2);
 }else if(kind==='optics'&&[8,22].includes(id)){
  const a=[x-w*.22,1.13,z-d*.20],b=[x+w*.13,1.48,z+d*.26];mesh.tube(a,b,.16,.125,c.copper,6,10);
  mesh.sphere(...b,.14,mix(c.accent,c.ivory,.3),4,.10,8,4,[1,1,.6]);
  mesh.tube([x,.84,z],[x,1.22,z],.07,.065,c.metal,6,7);
 }else if(visual==='pumping'){
  const yy=1.24,zz=z+d*.30,r=Math.min(.40,w*.25,d*.33);verticalRing(mesh,x,yy,zz,r*.72,r,c.copper,12);
  for(let k=0;k<4;k++){const a=k*Math.PI/2;mesh.tube([x,yy,zz],[x+Math.cos(a)*r*.85,yy+Math.sin(a)*r*.85,zz],.025,.025,c.edge,6,4);}
  for(const side of[-1,1]){const xx=x+side*w*.31;mesh.tube([xx,.83,z-d*.13],[xx,1.70,z-d*.13],.065,.065,c.metal,6,6);mesh.cylinder(xx,1.59,z-d*.13,.11,.10,c.copper,6,8);}
 }else if(visual==='ceramics'||kind==='pottery'&&id===8){
  for(let k=0;k<3;k++){const xx=x+(k-1)*w*.24,r=Math.min(w*.13,d*.15);mesh.cylinder(xx,1.02,z+d*.08,r,.34,k%2?c.accent:c.copper,6,10,r*.7);mesh.cylinder(xx,1.20,z+d*.08,r*.62,.04,c.edge,6,10);}
  mesh.cylinder(x,1.02,z-d*.26,Math.min(w,d)*.23,.07,c.metal,6,12);
 }else if(id===8||id===9||visual==='joinery'){
  mesh.box(x,1.37,z-d*.36,w*.80,.78,.07,tint(c.wood,.83),2);
  for(let k=0;k<3;k++){const xx=x+(k-1)*w*.24;mesh.box(xx,1.28,z-d*.30,.08,.41,.06,c.edge,6);mesh.box(xx,1.53,z-d*.28,.23,.105,.055,c.metal,6);}
  mesh.box(x+w*.22,.97,z+d*.17,w*.25,.19,d*.23,c.metal,6);
  mesh.box(x+w*.22,1.08,z+d*.17,w*.36,.05,d*.21,c.edge,6);
  mesh.box(x-w*.17,.87,z+d*.12,w*.31,.055,d*.43,c.ivory,6);
 }else if(id===7){
  const y=.88;
  mesh.quad([x-w*.31,y,z-d*.15],[x-w*.04,y+.10,z-d*.15],[x-w*.04,y+.10,z+d*.18],[x-w*.31,y,z+d*.18],c.ivory,6);
  mesh.quad([x-w*.04,y+.10,z-d*.15],[x+w*.24,y,z-d*.15],[x+w*.24,y,z+d*.18],[x-w*.04,y+.10,z+d*.18],tint(c.ivory,.91),6);
  mesh.box(x+w*.32,1.10,z-d*.21,.045,.44,.045,c.copper,6);mesh.cylinder(x+w*.32,1.34,z-d*.21,.16,.08,c.accent,6,8,.11);
 }else if(id===2){
  // Wide leather folios and tied rolls belong on the existing cabinet crown;
  // its native saved-state doors and open shelves stay unobstructed.
  for(let k=0;k<3;k++){const xx=x+(k-1)*w*.24;mesh.box(xx,1.82,z,w*.20,.12,d*.60,k%2?c.accent:mix(c.copper,c.dark,.22),6);mesh.box(xx,1.90,z,w*.17,.035,d*.55,c.ivory,6);}
 }else if(id===10){
  for(let k=0;k<3;k++){const xx=x+(k-1)*w*.25;mesh.cylinder(xx,1.87,z,.075,.26,k%2?c.accent:c.ivory,6,8,.09);mesh.cylinder(xx,2.02,z,.06,.045,c.copper,6,8);}
 }else if(id===17){
  const stem=[x,.74,z];for(let k=0;k<7;k++){const a=k*TAU/7,h=.99+(k%3)*.14;mesh.tube(stem,[x+Math.cos(a)*w*.20,h,z+Math.sin(a)*d*.20],.015,.010,c.foliage,6,4);leaf(mesh,x+Math.cos(a)*w*.22,h,z+Math.sin(a)*d*.22,Math.min(w,d)*.18,.32,tint(c.foliage,.82+(k%3)*.13),a);}
 }else if([14,15].includes(id)){
  topQuad(mesh,x,z+d*.15,w*.72,d*.38,.658,mix(c.accent,rgb('#9b6d72'),.28));
  mesh.box(x+w*.18,.86,z-d*.23,w*.37,.22,.10,c.ivory,6);
 }else if(id===22){
  for(const side of[-1,1])mesh.box(x+side*w*.31,1.28,z-d*.20,.08,1.0,.09,c.wood,2);
  mesh.box(x,1.67,z-d*.20,w*.73,.09,.09,c.edge,6);
  mesh.quad([x-.11,.94,z-d*.14],[x+.02,.95,z-d*.14],[x+.30,1.53,z-d*.14],[x+.15,1.59,z-d*.14],c.ivory,6,0,1,[0,0,1]);
  mesh.box(x+.08,1.46,z-d*.12,.39,.045,.065,c.copper,6);
 }else if([1,19,20].includes(id)){
  const y=id===20?.87:1.82;
  mesh.box(x,y,z,w*.74,.055,d*.72,c.edge,6);
  if(id===19){for(const side of[-1,1])cup(mesh,x+side*w*.23,y+.04,z,.12,side>0?c.ivory:c.accent);}
  else{mesh.box(x,y+.10,z,w*.42,.13,d*.38,c.accent,6);mesh.box(x,y+.18,z,w*.38,.025,d*.34,c.ivory,6);}
 }
}

function windowCraft(mesh,p,o,spec){
 const f=o.footprint,c=spec.palette,x=f.x+f.w/2,z=f.y+f.h/2;
 const direction=[[0,1],[1,0],[-1,0],[0,-1]].find(([dx,dz])=>p.structural(Math.floor(x+dx),Math.floor(z+dz)))||[0,1],side=direction[0]!==0;
 const xx=x+direction[0]*.43,zz=z+direction[1]*.43,w=(side?f.h:f.w)*.94;
 const box=(u,y,W,H,D,color)=>mesh.box(xx+(side?0:u),y,zz+(side?u:0),side?D:W,H,side?W:D,color,6);
 if(solidFootprint(p.scene,f)){
  box(0,.99,w+.04,.11,.055,c.edge);box(0,2.24,w+.05,.09,.055,c.edge);
  for(const sign of[-1,1])box(sign*w*.46,1.61,.095,1.27,.06,c.edge);
  for(const sign of[-1,1])box(sign*w*.38,1.63,.065,1.08,.064,mix(c.accent,c.ivory,.35));
 }
 // The luminous patch occupies existing walking cells only. It is a thin
 // surface response, so it cannot become a new invisible furniture blocker.
 const start=[Math.floor(x)+direction[0],Math.floor(z)+direction[1]],shade=mix(c.ivory,c.accent,.22);
 for(let d=0;d<3;d++)for(const offset of[-1,0,1]){
  const X=start[0]+direction[0]*d+(side?0:offset),Z=start[1]+direction[1]*d+(side?offset:0);
  if(!p.walk(X,Z))continue;
  topQuad(mesh,X+.5,Z+.5,.97,.97,.048,shade,(d===0?.13:d===1?.075:.035)*(offset===0?1:.55));
 }
}
function rugCraft(mesh,p,o,spec){
 const f=o.footprint,c=spec.palette;
 for(let z=f.y;z<f.y+f.h;z++)for(let x=f.x;x<f.x+f.w;x++)if(p.walk(x,z)){
  const edge=x===f.x||x===f.x+f.w-1||z===f.y||z===f.y+f.h-1;
  topQuad(mesh,x+.5,z+.5,.94,.94,.045,edge?mix(c.accent,c.copper,.2):mix(c.accent,c.dark,.18));
  if(edge){const u=.21;mesh.quad([x+.5-u,.049,z+.5],[x+.5,.049,z+.5+u],[x+.5+u,.049,z+.5],[x+.5,.049,z+.5-u],c.ivory,6,0,1,[0,1,0]);}
 }
}

export function appendInteriorCraft(mesh,{world}={}){
 const spec=interiorCraftSpec(world);if(!spec||!mesh?.v)return {family:null,triangles:0,groups:[]};
 const before=mesh.v.length,p=plan(world),groups=[];
 const emit=(name,draw)=>{const start=mesh.v.length;draw();if((mesh.v.length-before)/36>MAX_TRIANGLES)mesh.v.length=start;return(mesh.v.length-start)/36;};
 const group=(name,draw)=>{const start=mesh.v.length;draw();groups.push({name,triangles:(mesh.v.length-start)/36});};
 group('furnishings',()=>{
  const priority=o=>o.visual?0:[0,11,21,22,23,8,17].includes(o.furniture)?1:2;
  const sorted=p.furnishings.filter(o=>![16,18].includes(o.furniture)&&solidFootprint(p.scene,o.footprint)).sort((a,b)=>priority(a)-priority(b));
  for(const o of sorted)emit('furniture',()=>furnishingCraft(mesh,o,spec));
 });
 group('windows',()=>{for(const o of p.windows.slice(0,8))emit('window',()=>windowCraft(mesh,p,o,spec));});
 group('textiles',()=>{for(const o of p.furnishings.filter(o=>o.furniture===16))emit('rug',()=>rugCraft(mesh,p,o,spec));});
 group('walls',()=>{for(const r of p.walls.slice(0,18))emit('panel',()=>wallCraft(mesh,r,spec,p.windows));});
 return {family:spec.family,program:spec.program,triangles:(mesh.v.length-before)/36,groups};
}
