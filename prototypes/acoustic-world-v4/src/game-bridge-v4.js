/* Concrete, event-driven integration surface for the host game.
 * Quest/combat/NPC/world state remain host-owned. This object may only
 * render/caption audio or return read-only advisory attack windows.
 */
import {AA_AcousticDirectorV3} from './game-bridge-v3.js';
import {AcousticEventLedger,resolveV4Cue,BossBeatClock} from './acoustic-events-v4.js';
export class AA_AcousticDirectorV4 extends AA_AcousticDirectorV3 {
 constructor(opts={}){
  super(opts);this.ledger=new AcousticEventLedger(opts.ledgerOptions);
  this.bossClock=new BossBeatClock({clock:opts.clock||(()=>typeof performance!=='undefined'?performance.now():0)});
  this.onCombatBeat=opts.onCombatBeat||(()=>{});
  this.onTransportError=opts.onTransportError||(()=>{});
 }
 async event(type,e={}){
  if(type==='boss:begin'){
   const result=this.bossClock.begin({boss:e.boss,attackId:e.attackId,timeMs:e.timeMs,windupMs:e.windupMs});
   if(result.accepted)await this.event('boss:telegraph',{boss:e.boss,phase:'windup',position:e.position,timeMs:e.timeMs});
   return {...result,handled:true};
  }
  if(type==='boss:guard')return {...this.bossClock.guard(e.timeMs),handled:true};
  if(type==='boss:tick'){
   const tick=this.bossClock.tick(e.timeMs);
   for(const consequence of tick.events){
    if(consequence.type==='impact'){
     this.onCombatBeat({...consequence,gameplayEffect:'none'});
     await this.event('boss:telegraph',{boss:consequence.boss,phase:consequence.guarded?'vulnerable':'enrage',position:e.position,timeMs:e.timeMs});
    }
   }
   return {...tick,handled:true};
  }
  if(type==='audio:replayguard')return {...this.ledger.admit(e),handled:true};
  const cue=resolveV4Cue(type,e);
  if(!cue)return super.event(type,e);
  if(e.eventId!==undefined){const admission=this.ledger.admit(e);if(!admission.accepted)return {...admission,handled:true};}
  // Audio is always advisory and never changes the host's world flags or damage.
  const decision=this.arbiter.request(cue,Number.isFinite(e.timeMs)?e.timeMs:undefined);
  if(!decision.accepted)return {...decision,handled:true};
  this.onAcousticCue({type,cue,decision,source:e,gameplayEffect:'none'});
  this.audio.caption(cue.caption,cue.bus);
  for(const displaced of decision.displaced){try{displaced.handle?.source?.stop()}catch{}}
  if(type==='boss:telegraph')this.score.setState({danger:cue.id.endsWith('windup')?1:.55,bossPhase:cue.id.endsWith('vulnerable')?.30:.8});
  if(type==='timeline:consequence')this.score.setState({story:.85,discovery:.8});
  try{
   const handle=await this.audio.play(cue.id,{bus:cue.bus,pos:cue.position,gain:cue.priority>=8?.82:.47,caption:null});
   if(!handle){this.arbiter.release(decision.token);return {handled:true,asset:cue.id,captionOnly:true};}
   const stop=()=>this.arbiter.release(decision.token);
   if(handle.source?.addEventListener)handle.source.addEventListener('ended',stop,{once:true});
   else this.arbiter.release(decision.token);
   return {handled:true,...decision,asset:cue.id};
  }catch(error){this.arbiter.release(decision.token);this.onTransportError({type,asset:cue.id,error:String(error)});return {handled:true,asset:cue.id,captionOnly:true,error:String(error)};}
 }
 serialize(){return {...super.serialize(),version:4,v4:{ledger:this.ledger.serialize()}};}
 restore(data={}){super.restore(data);if(data.version>=4&&data.v4?.ledger)this.ledger.restore(data.v4.ledger);this.bossClock.reset();}
 dispose(){this.bossClock.reset();super.dispose();}
}
