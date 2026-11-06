import {bossTarget} from './boss-patterns.js?v=5.24.0';
import {roleOpeningPending} from './encounter-tempo.js?v=5.25.0';

/** Reach and movement use the connected, collision-checked floor captured by
 * the host. The explicit version opt-in keeps old in-progress battles intact. */
export const STRIKE_REACH=2.6;
export const MAKO_REACH=8;
const topologyCache=new WeakMap(),routeCache=new WeakMap();
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const live=p=>point(p)&&p.hp>0&&!p.withdrawn;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const key=(x,y)=>Math.floor(x)+','+Math.floor(y);
const center=cell=>({x:cell[0]+.5,y:cell[1]+.5});

function topology(battle){
 const context=battle?.context;
 if(context?.engagement?.version!==1)return null;
 const raw=battle.engagementFloor||context.engagement.walkCells||context.walkable;
 if(!Array.isArray(raw)||!raw.length)return null;
 let cached=topologyCache.get(context);
 if(cached?.raw===raw)return cached;
 const cells=new Map();
 for(const p of raw.slice(0,65536))if(Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite)){
  const cell=[Math.floor(p[0]),Math.floor(p[1])];cells.set(cell.join(','),cell);
 }
 cached=cells.size?{raw,cells}:null;topologyCache.set(context,cached);return cached;
}
const open=(geometry,p)=>point(p)&&geometry.cells.has(key(p.x,p.y));
function segmentClear(geometry,from,to){
 if(!open(geometry,from)||!open(geometry,to))return false;
 const steps=Math.max(1,Math.ceil(distance(from,to)/.18));let previous=from;
 for(let n=1;n<=steps;n++){
  const t=n/steps,p={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t};
  if(!open(geometry,p))return false;
  const px=Math.floor(previous.x),py=Math.floor(previous.y),x=Math.floor(p.x),y=Math.floor(p.y);
  if(px!==x&&py!==y&&(!geometry.cells.has(px+','+y)||!geometry.cells.has(x+','+py)))return false;
  previous=p;
 }
 return true;
}
function strikeTarget(battle,target){
 return battle?.enemies?.find(e=>live(e)&&e.role==='guard'&&e!==target&&e.armor>0&&distance(e,target)<=2.5)||target;
}
function ranged(kind,tech){return kind==='tech'&&tech&&!tech.healing&&!tech.counter&&!tech.link;}

/** Readiness and resource payment remain in Battle.command. A queued command
 * can inspect reach before its actor is ready without spending anything. */
export function commandReach(battle,hero,target,kind,tech){
 const geometry=topology(battle),enabled=!!geometry&&(kind==='attack'||ranged(kind,tech));
 const reach=kind==='attack'?STRIKE_REACH:MAKO_REACH;
 if(!enabled)return {enabled:false,reach,inRange:true,clear:true,reason:''};
 if(!point(hero)||!point(target))return {enabled:true,reach,inRange:false,clear:false,reason:'Choose a target on the battlefield.'};
 const aim=kind==='attack'?strikeTarget(battle,target):target,inRange=distance(hero,aim)<=reach+.00001,clear=segmentClear(geometry,hero,aim);
 const reason=!clear?'Find a clear approach around the obstacle.':!inRange?'Move within '+reach+' tiles to '+(kind==='attack'?'strike.':'cast.') :'';
 return {enabled:true,reach,inRange,clear,reason};
}

function routeToRange(geometry,from,target,reach){
 if(!open(geometry,from)||!open(geometry,target))return null;
 const safeReach=Math.max(.2,reach-.14),d=distance(from,target);
 if(d<=safeReach&&segmentClear(geometry,from,target))return [];
 // Open ground gets a smooth direct approach; obstacles use bounded floor BFS.
 if(d>safeReach){const ratio=(d-safeReach)/d,p={x:from.x+(target.x-from.x)*ratio,y:from.y+(target.y-from.y)*ratio};if(segmentClear(geometry,from,p)&&segmentClear(geometry,p,target))return [p];}
 const start=key(from.x,from.y),queue=[geometry.cells.get(start)],seen=new Set([start]),parents=new Map();let destination=null;
 for(let i=0;i<queue.length&&i<8192;i++){
  const cell=queue[i],p=center(cell);
  if(distance(p,target)<=safeReach&&segmentClear(geometry,p,target)){destination=cell;break;}
  for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){
   const next=[cell[0]+dx,cell[1]+dy],id=next.join(',');if(seen.has(id)||!geometry.cells.has(id))continue;
   seen.add(id);parents.set(id,cell);queue.push(next);
  }
 }
 if(!destination)return null;
 const path=[destination];while(path[0].join(',')!==start){const prior=parents.get(path[0].join(','));if(!prior)return null;path.unshift(prior);}
 const points=path.map(center);
 // Replanning between tile centers must not walk back to the previous center.
 if(points.length>1&&segmentClear(geometry,from,points[1])||distance(from,points[0])<.05)points.shift();
 return points;
}

/** Returns an acting-hero destination; the host owns the actual player route
 * and can cancel it immediately when the player moves or changes their mind. */
export function approachForCommand(battle,hero,target,kind,tech){
 const quote=commandReach(battle,hero,target,kind,tech);
 if(!point(hero)||!point(target))return null;
 if(!quote.enabled||quote.inRange&&quote.clear)return {x:hero.x,y:hero.y};
 const geometry=topology(battle),aim=kind==='attack'?strikeTarget(battle,target):target;
 return routeToRange(geometry,hero,aim,quote.reach)?.at(-1)||null;
}

function hasOtherPriority(battle,enemy){
 if(!enemy.boss&&battle.objective&&!battle.objective.complete&&!battle.objective.failed)return true;
 const ecology=battle.ecology?.enabled&&battle.ecology.creatures.find(row=>row.actorId===enemy.id);
 if(ecology&&(ecology.tethered||ecology.lure||ecology.fed||ecology.nestSafe||ecology.trust>=2&&!ecology.injuredByHero||ecology.grudge<3&&['frightened','scavenging','nesting'].includes(ecology.motive)))return true;
 if(enemy.role==='mender'&&battle.livingEnemies.some(e=>e.hp<e.maxHp*.7))return true;
 return !roleOpeningPending(battle,enemy)&&!enemy.fieldGear&&(enemy.fieldClaims||0)<2&&battle.field?.enabled&&battle.field.props.some(p=>p.ownerId===null&&p.condition==='loose'&&p.uses>0&&distance(enemy,p)<=3);
}
function bodyClear(battle,enemy,to){
 return [...battle.heroes,...battle.enemies].every(other=>other===enemy||!live(other)||distance(to,other)>=.55||distance(to,other)>distance(enemy,other));
}
function targetFor(battle,enemy){
 const heroes=battle.heroes.filter(live);
 return enemy.boss?bossTarget({...enemy,turn:(enemy.turn||0)+1},battle.chapter,heroes):heroes.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
}

/** A closing enemy preserves its charged turn. No movement or retargeting is
 * allowed during a tell, a recovery, an objective action or a peaceful motive. */
export function advanceEnemyEngagement(battle,dt){
 const geometry=topology(battle);if(!geometry||!Number.isFinite(dt)||dt<=0)return;
 for(const enemy of battle.enemies){
  if(!live(enemy))continue;
  enemy.engagement={version:1,closing:false};enemy.fieldMoving=false;
  if(enemy.intent||enemy.status?.stagger||enemy.status?.guard||hasOtherPriority(battle,enemy))continue;
  const target=targetFor(battle,enemy);if(!target)continue;
  const reach=enemy.boss?3.2:enemy.moveShape==='line'?3.1:enemy.moveShape==='burst'?2.8:1.9;
  if(distance(enemy,target)<=reach&&segmentClear(geometry,enemy,target))continue;
  const goalKey=target.id+':'+key(target.x,target.y);let route=routeCache.get(enemy);
  if(!route||route.goal!==goalKey||battle.time>=route.expires){route={goal:goalKey,expires:battle.time+.45,points:routeToRange(geometry,enemy,target,reach)||[]};routeCache.set(enemy,route);}
  while(route.points.length&&distance(enemy,route.points[0])<.06)route.points.shift();
  if(!route.points.length)continue;
  const waypoint=route.points[0],d=distance(enemy,waypoint),speed=(enemy.boss?1.05:enemy.role==='scout'?1.65:enemy.role==='guard'?1.2:1.45)*(enemy.mobilityImpaired?.45:enemy.status?.slow?.55:1),travel=Math.min(d,speed*dt);
  const next={x:enemy.x+(waypoint.x-enemy.x)*travel/d,y:enemy.y+(waypoint.y-enemy.y)*travel/d};
  if(!segmentClear(geometry,enemy,next)||!bodyClear(battle,enemy,next)){route.expires=Math.min(route.expires,battle.time+.15);continue;}
  enemy.fieldFacing=next.x<enemy.x?-1:next.x>enemy.x?1:enemy.fieldFacing||1;
  enemy.x=next.x;enemy.y=next.y;enemy.fieldMoving=true;
  enemy.engagement={version:1,closing:distance(enemy,target)>reach||!segmentClear(geometry,enemy,target),targetId:target.id};
 }
}
export function enemyIsClosing(battle,enemy){return !!topology(battle)&&!!enemy.engagement?.closing;}

/** Reinforcements enter the summoner's connected floor, never a wall or a
 * separate room. Prefer an unoccupied cell; cramped one-cell legacy arenas
 * can share a valid floor cell rather than create an unreachable opponent. */
export function reinforcementPosition(battle,summoner,preferred){
 const geometry=topology(battle);if(!geometry)return {...preferred};
 let start=geometry.cells.get(key(summoner.x,summoner.y));
 if(!start)start=[...geometry.cells.values()].reduce((best,cell)=>!best||distance(center(cell),summoner)<distance(center(best),summoner)?cell:best,null);
 if(!start)return {...preferred};
 const actors=[...battle.heroes,...battle.enemies].filter(live),occupied=new Set(actors.map(a=>key(a.x,a.y)));
 const queue=[start],seen=new Set([start.join(',')]);let best=null,fallback=null;
 // Only a few actors can coexist. A bounded local flood is ample room for
 // their entrances, and every candidate remains connected to the caller.
 for(let n=0;n<queue.length&&n<512;n++){
  const cell=queue[n],id=cell.join(','),p=id===key(preferred.x,preferred.y)?preferred:center(cell),score=distance(p,preferred);
  if(!fallback||score<fallback.score)fallback={point:p,score};
  if(!occupied.has(id)&&actors.every(a=>distance(a,p)>=.55)&&(!best||score<best.score))best={point:p,score};
  for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){
   const next=[cell[0]+dx,cell[1]+dy],nextId=next.join(',');if(seen.has(nextId)||!geometry.cells.has(nextId))continue;
   seen.add(nextId);queue.push(next);
  }
 }
 return {...(best||fallback).point};
}

/** Generic physical strikes use the existing small circle painter/hit test.
 * Their destination locks when announced and never follows a fleeing actor. */
export function engagementIntent(battle,enemy,intent){
 if(!topology(battle)||enemy.boss||intent?.kind!=='strike'||intent.shape!=='single')return intent;
 const dx=intent.x-enemy.x,dy=intent.y-enemy.y,d=Math.hypot(dx,dy),scale=d>2.4?2.4/d:1;
 return {...intent,shape:'burst',x:enemy.x+dx*scale,y:enemy.y+dy*scale,fromX:enemy.x,fromY:enemy.y,radius:1.05,
  engagementStrike:true,counterplay:'Leave the small marked circle or Guard.'};
}

/** Walls and closed passages shield against spatial attack geometry. Legacy
 * snapshots keep their previous rules until the next fresh encounter. */
export function engagementHitClear(battle,intent,target){
 const geometry=topology(battle);if(!geometry)return true;
 if(!['strike','ecology-grudge'].includes(intent?.kind))return true;
 const from={x:intent.fromX,y:intent.fromY};return !point(from)||segmentClear(geometry,from,target);
}
