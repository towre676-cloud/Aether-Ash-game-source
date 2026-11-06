import test from 'node:test';import assert from 'node:assert/strict';
import {LivingWorld} from '../src/world.mjs';
import {GroundWorldBridge} from '../src/world-ground-bridge.mjs';
import {installTexturedTerrain} from '../src/render-ground.mjs';
class Attribute{constructor(array,size){this.array=array;this.itemSize=size;}get count(){return this.array.length/this.itemSize;}getX(i){return this.array[i*this.itemSize];}getZ(i){return this.array[i*this.itemSize+2];}}
const THREE={BufferAttribute:Attribute,CanvasTexture:class{constructor(image){this.image=image;this.disposed=false;}dispose(){this.disposed=true;}},Vector2:class{constructor(x,y){this.x=x;this.y=y;}},MeshStandardMaterial:class{constructor(a){Object.assign(this,a);this.disposed=false;}dispose(){this.disposed=true;}},ClampToEdgeWrapping:1,SRGBColorSpace:'sRGB',DoubleSide:2};
const originalDocument=globalThis.document;
const ctx={createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};
test('Textured ground reuses canonical mesh with exact UV, swaps overlay and disposes maps',()=>{
 globalThis.document={createElement(){return {width:0,height:0,getContext(){return ctx;}};}};
 try{
  const original={name:'existing-visualization'},positions=new Attribute([-32,0,-32,32,0,-32,-32,0,32,32,0,32],3),attrs={position:positions};
  const geometry={attributes:attrs,setAttribute(key,v){attrs[key]=v;}};
  const terrain={geometry,material:original},world=new LivingWorld(71),bridge=new GroundWorldBridge(world);
  const system=installTexturedTerrain(THREE,terrain,world,bridge,{quality:'mobile'});
  assert.notEqual(terrain.material,original);assert.equal(system.quality,'mobile');
  assert.deepEqual([...geometry.attributes.uv.array],[0,1,1,1,0,0,1,0]);
  const before=terrain.material;system.setMode('water');assert.equal(terrain.material,original);
  bridge.footstep(0,0,{speed:1});system.refreshLookup();system.redraw();
  assert.equal(system.dirty,false);assert.equal(before.disposed,true);
  system.setMode('scenery');assert.notEqual(terrain.material,original);
  const current=terrain.material;system.dispose();assert.equal(terrain.material,original);assert.equal(current.disposed,true);
 }finally{globalThis.document=originalDocument;}
});
