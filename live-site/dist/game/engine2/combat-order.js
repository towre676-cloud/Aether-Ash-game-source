import {commandReach,approachForCommand} from './combat-engagement.js?v=5.25.0';
import {techniquePreview} from './technique-preview.js?v=5.24.0';
import {objectiveActors} from './encounter-objectives.js?v=5.5.0';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const key=(x,y)=>x+','+y;
/** The route uses the same collision authority as manual movement. A bounded
 * four-way search cannot cut diagonally through a wall or leave the scene. */
export function combatRoute(world,actor,point){
 if(!world?.scene||!actor||!point||![actor.x,actor.y,point.x,point.y].every(Number.isFinite)||!world.walkable(point.x,point.y))return null;
 const start=[Math.floor(actor.x),Math.floor(actor.y)],end=[Math.floor(point.x),Math.floor(point.y)],queue=[start],seen=new Set([key(...start)]),prior=new Map();let found=false;
 for(let i=0;i<queue.length&&i<2048;i++){
  const [x,y]=queue[i];if(x===end[0]&&y===end[1]){found=true;break;}
  for(const [a,b]of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(!seen.has(key(a,b))&&world.walkable(a+.5,b+.5)){seen.add(key(a,b));prior.set(key(a,b),[x,y]);queue.push([a,b]);}
 }
 if(!found)return null;
 const route=[];let cell=end;
 while(key(...cell)!==key(...start)){route.unshift({x:cell[0]+.5,y:cell[1]+.5});cell=prior.get(key(...cell));}
 if(route.length)route.unshift({x:start[0]+.5,y:start[1]+.5});
 route.push({x:point.x,y:point.y});return route;
}
/** Move one combatant through verified floor; never teleport to an approach.
 * The leader's campaign coordinate is synchronized by the caller afterwards. */
function walkRoute(world,hero,route,dt){
 let budget=Math.min(.1,Math.max(0,dt))*2.65,moved=0;
 for(let n=0;route.length&&budget>1e-8&&n<64;n++){
  const p=route[0],d=distance(hero,p);if(d<.015){route.shift();continue;}
  const step=Math.min(d,budget,.15),x=hero.x+(p.x-hero.x)*step/d,y=hero.y+(p.y-hero.y)*step/d;
  if(!world.walkable(x,y)||!world.walkable(x,hero.y)||!world.walkable(hero.x,y))break;
  hero.x=x;hero.y=y;moved+=step;budget-=step;if(d<=step+.001)route.shift();
 }
 return moved;
}

/** Exactly one visible order. It owns neither a turn nor resources until the
 * canonical Battle.command accepts it. Manual control cancels the order. */
export function createCombatOrders({onNotice=()=>{},onExecute=()=>{},reach=commandReach,approach=approachForCommand}={}){
 let pending=null,autoHold=0;
 const cancel=()=>{const had=!!pending;pending=null;return had;};
 function request(battle,world,hero,kind,target,tech=null,{automatic=false,point=null}={}){
  if(!battle||battle.ended||!hero||hero.hp<=0||!world?.state)return false;
  if(kind!=='move'&&(!target||target.withdrawn||target.hp<=0&&!tech?.revive))return false;
  if(tech){const q=techniquePreview(battle,hero,tech,{allowCharging:true});if(!q.enabled){if(!automatic)onNotice(q.reason);return false;}}
  if(kind==='move'&&(!point||!world.walkable(point.x,point.y)))return false;
  pending={battle,state:world.state,scene:world.state.scene,heroId:hero.id,targetId:target?.id,kind,tech,automatic,point,route:null,goal:null,replan:0,age:0,blocked:0,phase:kind==='move'?'moving':'queued',label:kind==='move'?'Move':kind==='guard'?'Guard':tech?.name||'Attack',actor:hero.name,target:target?.name||''};
  return true;
 }
 function step(battle,world,dt,{paused=false}={}){
  autoHold=Math.max(0,autoHold-Math.max(0,dt||0));
  const order=pending;if(!order)return;
  if(!battle||battle!==order.battle||battle.ended||!world||world.state!==order.state||world.state.scene!==order.scene||world.state.mode!=='battle'){cancel();return;}
  if(paused)return;
  const hero=battle.heroes.find(h=>h.id===order.heroId),target=order.kind==='guard'?hero:[...battle.heroes,...battle.enemies,...objectiveActors(battle)].find(t=>t.id===order.targetId);
  if(!hero||hero.hp<=0||order.kind!=='move'&&(!target||target.withdrawn||target.hp<=0&&!order.tech?.revive)){cancel();return;}
  order.age+=Math.min(.1,Math.max(0,dt));order.replan-=dt;
  if(order.age>10){cancel();if(!order.automatic)onNotice('Order cancelled: choose a closer target or another route.');return;}
  const r=order.kind==='move'?{enabled:true,inRange:distance(hero,order.point)<.12,clear:true}:reach(battle,hero,target,order.kind,order.tech);
  if(r.enabled&&(!r.inRange||!r.clear)){
   order.phase=order.kind==='move'?'moving':'approaching';
   if(!order.route||order.replan<=0){
    const goal=order.kind==='move'?order.point:approach(battle,hero,target,order.kind,order.tech);
    if(!order.route?.length||!goal||!order.goal||distance(order.goal,goal)>.6||order.blocked>.2){order.route=goal?combatRoute(world,hero,goal):null;order.goal=goal;}
    order.replan=.3;
   }
   const moved=order.route?walkRoute(world,hero,order.route,dt):0;order.blocked=moved>.001?0:order.blocked+dt;
   if(order.blocked>.9){cancel();if(!order.automatic)onNotice('No clear approach. Move to open ground or choose another target.');}
   return;
  }
  if(order.kind==='move'){cancel();return;}
  if(hero.atb<1){order.phase='charging';return;}
  if(order.tech){const q=techniquePreview(battle,hero,order.tech);if(!q.enabled){cancel();if(!order.automatic)onNotice(q.reason);return;}}
  // Clear first: battle callbacks can finish the encounter synchronously.
  cancel();const ok=battle.command(hero.id,order.kind,target.id,order.tech);
  if(ok)onExecute({battle,hero,order});else if(!order.automatic)onNotice('The situation changed. Choose your next action.');
 }
 function automatic(battle,world,targetId){
  if(autoHold>0||!battle||battle.ended||pending&&!pending.automatic)return;
  let approachHero=null,approachTarget=null;
  for(const hero of [...battle.ready]){
   if(battle.ended)break;if(pending?.heroId===hero.id)continue;
   const target=battle.livingEnemies.find(t=>t.id===targetId)||battle.livingEnemies[0];if(!target)break;
   const r=reach(battle,hero,target,'attack');
   if(!r.enabled||r.inRange&&r.clear){if(battle.command(hero.id,'attack',target.id))onExecute({battle,hero,order:{automatic:true,label:'Attack'}});}
   else if(!approachHero){approachHero=hero;approachTarget=target;}
  }
  if(!pending&&approachHero&&!battle.ended)request(battle,world,approachHero,'attack',approachTarget,null,{automatic:true});
 }
 return {get pending(){return pending;},cancel,request,step,automatic,
  manual(){cancel();autoHold=.7;},
  cancelAutomatic(){if(pending?.automatic)cancel();},
  get status(){if(!pending)return '';const o=pending,verb=o.phase==='moving'?'Moving to selected ground':o.phase==='approaching'?'Approaching '+o.target:o.phase==='charging'?'Gathering focus':'Ready to act';return o.actor+' · '+o.label+' · '+verb;}
 };
}

export function mountCombatOrderUI({parent,orders,onCancel}){
 const row=document.createElement('div'),text=document.createElement('span'),cancel=document.createElement('button');row.id='combat-order';row.hidden=true;text.setAttribute('role','status');text.setAttribute('aria-live','polite');cancel.type='button';cancel.textContent='Cancel';cancel.setAttribute('aria-label','Cancel queued combat action');cancel.onclick=onCancel;row.append(text,cancel);parent.append(row);
 return {draw({battle=null,hero=null,target=null}={}){let value=orders.status;if(!value&&battle&&hero){const r=target?commandReach(battle,hero,target,'attack'):null;value=hero.name+(hero.atb>=1?' ready':' · choose while focus gathers')+(r?.enabled?' · '+(r.inRange&&r.clear?'Strike in reach':'Attack approaches the target'):'');}row.hidden=!value;cancel.hidden=!orders.pending;if(text.textContent!==value)text.textContent=value;row.dataset.phase=orders.pending?.phase||'idle';}};
}
