import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {findPath} from '../navigation.js';
import {installEmbodiedOrigins} from '../embodied-origins.js';
import {applyObservatoryLayout,migrateObservatoryPosition,observatoryOpeningPlan} from '../observatory-layout.js';

const clone=v=>JSON.parse(JSON.stringify(v));
function fresh(){const w=new World(source);w.newGame({originId:'veyr-storm'});w.state.mode='field';return w;}
const open=(s,p)=>s.floor[Math.floor(p[1])]?.[Math.floor(p[0])]==='.';

test('the two observatory terraces replace the campaign maze with compact connected authored space',()=>{
 const w=fresh();
 for(const[id,width,height]of[[50012,20,24],[50013,18,20]]){
  const s=w.scenes.get(id),o=s.observatory;assert.equal(s.width,width);assert.equal(s.height,height);assert.equal(o.schema,1);
  assert.ok(s.floor.every(row=>row.length===width));assert.equal(s.floor.length,height);
  const cells=[];for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++)if(s.floor[y][x]==='.'&&!(s.affordanceBlocked||[]).some(p=>p[0]===x&&p[1]===y))cells.push([x,y]);
  assert.ok(cells.length<220,'no oversized empty play plane');
  for(const p of cells)assert.ok(findPath(s,s.arrive.map(v=>v+.5),p,0).length||p.every((v,i)=>v===s.arrive[i]),'all floor belongs to the arrival component');
  for(const obj of s.objects){assert.equal(obj.originId,'veyr-storm');assert.ok(open(s,obj.xy),'every original narrative station is on real floor');assert.ok(findPath(s,s.arrive.map(v=>v+.5),obj.xy,1).length||Math.hypot(s.arrive[0]-obj.xy[0],s.arrive[1]-obj.xy[1])<=1.01,'native station is reachable or already within use range: '+obj.observatoryRole);}
  const r=o.mast;for(let z=r.z;z<r.z+r.d;z++)for(let x=r.x;x<r.x+r.w;x++)assert.equal(s.floor[z][x],'#','visible mast foundation has matching collision');
  assert.equal(s.household,undefined);assert.equal(s.exteriorBuildings?.length||0,0,'the building registry must not reintroduce old exterior parcels');
 }
});

test('each physical interaction and both civic decisions have a reachable native control in the rebuilt space',()=>{
 const w=fresh(),controller=installEmbodiedOrigins(w);
 for(let step=0;step<=4;step++){
  w.state.chronicle.step=step;w.state.chronicle.choices={repair:0};
  if(step>=1)w.state.embodiedOrigins={schema:'ash-aether.embodied-origins/1',origins:{'veyr-storm':{receiver:true,witnessed:true,grounded:step>=2}}};
  w.loadScene(step<2?50012:50013);w.state.mode='field';
  const controls=controller.objects();assert.ok(controls.length,'step '+step+' physical controls');
  for(const o of controls){assert.ok(open(w.scene,o.xy),o.label+' native floor');assert.ok(findPath(w.scene,[w.state.x,w.state.y],o.xy,1).length||Math.hypot(w.state.x-o.xy[0]-.5,w.state.y-o.xy[1]-.5)<2.3);}
  if(step===3){assert.equal(controls.length,2);assert.notDeepEqual(controls[0].xy,controls[1].xy);}
 }
});

test('explicit mast composition remains deterministic and the generic opening pass keeps the same routes',()=>{
 const w=fresh();for(const id of[50012,50013]){
  const s=w.scenes.get(id),before=clone(s.authoredOpening),plan=observatoryOpeningPlan(s);
  assert.deepEqual(plan,before);assert.ok(plan.stops.length>=3);assert.deepEqual(plan.clusters,[]);
  assert.deepEqual(plan.landmark.xy,[s.observatory.mast.x+1.5,s.observatory.mast.z+1.5]);
  for(let i=0;i<plan.approach.length;i++){assert.ok(open(s,plan.approach[i]));if(i)assert.ok(Math.hypot(plan.approach[i][0]-plan.approach[i-1][0],plan.approach[i][1]-plan.approach[i-1][1])<=1.01);}
 }
});

test('legacy coordinates migrate once by real story phase without altering progress, resources or battle payload',()=>{
 const w=fresh();
 for(const part of[0,1])for(let step=0;step<=4;step++){
  const state=clone(w.state);state.scene=50012+part;state.x=part?7.5:54.5;state.y=part?20.5:28.5;delete state.observatoryLayoutVersion;
  state.chronicle.step=step;state.chronicle.choices={repair:1,approach:'diversion',destiny:1};state.gold=321;state.items.ether=8;state.battle={actor:{x:7.5,y:20.5},hp:45};
  const before=clone(state),result=migrateObservatoryPosition(state,w.scenes.get(state.scene));assert.equal(result.migrated,true);assert.ok(open(w.scenes.get(state.scene),[state.x,state.y]));
  const normalized=clone(state);normalized.x=before.x;normalized.y=before.y;delete normalized.observatoryLayoutVersion;assert.deepEqual(normalized,before);
  const once=clone(state);assert.equal(migrateObservatoryPosition(state,w.scenes.get(state.scene)).migrated,false);assert.deepEqual(state,once);
 }
});

test('native World restore migrates old Veyr saves and exact compact coordinates roundtrip thereafter',()=>{
 const w=fresh(),legacy=clone(w.state);legacy.scene=50013;legacy.x=7.5;legacy.y=20.5;legacy.chronicle.step=4;legacy.chronicle.choices={repair:1,approach:'diversion',destiny:0};delete legacy.observatoryLayoutVersion;
 w.restore(legacy);assert.equal(w.state.observatoryLayoutVersion,1);assert.deepEqual([w.state.x,w.state.y],[9.5,15.5]);assert.deepEqual(w.state.chronicle.choices,legacy.chronicle.choices);assert.deepEqual(w.state.items,legacy.items);
 w.state.x=12.35;w.state.y=13.7;const saved=w.save();w.restore(saved);assert.deepEqual([w.state.x,w.state.y],[12.35,13.7]);
});

test('other protagonists and scenes are outside the observatory layout and spatial migration',()=>{
 const scene={location:50000,originId:'sable-reed',width:3,height:3,floor:['###','#.#','###'],objects:[]},before=clone(scene);assert.equal(applyObservatoryLayout(scene),scene);assert.deepEqual(scene,before);
 const state={x:3,y:4,items:{ether:2}},saved=clone(state);assert.equal(migrateObservatoryPosition(state,scene).migrated,false);assert.deepEqual(state,saved);
});
