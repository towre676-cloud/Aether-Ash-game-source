import test from 'node:test';
import assert from 'node:assert/strict';
import {graphicsPolicy,backingStoreSize,canvasContextHealth,validSourceRect,preparedAtlasHealth,probeCanvas2D,monitorCanvasContext} from '../graphics-health.js';

test('backing stores stay within dimension and pixel limits at laptop, 4K, ultrawide and high-DPI sizes',()=>{
 for(const [w,h]of [[1366,768],[1920,1080],[3840,2160],[7680,2160],[100000,100],[1,100000],[1e308,1e308]])for(const compatibility of [false,true])for(const dpr of [1,1.25,2,4,NaN]){
  const r=backingStoreSize(w,h,dpr,{compatibility}),policy=graphicsPolicy(compatibility);
  assert.ok(r.drawable);assert.ok(r.width>=1&&r.height>=1);assert.ok(r.width<=4096&&r.height<=4096);assert.ok(r.width*r.height<=policy.maxPixels);assert.ok(r.dpr>0&&r.dpr<=policy.maxDpr);
 }
 for(const [w,h]of [[0,500],[500,0],[Infinity,100],[NaN,100],[-1,100]])assert.deepEqual(backingStoreSize(w,h,2),{width:1,height:1,dpr:1,drawable:false});
});
test('compatibility preserves source art while only changing backing scale and filter policy',()=>{
 const normal=backingStoreSize(1366,768,2),compatible=backingStoreSize(1366,768,2,{compatibility:true});assert.ok(compatible.width<normal.width);assert.equal(compatible.width,1366);assert.equal(graphicsPolicy(true).canvasFilters,false);assert.equal(graphicsPolicy(true).cssFilters,false);
});
test('source rectangles use decoded image dimensions and reject off-atlas, invalid and unready sources',()=>{
 const image={naturalWidth:100,naturalHeight:80,width:20,height:16};assert.equal(validSourceRect(image,{x:80,y:60,w:20,h:20}),true);
 for(const rect of [{x:81,y:60,w:20,h:20},{x:-1,y:0,w:10,h:10},{x:0,y:0,w:0,h:10},{x:0,y:NaN,w:10,h:10}])assert.equal(validSourceRect(image,rect),false);
 assert.equal(validSourceRect({naturalWidth:0,naturalHeight:0,width:100,height:80},{x:0,y:0,w:10,h:10}),false);
});
test('atlas health distinguishes empty isolation placeholders, invalid crops and genuinely transparent prepared art',()=>{
 const image={width:8,height:4},bounds=[{x:0,y:0,w:4,h:4},{x:4,y:0,w:4,h:4}],pixels=new Uint8ClampedArray(8*4*4);pixels[3]=255;
 const report=preparedAtlasHealth(image,bounds,{expectedCells:2,pixels});assert.equal(report.ok,false);assert.equal(report.nonempty,1);assert.equal(report.pixelsVerified,true);assert.deepEqual(report.issues,[{kind:'transparent-cell',index:1}]);
 assert.deepEqual(preparedAtlasHealth(image,[{x:0,y:0,w:1,h:1}]).issues,[{kind:'empty-cell',index:0}]);
 assert.deepEqual(preparedAtlasHealth(image,[{x:7,y:0,w:4,h:4}]).issues,[{kind:'source-rectangle',index:0}]);
 assert.equal(preparedAtlasHealth(image,bounds).ok,true);assert.equal(preparedAtlasHealth(image,bounds).pixelsVerified,false);
 assert.ok(preparedAtlasHealth(image,bounds,{expectedCells:3}).issues.some(i=>i.kind==='cell-count'));
});
test('null, lost and unqueryable context states remain distinguishable',()=>{
 assert.deepEqual(canvasContextHealth(null),{ok:false,state:'unavailable'});assert.deepEqual(canvasContextHealth({isContextLost:()=>true}),{ok:false,state:'lost'});assert.equal(canvasContextHealth({}).ok,true);assert.equal(canvasContextHealth({isContextLost(){throw Error();}}).ok,null);
});
function probeContext(mode='working'){
 return {filter:'none',fillRect(){},clearRect(){},getImageData(){if(mode==='blocked')throw Error('Readback blocked');return {data:mode==='blank'||(mode==='filter-failed'&&this.filter!=='none')?new Uint8ClampedArray(4):new Uint8ClampedArray([60,120,180,255])};}};
}
test('tiny readback probe distinguishes working baseline, bad filter, blank canvas and blocked inspection',()=>{
 const run=c=>probeCanvas2D({createCanvas:()=>({getContext:()=>c})});
 assert.deepEqual(run(probeContext()),{ok:true,state:'ready',filters:'working'});
 assert.deepEqual(run(probeContext('filter-failed')),{ok:true,state:'ready',filters:'failed'});
 assert.equal(run(probeContext('blank')).ok,false);assert.equal(run(probeContext('blocked')).ok,null);assert.equal(run(null).state,'unavailable');
});
test('2D loss and restoration events are reported without suppressing browser restoration',()=>{
 const listeners=new Map(),events=[],canvas={getContext:()=>({}),addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:(k,v)=>{if(listeners.get(k)===v)listeners.delete(k);}},watch=monitorCanvasContext(canvas,{onLost:()=>events.push('lost'),onRestored:()=>events.push('restored')});
 let cancelled=false;listeners.get('contextlost')({preventDefault(){cancelled=true;}});assert.equal(watch.health().state,'lost');assert.equal(cancelled,false);
 listeners.get('contextrestored')({});assert.equal(watch.health().state,'ready');assert.deepEqual(events,['lost','restored']);watch.destroy();assert.equal(listeners.size,0);
});
