import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedReplyScore,createNetworkAudio} from '../network-audio.js';
import {DyletskyInstrument} from '../instrument.js';

const chapel={id:'chapel-return',label:'Chapel return',motif:[0,2,1]};
const water={id:'water-return',label:'Water return',motif:[1,0,2]};
function fixture(){
 const world={state:{scene:704}},calls=[],stops=[],events=[];
 let works=[],active=true,volume=.6,ready=true;
 const instrument={playCityAnswer(parts,options){if(!ready)return null;calls.push({parts,options});const n=calls.length;return ()=>stops.push(n);}};
 const audio=createNetworkAudio({getWorld:()=>world,getView:()=>({works}),getInstrument:()=>instrument,isActive:()=>active,getVolume:()=>volume,onReply:e=>events.push(e)});
 return {world,calls,stops,events,audio,setWorks:v=>works=v,setActive:v=>active=v,setVolume:v=>volume=v,setReady:v=>ready=v};
}
test('the finite score ignores malformed notes and duplicate work IDs',()=>{
 const works=[chapel,chapel,{id:'bad',motif:[-1,3,NaN,'1']},...Array.from({length:10},(_,i)=>({id:'work-'+i,motif:[0,1,2,0]}))];
 const score=boundedReplyScore(works);
 assert.equal(new Set(score.map(p=>p.id)).size,score.length);assert.ok(score.length<=5);
 assert.deepEqual(score[0].motif,[0,2,1]);assert.ok(score.every(p=>p.motif.length<=3&&p.motif.every(n=>Number.isInteger(n)&&n>=0&&n<=2)));
});
test('unrepaired places stay quiet and ordinary updates never repeat a completed reply',()=>{
 const h=fixture();for(let i=0;i<20;i++)h.audio.sync();assert.equal(h.calls.length,0);
 h.setWorks([chapel]);assert.equal(h.audio.sync(),true);for(let i=0;i<20;i++)h.audio.sync();
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.quiet,true);assert.deepEqual(h.events[0].ids,['chapel-return']);
});
test('a completion sounds its real reply once, without an immediate entry duplicate',()=>{
 const h=fixture();assert.equal(h.audio.reply('chapel-inspected'),false);
 h.setWorks([chapel]);assert.equal(h.audio.reply('chapel-return'),true);h.audio.sync();
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.quiet,false);
 assert.equal(h.audio.reply('heat-independent'),false);assert.equal(h.calls.length,1);
});
test('pause cancels scheduled sound, and continuing the same place does not repeat it',()=>{
 const h=fixture();h.setWorks([chapel]);h.audio.sync();h.setActive(false);h.audio.sync();
 assert.deepEqual(h.stops,[1]);h.setActive(true);h.audio.sync();assert.equal(h.calls.length,1);
 h.world.state.scene=811;h.setWorks([water]);h.audio.sync();assert.equal(h.calls.length,2);
 assert.deepEqual(h.calls[1].parts,[water]);
});
test('a new place waits for speech/menu to finish before giving its quiet answer',()=>{
 const h=fixture();h.setWorks([chapel]);h.setActive(false);h.audio.sync();assert.equal(h.calls.length,0);
 h.setActive(true);h.audio.sync();assert.equal(h.calls.length,1);
 h.setActive(false);h.world.state.scene=811;h.setWorks([water]);h.audio.sync();assert.equal(h.calls.length,1);
 h.setActive(true);h.audio.sync();assert.equal(h.calls.length,2);
});
test('mute and a suspended instrument cannot consume a future audible reply',()=>{
 const h=fixture();h.setWorks([chapel]);h.setVolume(0);h.audio.sync();assert.equal(h.calls.length,0);
 h.setVolume(.25);h.setReady(false);h.audio.sync();assert.equal(h.calls.length,0);
 h.setReady(true);h.audio.sync();assert.equal(h.calls[0].options.volume,.25);
 h.setVolume(0);h.audio.sync();assert.deepEqual(h.stops,[1]);
});
test('switching journeys resets the local sound without transferring work',()=>{
 const h=fixture();h.setWorks([chapel]);h.audio.sync();h.world.state={scene:704};h.setWorks([]);h.audio.sync();
 assert.equal(h.calls.length,1);assert.deepEqual(h.stops,[1]);h.setWorks([water]);h.audio.sync();assert.deepEqual(h.calls[1].parts,[water]);
});
test('the synthesizer schedules at most fifteen finite notes and returns a cancellation handle',()=>{
 const oscillators=[],envelopes=[];
 const context={state:'running',currentTime:10,createOscillator(){const o={frequency:{value:0},starts:[],stops:[],connect(){},disconnect(){this.disconnected=true;},start(t){this.starts.push(t);},stop(t){this.stops.push(t);}};oscillators.push(o);return o;},createGain(){const g={gain:{peaks:[],setValueAtTime(){},linearRampToValueAtTime(v){this.peaks.push(v);},exponentialRampToValueAtTime(){}},connect(){},disconnect(){this.disconnected=true;}};envelopes.push(g);return g;}};
 const play=options=>DyletskyInstrument.prototype.playCityAnswer.call({context,input:{}},Array.from({length:12},()=>chapel),options);
 assert.equal(play({volume:0}),null);assert.equal(oscillators.length,0);
 const cancel=play({volume:.4});assert.equal(typeof cancel,'function');assert.equal(oscillators.length,15);
 assert.ok(oscillators.every(o=>o.starts[0]>=10&&o.stops[0]<=14.1&&o.stops[0]>o.starts[0]));
 assert.ok(envelopes.every(g=>g.gain.peaks.every(p=>p>0&&p<=.012)));
 cancel();cancel();assert.ok(oscillators.every(o=>o.stops.length===2&&o.disconnected));assert.ok(envelopes.every(g=>g.disconnected));
 context.state='suspended';assert.equal(play({volume:1}),null);assert.equal(oscillators.length,15);
});
