/** Contextual finite performances, remembered rotation, and deliberate silence.
 * This owns score pacing only. Voices, environmental signals, and game state
 * remain with their existing systems. Its clock advances only during play. */
export const MUSIC_PACING_KEY='ash-music-pacing';
export const MUSIC_HISTORY_KEY='ash-music-history-v1';
export const MUSIC_PACING_MODES=Object.freeze(['spacious','continuous','ambient']);
const HISTORY_LIMIT=16,MIN_FIELD_DWELL=24;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=value=>{let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const recording=track=>track?.recordingKey||track?.audio||track?.id;
const combat=program=>program?.kind==='battle'||program?.kind==='boss';
const read=(storage,key)=>{try{return storage?.getItem(key);}catch{return null;}};
const write=(storage,key,value)=>{try{storage?.setItem(key,value);}catch{}};

export function createMusicDirector({player,library,programFor,storage,now=()=>performance.now()/1000,onChange=()=>{},onError=()=>{}}={}){
 if(!player||!(library instanceof Map)||typeof programFor!=='function')throw new TypeError('A soundtrack, resolved music library and program selector are required.');
 const knownRecordings=new Set([...library.values()].map(recording));
 let history=[],counter=0;
 try{const saved=JSON.parse(read(storage,MUSIC_HISTORY_KEY)||'null');if(saved?.version===1){counter=Number.isSafeInteger(saved.counter)?clamp(saved.counter,0,1e9):0;history=(Array.isArray(saved.history)?saved.history:[]).filter(row=>row&&typeof row.recordingKey==='string'&&knownRecordings.has(row.recordingKey)&&typeof row.id==='string'&&row.id.length<160).slice(-HISTORY_LIMIT).map(row=>({recordingKey:row.recordingKey,id:row.id,family:typeof row.family==='string'?row.family.slice(0,160):row.id}));}}catch{}
 let mode=read(storage,MUSIC_PACING_KEY);if(!MUSIC_PACING_MODES.includes(mode))mode='continuous';
 let active=false,ducked=false,phase='idle',desired=null,fieldProgram=null,currentProgram=null,current=null,pending=null,prepared=null;
 let restRemaining=0,dwell=0,epoch=0,lastTime=now(),announced='',destroyed=false,forceNext=false,skipRecording=null;
 const failed=new Set();

 function state(){
  const quiet=mode==='ambient'||!desired?.ids.length;
  const shown=quiet?'quiet':!active&&desired?'paused':phase;
  const playback=player.playbackState;
  return {phase:shown,mode,active,ducked,trackId:current?.id||pending?.track?.id||null,title:current?.title||pending?.track?.title||'',programLabel:desired?.label||'',programKey:desired?.key||null,kind:desired?.kind||'field',restRemaining:Math.max(0,Math.ceil(restRemaining)),history:history.map(row=>row.id),unavailable:phase==='unavailable',blocked:phase==='blocked'||!!playback?.blocked,transportPlaying:playback?!!playback.playing:phase==='playing',contextState:playback?.contextState||null};
 }
 function emit(){const snapshot=state(),key=JSON.stringify(snapshot);if(key===announced)return;announced=key;try{onChange(snapshot);}catch{}}
 function clock(){const at=now(),delta=Number.isFinite(at-lastTime)?clamp(at-lastTime,0,3600):0;lastTime=at;if(!active)return;if(phase==='resting')restRemaining=Math.max(0,restRemaining-delta);if(phase==='playing')dwell+=delta;}
 function persist(){write(storage,MUSIC_HISTORY_KEY,JSON.stringify({version:1,counter,history}));}
 function normalized(program){
  const ids=[...new Set((program?.ids||[]).filter(id=>typeof id==='string'&&library.has(id)))];
  const kind=['field','battle','boss','performance'].includes(program?.kind)?program.kind:'field';
  const rest=Array.isArray(program?.rest)?program.rest:[16,30];
  return {key:String(program?.key||kind),label:String(program?.label||'The world'),kind,ids,rest:[clamp(Number(rest[0])||0,0,90),clamp(Number(rest[1])||0,0,90)]};
 }
 function pool(program=desired){
  const seen=new Set();return (program?.ids||[]).map(id=>library.get(id)).filter(track=>{const key=recording(track);if(!track||!key||failed.has(key)||seen.has(key))return false;seen.add(key);return true;});
 }
 function choose(){
  let candidates=pool();if(!candidates.length)return null;
  const unskipped=candidates.filter(track=>recording(track)!==skipRecording);if(unskipped.length)candidates=unskipped;
  const last=history.at(-1),different=candidates.filter(track=>recording(track)!==last?.recordingKey);
  if(different.length)candidates=different;
  const recent=new Set(history.slice(-Math.min(5,Math.max(1,pool().length-1))).map(row=>row.recordingKey)),fresh=candidates.filter(track=>!recent.has(recording(track)));
  if(fresh.length)candidates=fresh;
  const newFamily=candidates.filter(track=>(track.family||track.id)!==last?.family);if(newFamily.length)candidates=newFamily;
  // Least recently heard first, then the context's deliberate programme order.
  // Persisted history prevents reopening the game from replaying its first cue.
  const rank=track=>history.map(row=>row.recordingKey).lastIndexOf(recording(track));
  const oldest=Math.min(...candidates.map(rank));candidates=candidates.filter(track=>rank(track)===oldest);
  return candidates[0];
 }
 function remembered(track){counter=(counter+1)%1e9;history.push({recordingKey:recording(track),id:track.id,family:track.family||track.id});history=history.slice(-HISTORY_LIMIT);persist();}
 function quietLength(){if(mode==='continuous'||combat(desired))return 0;const [a,b]=desired?.rest||[16,30],low=Math.min(a,b),high=Math.max(a,b);return low+(hash((desired?.key||'field')+':rest:'+counter)%1001)/1000*(high-low);}
 function sameProgram(a,b){return a?.key===b?.key&&a?.kind===b?.kind&&a?.ids.join('|')===b?.ids.join('|');}
 function includesCurrent(){return !!current&&pool().some(track=>recording(track)===recording(current));}
 function switchNeeded(){
  if(!current)return true;if(forceNext)return true;
  if(desired?.kind==='performance')return !sameProgram(currentProgram,desired);
  if(combat(desired)!==combat(currentProgram)||desired?.kind==='boss'&&currentProgram?.kind!=='boss'||desired?.kind==='battle'&&currentProgram?.kind==='boss')return true;
  if(includesCurrent())return false;
  return combat(desired)||dwell>=MIN_FIELD_DWELL;
 }
 function reportFailure(track,error){const key=recording(track);if(failed.has(key))return;failed.add(key);try{onError('Could not play '+(track.title||track.id)+'. Trying another piece.',error);}catch{}}
 function silence(fadeSeconds=1.4){epoch++;pending=null;prepared=null;current=null;currentProgram=null;restRemaining=0;dwell=0;forceNext=false;phase='quiet';player.stop({fadeSeconds});}
 function completed(){
  clock();
  // The previous source remains audible while its replacement downloads. Its
  // finite end still matters if that replacement is subsequently cancelled.
  if(phase==='loading'){if(current){current=null;currentProgram=null;dwell=0;emit();}return;}
  if(phase!=='playing'||!current)return;
  const wasPerformance=currentProgram?.kind==='performance';current=null;currentProgram=null;pending=null;dwell=0;forceNext=false;
  if(wasPerformance&&fieldProgram)desired=fieldProgram;
  if(mode==='ambient'||!desired?.ids.length){phase='quiet';restRemaining=0;emit();return;}
  restRemaining=quietLength();phase=restRemaining>0?'resting':'idle';emit();pump();
 }
 function start(track,{handoff=false}={}){
  if(!track)return;const request=++epoch,program=desired;
  pending={track,request};prepared=null;phase='loading';forceNext=false;emit();
  const descriptor={...track,loop:false,fadeSeconds:combat(program)?1.15:2.4,...(handoff?{handoff:true}:{})};
  Promise.resolve().then(()=>request===epoch&&active&&!destroyed?player.play(descriptor):null).then(result=>{
   if(request!==epoch||destroyed)return;pending=null;
   if(result===null){phase=current?'playing':'idle';emit();return;}
   if(result!==true){if(player.blocked){phase='blocked';emit();return;}reportFailure(track);current=null;currentProgram=null;phase='idle';emit();pump();return;}
   current=track;currentProgram=program;phase='playing';dwell=0;lastTime=now();skipRecording=null;remembered(track);emit();
  },error=>{if(request!==epoch||destroyed)return;pending=null;if(player.blocked||error?.name==='NotAllowedError'){phase='blocked';emit();return;}reportFailure(track,error);current=null;currentProgram=null;phase='idle';emit();pump();});
 }
 function resume(){
  const request=++epoch,track=current,program=currentProgram;pending={track,request};phase='loading';emit();
  Promise.resolve().then(()=>request===epoch&&active&&!destroyed?player.resume():null).then(result=>{
   if(request!==epoch||destroyed)return;pending=null;
   if(result===true){phase='playing';lastTime=now();if(!current){current=track;currentProgram=program;completed();}else emit();return;}
   if(result===null){phase=current?'playing':'idle';emit();return;}
   if(player.blocked){phase='blocked';emit();return;}
   // An ended performance is never restarted just because Pause was closed.
   phase='playing';completed();
  },error=>{if(request!==epoch||destroyed)return;pending=null;if(player.blocked||error?.name==='NotAllowedError'){phase='blocked';emit();return;}reportFailure(track,error);current=null;currentProgram=null;phase='idle';emit();pump();});
 }
 function pump(){
  if(destroyed||!active||mode==='ambient'||!desired?.ids.length||phase==='loading'||phase==='blocked')return;
  if(phase==='resting'&&restRemaining>0)return;
  if(phase==='playing'&&!switchNeeded()){
   const playback=player.playbackState;
   // Continuous exploration can prepare one existing native recording while
   // its predecessor is still audible. Other modes, dialogue, mute and chosen
   // performances keep their original completion semantics.
   if(mode==='continuous'&&!ducked&&desired.kind==='field'&&currentProgram?.kind==='field'&&playback?.playing&&!(Number.isFinite(player.volume)&&player.volume<=0)){
    if(!prepared||!sameProgram(prepared.program,desired)){const track=choose();prepared=track?{track,program:desired,queued:false}:null;}
    if(prepared){
     if(!prepared.queued&&typeof player.preload==='function')try{prepared.queued=player.preload(prepared.track)!==false;}catch{prepared.queued=true;}
     const lead=Math.min(3,playback.duration*.18);
     if(playback.duration>8&&Number.isFinite(playback.remaining)&&playback.remaining>0&&playback.remaining<=lead&&recording(prepared.track)!==recording(current))start(prepared.track,{handoff:true});
    }
   }
   return;
  }
  if(ducked&&!combat(desired)&&desired.kind!=='performance'&&phase!=='playing')return;
  if(phase==='unavailable')return;
  const track=prepared&&sameProgram(prepared.program,desired)&&pool().some(row=>recording(row)===recording(prepared.track))?prepared.track:choose();if(!track){phase='unavailable';current=null;currentProgram=null;pending=null;player.stop({fadeSeconds:1});emit();return;}
  start(track);
 }
 const api={
  get state(){return state();},
  unlock(){
   if(destroyed)return Promise.resolve(false);
   // Invoke the transport before awaiting: this call may be inside the only
   // user gesture Android grants to resume an interrupted audio context.
   const ready=player.unlock?.();
   return Promise.resolve(ready).then(result=>{
    if(destroyed||result===false)return false;
    if(phase==='blocked'){phase=current?'playing':'idle';if(active&&current&&!switchNeeded())resume();else pump();}
    emit();return true;
   },()=>false);
  },
  request(context={}){
   if(destroyed)return state();clock();
   fieldProgram=normalized(programFor({...context,battle:null,slot:context.scene?.song}));
   const next=normalized(programFor(context)),changed=!sameProgram(next,desired);desired=next;if(changed)prepared=null;
   if(mode==='ambient'||!next.ids.length){if(phase!=='quiet')silence();emit();return state();}
   if(changed&&phase==='unavailable')phase='idle';
   if(phase==='quiet')phase='idle';
   if(changed&&(combat(next)||next.kind==='performance')){restRemaining=0;forceNext=true;if(phase==='resting')phase='idle';}
   if(changed&&phase==='loading'){
    // A more recent scene owns the eventual start. The player's generation
    // guard cancels the obsolete download; nothing retries it on every frame.
    epoch++;pending=null;phase=current?'playing':'idle';forceNext=true;
   }
   pump();emit();return state();
  },
  sync({active:enabled=false,ducked:soft=false}={}){
   if(destroyed)return state();clock();ducked=!!soft;
   const wasActive=active;active=!!enabled;
   if(wasActive&&!active){epoch++;pending=null;if(phase==='loading')phase=current?'playing':'idle';player.pause();}
   if(!wasActive&&active){
    if(mode!=='ambient'&&desired?.ids.length&&phase==='playing'&&current&&!switchNeeded())resume();
    else pump();
   }else pump();
   emit();return state();
  },
  ended(){if(destroyed)return;completed();},
  next(){
   if(destroyed||mode==='ambient'||!desired?.ids.length)return state();clock();
   skipRecording=recording(pending?.track||current)||null;
   if(desired.kind==='performance'&&fieldProgram)desired=fieldProgram;
   epoch++;pending=null;prepared=null;current=null;currentProgram=null;restRemaining=0;dwell=0;forceNext=true;phase='idle';
   // Manual retry is bounded by another user action, never by the frame loop.
   if(!pool().length)failed.clear();counter=(counter+1)%1e9;persist();player.stop({fadeSeconds:active?1.1:0});pump();emit();return state();
  },
  setMode(value){
   if(destroyed||!MUSIC_PACING_MODES.includes(value)||value===mode)return state();clock();mode=value;prepared=null;write(storage,MUSIC_PACING_KEY,value);
   if(mode==='ambient')silence();else{if(phase==='quiet')phase='idle';if(mode==='continuous'&&phase==='resting')restRemaining=0;pump();}
   emit();return state();
  },
  destroy(){if(destroyed)return;epoch++;pending=null;prepared=null;player.stop({fadeSeconds:0});destroyed=true;active=false;current=null;phase='quiet';emit();}
 };
 emit();return api;
}
