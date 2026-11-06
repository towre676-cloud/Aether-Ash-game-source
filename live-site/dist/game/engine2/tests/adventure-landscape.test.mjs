import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry,C} from '../cistern-renderer.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';
import {isObservatory,buildObservatoryGeometry,observatoryScenePlan} from '../observatory-art.js';
import {buildingReservations,intersectsGroundRect} from '../environmental-grounding.js';
import {originStagingPlan} from '../adventure-origin-staging.js';
import {adventureLandscapeFamily,adventureLandscapePlan,appendAdventureLandscape,adventureLandscapeSprites,appendAdventureLandscapeDynamics} from '../adventure-landscape.js';
import {ENVIRONMENT_PROP_BY_ID} from '../environment-art-v17.js';
const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
const make=()=>{const w=new World(source);w.newGame({quiet:true});return w;};
const data=w=>{if(isObservatory(w))return buildObservatoryGeometry(Geometry,C,w).data();const m=new Geometry();appendAdventureLandscape(m,{world:w});return m.data();};

function assertAuthoredSea(mesh,palette){
 const cells=new Map(),topology=new Map(),points=[],base=palette.water;let triangles=0;
 for(let i=0;i<mesh.v.length;i+=36){const p=[0,12,24].map(j=>mesh.v.slice(i+j,i+j+3));if(!p.every(v=>Math.abs(v[1]+5.25)<1e-8))continue;
  assert.equal(mesh.v[i+9],6,'authored sea uses its native quiet color, not the retired photographic water texture');assert.ok(mesh.v[i+4]>.99,'sea faces are upward and cannot vanish by backface culling');
  for(let j=0;j<3;j++)for(let k=j+1;k<3;k++)assert.ok(Math.hypot(p[j][0]-p[k][0],p[j][2]-p[k][2])<=Math.sqrt(32)+1e-6,'small sea faces cannot span the software near plane');
  const minX=Math.min(...p.map(v=>v[0])),minZ=Math.min(...p.map(v=>v[2])),area=Math.abs((p[1][0]-p[0][0])*(p[2][2]-p[0][2])-(p[2][0]-p[0][0])*(p[1][2]-p[0][2]))/2;
  assert.ok(Math.abs(area-8)<1e-8,'each cell has two nondegenerate half-quads');const id=minX+','+minZ;cells.set(id,(cells.get(id)||0)+1);if(!topology.has(id))topology.set(id,[]);topology.get(id).push(p.map(v=>[v[0],v[2]]));points.push(...p);triangles++;
  const tone=mesh.v[i+6]/base[0];assert.ok(tone>=.85&&tone<=1.03);for(let c=0;c<3;c++)assert.ok(Math.abs(mesh.v[i+6+c]-base[c]*tone)<1e-7,'sea keeps the native blue palette under broad coherent tone variation');
 }
 assert.ok(triangles>=1250&&triangles<=2000,'100m+ sea stays inside the authored static face budget');assert.equal(cells.size,triangles/2);assert.ok([...cells.values()].every(n=>n===2),'every sea cell has two triangles');
 for(const faces of topology.values()){const ids=faces.map(ps=>ps.map(p=>p.join(','))),corners=new Set(ids.flat()),shared=ids[0].filter(p=>ids[1].includes(p)).map(p=>p.split(',').map(Number));assert.equal(corners.size,4);assert.equal(shared.length,2);assert.ok(Math.abs(Math.hypot(shared[0][0]-shared[1][0],shared[0][1]-shared[1][1])-Math.sqrt(32))<1e-8,'complementary triangles share the4mquad diagonal, leaving no hidden half-cell hole');}
 const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]),minX=Math.min(...xs),minZ=Math.min(...zs),maxX=Math.max(...xs),maxZ=Math.max(...zs);
 assert.equal(maxX-minX,100);assert.ok(maxZ-minZ>=100&&maxZ-minZ<=160,'the current camera horizon has bounded100m+ connected sea coverage');assert.equal(cells.size,(maxX-minX)*(maxZ-minZ)/16);
 for(let z=minZ;z<maxZ;z+=4)for(let x=minX;x<maxX;x+=4)assert.equal(cells.get(x+','+z),2,'connected sea contains no missing4m cell at '+x+','+z);
}

test('all167 places retain their native terrain owner without changing state or the walk mask',()=>{
 const w=make();let scenes=0,max=0,generic=0,compact=0;
 for(const[id,s]of w.scenes){w.state.scene=id;w.objects();const before=w.save(),floor=s.floor.slice(),mesh=data(w);
  if(isObservatory(w)){compact++;const renderer={world:w},actual=Adventure3DRenderer.prototype.buildArchitecture.call(renderer);assert.deepEqual(actual.data(),mesh);assert.equal(renderer.environmentArt537,null);assert.equal(actual.observatory.groundY,.02);assert.ok(mesh.length/36<15000,'authored headland, equipment and reply-station budget');assert.ok(mesh.every(Number.isFinite));assert.equal(w.save(),before);assert.deepEqual(s.floor,floor);scenes++;continue;}
  generic++;const p=adventureLandscapePlan(w);
  assert.ok(p.terraces.length>20,s.key+' composed terrain');assert.ok(p.walls.length>20,s.key+' connected edge walls');assert.ok(mesh.length>0&&mesh.length%36===0);assert.ok(mesh.every(Number.isFinite),s.key+' finite');max=Math.max(max,mesh.length/36);
  for(const rect of p.terraces)for(let z=rect.z;z<rect.z+rect.h;z++)for(let x=rect.x;x<rect.x+rect.w;x++)assert.equal(p.open(x,z),false,`${id}: raised terrain cannot take native floor ${x},${z}`);
  assert.equal(w.save(),before,id+' presentation is read-only');assert.deepEqual(s.floor,floor);scenes++;
 }
 assert.equal(scenes,167);assert.equal(generic,165);assert.equal(compact,2);assert.ok(max<10000,'bounded composed landscape '+max);
});

test('closed shade inside outdoor bounds is a connected landscape and not only a perimeter decoration',()=>{
 const w=make();for(const id of[5,73]){w.state.scene=id;const p=adventureLandscapePlan(w),b=p.bounds;
  const inside=p.terraces.filter(r=>r.x<b.x1&&r.x+r.w>b.x0&&r.z<b.z1&&r.z+r.h>b.z0);assert.ok(inside.length>4,id+' internal masses');assert.ok(inside.some(r=>r.w*r.h>=3),id+' broad coherent mass');
  for(const f of p.features)assert.ok(p.closedPatch(f.x,f.z,1.55),id+' complete closed canopy footprint');
 }
});

test('all12 frontier biomes have their own contour palette and native water shores form actual surfaces',()=>{
 const w=make(),families=new Set(),meshes=new Set();for(let id=2000;id<2060;id+=5){w.state.scene=id;families.add(adventureLandscapeFamily(w));const mesh=data(w);meshes.add(Array.from(mesh.slice(-120)).join(','));}
 assert.equal(families.size,12);assert.equal(meshes.size,12);
 for(const id of[2005,2020,2025]){w.state.scene=id;const p=adventureLandscapePlan(w);assert.equal(p.water,true);assert.ok(p.terraces.filter(r=>r.water).reduce((n,r)=>n+r.w*r.h,0)>300);assert.ok(p.shore.length>10);}
});

test('native building foundations and exact original-device work bays remain unburied',()=>{
 const w=make();for(const id of[5,73,50000,50001]){w.state.scene=id;const p=adventureLandscapePlan(w),reserved=buildingReservations(w.scene).flatMap(v=>v.groundRects);
  if(w.scene.originId)for(const s of originStagingPlan(w).worksites)reserved.push({x:s.x,y:s.z,w:s.width,h:s.depth});
  for(const r of p.terraces)for(const q of reserved)assert.equal(intersectsGroundRect({x:r.x,y:r.z,w:r.w,h:r.h},q),false,id+' native building/worksite');
 }
});

test('landscape vegetation keeps grounded 3D trunks and emitted bank tops without floating bitmap cutouts',()=>{
 const w=make(),assets={};for(const prop of Object.values(ENVIRONMENT_PROP_BY_ID))assets[prop.asset]={width:1900,height:1000,complete:true};
 for(const id of[5,19,2045,50012]){w.state.scene=id;w.state.x=w.scene.arrive[0]+.5;w.state.y=w.scene.arrive[1]+.5;const before=w.save();assert.deepEqual(adventureLandscapeSprites({world:w,assets,range:1000}),[]);assert.equal(w.save(),before);}
 w.state.scene=5;const p=adventureLandscapePlan(w),mesh=data(w),trees=p.features.filter(f=>!f.near);assert.ok(trees.length>5,'native 3D forest remains');
 for(const f of trees){const roots=[];for(let i=0;i<mesh.length;i+=12)if(mesh[i+9]===2&&Math.hypot(mesh[i]-f.x,mesh[i+2]-f.z)<.16)roots.push(mesh[i+1]);assert.ok(roots.length>0,'real wood geometry at tree');assert.ok(Math.abs(Math.min(...roots)-f.y)<1e-5,'trunk begins at its actual terrace height');
  let cap=false;for(let i=0;i<mesh.length;i+=36){if(mesh[i+4]<.999||Math.abs(mesh[i+1]-f.y)>1e-5||Math.abs(mesh[i+13]-f.y)>1e-5||Math.abs(mesh[i+25]-f.y)>1e-5)continue;const ax=mesh[i],az=mesh[i+2],bx=mesh[i+12],bz=mesh[i+14],cx=mesh[i+24],cz=mesh[i+26],d=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(d)<1e-10)continue;const u=((bz-cz)*(f.x-cx)+(cx-bx)*(f.z-cz))/d,v=((cz-az)*(f.x-cx)+(ax-cx)*(f.z-cz))/d;if(u>=-1e-5&&v>=-1e-5&&u+v<=1+1e-5){cap=true;break;}}assert.ok(cap,'emitted land surface directly beneath the trunk');
 }
});

test('opening an actual new floor cell invalidates the terrain plan and keeps it clear',()=>{
 const w=make();w.state.scene=2032;const p=adventureLandscapePlan(w),r=p.terraces.find(v=>v.x>0&&v.z>0&&v.x<w.scene.width&&v.z<w.scene.height);assert.ok(r);const x=r.x,z=r.z,row=w.scene.floor[z];w.scene.floor[z]=row.slice(0,x)+'.'+row.slice(x+1);const next=adventureLandscapePlan(w);assert.notEqual(next,p);assert.ok(next.terraces.every(v=>!(x>=v.x&&x<v.x+v.w&&z>=v.z&&z<v.z+v.h)));assert.equal(next.open(x,z),true);
});


test('interior maze voids become contiguous masonry without taking structural floors, furniture or partitions',()=>{
 const w=make();w.state.scene=47;const p=adventureLandscapePlan(w),b=p.bounds,solid=p.terraces.filter(r=>r.masonry);assert.ok(solid.length>10);assert.ok(solid.reduce((n,r)=>n+r.w*r.h,0)>100);
 for(const r of solid){assert.ok(r.height<=1.1);for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)assert.equal(p.open(x,z),false);}
 assert.ok(p.features.every(f=>f.x<b.x0||f.x>=b.x1||f.z<b.z0||f.z>=b.z1),'trees and natural silhouettes stay outside the room');
});


test('authored Veyr headlands retain connected rock descent, lower sea and exclusive native scene assembly',()=>{
 const w=make();for(const id of[50012,50013]){w.state.scene=id;w.state.x=w.scene.arrive[0]+.5;w.state.y=w.scene.arrive[1]+.5;const before=w.save(),p=observatoryScenePlan(w),m=buildObservatoryGeometry(Geometry,C,w),renderer={world:w};
  assert.equal(p.spec.schema,1);assert.equal(w.scene.observatory.schema,1);assert.deepEqual(Adventure3DRenderer.prototype.buildArchitecture.call(renderer).v,m.v);assert.equal(renderer.environmentArt537,null);
  assert.deepEqual(adventureLandscapeSprites({world:w,assets:{environmentStorm:{width:1900,height:1000}}}),[],'no legacy painted rock cutouts');
  assertAuthoredSea(m,p.palette);const deep=[],layers=new Map(),foundationEnd=m.observatory.foundationVertices*12;
  assert.ok(Number.isInteger(foundationEnd)&&foundationEnd>0&&foundationEnd<m.v.length&&foundationEnd%36===0,'native foundation range is a complete bounded triangle section');
  for(let i=0;i<foundationEnd;i+=36){
   // The native geological shell now carries the authored cliff material.
   // The captured range belongs to this native foundation and sea, before
   // tidal masonry and the reply station add their separate geological forms.
   if(m.v[i+9]!==6.25)continue;const y=[m.v[i+1],m.v[i+13],m.v[i+25]],low=Math.min(...y),high=Math.max(...y);if(low<-5.5)deep.push(low);if(low<-.4&&high>low+.1){const id=low+':'+high;layers.set(id,(layers.get(id)||0)+1);}
  }
  assert.ok(deep.length>50,'the headland foundation reaches below the sea');const ranges=[...layers].map(([key,count])=>({bounds:key.split(':').map(Number),count})).sort((a,b)=>a.bounds[0]-b.bounds[0]);assert.equal(ranges.length,3);assert.ok(ranges[0].bounds[0]<-5.5&&ranges.at(-1).bounds[1]>0);for(let i=0;i<ranges.length;i++){assert.ok(ranges[i].count>20);if(i)assert.equal(ranges[i-1].bounds[1],ranges[i].bounds[0],'foundation layers share exact continuous seams');}assert.equal(new Set(ranges.map(r=>r.count)).size,1,'the entire boundary descends through every geological layer');
  const arrival=p.anchors.arrival;assert.equal(w.scene.floor[Math.floor(arrival.z)][Math.floor(arrival.x)],'.');assert.equal(w.save(),before);
 }
});


test('rock country uses connected landforms rather than a ring of independent boulders or painted pebbles',()=>{
 const w=make(),assets={};for(const prop of Object.values(ENVIRONMENT_PROP_BY_ID))assets[prop.asset]={width:1900,height:1000,complete:true};for(const id of[73,2015,2050,2055]){w.state.scene=id;const p=adventureLandscapePlan(w);assert.ok(p.walls.length>50);assert.deepEqual(adventureLandscapeSprites({world:w,assets,range:1000}),[]);const mesh=data(w);let highest=-Infinity;for(let i=1;i<mesh.length;i+=12)highest=Math.max(highest,mesh[i]);const landHeight=Math.max(...p.terraces.map(t=>t.height));assert.ok(highest<=landHeight+.01,'no free sphere rises above the actual connected terrain');}
});


test('every planned non-water terrace has an emitted upward surface, including interior caps and coastal ledges',()=>{
 const w=make();
 function contains(t,x,z){const[a,b,c]=t,d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(d)<1e-10)return false;const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d;return u>=-1e-5&&v>=-1e-5&&u+v<=1+1e-5;}
 for(const id of[5,73,47,50000,50012,50013,2032,2045]){w.state.scene=id;const mesh=data(w),tops=new Map(),compact=isObservatory(w),p=compact?observatoryScenePlan(w):adventureLandscapePlan(w);
  for(let i=0;i<mesh.length;i+=36){if(mesh[i+4]<.999||Math.abs(mesh[i+1]-mesh[i+13])>1e-6||Math.abs(mesh[i+1]-mesh[i+25])>1e-6)continue;const k=Math.round(mesh[i+1]*1e5);if(!tops.has(k))tops.set(k,[]);tops.get(k).push([{x:mesh[i],z:mesh[i+2]},{x:mesh[i+12],z:mesh[i+14]},{x:mesh[i+24],z:mesh[i+26]}]);}
  if(compact){const triangles=tops.get(Math.round(p.groundY*1e5))||[];for(let z=0;z<w.scene.height;z++)for(let x=0;x<w.scene.width;x++)if(w.scene.floor[z][x]==='.')assert.ok(triangles.some(t=>contains(t,x+.5,z+.5)),id+' actual authored paving at '+x+','+z);continue;}
  for(const r of p.terraces.filter(r=>!r.water)){const triangles=tops.get(Math.round(r.height*1e5))||[];for(const[x,z]of[[r.x+.05,r.z+.05],[r.x+r.w-.05,r.z+r.h-.05],[r.x+r.w/2,r.z+r.h/2]])assert.ok(triangles.some(t=>contains(t,x,z)),id+' missing real top at '+x+','+z+' height '+r.height);}
 }
});
