/** Ash & Aether HD geometry, designed for the live CisternRenderer Geometry contract.
 * No game-state mutations, new render passes, per-frame static allocations, or GL dependencies.
 * LOD assets are deterministic, authored at world coordinates, and compatible with WebGL/software.
 */
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const tint=(c,m)=>c.map(v=>clamp(v*m));
const hash=n=>{let v=n|0;v=Math.imul(v^(v>>>16),0x7feb352d);v=Math.imul(v^(v>>>15),0x846ca68b);return ((v^(v>>>16))>>>0)/4294967296;};
const seedAt=(x,z,n=0)=>Math.imul(Math.round(x*47+z*31+n*131)|0,0x1b873593);
export function hdDetail(quality='medium',distance=0){
 if(quality==='low'||distance>38)return 0;
 if(quality==='high'&&distance<=13)return 2;
 return 1;
}
function ring(x,y,z,rx,rz,n,start=0){return Array.from({length:n},(_,i)=>{const a=start+TAU*i/n;return [x+Math.cos(a)*rx,y,z+Math.sin(a)*rz];});}
function skin(m,a,b,col,mat=2){for(let i=0;i<a.length;i++){const j=(i+1)%a.length;m.quad(a[i],a[j],b[j],b[i],col,mat);}}
function leaf(m,p,r,shade,seed,detail){
 const count=detail===2?4:2, n=seedAt(p[0],p[2],seed);
 for(let i=0;i<count;i++){
  const a=(hash(n+i*13)*2-1)*Math.PI,w=r*(.42+.22*hash(n+i*17)),dx=Math.cos(a),dz=Math.sin(a),x=p[0],y=p[1],z=p[2],h=r*(.38+.18*hash(n+i*11));
  const A=[x-dx*r*.64,y-h*.1,z-dz*r*.64],B=[x-dz*w,y+h*.32,z+dx*w],C=[x+dx*r,y+h*.24,z+dz*r],D=[x+dz*w,y-h*.25,z-dx*w];
  m.quad(A,B,C,D,tint(shade,.81+hash(n+i*29)*.36),5);
  if(detail===2){m.quad(A,D,C,B,tint(shade,.77+hash(n+i*39)*.25),5);}
 }
}
/** Replaces single-cylinder trunks and detached leaf balls with tapering stems,
 * exposed roots, branching and layered foliage. Supports mangrove and conifer.
 */
export function appendHDTree(m,p,c,{quality='medium',trunkOnly=false}={}){
 if(!m||!p||!c)return 0;
 const level=hdDetail(quality,0),x=p.x,z=p.z,y=p.y||0,h=p.near?.72:2.6+(p.index%3)*.32,r=p.near?.56:1.25;
 const seed=seedAt(x,z,p.index||0),trunk=[.26,.20,.145],leafColor=c.leaf||[.22,.39,.24];
 const conifer=['highland','storm','ice','aurora','crystal'].includes(c.family);
 const mangrove=c.family==='mangrove';
 const segments=level===2?12:level===1?9:6;
 const levels=level===2?6:4;
 let prev=ring(x,y+.015,z,.12, .115,segments);
 for(let k=1;k<=levels;k++){
  const t=k/levels,bend=.11*Math.sin(t*2.2+hash(seed)*3),rad=Math.max(.019,.15*Math.pow(1-t,.82));
  const next=ring(x+bend,y+h*(.11+.79*t),z+bend*.6,rad,rad*.88,segments);
  skin(m,prev,next,tint(trunk,.8+k*.045),2);prev=next;
 }
 if(level>=1)for(let i=0;i<(level===2?6:3);i++){const a=i*TAU/(level===2?6:3)+hash(seed)*.4,rr=.19+r*.13;
  m.tube([x,y+.2,z],[x+Math.cos(a)*rr,y+.04,z+Math.sin(a)*rr],.07,.015,tint(trunk,.77),2,5);
 }
 if(trunkOnly)return 1;
 if(mangrove)for(let i=0;i<5;i++){
  const a=(i+.2)*TAU/5; m.tube([x,y+h*.50,z],[x+Math.cos(a)*r*.78,y,z+Math.sin(a)*r*.8],.048,.021,tint(trunk,1.1),2,6);
 }
 const count=level===2?24:level===1?12:6;
 for(let i=0;i<count;i++){
  const t=(i+.5)/count,angle=i*2.399963229728653+(hash(seed)*2);
  const crown=conifer?(1-t)*r*.90:r*(.30+.68*Math.sin(Math.PI*Math.pow(t,.70)));
  const spread=crown*(.67+.30*hash(seed+i*17)),xx=x+Math.cos(angle)*spread,zz=z+Math.sin(angle)*spread;
  const yy=y+h*(conifer?.42+.6*t:.57+.53*t)+(hash(seed+i*21)-.5)*r*.3;
  m.tube([x,y+h*(.43+.28*t),z],[xx,yy,zz],.066*(1-t*.75),.013,tint(trunk,.9),2,level===0?4:6);
  const radius=r*(conifer?.27+.18*(1-t):.28+.10*hash(seed+i*37));
  leaf(m,[xx,yy,zz],radius,leafColor,i,level);
 }
 if(level===2&&c.family==='village')for(let i=0;i<6;i++){
  const a=i*TAU/6,xx=x+Math.cos(a)*r*.73,zz=z+Math.sin(a)*r*.67;
  leaf(m,[xx,y+h*.66,zz],r*.20,tint(leafColor,.92),i+100,1);
 }
 return count;
}
/** Faceted geology with close-up strata and moss, no floating rock spheres. */
export function appendHDRock(m,p,c,{quality='medium'}={}){
 if(!m||!p||!c)return 0;
 const level=hdDetail(quality,0),x=p.x,y=p.y||0,z=p.z,h=p.near?.25:1.2+(p.index%3)*.22;
 const seed=seedAt(x,z,p.index),crystal=['crystal','ice','aurora'].includes(c.family),stone=c.top||[.43,.47,.42];
 const n=level===2?13:level===1?9:7,base=ring(x,y+.025,z,1.08,.77,n,hash(seed)*.9);
 const rim=ring(x,y+h*.45,z,.92,.68,n,hash(seed)*.9);
 const top=ring(x,y+h*.76,z,.48,.39,n,hash(seed)*.9);
 for(let i=0;i<n;i++){const j=(i+1)%n,mod=.72+.40*hash(seed+i*17);
  rim[i][1]+=(hash(seed+i*29)-.5)*h*.24;top[i][1]+=(hash(seed+i*23)-.5)*h*.18;
  m.quad(base[i],base[j],rim[j],rim[i],tint(stone,mod*.89),7);
  m.quad(rim[i],rim[j],top[j],top[i],tint(stone,mod*1.06),7);
  m.tri(top[i],top[j],[x,y+h*.87,z],tint(stone,.83+.4*hash(seed+i*43)),7);
 }
 if(crystal)for(let i=0;i<(level===0?2:5);i++){
  const a=i*TAU/5+hash(seed)*2,xx=x+Math.cos(a)*.43,zz=z+Math.sin(a)*.32;
  const sh=h*(.85+.42*hash(seed+i*61));
  const lower=ring(xx,y+h*.42,zz,.17,.15,6),upper=ring(xx,y+h*.42+sh,zz,.055,.045,6);
  skin(m,lower,upper,tint(c.leaf||stone,.83+i*.055),6);
  for(let j=0;j<6;j++)m.tri(upper[j],upper[(j+1)%6],[xx,y+h*.6+sh,zz],tint(c.leaf||stone,1.08),6);
 }else if(level>0)for(let i=0;i<4;i++){
  const a=hash(seed+i*5)*TAU,xx=x+Math.cos(a)*.58,zz=z+Math.sin(a)*.39;
  m.quad([xx-.2,y+h*.57,zz-.15],[xx+.18,y+h*.61,zz-.12],[xx+.1,y+h*.66,zz+.2],[xx-.2,y+h*.62,zz+.15],tint(c.leaf||stone,.72+i*.06),5);
 }
 return n;
}
function posed(m,x,y,z,heading=0){
 const co=Math.cos(heading),si=Math.sin(heading);
 const at=p=>[x+p[0]*co+p[2]*si,y+p[1],z-p[0]*si+p[2]*co];
 return {
  quad:(a,b,c,d,col,mat=2)=>m.quad(at(a),at(b),at(c),at(d),col,mat),
  tri:(a,b,c,col,mat=2)=>m.tri(at(a),at(b),at(c),col,mat),
  tube:(a,b,r0,r1,col,mat=2,n=9)=>m.tube(at(a),at(b),r0,r1,col,mat,n),
  box:(xx,yy,zz,w,h,l,col,mat=2)=>{const p=at([xx,yy,zz]);m.box(...p,w,h,l,col,mat,0,heading);},
  cylinder:(xx,yy,zz,rad,h,col,mat=2,n=10)=>m.tube(at([xx,yy-h/2,zz]),at([xx,yy+h/2,zz]),rad,rad,col,mat,n),
  sphere:(xx,yy,zz,rad,col,mat=2,n=12,row=7,sc=[1,1,1])=>{const p=at([xx,yy,zz]);m.sphere(...p,rad,col,mat,0,n,row,sc);}
 };
}
const SILVER=[.49,.60,.61],CREAM=[.77,.75,.64],BRASS=[.69,.48,.24],GLASS=[.15,.32,.40],IRON=[.16,.20,.22],RUBBER=[.10,.105,.11],WOOD=[.35,.24,.15];
/** Standalone vehicle body for native host vehicle pose, not an alternative flight simulation. */
export function appendHDAircraft(m,{x=0,y=0,z=0,heading=0,pitch=0,roll=0,quality='high',seed=17}={}){
 if(!m)return 0;const g=posed(m,x,y,z,heading),detail=hdDetail(quality,0);
 const n=detail===2?16:detail===1?12:8;
 const rings=[[-5.6,.18,.19,1.35],[-4.1,.65,.57,1.40],[-1.8,.79,.72,1.57],[.7,.87,.83,1.70],[3.0,.72,.62,1.65],[4.8,.49,.41,1.62],[5.5,.02,.04,1.60]];
 const hull=rings.map(([z0,rx,ry,cy])=>ring(0,cy,z0,rx,ry,n));
 for(let j=0;j<hull.length-1;j++)skin({quad:(a,b,c,d,col,mat)=>g.quad(a,b,c,d,col,mat)},hull[j],hull[j+1],tint(SILVER,.91+j*.018),1);
 // Swept airfoils have thick leading edges, thin trailing edges and separated ailerons.
 for(const side of [-1,1]){
  const root=[side*.65,1.9,.50],tip=[side*8.8,1.83,-.35];
  const front=[side*8.30,1.80,1.25],back=[side*7.8,1.79,-1.3];
  g.quad([side*.72,2.03,1.6],front,tip,[side*.66,2.05,-1.4],SILVER,1);
  g.quad([side*.66,1.79,-1.4],tip,back,[side*.72,1.8,1.6],tint(SILVER,.86),1);
  g.tube(root,tip,.10,.025,BRASS,1,10);
  g.box(side*6.3,1.81,-.98,2.6,.055,.50,tint(CREAM,.92),1);
  // Tailplane, end lights, wire tension and wheel fairings.
  g.quad([side*.40,2.05,-4.3],[side*3.2,2.10,-4.4],[side*3.7,2.07,-5.13],[side*.55,2.1,-5.3],CREAM,1);
  g.tube([side*2.8,1.83,.45],[side*.84,.87,-2.85],.035,.015,IRON,1,7);
  g.tube([side*3.45,1.87,.1],[side*1.0,.86,-1.5],.027,.012,BRASS,1,6);
  g.box(side*8.6,1.95,.8,.43,.23,.31,side===-1?[.84,.13,.09]:[.08,.72,.38],8);
  g.tube([side*1.12,.72,-2.5],[side*1.15,.17,-2.55],.055,.046,IRON,1,9);
  g.sphere(side*1.15,.14,-2.55,.25,RUBBER,2,detail===2?14:9,8,[.52,1,.75]);
 }
 // A two-panel, dark-glass cockpit and precise frame members.
 g.box(0,2.35,1.08,1.38,.58,2.48,GLASS,1);
 for(const side of[-1,1]){
  g.tube([side*.72,2.08,2.25],[side*.69,2.76,1.58],.044,.033,BRASS,1,7);
  g.tube([side*.69,2.76,1.58],[side*.61,2.73,-.04],.032,.028,BRASS,1,6);
  g.tube([side*.61,2.73,-.04],[side*.75,2.1,-.25],.037,.032,BRASS,1,7);
 }
 g.tube([0,2.71,2.3],[0,2.78,-.12],.031,.031,SILVER,1,6);
 g.box(0,2.60,-4.48,.18,1.45,1.12,CREAM,1);
 g.tube([0,1.6,5.52],[0,1.6,5.95],.15,.08,IRON,1,12);
 // The propeller and hub are model geometry; animation belongs to the host.
 for(const sign of[-1,1])g.quad([sign*.08,1.55,5.99],[sign*1.65,1.79,6.03],[sign*1.95,1.86,5.98],[sign*.13,1.67,5.98],tint(WOOD,.92),2);
 g.sphere(0,1.62,6,.18,BRASS,1,12,6);
 return (rings.length-1)*n*2;
}
export function appendHDRover(m,{x=0,y=0,z=0,heading=0,quality='high',seed=1}={}){
 if(!m)return 0;const g=posed(m,x,y,z,heading),d=hdDetail(quality,0);
 g.box(0,.87,0,3.15,1.20,5.60,tint(SILVER,.48),1);
 g.box(0,1.65,-.24,2.91,1.19,3.0,tint(SILVER,.54),1);
 g.box(0,1.55,1.98,2.85,.66,1.34,tint(SILVER,.57),1);
 g.box(0,2.37,-.29,2.96,.11,2.88,IRON,1);
 for(const side of[-1,1]){
  g.quad([side*1.48,1.48,1.15],[side*1.42,2.26,1.1],[side*1.42,2.27,-1.6],[side*1.51,1.48,-1.7],GLASS,1);
  g.tube([side*1.49,1.43,1.2],[side*1.43,2.28,1.12],.041,.038,BRASS,1,7);
  g.tube([side*1.42,2.27,1.13],[side*1.42,2.26,-1.63],.035,.033,BRASS,1,7);
  g.box(side*1.45,1.46,-.29,.095,.1,3.05,IRON,1);
  g.box(side*1.34,2.49,-.3,.14,.10,2.94,IRON,1);
  g.box(side*1.57,1.09,1.65,.35,.31,1.76,IRON,1);
  for(const zz of[-1.82,1.78]){
   g.tube([side*1.66,.54,zz-.38],[side*1.66,.54,zz+.38],.52,.52,RUBBER,1,d===2?18:10);
   for(let i=0;i<(d===2?15:8);i++){const a=i*TAU/(d===2?15:8);
    g.box(side*1.70,.54+Math.cos(a)*.45,zz+Math.sin(a)*.45,.10,.12,.22,tint(RUBBER,.65+i%3*.12),1);
   }
   g.sphere(side*1.69,.54,zz,.15,BRASS,1,d===2?12:8,5,[.3,1,1]);
  }
  g.box(side*.83,1.28,2.82,.39,.26,.12,CREAM,8);
  g.box(side*.98,1.14,-2.84,.45,.20,.15,[.64,.13,.10],8);
 }
 g.box(0,1.06,2.83,2.85,.40,.25,IRON,1);
 for(let i=0;i<9;i++)g.box(-1.1+i*.275,1.35,2.84,.095,.34,.08,BRASS,1);
 g.box(0,1.06,-2.87,2.6,.30,.26,IRON,1);
 g.box(0,2.56,.15,1.88,.055,1.45,WOOD,2);
 for(let i=0;i<4;i++)g.tube([-1.18,2.51,-1.45+i*.80],[1.18,2.51,-1.45+i*.80],.028,.028,IRON,1,6);
 return 1;
}
export function appendHDHouse(m,{x=0,y=0,z=0,heading=0,width=7,length=6,height=4,style='timber',quality='high',seed=2}={}){
 if(!m)return 0;const g=posed(m,x,y,z,heading),d=hdDetail(quality,0),stone=[.52,.49,.42],plaster=[.69,.65,.53],roof=[.31,.25,.21];
 g.box(0,height*.48,0,width,height*.96,length,style==='stone'?stone:plaster,style==='stone'?6:2);
 const n=d===2?16:d===1?9:5;
 for(let i=0;i<n;i++){const xx=-width/2+(i+.5)*width/n;const k=.85+.2*hash(seed+i*37);
  g.quad([xx-width/(2*n),height+.12,-length*.58],[xx+width/(2*n),height+.12,-length*.58],
   [xx+width/(2*n),height+width*.31,length*.58],[xx-width/(2*n),height+width*.31,length*.58],tint(roof,k),6);
 }
 g.box(0,height+width*.31,length*.56,width*.91,.12,.18,BRASS,1);
 for(const sx of[-1,1]){g.box(sx*width*.44,height*.5,0,.16,height*.94,length*.94,WOOD,2);
  for(const zz of[-length*.32,length*.32]){g.box(sx*width*.501,height*.58,zz,.07,1.2,.95,GLASS,1);
   g.box(sx*width*.516,height*.58,zz,.1,.065,1.06,BRASS,1);}
 }
 g.box(0,height*.43,length*.50,width*.22,height*.78,.10,WOOD,2);
 g.box(width*.078,height*.47,length*.55,.055,.06,.055,BRASS,1);
 g.box(-width*.25,height*1.27,-length*.24,.65,height*.65,.76,stone,6);
 return n;
}
/** Clustered fungi with ribbed caps, gills and irregular rooted stalks. */
export function appendHDFungus(m,p,c,{quality='medium'}={}){
 if(!m||!p||!c)return 0;
 const detail=hdDetail(quality,0),seed=seedAt(p.x,p.z,p.index),n=detail===2?13:detail===1?9:6;
 for(let k=0;k<(detail===0?1:3);k++){
  const a=k*2.399+hash(seed),x=p.x+Math.cos(a)*.39,z=p.z+Math.sin(a)*.36,y=p.y||0;
  const h=(p.near?.45:1.15)*(1+(k%2)*.42),r=.32+.17*hash(seed+k*13);
  const stem0=ring(x,y+.02,z,.10,.10,n),stem1=ring(x+.07,y+h*.88,z+.02,.06,.08,n);
  skin(m,stem0,stem1,[.65,.62,.46],2);
  const rim=ring(x+.08,y+h,z,r,r*.83,n),upper=ring(x+.08,y+h+r*.23,z,r*.53,r*.52,n);
  skin(m,rim,upper,tint(c.leaf||[.4,.44,.31],.85+k*.08),5);
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   m.tri(upper[i],upper[j],[x+.08,y+h+r*.35,z],tint(c.leaf||[.4,.44,.31],1.06),5);
   m.tri(rim[i],rim[j],[x+.08,y+h-r*.07,z],tint(c.top||[.7,.65,.48],.92),2);
  }
  if(detail>0)for(let i=0;i<n;i+=2){
   const t=rim[i],center=[x+.08,y+h-r*.07,z];
   m.tube(center,t,.007,.002,tint(c.top||[.7,.65,.48],1.04),2,4);
  }
 }
 return n;
}
/** Purposeful cairn made from interlocking dressed stones, not loose orbs. */
export function appendHDCairn(m,{x=0,y=0,z=0,quality='high',seed=9}={}){
 if(!m)return 0;
 const d=hdDetail(quality,0),n=d===2?10:7,c=[.51,.54,.48];
 for(let j=0;j<(d===0?4:7);j++){
  const h=.28+.08*hash(seed+j*31),rx=.65-j*.065,rz=.57-j*.057,xx=x+Math.sin(j*2.39)*.1,zz=z+Math.cos(j*1.62)*.09,yy=y+j*.33;
  const bottom=ring(xx,yy,zz,Math.max(.18,rx),Math.max(.18,rz),n,j*.12);
  const top=ring(xx,yy+h,zz,Math.max(.13,rx*.8),Math.max(.13,rz*.82),n,j*.12+.16);
  skin(m,bottom,top,tint(c,.85+hash(seed+j*13)*.27),7);
  for(let i=0;i<n;i++)m.tri(top[i],top[(i+1)%n],[xx,yy+h+.07,zz],tint(c,.91),7);
 }
 return n;
}
/** High-frequency riverbank reeds, staged at existing bank anchors only. */
export function appendHDReeds(m,{x=0,y=0,z=0,count=12,quality='medium',seed=31}={}){
 if(!m)return 0;const d=hdDetail(quality,0),n=Math.max(1,Math.min(count,d===0?6:d===1?18:32));
 for(let i=0;i<n;i++){
  const a=hash(seed+i*19)*TAU,r=.1+.8*hash(seed+i*47),px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r,h=.8+1.15*hash(seed+i*67);
  const top=[px+Math.cos(a)*.18,y+h,pz+Math.sin(a)*.16];
  m.tube([px,y,pz],top,.027,.007,[.33,.48,.25],2,5);
  if(d>0)m.quad([px,y+h*.44,pz],[px+.22,y+h*.69,pz+.16],
   [px+.33,y+h*.86,pz+.22],[px+.08,y+h*.56,pz+.04],[.42,.56,.27],5);
  if(i%3===0)m.tube(top,[top[0]+.05,top[1]+.24,top[2]],.038,.025,[.53,.36,.22],2,6);
 }
 return n;
}
/** Authored stone-bridge mesh: banks / paths still own collision and transport. */
export function appendHDStoneBridge(m,{x=0,y=0,z=0,heading=0,span=12,width=4,quality='high'}={}){
 if(!m)return 0;const g=posed(m,x,y,z,heading),d=hdDetail(quality,0),n=d===2?22:d===1?14:8,stone=[.51,.52,.48];
 for(let side of[-1,1])for(let i=0;i<n;i++){
  const u0=i/n,u1=(i+1)/n;
  const arc=u=>.9+1.4*(1-Math.pow(2*u-1,2)),z0=(u0-.5)*span,z1=(u1-.5)*span;
  const h0=arc(u0),h1=arc(u1),edgeX=side*width*.5;
  g.quad([edgeX,0,z0],[edgeX,0,z1],[edgeX,h1,z1],[edgeX,h0,z0],tint(stone,.88+.18*(i%3)/3),6);
  g.box(edgeX,h0+.15,(z0+z1)/2,.24,.24,(z1-z0)*.98,BRASS,1);
 }
 for(let i=0;i<5;i++)g.box(0,2.25,-span*.5+span*(i+.5)/5,width+.5,.26,span/5-.05,tint(stone,.8+.07*(i%3)),6);
 for(let side of[-1,1])for(let i=0;i<=8;i++){
  const z0=-span*.5+span*i/8;g.box(side*width*.51,3.13,z0,.20,1.58,.21,stone,6);
 }
 return n;
}
export const HD_ASSET_SCHEMA=Object.freeze({version:1,terrain:true,water:false,assets:['tree','rock','fungus','cairn','reeds','stone-bridge','aircraft','rover','house'],materials:['stone','foliage','glass','metal','wood'],collisionOwner:'world',saveOwner:'world',cameraOwner:'renderer'});
