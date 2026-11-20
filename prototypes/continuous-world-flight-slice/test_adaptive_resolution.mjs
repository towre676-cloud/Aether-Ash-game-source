import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Execute the exact inline prototype implementation with a mocked canvas.
// This catches accidental changes to the checked-in single-file flight slice.
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const start=html.indexOf('const resolutionState={');
const end=html.indexOf("addEventListener('resize',resize);resize();",start);
assert.ok(start>0&&end>start,'resolution implementation must remain present');
const implementation=html.slice(start,end);
function setup({software=false,dpr=1.5,hidden=false}={}){
 const canvas={width:1,height:1};
 const window={devicePixelRatio:dpr,__flightResolution:null};
 const document={hidden};
 const create=new Function('canvas','softwareRenderer','window','document','innerWidth','innerHeight',
   implementation+';return {resize,adaptResolution,resolutionState};');
 return {canvas,window,document,...create(canvas,software,window,document,1280,720)};
}
test('initial hardware resolution preserves native detail and avoids redundant resize',()=>{
 const q=setup();q.resize();
 assert.equal(q.canvas.width,1920);assert.equal(q.canvas.height,1080);
 q.resize();assert.equal(q.resolutionState.adjustments,0);
 assert.equal(q.window.__flightResolution,q.resolutionState);
});
test('persistent slow frames reduce raster scale, bounded by readability floor',()=>{
 const q=setup();q.resize();
 for(let i=1;i<=25;i++)q.adaptResolution(45,i*3000);
 assert.equal(q.resolutionState.scale,.82);
 assert.equal(q.canvas.width,Math.round(1280*1.5*.82));
 assert.equal(q.canvas.height,Math.round(720*1.5*.82));
});
test('fast frames recover resolution without oscillating inside hysteresis window',()=>{
 const q=setup();q.resize();
 q.adaptResolution(80,3000);
 const lowered=q.resolutionState.scale;
 for(let t=3100;t<5400;t+=100)q.adaptResolution(5,t);
 assert.equal(q.resolutionState.scale,lowered);
 for(let i=1;i<=20;i++)q.adaptResolution(5,6000+i*3000);
 assert.equal(q.resolutionState.scale,1);
});
test('software renderer retains baseline scale and never exceeds its cap',()=>{
 const q=setup({software:true});q.resize();
 assert.equal(q.canvas.width,Math.round(1280*1.5*.7));
 for(let i=1;i<=30;i++)q.adaptResolution(65,i*3000);
 assert.equal(q.resolutionState.scale,.78);
 assert.equal(q.canvas.width,Math.round(1280*1.5*.7*.78));
});
test('hidden tab and invalid measurements leave raster alone',()=>{
 const q=setup({hidden:true});q.resize();
 q.adaptResolution(100,3000);assert.equal(q.resolutionState.scale,1);
 q.document.hidden=false;q.adaptResolution(NaN,6000);q.adaptResolution(-1,9000);
 assert.equal(q.resolutionState.scale,1);
});
