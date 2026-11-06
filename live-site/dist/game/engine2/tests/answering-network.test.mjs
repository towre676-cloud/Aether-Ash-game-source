import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {NETWORK_WORKS,migrateAnsweringNetwork,validateAnsweringNetwork,networkEvidence,networkObjects,networkObjective,networkDone,networkInteraction,networkPrepareEncounter,networkSceneView} from '../answering-network.js';
import {createQuestGuide,interactionPath} from '../quest-navigation.js';
import {resolveGuidedObjective} from '../guided-objective.js';
import {setAssistanceMode,guidanceDestinations} from '../quest-assistance.js';
import {validateSave} from '../save-validation.js';
import {createDevSession} from '../dev-session.js';
import {drawNetworkObject,drawNetworkConnections} from '../network-render.js';

const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
function setup(chapter=4,{ready=true,entry=false}={}){
 let dialog=null,dialogCount=0;const notices=[],sounds=[],events=[];
 const w=new World(data,{onDialog:d=>{dialog=d;dialogCount++;},onNotice:n=>notices.push(n),onMusic:m=>sounds.push(m)});
 const drain=()=>{for(let i=0;dialog&&i<100;i++){const d=dialog;dialog=null;if(d.choices)d.choices[0].action();else d.after?.();}assert.equal(dialog,null);};
 drain();w.state.chapter=chapter;w.state.bosses=Array.from({length:chapter-1},(_,i)=>i+1);
 const def=NETWORK_WORKS.find(d=>d.chapter===chapter);if(ready)w.setBit(...def.requires);
 w.loadScene(entry?w.data.campaign.missions[chapter-1].rooms[0].location:def.scene);drain();
 w.callbacks.onExploration=e=>events.push(e);setAssistanceMode(w.state,'full');
 return {w,def,drain,notices,sounds,events,get dialogCount(){return dialogCount;}};
}
function use(h,id){
 const {w}=h,o=networkObjects(w).find(o=>o.networkId===id);assert.ok(o,'known network site '+id);
 const route=interactionPath(w.scene,[w.state.x,w.state.y],o);assert.notEqual(route,null,'reachable site '+id);
 for(const [x,y]of route)w.move(x-w.state.x,y-w.state.y);
 w.interact(o);h.drain();return o;
}
function finish(h){
 for(let i=0;i<12;i++){
  const goal=networkObjective(h.w);if(!goal)return;
  if(h.w.state.scene!==goal.targetScene){h.w.loadScene(goal.targetScene);h.drain();}
  use(h,goal.targetObject.networkId);
 }
 assert.fail('work did not settle');
}

test('legacy migration recognizes established seed heat without inventing discoveries, tests or item spends',()=>{
 const old={bosses:[1,2,3,4,5,6,7,8],items:{ether:2},gold:14};
 assert.equal(validateAnsweringNetwork(old),true);assert.equal(old.answeringNetwork,undefined);
 assert.equal(networkEvidence(old).heatIndependent,true);assert.equal(old.answeringNetwork,undefined,'read-only evidence stays read-only');
 const first=migrateAnsweringNetwork(old);assert.deepEqual(first,{version:1,works:['root-installed','heat-diverted','heat-independent'],heard:['heat-established']});
 assert.equal(migrateAnsweringNetwork(old),first);assert.deepEqual(old.items,{ether:2});assert.equal(old.gold,14);
 assert.deepEqual(networkEvidence(old).works,['heat-independent']);assert.equal(validateAnsweringNetwork(old),true);
 const fresh={bosses:[1,2,3,4,5,6,7]};migrateAnsweringNetwork(fresh);fresh.bosses.push(8);
 assert.equal(networkEvidence(fresh).heatIndependent,false,'existing new ledger is never backfilled from a bypassed victory');
});

test('save validation rejects forged proofs, impossible sequences, duplicate and unknown ledger entries',()=>{
 const cases=[
  {version:2,works:[],heard:[]},
  {version:1,works:['unknown'],heard:[]},
  {version:1,works:['chapel-inspected','chapel-inspected'],heard:[]},
  {version:1,works:['heat-independent'],heard:['heat-answer']},
  {version:1,works:['chapel-inspected','chapel-return'],heard:[]},
  {version:1,works:['water-opened','water-return'],heard:['water-west']},
  {version:1,works:['relays-opened'],heard:['relay-low']},
  {version:1,works:['assembly-return'],heard:['assembly-reply']},
  {version:1,works:[],heard:[],score:5},
  {version:1,works:['root-installed','heat-diverted','heat-independent'],heard:['heat-established']}
 ];
 for(const answeringNetwork of cases)assert.throws(()=>validateAnsweringNetwork({bosses:[],answeringNetwork}));
 assert.equal(validateAnsweringNetwork({answeringNetwork:{version:1,works:[],heard:[]}}),true);
});

test('all nine device sites are reachable on the real furnished floors and available in destination guidance',()=>{
 let count=0;
 for(const def of NETWORK_WORKS){
  const {w}=setup(def.chapter);const objects=networkObjects(w);
  assert.ok(objects.length);assert.deepEqual(networkObjects(w),objects,'stable positions and stage keys');
  for(const o of objects){
   count++;assert.equal(w.scene.floor[o.xy[1]][o.xy[0]],'.');
   assert.notEqual(interactionPath(w.scene,[w.state.x,w.state.y],o),null);
   assert.ok(w.objects().some(p=>p.networkId===o.networkId));
   assert.ok(guidanceDestinations(w).some(p=>p.object.networkId===o.networkId));
   for(const n of w.scene.objects.filter(n=>n.xy&&n.type!=='furnishing'))assert.ok(Math.hypot(n.xy[0]-o.xy[0],n.xy[1]-o.xy[1])>=2.15,'keeps native interaction clear');
  }
 }
 assert.equal(count,9);
});

test('native chapter prerequisites remain real work and optional proofs do not force a return after victory',()=>{
 for(const def of NETWORK_WORKS){
  const h=setup(def.chapter,{ready:false}),{w}=h;
  assert.equal(networkObjective(w),null);
  use(h,networkObjects(w)[0].networkId);assert.deepEqual(w.state.answeringNetwork.works,[]);
  assert.ok(h.notices.length,'a physical inspection explains the native dependency');
  w.setBit(...def.requires);assert.ok(networkObjective(w));
  w.state.bosses.push(def.chapter);assert.equal(networkObjective(w),null);
 }
});

test('five complete works run through the integrated full-assistance resolver, checked walking paths and World.interact',()=>{
 for(const def of NETWORK_WORKS){
  const h=setup(def.chapter,{entry:true}),{w}=h,before=JSON.stringify({items:w.state.items,gold:w.state.gold}),moves=[];
  const move=w.move.bind(w);w.move=(dx,dy)=>{move(dx,dy);if(Math.hypot(dx,dy)>0)moves.push([w.state.x,w.state.y]);};
  const guide=createQuestGuide(w,{resolve:()=>resolveGuidedObjective(w)});w.callbacks.onScene=()=>guide.sceneChanged();guide.start();
  let ticks=0;for(;ticks<3000&&!networkEvidence(w.state).works.includes(def.id);ticks++){guide.update(1/30);h.drain();assert.equal(w.currentBattle,null);}
  assert.ok(ticks<3000,def.id+' guide finishes');assert.ok(moves.length>20,'actual resolved walking occurred');
  assert.equal(networkEvidence(w.state).works.includes(def.id),true);
  assert.ok(h.events.filter(e=>e.type==='network-work').length>=2,'staged changes are separate interactions');
  assert.equal(JSON.stringify({items:w.state.items,gold:w.state.gold}),before,'no additional item or money grind');
  assert.equal(validateAnsweringNetwork(w.state),true);guide.cancel();
 }
});

test('remote, wrong-scene, forged-stage and stale object attempts cannot finish a physical proof',()=>{
 const h=setup(),{w}=h,original=networkObjects(w)[0];
 assert.equal(networkInteraction(w,original),true);assert.deepEqual(w.state.answeringNetwork.works,[],'arrival is out of reach');
 const route=interactionPath(w.scene,[w.state.x,w.state.y],original);for(const [x,y]of route)w.move(x-w.state.x,y-w.state.y);
 networkInteraction(w,{...original,networkStage:'chapel-return'});assert.deepEqual(w.state.answeringNetwork.works,[]);
 networkInteraction(w,{...original,xy:[1,1]});assert.deepEqual(w.state.answeringNetwork.works,[]);
 w.interact(original);assert.deepEqual(w.state.answeringNetwork.works,['chapel-inspected']);
 w.interact(original);assert.deepEqual(w.state.answeringNetwork.works,['chapel-inspected'],'stale first-stage input cannot perform stage two');
 const next=networkObjects(w)[0];w.state.mode='battle';networkInteraction(w,next);assert.equal(networkEvidence(w.state).chapelReturn,false);w.state.mode='field';
 w.state.scene=125;networkInteraction(w,next);assert.equal(networkEvidence(w.state).chapelReturn,false);
 assert.equal(networkInteraction(w,{type:'npc'}),false);
});

test('chapel discovery changes the in-world diagram and returns a finite answer without opening a dialogue',()=>{
 const h=setup(),before=h.dialogCount;use(h,'chapel-diagram');
 assert.equal(networkSceneView(h.w).sites[0].networkStage,'chapel-return');assert.deepEqual(networkSceneView(h.w).works,[]);
 use(h,'chapel-diagram');assert.equal(h.dialogCount,before);
 assert.equal(networkDone(h.w,networkObjects(h.w)[0]),true);
 assert.deepEqual(networkSceneView(h.w).works.map(w=>w.id),['chapel-return']);
 assert.equal(h.sounds.filter(s=>s==='network:reply:chapel-return').length,1);
 const n=h.sounds.length;use(h,'chapel-diagram');assert.equal(h.sounds.length,n,'repeat inspection does not retrigger completion');
});

test('chapter-eight encounter is blocked until root, diversion and collector isolation have all happened',()=>{
 const h=setup(8),{w}=h,boss=w.scenes.get(295).objects.find(o=>o.type==='boss');
 w.setBit(8323575,4);w.loadScene(295);h.drain();
 assert.equal(networkPrepareEncounter(w,boss).allowed,false);assert.ok(networkPrepareEncounter(w,boss).goal?.object,'gate supplies a routed way back');
 w.interact(boss);assert.equal(w.currentBattle,null,'real World boss interaction observes the gate');
 w.loadScene(294);h.drain();use(h,'heat-gauge');assert.deepEqual(w.state.answeringNetwork.works,[]);
 use(h,'heat-diverter');assert.deepEqual(w.state.answeringNetwork.works,[]);
 use(h,'root-cradle');assert.equal(networkSceneView(w).heatOn,false);
 use(h,'heat-diverter');assert.equal(networkSceneView(w).heatOn,true);assert.equal(networkSceneView(w).collectorIndependent,false);
 use(h,'heat-gauge');assert.equal(networkSceneView(w).heatOn,true);assert.equal(networkSceneView(w).collectorIndependent,true);
 w.loadScene(295);h.drain();assert.equal(networkPrepareEncounter(w,boss).allowed,true);
 w.interact(boss);assert.equal(w.currentBattle?.object.type,'boss');
});

test('both water readings are necessary, can be taken in either order, and remain separate public evidence',()=>{
 for(const order of [['water-west','water-east'],['water-east','water-west']]){
  const h=setup(11);use(h,order[0]);assert.deepEqual(h.w.state.answeringNetwork.heard,[]);
  use(h,'water-bleed');use(h,order[0]);assert.equal(networkEvidence(h.w.state).waterReturn,false);
  use(h,order[1]);assert.equal(networkEvidence(h.w.state).waterReturn,true);
  assert.deepEqual([...h.w.state.answeringNetwork.heard].sort(),['water-east','water-west']);
  assert.equal(h.sounds.filter(s=>s==='network:reply:water-return').length,1);
 }
});

test('relay replies stay distinct, while the assembly board records only actual earlier proof',()=>{
 const relay=setup(16);finish(relay);assert.deepEqual(networkSceneView(relay.w).relayRegisters,[0,2,1]);
 assert.deepEqual(relay.w.state.answeringNetwork.heard,['relay-low','relay-high','relay-middle']);
 const assembly=setup(23);finish(assembly);assert.deepEqual(networkEvidence(assembly.w.state).works,['assembly-return']);
 assert.equal(networkSceneView(assembly.w).assemblyReady,true);assert.equal(networkEvidence(assembly.w.state).heatIndependent,false);
});

test('new network state survives save validation/restoration and old cleared saves keep their established heat',()=>{
 const h=setup(11);finish(h);const validated=validateSave(data,{schema:'ash-aether.enhanced-save/1',world:h.w.state});
 const clone=setup(4);clone.w.restore(validated.world);assert.deepEqual(clone.w.state.answeringNetwork,h.w.state.answeringNetwork);
 const old=JSON.parse(JSON.stringify(validated.world));delete old.answeringNetwork;const resources=JSON.stringify(old.items);
 const normalized=validateSave(data,{schema:'ash-aether.enhanced-save/1',world:old});clone.w.restore(normalized.world);
 assert.deepEqual(networkEvidence(clone.w.state).works,['heat-independent']);assert.deepEqual(clone.w.state.answeringNetwork.heard,['heat-established']);
 assert.equal(JSON.stringify(clone.w.state.items),resources);
});

test('developer arrival/boss fixtures perform authored work at the correct point for both civic branches',()=>{
 for(const branch of [0,1])for(const chapter of [4,8,11,16,23]){
  const arrival=createDevSession(data,{chapter,stage:'arrival',branch}).save.world;
  const boss=createDevSession(data,{chapter,stage:'boss',branch}).save.world;
  const id=NETWORK_WORKS.find(d=>d.chapter===chapter).id;
  assert.equal(networkEvidence(arrival).works.includes(id),false,'arrival has not pre-solved '+id);
  assert.equal(networkEvidence(boss).works.includes(id),true,'boss fixture actually performed '+id);
  assert.equal(validateAnsweringNetwork(boss),true);
 }
});

test('local completed reply motifs are bounded, distinct and absent before work',()=>{
 assert.equal(new Set(NETWORK_WORKS.map(d=>d.motif.join(','))).size,5);
 for(const def of NETWORK_WORKS){
  assert.equal(def.motif.length,3);assert.ok(def.motif.every(n=>Number.isInteger(n)&&n>=0&&n<=2));
  const h=setup(def.chapter);assert.deepEqual(networkSceneView(h.w).works,[]);finish(h);
  const [work]=networkSceneView(h.w).works;assert.equal(work.id,def.id);assert.deepEqual(work.motif,def.motif);
  h.w.state.scene=2;assert.deepEqual(networkSceneView(h.w).works,[],'no reply leaks into unrelated rooms');
 }
});

function canvasRecorder(){
 const calls=[],target={calls};return new Proxy(target,{get(o,key){if(key==='getImageData'||key==='putImageData')throw Error('Pixel readback forbidden');if(key in o)return o[key];return(...args)=>{for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),String(key)+' uses finite geometry');calls.push([key,...args]);};},set(o,key,value){if(key==='filter')throw Error('Graphics filter forbidden');o[key]=value;return true;}});
}
test('compatibility drawings need no filter/readback and reduced motion keeps static evidence without traveling pulses',()=>{
 for(const def of NETWORK_WORKS){
  const h=setup(def.chapter);finish(h);const ctx=canvasRecorder(),renderer={ctx,assets:{},compatibility:true};
  for(const o of networkObjects(h.w))assert.equal(drawNetworkObject(renderer,h.w,o),true);
  drawNetworkConnections(ctx,h.w,48,NaN,{steady:true});
  assert.ok(ctx.calls.length>0);
 }
 const heat=setup(8);finish(heat);const steady=canvasRecorder(),moving=canvasRecorder();
 drawNetworkConnections(steady,heat.w,48,2,{steady:true});drawNetworkConnections(moving,heat.w,48,2,{steady:false});
 assert.equal(steady.calls.filter(c=>c[0]==='arc').length,0);assert.equal(moving.calls.filter(c=>c[0]==='arc').length,2);
});
