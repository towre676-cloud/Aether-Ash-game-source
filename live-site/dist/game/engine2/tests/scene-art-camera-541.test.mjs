import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';
import {Geometry,C} from '../cistern-renderer.js';
import {buildAdventureGeometry} from '../adventure-3d-geometry.js';
import {appendOriginArt541} from '../origin-art-541.js';
import {appendDungeonArt541} from '../dungeon-art-541.js';
import {sceneArtCameraFrame} from '../scene-art-camera-541.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../embodied-origins.js';
import {touchControlLayout} from '../touch-layout.js';
import {fieldControlLayout} from '../field-hud.js';
import {isInteriorScene} from '../scene-identity.js';
const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url))),noop=()=>{};
function frame(id,width=388,height=842){
 const world=new World(data),controller=installEmbodiedOrigins(world),origin=world.scenes.get(id)?.originId||null;
 world.newGame(origin?{originId:origin,quiet:true}:{quiet:true});world.loadScene(id);world.state.mode='field';controller.snapshot();
 const objects=[...world.objects().filter(o=>!replacesEmbodiedOriginObject(world,o)),...controller.objects()],native=touchControlLayout(width,height,{preset:'spaced'}),field=fieldControlLayout({x:0,y:0,width,height},{confirm:native.buttons.a,secondary:native.buttons.x,joystick:native.joystick,reset:native.reset}),rect={left:17,top:29,width,height},renderer=Object.create(Adventure3DRenderer.prototype),hudHeight=width>height*1.3?52:106;
 Object.assign(renderer,{world,sceneObjects:objects,frameOptions:{},canvas:{width:width*2,height:height*2,getBoundingClientRect:()=>rect},zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],ui:{hudHeight,touch:true,touchReserve:field.reserve},drawDt:1/60,resize:noop,buildDynamic:noop,software:{render:()=>({})}});
 const draw=()=>{renderer.forceRender=true;renderer.render({time:1,adventure:true,player:{x:world.state.x,z:world.state.y}},world.activeHeroes,1/60);};draw();Object.defineProperty(renderer,'room541',{get(){return sceneArtCameraFrame({world:this.world,canvas:this.canvas,ui:this.ui,lead:this.camera||{x:world.state.x,z:world.state.y},p:{x:world.state.x,z:world.state.y},objects:this.sceneObjects,aspect:this.canvas.width/this.canvas.height});}});return{world,renderer,rect,draw,field,hudHeight};
}
function checkPick(f,x,z){const p=f.renderer.worldToScreen(x,z),picked=f.renderer.screenToWorld(f.rect.left+p.x,f.rect.top+p.y);assert.ok(picked&&Math.abs(picked.x-x)<.001&&Math.abs(picked.y-z)<.001,'the composed matrix and native inverse recover the exact floor coordinate');}

function floorIntervals(f,mesh){
 const spans=[],line=f.rect.width/2;
 for(let i=0;i<mesh.v.length;i+=36){
  const p=[0,12,24].map(j=>mesh.v.slice(i+j,i+j+3));if(!p.every(q=>q[1]>=0&&q[1]<.08)||mesh.v[i+4]<.99)continue;
  const q=p.map(v=>f.renderer.worldToScreen(v[0],v[2],v[1])),cross=[];
  for(let j=0;j<3;j++){const a=q[j],b=q[(j+1)%3];if((a.x<=line&&b.x>=line||a.x>=line&&b.x<=line)&&Math.abs(a.x-b.x)>.001)cross.push(a.y+(b.y-a.y)*(line-a.x)/(b.x-a.x));}
  if(cross.length>=2)spans.push([Math.min(...cross),Math.max(...cross)]);
 }
 return spans;
}
test('normal phone and desktop room cameras keep a readable lead and foreground floor instead of a miniature display over blank backdrop',()=>{
 for(const id of[50000,2,701,703])for(const[width,height]of[[388,842],[360,740],[1363,936],[738,358]]){
  const f=frame(id,width,height),r=f.renderer.room541,saved=f.world.save();assert.ok(r);const wide=width>height*1.3,foot=f.renderer.worldToScreen(f.world.state.x,f.world.state.y),head=f.renderer.worldToScreen(f.world.state.x,f.world.state.y,1.94);
  assert.ok(foot.visible&&head.visible);assert.ok(foot.y-head.y>=(wide?34:64),`${id} ${width}px lead remains normal play size (${foot.y-head.y}px)`);
  assert.ok(head.y>=f.hudHeight+18&&foot.y<=r.scope.window.bottom-16,'the complete lead stays clear of HUD and thumbs');
  if(width===388)assert.ok(foot.y>=430&&foot.y<=570,'phone feet occupy the working middle/lower field');
  const mesh=buildAdventureGeometry(Geometry,C,f.world);appendOriginArt541(mesh,{world:f.world});appendDungeonArt541(mesh,{world:f.world});
  if([50000,2].includes(id)&&!wide){const intervals=floorIntervals(f,mesh);assert.ok(intervals.some(([a,b])=>b>=height-24)&&intervals.some(([a,b])=>a<=foot.y&&b>=foot.y),'actual room floor continues behind the bottom controls, eliminating the old empty display plinth');}
  const nearWalls=[];for(let i=0;i<mesh.v.length;i+=12){const x=mesh.v[i],y=mesh.v[i+1],z=mesh.v[i+2];if(y>2.3&&y<3.1&&Math.hypot(x-f.world.state.x,z-f.world.state.y)<4.9)nearWalls.push(f.renderer.worldToScreen(x,z,y));}
  assert.ok(nearWalls.some(p=>p.x>=0&&p.x<=width&&p.y<=f.hudHeight+140)||floorIntervals(f,mesh).some(([a,b])=>a<=f.hudHeight+140&&b>=f.hudHeight+140),`${id} ${width}px occupied walls or floor reach the upper field instead of leaving a blank band`);
  checkPick(f,f.world.state.x,f.world.state.y);assert.equal(f.world.save(),saved);
 }
});
test('long clinics and archive wings retain normal actor size and local framing without fitting the entire exported plan',()=>{
 for(const id of[50,212,213,214,234,50010])for(const[width,height]of[[388,842],[1363,936]]){
  const f=frame(id,width,height),r=f.renderer.room541,foot=f.renderer.worldToScreen(f.world.state.x,f.world.state.y),head=f.renderer.worldToScreen(f.world.state.x,f.world.state.y,1.94);
  assert.ok(r&&r.scope.localRadius<=5);assert.ok(r.scope.structuralCells<=r.scope.totalStructuralCells);assert.ok(r.scope.worldBounds.x1-r.scope.worldBounds.x0<12&&r.scope.worldBounds.z1-r.scope.worldBounds.z0<12);
  assert.ok(foot.y-head.y>=64,'readable lead is a hard requirement even in a sixty-four-cell archive');assert.ok(head.y>=f.hudHeight+18&&foot.y<=r.scope.window.bottom-16);
  if(width===388)assert.ok(foot.y>=430&&foot.y<=570,'the archive has the same usable play composition');checkPick(f,f.world.state.x,f.world.state.y);
 }
});
test('the nearest active control and both selected cable endpoints retain actual picking while manual pinch keeps its anchor',()=>{
 const f=frame(50000),w=f.world;w.state.chronicle.step=1;w.embodiedOrigins.snapshot();f.renderer.sceneObjects=[...w.objects().filter(o=>!replacesEmbodiedOriginObject(w,o)),...w.embodiedOrigins.objects()];f.draw();const r=f.renderer.room541;
 for(const q of r.points){const p=f.renderer.worldToScreen(q[0],q[2],q[1]);assert.ok(p.visible&&p.x>=r.scope.window.left-2&&p.x<=r.scope.window.right+2&&p.y>=r.scope.window.top-2&&p.y<=r.scope.window.bottom+2,'hard lead and selected native input points remain usable');}
 const selected=f.renderer.sceneObjects.find(o=>o.id===r.scope.selectedControl);assert.ok(selected?.role==='embodiedAction');checkPick(f,selected.xy[0]+.5,selected.xy[1]+.5);
 const anchor={x:w.state.x,y:w.state.y},before=f.renderer.worldToScreen(anchor.x,anchor.y),saved=w.save();f.renderer.setZoom(1.9,{x:before.x,y:before.y});f.draw();const after=f.renderer.worldToScreen(anchor.x,anchor.y);
 assert.ok(Math.abs(before.x-after.x)<.05&&Math.abs(before.y-after.y)<.05,'manual lens preserves the chosen world anchor');assert.equal(f.renderer.zoom,1.9);checkPick(f,anchor.x,anchor.y);assert.equal(w.save(),saved);
});
test('all sixty-four non-Veyr interiors use a finite close frame without changing native state',()=>{
 const world=new World(data);world.newGame({quiet:true});let count=0;
 for(const scene of world.scenes.values()){
  if(scene.originId==='veyr-storm'||!isInteriorScene(scene))continue;world.loadScene(scene.location);world.state.mode='field';const objects=world.objects(),saved=world.save(),r=sceneArtCameraFrame({world,canvas:{getBoundingClientRect:()=>({width:388,height:842})},ui:{hudHeight:106,touch:true,touchReserve:177},p:{x:world.state.x,z:world.state.y},objects});
  assert.ok(r&&[...r.eye,...r.at,r.fov,r.shift.x,r.shift.y].every(Number.isFinite));assert.ok(r.scope.actorPixels>=64,'normal play size at scene '+scene.location);assert.equal(world.save(),saved);count++;
 }
 assert.equal(count,64);
});
test('outdoor worlds, Veyr and invalid surfaces do not acquire a second camera owner',()=>{
 const f=frame(2);for(const id of[5,50001,50012,50013]){f.world.state.scene=id;assert.equal(sceneArtCameraFrame({world:f.world,canvas:f.renderer.canvas,ui:f.renderer.ui}),null);}
 assert.equal(sceneArtCameraFrame({world:f.world,canvas:null}),null);
});
test('Iona’s actual selected cable keeps both native drag endpoints in the close field',()=>{
 const f=frame(50002),w=f.world;w.state.chronicle.step=1;w.embodiedOrigins.snapshot();const objects=w.embodiedOrigins.objects(),cable=objects.find(o=>o.manipulation==='cable');assert.ok(cable?.from&&cable?.to);
 const cell=[[0,1],[0,-1],[1,0],[-1,0]].map(([x,z])=>[cable.xy[0]+x,cable.xy[1]+z]).find(([x,z])=>w.walkable(x+.5,z+.5));assert.ok(cell);[w.state.x,w.state.y]=cell.map(v=>v+.5);f.renderer.camera=null;f.renderer.fieldViewOffset={x:0,y:0};f.renderer.sceneObjects=objects;f.draw();const r=f.renderer.room541,saved=w.save();assert.equal(r.scope.selectedControl,cable.id);
 for(const end of[cable.from,cable.to])for(const height of[0,.9]){const p=f.renderer.worldToScreen(end.x,end.y,height);assert.ok(p.visible&&p.x>=r.scope.window.left-2&&p.x<=r.scope.window.right+2&&p.y>=r.scope.window.top-2&&p.y<=r.scope.window.bottom+2,'both actual endpoints fit above the thumbs');checkPick(f,end.x,end.y);}
 assert.equal(w.save(),saved);
});
const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
function rayHitsTriangle(origin,target,a,b,c){const direction=sub(target,origin),e1=sub(b,a),e2=sub(c,a),h=cross(direction,e2),det=dot(e1,h);if(Math.abs(det)<1e-9)return false;const inv=1/det,s=sub(origin,a),u=dot(s,h)*inv;if(u<0||u>1)return false;const q=cross(s,e1),v=dot(direction,q)*inv;if(v<0||u+v>1)return false;const t=dot(e2,q)*inv;return t>1e-5&&t<.995;}
test('geometric Sable and Mira torso/head rays clear the room mesh independently of software sprite ordering',()=>{
 for(const id of[50000,50010,212,213]){
  const f=frame(id),mesh=buildAdventureGeometry(Geometry,C,f.world);appendOriginArt541(mesh,{world:f.world});appendDungeonArt541(mesh,{world:f.world});
  for(const height of[.8,1.4,1.9]){
   const target=[f.world.state.x,height,f.world.state.y];
   for(let i=0;i<mesh.v.length;i+=36)if(mesh.v[i+11]>.95&&mesh.v[i+9]<7.5)assert.equal(rayHitsTriangle(f.renderer.eye,target,mesh.v.slice(i,i+3),mesh.v.slice(i+12,i+15),mesh.v.slice(i+24,i+27)),false,id+' central torso/head is not hidden by the actual foreground bulkhead');
  }
 }
});
