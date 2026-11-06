/** A&A 5.37 ground vegetation: deterministic dense instancing on real world fields.
 * Leaves the host's biomass, collision, sound, season and save state authoritative.
 */
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(a,b,s=31){let n=Math.imul((a|0)^s,2654435761)^Math.imul((b|0),2246822519);n=Math.imul(n^(n>>>16),2246822519);return ((n^(n>>>13))>>>0)/4294967296;}
function noise(x,z,s=1){const i=Math.floor(x),j=Math.floor(z),u=x-i,v=z-j,ss=t=>t*t*(3-2*t),a=ss(u),b=ss(v);return (hash(i,j,s)*(1-a)+hash(i+1,j,s)*a)*(1-b)+(hash(i,j+1,s)*(1-a)+hash(i+1,j+1,s)*a)*b;}
function habitat(x,z,seed){const dx=(noise(x*.066,z*.057,seed+1)-.5)*8,dz=(noise(x*.061,z*.074,seed+2)-.5)*8;
 return .53*noise((x+dx)*.09,(z+dz)*.085,seed+3)+.30*noise((x+dx)*.24,(z+dz)*.24,seed+4)+.17*noise(x*.76,z*.76,seed+5);}
export const PLANT_TYPES=Object.freeze(['meadow','sedge','fern','clover','flower','reed']);
const COLORS=Object.freeze({
 ash:[0x77784d,0x796b53,0x687563,0x77765a,0xa48867,0x70775f],
 water:[0x789779,0x679582,0x5c8872,0x75a78a,0x8fa99f,0x99a57c],
 clay:[0x76a05d,0x7b9951,0x527b4a,0x83a65a,0xe0bc85,0x8c9f67],
 aether:[0x70b6a8,0x88b6a2,0x5d928b,0x99b99d,0xaad9c7,0x80b6b5]
});
// A non-degenerate leaf strip: positions curve in X/Z and narrow at the tip.
export function plantGeometry(T,type){
 const P=[],uv=[],idx=[];
 function addBlade(angle,height,width,bow=0){
  const b=P.length/3,fx=Math.cos(angle),fz=Math.sin(angle),sideX=-fz,sideZ=fx;
  for(const [t,w] of [[0,1],[.34,.9],[.72,.45],[1,.013]]){
   const x=fx*(bow*t*t),z=fz*(bow*t*t);
   for(const sign of [-1,1]){P.push(x+sideX*width*w*sign,height*t,z+sideZ*width*w*sign);uv.push((sign+1)*.5,t);}
  }
  for(let j=0;j<3;j++){let k=b+j*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 function flowerHead(y,r){const segments=5,base=P.length/3;
  P.push(0,y,0);uv.push(.5,.5);
  for(let j=0;j<segments;j++){const a=j*TAU/segments;
   P.push(Math.cos(a)*r,y+.02*Math.sin(j*2),Math.sin(a)*r);uv.push(.5+.5*Math.cos(a),.5+.5*Math.sin(a));}
  for(let j=0;j<segments;j++)idx.push(base,base+1+j,base+1+(j+1)%segments);
 }
 if(type==='meadow')for(let i=0;i<5;i++)addBlade(i*TAU/5,.53+.10*(i%3),.055,.19);
 else if(type==='sedge')for(let i=0;i<6;i++)addBlade(i*TAU/6,.84+.18*(i%3),.032,.23);
 else if(type==='fern'){
  addBlade(0,.55,.05,.1);for(let i=0;i<4;i++){
   addBlade(.4+i*.48,.24+.05*i,.095,.16);addBlade(Math.PI-.4-i*.48,.24+.05*i,.095,.16);
  }
 }else if(type==='clover'){
  for(let i=0;i<4;i++)addBlade(i*TAU/4,.19+.02*i,.072,.07);
  flowerHead(.24,.11);
 }else if(type==='flower'){
  for(let i=0;i<4;i++)addBlade(i*TAU/4,.32,.045,.1);
  addBlade(.15,.58,.019,.035);flowerHead(.55,.095);
 }else if(type==='reed'){
  for(let i=0;i<3;i++)addBlade(i*TAU/3,1.0+.3*(i%2),.036,.085);
  addBlade(.09,1.30,.022,.03);
 }else throw new RangeError(`unsupported plant species ${type}`);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();return geo;
}
const WEIGHTS={ash:[.42,.23,.05,.08,.05,.17],water:[.10,.30,.16,.08,.08,.28],clay:[.29,.15,.16,.19,.17,.04],aether:[.14,.12,.25,.11,.21,.17]};
export function vegetationTier(quality='high') {return quality==='battery'?360:quality==='low'?1050:quality==='medium'?3100:quality==='ultra'?16500:8500;}
export function plantNativeField(T,root,M,plan,{heightAt=()=>0,obstacleAt=()=>false,pathAt=()=>0,biomassAt=null,materialAt=null,quality='high',seed=37}={}){
 if(!T.InstancedMesh||!T.Object3D)return {instances:0,drawCalls:0,bySpecies:{}};
 const b=plan.bounds,width=b.maxX-b.minX,depth=b.maxZ-b.minZ,budget=vegetationTier(quality);
 if(!(width>2&&depth>2))return {instances:0,drawCalls:0,bySpecies:{}};
 const region=plan.region in COLORS?plan.region:'clay',weights=WEIGHTS[region],palette=COLORS[region],meshGroups=[];
 const dummy=new T.Object3D();let seeded=0,count=0;
 // Six independent species geometries, one call per populated species.
 // Maximum capacity is bounded by tier, scene size and source biomass.
 const units=Math.min(budget,Math.max(100,Math.floor(width*depth*(quality==='low'?.45:quality==='ultra'?4.0:2.15))));
 const places=Array.from({length:6},()=>[]);
 for(let i=0;i<units*4&&count<units;i++){
  const x=b.minX+width*hash(i,91,seed),z=b.minZ+depth*hash(i,293,seed);
  if(obstacleAt(x,z)||Number(pathAt(x,z))>.32||plan.isProtectedSurface?.({x,z},.6)||plan.hasClearRoute({x,z},.32))continue;
  const surface=materialAt?.(x,z);
  if(surface&&(surface.vegetationAllowed===false||surface.grassAllowed===false||surface.isInterior===true||surface.built===true||Number(surface.waterDepth)>0.08))continue;
  const life=biomassAt?clamp(Number(biomassAt(x,z))||0,0,1):1;
  const nh=habitat(x,z,seed),suitability=region==='ash'?.53:region==='water'?.83:region==='aether'?.86:.96;
  if(nh*suitability*life<.255||hash(i,744,seed)>.90)continue;
  let pick=hash(i,510,seed),species=0;
  for(let j=0;j<weights.length;j++){pick-=weights[j];if(pick<=0||j===weights.length-1){species=j;break;}}
  // Reeds belong to moist basins; a dry hill carries meadow/flower instead.
  if(species===5&&region!=='water'&&nh<.57)species=region==='ash'?1:0;
  places[species].push({x,z,y:heightAt(x,z)+.022,rotation:hash(i,111,seed)*TAU,
   width:(.55+hash(i,317,seed)*.90),height:(.50+hash(i,441,seed)*.83)*(.35+.65*life),
   tint:hash(i,670,seed)});count++;
 }
 for(let sp=0;sp<PLANT_TYPES.length;sp++){
  const records=places[sp];if(!records.length)continue;
  const geo=plantGeometry(T,PLANT_TYPES[sp]);
  const grass=new T.InstancedMesh(geo,M.grass||M.leaf,records.length);
  grass.name=sp===0?'instanced-native-ground-ecology':`instanced-native-${PLANT_TYPES[sp]}-ecology`;
  grass.userData={visualOnly:true,collidable:false,savedBy:'host-world',biome:region,species:PLANT_TYPES[sp]};
  grass.castShadow=false;grass.receiveShadow=true;grass.frustumCulled=false;
  for(let j=0;j<records.length;j++){
   const r=records[j];dummy.position.set(r.x,r.y,r.z);dummy.rotation.set(0,r.rotation,0);
   dummy.scale.set(r.width,r.height,r.width);dummy.updateMatrix();grass.setMatrixAt(j,dummy.matrix);
   if(T.Color&&grass.setColorAt){const base=palette[sp],c=new T.Color(base);c.multiplyScalar(.77+r.tint*.44);grass.setColorAt(j,c);}
  }
  grass.instanceMatrix.needsUpdate=true;if(grass.instanceColor)grass.instanceColor.needsUpdate=true;
  root.add(grass);meshGroups.push(grass);
 }
 return {instances:count,drawCalls:meshGroups.length,bySpecies:Object.fromEntries(places.map((xs,i)=>[PLANT_TYPES[i],xs.length]))};
}
/** Shader operates only on the grass material. No CPU per-blade update, no
 * mutation of foliage simulation or terrain heights. Safe opt-out on older renderers.
 */
export function attachSubtleWind(material,{strength=.13}={}){
 if(!material)return null;
 const wind={value:0};material.userData??={};material.userData.aaWindUniform=wind;
 material.onBeforeCompile=shader=>{
  shader.uniforms.aaWindTime=wind;
  shader.vertexShader='uniform float aaWindTime;\n'+shader.vertexShader;
  const marker='#include <begin_vertex>';
  shader.vertexShader=shader.vertexShader.replace(marker,marker+`\n#ifdef USE_INSTANCING\nfloat aaPlantPhase = (instanceMatrix[3].x * 1.61 + instanceMatrix[3].z * .89);\ntransformed.x += sin(aaWindTime * 1.8 + aaPlantPhase) * pow(max(position.y,0.0),1.25) * ${strength.toFixed(4)};\ntransformed.z += cos(aaWindTime * 1.4 + aaPlantPhase * .8) * pow(max(position.y,0.0),1.20) * ${(strength*.62).toFixed(4)};\n#endif`);
 };
 material.needsUpdate=true;return wind;
}
