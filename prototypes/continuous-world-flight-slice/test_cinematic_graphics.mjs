import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./index.html',import.meta.url),'utf8');
test('cinematic shader still uses WebGL2 and preserves existing mesh attributes',()=>{
 assert.match(src,/const VS=`#version 300 es/);
 assert.match(src,/const FS=`#version 300 es/);
 for(const key of ['layout(location=0) in vec3 aP','layout(location=1) in vec3 aN','layout(location=2) in vec3 aC','uniform mat4 uVP','uniform mat4 uModel','uniform vec3 uEye','uniform float uMaterial','uniform float uTime'])assert.ok(src.includes(key),key);
 assert.match(src,/gl\.getUniformLocation\(program,'uMaterial'\)/);
 assert.match(src,/gl\.getUniformLocation\(program,'uTime'\)/);
});
test('water is a targeted animated material, not a global shader mode',()=>{
 const marker="drawChunkGroup(waterChunks,p,distance+55,'water',eye,target,keys);";
 assert.ok(src.includes("gl.uniform1f(uMaterial,1);"+marker+"gl.uniform1f(uMaterial,0);"));
 assert.ok(src.includes('gl.uniform1f(uTime,now*.001)'));
 assert.ok(src.includes('texture(uNoise,uv+flow)'));
});
test('aircraft upgrades are baked into one persistent VAO',()=>{
 const begin=src.indexOf('const planeMesh=new Mesh();'),end=src.indexOf('const craftMesh=planeMesh.finish();',begin);
 assert.ok(begin>0&&end>begin);
 const mesh=src.slice(begin,end);
 assert.match(mesh,/planeMesh\.quad\(/);
 assert.match(mesh,/navigation lamps/);
 assert.match(src,/draw\(craftMesh,model\(plane\.x,plane\.y,plane\.z,plane\.yaw,plane\.pitch,plane\.roll\)\)/);
});
test('physics and adaptive GPU resolution remain intact',()=>{
 for(const key of ['function simulate(dt)','function adaptResolution(frameMs,now)','window.__flightResolution','window.__sliceVisibility','gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)'])assert.ok(src.includes(key),key);
});
