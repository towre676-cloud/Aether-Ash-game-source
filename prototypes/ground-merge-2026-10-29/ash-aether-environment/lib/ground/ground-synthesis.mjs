/** Seamless deterministic world-aligned ground material synthesis.
 * Runtime-independent: call from Browser Worker, Node tests, or a Three.js canvas adapter.
 * Textures are physically motivated: albedo, Sobel normals, and micro-roughness.
 */
import {getGroundMaterial} from './ground-materials.mjs';
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function hash(x,y,s=1){let a=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041);a=Math.imul(a^(a>>>13),1274126177);return ((a^(a>>>16))>>>0)/4294967295;}
const mix=(a,b,t)=>a+(b-a)*t;
const fade=t=>t*t*(3-2*t);
export function valueNoise(x,y,seed=1){const ix=Math.floor(x),iy=Math.floor(y),fx=fade(x-ix),fy=fade(y-iy);return mix(mix(hash(ix,iy,seed),hash(ix+1,iy,seed),fx),mix(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),fx),fy);}
export function fractal(x,y,seed=1,oct=4){let total=0,amp=.5,sum=0;for(let i=0;i<oct;i++){total+=valueNoise(x,y,seed+i*111)*amp;sum+=amp;amp*=.5;x*=2.07;y*=2.07;}return total/sum;}
export function paletteColor(material,amount){let rgb=material.colors.map(h=>[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)));let t=clamp(amount)*(rgb.length-1),i=Math.min(rgb.length-2,Math.floor(t));return rgb[i].map((v,c)=>mix(v,rgb[i+1][c],t-i));}
const boxEdge=(v)=>Math.min(v-Math.floor(v),1-(v-Math.floor(v)));
const line=(x,w)=>1-clamp(x/w);
function irregularCell(x,y,scale,seed,jitter=.37){
  // Nine nearby seeds, stable in world space: convex-free, organically eroded stone shapes.
  const u=x/scale,v=y/scale,i=Math.floor(u),j=Math.floor(v);let best=1e9,second=1e9, bestKey=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const a=i+dx,b=j+dy,cx=a+.5+(hash(a,b,seed)-.5)*jitter,
      cy=b+.5+(hash(a,b,seed+41)-.5)*jitter;
    const d=Math.hypot(u-cx,v-cy);
    if(d<best){second=best;best=d;bestKey=(a*1171+b*30011)|0;}else if(d<second) second=d;
  }
  return {edge:second-best,r:hash(bestKey,seed,seed+2),dist:best};
}
const fPart=x=>x-Math.floor(x);
function shapeAt(m,x,z,seed){
 const p=m.pattern,n=fractal(x*.45,z*.45,seed,3),micro=valueNoise(x*14.6,z*15.8,seed+74);
 const macro=fractal(x*.075,z*.077,seed+83,3),powder=valueNoise(x*33.5,z*32.9,seed+137);
 let edge=0,tile=0.5,relief=0,vein=0;
 if(['cobble','flagstone','rock','shards','pebbles'].includes(p)){
    const scale=p==='pebbles'?.13:p==='cobble'?.57:p==='flagstone'?1.38:p==='rock'?1.7:.77;
    const c=irregularCell(x,z,scale,seed,p==='pebbles'?.3:.66);
    const irregularity=.58+.42*fractal(x*2,z*2,seed+16,2);
    edge=line(c.edge*irregularity,p==='pebbles'?.19:p==='rock'?.042:.10);
    tile=c.r;
    relief=(1-edge)*(.22+.24*c.r);
    if(p==='shards')vein=line(Math.abs(Math.sin((x+z*.7)*9+macro*8)),.04)*.34;
 } else if(['brick','tile','herringbone','mosaic'].includes(p)){
   const size=p==='tile'?.87:p==='mosaic'?.38:.57;
   let u=x/size,v=z/size;
   if(p==='herringbone'){const a=(x+z)*.79/size,b=(z-x)*.79/size;u=a;v=b;}
   if(p==='brick'||p==='herringbone')u+=Math.floor(v)*.5;
   edge=Math.max(line(boxEdge(u+fractal(x*.5,z*.5,seed+2,2)*.015),.055),line(boxEdge(v),.055));
   tile=hash(Math.floor(u),Math.floor(v),seed);
   relief=.24*(1-edge);
   if(p==='mosaic')vein=line(Math.abs(Math.sin((x+z)*2.8+macro*5)),.03)*.35;
 } else if(p==='wood'){
   let u=z/.74,v=x/2.4;const row=Math.floor(u);
   edge=Math.max(line(boxEdge(u),.029),line(boxEdge(v+hash(row,1,seed)*.6),.018));
   const grain=Math.sin(x*12+z*.7+fractal(x*.7,z*1.6,seed+10)*7);
   tile=hash(2,row,seed)*.55+.45*(.5+.5*grain);relief=.14*(1-edge);
   vein=(.5+.5*grain)*.25;
 } else if(p==='metal'){
   let u=x/1.5,v=z/1.13;
   edge=Math.max(line(boxEdge(u),.028),line(boxEdge(v),.032));
   const bolt=Math.hypot(fPart(u)-.085,fPart(v)-.09);
   vein=line(Math.abs(bolt-.026),.015)*.30;
   tile=hash(Math.floor(u),Math.floor(v),seed);relief=.24*(1-edge);
 } else if(p==='glass'){
   edge=Math.max(line(boxEdge(x/1.42),.027),line(boxEdge(z/1.42),.027));
   vein=line(Math.abs(Math.sin(x*3.8+z*2.6+macro*4)),.025)*.65;
   tile=fractal(x*.28,z*.29,seed+12);relief=.11*(1-edge);
 } else if(p==='veined'){
   const veinPhase=x*1.9+z*.58+fractal(x*.34,z*.5,seed+62)*8+fractal(x*1.6,z*1.7,seed+52)*1.2;
   vein=line(Math.abs(Math.sin(veinPhase*1.7)),.095);
   tile=fractal(x*.34,z*.36,seed);relief=vein*.12;
 } else if(p==='weave'){
   let warp=Math.sin(x*33),weft=Math.sin(z*33);
   tile=.4+.3*(warp*weft)+.16*macro;
   vein=(warp>0?1:0)*.11;edge=0;relief=.10;
 } else if(p==='crystal'){
   const c=irregularCell(x,z,.28,seed,.4);
   edge=line(c.edge,.09);tile=c.r;vein=1-clamp(c.dist*1.7);relief=.15*(1-edge);
 } else if(['soil','sand','mud','granular','plaster'].includes(p)){
   tile=macro*.55+micro*.25+powder*.2;
   const ripples=p==='sand'?Math.sin(x*5+z*.7+macro*8)*.15:0;
   const cracks=p==='mud'?line(Math.abs(Math.sin(x*1.7+z*.9+macro*9)),.042)*clamp((.6-n)*2):0;
   vein=ripples+cracks;relief=p==='granular'?powder*.3:p==='mud'?cracks*.2:micro*.1;
 } else tile=macro;
 return {edge,tile,vein,relief,micro,macro,powder,n};
}
function samplePixel(m,x,z,seed,weather){
 const s=shapeAt(m,x,z,seed);
 // Three color scales (region geology, tile-level difference, micrograin).
 const meso=(s.tile-.5)*.38+(s.n-.5)*.21+(s.micro-.5)*.14+(s.macro-.5)*.18;
 const v=clamp(.56+meso-s.edge*.30+s.vein*.10);
 let c=paletteColor(m,v),height=clamp(.45+meso*.45+s.relief*.42-s.edge*.35+s.vein*.04);
 const crack=clamp((.44-s.micro)*1.3)*clamp((s.macro-.38)*1.9);
 // Accumulation lies in crevices. No separate grass or decorative box props.
 const damp=clamp((weather.rain??0)*(.22+.75*(1-height))+(weather.waterline??0)*.6);
 const grime=clamp(crack*.3+.30*(1-height)+((weather.age??.25)*.15));
 const moss=clamp((weather.moss??0)*(.28+.55*(1-height))*fractal(x*.8,z*.8,seed+99,2));
 for(let k=0;k<3;k++)c[k]=c[k]*(1-.29*grime-.30*damp-.3*moss)+(k===1?41:k===2?20:10)*moss;
 const mineral=fractal(x*3.2,z*3.2,seed+177,2);
 if(m.pattern==='glass'||m.pattern==='crystal'){
   const light=clamp(s.vein*.55+(mineral-.48)*.32);
   c[0]+=light*15;c[1]+=light*36;c[2]+=light*32;
 }
 if(m.pattern==='metal'){
   const oxidation=clamp(fractal(x*.7,z*.6,seed+135,3)*.9-.23);
   c[0]-=oxidation*14;c[1]+=oxidation*17;c[2]+=oxidation*11;
 }
 if(m.realm==='Ash' && (weather.heat??0)>0){const e=clamp(s.vein*.5+(1-s.micro)*.13)*weather.heat;c[0]+=55*e;c[1]+=23*e;}
 const rough=clamp(m.roughness+(s.micro-.5)*.16+grime*.12-damp*.30);
 return {color:c.map(t=>clamp(Math.round(t),0,255)),height,rough};
}
/** Return physically coherent packed maps. Texture coordinates are world-aligned.
 * materialAt(x,z) may choose each pixel's material, allowing continuous transitions.
 * normalReliefMetres is the physical vertical relief span for a 0..1 height sample.
 * Normal slope is computed per world metre, never per texture pixel: changing
 * quality or screen resolution must not flatten the environment.
 */
export function generateGroundMaps({materialId='clay-fieldstone',materialAt,seed=61029,width=384,height=384,originX=0,originZ=0,metresX=14,metresZ=14,weather={},weatherAt=null,normalReliefMetres=.065}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<4||height<4||width>2048||height>2048)throw new RangeError('Ground maps: image bounds 4..2048');
 if(!Number.isFinite(metresX)||!Number.isFinite(metresZ)||metresX<=0||metresZ<=0)throw new RangeError('Ground maps: world extents must be positive');
 if(!Number.isFinite(normalReliefMetres)||normalReliefMetres<0||normalReliefMetres>1)throw new RangeError('Ground maps: invalid physical relief');
 const n=width*height,albedo=new Uint8ClampedArray(n*4),normal=new Uint8ClampedArray(n*4),roughness=new Uint8ClampedArray(n*4),elevation=new Float32Array(n),materialCodes=new Uint8Array(n);
 const materialIndex=new Map();
 const dust=clamp(weather.dust??0);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const wx=originX+(x/(width-1)-.5)*metresX,wz=originZ+(y/(height-1)-.5)*metresZ;
   const material=getGroundMaterial(materialAt?materialAt(wx,wz):materialId),pixelWeather=weatherAt?{...weather,...weatherAt(wx,wz,weather)}:weather,sample=samplePixel(material,wx,wz,seed,pixelWeather),i=y*width+x,k=i*4;
   let code=materialIndex.get(material.id);if(code===undefined){code=materialIndex.size;materialIndex.set(material.id,code);}materialCodes[i]=code;
   for(let j=0;j<3;j++) albedo[k+j]=clamp(sample.color[j]*(1-dust*.2)+dust*53,0,255);
   albedo[k+3]=255;
   const r=Math.round(sample.rough*255);roughness[k]=roughness[k+1]=roughness[k+2]=r;roughness[k+3]=255;
   elevation[i]=sample.height;
 }
 // A tiled map must use the SAME centered world-space gradient on both sides
 // of a chunk boundary. Sample one texel beyond the boundary, rather than
 // switching to unilateral differences that create visible normal-map seams.
 const heightOutside=(ix,iy)=>{
  const wx=originX+(ix/(width-1)-.5)*metresX,wz=originZ+(iy/(height-1)-.5)*metresZ;
  const mat=getGroundMaterial(materialAt?materialAt(wx,wz):materialId);
  const actualWeather=weatherAt?{...weather,...weatherAt(wx,wz,weather)}:weather;
  return {height:samplePixel(mat,wx,wz,seed,actualWeather).height,id:mat.id};
 };
 const outsideLeft=Array.from({length:height},(_,y)=>heightOutside(-1,y));
 const outsideRight=Array.from({length:height},(_,y)=>heightOutside(width,y));
 const outsideBottom=Array.from({length:width},(_,x)=>heightOutside(x,-1));
 const outsideTop=Array.from({length:width},(_,x)=>heightOutside(x,height));
 const byCode=Array.from(materialIndex.keys());
 const h=(px,py)=>elevation[py*width+px];
 const code=(px,py)=>materialCodes[py*width+px];
 const pitchX=metresX/(width-1),pitchZ=metresZ/(height-1);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=y*width+x,k=i*4,center=elevation[i],id=byCode[materialCodes[i]];
   const l=x?{height:h(x-1,y),id:byCode[code(x-1,y)]}:outsideLeft[y];
   const r=x<width-1?{height:h(x+1,y),id:byCode[code(x+1,y)]}:outsideRight[y];
   const b=y?{height:h(x,y-1),id:byCode[code(x,y-1)]}:outsideBottom[x];
   const t=y<height-1?{height:h(x,y+1),id:byCode[code(x,y+1)]}:outsideTop[x];
   const sx=((r.id===id?r.height:center)-(l.id===id?l.height:center))/(2*pitchX);
   const sz=((t.id===id?t.height:center)-(b.id===id?b.height:center))/(2*pitchZ);
   const nx=-sx*normalReliefMetres,ny=1,nz=-sz*normalReliefMetres,inv=1/Math.hypot(nx,ny,nz);
   normal[k]=(nx*inv*.5+.5)*255;normal[k+1]=(nz*inv*.5+.5)*255;normal[k+2]=(ny*inv*.5+.5)*255;normal[k+3]=255;
 }
 return {width,height,albedo,normal,roughness,elevation,world:{originX,originZ,metresX,metresZ,materialId,seed}};
}
/** Stable authored shapes, not a checkerboard of arbitrary materials.
 * Floor plans consist of polygon masks and landmark discs in world coordinates.
 */
export function createMaterialLocator(regions,base='clay-earth'){
 const entries=regions.map((r,i)=>({...r,i}));
 return (x,z)=>{
  let selected=base,priority=-Infinity;
  for(const a of entries){let hit=false;
   if(a.bounds){const [x0,z0,x1,z1]=a.bounds;hit=x>=Math.min(x0,x1)&&x<=Math.max(x0,x1)&&z>=Math.min(z0,z1)&&z<=Math.max(z0,z1);}
   if(a.disc){const [cx,cz,rx,rz]=a.disc;hit=(((x-cx)/rx)**2+((z-cz)/rz)**2)<=1;}
   if(a.polygon){hit=false;for(let j=0,k=a.polygon.length-1;j<a.polygon.length;k=j++){
    const p=a.polygon[j],q=a.polygon[k];if(((p[1]>z)!==(q[1]>z))&&(x<(q[0]-p[0])*(z-p[1])/(q[1]-p[1])+p[0]))hit=!hit;}
   }
   if(hit&&(a.priority??a.i)>=priority){selected=a.materialId;priority=(a.priority??a.i);}
  }
  return selected;
 };
}
/** Story-world test surface: 4 connected geology zones with path, ruins and rooms. */
export function sampleWorldMaterial(x,z){
 const river=z-7*Math.sin(x*.052+1);
 if(Math.abs(river)<2.7)return Math.abs(river)<1.0?'water-silt':'water-pebbles';
 if(x< -19){if(z>16)return 'clay-loam';if(Math.sin(x*.22+z*.19)> .67)return 'clay-gravel';return 'clay-fieldstone';}
 if(x>18&&z>3){return fractal(x*.07,z*.08,777)> .60?'aether-shale':'aether-cloudstone';}
 if(x>13&&z< -10)return fractal(x*.10,z*.12,777)>.58?'ash-slag':'ash-cinder';
 const route=Math.abs(z+2.4*Math.sin(x*.085))<2.0;
 if(route)return x>4?'clay-terracotta':'clay-road';
 return z>10?'clay-earth':'clay-loam';
}

/** Authorial weathering: erosion follows doors, traffic, drainage, masonry seams.
 * Pass result as weatherAt to generateGroundMaps; world-aligned rather than tiled decals.
 * Paths: [{points:[[x,z],...],width,wear}], sources:[{x,z,radius,wet,moss,heat}].
 */
export function createNarrativeWearField({paths=[],sources=[]}={}){
 const segments=[];
 for(const p of paths){for(let i=1;i<p.points.length;i++)segments.push({a:p.points[i-1],b:p.points[i],width:p.width??1,wear:p.wear??.5});}
 return (x,z,base={})=>{
   let wear=base.age??.25,wet=base.rain??0,moss=base.moss??0,heat=base.heat??0;
   for(const line of segments){const [ax,az]=line.a,[bx,bz]=line.b,dx=bx-ax,dz=bz-az;
    const t=clamp(((x-ax)*dx+(z-az)*dz)/Math.max(.00001,dx*dx+dz*dz));
    const distance=Math.hypot(x-(ax+t*dx),z-(az+t*dz));
    const strength=Math.exp(-2*(distance/Math.max(.05,line.width))**2)*line.wear;
    wear=Math.max(wear,strength);
    // Track wear reduces moss and polished routes hold less moisture.
    moss*=1-.65*strength;wet*=1-.30*strength;
   }
   for(const s of sources){const d=Math.hypot(x-s.x,z-s.z)/Math.max(.01,s.radius);
    const v=Math.exp(-1.7*d*d);
    wet=clamp(wet+(s.wet??0)*v);moss=clamp(moss+(s.moss??0)*v);heat=clamp(heat+(s.heat??0)*v);
   }
   return {age:clamp(wear),rain:clamp(wet),moss:clamp(moss),heat:clamp(heat)};
 };
}
