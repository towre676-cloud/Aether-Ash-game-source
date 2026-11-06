const SECTORS=[['right'],['right','down'],['down'],['down','left'],['left'],['left','up'],['up'],['up','right']];
const OCTANT=Math.PI/4,TURN_MARGIN=Math.PI/36;
const idle=()=>({directions:[],sector:null,angle:null});

/** A little angular and radial hysteresis rejects hand jitter without delaying
 * deliberate turns. This is an input latch, not momentum: returning to the
 * centre or releasing the pointer stops movement immediately. */
export function latchedJoystick(previous,dx,dy,radius=64){
 if(!Number.isFinite(dx)||!Number.isFinite(dy))return idle();
 const r=Number.isFinite(radius)&&radius>0?radius:64,length=Math.hypot(dx,dy);
 const prior=Number.isInteger(previous?.sector)&&previous.sector>=0&&previous.sector<8?previous.sector:null;
 if(length<r*(prior===null?.22:.16))return idle();
 const angle=Math.atan2(dy,dx),nearest=(Math.round(angle/OCTANT)+8)%8;
 let sector=nearest;
 if(prior!==null){
  const difference=Math.atan2(Math.sin(angle-prior*OCTANT),Math.cos(angle-prior*OCTANT));
  if(Math.abs(difference)<=OCTANT/2+TURN_MARGIN)sector=prior;
 }
 return {directions:[...SECTORS[sector]],sector,angle:sector*OCTANT};
}

/** Independent axis deadbands preserve digital movement and fast reversals.
 * Keep this history separate from physical D-pad buttons. */
export function axisDirections(x,y,previous=[]){
 const held=previous instanceof Set?previous:new Set(previous||[]),directions=[];
 function axis(value,negative,positive){
  const n=Number.isFinite(value)?value:0;
  if(n>=(held.has(positive)?.32:.4))directions.push(positive);
  else if(n<=-(held.has(negative)?.32:.4))directions.push(negative);
 }
 axis(x,'left','right');axis(y,'up','down');return directions;
}
