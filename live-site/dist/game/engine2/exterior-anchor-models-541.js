/** Regional landmarks beside real approaches, never loose coordinate scatter.
 * Narrow sites carry one closed-cell root. Their articulated crowns only
 * spread after the native head-clearance plane, leaving routes usable. */
const TAU=Math.PI*2;
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
const IVORY=[.84,.82,.69],COPPER=[.67,.43,.24],BLOSSOM=[.88,.68,.51];
const KINDS={village:'canopy',woodland:'canopy',mangrove:'roots',spore:'collector',sand:'aqueduct',cactus:'cactus',coral:'coral',salt:'tideglass',riverbank:'waterwheel',highland:'windharp',storm:'windharp',foundry:'conduit',lava:'basalt',caldera:'basalt',crystal:'mineral',ice:'ice-rib',aurora:'aurora-rib',ruins:'ruin',marble:'marble'};

function local(mesh,site){
 const p=v=>[site.x+v[0],site.y+v[1],site.z+v[2]];
 return {
  box:(x,y,z,w,h,d,c,mat=6,em=0,rot=0)=>mesh.box(site.x+x,site.y+y,site.z+z,w,h,d,c,mat,em,rot),
  tube:(a,b,r0,r1,c,mat=6,n=6,em=0)=>mesh.tube(p(a),p(b),r0,r1,c,mat,n,em),
  cylinder:(x,y,z,r,h,c,mat=6,n=7,rt=r,em=0)=>mesh.cylinder(site.x+x,site.y+y,site.z+z,r,h,c,mat,n,rt,em),
  sphere:(x,y,z,r,c,mat=6,em=0,n=7,rows=3,shape=[1,1,1])=>mesh.sphere(site.x+x,site.y+y,site.z+z,r,c,mat,em,n,rows,shape),
  tri:(a,b,c,color,mat=6,em=0)=>mesh.tri(p(a),p(b),p(c),color,mat,em),
  quad:(a,b,c,d,color,mat=6,em=0)=>mesh.quad(p(a),p(b),p(c),p(d),color,mat,em)
 };
}
function stem(g,points,radii,color,mat=6,n=6){for(let i=1;i<points.length;i++)g.tube(points[i-1],points[i],radii[i-1],radii[i],tint(color,.91+i*.035),mat,n);}
function foot(g,c,slim){
 const radius=slim?.27:1.08,top=slim?.18:.26,points=[];
 for(let i=0;i<8;i++){const a=i*TAU/8,r=radius*(.93+(i%3)*.035);points.push([Math.cos(a)*r,Math.sin(a)*r*.88]);}
 for(let i=0;i<8;i++){const a=points[i],b=points[(i+1)%8];g.quad([b[0],-.035,b[1]],[a[0],-.035,a[1]],[a[0]*.85,top,a[1]*.85],[b[0]*.85,top,b[1]*.85],tint(c.rock,.81+(i%3)*.06),6.25);g.tri([0,top+.02,0],[b[0]*.85,top,b[1]*.85],[a[0]*.85,top,a[1]*.85],tint(c.rock,1.06),6.25);}
}
function rockMass(g,color,x,z,rx,rz,height,mat=6.25){
 const outline=[[-.55,-1],[.55,-1],[1,-.55],[1,.55],[.55,1],[-.55,1],[-1,.55],[-1,-.55]],levels=[[.03,1],[height*.58,1],[height*.92,.72]];
 for(let k=0;k<2;k++)for(let i=0;i<8;i++){
  const a=outline[i],b=outline[(i+1)%8],[lo,ls]=levels[k],[hi,hs]=levels[k+1];
  g.quad([x+b[0]*rx*ls,lo,z+b[1]*rz*ls],[x+a[0]*rx*ls,lo,z+a[1]*rz*ls],[x+a[0]*rx*hs,hi,z+a[1]*rz*hs],[x+b[0]*rx*hs,hi,z+b[1]*rz*hs],tint(color,.82+(i%3)*.065+k*.06),mat);
 }
 for(let i=0;i<8;i++){const a=outline[i],b=outline[(i+1)%8];g.tri([x+.04,height,z-.025],[x+b[0]*rx*.72,height*.92,z+b[1]*rz*.72],[x+a[0]*rx*.72,height*.92,z+a[1]*rz*.72],tint(color,1.07-(i%2)*.055),mat);}
}
function fern(g,c,x,z){
 const leaf=mix(c.foliage,c.accent,.16);g.tube([x,.10,z],[x,.59,z],.027,.015,c.foliage,6,4);
 for(let i=0;i<5;i++){
  const a=i*TAU/5+.2,dx=Math.cos(a),dz=Math.sin(a),side=[-dz*.075,dx*.075],p=[[x,.15,z],[x+dx*.14+side[0],.64,z+dz*.14+side[1]],[x+dx*.35,.46,z+dz*.35],[x+dx*.18-side[0],.30,z+dz*.18-side[1]]];
  g.quad(...p,tint(leaf,.86+i*.045),5);g.quad(...p.slice().reverse(),tint(leaf,.77+i*.035),5);
 }
}
function rootGarden(g,c,wet=false){
 const moss=mix(c.rock,c.foliage,wet?.62:.49);
 rockMass(g,moss,0,-.03,.66,.57,.66,6);rockMass(g,moss,-.49,.16,.36,.33,.44,6);rockMass(g,moss,.46,-.24,.34,.32,.50,6);
 fern(g,c,-.45,.34);fern(g,c,.40,-.29);
}
function brokenWindArch(g,c){
 const radius=.64,inner=.43,spring=.83,z=.44,depth=.20;
 const point=(a,r,Z)=>[Math.cos(a)*r,spring+Math.sin(a)*r,Z];
 for(let i=0;i<8;i++){
  if(i===2||i===3)continue;const a=i*Math.PI/8,b=(i+1)*Math.PI/8;
  g.quad(point(a,inner,z+depth/2),point(a,radius,z+depth/2),point(b,radius,z+depth/2),point(b,inner,z+depth/2),mix(c.wall,IVORY,.25),6.25);
  g.quad(point(b,inner,z-depth/2),point(b,radius,z-depth/2),point(a,radius,z-depth/2),point(a,inner,z-depth/2),c.rock,6.25);
  g.quad(point(a,radius,z+depth/2),point(a,radius,z-depth/2),point(b,radius,z-depth/2),point(b,radius,z+depth/2),c.edge,6);
  g.quad(point(a,inner,z-depth/2),point(a,inner,z+depth/2),point(b,inner,z+depth/2),point(b,inner,z-depth/2),tint(c.rock,.76),6.25);
 }
 for(const side of[-1,1])g.box(side*.535,.48,z,.21,.71,depth,c.wall,6.25);
}
function rockUnderstory(g,c,hot){
 const stone=hot?mix(c.rock,c.dark,.23):mix(c.wall,c.rock,.27);
 rockMass(g,stone,0,-.035,.75,.61,hot?1.34:.94);
 rockMass(g,tint(stone,.95),-.49,.10,.39,.34,hot?.83:.67);
 rockMass(g,tint(stone,1.04),.46,.19,.38,.31,hot?.94:.54);
 if(hot){
  const h=1.34,depth=y=>.61*(y<h*.58?1:1-.28*(y-h*.58)/(h*.34))-.035+.012,col=mix(c.accent,[.92,.30,.075],.54),joints=[[.20,-.13,.095],[.56,-.025,.085],[.91,-.10,.07],[1.18,.055,.045]];
  for(let i=1;i<joints.length;i++){const a=joints[i-1],b=joints[i];g.quad([a[1]-a[2],a[0],depth(a[0])],[a[1]+a[2],a[0],depth(a[0])],[b[1]+b[2],b[0],depth(b[0])],[b[1]-b[2],b[0],depth(b[0])],col,6,.17);}
 }else brokenWindArch(g,c);
}
function mineralUnderstory(g,c,ice){
 const color=mix(ice?c.accent:c.rock,IVORY,ice?.30:.10);
 rockMass(g,color,0,0,.78,.59,.76,ice?6:6.25);rockMass(g,tint(color,.94),-.47,.03,.39,.36,1.08,ice?6:6.25);
 // Two broad, angled fracture plates emerge from the same grounded bed.
 for(const side of[-1,1]){
  const x=side*.34,z=-.04,w=.36,d=.18,lean=side*.18,h=side>0?1.74:2.04;
  const a=[x-w/2,.30,z-d/2],b=[x+w/2,.30,z-d/2],cc=[x+w*.31+lean,h,z-d/2],dd=[x-w*.31+lean,h,z-d/2],back=p=>[p[0],p[1],p[2]+d];
  g.quad(dd,cc,b,a,tint(color,.83),6);g.quad(back(a),back(b),back(cc),back(dd),mix(color,IVORY,.20),6);g.quad(a,back(a),back(dd),dd,tint(color,.74),6);g.quad(b,cc,back(cc),back(b),color,6);g.quad(dd,back(dd),back(cc),cc,tint(color,1.11),6);g.quad(back(a),a,b,back(b),tint(color,.69),6);
 }
}
function woodCrown(g,c,s,roots=false){
 const wood=mix(c.dark,c.rock,.33),leaf=c.foliage,index=s.index||0;
 foot(g,c,s.slim);if(!s.slim)rootGarden(g,c,roots);
 stem(g,[[0,.12,0],[-.07,1.26,.02],[.08,2.76,-.06]],s.slim?[.22,.18,.13]:[.32,.25,.16],wood,2,7);
 if(!s.slim)for(let i=0;i<4;i++){const a=i*TAU/4+.3,r=roots?1.02:.78;stem(g,[[Math.cos(a)*r,.10,Math.sin(a)*r*.82],[Math.cos(a)*.35,.66,Math.sin(a)*.35],[0,1.26,0]],[.09,.13,.15],wood,2,5);}
 else for(let i=0;i<3;i++){const a=i*TAU/3;g.tube([Math.cos(a)*.24,.06,Math.sin(a)*.24],[0,.63,0],.035,.075,wood,2,5);}
 for(let i=0;i<3;i++){
  const a=i*TAU/3+.45+index*.13,x=Math.cos(a)*.81,z=Math.sin(a)*.69,y=3.12+(i%2)*.34;
  g.tube([.02,2.78,0],[x,y,z],.115,.045,wood,2,5);
  g.sphere(x,y+.17,z,.83,tint(leaf,.84+i*.08),5,0,7,4,[1,.55,1]);
 }
 g.sphere(-.10,3.85,-.03,.71,tint(leaf,1.08),5,0,7,3,[1,.50,1]);
 if(roots)for(let i=0;i<3;i++){const a=i*TAU/3+.1;g.tube([Math.cos(a)*.54,2.92,Math.sin(a)*.54],[Math.cos(a)*.47,2.65,Math.sin(a)*.47],.035,.017,mix(c.accent,leaf,.55),6,4);}
}
function reeds(g,c,s){
 foot(g,c,s.slim);const base=s.slim?2.78:.22,green=mix(c.foliage,c.accent,.2);
 if(s.slim)stem(g,[[0,.1,0],[-.06,1.4,0],[0,2.84,0]],[.20,.16,.12],c.rock,6.25,7);
 for(let i=0;i<5;i++){
  const a=i*TAU/5+.35,r=s.slim?.63:.63,x=Math.cos(a)*r,z=Math.sin(a)*r*.72,h=s.slim?3.38+(i%3)*.18:1.7+(i%3)*.22;
  const from=s.slim?[0,2.77,0]:[x*.35,.12,z*.35];
  g.tube(from,[x,h-.10,z],.045,.025,green,6,5);
  g.sphere(x,h+.09,z,.14,mix(c.accent,COPPER,.35),6,0,6,3,[.8,1.65,.8]);
  const root=s.slim?[x*.48,2.88,z*.48]:[x*.36,.30,z*.36],side=[Math.cos(a+.55)*.31,0,Math.sin(a+.55)*.31];
  g.quad(root,[x+side[0],h-.38,z+side[2]],[x+side[0]*.4,h-.22,z+side[2]*.4],[x*.8,h-.45,z*.8],tint(green,.84+i*.04),6);
  g.quad([x*.8,h-.45,z*.8],[x+side[0]*.4,h-.22,z+side[2]*.4],[x+side[0],h-.38,z+side[2]],root,tint(green,1.04),6);
 }
}
/** A working waterfront silhouette on a full, checked closed-water parcel.
 * The wheel, pile wharf and broad pitched copper shelter share one footing;
 * narrow banks retain reeds instead of squeezing a mill into a walk cell. */
function riverMill(g,c,s){
 const timber=mix(c.metal,COPPER,.56),rim=mix(c.edge,COPPER,.42),dark=mix(c.dark,timber,.18),roof=mix(c.metal,[.20,.43,.40],.56);
 foot(g,c,false);
 // Four real piles support a narrow bank-side service wharf.
 for(const x of[-.65,.65])for(const z of[-.53,.40]){
  g.box(x,.55,z,.17,1.16,.17,dark,2);g.box(x,1.15,z,.22,.10,.22,rim);
 }
 g.box(0,.81,-.13,1.54,.16,1.22,timber,2);
 for(let i=0;i<6;i++)g.box(-.65+i*.26,.91,-.13,.24,.055,1.22,tint(timber,.84+(i%3)*.09),2);
 // Tall rear posts and a substantial pitched roof distinguish this as a
 // waterfront apparatus, with all low geometry inside the full root disk.
 for(const x of[-.66,.66]){
  g.box(x,1.92,-.51,.14,2.00,.14,timber,2);
  g.tube([x,2.30,-.51],[x*.22,2.74,-.51],.045,.045,rim,6,4);
 }
 for(const z of[-.55,.49])g.box(0,2.72,z,1.74,.14,.12,timber,2);
 const roofY=2.82,peak=3.20,W=.99,D=.70;
 for(const side of[-1,1]){
  const a=[side*W,roofY,-D],b=[side*W,roofY,D],cc=[0,peak,D],d=[0,peak,-D];
  g.quad(a,b,cc,d,tint(roof,side<0?.84:1.06),6);g.quad(d,cc,b,a,tint(roof,.72),6);
  g.box(side*W,roofY-.025,0,.08,.10,D*2,rim);
 }
 g.box(0,peak+.025,0,.10,.10,D*2+.04,rim);
 // Actual annular wheel faces, inner rim, outer rim and eight radial spokes.
 const cy=1.30,z=.67,R=1.02,r=.84,depth=.18,point=(a,rr,zz)=>[Math.cos(a)*rr,cy+Math.sin(a)*rr,zz];
 for(let i=0;i<12;i++){
  const a=i*TAU/12,b=(i+1)*TAU/12;
  g.quad(point(a,r,z+depth/2),point(a,R,z+depth/2),point(b,R,z+depth/2),point(b,r,z+depth/2),rim,2);
  g.quad(point(b,r,z-depth/2),point(b,R,z-depth/2),point(a,R,z-depth/2),point(a,r,z-depth/2),dark,2);
  g.quad(point(a,R,z+depth/2),point(a,R,z-depth/2),point(b,R,z-depth/2),point(b,R,z+depth/2),timber,2);
  g.quad(point(a,r,z-depth/2),point(a,r,z+depth/2),point(b,r,z+depth/2),point(b,r,z-depth/2),dark,2);
 }
 for(let i=0;i<8;i++){
  const a=i*TAU/8,p=point(a,.86,z);
  g.tube([0,cy,z],p,.045,.045,timber,2,4);
  const q=point(a,.96,z);g.box(q[0],q[1],q[2],.18,.14,.30,tint(timber,.83+(i%3)*.08),2);
 }
 g.tube([0,cy,-.56],[0,cy,.99],.115,.115,rim,6,6);
 g.tube([0,cy,.86],[0,cy,1.02],.235,.19,dark,2,8);
 // The feed trough and sluice housing give the wheel a visible purpose.
 g.box(-.45,1.18,-.23,.30,.48,.46,dark,2);g.box(-.45,1.44,-.23,.40,.10,.54,rim);
 g.box(.37,1.11,-.25,.45,.32,.52,mix(c.wall,COPPER,.35),6);
 g.box(.37,1.30,-.25,.48,.07,.55,rim);
}
function spores(g,c,s){
 foot(g,c,s.slim);const stalk=mix(c.wall,c.foliage,.20),head=mix(c.foliage,c.accent,.36);
 if(!s.slim){
  rockMass(g,mix(c.rock,c.foliage,.52),-.22,.06,.63,.53,.33,6);rockMass(g,mix(c.rock,c.foliage,.46),.42,-.10,.36,.35,.25,6);
  for(const [i,x,z,y,r]of[[0,-.48,.11,1.20,.49],[1,.43,-.17,2.00,.56],[2,.015,.015,3.10,.80]]){
   stem(g,[[x*.77,.13,z*.77],[x-.045,y*.54,z],[x,y-.12,z]],[.17,.13,.09],tint(stalk,.91+i*.05),6,6);
   g.sphere(x,y,z,r,tint(head,.83+i*.075),5,0,8,3,[1,.32,1]);
   for(let j=0;j<4;j++){const a=j*TAU/4+.1;g.tube([x,y-.14,z],[x+Math.cos(a)*r*.77,y-.055,z+Math.sin(a)*r*.77],.025,.035,mix(IVORY,head,.24),6,4);}
  }
  return;
 }
 stem(g,[[0,.13,0],[.06,1.48,-.04],[-.04,2.86,.02]],[.22,.17,.12],stalk,6,7);
 for(let i=0;i<3;i++){
  const a=i*TAU/3+.30,x=Math.cos(a)*.68,z=Math.sin(a)*.57,y=3.12+(i%2)*.40,r=i===2?.65:.84;
  g.tube([0,2.77,0],[x,y-.05,z],.095,.075,stalk,6,5);
  g.sphere(x,y+.10,z,r,tint(head,.84+i*.07),5,0,8,3,[1,.31,1]);
  for(let j=0;j<4;j++){const b=j*TAU/4+.2;g.tube([x,y-.12,z],[x+Math.cos(b)*r*.77,y-.03,z+Math.sin(b)*r*.77],.025,.035,mix(IVORY,head,.24),6,4);}
 }
}
function cactus(g,c,s){
 foot(g,c,s.slim);const green=mix(c.foliage,c.accent,.12),hinge=s.slim?2.82:1.24,top=s.slim?3.93:3.05;
 g.cylinder(0,(.18+top)/2,0,.21,top-.18,green,5,9,.16);
 for(const side of[-1,1]){
  const x=side*.69,y=hinge+side*.13;
  stem(g,[[0,y,0],[x,y+.15,.03],[x,Math.min(top-.17,y+.79),.03]],[.10,.10,.075],tint(green,.87+side*.04),5,6);
 }
 for(let i=0;i<5;i++){const a=i*TAU/5;g.sphere(Math.cos(a)*.13,top+.07,Math.sin(a)*.13,.14,mix(c.accent,BLOSSOM,.65),6,0,6,3,[1,.62,1]);}
 for(const side of[-1,1])g.tube([side*.125,.31,.13],[side*.09,top-.21,.12],.018,.013,tint(green,1.32),6,4);
}
function splitStone(g,c,s,hot=false){
 foot(g,c,s.slim);const start=s.slim?2.78:.18,stone=hot?mix(c.rock,c.dark,.28):mix(c.wall,c.rock,.42);
 if(!s.slim)rockUnderstory(g,c,hot);
 if(s.slim)stem(g,[[0,.11,0],[.055,1.48,0],[0,2.87,0]],[.24,.20,.14],stone,6.25,7);
 for(let i=0;i<3;i++){
  const x=(i-1)*.58,z=(i%2)*.27-.13,base=s.slim?[0,2.78,0]:[x*.73,start,z],middle=[x,start+(s.slim?.57:1.12),z-.03],top=[x*.92+.08,start+(s.slim?1.17:hot?1.86:2.05)+(i===1?.24:0),z-.12];
  stem(g,[base,middle,top],[s.slim?.10:.32,s.slim?.19:.29,s.slim?.035:hot?.145:.115],tint(stone,.87+i*.06),6.25,6);
  const front=[middle[0],middle[1],middle[2]+.17];
  g.tri([front[0]-.08,front[1]-.20,front[2]],[front[0]+.09,front[1]-.17,front[2]],[top[0],top[1]-.18,top[2]+.055],hot?mix(c.accent,[.9,.32,.10],.43):mix(c.edge,IVORY,.35),6,hot?.11:0);
 }
 for(let i=0;i<3;i++){const x=(i-1)*.41,y=s.slim?3.16:1.58;g.sphere(x,y,.14,.17,hot?mix(c.metal,COPPER,.4):mix(c.foliage,c.rock,.36),6,0,6,3,[1,.65,.7]);}
}
function mineral(g,c,s,ice=false){
 foot(g,c,s.slim);const cool=mix(c.accent,IVORY,ice?.31:.12);
 if(!s.slim)mineralUnderstory(g,c,ice);
 if(s.slim)stem(g,[[0,.08,0],[-.05,1.42,.03],[0,2.83,0]],[.24,.18,.12],mix(c.rock,cool,.3),6.25,7);
 for(let i=0;i<4;i++){
  const a=(i-1.5)*.65,x=Math.sin(a)*.74,z=Math.cos(a)*.18-.20,y=s.slim?2.79:.24,peak=s.slim?3.86+(i%2)*.26:2.45+(i%2)*.68,r=s.slim?.14:ice?.33:.34;
  if(ice)stem(g,[s.slim?[0,2.80,0]:[x*.75,.24,z],[x*.98,y+(peak-y)*.56,z-.10],[x*.60,peak,z+.04]],[r,r*.85,.025],tint(cool,.81+i*.055),6,5);
  else stem(g,[s.slim?[0,2.80,0]:[x,.24,z],[x,peak-.52,z],[x+.10,peak,z-.07]],[r,r*.92,0],tint(cool,.78+i*.065),6,5);
 }
 for(let i=0;i<3;i++){const x=(i-1)*.43,y=s.slim?3.25:1.42;g.tube([x,y,.03],[x+.11,y+.38,.02],.08,.025,mix(cool,IVORY,.45),6,5);}
 g.tube([.20,s.slim?3.16:.42,-.12],[.30,s.slim?3.58:1.02,-.16],.11,.025,tint(cool,.92),6,5);
}
function coral(g,c,s){
 foot(g,c,s.slim);const pink=mix(c.accent,[.77,.48,.40],.32),start=s.slim?2.78:.20;
 if(s.slim)stem(g,[[0,.1,0],[.03,1.45,.02],[0,2.86,0]],[.23,.18,.12],mix(c.rock,pink,.28),6,7);
 for(let i=0;i<4;i++){
  const a=(i-1.5)*.62,x=Math.sin(a)*.79,z=(i%2)*.22-.11,h=start+(s.slim?.76:1.76)+(i%2)*.25;
  stem(g,[[0,start,0],[x*.55,start+(h-start)*.58,z],[x,h,z]],[s.slim?.09:.16,.11,.055],tint(pink,.87+i*.045),6,6);
  g.sphere(x,h,z,.18,mix(pink,IVORY,.15),6,0,6,3,[1,.85,1]);
 }
}
function glassCrown(g,c,s){
 foot(g,c,s.slim);const start=s.slim?2.77:.30,head=s.slim?3.40:1.97;
 stem(g,[[0,.12,0],[.04,1.37,0],[0,s.slim?2.86:1.39,0]],[.23,.17,.10],c.metal,6,7);
 for(let i=0;i<3;i++){
  const x=(i-1)*.56,z=(i%2)*.18-.05;
  g.tube([0,start,0],[x,head-.25,z],.07,.045,c.metal,6,5);
  g.sphere(x,head+.06,z,.34,mix(c.accent,IVORY,.38),6,0,7,4,[.69,1.4,.69]);
  g.cylinder(x,head-.35,z,.22,.10,COPPER,6,8,.20);
 }
}
function brazier(g,c,s){
 foot(g,c,s.slim);const head=s.slim?3.10:1.90;
 stem(g,[[0,.10,0],[-.06,1.35,.01],[0,head-.23,0]],[.24,.18,.12],mix(c.metal,c.dark,.25),6,7);
 for(let i=0;i<8;i++){
  const a=i*TAU/8,b=(i+1)*TAU/8,r=.63;
  g.quad([Math.cos(b)*.17,head-.16,Math.sin(b)*.17],[Math.cos(b)*r,head+.16,Math.sin(b)*r],[Math.cos(a)*r,head+.16,Math.sin(a)*r],[Math.cos(a)*.17,head-.16,Math.sin(a)*.17],tint(COPPER,.85+(i%3)*.06),6);
  g.quad([Math.cos(a)*.17,head-.19,Math.sin(a)*.17],[Math.cos(a)*r,head+.13,Math.sin(a)*r],[Math.cos(b)*r,head+.13,Math.sin(b)*r],[Math.cos(b)*.17,head-.19,Math.sin(b)*.17],c.metal,6);
 }
 for(let i=0;i<4;i++){
  const a=i*TAU/4+.1,x=Math.cos(a)*.28,z=Math.sin(a)*.28;
  stem(g,[[x,head+.09,z],[x*.70,head+.39+(i%2)*.16,z*.70],[x*.34,head+.73+(i%2)*.12,z*.34]],[.14,.11,0],mix(c.accent,[.92,.36,.12],.41),6,5);
 }
 g.cylinder(0,head+.04,0,.34,.08,c.dark,6,10,.32);
}
function harp(g,c,s,aurora=false){
 foot(g,c,s.slim);const bottom=s.slim?2.78:.30,top=s.slim?3.93:3.28,m=mix(c.metal,COPPER,.18);
 if(s.slim)stem(g,[[0,.10,0],[-.055,1.45,.02],[0,2.86,0]],[.22,.16,.11],c.rock,6.25,7);
 for(const side of[-1,1])stem(g,[s.slim?[0,bottom,0]:[side*.69,bottom,.02],[side*.72,bottom+(top-bottom)*.53,.01],[side*.48,top,-.03],[0,top+.21,-.04]],[.10,.085,.065,.04],aurora?mix(c.rock,c.accent,.36):m,6,6);
 for(let i=0;i<4;i++){
  const x=(i-1.5)*.23,y0=bottom+.12,y1=top+.08-Math.abs(x)*.18,w=aurora?.12:.055;
  g.quad([x-w/2,y0,.04],[x+w/2,y0,.04],[x+w/2,y1,.04],[x-w/2,y1,.04],aurora?mix(c.accent,IVORY,i*.16):c.edge,6);
  g.quad([x-w/2,y1,.04],[x+w/2,y1,.04],[x+w/2,y0,.04],[x-w/2,y0,.04],tint(c.accent,.80),6);
 }
 for(let i=0;i<3;i++)g.sphere((i-1)*.40,top-.10,-.02,.12,mix(c.foliage,c.accent,.48),6,0,6,3,[1,.6,1]);
}
function pillar(g,c,s,marble=false){
 foot(g,c,s.slim);const stone=marble?mix(c.wall,IVORY,.35):mix(c.wall,c.rock,.30),r=s.slim?.23:.48;
 g.cylinder(0,1.42,0,r,2.62,stone,6.25,9,r*.79);
 for(let i=0;i<5;i++){const a=i*TAU/5;g.tube([Math.cos(a)*r*.85,.35,Math.sin(a)*r*.85],[Math.cos(a)*r*.73,2.52,Math.sin(a)*r*.73],.025,.025,tint(c.edge,.86),6,4);}
 const crown=2.83;
 g.cylinder(0,crown,0,.36,.18,mix(c.edge,IVORY,.20),6,9,.39);
 for(let i=0;i<4;i++){
  const a=i*TAU/4+.3,x=Math.cos(a)*.73,z=Math.sin(a)*.65;
  g.tube([0,crown+.03,0],[x,3.24,z],.13,.07,stone,6.25,5);
  g.sphere(x,3.30,z,.24,mix(c.edge,IVORY,marble?.45:.18),6,0,6,3,[.7,1.0,.7]);
 }
}
function pavilion(g,c,s){
 foot(g,c,false);
 for(const x of[-.72,.72])for(const z of[-.68,.68]){g.cylinder(x,1.43,z,.065,2.86,c.metal,6,6,.05);g.cylinder(x,.14,z,.13,.20,c.edge,6,7,.12);}
 for(const side of[-1,1])g.tube([side*.72,2.78,-.68],[0,3.14,0],.04,.04,COPPER,6,5);
 for(let i=0;i<4;i++){
  const x0=-.92+i*.46,x1=x0+.46,col=i%2?mix(c.accent,c.foliage,.18):IVORY;
  g.quad([x0,3.18,0],[x1,3.18,0],[x1,2.84,-.87],[x0,2.84,-.87],tint(col,.91),6);
  g.quad([x0,2.75,.87],[x1,2.75,.87],[x1,3.18,0],[x0,3.18,0],col,6);
 }
 g.box(0,.76,-.22,1.40,.14,.60,mix(c.wall,c.dark,.30),2);
 for(const x of[-.55,.55])g.box(x,.40,-.22,.09,.66,.45,c.metal,6);
 for(let i=0;i<3;i++){const x=(i-1)*.37;g.cylinder(x,.99,-.23,.12,.31,mix(c.wall,c.accent,i*.25),6,8,.15);g.cylinder(x,1.17,-.23,.11,.04,c.edge,6,8,.09);}
}

export function appendExteriorAnchorModel(mesh,site,spec){
 if(!mesh?.v||!site||![site.x,site.z,site.y??0].every(Number.isFinite)||!spec?.palette)return null;
 const s={...site,y:site.y??0},c=spec.palette,family=site.family||spec.style||spec.family,kind=site.kind||KINDS[family]||'canopy',before=mesh.v.length,g=local(mesh,s);
 switch(kind){
  case'canopy':woodCrown(g,c,s);break;case'roots':woodCrown(g,c,s,true);break;case'collector':spores(g,c,s);break;
  case'waterwheel':if(s.slim)reeds(g,c,s);else riverMill(g,c,s);break;case'aqueduct':splitStone(g,c,s);break;case'cactus':cactus(g,c,s);break;case'coral':coral(g,c,s);break;
  case'mineral':mineral(g,c,s);break;case'ice-rib':mineral(g,c,s,true);break;case'aurora-rib':harp(g,c,s,true);break;
  case'windharp':harp(g,c,s);break;case'conduit':brazier(g,c,s);break;case'basalt':splitStone(g,c,s,true);break;
  case'tideglass':glassCrown(g,c,s);break;case'ruin':pillar(g,c,s);break;case'marble':pillar(g,c,s,true);break;
  case'pavilion':if(s.slim)woodCrown(g,c,s);else pavilion(g,c,s);break;default:woodCrown(g,c,s);
 }
 return {family,kind,triangles:(mesh.v.length-before)/36,anchorId:s.anchorId,slim:!!s.slim};
}

export function appendExteriorAnchorDynamics(mesh,site,spec,time=0){
 if(!mesh?.v||!site||!spec?.palette||!Number.isFinite(time))return null;
 const kind=site.kind||KINDS[site.family||spec.style||spec.family],before=mesh.v.length;
 if(!['windharp','aurora-rib','pavilion'].includes(kind))return{triangles:0};
 const s={...site,y:site.y??0},g=local(mesh,s),c=spec.palette,y=kind==='pavilion'?3.23:s.slim?4.16:3.51,a=Math.sin(time*.72+(site.index||0)*.42)*.18,z=.08+Math.sin(time*1.1)*.035;
 const points=[[0,y,-.04],[.57,y+a,z],[.42,y+.30+a,z+.02],[.03,y+.18,-.04]];
 g.quad(...points,mix(c.accent,COPPER,.25),6);g.quad(...points.slice().reverse(),tint(c.edge,.86),6);
 return{triangles:(mesh.v.length-before)/36};
}
