/** The Listening Headland. Authored architecture for Veyr's compact observatory.
 * Geometry follows observatory-layout's real walk mask and semantic stations.
 * This replaces the old maze extrusion and service-cover field in these two
 * places. It owns visual forms only; the native origin state owns every action.
 */
import {appendObservatoryDetail} from './observatory-detail.js?v=5.40.1';
import {appendObservatoryReceiver} from './observatory-receiver.js?v=5.40.1';
const TAU=Math.PI*2;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const P=Object.freeze({
 stone:rgb('#9f9073'),light:rgb('#cebb92'),joint:rgb('#756d59'),
 cliff:rgb('#475365'),cliffDark:rgb('#243849'),cut:rgb('#756a58'),
 copper:rgb('#773d2a'),copperLight:rgb('#b58549'),patina:rgb('#14665f'),
 dark:rgb('#132b34'),wood:rgb('#503b2e'),glass:rgb('#e6a65b'),
 signal:rgb('#42c5ad'),water:rgb('#0d3449'),leaf:rgb('#68743d')
});
const k=(x,z)=>x+','+z;
const center=a=>Array.isArray(a)?{x:a[0]+.5,z:a[1]+.5}:a;
const inRect=(x,z,r)=>x>=r.x&&x<r.x+r.w&&z>=r.z&&z<r.z+r.d;
const walk=(s,x,z)=>s.floor?.[Math.floor(z)]?.[Math.floor(x)]==='.';
export function isObservatory(world){return world?.scene?.originId==='veyr-storm'&&world.scene.observatory?.schema===1;}

export function observatoryScenePlan(world){
 if(!isObservatory(world))return null;
 const scene=world.scene,spec=scene.observatory,part=spec.part??scene.originPart,mast=spec.mastrect||spec.mast;
 const body={x:mast.x+mast.w/2,z:mast.z+mast.d/2,w:mast.w,d:mast.d};
 const lodge=part===0?{x:2,z:7,w:5,d:9}:{x:12,z:1,w:4,d:3};
 const a=Object.fromEntries(Object.entries(spec.anchors||{}).map(([name,xy])=>[name,center(xy)]));
 const gate=part===0?{x:10.5,z:20.55,width:5.8}:{x:9.5,z:17.8,width:5.8};
 return {scene,part,spec,mast,body,lodge,anchors:a,gate,groundY:.02,
  cameraFocus:{x:body.x,z:part===0?12.6:10.8},
  palette:P};
}

function polygon(mesh,points,y,color,material=6){
 const c=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];mesh.tri([c[0],y,c[1]],[a[0],y,a[1]],[b[0],y,b[1]],color,material,0,1,[0,1,0]);}
}
function octagon(x,z,w,d,bevel=.22){const X=w/2,Z=d/2,b=Math.min(bevel,X*.4,Z*.4);return [[-X+b,-Z],[X-b,-Z],[X,-Z+b],[X,Z-b],[X-b,Z],[-X+b,Z],[-X,Z-b],[-X,-Z+b]].map(([a,c])=>[x+a,z+c]);}
function taperedBlock(mesh,x,z,w,d,low,high,color,{inset=.12,material=6}={}){
 const a=octagon(x,z,w,d),b=octagon(x,z,w-inset*2,d-inset*2);
 polygon(mesh,b,high,tint(color,1.10),material);
 for(let i=0;i<a.length;i++){const j=(i+1)%a.length;mesh.quad([a[j][0],low,a[j][1]],[a[i][0],low,a[i][1]],[b[i][0],high,b[i][1]],[b[j][0],high,b[j][1]],tint(color,.78+(i%4)*.045),material);}
}
function explicitBox(mesh,x,y,z,w,h,d,color,mat=6,em=0,rot=0){mesh.box(x,y,z,w,h,d,color,mat,em,rot);}

function coastPoint(plan,x,z,layer){
 const cx=plan.scene.width/2,cz=plan.scene.height*.48,weight=Math.min(1,Math.max(0,-layer.y)/2.4);
 // Shared coordinates use the same erosion at every seam. The walking rim
 // stays exact while the exposed rock below it loses its ruler-straight sides.
 const dx=(Math.sin(x*.81+z*.37)*.17+Math.sin(z*1.23-x*.29)*.08)*weight;
 const dz=(Math.sin(z*.73-x*.41)*.16+Math.cos(x*1.11+z*.23)*.08)*weight;
 return[cx+(x-cx)*layer.scale+dx,layer.y,cz+(z-cz)*layer.scale+dz];
}

function foundation(mesh,plan){
 const s=plan.scene,mast=plan.mast,lodge=plan.lodge;
 const land=(x,z)=>s.floor?.[z]?.[x]==='.'||inRect(x+.5,z+.5,mast)||inRect(x+.5,z+.5,lodge);
 const bevel=.32;
 const layers=[{y:.005,scale:1,col:P.cut},{y:-.55,scale:1.04,col:P.cliff},{y:-2.4,scale:1.075,col:P.cliffDark},{y:-5.9,scale:1.14,col:tint(P.cliffDark,.66)}];
 const pt=(x,z,layer)=>coastPoint(plan,x,z,layer);
 // The coast shares the rock swatch, but stays in physical depth bands. The
 // legacy buried-foundation tag (7) would paint this exposed cliff under sea.
 const face=(a,c,tone=1)=>{for(let i=0;i<layers.length-1;i++){const l=layers[i],n=layers[i+1];mesh.quad(pt(c[0],c[1],n),pt(a[0],a[1],n),pt(a[0],a[1],l),pt(c[0],c[1],l),tint(l.col,tone),6.25);}};
 for(let z=0;z<s.height;z++)for(let x=0;x<s.width;x++)if(land(x,z)){
  const n=!land(x,z-1),e=!land(x+1,z),b=!land(x,z+1),w=!land(x-1,z),tone=.94+.06*Math.sin((x+z*1.7)*.9);
  if(n)face([x+(w?bevel:0),z],[x+1-(e?bevel:0),z],tone);
  if(e)face([x+1,z+(n?bevel:0)],[x+1,z+1-(b?bevel:0)],tone*.89);
  if(b)face([x+1-(e?bevel:0),z+1],[x+(w?bevel:0),z+1],tone*.83);
  if(w)face([x,z+1-(b?bevel:0)],[x,z+(n?bevel:0)],tone*.76);
  if(n&&w)face([x,z+bevel],[x+bevel,z],tone*.88);
  if(n&&e)face([x+1-bevel,z],[x+1,z+bevel],tone*.94);
  if(b&&e)face([x+1,z+1-bevel],[x+1-bevel,z+1],tone*.80);
  if(b&&w)face([x+bevel,z+1],[x,z+1-bevel],tone*.73);
 }
 // Small quads are deliberately retained. A single horizon-sized triangle can
 // cross the software near plane and collapse into the former jagged holes.
 for(let z=-78;z<62;z+=4)for(let x=-38;x<62;x+=4){
  const tone=.94+.055*Math.sin(z*.17)+.025*Math.sin(x*.11+z*.07);
  mesh.quad([x,-5.25,z],[x,-5.25,z+4],[x+4,-5.25,z+4],[x+4,-5.25,z],tint(P.water,tone),6,0,1,[0,1,0]);
 }
}

function courts(mesh,plan){
 const s=plan.scene,bevel=.32;
 for(let z=0;z<s.height;z++)for(let x=0;x<s.width;x++)if(walk(s,x+.5,z+.5)){
  const n=!walk(s,x+.5,z-.5),e=!walk(s,x+1.5,z+.5),b=!walk(s,x+.5,z+1.5),w=!walk(s,x-.5,z+.5);
  const corners=[n&&w?[[x+bevel,z],[x,z+bevel]]:[[x,z]],b&&w?[[x,z+1-bevel],[x+bevel,z+1]]:[[x,z+1]],b&&e?[[x+1-bevel,z+1],[x+1,z+1-bevel]]:[[x+1,z+1]],n&&e?[[x+1,z+bevel],[x+1-bevel,z]]:[[x+1,z]]].flat();
  const tone=1+.025*Math.sin(x*.25+z*.13);polygon(mesh,corners,.02,tint(P.stone,tone),0);
 }
 // An armillary floor inlay belongs to the main receiver, creating one focal
 // architectural composition instead of a field of unrelated rectangular pads.
 const b=plan.body;mesh.ring(b.x,.030,b.z,2.20,2.25,tint(P.patina,.78),6,0,1,64);
 for(let i=0;i<8;i++){const a=i*TAU/8,from={x:b.x+Math.cos(a)*2.29,z:b.z+Math.sin(a)*2.29},to={x:b.x+Math.cos(a)*2.53,z:b.z+Math.sin(a)*2.53};
  if(walk(s,from.x,from.z)&&walk(s,to.x,to.z))flushStrip(mesh,from,to,.045,P.copperLight,.032);
 }
 const a=plan.anchors.arrival;
 if(a)for(const side of[-1,1])for(let z=Math.floor(a.z)-3;z<a.z+.8;z++){
  const x=a.x+side*1.3;if(walk(s,x,z+.5))explicitBox(mesh,x,.031,z+.5,.055,.012,.93,P.copperLight);
 }
}

function stormChart(mesh,plan){
 // The broad working court is a weather instrument: a flush wind rose gives
 // its open floor a designed centre without introducing another obstacle.
 const x=plan.part===0?11.5:9.5,z=plan.part===0?14:12.5,r=2.32;
 const clear=points=>points.every(p=>walk(plan.scene,p[0],p[2]));
 for(const [inner,outer,col]of[[r-.045,r,P.copperLight],[r-.27,r-.245,P.patina],[.76,.79,P.copperLight]]){
  for(let i=0;i<64;i++){
   const a=i*TAU/64,b=(i+1)*TAU/64,points=[[x+Math.cos(a)*inner,.033,z+Math.sin(a)*inner],[x+Math.cos(b)*inner,.033,z+Math.sin(b)*inner],[x+Math.cos(b)*outer,.033,z+Math.sin(b)*outer],[x+Math.cos(a)*outer,.033,z+Math.sin(a)*outer]];
   if(clear(points))mesh.quad(...points,col,6,0,1,[0,1,0]);
  }
 }
 for(let i=0;i<8;i++){
  const a=i*TAU/8,c=Math.cos(a),s=Math.sin(a),tip=i%2?1.68:2.04;
  const A=[x+c*tip,.035,z+s*tip],B=[x-s*.24+c*.58,.035,z+c*.24+s*.58],C=[x+c*.20,.035,z+s*.20],D=[x+s*.24+c*.58,.035,z-c*.24+s*.58];
  if(clear([A,B,C,D])){mesh.tri(A,B,C,i%2?P.patina:P.copperLight,6,0,1,[0,1,0]);mesh.tri(A,C,D,i%2?P.dark:P.patina,6,0,1,[0,1,0]);}
  for(let j=0;j<3;j++){
   const angle=a+(j-1)*.075,A={x:x+Math.cos(angle)*(r+.07),z:z+Math.sin(angle)*(r+.07)},B={x:x+Math.cos(angle)*(r+(j===1?.25:.15)),z:z+Math.sin(angle)*(r+(j===1?.25:.15))};
   if(walk(plan.scene,A.x,A.z)&&walk(plan.scene,B.x,B.z))flushStrip(mesh,A,B,.025,P.copperLight,.034);
  }
 }
 mesh.disc(x,.036,z,.23,.23,P.dark,6,1,24);mesh.ring(x,.037,z,.12,.15,P.copperLight,6,0,1,24);
}

function verticalArch(mesh,x,z,width,spring,rise,depth,color){
 const radius=width/2,t=.27,n=18;
 for(const side of[-1,1])taperedBlock(mesh,x+side*(radius+t/2),z,.62,depth+.18,0,spring,color,{inset:.035});
 for(let i=0;i<n;i++){
  const a=i*Math.PI/n,b=(i+1)*Math.PI/n;
  const p=(r,t,d)=>[x+Math.cos(t)*r,spring+Math.sin(t)*rise*(r/radius),z+d];
  const f=[p(radius,a,-depth/2),p(radius+t,a,-depth/2),p(radius+t,b,-depth/2),p(radius,b,-depth/2)],back=f.map(v=>[v[0],v[1],z+depth/2]);
  mesh.quad(...f,tint(color,i%2?1:.91),6);mesh.quad(back[3],back[2],back[1],back[0],tint(color,.80),6);
  mesh.quad(f[0],f[3],back[3],back[0],tint(color,.65),6);mesh.quad(f[1],back[1],back[2],f[2],tint(color,1.12),6);
 }
}
function gate(mesh,plan){
 const g=plan.gate;
 if(plan.part===0)verticalArch(mesh,g.x,g.z,g.width,1.85,1.45,.60,P.stone);
 else for(const side of[-1,1]){const x=g.x+side*3;taperedBlock(mesh,x,g.z,.75,.8,0,1.26,P.cut,{inset:.10});explicitBox(mesh,x,1.33,g.z,.86,.13,.91,P.copper);}
 for(const side of[-1,1]){
  const x=g.x+side*3.0,z=g.z+.18;
  explicitBox(mesh,x,1.55,z,.24,.40,.24,P.dark);explicitBox(mesh,x,1.55,z+.13,.17,.27,.025,P.glass,4,.27);
  explicitBox(mesh,x,1.80,z,.34,.07,.34,P.copper);
 }
}

function lodge(mesh,plan){
 const r=plan.lodge,x=r.x+r.w/2,z=r.z+r.d/2;
 taperedBlock(mesh,x,z,r.w-.04,r.d-.04,-.10,.26,P.cut,{inset:.08});
 // A solid closed building sits beside the open operator porch.
 explicitBox(mesh,x,1.58,z,r.w-.10,2.65,r.d-.10,P.stone,0);
 explicitBox(mesh,x,.40,z,r.w-.02,.19,r.d-.02,P.joint);
 explicitBox(mesh,x,2.90,z,r.w+.25,.15,r.d+.25,P.copper);
 for(const side of[-1,1])explicitBox(mesh,x+side*(r.w/2-.10),1.67,z+r.d/2-.085,.18,2.37,.14,P.light);
 const front=z+r.d/2-.022;
 // Deep round receiving windows cast warm light onto the porch.
 for(const xx of[x-.92,x+.92]){
  explicitBox(mesh,xx,1.58,front,.88,1.00,.014,P.dark);
  explicitBox(mesh,xx,1.60,front+.006,.66,.78,.008,P.glass,4,.12);
  for(const off of[-.34,0,.34])explicitBox(mesh,xx+off,1.60,front+.008,.045,.87,.014,P.wood);
  for(const y of[1.18,1.60,2.02])explicitBox(mesh,xx,y,front+.008,.80,.045,.014,P.wood);
  explicitBox(mesh,xx,1.08,front-.005,1.02,.12,.045,P.cut);
 }
 // A barrel-vault copper roof has an actual curved silhouette and end ribs.
 const W=(r.w+.55)/2,Z=(r.d+.42)/2,n=14,base=2.97,rise=1.05;
 for(let i=0;i<n;i++){
  const a=Math.PI*i/n,b=Math.PI*(i+1)/n,pa=[x+Math.cos(a)*W,base+Math.sin(a)*rise],pb=[x+Math.cos(b)*W,base+Math.sin(b)*rise];
  mesh.quad([pb[0],pb[1],z-Z],[pb[0],pb[1],z+Z],[pa[0],pa[1],z+Z],[pa[0],pa[1],z-Z],tint(i<7?P.patina:P.copper,.92+(i%3)*.055),i<7?6:1);
  for(const zz of[z-Z,z+Z])mesh.tube([pa[0],pa[1]+.015,zz],[pb[0],pb[1]+.015,zz],.032,.032,P.copperLight,6,4);
 }
 for(const zz of[z-Z+.55,z+Z-.55])for(let i=0;i<n;i++){
  const a=Math.PI*i/n,b=Math.PI*(i+1)/n;mesh.tube([x+Math.cos(a)*W,base+Math.sin(a)*rise+.016,zz],[x+Math.cos(b)*W,base+Math.sin(b)*rise+.016,zz],.013,.013,tint(P.copperLight,.80),6,4);
 }
 // The operator's receiver is attached to the closed front wall. Its shallow
 // face stays inside the building cell, within real reach of the open porch.
 const porch=plan.anchors.operator||plan.anchors.decision;
 if(porch){
  const cx=Math.max(r.x+.70,Math.min(r.x+r.w-.70,porch.x)),cz=front+.006;
  explicitBox(mesh,cx,.88,cz,1.16,.43,.010,P.dark);
  for(const side of[-1,1]){mesh.tube([cx+side*.33,.91,cz-.003],[cx+side*.33,.91,cz+.003],.11,.11,P.copperLight,6,10);}
  explicitBox(mesh,cx,.72,cz,.35,.055,.012,P.copperLight);
 }

}

function mastStatic(mesh,plan){
 const b=plan.body,x=b.x,z=b.z,scale=Math.min(b.w,b.d)/3;
 taperedBlock(mesh,x,z,b.w-.10,b.d-.10,.01,.24,P.joint,{inset:.16});
 taperedBlock(mesh,x,z,b.w-.43,b.d-.43,.24,.55,P.cut,{inset:.12});
 mesh.cylinder(x,3.25,z,.19,5.50,P.dark,6,14,.11);
 for(const [y,r] of[[.77,.49],[1.25,.34]])mesh.cylinder(x,y,z,r,.105,P.copper,6,18,r*.97);
 for(const [y,r] of[[2.65,.88],[5.35,.76]]){
  mesh.ring(x,y,z,r-.11,r+.015,P.copper,6,0,1,32);
  mesh.ring(x,y+.055,z,r-.10,r+.015,P.copperLight,6,0,1,32);
  for(let i=0;i<4;i++){const a=i*TAU/4+.4;mesh.tube([x,y,z],[x+Math.cos(a)*(r-.06),y,z+Math.sin(a)*(r-.06)],.028,.028,P.dark,6,5);}
 }
 for(const side of[-1,1]){
  mesh.tube([x+side*.93,.53,z+.65],[x+side*.16,4.85,z],.075,.047,P.patina,6,6);
  mesh.tube([x+side*.93,.53,z-.65],[x+side*.16,4.85,z],.075,.047,P.dark,6,6);
 }
 // A pair of concave receiving wings makes this unmistakably an antenna.
 const levels=12,outer=1.62;
 for(const sign of[-1,1])for(let i=0;i<levels;i++){
  const a=-Math.PI*.48+i*Math.PI*.96/levels,b=-Math.PI*.48+(i+1)*Math.PI*.96/levels;
  const p=t=>[x+Math.cos(t)*outer*sign,4.53+Math.sin(t)*1.30,z-.14+Math.cos(t)*.50];
  const q=t=>[x+Math.cos(t)*(outer-.20)*sign,4.53+Math.sin(t)*1.12,z+.02+Math.cos(t)*.52];
  mesh.quad(p(a),p(b),q(b),q(a),i%2?P.patina:tint(P.copper,.86),6);
  mesh.tube(p(a),p(b),.028,.028,P.copperLight,6,4);
 }
 mesh.cylinder(x,5.98,z,.12,.90,P.copperLight,6,10,.07);
 // Two wall-side coil pedestals are wholly within the non-walkable mast base.
 for(const side of[-1,1]){const xx=x+side*.74;mesh.cylinder(xx,.94,z+.40,.24,.70,P.dark,6,10,.19);for(let j=0;j<4;j++)mesh.cylinder(xx,.70+j*.16,z+.40,.32,.055,P.copper,6,12);}
 // Sagging aerial cables terminate on the real operator building, above heads.
 const r=plan.lodge,end=[r.x+r.w*.65,3.95,r.z+r.d*.65],start=[x,5.6,z];
 for(const off of[-.12,.12])for(let i=0;i<9;i++){
  const point=t=>[start[0]+(end[0]-start[0])*t+off,start[1]+(end[1]-start[1])*t-Math.sin(t*Math.PI)*.43,start[2]+(end[2]-start[2])*t];
  mesh.tube(point(i/9),point((i+1)/9),.014,.014,P.dark,6,4);
 }
}

function edgeFittings(mesh,plan){
 const s=plan.scene;
 if(plan.part===1){const q=plan.spec.spare||{x:2,z:10,w:1,d:1},xx=q.x+q.w/2,zz=q.z+q.d/2;
  if(!walk(s,xx,zz)){taperedBlock(mesh,xx,zz,.80,.80,0,.30,P.cut,{inset:.12});mesh.cylinder(xx,1.14,zz,.065,1.68,P.dark,6,9);explicitBox(mesh,xx,1.98,zz,.78,.08,.13,P.copperLight);mesh.cylinder(xx,2.12,zz,.08,.27,P.patina,6,9);}
 }
}

export function buildObservatoryGeometry(Geometry,C,world){
 const mesh=new Geometry(),plan=observatoryScenePlan(world);if(!plan)return mesh;
 foundation(mesh,plan);const foundationVertices=mesh.v.length/12;
 courts(mesh,plan);stormChart(mesh,plan);gate(mesh,plan);lodge(mesh,plan);mastStatic(mesh,plan);edgeFittings(mesh,plan);appendObservatoryDetail(mesh,plan);
 mesh.observatory={schema:1,part:plan.part,groundY:plan.groundY,foundationVertices,triangles:mesh.v.length/36};return mesh;
}

export function observatoryVisualState(world,feedback=null){
 const record=world?.state?.embodiedOrigins?.origins?.['veyr-storm']||{},choices=world?.state?.chronicle?.originId==='veyr-storm'?world.state.chronicle.choices||{}:{};
 const pending=feedback?.pending,active=pending?.object?.originId==='veyr-storm';
 return {receiver:!!record.receiver,grounded:!!record.grounded,repair:record.repair??choices.repair,choice:record.choice??choices.destiny,diverted:!!record.diverted,
  progress:active?clamp(pending.progress):0,pending:active?pending.object:null};
}

function flushStrip(mesh,a,b,width,color,y=.035,mat=6,em=0,alpha=1){
 const dx=b.x-a.x,dz=b.z-a.z,n=Math.hypot(dx,dz);if(n<.001)return;const ox=-dz/n*width/2,oz=dx/n*width/2;
 mesh.quad([a.x+ox,y,a.z+oz],[a.x-ox,y,a.z-oz],[b.x-ox,y,b.z-oz],[b.x+ox,y,b.z+oz],color,mat,em,alpha,[0,1,0]);
}

const SHORELINES=new WeakMap();
function shoreLines(plan){
 let old=SHORELINES.get(plan.scene);if(old&&old.floor===plan.scene.floor)return old.edges;
 const s=plan.scene,land=(x,z)=>s.floor?.[z]?.[x]==='.'||inRect(x+.5,z+.5,plan.mast)||inRect(x+.5,z+.5,plan.lodge),edges=[];
 const layer={y:-5.25,scale:1.075+.065*(5.25-2.4)/(5.9-2.4)};
 const add=(a,b,out)=>{const A=coastPoint(plan,...a,layer),B=coastPoint(plan,...b,layer);edges.push({a:{x:A[0],z:A[2]},b:{x:B[0],z:B[2]},out});};
 for(let z=0;z<s.height;z++)for(let x=0;x<s.width;x++)if(land(x,z)){
  if(!land(x,z-1))add([x,z],[x+1,z],[0,-1]);
  if(!land(x+1,z))add([x+1,z],[x+1,z+1],[1,0]);
  if(!land(x,z+1))add([x+1,z+1],[x,z+1],[0,1]);
  if(!land(x-1,z))add([x,z+1],[x,z],[-1,0]);
 }
 SHORELINES.set(s,{floor:s.floor,edges});return edges;
}
function shoreFoam(mesh,plan,time){
 const edges=shoreLines(plan);
 for(let i=0;i<edges.length;i++)for(let band=0;band<2;band++){
  const e=edges[i],phase=(Math.sin(time*.72+i*.27-band*.75)+1)/2,offset=.10+band*.32+phase*.15;
  const shift=p=>({x:p.x+e.out[0]*offset,z:p.z+e.out[1]*offset});
  const a=shift({x:e.a.x+(e.b.x-e.a.x)*.08,z:e.a.z+(e.b.z-e.a.z)*.08}),b=shift({x:e.a.x+(e.b.x-e.a.x)*.89,z:e.a.z+(e.b.z-e.a.z)*.89});
  flushStrip(mesh,a,b,.035+phase*.018,[.28,.47,.46],-5.19,9,0,(band?.035:.11)*(1-phase*.5));
 }
}
function floorRoute(scene,start,end){
 if(!start||!end)return[];const S=[Math.floor(start.x),Math.floor(start.z)],E=[Math.floor(end.x),Math.floor(end.z)],q=[S],seen=new Set([k(...S)]),prev=new Map();
 for(let i=0;i<q.length;i++){const [x,z]=q[i];if(x===E[0]&&z===E[1]){const path=[];let at=k(x,z);while(at){const [a,b]=at.split(',').map(Number);path.push({x:a+.5,z:b+.5});at=prev.get(at);}return path.reverse();}
  for(const [dx,dz]of[[0,-1],[1,0],[0,1],[-1,0]]){const a=x+dx,b=z+dz,id=k(a,b);if(walk(scene,a+.5,b+.5)&&!seen.has(id)){seen.add(id);prev.set(id,k(x,z));q.push([a,b]);}}
 }return[];
}
const ROUTES=new WeakMap();
function conductorRoute(plan){let r=ROUTES.get(plan.scene);if(r)return r;const a=plan.anchors.repair||plan.anchors.diversion||plan.anchors.decision,b={x:plan.body.x+plan.body.w/2+.55,z:plan.body.z+.5};r=floorRoute(plan.scene,a,b);ROUTES.set(plan.scene,r);return r;}

export function appendObservatoryDynamics(mesh,glow,{world,time=0,feedback=null,objects=[]}={}){
 const plan=observatoryScenePlan(world);if(!plan)return null;const state=observatoryVisualState(world,feedback),b=plan.body,x=b.x,z=b.z;
 shoreFoam(glow,plan,time);
 appendObservatoryReceiver(mesh,glow,{world,plan,state,time});

 const raised=state.repair===0?1:state.pending?.manipulation==='lever'?state.progress:0,split=state.repair===1?1:state.pending?.manipulation==='coil'?state.progress:0;
 const angle=-.70+raised*1.30,tip=[x+Math.sin(angle)*.58,6.63+Math.cos(angle)*.38,z];
 mesh.tube([x,6.18,z],tip,.045,.045,P.copperLight,6,6);explicitBox(mesh,tip[0]+.23,tip[1],z,.64,.19,.05,P.copper,6,0,-angle*.4);
 for(const side of[-1,1]){const xx=x+side*(.39+split*.30);for(let j=0;j<5;j++)mesh.cylinder(xx,.80+j*.14,z+.95,.14,.055,P.copperLight,6,10);}
 const lit=state.grounded||state.repair!==undefined;
 for(const [y,r]of[[2.68,.86],[5.38,.74]]){
  const emission=lit?.17:0;mesh.ring(x,y+.07,z,r-.035,r+.018,lit?P.signal:P.patina,lit?4:6,emission,1,40);
 }
 // Indicator windows make the saved shared/independent reply decision visible.
 const r=plan.lodge,front=r.z+r.d-.006;
 for(let i=0;i<3;i++){const enabled=state.choice!==undefined&&(state.choice===0||Math.floor(time*.7)%3===i);explicitBox(mesh,r.x+.7+i*(r.w-1.4)/2,.77,front,.24,.10,.025,enabled?P.signal:P.dark,enabled?4:6,enabled?.25:0);}
 const receiver=state.receiver||(state.pending?.manipulation==='receiver'&&state.progress>.1);
 const receiverX=Math.max(r.x+.7,Math.min(r.x+r.w-.7,(plan.anchors.operator||plan.anchors.decision)?.x||r.x+r.w/2));
 explicitBox(mesh,receiverX,.89,r.z+r.d-.007,.42,.045,.008,receiver?P.signal:P.copperLight,receiver?4:6,receiver?.18:0);
 if(plan.part===1){const spare=plan.spec.spare||{x:2,z:10,w:1,d:1},sx=spare.x+spare.w/2,sz=spare.z+spare.d/2;
  const q=state.diverted?1:state.pending?.embodiedAction==='divert'?state.progress:0;
  const vx=sx+Math.sin(q*.95)*.19,vy=2.18+Math.cos(q*.95)*.12;
  mesh.tube([sx,2.03,sz],[vx,vy,sz],.025,.025,P.copperLight,6,5);
  explicitBox(mesh,vx+.13,vy,sz,.32,.12,.04,q>.98?P.signal:P.copper, q>.98?4:6,q>.98?.10:0, -q*.45);
  flushStrip(mesh,{x:sx,z:sz},{x:spare.x+spare.w+.5,z:sz},.035,q>.98?P.signal:P.copperLight,.043,q>.98?4:6,q>.98?.10:0);
 }
 const path=conductorRoute(plan);
 for(let i=1;i<path.length;i++){flushStrip(mesh,path[i-1],path[i],.11,P.dark,.036);flushStrip(mesh,path[i-1],path[i],.025,lit?P.signal:P.copperLight,.038,lit?4:6,lit?.13:0);}
 for(const o of objects.filter(o=>o.originId==='veyr-storm'&&o.type==='embodied-action'&&o.xy)){
  const a=center(o.xy),active=state.pending?.id===o.id,p=active?state.progress:0;
  // Flush bronze service plates make the actual interaction positions visible
  // in the paving. Their engraving and cable sockets never add a collision box.
  polygon(mesh,octagon(a.x,a.z,1.12,.92,.13),.029,P.dark,6);
  mesh.ring(a.x,.042,a.z,.28,.32,active?P.signal:P.copperLight,active?4:6,active?.12:0,1,28);
  for(const dx of[-.39,.39])for(const dz of[-.28,.28])mesh.disc(a.x+dx,.044,a.z+dz,.028,.028,P.copperLight,6,1,6);
  if(o.manipulation==='switch')for(const side of[-1,1])flushStrip(mesh,{x:a.x+side*.12,z:a.z-.16},{x:a.x+side*.12,z:a.z+.16},.045,side===(o.choiceIndex===0?-1:1)?P.signal:P.copperLight,.047,6);
  if(o.manipulation==='cable'&&o.from&&o.to){
   const socket={x:o.to.x,z:o.to.y};
   polygon(mesh,octagon(socket.x,socket.z,.65,.65,.10),.030,P.dark,6);
   mesh.ring(socket.x,.044,socket.z,.16,.22,P.copperLight,6,0,1,24);
   const start={x:o.from.x,z:o.from.y},mid={x:(start.x+socket.x)/2,z:(start.z+socket.z)/2+.38};
   if(!active){flushStrip(mesh,start,mid,.046,P.copperLight,.048);flushStrip(mesh,mid,{x:socket.x-.20,z:socket.z+.14},.046,P.copperLight,.048);}
  }
  if(o.manipulation==='receiver')flushStrip(mesh,{x:a.x-.13,z:a.z},{x:a.x+.13,z:a.z},.055,state.receiver?P.signal:P.copperLight,.047,state.receiver?4:6,state.receiver?.14:0);
  else if(o.manipulation==='lever'){const dx=Math.sin(-.7+p*1.4)*.15;mesh.tube([a.x,.045,a.z],[a.x+dx,.10+Math.cos(-.7+p*1.4)*.12,a.z],.025,.025,P.copperLight,6,5);}
  else if(o.manipulation==='cable'&&active&&o.from&&o.to){const from={x:o.from.x,z:o.from.y},to={x:from.x+(o.to.x-from.x)*p,z:from.z+(o.to.y-from.z)*p};flushStrip(glow,from,to,.035,P.signal,.052,9,.20);}
 }
 // Wind and warm exhaust keep the working lodge alive between actions.
 const pennantX=r.x+r.w-.32,pennantZ=r.z+r.d-.25;
 mesh.tube([pennantX,3.80,pennantZ],[pennantX,5.15,pennantZ],.028,.024,P.copperLight,6,6);
 for(let i=0;i<6;i++){
  const u=i/6,v=(i+1)/6,flag=t=>[pennantX-t*1.15,5.03+Math.sin(time*2.8-t*4)*t*.09,pennantZ+Math.sin(time*2.8-t*4)*t*.17];
  const A=flag(u),B=flag(v),C=[B[0],B[1]-.45*(1-v*.72),B[2]],D=[A[0],A[1]-.45*(1-u*.72),A[2]];
  mesh.quad(A,D,C,B,i<3?P.copper:P.light,6);mesh.quad(B,C,D,A,i<3?P.copper:P.light,6);
 }
 const vents=plan.part===0?[r.z+2.1,r.z+6.5]:[r.z+.9,r.z+2.25];
 for(const vz of vents)for(let i=0;i<3;i++){
  const q=(time*.18+i/3)%1,xx=r.x+r.w/2-.62+q*.55,yy=4.51+q*1.18,zz=vz+q*.20;
  const before=glow.v.length;glow.sphere(xx,yy,zz,.085+q*.10,[.30,.40,.42],9,0,6,3,[1,.66,1]);
  for(let j=before+11;j<glow.v.length;j+=12)glow.v[j]=.14*(1-q);
 }
 if(lit)glow.disc(x,.057,z,1.48,1.48,P.signal,9,.055,32);
 return {phase:state.choice!==undefined?'answering':lit?'grounded':'unsettled',...state};
}

export function observatoryLighting(world){
 if(!isObservatory(world))return null;
 return {ambient:[.22,.27,.32],key:[.82,.67,.42],fog:[.045,.115,.15],fogDensity:.00007,
  sky:['#153240','#3a636d','#183a48']};
}
export function observatoryLights(world){
 const p=observatoryScenePlan(world);if(!p)return[];const r=p.lodge,g=p.gate,state=observatoryVisualState(world);
 return [{p:[r.x+r.w*.5,3.30,r.z+r.d+.233],c:[.84,.46,.18]},{p:[g.x-3,1.65,g.z+.2],c:[.64,.36,.14]},{p:[g.x+3,1.65,g.z+.2],c:[.64,.36,.14]},
  {p:[p.body.x,3.7,p.body.z],c:state.grounded?[.13,.61,.55]:[.11,.24,.27]}];
}

function shadowQuad(mesh,scene,points,alpha){
 // Clip the true projected silhouette to each native floor cell. Selecting a
 // whole cell by its centre produced detached square patches for narrow mast
 // shadows; retained fractional edges now join into one continuous shape.
 const minX=Math.floor(Math.min(...points.map(p=>p[0]))),maxX=Math.ceil(Math.max(...points.map(p=>p[0]))),minZ=Math.floor(Math.min(...points.map(p=>p[1]))),maxZ=Math.ceil(Math.max(...points.map(p=>p[1])));
 const clip=(poly,axis,bound,keepGreater)=>{
  const out=[];if(!poly.length)return out;
  let a=poly[poly.length-1],aIn=keepGreater?a[axis]>=bound:a[axis]<=bound;
  for(const b of poly){const bIn=keepGreater?b[axis]>=bound:b[axis]<=bound;
   if(aIn!==bIn){const t=(bound-a[axis])/(b[axis]-a[axis]),p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];p[axis]=bound;out.push(p);}
   if(bIn)out.push(b);a=b;aIn=bIn;
  }return out;
 };
 for(let z=minZ;z<maxZ;z++)for(let x=minX;x<maxX;x++)if(walk(scene,x+.5,z+.5)){
  let poly=clip(points,0,x,true);poly=clip(poly,0,x+1,false);poly=clip(poly,1,z,true);poly=clip(poly,1,z+1,false);
  for(let i=1;i+1<poly.length;i++){const [a,b,c]=[poly[0],poly[i],poly[i+1]],area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
   if(Math.abs(area)>1e-9)mesh.tri([a[0],.046,a[1]],[b[0],.046,b[1]],[c[0],.046,c[1]],P.dark,8,0,alpha,[0,1,0]);
  }
 }
}
export function appendObservatoryCastShadows(shadow,{world}={}){
 const p=observatoryScenePlan(world);if(!p)return;
 const r=p.lodge;
 shadowQuad(shadow,p.scene,[[r.x,r.z+r.d],[r.x+r.w,r.z+r.d],[r.x+r.w+3.1,r.z+r.d+3.2],[r.x+3.1,r.z+r.d+3.2]],.16);
 const b=p.body;shadowQuad(shadow,p.scene,[[b.x-.36,b.z],[b.x+.36,b.z],[b.x+3.9,b.z+5.5],[b.x+3.25,b.z+5.5]],.21);
 for(const side of[-1,1]){const x=p.gate.x+side*3,z=p.gate.z;shadowQuad(shadow,p.scene,[[x-.35,z],[x+.35,z],[x+1.75,z+2.1],[x+1.05,z+2.1]],.16);}
}
