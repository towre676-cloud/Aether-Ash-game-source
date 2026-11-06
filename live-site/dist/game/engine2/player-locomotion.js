/** Responsive movement uses the existing traversal speeds, with no release drift. */
export const TRAVEL_SPEED=Object.freeze({walk:2.65,run:4.2,route:2.65});
const frameTime=dt=>Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
const origin=()=>({x:0,y:0});

/** Intent is separate from displacement: a blocked actor can face the wall
 * without pretending to take a step. Diagonals never receive extra speed. */
export function movementDelta(dx,dy,dt,{run=false}={}){
 const valid=Number.isFinite(dx)&&Number.isFinite(dy),length=valid?Math.hypot(dx,dy):0;
 const intent=length?{x:dx/length,y:dy/length}:origin(),speed=length?(run?TRAVEL_SPEED.run:TRAVEL_SPEED.walk):0,time=frameTime(dt);
 return {x:intent.x*speed*time,y:intent.y*speed*time,speed,moving:speed*time>0,intent,gait:run?'run':'walk'};
}

/** Spend one frame's distance across consecutive route vertices. Reaching a
 * vertex does not cost an extra frame, and turns pass through the actual vertex
 * rather than skipping the last part of the segment. World.move remains the only
 * position writer, so its collision and mode rules stay authoritative. */
export function advanceRoute(world,path,dt,{speed=TRAVEL_SPEED.route}={}){
 const rate=Number.isFinite(speed)?Math.max(0,speed):0,result={distance:0,consumed:0,arrived:false,blocked:false,interrupted:false,intent:origin(),gait:rate>=3.6?'run':'walk'};
 if(!Array.isArray(path)||!world?.state||typeof world.move!=='function'){result.interrupted=true;return result;}
 const state=world.state,scene=state.scene,mode=state.mode;
 if(mode!=='field'||!Number.isFinite(state.x)||!Number.isFinite(state.y)){result.interrupted=true;return result;}
 let budget=frameTime(dt)*rate;
 const stable=()=>world.state===state&&state.scene===scene&&state.mode===mode;
 for(let n=0;path.length&&n<128;n++){
  if(!stable()){result.interrupted=true;break;}
  const point=path[0];
  if(!Array.isArray(point)||!Number.isFinite(point[0])||!Number.isFinite(point[1])){result.interrupted=true;break;}
  const dx=point[0]-state.x,dy=point[1]-state.y,distance=Math.hypot(dx,dy);
  if(distance<=1e-7){path.shift();result.consumed++;continue;}
  if(budget<=1e-9)break;
  // Bounded collision sweeps also protect a stale or sparse route from leaping
  // over a newly closed tile when a caller supplies a large distance budget.
  const step=Math.min(distance,budget,.2),x=state.x,y=state.y;
  result.intent={x:dx/distance,y:dy/distance};
  world.move(result.intent.x*step,result.intent.y*step);
  const moved=Math.hypot(state.x-x,state.y-y);
  result.distance+=moved;budget=Math.max(0,budget-step);
  // A scene transition, battle or dialogue must not consume a stale route.
  if(!stable()){result.interrupted=true;break;}
  if(Math.hypot(point[0]-state.x,point[1]-state.y)<=1e-7){path.shift();result.consumed++;continue;}
  // Partial wall sliding can move a little, but cannot legally skip this vertex.
  if(moved<step-1e-7){result.blocked=true;break;}
  if(budget<=1e-9)break;
 }
 result.arrived=!path.length&&!result.interrupted;
 return result;
}
