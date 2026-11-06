import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {CisternRenderer,Geometry} from '../cistern-renderer.js';

const require=createRequire(import.meta.url),noop=()=>{};
let raster;for(const name of ['@napi-rs/canvas',...(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?[join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas')]:[])])try{raster=require(name);break;}catch{}
const options=raster?{}:{skip:'Optional real Skia canvas backend is not installed'};
const W=388,H=842,NEIGHBOURS=[[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,2],[-2,2],[2,-2]];
function withRaster(run){const previous=globalThis.OffscreenCanvas;globalThis.OffscreenCanvas=class{constructor(w,h){return raster.createCanvas(w,h);}};try{return run();}finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}}
function atlas(){const image=raster.createCanvas(128,128),c=image.getContext('2d');c.fillStyle='rgb(72,98,108)';c.fillRect(0,0,128,128);image.observatoryMaterialAverages=Array.from({length:4},()=>[72/255,98/255,108/255]);return image;}
function camera(){const r=Object.create(CisternRenderer.prototype);Object.assign(r,{canvas:{width:W,height:H},zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],resize:noop,buildDynamic:noop,software:{render:()=>({})}});r.render({time:2,player:{x:0,z:0}},[],1/60);return{vp:r.vp,eye:r.eye};}
const ortho={vp:new Float32Array([.16,0,0,0,0,.2,0,0,0,0,0,0,0,-.8,0,1]),eye:[0,4,20]};
function render(mesh,view=ortho){const canvas=raster.createCanvas(W,H),painter=new CisternSoftwarePainter(canvas),data=mesh.data();const stats=painter.render({meshes:{static:{data,count:data.length/12}},...view,time:0,state:{adventure:true},quality:'low',materialImage:atlas(),lights:[],lighting:{ambient:[.42,.42,.42],key:[0,0,0],fogDensity:0,fog:[.02,.03,.04]}});const image=canvas.getContext('2d').getImageData(0,0,W,H),cacheDraws=painter.staticFrame?.rasterCalls;painter.destroy();return{image,stats,cacheDraws};}
const pixel=(image,x,y)=>Array.from(image.data.slice((Math.round(y)*W+Math.round(x))*4,(Math.round(y)*W+Math.round(x))*4+4));
function project(vp,p){const w=vp[3]*p[0]+vp[7]*p[1]+vp[11]*p[2]+vp[15];return[(.5+(vp[0]*p[0]+vp[4]*p[1]+vp[8]*p[2]+vp[12])/w*.5)*W,(.5-(vp[1]*p[0]+vp[5]*p[1]+vp[9]*p[2]+vp[13])/w*.5)*H];}
function wall(mesh,{tilt=0,z=0,reverse=false,x0=-5,x1=5,y0=0,y1=7,material=6.2,color=[.25,.30,.30]}={}){const point=(x,y)=>[x,y,z+tilt*x],n=[-tilt,0,1],length=Math.hypot(...n),normal=n.map(v=>v/length),a=point(x0,y0),b=point(x1,y0),c=point(x1,y1),d=point(x0,y1);if(reverse){mesh.tri(a,b,d,color,material,0,1,normal);mesh.tri(b,c,d,color,material,0,1,normal);}else mesh.quad(a,b,c,d,color,material,0,1,normal);}
function localContrast(image,inside){let worst=0,samples=0;for(let y=30;y<H-30;y++)for(let x=30;x<W-30;x++)if(inside(x,y))for(let c=0;c<3;c++){const neighbours=NEIGHBOURS.map(([dx,dy])=>pixel(image,x+dx,y+dy)[c]).sort((a,b)=>a-b),median=(neighbours[3]+neighbours[4])/2;worst=Math.max(worst,Math.abs(pixel(image,x,y)[c]-median));samples++;}return{worst,samples};}
function polygonInterior(points,x,y,margin=8){let sign=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);if(Math.abs(cross)/Math.hypot(b[0]-a[0],b[1]-a[1])<margin)return false;const next=Math.sign(cross);if(sign&&sign!==next)return false;sign=next;}return true;}

test('opaque vertical and slanted native wall subdivisions have no diagonal raster hairlines',options,()=>withRaster(()=>{
 for(const tilt of[0,.35,-.35]){const m=new Geometry();wall(m,{tilt});const{image,stats}=render(m),result=localContrast(image,(x,y)=>x>65&&x<320&&y>230&&y<650);
  assert.ok(stats.submittedTriangles>32&&stats.texturedTriangles>32,'the actual subdivision, texture mapping and cached bands draw the wall');assert.ok(result.samples>250000);assert.ok(result.worst<=3,`actual ${tilt} wall seam contrast ${result.worst}/255`);
 }
}));

test('native perspective phone walls keep smooth interiors after either authored diagonal',options,()=>withRaster(()=>{
 const view=camera();for(const tilt of[0,.22]){const points=[[-5,0,-4-tilt*5],[5,0,-4+tilt*5],[5,5,-4+tilt*5],[-5,5,-4-tilt*5]].map(p=>project(view.vp,p)),inside=(x,y)=>polygonInterior(points,x,y,12),results=[];
  for(const reverse of[false,true]){const m=new Geometry();wall(m,{tilt,z:-4,y1:5,reverse});const value=render(m,view),contrast=localContrast(value.image,inside);assert.ok(contrast.samples>2000,'the actual camera exposes a substantial wall interior');assert.ok(contrast.worst<=3,`perspective diagonal ${reverse} has ${contrast.worst}/255 seam contrast`);results.push(value.image);}
  let worst=0;for(let y=30;y<H-30;y++)for(let x=30;x<W-30;x++)if(inside(x,y))for(let c=0;c<3;c++)worst=Math.max(worst,Math.abs(pixel(results[0],x,y)[c]-pixel(results[1],x,y)[c]));assert.ok(worst<=3,`flipping the authored diagonal changes no visible interior feature (${worst}/255)`);
 }
}));

test('door holes and external silhouettes remain empty while unrelated planes retain their own order',options,()=>withRaster(()=>{
 const view=ortho,back=new Geometry();wall(back,{z:-6,x0:-8,x1:8,y0:-1,y1:8,material:6,color:[.05,.13,.32]});const reference=render(back,view),m=new Geometry();m.v.push(...back.v);
 wall(m,{z:-4,x0:-5,x1:-1,y1:5});wall(m,{z:-4,x0:1,x1:5,y1:5});wall(m,{z:-4,x0:-1,x1:1,y0:2.8,y1:5});
 const result=render(m,view);let checked=0;
 for(const[x,y]of[[0,.5],[0,1.3],[0,2.1],[-5.5,1],[5.5,1],[-5.5,4],[5.5,4]]){const p=project(view.vp,[x,y,-4]);if(p[0]<2||p[0]>W-2||p[1]<2||p[1]>H-2)continue;assert.deepEqual(pixel(result.image,...p),pixel(reference.image,...p),'a real opening or external silhouette does not receive a rectangular fill or outset');checked++;}
 assert.ok(checked>=5);const sample=project(view.vp,[-2.5,2,-4]);assert.notDeepEqual(pixel(result.image,...sample),pixel(reference.image,...sample),'the nearer textured wall was actually drawn over its separate blue backdrop');
}));

test('an isolated textured wall triangle keeps its single native raster fill',options,()=>withRaster(()=>{
 const m=new Geometry();m.tri([-1,1,0],[1,1,0],[-1,2,0],[.25,.30,.30],6.2,0,1,[0,0,1]);
 const result=render(m);assert.equal(result.stats.submittedTriangles,1,'the actual native triangle needs no geometric subdivision');assert.equal(result.stats.texturedTriangles,1);assert.equal(result.cacheDraws,1,'a lone wall face has no shared edge and receives no extra undercoat fill');
}));
