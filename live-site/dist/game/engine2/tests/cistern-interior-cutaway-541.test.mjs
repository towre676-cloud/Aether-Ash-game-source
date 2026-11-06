import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {Geometry,CisternRenderer} from '../cistern-renderer.js';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {leadCutawayWindow} from '../lead-cutaway-541.js';

const require=createRequire(import.meta.url),noop=()=>{};
function rasterBackend(){
 const candidates=['@napi-rs/canvas'];if(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)candidates.push(join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
 const runtime='/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/index.js';if(existsSync(runtime))candidates.push(runtime);
 for(const candidate of candidates)try{const m=require(candidate);if(typeof m.createCanvas==='function')return m;}catch{}
 return null;
}
const raster=rasterBackend(),options=raster?{}:{skip:'Optional real Skia canvas backend is not installed in this environment'};
function withRaster(run){const previous=globalThis.OffscreenCanvas;globalThis.OffscreenCanvas=class{constructor(w,h){return raster.createCanvas(w,h);}};try{return run(raster.createCanvas);}finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}}
const W=388,H=842;
function nativeCamera(){const r=Object.create(CisternRenderer.prototype);Object.assign(r,{canvas:{width:W,height:H},zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],resize:noop,buildDynamic:noop,software:{render:()=>({})}});r.render({time:2,player:{x:0,z:0}},[],1/60);return{vp:r.vp,eye:r.eye};}
function project(vp,x,y,z){const w=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];return{x:(.5+(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w*.5)*W,y:(.5-(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w*.5)*H};}
function fixture(createCanvas,{foreground=true,background=true,lowRail=true}={}){
 const camera=nativeCamera(),m=new Geometry(),shadows=new Geometry(),image=createCanvas(64,96),c=image.getContext('2d');
 // The nearest real billboard has transparent top/side padding and a foot
 // registration inside the source rectangle. It is deliberately not first.
 c.fillStyle='rgb(250,0,250)';c.fillRect(18,23,28,71);c.fillRect(23,8,18,20);
 const lead={image,source:{x:0,y:0,w:64,h:96},x:0,y:.045,z:0,width:1.60,height:2.05,anchorX:.5,anchorY:94/96,alpha:1};
 const sprites=[{...lead,x:3.8,z:-2},lead];
 m.quad([-6,.02,-6],[-6,.02,5],[6,.02,5],[6,.02,-6],[.30,.34,.34],6,0,1,[0,1,0]);
 if(background)m.box(0,1.9,-4,12,3.8,.35,[.12,.26,.55],6);
 if(foreground)m.box(0,1.9,1.0,12,3.0,.35,[.80,.40,.05],6);
 if(lowRail)m.box(0,.17,1.0,12,.30,.55,[.34,.38,.41],6);
 shadows.disc(0,.06,0,.62,.37,[0,0,0],8,.55,24);
 const state={adventure:true,interiorCutaway:true,player:{x:0,z:0}},cut=leadCutawayWindow({state,sprites,...camera,billboardVP:camera.vp,width:W,height:H});
 return{...camera,sprites,state,cut,meshes:{static:{data:m.data(),count:m.v.length/12},shadows:{data:shadows.data(),count:shadows.v.length/12}}};
}
function render(createCanvas,f,state){const canvas=createCanvas(W,H),p=new CisternSoftwarePainter(canvas);const stats=p.render({...f,state,quality:'high',time:2,lights:[],lighting:{ambient:[.70,.70,.70],key:[0,0,0],fog:[.02,.03,.04],fogDensity:0},billboardVP:f.vp});const image=canvas.getContext('2d').getImageData(0,0,W,H);p.destroy();return{image,stats};}
const rgba=(image,x,y)=>Array.from(image.data.slice((Math.round(y)*W+Math.round(x))*4,(Math.round(y)*W+Math.round(x))*4+4));
function leadPixels(image,cut){let n=0;for(let y=Math.max(0,Math.floor(cut.top));y<Math.min(H,Math.ceil(cut.footY));y++)for(let x=Math.max(0,Math.floor(cut.left));x<Math.min(W,Math.ceil(cut.left+cut.width));x++){const i=(y*W+x)*4;if(image.data[i]>190&&image.data[i+1]<65&&image.data[i+2]>190)n++;}return n;}
function identicalRaster(actual,expected,message){let channels=0,worst=0;for(let i=0;i<actual.data.length;i++){const difference=Math.abs(actual.data[i]-expected.data[i]);if(difference)channels++;worst=Math.max(worst,difference);}assert.equal(channels,0,`${message}; changed channels ${channels}, worst delta ${worst}`);}

test('the real padded lead billboard remains visible through a bounded foreground window while outside masonry stays opaque',options,()=>withRaster(createCanvas=>{
 const f=fixture(createCanvas),off=render(createCanvas,f,{...f.state,interiorCutaway:false}),on=render(createCanvas,f,f.state),reference=render(createCanvas,fixture(createCanvas,{foreground:false}),f.state);
 assert.ok(f.cut&&f.cut.width>30&&f.cut.height>70,'the shared plan uses the actual nearest billboard and its source registration');
 assert.ok(on.stats.interiorCutaway);const visible=leadPixels(on.image,f.cut),hidden=leadPixels(off.image,f.cut),clear=leadPixels(reference.image,f.cut);
 assert.ok(visible>=hidden+150&&visible>=clear*.70,`the actual magenta actor survives the foreground wall: ${hidden} hidden, ${visible} cutaway, ${clear} clear pixels`);
 let checked=0;
 for(const x of[-2.5,-2,-1.5,1.5,2,2.5])for(const y of[1.1,1.8,2.6]){
  const p=project(f.vp,x,y,1.175),ellipse=((p.x-f.cut.cx)/f.cut.rx)**2+((p.y-f.cut.cy)/f.cut.ry)**2;
  if(p.x<8||p.x>W-8||p.y<8||p.y>H-8||ellipse<1.15)continue;
  assert.deepEqual(rgba(on.image,p.x,p.y),rgba(off.image,p.x,p.y),'foreground wall outside the bounded ellipse retains its opaque native colour');checked++;
 }
 assert.ok(checked>=6,'both flanks of the actual foreground masonry are checked');
}));

test('floor, low bed rail, actor feet and contact shadow pixels retain exact opacity and registration',options,()=>withRaster(createCanvas=>{
 const f=fixture(createCanvas,{foreground:false,background:false}),off=render(createCanvas,f,{...f.state,interiorCutaway:false}),on=render(createCanvas,f,f.state);
 identicalRaster(on.image,off.image,'the entire real raster is unchanged when all opaque geometry is at or below .35m');
 assert.ok(leadPixels(on.image,f.cut)>200,'the padded sprite and visible feet were actually drawn');
}));

test('walls behind the lead plane retain their opaque raster even inside the screen window',options,()=>withRaster(createCanvas=>{
 const f=fixture(createCanvas,{foreground:false}),off=render(createCanvas,f,{...f.state,interiorCutaway:false}),on=render(createCanvas,f,f.state);
 identicalRaster(on.image,off.image,'background architecture is not dissolved merely because it overlaps the lead ellipse');
}));

test('disabling interior scope preserves exact legacy output for outdoor adventure and the native Cistern',options,()=>withRaster(createCanvas=>{
 const f=fixture(createCanvas),off=render(createCanvas,f,{...f.state,interiorCutaway:false}),outdoor=render(createCanvas,f,{adventure:true,player:{x:0,z:0}}),cistern=render(createCanvas,f,{adventure:false,interiorCutaway:true,player:{x:0,z:0}});
 assert.equal(outdoor.stats.interiorCutaway,false);assert.equal(cistern.stats.interiorCutaway,false);
 identicalRaster(outdoor.image,off.image,'outdoor adventure has its exact established raster');identicalRaster(cistern.image,off.image,'no cutaway predicate runs in the existing native dungeon');
}));
