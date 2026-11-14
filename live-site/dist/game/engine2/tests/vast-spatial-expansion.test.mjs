import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expandVastScenes} from '../vast-spatial-expansion.mjs';

const original=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
const expanded=expandVastScenes(structuredClone(original));
const key=([x,y])=>x+','+y;
function reach(scene){
 const floor=scene.floor,open=(x,y)=>floor[y]?.[x]==='.';
 let start=scene.arrive;
 if(!open(...start)){const cells=[];for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(open(x,y))cells.push([x,y]);cells.sort((a,b)=>Math.abs(a[0]-start[0])+Math.abs(a[1]-start[1])-Math.abs(b[0]-start[0])-Math.abs(b[1]-start[1]));start=cells[0];}
 const seen=new Set([key(start)]),q=[start];
 for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const p=[q[i][0]+dx,q[i][1]+dy],k=key(p);if(open(...p)&&!seen.has(k)){seen.add(k);q.push(p);}}
 return seen;
}
test('60 native scenes grow; intentionally small home and unsafe gateway stay unchanged',()=>{
 const altered=expanded.scenes.filter(s=>s.spatialExpansion?.version===1);
 assert.equal(altered.length,60);
 assert.deepEqual(expanded.scenes.filter(s=>!s.spatialExpansion).map(s=>s.location).sort((a,b)=>a-b),[2,303]);
 const before=altered.reduce((n,s)=>n+s.spatialExpansion.walkableBefore,0);
 const after=altered.reduce((n,s)=>n+s.spatialExpansion.walkableAfter,0);
 assert.ok(after/before>10,'an order-of-magnitude increase in reachable floor');
});
test('all original walkable cells, entry coordinates, quest objects and sealed floor components survive',()=>{
 for(const old of original.scenes){
  const s=expanded.scenes.find(r=>r.location===old.location);
  assert.deepEqual(s.arrive,old.arrive);
  assert.deepEqual(s.objects.slice(0,old.objects.length),old.objects,'authored objects in '+old.location);
  const originalOpen=reach(old),nowOpen=reach(s);
  for(let y=0;y<old.height;y++)for(let x=0;x<old.width;x++){
   if(old.floor[y][x]!=='.')continue;
   assert.equal(s.floor[y][x],'.','walkable position moved in '+old.location);
   assert.equal(nowOpen.has(key([x,y])),originalOpen.has(key([x,y])),'gated area bypassed in '+old.location);
  }
 }
});
test('new landmarks and optional encounters have real paths, bounded cells and two traversable circuits',()=>{
 for(const s of expanded.scenes.filter(s=>s.spatialExpansion)){
  const ext=s.spatialExpansion,seen=reach(s);
  assert.ok(s.width<=144&&s.height<=144&&s.width*s.height<65536);
  assert.ok(ext.outerReachable>=450);
  assert.ok(ext.entrances.length>=1&&ext.landmarks.length===8);
  assert.ok(ext.walkableAfter>=ext.walkableBefore+750);
  for(const p of ext.landmarks)assert.ok(seen.has(key(p.xy)),'disconnected landmark '+s.location+':'+p.name);
  for(const o of s.objects.filter(o=>o.exploreId?.startsWith('vast:')||o.flag_address===0x7e0000+s.location))assert.ok(seen.has(key(o.xy||o.enemies[0][1])),'unreachable object in '+s.location);
 }
});
test('reward caches are sparse, unique and idempotent; source fixture is unchanged',()=>{
 const goodies=expanded.scenes.flatMap(s=>s.objects.filter(o=>o.exploreId?.startsWith('vast:')&&o.type==='secret'));
 assert.ok(goodies.length<=12&&goodies.length>=10,'only one optional cache per two chapters');
 assert.equal(new Set(goodies.map(o=>o.exploreId)).size,goodies.length);
 const roundTrip=JSON.stringify(expanded);
 expandVastScenes(expanded);
 assert.equal(JSON.stringify(expanded),roundTrip);
 assert.equal(original.scenes.length,62);
});

test('complete campaign composition, scene rendering inputs and existing saves use the same expanded world',async()=>{
 const {World}=await import('../world.js');
 const world=new World(original);
 const ids=[230,229,228,5,17,135,47,19,70,66,359,259,404];
 for(const id of ids){
  const scene=world.scenes.get(id),base=original.scenes.find(s=>s.location===id);
  assert.ok(scene,'scene exists '+id);
  assert.ok(scene.spatialExpansion?.version===1,'spatial data survives all campaign authoring '+id);
  assert.ok(scene.width>base.width&&scene.height>base.height,'larger real runtime geometry '+id);
  for(const landmark of scene.spatialExpansion.landmarks)assert.equal(scene.floor[landmark.xy[1]][landmark.xy[0]],'.','actual collision must be walkable '+id);
 }
 const scene=world.scenes.get(5);world.state.scene=5;world.state.x=scene.arrive[0]+.5;world.state.y=scene.arrive[1]+.5;world.state.mode='field';
 const save=world.save(),copy=new World(original);copy.restore(save);
 assert.equal(copy.scene.location,scene.location);
 assert.equal(copy.scene.width,scene.width);
 assert.deepEqual([copy.state.x,copy.state.y],[world.state.x,world.state.y]);
 assert.equal(copy.walkable(copy.state.x,copy.state.y),true);
 assert.equal(copy.state.schema,world.state.schema);
});
