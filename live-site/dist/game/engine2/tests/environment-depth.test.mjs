import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {environmentMood,buildEnvironmentDepth,paintEnvironmentBanks,paintEnvironmentSurround,paintEnvironmentWater} from '../environment-depth.js';
import {scenicMaterialCell,paintScenicMaterial,terrainBakeSize} from '../organic-ground.js';
import {paintCompatibilityGround} from '../compatibility-ground.js';

const fixture=(style='riverbank')=>({key:'river',biome:{style,color:'#456'},width:15,height:12,floor:Array.from({length:12},(_,y)=>Array.from({length:15},(_,x)=>x>3&&x<11&&y>2&&y<10?'.':'#').join('')),objects:[],doors:[]});

test('region depth distinguishes wet banks, highlands, desert and origin interior shadows',()=>{
 assert.equal(environmentMood(fixture()).wet,true);
 for(const style of ['woodland','highland','storm','sand','lava','ice','spore','marble'])assert.equal(environmentMood(fixture(style)).wet,false,style);
 assert.equal(environmentMood(fixture('sand')).family,'desert');assert.equal(environmentMood(fixture('ice')).family,'frost');
 assert.equal(environmentMood({...fixture(),originId:'iona-water',originIndoor:true}).indoor,true);
 assert.equal(environmentMood({...fixture(),originId:'iona-water',originIndoor:true}).wet,false);
});

test('depth spans and moving water stay entirely outside walkable cells',()=>{
 const scene=fixture(),before=JSON.stringify(scene),p=buildEnvironmentDepth(scene),cells=new Set();
 for(const b of p.spans)for(let x=b.x/48;x<(b.x+b.w)/48;x++){const y=b.y/48;assert.equal(scene.floor[y][x],'#');cells.add(x+','+y);}
 assert.equal(cells.size,scene.floor.join('').split('#').length-1);
 for(const q of p.reflections)assert.equal(scene.floor[Math.floor(q.y/48)][Math.floor(q.x/48)],'#');
 assert.equal(JSON.stringify(scene),before);assert.equal(buildEnvironmentDepth(scene),p);
});

test('every prepared outdoor region has bounded deterministic landforms without changing navigation',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),w=new World(data);
 let wet=0;for(const scene of w.data.scenes){const before=JSON.stringify(scene),p=buildEnvironmentDepth(scene);assert.ok(p.patches.length<=180);assert.ok(p.reflections.length<=240);for(const q of [...p.patches,...p.reflections])assert.ok(Number.isFinite(q.x+q.y));if(p.mood.wet)wet++;assert.equal(JSON.stringify(scene),before);}
 assert.ok(wet>20,'water treatment reaches authored regions and frontiers');
});

test('both graphics modes bound terrain bitmap memory and retain actual world coordinates',()=>{
 for(const compatibility of [false,true])for(const [width,height]of [[3,3],[80,60],[350,30],[15,700]]){
  const s=terrainBakeSize({width,height},{compatibility}),pixels=s.width*s.height;
  assert.ok(s.ratio>0&&s.ratio<=.65);assert.ok(pixels<=(compatibility?1500000:3200000));assert.ok(Math.max(s.width,s.height)<=(compatibility?2048:3072));assert.ok(Math.abs(s.width/s.ratio-(width*48+s.margin*2))<=1/s.ratio+1e-8);
 }
});

function context(){
 const stack=[],calls=[],c={globalAlpha:.63,fillStyle:'#abc',strokeStyle:'#def',lineWidth:3,globalCompositeOperation:'source-over',lineCap:'butt',save(){stack.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth,globalCompositeOperation:this.globalCompositeOperation,lineCap:this.lineCap});},restore(){assert.ok(stack.length);Object.assign(this,stack.pop());},drawImage(...args){calls.push(['image',...args]);},createLinearGradient(){return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};},stroke(...args){calls.push(['stroke',...args]);}};
 return {c:new Proxy(c,{get(o,k){return k in o?o[k]:(()=>{});}}),stack,calls};
}

test('bank, surround and animated passes preserve canvas state and cull water work',()=>{
 const scene=fixture(),plan=buildEnvironmentDepth(scene),{c,stack,calls}=context(),before={alpha:c.globalAlpha,fill:c.fillStyle,stroke:c.strokeStyle,width:c.lineWidth};
 paintEnvironmentBanks(c,scene,{});paintEnvironmentSurround(c,{...scene,originId:'iona',originIndoor:true},1000,700,350);
 const r={ctx:c,compatibility:true,time:9,comfort:{steadyLighting:true}};paintEnvironmentWater(r,plan,{x0:0,y0:0,x1:15,y1:12});const first=calls.length;paintEnvironmentWater(r,plan,{x0:100,y0:100,x1:110,y1:110});assert.equal(calls.length,first,'offscreen water emits no strokes');
 assert.equal(stack.length,0);assert.deepEqual({alpha:c.globalAlpha,fill:c.fillStyle,stroke:c.strokeStyle,width:c.lineWidth},before);
});

test('generated terrain crops retain four semantic surfaces and remain within delivered artwork',()=>{
 assert.deepEqual(['grass','soil','highland','water'].map(scenicMaterialCell),[0,1,2,3]);
 const {c,stack,calls}=context(),image={width:1254,height:1254};for(const kind of ['grass','soil','highland','water'])paintScenicMaterial(c,image,kind);
 assert.ok(calls.length>4);for(const [,im,sx,sy,sw,sh]of calls){assert.equal(im,image);assert.ok(sx>=0&&sy>=0&&sx+sw<=image.width&&sy+sh<=image.height);}
 assert.equal(stack.length,0);assert.equal(c.globalAlpha,.63);
});

test('compatibility paints a prepared scene bitmap directly without pixel processing',()=>{
 const {c,calls,stack}=context(),baked={worldX:-576,worldY:-576,worldWidth:2400,worldHeight:2200};paintCompatibilityGround(c,{baked});assert.deepEqual(calls,[['image',baked,-576,-576,2400,2200]]);assert.equal(stack.length,0);
});
