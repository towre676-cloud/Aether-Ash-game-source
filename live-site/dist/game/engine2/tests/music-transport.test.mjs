import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicDirector} from '../music-director.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const turn=()=>new Promise(resolve=>setTimeout(resolve,0));
class Param{
 value=1;events=[];
 setValueAtTime(value,time){this.value=value;this.events.push(['set',value,time]);}
 linearRampToValueAtTime(value,time){this.value=value;this.events.push(['ramp',value,time]);}
 cancelScheduledValues(time){this.events.push(['cancel',time]);}
}
class Node{gain=new Param();connect(){}disconnect(){this.disconnected=true;}}
class Source extends Node{
 constructor(context){super();this.context=context;context.sources.push(this);}
 start(time,offset=0,duration){this.startAt=time;this.offset=offset;this.duration=duration;this.started=true;}
 stop(time=this.context.currentTime){this.stopAt=time;if(time<=this.context.currentTime)queueMicrotask(()=>this.end());}
 end(){if(this.ended)return;this.ended=true;this.onended?.();}
}
class Context{
 currentTime=0;state='running';destination=new Node();sources=[];
 createGain(){return new Node();}createAnalyser(){return new Node();}createMediaElementSource(){return new Node();}
 createBufferSource(){return new Source(this);}async resume(){}async decodeAudioData(){return {duration:20};}
 advance(seconds){this.currentTime+=seconds;for(const source of this.sources){const natural=source.loop?Infinity:source.startAt+(source.duration??20-source.offset);if(Math.min(natural,source.stopAt??Infinity)<=this.currentTime)source.end();}}
}
class Media extends EventTarget{
 static plans=new Map();readyState=0;currentTime=0;duration=120;volume=1;paused=true;playbackRate=1;playCalls=0;src='';
 load(){this.plan=Media.plans.get(this.src)||{};this.duration=this.plan.duration??120;this.readyState=this.plan.metadata?0:1;}
 async play(){this.playCalls++;if(this.plan?.play)await this.plan.play.promise;if(this.plan?.failure)throw Error(this.plan.failure);this.paused=false;}
 pause(){this.paused=true;}
 emit(type){if(type==='loadedmetadata')this.readyState=1;this.dispatchEvent(new Event(type));}
}
const downloads=new Map();
globalThis.Audio=Media;globalThis.window={AudioContext:Context};
globalThis.fetch=async url=>{const plan=downloads.get(url);if(plan?.pending)await plan.pending.promise;return {ok:!plan?.failure,arrayBuffer:async()=>new ArrayBuffer(4)};};
const {Soundtrack}=await import('../../soundtrack.js');
const {AdaptiveSoundtrack}=await import('../../adaptive-soundtrack.js');
const media=(id,extra={})=>({id,audio:id,...extra});
const decoded=(id,extra={})=>media(id,{rpg:true,loop:false,...extra});
function player(t,Type=AdaptiveSoundtrack){
 Media.plans.clear();downloads.clear();const starts=[],errors=[],ends=[];
 const audio=new Type({onTrack:track=>starts.push(track.id),onError:error=>errors.push(error),onEnd:()=>ends.push(audio.track.id)});
 t.after(()=>audio.stop());return {audio,starts,errors,ends};
}

test('media segments have measured gain, one end, and no implicit replay after end',async t=>{
 const {audio,starts,ends}=player(t,Soundtrack);audio.setVolume(.4);
 assert.equal(await audio.play(media('movement',{start_s:12,end_s:24,gain:.3,fadeSeconds:1.8})),true);
 const deck=audio.audios[audio.deck];assert.equal(deck.currentTime,12);assert.equal(audio.gains[audio.deck].gain.value,.3);assert.equal(audio.master.gain.value,.4);
 deck.currentTime=17;audio.pause();assert.equal(await audio.resume(),true);assert.equal(deck.currentTime,17);assert.deepEqual(starts,['movement']);
 deck.currentTime=24;deck.emit('timeupdate');deck.emit('ended');assert.deepEqual(ends,['movement']);
 const calls=deck.playCalls;assert.equal(await audio.resume(),false);assert.equal(deck.playCalls,calls);
 audio.seek(.25);assert.equal(await audio.resume(),true);assert.equal(deck.currentTime,15);
});

test('onTrack follows actual playback and a failed candidate preserves the current recording',async t=>{
 const {audio,starts,errors}=player(t,Soundtrack);await audio.play(media('good'));
 const prior=audio.audios[audio.deck];Media.plans.set('blocked',{play:deferred(),failure:'play denied'});
 const attempt=audio.play(media('blocked'));await turn();assert.deepEqual(starts,['good']);assert.equal(prior.paused,false);
 Media.plans.get('blocked').play.resolve();assert.equal(await attempt,false);assert.deepEqual(starts,['good']);assert.equal(audio.track.id,'good');assert.equal(prior.paused,false);assert.deepEqual(errors,['play denied']);
});

test('metadata cancellation and a late play rejection are cancellations, not failed assets',async t=>{
 const {audio,starts,errors}=player(t,Soundtrack);Media.plans.set('slow',{metadata:true});
 const slow=audio.play(media('slow'));await turn();audio.stop();assert.equal(await slow,null);assert.deepEqual(starts,[]);
 const gate=deferred();Media.plans.set('late',{play:gate});const late=audio.play(media('late'));await turn();
 assert.equal(await audio.play(media('winner')),true);gate.reject(Error('obsolete failure'));assert.equal(await late,null);
 assert.deepEqual(starts,['winner']);assert.deepEqual(errors,[]);assert.equal(audio.audios[audio.deck].paused,false);
});

test('stopping with a fade cannot pause a later recording that reuses the same deck',async t=>{
 const {audio}=player(t,Soundtrack);await audio.play(media('first',{fadeSeconds:0}));const originalDeck=audio.deck;
 audio.stop({fadeSeconds:.01});await audio.play(media('second',{fadeSeconds:0}));await audio.play(media('third',{fadeSeconds:0}));
 assert.equal(audio.deck,originalDeck);await new Promise(resolve=>setTimeout(resolve,45));
 assert.equal(audio.track.id,'third');assert.equal(audio.playing,true);assert.equal(audio.audios[audio.deck].paused,false);
 audio.stop({fadeSeconds:.01});await new Promise(resolve=>setTimeout(resolve,45));assert.ok(audio.audios.every(deck=>deck.paused));assert.equal(await audio.resume(),false);
});

test('decoded finite segments preserve their exact offset, gain and remaining duration',async t=>{
 const {audio,starts,ends}=player(t);assert.equal(await audio.play(decoded('cut',{start_s:2,end_s:9,gain:.24,fadeSeconds:1.8})),true);
 assert.equal(audio.adaptive.voice.source.offset,2);assert.equal(audio.adaptive.voice.source.duration,7);assert.equal(audio.adaptive.voice.gain.gain.value,.24);
 audio.context.advance(3);audio.pause();assert.equal(audio.adaptive.offset,5);assert.equal(audio.voices.size,0);
 assert.equal(await audio.resume(),true);const resumed=audio.adaptive.voice;assert.equal(resumed.source.offset,5);assert.equal(resumed.source.duration,4);assert.equal(resumed.gain.gain.value,.24);assert.deepEqual(starts,['cut']);
 audio.context.advance(4);resumed.source.onended();assert.deepEqual(ends,['cut']);assert.equal(await audio.resume(),false);assert.equal(audio.voices.size,0);
});

test('legacy decoded loops keep their nonzero loop start through pause and resume',async t=>{
 const {audio,ends}=player(t);await audio.play(decoded('loop',{loop:true,start_s:1,end_s:8,loopStart:2,loopEnd:6}));
 audio.context.advance(9);audio.pause();assert.equal(audio.adaptive.offset,2);await audio.resume();
 assert.equal(audio.adaptive.voice.source.loopStart,2);assert.equal(audio.adaptive.voice.source.loopEnd,6);assert.equal(audio.adaptive.voice.source.offset,2);assert.deepEqual(ends,[]);
});

test('a stopped or superseded decode never starts or reports a false asset failure',async t=>{
 const {audio,starts,errors}=player(t);const gate=deferred();downloads.set('slow',{pending:gate});
 const attempt=audio.play(decoded('slow'));await turn();audio.stop({fadeSeconds:.1});gate.resolve();assert.equal(await attempt,null);assert.equal(audio.voices.size,0);assert.deepEqual(starts,[]);
 downloads.set('missing',{failure:true});assert.equal(await audio.play(decoded('missing')),false);assert.deepEqual(starts,[]);assert.equal(errors.length,1);
 assert.equal(await audio.play(decoded('recovered')),true);assert.deepEqual(starts,['recovered']);
});

test('media and decoded starts crossfade only after the replacement can play',async t=>{
 const {audio,ends}=player(t);await audio.play(decoded('old-loop',{loop:true,gain:.2}));const old=audio.adaptive.voice;
 Media.plans.set('media',{metadata:true});const incoming=audio.play(media('media',{gain:.4,fadeSeconds:.5}));await turn();assert.equal(old.retired,false);assert.equal(audio.track.id,'old-loop');
 audio.audios[1-audio.deck].emit('loadedmetadata');assert.equal(await incoming,true);assert.equal(old.retired,true);assert.equal(old.stopAt,.5);assert.equal(audio.adaptive,null);
 const active=audio.audios[audio.deck],gate=deferred();downloads.set('new-buffer',{pending:gate});const final=audio.play(decoded('new-buffer',{gain:.3,fadeSeconds:.5}));await turn();assert.equal(active.paused,false);
 gate.resolve();assert.equal(await final,true);assert.equal(audio.track.id,'new-buffer');assert.equal(audio.adaptive.voice.gain.gain.value,.3);audio.context.advance(.5);assert.deepEqual(ends,[]);
});

test('stop fades every decoded lead and cue, with no stale end callback on a later song',async t=>{
 const {audio,ends}=player(t);await audio.play(decoded('lead'));await audio.cue(decoded('stinger',{gain:.2}));const old=[...audio.voices];assert.equal(old.length,2);
 audio.stop({fadeSeconds:.25});assert.ok(old.every(voice=>voice.stopAt===.25));assert.equal(audio.track,null);
 await audio.play(decoded('next',{fadeSeconds:0}));audio.context.advance(.3);assert.equal(audio.voices.size,1);assert.equal(audio.track.id,'next');assert.equal(audio.playing,true);assert.deepEqual(ends,[]);
});

test('master changes ramp without altering per-recording gain',async t=>{
 const {audio}=player(t);await audio.play(decoded('quiet',{gain:.2}));audio.setVolume(.31);
 assert.deepEqual(audio.master.gain.events.at(-1),['ramp',.31,.06]);assert.equal(audio.adaptive.voice.gain.gain.value,.2);
});

test('HTML audio fallback honors measured gain and paused position',async t=>{
 const saved=globalThis.window;globalThis.window={};t.after(()=>globalThis.window=saved);
 const {audio}=player(t,Soundtrack);audio.setVolume(.4);await audio.play(media('fallback',{gain:.25,start_s:10,end_s:20}));
 const deck=audio.audios[audio.deck];assert.equal(deck.volume,.1);deck.currentTime=15;audio.pause();await audio.resume();assert.equal(deck.currentTime,15);assert.equal(deck.volume,.1);
 audio.setVolume(.2);assert.equal(deck.volume,.05);deck.currentTime=20;deck.emit('ended');assert.equal(await audio.resume(),false);
});

test('playback diagnostics require a running context and real source while gesture unlock preserves the recording',async t=>{
 for(const Type of[Soundtrack,AdaptiveSoundtrack]){
  const {audio,starts}=player(t,Type),track=Type===Soundtrack?media('gesture-media'):decoded('gesture-buffer');await audio.play(track);
  assert.equal(audio.playbackState.playing,true);const voice=audio.adaptive?.voice,deck=audio.deck;audio.context.state='suspended';assert.equal(audio.playbackState.playing,false);assert.equal(audio.playbackState.contextState,'suspended');
  let synchronous=false;audio.context.resume=()=>{synchronous=true;audio.context.state='running';return Promise.resolve();};const result=audio.unlock();assert.equal(synchronous,true,'AudioContext.resume occurs inside the original gesture');assert.equal(await result,true);assert.equal(audio.playbackState.playing,true);assert.equal(audio.adaptive?.voice,voice);assert.equal(audio.deck,deck);assert.equal(starts.length,1);
  audio.pause();assert.equal(audio.playbackState.playing,false);
 }
});

test('autoplay denials are recoverable permission errors instead of broken recordings',async t=>{
 const {audio}=player(t,Soundtrack);audio.setup();const denied=Object.assign(Error('Use a gesture'),{name:'NotAllowedError'});audio.context.resume=()=>Promise.reject(denied);
 assert.equal(await audio.play(media('denied')),false);assert.equal(audio.blocked,true);assert.equal(audio.lastError.name,'NotAllowedError');assert.equal(audio.playbackState.playing,false);
 audio.context.resume=()=>Promise.resolve();assert.equal(await audio.unlock(),true);assert.equal(audio.blocked,false);assert.equal(await audio.play(media('denied')),true);assert.equal(audio.playbackState.playing,true);
});

function continuityDirector(audio,tracks){
 const previousEnd=audio.options.onEnd;
 const director=createMusicDirector({player:audio,library:new Map(tracks.map(track=>[track.id,track])),programFor:({battle})=>({key:battle?'battle':'field',kind:battle?'battle':'field',ids:battle?[tracks.at(-1).id]:tracks.map(t=>t.id),rest:[20,20]}),now:()=>audio.context?.currentTime||0});
 audio.options.onEnd=()=>{previousEnd?.();director.ended();};return director;
}

test('native media primes an idle deck and keeps the predecessor audible while a handoff waits for metadata',async t=>{
 const {audio,starts,ends}=player(t,Soundtrack),tracks=[media('seam-a',{end_s:20}),media('seam-b',{end_s:20})],director=continuityDirector(audio,tracks);t.after(()=>director.destroy());
 Media.plans.set('seam-b',{metadata:true});director.request({});director.sync({active:true});await turn();assert.deepEqual(starts,['seam-a']);const old=audio.audios[audio.deck],prepared=audio.audios[1-audio.deck];
 old.currentTime=5;director.sync({active:true});assert.equal(prepared.src,'seam-b');assert.equal(prepared.paused,true);assert.deepEqual(starts,['seam-a'],'preload is not an audible selection');
 old.currentTime=17;audio.context.advance(17);director.sync({active:true});await turn();assert.equal(director.state.phase,'loading');assert.equal(old.paused,false);assert.equal(audio.playbackState.trackId,'seam-a');
 old.currentTime=19;audio.context.advance(2);prepared.emit('loadedmetadata');await turn();assert.deepEqual(starts,['seam-a','seam-b']);assert.equal(prepared.paused,false);assert.equal(old.paused,false,'both existing decks overlap during the fade');assert.equal(audio.playbackState.playing,true);
 const oldRamp=audio.gains[1-audio.deck].gain.events.filter(e=>e[0]==='ramp').at(-1);assert.equal(oldRamp[2],20,'handoff fade fits the predecessor’s remaining second');old.emit('ended');assert.deepEqual(ends,[],'the retired deck cannot end the replacement');
});

test('idle-deck preloading never replaces a source still owned by the preceding crossfade',async t=>{
 const {audio,starts}=player(t,Soundtrack);await audio.play(media('old',{end_s:60}));await audio.play(media('current',{end_s:60,fadeSeconds:2.4}));const retired=audio.audios[1-audio.deck];
 assert.equal(retired.paused,false);assert.equal(audio.preload(media('future')),false);assert.equal(retired.src,'old');retired.pause();assert.equal(audio.preload(media('future')),true);assert.equal(retired.src,'future');assert.equal(retired.paused,true);assert.deepEqual(starts,['old','current']);
});

test('decoded continuous handoff reuses one context, preloads without a voice and overlaps real native sources',async t=>{
 const {audio,starts,ends}=player(t),tracks=[decoded('buffer-a',{end_s:20}),decoded('buffer-b',{end_s:20})],director=continuityDirector(audio,tracks);t.after(()=>director.destroy());director.request({});director.sync({active:true});await turn();
 const context=audio.context,first=audio.adaptive.voice;audio.context.advance(5);director.sync({active:true});await audio.preloadJob?.promise;assert.ok(audio.buffers.has('buffer-b'));assert.equal(context.sources.length,1);assert.deepEqual(starts,['buffer-a']);
 context.advance(12);director.sync({active:true});await turn();assert.equal(audio.context,context);assert.equal(context.sources.length,2);assert.equal(audio.voices.size,2);assert.equal(first.retired,true);assert.equal(audio.adaptive.voice.source.startAt,17);assert.ok(first.source.stopAt>17&&first.source.stopAt<=20);assert.equal(audio.playbackState.playing,true);assert.deepEqual(starts,['buffer-a','buffer-b']);assert.deepEqual(ends,[]);
});

test('a pending decoded preload cannot start music after pause or supersede a newer battle request',async t=>{
 const {audio,starts}=player(t),tracks=[decoded('guard-a',{end_s:20}),decoded('guard-b',{end_s:20}),decoded('battle-c',{end_s:20})],director=continuityDirector(audio,tracks);t.after(()=>director.destroy());const load=deferred();downloads.set('guard-b',{pending:load});director.request({});director.sync({active:true});await turn();
 audio.context.advance(5);director.sync({active:true});assert.equal(audio.preloadJob.url,'guard-b');director.sync({active:false});load.resolve();await audio.preloadJob?.promise;assert.equal(audio.voices.size,0);assert.deepEqual(starts,['guard-a']);assert.equal(director.state.phase,'paused');
 director.request({battle:{}});director.sync({active:true});await turn();assert.deepEqual(starts,['guard-a','battle-c']);assert.equal(audio.playbackState.trackId,'battle-c');assert.equal(audio.playbackState.playing,true);
});
