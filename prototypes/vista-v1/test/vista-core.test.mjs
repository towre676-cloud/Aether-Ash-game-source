import assert from 'node:assert/strict';
import {test} from 'node:test';
import {composeLandmark,QualityGovernor,CinematicCameraDirector,VisualEventQueue,describeCombatEffect,hashSeed,smoothstep} from '../src/vista-core.mjs';
const world={regionAt:()=>({outdoor:true,biome:'woodland'}),groundAt:()=>({y:4}),obstacleAt:()=>false,nearPathAt:()=>.7,waterAt:()=>.9};
test('deterministic hash / smoothstep',()=>{assert.equal(hashSeed(13,-4,44),hashSeed(13,-4,44));assert.equal(smoothstep(0,1,.5),.5);});
test('does not place without authoritative classifiers',()=>assert.equal(composeLandmark({x:2,z:4,tag:'shrine'}),null));
test('shrine intentionally follows known path and respects indoor masks',()=>{
 assert.equal(composeLandmark({x:2,z:4,tag:'shrine',...world}).tag,'shrine');
 assert.equal(composeLandmark({x:2,z:4,tag:'shrine',...world,nearPathAt:()=>.02}),null);
 assert.equal(composeLandmark({x:2,z:4,tag:'shrine',...world,groundAt:()=>({y:1,indoor:true})}),null);
});
test('waterfall requires wet geological site',()=>assert.equal(composeLandmark({x:1,z:4,tag:'waterfall',...world,waterAt:()=>.2}),null));
test('boss arena keeps clear low detail density',()=>assert.ok(composeLandmark({x:1,z:4,tag:'boss-arena',...world}).density<.2));
test('quality governor gradually scales down slow performance',()=>{const q=new QualityGovernor({initial:'high'});for(let i=0;i<150;i++)q.record(80,1/30);assert.equal(q.tier,'medium');});
test('quality governor hysteresis avoids premature promotion',()=>{const q=new QualityGovernor({initial:'medium'});for(let i=0;i<120;i++)q.record(8,1/60);assert.equal(q.tier,'medium');});
test('reduced motion zero particles but not simulation',()=>{const q=new QualityGovernor({reducedMotion:true});assert.equal(q.settings().particleBudget,0);});
test('camera view is read-only and frame-step stable',()=>{
 const hero={x:4,z:7};const d=new CinematicCameraDirector();let c;for(let i=0;i<50;i++)c=d.update(1/60,{hero,threat:{boss:true}});assert.ok(c.zoom<.9);assert.deepEqual(hero,{x:4,z:7});});
test('camera respects manual camera ownership',()=>{const d=new CinematicCameraDirector();const b=d.update(.05,{hero:{x:0,z:0},manualCamera:true,threat:{boss:true}});assert.equal(b.zoom,1);});
test('effect reads environmental quantities without calculating damage',()=>{
 const w={wetness:.8,conductivity:.6,cover:.4};const before=JSON.stringify(w);
 const e=describeCombatEffect({eventId:'a',type:'cast',element:'water',x:2,z:3},w);
 assert.ok(e.surfaceScatter>.6);assert.equal(e.damageAppliedByHost,false);assert.equal(JSON.stringify(w),before);
});
test('visual queue idempotent and expires',()=>{const q=new VisualEventQueue();assert.equal(q.push({eventId:'a',type:'cast'}),true);assert.equal(q.push({eventId:'a',type:'cast'}),false);q.tick(.12);q.tick(.12);q.tick(.12);q.tick(.12);assert.equal(q.events.length,0);});
test('invalid events cannot spawn effects',()=>{const q=new VisualEventQueue();assert.equal(q.push({type:'loot',eventId:'x'}),false);assert.equal(q.push({type:'hit'}),false);});
