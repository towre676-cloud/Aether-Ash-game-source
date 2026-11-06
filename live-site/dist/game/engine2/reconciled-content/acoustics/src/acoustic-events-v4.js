/* A&A Acoustic World v4: pure event resolvers and zero-authority timing contracts.
 * Deterministic: safe to test without browser, audio hardware or host engine.
 */
export const V4_BOSSES=Object.freeze(['clayback_warden','glass_regent','bog_colossus','ash_stag','rift_serpent','kiln_golem','stone_choir','water_archivist']);
export const V4_BOSS_PHASES=Object.freeze(['stalk','windup','vulnerable','enrage']);
export const V4_NPCS=Object.freeze(['smith','boatwright','healer','herder','cartographer','archivist','ferryman','gardener']);
export const V4_NPC_ACTIONS=Object.freeze(['work','idle','warn','trade']);
export const V4_DEVICES=Object.freeze(['hydrophone','sluice','mako_conduit','resonance_door','clay_drum','wind_chime','echo_well','flood_clock']);
export const V4_DEVICE_ACTIONS=Object.freeze(['activate','pulse','overload','resolve']);
export const V4_ZONES=Object.freeze(['marsh','forge','archive','market','grove','cavern','cathedral','rift']);
export const V4_TIMELINE_STATES=Object.freeze(['origin','fracture','mirror','reconcile']);
const included=(a,v)=>typeof v==='string'&&a.includes(v);
const pos=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)?{x:p.x,z:p.z}:null;
const label=s=>s.replaceAll('_',' ');
// Only return a cue when the underlying game has supplied an allowed state and position.
// Sound must never infer a world object, invent a quest, or advance host battle state.
export function resolveV4Cue(type,event={}){
  if(type==='boss:telegraph'){
    if(!included(V4_BOSSES,event.boss)||!included(V4_BOSS_PHASES,event.phase))return null;
    return {id:`boss_${event.boss}_${event.phase}`,bus:'creature',priority:event.phase==='windup'?10:8,position:pos(event.position),caption:`${label(event.boss)}: ${label(event.phase)}.`,cooldownMs:event.phase==='windup'?100:700,key:`boss_${event.boss}_${event.phase}`};
  }
  if(type==='npc:work'){
    if(!included(V4_NPCS,event.role)||!included(V4_NPC_ACTIONS,event.action))return null;
    return {id:`npc_${event.role}_${event.action}`,bus:'foley',priority:event.action==='warn'?8:2,position:pos(event.position),caption:`${label(event.role)}: ${label(event.action)}.`,cooldownMs:event.action==='warn'?3000:6000};
  }
  if(type==='world:device'){
    if(!included(V4_DEVICES,event.device)||!included(V4_DEVICE_ACTIONS,event.action))return null;
    return {id:`device_${event.device}_${event.action}`,bus:'clue',priority:event.action==='overload'?9:6,position:pos(event.position),caption:`${label(event.device)} ${label(event.action)}.`,cooldownMs:700};
  }
  if(type==='timeline:consequence'){
    if(!included(V4_ZONES,event.zone)||!included(V4_TIMELINE_STATES,event.state))return null;
    return {id:`timeline_${event.zone}_${event.state}`,bus:'clue',priority:8,position:pos(event.position),caption:`${label(event.zone)}: ${label(event.state)} timeline remembered.`,cooldownMs:4000};
  }
  return null;
}

const limit=(n,a,b)=>Math.max(a,Math.min(b,n));
export class BossBeatClock {
 constructor({windupMs=1200,guardWindowMs=300,recoveryMs=700,clock=()=>0}={}){
  this.windupMs=windupMs;this.guardWindowMs=guardWindowMs;this.recoveryMs=recoveryMs;this.clock=clock;this.active=null;this.sequence=0;this.lastOutcome=null;
 }
 begin({boss,attackId,timeMs=this.clock(),windupMs=this.windupMs,recoveryMs=this.recoveryMs}={}){
  if(!included(V4_BOSSES,boss)||typeof attackId!=='string'||!attackId||!Number.isFinite(timeMs)||!Number.isFinite(windupMs)||windupMs<450||windupMs>6000)return {accepted:false,reason:'invalid_attack'};
  if(this.active)return {accepted:false,reason:'attack_in_progress'};
  this.active={boss,attackId,start:timeMs,impactAt:timeMs+windupMs,recoveryAt:timeMs+windupMs+limit(recoveryMs,200,5000),guarded:false,impacted:false,sequence:++this.sequence};
  return {accepted:true,attackId,impactAt:this.active.impactAt,guardOpensAt:this.active.impactAt-this.guardWindowMs,guardWindowMs:this.guardWindowMs};
 }
 guard(timeMs=this.clock()){
  const a=this.active;if(!a)return {guarded:false,reason:'no_attack'};
  if(!Number.isFinite(timeMs))return {guarded:false,reason:'invalid_time'};
  if(a.guarded)return {guarded:false,reason:'already_guarded'};
  if(timeMs<a.impactAt-this.guardWindowMs)return {guarded:false,reason:'too_early',opensAt:a.impactAt-this.guardWindowMs};
  if(timeMs>a.impactAt||a.impacted)return {guarded:false,reason:'too_late'};
  a.guarded=true;return {guarded:true,attackId:a.attackId};
 }
 tick(timeMs=this.clock()){
  const a=this.active;if(!a)return {phase:'idle',events:[]};
  if(!Number.isFinite(timeMs))return {phase:'invalid',events:[]};
  if(timeMs<a.start)return {phase:'windup',events:[]};
  const events=[];
  if(timeMs>=a.impactAt&&!a.impacted){a.impacted=true;this.lastOutcome={type:'impact',boss:a.boss,attackId:a.attackId,guarded:a.guarded,sequence:a.sequence};events.push({...this.lastOutcome});}
  if(timeMs>=a.recoveryAt){this.active=null;events.push({type:'recovered',attackId:a.attackId});return {phase:'idle',events};}
  return {phase:!a.impacted?'windup':'recovery',remainingMs:Math.max(0,a.impactAt-timeMs),guarded:a.guarded,events};
 }
 reset(){this.active=null;this.lastOutcome=null;}
}

/** Event IDs / per-actor sequence numbers prevent duplicate audio callbacks on bridge reconnection.
 * Does NOT grant rewards; host owns every persistent or mutating game action. */
export class AcousticEventLedger {
 constructor({maxEntries=1024}={}){this.maxEntries=limit(maxEntries,32,8192);this.seen=new Set();this.order=[];this.sequences=new Map();}
 admit({eventId,actorId,sequence}={}){
  if(typeof eventId!=='string'||eventId.length<1||eventId.length>128)return {accepted:false,reason:'requires_event_id'};
  if(this.seen.has(eventId))return {accepted:false,reason:'duplicate_event'};
  if(actorId!==undefined||sequence!==undefined){
   if(typeof actorId!=='string'||!actorId||!Number.isSafeInteger(sequence)||sequence<0)return {accepted:false,reason:'bad_sequence'};
   if(this.sequences.has(actorId)&&sequence<=this.sequences.get(actorId))return {accepted:false,reason:'out_of_order'};
  }
  this.seen.add(eventId);this.order.push(eventId);if(actorId!==undefined)this.sequences.set(actorId,sequence);
  if(this.order.length>this.maxEntries)this.seen.delete(this.order.shift());
  return {accepted:true};
 }
 serialize(){return {version:1,order:this.order.slice(-this.maxEntries),sequences:[...this.sequences]};}
 restore(data={}){this.order=(Array.isArray(data.order)?data.order:[]).filter(x=>typeof x==='string'&&x.length<=128).slice(-this.maxEntries);this.seen=new Set(this.order);this.sequences=new Map((Array.isArray(data.sequences)?data.sequences:[]).filter(p=>Array.isArray(p)&&typeof p[0]==='string'&&Number.isSafeInteger(p[1])));}
}
