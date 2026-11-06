import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ECOLOGY_SPECIES,MATERIALS,SIGNALS,AUDIO_CUES,CueArbiter,resolveCue,musicState,encounterAcousticState} from '../src/acoustic-orchestrator.js';
import {AA_AcousticDirectorV3} from '../src/game-bridge-v3.js';
import {BIOME_IDS} from '../src/acoustic-world.js';
const assets=new Set(JSON.parse(fs.readFileSync(new URL('../manifest.json',import.meta.url))).assets.map(a=>a.id));
const fake=()=>({ctx:null,index:new Map([...assets].map(x=>[x,{id:x}])),muted:false,subtitles:true,volume:{},init:async()=>{},unlock:async()=>{},setListener:()=>{},setMuted(v){this.muted=v},setVolume(k,v){this.volume[k]=v},ambience:async()=>{},play:async(id)=>{if(!assets.has(id))return null;return {source:{addEventListener:()=>{},stop:()=>{}}}},footstep:async()=>{},creature:async()=>{},combat:async()=>{},ui:async()=>{},caption:()=>{},dispose:()=>{},serialize:()=>({}),restore:()=>{}});
test('v3: every authored semantic cue is a real asset',()=>{
 assert.ok(assets.size>=384);
 for(const biome of BIOME_IDS)for(const weather of ['rain','wind','night'])assert.ok(assets.has(resolveCue('weather:changed',{biome,weather}).id));
 for(const species of ECOLOGY_SPECIES)for(const action of ['graze','patrol','shield_form','withdraw'])assert.ok(assets.has(resolveCue('ecology:behavior',{species,action}).id));
 for(const material of MATERIALS)for(const action of ['equip','impact','resonate','fracture'])assert.ok(assets.has(resolveCue('material:state',{material,action}).id));
 for(const signal of SIGNALS)assert.ok(assets.has(resolveCue('timeline:echo',{signal}).id));
 assert.equal(Object.values(AUDIO_CUES).reduce((a,b)=>a+b),140);
});
test('v3: malformed and unauthored cue data is never accepted',()=>{
 assert.equal(resolveCue('material:state',{material:'uranium',action:'fracture'}),null);
 assert.equal(resolveCue('weather:changed',{biome:'nowhere',weather:'rain'}),null);
 assert.equal(resolveCue('ecology:behavior',{species:'unknown',action:'graze'}),null);
 assert.equal(resolveCue('dialogue:line',{lineId:'unknown'}),null);
});
test('v3 arbiter preserves important warnings over low-priority ambience',()=>{
 const q=new CueArbiter({maxVoices:2});
 const a=q.request({id:'birds',priority:1},1000);const b=q.request({id:'rain',priority:2},1000);
 assert.equal(a.accepted,true);assert.equal(b.accepted,true);
 const c=q.request({id:'boss-warning',priority:10},1100);
 assert.equal(c.accepted,true);assert.equal(c.displaced[0].id,'birds');
 assert.equal(q.request({id:'grass',priority:1},1150).reason,'polyphony');
 assert.equal(q.release(a.token),false);
 assert.equal(q.release(c.token),true);
});
test('v3 arbiter uses real timestamps including zero and protects cooldown',()=>{
 const q=new CueArbiter({maxVoices:1,now:()=>0});
 const first=q.request({id:'footstep',priority:3,cooldownMs:200},0);
 assert.equal(first.accepted,true);q.release(first.token);
 assert.equal(q.request({id:'footstep',priority:3,cooldownMs:200},100).reason,'cooldown');
 assert.equal(q.request({id:'footstep',priority:3,cooldownMs:200},201).accepted,true);
});
test('v3 music and material resonance are clamped deterministic game data',()=>{
 assert.ok(musicState({boss:1,threat:1}).danger>musicState({}).danger);
 assert.ok(Object.values(musicState({threat:999,velocity:999,questPulse:9,boss:9})).every(x=>x>=0&&x<=1));
 assert.ok(encounterAcousticState({material:'clay',attackFrequency:196}).alignment>encounterAcousticState({material:'clay',attackFrequency:279}).alignment);
 assert.equal(encounterAcousticState({material:'unknown'}).known,false);
});
test('v3 host bridge produces cues with no fake rewards and caption parity',async()=>{
 let emitted=[];const w=fake();const d=new AA_AcousticDirectorV3({audio:w,onAcousticCue:x=>emitted.push(x)});
 const a=await d.event('material:state',{material:'clay',action:'fracture',position:{x:2,z:2},timeMs:1000});
 assert.equal(a.asset,'tactic_clay_fracture');assert.equal(emitted[0].gameplayEffect,'none');
 assert.equal((await d.event('dialogue:line',{lineId:'archivist_paths',timeMs:2000})).captionOnly,true);
 assert.equal((await d.event('voice:register',{id:'archivist_paths',url:'https://signed.provider/foo'})).registered,false);
 assert.equal((await d.event('audio:preferences',{muted:true,subtitles:true})).muted,true);
 assert.equal(w.subtitles,true);d.dispose();
});
test('v3 restores existing saves without injecting quest flags or fake creatures',()=>{
 const d=new AA_AcousticDirectorV3({audio:fake()});d.restore({version:2,questFlags:['sluice_shortcut'],ngPlus:2,audio:{},survey:{}});
 assert.equal(d.flags.has('sluice_shortcut'),true);assert.equal(d.ngPlus,2);
 assert.equal(d.monsters.size,0);assert.equal(d.serialize().version,3);d.dispose();
});

test('v3 adaptive music crossfades scenes on the same global musical phase',async()=>{
 const {AdaptiveScore}=await import('../src/adaptive-score.js');
 const starts=[],gains=[];
 const ctx={currentTime:2,createBufferSource(){return {loop:false,connect(){},start(t,offset){starts.push([t,offset])},stop(){}}},createGain(){const gain={value:0,setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}};gains.push(gain);return {gain,connect(){}}}};
 const world={ctx,buses:{music:{}},load:async()=>({duration:16})};
 const score=new AdaptiveScore(world);await score.setScene('marsh');
 assert.equal(starts.length,4);assert.ok(starts.every(([,offset])=>Math.abs(offset)<.001));
 ctx.currentTime=7;await score.setScene('city');
 assert.equal(starts.length,8);assert.ok(starts.slice(4).every(([,offset])=>Math.abs(offset-5)<.001));
});

test('v3 world snapshot updates actual creature coordinates without resetting suspicion',()=>{
 const d=new AA_AcousticDirectorV3({audio:fake()});
 d.setWorld({enemies:[{id:'test',position:{x:1,z:2},hearing:.7}]});
 d.monsters.get('test').alertness=.8;
 d.setWorld({enemies:[{id:'test',position:{x:10,z:20},hearing:1}]});
 assert.deepEqual(d.monsters.get('test').position,{x:10,z:20});
 assert.equal(d.monsters.get('test').alertness,.8);assert.equal(d.monsters.get('test').hearing,1);d.dispose();
});

test('v3 weather layers replace stale prior weather without exhausting polyphony',async()=>{
 const d=new AA_AcousticDirectorV3({audio:fake(),maxVoices:1});
 for(const weather of ['rain','night','wind','rain']){
  const res=await d.event('weather:changed',{biome:'reed_marsh',weather});assert.equal(res.handled,true);assert.equal(res.accepted,true);
 }
 assert.equal(d.arbiter.active.size,1);
 await d.event('weather:clear');assert.equal(d.arbiter.active.size,0);d.dispose();
});
