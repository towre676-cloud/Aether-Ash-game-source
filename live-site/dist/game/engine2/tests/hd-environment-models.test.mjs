import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {appendHDTree,appendHDRock,appendHDAircraft,appendHDRover,appendHDHouse,hdDetail,HD_ASSET_SCHEMA} from '../hd-environment-models.mjs';
class Recorder{
 constructor(){this.triangles=0;this.draws=[];}
 check(p){assert.ok(Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),'invalid 3D vertex');}
 col(c){assert.ok(Array.isArray(c)&&c.length===3&&c.every(x=>Number.isFinite(x)&&x>=0&&x<=1),'invalid color');}
 tri(a,b,c,col,mat){[a,b,c].forEach(p=>this.check(p));this.col(col);assert.ok(Number.isFinite(mat));this.triangles++;this.draws.push([a,b,c,col,mat]);}
 quad(a,b,c,d,col,mat){this.tri(a,b,c,col,mat);this.tri(a,c,d,col,mat);}
 tube(a,b,r0,r1,col,mat,n){this.check(a);this.check(b);this.col(col);assert.ok([r0,r1,n].every(Number.isFinite)&&r0>=0&&r1>=0&&n>=3);this.triangles+=n*4;this.draws.push([a,b,r0,r1,col,mat,n]);}
 box(x,y,z,w,h,l,col,mat,em,yaw){assert.ok([x,y,z,w,h,l,mat,em,yaw].every(x=>Number.isFinite(x)));this.col(col);assert.ok(w>0&&h>0&&l>0);this.triangles+=12;}
 sphere(x,y,z,r,col,mat,em,n,rows,scale){assert.ok([x,y,z,r,mat,em,n,rows,...scale].every(Number.isFinite));this.col(col);this.triangles+=n*rows*2;}
}
const fixture={x:8,y:.2,z:-4,index:3};
const colors={leaf:[.21,.41,.25],top:[.38,.40,.34],family:'village'};
const render=(fn,args,opts)=>{const m=new Recorder();fn(m,...args,opts);return m;};
test('quality and distance reduce real mesh detail for mobile / flight horizon',()=>{
 assert.equal(hdDetail('high',3),2);assert.equal(hdDetail('high',16),1);assert.equal(hdDetail('high',40),0);
 assert.equal(hdDetail('low',0),0);
 const a=render(appendHDTree,[fixture,colors],{quality:'low'}),b=render(appendHDTree,[fixture,colors],{quality:'medium'}),c=render(appendHDTree,[fixture,colors],{quality:'high'});
 assert.ok(a.triangles<b.triangles&&b.triangles<c.triangles,[a.triangles,b.triangles,c.triangles]);
 assert.ok(c.triangles<6000,'per-tree triangle budget exceeded');
});
test('tree variants and trunk-only paths are grounded and deterministic',()=>{
 for(const family of ['village','woodland','mangrove','highland','spore','cactus']){
  const a=render(appendHDTree,[fixture,{...colors,family}],{quality:'medium'});
  const b=render(appendHDTree,[fixture,{...colors,family}],{quality:'medium'});
  assert.deepEqual(a.draws,b.draws);assert.ok(a.triangles>50);
 }
 const only=render(appendHDTree,[fixture,colors],{quality:'medium',trunkOnly:true});
 const complete=render(appendHDTree,[fixture,colors],{quality:'medium'});
 assert.ok(only.triangles<complete.triangles);
});
test('rocks and mineral facets stay within geometry budgets',()=>{
 for(const family of ['riverbank','highland','storm','crystal','ice','sand']){
  const a=render(appendHDRock,[fixture,{...colors,family}],{quality:'high'});
  assert.ok(a.triangles>50&&a.triangles<1500,a.triangles);
 }
});
test('Skylark and rover are real poseable detailed meshes without independent flight physics',()=>{
 const air=render(appendHDAircraft,[{x:2,y:12,z:30,heading:1.2,quality:'high'}]);
 const rover=render(appendHDRover,[{x:2,y:0,z:-5,heading:-.5,quality:'high'}]);
 const house=render(appendHDHouse,[{x:8,y:0,z:20,quality:'high'}]);
 assert.ok(air.triangles>500,air.triangles);assert.ok(rover.triangles>200,rover.triangles);assert.ok(house.triangles>70,house.triangles);
 assert.ok(air.triangles<15000&&rover.triangles<15000&&house.triangles<15000);
});
test('asset module makes no changes to gameplay, saved state, collision, or camera',()=>{
 assert.equal(HD_ASSET_SCHEMA.collisionOwner,'world');assert.equal(HD_ASSET_SCHEMA.saveOwner,'world');assert.equal(HD_ASSET_SCHEMA.cameraOwner,'renderer');
 const original={...fixture};const a=render(appendHDTree,[fixture,colors],{quality:'high'});
 assert.deepEqual(fixture,original);
 const src=fs.readFileSync(new URL('../hd-environment-models.mjs',import.meta.url),'utf8');
 for(const bad of ['localStorage','sessionStorage','requestAnimationFrame','window.','document.','world.choose','world.state ='])assert.ok(!src.includes(bad),bad);
});
test('historical landscape actually calls higher-definition models rather than generating legacy spheres',()=>{
 const src=fs.readFileSync(new URL('../adventure-landscape.js',import.meta.url),'utf8');
 assert.match(src,/appendHDTree\(m,p,c/);
 assert.match(src,/appendHDRock\(m,p,c/);
 assert.match(src,/hd-environment-models\.mjs/);
});
