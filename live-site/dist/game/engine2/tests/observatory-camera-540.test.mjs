import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';
import {Geometry,C} from '../cistern-renderer.js';
import {buildObservatoryGeometry,observatoryScenePlan} from '../observatory-art.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../embodied-origins.js';
import {touchControlLayout} from '../touch-layout.js';
import {fieldControlLayout} from '../field-hud.js';

const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url))),noop=()=>{};
function frame(){
 const world=new World(source);world.newGame({originId:'veyr-storm',quiet:true});
 world.state.chronicle.step=3;world.state.chronicle.choices={repair:0};world.state.embodiedOrigins={schema:'ash-aether.embodied-origins/1',origins:{'veyr-storm':{grounded:true,receiver:true,witnessed:true,diverted:true}}};
 world.loadScene(50013);world.state.mode='field';world.state.x=11.5;world.state.y=6.5;
 const controls=installEmbodiedOrigins(world),objects=[...world.objects().filter(o=>!replacesEmbodiedOriginObject(world,o)),...controls.objects()],rect={left:17,top:29,width:1363,height:936},renderer=Object.create(Adventure3DRenderer.prototype);
 Object.assign(renderer,{world,sceneObjects:objects,frameOptions:{},canvas:{width:rect.width,height:rect.height,getBoundingClientRect:()=>rect},zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],ui:{hudHeight:106,touch:true,touchReserve:177},drawDt:1/60,resize:noop,buildDynamic:noop,software:{render:()=>({})}});
 const draw=()=>{renderer.forceRender=true;renderer.render({time:1,adventure:true,scenicHorizon:true,player:{x:world.state.x,z:world.state.y}},world.activeHeroes,1/60);};draw();
 // Two real pinch gestures return to the baseline lens around different
 // floor anchors. This is a legitimate retained pan, not a fabricated offset.
 renderer.setZoom(1.9,{x:rect.width*.5,y:rect.height*.8});draw();renderer.setZoom(1.35,{x:rect.width*.5,y:rect.height*.25});draw();
 return {world,renderer,rect,draw};
}
function phone(f,width=388,height=842){
 const native=touchControlLayout(width,height,{preset:'spaced'}),field=fieldControlLayout({x:0,y:0,width,height},{confirm:native.buttons.a,secondary:native.buttons.x,joystick:native.joystick,reset:native.reset});
 Object.assign(f.rect,{width,height});Object.assign(f.renderer.canvas,{width:width*2,height:height*2});f.renderer.ui={hudHeight:106,touch:true,touchReserve:field.reserve};return field;
}
function mast(f){const p=observatoryScenePlan(f.world),mesh=buildObservatoryGeometry(Geometry,C,f.world),points=[];for(let i=0;i<mesh.v.length;i+=12){const x=mesh.v[i],y=mesh.v[i+1],z=mesh.v[i+2];if(y>=.1&&y<=7.35&&Math.abs(x-p.body.x)<1.65&&Math.abs(z-p.body.z)<1.35)points.push(f.renderer.worldToScreen(x,z,y));}assert.ok(points.length>100);return points;}
function pick(f,x,z){const p=f.renderer.worldToScreen(x,z),hit=f.renderer.screenToWorld(f.rect.left+p.x,f.rect.top+p.y);assert.ok(hit&&Math.abs(hit.x-x)<.001&&Math.abs(hit.y-z)<.001,'final camera retains exact native floor picking');}

test('desktop-to-phone baseline recomposition clears inherited pan and restores the actual mast silhouette',()=>{
 for(const [width,height]of[[388,842],[360,740]]){
  const f=frame(),inherited=frame(),saved=f.world.save();assert.ok(f.renderer.fieldViewOffset.y>.25,'real baseline pinch history contains a meaningful upward pan');
  const field=phone(f,width,height);phone(inherited,width,height);
  // A camera already carrying this viewport has no resize to clear its old
  // pan: it isolates the previous failure through the same projection chain.
  inherited.renderer.observatoryViewport={width,height};inherited.draw();
  assert.ok(mast(inherited).some(p=>p.y<106),'retaining this desktop pan really hides the mast behind the portrait HUD');
  f.draw();const points=mast(f),bottom=height-field.reserve-60;
  assert.ok(points.every(p=>p.visible&&p.x>=8&&p.x<=width-8&&p.y>=106&&p.y<=bottom+8),'resized actual static mast clears the HUD and thumb controls');
  assert.ok(Math.abs(f.renderer.fieldViewOffset.x)<1e-6&&Math.abs(f.renderer.fieldViewOffset.y)<1e-6,'baseline follows the new authored composition');assert.equal(f.renderer.zoom,1.35);
  const resized=Array.from(f.renderer.vp);f.renderer.resetView();f.draw();assert.deepEqual(Array.from(f.renderer.vp),resized,'rotation now matches the established Reset view composition');
  pick(f,13.5,5.5);assert.equal(f.world.save(),saved,'viewport changes do not edit native world state');
 }
});

test('a manual lens retains its established pan when the viewport changes',()=>{
 const f=frame(),control=frame();for(const r of[f.renderer,control.renderer])r.setZoom(1.9,{x:650,y:550});f.draw();control.draw();
 phone(f);phone(control);control.renderer.observatoryViewport={width:388,height:842};f.draw();control.draw();
 assert.equal(f.renderer.zoom,1.9);assert.deepEqual(Array.from(f.renderer.vp),Array.from(control.renderer.vp),'manual composition behaves exactly like the existing lens path without a resize reset');
 assert.deepEqual(f.renderer.fieldViewOffset,control.renderer.fieldViewOffset);assert.ok(Math.abs(f.renderer.fieldViewOffset.y)>1e-4);pick(f,13.5,5.5);
});

test('an active baseline pinch anchor survives the resize and lands at its requested portrait pixel',()=>{
 const f=frame(),control=frame();phone(f);phone(control);
 const point={x:13.5,y:5.5},anchor={point,x:205,y:385};
 for(const r of[f.renderer,control.renderer])r.pendingZoomAnchor={...anchor};control.renderer.observatoryViewport={width:388,height:842};f.draw();control.draw();
 const p=f.renderer.worldToScreen(point.x,point.y);assert.ok(Math.abs(p.x-anchor.x)<.05&&Math.abs(p.y-anchor.y)<.05,'active world anchor keeps its requested pixel through the real projection');
 assert.deepEqual(Array.from(f.renderer.vp),Array.from(control.renderer.vp));assert.equal(f.renderer.pendingZoomAnchor,null,'the normal projection consumes the gesture once');assert.equal(f.renderer.zoom,1.35);pick(f,point.x,point.y);
});
