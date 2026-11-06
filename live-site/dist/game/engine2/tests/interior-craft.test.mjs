import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {roomFloorAccents,surfaceSpec,paintDirectRoomSurface} from '../room-surfaces.js';
import {householdSurfaceGeometry,paintCompatibilityHousehold} from '../household-render.js';
const w=new World(JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))));
const rooms=w.data.scenes.filter(s=>s.household);
const fakeContext=()=>{
 const calls=[];const gradient={addColorStop(){}};
 const c=new Proxy({calls},{get(target,key){if(key in target)return target[key];if(['drawImage','getImageData','putImageData','createPattern'].includes(key))return ()=>{throw Error('Compatibility must not prepare or read bitmaps: '+key);};if(['createRadialGradient','createLinearGradient'].includes(key))return ()=>gradient;return (...args)=>{calls.push({method:key,args});};},set(target,key,value){target[key]=value;return true;}});
 return c;
};
test('interior fabric and hearth accents stay anchored to the actual activity group',()=>{
 let woven=0,hearths=0;
 for(const scene of rooms){const before=JSON.stringify(scene),accents=roomFloorAccents(scene);assert.ok(accents.length<=7);
  for(const a of accents){assert.ok([a.x,a.y,a.w,a.h].every(Number.isFinite));assert.ok(a.w>0&&a.h>0);if(a.kind==='woven'){woven++;assert.ok(['dining','sleeping','reading','hydrophone'].includes(a.visual));assert.ok(scene.household.furnishings.some(o=>o.visual===a.visual&&Math.abs((o.footprint.x-.22)*48-a.x)<.001));}else hearths++;}
  if(['workshop','cistern','carpenter','pottery','instrumentworks','optics','cargo','store','printshop'].includes(scene.household.kind))assert.ok(!accents.some(a=>a.kind==='woven'));
  assert.equal(JSON.stringify(scene),before);
 }
 assert.ok(woven>30);assert.ok(hearths>0);
});
test('cached room spans preserve every actual floor cell and never fill a partition',()=>{
 for(const scene of rooms){const {spans,walk}=householdSurfaceGeometry(scene),cells=new Set();assert.equal(householdSurfaceGeometry(scene),householdSurfaceGeometry(scene));
  for(const r of spans)for(let x=r.x/48;x<(r.x+r.w)/48;x++)cells.add(x+','+r.y/48);
  const b=scene.household.box;for(let y=b.top;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++)assert.equal(cells.has(x+','+y),walk(x,y),scene.key+' '+x+','+y);
 }
});
test('compatibility rooms paint real continuous materials and walls without bitmap APIs',()=>{
 const candidates=['home','workshop','clinic','cistern','archive'];
 for(const kind of candidates){const scene=rooms.find(s=>s.household.kind===kind);assert.ok(scene);const before=JSON.stringify(scene),c=fakeContext();assert.equal(paintCompatibilityHousehold(c,scene),true);assert.ok(c.calls.some(x=>x.method==='clip'));assert.ok(c.calls.some(x=>x.method==='bezierCurveTo')||surfaceSpec(kind).kind==='stone');assert.ok(c.calls.filter(x=>x.method==='fillRect').length<20000);assert.equal(JSON.stringify(scene),before);}
 assert.equal(paintCompatibilityHousehold(fakeContext(),{}),false);
});
test('continuous compatibility planks use material units rather than the world collision grid',()=>{
 const c=fakeContext();paintDirectRoomSurface(c,'home',{left:0,top:0,right:10,bottom:10});
 const boards=c.calls.filter(x=>x.method==='fillRect'&&x.args[2]===surfaceSpec('home').width-.6);
 assert.ok(boards.length>0);assert.ok(boards.every(x=>x.args[3]!==48));assert.ok(surfaceSpec('home').width>100);assert.ok(surfaceSpec('home').height<20);
});
