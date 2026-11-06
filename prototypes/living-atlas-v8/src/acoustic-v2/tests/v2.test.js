import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCORE_SCENES,SCORE_STEMS,scoreGains,scoreSceneForBiome} from '../src/adaptive-score.js';
import {occlusionBetween,segmentHitsWall,emitFootstep,HearingAI,triangulateScans,materialShield,ResonanceSurvey} from '../src/acoustic-simulation.js';
import {AA_AcousticDirector} from '../src/game-bridge.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.json',import.meta.url)));
const assets=new Map(manifest.assets.map(x=>[x.id,x]));

test('v2 catalog: 244 assets and 4 synchronized stems per 6 scores',()=>{
 assert.equal(assets.size,244);
 for(const scene of SCORE_SCENES){
  const group=SCORE_STEMS.map(s=>assets.get(`score_${scene}_${s}`));
  assert.ok(group.every(x=>x?.loop));assert.deepEqual(group.map(x=>x.duration),[16,16,16,16]);
  assert.deepEqual(group.map(x=>x.tempoBpm),[120,120,120,120]);
 }
 assert.equal(manifest.categories.spots,48);assert.equal(manifest.categories.hazards,16);assert.equal(manifest.categories.material,24);
});
test('adaptive score maps geography and gameplay changes without sudden full-scale jumps',()=>{
 assert.equal(scoreSceneForBiome('reed_marsh'),'marsh');assert.equal(scoreSceneForBiome('clay_forge'),'city');
 const a=scoreGains({danger:0,travel:0}),b=scoreGains({danger:1,travel:1});
 assert.ok(b.peril>a.peril);assert.ok(b.motion>a.motion);assert.ok(scoreGains({discovery:1}).revelation>a.revelation);
 for(const x of Object.values(scoreGains({danger:100,discovery:100})))assert.ok(x>=0&&x<=1);
});
test('walls attenuate hearing only when they cross the sound propagation ray',()=>{
 const p={x:0,z:0},e={x:8,z:0};
 const crossing={from:{x:4,z:-2},to:{x:4,z:2},absorption:.8};
 const unrelated={from:{x:4,z:3},to:{x:4,z:7},absorption:.9};
 assert.equal(segmentHitsWall(p,e,crossing),true);assert.equal(segmentHitsWall(p,e,unrelated),false);
 assert.equal(occlusionBetween(p,e,[crossing,unrelated]),.8);
});
test('footsteps are spatially localized, linked to surfaces and attenuated by real walls',()=>{
 const p={x:0,z:0};const enemies=[{id:'wolf',position:{x:2,z:0},range:14,hearing:1},{id:'far',position:{x:20,z:0},range:14,hearing:1}];
 const loud=emitFootstep({position:p,enemies,surface:'metal_grating',mode:'sprint',speed:2});
 const quiet=emitFootstep({position:p,enemies,surface:'wet_moss',mode:'sneak',speed:.5});
 assert.ok(loud[0].alertDelta>quiet[0].alertDelta);assert.ok(loud[0].alertDelta>loud[1].alertDelta);
 const wall=emitFootstep({position:p,enemies,surface:'metal_grating',mode:'sprint',speed:2,walls:[{from:{x:1,z:-2},to:{x:1,z:2},absorption:1}]});
 assert.ok(wall[0].alertDelta<loud[0].alertDelta);
});
test('AI has distinct hearing, suspicion, investigation and memory decay',()=>{
 const a=new HearingAI({id:'wolf',position:{x:2,z:3}});
 assert.equal(a.mode,'idle');
 for(let i=0;i<5;i++)a.hear({enemyId:'wolf',heard:true,alertDelta:.12,source:{x:9,z:6}});
 assert.equal(a.mode,'investigating');assert.deepEqual(a.target,{x:9,z:6});
 for(let i=0;i<5;i++)a.hear({enemyId:'wolf',heard:true,alertDelta:.12,source:{x:9,z:6}});
 assert.equal(a.mode,'alert');assert.equal(a.tick(60).mode,'suspicious');assert.equal(a.tick(60).mode,'idle');assert.equal(a.target,null);
});
test('triangulation rejects insufficient and parallel clues',()=>{
 assert.equal(triangulateScans([]).reason,'need_two_vantage_points');
 assert.equal(triangulateScans([{position:{x:0,z:0},bearing:0},{position:{x:2,z:0},bearing:0}]).reason,'parallel_or_backward_bearings');
});
test('two different vantage points locate only an actually authored resonant source',()=>{
 const world=[{id:'sluice',position:{x:9,z:6},audioSignal:'water'}];
 const s=new ResonanceSurvey();
 assert.equal(s.resolve('sluice',world).reason,'need_two_vantage_points');
 const one=s.scan({player:{x:0,z:0},objects:world});assert.equal(one[0].signal,'water');
 assert.equal(s.resolve('sluice',world).resolved,false);
 s.scan({player:{x:0,z:8},objects:world});
 const answer=s.resolve('sluice',world);assert.equal(answer.resolved,true);assert.ok(answer.error<.01);
 assert.equal(s.resolve('sluice',world).reason,'already_discovered');
 assert.equal(s.resolve('imaginary',world).reason,'not_authored');
 const restored=new ResonanceSurvey();restored.restore(s.serialize());assert.equal(restored.resolve('sluice',world).resolved,false);
});
test('a third scan can correct the bad angular geometry of the first two scans',()=>{
 const target={x:15,z:6};
 const scan=p=>({position:p,bearing:Math.atan2(target.x-p.x,target.z-p.z)});
 const poor=[scan({x:2,z:6}),scan({x:5,z:6})];
 assert.equal(triangulateScans(poor).solved,false);
 const solved=triangulateScans([...poor,scan({x:5,z:2})]);
 assert.equal(solved.solved,true);assert.ok(Math.hypot(solved.position.x-target.x,solved.position.z-target.z)<.01);
});
test('resonant shields yield specific octave-related frequency vulnerabilities',()=>{
 const good=materialShield({material:'clay',attackFrequency:196});
 const bad=materialShield({material:'clay',attackFrequency:270});
 assert.equal(good.vulnerable,true);assert.equal(materialShield({material:'clay',attackFrequency:392}).vulnerable,true);
 assert.equal(bad.vulnerable,false);assert.ok(good.defenseMultiplier<bad.defenseMultiplier);
 assert.equal(materialShield({material:'unlisted'}).known,false);
});
test('bridge drives acoustic monster hearing and rate limits animation-frame spam',async()=>{
 let heard=[];const fake={ctx:null,index:assets,init:async()=>{},unlock:async()=>{},setListener:()=>{},ambience:async()=>{},play:async()=>{},footstep:async()=>{},creature:async()=>{},combat:async()=>{},ui:async()=>{},caption:()=>{},dispose:()=>{},serialize:()=>({}),restore:()=>{}};
 const d=new AA_AcousticDirector({audio:fake,onHearing:x=>heard.push(x)});
 d.setWorld({objects:[],enemies:[{id:'one',position:{x:2,z:2},hearing:1}]});
 const a=await d.event('player:step',{timeMs:1000,position:{x:1,z:2},surface:'gravel',speed:2,mode:'sprint'});
 assert.equal(a.sound.length,1);assert.equal(heard.length,1);
 const spam=await d.event('player:step',{timeMs:1001,position:{x:1,z:2},surface:'gravel',speed:2,mode:'sprint'});
 assert.equal(spam.throttled,true);assert.equal(heard.length,1);
 assert.ok((await d.event('player:step',{timeMs:1300,position:{x:1,z:2},surface:'gravel',speed:2,mode:'sprint'})).sound.length>0);
});
test('quest integration never mints unauthorized rewards, real source requires 2 scans',async()=>{
 let given=[];const fake={ctx:null,index:assets,init:async()=>{},unlock:async()=>{},setListener:()=>{},ambience:async()=>{},play:async()=>{},footstep:async()=>{},creature:async()=>{},combat:async()=>{},ui:async()=>{},caption:()=>{},dispose:()=>{},serialize:()=>({}),restore:()=>{}};
 const d=new AA_AcousticDirector({audio:fake,onQuest:x=>given.push(x)});
 d.setWorld({objects:[{id:'sluice',position:{x:8,z:5},acousticQuestId:'marsh_sluice'}],enemies:[]});
 assert.equal((await d.event('player:resolve',{sourceId:'sluice'})).resolved,false);
 assert.equal((await d.event('player:scan',{position:{x:0,z:0}})).length,1);
 assert.equal((await d.event('player:scan',{position:{x:0,z:10}})).length,1);
 const done=await d.event('player:resolve',{sourceId:'sluice'});assert.equal(done.reward.applied,true);
 assert.equal(given.length,1);assert.equal(d.flags.has('sluice_shortcut'),true);
 assert.equal((await d.event('player:resolve',{sourceId:'sluice'})).resolved,false);
});
