/** The recovered Atlas v8 numerical engine on canonical A&A map geometry.
 * None of the laboratory river, bridge, orchard, supplies or quests are used.
 * Sparse Float32 checkpoints preserve changed fields exactly, including phase.
 */
import {LivingWorld,N,HALF,positionOf} from './addons/atlas-v8/world.mjs?v=5.21.0';
const FIELDS=['w','m','f','b','ash','fire','a','res','stone','waveRe','waveIm'];
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const toBase64=bytes=>{if(typeof Buffer!=='undefined')return Buffer.from(bytes).toString('base64');let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
const fromBase64=s=>{if(typeof Buffer!=='undefined')return Uint8Array.from(Buffer.from(s,'base64'));return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};
const referenceDay=day=>Math.min(90,day);
function decodeField(s,version){
 const dense=version===2&&typeof s==='string'&&s.startsWith('f32:'),body=dense?s.slice(4):s;
 if(typeof body!=='string'||body.length>N*N*8||!/^[A-Za-z0-9+/]*={0,2}$/.test(body))throw Error('The saved Atlas field encoding is invalid.');
 const bytes=fromBase64(body);if(dense?bytes.length!==N*N*4:bytes.length%6)throw Error('The saved Atlas field records are invalid.');
 return {dense,bytes,view:new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)};
}
export function validateAtlasKernel(saved){
 if(saved===undefined)return true;
 if(!saved||![1,2].includes(saved.version)||!Number.isSafeInteger(saved.day)||saved.day<0||saved.day>1e6||saved.version===2&&saved.baselineDay!==referenceDay(saved.day)||!Number.isInteger(saved.seed)||!Array.isArray(saved.size)||saved.size.length!==2||saved.size.some(v=>!Number.isInteger(v)||v<2||v>2000)||!saved.fields||typeof saved.fields!=='object'||Array.isArray(saved.fields)||Object.keys(saved.fields).some(k=>!FIELDS.includes(k)))throw Error('The saved Atlas numerical field is invalid.');
 for(const [key,s]of Object.entries(saved.fields)){
  const {dense,bytes,view:v}=decodeField(s,saved.version),seen=new Set(),stride=dense?4:6;
  for(let j=0;j<bytes.length;j+=stride){const i=dense?j/4:v.getUint16(j,true),value=v.getFloat32(j+(dense?0:2),true);if(i>=N*N||seen.has(i)||!Number.isFinite(value)||value<(key.startsWith('wave')?-3:0)||value>(key.startsWith('wave')?3:key==='w'?20:1))throw Error('The saved Atlas field value is invalid.');seen.add(i);}
 }
 return true;
}
export function createCampaignAtlasKernel(world,layout,seed,saved){
 validateAtlasKernel(saved);
 const width=world.scene.width,height=world.scene.height,kernel=new LivingWorld(seed),baseline={},ground=[];
 const toHost=(x,z)=>({x:(x+HALF)/(N-1)*(width-1),y:(z+HALF)/(N-1)*(height-1)});
 const toField=(x,y)=>({x:clamp(x/Math.max(1,width-1)*(N-1)-HALF,-HALF,HALF),z:clamp(y/Math.max(1,height-1)*(N-1)-HALF,-HALF,HALF)});
 for(let i=0;i<N*N;i++){
  const p=positionOf(i),h=toHost(p.x,p.z),m=layout.baselineMaterialAt(h.x,h.y),walk=world.walkable(h.x,h.y),green=!!m.vegetationAllowed;
  ground.push({wet:m.moisture||0,water:0,walk});kernel.h[i]=0;kernel.w[i]=0;kernel.m[i]=clamp(m.moisture||0);kernel.f[i]=green?clamp(.35+(m.organic||0)*.5):.08;kernel.b[i]=green?clamp(.18+(m.vegetationSuitability||0)*.55):0;kernel.stone[i]=clamp(m.hardness??.5);kernel.a[i]=clamp(m.resonance??.1)*.38;kernel.res[i]=0;kernel.ash[i]=0;kernel.fire[i]=0;kernel.waveRe[i]=0;kernel.waveIm[i]=0;
 }
 kernel.supplies={timber:0,stone:0,ore:0};kernel.events=[];kernel.sluiceOpen=false;kernel.bridgeRepaired=false;kernel.climate={rain:.4,heat:.45};
 const cell=(x,z)=>Math.max(0,Math.min(N-1,Math.round(z+HALF)))*N+Math.max(0,Math.min(N-1,Math.round(x+HALF)));
 kernel.host={roadAt:(x,z)=>{const h=toHost(x,z);return layout.path(h.x,h.y)>.5?.5:3;},passableAt:(x,z)=>{const h=toHost(x,z);return world.walkable(h.x,h.y);},waterInputAt:(x,z)=>ground[cell(x,z)].wet*.35,standingWaterAt:(x,z)=>ground[cell(x,z)].water,irrigationAt:()=>0};
 for(const key of FIELDS)baseline[key]=kernel[key].slice();
 // A second deterministic field represents ordinary aging without player
 // actions. It is reconstructible, so hundreds of untouched maps save in a
 // few kilobytes. Reference replay is capped at 90 steps; later deviations
 // remain exact records rather than making untrusted save loading unbounded.
 const reference=new LivingWorld(seed);for(const key of ['h',...FIELDS])reference[key]=kernel[key].slice();reference.host=kernel.host;reference.climate={...kernel.climate};reference.supplies={timber:0,stone:0,ore:0};reference.events=[];
 const ageReference=day=>{const goal=referenceDay(day);while(reference.day<goal)reference.step();};
 if(saved){
  if(saved.seed!==(seed|0)||saved.size[0]!==width||saved.size[1]!==height)throw Error('The Atlas field belongs to a different map.');
  if(saved.version===2){ageReference(saved.baselineDay);for(const key of FIELDS)kernel[key]=reference[key].slice();}
  for(const [key,s]of Object.entries(saved.fields)){const {dense,bytes,view:v}=decodeField(s,saved.version);for(let j=0;j<bytes.length;j+=dense?4:6)kernel[key][dense?j/4:v.getUint16(j,true)]=v.getFloat32(j+(dense?0:2),true);}
  kernel.day=saved.day;
 }
 let dirty=!!saved;const samples=new Map();
 return {
  sample(x,y){const p=toField(x,y),at=cell(p.x,p.z);let sample=samples.get(at);if(!sample){const fields=kernel.sample(p.x,p.z),effect=kernel.evaluate(p.x,p.z),baseChance=Math.max(.005,.015+.09*baseline.b[at]+.07*baseline.a[at]);sample={...fields,...effect,baselineBiomass:baseline.b[at],activity:clamp(effect.encounterChance/baseChance,.75,1.25)};samples.set(at,sample);}return {...sample,x,y,passable:world.walkable(x,y)};},
  cast(x,y,element,power=.7){if(!world.walkable(x,y))return {ok:false};const result=kernel.dispatch({type:'cast',...toField(x,y),element,power:clamp(power,0,2)});kernel.events.length=0;dirty=true;samples.clear();return result;},
  listen(x,y,{phase=0,intensity=.35}={}){if(!world.walkable(x,y))return {ok:false};const result=kernel.dispatch({type:'hydrophone',...toField(x,y),phase:clamp(phase),intensity:clamp(intensity,0,.6)});kernel.events.length=0;dirty=true;samples.clear();return result;},
  advance(day){const goal=Math.floor(day),steps=Math.min(90,goal-kernel.day);if(steps>0){for(let i=0;i<steps;i++)kernel.step();dirty=true;samples.clear();}return kernel.day;},
  snapshot(){if(!dirty)return undefined;ageReference(kernel.day);const fields={};for(const key of FIELDS){const indices=[];for(let i=0;i<N*N;i++)if(kernel[key][i]!==reference[key][i])indices.push(i);if(!indices.length)continue;const dense=indices.length*6>N*N*4,bytes=new Uint8Array(dense?N*N*4:indices.length*6),v=new DataView(bytes.buffer);if(dense)for(let i=0;i<N*N;i++)v.setFloat32(i*4,kernel[key][i],true);else indices.forEach((i,j)=>{v.setUint16(j*6,i,true);v.setFloat32(j*6+2,kernel[key][i],true);});fields[key]=(dense?'f32:':'')+toBase64(bytes);}return {version:2,seed:seed|0,size:[width,height],day:kernel.day,baselineDay:reference.day,fields};},
  get day(){return kernel.day;},get field(){return kernel;}
 };
}
