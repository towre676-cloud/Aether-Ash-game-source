/** Small presentation-only state machine for genuinely drawn action poses.
 * It observes resolved travel and battle events; it never delays commands,
 * changes actor positions, spends resources, or advances the game clock.
 */
const finite=n=>Number.isFinite(n),clock=n=>finite(n)?Math.max(0,n):0;
const keyOf=actor=>actor&&actor.id!==undefined?`${typeof actor.id}:${actor.id}`:null;
const pick=(atlas,frame,state)=>({atlas,frame,state});
const phaseIndex=phase=>Math.floor(((finite(phase)?phase:0)%4+4)%4);
const actionFrame=(age,timeline)=>timeline.find(([until])=>age<until)?.[1];
const ACTIONS={
 sable:[[.08,8],[.15,9],[.24,10],[.33,11],[.48,12]],
 herald:[[.10,7],[.27,8],[.62,9]],
 moonveil:[[.24,5],[.57,6]]
};

export class AuthoredMotion{
 constructor(){this.actors=new Map();}
 reset(){this.actors.clear();}
 state(actor,time){
  const key=keyOf(actor);if(key===null)return null;
  let s=this.actors.get(key);
  if(!s||time<(s.lastTime??time)){
   s={lastTime:time,phase:0,action:null,hurtUntil:-1,turnUntil:-1,brakeUntil:-1};
   this.actors.set(key,s);
  }
  s.lastTime=time;
  // Field actors are snapshots with stable IDs. A bounded map avoids retaining
  // the complete campaign even if a host forgets to reset on a scene change.
  if(this.actors.size>192)this.actors.delete(this.actors.keys().next().value);
  return s;
 }
 action(actor,kind,time){
  const s=this.state(actor,time);if(!s)return;
  // One physical action may emit damage for several targets at the same time.
  // Do not restart its windup, nor replace the enemy-cast release with damage.
  if(s.action&&time-s.action.at<.06&&(kind==='attack'||s.action.kind===kind))return;
  s.action={kind,at:time};
 }
 event(event,time=0){
  if(!event)return;time=clock(time);
  if(event.type==='damage'){
   const s=this.state(event.actor,time);
   if(s&&!event.dot)s.hurtUntil=time+.18;
   if(event.source&&event.physical&&!event.dot)this.action(event.source,'attack',time);
  }else if(event.type==='enemy-cast')this.action(event.actor,'attack',time);
  else if(event.type==='cast'&&!event.fieldTick&&!event.echoRepeat)this.action(event.actor,'cast',time);
  else if(event.type==='guard')this.action(event.actor,'guard',time);
  else if(event.type==='interrupt'){
   const s=this.state(event.actor,time);if(s){s.hurtUntil=time+.24;s.action=null;}
  }
 }
 /** null means use the previous atlas. Armored Sable, chapter-four guardian,
  * and Moonveil Moth are the complete scope of these authored frame sets.
  * Pass the existing characterPose as `pose`; its distance clock is retained.
  */
 select(actor,{hero=false,starter=false,chapter=0,pose=null,time=0,battle=false,reducedMotion=false}={}){
  if(!actor)return null;
  const atlas=hero?(actor.id===0&&!starter?'sable':null):actor.species==='moonmoth'?'moonveil':actor.boss&&chapter===4?'herald':null;
  if(!atlas)return null;
  time=clock(time);const s=this.state(actor,time);if(!s)return null;
  const moving=hero?!!pose?.moving:!!actor.fieldMoving;
  const facing=hero?(pose?.facing??1):(actor.fieldFacing??1);
  if(s.facing!==undefined&&facing!==s.facing&&!reducedMotion)s.turnUntil=time+.09;
  if(s.moving&&!moving&&!reducedMotion)s.brakeUntil=time+.10;
  if(!hero&&moving&&finite(actor.x)&&finite(actor.y)&&finite(s.x)&&finite(s.y)){
   const distance=Math.hypot(actor.x-s.x,actor.y-s.y);
   if(distance<1)s.phase=(s.phase+distance/1.4*4)%4;
  }
  s.facing=facing;s.moving=moving;s.x=actor.x;s.y=actor.y;
  if(actor.hp<=0)return pick(atlas,atlas==='sable'?15:atlas==='herald'?11:8,'down');
  if(s.hurtUntil>time)return pick(atlas,atlas==='sable'?13:atlas==='herald'?10:7,'hurt');
  if(s.action){
   const age=time-s.action.at;
   if(s.action.kind==='attack'){
    const f=actionFrame(age,ACTIONS[atlas]);
    if(f!==undefined)return pick(atlas,f,'attack');
   }else if(s.action.kind==='guard'&&age<.40)return pick(atlas,atlas==='sable'?14:atlas==='herald'?6:4,'guard');
   else if(s.action.kind==='cast'&&age<.70){
    // Sable's existing spell-casting pose has a raised free hand. Keep it until
    // a matching authored spell sequence is available instead of using a slash.
    if(atlas==='sable')return null;
    return pick(atlas,atlas==='herald'?7:5,'cast');
   }
   s.action=null;
  }
  if(!hero&&actor.intent)return pick(atlas,atlas==='herald'?6:4,'anticipate');
  if(!hero&&actor.status?.stagger>0)return pick(atlas,atlas==='herald'?9:6,'recover');
  if(atlas==='sable'){
   if(battle&&actor.status?.guard>0)return pick(atlas,14,'guard');
   // Rear travel and unrecognized active poses keep the established atlas.
   if(pose?.back||actor.pose>0)return null;
   if(s.turnUntil>time)return pick(atlas,7,'turn');
   if(s.brakeUntil>time)return pick(atlas,6,'brake');
   if(moving)return pick(atlas,[2,3,4,5][phaseIndex(pose?.phase)],'stride');
   return pick(atlas,reducedMotion?0:Math.floor(time/1.35)%2,'idle');
  }
  if(atlas==='herald'){
   if(moving)return pick(atlas,[2,3,4,5][phaseIndex(s.phase)],'stride');
   return pick(atlas,reducedMotion?0:Math.floor(time/1.6)%2,'idle');
  }
  // Wings beat around a fixed thorax anchor, not an independently resized
  // bounding box. Reduced motion keeps the gentle half-open hover pose.
  return pick(atlas,reducedMotion?0:[0,1,2,3][Math.floor(time/.14)%4],'hover');
 }
}
