/** Remembered outdoor arrivals have a long native approach before their
 * principal mechanism. A home/workshop threshold gives that approach a place.
 * This is scenery only: actual closed floor roots every low solid, and the
 * approach, return portal, actors and native outcome objects remain untouched. */
import {isInteriorScene} from './scene-identity.js';
import {adventureLandscapePlan} from './adventure-landscape.js?v=5.42';
import {sceneArtSpec} from './scene-art-materials-541.js?v=5.41';

const IDS=new Set(['sable-reed','rook-regulator','brass-rail','riven-tide']),TAU=Math.PI*2;
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const key=(x,z)=>x+','+z;
function closed(scene,r){
 if(r.x<.02||r.z<.02||r.x+r.w>scene.width-.02||r.z+r.d>scene.height-.02)return false;
 for(let z=Math.floor(r.z);z<=Math.floor(r.z+r.d);z++)for(let x=Math.floor(r.x);x<=Math.floor(r.x+r.w);x++)if(scene.floor[z]?.[x]!== '#')return false;
 return true;
}
function ground(plan,r){
 const heights=[];for(let z=Math.floor(r.z);z<=Math.floor(r.z+r.d);z++)for(let x=Math.floor(r.x);x<=Math.floor(r.x+r.w);x++){
  const t=plan.terraces.find(q=>x>=q.x&&x<q.x+q.w&&z>=q.z&&z<q.z+q.h);heights.push(t?.height??plan.base);
 }return Math.max(...heights)-Math.min(...heights)<=.65?Math.min(...heights)-.025:null;
}
/** The published origin opening supplies its arrival/approach, not map centre. */
export function originArrivalArtPlan541(world,{objects}={}){
 const s=world?.scene;if(!s?.floor||!IDS.has(s.originId)||isInteriorScene(s))return null;
 const opening=s.authoredOpening,at=opening?.arrival||s.arrive?.map(v=>v+.5);if(!at||!opening?.approach?.length)return null;
 // The shared origin layout has a checked two-cell service bank on the first
 // eastward native approach and a closed shoulder opposite it. Fail closed
 // if a later authoring revision changes any part of those actual footprints.
 const service=s.originId==='brass-rail'||s.originId==='riven-tide',riverArrival=s.originId==='riven-tide'&&s.originPart===0;
 const bay=riverArrival?{x:15.10,z:56.10,w:1.80,d:1.80}:service?{x:3.10,z:3.10,w:1.80,d:2.80}:{x:at[0]+1.60,z:at[1]-6.40,w:1.80,d:2.80},
  pier=riverArrival?{x:14.07,z:61.07,w:.86,d:.86}:service?{x:2.07,z:13.07,w:.86,d:.86}:{x:at[0]+2.57,z:at[1]+1.57,w:.86,d:.86};
 if(!closed(s,bay)||!closed(s,pier))return null;
 const landscape=adventureLandscapePlan(world),by=ground(landscape,bay),py=ground(landscape,pier);if(by===null||py===null)return null;
 const approach=riverArrival?opening.approach.find(q=>q[0]<at[0]-1):opening.approach.find(q=>q[0]>at[0]+2&&Math.abs(q[1]-at[1])<1),portals=(objects||s.objects||[]).filter(o=>o.type==='portal'),portal=portals.find(o=>/return/i.test(o.label||''))||portals[0];
 if(!approach||!portal)return null;
 const portalBank={x:portal.xy[0]-.90,z:portal.xy[1]-.90,w:2.80,d:.80};
 const returnBay=closed(s,portalBank)?{...portalBank,y:ground(landscape,portalBank)}:null;
 return{spec:sceneArtSpec(world),family:s.originId==='sable-reed'?'reed':s.originId==='brass-rail'?'rail':s.originId==='riven-tide'?'sluice':'furnace',arrival:{x:at[0],z:at[1]},approach:{x:approach[0],z:approach[1]},portal:{x:portal.xy[0]+.5,z:portal.xy[1]+.5},bay:{...bay,y:by},pier:{...pier,y:py},
  returnBay:!service&&returnBay?.y!==null?returnBay:null,sites:[{x:bay.x+bay.w/2,z:bay.z+bay.d*.83,y:by,kind:'shelter',height:4.55,width:bay.w,depth:bay.d}],
  clearRoute:opening.approach.filter(q=>q[0]>=at[0]&&q[0]<=at[0]+4&&Math.abs(q[1]-at[1])<.1)};
}
function local(mesh,x,y,z,sz=1){return{
 box:(a,b,c,w,h,d,col,mat=6,em=0)=>mesh.box(x+a,y+b,z+c*sz,w,h,d*sz,col,mat,em),
 tube:(a,b,r,rt,col,mat=6,n=6,em=0)=>mesh.tube([x+a[0],y+a[1],z+a[2]*sz],[x+b[0],y+b[1],z+b[2]*sz],r,rt,col,mat,n,em),
 cylinder:(a,b,c,r,h,col,mat=6,n=8,rt=r,em=0)=>mesh.cylinder(x+a,y+b,z+c*sz,r,h,col,mat,n,rt,em),
 quad:(a,b,c,d,col,mat=6,em=0)=>mesh.quad(...[a,b,c,d].map(q=>[x+q[0],y+q[1],z+q[2]*sz]),col,mat,em)
};}
function roof(mesh,b,c,reed){
 const x=b.x+b.w/2,z=b.z+b.d/2,Y=b.y+2.94,W=1.10,D=b.d/2+.17,H=.64;
 for(const side of[-1,1]){
  const g=local(mesh,x,Y,z),col=reed?mix(c.metal,c.wall,.38):mix(c.metal,c.dark,.2);
  // Both sloping faces have their real outward winding; the underside is
  // deliberately solid and remains above 2.6m even at its deep eave.
  if(side<0)g.quad([-W,0,-D],[-W,0,D],[0,H,D],[0,H,-D],col,2);
  else g.quad([0,H,-D],[0,H,D],[W,0,D],[W,0,-D],tint(col,.84),2);
  g.box(side*W,-.035,0,.09,.14,D*2+.08,c.edge);
  for(let row=0;row<7;row++){
   const t=(row+.5)/7,xx=side*W*t,yy=H*(1-t)+.018;
   g.box(xx,yy,0,.044,.040,D*2,tint(c.metal,row%2?.88:1.04));
  }
 }
 const g=local(mesh,x,Y,z);g.box(0,H+.025,0,.14,.10,D*2+.10,c.edge);
 for(const zz of[-D,D]){
  g.quad([-W,0,zz],[0,H,zz],[W,0,zz],[W,-.07,zz],tint(c.wall,.82));
  g.quad([W,-.07,zz],[W,0,zz],[0,H,zz],[-W,0,zz],tint(c.wall,.82));
 }
}
function bay(mesh,b,c,reed){
 const g=local(mesh,b.x+b.w/2,b.y,b.z+b.d/2),brick=mix(c.metal,[.62,.24,.14],reed?.40:.64),wood=mix(c.metal,c.dark,.24);
 g.box(0,.13,0,1.79,.30,2.79,tint(c.rock,.78),6.25);
 // A deep back and two real side walls hold a recessed craft frontage.
 g.box(0,1.47,-1.25,1.78,2.65,.25,mix(c.wall,c.metal,.18));
 for(const side of[-1,1]){g.box(side*.77,1.44,0,.24,2.62,2.72,c.wall);g.box(side*.77,2.69,0,.25,.12,2.74,c.edge);}
 g.box(0,.46,.98,1.76,.65,.72,brick);g.box(0,.82,.98,1.78,.10,.73,c.edge);
 g.box(0,1.76,.95,1.33,1.55,.20,tint(c.dark,.9));
 for(const side of[-1,1])g.box(side*.73,1.85,1.21,.12,1.82,.13,wood,2);
 g.box(0,2.70,1.22,1.65,.16,.17,c.edge);
 // Mortar courses continue around the native closed bay, rather than a
 // flat UI rectangle floating beside the route.
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  const xx=-.64+col*.425+(row%2?.07:0);if(xx+.18>.88)continue;
  g.box(xx,.22+row*.145,1.355,.38,.105,.035,tint(brick,.88+(col%2)*.12));
 }
 if(reed){
  const cloth=mix(c.accent,[.68,.30,.24],.42);
  g.box(0,1.69,1.075,1.22,1.36,.035,cloth);
  for(let i=0;i<6;i++)g.box(-.51+i*.204,1.69,1.10,.068,1.32,.035,i%2?c.edge:c.accent);
  g.box(0,.99,1.08,1.21,.10,.10,c.metal);
  for(const side of[-1,1])for(let i=0;i<4;i++){
   const xx=side*(.51+i*.065);g.tube([xx,.86,.58],[xx+(i-1.5)*.025,2.30-i*.11,.56],.026,.016,mix(c.accent,c.edge,.7),2,5);
  }
  for(const side of[-1,1]){g.cylinder(side*.51,1.05,.98,.145,.32,brick,6,9,.10);g.cylinder(side*.51,1.23,.98,.115,.055,c.edge,6,9,.115);}
  // Warm copper threshold lamps belong to the house frame.
  for(const side of[-1,1]){g.box(side*.72,2.23,1.28,.20,.36,.13,c.metal);g.box(side*.72,2.22,1.355,.12,.25,.025,c.edge,4,.11);}
 }else{
  g.box(-.15,1.50,.99,1.00,1.20,.16,brick);g.box(-.15,1.40,1.085,.69,.62,.04,c.dark);
  g.box(-.15,1.40,1.115,.52,.43,.025,mix(c.accent,[1,.35,.07],.25),4,.16);
  for(let i=0;i<5;i++)g.box(-.39+i*.12,1.40,1.15,.045,.57,.05,c.metal);
  for(const side of[-1,1]){
   g.tube([side*.55,.91,.65],[side*.55,2.53,.65],.095,.095,c.metal,6,8);
   g.tube([side*.55,2.53,.65],[side*.24,2.53,.65],.095,.095,c.metal,6,8);
   for(const yy of[1.02,1.65,2.26])g.cylinder(side*.55,yy,.65,.125,.09,c.edge,6,8,.125);
  }
  // The whole broad chimney remains in the closed side bank.
  g.box(.48,3.14,-.64,.56,2.58,.69,brick);g.box(.48,4.40,-.64,.72,.16,.83,c.rock,6.25);
  for(let row=0;row<8;row++)for(let col=0;col<2;col++)g.box(.34+col*.28,2.08+row*.30,-.282,.23,.23,.035,tint(brick,row%2?.88:1.03));
 }
 roof(mesh,b,c,reed);
}
function serviceBay(mesh,b,c,family){
 const rail=family==='rail',g=local(mesh,b.x+b.w/2,b.y,b.z+b.d/2,b.d/2.8),wood=mix(c.metal,c.dark,.32),wall=rail?mix(c.wall,c.metal,.28):mix(c.wall,c.foliage,.22),brick=mix(c.metal,[.60,.27,.17],.47);
 g.box(0,.17,0,1.78,.38,2.78,tint(c.rock,.83),6.25);
 g.box(0,1.49,-1.24,1.78,2.62,.25,wall);
 for(const side of[-1,1]){g.box(side*.77,1.48,0,.24,2.60,2.70,wall);g.box(side*.77,2.72,0,.25,.15,2.74,c.edge);}
 // Framing, recessed panels and a substantial service counter explain the
 // closed bank as a real keeper's workshop, with no implied walk-in opening.
 for(const side of[-1,1])g.box(side*.72,1.58,1.20,.14,2.42,.17,wood,2);
 for(const y of[.40,.88,2.74])g.box(0,y,1.21,1.72,.13,.19,c.edge);
 g.box(0,.63,1.03,1.74,.40,.65,rail?brick:wood,2);
 g.box(0,.91,1.04,1.76,.12,.66,c.edge);
 g.box(0,1.83,1.08,1.30,1.56,.12,tint(c.dark,.85));
 for(let i=0;i<7;i++)g.box(-.72+i*.24,1.50,-1.095,.19,2.30,.045,tint(wall,i%2?.88:1.03));
 for(const side of[-1,1])for(let i=0;i<5;i++)g.box(side*.895,1.35,-1.05+i*.49,.026,1.75,.39,tint(wall,i%2?.90:1.04));
 if(rail){
  const red=mix(c.accent,[.69,.22,.17],.63);
  for(const side of[-1,1]){
   g.box(side*.34,1.94,1.17,.54,1.16,.08,mix(c.wall,c.accent,.36));
   for(const yy of[1.56,1.94,2.32])g.box(side*.34,yy,1.225,.57,.055,.045,wood,2);
   g.box(side*.34,1.94,1.24,.065,1.18,.045,c.edge);
   g.box(side*.61,1.88,1.16,.11,1.44,.17,red);
  }
  g.box(0,1.09,1.16,1.14,.18,.13,wood,2);
  for(let i=0;i<4;i++)g.box(-.39+i*.26,1.11,1.24,.17,.10,.03,c.edge);
  // Signal mast, lever housing and semaphore form a railway silhouette.
  g.box(.54,2.52,-.70,.20,3.94,.25,c.metal);
  for(const yy of[.56,1.20,1.84,2.48,3.12])g.box(.54,yy,-.70,.33,.10,.35,c.edge);
  g.box(.54,4.15,-.70,.43,.56,.42,c.dark);
  g.box(.54,4.16,-.46,.29,.34,.04,c.accent,4,.11);
  g.box(-.08,3.78,-.70,1.46,.22,.16,red);
  g.box(-.57,3.78,-.60,.35,.16,.025,c.edge);
  for(const side of[-1,1])g.tube([side*.55,.95,.63],[side*.55,1.28,.44],.06,.06,c.metal,6,7);
 }else{
  const teal=mix(c.accent,c.foliage,.25);
  for(const side of[-1,1])g.box(side*.49,1.91,1.17,.24,1.42,.09,teal,2);
  g.box(0,1.75,1.17,.55,1.15,.12,mix(c.wall,c.metal,.22));
  // A broad front-facing capstan, spokes and wrapped rope belong to the
  // visible service bench; its axis is intentionally different from a UI dial.
  g.tube([-.47,1.23,.79],[.47,1.23,.79],.28,.28,wood,2,10);
  for(let i=0;i<7;i++)g.tube([-.39+i*.13,1.23,.79],[-.37+i*.13,1.23,.79],.292,.292,c.edge,6,10);
  const cy=1.91,z=1.235,r=.43;
  for(let i=0;i<12;i++){const a=i*TAU/12,b=(i+1)*TAU/12;g.tube([Math.cos(a)*r,cy+Math.sin(a)*r,z],[Math.cos(b)*r,cy+Math.sin(b)*r,z],.045,.045,c.metal,6,5);}
  for(let i=0;i<6;i++){const a=i*TAU/6;g.tube([0,cy,z],[Math.cos(a)*.47,cy+Math.sin(a)*.47,z],.035,.035,c.edge,6,5);}
  g.box(0,cy,z,.15,.15,.14,c.metal);
  for(const side of[-1,1]){
   g.box(side*.64,1.65,-.82,.16,2.72,.19,wood,2);
   g.cylinder(side*.64,2.81,-.82,.14,.18,c.metal,6,8,.14);
   for(let i=0;i<6;i++)g.box(side*.65,.68+i*.32,1.20,.20,.065,.05,i%2?c.edge:teal);
  }
  g.box(0,3.83,-.60,1.32,.15,.20,c.metal);
  for(const side of[-1,1])g.tube([side*.58,3.83,-.60],[side*.58,2.85,-.60],.045,.045,c.edge,6,6);
 }
 roof(mesh,b,c,!rail);
}
function threshold(mesh,p,c,reed){
 const a={x:p.bay.x+p.bay.w*.73,z:p.bay.z+p.bay.d-.32},b={x:p.pier.x+p.pier.w/2,z:p.pier.z+p.pier.d/2},base=Math.max(p.bay.y,p.pier.y),g=local(mesh,b.x,p.pier.y,b.z),service=p.family==='rail'||p.family==='sluice',brick=mix(c.metal,[.65,.27,.17],reed?.28:.60),body=reed?mix(c.wall,c.metal,.25):p.family==='rail'?mix(c.metal,c.dark,.26):p.family==='sluice'?mix(c.wall,c.foliage,.24):brick;
 // This shoulder is a substantial jamb, not a thin crowned pole.
 g.box(0,1.46,0,.82,2.92,.82,body);
 for(const yy of[.15,.42,2.50,2.90])g.box(0,yy,0,.85,.115,.85,c.edge);
 for(let row=0;row<7;row++)for(const side of[-1,1])g.box(side*.205,.64+row*.235,.417,.36,.18,.025,tint(brick,row%2?.91:1.04));
 // A broad curved arch crosses only above the native three-cell approach.
 const n=12,half=.31,ys=t=>base+3.08+Math.sin(t*Math.PI)*.68,point=(t,side,upper)=>[a.x+(b.x-a.x)*t+side*half,ys(t)+(upper?.29:0),a.z+(b.z-a.z)*t];
 for(let i=0;i<n;i++){
  const t=i/n,u=(i+1)/n,col=i%3===0?c.edge:reed?mix(c.metal,c.wall,.24):service?body:brick,
   A=point(t,-1,0),B=point(u,-1,0),C=point(u,1,0),D=point(t,1,0),E=point(t,-1,1),F=point(u,-1,1),G=point(u,1,1),H=point(t,1,1);
  mesh.quad(A,D,C,B,tint(col,.65));mesh.quad(E,F,G,H,col);mesh.quad(D,H,G,C,tint(col,.95));mesh.quad(B,F,E,A,tint(col,.84));mesh.quad(A,E,H,D,col);mesh.quad(C,G,F,B,col);
 }
 // Copper/reed roof collars explain the join into both real masonry banks.
 for(const end of[a,b]){const h=base+3.16;mesh.box(end.x,h,end.z,.83,.20,.72,c.metal);}
 if(reed){
  // Alternating scalloped textile under the crown remains over head height.
  for(let i=0;i<6;i++){
   const t=(i+.5)/6,z=a.z+(b.z-a.z)*t,y=ys(t)-.10;mesh.box(a.x+(b.x-a.x)*t,y,z,.65,.18,.73,i%2?c.accent:mix(c.accent,[.65,.28,.20],.45));
  }
 }else if(!service){
  const x=(a.x+b.x)/2+.36,y=base+3.54;
  mesh.tube([x,y,a.z+.1],[x,y,b.z-.1],.10,.10,c.metal,6,8);
  for(let i=0;i<6;i++){const z=a.z+.38+i*(b.z-a.z-.76)/5;mesh.cylinder(x,y,z,.145,.10,c.edge,6,8,.145);}
 }else{
  // Continuous rail/tow lines hang only above the legal approach, attached
  // to the keeper's roof and opposite jamb rather than scattered scenery.
  const col=p.family==='rail'?c.metal:c.edge;
  for(const side of[-1,1])for(let i=0;i<8;i++){
   const t=i/8,u=(i+1)/8,A=point(t,side,1),B=point(u,side,1);A[1]+=.15;B[1]+=.15;mesh.tube(A,B,.035,.035,col,6,5);
  }
 }
}
function returnLoggia(mesh,p,c,reed){
 if(!p.returnBay)return;const b=p.returnBay,g=local(mesh,p.portal.x,b.y,p.portal.z-1),cloth=reed?mix(c.accent,[.72,.33,.22],.40):mix(c.metal,c.dark,.16);
 for(const side of[-1,1]){
  g.box(side*1.19,1.61,0,.26,3.22,.46,reed?c.wall:mix(c.metal,[.62,.27,.16],.60));
  for(const y of[.18,2.52,3.12])g.box(side*1.19,y,0,.36,.10,.55,c.edge);
 }
 g.box(0,3.20,0,2.74,.23,.54,c.edge);
 // A porch roof physically marks the unchanged return portal below it.
 // The front edge is at 3.03m above its terrace, safely above every walk.
 g.quad([-1.48,3.62,-.44],[-1.48,3.10,1.72],[1.48,3.10,1.72],[1.48,3.62,-.44],cloth,2);
 g.quad([1.48,3.62,-.44],[1.48,3.10,1.72],[-1.48,3.10,1.72],[-1.48,3.62,-.44],tint(cloth,.66),2);
 g.box(0,3.10,1.72,3.02,.14,.12,c.metal);
 for(let i=0;i<7;i++)g.box(-1.38+i*.46,3.09,1.73,.09,.19,.14,c.edge);
 for(let i=0;i<5;i++){const z=-.40+i*.52,y=3.62-(z+.44)/2.16*.52;g.box(0,y+.012,z,2.96,.045,.035,c.metal);}
}
export function appendOriginArrivalArt541(mesh,{world,objects}={}){
 const p=originArrivalArtPlan541(world,{objects});if(!p)return null;
 const start=mesh.v.length,c=p.spec.palette,reed=p.family==='reed';if(p.family==='rail'||p.family==='sluice')serviceBay(mesh,p.bay,c,p.family);else bay(mesh,p.bay,c,reed);threshold(mesh,p,c,reed);returnLoggia(mesh,p,c,reed);
 const stats={family:p.family,sites:p.sites.length,triangles:(mesh.v.length-start)/36,arrival:p.arrival,portal:p.portal,approach:p.approach};
 return{...p,stats};
}
