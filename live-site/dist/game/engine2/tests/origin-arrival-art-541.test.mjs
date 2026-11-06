import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {installEmbodiedOrigins} from '../embodied-origins.js';
import {adventureLandscapePlan} from '../adventure-landscape.js';
import {exteriorSceneArtCameraFrame} from '../exterior-scene-camera-541.js';
import {appendOriginArrivalArt541,originArrivalArtPlan541} from '../origin-arrival-art-541.js';
const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
const TARGETS=[['sable-reed',1],['rook-regulator',1],['brass-rail',0],['brass-rail',1],['riven-tide',0],['riven-tide',1]],BASE={'sable-reed':50000,'rook-regulator':50004,'brass-rail':50006,'riven-tide':50008};
function setup(id,part=1){const w=new World(data);installEmbodiedOrigins(w);w.newGame({originId:id,quiet:true});w.state.scene=BASE[id]+part;w.state.chronicle.step=part?2:0;[w.state.x,w.state.y]=w.scene.authoredOpening.arrival;w.objects();w.embodiedOrigins.snapshot();return w;}
function draw(world){const mesh=new Geometry(),plan=appendOriginArrivalArt541(mesh,{world,objects:world.objects()});return{mesh,plan};}
function lowPolygon(poly,y){const out=[];let a=poly.at(-1),da=a[1]-y;for(const b of poly){const db=b[1]-y;if((da<=0)!==(db<=0)){const t=da/(da-db);out.push(a.map((v,i)=>v+(b[i]-v)*t));}if(db<=0)out.push(b);a=b;da=db;}return out;}
test('two real outdoor arrivals have a deterministic substantial home/work threshold without changing native state',()=>{
 for(const id of['sable-reed','rook-regulator']){
  const w=setup(id),objects=w.objects(),native=JSON.stringify(w.scene),saved=w.save(),a=draw(w),b=draw(w),p=a.plan;
  assert.ok(p);assert.deepEqual(a.mesh.v,b.mesh.v);assert.ok(a.mesh.v.every(Number.isFinite));assert.equal(a.mesh.v.length%36,0);
  assert.ok(p.stats.triangles>=1000&&p.stats.triangles<=2500,id+' bounded mobile composition');
  assert.deepEqual(p.arrival,{x:24.5,z:42.5});assert.deepEqual(p.approach,{x:27.5,z:42.5});assert.deepEqual(p.portal,{x:30.5,z:37.5});
  assert.ok(p.returnBay,'the actual return portal has its own attached porch');assert.ok(p.clearRoute.length>=4);assert.equal(p.sites[0].kind,'shelter');assert.ok(Math.hypot(p.sites[0].x-24.5,p.sites[0].z-42.5)<5);
  const l=adventureLandscapePlan(w);for(const r of[p.bay,p.pier,p.returnBay]){const heights=[];for(let z=Math.floor(r.z);z<=Math.floor(r.z+r.d);z++)for(let x=Math.floor(r.x);x<=Math.floor(r.x+r.w);x++){const t=l.terraces.find(t=>x>=t.x&&x<t.x+t.w&&z>=t.z&&z<t.z+t.h);heights.push(t?.height??l.base);}assert.ok(Math.abs(r.y-Math.min(...heights)+.025)<1e-8,'footings embed into the minimum actual terrace height');}
  for(let z=40;z<=42;z++)for(let x=24;x<=29;x++)assert.equal(w.scene.floor[z][x],'.','the native three-cell approach remains clear');
  assert.equal(JSON.stringify(w.scene),native);assert.equal(w.save(),saved);assert.deepEqual(w.objects(),objects);
 }
});
test('entire emitted faces clipped below head height stay on actual closed scene.floor, including face interiors',()=>{
 for(const [id,part]of TARGETS){
  const w=setup(id,part),{mesh,plan}=draw(w);let faces=0,overhead=0;
  for(let i=0;i<mesh.v.length;i+=36){
   const tri=[0,12,24].map(j=>mesh.v.slice(i+j,i+j+3)),low=lowPolygon(tri,plan.bay.y+2.6);if(!low.length){overhead++;continue;}faces++;
   // Every edge plus the fan's interior is checked, not only a box's corners.
   for(let k=1;k<low.length-1;k++)for(let u=0;u<=6;u++)for(let v=0;v<=6-u;v++){
    const p=low[0].map((a,j)=>(a*(6-u-v)+low[k][j]*u+low[k+1][j]*v)/6);
    assert.equal(w.scene.floor[Math.floor(p[2])]?.[Math.floor(p[0])],'#',id+' low solid remains within its native closed bank');
   }
  }
  assert.ok(faces>800&&overhead>180,'substantial grounded architecture and a fully overhead threshold both exist');
 }
});

const noop=()=>{};
function context(){return{setTransform:noop,fillRect:noop,save:noop,restore:noop,translate:noop,scale:noop,drawImage:noop,clearRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,closePath:noop,clip:noop,stroke:noop,fill:noop,createPattern:()=>({}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})};}
const norm=v=>{const n=Math.hypot(...v);return v.map(v=>v/n);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
function vp(frame,aspect){const z=norm(frame.eye.map((v,i)=>v-frame.at[i])),x=norm(cross([0,1,0],z)),y=cross(z,x),v=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,frame.eye),-dot(y,frame.eye),-dot(z,frame.eye),1],f=1/Math.tan(frame.fov/2),n=.15,F=100,p=[f/aspect,0,0,0,0,f,0,0,0,0,(F+n)/(n-F),-1,0,0,2*F*n/(n-F),0],m=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)m[j*4+i]=p[i]*v[j*4]+p[4+i]*v[j*4+1]+p[8+i]*v[j*4+2]+p[12+i]*v[j*4+3];for(let j=0;j<4;j++){m[j*4]+=frame.shift.x*m[j*4+3];m[j*4+1]+=frame.shift.y*m[j*4+3];}return m;}
test('real close portrait camera and actual 5px software culling retain the architectural body, arch and warm craft faces',()=>{
 const previous=globalThis.OffscreenCanvas;globalThis.OffscreenCanvas=class{constructor(w,h){this.width=w;this.height=h;}getContext(){return context();}};
 try{for(const [id,part]of TARGETS){
  const w=setup(id,part),{mesh,plan}=draw(w),canvas={width:388,height:842,getContext:()=>context(),getBoundingClientRect:()=>({width:388,height:842})},frame=exteriorSceneArtCameraFrame({world:w,canvas,ui:{hudHeight:106,touch:true,touchReserve:177},worksites:plan.sites,objects:w.objects(),aspect:388/842}),painter=new CisternSoftwarePainter(canvas),painted=[];
  painter._paintTriangle=(ctx,row)=>(painted.push({...row}),{draws:1,textured:0});
  const stats=painter.render({meshes:{static:{data:mesh.data(),count:mesh.v.length/12}},vp:vp(frame,388/842),eye:frame.eye,quality:'low',lights:[],lighting:plan.spec.lighting,state:{adventure:true,groundClipY:-.13,player:{x:w.state.x,z:w.state.y}}});
  assert.ok(frame.scope.actorPixels>=64,'the player retains the close gameplay size');assert.equal(frame.scope.worksite?.kind,'shelter');
  assert.ok(stats.triangles>130,id+' architecture survives actual phone culling');assert.ok(new Set(painted.map(t=>t.color)).size>=9,'visible material groups survive broad-face lighting');
  const width=Math.max(...painted.map(t=>t.maxX))-Math.min(...painted.map(t=>t.minX)),height=Math.max(...painted.map(t=>t.maxY))-Math.min(...painted.map(t=>t.minY));assert.ok(width>=130&&height>=140,'the native close view contains a readable building and gate silhouette');painter.destroy();
 }}finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}
});
test('all other origins and scenes remain untouched and a changed open root fails closed',()=>{
 const w=setup('sable-reed');for(const id of[50000,50002,50003,50004,50010,50011,50012,50013,47,703,2000]){w.state.scene=id;const m=new Geometry();assert.equal(originArrivalArtPlan541(w),null);assert.equal(appendOriginArrivalArt541(m,{world:w}),null);assert.equal(m.v.length,0);}
 w.state.scene=50001;const floor=w.scene.floor,row=floor[37];try{floor[37]=row.slice(0,26)+'.'+row.slice(27);assert.equal(originArrivalArtPlan541(w),null);}finally{floor[37]=row;}
});
test('both native rail and sluice parts have nearby distinct working architecture while anchors and gameplay remain read-only',()=>{
 for(const id of['brass-rail','riven-tide'])for(const part of[0,1]){
  const w=setup(id,part),native=JSON.stringify(w.scene),save=w.save(),objects=w.objects(),{mesh,plan}=draw(w),second=draw(w);
  assert.ok(plan);assert.equal(plan.family,id==='brass-rail'?'rail':'sluice');assert.ok(plan.stats.triangles>=1000&&plan.stats.triangles<=2500);assert.deepEqual(mesh.v,second.mesh.v);
  assert.ok(Math.hypot(plan.sites[0].x-w.state.x,plan.sites[0].z-w.state.y)<5,'the actual arrival gains a nearby workshop frontage');
  for(const q of w.scene.authoredOpening.approach){const [x,z]=q;assert.equal(w.scene.floor[Math.floor(z)][Math.floor(x)],'.','all original approach floor remains traversable');}
  assert.deepEqual(plan.portal,{x:objects.find(o=>o.type==='portal').xy[0]+.5,z:objects.find(o=>o.type==='portal').xy[1]+.5});
  assert.equal(JSON.stringify(w.scene),native);assert.equal(w.save(),save);assert.deepEqual(w.objects(),objects);
 }
 const rail=draw(setup('brass-rail',1)).mesh,sluice=draw(setup('riven-tide',1)).mesh;assert.notDeepEqual(rail.v,sluice.v,'rail semaphore and tide capstan have distinct authored geometry');
});
