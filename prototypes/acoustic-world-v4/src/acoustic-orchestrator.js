/* A&A v3 - semantic, deterministic audio cues. Works without an AudioContext.
 * The game remains authoritative for physics, quests, damage and NPC schedules.
 */
import {BIOME_IDS, ACOUSTIC_SIGNALS} from './acoustic-world.js';
import {MATERIAL_RESONANCE} from './acoustic-simulation.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
export const ECOLOGY_SPECIES=Object.freeze(['reed_stalker','clayback','glass_moth','ash_hart','bog_watcher','moss_lurker','cinder_fox','river_serpent','stone_ram','crystal_hawk','burrower','marsh_heron']);
export const WEATHER_TYPES=Object.freeze(['rain','wind','night']);
export const BEHAVIORS=Object.freeze(['graze','patrol','shield_form','withdraw']);
export const MATERIAL_ACTIONS=Object.freeze(['equip','impact','resonate','fracture']);
export const MATERIALS=Object.freeze(['moss','gravel','crystal','clay','bronze','wood','water','ash']);
export const SIGNALS=Object.freeze(Object.keys(ACOUSTIC_SIGNALS));
export const AUDIO_CUES=Object.freeze({
  weather:48,ecology:48,tactics:32,narrative:12
});
export const CURATED_LINES=Object.freeze({
  companion_moss:{speaker:'Companion',caption:'Keep to the moss. The marsh will swallow our footsteps, but the gravel tells every creature exactly where we are.',context:'stealth',priority:6},
  companion_clayback:{speaker:'Companion',caption:'Listen to its shell! That ringing note is the weak point. Match the pitch, then strike!',context:'combat',priority:10},
  archivist_paths:{speaker:'Archivist',caption:'There is no silence in the archive. Each choice you leave behind becomes a current, and each current still remembers you.',context:'timeline',priority:8},
  witness_water:{speaker:'The Witness',caption:"Do you hear it? The water doesn't repeat the same song twice. Every path we didn't take is still singing somewhere underneath.",context:'timeline',priority:8},
  companion_armor:{speaker:'Companion',caption:'Hold! That thing is wearing the ground as armor. Break its footing, or your blades will only feed it.',context:'combat',priority:10}
});

// A single resolver makes each sample a game-state event rather than a random decorative sound.
export function resolveCue(type,e={}){
  if(type==='weather:changed'){
    if(!BIOME_IDS.includes(e.biome)||!WEATHER_TYPES.includes(e.weather))return null;
    return {id:`weather_${e.biome}_${e.weather}`,bus:'ambience',priority:2,loop:true,key:`weather_${e.biome}`,caption:`${e.weather} settles over ${e.biome.replaceAll('_',' ')}.`};
  }
  if(type==='ecology:behavior'){
    if(!ECOLOGY_SPECIES.includes(e.species)||!BEHAVIORS.includes(e.action))return null;
    return {id:`behavior_${e.species}_${e.action}`,bus:'creature',priority:e.action==='shield_form'?9:3,position:e.position,caption:`${e.species.replaceAll('_',' ')}: ${e.action.replaceAll('_',' ')}.`,cooldownMs:e.action==='shield_form'?2000:9000};
  }
  if(type==='material:state'){
    if(!MATERIALS.includes(e.material)||!MATERIAL_ACTIONS.includes(e.action))return null;
    return {id:`tactic_${e.material}_${e.action}`,bus:'foley',priority:e.action==='fracture'?9:5,position:e.position,caption:`${e.material} ${e.action}.`,cooldownMs:500};
  }
  if(type==='timeline:echo'){
    if(!SIGNALS.includes(e.signal))return null;
    return {id:`memory_${e.signal}`,bus:'clue',priority:7,position:e.position,caption:`A ${e.signal.replaceAll('_',' ')} memory answers.`,cooldownMs:5000};
  }
  if(type==='dialogue:line'){
    const line=CURATED_LINES[e.lineId];if(!line)return null;
    return {id:e.lineId,bus:'voice',priority:line.priority,voice:true,caption:`${line.speaker}: ${line.caption}`,cooldownMs:12000};
  }
  return null;
}

// Selection is deterministic and can be tested on servers without audio playback.
// A crucial line may preempt wildlife; wildlife cannot preempt a tactical warning.
export class CueArbiter {
  constructor({maxVoices=10,now=()=>Date.now()}={}){
    this.maxVoices=maxVoices;this.now=now;this.active=new Map();this.last=new Map();this.serial=0;
  }
  request(cue,timestamp=this.now()){
    if(!cue)return {accepted:false,reason:'invalid'};
    if(!Number.isFinite(timestamp))return {accepted:false,reason:'bad_time'};
    const key=cue.key||cue.id,limit=cue.cooldownMs??(cue.loop?0:2200);
    if(this.active.has(key))return {accepted:false,reason:'already_playing',key};
    if(this.last.has(key)&&timestamp-this.last.get(key)<limit)return {accepted:false,reason:'cooldown',key};
    const displaced=[];
    if(this.active.size>=this.maxVoices){
      const candidate=[...this.active.values()].filter(a=>!a.pinned).sort((a,b)=>a.priority-b.priority||a.sequence-b.sequence)[0];
      if(!candidate||candidate.priority>=cue.priority)return {accepted:false,reason:'polyphony',key};
      this.active.delete(candidate.key);displaced.push(candidate);
    }
    const token=`cue-${++this.serial}`;
    this.active.set(key,{...cue,key,token,priority:clamp(cue.priority||1,0,10),sequence:this.serial,started:timestamp,pinned:!!cue.pinned});
    this.last.set(key,timestamp);
    return {accepted:true,key,token,displaced};
  }
  release(token){for(const [key,c] of this.active){if(c.token===token){this.active.delete(key);return true;}}return false;}
  clear(){this.active.clear();}
  snapshot(){return [...this.active.values()].map(({key,id,priority,token})=>({key,id,priority,token}));}
}

// Production-safe, bounded frame-rate independent intensity signals for adaptive score.
export function musicState({threat=0,velocity=0,proximity=0,questPulse=0,boss=0,dialogue=false,cycle=0}={}){
  const danger=clamp(threat*.65+proximity*.30+boss*.45);
  return {danger,travel:clamp(velocity/4),discovery:clamp(questPulse),story:clamp(dialogue?0.72:cycle>0?.28:0),bossPhase:clamp(boss)};
}
export function encounterAcousticState({material='clay',attackFrequency=196,shielding=0.5,noise=0}={}){
  const expected=MATERIAL_RESONANCE[material];if(!expected)return {known:false};
  const distance=Math.abs(Math.log2(Math.max(1,attackFrequency)/expected));
  const octaveError=Math.abs(distance-Math.round(distance));
  return {known:true,material,noteHz:expected,alignment:clamp(1-octaveError/.5),armorAudibility:clamp(shielding*.7+noise*.3),hint:octaveError<.15?'in_tune':'out_of_tune'};
}
