import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {spatialWildlifeProfile,spatialWildlifeActors,appendSpatialWildlifeMotion,drawSpatialWildlife2D} from '../spatial-wildlife.mjs';
const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
const world=new World(source);
function enter(id){
 const s=world.scenes.get(id);assert.ok(s?.spatialExpansion,'real expanded world '+id);
 world.state.scene=id;world.state.mode='field';
 world.state.x=s.spatialExpansion.landmarks[6].xy[0]+.5;
 world.state.y=s.spatialExpansion.landmarks[6].xy[1]+.5;
 return s;
}
test('animated habitat species vary by biome and stay on traversable ground',()=>{
 const kinds=new Set();
 for(const id of [2000,2004,2005,2010,2020,2030,2034,2046,2055,2059,228,230,392]){
  const s=enter(id),profile=spatialWildlifeProfile(s);kinds.add(profile.kind);
  const a=spatialWildlifeActors(world,10.5);assert.ok(a.length>=1&&a.length<=5,'bounded fauna '+id);
  for(const p of a){
   assert.equal(s.floor[Math.floor(p.z)]?.[Math.floor(p.x)],'.','animal walked into a wall '+id);
   assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.y));
   assert.ok(p.y>=0.1&&p.y<=1.0);
  }
  world.state.x=0;world.state.y=0;
  assert.deepEqual(spatialWildlifeActors(world,10),[],'offscreen wildlife budget zero '+id);
 }
 assert.ok(kinds.size>=4,'winged, crawler, runner and swimmer families');
});
test('dynamic 3D fauna is finite, budgeted and does not mutate any persistent state',()=>{
 for(const id of [2000,2014,2035,2048,2059,230,47]){
  enter(id);const before=world.save(),mesh=new Geometry(),glow=new Geometry();
  const count=appendSpatialWildlifeMotion(mesh,glow,{world,time:1.25});
  assert.ok(count>=1&&count<=5);
  const vertices=mesh.data();
  assert.ok(vertices.length>100&&vertices.length<40000,'no excessive 3D geometry '+id);
  for(const n of vertices)assert.ok(Number.isFinite(n),'nonfinite wildlife vertex');
  assert.equal(world.save(),before);
 }
});
test('software wildlife produces deterministic noncombat silhouettes without DOM or inventory effects',()=>{
 enter(2000);const before=world.save();const calls={ellipse:0};
 const ctx={save(){},restore(){},translate(){},rotate(){},beginPath(){},ellipse(){calls.ellipse++},fill(){},moveTo(){},lineTo(){},stroke(){}};
 const count=drawSpatialWildlife2D(ctx,world,1.5);
 assert.ok(count>=1&&count<=5);
 assert.ok(calls.ellipse>=count*2,'distinct silhouette and shadow');
 assert.equal(world.save(),before);
});
