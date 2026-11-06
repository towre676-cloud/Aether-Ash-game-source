/* v3 production adapter: V2 host events + semantic audio object dispatch.
 * No authority over actor movement, loot, boss phases, world flags or quests.
 */
import {AA_AcousticDirector} from './game-bridge.js';
import {CueArbiter,resolveCue,musicState} from './acoustic-orchestrator.js';
export class AA_AcousticDirectorV3 extends AA_AcousticDirector {
  constructor(opts={}){
    super(opts);this.arbiter=new CueArbiter({maxVoices:opts.maxVoices??12,now:opts.now});
    this.onAcousticCue=opts.onAcousticCue||(()=>{});
    this.externalVoices=new Map(Object.entries(opts.voiceAssets||{}));
    this.weatherHandle=null;this.weatherSerial=0;this.weatherToken=null;this.weatherKey=null;this.weatherCueId=null;this.eventClock=0;
  }
  async event(type,e={}){
    if(type==='weather:clear'){
      ++this.weatherSerial;try{this.weatherHandle?.source.stop()}catch{};this.weatherHandle=null;
      if(this.weatherToken)this.arbiter.release(this.weatherToken);this.weatherToken=null;this.weatherKey=null;this.weatherCueId=null;this.weatherCueId=null;this.weather='clear';
      return {handled:true,weather:'clear'};
    }
    if(type==='audio:preferences'){
      if(typeof e.muted==='boolean')this.audio.setMuted(e.muted);
      if(typeof e.subtitles==='boolean')this.audio.subtitles=e.subtitles;
      if(e.bus&&Number.isFinite(e.volume))this.audio.setVolume(e.bus,e.volume);
      return {handled:true,muted:this.audio.muted,subtitles:this.audio.subtitles};
    }
    if(type==='audio:state'){
      const state=musicState(e);this.score.setState(state);return {handled:true,state};
    }
    if(type==='voice:register'){
      // Host supplies same-origin audio paths. A signed temporary provider URL is not a deployable URL.
      if(typeof e.id!=='string'||typeof e.url!=='string'||!e.url.startsWith('/'))return {registered:false,reason:'requires_same_origin_asset_path'};
      this.externalVoices.set(e.id,e.url);return {registered:true,id:e.id};
    }
    const cue=resolveCue(type,e);if(!cue)return super.event(type,e);
    if(type==='weather:changed')this.weather=e.weather==='rain'?'storm':e.weather;
    if(cue.key?.startsWith('weather_')&&this.weatherToken&&this.weatherCueId!==cue.id){
      this.arbiter.release(this.weatherToken);this.weatherToken=null;this.weatherKey=null;this.weatherCueId=null;
    }
    const decision=this.arbiter.request(cue,Number.isFinite(e.timeMs)?e.timeMs:undefined);
    if(!decision.accepted)return {...decision,handled:true};
    this.onAcousticCue({type,cue,decision,source:e,gameplayEffect:'none'});
    this.audio.caption(cue.caption,cue.voice?'dialogue':cue.bus);
    for(const displaced of decision.displaced){if(displaced.handle?.source)try{displaced.handle.source.stop()}catch{}}
    if(cue.key?.startsWith('weather_')){
      // Generation counter prevents asynchronous fetch completions from reviving stale ambience.
      const version=++this.weatherSerial;
      const prev=this.weatherHandle;this.weatherHandle=null;
      if(prev){try{prev.source.stop()}catch{}}
      const handle=await this.audio.play(cue.id,{bus:cue.bus,gain:.19,loop:true,caption:null});
      if(version!==this.weatherSerial){try{handle?.source.stop()}catch{};this.arbiter.release(decision.token);return {handled:true,stale:true};}
      this.weatherHandle=handle;this.weatherToken=decision.token;this.weatherKey=cue.key;this.weatherCueId=cue.id;
      return {handled:true,...decision,asset:cue.id,loop:true};
    }
    if(cue.voice){
      const url=this.externalVoices.get(e.lineId);
      if(!url){this.arbiter.release(decision.token);return {handled:true,...decision,asset:null,captionOnly:true};}
      // Existing WebAudio voice() handles speech ducking, but the arbiter gates overlap.
      const handle=await this.audio.voice(url,{caption:null});
      if(handle)handle.addEventListener?.('ended',()=>this.arbiter.release(decision.token),{once:true});
      else this.arbiter.release(decision.token);
      return {handled:true,...decision,asset:url};
    }
    let handle;
    try{handle=await this.audio.play(cue.id,{bus:cue.bus,pos:cue.position||null,gain:cue.priority>=8?.72:.42,caption:null});}
    catch(error){this.arbiter.release(decision.token);return {handled:true,asset:cue.id,failed:true,error:String(error)};}
    if(!handle){this.arbiter.release(decision.token);return {handled:true,...decision,missing:true,asset:cue.id};}
    handle.source?.addEventListener?.('ended',()=>this.arbiter.release(decision.token),{once:true});
    return {handled:true,...decision,asset:cue.id};
  }
  serialize(){return {...super.serialize(),version:3,v3:{voiceAssets:[...this.externalVoices].filter(([,url])=>url.startsWith('/'))}};}
  restore(snapshot={}){super.restore(snapshot);if(snapshot.version>=3){for(const [id,url] of snapshot.v3?.voiceAssets||[])if(typeof url==='string'&&url.startsWith('/'))this.externalVoices.set(id,url);}}
  dispose(){++this.weatherSerial;this.arbiter.clear();try{this.weatherHandle?.source.stop()}catch{};super.dispose();}
}
