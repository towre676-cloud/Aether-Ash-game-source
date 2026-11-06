import test from 'node:test';
import assert from 'node:assert/strict';
import {createObjective,advanceObjective,objectiveEnemyIntent,executeObjectiveIntent,objectiveCommand,objectiveResult,objectiveActors,objectiveSummary,objectiveActions,validObjective} from '../encounter-objectives.js';

const grid=()=>Array.from({length:7},()=>'.'.repeat(12));
function setup(kind='regulator',overrides={}){
 const h={id:0,name:'Iona',x:2.5,y:2.5,hp:180,magic:24,atb:1,status:{}},e={id:'e0',name:'Scavenger',x:8.5,y:2.5,hp:100,power:12,atb:1,status:{}};
 const spec={id:'test-'+kind,kind,label:'Protect this place',asset:{id:'protected',name:kind==='escort'?'Patient':'Worksite',x:3.5,y:2.5,hp:100,maxHp:100},floor:grid(),route:[{x:3.5,y:2.5},{x:7.5,y:2.5}],safeNodes:[{x:7.5,y:2.5}],required:3,deadline:80,speed:.4,stableTime:4,...overrides};
 const b={heroes:[h],enemies:[e],context:{objective:spec},ended:null,events:[],event(v){this.events.push(v);},damage(caster,target,amount){target.hp=Math.max(0,target.hp-amount);}};b.objective=createObjective(b.context,b.heroes,b.enemies);return {b,h,e,o:b.objective};
}
function act(b,h,action){h.atb=1;return objectiveCommand(b,h,b.objective.asset,{action});}
function advance(b,seconds){for(let i=0;i<seconds*10;i++)advanceObjective(b,.1);}

test('all four objectives have active, nonlethal win paths while foes remain alive',()=>{
 for(const kind of ['escort','regulator','supply','signal']){
  const {b,h,e,o}=setup(kind);assert.ok(validObjective(o));assert.equal(objectiveResult(b),null);
  if(kind==='escort'){
   e.x=10.5;advance(b,2);assert.equal(o.escorting,false);assert.equal(o.asset.x,3.5);assert.ok(act(b,h,'guide'));
   for(let i=0;i<200&&!o.complete;i++){h.x=o.asset.x;h.y=o.asset.y;advanceObjective(b,.1);}
  }else{
   const action={regulator:'stabilize',supply:'secure',signal:'disable'}[kind];for(let i=0;i<3;i++)assert.ok(act(b,h,action));if(kind==='regulator')advance(b,4.1);
  }
  assert.equal(objectiveResult(b),'win',kind);assert.ok(e.hp>0,kind);assert.ok(o.complete);assert.ok(validObjective(o),kind);assert.ok(objectiveSummary(b).value>=0);assert.deepEqual(objectiveActors(b),[o.asset]);
 }
});
test('escort follows real floor, needs an accompanying crew member, and stops for a nearby blocker',()=>{
 const {b,h,e,o}=setup('escort');act(b,h,'guide');const start=o.asset.x;h.x=10.5;advance(b,1);assert.equal(o.asset.x,start);
 h.x=o.asset.x;e.x=o.asset.x+.7;e.y=o.asset.y;advance(b,1);assert.equal(o.asset.x,start);
 e.x=10.5;advance(b,1);assert.ok(o.asset.x>start);assert.equal(o.asset.y,2.5);assert.ok(validObjective(o));
});
test('regulator stability requires work, retains pressure, and can fail from sabotage or overload',()=>{
 const {b,h,e,o}=setup('regulator');advance(b,8);assert.equal(o.progress,0);assert.equal(objectiveResult(b),null);const before=o.pressure;act(b,h,'stabilize');assert.ok(o.pressure<before);
 o.progress=o.required;o.pressure=20;advance(b,1);assert.ok(o.stable>0);e.x=o.asset.x+1;e.y=o.asset.y;const intent=objectiveEnemyIntent(b,e);assert.equal(intent.kind,'objective-sabotage');executeObjectiveIntent(b,e,intent);assert.equal(o.stable,0);assert.ok(o.pressure>30);assert.ok(o.asset.hp<100);
 o.pressure=99.99;advance(b,.2);assert.equal(objectiveResult(b),'loss');assert.ok(o.failed);
});
test('scavengers contest secured bundles and signal reconnection costs real progress',()=>{
 for(const kind of ['supply','signal']){
  const {b,h,e,o}=setup(kind);act(b,h,kind==='supply'?'secure':'disable');assert.equal(o.progress,1);e.x=o.asset.x+1;e.y=o.asset.y;
  const intent=objectiveEnemyIntent(b,e);assert.equal(intent.kind,kind==='supply'?'objective-steal':'objective-sabotage');executeObjectiveIntent(b,e,intent);assert.equal(o.progress,0);
  if(kind==='supply'){executeObjectiveIntent(b,e,{...intent});executeObjectiveIntent(b,e,{...intent});assert.equal(o.thefts,3);assert.equal(objectiveResult(b),'loss');}
  else{o.elapsed=o.deadline-.05;advanceObjective(b,.1);assert.equal(objectiveResult(b),'loss');assert.match(o.resultReason,/Reinforcements/);}
 }
});
test('enemy plans alternate readable objective threats with normal turns and route around walls',()=>{
 const floor=['#####','#.#.#','#.#.#','#...#','#####'],{b,e,o}=setup('signal',{floor,asset:{id:'relay',name:'Relay',x:3.5,y:1.5,hp:100,maxHp:100},route:[]});e.x=1.5;e.y=1.5;
 const first=objectiveEnemyIntent(b,e);assert.equal(first.kind,'objective-advance');assert.equal(first.target,o.asset.id);assert.ok(first.left>=1.5);assert.match(first.label,/Closing/);executeObjectiveIntent(b,e,first);assert.deepEqual([e.x,e.y],[1.5,2.5]);assert.equal(objectiveEnemyIntent(b,e),null);
 for(let i=0;i<7;i++){const intent=objectiveEnemyIntent(b,e);if(intent)executeObjectiveIntent(b,e,intent);assert.equal(floor[Math.floor(e.y)][Math.floor(e.x)],'.');}
});
test('clay redirects and physical or instrument interceptions prevent objective damage and theft',()=>{
 for(const kind of ['escort','supply','signal']){
  const {b,e,o}=setup(kind);e.x=o.asset.x+1;e.y=o.asset.y;const intent=objectiveEnemyIntent(b,e),before=JSON.stringify([o.asset.hp,o.thefts,o.progress]);
  executeObjectiveIntent(b,e,{...intent,target:'clay-decoy',x:9.5,y:5.5});assert.equal(JSON.stringify([o.asset.hp,o.thefts,o.progress]),before);
  executeObjectiveIntent(b,e,intent,{intercept:()=>true});assert.equal(JSON.stringify([o.asset.hp,o.thefts,o.progress]),before);assert.equal(b.events.at(-1).action,'intercepted');
 }
});
test('range, readiness and unsupported objective actions cost nothing; treatment costs one action',()=>{
 const {b,h,o}=setup('escort'),snapshot=JSON.stringify(o);h.atb=.5;assert.equal(objectiveCommand(b,h,o.asset,{action:'guide'}),false);assert.equal(h.atb,.5);assert.equal(JSON.stringify(o),snapshot);assert.ok(objectiveActions(b,h).every(row=>!row.enabled));
 h.atb=1;h.x=11;assert.equal(objectiveCommand(b,h,o.asset,{action:'guide'}),false);assert.equal(h.atb,1);h.x=2.5;assert.equal(objectiveCommand(b,h,o.asset,{action:'disable'}),false);assert.equal(h.atb,1);
 o.asset.hp=5;assert.ok(act(b,h,'repair'));assert.equal(h.atb,0);assert.ok(o.asset.hp>5);assert.ok(objectiveSummary(b).warning);
});
test('asset loss takes priority over clearing foes; clearing threats otherwise protects every objective',()=>{
 for(const kind of ['escort','regulator','supply','signal']){
  const {b,e,o}=setup(kind);e.hp=0;assert.equal(objectiveResult(b),'win');assert.ok(o.complete);
  const other=setup(kind);other.e.hp=0;other.o.asset.hp=0;assert.equal(objectiveResult(other.b),'loss');
 }
});
test('objective state roundtrips and malformed geometry, progress, ownership or timers are rejected',()=>{
 const {b,h,o}=setup('escort');act(b,h,'guide');advance(b,.5);const copy=JSON.parse(JSON.stringify(o));assert.ok(validObjective(copy));assert.equal(copy.asset.x,o.asset.x);assert.equal(copy.routeIndex,o.routeIndex);assert.equal(copy.escorting,true);
 for(const mutate of [x=>x.asset.hp=Infinity,x=>x.asset.team='enemies',x=>x.progress=999,x=>x.deadline=0,x=>x.asset.x=99,x=>x.route[1].x=99,x=>x.complete=x.failed=true,x=>x.walkable=[]]){const bad=JSON.parse(JSON.stringify(copy));mutate(bad);assert.equal(validObjective(bad),false);}
 assert.ok(validObjective(undefined));assert.equal(createObjective({objective:{kind:'escort'}},[],[]),null);assert.equal(objectiveSummary({}),null);assert.deepEqual(objectiveActions({},h),[]);
});

test('a paid guide action finds a real detour on wide floor while a blocked corridor stays blocked',()=>{
 const wide=setup('escort');wide.e.x=4.5;wide.e.y=2.5;wide.h.x=3.5;wide.h.y=2.5;const end={...wide.o.route.at(-1)},before={x:wide.o.asset.x,y:wide.o.asset.y};
 assert.ok(act(wide.b,wide.h,'guide'));assert.equal(wide.h.atb,0);assert.ok(wide.o.detouring);assert.deepEqual(wide.o.route.at(-1),end);assert.ok(wide.o.route.some(p=>p.y!==before.y));
 for(const p of wide.o.route.slice(wide.o.routeIndex))assert.ok(Math.hypot(p.x-wide.e.x,p.y-wide.e.y)>=1.35);
 for(let i=0;i<400&&!wide.o.complete;i++){wide.h.x=wide.o.asset.x;wide.h.y=wide.o.asset.y;advanceObjective(wide.b,.1);assert.equal(grid()[Math.floor(wide.o.asset.y)][Math.floor(wide.o.asset.x)],'.');}
 assert.equal(objectiveResult(wide.b),'win');assert.ok(wide.e.hp>0);assert.ok(validObjective(wide.o));
 const narrow=setup('escort',{floor:['###########','#.........#','###########'],asset:{id:'patient',name:'Patient',x:3.5,y:1.5,hp:100,maxHp:100},route:[{x:3.5,y:1.5},{x:8.5,y:1.5}]});narrow.h.x=3.5;narrow.h.y=1.5;narrow.e.x=4.5;narrow.e.y=1.5;
 const start={x:narrow.o.asset.x,y:narrow.o.asset.y};assert.ok(act(narrow.b,narrow.h,'guide'));assert.equal(narrow.h.atb,0);assert.equal(narrow.o.routeBlocked,true);advance(narrow.b,1);assert.deepEqual({x:narrow.o.asset.x,y:narrow.o.asset.y},start);assert.match(objectiveSummary(narrow.b).text,/blocked/);
});

test('listening calibration changes the next pressure action and protects one relay reconnect',()=>{
 const pressure=setup('regulator');pressure.o.pressure=80;pressure.o.calibration={kind:'pressure',charges:1};assert.ok(validObjective(pressure.o));act(pressure.b,pressure.h,'stabilize');assert.equal(pressure.o.pressure,35);assert.equal(pressure.o.calibration,null);act(pressure.b,pressure.h,'stabilize');assert.equal(pressure.o.pressure,5);
 const relay=setup('signal');relay.o.calibration={kind:'relay',charges:1};act(relay.b,relay.h,'disable');assert.equal(relay.o.replyWindow,true);assert.equal(relay.o.progress,1);relay.e.x=relay.o.asset.x+1;relay.e.y=relay.o.asset.y;const intent=objectiveEnemyIntent(relay.b,relay.e);executeObjectiveIntent(relay.b,relay.e,intent);assert.equal(relay.o.progress,1);assert.equal(relay.o.replyWindow,false);executeObjectiveIntent(relay.b,relay.e,{...intent});assert.equal(relay.o.progress,0);
 const bad=structuredClone(relay.o);bad.calibration={kind:'pressure',charges:2};assert.equal(validObjective(bad),false);
});
