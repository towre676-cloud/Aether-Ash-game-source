/** Standalone deterministic world navigation and vehicle simulation. No DOM or frame-loop allocation. */
export const STEP=1/60;
const finite=n=>Number.isFinite(n);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function compileAtlas({nodes=[],edges=[]}={}){
 const byId=new Map();
 for(const n of nodes){if(!n?.id||byId.has(n.id)||!finite(n.x)||!finite(n.z)||!finite(n.y??0))throw Error('Invalid/duplicate world node');byId.set(n.id,Object.freeze({...n,y:n.y??0}));}
 const adjacency=new Map([...byId.keys()].map(id=>[id,[]]));
 for(const e of edges){if(!e?.id||!byId.has(e.from)||!byId.has(e.to)||e.from===e.to)throw Error('Invalid world edge');const a=byId.get(e.from),b=byId.get(e.to);const distance=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);if(!finite(distance)||distance<=0)throw Error('Degenerate edge');const item={...e,distance};adjacency.get(e.from).push({...item,to:e.to});if(e.oneWay!==true)adjacency.get(e.to).push({...item,to:e.from});}
 return {nodes:byId,adjacency};
}
export function route(atlas,start,goal,mode='walk'){
 if(!atlas.nodes.has(start)||!atlas.nodes.has(goal))return null;
 const dist=new Map([[start,0]]),prev=new Map(),pending=new Set([start]);
 while(pending.size){let u=null,best=Infinity;for(const id of pending){const d=dist.get(id);if(d<best){best=d;u=id;}}pending.delete(u);if(u===goal)break;
 for(const edge of atlas.adjacency.get(u)){if(edge.modes&&!edge.modes.includes(mode))continue;if(edge.blocked)continue;const cost=edge.distance*Math.max(0.01,edge.costFactor??1);const d=best+cost;if(d<(dist.get(edge.to)??Infinity)){dist.set(edge.to,d);prev.set(edge.to,u);pending.add(edge.to);}}
 }
 if(!dist.has(goal))return null;const path=[goal];while(path[0]!==start)path.unshift(prev.get(path[0]));return {path,distance:dist.get(goal)};
}
export function connectivity(atlas,start,mode='walk'){if(!atlas.nodes.has(start))return {reachable:[],unreachable:[...atlas.nodes.keys()]};const reached=new Set([start]),queue=[start];for(let i=0;i<queue.length;i++)for(const e of atlas.adjacency.get(queue[i]))if(!e.blocked&&(!e.modes||e.modes.includes(mode))&&!reached.has(e.to)){reached.add(e.to);queue.push(e.to);}return {reachable:[...reached],unreachable:[...atlas.nodes.keys()].filter(x=>!reached.has(x))};}
export function makeVehicle({x=0,y=0,z=0,heading=0,type='ground'}={}){return {x,y,z,heading,type,speed:0,verticalSpeed:0,pitch:0,roll:0,steer:0};}
export function stepVehicle(v,input={},dt=STEP,terrainHeight=()=>0){
 if(!finite(dt)||dt<=0||dt>0.05)throw Error('Invalid fixed step');
 const throttle=clamp(input.throttle??0,-1,1),steer=clamp(input.steer??0,-1,1),brake=clamp(input.brake??0,0,1);
 const s={...v};
 if(v.type==='flight'){
  const yaw=clamp(input.yaw??steer,-1,1),pitch=clamp(input.pitch??0,-1,1),roll=clamp(input.roll??steer,-1,1);
  s.speed=clamp(v.speed+(throttle*14-0.012*v.speed*Math.abs(v.speed))*dt,0,65);
  s.roll=clamp(v.roll+((roll*.65)-v.roll)*Math.min(1,dt*3),-.8,.8);
  s.pitch=clamp(v.pitch+((pitch*.5)-v.pitch)*Math.min(1,dt*2),-.5,.5);
  s.heading=v.heading+(yaw*.5+s.roll*.7)*dt;
  s.verticalSpeed=clamp(v.verticalSpeed+(Math.sin(s.pitch)*s.speed*.6+Math.max(0,s.speed-12)*.08-2.5-s.verticalSpeed*.9)*dt,-12,12);
  s.y=Math.max(terrainHeight(s.x,s.z)+1,s.y+s.verticalSpeed*dt);
 }else{
  const grip=clamp(input.grip??1,.2,1),acc=throttle*11-brake*Math.sign(v.speed)*22-v.speed*1.3;
  s.speed=clamp(v.speed+acc*dt,-8,28);
  if(brake>0&&Math.abs(s.speed)<.15)s.speed=0;
  s.steer=v.steer+(steer-v.steer)*Math.min(1,dt*12);
  s.heading=v.heading+s.steer*grip*s.speed*dt/(4+Math.abs(s.speed)*.2);
  s.y=terrainHeight(s.x,s.z);
 }
 s.x=v.x+Math.sin(s.heading)*s.speed*Math.cos(s.pitch)*dt;
 s.z=v.z+Math.cos(s.heading)*s.speed*Math.cos(s.pitch)*dt;
 return s;
}
export function fixedStepper(update,{step=STEP,maxSteps=4}={}){let accumulator=0;return function advance(elapsed){accumulator=Math.min(accumulator+clamp(elapsed,0,.25),step*maxSteps);let count=0;while(accumulator>=step&&count<maxSteps){update(step);accumulator-=step;count++;}return {steps:count,alpha:accumulator/step};};}
export function streamCells({x,z,vx=0,vz=0,cellSize=128,radius=2,lookahead=1}={}){const cx=Math.floor((x+vx*lookahead)/cellSize),cz=Math.floor((z+vz*lookahead)/cellSize),out=[];for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++)out.push({x:cx+dx,z:cz+dz,key:(cx+dx)+':'+(cz+dz)});return out;}
