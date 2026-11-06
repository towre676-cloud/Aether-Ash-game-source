/** A distance clock keeps feet in step with resolved world travel, including
 * manual input, guided routes and followers. Both gaits use the coherent four
 * poses in the locomotion atlas; the crew sheet supplies idle/action poses.
 * Bodies are never rotated or stretched to imitate a step.
 */
const CREW_WALK=[0,1,2,1],CYCLE={walk:1.45,run:1.6};
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

/** A restrained weight transfer between foot plants, in world pixels.
 * A short stance on either side of each existing phase 0/2 plant keeps the
 * body on its baseline. The squared-sine swing leaves and returns to that
 * stance with zero vertical velocity; walking settles longer than running.
 * The distance clock and drawn frame are unchanged. Reduced motion removes
 * this extra transfer, while the authored leg animation remains readable.
 */
export function strideOffsets(pose,{reducedMotion=false}={}){
 if(!pose.moving||reducedMotion)return {x:0,y:0,lift:0,sway:0};
 const run=pose.gait==='run',phase=((pose.phase%4)+4)%4,half=phase%2,stance=run?.12:.24;
 const weight=clamp(pose.speed/(run?4.2:2.65),0,1);
 if(half<=stance||half>=2-stance||weight===0)return {x:0,y:0,lift:0,sway:0};
 const swing=Math.sin((half-stance)/(2-stance*2)*Math.PI)**2;
 const sway=(phase<2?1:-1)*swing*(run?.55:.25)*weight,lift=swing*(run?1.15:.38)*weight;
 const dx=pose.directionX||0,dy=pose.directionY||0;
 return {x:-dy*sway,y:dx*sway*.3-lift,lift,sway};
}

/** `intent` and an optional requested gait may describe the lead's input.
 * They resolve heading through a collision, but never advance a blocked stride.
 * With no input context, brief horizontal wall tangents retain their rear view;
 * sustained horizontal travel settles back to the front instead of sticking.
 */
export function characterPose(previous,x,y,dt=1/60,{intent=null,gait:requestedGait=null,reducedMotion=false}={}){
 previous=previous||{x,y};
 const dx=x-previous.x,dy=y-previous.y,distance=Math.hypot(dx,dy);
 const elapsed=Number.isFinite(dt)&&dt>0?dt:1/60;
 const moving=distance>1e-5&&distance<Math.max(.5,elapsed*12);
 const speed=moving?distance/elapsed:0;
 let facing=previous.facing??1,back=previous.back??false,phase=previous.phase??0;
 let sideTravel=previous.sideTravel||0,gait=previous.gait||'walk',strideAdvance=0;
 const intended=finitePoint(intent)&&Math.hypot(intent.x,intent.y)>.001;
 const hx=intended?intent.x:moving?dx:0,hy=intended?intent.y:moving?dy:0,heading=Math.hypot(hx,hy);
 if(heading>.001){
  if(Math.abs(hx)>heading*.25)facing=hx<0?-1:1;
  if(intended){
   if(Math.abs(hy)>Math.abs(hx)*.28)back=hy<0;
   else if(Math.abs(hx)>Math.abs(hy)*3.6)back=false;
   sideTravel=0;
  }else if(Math.abs(hy)>Math.abs(hx)*.5){back=hy<0;sideTravel=0;}
  else if(Math.abs(hy)>Math.abs(hx)*.22){
   if(hy>0)back=false;
   sideTravel=0;
  }else{
   sideTravel+=distance;
   if(!previous.moving||sideTravel>=.2)back=false;
  }
 }
 if(moving){
  // Input preserves a chosen sprint through corner clipping; other actors use
  // a deadband so small changes in sampled path speed do not flicker gaits.
  if(requestedGait==='walk'||requestedGait==='run')gait=requestedGait;
  else if(speed>3.6)gait='run';else if(speed<3.15)gait='walk';
  strideAdvance=distance/CYCLE[gait]*4;
  phase=(phase+strideAdvance)%4;
 }
 const step=Math.floor(phase),directionX=moving?dx/distance:previous.directionX||0,directionY=moving?dy/distance:previous.directionY||0;
 const pose={x,y,facing,back,phase,moving,frame:moving?(back?4:0)+step:back?5:0,
  crewFrame:moving?(back?5:0)+CREW_WALK[step]:back?5:0,gait,speed,contact:step%2===0,strideAdvance,sideTravel,directionX,directionY};
 const transfer=strideOffsets(pose,{reducedMotion});
 return {...pose,strideX:transfer.x,strideY:transfer.y,lift:transfer.lift,sway:transfer.sway};
}

/** Measured headings in all seven delivered crew rows. Crew front walk cell1
 * and rear idle cell5 face left. Run families consistently face right; the
 * starter's rear idle also faces left, but its locomotion row does not.
 */
export function spriteFacingFlip(kind,column,facingLeft=false,row=0){
 const authoredLeft=kind==='crew'&&(column===1||column===5)||kind==='starter'&&row===0&&column===5;
 return Boolean(facingLeft)!==authoredLeft;
}
