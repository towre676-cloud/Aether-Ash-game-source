import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {AcousticWorld,ACOUSTIC_SIGNALS,hearingModel,noiseConsequences,ACOUSTIC_SURFACES,BIOME_IDS} from '../src/acoustic-world.js';
const root=new URL('../',import.meta.url);const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.json',import.meta.url),'utf8'));
test('manifest: all 384 declared assets exist and have valid metadata',()=>{
 assert.ok(manifest.assets.length>=384);assert.equal(new Set(manifest.assets.map(a=>a.id)).size,manifest.assets.length);
 for(const a of manifest.assets){assert.ok(fs.statSync(new URL('../'+a.file,import.meta.url)).size>100);assert.ok(a.duration>0);assert.ok(a.peak<=.90);}
});
test('coverage: surface and biome library exhaustive',()=>{
 for(const s of ACOUSTIC_SURFACES)for(const w of ['soft','heavy'])assert.ok(manifest.assets.some(a=>a.id===`step_${s}_${w}`));
 for(const b of BIOME_IDS)assert.ok(manifest.assets.some(a=>a.id===b&&a.loop));
 for(const s of Object.values(ACOUSTIC_SIGNALS))assert.ok(manifest.assets.some(a=>a.id===s.audio));
});
test('physics: attenuation monotone and occlusion audible',()=>{
 assert.ok(hearingModel({distance:0})>hearingModel({distance:20}));assert.ok(hearingModel({distance:10,occlusion:0})>hearingModel({distance:10,occlusion:.9}));
});
test('perception: stealth reduces alert and noisy terrain raises it',()=>{
 let quiet=noiseConsequences({surface:'wet_moss',weight:'soft',distance:3});
 let loud=noiseConsequences({surface:'metal_grating',weight:'heavy',distance:3});
 assert.ok(loud.alertDelta>quiet.alertDelta);
 assert.ok(loud.alertDelta>noiseConsequences({surface:'metal_grating',weight:'heavy',distance:3,cover:1}).alertDelta);
});
test('gameplay: listening yields actionable flag exactly once',()=>{
 const received=[];const world=new AcousticWorld({onDiscovery:x=>received.push(x)});
 const args={player:{x:0,z:0},sources:[{id:'wall7',kind:'false_wall',position:{x:4,z:5},occlusion:.3}]};
 let result=world.listen(args);assert.equal(result.found,true);assert.equal(result.questFlag,'found_false_wall');assert.equal(result.reward,'secret_passage');
 assert.equal(world.listen(args).found,false);assert.equal(received.length,1);
 const restored=new AcousticWorld();restored.restore(world.serialize());assert.equal(restored.listen(args).found,false);
});
test('degradation: even when audio context locked, listening works without requiring sound',()=>{
 const world=new AcousticWorld();assert.equal(world.ctx,null);
 const res=world.listen({player:{x:0,z:0},sources:[{id:'direction',kind:'kakeya_line',position:{x:1,z:2}}]});
 assert.equal(res.found,true);assert.ok(Number.isFinite(res.bearing));
});
