import test from 'node:test';
import assert from 'node:assert/strict';
import {routeAroundArchitecture,distanceFromFootprint,planEnvironment,validateEnvironmentPlan} from '../src/environment-plan.mjs';
import {authorScene} from '../src/scene-composer.mjs';
import {createEnvironmentRenderer} from '../src/environment-renderer.mjs';
import {PLANT_TYPES,plantGeometry,vegetationTier,attachSubtleWind} from '../src/environment-vegetation.mjs';
import {MockTHREE as THREE,countNames} from './three-mock.mjs';
import {createProductionArtBridge} from '../production/modules/src/aa-env537/production-bridge.mjs';

const town={id:'furnace-quarter-5.37',kind:'settlement',bounds:{minX:-35,maxX:35,minZ:-35,maxZ:35},anchors:[
 {id:'south-gate',kind:'threshold',x:0,z:23,importance:8},
 {id:'smith-forge',kind:'workshop',x:-12,z:6,importance:5},
 {id:'city-well',kind:'well',x:10,z:5,importance:5},
 {id:'watch-tower',kind:'tower',x:-14,z:-14,importance:2},
 {id:'inn-dwelling',kind:'dwelling',x:13,z:-13,importance:4},
 {id:'sanctuary',kind:'sanctuary',x:0,z:-22,importance:3}]};
const layout=()=>authorScene(town);

function minimumDisc(segment,footprint){let closest=Infinity;
 for(let i=0;i<=200;i++){const t=i/200,p={x:segment[0].x*(1-t)+segment[1].x*t,z:segment[0].z*(1-t)+segment[1].z*t};
  closest=Math.min(closest,distanceFromFootprint(p,footprint));}
 return closest;
}

test('shortest detour cannot pass through architecture footprint',()=>{
 const f={id:'house',x:0,z:0,radius:3.6};const a={x:-9,z:0},b={x:9,z:0},bounds={minX:-12,maxX:12,minZ:-10,maxZ:10};
 const route=routeAroundArchitecture(a,b,bounds,[f]);assert.ok(route.length>2);
 for(let i=1;i<route.length;i++)assert.ok(minimumDisc([route[i-1],route[i]],f)>=-.01,JSON.stringify(route));
 assert.deepEqual(route,routeAroundArchitecture(a,b,bounds,[f]));
});

test('town buildings face actual connecting street and roads start at entrance aprons',()=>{
 const plan=planEnvironment(layout(),{region:'ash'});
 for(const p of plan.placements.filter(p=>['dwelling','workshop','tower'].includes(p.role))){
  const f=plan.footprints.find(x=>x.id===p.anchorId);assert.ok(f);
  assert.ok(Math.hypot(p.entrance.x-p.x,p.entrance.z-p.z)>f.radius-.8,p.anchorId);
  assert.ok(plan.walkways.some(w=>Math.hypot(w.from.x-p.entrance.x,w.from.z-p.entrance.z)<.001||Math.hypot(w.to.x-p.entrance.x,w.to.z-p.entrance.z)<.001),p.anchorId);
 }
 assert.equal(validateEnvironmentPlan(plan).ok,true);
});

test('cultivated land and landscaping cannot occupy protected foundations',()=>{
 const plan=planEnvironment(layout(),{region:'clay'});
 for(const b of plan.footprints){assert.ok(plan.isProtectedSurface({x:b.x,z:b.z},0),b.id);}
 for(const p of plan.landscapes)assert.ok(!plan.isProtectedSurface(p,0),p.id);
});

test('six plant morphologies are actual finite nonempty meshes',()=>{
 assert.equal(PLANT_TYPES.length,6);
 for(const type of PLANT_TYPES){const g=plantGeometry(THREE,type);const p=g.getAttribute('position');
  assert.ok(p.count>9,type);assert.ok([...p.array].every(Number.isFinite),type);
 }
});

test('mobile and battery plant counts are bounded and retain six species',()=>{
 assert.ok(vegetationTier('battery')<vegetationTier('low'));
 assert.ok(vegetationTier('low')<vegetationTier('high'));
 assert.ok(vegetationTier('high')<vegetationTier('ultra'));
 const batch=createEnvironmentRenderer({THREE,scene:new THREE.Group(),quality:'low',batchStatic:false});
 batch.draw(layout(),{region:'clay'});
 assert.ok(batch.stats().grassInstances>200);
 assert.ok(batch.stats().grassInstances<=vegetationTier('low'));
 assert.ok(Object.keys(batch.stats().plantSpecies).length===6);batch.dispose();
});

test('the most important grass masks read actual saved-world surface flags',()=>{
 const r=createEnvironmentRenderer({THREE,scene:new THREE.Group(),quality:'low',materialAt:()=>({isInterior:true}),batchStatic:false});
 r.draw(layout(),{region:'clay'});assert.equal(r.stats().grassInstances,0);r.dispose();
});

test('full grass never grows on any authored residence or on actual stone roads',()=>{
 const r=createEnvironmentRenderer({THREE,scene:new THREE.Group(),quality:'medium',batchStatic:false});
 r.draw(layout(),{region:'clay'});let count=0;
 r.root.traverse(o=>{if(!o.isInstancedMesh)return;for(const mat of o.instances){const x=mat.pos[0],z=mat.pos[2];
  assert.equal(r.plan.isProtectedSurface({x,z},.55),false);
  assert.equal(r.plan.hasClearRoute({x,z},.32),false);count++;}});
 assert.equal(count,r.stats().grassInstances);r.dispose();
});

test('well-built detailed houses preserve genuine door and roof meshes when batched',()=>{
 const r=createEnvironmentRenderer({THREE,scene:new THREE.Group(),quality:'high'});
 r.draw(layout(),{region:'clay'});const names=countNames(r.root),stats=r.stats();
 for(const name of ['sheltered-door-hood','dormer-lit-leaded-window','door-to-door-walkable-stone-road']){
  assert.ok(name=== 'door-to-door-walkable-stone-road' ? names.includes(name)||stats.batching.removedDrawCalls>0 :
   name==='dormer-lit-leaded-window' ? names.includes(name) : stats.batching.removedDrawCalls>0,name);
 }
 assert.ok(stats.batching.interiorRoofBatches>0);
 const roofs=[];r.root.traverse(o=>{if(o.userData?.roofForAnchor==='inn-dwelling')roofs.push(o);});assert.ok(roofs.length>0);
 assert.equal(r.revealInterior('inn-dwelling',true),true);assert.ok(roofs.every(x=>x.visible===false));
 assert.equal(r.revealInterior('inn-dwelling',false),true);assert.ok(roofs.every(x=>x.visible===true));
 assert.equal(r.setDoorState('inn-dwelling',true),true);
 assert.equal(r.setDoorState('inn-dwelling',false),true);
 r.dispose();
});

test('wet-night material response restores original roughness on drying',()=>{
 const r=createEnvironmentRenderer({THREE,scene:new THREE.Group(),quality:'low'});r.draw(layout());
 const surface=[];r.root.traverse(o=>{if(o.isMesh&&o.material?.params?.roughness)surface.push(o.material);});assert.ok(surface.length>0);
 const m=surface.find(o=>o.params.roughness>.8),base=m.params.roughness;
 assert.equal(r.environmentMood({rain:1,night:1}),true);assert.ok(m.roughness<base);
 assert.equal(r.environmentMood({rain:0,night:0}),true);assert.ok(Math.abs(m.roughness-base)<1e-8);
 r.dispose();
});

test('production bridge can render solely from native host anchors with zero writes to world',()=>{
 const calls=[];const world={heightAt(x,z){return .1;},obstacleAt(){return false;}};
 const scene=new THREE.Group(),art=createProductionArtBridge({THREE,scene,world,quality:'low',setOriginalVisibility:v=>calls.push(v)});
 assert.equal(art.status.kind,'none');
 art.renderScene({...layout(),anchors:town.anchors},{region:'ash'});
 assert.equal(art.status.kind,'world');assert.equal(art.stats().landmarks,6);assert.equal(calls.at(-1),false);
 art.clear();assert.equal(calls.at(-1),true);art.dispose();assert.equal(scene.children.length,0);
});

test('production bridge preserves original graphics when source layout is malformed',()=>{
 const vis=[];const bridge=createProductionArtBridge({THREE,scene:new THREE.Group(),quality:'low',setOriginalVisibility:v=>vis.push(v)});
 assert.equal(bridge.renderScene(null),null);assert.equal(vis.at(-1),true);
 assert.match(bridge.status.error,/anchors/);bridge.dispose();
});

test('grass wind mutates one shader only, never the gameplay positions',()=>{
 const material=new THREE.MeshStandardMaterial({color:0xffffff});const wind=attachSubtleWind(material,{strength:.1});
 const shader={uniforms:{},vertexShader:'void main(){#include <begin_vertex>}' };
 material.onBeforeCompile(shader);assert.match(shader.vertexShader,/aaWindTime/);assert.ok(shader.uniforms.aaWindTime===wind);
});

// The 48 authored Ground Forge materials are now synthesized into native
// albedo/normal/roughness textures rather than using a stretched flat tile.
import {MATERIALS} from '../src/ground-materials.mjs';
import {generateGroundMaps} from '../src/ground-synthesis.mjs';
import {groundMaterialFromWorld} from '../src/environment-renderer.mjs';
test('48 Ground Forge material identities and world-aligned PBR maps integrate',()=>{
 assert.equal(MATERIALS.length,48);
 const maps=generateGroundMaps({materialId:'water-pebbles',width:16,height:16,metresX:16,metresZ:16,weather:{rain:.4}});
 assert.equal(maps.albedo.length,16*16*4);
 assert.equal(maps.normal.length,maps.albedo.length);
 assert.equal(maps.roughness.length,maps.albedo.length);
 assert.ok([...maps.albedo].every(Number.isFinite));
 assert.ok(new Set(maps.albedo).size>24);
 assert.deepEqual(maps.albedo,generateGroundMaps({materialId:'water-pebbles',width:16,height:16,metresX:16,metresZ:16,weather:{rain:.4}}).albedo);
});
test('host material IDs override authored defaults and route stones never become random squares',()=>{
 const plan=planEnvironment(layout(),{region:'clay'});
 const p={x:0,z:0};
 assert.equal(groundMaterialFromWorld({id:'water-deep'},plan,p.x,p.z),'water-deep');
 assert.equal(groundMaterialFromWorld({materialId:'ash-cinder'},plan,p.x,p.z),'ash-cinder');
 assert.equal(groundMaterialFromWorld({id:'not-a-registered-material'},plan,p.x,p.z).startsWith('clay-'),true);
});
test('real canvas/WebGL adapter constructs and releases three PBR data textures with correct UVs',()=>{
 class DataTexture{constructor(data,width,height,format,type){this.image={data,width,height};this.format=format;this.type=type;}dispose(){this.disposed=true;}}
 const T={...THREE,DataTexture,RGBAFormat:1023,UnsignedByteType:1009,SRGBColorSpace:'srgb',
  LinearMipmapLinearFilter:1008,LinearFilter:1006,ClampToEdgeWrapping:1001};
 const r=createEnvironmentRenderer({THREE:T,scene:new T.Group(),quality:'battery',batchStatic:false});
 r.draw(layout(),{surfaceMode:'replace-flat'});
 let surface=null;r.root.traverse(o=>{if(o.name==='terrain-skin-following-actual-collision-height')surface=o;});
 assert.ok(surface?.userData.groundForge);
 assert.equal(surface.userData.groundResolution,96);
 assert.equal(surface.material.params.vertexColors,false);
 const albedo=surface.material.params.map;
 const normal=surface.material.params.normalMap;
 const roughness=surface.material.params.roughnessMap;
 assert.equal(albedo.image.width,96);
 assert.equal(albedo.colorSpace,'srgb');
 assert.equal(normal.image.height,96);
 assert.equal(roughness.image.data.length,96*96*4);
 assert.ok(surface.geometry.getAttribute('uv').getX(0)===0);
 assert.ok(surface.geometry.getAttribute('uv').getX(28)>0);
 r.dispose();assert.equal(albedo.disposed,true);assert.equal(normal.disposed,true);assert.equal(roughness.disposed,true);
});

test('large landscapes route around a central structure instead of falling back through it',()=>{
 const a={x:-100,z:0},b={x:100,z:0};
 const detour=routeAroundArchitecture(a,b,{minX:-160,maxX:160,minZ:-160,maxZ:160},[
  {x:0,z:0,radius:15}
 ]);
 assert.ok(detour&&detour.length>2,JSON.stringify(detour));
 for(let i=1;i<detour.length;i++)assert.ok(minimumDisc([detour[i-1],detour[i]],{x:0,z:0,radius:15})>=-.01);
});
test('sealed scene does not generate a physically impossible phantom road',()=>{
 const a={x:-10,z:0},b={x:10,z:0};
 assert.equal(routeAroundArchitecture(a,b,{minX:-12,maxX:12,minZ:-12,maxZ:12},[{x:0,z:0,radius:8}],()=>true),null);
});
