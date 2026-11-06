import test from 'node:test';
import assert from 'node:assert/strict';
import {CisternSoftwarePainter,clipSoftwarePolygon} from '../cistern-software.js';
import {Geometry} from '../cistern-renderer.js';

const vertex=(x,y,z=0,w=1,worldY=0)=>[x,y,z,w,(x+2)/4,(y+2)/4,worldY];
const inside=v=>v[3]>=.0001-1e-8&&Math.abs(v[0])<=v[3]+1e-8&&Math.abs(v[1])<=v[3]+1e-8&&Math.abs(v[2])<=v[3]+1e-8;

test('large triangles are clipped to all six view planes before the perspective divide',()=>{
 for(const vertices of[
  [vertex(-80,-40),vertex(80,-40),vertex(0,80)],
  [vertex(-.5,-.5,-4),vertex(.5,-.5,0),vertex(0,.5,0)],
  [vertex(-.5,-.5,4),vertex(.5,-.5,0),vertex(0,.5,0)],
  [vertex(-.5,-.5,0,-1),vertex(.5,-.5,0,1),vertex(0,.5,0,1)],
 ]){const clipped=clipSoftwarePolygon(vertices);assert.ok(clipped.length>=3);for(const v of clipped){assert.ok(v.every(Number.isFinite));assert.ok(inside(v));assert.ok(v[4]>=0&&v[4]<=1||vertices[0][0]===-80);}}
 assert.deepEqual(clipSoftwarePolygon([vertex(2,0),vertex(3,0),vertex(2,1)]),[]);
});

test('adventure ground clips buried ridgelines and interpolates crossing faces without hiding their visible summit',()=>{
 const below=[vertex(-.5,-.5,0,1,-2),vertex(.5,-.5,0,1,-1),vertex(0,.5,0,1,-3)];
 assert.deepEqual(clipSoftwarePolygon(below,{groundY:-.13}),[]);
 assert.equal(clipSoftwarePolygon(below).length,3,'Cistern geometry keeps its original vertical range');
 const crossing=[vertex(-.5,-.5,0,1,-2),vertex(.5,-.5,0,1,.8),vertex(0,.5,0,1,.8)],clipped=clipSoftwarePolygon(crossing,{groundY:-.13});
 assert.equal(clipped.length,4);assert.ok(clipped.every(v=>v[6]>=-.13000001));assert.ok(clipped.some(v=>Math.abs(v[6]+.13)<1e-8));assert.ok(clipped.every(inside));
});

test('authored below-zero terrain retains its floor material while the historical buried mortar stays hidden',()=>{
 const painter=new CisternSoftwarePainter({getContext:()=>({})}),geometry=material=>{const g=new Geometry();g.quad([-1,-.06,-1],[-1,-.06,1],[1,-.06,1],[1,-.06,-1],[.4,.5,.3],material,0,1,[0,1,0]);return{data:g.data(),count:g.v.length/12};};
 assert.equal(painter._geometry(geometry(0),true).length,0,'literal mortar undersides remain omitted');
 const terrain=painter._geometry(geometry(.25),true);assert.equal(terrain.length,48,'both actual terrain faces survive native software conversion');
 for(let i=0;i<terrain.length;i+=24){assert.equal(terrain[i+15],.25);assert.ok(terrain[i+19]>-.13,'authored terrain remains above the adventure ground clip');}
 painter.destroy();
});

test('software floor bands paint complete rugs above their floor, with historical dungeon depth ordering retained',()=>{
 const noop=()=>{},ctx=new Proxy({},{get:()=>noop}),oldCanvas=globalThis.OffscreenCanvas;
 globalThis.OffscreenCanvas=class{constructor(w,h){this.width=w;this.height=h;}getContext(){return ctx;}};
 try{const painter=new CisternSoftwarePainter({width:100,height:100,getContext:()=>ctx}),drawn=[];painter._paintTriangle=(c,row)=>(drawn.push(row.color),{draws:1,textured:0});
  const row=(color,depth,groundHeight)=>({color,depth,groundHeight,layer:0,ground:true,minX:10,minY:10,maxX:80,maxY:80,ax:10,ay:10,bx:80,by:10,cx:10,cy:80});
  painter._staticBands([row('rug-far',20,.034),row('floor-near',4,.012),row('rug-near',3,.034),row('floor-far',22,.012)],100,100,'high','fixture',null,4);
  assert.deepEqual(drawn,['floor-far','floor-near','rug-far','rug-near']);drawn.length=0;
  painter._staticBands([row('near',4,null),row('far',20,null)],100,100,'high','fixture',null,2);assert.deepEqual(drawn,['far','near']);painter.destroy();
 }finally{if(oldCanvas===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=oldCanvas;}
});

test('opaque flat triangles close their antialias seams without expanding translucent, textured, glow or shadow faces',()=>{
 const noop=()=>{},calls=[],ctx={beginPath:noop,moveTo:noop,lineTo:noop,closePath:noop,lineWidth:.5,fill(){calls.push(['fill',this.globalAlpha]);},stroke(){calls.push(['stroke',this.strokeStyle,this.lineWidth,this.globalAlpha]);}},painter=new CisternSoftwarePainter({getContext:()=>ctx});
 const row={texture:-1,area:10,color:'rgb(70,80,80)',alpha:1,ax:0,ay:0,bx:10,by:0,cx:0,cy:10};
 assert.equal(painter._paintTriangle(ctx,row,'high').draws,2);assert.deepEqual(calls,[['fill',1],['stroke',row.color,.75,1]]);assert.equal(ctx.lineWidth,.5,'border width is scoped to its triangle');
 for(const extra of[{alpha:.5},{glow:true},{shadow:true},{texture:0,light:[1,1,1]}]){calls.length=0;assert.equal(painter._paintTriangle(ctx,{...row,...extra},'high').draws,1);assert.equal(calls.length,1);assert.equal(calls[0][0],'fill');}
 painter.destroy();
});
