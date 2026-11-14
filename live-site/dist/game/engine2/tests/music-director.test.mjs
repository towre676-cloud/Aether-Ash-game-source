import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicDirector,MUSIC_HISTORY_KEY,MUSIC_PACING_KEY} from '../music-director.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const tracks=Array.from({length:8},(_,i)=>({id:String.fromCharCode(97+i),title:'Piece '+(i+1),audio:'/'+i+'.ogg',recordingKey:'recording-'+i,family:'family-'+(i%4),start_s:3,end_s:63,gain:.4}));
function harness({values={},rows=tracks,programFor,playResults=[]}={}){
 let seconds=0;const stored=new Map(Object.entries(values)),calls={play:[],resume:0,pause:0,stop:[],errors:[]};
 const storage={getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)};
 const player={play(track){calls.play.push(track);return playResults.length?playResults.shift():true;},resume(){calls.resume++;return true;},pause(){calls.pause++;},stop(options){calls.stop.push(options);}};
 const programs={home:{key:'home',label:'Home',kind:'field',ids:['a','b','c','d','e','f','g','h'],rest:[20,20]},far:{key:'far',label:'Distant shore',kind:'field',ids:['e','f','g','h'],rest:[30,30]},combat:{key:'battle',label:'Battle',kind:'battle',ids:['g','h'],rest:[0,0]}};
 const selector=programFor||(({scene={},battle,slot})=>battle?programs.combat:slot?.startsWith?.('performance:')?{key:slot,label:'A chosen performance',kind:'performance',ids:[slot.slice(12)],rest:[0,0]}:slot===0?{key:'silent',ids:[]}:programs[scene.key]||programs.home);
 const director=createMusicDirector({player,library:new Map(rows.map(track=>[track.id,track])),programFor:selector,storage,now:()=>seconds,onError:message=>calls.errors.push(message)});
 return {director,player,calls,stored,programs,advance(value){seconds+=value;},async begin(scene={key:'home',song:1}){director.request({scene,slot:scene.song});director.sync({active:true});await flush();}};
}

test('only audible starts enter history, and finite descriptors retain segments and measured gain',async()=>{
 const load=deferred(),h=harness({playResults:[load.promise]});await h.begin();
 assert.equal(h.director.state.phase,'loading');assert.deepEqual(h.director.state.history,[]);
 assert.equal(h.calls.play[0].loop,false);assert.equal(h.calls.play[0].gain,.4);assert.equal(h.calls.play[0].start_s,3);assert.equal(h.calls.play[0].end_s,63);
 load.resolve(true);await flush();assert.equal(h.director.state.phase,'playing');assert.equal(h.director.state.title,'Piece 1');assert.deepEqual(h.director.state.history,['a']);
});

test('finite field performances alternate with real quiet intervals and remembered variety',async()=>{
 const h=harness({values:{[MUSIC_PACING_KEY]:'spacious'}});await h.begin();
 for(let i=0;i<7;i++){
  h.director.ended();assert.equal(h.director.state.phase,'resting');assert.equal(h.director.state.restRemaining,20);
  h.advance(19);h.director.sync({active:true});assert.equal(h.calls.play.length,i+1);
  h.advance(1);h.director.sync({active:true});await flush();
 }
 const ids=h.calls.play.map(track=>track.id);assert.equal(new Set(ids).size,8);
 for(let i=1;i<ids.length;i++)assert.notEqual(h.calls.play[i].family,h.calls.play[i-1].family);
 const reload=harness({values:Object.fromEntries(h.stored)});await reload.begin();
 assert.notEqual(reload.calls.play[0].id,ids.at(-1));assert.equal(reload.director.state.history.length,9);
});

test('movement aliases are one recording and cannot evade the recent-history exclusion',async()=>{
 const alias={...tracks[0],id:'movement',title:'Movement of Piece 1'};
 const h=harness({rows:[...tracks,alias],programFor:()=>({key:'alias',kind:'field',ids:['a','movement','b','c'],rest:[0,0]})});await h.begin();
 h.director.ended();await flush();assert.equal(h.calls.play[1].id,'b');
 assert.notEqual(h.calls.play[1].recordingKey,h.calls.play[0].recordingKey);
});

test('compatible rooms keep the current piece; a different district waits for a meaningful phrase',async()=>{
 const h=harness();await h.begin();
 for(let i=0;i<10;i++)h.director.request({scene:{key:'home',song:2},slot:2});
 assert.equal(h.calls.play.length,1);
 h.director.request({scene:{key:'far',song:3},slot:3});await flush();assert.equal(h.calls.play.length,1);
 h.advance(23);h.director.sync({active:true});await flush();assert.equal(h.calls.play.length,1);
 h.advance(1);h.director.sync({active:true});await flush();assert.equal(h.calls.play.length,2);assert.ok(h.programs.far.ids.includes(h.director.state.trackId));assert.notEqual(h.calls.play[1].family,h.calls.play[0].family);
});

test('download time does not count as listening time for a district transition',async()=>{
 const load=deferred(),h=harness({playResults:[load.promise]});await h.begin();h.advance(60);load.resolve(true);await flush();
 h.director.request({scene:{key:'far',song:3},slot:3});await flush();assert.equal(h.calls.play.length,1);
 h.advance(24);h.director.sync({active:true});await flush();assert.equal(h.calls.play.length,2);
});

test('pause resumes the same offset through the transport without replaying or recounting the piece',async()=>{
 const h=harness();await h.begin();h.advance(8);h.director.sync({active:false});assert.equal(h.calls.pause,1);assert.equal(h.director.state.phase,'paused');
 h.advance(900);h.director.sync({active:false});h.director.sync({active:true});await flush();
 assert.equal(h.calls.resume,1);assert.equal(h.calls.play.length,1);assert.deepEqual(h.director.state.history,['a']);
});

test('quiet intervals freeze during pause and do not resume an ended recording',async()=>{
 const h=harness({values:{[MUSIC_PACING_KEY]:'spacious'}});await h.begin();h.director.ended();h.advance(6);h.director.sync({active:false});assert.equal(h.director.state.restRemaining,14);
 h.advance(900);h.director.sync({active:true});await flush();assert.equal(h.director.state.restRemaining,14);assert.equal(h.calls.resume,0);assert.equal(h.calls.play.length,1);
 h.advance(14);h.director.sync({active:true});await flush();assert.equal(h.calls.play.length,2);
});

test('Next piece in Pause queues one fresh selection for the return to play',async()=>{
 const h=harness();await h.begin();h.director.sync({active:false});h.director.next();h.director.next();await flush();
 assert.equal(h.calls.play.length,1);assert.deepEqual(h.director.state.history,['a']);
 h.director.sync({active:true});await flush();assert.equal(h.calls.play.length,2);assert.notEqual(h.calls.play[1].id,'a');assert.equal(h.calls.resume,0);
});

test('Spacious, Continuous and Ambience only persist and change score pacing without resetting history',async()=>{
 const h=harness({values:{[MUSIC_PACING_KEY]:'spacious'}});await h.begin();h.director.ended();h.director.setMode('continuous');await flush();assert.equal(h.calls.play.length,2);assert.equal(h.stored.get(MUSIC_PACING_KEY),'continuous');
 h.director.setMode('ambient');assert.equal(h.director.state.phase,'quiet');assert.equal(h.calls.stop.at(-1).fadeSeconds,1.4);
 h.director.next();h.advance(100);h.director.sync({active:true});await flush();assert.equal(h.calls.play.length,2);
 h.director.setMode('spacious');await flush();assert.equal(h.calls.play.length,3);assert.equal(h.director.state.history.length,3);
 h.director.setMode('invalid');assert.equal(h.director.state.mode,'spacious');
});

test('combat cuts through a field rest and returning to the field replaces combat promptly',async()=>{
 const h=harness({values:{[MUSIC_PACING_KEY]:'spacious'}});await h.begin();h.director.ended();
 h.director.request({scene:{key:'home',song:1},battle:{enemies:[{}]},slot:'performance:action_battle_0'});await flush();
 assert.equal(h.director.state.kind,'battle');assert.equal(h.calls.play.at(-1).id,'g');assert.equal(h.calls.play.at(-1).fadeSeconds,1.15);
 h.director.request({scene:{key:'home',song:1},slot:1});await flush();assert.equal(h.director.state.kind,'field');assert.equal(h.calls.play.length,3);
});

test('selected performances play once, then return to contextual music with a quiet interval',async()=>{
 const h=harness({values:{[MUSIC_PACING_KEY]:'spacious'}});await h.begin();h.director.request({scene:{key:'home',song:1},slot:'performance:h'});await flush();
 assert.equal(h.director.state.trackId,'h');assert.equal(h.director.state.kind,'performance');h.director.ended();
 assert.equal(h.director.state.kind,'field');assert.equal(h.director.state.phase,'resting');h.advance(20);h.director.sync({active:true});await flush();assert.notEqual(h.director.state.trackId,'h');
});

test('Next exits a selected performance instead of restarting that same selection',async()=>{
 const h=harness();await h.begin();h.director.request({scene:{key:'home',song:1},slot:'performance:h'});await flush();h.director.next();await flush();
 assert.equal(h.director.state.kind,'field');assert.notEqual(h.director.state.trackId,'h');
});

test('dialogue can finish a piece but delays the next field entrance until the conversation clears',async()=>{
 const h=harness();await h.begin();h.director.sync({active:true,ducked:true});h.director.ended();h.advance(30);h.director.sync({active:true,ducked:true});await flush();assert.equal(h.calls.play.length,1);
 h.director.sync({active:true,ducked:false});await flush();assert.equal(h.calls.play.length,2);
});

test('pausing during a download invalidates its late result and never records an unheard start',async()=>{
 const load=deferred(),h=harness({playResults:[load.promise]});await h.begin();h.director.sync({active:false});load.resolve(true);await flush();
 assert.equal(h.director.state.phase,'paused');assert.deepEqual(h.director.state.history,[]);
 h.director.sync({active:true});await flush();assert.equal(h.calls.play.length,2);assert.deepEqual(h.director.state.history,['a']);
});

test('a newer context owns pending playback and ignores an obsolete load failure',async()=>{
 const load=deferred(),h=harness({playResults:[load.promise]});await h.begin();h.director.request({scene:{key:'far',song:3},slot:3});await flush();
 assert.equal(h.director.state.trackId,'e');load.reject(Error('obsolete load'));await flush();assert.equal(h.director.state.trackId,'e');assert.equal(h.calls.errors.length,0);assert.deepEqual(h.director.state.history,['e']);
});

test('several story and battle requests in one turn start only the final scene program',async()=>{
 const h=harness();h.director.sync({active:true});
 h.director.request({scene:{key:'home',song:1},slot:'performance:h'});
 h.director.request({scene:{key:'home',song:1},battle:{enemies:[{}]},slot:2});
 h.director.request({scene:{key:'far',song:3},slot:3});await flush();
 assert.equal(h.calls.play.length,1);assert.equal(h.director.state.programKey,'far');assert.equal(h.director.state.kind,'field');
});

test('an old piece ending during replacement loading is not resurrected after cancellation',async()=>{
 const load=deferred(),h=harness({playResults:[true,load.promise]});await h.begin();h.advance(25);h.director.request({scene:{key:'far',song:3},slot:3});await flush();assert.equal(h.director.state.phase,'loading');
 h.director.ended();h.director.sync({active:false});load.resolve(null);await flush();h.director.request({scene:{key:'home',song:1},slot:1});h.director.sync({active:true});await flush();
 assert.equal(h.calls.resume,0);assert.equal(h.calls.play.length,3);assert.notEqual(h.director.state.trackId,'a');assert.equal(h.director.state.phase,'playing');
});

test('unavailable recordings are tried once each, then stop cleanly without a frame-by-frame retry storm',async()=>{
 const h=harness({playResults:Array(8).fill(false)});await h.begin();assert.equal(h.calls.play.length,8);assert.equal(h.calls.errors.length,8);assert.equal(h.director.state.phase,'unavailable');assert.equal(h.calls.stop.at(-1).fadeSeconds,1);assert.deepEqual(h.director.state.history,[]);
 for(let i=0;i<60;i++)h.director.sync({active:true});await flush();assert.equal(h.calls.play.length,8);
 h.director.next();await flush();assert.equal(h.calls.play.length,9);assert.equal(h.director.state.phase,'playing');
});

test('an ended transport on resume advances to quiet rather than restarting its recording',async()=>{
 const h=harness({values:{[MUSIC_PACING_KEY]:'spacious'}});await h.begin();h.director.sync({active:false});h.player.resume=()=>false;h.director.sync({active:true});await flush();
 assert.equal(h.calls.play.length,1);assert.equal(h.director.state.phase,'resting');assert.equal(h.director.state.trackId,null);
});

test('invalid or unavailable preference storage cannot prevent music, and explicit silence stays silent',async()=>{
 const h=harness({values:{[MUSIC_HISTORY_KEY]:'broken JSON',[MUSIC_PACING_KEY]:'not-a-mode'}});await h.begin();assert.equal(h.director.state.mode,'continuous');
 h.director.request({scene:{key:'home',song:0},slot:0});h.director.sync({active:true});await flush();assert.equal(h.director.state.phase,'quiet');assert.equal(h.calls.play.length,1);
 const other=createMusicDirector({player:h.player,library:new Map(tracks.map(track=>[track.id,track])),programFor:()=>h.programs.home,storage:{getItem(){throw Error('denied');},setItem(){throw Error('denied');}}});other.request({});other.sync({active:true});await flush();assert.equal(other.state.phase,'playing');other.destroy();
});

test('fresh journeys keep finite music flowing without a silent default interval',async()=>{
 const h=harness();await h.begin();assert.equal(h.director.state.mode,'continuous');
 for(let i=0;i<5;i++){h.director.ended();await flush();assert.equal(h.director.state.phase,'playing');assert.equal(h.director.state.restRemaining,0);}
 assert.equal(h.calls.play.length,6);assert.equal(new Set(h.calls.play.map(t=>t.id)).size,6);
});

test('one denied playback waits for a gesture instead of marking every recording unavailable',async()=>{
 const h=harness();let allowed=false;h.player.unlock=()=>{allowed=true;h.player.blocked=false;return true;};h.player.play=track=>{h.calls.play.push(track);h.player.blocked=!allowed;return allowed;};
 await h.begin();assert.equal(h.director.state.phase,'blocked');assert.equal(h.calls.play.length,1);assert.equal(h.calls.errors.length,0);assert.deepEqual(h.director.state.history,[]);
 for(let i=0;i<100;i++)h.director.sync({active:true});await flush();assert.equal(h.calls.play.length,1);
 await h.director.unlock();await flush();assert.equal(h.calls.play.length,2);assert.equal(h.calls.play[1].id,h.calls.play[0].id);assert.equal(h.director.state.phase,'playing');assert.deepEqual(h.director.state.history,['a']);
});

test('gesture recovery preserves an interrupted paused recording and honors a later ambience-only choice',async()=>{
 const h=harness();await h.begin();h.director.sync({active:false});let permitted=false;
 h.player.resume=()=>{h.calls.resume++;h.player.blocked=!permitted;return permitted;};h.player.unlock=()=>{permitted=true;h.player.blocked=false;return true;};
 h.director.sync({active:true});await flush();assert.equal(h.director.state.phase,'blocked');
 await h.director.unlock();await flush();assert.equal(h.director.state.phase,'playing');assert.equal(h.calls.play.length,1);assert.equal(h.calls.resume,2);assert.deepEqual(h.director.state.history,['a']);
 h.director.setMode('ambient');await h.director.unlock();h.director.sync({active:true});await flush();assert.equal(h.calls.play.length,1);assert.equal(h.director.state.phase,'quiet');
});

test('native remaining time owns a single early field handoff, while pause, mute, speech and explicit modes keep ownership',async()=>{
 for(const reason of['continuous','pause','mute','speech','spacious','ambient','performance','suspended']){
  const h=harness();await h.begin();let prepared=0;h.player.preload=()=>{prepared++;return true;};h.player.volume=reason==='mute'?0:.52;
  if(reason==='spacious'||reason==='ambient')h.director.setMode(reason);if(reason==='performance'){h.director.request({scene:{key:'home',song:1},slot:'performance:h'});await flush();}
  const before=h.calls.play.length;h.player.playbackState={playing:reason!=='suspended',duration:60,remaining:2.5};h.director.sync({active:reason!=='pause',ducked:reason==='speech'});await flush();
  assert.equal(prepared,reason==='continuous'?1:0,reason+' preload');assert.equal(h.calls.play.length,before+(reason==='continuous'?1:0),reason+' handoff');if(reason==='continuous'){assert.equal(h.calls.play.at(-1).handoff,true);assert.equal(h.calls.play.at(-1).id,'b');}
 }
});

test('uses the bundled pool only after the orchestral pool fails',async()=>{
 const programFor=()=>({key:'interior',kind:'field',ids:['a','b'],fallbackIds:['c','d']});
 const offline=harness({programFor,playResults:[false,false,true]});
 await offline.begin();
 assert.deepEqual(offline.calls.play.map(track=>track.id),['a','b','c']);
 assert.equal(offline.director.state.phase,'playing');
 assert.deepEqual(offline.director.state.history,['c']);
 const connected=harness({programFor});
 await connected.begin();
 connected.director.ended();await flush();
 connected.director.ended();await flush();
 assert.deepEqual(connected.calls.play.map(track=>track.id),['a','b','a']);
});
