import {PartyTrail} from './presentation.js?v=5.41';

const DIAGONAL=Math.SQRT1_2;
const DIRECTIONS=[[-1,0],[0,1],[-DIAGONAL,DIAGONAL],[-DIAGONAL,-DIAGONAL],[0,-1],[1,0],[DIAGONAL,DIAGONAL],[DIAGONAL,-DIAGONAL]];

/** A fresh party starts on one verified short formation, already registered to
 * its trail. No actor later jumps from a side offset onto a different path.
 * If the entrance is cramped, the oldest point holds them safely until enough
 * lead travel exists to separate the crew. This changes presentation only.
 */
export function createFollowerFormation(lead,party,walkable=()=>true,{gap=.92}={}){
 const spacing=Number.isFinite(gap)&&gap>0?gap:.92,required=Math.max(0,party.length-1)*spacing;
 let best=[{x:lead.x,y:lead.y}],bestDistance=0;
 if(required&&walkable(lead.x,lead.y))for(const [dx,dy]of DIRECTIONS){
  const points=[{x:lead.x,y:lead.y}];let distance=0;
  while(distance<required-1e-10){
   const next=Math.min(required,distance+.08),x=lead.x+dx*next,y=lead.y+dy*next;
   if(!walkable(x,y))break;
   points.push({x,y});distance=next;
  }
  if(distance>bestDistance+1e-10){best=points;bestDistance=distance;}
  if(distance>=required-1e-10)break;
 }
 const history=best.slice().reverse(),oldest=history[0],trail=new PartyTrail(oldest.x,oldest.y,{maxDistance:Math.max(8,required+2)});
 for(const p of history.slice(1))trail.record(p.x,p.y);
 return {trail,followers:party.map((id,index)=>({id,...trail.sample(index*spacing)}))};
}
