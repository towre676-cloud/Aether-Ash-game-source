/** One textured terrain mesh, no duplicate coincident planes or opaque overlay layer.
 * Using the exact height mesh guarantees floors and rendered ground stay aligned.
 */
import {generateGroundMaps} from '../lib/ground/ground-synthesis.mjs';
import {createThreeMaterial} from '../lib/ground/ground-runtime.mjs';
import {N,HALF,iAt} from './world.mjs';
export function installTexturedTerrain(THREE,terrain,world,ground,{quality='medium'}={}){
 const geometry=terrain.geometry,positions=geometry.attributes.position,uv=new Float32Array(positions.count*2);
 for(let i=0;i<positions.count;i++) {uv[2*i]=(positions.getX(i)+HALF)/(N-1);uv[2*i+1]=1-(positions.getZ(i)+HALF)/(N-1);}
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
 const originalMaterial=terrain.material;
 const resolution={low:160,mobile:160,medium:256,high:384,ultra:512}[quality]??256;
 let material=null,dirty=true,mode='scenery',qualityName=quality;
 const base=new Array(N*N);
 const locator=(x,z)=>base[iAt(x,z)]||'clay-earth';
 const refreshLookup=()=>{for(let i=0;i<N*N;i++){const x=i%N-HALF,z=Math.floor(i/N)-HALF;base[i]=ground.materialAt(x,z);}dirty=true;};
 function redraw(){
  if(!dirty)return;
  const weather={rain:world.sky==='rain'?.45:0,age:.40,moss:.22};
  const maps=generateGroundMaps({materialId:'clay-earth',materialAt:locator,seed:ground.seed,width:resolution,height:resolution,
    originX:0,originZ:0,metresX:N-1,metresZ:N-1,weather});
  // Persistent physical disturbances visibly scar the same surface they affect in combat.
  // Pixel work happens only on discrete actions / phase transitions, NEVER per render frame.
  const fields=ground.grid.fields,grid=ground.grid;
  for(let py=0;py<resolution;py++)for(let px=0;px<resolution;px++){
   const x=(px/(resolution-1)-.5)*(N-1),z=(py/(resolution-1)-.5)*(N-1),i=grid.index(x,z);
   if(i<0)continue;
   const traffic=fields.traffic[i],fracture=fields.fracture[i],charge=fields.charge[i],heat=fields.heat[i],phase=fields.phase[i],wet=fields.wet[i];
   const p=(py*resolution+px)*4;
   const localX=x-(Math.floor(x)+.5),localZ=z-(Math.floor(z)+.5);
   const footprint=Math.max(0,1-Math.hypot(localX*.75,localZ*1.35)*2.7);
   const crack=(Math.abs(Math.sin(x*18+Math.sin(z*7)*1.4+z*4))<.19?1:0)*fracture;
   const old=traffic*.40*footprint+crack*.45;
   const glow=charge*.22+phase*.26,ember=heat*.19;
   maps.albedo[p]=Math.max(0,Math.min(255,maps.albedo[p]*(1-old-wet*.18)+glow*38+ember*46));
   maps.albedo[p+1]=Math.max(0,Math.min(255,maps.albedo[p+1]*(1-old-wet*.17)+glow*76+ember*19));
   maps.albedo[p+2]=Math.max(0,Math.min(255,maps.albedo[p+2]*(1-old-wet*.11)+glow*101));
   const rough=255*(.10*traffic+.06*fracture-.12*wet);for(const c of [0,1,2])maps.roughness[p+c]=Math.max(0,Math.min(255,maps.roughness[p+c]+rough));
  }
  const next=createThreeMaterial(THREE,maps,{roughness:.94,normalScale:.30});next.side=THREE.DoubleSide;
  const old=material;material=next;
  if(mode==='scenery')terrain.material=material;
  if(old){for(const k of ['map','normalMap','roughnessMap'])old[k]?.dispose();old.dispose();}
  dirty=false;
 }
 function setMode(next){mode=next;terrain.material=(next==='scenery' && material)?material:originalMaterial;}
 refreshLookup();redraw();
 return {refreshLookup,redraw,setMode,get dirty(){return dirty;},get quality(){return qualityName;},dispose(){terrain.material=originalMaterial;if(material){for(const k of ['map','normalMap','roughnessMap'])material[k]?.dispose();material.dispose();}}};
}
