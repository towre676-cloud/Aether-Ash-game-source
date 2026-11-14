import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {spatialLandmarkPlan,appendSpatialLandmarks} from '../spatial-landmark-art.mjs';
import {buildAdventureGeometry} from '../adventure-3d-geometry.js';

const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
const w=new World(data);
test('large region landmarks occupy only impassable masonry and flush walkable paving',()=>{
 let count=0,structures=0,courts=0;
 for(const scene of w.data.scenes){
  if(!scene.spatialExpansion)continue;
  const art=spatialLandmarkPlan(scene);
  assert.ok(art.inlays.length>=4,'nonempty route identity '+scene.location);
  for(const inlay of art.inlays)assert.equal(scene.floor[inlay.xy[1]]?.[inlay.xy[0]],'.','inlay walkable '+scene.location);
  for(const e of art.structures){
   assert.equal(scene.floor[e.xy[1]]?.[e.xy[0]],'#','tall solid prop on walkable tile '+scene.location);
   assert.ok(e.xy[0]>=scene.spatialExpansion.originalWidth||e.xy[1]>=scene.spatialExpansion.originalHeight);
  }
  for(const p of art.courts)assert.equal(scene.floor[p[1]]?.[p[0]],'.','breathing court remains walkable');
  count++;structures+=art.structures.length;courts+=art.courts.length;
 }
 assert.ok(count>=127,'every original plus new frontier region gets authored geometry');
 assert.ok(structures>=200,'cairns, columns and industrial gantries exist in the real plans');
});
test('landmark mesh creates finite bounded geometry, read-only to world and saves',()=>{
 for(const scene of w.data.scenes.filter(s=>s.spatialExpansion).slice(0,18).concat(w.data.scenes.filter(s=>s.location>=2000&&s.location<2060).slice(0,12))){
  const before=JSON.stringify([scene.floor,scene.objects,scene.spatialExpansion,scene.mainlineCourts]);
  const m=new Geometry();assert.equal(appendSpatialLandmarks(m,{world:{scene}}),m);
  const geometry=m.data();
  assert.ok(geometry.v.length>0&&geometry.v.length<150000,'bounded single-scene detail '+scene.location);
  for(const value of geometry.v)assert.ok(Number.isFinite(value),'finite vertex in '+scene.location);
  assert.equal(JSON.stringify([scene.floor,scene.objects,scene.spatialExpansion,scene.mainlineCourts]),before);
 }
});
test('geometry pipeline includes scale landmarks without modifying collision or scene ownership',()=>{
 const scene=w.scenes.get(2000),snapshot=JSON.stringify(scene.floor);
 const result=buildAdventureGeometry(Geometry,null,{scene});
 assert.ok(result,'built actual scene geometry');
 assert.equal(JSON.stringify(scene.floor),snapshot);
});
