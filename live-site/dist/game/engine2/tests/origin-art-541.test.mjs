import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {ORIGINS} from '../origin-content.js';
import {installEmbodiedOrigins} from '../embodied-origins.js';
import {originStagingPlan} from '../adventure-origin-staging.js';
import {originArtPlan541,originArtOwnsFurnishing541,appendOriginArt541,appendOriginArtDynamics541} from '../origin-art-541.js';
const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
const origins=ORIGINS.filter(o=>o.id!=='veyr-storm');
function setup(origin,part){const w=new World(data);installEmbodiedOrigins(w);w.newGame({originId:origin.id,quiet:true});w.state.scene=origin.location+part;w.state.chronicle.step=part?2:0;w.objects();w.embodiedOrigins.snapshot();return w;}
function structural(s,x,z){return s.floor[z]?.[x]==='.';}
function draw(w,feedback=null){const m=new Geometry(),g=new Geometry();const p=appendOriginArtDynamics541(m,g,{world:w,time:2,feedback,objects:w.embodiedOrigins.objects(),range:1000});return {p,m,g,v:[...m.v,...g.v]};}
test('all twelve other origin scenes have distinct anchored craft with connected native service walks',()=>{
 const families=new Set();
 for(const origin of origins)for(const part of[0,1]){
  const w=setup(origin,part),before=w.save(),floor=[...w.scene.floor],m=new Geometry(),p=appendOriginArt541(m,{world:w});families.add(p.spec.family);
  assert.ok(p.stats.bodies>=2);assert.ok(p.stats.serviceCells>=8);assert.ok(p.stats.triangles>300&&p.stats.triangles<6000,origin.id+':'+part+' mobile static budget');
  assert.ok(m.v.every(Number.isFinite));assert.equal(m.v.length%36,0);
  const second=new Geometry();appendOriginArt541(second,{world:w});assert.deepEqual(second.v,m.v,'authored craft is stable across rebuilds');
  for(let i=0;i<m.v.length;i+=12){const x=m.v[i],y=m.v[i+1],z=m.v[i+2];if(y>.075)assert.equal(structural(w.scene,Math.floor(x),Math.floor(z)),false,origin.id+':'+part+' solid craft is in its closed worksite');}
  for(const r of p.routes)for(const [x,z]of r.cells)assert.equal(w.scene.floor[z]?.[x],'.');
  assert.ok(Math.max(...m.v.filter((_,i)=>i%12===1))>1.8,'a readable worksite profile rises above generic furniture');
  assert.deepEqual(w.scene.floor,floor);assert.equal(w.save(),before);
 }
 assert.equal(families.size,6);
});
test('native witness, repair alternatives, diversion and destiny change emitted craft without advancing gameplay',()=>{
 for(const origin of origins)for(const part of[0,1]){
  const w=setup(origin,part),record=w.state.embodiedOrigins.origins[origin.id],before=w.save(),a=draw(w);assert.ok(a.v.every(Number.isFinite));
  const preview=draw(w,{pending:{object:{originId:origin.id,manipulation:'lever'},progress:.65}});assert.notDeepEqual(preview.v,a.v,origin.id+':'+part+' moving mechanism');assert.equal(w.save(),before);
  record.witnessed=true;record.receiver=true;const witnessed=draw(w);if(!part)assert.notDeepEqual(witnessed.v,a.v,'witness leaves visible state');
  record.repair=0;record.grounded=true;const repaired=draw(w);record.repair=1;const alternative=draw(w);assert.notDeepEqual(alternative.v,repaired.v,origin.id+' repair alternatives differ');
  record.diverted=true;const diverted=draw(w);if(part)assert.notDeepEqual(diverted.v,alternative.v,'peaceful departure changes the native diversion worksite');
  record.choice=0;const shared=draw(w);record.choice=1;const other=draw(w);assert.notDeepEqual(shared.v,other.v,'saved destiny stays visible at its desk');
  assert.ok(other.v.every(Number.isFinite));assert.ok(other.v.length/36<4000,'dynamic craft stays bounded');
 }
});
test('broad front-facing ceramic, wood and signal shapes survive ordinary camera culling and other scenes stay untouched',()=>{
 for(const origin of origins){const w=setup(origin,0),m=new Geometry(),p=appendOriginArt541(m,{world:w});let fronts=0;
  for(let i=0;i<m.v.length;i+=36){const y=m.v[i+1],nx=m.v[i+3],ny=m.v[i+4],nz=m.v[i+5];if(y>.3&&nz>.6){const a=m.v.slice(i,i+3),b=m.v.slice(i+12,i+15),c=m.v.slice(i+24,i+27),cross=[(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]),(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]),(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])];assert.ok(cross[0]*.22+cross[1]*.75+cross[2]*.78>0,'front geometry faces the real east/front camera');fronts++;}}
  assert.ok(fronts>20,p.spec.id+' meaningful broad visible faces');
 }
 const w=setup(origins[0],0);for(const scene of[5,47,703,2000,50012,50013]){w.state.scene=scene;const m=new Geometry();assert.equal(originArtPlan541(w),null);assert.equal(appendOriginArt541(m,{world:w}),null);assert.equal(m.v.length,0);}
});

test('indoor primary work joins actual blocked furnishings without altering native staging or suppressing other household visuals',()=>{
 let rebound=0,fallback=0;
 for(const origin of origins)for(const part of[0,1]){
  const w=setup(origin,part),native=originStagingPlan(w);if(!native.spec.indoor)continue;
  const nativePoses=native.bodies.map(b=>[b.x,b.z,b.width,b.depth,JSON.stringify(b.connection)]),nativeRoutes=native.actionRoutes.size,before=w.save(),p=originArtPlan541(w),primary=p.bodies.find(b=>b.kind===p.spec.family);
  assert.notEqual(p,native);assert.notEqual(p.bodies,native.bodies);assert.notEqual(p.actionRoutes,native.actionRoutes,'visual route cache does not mutate the native staging plan');
  const eligible=w.scene.objects.filter(o=>o.type==='furnishing'&&![16,18].includes(o.furniture)&&o.footprint&&Math.hypot(o.footprint.x+o.footprint.w/2-primary.anchor.x,o.footprint.y+o.footprint.h/2-primary.anchor.z)<=5&&Array.from({length:o.footprint.h},(_,z)=>Array.from({length:o.footprint.w},(_,x)=>w.scene.floor[o.footprint.y+z]?.[o.footprint.x+x]==='#')).flat().every(Boolean));
  if(eligible.length){
   rebound++;assert.equal(primary.rebound,true,origin.id+':'+part+' uses an available actual indoor furnishing');
   assert.equal(p.ownedFurnishings.length,1);const object=p.ownedFurnishings[0],r=object.footprint;
   assert.ok(eligible.includes(object));assert.deepEqual([primary.x,primary.z],[r.x+r.w/2,r.y+r.h/2]);
   assert.ok(primary.x>=0&&primary.z>=0&&primary.x<w.scene.width&&primary.z<w.scene.height);
   assert.ok(Math.hypot(primary.x-primary.anchor.x,primary.z-primary.anchor.z)<=5);
   for(let z=r.y;z<r.y+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)assert.equal(w.scene.floor[z][x],'#','visual replacement remains inside real blocked furniture');
   assert.ok(originArtOwnsFurnishing541(w,object));assert.equal(originArtOwnsFurnishing541(w,{...object,furniture:16}),false);assert.equal(originArtOwnsFurnishing541(w,{...object,furniture:18}),false);
   for(const other of w.scene.objects.filter(o=>o.type==='furnishing'&&o!==object))assert.equal(originArtOwnsFurnishing541(w,other),false,'only the exact replaced furnishing visual is suppressed');
   assert.ok(primary.connection.length);for(const [x,z]of primary.connection)assert.equal(w.scene.floor[z][x],'.','new cable/service connection uses real native walking floor');
   const landing=primary.connection.at(-1);assert.ok(Math.hypot(landing[0]+.5-primary.x,landing[1]+.5-primary.z)<Math.hypot(r.w,r.h)/2+1.5,'connection reaches the actual new worksite edge');
   if(origin.id==='sable-reed'){assert.ok(primary.x<=28&&primary.z<=15,'the reed cabinet is inside the home rather than outside the cutaway');assert.equal(object.label,'Stone hearth');}
  }else{fallback++;assert.equal(p.ownedFurnishings.length,0);assert.deepEqual([primary.x,primary.z],[native.bodies.find(b=>b.kind===p.spec.family).x,native.bodies.find(b=>b.kind===p.spec.family).z]);}
  draw(w);assert.deepEqual(native.bodies.map(b=>[b.x,b.z,b.width,b.depth,JSON.stringify(b.connection)]),nativePoses);assert.equal(native.actionRoutes.size,nativeRoutes);assert.equal(w.save(),before);
 }
 assert.equal(rebound,3,'three real indoor worksite furnishings are available within the native five metre reach');assert.equal(fallback,3,'the other three interiors retain their checked closed-cell worksite');
});
test('the Sable worksite preserves the household hearth with a warm firebox and reed work above its mantel',()=>{
 const w=setup(origins.find(o=>o.id==='sable-reed'),0),m=new Geometry(),p=appendOriginArt541(m,{world:w}),body=p.bodies.find(b=>b.kind==='reed');
 assert.equal(body.furnishing.furniture,4);let fire=0,stone=0,upperReeds=0;
 for(let i=0;i<m.v.length;i+=36){
  const points=[0,12,24].map(j=>m.v.slice(i+j,i+j+3));if(!points.every(v=>Math.abs(v[0]-body.x)<=body.width/2+.01&&Math.abs(v[2]-body.z)<=body.depth/2+.01))continue;
  const y=points.reduce((n,v)=>n+v[1]/3,0),color=m.v.slice(i+6,i+9);
  if(y>.4&&y<1.1&&m.v[i+10]>.05&&color[0]>color[1]&&color[1]>color[2])fire++;
  if(y<1.3&&Math.abs(color[0]-158/255)<1e-6&&Math.abs(color[1]-144/255)<1e-6&&Math.abs(color[2]-118/255)<1e-6)stone++;
  if(y>1.45&&y<2.4&&m.v[i+9]===1)upperReeds++;
 }
 assert.ok(fire>=2,'two broad warm fire faces visibly preserve the heater purpose');assert.ok(stone>20,'a substantial stone hearth and mantel remain below the workcase');assert.ok(upperReeds>20,'reed craft is carried on the mantel/chimney above the heat source');
});
