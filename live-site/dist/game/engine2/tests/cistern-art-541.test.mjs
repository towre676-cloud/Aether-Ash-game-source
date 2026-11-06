import test from 'node:test';
import assert from 'node:assert/strict';
import {Geometry,C,CisternRenderer} from '../cistern-renderer.js';
import {CISTERN,createCisternState,cisternWalkable} from '../cistern-model.js';
import {buildCisternArchitecture,appendCisternCraftDynamics} from '../cistern-architecture.js';
import {CisternSoftwarePainter} from '../cistern-software.js';

const noop=()=>{};
const centroid=(v,i)=>[0,1,2].map(j=>(v[i+j]+v[i+12+j]+v[i+24+j])/3);
function camera(side,width=388,height=842){
 const r=Object.create(CisternRenderer.prototype),player={x:side*8,z:-5};
 Object.assign(r,{canvas:{width,height},zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],resize:noop,buildDynamic:noop,software:{render:()=>({})}});
 r.render({time:2,player,resonators:[true,true]},[],1/60);return r;
}
function project(vp,p,width,height){const w=vp[3]*p[0]+vp[7]*p[1]+vp[11]*p[2]+vp[15];return{x:(.5+(vp[0]*p[0]+vp[4]*p[1]+vp[8]*p[2]+vp[12])/w*.5)*width,y:(.5-(vp[1]*p[0]+vp[5]*p[1]+vp[9]*p[2]+vp[13])/w*.5)*height};}

test('the three real cistern chambers gain bounded architectural craft without changing native geometry or state',()=>{
 const source=JSON.stringify(CISTERN),state=createCisternState(),saved=JSON.stringify(state),m=buildCisternArchitecture(Geometry,C,CISTERN),again=buildCisternArchitecture(Geometry,C,CISTERN);
 assert.deepEqual(m.v,again.v,'authoring is deterministic');assert.ok(m.v.every(Number.isFinite));
 assert.ok(m.cisternArt541.addedTriangles>400&&m.cisternArt541.addedTriangles<=1200,'broad craft has a small static budget over the established masonry');
 assert.ok(m.v.length/36<46000,'the whole dungeon remains bounded, including its original stonework');
 assert.deepEqual(Object.keys(m.cisternArt541.ranges),['gallery','cistern','sanctum']);
 for(const[name,[start,end]]of Object.entries(m.cisternArt541.ranges)){
  assert.ok(end-start>1000,name+' has real geometry rather than a colour label');
  for(let i=start;i<end;i+=36){const[x,y,z]=centroid(m.v,i);
   if(y>.09&&cisternWalkable(x,z,{resonators:[true,true]})){
    const lowest=Math.min(m.v[i+1],m.v[i+13],m.v[i+25]);
    assert.ok(lowest>=2.6,name+' overhanging craft has complete head clearance; lower uprights remain beyond the native lanes');
   }
   if(name==='sanctum'&&Math.abs(y-.043)<1e-6){
    assert.equal(m.v[i+4],1,'the star mosaic lies flush on real floor');
    const a=m.v.slice(i,i+3),b=m.v.slice(i+12,i+15),c=m.v.slice(i+24,i+27);
    assert.ok((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])>0,'actual mosaic winding faces upward for both renderers');
   }
  }
 }
 assert.equal(JSON.stringify(CISTERN),source);assert.equal(JSON.stringify(state),saved);
});

test('real resonator flags produce independent visible fans, floor feeds and gate badges without advancing the model',()=>{
 const outputs=[];
 for(const flags of[[false,false],[true,false],[false,true],[true,true]]){
  const state=createCisternState();state.resonators=[...flags];const before=JSON.stringify(state),m=new Geometry(),g=new Geometry(),result=appendCisternCraftDynamics(m,g,state,2);
  assert.ok([...m.v,...g.v].every(Number.isFinite));assert.ok(result.triangles<=220,'state craft stays inside the native dynamic budget');
  assert.deepEqual(result.resonators,flags);assert.equal(result.gateReady,flags.every(Boolean));
  for(let i=0;i<m.v.length;i+=36){const[x,y,z]=centroid(m.v,i);if(y>.09&&y<1.8)assert.equal(cisternWalkable(x,z,{resonators:[true,true]}),false,'powered craft never inserts a floor obstacle');}
  outputs.push([...m.v,...g.v]);assert.equal(JSON.stringify(state),before);
 }
 for(let a=0;a<outputs.length;a++)for(let b=a+1;b<outputs.length;b++)assert.notDeepEqual(outputs[a],outputs[b],'each native resonator combination has distinct geometry or signal');
 const state={resonators:[true,false]},m1=new Geometry(),g1=new Geometry(),m2=new Geometry(),g2=new Geometry();appendCisternCraftDynamics(m1,g1,state,0);appendCisternCraftDynamics(m2,g2,state,4);
 assert.notDeepEqual(m1.v,m2.v,'a powered broad shutter follows the existing animation clock');assert.deepEqual(state,{resonators:[true,false]});
});

test('both crafted signal centres remain in the native phone camera and survive the real low-quality software raster',()=>{
 for(const[width,height]of[[388,842],[360,740]])for(const side of[-1,1]){
  const r=camera(side,width,height),state={player:{x:side*8,z:-5},resonators:[true,true]},m=new Geometry(),g=new Geometry();const result=appendCisternCraftDynamics(m,g,state,2);
  const signal=new Geometry();for(let i=0;i<m.v.length;i+=36){const[x,y]=centroid(m.v,i);if(m.v[i+9]===4&&Math.sign(x)===side&&Math.abs(x)>9&&y>1.9&&y<4.1)signal.v.push(...m.v.slice(i,i+36));}
  assert.ok(signal.v.length>0,'test uses actual emitted fan signal faces');
  const station=result.stations.find(s=>s.side===side),center=project(r.vp,[station.x,station.y,station.z],width,height);assert.ok(center.x>=12&&center.x<=width-12&&center.y>100&&center.y<height-180,`wall machinery stays composed beside its native floor interaction: ${side} ${width}x${height} at ${JSON.stringify(center)}`);
  const ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop}),painter=new CisternSoftwarePainter({width,height,getContext:()=>ctx}),painted=[];
  painter._paintTriangle=(c,row)=>(painted.push(row),{draws:1,textured:0});const data=signal.data();
  painter.render({meshes:{dynamic:{data,count:data.length/12}},vp:r.vp,eye:r.eye,state,time:2,quality:'low'});
  assert.ok(painted.length>=4,'at least half of the visible eight-face signal survives clipping, culling and the actual five-pixel triangle cutoff');
  assert.ok(painted.every(row=>row.area>=5),'no test-only raster tolerance is introduced');painter.destroy();
 }
});
