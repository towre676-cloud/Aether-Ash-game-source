import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {buildingDetailPlan,bakeBuilding} from '../building-art.js';
const w=new World(JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))));
const plans=w.data.scenes.flatMap(s=>s.exteriorBuildings||[]).filter(p=>p.projection.kind!=='underground');

test('facade runs cover every exposed cell once and retain concave gaps',()=>{
 assert.ok(plans.length>10);
 for(const plan of plans){const before=JSON.stringify(plan),p=plan.projection,cells=new Set(p.cells.map(v=>v.join(','))),detail=buildingDetailPlan(plan),covered=new Set();
  for(const f of detail.frontages)for(let x=f.cellLeft;x<=f.cellRight;x++){assert.ok(cells.has(x+','+f.cellY));assert.ok(!cells.has(x+','+(f.cellY+1)));assert.ok(!covered.has(x+','+f.cellY));covered.add(x+','+f.cellY);}
  assert.equal(covered.size,p.cells.filter(([x,y])=>!cells.has(x+','+(y+1))).length);
  assert.equal(JSON.stringify(plan),before);
 }
 const discontinuous={projection:{scale:.4,material:'home',cells:[[0,0],[1,0],[5,0],[6,0]],bounds:{minX:0,maxX:6,minY:0,maxY:0},vector:[0,1]}};
 const detail=buildingDetailPlan(discontinuous);assert.equal(detail.frontages.length,2);assert.deepEqual(detail.frontages.map(f=>[f.cellLeft,f.cellRight]),[[0,1],[5,6]]);
});
test('windows fit real wall bays, avoid the doorway and share a consistent small-screen scale',()=>{
 let count=0;
 for(const plan of plans){const d=buildingDetailPlan(plan);assert.equal(d.door.x,0);assert.equal(d.door.y,d.unit*.5);for(const f of d.frontages){assert.ok(f.posts.every(x=>x>=f.x&&x<=f.x+f.w));for(const a of f.windows){count++;assert.ok(a.x-a.w/2>f.x+7);assert.ok(a.x+a.w/2<f.x+f.w-7);assert.ok(a.w>=15&&a.w<=25);assert.ok(a.y-a.h>=f.y);assert.ok(a.y<f.ground);assert.ok(!(Math.abs(a.x)<31&&Math.abs(f.ground-d.unit)<22));}}}
 assert.ok(count>10);
});
test('baked material detailing leaves projection geometry unchanged and fits the retained canvas bounds',()=>{
 const saved=globalThis.document;
 const gradient={addColorStop(){}};
 const context=new Proxy({}, {get(target,key){if(key in target)return target[key];if(['createLinearGradient','createRadialGradient'].includes(key))return ()=>gradient;return ()=>{};},set(target,key,value){target[key]=value;return true;}});
 globalThis.document={createElement(name){assert.equal(name,'canvas');return {width:0,height:0,getContext(){return context;}};}};
 try{for(const plan of plans.slice(0,30)){const before=JSON.stringify(plan),art=bakeBuilding(plan);assert.ok(art.width>0&&art.height>0);assert.ok(Number.isFinite(art.worldX)&&Number.isFinite(art.worldY));assert.equal(JSON.stringify(plan),before);const d=buildingDetailPlan(plan);for(const f of d.frontages){assert.ok(f.x>=art.worldX);assert.ok(f.x+f.w<=art.worldX+art.width);assert.ok((f.gable?f.gable.y-f.gable.rise:f.y)>=art.worldY);assert.ok(f.ground<=art.worldY+art.height);}}}finally{globalThis.document=saved;}
});
