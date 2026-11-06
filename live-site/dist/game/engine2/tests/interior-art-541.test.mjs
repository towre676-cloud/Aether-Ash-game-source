import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry,C} from '../cistern-renderer.js';
import {isInteriorScene} from '../scene-identity.js';
import {appendInteriorCraft,interiorCraftSpec} from '../interior-art-541.js';
import {buildAdventureGeometry} from '../adventure-3d-geometry.js';

const raw=JSON.parse(readFileSync(new URL('../world.json',import.meta.url)));
function setup(){const world=new World(raw);world.newGame({quiet:true});return world;}
function draw(world,id){world.state.scene=id;const mesh=new Geometry(),result=appendInteriorCraft(mesh,{world});return{mesh,result};}
function faces(mesh){const out=[];for(let i=0;i<mesh.v.length;i+=36){const points=[0,12,24].map(j=>mesh.v.slice(i+j,i+j+3));out.push({points,normal:mesh.v.slice(i+3,i+6),color:mesh.v.slice(i+6,i+9),material:mesh.v[i+9],alpha:mesh.v[i+11],center:points.reduce((a,p)=>a.map((v,j)=>v+p[j]/3),[0,0,0])});}return out;}
function inside(t,f){return t.center[0]>=f.x&&t.center[0]<f.x+f.w&&t.center[2]>=f.y&&t.center[2]<f.y+f.h;}

test('every non-origin native interior gets bounded deterministic craft without changing its world or ownership',()=>{
 const world=setup(),rooms=[...world.scenes.values()].filter(s=>!s.originId&&isInteriorScene(s)),families=new Set();
 assert.equal(rooms.length,58,'the pass covers the actual complete native room population');
 for(const scene of rooms){
  world.state.scene=scene.location;const before=world.save(),identity=JSON.stringify(scene),{mesh,result}=draw(world,scene.location),again=draw(world,scene.location);
  assert.ok(result.triangles>=300&&result.triangles<=3400,scene.location+' has substantial detail within the bounded mobile budget');
  assert.equal(result.triangles,mesh.v.length/36);assert.ok(mesh.v.every(Number.isFinite));assert.deepEqual(again.mesh.v,mesh.v);families.add(result.family);
  assert.ok(result.groups.find(g=>g.name==='furnishings').triangles>0,'real native furniture takes priority over secondary wall detail');
  assert.equal(world.save(),before);assert.equal(JSON.stringify(scene),identity,'native masks, doors, furniture and dialogue remain untouched');
 }
 assert.ok(families.size>=8,'the art retains distinct material and work families');
 for(const scene of world.scenes.values())if(scene.originId||!isInteriorScene(scene)){
  const {mesh,result}=draw(world,scene.location);assert.equal(mesh.v.length,0);assert.equal(result.family,null,'origin and exterior ownership remains separate');
 }
 assert.equal(interiorCraftSpec(null),null);
});

test('all new nontrivial solid faces remain outside actual walking cells, including native open window footprints',()=>{
 const world=setup();let count=0,lightFaces=0;
 for(const scene of world.scenes.values()){
  const {mesh,result}=draw(world,scene.location);if(!result.family)continue;
  for(const t of faces(mesh)){
   const [x,y,z]=t.center;
   if(y>.1&&y<2.4)assert.notEqual(scene.floor[Math.floor(z)]?.[Math.floor(x)],'.',scene.location+' has no added obstruction on a legal walking cell');
   if(t.alpha<1&&Math.abs(y-.048)<1e-8){assert.equal(scene.floor[Math.floor(z)]?.[Math.floor(x)],'.','window light is clipped to real traversable floor');lightFaces++;}
   count++;
  }
 }
 assert.ok(count>100000,'the invariant inspects the actual complete emitted room geometry');assert.ok(lightFaces>100,'windows create visible bounded floor light rather than floating beams');
});

test('native workstations gain large purpose-specific forms inside their saved footprints',()=>{
 const world=setup();
 for(const [id,visual,minHigh]of[[724,'hydrophone',60],[715,'textiles',20],[708,'pumping',45]]){
  const {mesh}=draw(world,id),fixture=world.scene.objects.find(o=>o.visual===visual);assert.ok(fixture,id+' contains the actual native '+visual+' fixture');
  const high=faces(mesh).filter(t=>inside(t,fixture.footprint)&&t.center[1]>1.1&&t.center[1]<2.15);
  assert.ok(high.length>=minHigh,id+' has a real instrument, loom or service circuit above its existing case');
 }
 const optics=draw(world,717),glass=faces(optics.mesh).filter(t=>t.material===4&&t.center[1]>1.2);assert.ok(glass.length>=20,'the optics bench carries a real glazed instrument');
 const clinic=draw(world,50),cot=world.scene.objects.find(o=>o.furniture===11),privacy=faces(clinic.mesh).filter(t=>inside(t,cot.footprint)&&t.center[1]>1.2&&t.center[1]<1.8);assert.ok(privacy.length>=20,'the native treatment footprint carries a broad privacy screen');
 const home=draw(world,2),bed=world.scene.objects.find(o=>o.furniture===0),quilt=faces(home.mesh).filter(t=>inside(t,bed.footprint)&&Math.abs(t.center[1]-.654)<1e-8);assert.equal(quilt.length,6,'the bed receives three broad quilt panels rather than subpixel noise');
});

test('authored flat relief skins face the same side as their geometric winding',()=>{
 const world=setup();let relief=0;
 for(const id of[2,50,212,708,717]){
  const {mesh,result}=draw(world,id),walls=result.groups.find(g=>g.name==='walls'),first=result.groups.slice(0,result.groups.indexOf(walls)).reduce((s,g)=>s+g.triangles,0),all=faces(mesh).slice(first,first+walls.triangles);
  for(const t of all){
   const [a,b,c]=t.points,ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]),cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],dot=cross.reduce((s,v,i)=>s+v*t.normal[i],0);
   assert.ok(dot>=-1e-9,'front-facing relief survives both software normal culling and GPU winding');relief++;
  }
 }
 assert.ok(relief>1000);
});

test('actual wall skins have separated depth planes and sit in front of the native wall rather than fighting it',()=>{
 const world=setup(),planes=new Set();let exposed=0;
 for(const id of[2,50,212,708,717]){
  const {mesh,result}=draw(world,id),walls=result.groups.find(g=>g.name==='walls'),first=result.groups.slice(0,result.groups.indexOf(walls)).reduce((s,g)=>s+g.triangles,0),all=faces(mesh).slice(first,first+walls.triangles),native=faces(buildAdventureGeometry(Geometry,C,world));
  for(const t of all){
   const axis=t.normal[2]>.999?2:t.normal[0]>.999?0:null;if(axis===null)continue;
   const values=t.points.map(p=>p[axis]);if(Math.max(...values)-Math.min(...values)>1e-8)continue;
   const plane=values[0],boundary=Math.ceil(plane),inset=Number((boundary-plane).toFixed(3));
   if(![.004,.012,.026,.04].includes(inset))continue;
   if(t.center[1]<.9||t.center[1]>2.3)continue;
   planes.add(inset);
   if(inset!==.04&&inset!==.026)continue;
   const across=axis===2?0:2,back=native.filter(n=>n.material===0&&n.normal[axis]>.999&&Math.max(...n.points.map(p=>p[1]))-Math.min(...n.points.map(p=>p[1]))>2&&n.points.every(p=>Math.abs(p[axis]-plane)<.15)&&t.center[across]>=Math.min(...n.points.map(p=>p[across]))&&t.center[across]<=Math.max(...n.points.map(p=>p[across]))&&t.center[1]>=Math.min(...n.points.map(p=>p[1]))&&t.center[1]<=Math.max(...n.points.map(p=>p[1])));
   assert.ok(back.length,'an actual native wall supports this panel');
   assert.ok(back.every(n=>n.points[0][axis]<plane-.005),'backing and coloured skin stand clear of the native wall front');exposed++;
  }
 }
 assert.deepEqual([...planes].sort((a,b)=>a-b),[.004,.012,.026,.04],'relief, trim, coloured skin and dark backing occupy four ordered planes');
 assert.ok(exposed>=40,'the integrated check inspects actual visible backing and colour faces in several room families');
});
