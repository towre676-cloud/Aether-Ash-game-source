import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createEcology} from './grass-ecology.mjs';
import {sampleFoliageAppearance} from './grass-appearance.mjs';
import {createCanvasGrassFallback} from './canvas-grass-fallback.mjs';
import {createGrassField} from './grass-renderer.mjs';
import {createAAGameVegetationBridge} from './aa-game-integration.mjs';

class Vec2 {constructor(x=0,y=0){this.set(x,y)}set(x,y){this.x=x;this.y=y;return this}normalize(){return this}}
class Vec4 {set(){return this}}
class Color {constructor(c){this.c=c}clone(){return new Color(this.c)}multiplyScalar(){return this}lerp(){return this}set(){return this}}
class Geo {constructor(){this.attributes={}}setAttribute(k,v){this.attributes[k]=v}getAttribute(k){return this.attributes[k]}setIndex(v){this.indices=v}computeBoundingSphere(){}dispose(){}}
class Attr {constructor(array,itemSize){this.array=array;this.itemSize=itemSize}}
class Mat {constructor(opts){this.uniforms=opts.uniforms;this.vertexShader=opts.vertexShader;this.fragmentShader=opts.fragmentShader}dispose(){}}
class Obj {constructor(){this.position={set(){}},this.rotation={set(){}},this.scale={set(){}},this.matrix={}}updateMatrix(){}}
class Mesh {constructor(geometry,material,count){this.geometry=geometry;this.material=material;this.instanceMatrix={count,setUsage(){}};this.count=0}setMatrixAt(){}setColorAt(){this.instanceColor={}}dispose(){}}
const THREE={Vector2:Vec2,Vector4:Vec4,Color,BufferGeometry:Geo,Float32BufferAttribute:Attr,InstancedBufferAttribute:Attr,ShaderMaterial:Mat,Object3D:Obj,InstancedMesh:Mesh,DoubleSide:2,DynamicDrawUsage:35048};
const scene=()=>({objects:new Set(),add(v){this.objects.add(v)},remove(v){this.objects.delete(v)}});
const mockCtx=()=>{let fills=0,primitives=0,bad=false;
 const fn=()=>{primitives++};return {ctx:{save:fn,restore:fn,beginPath:fn,closePath:fn,stroke:fn,fill:()=>{fills++},
 moveTo:(x,y)=>{if(!Number.isFinite(x)||!Number.isFinite(y))bad=true},
 quadraticCurveTo:(...a)=>{if(!a.every(Number.isFinite))bad=true},
 ellipse:(...a)=>{if(!a.every(Number.isFinite))bad=true},
 },getStats:()=>({fills,primitives,bad})};};

test('v5 morphology is stable over frame/camera changes and varied over space',()=>{
 const e=createEcology({biome:'orchard',seed:771});const samples=[];
 for(let i=0;i<130;i++){const a=sampleFoliageAppearance(i,3-i,771,e.sample(i*.7,(3-i)*.5));
  assert.deepEqual(a,sampleFoliageAppearance(i,3-i,771,e.sample(i*.7,(3-i)*.5)));
  assert.ok(a.height>.5&&a.height<2&&a.width>.5&&a.width<1.6);samples.push(a);}
 assert.ok(new Set(samples.map(v=>Math.round(v.height*100))).size>45);
 assert.ok(new Set(samples.map(v=>Math.round(v.fan*100))).size>45);
 assert.ok(new Set(samples.map(v=>Math.round(v.phase*100))).size>90);
});

test('v5 GPU puts finite, nonuniform per-instance morphology into all populated species and flowers',()=>{
 const s=scene(),f=createGrassField(THREE,s,{seed:17,biome:'orchard',quality:'medium',maxPlants:480});
 assert.ok(f.getStats().plants>100);
 let seen=0,unique=new Set();
 for(const mesh of s.objects){
   const v=mesh.geometry.getAttribute('aVariation');assert.ok(v,'all GPU meshes need the variation vertex attribute');
   assert.equal(v.itemSize,4);assert.equal(v.array.length,4*mesh.instanceMatrix.count);
   for(let i=0;i<mesh.count;i++){
      const x=Array.from(v.array.slice(i*4,i*4+4));assert.ok(x.every(Number.isFinite));unique.add(x.join(','));seen++;
   }
 }
 assert.ok(seen>100);assert.ok(unique.size>seen*.65);
 const before=new Map([...s.objects].map(x=>[x.name,[...x.geometry.getAttribute('aVariation').array]]));
 f.build(0,0);
 for(const mesh of s.objects)assert.deepEqual([...mesh.geometry.getAttribute('aVariation').array],before.get(mesh.name),'same cells must not reroll morphology');
 f.dispose();assert.equal(s.objects.size,0);
});

test('v5 Canvas paints organic foliage at every tier and respects perspective scaling',()=>{
 const options={seed:923,biome:'orchard',season:'summer',worldToScreen:(x,z)=>({x:x*22,y:z*18}),scaleAt:(x,z)=>1/(1+Math.abs(z)*.06)};
 const stats=[];
 for(const quality of ['low','medium','high']){
  const {ctx,getStats}=mockCtx();const fallback=createCanvasGrassFallback({...options,quality});
  const result=fallback.draw(ctx,{bounds:{minX:-8,maxX:8,minZ:-9,maxZ:9},dt:.016,wind:.45,pixelScale:28});
  assert.ok(result.plants>30);assert.ok(result.paletteColors>5);
  assert.equal(getStats().bad,false);
  stats.push(result.plants);
 }
 assert.ok(stats[0]<stats[1]&&stats[1]<stats[2],String(stats));
});

test('v5 morphology and render modes cannot alter combat or ground samples',()=>{
 const gameOptions={seed:22,groundOptions:{materialAt:()=>({tags:['soil'],organic:.9,moisture:.37}),regionAt:()=>({biome:'orchard'})}};
 const b=createAAGameVegetationBridge({...gameOptions,renderMode:'none'});
 const before=b.sample(3,4);b.setVisualSettings({quality:'high',highContrast:true,autoQuality:true});
 assert.deepEqual(b.sample(3,4),before);
 b.applyEvent({type:'footfall',eventId:'visual-effects',x:3,z:4,radius:2,mass:1});
 const after=b.sample(3,4);assert.ok(after.vegetation.flatten>before.vegetation.flatten);
 b.dispose();
});

test('v5 scenic and QA previews are fully inlined and use the current bridge',()=>{
 for(const file of ['cinematic-grass-offline.html','reconciliation-lab-offline.html']){
  const html=fs.readFileSync(new URL('./'+file,import.meta.url),'utf8');
  assert.ok(html.includes('createAAGameVegetationBridge'));
  assert.ok(html.includes('sampleFoliageAppearance'));
  assert.ok(html.includes('const __aaModules=Object.create(null)'));
  assert.doesNotMatch(html,/https?:\/\//,'No external requests needed');
  assert.doesNotMatch(html,/<!--AA_BUNDLE-->/);
 }
});
