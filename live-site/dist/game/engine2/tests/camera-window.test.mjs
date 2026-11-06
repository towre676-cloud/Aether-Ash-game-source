import test from 'node:test';
import assert from 'node:assert/strict';
import {explorationCameraTarget} from '../camera-window.js';
import {cameraFollow} from '../scene-camera.js';
import {viewLayout} from '../presentation.js';

const desktop={enabled:true,width:1366,height:936,layout:viewLayout(1366,936,{hudHeight:150})};
const close=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} should be near ${expected}`);

test('actual walking displacement adds bounded directional space through the same window',()=>{
 const camera=Object.freeze({x:480,y:720,zoom:1.44}),composition=Object.freeze({...camera});
 const right=explorationCameraTarget(camera,composition,{...desktop,travel:{x:.05,y:0}}),left=explorationCameraTarget(camera,composition,{...desktop,travel:{x:-.05,y:0}});
 assert.ok(right.x>camera.x&&left.x<camera.x);assert.ok((right.x-camera.x)*right.zoom<=64);assert.equal(right.y,camera.y);assert.equal(right.zoom,camera.zoom);
 const mobile=explorationCameraTarget(camera,composition,{enabled:true,width:390,height:780,layout:{visibleHeight:400},travel:{x:.05,y:.05}});assert.ok(Math.abs(mobile.x-camera.x)*mobile.zoom<32);assert.ok(Math.abs(mobile.y-camera.y)*mobile.zoom<32);
});
test('standing, scene jumps, invalid displacement and steady framing add no camera lead',()=>{
 const camera={x:480,y:720,zoom:1.44},composition={...camera},base=explorationCameraTarget(camera,composition,desktop);
 for(const travel of [null,{x:0,y:0},{x:NaN,y:0},{x:Infinity,y:1},{x:10,y:10}])assert.deepEqual(explorationCameraTarget(camera,composition,{...desktop,travel}),base);
 assert.deepEqual(explorationCameraTarget(camera,composition,{...desktop,travel:{x:.05,y:0},steady:true}),base);
 assert.equal(explorationCameraTarget(camera,composition,{...desktop,travel:{x:.05,y:0},enabled:false}),composition);
});

test('disabled exploration windows return battle and conversation compositions untouched',()=>{
 const camera={x:40,y:80,zoom:1.6};
 for(const composition of [{x:210,y:330,zoom:.63,mode:'battle'},{x:320,y:410,zoom:1.86,mode:'dialog'}]){
  Object.freeze(composition);
  assert.equal(explorationCameraTarget(camera,composition),composition);
  assert.equal(explorationCameraTarget(camera,composition,{...desktop,enabled:false}),composition);
 }
});

test('small exploration steps and changes of direction do not shift the scenery',()=>{
 const camera=Object.freeze({x:480,y:720,zoom:1.44});
 for(const [dx,dy] of [[0,0],[3,0],[0,-3],[-3,3],[2,-2],[0,0]]){
  const composition=Object.freeze({x:camera.x+dx,y:camera.y+dy,zoom:1.44});
  assert.deepEqual(explorationCameraTarget(camera,composition,desktop),camera);
 }
});

test('large movement follows in both directions while retaining a small screen-space margin',()=>{
 for(const [width,height] of [[390,780],[740,360],[1366,936],[3200,1800]]){
  const layout=viewLayout(width,height,{touch:width<600,hudHeight:height<500?77:112});
  const options={enabled:true,width,height,layout};
  for(const sign of [-1,1]){
   const camera=Object.freeze({x:480,y:720,zoom:1.4});
   const composition=Object.freeze({x:camera.x+sign*360,y:camera.y+sign*240,zoom:1.4});
   const target=explorationCameraTarget(camera,composition,options);
   assert.equal(target.zoom,composition.zoom);
   for(const axis of ['x','y']){
    assert.ok((target[axis]-camera[axis])*sign>0);
    assert.ok((composition[axis]-target[axis])*sign>0);
    assert.ok(Math.abs(composition[axis]-target[axis])*target.zoom<50);
   }
  }
 }
});

test('long travel and reversal keep an ideal follow target inside the window without drift',()=>{
 let camera={x:0,y:0,zoom:1.44};
 for(const sign of [1,-1]){
  for(let step=1;step<=180;step++){
   const distance=sign===1?step*10:1800-step*10;
   const composition={x:distance,y:distance*.4,zoom:1.44};
   const before=camera;
   camera=explorationCameraTarget(camera,composition,desktop);
   assert.ok(Math.abs(composition.x-camera.x)*camera.zoom<50);
   assert.ok(Math.abs(composition.y-camera.y)*camera.zoom<32);
   assert.ok((camera.x-before.x)*sign>=0);
  }
 }
 const stopped={x:0,y:0,zoom:camera.zoom},rest=explorationCameraTarget(camera,stopped,desktop);
 for(let frame=0;frame<100;frame++)camera=explorationCameraTarget(camera,stopped,desktop);
 assert.deepEqual(camera,rest);
});

test('zoom changes preserve the composed lens and immediately resize the world-space window',()=>{
 const camera={x:480,y:720,zoom:1};
 const composition={x:500,y:720,zoom:1};
 assert.equal(explorationCameraTarget(camera,composition,desktop).x,camera.x);
 const zoomed=explorationCameraTarget(camera,{...composition,zoom:4},desktop);
 assert.equal(zoomed.zoom,4);
 assert.ok(zoomed.x>camera.x&&zoomed.x<composition.x);
 assert.deepEqual(zoomed,explorationCameraTarget({...camera,zoom:.7},{...composition,zoom:4},desktop));
 const wider=explorationCameraTarget(camera,{...composition,zoom:.5},desktop);
 assert.equal(wider.zoom,.5);
 assert.equal(wider.x,camera.x);
});

test('viewport resizing and measured HUD bands reduce the window instead of hiding the focus',()=>{
 const camera={x:480,y:720,zoom:1};
 const composition={x:510,y:740,zoom:1};
 const wide=explorationCameraTarget(camera,composition,desktop);
 assert.equal(wide.x,camera.x);
 assert.equal(wide.y,camera.y);
 const narrow=explorationCameraTarget(camera,composition,{enabled:true,width:320,height:400,layout:{top:100,bottom:140}});
 assert.ok(narrow.x>wide.x);
 assert.ok(narrow.y>wide.y);
 const measured=explorationCameraTarget(camera,composition,{enabled:true,width:320,height:400,layout:{visibleHeight:160,top:0,bottom:0}});
 assert.deepEqual(measured,narrow);
 const sidePanel=explorationCameraTarget(camera,composition,{enabled:true,width:1366,height:936,layout:{right:1046,visibleHeight:160}});
 assert.deepEqual(sidePanel,narrow);
});

test('cameraFollow still performs all settling and stops without recentering the held focus',()=>{
 const composition={x:600,y:840,zoom:1.44};
 let camera={x:480,y:720,zoom:1.44};
 const target=explorationCameraTarget(camera,composition,desktop);
 assert.deepEqual(cameraFollow(camera,target,0),camera);
 const first=cameraFollow(camera,target,1/60);
 assert.ok(first.x>camera.x&&first.x<target.x);
 assert.ok(first.y>camera.y&&first.y<target.y);
 for(let frame=0;frame<240;frame++)camera=cameraFollow(camera,explorationCameraTarget(camera,composition,desktop),1/60);
 close(camera.x,target.x);
 close(camera.y,target.y);
 assert.ok(camera.x<composition.x&&camera.y<composition.y);
});

test('the target window adds no frame-rate dependence to an existing stationary follow',()=>{
 const composition={x:600,y:840,zoom:1.44},results=[];
 for(const fps of [30,60,120]){
  let camera={x:480,y:720,zoom:1.44};
  for(let frame=0;frame<fps*2;frame++)camera=cameraFollow(camera,explorationCameraTarget(camera,composition,desktop),1/fps);
  results.push(camera);
 }
 for(const result of results){
  close(result.x,results[0].x);
  close(result.y,results[0].y);
  assert.equal(result.zoom,composition.zoom);
 }
});

test('missing, nonfinite and tiny views bypass the helper without poisoning a valid composition',()=>{
 const camera={x:480,y:720,zoom:1.44};
 const composition=Object.freeze({x:600,y:840,zoom:1.44});
 for(const options of [
  {enabled:true},{...desktop,width:NaN},{...desktop,height:Infinity},{...desktop,width:0},
  {...desktop,width:-10},{...desktop,width:1},{...desktop,height:1},
  {...desktop,layout:{visibleHeight:0}},{...desktop,layout:{top:2000}},
  {...desktop,layout:{right:2000}},
 ]){
  assert.equal(explorationCameraTarget(camera,composition,options),composition);
 }
 for(const invalidCamera of [null,{}, {...camera,x:NaN},{...camera,y:Infinity},{...camera,zoom:0}]){
  assert.equal(explorationCameraTarget(invalidCamera,composition,desktop),composition);
 }
 const ignoredBadInsets=explorationCameraTarget(camera,composition,{...desktop,layout:{top:NaN,bottom:Infinity,right:-4}});
 assert.ok(Number.isFinite(ignoredBadInsets.x)&&Number.isFinite(ignoredBadInsets.y));
 assert.equal(ignoredBadInsets.zoom,composition.zoom);
});

test('invalid composed frames and arithmetic overflow bypass unchanged',()=>{
 const camera={x:480,y:720,zoom:1.44};
 for(const composition of [null,undefined,{}, {x:NaN,y:2,zoom:1},{x:1,y:2,zoom:NaN},{x:1,y:2,zoom:-1},{x:1,y:2,zoom:Number.MIN_VALUE}]){
  assert.equal(explorationCameraTarget(camera,composition,desktop),composition);
 }
 const large={x:Number.MAX_VALUE,y:1,zoom:1};
 assert.equal(explorationCameraTarget({x:-Number.MAX_VALUE,y:1,zoom:1},large,desktop),large);
});
