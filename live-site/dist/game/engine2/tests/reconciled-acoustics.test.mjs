import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createReconciledAcoustics,acousticBiomeFor,acousticSurfaceFor,acousticDeviceFor,acousticRoleFor} from '../reconciled-acoustics.js';
import {V4_BOSSES,V4_BOSS_PHASES,V4_NPCS,V4_NPC_ACTIONS,V4_DEVICES,V4_DEVICE_ACTIONS,V4_ZONES,V4_TIMELINE_STATES} from '../reconciled-content/acoustics/src/acoustic-events-v4.js';
const base=new URL('../reconciled-content/acoustics/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',base))),ids=new Set(manifest.assets.map(a=>a.id));
function harness({texture=false,ground=null}={}){
 const calls=[],captions=[],handles=[],stems=[],w={scene:{location:1,key:'field',theme:0,chapter:1,objects:[],doors:[]},state:{scene:1,chapter:1,x:2.5,y:2.5,party:[0],mode:'field',flags:{}},objects(){return this.scene.objects;},available(){return true;},done(o){return !!this.state.flags[o.id];},interact(o){if(o.resolve)this.state.flags[o.id]=true;}};
 const gain=()=>({connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}}});
 const audio={ctx:null,buses:{music:gain()},index:new Map(manifest.assets.map(a=>[a.id,a])),volume:{},init:async()=>{},unlock:async()=>{audio.ctx={currentTime:0,resume:async()=>{},createGain:gain,createBufferSource(){const stem={connect(){},start(){this.started=true;},stop(){this.stopped=true;}};stems.push(stem);return stem;}};},async load(id){assert.ok(ids.has(id));calls.push(['load',id]);return {duration:16};},setVolume(k,v){this.volume[k]=v;calls.push(['volume',k,v]);},setMuted(v){calls.push(['muted',v]);},setListener(){},async play(id){assert.ok(ids.has(id),'shipped cue '+id);calls.push(['play',id]);const source=new EventTarget();source.stopped=false;source.stop=()=>{source.stopped=true;source.dispatchEvent(new Event('ended'));};const handle={source};handles.push(handle);return handle;},async ambience(id){assert.ok(ids.has(id));calls.push(['ambience',id]);},footstep:async p=>calls.push(['footstep',p]),dispose(){}};
 w.reconciledGround=ground;
 const a=createReconciledAcoustics({getWorld:()=>w,transport:audio,storage:{getItem:key=>key==='aa-acoustic-score'&&texture?'on':null},onCaption:e=>captions.push(e)});return {a,w,audio,calls,captions,handles,stems};
}
const turn=()=>new Promise(r=>setTimeout(r,0));
test('all 512 original runtime files have their manifest hashes and every v4 event cue ships',()=>{
 assert.equal(manifest.assets.length,512);assert.equal(ids.size,512);
 for(const a of manifest.assets){const bytes=fs.readFileSync(new URL(a.file,base));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256,a.id);}
 for(const b of V4_BOSSES)for(const p of V4_BOSS_PHASES)assert.ok(ids.has(`boss_${b}_${p}`));
 for(const r of V4_NPCS)for(const a of V4_NPC_ACTIONS)assert.ok(ids.has(`npc_${r}_${a}`));
 for(const d of V4_DEVICES)for(const a of V4_DEVICE_ACTIONS)assert.ok(ids.has(`device_${d}_${a}`));
 for(const z of V4_ZONES)for(const s of V4_TIMELINE_STATES)assert.ok(ids.has(`timeline_${z}_${s}`));
});
test('actual scene, material and object mappings use known acoustic names',()=>{
 assert.equal(acousticBiomeFor({key:'workshop',theme:0}),'clay_forge');assert.equal(acousticBiomeFor({key:'river',theme:1}),'reed_marsh');assert.equal(acousticBiomeFor({key:'archive',theme:2}),'submerged_archive');
 assert.equal(acousticSurfaceFor({id:'clay-floorboards'},{}),'wood_planks');assert.equal(acousticSurfaceFor({id:'ash-grate'},{}),'metal_grating');assert.equal(acousticSurfaceFor({id:'water-mud'},{}),'wet_clay');
 assert.equal(acousticDeviceFor({label:'Hydrophone'}),'hydrophone');assert.equal(acousticDeviceFor({label:'Ordinary chair'}),null);assert.equal(acousticRoleFor({label:'Village ferryman'}),'ferryman');
});
test('no playback before gesture and visible boss cues use real actor names',async()=>{
 const h=harness();h.a.sync({active:true});h.a.battleEvent({type:'intent',actor:{boss:true,name:'The Ash Witness',x:4,y:5},intent:{label:'A ring of flame'}},{chapter:4,enemies:[]});
 assert.equal(h.calls.filter(c=>c[0]==='play').length,0);assert.match(h.captions.at(-1).text,/The Ash Witness.*ring of flame/);
 await h.a.unlock();assert.equal(h.a.stats().unlocked,true);h.a.dispose();
});
test('host combat casts map all elements to actual files and replayed callback objects play once',async()=>{
 const h=harness();h.a.sync({active:true});await h.a.unlock();
 const event={type:'cast',actor:{x:1,y:1},target:{x:2,y:3},tech:{core:'volt'}};h.a.battleEvent(event,{chapter:2});h.a.battleEvent(event,{chapter:2});await turn();
 assert.equal(h.calls.filter(c=>c[0]==='play'&&c[1]==='element_resonance').length,1);
 h.a.battleEvent({type:'end',result:'loss'});await turn();assert.ok(h.calls.some(c=>c[1]==='ui_cancel'));h.a.dispose();
});
test('menu/hidden gating cancels active cues and does not schedule gain changes every frame',async()=>{
 const h=harness();h.a.sync({active:true});await h.a.unlock();await h.a.signal('hydrophone',{x:3,y:3});assert.ok(h.handles.length);
 h.a.sync({active:false});assert.ok(h.handles.every(v=>v.source.stopped));const n=h.calls.length;
 for(let i=0;i<120;i++)h.a.sync({active:false});assert.equal(h.calls.length,n);await h.a.signal('hydrophone');assert.equal(h.calls.length,n);h.a.dispose();
});
test('device cues require actual accepted interactions and listening grants no invented rewards',async()=>{
 const h=harness();h.w.scene.objects=[{id:'real-sluice',type:'switch',label:'Sluice regulator',xy:[5,2],resolve:true}];h.a.sync({active:true});await h.a.unlock();
 const before=structuredClone(h.w.state);const r=h.a.listen();assert.equal(r.object.id,'real-sluice');assert.deepEqual(h.w.state,before);assert.match(h.captions.at(-1).text,/Sluice regulator.*east/);
 h.w.interact(h.w.scene.objects[0]);await turn();assert.equal(h.w.state.flags['real-sluice'],true);assert.ok(h.calls.some(c=>c[1]==='device_sluice_resolve'));h.a.dispose();
});
test('caption parity and mute never mutate world or combat state',async()=>{
 const h=harness();h.a.sync({active:true});const before=structuredClone(h.w.state);h.a.preferences.enabled=false;await h.a.unlock();h.a.battleEvent({type:'guard',actor:{x:1,y:1}});await turn();assert.equal(h.calls.filter(c=>c[0]==='play').length,0);assert.deepEqual(h.w.state,before);h.a.dispose();
});
test('ambience-only pacing stops optional score stems while keeping world and Hydrophone sound',async()=>{
 const h=harness({texture:true});h.a.sync({active:true,musicEnabled:false});await h.a.unlock();
 assert.equal(h.a.preferences.texture,true);assert.equal(h.audio.volume.music,0);assert.equal(h.stems.length,0);assert.ok(h.calls.some(c=>c[0]==='ambience'));
 await h.a.signal('hydrophone',{x:3,y:3});assert.ok(h.calls.some(c=>c[0]==='play'&&c[1]==='clue_hydrophone'));
 h.a.sync({active:true,musicEnabled:true});await turn();assert.equal(h.audio.volume.music,.095);assert.equal(h.stems.length,4);assert.ok(h.stems.every(s=>s.started));
 h.a.sync({active:true,musicEnabled:false});assert.equal(h.audio.volume.music,0);assert.ok(h.stems.every(s=>s.stopped));assert.equal(h.a.preferences.texture,true);
 const n=h.calls.length;for(let i=0;i<120;i++)h.a.sync({active:true,musicEnabled:false});assert.equal(h.calls.length,n);
 let release;const pending=new Promise(resolve=>release=resolve);h.audio.load=async()=>pending;
 h.a.sync({active:true,musicEnabled:true});h.a.sync({active:true,musicEnabled:false});release({duration:16});await turn();assert.equal(h.stems.length,4,'a late score decode cannot start after the gate closes');
 h.a.dispose();
});


test('campaign walking and running make no footstep audio with world effects enabled',async()=>{
 const listeners=new Set();
 const h=harness({ground:{subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);}}});
 h.a.sync({active:true});
 await h.a.unlock();
 for(const sprinting of [false,true])for(const listener of listeners)
  listener({type:'campaign-footstep',x:3,y:2,material:{id:'wood'},sprinting});
 await turn();
 assert.ok(h.calls.some(call=>call[0]==='ambience'));
 assert.ok(h.calls.every(call=>call[0]!=='footstep'));
 h.a.dispose();
});
