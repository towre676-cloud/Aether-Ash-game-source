import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';
import {exteriorSceneArtCameraFrame} from '../exterior-scene-camera-541.js';
import {exteriorAnchorSites} from '../exterior-anchor-plan-541.js';
import {exteriorWorksitePlan541} from '../exterior-worksites-541.js';
import {originArtPlan541} from '../origin-art-541.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../embodied-origins.js';
import {touchControlLayout} from '../touch-layout.js';
import {fieldControlLayout} from '../field-hud.js';
import {isInteriorScene} from '../scene-identity.js';
const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url))),noop=()=>{};
function fixture(id,width=388,height=842){
 const world=new World(data),controller=installEmbodiedOrigins(world),origin=world.scenes.get(id)?.originId;
 world.newGame(origin?{originId:origin,quiet:true}:{quiet:true});world.state.scene=id;world.state.chapter=world.scene.chapter||1;const arrival=world.scene.authoredOpening?.arrival;[world.state.x,world.state.y]=arrival?.length===2&&world.walkable(...arrival)?arrival:world.scene.arrive.map(v=>v+.5);world.state.mode='field';controller.snapshot();
 const objects=[...world.objects().filter(o=>!replacesEmbodiedOriginObject(world,o)),...controller.objects()],plan=exteriorWorksitePlan541(world,{objects}),reservedRects=plan.sites.map(s=>({x:s.x-s.radius-.35,y:s.z-s.radius-.35,w:s.radius*2+.7,h:s.radius*2+.7})),sites=exteriorAnchorSites(world,{objects,reservedRects}),worksites=originArtPlan541(world)?.bodies||plan.sites;
 const native=touchControlLayout(width,height,{preset:'spaced'}),field=fieldControlLayout({x:0,y:0,width,height},{confirm:native.buttons.a,secondary:native.buttons.x,joystick:native.joystick,reset:native.reset}),rect={left:17,top:29,width,height},renderer=Object.create(Adventure3DRenderer.prototype),hudHeight=width>height*1.3?52:106;
 Object.assign(renderer,{world,sceneObjects:objects,exteriorFrame541:{sites,worksites},frameOptions:{},canvas:{width:width*2,height:height*2,getBoundingClientRect:()=>rect},zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],ui:{hudHeight,touch:true,touchReserve:field.reserve},drawDt:1/60,resize:noop,buildDynamic:noop,software:{render:()=>({})}});
 const draw=()=>{renderer.forceRender=true;renderer.render({time:1,adventure:true,player:{x:world.state.x,z:world.state.y}},world.activeHeroes,1/60);};
 const frame=()=>exteriorSceneArtCameraFrame({world,canvas:renderer.canvas,ui:renderer.ui,lead:renderer.camera||{x:world.state.x,z:world.state.y},p:{x:world.state.x,z:world.state.y},objects:renderer.sceneObjects,aspect:width/height,...renderer.exteriorFrame541});
 draw();return{world,renderer,rect,draw,frame,sites,worksites,hudHeight};
}
function pick(f,x,z){const p=f.renderer.worldToScreen(x,z),q=f.renderer.screenToWorld(f.rect.left+p.x,f.rect.top+p.y);assert.ok(q&&Math.hypot(q.x-x,q.y-z)<.001,'actual composed projection and inverse preserve the native floor target');}
test('actual exterior renderer keeps a readable lead above the phone controls across native exterior families and origin worksites',()=>{
 for(const id of[49,68,145,2015,2030,2035,2055,50001,50005,50007,50009])for(const[width,height]of[[388,842],[360,740],[1363,936],[738,358]]){
  const f=fixture(id,width,height),r=f.frame(),saved=f.world.save(),foot=f.renderer.worldToScreen(f.world.state.x,f.world.state.y),head=f.renderer.worldToScreen(f.world.state.x,f.world.state.y,1.94),wide=width>height*1.3;
  assert.ok(r&&foot.visible&&head.visible);assert.ok(foot.y-head.y>=(wide?34:64),`${id} ${width}: lead remains normal play size, ${foot.y-head.y}`);
  assert.ok(head.y>=f.hudHeight+18&&foot.y<=r.scope.window.bottom-16,`${id}: actor clears HUD and the thumb zone`);if(width===388)assert.ok(foot.y>=460&&foot.y<=550);
  assert.ok(f.renderer.eye[1]>4.5,'camera remains above the highest exterior working props');pick(f,f.world.state.x,f.world.state.y);assert.equal(f.world.save(),saved);
 }
});
test('failed frontier arrivals now spend the upper field on a complete regional silhouette and substantial camp instead of unoccupied floor',()=>{
 for(const id of[2015,2030,2035,2055]){
  const f=fixture(id),r=f.frame(),a=r.scope.regional,b=r.scope.worksite;assert.ok(a&&!a.slim);assert.equal(b?.kind,'shelter');
  const foot=f.renderer.worldToScreen(f.world.state.x,f.world.state.y),regional=f.renderer.worldToScreen(a.x,a.z,a.y+1.5),work=f.renderer.worldToScreen(b.x,b.z,b.y+1.5);
  assert.ok(regional.visible&&regional.x>45&&regional.x<343&&regional.y>f.hudHeight+20&&regional.y<foot.y-130,'the real full regional mass occupies the upper approach');
  assert.ok(work.visible&&work.x>35&&work.x<353&&work.y>f.hudHeight+20&&work.y<foot.y-90,'the substantial camp is visible with the player');
  const corners=[];for(const dx of[-1.35,1.35])for(const dz of[-1.35,1.35])for(const dy of[0,2.65])corners.push(f.renderer.worldToScreen(a.x+dx,a.z+dz,a.y+dy));
  assert.ok(Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x))>100,'the regional body has meaningful visual coverage rather than a tiny peripheral token');
  assert.ok(corners.every(p=>p.x>=-4&&p.x<=392&&p.y>=f.hudHeight-4&&p.y<=r.scope.window.bottom),'the selected full native silhouette fits while distant scene edges may crop');
 }
});
test('actual nearby input and native floor picking survive the composed frame and manual pinch',()=>{
 const f=fixture(50001),w=f.world;w.state.chronicle.step=2;w.embodiedOrigins.snapshot();const controls=w.embodiedOrigins.objects().filter(o=>o.role==='embodiedAction');assert.ok(controls.length);
 const control=controls[0],cell=[[0,1],[0,-1],[1,0],[-1,0]].map(([x,z])=>[control.xy[0]+x,control.xy[1]+z]).find(([x,z])=>w.walkable(x+.5,z+.5));assert.ok(cell);[w.state.x,w.state.y]=cell.map(v=>v+.5);f.renderer.sceneObjects=controls;f.renderer.camera=null;f.renderer.fieldViewOffset={x:0,y:0};f.draw();const r=f.frame();assert.equal(r.scope.selectedControl,control.id);
 for(const q of r.points){const p=f.renderer.worldToScreen(q[0],q[2],q[1]);assert.ok(p.visible&&p.x>=r.scope.window.left-2&&p.x<=r.scope.window.right+2&&p.y>=r.scope.window.top-2&&p.y<=r.scope.window.bottom+2,'lead and selected active input remain in the usable field');}
 pick(f,control.xy[0]+.5,control.xy[1]+.5);const before=f.renderer.worldToScreen(w.state.x,w.state.y),saved=w.save();f.renderer.setZoom(1.9,{x:before.x,y:before.y});f.draw();const after=f.renderer.worldToScreen(w.state.x,w.state.y);assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.05);pick(f,w.state.x,w.state.y);assert.equal(w.save(),saved);
});
test('all non-Veyr native outdoor worlds get a finite local frame without state mutation or remote-model zoom out',()=>{
 const world=new World(data);world.newGame({quiet:true});let count=0;
 for(const scene of world.scenes.values()){
  if(scene.originId==='veyr-storm'||isInteriorScene(scene))continue;world.state.scene=scene.location;world.state.chapter=scene.chapter||1;[world.state.x,world.state.y]=scene.arrive.map(v=>v+.5);world.state.mode='field';const objects=world.objects(),saved=world.save(),args={world,canvas:{getBoundingClientRect:()=>({width:388,height:842})},ui:{hudHeight:106,touch:true,touchReserve:177},p:{x:world.state.x,z:world.state.y},objects},r=exteriorSceneArtCameraFrame(args),remote=exteriorSceneArtCameraFrame({...args,sites:[{x:world.state.x+40,z:world.state.y+40,y:0,height:90}],worksites:[{x:world.state.x-50,z:world.state.y-50,y:0,kind:'shelter'}]});
  assert.ok(r&&[...r.eye,...r.at,r.fov,r.shift.x,r.shift.y].every(Number.isFinite));assert.ok(r.scope.actorPixels>=64);assert.deepEqual(remote.eye,r.eye,'remote architecture never becomes a fit target');assert.deepEqual(remote.shift,r.shift);assert.equal(world.save(),saved);count++;
 }
 assert.equal(count,101);
});
test('Veyr, interiors and invalid surfaces retain their existing camera owner',()=>{const f=fixture(2015);for(const id of[2,50000,50012,50013]){f.world.state.scene=id;assert.equal(exteriorSceneArtCameraFrame({world:f.world,canvas:f.renderer.canvas}),null);}f.world.state.scene=2015;assert.equal(exteriorSceneArtCameraFrame({world:f.world,canvas:null}),null);});

test('a selected exterior cable retains both physical drag endpoints while remote controls stay outside the local fit',()=>{
 const f=fixture(2030),w=f.world,x=w.state.x,z=w.state.y,cable={id:'local-exterior-cable',role:'embodiedAction',type:'embodied-action',manipulation:'cable',xy:[x-.5,z-.5],from:{x:x-1.4,y:z-.7},to:{x:x+1.4,y:z-1.2}},far={...cable,id:'remote-cable',xy:[x+24,z+24],from:{x:x+25,y:z+25},to:{x:x+40,y:z+40}};f.renderer.sceneObjects=[far,cable];f.draw();const r=f.frame();assert.equal(r.scope.selectedControl,cable.id);
 for(const end of[cable.from,cable.to])for(const h of[0,.9]){const q=f.renderer.worldToScreen(end.x,end.y,h);assert.ok(q.visible&&q.x>=r.scope.window.left-2&&q.x<=r.scope.window.right+2&&q.y>=r.scope.window.top-2&&q.y<=r.scope.window.bottom+2);pick(f,end.x,end.y);}
 assert.ok(r.scope.actorPixels>=64);
});
