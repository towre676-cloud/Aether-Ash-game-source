/** Field creatures have small, readable territories. Positions belong to this
 * runtime controller, never to the authored encounter or the player's save. */
import {livingArmoryFieldTraits} from './living-armory/campaign.js?v=5.33.0';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const SAFE_TYPES=new Set(['npc','guide','shop','camp','transport','frontier-board','portal']);
const DEFAULT_ROAM=[[0,0],[1,0],[1,1],[0,1],[0,0],[-1,0],[-1,-1],[0,-1]];
const spawn=(o,i=0)=>{const p=o?.enemies?.[i]?.[1]||o?.xy||[0,0];return {x:p[0]+.5,y:p[1]+.5};};
// Commission patrols are reconstructed by World.objects() on every read. Their
// authored identity, rather than JavaScript object identity, keeps them moving.
const patrolKey=o=>JSON.stringify([o.type,o.serial??null,o.seed??null,o.flag_address??null,o.bit??null,o.frontierId??null,o.originId??null,o.originHero??null,o.enemies]);
const empty=()=>({engage:null,cue:null});

function safePoints(world){return [...(world.scene?.doors||[]),...(world.objects?.()||world.scene?.objects||[]).filter(o=>SAFE_TYPES.has(o.type)||o.type==='trail-refuge'&&o.ready)].filter(o=>Array.isArray(o.xy)).map(o=>({x:o.xy[0]+.5,y:o.xy[1]+.5}));}
function sanctuary(points,p,r=1.4){return points.some(q=>dist(p,q)<r);}
function ground(world,x,y){
 const floor=world.scene?.floor;
 if(!Number.isFinite(x)||!Number.isFinite(y)||floor?.[Math.floor(y)]?.[Math.floor(x)]!=='.')return false;
 return typeof world.walkable!=='function'||world.walkable(x,y);
}
function open(world,x,y,points){
 if(sanctuary(points,{x,y},1.15))return false;
 return [[-.15,-.15],[.15,-.15],[-.15,.15],[.15,.15]].every(([dx,dy])=>ground(world,x+dx,y+dy));
}
function clearSight(world,a,b){const n=Math.ceil(dist(a,b)*5);for(let i=1;i<n;i++){const t=i/n;if(!ground(world,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}return true;}

/** A local path search stays inside the nest's leash. It never walks through a
 * wall or conversation buffer in order to pursue the player. */
function localPath(world,from,to,home,leash,points){
 const sx=Math.floor(from.x),sy=Math.floor(from.y),tx=Math.floor(to.x),ty=Math.floor(to.y),key=(x,y)=>x+','+y,start=key(sx,sy),queue=[[sx,sy]],seen=new Set([start]),prior=new Map();let end=null;
 for(let at=0;at<queue.length&&at<360;at++){
  const [x,y]=queue[at];if(x===tx&&y===ty){end=[x,y];break;}
  for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(seen.has(k)||Math.hypot(nx+.5-home.x,ny+.5-home.y)>leash||!open(world,nx+.5,ny+.5,points))continue;seen.add(k);prior.set(k,[x,y]);queue.push([nx,ny]);}
 }
 if(!end)return [];
 const result=[];while(key(...end)!==start){result.unshift({x:end[0]+.5,y:end[1]+.5});end=prior.get(key(...end));}
 // Finish at the requested point within its cell; useful for a returning body.
 if(open(world,to.x,to.y,points)&&(result.length||dist(from,to)>.08))result.push({x:to.x,y:to.y});
 return result;
}
function walk(world,row,speed,dt,points){
 let budget=speed*dt;
 while(budget>0&&row.path.length){const p=row.path[0],d=dist(row,p);if(d<.025){row.x=p.x;row.y=p.y;row.path.shift();continue;}const step=Math.min(d,budget),x=row.x+(p.x-row.x)/d*step,y=row.y+(p.y-row.y)/d*step;if(!open(world,x,y,points)){row.path=[];break;}row.x=x;row.y=y;budget-=step;if(step===d)row.path.shift();}
}
function descriptor(row,group){return {x:row.x,y:row.y,homeX:row.home.x,homeY:row.home.y,phase:group.phase,alert:group.phase==='alert'?clamp(group.alertAge/.9,0,1):group.phase==='pursue'?1:0,moving:row.moving,facing:row.facing};}

export function createFieldPatrols(){
 let sceneRef=null,stateRef=null,arrivalGrace=1.4;
 const groups=new Map();
 function reset(){sceneRef=null;stateRef=null;arrivalGrace=1.4;groups.clear();}
 function sync(world){
  if(world.scene!==sceneRef||world.state!==stateRef){groups.clear();sceneRef=world.scene;stateRef=world.state;arrivalGrace=1.4;}
  const active=(world.objects?.()||world.scene?.objects||[]).filter(o=>o.type==='patrol'&&o.enemies?.length);
  // A distance encounter first becomes a visible roaming pack. The caller owns
  // its lifetime and preview artwork; the same telegraph/pursuit/contact rules
  // apply as to an authored patrol, with no intermediate automatic battle.
  const roaming=world.roamingPack?.object;
  if(roaming?.type==='wild'&&roaming.enemies?.length)active.push(roaming);
  const live=new Set(active.map(patrolKey));for(const key of groups.keys())if(!live.has(key))groups.delete(key);
  for(const o of active){const key=patrolKey(o);if(groups.has(key)){groups.get(key).object=o;continue;}
   const scripted=!!o.originId||o.originHero!==undefined;
   groups.set(key,{object:o,scripted,phase:'patrol',alertAge:0,cooldown:0,pathClock:0,rows:o.enemies.map((_,i)=>{const home=spawn(o,i);return {...home,home,path:[],waypoint:i%DEFAULT_ROAM.length,pause:.2+i*.16,moving:false,facing:1};})});
  }
 }
 const api={
  reset,
  calm(seconds=3){
   const duration=Number.isFinite(seconds)?clamp(seconds,0,30):3;
   arrivalGrace=Math.max(arrivalGrace,duration);
   for(const g of groups.values()){g.phase='return';g.cooldown=Math.max(g.cooldown,duration);g.rows.forEach(r=>r.path=[]);}
  },
  position(world,o,index=0){
   if(world?.scene===sceneRef&&world?.state===stateRef){const g=groups.get(patrolKey(o)),row=g?.rows[index];if(row)return descriptor(row,g);}
   return {...spawn(o,index),homeX:spawn(o,index).x,homeY:spawn(o,index).y,phase:'patrol',alert:0,moving:false,facing:1};
  },
  update(world,dt,{blocked=false}={}){
   if(!world?.scene||!world?.state)return empty();sync(world);
   if(blocked||world.state.mode!=='field'||!Number.isFinite(dt)||dt<=0)return empty();
   dt=clamp(dt,0,.1);arrivalGrace=Math.max(0,arrivalGrace-dt);
   const points=safePoints(world),player={x:world.state.x,y:world.state.y},protectedPlayer=sanctuary(points,player),result=empty();
   for(const g of groups.values()){
    g.cooldown=Math.max(0,g.cooldown-dt);g.pathClock-=dt;
    const nearest=g.rows.reduce((a,b)=>dist(a,player)<dist(b,player)?a:b),distance=dist(nearest,player),homeDistance=Math.min(...g.rows.map(r=>dist(r.home,player))),leash=g.scripted?1.65:4.5;
    // The entrance and post-contact pauses are real time. The existing random
    // encounter ledger owns its separate movement grace and is not modified.
    const detection=Number(world.livingAtlas?.detectionMultiplier?.()??1),boots=livingArmoryFieldTraits(world.state,world.reconciledGround?.surface?.(world.state.x,world.state.y)||{}).patrolDetectionMultiplier,noticeScale=(Number.isFinite(detection)?clamp(detection,.68,1.1):1)*boots;
    const mayNotice=!arrivalGrace&&!g.cooldown&&!protectedPlayer&&homeDistance<(g.scripted?2.75:5.4)&&distance<(g.scripted?2.45:3.6)*noticeScale&&clearSight(world,nearest,player);
    if(g.phase==='patrol'&&mayNotice){g.phase='alert';g.alertAge=0;g.rows.forEach(r=>r.path=[]);if(!result.cue)result.cue='A nearby creature notices you. Step away to evade, or approach to engage.';}
    if((g.phase==='alert'||g.phase==='pursue')&&(protectedPlayer||homeDistance>(g.scripted?3:6.1))){g.phase='return';g.cooldown=3;g.pathClock=0;g.rows.forEach(r=>r.path=[]);}
    if(g.phase==='alert'){g.alertAge+=dt;if(g.alertAge>=.9){g.phase='pursue';g.pathClock=0;}}
    for(const row of g.rows){
     const before={x:row.x,y:row.y};
     if(g.phase==='pursue'&&g.pathClock<=0)row.path=localPath(world,row,player,row.home,leash,points);
     else if(g.phase==='return'&&!row.path.length&&dist(row,row.home)>.1)row.path=localPath(world,row,row.home,row.home,leash,points);
     else if(g.phase==='patrol'){
      row.pause=Math.max(0,row.pause-dt);
      if(!row.path.length&&!row.pause){const roam=Array.isArray(g.object.roam)&&g.object.roam.length?g.object.roam:DEFAULT_ROAM;row.waypoint=(row.waypoint+1)%roam.length;const step=roam[row.waypoint];if(Array.isArray(step)&&step.every(Number.isFinite)){const scale=g.scripted?.5:1,target={x:row.home.x+clamp(step[0],-2,2)*scale,y:row.home.y+clamp(step[1],-2,2)*scale};row.path=localPath(world,row,target,row.home,g.scripted?1.65:3,points);}row.pause=.6;}
     }
     if(g.phase!=='alert')walk(world,row,g.phase==='pursue'?1.35:g.phase==='return'?1.15:.62,dt,points);
     row.moving=dist(before,row)>.001;if(Math.abs(row.x-before.x)>.001)row.facing=row.x>before.x?1:-1;
    }
    if(g.pathClock<=0)g.pathClock=.45;
    if(g.phase==='return'&&g.rows.every(r=>dist(r,r.home)<.12||!r.path.length)){g.phase='patrol';g.rows.forEach(r=>r.pause=.8);}
    if(g.phase==='pursue'&&!protectedPlayer&&g.rows.some(r=>dist(r,player)<.9&&clearSight(world,r,player))&&!result.engage){result.engage=g.object;g.phase='return';g.cooldown=8;g.rows.forEach(r=>r.path=[]);}
   }
   return result;
  }
 };
 return api;
}

/** Renderer/interaction convenience, including authored fallback before the
 * first update or while displaying an isolated composition. */
export function fieldPatrolPosition(world,object,index=0){return world?.fieldPatrols?.position(world,object,index)||{...spawn(object,index),phase:'patrol',alert:0,moving:false,facing:1};}
