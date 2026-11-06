import test from 'node:test';import assert from 'node:assert/strict';
import {createResidentBridge} from '../production/RESIDENT_BRIDGE_V8.mjs';
function fixture(){const actor={id:'resident:42',name:'Cinderling',x:1,z:1,region:'orchard',alive:true,visible:true};const party={x:0,z:0,region:'orchard'};const calls=[];
 const bridge=createResidentBridge({getActor:id=>id===actor.id?actor:null,getParty:()=>party,canReach:()=>true,
  guideTo:payload=>(calls.push(['guide',payload]),{ok:true}),beginBattle:payload=>(calls.push(['battle',payload]),{ok:true}),observeResident:payload=>(calls.push(['study',payload]),{ok:true})});
 return {actor,party,calls,bridge};}
test('Production bridge requires all canonical callbacks',()=>assert.throws(()=>createResidentBridge({}),/callback/));
test('Only actual actor identity and same-region presence are eligible',()=>{const f=fixture();assert.equal(f.bridge.engage('fake','e1').ok,false);f.actor.region='other';assert.equal(f.bridge.engage(f.actor.id,'e1').ok,false);assert.equal(f.calls.length,0);});
test('Far-away residents cannot be fought and do not call canonical combat',()=>{const f=fixture();f.actor.x=25;assert.equal(f.bridge.engage(f.actor.id,'e1').ok,false);assert.equal(f.calls.length,0);});
test('Unreachable residents behind physical obstacles cannot be attacked',()=>{const f=fixture();const b=createResidentBridge({getActor:()=>f.actor,getParty:()=>f.party,canReach:()=>false,guideTo:()=>({ok:true}),beginBattle:()=>{throw Error('should not run')},observeResident:()=>{throw Error('should not run')}});assert.equal(b.engage(f.actor.id,'e1').ok,false);});
test('Canonical battle resolver is called once with exact target and event ID, no local rewards',()=>{const f=fixture();const r=f.bridge.engage(f.actor.id,'combat-001');assert.equal(r.ok,true);assert.deepEqual(f.calls,[['battle',{eventId:'combat-001',actorId:f.actor.id,region:'orchard',target:{x:1,z:1}}]]);});
test('Study uses separate evidence resolver, never battle or loot',()=>{const f=fixture();const r=f.bridge.study(f.actor.id,'observe-001');assert.equal(r.ok,true);assert.equal(f.calls[0][0],'study');assert.equal(f.calls.length,1);});
test('Approach delegates to actual game movement planner and respects stop radius',()=>{const f=fixture();f.actor.x=28;const r=f.bridge.approach(f.actor.id);assert.equal(r.ok,true);assert.equal(f.calls[0][0],'guide');assert.equal(f.calls[0][1].stopDistance,3.1);});
test('Event identity is required before submitting combat or observations',()=>{const f=fixture();assert.equal(f.bridge.engage(f.actor.id,'').ok,false);assert.equal(f.bridge.study(f.actor.id,'').ok,false);assert.equal(f.calls.length,0);});
