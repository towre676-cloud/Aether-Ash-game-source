import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {findPath} from '../navigation.js';
import {SPATIAL_ECOLOGY_VERSION,spatialEcologySites,spatialEcologyObjects,spatialEcologyRecord,spatialEcologySummary,
 spatialEcologyStory,spatialEcologyEncounterPace,discoverSpatialEcology,validateSpatialEcology,interactSpatialEcology} from '../spatial-ecology.mjs';
import {spatialRegionMapModel} from '../spatial-region-map.mjs';
const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
const frozen=v=>JSON.stringify(v);
const world=new World(source);
const positions=(scene)=>scene.spatialExpansion.landmarks;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function setup(id=2000){
 let dialog=null;const notices=[],w=new World(source,{onDialog:d=>dialog=d,onNotice:t=>notices.push(t)});
 w.newGame({quiet:true});w.state.scene=id;w.state.chapter=20;w.state.mode='field';
 const p=w.scene.arrive;w.state.x=p[0]+.5;w.state.y=p[1]+.5;
 return {w,notices,get dialog(){return dialog;},set dialog(v){dialog=v;},
  close(){const old=dialog;dialog=null;old?.after?.();w.state.mode='field';},
  use(o,answer=undefined){
   w.state.x=o.xy[0]+.5;w.state.y=o.xy[1]+.5;w.state.mode='field';
   const original=frozen(w.state);dialog=null;w.interact(o);
   if(answer!==undefined){assert.ok(dialog?.choices,'choice provided at '+o.spatialRole);assert.ok(dialog.choices[answer]);dialog.choices[answer].action();}
   if(dialog?.after)this.close();
   return original;
  }};
}
test('all 127 wide worlds have five distinct purposeful sites on connected floor',()=>{
 const expanded=world.data.scenes.filter(s=>s.spatialExpansion?.version===1);
 assert.equal(expanded.length,127);
 let distinct=0;
 const styles=new Set();
 for(const scene of expanded){
  const sites=spatialEcologySites(scene);
  assert.equal(sites.length,5,'physical ecology programme in '+scene.location);
  assert.deepEqual(sites.map(s=>s.spatialRole),['trace','evidence','work','return','fauna']);
  assert.deepEqual(sites.map(s=>s.spatialIndex),[1,3,5,7,6]);
  assert.equal(new Set(sites.map(o=>o.xy.join(','))).size,5);
  const shortest=s=>findPath(scene,scene.arrive,s.xy,1);
  for(const site of sites){
   assert.equal(scene.floor[site.xy[1]][site.xy[0]],'.',scene.location+' station on traversable ground');
   assert.ok(shortest(site).length>0,scene.location+' '+site.spatialRole+' connected');
   assert.ok(site.label.length>7&&site.siteTitle.length>0);
  }
  for(let i=0;i<4;i++)assert.ok(dist(sites[i].xy,sites[(i+1)%4].xy)>6,'far-separated fieldwork stations, not tiny alcoves');
  const story=spatialEcologyStory(scene);
  assert.ok(story.fauna.length>75&&story.evidence.length>45&&story.clue.length>40);
  styles.add(story.subject);distinct++;
 }
 assert.equal(distinct,127);
 assert.ok(styles.size>=12,'biome-specific rather than copied fieldwork');
});
test('world.objects includes visible stations without changing save state',()=>{
 const {w}=setup(2000),initial=w.save(),objects=spatialEcologyObjects(w);
 assert.equal(objects.length,5);
 assert.equal(objects.filter(o=>o.next).length,1);
 assert.ok(objects.every(o=>o.spatialId.startsWith('eco:2000:')));
 assert.equal(w.save(),initial);
 const actual=w.objects().filter(o=>o.type==='spatial-fieldwork');
 assert.equal(actual.length,5);
 assert.deepEqual(actual.map(o=>o.spatialRole),objects.map(o=>o.spatialRole));
});
test('the four-stage physical investigation requires evidence, rejects bad repairs and gives one bounded final choice',()=>{
 const h=setup(2000),w=h.w,sites=spatialEcologySites(w.scene),first=w.save();
 const [trace,evidence,work,final,fauna]=sites,story=spatialEcologyStory(w.scene),gold=w.state.gold,flags=frozen(w.state.flags),xp=w.state.xp;
 h.use(final);assert.equal(spatialEcologyRecord(w)?.stage||0,0,'cannot skip to reward');
 h.use(work);assert.equal(spatialEcologyRecord(w)?.stage||0,0,'cannot skip diagnosis');
 h.use(trace);assert.equal(spatialEcologyRecord(w).stage,1);
 h.use(evidence);assert.equal(spatialEcologyRecord(w).stage,2);
 const wrong=(story.answer+1)%3;h.use(work,wrong);
 assert.equal(spatialEcologyRecord(w).stage,2,'wrong action is not a success');
 assert.equal(w.state.gold,gold);
 h.use(work,story.answer);assert.equal(spatialEcologyRecord(w).stage,3);
 h.use(fauna);assert.equal(spatialEcologyRecord(w).fauna,true);
 assert.equal(spatialEcologyRecord(w).stage,3,'fauna observation is optional');
 h.use(final,0);
 assert.equal(spatialEcologyRecord(w).choice,'protect');
 assert.equal(spatialEcologyRecord(w).stage,4);
 assert.equal(spatialEcologyEncounterPace(w),.82);
 assert.equal(w.state.gold,gold,'ecology protection grants no free money');
 assert.equal(w.state.xp,xp,'no character XP from walking a narrative route');
 assert.equal(frozen(w.state.flags),flags,'no story flag was borrowed');
 h.use(final);assert.equal(w.state.gold,gold,'no repeatable reward or choice');
 const saved=w.save(),copy=setup(2000).w;copy.restore(saved);
 assert.deepEqual(spatialEcologyRecord(copy),spatialEcologyRecord(w));
 assert.equal(spatialEcologyEncounterPace(copy),.82);
 assert.equal(copy.state.schema,'ash-aether.engine2/1');
 assert.ok(saved.length-first.length<350,'save expansion remains compact, not tile-by-tile');
});
test('alternative salvage path grants only one small payment and no permanent power',()=>{
 const h=setup(2004),w=h.w,stations=spatialEcologySites(w.scene),story=spatialEcologyStory(w.scene);
 const baseline=w.state.gold,heroes=frozen(w.state.heroes);
 h.use(stations[0]);h.use(stations[1]);h.use(stations[2],story.answer);h.use(stations[3],1);
 assert.equal(spatialEcologyRecord(w).choice,'salvage');
 assert.ok(w.state.gold>baseline&&w.state.gold-baseline<=24,'bounded one-time field salvage');
 assert.equal(spatialEcologyEncounterPace(w),1,'salvage does not pacify terrain');
 assert.equal(frozen(w.state.heroes),heroes);
 const after=w.state.gold;h.use(stations[3]);assert.equal(w.state.gold,after);
 w.state.scene=2003;assert.equal(spatialEcologyEncounterPace(w),1,'outcome local to completed scene');
});
test('approach requires physical proximity and movement discovers only nearby atlas cells',()=>{
 const h=setup(2002),w=h.w,sites=spatialEcologySites(w.scene);
 const remote=sites[3];
 w.state.x=w.scene.arrive[0]+.5;w.state.y=w.scene.arrive[1]+.5;
 const before=w.save();const result=interactSpatialEcology(w,remote);
 assert.equal(result,true);
 assert.equal(w.save(),before,'cannot interact remotely without movement');
 const map=spatialRegionMapModel(w);assert.ok(map);
 assert.equal(map.scene,2002);assert.equal(map.points.length,8);
 assert.ok(map.points.some(p=>!p.known),'undiscovered landmarks hidden on the accessible map');
 w.state.x=remote.xy[0]+.5;w.state.y=remote.xy[1]+.5;
 const seen=discoverSpatialEcology(w);
 assert.ok(seen);
 assert.ok(spatialEcologyRecord(w).mask&(1<<7));
 const next=spatialRegionMapModel(w);
 assert.equal(next.points[7].known,true);
 assert.ok(next.points[7].label.length>0&&next.points[7].label!=='Uncharted site');
 assert.equal(next.player.x,w.state.x);
 assert.deepEqual(spatialEcologySummary(w).total,4);
});
test('validate bounded save ledger accepts legitimate entries and rejects corruption',()=>{
 const pristine={version:SPATIAL_ECOLOGY_VERSION,sites:{'2000':{stage:3,choice:null,fauna:true,mask:255},'2060':{stage:4,choice:'salvage',fauna:false,mask:29}}};
 assert.equal(validateSpatialEcology({spatialEcology:pristine}),true);
 const bad=[
  {...pristine,version:2},
  {version:1,sites:{'__proto__':{stage:0,choice:null,fauna:false,mask:0}}},
  {version:1,sites:{'2000':{stage:4,choice:null,fauna:false,mask:255}}},
  {version:1,sites:{'2000':{stage:2,choice:'salvage',fauna:false,mask:255}}},
  {version:1,sites:{'2000':{stage:2,choice:null,fauna:false,mask:256}}},
  {version:1,sites:{'2000':{stage:2,choice:null,fauna:false,mask:0,other:9}}}
 ];
 // JSON.parse creates an own '__proto__' key rather than an object-literal prototype.
 bad[1]={version:1,sites:JSON.parse('{"__proto__":{"stage":0,"choice":null,"fauna":false,"mask":0}}')};
 for(const v of bad)assert.throws(()=>validateSpatialEcology({spatialEcology:v}),/Invalid|exceeds/i);
 assert.equal(validateSpatialEcology({}),true,'older saves remain legal');
 const h=setup(2000),old=JSON.parse(h.w.save());old.spatialEcology=bad[4];
 assert.throws(()=>h.w.restore(old),/Invalid spatial/);
});
test('no chapter quest goals or frontier commissions are replaced by ecological fieldwork',()=>{
 const h=setup(2000),w=h.w;
 const originalObjective=w.objectiveText(),flags=frozen(w.state.flags),goals=w.objects().filter(o=>o.type==='frontier-landmark');
 const sites=spatialEcologySites(w.scene),story=spatialEcologyStory(w.scene);
 h.use(sites[0]);h.use(sites[1]);h.use(sites[2],story.answer);
 assert.equal(w.objectiveText(),originalObjective);
 assert.equal(frozen(w.state.flags),flags);
 assert.equal(w.objects().filter(o=>o.type==='frontier-landmark').length,goals.length);
});
