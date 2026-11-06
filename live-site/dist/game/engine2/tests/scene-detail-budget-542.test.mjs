import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';

test('phone software fallback retains the native art and floor with simpler terrain while higher quality keeps sculpted banks',()=>{
 const w=new World(JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8')));w.newGame({quiet:true});
 w.state.scene=145;const at=w.scene.arrive;[w.state.x,w.state.y]=[at[0]+.5,at[1]+.5];w.objects();
 const saved=w.save(),floor=JSON.stringify(w.scene.floor),render=(software,quality)=>{
  const host={world:w,software,effectiveQuality:()=>quality};const mesh=Adventure3DRenderer.prototype.buildArchitecture.call(host);return{host,mesh};
 };
 const low=render({},'low'),high=render({},'high'),gpu=render(null,'low');
 assert.equal(low.mesh.terrainEdgeCraft542,undefined,'CPU phone fallback spends no faces on optional bank facets');
 assert.ok(high.mesh.terrainEdgeCraft542?.triangles>0&&gpu.mesh.terrainEdgeCraft542?.triangles>0,'the existing higher quality and GPU paths retain sculptural faces');
 assert.ok(low.mesh.v.length<high.mesh.v.length,'the fallback actually reduces submitted geometry');
 for(const r of[low,high,gpu]){
  assert.ok(r.mesh.v.every(Number.isFinite));assert.equal(r.host.sceneArt541.material,'outdoor:woodland');
  assert.ok(r.host.sceneContactOptions542.sites.length>0,'regional architecture and its contact sources remain present');
 }
 assert.equal(w.save(),saved);assert.equal(JSON.stringify(w.scene.floor),floor);
});
