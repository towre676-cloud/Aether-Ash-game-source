import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {ORIGINS} from '../origin-content.js';
import {findPath} from '../navigation.js';
import {composeOpening,expandAuthoredOpenings,OPENING_COMPOSITION_VERSION} from '../authored-openings.js';
const fresh=()=>new World(source);
const geometry=scene=>({floor:scene.floor,doors:scene.doors,objects:scene.objects,arrive:scene.arrive,location:scene.location,household:scene.household});
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

test('authored opening composition preserves every walking cell, story marker, threshold and save identity',()=>{
 const w=fresh(),before=w.data.scenes.map(s=>JSON.stringify(geometry(s)));
 expandAuthoredOpenings(w.data);
 assert.deepEqual(w.data.scenes.map(s=>JSON.stringify(geometry(s))),before);
 const once=JSON.stringify(w.data.scenes.map(s=>s.authoredOpening));expandAuthoredOpenings(w.data);
 assert.equal(JSON.stringify(w.data.scenes.map(s=>s.authoredOpening)),once);
});
test('all fourteen playable memories and the first chapter route receive distinct authored direction',()=>{
 const w=fresh();expandAuthoredOpenings(w.data);
 const signatures=[];
 for(const origin of ORIGINS)for(const part of [0,1]){
  const scene=w.scenes.get(origin.location+part),plan=scene.authoredOpening;
  assert.equal(plan.version,OPENING_COMPOSITION_VERSION,origin.id);
  assert.equal(plan.role,'remembered-life');
  assert.ok(plan.approach.length>1,origin.id+' approach');
  assert.ok(plan.stops.length>=3,origin.id+' semantic stops');
  assert.equal(plan.indoor,!!scene.originIndoor);
  assert.ok(plan.landmark||plan.clusters.length,origin.id+' visible composition');
  if(part===1)signatures.push(plan.landmark?.kind);
 }
 assert.equal(new Set(signatures).size,7);
 for(const key of ['home','town','workshop','security','console']){
  const scene=w.data.scenes.find(s=>s.chapter===1&&s.key===key);assert.ok(scene.authoredOpening,key);
 }
});
test('every approach remains contiguous on walkable ground and leads to existing reachable interactions',()=>{
 const w=fresh();expandAuthoredOpenings(w.data);
 for(const scene of w.data.scenes.filter(s=>s.authoredOpening)){
  const plan=scene.authoredOpening;
  for(let i=0;i<plan.approach.length;i++){
   const p=plan.approach[i];assert.equal(scene.floor[Math.floor(p[1])]?.[Math.floor(p[0])],'.',scene.key+' path on floor');
   if(i)assert.ok(dist(p,plan.approach[i-1])<=1.01,scene.key+' contiguous trail');
  }
  for(const stop of plan.stops){const route=findPath(scene,plan.arrival,stop.xy.map(v=>v-.5),1);assert.ok(route.length||dist(plan.arrival,stop.xy)<2,scene.key+' reachable stop');}
 }
});
test('scenic props stay on blocked boundary ground away from arrival, doors and interactions',()=>{
 const w=fresh();expandAuthoredOpenings(w.data);
 for(const s of w.data.scenes.filter(s=>s.authoredOpening)){
  const plan=s.authoredOpening,protectedPoints=[plan.arrival,...s.objects.filter(o=>o.xy&&o.type!=='furnishing').map(o=>o.xy.map(v=>v+.5)),...s.doors.map(o=>o.xy.map(v=>v+.5))];
  for(const p of [...plan.clusters.map(c=>[c.x,c.y]),...(plan.landmark?[plan.landmark.xy]:[])]){
   assert.notEqual(s.floor[Math.floor(p[1])]?.[Math.floor(p[0])],'.',s.key+' prop occupies walking cell');
   for(const q of protectedPoints)assert.ok(dist(p,q)>=plan.quietRadius-.001,s.key+' protected interaction');
  }
  assert.ok(plan.clusters.length<=16);
 }
});
test('composition is deterministic and leaves later chapters untouched',()=>{
 const w=fresh();assert.deepEqual(composeOpening(w.scenes.get(50001)),composeOpening(w.scenes.get(50001)));
 const later=w.data.scenes.find(s=>s.chapter>1&&!s.originId&&!Number.isInteger(s.fieldOrigin));assert.equal(composeOpening(later),null);
});
