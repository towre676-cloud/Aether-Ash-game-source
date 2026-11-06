import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraZoomValue,readCameraZoom,saveCameraZoom,CAMERA_ZOOM_KEY,zoomCameraAt} from '../camera-zoom.js';
import {sceneCamera,cameraFollow} from '../scene-camera.js';
import {explorationCameraTarget} from '../camera-window.js';
import {viewLayout} from '../presentation.js';
import {Renderer} from '../renderer.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function storage(){const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
test('a chosen absolute zoom survives a new reader and automatic reset removes it',()=>{
 const s=storage();assert.equal(readCameraZoom(s),null);assert.equal(saveCameraZoom(s,1.873246),true);
 assert.equal(readCameraZoom(s),1.873246);assert.deepEqual(JSON.parse(s.getItem(CAMERA_ZOOM_KEY)),{version:1,zoom:1.873246});
 saveCameraZoom(s,null);assert.equal(readCameraZoom(s),null);assert.equal(s.values.has(CAMERA_ZOOM_KEY),false);
});
test('corrupt preferences and unavailable storage safely retain automatic framing',()=>{
 const s=storage();for(const value of ['{','null','true','3','{"version":2,"zoom":2}','{"version":1,"zoom":"2"}','{"version":1,"zoom":0}','{"version":1,"zoom":-2}']){s.setItem(CAMERA_ZOOM_KEY,value);assert.equal(readCameraZoom(s),null,value);}
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('full');},removeItem(){throw Error('blocked');}};
 assert.equal(readCameraZoom(blocked),null);assert.equal(saveCameraZoom(blocked,2),false);assert.equal(saveCameraZoom(blocked,null),false);
 for(const value of [undefined,null,NaN,Infinity,-Infinity,-1,0,'2'])assert.equal(cameraZoomValue(value),null);
 assert.equal(cameraZoomValue(.1),.5);assert.equal(cameraZoomValue(8),3);
});
test('the actual renderer keeps the world point under a pinch midpoint at every supported zoom',()=>{
 for(const [width,height,ui]of [[390,844,{touch:true,hudHeight:140}],[740,360,{touch:true,hudHeight:90}],[1363,936,{battle:true,battleDockWidth:420,hudHeight:150}]]){
  const layout=viewLayout(width,height,ui),camera={x:812,y:543,zoom:1.44};
  for(const anchor of [{x:width*.25,y:height*.4},{x:width*.7,y:height*.65}])for(const zoom of [.5,1,1.873246,3]){
   const r={camera:{...camera},width,layout,transform:{z:camera.zoom,ox:(layout.centerX??width/2)-camera.x*camera.zoom,oy:layout.centerY-camera.y*camera.zoom}};
   const before=Renderer.prototype.screenToWorld.call(r,anchor.x,anchor.y);
   Renderer.prototype.setManualZoom.call(r,zoom,anchor);const after=Renderer.prototype.screenToWorld.call(r,anchor.x,anchor.y);
   close(after.x,before.x);close(after.y,before.y);assert.equal(r.camera.zoom,zoom);assert.equal(r.manualZoom,zoom);
   const target={x:before.x+2,y:before.y-1},sx=target.x*48*r.transform.z+r.transform.ox,sy=target.y*48*r.transform.z+r.transform.oy;
   const hit=Renderer.prototype.screenToWorld.call(r,sx,sy);close(hit.x,target.x);close(hit.y,target.y);
  }
 }
});
test('scene changes, conversation focus, landmarks and warnings cannot replace the chosen lens',()=>{
 const hero={x:11,y:10,hp:100},enemy={x:25,y:30,hp:200,boss:true,intent:{shape:'circle',x:25,y:30,radius:8}},battle={heroes:[hero],enemies:[enemy]};
 const places=[{}, {household:{box:{left:2,top:2,right:30,bottom:30}}}, {authoredOpening:{landmark:{xy:[11,11]}}}];
 for(const [w,h]of [[390,844],[740,360],[1363,936]])for(const zoom of [.5,1.873246,3])for(const scene of places)for(const mode of ['field','dialog','battle'])for(const steady of [false,true]){
  const layout=viewLayout(w,h,{hudHeight:h<500?80:145,battle:mode==='battle',dialog:mode==='dialog',battleDockHeight:h<500?100:220}),frame=sceneCamera(scene,{...hero,mode},layout,w,h,{manualZoom:zoom,focus:{x:13,y:11},landmarks:[{x:11,y:11}],battle:mode==='battle'?battle:false,steady});
  assert.equal(frame.zoom,zoom);assert.ok(Number.isFinite(frame.x+frame.y));
 }
});
test('a zoomed room follows its traveller using the selected scale instead of the old room fit',()=>{
 const scene={household:{box:{left:0,top:0,right:20,bottom:20}}},l=viewLayout(390,844,{hudHeight:130}),a={x:4,y:5,mode:'field'},b={x:17,y:17,mode:'field'};
 const left=sceneCamera(scene,a,l,390,844,{manualZoom:3}),right=sceneCamera(scene,b,l,390,844,{manualZoom:3});
 assert.equal(left.zoom,3);assert.equal(right.zoom,3);assert.ok(right.x>left.x+300);assert.ok(right.y>left.y+300);
 for(const [p,actor]of [[left,a],[right,b]]){const x=195+(actor.x*48-p.x)*p.zoom,y=l.centerY+(actor.y*48-p.y)*p.zoom;assert.ok(x>0&&x<390);assert.ok(y>=l.top&&y<=844-l.bottom);}
});
test('manual battle view follows the selected living actor and never stays on a defeated lead',()=>{
 const lead={id:0,x:10,y:10,hp:100},other={id:1,x:25,y:12,hp:90},battle={heroes:[lead,other],enemies:[]},l=viewLayout(390,844,{battle:true,battleDockHeight:240});
 const selected=sceneCamera({},lead,l,390,844,{battle,manualZoom:3,battleFocus:other});assert.equal(selected.x,other.x*48);assert.equal(selected.y,other.y*48-36);assert.equal(selected.zoom,3);
 lead.hp=0;const fallback=sceneCamera({},lead,l,390,844,{battle,manualZoom:3,battleFocus:lead});assert.deepEqual(fallback,selected);
 const stranger={x:999,y:999,hp:100};assert.deepEqual(sceneCamera({},lead,l,390,844,{battle,manualZoom:3,battleFocus:stranger}),selected);
});
test('the camera follow chain preserves the exact saved scale over repeated travel frames',()=>{
 const zoom=1.873246,layout=viewLayout(390,844,{touch:true,hudHeight:140});let camera={x:480,y:480,zoom};
 for(let frame=0;frame<900;frame++){
  const state={x:10+frame/100,y:10+Math.sin(frame/60),mode:'field'},scene=frame<300?{}:{household:{box:{left:0,top:0,right:30,bottom:30}}};
  const composition=sceneCamera(scene,state,layout,390,844,{manualZoom:zoom,landmarks:[{x:state.x+.5,y:state.y+.5}]}),target=explorationCameraTarget(camera,composition,{enabled:true,width:390,height:844,layout});
  camera=cameraFollow(camera,target,1/60);assert.equal(camera.zoom,zoom);
 }
 assert.ok(camera.x>800);
});
test('returning to automatic zoom restores the existing scene lens and leaves the last frame finite',()=>{
 const state={x:10,y:10,mode:'field'},layout=viewLayout(1363,936,{hudHeight:150}),expected=sceneCamera({},state,layout,1363,936),r={camera:{x:480,y:480,zoom:3},width:1363,layout};
 Renderer.prototype.setManualZoom.call(r,null);assert.equal(r.manualZoom,null);
 const auto=sceneCamera({},state,layout,1363,936,{manualZoom:r.manualZoom});assert.deepEqual(auto,expected);assert.notEqual(auto.zoom,3);
 assert.deepEqual(zoomCameraAt({x:1,y:2,zoom:1},NaN),{x:1,y:2,zoom:1});
});
