/** A copper-and-ceramic listening horn carried by Veyr's real mast.
 * This module draws native visual state; it never reserves floor or advances
 * the receiver, grounding, repair, or reply choices. */
const TAU=Math.PI*2;
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add=(a,b,t=1)=>a.map((v,i)=>v+b[i]*t);
const tint=(a,t)=>a.map(v=>Math.max(0,Math.min(1,v*t)));
const P={copper:[.62,.29,.15],edge:[.83,.61,.33],patina:[.08,.35,.31],dark:[.055,.14,.17],ceramic:[.84,.79,.65],warm:[.96,.65,.28],signal:[.18,.78,.66]};

function disc(mesh,center,u,v,r,color,mat=6,em=0,segments=16){
 const point=a=>add(add(center,u,Math.cos(a)*r),v,Math.sin(a)*r);
 for(let i=0;i<segments;i++)mesh.tri(center,point(i*TAU/segments),point((i+1)*TAU/segments),color,mat,em);
}
function ring(mesh,center,u,v,inner,outer,color,mat=6,em=0,segments=24){
 const point=(r,a)=>add(add(center,u,Math.cos(a)*r),v,Math.sin(a)*r);
 for(let i=0;i<segments;i++){const a=i*TAU/segments,b=(i+1)*TAU/segments;mesh.quad(point(inner,a),point(outer,a),point(outer,b),point(inner,b),color,mat,em);}
}

export function appendObservatoryReceiver(mesh,glow,{world,plan,state={},time=0}={}){
 if(!mesh?.v||!glow?.v||world?.scene?.originId!=='veyr-storm'||world.scene.observatory?.schema!==1||!plan?.body)return null;
 const before=mesh.v.length,glowBefore=glow.v.length,b=plan.body,pending=state.pending;
 const grounding=state.grounded?1:pending?.embodiedAction==='ground'?clamp(state.progress):0;
 const raised=state.repair===0?1:pending?.manipulation==='lever'?clamp(state.progress):0;
 const split=state.repair===1?1:pending?.manipulation==='coil'?clamp(state.progress):0;
 const listening=state.receiver?1:pending?.manipulation==='receiver'?clamp(state.progress):0;
 const axis=norm([.40,.23+grounding*.10+raised*.18,.88]),u=norm(cross([0,1,0],axis)),v=cross(axis,u);
 // The tall mast occupies the whole vertical camera silhouette. Carry the
 // bowl sideways on its gimbal so the iris clears that silhouette even from
 // the high game camera, while retaining the mast's existing footprint.
 const center=add([b.x+.035,3.70+raised*.08,b.z+.035],u,.46),radius=.65+split*.035,depth=.37;
 const point=(r,a,back=false)=>{
  const gap=split*.018,rr=r+gap,shell=depth*(r/radius)**2-(back?.045:0);
  return add(add(add(center,u,rr*Math.cos(a)),v,rr*Math.sin(a)),axis,shell);
 };
 // The shallow bowl opens toward the fixed east/front camera. Each ceramic
 // petal is a real curved strip, with a separate copper exterior and lip.
 const bowlStart=mesh.v.length/12,steps=[.14,radius*.44,radius*.74,radius],segments=24;
 for(let j=0;j<steps.length-1;j++)for(let i=0;i<segments;i++){
  const gap=(i%2===0?1:-1)*split*.007,a=i*TAU/segments+gap,b=(i+1)*TAU/segments-gap,r0=steps[j],r1=steps[j+1];
  mesh.quad(point(r0,a),point(r1,a),point(r1,b),point(r0,b),tint(P.ceramic,.91+(i%4)*.025+j*.015),6);
  mesh.quad(point(r0,b,true),point(r1,b,true),point(r1,a,true),point(r0,a,true),tint(i%4===0?P.patina:P.copper,.91+j*.04),i%4===0?6:1);
 }
 const bowlEnd=mesh.v.length/12;
 for(let i=0;i<segments;i++){
  const a=i*TAU/segments,b=(i+1)*TAU/segments;
  mesh.quad(point(radius-.025,a),point(radius+.025,a),point(radius+.025,b),point(radius-.025,b),P.edge,6);
  mesh.quad(point(radius,a,true),point(radius,b,true),point(radius,b),point(radius,a),P.copper,1);
 }
 // Six paired radial stays give the instrument a readable crafted structure.
 for(let i=0;i<12;i++){
  const a=i*TAU/12,p=add(point(.17,a),axis,.012),q=add(point(radius-.025,a),axis,.012);
  mesh.tube(p,q,.016,.023,i%3===0?P.patina:P.edge,6,4);
 }
 // A two-axis gimbal and two short brackets tie the dish to the existing
 // central shaft. Nothing is attached to the walkable court around the mast.
 const back=add(center,axis,-.13);
 mesh.tube([b.x,3.18,b.z],back,.105,.085,P.dark,6,8);
 mesh.tube(add(back,u,-.31),add(back,u,.31),.095,.095,P.copper,1,8);
 for(const side of[-1,1]){
  mesh.tube([b.x+side*.40,2.78,b.z+.13],add(back,u,side*.29),.043,.040,P.patina,6,5);
  const boss=add(back,u,side*.36);mesh.sphere(...boss,.095,P.edge,6,0,6,3);
 }
 const throat=add(center,axis,.045+grounding*.055),irisRadius=.14+listening*.05+grounding*.03;
 disc(mesh,throat,u,v,.22,P.dark,6,0,16);ring(mesh,add(throat,axis,.007),u,v,.18,.205,P.edge,6,0,16);
 const color=grounding?P.signal:P.warm;
 disc(mesh,add(throat,axis,.016),u,v,irisRadius,color,4,listening?.16:.035,8);
 // The saved reply choice is represented by three real shutters, never a
 // decorative message. Shared watch opens together; independent windows take
 // turns on the existing animation clock.
 for(let i=0;i<3;i++){
  const a=i*TAU/3,reply=state.choice!==undefined&&(state.choice===0||Math.floor(time*.7)%3===i);
  const c=add(add(throat,u,Math.cos(a)*.29),v,Math.sin(a)*.29);
  disc(mesh,add(c,axis,.020),u,v,.045,reply?P.signal:P.copper,reply?4:6,reply?.22:0,8);
 }
 if(listening||grounding){
  const g=add(throat,axis,.024);ring(glow,g,u,v,irisRadius+.025,irisRadius+.045,color,9,1,24);
  for(let i=glowBefore+11;i<glow.v.length;i+=12)glow.v[i]=(.12+.07*grounding)*(.88+.12*Math.sin(time*1.4));
 }
 return {triangles:(mesh.v.length-before+glow.v.length-glowBefore)/36,center,axis,radius,bowlStart,bowlEnd,
  phase:state.choice!==undefined?'answering':grounding?'grounded':listening?'listening':'waiting'};
}
