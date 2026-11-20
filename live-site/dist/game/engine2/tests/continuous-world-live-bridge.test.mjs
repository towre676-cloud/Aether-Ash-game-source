import test from 'node:test';
import assert from 'node:assert/strict';
import {createContinuousFlightBridge} from '../continuous-world-live-bridge.mjs';
const start={x:1,y:0,z:2,heading:0,type:'ground'};
function fixture(){
 const log={poses:[],cameras:[],events:[],sweeps:[]};
 const host={
  terrainHeight:()=>0,
  sweepFlight:args=>{log.sweeps.push(args);return {allowed:true};},
  resolveRegion:p=>p.z>=12?'north':'south',
  commitFlightPose:(p,m)=>log.poses.push({p,m}),
  cameraFlight:(p,m)=>log.cameras.push({p,m}),
  canTakeoff:()=>true,canLand:({pose})=>pose.y<=20,
  onFlightEvent:e=>log.events.push(e)
 };
 return {host,log,flight:createContinuousFlightBridge(host)};
}
test('missing canonical integration APIs fail closed',()=>assert.throws(()=>createContinuousFlightBridge({}),/terrainHeight/));
test('takeoff checks grounded position, host permission and collision',()=>{
 const f=fixture();assert.equal(f.flight.takeoff({...start,y:100}),false);
 f.host.canTakeoff=()=>false;assert.equal(f.flight.takeoff(start),false);
 f.host.canTakeoff=()=>true;assert.equal(f.flight.takeoff(start),true);
 assert.equal(f.flight.takeoff(start),false);
 assert.equal(f.flight.current().mode,'flying');
});
test('flight commits through camera/world callbacks and restores exact save',()=>{
 const a=fixture(),b=fixture();a.flight.takeoff(start);
 for(let i=0;i<180;i++)a.flight.update(1/60,{throttle:1,pitch:.6});
 const saved=a.flight.snapshot();assert.equal(b.flight.restore(saved),true);
 assert.deepEqual(b.flight.snapshot(),saved);
 assert.equal(a.flight.current().stats.steps,180);
 assert.ok(a.log.poses.length>=180&&a.log.cameras.length>=180);
});
test('blocked collisions neither teleport nor corrupt velocity',()=>{
 const f=fixture();f.flight.takeoff(start);const before=f.flight.current().craft;
 f.host.sweepFlight=()=>({allowed:false});f.flight.update(1/60,{throttle:1});
 const after=f.flight.current().craft;
 assert.equal(after.x,before.x);assert.equal(after.z,before.z);assert.equal(after.speed,0);
 assert.equal(f.flight.current().stats.collisions,1);
});
test('landing stays gated by canonical landing and collision checks',()=>{
 const f=fixture();f.flight.takeoff(start);assert.equal(f.flight.land(),true);
 assert.equal(f.flight.current().mode,'grounded');assert.equal(f.flight.current().craft.y,0);
 assert.equal(f.log.events.at(-1).type,'landing');
});
test('malformed saves and elapsed times cannot rewrite canonical position',()=>{
 const f=fixture();f.flight.takeoff(start);const saved=f.flight.snapshot();
 assert.equal(f.flight.restore({...saved,region:'bad'}),false);
 assert.equal(f.flight.restore({...saved,craft:{...saved.craft,x:Infinity}}),false);
 assert.equal(f.flight.restore({...saved,version:9}),false);
 assert.throws(()=>f.flight.update(NaN),/elapsed/);assert.deepEqual(f.flight.snapshot(),saved);
});
test('long frame clamps physics steps instead of burst teleporting',()=>{
 const f=fixture();f.flight.takeoff(start);assert.ok(f.flight.update(10,{throttle:1}).steps<=5);
 assert.ok(f.flight.current().stats.droppedSeconds>0);
});
test('host maps region transitions without loading prototype locations',()=>{
 const f=fixture();f.flight.takeoff({...start,z:11.9});
 for(let i=0;i<180;i++)f.flight.update(1/60,{throttle:1});
 assert.ok(f.log.events.some(e=>e.type==='region'&&e.to==='north'));
});
