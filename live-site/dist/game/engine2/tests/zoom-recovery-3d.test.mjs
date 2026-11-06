import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';
import {visibleTouchViewport,touchControlLayout,mountTouchLayout} from '../touch-layout.js';
const source=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),noop=()=>{};
const close=(a,b,t=.001)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function actualRenderer(width=390,height=844){
 const canvas={width,height,clientWidth:width,clientHeight:height,dataset:{},getBoundingClientRect:()=>({width,height,left:17,top:29}),getContext:kind=>kind==='2d'?{}:null,addEventListener:noop,removeEventListener:noop};
 const r=new Adventure3DRenderer(canvas,{art:{assets:{}},quality:'low'});r.software.render=()=>({backend:'fixture',triangles:0,drawCalls:0});const world=new World(source);world.newGame({quiet:true});r.scene(world);r.ui={hudHeight:height<500?80:135,touch:height>500,touchReserve:height>500?200:0};
 const draw=()=>{r.forceRender=true;r.drawWorld(world,null,1/60);return r.worldToScreen(world.state.x,world.state.y);};draw();return{r,world,draw};
}
test('visible touch bounds follow browser magnification and visual viewport panning in host CSS coordinates',()=>{
 const host={left:0,top:0,width:390,height:844};assert.deepEqual(visibleTouchViewport(host,{offsetLeft:70,offsetTop:180,width:195,height:422}),{x:70,y:180,width:195,height:422});
 assert.deepEqual(visibleTouchViewport({left:20,top:40,width:350,height:760},{offsetLeft:50,offsetTop:90,width:170,height:340}),{x:30,y:50,width:170,height:340});
 const outside=visibleTouchViewport(host,{offsetLeft:700,offsetTop:900,width:195,height:422});assert.ok(outside.x>=0&&outside.x+outside.width<=390);assert.ok(outside.y>=0&&outside.y+outside.height<=844);
});
test('all movement and action targets stay reachable after native zoom, narrow viewports, safe insets and rotation',()=>{
 for(const [width,height]of [[160,284],[195,422],[300,220],[232,330],[390,844],[844,390],[120,180]])for(const preset of ['spaced','large'])for(const safe of [{},{left:44,right:44,bottom:24,top:20}]){
  const layout=touchControlLayout(width,height,{preset,safe});for(const rect of [...Object.values(layout.buttons),layout.joystick,layout.reset]){assert.ok(rect.w>0&&rect.h>0);assert.ok(rect.x>=0&&rect.y>=0);assert.ok(rect.x+rect.w<=width+.001);assert.ok(rect.y+rect.h<=height+.001);}
 }
});
class Node extends EventTarget{
 constructor(doc){super();this.ownerDocument=doc;this.dataset={};this.style={setProperty:noop};this.children=[];this.attributes={};this.rect={left:0,top:0,width:390,height:844};}
 append(...nodes){this.children.push(...nodes);}setAttribute(k,v){this.attributes[k]=v;}remove(){this.removed=true;}getBoundingClientRect(){return this.rect;}closest(){return this.game;}querySelector(s){return this.targets?.[s]||null;}
}
function mounted(){
 const win=new EventTarget();Object.assign(win,{innerWidth:390,innerHeight:844,getComputedStyle:()=>({paddingLeft:'0',paddingRight:'0',paddingBottom:'0',paddingTop:'0'})});win.visualViewport=Object.assign(new EventTarget(),{width:390,height:844,offsetLeft:0,offsetTop:0});const doc={defaultView:win,createElement:()=>new Node(doc)},root=new Node(doc),game=new Node(doc),settings=new Node(doc);root.game=game;root.targets=Object.fromEntries(['a','b','x','y'].map(key=>['[data-button="'+key+'"]',new Node(doc)]));root.targets['#joystick']=new Node(doc);let changes=0,recoveries=0;const binding=mountTouchLayout(root,{settings,storage:{getItem:()=>null},onChange:()=>changes++,onRecover:()=>recoveries++});return{root,win,settings,binding,get changes(){return changes;},get recoveries(){return recoveries;}};
}
test('mounted pad updates on visual viewport scroll/resize and offers independent field and Pause recovery',()=>{
 const f=mounted(),v=f.win.visualViewport;Object.assign(v,{width:195,height:422,offsetLeft:80,offsetTop:200});v.dispatchEvent(new Event('scroll'));const layout=f.binding.layout;
 for(const rect of [...Object.values(layout.buttons),layout.joystick,layout.reset]){assert.ok(rect.x>=80&&rect.x+rect.w<=275);assert.ok(rect.y>=200&&rect.y+rect.h<=622);}
 const field=f.root.children.find(n=>n.className==='touch-view-reset');field.dispatchEvent(new Event('click'));assert.equal(f.recoveries,1);f.settings.children.find(n=>n.className==='touch-layout-recover').onclick(new Event('click'));assert.equal(f.recoveries,2);
 Object.assign(v,{width:390,height:200,offsetLeft:0,offsetTop:0});v.dispatchEvent(new Event('resize'));assert.equal(f.binding.layout.viewport.height,200);const before=f.changes;f.binding.destroy();v.dispatchEvent(new Event('scroll'));f.win.dispatchEvent(new Event('resize'));assert.equal(f.changes,before);
});
test('real indoor 3D zoom keeps camera angle and feet stable through the full saved zoom range',()=>{
 for(const [width,height]of [[390,844],[844,390],[1280,720]]){
  const {r,world,draw}=actualRenderer(width,height);r.ui={hudHeight:height<500?80:135,touch:height>500,touchReserve:height>500?200:0};const base=draw(),eye=[...r.eye],save=world.save();
  for(const zoom of [.5,1,1.35,2,3,.5]){r.setZoom(zoom);const foot=draw();assert.deepEqual(r.eye,eye,'zoom never changes camera distance/tilt or enters a wall');assert.equal(r.zoom,zoom);close(foot.x,base.x);close(foot.y,base.y);assert.ok(r.vp.every(Number.isFinite));assert.equal(world.save(),save);}
  r.destroy();
 }
});
test('real indoor pinch preserves its world anchor and Reset view recovers a bounded camera',()=>{
 const {r,world,draw}=actualRenderer();const foot=draw(),anchor={x:foot.x+12,y:foot.y-15},rect=r.canvas.getBoundingClientRect(),before=r.screenToWorld(rect.left+anchor.x,rect.top+anchor.y);
 for(const zoom of [1.8,2.2,2.8,1,.6]){r.setZoom(zoom,anchor);draw();const after=r.screenToWorld(rect.left+anchor.x,rect.top+anchor.y);close(after.x,before.x);close(after.y,before.y);}
 r.setZoom(3,{x:0,y:0});let footAfter=draw();assert.ok(footAfter.x>=0&&footAfter.x<=390&&footAfter.y>=135&&footAfter.y<644);r.resetView();footAfter=draw();assert.equal(r.zoom,1.35);close(footAfter.x,foot.x);close(footAfter.y,foot.y);assert.deepEqual(r.fieldViewOffset,{x:0,y:0});r.destroy();
});
