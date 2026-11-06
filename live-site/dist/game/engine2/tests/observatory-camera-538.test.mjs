import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';
import {Geometry} from '../cistern-renderer.js';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../embodied-origins.js';
import {touchControlLayout} from '../touch-layout.js';
import {fieldControlLayout} from '../field-hud.js';

const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url))),noop=()=>{};
function stage(step){
 const world=new World(source);world.newGame({originId:'veyr-storm',quiet:true});
 world.state.chronicle.step=step;world.state.chronicle.choices=step>=2?{repair:0}:{};
 world.state.embodiedOrigins={schema:'ash-aether.embodied-origins/1',origins:{'veyr-storm':{grounded:true,receiver:true,witnessed:true}}};
 world.loadScene(step<2?50012:50013);world.state.mode='field';return{world,controller:installEmbodiedOrigins(world)};
}

/** Runs the real Adventure.render -> Cistern.render -> getCameraFrame ->
 * lensProjection/frameProjection chain. Only GPU/CPU rasterization is stubbed.
 */
function camera(world,objects,{width=388,height=842,preset='spaced'}={}){
 const native=touchControlLayout(width,height,{preset}),field=fieldControlLayout({x:0,y:0,width,height},{confirm:native.buttons.a,secondary:native.buttons.x,joystick:native.joystick,reset:native.reset});
 const renderer=Object.create(Adventure3DRenderer.prototype),rect={left:17,top:29,width,height};
 Object.assign(renderer,{world,sceneObjects:objects,frameOptions:{},canvas:{width,height,getBoundingClientRect:()=>rect},zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],ui:{hudHeight:106,touch:true,touchReserve:field.reserve},drawDt:1/60,resize:noop,buildDynamic:noop,software:{render:()=>({})}});
 const draw=()=>{renderer.forceRender=true;renderer.render({time:1,adventure:true,scenicHorizon:true,player:{x:world.state.x,z:world.state.y}},world.activeHeroes,1/60);};
 draw();return{renderer,draw,rect,field,playfield:{left:16,right:width-16,top:114,bottom:height-field.reserve-60}};
}
function assertChoicesInFrame(world,controls,dimensions){
 const before=world.save(),f=camera(world,controls,dimensions);assert.equal(controls.length,2,'the actual native choice pair must exist');
 for(const control of controls){const x=control.xy[0]+.5,z=control.xy[1]+.5,screen=f.renderer.worldToScreen(x,z),name=control.embodiedAction;
  assert.ok(screen.visible,name+' within camera frustum');
  assert.ok(screen.x>=f.playfield.left&&screen.x<=f.playfield.right,`${name} x=${screen.x} inside ${f.playfield.left}..${f.playfield.right}`);
  assert.ok(screen.y>=f.playfield.top&&screen.y<=f.playfield.bottom,`${name} y=${screen.y} inside ${f.playfield.top}..${f.playfield.bottom}`);
  const picked=f.renderer.screenToWorld(f.rect.left+screen.x,f.rect.top+screen.y);assert.ok(picked,name+' can be picked through the current inverse camera');
  assert.ok(Math.abs(picked.x-x)<.001&&Math.abs(picked.y-z)<.001,name+' projects and picks the same real floor point');
 }
 assert.equal(f.renderer.zoom,1.35,'automatic framing does not overwrite the selected lens');assert.equal(world.save(),before,'camera inspection never changes a choice or save');return f;
}

test('both real repair and destiny handles remain in the portrait playfield from arrival and either nearby control',()=>{
 for(const step of[1,3])for(const dimensions of[{width:388,height:842},{width:360,height:740,preset:'large'}]){
  const {world,controller}=stage(step),controls=controller.objects(),arrival=[world.state.x,world.state.y],positions=[arrival,...controls.map(o=>o.xy.map(v=>v+.5))];
  for(const [x,z]of positions){world.state.x=x;world.state.y=z;assertChoicesInFrame(world,controls,dimensions);}
 }
});

test('finishing the actual peaceful diversion frames both newly available destiny handles across the court',()=>{
 const {world,controller}=stage(2),diversion=controller.objects().find(o=>o.embodiedAction==='divert');assert.ok(diversion);
 world.state.x=diversion.xy[0]+.5;world.state.y=diversion.xy[1]+.5;const position=[world.state.x,world.state.y];
 assert.equal(controller.beginAction(diversion),true);assert.equal(controller.setProgress(1),true);assert.equal(controller.completeAction(),true);assert.equal(world.state.chronicle.step,3);
 assert.deepEqual([world.state.x,world.state.y],position,'native diversion leaves the traveller at the spare-vane bay');
 const controls=controller.objects();assert.deepEqual(controls.map(o=>o.embodiedAction),['destiny-0','destiny-1']);
 for(const dimensions of[{width:388,height:842},{width:360,height:740,preset:'large'}]){
  const f=assertChoicesInFrame(world,controls,dimensions);f.renderer.setZoom(2);f.draw();assert.equal(f.renderer.zoom,2,'manual zoom remains an intentional player choice');
 }
});

function softwareContext(){return{setTransform:noop,createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),fillRect:noop,clearRect:noop,save:noop,restore:noop,translate:noop,scale:noop,drawImage:noop};}
function mesh(geometry){return{data:geometry.data(),count:geometry.v.length/12};}
test('the software pipeline keeps distant low static sea while ordinary far geometry and actor culling retain their budget',()=>{
 const old=globalThis.OffscreenCanvas,ctx=softwareContext();globalThis.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;}getContext(){return ctx;}};
 try{
  const sea=new Geometry(),farActor=new Geometry();
  sea.quad([-2,-5.25,-62],[-2,-5.25,-58],[2,-5.25,-58],[2,-5.25,-62],[.1,.3,.4],3,0,1,[0,1,0]);
  // A same-distance land cap is deliberately outside the low-sea exemption.
  sea.quad([4,0,-62],[4,0,-58],[8,0,-58],[8,0,-62],[.6,.5,.4],6,0,1,[0,1,0]);
  farActor.quad([-2,-5.25,-62],[-2,-5.25,-58],[2,-5.25,-58],[2,-5.25,-62],[.9,.4,.2],6,0,1,[0,1,0]);
  // An oblique orthographic test frustum isolates distance culling while the
  // horizontal water still projects to a genuine two-dimensional footprint.
  const vp=new Float32Array([.025,0,0,0,0,.012,.008,0,0,-.008,.006,0,0,0,0,1]),render=scenic=>{
   const painter=new CisternSoftwarePainter({width:388,height:842,getContext:()=>ctx}),painted=[];painter._paintTriangle=(context,row)=>(painted.push(row),{draws:1,textured:0});
   const stats=painter.render({meshes:{static:mesh(sea),dynamic:mesh(farActor)},vp,eye:[0,12,8],lights:[],time:0,state:{adventure:true,scenicHorizon:scenic,groundClipY:-5.4,player:{x:0,z:0}}});painter.destroy();return{stats,painted};
  };
  const normal=render(false),scenic=render(true);assert.equal(normal.painted.length,0,'ordinary distance culling rejects all far faces');
  assert.ok(scenic.painted.length>0,'the actual low sea reaches the software paint pass');assert.ok(scenic.painted.every(row=>row.architecture&&row.groundHeight===-5.25),'far land and dynamic actor geometry receive no sea exemption');
  assert.equal(scenic.stats.triangles,scenic.painted.length,'only the existing low-sea faces reach the visible triangle budget');
  const {world,controller}=stage(3),r=camera(world,controller.objects()).renderer;r.art={assets:{crew:{width:1280,height:1120}}};r.motion=new Map();r.sprites=[];
  r.actorSprite({id:6,hp:1},world.state.x,world.state.y,1/60,{hero:true});assert.equal(r.sprites.length,1);
  r.actorSprite({id:6,hp:1},world.state.x,world.state.y-80,1/60,{hero:true});assert.equal(r.sprites.length,1,'the real Adventure actor pass still rejects a distant character');
 }finally{if(old===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=old;}
});


function currentObservatoryObjects(world,controller){return [...world.objects().filter(o=>!replacesEmbodiedOriginObject(world,o)),...controller.objects()];}
function assertFloorTarget(frame,xy,label,margin=16){
 const x=xy[0]+.5,z=xy[1]+.5,screen=frame.renderer.worldToScreen(x,z);
 assert.ok(screen.visible,label+' is in the actual camera frustum');
 assert.ok(screen.x>=margin&&screen.x<=frame.rect.width-margin,`${label} x=${screen.x} leaves its visible silhouette margin`);
 assert.ok(screen.y>=frame.playfield.top&&screen.y<=frame.playfield.bottom,`${label} y=${screen.y} is inside the visible field`);
 const picked=frame.renderer.screenToWorld(frame.rect.left+screen.x,frame.rect.top+screen.y);
 assert.ok(picked&&Math.abs(picked.x-x)<.001&&Math.abs(picked.y-z)<.001,label+' retains exact inverse floor picking');
}

test('the upper arrival and spare-vane approach show both the native diversion and the creature it redirects',()=>{
 const {world,controller}=stage(2),objects=currentObservatoryObjects(world,controller),diversion=objects.find(o=>o.embodiedAction==='divert'),threat=objects.find(o=>o.type==='patrol'&&o.originId==='veyr-storm'&&o.originStep===2);
 assert.ok(diversion&&threat,'the actual scene supplies both sides of the native interaction');
 const targets=threat.enemies.map(enemy=>enemy[1]);assert.ok(targets.length>0);
 for(const position of[[...world.scene.arrive].map(v=>v+.5),[4.5,13.5],diversion.xy.map(v=>v+.5)])for(const dimensions of[{width:388,height:842},{width:360,height:740,preset:'large'}]){
  [world.state.x,world.state.y]=position;const saved=world.save(),frame=camera(world,objects,dimensions);
  assertFloorTarget(frame,diversion.xy,'spare-vane control');for(const xy of targets)assertFloorTarget(frame,xy,'Storm Kite',40);
  assert.equal(world.save(),saved,'framing must not advance the creature or the diversion');
 }
});

test('native diversion completion releases the creature camera and preserves both current destiny handles',()=>{
 const {world,controller}=stage(2),beforeObjects=currentObservatoryObjects(world,controller),patrol=beforeObjects.find(o=>o.type==='patrol'&&o.originStep===2),diversion=controller.objects().find(o=>o.embodiedAction==='divert');
 world.state.x=4.5;world.state.y=13.5;
 assert.equal(controller.beginAction(diversion),true);assert.equal(controller.setProgress(1),true);assert.equal(controller.completeAction(),true);assert.equal(world.state.chronicle.step,3);
 const current=currentObservatoryObjects(world,controller);assert.equal(current.some(o=>o.type==='patrol'&&o.originStep===2),false,'the native resolved threat is no longer active');
 const frame=camera(world,current),stale=camera(world,[...current,patrol]);
 assert.deepEqual(Array.from(stale.renderer.vp),Array.from(frame.renderer.vp),'even a stale threat entry cannot affect a later native stage');
 const choices=controller.objects();assert.deepEqual(choices.map(o=>o.embodiedAction),['destiny-0','destiny-1']);for(const choice of choices)assertFloorTarget(frame,choice.xy,choice.embodiedAction);
});
