/** Secondary craft for the listening headland. Every form belongs to the lodge,
 * mast, arrival paving or sea edge; this module never reserves walking floor. */
export const OBSERVATORY_BACKDROP_BOUNDS=Object.freeze({x:1.5,z:-3.3,w:7.5,d:6.2});
const TAU=Math.PI*2;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const P={ivory:rgb('#d6c59e'),stone:rgb('#85745d'),dark:rgb('#172f36'),basalt:rgb('#334650'),seam:rgb('#263d43'),
 copper:rgb('#a95732'),edge:rgb('#d4a66a'),teal:rgb('#1b7068'),damp:rgb('#234e4d'),leaf:rgb('#71825a'),glass:rgb('#efbd70')};
const tint=(c,t)=>c.map(n=>Math.max(0,Math.min(1,n*t)));
const walk=(s,x,z)=>s.floor?.[Math.floor(z)]?.[Math.floor(x)]==='.';
const inRect=(x,z,r)=>x>=r.x&&x<r.x+r.w&&z>=r.z&&z<r.z+r.d;
const box=(m,x,y,z,w,h,d,c,mat=6)=>m.box(x,y,z,w,h,d,c,mat);
const tube=(m,a,b,r,c,segments=5)=>m.tube(a,b,r,r,c,6,segments);
function strip(m,a,b,w,y,c){const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz)||1,ox=-dz/d*w/2,oz=dx/d*w/2;m.quad([a[0]+ox,y,a[1]+oz],[a[0]-ox,y,a[1]-oz],[b[0]-ox,y,b[1]-oz],[b[0]+ox,y,b[1]+oz],c,6,0,1,[0,1,0]);}

function coastalLeaf(m,base,tip,width,color,depth=.010){
 const dx=tip[0]-base[0],dy=tip[1]-base[1],length=Math.hypot(dx,dy)||1;
 const mid=[(base[0]+tip[0])*.5,(base[1]+tip[1])*.5,Math.max(base[2],tip[2])+depth],ox=-dy/length*width,oy=dx/length*width;
 const left=[mid[0]+ox,mid[1]+oy,mid[2]],right=[mid[0]-ox,mid[1]-oy,mid[2]];
 m.tri(base,left,tip,color,6);m.tri(base,tip,right,tint(color,.78),6);
 m.tri(tip,left,base,tint(color,.86),6);m.tri(right,tip,base,tint(color,.73),6);
}
function gardenCraft(m,p){
 const r=p.lodge,front=r.z+r.d,cx=r.x+r.w/2;
 const herb=rgb('#5d8059'),leaf=rgb('#8c9d66'),flower=rgb('#eee0ad'),violet=rgb('#9486a0');
 for(const side of[-1,1]){
  const x=cx+side*(r.w/2-.44),z=front-.11,top=.80,bottom=.45;
  const lower=[[x-.27,bottom,z-.09],[x+.27,bottom,z-.09],[x+.27,bottom,z+.09],[x-.27,bottom,z+.09]],
   upper=[[x-.36,top,z-.09],[x+.36,top,z-.09],[x+.36,top,z+.09],[x-.36,top,z+.09]];
  for(let i=0;i<4;i++){const j=(i+1)%4;m.quad(lower[j],lower[i],upper[i],upper[j],tint(P.copper,.76+(i%2)*.13),6);}
  m.quad(upper[3],upper[2],upper[1],upper[0],rgb('#384334'),6,0,1,[0,1,0]);
  // The box is recessed into the closed wall; its copper lip, soil and living
  // growth read as a tended porch detail without reserving a walking cell.
  box(m,x,.815,front-.035,.77,.045,.032,P.edge);
  for(const dx of[-.22,.22])box(m,x+dx,.63,front-.035,.040,.33,.018,P.teal);
  for(let stem=0;stem<4;stem++){
   const xx=x-.25+stem*.165,height=.34+(stem%3)*.13,zf=front-.029;
   tube(m,[xx,.81,zf-.010],[xx+(stem%2?.04:-.04),.81+height,zf-.008],.012,herb,4);
   for(let pair=0;pair<3;pair++){
    const y=.86+pair*.105,spread=.13+pair*.018;
    for(const sign of[-1,1])coastalLeaf(m,[xx,y,zf-.014],[xx+sign*spread,y+.12,zf-.010],.048,stem%2?leaf:herb,.006);
   }
   if(stem===0||stem===3){
    const fy=.81+height,fx=xx+(stem%2?.04:-.04),fz=front-.013;
    for(let petal=0;petal<5;petal++){
     const a=petal*TAU/5,b=(petal+1)*TAU/5;
     m.tri([fx,fy,fz],[fx+Math.cos(a)*.061,fy+Math.sin(a)*.061,fz-.005],[fx+Math.cos(b)*.061,fy+Math.sin(b)*.061,fz-.005],side<0?flower:violet,6,0,1,[0,0,1]);
    }
   }
  }
  // Two short trained ivy runners follow the front corner masonry. They are
  // attached to the wall and use broad folded leaves, rather than prop piles.
  let previous=[x+side*.13,2.62,front-.021];
  for(let i=1;i<=6;i++){
   const q=i/6,point=[x+side*(.13+Math.sin(q*Math.PI)*.08),2.62-q*1.02,front-.021];
   m.quad([previous[0]-.010,previous[1],previous[2]],[previous[0]+.010,previous[1],previous[2]],[point[0]+.010,point[1],point[2]],[point[0]-.010,point[1],point[2]],herb,6,0,1,[0,0,1]);
   const sign=i%2?1:-1;coastalLeaf(m,point,[point[0]+sign*.14,point[1]-.105,front-.014],.060,i%2?herb:leaf,.004);previous=point;
  }
 }
 // A broad copper bulkhead lamp is fixed to the front gable above head height.
 // Its lit chamber and storm hood give the lodge a warm working focal point.
 const z=front+.233,y=3.30;
 m.tube([cx,y,z-.055],[cx,y,z+.020],.34,.34,P.dark,6,10);
 m.tube([cx,y,z+.023],[cx,y,z+.056],.275,.275,P.edge,6,10);
 m.tube([cx,y,z+.059],[cx,y,z+.069],.215,.215,P.glass,4,10,.22);
 for(const side of[-1,1])tube(m,[cx+side*.13,y-.22,z+.082],[cx+side*.13,y+.22,z+.082],.014,P.dark,4);
 tube(m,[cx-.24,y,z+.084],[cx+.24,y,z+.084],.014,P.dark,4);
 box(m,cx,y+.39,z-.008,.88,.10,.20,P.copper);
 for(const side of[-1,1])box(m,cx+side*.35,y+.28,z-.032,.055,.17,.10,P.teal);
}
function hewnCoping(m,a,b,n,index){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1,t=[dx/length,dz/length],inset=.035,width=.145+.014*Math.sin(index*.73),height=.085+.025*Math.sin(index*1.17);
 const at=(p,o,along,y)=>[p[0]+n[0]*o+t[0]*along,y,p[1]+n[1]*o+t[1]*along];
 const upper=[at(a,inset,.025,height),at(b,inset,-.038,height*.90),at(b,width,-.092,height*.82),at(a,width,.088,height*.96)];
 const lower=upper.map(v=>[v[0],-.012,v[2]]),stone=tint(P.stone,.89+.08*Math.sin(index*.41));
 m.tri(upper[0],upper[1],upper[2],stone,6);m.tri(upper[0],upper[2],upper[3],tint(stone,1.10),6);
 for(let i=0;i<4;i++){const j=(i+1)%4;m.quad(lower[i],lower[j],upper[j],upper[i],tint(stone,.77),6);}
}

function lodgeCraft(m,p){
 const r=p.lodge,cx=r.x+r.w/2,front=r.z+r.d-.050,right=r.x+r.w-.050;
 // Bonded courses belong to the actual walls, rather than a rectangular grid
 // projected over open courtyard. Deep sills and trim give the wall thickness.
 for(const y of[.62,1.23,2.36]){
  box(m,cx,y,front,r.w-.34,.055,.016,tint(P.stone,.8));
  box(m,right,y,r.z+r.d/2,.016,.055,r.d-.32,tint(P.stone,.83));
 }
 for(const side of[-1,1])for(let row=0;row<5;row++){
  const xx=cx+side*(r.w/2-.22),y=.54+row*.49;
  box(m,xx,y,front,.34,.31,.045,row%2?P.ivory:tint(P.ivory,.84));
 }
 for(const xx of[cx-.92,cx+.92]){
  box(m,xx,2.13,front+.014,1.10,.14,.065,P.ivory);
  box(m,xx,1.08,front-.020,1.18,.13,.090,P.ivory);
  for(const side of[-1,1])box(m,xx+side*.48,1.61,front+.012,.11,1.02,.050,tint(P.ivory,.85));
  // Louver shutters sit within the closed wall footprint; the warm opening and
  // green frame are visible in both the near porch and distant silhouette.
  for(const side of[-1,1]){
   const sx=xx+side*.57;box(m,sx,1.59,front-.012,.20,.92,.025,P.teal);
   for(let i=0;i<4;i++)box(m,sx,1.27+i*.20,front+.006,.17,.035,.012,P.edge);
  }
 }
 // Long lodge east wall: an integrated service gallery, set inside its closed
 // footprint. The upper lodge gets the same visual grammar at smaller scale.
 const bays=p.part===0?[r.z+2,r.z+5.0,r.z+7.2]:[r.z+1.1];
 for(const z of bays){
  box(m,right-.02,1.47,z,.035,1.03,1.12,P.dark);
  box(m,right-.008,1.50,z,.016,.73,.88,P.teal);
  for(let i=0;i<4;i++)box(m,right+.012,1.24+i*.18,z,.009,.055,.91,tint(P.edge,.86));
  box(m,right-.018,.87,z,.12,.15,1.25,P.ivory);
  box(m,right-.020,2.04,z,.12,.13,1.23,P.ivory);
 }
 // Gutters, downpipes, ridge seam and two copper ventilators break the blank
 // barrel vault with a small number of legible, physically attached features.
 for(const side of[-1,1]){
  const x=cx+side*(r.w/2+.22);
  tube(m,[x,2.98,r.z-.11],[x,2.98,r.z+r.d+.11],.045,P.teal);
  tube(m,[cx+side*(r.w/2-.15),.33,r.z+.22],[cx+side*(r.w/2-.15),2.95,r.z+.22],.046,P.copper);
  for(const y of[.68,1.83,2.65])box(m,cx+side*(r.w/2-.15),y,r.z+.22,.17,.055,.17,P.edge);
 }
 tube(m,[cx,4.045,r.z-.17],[cx,4.045,r.z+r.d+.17],.028,P.edge);
 for(const z of[p.part===0?r.z+2.1:r.z+.9,p.part===0?r.z+6.5:r.z+2.25]){
  const x=cx-.62;
  m.cylinder(x,4.11,z,.20,.46,P.teal,6,8,.15);
  m.cylinder(x,4.38,z,.31,.10,P.copper,6,8,.24);
  m.cylinder(x,4.45,z,.25,.05,P.edge,6,8,.25);
 }
 // Above the east windows: a service conduit, elbows and fixed junction box.
 const pipeX=right-.09;
 tube(m,[pipeX,2.47,r.z+.48],[pipeX,2.47,r.z+r.d-.48],.038,P.copper);
 box(m,pipeX-.015,2.34,r.z+r.d*.52,.13,.36,.45,P.dark);
 box(m,pipeX+.058,2.34,r.z+r.d*.52,.018,.26,.32,P.teal);
 gardenCraft(m,p);
}

function mastCraft(m,p){
 const b=p.body,x=b.x,z=b.z;
 // The mast has a machinery room at its feet: paired cabinets, porcelain
 // insulators and dial faces are entirely inside the native closed 3x3 base.
 for(const side of[-1,1]){
  const xx=x+side*.82,zz=z+.87;
  box(m,xx,.95,zz,.53,.88,.40,P.dark);
  box(m,xx,1.20,zz+.205,.41,.28,.015,P.teal);
  m.tube([xx,1.21,zz+.215],[xx,1.21,zz+.238],.109,.109,P.edge,6,10);
  m.tube([xx,1.21,zz+.240],[xx,1.21,zz+.248],.074,.074,P.ivory,6,10);
  tube(m,[xx-.045,1.18,zz+.254],[xx+.04,1.25,zz+.254],.010,P.dark,4);
  for(let i=0;i<3;i++)box(m,xx-.13+i*.13,.85,zz+.207,.065,.14,.018,i===1?P.copper:P.teal);
  tube(m,[xx,.60,z+.67],[xx,2.02,z+.67],.045,P.copper);
  for(let i=0;i<4;i++)m.cylinder(xx,1.47+i*.12,z+.67,.13,.045,P.ivory,6,8);
  for(const dz of[-.96,.96]){
   const bx=x+side*1.09,bz=z+dz;
   m.cylinder(bx,.594,bz,.10,.08,P.dark,6,6);m.cylinder(bx,.656,bz,.052,.062,P.edge,6,6);
  }
 }
 // Calibration ladder and cable spine make the tall pole useful at every
 // height, while staying within the existing mast mass and aerial envelope.
 for(const side of[-1,1])tube(m,[x+side*.20,.73,z-.23],[x+side*.20,5.52,z-.23],.025,P.copper);
 for(let y=.87;y<5.5;y+=.38)tube(m,[x-.20,y,z-.23],[x+.20,y,z-.23],.018,P.edge,4);
 for(const side of[-1,1])for(let i=0;i<4;i++){
  const y=1.63+i*.72;
  tube(m,[x+side*.53,y,z+.23],[x+side*.14,y+.48,z],.018,P.teal,4);
 }
 // Segmented receiver rims read as an engineered instrument rather than
 // three unbroken generic rings. Golden ticks establish their calibration.
 for(const [y,r,count] of[[2.74,.88,12],[4.24,1.18,16],[5.44,.76,10]])for(let i=0;i<count;i++){
  const a=TAU*i/count,rr=r+.018;
  tube(m,[x+Math.cos(a)*(rr-.07),y,z+Math.sin(a)*(rr-.07)],[x+Math.cos(a)*(rr+.055),y,z+Math.sin(a)*(rr+.055)],.017,i%3?P.edge:P.ivory,4);
 }
}

function boundarySegments(p){
 const s=p.scene,land=(x,z)=>walk(s,x+.5,z+.5)||inRect(x+.5,z+.5,p.mast)||inRect(x+.5,z+.5,p.lodge),out=[];
 for(let z=0;z<s.height;z++)for(let x=0;x<s.width;x++)if(land(x,z)){
  if(!land(x,z-1))out.push({a:[x+.08,z],b:[x+.92,z],n:[0,-1],cell:[x,z]});
  if(!land(x+1,z))out.push({a:[x+1,z+.08],b:[x+1,z+.92],n:[1,0],cell:[x,z]});
  if(!land(x,z+1))out.push({a:[x+.92,z+1],b:[x+.08,z+1],n:[0,1],cell:[x,z]});
  if(!land(x-1,z))out.push({a:[x,z+.92],b:[x,z+.08],n:[-1,0],cell:[x,z]});
 }return out;
}
function cliffPoint(p,x,z,y,offset=0,n=[0,0]){
 const scale=y>-.55?1+y/(-.55)*.04:y>-2.4?1.04+(y+.55)/(-1.85)*.035:1.075+(y+2.4)/(-3.5)*.065;
 const cx=p.scene.width/2,cz=p.scene.height*.48;
 return [cx+(x-cx)*scale+n[0]*offset,y,cz+(z-cz)*scale+n[1]*offset];
}
function edgeCraft(m,p){
 const segments=boundarySegments(p),s=p.scene;
 for(let index=0;index<segments.length;index++){
  const {a,b,n,cell}=segments[index],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,dx=Math.abs(b[0]-a[0]),dz=Math.abs(b[1]-a[1]);
  // The coping sits seaward of the true floor boundary, never on a route.
  // Courses continue the existing cliff outline instead of making prop piles.
  if(walk(s,cell[0]+.5,cell[1]+.5)){
   hewnCoping(m,a,b,n,index);
  }
  // Bonded horizontal strata and offset dark seams give the large foundation
  // vertical scale. Two long ribbons are cheaper and clearer than rock debris.
  for(const y of[-.59,-2.43]){
   const aa=cliffPoint(p,a[0],a[1],y,.015,n),bb=cliffPoint(p,b[0],b[1],y,.015,n),cc=cliffPoint(p,b[0],b[1],y-.055,.015,n),dd=cliffPoint(p,a[0],a[1],y-.055,.015,n);
   m.quad(aa,bb,cc,dd,y> -1?tint(P.stone,.77):P.damp,6);
  }
  if(index%3===0){
   const top=cliffPoint(p,x-.06*n[1],z+.06*n[0],-.62,.022,n),mid=cliffPoint(p,x+.07*n[1],z-.07*n[0],-2.35,.022,n),low=cliffPoint(p,x-.025*n[1],z+.025*n[0],-4.72,.022,n);
   const shift=v=>[v[0]+n[1]*.034,v[1],v[2]-n[0]*.034];
   m.quad(top,shift(top),shift(mid),mid,P.seam,6);m.quad(mid,shift(mid),shift(low),low,P.seam,6);
  }
  // Salt grass grows from the seaward joint immediately below the coping.
  if(index%19===7){
   const root=cliffPoint(p,x,z,-.13,.18,n);
   for(let leaf=0;leaf<5;leaf++){
    const a=leaf*.47,lean=.13+leaf*.022,tip=[root[0]+n[0]*lean+Math.sin(a)*.08,root[1]+.27+(leaf%2)*.15,root[2]+n[1]*lean+Math.cos(a)*.08];
    m.tri([root[0]-n[1]*.033,root[1],root[2]+n[0]*.033],[root[0]+n[1]*.033,root[1],root[2]-n[0]*.033],tip,tint(P.leaf,.80+leaf*.055),6);
    m.tri(tip,[root[0]+n[1]*.033,root[1],root[2]-n[0]*.033],[root[0]-n[1]*.033,root[1],root[2]+n[0]*.033],tint(P.leaf,.71+leaf*.04),6);
   }
  }
 }
}
function backdrop(m,p){
 // One distant station is the destination of the listening rig, carried by a
 // continuous wind-cut promontory. It adds depth without scattering objects
 // or suggesting a new walkable route beyond the current headland.
 const start= m.v.length,cx=3,cz=-12;
 const outline=[[-6,-2.4],[-5.7,-5.0],[-3.1,-6.3],[.7,-6.5],[4.1,-5.1],[6.6,-2.9],[7.6,.7],[5.8,3.8],[2.8,5.4],[-.8,5.7],[-4.6,3.9],[-6.6,.8]];
 const heights=outline.map((_,i)=>.83+Math.sin(i*.83)*.29+Math.cos(i*1.71)*.10);
 const levels=[{y:0,scale:1},{y:-1.45,scale:1.07},{y:-3.80,scale:1.15},{y:-6.20,scale:1.24}];
 const slate=rgb('#566275'),rock=rgb('#334757'),farStone=rgb('#7d8177'),copper=rgb('#875b45');
 const point=(i,level)=>{
  const y=level.y===0?heights[i]:level.y===-1.45?level.y+Math.sin(i*1.31)*.40:level.y===-3.80?level.y+Math.cos(i*1.67)*.49:level.y;
  return[cx+outline[i][0]*level.scale,y,cz+outline[i][1]*level.scale];
 };
 for(let i=0;i<outline.length;i++){
  const j=(i+1)%outline.length;
  m.tri([cx,1.08,cz],point(j,levels[0]),point(i,levels[0]),tint(slate,.87+(i%4)*.045),6,0,1,[0,1,0]);
  for(let k=0;k<levels.length-1;k++){
   const a=point(i,levels[k]),b=point(j,levels[k]),c=point(j,levels[k+1]),d=point(i,levels[k+1]);
   m.quad(a,b,c,d,tint(k===0?slate:rock,.75+(i%5)*.045),6.25);
  }
 }
 // A compact masonry receiving room, stepped terrace and a bright high slit
 // form one secondary silhouette. The copper roof echoes the near lodge.
 const x=cx+1.0,z=cz-.8;
 box(m,x,1.21,z,4.2,.24,3.6,tint(farStone,.8));
 box(m,x,2.27,z,3.55,1.98,2.75,farStone,0);
 box(m,x,3.28,z,3.96,.17,3.14,copper);
 const roof=[[-2,0],[-1.2,.47],[0,.78],[1.2,.47],[2,0]];
 for(let i=0;i<roof.length-1;i++){
  const a=roof[i],b=roof[i+1];
  m.quad([x+a[0],3.36+a[1],z-1.57],[x+a[0],3.36+a[1],z+1.57],[x+b[0],3.36+b[1],z+1.57],[x+b[0],3.36+b[1],z-1.57],i<2?P.teal:copper,6);
 }
 for(const dx of[-1.03,0,1.03]){
  box(m,x+dx,2.27,z+1.382,.49,.77,.016,P.dark);
  box(m,x+dx,2.28,z+1.393,.23,.55,.005,P.glass,4);
 }
 const bx=cx-2.3,bz=cz+1.0;
 m.cylinder(bx,1.44,bz,.65,.65,farStone,6,8,.53);
 m.cylinder(bx,3.59,bz,.14,4.04,P.dark,6,8,.10);
 m.cylinder(bx,5.58,bz,.46,.15,P.teal,6,10,.33);
 m.cylinder(bx,5.85,bz,.23,.42,P.glass,4,8,.23,.15);
 m.cylinder(bx,6.11,bz,.44,.10,copper,6,10,.19);
 for(const dx of[-.30,.30])tube(m,[bx+dx,5.55,bz],[bx+dx,6.08,bz],.024,P.edge,4);
 for(let i=0;i<7;i++){
  const point=t=>[bx+(x-bx)*t,5.08+(3.88-5.08)*t-Math.sin(t*Math.PI)*.42,bz+(z-bz)*t];
  tube(m,point(i/7),point((i+1)/7),.018,P.dark,4);
 }
 // A single connected inset path links the beacon pedestal to the receiving
 // room. Its graphic rhythm remains readable when the station is far away.
 strip(m,[bx,bz+.7],[bx,cz+3.1],.74,1.115,tint(farStone,.88));
 strip(m,[bx,cz+3.1],[x,cz+3.1],.74,1.115,tint(farStone,.88));
 strip(m,[x,cz+3.1],[x,z+1.8],.74,1.115,tint(farStone,.88));
 // The reply station sits on one small tidal shelf below the main court. Its
 // dry surface is relative to the actual sea at -5.25, not the courtyard's y0.
 // Compress the connected underwater foundation to its real bedrock depth.
 for(let i=start;i<m.v.length;i+=12){
  m.v[i]=5+(m.v[i]-cx)*.42;m.v[i+2]=(m.v[i+2]-cz)*.40;
  const oldY=m.v[i+1];m.v[i+1]=oldY>=0?-4.4+(oldY-1.08)*.60:(-4.4-1.08*.60)+oldY*((6.2-4.4-1.08*.60)/6.2);
 }
 for(let i=start;i<m.v.length;i+=36){
  const a=m.v.slice(i,i+3),b=m.v.slice(i+12,i+15),c=m.v.slice(i+24,i+27),u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n)||1;
  for(const j of[0,12,24])for(let k=0;k<3;k++)m.v[i+j+3+k]=n[k]/length;
 }
}

function arrivalInlay(m,p){
 const at=p.anchors.arrival;if(!at||!walk(p.scene,at.x,at.z))return;
 const x=at.x,z=at.z-.45,r=.94;
 m.ring(x,.039,z,r-.07,r,P.teal,6,0,1,32);m.ring(x,.040,z,r-.19,r-.165,P.edge,6,0,1,32);
 for(let i=0;i<8;i++){
  const a=i*TAU/8,c=Math.cos(a),s=Math.sin(a),length=i%2?.43:.69;
  const points=[[x+c*length,.041,z+s*length],[x-s*.105,.041,z+c*.105],[x,.041,z],[x+s*.105,.041,z-c*.105]];
  m.tri(points[0],points[1],points[2],i%2?P.ivory:P.edge,6,0,1,[0,1,0]);m.tri(points[0],points[2],points[3],i%2?P.teal:P.copper,6,0,1,[0,1,0]);
 }
 for(let i=0;i<6;i++){
  const a=i*TAU/6,b=(i+1)*TAU/6;
  const A=[x+Math.cos(a)*.20,z+Math.sin(a)*.20],B=[x+Math.cos(b)*.20,z+Math.sin(b)*.20];strip(m,A,B,.025,.041,P.dark);
 }
}

/** Append only visual detail; caller owns geometry and actual game state. */
export function appendObservatoryDetail(mesh,plan){
 if(!mesh?.v||!plan?.scene?.observatory||!plan.lodge||!plan.mast)return {triangles:0,groups:[]};
 const before=mesh.v.length,groups=[];
 for(const [name,draw]of[['lodge',lodgeCraft],['mast',mastCraft],['edge',edgeCraft],['arrival',arrivalInlay],['backdrop',backdrop]]){
  const start=mesh.v.length;draw(mesh,plan);groups.push({name,triangles:(mesh.v.length-start)/36});
 }
 const result={triangles:(mesh.v.length-before)/36,groups};mesh.observatoryDetail=result;return result;
}
