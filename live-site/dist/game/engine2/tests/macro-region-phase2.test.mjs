import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {findPath} from '../navigation.js';
import {frontierFloorPlan541} from '../frontier-authoring-541.js';
import {broadenMainline} from '../mainline-courts.mjs';
import {validateExploration} from '../exploration-investigations.js';

const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
const id=p=>p.join(',');
function component(scene){
 const grid=scene.floor,root=scene.arrive;
 if(grid[root[1]]?.[root[0]]!=='.')return new Set();
 const queue=[root],seen=new Set([id(root)]);
 for(let i=0;i<queue.length;i++)for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
  const p=[queue[i][0]+dx,queue[i][1]+dy],k=id(p);
  if(grid[p[1]]?.[p[0]]==='.'&&!seen.has(k)){seen.add(k);queue.push(p);}
 }
 return seen;
}
const world=new World(source);

test('all 60 native frontier environments have true outdoor expansion, without moving commission stations',()=>{
 const areas=world.data.scenes.filter(s=>s.location>=2000&&s.location<2060);
 assert.equal(areas.length,60);
 const coords=[[4,23],[6,22],[8,23],[10,8],[24,7],[25,20],[27,20],[4,13],[29,13]];
 let originalReach=0,expandedReach=0;
 for(const s of areas){
  const n=s.location-2000,base=frontierFloorPlan541(Math.floor(n/5),n%5),ext=s.spatialExpansion;
  assert.equal(ext?.version,1,'expanded '+s.location);
  assert.ok(s.width>=96&&s.height>=90,'frontier no longer a 34x28 pocket');
  assert.deepEqual(s.arrive,[4,23]);assert.equal(s.frontierAuthoring541.version,1);
  const actual=component(s),old=component({...base,arrive:[4,23]});
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++)if(base.floor[y][x]==='.'){
   assert.equal(s.floor[y][x],'.','lost original walkable '+s.location);
   assert.equal(actual.has(id([x,y])),old.has(id([x,y])),'bridged originally closed objective '+s.location);
  }
  for(const point of coords)assert.ok(actual.has(id(point)),'original commission anchor blocked '+s.location+' '+point);
  for(const mark of ext.landmarks)assert.ok(actual.has(id(mark.xy)),'new lookout unreachable '+s.location+' '+mark.name);
  assert.ok(ext.walkableAfter>=ext.walkableBefore+750);
  for(const o of s.objects.filter(o=>o.type==='frontier-landmark'||o.type==='portal'||o.type==='camp'||o.type==='frontier-board'))assert.ok(actual.has(id(o.xy)));
  originalReach+=old.size;expandedReach+=actual.size;
 }
 assert.ok(expandedReach>originalReach*5,'true enormous reachable frontier increase');
});

test('seven borrowed trial origins expand with unchanged start, borrowed-kit creatures and exit',()=>{
 const originScenes=world.data.scenes.filter(s=>s.location>=4700&&s.location<4707);
 assert.equal(originScenes.length,7);
 for(const s of originScenes){
  const reachable=component(s);
  assert.ok(s.spatialExpansion?.version===1&&s.width>=96&&s.height>=90,'large origin '+s.location);
  assert.deepEqual(s.arrive,[9,22]);
  for(const o of s.objects)if(o.xy)assert.ok(reachable.has(id(o.xy)),s.location+' must retain '+o.label);
  for(const l of s.spatialExpansion.landmarks)assert.ok(reachable.has(id(l.xy)));
 }
});

test('frontier expansion uses context-rich repeatable observations, not unbounded save records',()=>{
 const areas=world.data.scenes.filter(s=>s.location>=2000&&s.location<2060);
 const clues=areas.flatMap(s=>s.objects.filter(o=>o.exploreId?.startsWith('vast:')));
 const views=areas.flatMap(s=>s.objects.filter(o=>o.type==='furnishing'&&s.spatialExpansion.landmarks.some(l=>o.label?.includes(l.name))));
 assert.equal(clues.length,0,'60 areas must not overfill a 256-entry discovery ledger');
 assert.equal(views.length,240,'four readable places per frontier area');
 for(const v of views)assert.ok(v.text.length>120,'specific physical / region context, not empty set dressing');
 const ledger={version:1,found:[],solved:[],seen:[],relics:[]};
 assert.doesNotThrow(()=>validateExploration({exploration:ledger}));
});

test('mandatory routes grow wider, yet original gated components and story coordinates are preserved',()=>{
 const original=structuredClone(source),composed=broadenMainline(structuredClone(source));
 let count=0,area=0;
 for(const old of original.scenes){
  const s=composed.scenes.find(x=>x.location===old.location);
  if(!s.mainlineCourts)continue;
  count++;area+=s.mainlineCourts.addedFloor;
  const before=component(old),after=component(s);
  assert.ok(s.mainlineCourts.addedFloor>=6);
  assert.ok(after.size>before.size);
  assert.deepEqual(s.arrive,old.arrive);
  assert.deepEqual(s.objects,old.objects);
  assert.deepEqual(s.doors,old.doors);
  for(let y=0;y<old.height;y++)for(let x=0;x<old.width;x++)if(old.floor[y][x]==='.'){
   assert.equal(s.floor[y][x],'.');
   assert.equal(after.has(id([x,y])),before.has(id([x,y])),'no bypass of original closed component in '+old.location);
  }
  for(const c of s.mainlineCourts.centers)assert.ok(after.has(id(c)));
 }
 assert.ok(count>=1,'at least one existing mainline broadened');
 assert.ok(area>=20,'detectably wider, not just one tile');
 const once=JSON.stringify(composed);broadenMainline(composed);assert.equal(JSON.stringify(composed),once);
});

test('saved path in a remote new frontier area survives full World restore without re-basing',()=>{
 const s=world.scenes.get(2000),target=s.spatialExpansion.landmarks.at(-1).xy;
 assert.ok(findPath(s,s.arrive,target,1).length>10);
 const first=new World(source);
 first.state.scene=2000;first.state.mode='field';first.state.chapter=20;
 first.state.x=target[0]+.5;first.state.y=target[1]+.5;
 const save=first.save(),restored=new World(source);restored.restore(save);
 assert.equal(restored.state.scene,2000);
 assert.deepEqual([restored.state.x,restored.state.y],[target[0]+.5,target[1]+.5]);
 assert.equal(restored.walkable(restored.state.x,restored.state.y),true);
 assert.ok(restored.scenes.get(2000).spatialExpansion);
});
