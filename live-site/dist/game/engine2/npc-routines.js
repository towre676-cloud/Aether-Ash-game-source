import {activityThreatPoints} from './activity-sites.js?v=5.38';
import {isInteriorScene} from './scene-identity.js';
import {findPath} from './navigation.js?v=5.22.0';
import {buildingReservations,pointInGroundRect} from './environmental-grounding.js?v=5.22.0';
export const roleFor=o=>o.family?.roles?.[o.member]||o.profile?.people?.find(p=>p.name===o.name)?.role||o.role||'resident';
export function residentActivity(o,period){const role=roleFor(o);if(period.name==='Night')return o.member===2?'asleep near the household':'resting after the day’s work';if(period.name==='Dawn')return o.member===2?'helping pack the household’s morning things':'preparing tools and a shared breakfast';if(period.name==='Midday')return 'taking a meal and catching up with neighbours';if(period.name==='Evening')return o.member===2?'showing the family what they learned today':'putting work away and checking on the household';const tasks=[[/oven|baker|cook|soup|portion|steward/,'tending the shared stove and setting food aside for travellers'],[/reed|repair|mechanic|patch|chimney/,'checking a repair before handing it back'],[/seed|garden|graft|flower|grazier/,'sorting cuttings and checking the young plants'],[/ferry|dock|porter|freight|runner|carrier/,'checking parcels and the next safe departure'],[/water|rain|spillway|level|sieve/,'checking the water marks and clearing the channel'],[/rope|weaver|seam|mend|blanket|button/,'working through the household’s mending'],[/letter|paper|tally|signal|diarist|reader/,'comparing the day’s notes with the older records'],[/lens|glass|polish/,'cleaning glass and checking for cracks'],[/refuge|guide|gate/,'checking that the next travellers have a safe route']];return tasks.find(([pattern])=>pattern.test(role))?.[1]||'working a careful shift as '+role;}
const person=v=>v.lifeKind==='resident'||['npc','shop','mentor','guide','transport','aid'].includes(v.type)||/^[A-Z]{2,}:/.test(v.steps?.[0]?.prompt||v.text||'');
const center=o=>[o.xy[0]+.5,o.xy[1]+.5];
const gates=s=>[...(s.doors||[]),...s.objects.filter(o=>o.type==='portal')].filter(o=>o.xy);
const routeMasks=new WeakMap();
function buildingRouteMask(scene){
 if(routeMasks.has(scene))return routeMasks.get(scene);
 const mask=new Set();
 for(const building of buildingReservations(scene))for(const r of building.groundRects){
  for(let y=Math.max(0,Math.floor(r.y));y<Math.min(scene.height,Math.ceil(r.y+r.h));y++)for(let x=Math.max(0,Math.floor(r.x));x<Math.min(scene.width,Math.ceil(r.x+r.w));x++){
   if(pointInGroundRect(r,x+.5,y+.5)&&!pointInGroundRect(building.approach,x+.5,y+.5))mask.add(x+','+y);
  }
 }
 routeMasks.set(scene,mask);return mask;
}
export function npcRoute(scene,o,target,others=[]){
 const from=center(o),grid=scene.floor.map(r=>r.split('')),occupied=others.filter(v=>v!==o&&v.xy&&(person(v)||v.lifeKind==='cow')).map(center);
 // This is a resident's private route grid. The player's authored collision map
 // and doorway travel stay untouched; actual entrance approaches remain open.
 for(const threat of activityThreatPoints(scene,others)){const r=isInteriorScene(scene)?2:4;for(let y=Math.max(0,Math.floor(threat[1]-r));y<Math.min(scene.height,Math.ceil(threat[1]+r));y++)for(let x=Math.max(0,Math.floor(threat[0]-r));x<Math.min(scene.width,Math.ceil(threat[0]+r));x++)if(Math.hypot(x-threat[0],y-threat[1])<r)grid[y][x]='#';}
 for(const cell of buildingRouteMask(scene)){const [x,y]=cell.split(',').map(Number);if(grid[y]?.[x])grid[y][x]='#';}
 for(const p of occupied){const x=Math.floor(p[0]),y=Math.floor(p[1]);if(grid[y]?.[x])grid[y][x]='#';}
 for(const d of gates(scene)){const [x,y]=d.xy;if(grid[y]?.[x])grid[y][x]='#';}
 const start=[Math.floor(from[0]),Math.floor(from[1])];if(grid[start[1]]?.[start[0]])grid[start[1]][start[0]]='.';
 const candidates=[];for(let y=Math.max(0,target[1]-3);y<Math.min(scene.height,target[1]+4);y++)for(let x=Math.max(0,target[0]-3);x<Math.min(scene.width,target[0]+4);x++)if(grid[y]?.[x]==='.'&&!occupied.some(p=>Math.hypot(p[0]-x-.5,p[1]-y-.5)<1.05)&&!gates(scene).some(d=>Math.hypot(x-d.xy[0],y-d.xy[1])<1.5))candidates.push([x,y]);
 candidates.sort((a,b)=>Math.hypot(a[0]-target[0],a[1]-target[1])-Math.hypot(b[0]-target[0],b[1]-target[1]));
 const plan={...scene,floor:grid.map(r=>r.join(''))};for(const p of candidates.slice(0,16)){const path=findPath(plan,from,p);if(path.length||Math.hypot(from[0]-p[0]-.5,from[1]-p[1]-.5)<.6){o.destination=p;return path;}}
 return [];
}
export function advanceResident(w,o,dt,others=[],speed=.62){if(!o.path?.length||w.state.mode!=='field')return;dt=Math.max(0,Math.min(.1,dt));const from=center(o),p=o.path[0],dx=p[0]-from[0],dy=p[1]-from[1],d=Math.hypot(dx,dy);if(d<.001){o.path.shift();return;}const step=Math.min(d,dt*speed),next=[from[0]+dx/d*step,from[1]+dy/d*step],distance=a=>Math.hypot(next[0]-a[0],next[1]-a[1]),closer=a=>distance(a)<Math.hypot(from[0]-a[0],from[1]-a[1]);const blocked=w.scene.floor[Math.floor(next[1])]?.[Math.floor(next[0])]!=='.'||buildingRouteMask(w.scene).has(Math.floor(next[0])+','+Math.floor(next[1]))||others.some(v=>v!==o&&v.xy&&(person(v)||v.lifeKind==='cow')&&distance(center(v))<.8&&closer(center(v)))||gates(w.scene).some(v=>distance(center(v))<1.2&&closer(center(v)))||(distance([w.state.x,w.state.y])<.8&&closer([w.state.x,w.state.y]));if(blocked){o.waited=(o.waited||0)+dt;if(o.waited>1.3&&o.destination){o.path=npcRoute(w.scene,o,o.destination,others);o.waited=0;}return;}o.waited=0;o.facing=dx<-.001?-1:dx>.001?1:o.facing||1;o.xy=[next[0]-.5,next[1]-.5];if(d<=step+.001){o.path.shift();if(!o.path.length)o.guiding=false;}}
export function localNpcAdvice(w,o){const healthy=(w.activeHeroes||[]).every(h=>h.hp>=h.maxHp*.65),targets=w.objects().filter(v=>v!==o&&v.xy&&['shop','camp','clue','riddle'].includes(v.type)&&!w.done(v));targets.sort((a,b)=>{const priority=v=>v.type==='camp'&&!healthy?-30:v.type==='shop'?-10:0;return priority(a)+Math.hypot(a.xy[0]-o.xy[0],a.xy[1]-o.xy[1])-priority(b)-Math.hypot(b.xy[0]-o.xy[0],b.xy[1]-o.xy[1]);});return targets.find(v=>Math.hypot(o.xy[0]-v.xy[0],o.xy[1]-v.xy[1])<1.5||findPath(w.scene,center(o),v.xy,1).length)||null;}
