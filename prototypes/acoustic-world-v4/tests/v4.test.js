import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {V4_BOSSES,V4_BOSS_PHASES,V4_NPCS,V4_NPC_ACTIONS,V4_DEVICES,V4_DEVICE_ACTIONS,V4_ZONES,V4_TIMELINE_STATES,resolveV4Cue,BossBeatClock,AcousticEventLedger} from '../src/acoustic-events-v4.js';
import {AA_AcousticDirectorV4} from '../src/game-bridge-v4.js';
import {bindAcousticHost,CANONICAL_GAME_EVENTS} from '../src/production-adapter.js';
const assets=new Set(JSON.parse(fs.readFileSync(new URL('../manifest.json',import.meta.url))).assets.map(x=>x.id));
const mock=()=>({index:new Map([...assets].map(x=>[x,{id:x}])),ctx:null,play:async()=>({source:{addEventListener(){},stop(){}}}),caption(){},setMuted(){},setVolume(){},serialize:()=>({}),restore(){},dispose(){},ambience:async()=>{},setListener(){}});
test('v4 manifest contains 512 unique playable addressed cues',()=>{
 assert.equal(assets.size,512);
 for(const b of V4_BOSSES)for(const phase of V4_BOSS_PHASES)assert.ok(assets.has(resolveV4Cue('boss:telegraph',{boss:b,phase}).id));
 for(const role of V4_NPCS)for(const action of V4_NPC_ACTIONS)assert.ok(assets.has(resolveV4Cue('npc:work',{role,action}).id));
 for(const device of V4_DEVICES)for(const action of V4_DEVICE_ACTIONS)assert.ok(assets.has(resolveV4Cue('world:device',{device,action}).id));
 for(const zone of V4_ZONES)for(const state of V4_TIMELINE_STATES)assert.ok(assets.has(resolveV4Cue('timeline:consequence',{zone,state}).id));
});
test('unknown IDs and malformed event coordinates are rejected/sanitized',()=>{
 assert.equal(resolveV4Cue('npc:work',{role:'wizard',action:'trade'}),null);
 assert.equal(resolveV4Cue('world:device',{device:'fake',action:'pulse'}),null);
 assert.equal(resolveV4Cue('boss:telegraph',{boss:'clayback_warden',phase:'windup',position:{x:Infinity,z:1}}).position,null);
});
test('boss telegraph makes guard timing explicit; never invents damage',()=>{
 const boss=new BossBeatClock({windupMs:1000,guardWindowMs:240,recoveryMs:400});
 const began=boss.begin({boss:'clayback_warden',attackId:'a',timeMs:1000});assert.equal(began.impactAt,2000);
 assert.equal(boss.guard(1740).reason,'too_early');assert.equal(boss.guard(1880).guarded,true);
 assert.equal(boss.tick(2000).events[0].guarded,true);
 assert.equal(boss.tick(2001).events.length,0);assert.equal(boss.tick(2400).phase,'idle');
});
test('unanswered boss telegraph has one impact even after delayed host tick',()=>{
 const boss=new BossBeatClock({windupMs:700});boss.begin({boss:'clayback_warden',attackId:'b',timeMs:10});
 assert.equal(boss.tick(10000).events.filter(x=>x.type==='impact').length,1);
 assert.equal(boss.tick(10001).events.filter(x=>x.type==='impact').length,0);
});
test('boss controls reject overlap, invalid durations and late parry',()=>{
 const boss=new BossBeatClock();assert.equal(boss.begin({boss:'unknown',attackId:'x',timeMs:0}).accepted,false);
 boss.begin({boss:'clayback_warden',attackId:'x',timeMs:0});assert.equal(boss.begin({boss:'clayback_warden',attackId:'y',timeMs:100}).reason,'attack_in_progress');
 assert.equal(boss.guard(1500).reason,'too_late');
});
test('ledger blocks event replay and per-actor event reordering',()=>{
 const ledger=new AcousticEventLedger({maxEntries:32});assert.equal(ledger.admit({eventId:'a',actorId:'monster',sequence:9}).accepted,true);
 assert.equal(ledger.admit({eventId:'a'}).reason,'duplicate_event');assert.equal(ledger.admit({eventId:'b',actorId:'monster',sequence:8}).reason,'out_of_order');
 assert.equal(ledger.admit({eventId:'c',actorId:'monster',sequence:10}).accepted,true);
});
test('ledger restore preserves idempotency across save migration',()=>{
 const a=new AcousticEventLedger();a.admit({eventId:'e1',actorId:'npc',sequence:1});const b=new AcousticEventLedger();b.restore(a.serialize());
 assert.equal(b.admit({eventId:'e1'}).accepted,false);assert.equal(b.admit({eventId:'e2',actorId:'npc',sequence:1}).reason,'out_of_order');
});
test('v4 director only advises gameplay and captions all cues',async()=>{
 const received=[],beat=[],w=mock(),d=new AA_AcousticDirectorV4({audio:w,onCombatBeat:e=>beat.push(e),onAcousticCue:e=>received.push(e)});
 const r=await d.event('boss:begin',{boss:'clayback_warden',attackId:'x',timeMs:1000,windupMs:800});assert.equal(r.accepted,true);
 assert.equal(received[0].gameplayEffect,'none');assert.equal((await d.event('boss:guard',{timeMs:1730})).guarded,true);
 await d.event('boss:tick',{timeMs:1800});assert.equal(beat[0].guarded,true);assert.equal(beat[0].gameplayEffect,'none');d.dispose();
});
test('v4 duplicate audio event never grants world flags',async()=>{
 const d=new AA_AcousticDirectorV4({audio:mock()});
 const e={eventId:'one',actorId:'npc-1',sequence:1,role:'smith',action:'work',timeMs:1000};
 assert.equal((await d.event('npc:work',e)).handled,true);assert.equal((await d.event('npc:work',e)).reason,'duplicate_event');
 assert.equal(d.flags.size,0);assert.equal(d.serialize().version,4);d.dispose();
});
test('production adapter unsubscribes, handles errors and never invents game APIs',async()=>{
 const callbacks=new Map(),seen=[];const game={events:{on:(n,fn)=>callbacks.set(n,fn),off:(n,fn)=>{if(callbacks.get(n)===fn)callbacks.delete(n)}}};
 const bridge=bindAcousticHost({game,director:{event:async(t,e)=>seen.push([t,e])}});assert.equal(bridge.events.length,Object.keys(CANONICAL_GAME_EVENTS).length);
 callbacks.get('npc:activity')({role:'smith',action:'work'});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(seen[0][0],'npc:work');bridge.dispose();assert.equal(callbacks.size,0);
});
test('v4 restores previous v3 quest saves and disposes without replay',()=>{
 const a=new AA_AcousticDirectorV4({audio:mock()});a.restore({version:3,questFlags:['sluice_shortcut'],ngPlus:2,audio:{},survey:{}});
 assert.equal(a.flags.has('sluice_shortcut'),true);assert.equal(a.ngPlus,2);assert.equal(a.bossClock.active,null);a.dispose();
});
