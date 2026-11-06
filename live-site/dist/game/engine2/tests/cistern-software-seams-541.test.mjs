import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {Geometry} from '../cistern-renderer.js';

const require=createRequire(import.meta.url);
function rasterBackend(){
 const candidates=['@napi-rs/canvas'];
 if(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)candidates.push(join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
 const runtime='/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/index.js';if(existsSync(runtime))candidates.push(runtime);
 for(const candidate of candidates)try{const value=require(candidate);if(typeof value.createCanvas==='function')return value;}catch{}
 return null;
}
const raster=rasterBackend(),options=raster?{}:{skip:'Optional real Skia canvas backend is not installed in this environment'};
function withRaster(run){
 const previous=globalThis.OffscreenCanvas;
 globalThis.OffscreenCanvas=class{constructor(width,height){return raster.createCanvas(width,height);}};
 try{return run(raster.createCanvas);}finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}
}
function uniformAtlas(createCanvas){
 const image=createCanvas(128,128),c=image.getContext('2d');c.fillStyle='rgb(172,146,108)';c.fillRect(0,0,128,128);
 image.observatoryMaterialAverages=Array.from({length:4},()=>[172/255,146/255,108/255]);return image;
}
const pixel=(image,x,y)=>Array.from(image.data.slice((y*image.width+x)*4,(y*image.width+x)*4+4));

test('real textured floor subdivision has no bright or dark triangle cracks under constant illumination and fog',options,()=>withRaster(createCanvas=>{
 for(const fogDensity of[0,.00002]){
  const canvas=createCanvas(256,256),painter=new CisternSoftwarePainter(canvas),m=new Geometry();
  m.quad([-6,.02,-6],[-6,.02,6],[6,.02,6],[6,.02,-6],[.65,.65,.65],0,0,1,[0,1,0]);
  const data=m.data(),vp=new Float32Array([1/7,0,0,0,0,0,0,0,0,-1/7,0,0,0,0,0,1]);
  const stats=painter.render({meshes:{static:{data,count:data.length/12}},vp,eye:[0,120,0],time:0,state:{adventure:true,player:{x:0,z:0}},quality:'high',materialImage:uniformAtlas(createCanvas),lights:[],lighting:{ambient:[.34,.41,.38],key:[0,0,0],fog:[.02,.03,.04],fogDensity}});
  assert.ok(stats.submittedTriangles>2&&stats.texturedTriangles>16,'the real native subdivision, lighting, texture mapping, cached bands and final compositing are exercised');
  const image=canvas.getContext('2d').getImageData(0,0,256,256),samples=[],neighbours=[[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,2],[-2,2],[2,-2]];
  // All samples are far inside the authored square. The broad vignette and
  // distant uniform fog vary smoothly; a local contrast spike exposes either
  // multiply brightening or a transparent crack between subdivision faces.
  for(let y=45;y<211;y++)for(let x=45;x<211;x++)for(let c=0;c<3;c++){
   const values=neighbours.map(([dx,dy])=>pixel(image,x+dx,y+dy)[c]).sort((a,b)=>a-b),median=(values[3]+values[4])/2;
   samples.push(Math.abs(pixel(image,x,y)[c]-median));
  }
  assert.ok(Math.max(...samples)<=3,`shared textured edges stay within three 8-bit levels of their smooth local surface (fog ${fogDensity}; worst ${Math.max(...samples)})`);
  painter.destroy();
 }
}));

test('single textured coverage preserves translucent water alpha and the real external silhouette',options,()=>withRaster(createCanvas=>{
 for(const texture of[0,4]){
  const canvas=createCanvas(160,160),ctx=canvas.getContext('2d'),painter=new CisternSoftwarePainter(canvas),atlas=uniformAtlas(createCanvas);
  painter._materials(atlas);if(texture===4)painter._waterMaterial(atlas);
  const row={texture,alpha:.45,area:6050,light:[.34,.41,.38],fog:.25,fogColor:'#05080a',ax:20.25,ay:20.25,bx:130.25,by:20.25,cx:20.25,cy:130.25,minX:20.25,minY:20.25,maxX:130.25,maxY:130.25,au:0,av:0,bu:1,bv:0,cu:0,cv:1};
  assert.equal(painter._paintTriangle(ctx,row,'high').textured,1);
  const image=ctx.getImageData(0,0,160,160);
  assert.ok(Math.abs(pixel(image,35,35)[3]-115)<=1,'opacity is applied once after lighting and fog, including the water texture family');
  assert.equal(pixel(image,80,80)[3],0,'a sample beyond the true diagonal remains outside the translucent face');
  assert.equal(pixel(image,132,30)[3],0,'no broad stroke or outset expands an external material boundary');painter.destroy();
 }
}));

test('shadow triangles keep their original opacity and do not receive opaque edge coverage',options,()=>withRaster(createCanvas=>{
 const canvas=createCanvas(160,160),ctx=canvas.getContext('2d'),painter=new CisternSoftwarePainter(canvas),row={texture:-1,shadow:true,alpha:.4,area:6050,color:'rgb(0,0,0)',ax:20.25,ay:20.25,bx:130.25,by:20.25,cx:20.25,cy:130.25};
 assert.equal(painter._paintTriangle(ctx,row,'high').draws,1);const image=ctx.getImageData(0,0,160,160);
 assert.ok(Math.abs(pixel(image,35,35)[3]-102)<=1);assert.equal(pixel(image,80,80)[3],0);painter.destroy();
}));

test('moving-light misses reuse sixty-four actual tile canvases within four MiB and reset prior fog opacity',options,()=>withRaster(createCanvas=>{
 const canvas=createCanvas(160,160),atlas=createCanvas(1024,1024),ctx=atlas.getContext('2d'),painter=new CisternSoftwarePainter(canvas),tiles=new Set();
 ctx.fillStyle='rgb(172,146,108)';ctx.fillRect(0,0,1024,1024);painter._materials(atlas);
 let last;
 for(let n=0;n<256;n++){
  last=painter._litPattern({texture:0,alpha:1,light:[(n&15)/15,((n>>4)&15)/15,0],fog:n<64?.5:0,fogColor:'#05080a'});
  tiles.add(last.tile);assert.ok(painter.litPatterns.size<=64,'every miss respects the live-entry bound');
 }
 assert.equal(tiles.size,64,'later moving-light misses repaint evicted native canvases instead of allocating a growing pool');
 assert.equal(painter.litPatterns.size,64);const bytes=[...painter.litPatterns.values()].reduce((sum,entry)=>sum+entry.tile.width*entry.tile.height*4,0);
 assert.ok(bytes<=4*1024*1024,'the full pool fits four MiB of RGBA pixels');
 const image=last.tile.getContext('2d').getImageData(0,0,last.tile.width,last.tile.height),sample=pixel(image,32,32);
 assert.deepEqual(sample,[172,146,0,255],'the last reused surface starts opaque and clean before its new light, retaining no prior fog/composite state');
 painter.destroy();assert.equal(painter.litPatterns.size,0);
}));
