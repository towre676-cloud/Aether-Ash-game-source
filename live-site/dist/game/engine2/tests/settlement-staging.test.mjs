import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {installTownLife,lifeState} from '../townlife.js';
import {installRegionalLife} from '../regional-life.js';
import {installTrailLife} from '../reconciled-travel.js';
import {HOUSEHOLDS} from '../townlife-content.js';
import {REGIONS} from '../regional-content.js';
import {activityThreatPoints} from '../activity-sites.js';
import {npcRoute} from '../npc-routines.js';

const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
function setup(){const w=new World(data);installTrailLife(w);installTownLife(w);installRegionalLife(w);return w;}
function enter(w,id){w.state.scene=id;w.state.chapter=24;w.state.mode='field';[w.state.x,w.state.y]=w.scene.arrive.map(n=>n+.5);return w.objects();}

test('Cinderfall professions start beside their native workplace instead of map quantiles',()=>{
 const w=setup();lifeState(w.state).minutes=480;const scene=w.scenes.get(5),before=JSON.stringify([scene.floor,scene.objects,scene.doors]);
 const people=enter(w,5).filter(o=>o.lifeKind==='resident'),workplaces={Elsa:'inn',Tomas:'carpenter',Pip:'guild'};
 assert.equal(people.length,3);
 for(const o of people){const door=scene.exteriorBuildings.find(b=>b.exit.to===workplaces[o.name]).exit.xy;assert.ok(Math.hypot(o.xy[0]-door[0],o.xy[1]-door[1])<=6,o.name+' works beside '+workplaces[o.name]);}
 assert.equal(JSON.stringify([scene.floor,scene.objects,scene.doors]),before);
});

test('all household pets retain local home routines and never take quantile trips across a room',()=>{
 const w=setup();let pets=0;
 for(const family of HOUSEHOLDS){const objects=enter(w,family.scene),before=w.scene.floor.slice();for(const o of objects.filter(o=>['dog','cat','cow'].includes(o.lifeKind))){pets++;for(const p of o.anchors){assert.ok(Math.hypot(p[0]-o.xy[0],p[1]-o.xy[1])<=3.51,family.id+' '+o.lifeKind+' leaves its household');assert.equal(w.scene.floor[p[1]]?.[p[0]],'.');}}assert.deepEqual(w.scene.floor,before);}
 assert.equal(pets,25);
});

test('all24 regional work sites keep their plant, wildlife and native repair outcomes',()=>{
 const w=setup();
 for(const region of REGIONS){const original=JSON.stringify([w.scenes.get(region.scene).floor,w.scenes.get(region.scene).objects,w.state.flags]),objects=enter(w,region.scene).filter(o=>o.regional);for(const kind of ['project','herb','fauna'])assert.equal(objects.filter(o=>o.lifeKind===kind).length,1,region.chapter+' '+kind);assert.equal(JSON.stringify([w.scene.floor,w.scene.objects,w.state.flags]),original);}
});

test('a public stable stays away from a native no-pack-xy patrol and is absent from remembered lives',()=>{
 const w=setup(),scene=w.scenes.get(73),before=JSON.stringify([scene.floor,scene.objects,scene.doors]),objects=enter(w,73),stable=objects.find(o=>o.trailService),threats=activityThreatPoints(scene);
 assert.ok(stable);assert.ok(threats.some(p=>p[0]===45&&p[1]===40));assert.ok(threats.every(p=>Math.hypot(p[0]-stable.xy[0],p[1]-stable.xy[1])>=7));assert.equal(JSON.stringify([scene.floor,scene.objects,scene.doors]),before);
 for(const scene of w.scenes.values())if(scene.originId){enter(w,scene.location);assert.equal(w.objects().some(o=>o.trailService),false,scene.originId+' has no present-day public stable');}
 enter(w,5);assert.ok(w.trailLife.service);const old=w.state.chronicle;w.state.chronicle={...old,phase:'past'};assert.equal(w.trailLife.service,null,'a cached present-day service cannot leak into a past phase');w.state.chronicle=old;
});

test('resident routes detour around individual hostile spawns without editing player collision',()=>{
 const floor=Array.from({length:21},(_,y)=>y===0||y===20?'#'.repeat(31):'#'+'.'.repeat(29)+'#'),scene={width:31,height:21,arrive:[2,10],key:'field',objects:[{type:'patrol',enemies:[[0,[15,10]]]}],doors:[],floor},person={type:'npc',life:true,lifeKind:'resident',xy:[3,10]},before=JSON.stringify(scene);
 const route=npcRoute(scene,person,[27,10],[person]);assert.ok(route.length);assert.ok(route.every(p=>Math.hypot(p[0]-.5-15,p[1]-.5-10)>=4));assert.equal(JSON.stringify(scene),before);
});
