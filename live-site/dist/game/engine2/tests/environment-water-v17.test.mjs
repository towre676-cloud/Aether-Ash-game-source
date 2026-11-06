import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ENVIRONMENT_WATER_FILE,ENVIRONMENT_WATER_MATERIALS,ENVIRONMENT_WATER_SIZE,environmentWaterSpec,paintEnvironmentWaterSurface} from '../environment-water-v17.js';
test('regional water crops belong to the exact delivered opaque atlas',()=>{
 const bytes=fs.readFileSync(new URL('../../../../development/art/source-v17/'+ENVIRONMENT_WATER_FILE.replace(/\.webp$/i,'.png'),import.meta.url));
 assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],ENVIRONMENT_WATER_SIZE);
 assert.equal(bytes[25],2,'opaque RGB source');
 assert.equal(new Set(ENVIRONMENT_WATER_MATERIALS.map(p=>p.id)).size,4);
 for(const p of ENVIRONMENT_WATER_MATERIALS){const[x,y,w,h]=p.crop;assert.ok(x>=0&&y>=0&&x+w<=1254&&y+h<=1254);assert.ok(w>0&&h>0);}
});
test('only the four actual wet-region identities opt into these materials',()=>{
 for(const style of ['riverbank','mangrove','coral','salt'])assert.equal(environmentWaterSpec(style).style,style);
 for(const style of ['village','woodland','ice','storm','foundry','unknown',undefined])assert.equal(environmentWaterSpec(style),null);
});
test('unavailable water art retains fallback without touching the drawing context',()=>{
 let calls=0;const c={save(){calls++;},drawImage(){calls++;}};
 for(const image of [null,{width:1254,height:1254,complete:false},{width:200,height:200}])assert.equal(paintEnvironmentWaterSurface(c,image,'mangrove'),false);
 assert.equal(calls,0);
});
test('painted water preserves context and current path, including decode failure',()=>{
 const image={width:1254,height:1254,complete:true},stack=[],draws=[];let pathCalls=0;
 const c={globalAlpha:.6,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},translate(){},scale(){},beginPath(){pathCalls++;},rect(){pathCalls++;},clip(){pathCalls++;},drawImage(...a){draws.push(a);}};
 assert.equal(paintEnvironmentWaterSurface(c,image,'coral',512),true);
 assert.equal(c.globalAlpha,.6);assert.equal(stack.length,0);assert.equal(pathCalls,0);assert.equal(draws.length,4);
 assert.ok(draws.every(a=>a.slice(1).every(Number.isFinite)));
 c.drawImage=()=>{throw new Error('simulated unavailable decoder');};
 assert.equal(paintEnvironmentWaterSurface(c,image,'mangrove'),false);
 assert.equal(c.globalAlpha,.6);assert.equal(stack.length,0);assert.equal(pathCalls,0);
});

