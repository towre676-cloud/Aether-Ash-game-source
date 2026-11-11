import test from 'node:test';
import assert from 'node:assert/strict';
import {CISTERN,CISTERN_TRAVEL_SPEED,createCisternState,cisternWalkable,cisternRoute,advanceCistern,actionCistern,nearbyCisternTarget,cisternObjective,claimCisternRewards} from '../cistern-model.js';
const hero=()=>({id:0,name:'Sable',hp:180,maxHp:180,mp:38,maxMp:38,power:24,level:1,strain:0});
const silent=s=>{for(const e of s.enemies)e.hp=0;};
const ticks=(s,n,input={},party=[])=>{const events=[];for(let i=0;i<n;i++)events.push(...advanceCistern(s,.1,input,party));return events;};

test('all required destinations are reachable by the actual floor; the sealed sanctum is not',()=>{
 const s=createCisternState();
 assert.ok(cisternWalkable(0,12,s));
 for(const target of [...CISTERN.resonators,CISTERN.exit]){
  const route=cisternRoute(s,target);assert.ok(route.length>0,target.id);
  let p=s.player;for(const n of route){assert.ok(cisternWalkable(n.x,n.z,s),JSON.stringify(n));assert.ok(cisternWalkable((p.x+n.x)/2,(p.z+n.z)/2,s));p=n;}
  assert.ok(Math.hypot(p.x-target.x,p.z-target.z)<.1);
 }
 assert.deepEqual(cisternRoute(s,CISTERN.boss),[]);
 s.resonators=[true,true];assert.ok(cisternRoute(s,CISTERN.boss).length>0);
 assert.equal(cisternWalkable(0,-14,s),true);
 assert.equal(cisternWalkable(5,-14,s),false,'the wall remains solid beside the open gate');
});

test('water, pillars and walls reject player footprints and swept motion cannot tunnel',()=>{
 const s=createCisternState();silent(s);
 assert.equal(cisternWalkable(4,-2,s),false);
 assert.equal(cisternWalkable(0,-2,s),true,'north bridge');
 assert.equal(cisternWalkable(4,-5,s),true,'cross bridge');
 assert.equal(cisternWalkable(2.3,10,s),false,'column');
 assert.equal(cisternWalkable(10.9,1,s),false,'footprint crosses outer wall');
 s.player={x:0,z:-12.8,facing:0};ticks(s,60,{moveZ:-1,run:true});
 assert.ok(s.player.z>=-13.5,'locked gate cannot be crossed');
 s.resonators=[true,true];ticks(s,15,{moveZ:-1,run:true});assert.ok(s.player.z<-14.5);
 const before=s.player.z;advanceCistern(s,Infinity,{moveZ:-1});assert.equal(s.player.z,before);
 advanceCistern(s,9,{moveZ:-1});assert.ok(before-s.player.z<=CISTERN_TRAVEL_SPEED.walk*.1+.001,'long elapsed time is capped');
});

test('two local resonators open the gate; interact at the entrance requests the overworld',()=>{
 const s=createCisternState();
 assert.equal(actionCistern(s,'interact').at(0).type,'notice');
 s.player={x:-8,z:-4};assert.equal(nearbyCisternTarget(s).id,'west');
 assert.equal(actionCistern(s,'interact')[0].type,'resonator');assert.equal(s.resonators[0],true);
 assert.equal(cisternWalkable(0,-14,s),false);
 s.player={x:8,z:-4};const events=actionCistern(s,'interact');
 assert.ok(events.some(e=>e.type==='gate'));assert.equal(cisternWalkable(0,-14,s),true);
 assert.ok(cisternObjective(s).includes('sanctum'));
 s.player={x:0,z:14};assert.equal(actionCistern(s,'interact')[0].type,'exit');
});

test('attack warnings last over a second and lock their position so walking out avoids the strike',()=>{
 const h=hero(),s=createCisternState();s.invulnerable=0;const e=s.enemies[0];for(const other of s.enemies)if(other!==e)other.hp=0;
 s.player={x:0,z:7.5,facing:0};e.cooldown=0;
 const events=advanceCistern(s,.1,{},[h]);assert.ok(events.some(v=>v.type==='warning'));assert.ok(e.telegraph.duration>=1);
 const warning={...e.telegraph},avoid=structuredClone(s),avoidingHero=hero();ticks(s,9,{},[h]);assert.equal(h.hp,180,'warning has not struck early');
 ticks(avoid,4,{},[avoidingHero]);ticks(avoid,6,{moveZ:1,run:true},[avoidingHero]);ticks(avoid,3,{},[avoidingHero]);assert.equal(avoidingHero.hp,180,'walking outside the locked circle dodges');
 assert.equal(warning.x,0);assert.equal(warning.z,7.5);
});

test('guard reduces real party damage and restores real MP; resonance break pays and interrupts',()=>{
 function hit(guard){const h=hero(),s=createCisternState();s.invulnerable=0;s.player={x:0,z:7};silent(s);const e=s.enemies[0];e.hp=72;e.x=0;e.z=6;e.telegraph={x:0,z:7,radius:1.35,duration:1.05,remaining:.01};const ev=advanceCistern(s,.1,{guard},[h]);return {h,s,ev};}
 const normal=hit(false),guarded=hit(true);assert.equal(180-normal.h.hp,12);assert.equal(180-guarded.h.hp,3);
 const {s,h}=normal;h.mp=0;ticks(s,10,{guard:true},[h]);assert.ok(h.mp>2);
 h.mp=38;s.cooldown=0;s.enemies[0].telegraph={x:0,z:7,radius:1.35,duration:1.05,remaining:.8};
 const ev=actionCistern(s,'mako',[h]);assert.equal(h.mp,32);assert.ok(ev.some(e=>e.type==='interrupt'));assert.equal(s.enemies[0].telegraph,null);
 assert.deepEqual(actionCistern(s,'attack',[h]),[],'action cooldown blocks input spam');
});

test('party supplies share their exact campaign counts and do not consume a tonic at full health',()=>{
 const h=hero(),s=createCisternState(),supplies={tonic:2};
 actionCistern(s,'tonic',[h],supplies);assert.equal(supplies.tonic,2);
 h.hp=30;assert.equal(actionCistern(s,'tonic',[h],supplies)[0].type,'supplies');assert.equal(supplies.tonic,1);assert.ok(h.hp>30);
 supplies.tonic=0;const before=h.hp;actionCistern(s,'tonic',[h],supplies);assert.equal(h.hp,before);
});

test('defeat returns to the entrance and preserves solved tones and already defeated creatures',()=>{
 const h=hero(),s=createCisternState();s.resonators=[true,false];s.enemies[0].hp=0;s.player={x:-8,z:-1};s.invulnerable=0;h.hp=1;
 const e=s.enemies[1];e.telegraph={x:-8,z:-1,radius:2,duration:1.1,remaining:.01};
 const ev=advanceCistern(s,.1,{},[h]);assert.ok(ev.some(e=>e.type==='defeat'));assert.deepEqual(s.resonators,[true,false]);assert.equal(s.enemies[0].hp,0);
 assert.equal(s.player.x,0);assert.equal(s.player.z,12);assert.ok(h.hp>0);assert.ok(s.invulnerable>0);
});

test('a level-one single companion can defeat the guardian with ordinary strikes and guarding',()=>{
 const h=hero(),s=createCisternState();s.resonators=[true,true];silent(s);const e=s.enemies.find(e=>e.boss);e.hp=e.maxHp;s.player={x:0,z:-22.2,facing:Math.PI};s.invulnerable=0;
 let victory=false;for(let i=0;i<200&&!victory;i++){
  const ev=[...advanceCistern(s,.1,{guard:true},[h]),...actionCistern(s,'attack',[h])];victory=ev.some(e=>e.type==='victory');
 }
 assert.equal(victory,true);assert.equal(s.bossDefeated,true);assert.ok(h.hp>0,'guarding keeps the starter companion alive');
});

test('completion reward is idempotent across revisits and a serialized campaign restore',()=>{
 const world={gold:9,xp:11,items:{tonic:2,ether:0}},s=createCisternState();
 assert.deepEqual(claimCisternRewards(world,s),[]);
 s.bossDefeated=true;assert.equal(claimCisternRewards(world,s)[0].type,'reward');
 assert.equal(world.gold,189);assert.equal(world.xp,251);assert.equal(world.items.tonic,5);assert.equal(world.items.ether,1);
 assert.deepEqual(claimCisternRewards(world,s),[]);
 const restored=createCisternState(JSON.parse(JSON.stringify(s)));assert.equal(restored.bossDefeated,true);assert.equal(restored.enemies.find(e=>e.boss).hp,0);
 assert.deepEqual(claimCisternRewards(world,restored),[]);assert.equal(world.gold,189);
});

test('resume sanitizes positions and timers while remembering legitimate room progress',()=>{
 const s=createCisternState({player:{x:Infinity,z:NaN},time:-4,resonators:[true,'true'],rewardClaimed:true,enemies:[{id:'west-mite',hp:0},{id:'gallery-mite',hp:99999,x:4,z:-2,telegraph:{remaining:.01}}]});
 assert.equal(s.player.x,0);assert.equal(s.player.z,12);assert.deepEqual(s.resonators,[true,false]);assert.equal(s.time,0);assert.equal(s.rewardClaimed,false);
 assert.equal(s.enemies[1].hp,0);assert.equal(s.enemies[0].hp,72);assert.equal(s.enemies[0].telegraph,null);assert.ok(cisternWalkable(s.enemies[0].x,s.enemies[0].z,s));
 assert.deepEqual(cisternRoute(s,{x:Infinity,z:0}),[]);assert.deepEqual(cisternRoute(s,{x:4,z:-2}),[]);
});

// Exercise the complete floor and combat loop with no position writes. This is
// deliberately a starting companion with ordinary campaign stats and supplies.
test('a complete walking campaign solves both tones, defeats the guardian, saves, and exits',()=>{
 const h=hero(),s=createCisternState(),supplies={tonic:2};let allEvents=[];
 function frame(input){
  allEvents.push(...advanceCistern(s,.1,input,[h]));
  allEvents.push(...actionCistern(s,'attack',[h],supplies));
  if(h.hp<60)allEvents.push(...actionCistern(s,'tonic',[h],supplies));
 }
 function walk(target){
  const route=cisternRoute(s,target);assert.ok(route.length,'a continuous route exists');
  let n=0;while(route.length&&n++<3000){
   const p=route[0],dx=p.x-s.player.x,dz=p.z-s.player.z,d=Math.hypot(dx,dz);
   if(d<.06){route.shift();continue;}
   const guarding=s.enemies.some(e=>e.hp>0&&Math.hypot(e.x-s.player.x,e.z-s.player.z)<2.6);
   const speed=CISTERN_TRAVEL_SPEED.walk*(guarding?.45:1),scale=Math.min(1,d/(speed*.1));
   frame({moveX:dx/d*scale,moveZ:dz/d*scale,guard:guarding});
  }
  assert.equal(route.length,0,'walking reaches the destination');assert.equal(s.defeats,0);
 }
 walk(CISTERN.resonators[0]);allEvents.push(...actionCistern(s,'interact',[h],supplies));
 assert.equal(s.resonators[0],true);
 const checkpoint=createCisternState(JSON.parse(JSON.stringify(s)),[h]);assert.deepEqual(checkpoint.resonators,s.resonators);assert.ok(Math.hypot(checkpoint.player.x-s.player.x,checkpoint.player.z-s.player.z)<.001);
 walk(CISTERN.resonators[1]);allEvents.push(...actionCistern(s,'interact',[h],supplies));
 assert.ok(s.resonators.every(Boolean));walk({x:0,z:-22.3});
 for(let n=0;n<350&&!s.bossDefeated;n++)frame({guard:true});
 assert.ok(s.bossDefeated,'a starter companion wins through the real combat loop');assert.ok(h.hp>0);
 const world={gold:0,xp:0,items:supplies};assert.equal(claimCisternRewards(world,s).length,1);
 walk(CISTERN.exit);assert.equal(actionCistern(s,'interact',[h],supplies)[0].type,'exit');
 assert.equal(s.defeats,0);assert.ok(allEvents.some(e=>e.type==='victory'));assert.ok(allEvents.some(e=>e.type==='gate'));
});

test('routes from continuous bridge-edge positions never begin inside rounded water cells',()=>{
 const s=createCisternState();s.player={x:1.3,z:-2.2};
 for(const target of [{x:0,z:3},{x:1.29,z:-7.2}]){
  const route=cisternRoute(s,target);assert.ok(route.length);let p=s.player;
  for(const n of route){
   for(let i=0;i<=10;i++)assert.ok(cisternWalkable(p.x+(n.x-p.x)*i/10,p.z+(n.z-p.z)*i/10,s));p=n;
  }
 }
});
