import test from 'node:test';import assert from 'node:assert/strict';
class Param{value=1;setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node{gain=new Param();connect(){}disconnect(){}}
class Source extends Node{start(t,offset=0){this.offset=offset;}stop(){queueMicrotask(()=>this.onended?.());}}
class Context{currentTime=0;state='running';destination=new Node();createGain(){return new Node();}createAnalyser(){return new Node();}createMediaElementSource(){return new Node();}createBufferSource(){return new Source();}async resume(){}async decodeAudioData(){return {duration:8};}}
globalThis.Audio=class{readyState=1;pause(){}addEventListener(){}};globalThis.window={AudioContext:Context};globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
const{AdaptiveSoundtrack}=await import('../../adaptive-soundtrack.js');const track=id=>({id,audio:id,rpg:true,loop:true,loopEnd:8});
test('rapid scene requests leave only the latest active scene',async()=>{const a=new AdaptiveSoundtrack();await Promise.all([a.play(track('town')),a.play(track('battle')),a.play(track('boss'))]);assert.equal(a.track.id,'boss');assert.equal(a.voices.size,1);});
test('pause/resume keeps musical position without duplicated voices',async()=>{const a=new AdaptiveSoundtrack();await a.play(track('town'));a.context.currentTime=11;a.pause();assert.equal(a.adaptive.offset,3);assert.equal(a.voices.size,0);await a.resume();assert.equal(a.adaptive.voice.source.offset,3);assert.equal(a.voices.size,1);a.pause();await Promise.resolve();assert.equal(a.playing,false);});
test('pause cancels an in-flight first scene load',async()=>{const a=new AdaptiveSoundtrack();const p=a.play(track('town'));a.pause();await p;assert.equal(a.voices.size,0);});
test('decoded buffers have a bounded cache',async()=>{const a=new AdaptiveSoundtrack();a.setup();for(let i=0;i<9;i++)await a.load(String(i));assert.equal(a.buffers.size,4);});
