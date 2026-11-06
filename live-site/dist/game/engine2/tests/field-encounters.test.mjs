import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {World} from '../world.js';import {ORIGINS} from '../origin-content.js?v=5.6.0';
import {encounterHabitat,encounterProfile,encounterProtected,advanceEncounters,resetEncounterGrace} from '../field-encounters.js';
const scene=(key='forest',extra={})=>({location:19,key,chapter:1,width:40,height:30,floor:Array(30).fill('.'.repeat(40)),doors:[],objects:[],...extra});
const world=(room=scene(),state={})=>({scene:room,state:{scene:room.location,x:20,y:20,mode:'field',chapter:1,party:[0],...state}});
function travel(w,distance,{step=.1,rng=()=>0,...options}={}){let result=null,moved=0;for(;moved<distance-1e-8&&!result;moved+=step)result=advanceEncounters(w,Math.min(step,distance-moved),{dt:.05,rng,...options});return {result,moved};}

test('first contact arrives after five to nine real danger tiles, independent of movement frame size',()=>{
 for(const [roll,expected]of[[0,5],[.5,7],[1,9]])for(const step of[.05,.2]){
  const w=world();const {result,moved}=travel(w,10,{step,rng:()=>roll});assert.ok(result);assert.ok(Math.abs(moved-expected)<=step+.00001,`${roll}: ${moved}`);assert.equal(result.count,1);assert.equal(result.tier,1);
 }
});
test('outdoors and interiors use longer randomized intervals after a battle',()=>{
 for(const[key,range]of[['forest',[18,32]],['unindexed',[24,40]]])for(const roll of[0,.5,1]){
  const w=world(scene(key));resetEncounterGrace(w,'battle');const p=encounterProfile(w.scene,w.state);assert.deepEqual([p.minTiles,p.maxTiles],range);
  const{result,moved}=travel(w,42,{rng:()=>roll});assert.ok(result);const expected=range[0]+Math.min(roll,1-Number.EPSILON)*(range[1]-range[0]);assert.ok(Math.abs(moved-expected)<.11,`${key}: ${moved}`);
 }
});
test('homes, healing rooms, secret family spaces and frontier sanctuaries remain safe',()=>{
 for(const key of['home','inn','clinic','guild','instrumentworks','market','hub','lowbank_shelter','relief_store','secret_3']){const w=world(scene(key));assert.equal(encounterHabitat(w.scene),null,key);assert.equal(travel(w,100).result,null,key);assert.equal(w.state.fieldEncounters,undefined);}
 assert.equal(encounterHabitat(scene('frontier_storm_4',{biome:{id:'storm'},title:'Storm Peaks · Sanctuary'})),null);
});
test('selected working interiors and ruins have explicit local encounter habitats',()=>{
 for(const[key,habitat]of[['workshop','workshop'],['security','workshop'],['east','archive'],['unindexed','archive'],['manifest_depot','cellar'],['passages','sewer'],['bell_crypt','ruins']])assert.equal(encounterHabitat(scene(key)),habitat,key);
 assert.equal(encounterHabitat(scene('unknown-room',{interior:'cistern'})),'sewer');
 assert.equal(encounterHabitat(scene('unknown-room',{interior:'quarters'})),null);
});
test('all seven actual origin journeys have early danger without converting Mara’s home into a fight room',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),w=new World(data);
 for(const o of ORIGINS){const rooms=w.data.scenes.filter(s=>s.originId===o.id);assert.equal(rooms.length,2);assert.ok(rooms.some(s=>encounterHabitat(s)),o.id);for(const room of rooms.filter(s=>encounterHabitat(s))){const p=encounterProfile(room,{chapter:1});assert.equal(p.minTiles,5);assert.equal(p.maxTiles,9);assert.equal(p.tier,1);let openDanger=false;const sample=world(room);for(let y=0;y<room.height&&!openDanger;y++)for(let x=0;x<room.width;x++){sample.state.x=x+.5;sample.state.y=y+.5;if(room.floor[y][x]==='.'&&!encounterProtected(sample)){openDanger=true;break;}}assert.ok(openDanger,'all danger floor protected in '+room.key);}}
 assert.equal(encounterHabitat(w.scenes.get(50000)),null);assert.equal(encounterHabitat(w.scenes.get(50002)),'wetland');assert.equal(encounterHabitat(w.scenes.get(50010)),'archive');
});
test('standing still, a blocked move, invalid input, and teleports cannot spend encounter distance',()=>{
 const w=world();for(let i=0;i<500;i++)for(const d of[0,NaN,Infinity,-1,2,20])assert.equal(advanceEncounters(w,d,{dt:.05}),null);
 assert.equal(w.state.fieldEncounters,undefined);assert.equal(advanceEncounters(w,.8,{dt:.05}),null);assert.equal(w.state.fieldEncounters,undefined);
 const {result}=travel(w,5.1);assert.ok(result);
});
test('menus, dialogue, battle and cinema modes cannot advance a pending encounter',()=>{
 const w=world();advanceEncounters(w,.1,{rng:()=>0});const before=JSON.stringify(w.state.fieldEncounters);for(const mode of['dialog','battle','cinema','paused']){w.state.mode=mode;assert.equal(travel(w,20).result,null);assert.equal(JSON.stringify(w.state.fieldEncounters),before);}
});
test('door and conversation buffers do not accumulate hidden encounter debt',()=>{
 const room=scene('workshop',{doors:[{xy:[19,19]}],objects:[{type:'npc',xy:[10,10]},{type:'camp',xy:[5,5]}]}),w=world(room,{x:19.5,y:19.5});
 assert.equal(encounterProtected(w),true);assert.equal(travel(w,20).result,null);assert.equal(w.state.fieldEncounters.remaining,null);
 w.state.x=10.5;w.state.y=10.5;assert.equal(encounterProtected(w),true);assert.equal(travel(w,20).result,null);
 w.state.x=20;w.state.y=20;assert.equal(encounterProtected(w),true);w.state.x=23;assert.equal(encounterProtected(w),false);assert.ok(travel(w,5.1).result);
});
test('scene transitions keep the pending budget but grant enough room to step away from a doorway',()=>{
 const w=world();travel(w,4.9);assert.ok(w.state.fieldEncounters.remaining<.2);w.state.scene=20;w.scene=scene('grove',{location:20});resetEncounterGrace(w,'scene');assert.equal(travel(w,2.4).result,null);assert.ok(travel(w,.2).result);
});
test('retreat and defeat grant movement grace and a fresh regular encounter interval',()=>{
 for(const[reason,grace]of[['retreat',10],['defeat',12]]){
  const w=world();assert.ok(travel(w,5.1).result);resetEncounterGrace(w,reason);assert.equal(w.state.fieldEncounters.grace,grace);assert.equal(w.state.fieldEncounters.remaining,null);
  assert.equal(travel(w,grace-1).result,null);assert.ok(travel(w,35).result);assert.equal(w.state.fieldEncounters.serial,2);
 }
});
test('a readable danger warning fires once before each contact, and serializable state resumes exactly',()=>{
 const w=world(),warnings=[];travel(w,3,{onWarning:e=>warnings.push(e)});assert.equal(warnings.length,1);assert.match(warnings[0].text,/nearby/);const restored=world(w.scene,JSON.parse(JSON.stringify(w.state)));
 assert.equal(travel(restored,1.8,{onWarning:e=>warnings.push(e)}).result,null);assert.equal(warnings.length,1);const e=travel(restored,.3,{onWarning:e=>warnings.push(e)}).result;assert.ok(e);assert.equal(e.randomEncounter,true);assert.equal(e.serial,1);assert.ok(Array.isArray(e.enemies));assert.equal(JSON.parse(JSON.stringify(restored.state)).fieldEncounters.serial,1);
});
test('field tier and formation follow story level while every historical origin stays introductory',()=>{
 const w=world(scene('field',{chapter:18}),{chapter:18});const e=travel(w,10,{rng:()=>.9}).result;assert.equal(e.tier,18);assert.equal(e.count,3);
 assert.equal(encounterProfile(scene('origin_test',{chapter:18,originId:'veyr-storm'}),{chapter:18}).tier,1);
});
test('malformed old encounter counters repair locally instead of blocking the game',()=>{
 for(const fieldEncounters of[[],{version:1,serial:-2},{version:1,serial:0,remaining:'bad',grace:Infinity,travelled:null}]){const w=world(scene(),{fieldEncounters});assert.ok(travel(w,10).result);assert.equal(w.state.fieldEncounters.version,1);assert.equal(w.state.fieldEncounters.serial,1);}
});
