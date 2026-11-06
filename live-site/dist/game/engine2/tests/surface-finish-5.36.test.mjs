import test from 'node:test';
import assert from 'node:assert/strict';
import {CisternSoftwarePainter,softwareMaterialIndex} from '../cistern-software.js';
import {Geometry} from '../cistern-renderer.js';

test('software material families retain authored cloth while timber and explicit masonry gain their own finishes',()=>{
 const ready={surface:true,water:true,wood:true};
 assert.equal(softwareMaterialIndex(2,1,ready),5,'timber samples the original architectural timber');
 assert.equal(softwareMaterialIndex(6.2,0,ready),3,'explicit masonry uses the landscape stone finish');
 assert.equal(softwareMaterialIndex(6,1,ready),-1,'paper, textiles and colored instruments keep their authored surface');
 assert.equal(softwareMaterialIndex(0,1,ready),0);assert.equal(softwareMaterialIndex(0,0,ready),1);
 assert.equal(softwareMaterialIndex(3,1,ready),4);assert.equal(softwareMaterialIndex(2,1,{surface:true}),-1,'unloaded timber never borrows a metal swatch');
});

test('painted timber crop uses the third native architectural swatch and is cached by image identity',()=>{
 const old=globalThis.OffscreenCanvas,draws=[],patterns=[],ctx={drawImage:(...args)=>draws.push(args)},canvasCtx={createPattern:(...args)=>(patterns.push(args),{source:args[0]})};
 globalThis.OffscreenCanvas=class{constructor(w,h){this.width=w;this.height=h;}getContext(){return ctx;}};
 try{const painter=new CisternSoftwarePainter({getContext:()=>canvasCtx}),image={width:1536,height:1024,complete:true};
  painter._woodMaterial(image);assert.deepEqual(draws[0],[image,1032,8,496,496,0,0,512,512]);assert.equal(patterns[0][1],'repeat');assert.equal(painter.tileSizes[5],512);
  const texture=painter.patterns[5];painter._woodMaterial(image);assert.equal(draws.length,1);assert.equal(painter.patterns[5],texture);
  painter._woodMaterial({width:1536,height:1024,complete:false});assert.equal(draws.length,1);
  const replacement={...image};painter._woodMaterial(replacement);assert.equal(draws.length,2);assert.equal(painter.woodSource,replacement);assert.notEqual(painter.patterns[5],texture);painter.destroy();
 }finally{if(old===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=old;}
});

test('large timber geometry keeps bounded perspective subdivisions and reuses its native static geometry cache',()=>{
 const geo=new Geometry();geo.box(0,.5,0,50,1,2,[.3,.2,.1],2);const data=geo.data(),mesh={data,count:data.length/12};
 const painter=new CisternSoftwarePainter({getContext:()=>({})}),before=Array.from(data),first=painter._geometry(mesh,true);
 assert.ok(first.length/24<=12*128,'at most seven subdivisions per original face triangle');assert.ok(first.every(Number.isFinite));
 assert.equal(painter._geometry(mesh,true),first,'stable geometry does not subdivide every frame');assert.deepEqual(Array.from(data),before,'source geometry remains unchanged');painter.destroy();
});
