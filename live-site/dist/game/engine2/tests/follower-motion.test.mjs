import test from 'node:test';
import assert from 'node:assert/strict';
import {PartyTrail} from '../presentation.js';
import {createFollowerFormation} from '../follower-motion.js';

const close=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);

test('follower travel stays continuous at 30, 60, 120 and 240 Hz',()=>{
 const results=[];
 for(const fps of [30,60,120,240]){
  const start=createFollowerFormation({x:10,y:10},[0,1,2]);
  const previous=start.followers.map(p=>({...p})),distance=[0,0,0];
  for(let frame=1;frame<=fps*3;frame++){
   const x=10+frame*2.65/fps;start.trail.record(x,10);
   for(let i=0;i<3;i++){
    const p=start.trail.sample(i*.92),step=Math.hypot(p.x-previous[i].x,p.y-previous[i].y);
    close(step,2.65/fps);distance[i]+=step;previous[i]=p;
   }
  }
  distance.forEach(d=>close(d,7.95));results.push(previous);
 }
 for(const result of results)for(let i=0;i<3;i++){close(result[i].x,results[0][i].x);close(result[i].y,results[0][i].y);}
});

test('seeded formation checks each segment and chooses an open entrance direction',()=>{
 const checked=[],walkable=(x,y)=>{checked.push({x,y});return x>=10-.01&&x<10.25&&y>=9.9&&y<13;};
 const {trail,followers}=createFollowerFormation({x:10,y:10},[0,1,2],walkable);
 assert.ok(checked.length>10);
 for(const p of trail.points)assert.ok(p.x>=9.99&&p.x<10.25&&p.y>=9.9&&p.y<13);
 close(followers[1].x,10);close(followers[1].y,10.92);close(followers[2].y,11.84);
});

test('cramped spawn separates continuously without a first-step teleport',()=>{
 const {trail,followers}=createFollowerFormation({x:0,y:0},[0,1,2],(x,y)=>Math.hypot(x,y)<.01);
 assert.deepEqual(followers.map(({x,y})=>({x,y})),[{x:0,y:0},{x:0,y:0},{x:0,y:0}]);
 let previous=trail.sample(1.84);
 for(let i=1;i<=600;i++){
  trail.record(i/120,0);const current=trail.sample(1.84);
  assert.ok(Math.hypot(current.x-previous.x,current.y-previous.y)<=1/120+1e-9);previous=current;
 }
 close(previous.x,5-1.84);
});

test('followers retain right-angle corners and reversals instead of cutting through walls',()=>{
 const trail=new PartyTrail(0,0);
 trail.record(1,0);trail.record(1,1);trail.record(1,0);
 for(let back=0;back<=3;back+=.01){const p=trail.sample(back);assert.ok(p.y===0||Math.abs(p.x-1)<1e-9);}
 close(trail.length,3);assert.equal(trail.points.length,4);
 const tiny=new PartyTrail(0,0);tiny.record(.000001,0);tiny.record(.000001,.000001);
 assert.equal(tiny.points.length,3);close(tiny.length,.000002);
});

test('long running histories retain an accurate distance window with bounded storage',()=>{
 const trail=new PartyTrail(0,0);
 for(let i=1;i<=30000;i++)trail.record(i*.002,0);
 close(trail.length,8);assert.equal(trail.points.length,2);close(trail.sample(1.84).x,60-1.84);close(trail.sample(Infinity).x,52);
 const noisy=new PartyTrail(0,0,{maxPoints:64});
 for(let i=1;i<=10000;i++)noisy.record(i*.00001,(i%2)*.00001);
 assert.ok(noisy.points.length<=64);
 const actual=noisy.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-noisy.points[i].x,p.y-noisy.points[i].y),0);close(noisy.length,actual);
});

test('invalid samples do not corrupt the trail and teleports reset its history',()=>{
 const trail=new PartyTrail(1,1);trail.record(1.5,1);
 assert.equal(trail.record(NaN,2),false);assert.equal(trail.record(2,Infinity),false);close(trail.length,.5);
 assert.deepEqual(trail.sample(-2),{x:1.5,y:1});assert.deepEqual(trail.sample(NaN),{x:1.5,y:1});
 trail.record(20,20);assert.equal(trail.length,0);assert.deepEqual(trail.sample(1.84),{x:20,y:20});
});

test('formation preparation does not mutate the lead, party or combat actors',()=>{
 const lead=Object.freeze({x:4,y:8}),party=Object.freeze([2,4,6]);
 const state={heroes:party.map(id=>({id,x:100+id,y:200+id}))},before=JSON.stringify(state);
 const result=createFollowerFormation(lead,party);assert.equal(JSON.stringify(state),before);assert.deepEqual(result.followers.map(p=>p.id),party);
});
