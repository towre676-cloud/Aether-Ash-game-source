import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundMaps} from '../lib/ground/ground-synthesis.mjs';
import {createProductionGroundAdapter} from '../src/production-ground-adapter.mjs';

const pixel = (im,x,y) => (y*im.width+x)*4;
const slope = (im,x,y) => {const i=pixel(im,x,y);return Math.hypot(im.normal[i]-128,im.normal[i+1]-128);};

test('High and medium terrain normals retain world-metric strength',()=>{
 const opts={materialId:'water-limestone',metresX:12,metresZ:12,seed:777};
 const med=generateGroundMaps({...opts,width:65,height:65});
 const high=generateGroundMaps({...opts,width:129,height:129});
 const diffs=[],a=[],b=[];
 for(let y=4;y<61;y+=2)for(let x=4;x<61;x+=2){
  const i=pixel(med,x,y),j=pixel(high,2*x,2*y);
  diffs.push(Math.hypot(med.normal[i]-high.normal[j],med.normal[i+1]-high.normal[j+1]));
  a.push(slope(med,x,y));b.push(slope(high,2*x,2*y));
 }
 diffs.sort((a,b)=>a-b);
 assert.ok(diffs[Math.floor(diffs.length*.5)]<=6,'median matched-coordinate slopes stay close');
 const mean=v=>v.reduce((s,x)=>s+x,0)/v.length;
 const ratio=mean(a)/mean(b);
 assert.ok(ratio>.35&&ratio<2.2,'normal response does not collapse when quality changes');
});

test('Zero physical relief produces a flat normal map even across mixed materials',()=>{
 const im=generateGroundMaps({width:43,height:37,metresX:12,metresZ:12,normalReliefMetres:0,
  materialAt:(x,z)=>x<0?'clay-floorboards':z>0?'water-limestone':'ash-cinder'});
 for(let i=0;i<im.normal.length;i+=4){
  assert.ok(Math.abs(im.normal[i]-128)<=1);assert.ok(Math.abs(im.normal[i+1]-128)<=1);
  assert.equal(im.normal[i+2],255);
 }
});

test('Invalid physical relief cannot create invalid shader normals',()=>{
 for(const v of [-1,Infinity,NaN,1.001])assert.throws(()=>generateGroundMaps({width:4,height:4,normalReliefMetres:v}),RangeError);
});

test('Authored floor boundary does not turn an albedo transition into a false height cliff',()=>{
 const im=generateGroundMaps({width:65,height:41,metresX:20,metresZ:12,materialAt:x=>x<0?'clay-floorboards':'water-limestone'});
 const b=slope(im,31,20),c=slope(im,32,20),d=slope(im,33,20);
 for(const s of [b,c,d])assert.ok(s<75,'material seam should not create unphysical normal spike');
});

test('Map rebuild does not partially replace surfaces if authoring fails midway',()=>{
 let phase='initial';
 const g=createProductionGroundAdapter({seed:48});
 g.registerMap('chapel',{columns:6,rows:5,cellSize:1,originX:0,originZ:0,
  surfaceAt:(x,z)=>{if(phase==='broken'&&x>3)throw Error('authoring incomplete');return phase==='initial'?'clay-earth':'ash-basalt';}});
 const initial=g.save();
 phase='broken';assert.throws(()=>g.syncMap('chapel'),/authoring incomplete/);
 assert.deepEqual(g.save(),initial,'the renderer never sees a half-renovated room');
 phase='ready';assert.equal(g.syncMap('chapel'),30);
 assert.equal(g.surface('chapel',1,1).id,'ash-basalt');
});

test('Map rebuild rejects one invalid material atomically',()=>{
 let phase='initial';const g=createProductionGroundAdapter();
 g.registerMap('bridge',{columns:4,rows:3,cellSize:1,originX:0,originZ:0,
  surfaceAt:(x,z)=>phase==='initial'?'water-dock':x>2?'not-a-material':'clay-road'});
 const initial=g.save();phase='changed';assert.throws(()=>g.syncMap('bridge'),RangeError);
 assert.deepEqual(g.save(),initial);
});

test('Adjacent terrain chunks have identical world-aligned surface normals along a shared x edge',()=>{
 for(const id of ['clay-floorboards','clay-fieldstone','water-pebbles','aether-phase']){
  const opts={materialId:id,width:65,height:61,metresX:8,metresZ:12,seed:723};
  const left=generateGroundMaps({...opts,originX:-4}),right=generateGroundMaps({...opts,originX:4});
  for(let y=0;y<61;y++){
   const a=pixel(left,64,y),b=pixel(right,0,y);
   for(let c=0;c<3;c++)assert.equal(left.normal[a+c],right.normal[b+c],`${id} x seam at y=${y}`);
  }
 }
});

test('Adjacent terrain chunks have identical world-aligned normals along a shared z edge',()=>{
 for(const id of ['ash-basalt','clay-herringbone','water-mud']){
  const opts={materialId:id,width:49,height:57,metresX:7,metresZ:10,seed:867};
  const near=generateGroundMaps({...opts,originZ:-5}),far=generateGroundMaps({...opts,originZ:5});
  for(let x=0;x<49;x++){
   const a=pixel(near,x,56),b=pixel(far,x,0);
   for(let c=0;c<3;c++)assert.equal(near.normal[a+c],far.normal[b+c],`${id} z seam at x=${x}`);
  }
 }
});
