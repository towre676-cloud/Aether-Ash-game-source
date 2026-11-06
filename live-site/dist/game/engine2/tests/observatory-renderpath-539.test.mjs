import test from 'node:test';
import assert from 'node:assert/strict';
import {Geometry} from '../cistern-renderer.js';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {OBSERVATORY_BACKDROP_BOUNDS} from '../observatory-detail.js';

const noop=()=>{};
function context(){return{fills:[],setTransform:noop,fillRect:noop,save:noop,restore:noop,translate:noop,scale:noop,drawImage:noop,
 clearRect(){this.fills=[];},beginPath:noop,moveTo:noop,lineTo:noop,closePath:noop,clip:noop,stroke:noop,
 fill(){this.fills.push(this.fillStyle);},createPattern:()=>({}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})};}
function withSurfaces(run){
 const previous=globalThis.OffscreenCanvas;
 globalThis.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;this.context=context();}getContext(){return this.context;}};
 try{return run();}finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}
}
const mesh=geometry=>({data:geometry.data(),count:geometry.v.length/12});
function land(geometry,x,z,color){geometry.quad([x-1,1.2,z-1],[x-1,1.2,z+1],[x+1,1.2,z+1],[x+1,1.2,z-1],color,6,0,1,[0,1,0]);}

test('the real software pass keeps only the distant static station inside the authored backdrop bounds',()=>withSurfaces(()=>{
 const staticGeometry=new Geometry(),dynamicGeometry=new Geometry(),bounds={...OBSERVATORY_BACKDROP_BOUNDS};
 assert.ok(Object.values(bounds).every(Number.isFinite)&&bounds.w>0&&bounds.d>0);
 const x=bounds.x+bounds.w/2,z=bounds.z+bounds.d/2;
 land(staticGeometry,x,z,[.5,.3,.2]);land(staticGeometry,bounds.x+bounds.w+4,z,[.2,.5,.3]);land(dynamicGeometry,x,z,[.9,.2,.2]);
 const painter=new CisternSoftwarePainter({width:388,height:842,getContext:()=>context()}),painted=[],nativeSurface=painter._surface.bind(painter);
 painter._surface=(data,i,...rest)=>{const surface=nativeSurface(data,i,...rest);surface.color=data[i+12]>.8?'dynamic-actor':data[i+13]>.4?'outside-static':'authored-station';return surface;};
 painter._paintTriangle=(ctx,row)=>(painted.push(row),{draws:1,textured:0});
 const meshes={static:mesh(staticGeometry),dynamic:mesh(dynamicGeometry)},vp=new Float32Array([.06,0,0,0,0,.025,.006,0,0,-.014,.005,0,0,-.10,0,1]);
 const render=state=>{painted.length=0;const stats=painter.render({meshes,vp,eye:[0,12,40],lights:[],state:{adventure:true,groundClipY:-5.4,player:{x:0,z:34},...state}});return{stats,painted:painted.slice()};};
 const normal=render({scenicHorizon:false,scenicBackdropBounds:bounds});assert.equal(normal.painted.length,0,'ordinary distance culling rejects all three far forms');
 const scenic=render({scenicHorizon:true,scenicBackdropBounds:bounds});
 assert.equal(scenic.stats.staticCacheHit,false,'enabling the authored scenery invalidates the prior empty static frame');
 assert.ok(scenic.painted.length>0);assert.ok(scenic.painted.every(row=>row.architecture&&row.color==='authored-station'),'outside static land and a dynamic actor at the station position receive no exemption');
 assert.equal(scenic.stats.triangles,scenic.painted.length);
 const cached=render({scenicHorizon:true,scenicBackdropBounds:bounds});assert.equal(cached.stats.staticCacheHit,true);assert.equal(cached.painted.length,0,'an unchanged visible station reuses the existing static bands');assert.equal(cached.stats.triangles,scenic.stats.triangles);
 const moved=render({scenicHorizon:true,scenicBackdropBounds:{...bounds,x:100,z:100}});assert.equal(moved.stats.staticCacheHit,false);assert.equal(moved.painted.length,0,'moving the permitted scenery bounds cannot reuse an old visible station');
 const restored=render({scenicHorizon:true,scenicBackdropBounds:bounds});assert.equal(restored.stats.staticCacheHit,false);assert.ok(restored.painted.length>0,'returning to the authored bounds rebuilds the actual station');
 const emitted=painter._geometry(meshes.static,true),invalidBounds=[
  ...[NaN,Infinity].flatMap(value=>['x','z','w','d'].map(key=>({...bounds,[key]:value}))),
  {...bounds,w:-1},{...bounds,d:-1},
  // Place each zero-width/depth boundary exactly through a real emitted face
  // centroid. Comparison-only bounds would otherwise admit that far face.
  {...bounds,x:emitted[18],w:0},{...bounds,z:emitted[20],d:0}
 ];
 for(const state of[{scenicHorizon:false,scenicBackdropBounds:bounds},{scenicHorizon:true},...invalidBounds.map(scenicBackdropBounds=>({scenicHorizon:true,scenicBackdropBounds}))]){
  assert.ok(render({scenicHorizon:true,scenicBackdropBounds:bounds}).stats.triangles>0,'each rejection starts from the genuinely visible cached station');
  const result=render(state);assert.equal(result.stats.staticCacheHit,false);assert.equal(result.stats.triangles,0);assert.equal(result.painted.length,0,'absent, invalid or ordinary-scene bounds never retain far land');
 }
 painter.destroy();
}));

test('actual subpixel textured faces consume copied observatory colors and return to legacy colors when the atlas changes',()=>withSurfaces(()=>{
 const ctx=context(),painter=new CisternSoftwarePainter({width:100,height:100,getContext:()=>ctx}),geometry=new Geometry();
 geometry.quad([0,0,0],[0,0,.4],[.3,0,.4],[.3,0,0],[.9,.9,.9],0,0,1,[0,1,0]);
 const averages=[[.7,.6,.5],[.6,.5,.4],[.5,.4,.3],[.3,.4,.5]],atlas={width:1024,height:1024,complete:true,observatoryMaterialAverages:averages},legacy={width:1024,height:1024,complete:true};
 const meshes={static:mesh(geometry)},vp=new Float32Array([.2,0,0,0,0,.05,0,0,0,-.2,.01,0,0,0,0,1]);
 const render=materialImage=>{
  const stats=painter.render({meshes,vp,eye:[0,8,8],lights:[],lighting:{ambient:[1,1,1],key:[0,0,0],fogDensity:0},materialImage,state:{adventure:true,player:{x:0,z:0}}});
  return{stats,colors:painter.staticFrame.bands.flatMap(b=>b.canvas.context.fills)};
 };
 const custom=render(atlas);assert.equal(custom.stats.triangles,2);assert.equal(custom.stats.texturedTriangles,0,'these visible 6px faces exercise the small-triangle branch, not texture sampling');assert.ok(custom.colors.length>=2,'both visible faces are painted');assert.deepEqual([...new Set(custom.colors)],['rgb(179,153,128)'],'every face and its opaque floor undercoat use the copied author palette');
 averages[0][0]=0;assert.deepEqual(painter.materialAverages[0],[.7,.6,.5],'the painter copies validated palette values instead of keeping a mutable asset reference');
 const old=render(legacy);assert.equal(old.stats.staticCacheHit,false);assert.equal(painter.materialAverages,null);assert.ok(old.colors.length>=2);assert.deepEqual([...new Set(old.colors)],['rgb(77,74,64)'],'switching to a legacy atlas restores its established limestone fallback on every paint operation');
 for(const invalid of[[[.7,.6,.5]],[[NaN,.6,.5],[.6,.5,.4],[.5,.4,.3],[.3,.4,.5]],[[-.1,.6,.5],[.6,.5,.4],[.5,.4,.3],[.3,.4,.5]],[[1.1,.6,.5],[.6,.5,.4],[.5,.4,.3],[.3,.4,.5]]]){
  const result=render({...legacy,observatoryMaterialAverages:invalid});assert.equal(painter.materialAverages,null);assert.deepEqual(result.colors,old.colors,'malformed surface averages cannot change the native fallback');
 }
 painter.destroy();
}));
