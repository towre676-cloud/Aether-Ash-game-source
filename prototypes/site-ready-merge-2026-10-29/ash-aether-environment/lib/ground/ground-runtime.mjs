/** Layer between shared ground semantics and Three.js. No static Three import;
 * existing game can pass the Three namespace it already ships.
 */
import {getGroundMaterial,analyzeGround} from './ground-materials.mjs';
import {generateGroundMaps} from './ground-synthesis.mjs';
export function makeCanvasImage(maps,key){
 if(typeof document==='undefined')throw new Error('Canvas is required to create browser textures');
 const c=document.createElement('canvas');c.width=maps.width;c.height=maps.height;
 const ctx=c.getContext('2d',{willReadFrequently:false});const d=ctx.createImageData(c.width,c.height);d.data.set(maps[key]);ctx.putImageData(d,0,0);return c;
}
export function createThreeMaterial(THREE,maps,{roughness=.86,metalness=.02,normalScale=.52}={}){
 const from=key=>{const tex=new THREE.CanvasTexture(makeCanvasImage(maps,key));tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;tex.needsUpdate=true;return tex;};
 const a=from('albedo'),n=from('normal'),r=from('roughness');a.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshStandardMaterial({map:a,normalMap:n,normalScale:new THREE.Vector2(normalScale,normalScale),roughnessMap:r,roughness,metalness});
}
export function createGroundSystem(THREE,scene,{
  materialId='clay-fieldstone',materialAt=null,seed=61029,metresX=40,metresZ=40,
  originX=0,originZ=0,resolution=512,terrainHeight=()=>0,weather={},weatherAt=null,stepRadius=.14,
  onGameplayEvent=null,enableTracks=true,segments=100
}={}){
 let currentWeather={...weather};let maps=generateGroundMaps({materialId,materialAt,seed,width:resolution,height:resolution,metresX,metresZ,originX,originZ,weather:currentWeather,weatherAt});
 let material=createThreeMaterial(THREE,maps);const geo=new THREE.PlaneGeometry(metresX,metresZ,segments,segments);geo.rotateX(-Math.PI/2);
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i)+originX,z=p.getZ(i)+originZ;p.setY(i,terrainHeight(x,z)-.028);}
 geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);mesh.position.set(originX,0,originZ);mesh.receiveShadow=true;mesh.name='A&A / material-semantic continuous ground';scene.add(mesh);
 const steps=[],markGeo=new THREE.CircleGeometry(stepRadius,10);markGeo.rotateX(-Math.PI/2);
 const markMat=new THREE.MeshBasicMaterial({color:0x171913,transparent:true,opacity:.16,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 const marks=[];let tick=0;
 const sample=(x,z)=>{
  const id=materialAt?materialAt(x,z):materialId;return analyzeGround(id,{...currentWeather});
 };
 const onStep=(x,z,actor='player',velocity=1)=>{
  const surface=sample(x,z),event={type:'ground-step',actor,x,z,timestamp:tick,material:surface.id,
    noise:surface.noise*velocity,friction:surface.traction,cost:surface.movementCost,
    tracePersistence:surface.tracePersistence,clue:surface.reward};
  steps.push(event);if(steps.length>140)steps.shift();
  if(enableTracks && surface.tracePersistence>.28){
   const mark=new THREE.Mesh(markGeo,markMat.clone());mark.position.set(x,terrainHeight(x,z)+.012,z);mark.scale.set(.78+velocity*.18,1,.65+velocity*.12);
   mark.rotation.y=Math.PI*.25*Math.sin(steps.length*17);scene.add(mark);marks.push({mesh:mark,born:tick});
   if(marks.length>112){const first=marks.shift();scene.remove(first.mesh);first.mesh.material.dispose();}
  }
  onGameplayEvent?.(event);return event;
 };
 const impact=(x,z,{element='kinetic',force=.5}={})=>{
  const ground=sample(x,z),power=Math.max(0,Math.min(1,force)),effects=[];
  if(element==='lightning'&&ground.conduction>.55)effects.push('conductive-chain');
  if(element==='fire'&&ground.heat>.53)effects.push('stored-heat');
  if(element==='water'&&ground.traction<.6)effects.push('slick-surface');
  if(element==='aether'&&ground.resonance>.7)effects.push('phase-amplification');
  if(element==='kinetic'&&ground.groundShield>.4&&power>.6)effects.push('fracture-cover');
  const event={type:'ground-impact',x,z,material:ground.id,element,force:power,effects,
   absorbed:ground.groundShield*power,amplification:ground.resonance*power};
  onGameplayEvent?.(event);return event;
 };
 const setWeather=(next)=>{
  currentWeather={...currentWeather,...next};
  // Fast film response on frame; full maps can be explicitly rebuilt at transitions.
  material.roughness=Math.max(.2,Math.min(1,.86-.36*(currentWeather.wetness??currentWeather.rain??0)));
  material.needsUpdate=true;
 };
 const rebuild=(newWeather={})=>{
  setWeather(newWeather);const next=generateGroundMaps({materialId,materialAt,seed,width:resolution,height:resolution,metresX,metresZ,originX,originZ,weather:currentWeather,weatherAt});
  const newer=createThreeMaterial(THREE,next,{roughness:material.roughness});mesh.material=newer;material.dispose();for(const k of ['map','normalMap','roughnessMap'])material[k]?.dispose();material=newer;maps=next;return maps;
 };
 const update=(seconds)=>{tick+=seconds;for(let i=marks.length-1;i>=0;i--){const item=marks[i],age=tick-item.born,duration=10+25*sample(item.mesh.position.x,item.mesh.position.z).tracePersistence;
   const fade=Math.max(0,1-age/duration);item.mesh.visible=fade>.05;item.mesh.material.opacity=.16*fade;if(fade<=0){scene.remove(item.mesh);item.mesh.material.dispose();marks.splice(i,1);}}
 };
 const dispose=()=>{scene.remove(mesh);geo.dispose();material.dispose();for(const k of ['map','normalMap','roughnessMap'])material[k]?.dispose();for(const {mesh:m} of marks){scene.remove(m);m.material.dispose();}markGeo.dispose();markMat.dispose();};
 return {mesh,sample,onStep,impact,steps,update,setWeather,rebuild,dispose,get weather(){return {...currentWeather};},get mapInfo(){return maps.world;}};
}
export function materialOfRoom(room){
 // Explicit authoring avoids random decorative swaps; stable fallbacks.
 const tags=Array.isArray(room.tags)?room.tags:[];
 const lookup={chapel:'aether-celestial',reactor:'ash-grate',kiln:'ash-kiln',cistern:'water-seep',
   dock:'water-dock',inn:'clay-floorboards',home:'clay-earth',forge:'ash-slag',temple:'water-deep',
   orchard:'clay-loam',archive:'aether-marble',road:'clay-road',plaza:'clay-fieldstone',
   cavern:'aether-shale',furnace:'ash-fire-mosaic',ruin:'clay-fieldstone',workshop:'clay-herringbone'};
 for(const tag of tags){const id=lookup[String(tag).toLowerCase()];if(id)return id;}
 return getGroundMaterial(room.materialId??'clay-earth').id;
}
