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
function replyWorld(){
 const world=new World(source);world.newGame({originId:'veyr-storm',quiet:true});
 world.state.chronicle.step=3;world.state.chronicle.choices={repair:0};world.state.embodiedOrigins={schema:'ash-aether.embodied-origins/1',origins:{'veyr-storm':{grounded:true,receiver:true,witnessed:true,diverted:true}}};
 world.loadScene(50013);world.state.mode='field';world.state.x=11.5;world.state.y=6.5;
 const controls=installEmbodiedOrigins(world);return{world,objects:[...world.objects().filter(o=>!replacesEmbodiedOriginObject(world,o)),...controls.objects()]};
}
function frame(world,objects,{width=388,height=842,preset='spaced',hudHeight=106}={}){
 const native=touchControlLayout(width,height,{preset}),field=fieldControlLayout({x:0,y:0,width,height},{confirm:native.buttons.a,secondary:native.buttons.x,joystick:native.joystick,reset:native.reset}),rect={left:17,top:29,width,height};
 const renderer=Object.create(Adventure3DRenderer.prototype);Object.assign(renderer,{world,sceneObjects:objects,frameOptions:{},canvas:{width,height,getBoundingClientRect:()=>rect},zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],ui:{hudHeight,touch:true,touchReserve:field.reserve},drawDt:1/60,resize:noop,buildDynamic:noop,software:{render:()=>({})}});
 const draw=()=>{renderer.forceRender=true;renderer.render({time:1,adventure:true,scenicHorizon:true,player:{x:world.state.x,z:world.state.y}},world.activeHeroes,1/60);};draw();return{renderer,draw,rect,field,hudHeight};
}
function bounds(points){return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};}
function rayCrossesBox(from,to,box){let low=0,high=1;for(let i=0;i<3;i++){const delta=to[i]-from[i];if(Math.abs(delta)<1e-9){if(from[i]<box.min[i]||from[i]>box.max[i])return false;continue;}let a=(box.min[i]-from[i])/delta,b=(box.max[i]-from[i])/delta;if(a>b)[a,b]=[b,a];low=Math.max(low,a);high=Math.min(high,b);if(low>high)return false;}return high>0&&low<1;}

test('the real reply scene uses the field above the controls and keeps the mast clear of Veyr',()=>{
 for(const dimensions of[{width:388,height:842},{width:360,height:740,preset:'large'}]){
  const {world,objects}=replyWorld(),saved=world.save(),f=frame(world,objects,dimensions),plan=observatoryScenePlan(world),mesh=buildObservatoryGeometry(Geometry,C,world),mast=[],frontage=[];
  for(let i=0;i<mesh.v.length;i+=12){const x=mesh.v[i],y=mesh.v[i+1],z=mesh.v[i+2];if(y<.1||y>7.35)continue;
   if(Math.abs(x-plan.body.x)<1.65&&Math.abs(z-plan.body.z)<1.35)mast.push(f.renderer.worldToScreen(x,z,y));
   if(x>=plan.lodge.x-.4&&x<=plan.lodge.x+plan.lodge.w+.4&&z>=plan.lodge.z-.4&&z<=plan.lodge.z+plan.lodge.d+.4){const projected=f.renderer.worldToScreen(x,z,y);if(projected.visible&&projected.y>=f.hudHeight)frontage.push(projected);}
  }
  assert.ok(mast.length>100&&frontage.length>30,'checks project the actual mesh, not a decorative camera fixture');
  const architecture=bounds([...mast,...frontage]),bottom=f.rect.height-f.field.reserve-60;
  assert.ok(mast.every(p=>p.visible&&p.x>=8&&p.x<=f.rect.width-8&&p.y>=f.hudHeight&&p.y<=bottom+8),'the real receiver silhouette clears the HUD and thumb controls');
  assert.ok(architecture.top<=f.hudHeight+100,'the occupied frontage replaces the large empty sea band');
  assert.ok(architecture.bottom>=(f.hudHeight+bottom)/2,'the mast and lodge reach the middle of the usable field instead of becoming a distant skyline');
  const m=world.scene.observatory.mast,receiver={min:[m.x,.1,m.z],max:[m.x+m.w,5.8,m.z+m.d]},eye=f.renderer.eye,dx=eye[0]-(f.renderer.camera?.x??world.state.x),dz=eye[2]-(f.renderer.camera?.z??world.state.y),horizontal=Math.hypot(dx,dz),right=[dz/horizontal,0,-dx/horizontal];
  for(const side of[-.6,0,.6])for(const height of[.6,1.2,1.8])assert.equal(rayCrossesBox(eye,[world.state.x+right[0]*side,height,world.state.y+right[2]*side],receiver),false,'the traveller silhouette has a clear sightline past the closed receiver footprint');
  assert.equal(world.save(),saved,'composition never advances or rewrites the native scene');
 }
});

test('landscape uses its central clear band instead of shrinking the place above a full-width pad reserve',()=>{
 const {world,objects}=replyWorld(),f=frame(world,objects,{width:738,height:358,hudHeight:52}),controls=objects.filter(o=>o.role==='embodiedAction');
 for(const o of controls){const p=f.renderer.worldToScreen(o.xy[0]+.5,o.xy[1]+.5);assert.ok(p.x>144&&p.x<594&&p.y>66&&p.y<330,'native controls remain between the landscape thumb groups');}
 const foot=f.renderer.worldToScreen(world.state.x,world.state.y),head=f.renderer.worldToScreen(world.state.x,world.state.y,1.94);
 assert.ok(foot.y-head.y>=24,'landscape retains a readable traveller rather than a tiny distant figure');
 assert.ok(foot.y>150&&foot.y<330,'the central court can use the screen below the side pads');
});

test('the composed camera keeps a selected pinch anchor and exact floor picking',()=>{
 const {world,objects}=replyWorld(),f=frame(world,objects),point={x:13.5,y:5.5},before=f.renderer.worldToScreen(point.x,point.y),state=world.save();
 f.renderer.setZoom(1.9,{x:before.x,y:before.y,point});f.draw();const after=f.renderer.worldToScreen(point.x,point.y),picked=f.renderer.screenToWorld(f.rect.left+after.x,f.rect.top+after.y);
 assert.equal(f.renderer.zoom,1.9);assert.ok(Math.abs(after.x-before.x)<.05&&Math.abs(after.y-before.y)<.05,'pinch keeps its actual world anchor at the same pixel');assert.ok(picked&&Math.abs(picked.x-point.x)<.001&&Math.abs(picked.y-point.y)<.001,'the final composed inverse projects back to the same floor point');
 assert.equal(world.save(),state);f.renderer.resetView();f.draw();assert.equal(f.renderer.zoom,1.35);assert.ok([...f.renderer.vp].every(Number.isFinite));
});

test('native conductor and spare-vane drags keep both real cable endpoints in the usable field',()=>{
 for(const step of[1,2]){
  const world=new World(source);world.newGame({originId:'veyr-storm',quiet:true});world.state.chronicle.step=step;world.state.chronicle.choices=step===2?{repair:0}:{};
  world.state.embodiedOrigins={schema:'ash-aether.embodied-origins/1',origins:{'veyr-storm':{receiver:true,witnessed:true,grounded:step===2,vaneRaised:step===2}}};world.loadScene(step===1?50012:50013);world.state.mode='field';
  const controller=installEmbodiedOrigins(world),objects=[...world.objects().filter(o=>!replacesEmbodiedOriginObject(world,o)),...controller.objects()],cable=controller.objects().find(o=>o.manipulation==='cable');assert.ok(cable?.from&&cable?.to,'the native action supplies both drag endpoints');
  const positions=step===1?[[7.5,19.5],[13.5,12.5],[13.5,10.5]]:[[4.5,13.5],[4.5,11.5]];
  for(const [x,z]of positions)for(const dimensions of[{width:388,height:842},{width:360,height:740,preset:'large'},{width:738,height:358,hudHeight:52}]){
   world.state.x=x;world.state.y=z;const before=world.save(),f=frame(world,objects,dimensions),wide=f.rect.width>f.rect.height*1.3,left=wide?144:16,right=f.rect.width-left,top=f.hudHeight+8,bottom=wide?f.rect.height-28:f.rect.height-f.field.reserve-60;
   for(const [label,end]of[['loose end',cable.from],['grounding socket',cable.to]]){
    for(const height of[0,.75]){const p=f.renderer.worldToScreen(end.x,end.y,height);assert.ok(p.visible&&p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom,`${cable.embodiedAction} ${label} at ${height}m remains reachable from ${x},${z} on ${f.rect.width}px`);}
    const floor=f.renderer.worldToScreen(end.x,end.y),picked=f.renderer.screenToWorld(f.rect.left+floor.x,f.rect.top+floor.y);assert.ok(picked&&Math.abs(picked.x-end.x)<.001&&Math.abs(picked.y-end.y)<.001,'the displayed cable endpoint still picks its exact native floor position');
   }
   assert.equal(world.save(),before,'endpoint framing cannot attach or move the native conductor');
  }
 }
});
