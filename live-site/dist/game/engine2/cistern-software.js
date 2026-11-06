/** Perspective software pipeline for the same authored meshes as WebGL.
 * Repeating albedo is mapped from world coordinates onto clipped/subdivided
 * triangles; camera-facing atlas characters share the scene's depth ordering.
 */
import {createActorTintCache} from './actor-grounding.js?v=5.41';
import {leadCutawayWindow} from './lead-cutaway-541.js?v=5.41';
const TORCHES=[[-3.15, 1.9, 6], [3.15, 1.9, 10], [-3.15, 1.9, 14], [-11.25, 2.0, 1.5], [11.25, 2.0, 1.5], [-11.25, 2.0, -11.5], [11.25, 2.0, -11.5], [-8.25, 2.2, -19], [8.25, 2.2, -19], [-8.25, 2.2, -27.5], [8.25, 2.2, -27.5]];
const STRIDE=24,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,f=0)=>Number.isFinite(v)?v:f;
const length2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
const midpoint=(a,b)=>[(a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5];
const norm=v=>{const d=Math.hypot(...v)||1;return v.map(n=>n/d);};
const DUNGEON_SKY=['#03090c','#071014','#03080a'];
const FRUSTUM_PLANES=[v=>v[3]-.0001,v=>v[2]+v[3],v=>v[3]-v[2],v=>v[0]+v[3],v=>v[3]-v[0],v=>v[1]+v[3],v=>v[3]-v[1]];
const rgbColor=(value,fallback,max=4)=>Array.isArray(value)&&value.length>=3?value.slice(0,3).map((v,i)=>clamp(finite(v,fallback[i]),0,max)):[...fallback];
const cssColor=color=>`rgb(${color.map(v=>Math.round(clamp(v,0,1)*255)).join(',')})`;
const quantized=(values,step=.02)=>values.map(v=>Math.round(v/step)).join(',');
function lightingConfiguration(value){
 if(!value||typeof value!=='object')return null;
 const ambient=rgbColor(value.ambient,[.22,.26,.29]),key=rgbColor(value.key,[.18,.19,.18]),fog=rgbColor(value.fog,[10/255,25/255,28/255],1);
 const direction=norm([-.438,.827,.341].map((v,i)=>Array.isArray(value.keyDirection)?finite(value.keyDirection[i],v):v));
 const fogDensity=clamp(finite(value.fogDensity,.00065),0,.01);
 let sky;
 if(Array.isArray(value.sky)&&value.sky.length){
  const entries=typeof value.sky[0]==='number'?[value.sky]:value.sky;
  sky=entries.slice(0,3).map(entry=>typeof entry==='string'?entry:cssColor(rgbColor(entry,fog,1)));
  if(sky.length===1)sky=[sky[0],sky[0],sky[0]];
 }else sky=[cssColor(fog.map(v=>v*.56)),cssColor(fog.map(v=>v*.88)),cssColor(fog)];
 return {ambient,key,direction,fog,fogColor:cssColor(fog),fogDensity,sky,
  // Slow day/night motion only rebuilds cached static layers when its visible
  // illumination changes. Surface and background colors retain exact inputs.
  cacheKey:[quantized(ambient),quantized(key),quantized(direction),quantized(fog),Math.round(fogDensity/.000025),...(Array.isArray(value.sky)?typeof value.sky[0]==='number'?[quantized(value.sky)]:value.sky.map(v=>Array.isArray(v)?quantized(v):v):[])].join(';')};
}
function triangleData(mesh,staticMesh){
 const data=mesh?.data;if(!data)return new Float32Array(0);const count=Math.min(Math.floor(finite(mesh.count,data.length/12)),Math.floor(data.length/12)),out=[];
 function push(a,b,c,n,color,mat,em,alpha,depth=0){
  // Paving floats a few millimetres over its buried mortar slab. Its broad
  // underside is hidden by the depth buffer, and omitted by this painter.
  if(staticMesh&&mat<.01&&n[1]>.65&&(a[1]+b[1]+c[1])/3<0)return;
  const ab=length2(a,b),bc=length2(b,c),ca=length2(c,a),textured=mat<2.5||mat>6.1&&mat<7.5;
  const foundationBelow=staticMesh&&mat>6.5&&mat<7.5&&Math.max(a[1],b[1],c[1])<0;
  const limit=foundationBelow?45:mat>2.5&&mat<3.5?3.1:textured?9:12;
  if(staticMesh&&depth<7&&Math.max(ab,bc,ca)>limit){
   if(ab>=bc&&ab>=ca){const p=midpoint(a,b);push(a,p,c,n,color,mat,em,alpha,depth+1);push(p,b,c,n,color,mat,em,alpha,depth+1);}
   else if(bc>=ca){const p=midpoint(b,c);push(a,b,p,n,color,mat,em,alpha,depth+1);push(a,p,c,n,color,mat,em,alpha,depth+1);}
   else{const p=midpoint(c,a);push(a,b,p,n,color,mat,em,alpha,depth+1);push(p,b,c,n,color,mat,em,alpha,depth+1);}return;
  }
  const x=(a[0]+b[0]+c[0])/3,y=(a[1]+b[1]+c[1])/3,z=(a[2]+b[2]+c[2])/3,radius=Math.sqrt(Math.max(length2(a,[x,y,z]),length2(b,[x,y,z]),length2(c,[x,y,z])));
  const foundation=staticMesh&&mat>6.5&&mat<7.5&&Math.max(a[1],b[1],c[1])<0;
  out.push(...a,...b,...c,...n,...color,mat,em,alpha,x,y,z,radius,foundation?-2:0,0);
 }
 for(let v=0;v+2<count;v+=3){const i=v*12,j=i+12,k=i+24,a=[data[i],data[i+1],data[i+2]],b=[data[j],data[j+1],data[j+2]],c=[data[k],data[k+1],data[k+2]];
  if(![...a,...b,...c].every(Number.isFinite))continue;const n=norm([(data[i+3]+data[j+3]+data[k+3])/3,(data[i+4]+data[j+4]+data[k+4])/3,(data[i+5]+data[j+5]+data[k+5])/3]);
  push(a,b,c,n,[(data[i+6]+data[j+6]+data[k+6])/3,(data[i+7]+data[j+7]+data[k+7])/3,(data[i+8]+data[j+8]+data[k+8])/3],data[i+9],data[i+10],data[i+11]);
 }return new Float32Array(out);
}
/** Clip in homogeneous coordinates before the perspective divide. Large
 * landscape faces routinely straddle the camera and screen edges. Clipping
 * only their near edge allowed enormous offscreen wedges into the painter.
 * The optional world-height attribute also hides buried adventure foundations
 * and the lower halves of landscape masses behind their surrounding ground.
 */
export function clipSoftwarePolygon(vertices,{groundY=null}={}){
 const planes=Number.isFinite(groundY)?[v=>v[6]-groundY,...FRUSTUM_PLANES]:FRUSTUM_PLANES;
 let input=vertices;for(const plane of planes){if(input.every(v=>plane(v)>=0))continue;const output=[];let a=input.at(-1);if(!a)return output;let da=plane(a);
  for(const b of input){const db=plane(b);if((da>=0)!==(db>=0)){const t=da/(da-db);output.push(a.map((v,i)=>v+(b[i]-v)*t));}if(db>=0)output.push(b);a=b;da=db;}input=output;
 }return input;
}
function cutawayHeight(vertices,above){
 const distance=v=>above?v[6]-.35:.35-v[6];if(vertices.every(v=>distance(v)>=0))return vertices;
 const out=[];let a=vertices.at(-1),da=distance(a);for(const b of vertices){const db=distance(b);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((v,i)=>v+(b[i]-v)*t));}if(db>=0)out.push(b);a=b;da=db;}return out;
}
function overlapsCutaway(row,cut){return cut&&row.cutaway&&row.depth<cut.depthW&&row.maxX>cut.cx-cut.rx&&row.minX<cut.cx+cut.rx&&row.maxY>cut.cy-cut.ry&&row.minY<cut.cy+cut.ry;}
function paintCutaway(ctx,cut,width,height,paint){
 const ellipse=scale=>ctx.ellipse(cut.cx,cut.cy,cut.rx*scale,cut.ry*scale,0,0,Math.PI*2);
 ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ellipse(1);ctx.clip('evenodd');paint(1);ctx.restore();
 ctx.save();ctx.beginPath();ellipse(1);ellipse(.94);ctx.clip('evenodd');paint(.28);ctx.restore();
 ctx.save();ctx.beginPath();ellipse(.94);ctx.clip();paint(.04);ctx.restore();
}
/** The software backend samples the same authored surface families as WebGL.
 * Matte trim keeps its authored color unless explicitly marked as masonry. */
export function softwareMaterialIndex(material,normalY,{surface=false,water=false,wood=false}={}){
 if(material>2.5&&material<3.5)return water?4:-1;
 if(material>1.5&&material<2.5)return wood?5:-1;
 if(!surface)return -1;
 return material<.5?Math.abs(normalY)>.65?0:1:material>.5&&material<1.5?2:material>6.1&&material<7.5?3:-1;
}
function worldUV(x,y,z,nx,ny,nz,material){
 const scale=material>2.5&&material<3.5?5:material>6.5?4:material>.5&&material<1.5?1.7:3.2;
 return Math.abs(ny)>.65?[x/scale,z/scale]:Math.abs(nx)>.65?[z/scale,-y/scale]:[x/scale,-y/scale];
}
function path(ctx,r){ctx.beginPath();ctx.moveTo(r.ax,r.ay);ctx.lineTo(r.bx,r.by);ctx.lineTo(r.cx,r.cy);ctx.closePath();}

export class CisternSoftwarePainter{
 constructor(canvas){this.canvas=canvas;this.context=canvas.getContext('2d',{alpha:false,desynchronized:true});if(!this.context)throw Error('The dungeon drawing surface could not start.');this.cache=new WeakMap();this.pool=[];this.visible=[];this.tiles=[];this.patterns=[];this.tileSizes=[];this.litPatterns=new Map();this.textureSource=null;this.waterSource=null;this.woodSource=null;this.destroyed=false;this.actorTintCache=createActorTintCache();this.staticFrame=null;this.bandSurfaces=[];this.frameLighting=null;this.stats={drawCalls:0,triangles:0,backend:'software-3d'};}
 _geometry(mesh,staticMesh){if(!mesh?.data)return new Float32Array(0);const revision=mesh.revision??mesh.version??0,old=this.cache.get(mesh.data);if(old&&old.count===mesh.count&&old.revision===revision&&old.staticMesh===staticMesh)return old.data;const data=triangleData(mesh,staticMesh);this.cache.set(mesh.data,{count:mesh.count,revision,staticMesh,data});return data;}
 _materials(image){
  if(!image||!(image.naturalWidth||image.width)||image.complete===false)return;
  if(this.textureSource===image)return;const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height,size=Math.floor(Math.min(width,height)/2);
  if(size<1)return;this.tiles=[];this.patterns=[];this.tileSizes=[];this.litPatterns.clear();this.waterSource=null;this.woodSource=null;
  const averages=image.observatoryMaterialAverages;
  this.materialAverages=Array.isArray(averages)&&averages.length===4&&averages.every(c=>Array.isArray(c)&&c.length===3&&c.every(v=>Number.isFinite(v)&&v>=0&&v<=1))?averages.map(c=>c.slice()):null;
  for(let i=0;i<4;i++){let tile;if(typeof OffscreenCanvas==='function')tile=new OffscreenCanvas(size,size);else if(typeof document!=='undefined'){tile=document.createElement('canvas');tile.width=tile.height=size;}else return;
   const c=tile.getContext('2d');c.drawImage(image,(i%2)*size,Math.floor(i/2)*size,size,size,0,0,size,size);this.tiles.push(tile);this.patterns.push(this.context.createPattern(tile,'repeat'));this.tileSizes.push(size);
  }this.textureSource=image;this.tileSize=size;
 }
 _waterMaterial(image){
  if(!image||!(image.naturalWidth||image.width)||image.complete===false||this.waterSource===image)return;
  const sw=(image.naturalWidth||image.width)/2,sh=(image.naturalHeight||image.height)/2,size=512;let tile;
  if(typeof OffscreenCanvas==='function')tile=new OffscreenCanvas(size*2,size*2);else if(typeof document!=='undefined'){tile=document.createElement('canvas');tile.width=tile.height=size*2;}else return;
  const c=tile.getContext('2d');for(let y=0;y<2;y++)for(let x=0;x<2;x++){c.save();c.translate(x*size+(x?size:0),y*size+(y?size:0));c.scale(x?-1:1,y?-1:1);c.drawImage(image,sw,sh,sw,sh,0,0,size,size);c.restore();}
  this.tiles[4]=tile;this.tileSizes[4]=size*2;this.patterns[4]=this.context.createPattern(tile,'repeat');this.litPatterns.clear();this.waterSource=image;
 }
 _woodMaterial(image){
  if(!image||!(image.naturalWidth||image.width)||image.complete===false||this.woodSource===image)return;
  const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height,size=512;let tile;
  if(typeof OffscreenCanvas==='function')tile=new OffscreenCanvas(size,size);else if(typeof document!=='undefined'){tile=document.createElement('canvas');tile.width=tile.height=size;}else return;
  const c=tile.getContext('2d');if(!c)return;
  // The third architectural swatch is the game's original painted timber.
  const pad=Math.min(8,width/3*.04,height/2*.04);c.drawImage(image,width*2/3+pad,pad,width/3-pad*2,height/2-pad*2,0,0,size,size);
  this.tiles[5]=tile;this.tileSizes[5]=size;this.patterns[5]=this.context.createPattern(tile,'repeat');this.litPatterns.clear();this.woodSource=image;
 }
 _lighting(x,y,z,nx,ny,nz,eye,lights){
  const frame=this.frameLighting,direction=frame?.direction||[-.438,.827,.341],ambient=frame?.ambient||[.22,.26,.29],key=frame?.key||[.18,.19,.18];
  const directional=Math.max(0,nx*direction[0]+ny*direction[1]+nz*direction[2]);let r=ambient[0]+key[0]*directional,g=ambient[1]+key[1]*directional,b=ambient[2]+key[2]*directional;
  for(const l of lights){const dx=l.p[0]-x,dy=l.p[1]-y,dz=l.p[2]-z,d2=dx*dx+dy*dy+dz*dz;if(d2>120)continue;const length=Math.sqrt(d2)||1,lambert=Math.max(0,(nx*dx+ny*dy+nz*dz)/length),fall=1/(1+d2*.2),amount=(.20+lambert*.80)*fall*.90;
   r+=l.c[0]*amount;g+=l.c[1]*amount;b+=l.c[2]*amount;
  }return [clamp(r,frame?0:.18,1.15),clamp(g,frame?0:.20,1.08),clamp(b,frame?0:.22,1.02)];
 }
 _surface(t,i,eye,time,lights,kind){
  const mat=t[i+15],em=t[i+16],x=t[i+18],y=t[i+19],z=t[i+20],distance=Math.hypot(eye[0]-x,eye[1]-y,eye[2]-z),light=this._lighting(x,y,z,t[i+9],t[i+10],t[i+11],eye,lights);
  let r=t[i+12],g=t[i+13],b=t[i+14];
  if(mat>7.5||kind==='shadows')return {color:`rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`,light,fog:0};
  if(mat>2.5&&mat<3.5){r=.025;g=.105;b=.12;}
  const col=[r,g,b].map((v,j)=>Math.round(255*Math.pow(1-Math.exp(-Math.max(0,v*(light[j]+em*2.3))*1.12),.4545)));
  const frame=this.frameLighting,fog=frame?clamp(1-Math.exp(-distance*distance*frame.fogDensity),0,.8):clamp((distance-12)*.006,0,.24);
  // Textured faces apply fog after sampling; flat faces need the same optional
  // scene atmosphere here. The historical dungeon path remains unchanged.
  if(frame)for(let j=0;j<3;j++)col[j]=Math.round(col[j]*(1-fog)+frame.fog[j]*255*fog);
  return {color:`rgb(${col[0]},${col[1]},${col[2]})`,light,fog,fogColor:frame?.fogColor||'#0a191c',fogRgb:frame?.fog};
 }
 _litPattern(row){
  // Apply albedo lighting and fog before the antialiased triangle mask. Doing
  // all three operations inside one clip applied its edge coverage repeatedly
  // and turned every shared mesh edge into a bright line.
  const precise=row.alpha<.999||row.texture===4,levels=precise?255:15,fogLevels=precise?255:31,quantize=(v,n)=>Math.round(Math.round(clamp(v,0,1)*n)/n*255),light=row.light.map(v=>quantize(v,levels)),fog=row.fog>.005?quantize(row.fog,fogLevels):0,key=[row.texture,...light,fog,row.fogColor||'#0a191c'].join(':');
  let entry=this.litPatterns.get(key);if(entry){this.litPatterns.delete(key);this.litPatterns.set(key,entry);return entry;}
  const fallback={pattern:this.patterns[row.texture],size:this.tileSizes[row.texture]||this.tileSize},source=this.tiles[row.texture];if(!source)return fallback;
  const size=Math.min(128,source.width);let tile;
  // Repaint an evicted tile instead of allocating a canvas on every moving
  // camera/light miss. Sixty-four 128px RGBA entries use at most four MiB.
  if(this.litPatterns.size>=64){const first=this.litPatterns.keys().next().value,old=this.litPatterns.get(first);this.litPatterns.delete(first);if(old.tile.width===size&&old.tile.height===size)tile=old.tile;}
  if(!tile){if(typeof OffscreenCanvas==='function')tile=new OffscreenCanvas(size,size);else if(typeof document!=='undefined'){tile=document.createElement('canvas');tile.width=tile.height=size;}else return fallback;}
  const c=tile.getContext('2d');if(!c)return fallback;c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='copy';c.drawImage(source,0,0,size,size);c.globalCompositeOperation='multiply';c.fillStyle=`rgb(${light.join(',')})`;c.fillRect(0,0,tile.width,tile.height);
  if(fog){c.globalCompositeOperation='source-over';c.globalAlpha=fog/255;c.fillStyle=row.fogColor||'#0a191c';c.fillRect(0,0,tile.width,tile.height);}
  const pattern=this.context.createPattern(tile,'repeat');entry={tile,pattern,size};this.litPatterns.set(key,entry);while(this.litPatterns.size>64)this.litPatterns.delete(this.litPatterns.keys().next().value);return entry;
 }
 _flatTextureColor(row){
  const avg=this.materialAverages?.[row.texture]||(row.texture===4?[.035,.13,.14]:row.texture===0?[.30,.29,.25]:row.texture===1?[.20,.22,.21]:row.texture===2?[.30,.24,.14]:row.texture===5?[.34,.24,.14]:[.14,.17,.15]),col=avg.map((v,j)=>v*row.light[j]);if(row.fogRgb)for(let j=0;j<3;j++)col[j]=col[j]*(1-row.fog)+row.fogRgb[j]*row.fog;return `rgb(${col.map(v=>Math.round(v*255)).join(',')})`;
 }
 _textured(ctx,row){
  const sample=this._litPattern(row),size=sample.size,ua=row.au*size,va=row.av*size,ub=row.bu*size,vb=row.bv*size,uc=row.cu*size,vc=row.cv*size,du1=ub-ua,dv1=vb-va,du2=uc-ua,dv2=vc-va,det=du1*dv2-du2*dv1;
  if(Math.abs(det)<1e-8)return false;
  const a=((row.bx-row.ax)*dv2-(row.cx-row.ax)*dv1)/det,c=((row.cx-row.ax)*du1-(row.bx-row.ax)*du2)/det,b=((row.by-row.ay)*dv2-(row.cy-row.ay)*dv1)/det,d=((row.cy-row.ay)*du1-(row.by-row.ay)*du2)/det,e=row.ax-a*ua-c*va,f=row.ay-b*ua-d*va;
  if(![a,b,c,d,e,f].every(Number.isFinite))return false;
  const pattern=sample.pattern;if(!pattern)return false;
  ctx.save();path(ctx,row);ctx.clip();ctx.setTransform(a,b,c,d,e,f);ctx.fillStyle=pattern;ctx.fillRect(Math.min(ua,ub,uc)-1,Math.min(va,vb,vc)-1,Math.max(ua,ub,uc)-Math.min(ua,ub,uc)+2,Math.max(va,vb,vc)-Math.min(va,vb,vc)+2);ctx.restore();return true;
 }
 _paintTriangle(ctx,row,quality){
  ctx.globalCompositeOperation=row.glow?'screen':'source-over';ctx.globalAlpha=row.alpha;
  if(row.texture>=0&&row.area>(quality==='low'?28:16)&&this._textured(ctx,row))return {draws:1,textured:1};
  if(row.texture>=0)ctx.fillStyle=this._flatTextureColor(row);else ctx.fillStyle=row.color;
  path(ctx,row);ctx.fill();
  // Separate antialiased fills leave a dark hairline where two opaque flat
  // triangles meet on a transparent cached band. A subpixel matching border
  // closes that coverage gap without changing translucent water or effects.
  if(row.texture<0&&row.alpha>=.999&&!row.glow&&!row.shadow){const width=ctx.lineWidth;ctx.lineWidth=.75;ctx.strokeStyle=ctx.fillStyle;ctx.stroke();ctx.lineWidth=width;return {draws:2,textured:0};}
  return {draws:1,textured:0};
 }
 _staticKey(vp,w,h,quality,lightingKey='',sceneKey='',revision=0,count=0){return `${w},${h},${quality},`+Array.from(vp,n=>Math.round(n*10000)).join(',')+`|${sceneKey}|${revision}|${count}|${lightingKey}`;}
 _staticBands(rows,w,h,quality,key,source,submitted){
  const groups=Array.from({length:21},()=>[]),walls=rows.filter(r=>!r.ground&&r.layer>=0),min=walls.reduce((a,r)=>Math.min(a,r.depth),Infinity),max=walls.reduce((a,r)=>Math.max(a,r.depth),-Infinity),span=Math.max(1,max-min);
  for(const row of rows){const index=row.ground||row.layer<0?0:1+clamp(Math.floor((row.depth-min)/span*10),0,9)*2+(row.cutaway?1:0);groups[index].push(row);}
  // A plane may end with a single triangle in one depth band while its
  // neighbour belongs to the next band. Keep that real shared edge sealed,
  // but do not double-fill a genuinely isolated textured detail face.
  const wallPlanes=new Map();
  for(const row of rows){
   row.sharedWallPlane=false;
   if(row.ground||row.texture<0||row.texture===4||row.alpha<.999||row.glow||row.shadow||!Number.isFinite(row.planeD))continue;
   const plane=`${row.texture};${row.cutaway?1:0};${Math.round(row.planeNX*10000)},${Math.round(row.planeNY*10000)},${Math.round(row.planeNZ*10000)},${Math.round(row.planeD*10000)}`,first=wallPlanes.get(plane);
   if(first){first.sharedWallPlane=true;row.sharedWallPlane=true;}else wallPlanes.set(plane,row);
  }
  const bands=[];let textured=0,rasterCalls=0,pixels=0;
  for(let i=0;i<groups.length;i++){const group=groups[i];if(!group.length)continue;
   let left=w,top=h,right=0,bottom=0;for(const row of group){left=Math.min(left,row.minX);top=Math.min(top,row.minY);right=Math.max(right,row.maxX);bottom=Math.max(bottom,row.maxY);}
   left=clamp(Math.floor(left)-2,0,w);top=clamp(Math.floor(top)-2,0,h);right=clamp(Math.ceil(right)+2,0,w);bottom=clamp(Math.ceil(bottom)+2,0,h);if(right<=left||bottom<=top)continue;
   let canvas=this.bandSurfaces[i];if(!canvas){if(typeof OffscreenCanvas==='function')canvas=new OffscreenCanvas(right-left,bottom-top);else if(typeof document!=='undefined')canvas=document.createElement('canvas');else return null;this.bandSurfaces[i]=canvas;}
   if(canvas.width!==right-left)canvas.width=right-left;if(canvas.height!==bottom-top)canvas.height=bottom-top;
   const ctx=canvas.getContext('2d',{alpha:true});ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.lineJoin='round';ctx.lineWidth=.5;
   // Closely stacked horizontal planes (floor, rug, inlay) must retain their
   // physical height order. Sorting their independent triangles by average
   // camera depth cut rugs into triangular scraps beneath nearer floor tiles.
   group.sort((a,b)=>a.layer-b.layer||(Number.isFinite(a.groundHeight)&&Number.isFinite(b.groundHeight)?a.groundHeight-b.groundHeight:0)||b.depth-a.depth);
   const shifted=group.map(row=>({...row,ax:row.ax-left,ay:row.ay-top,bx:row.bx-left,by:row.by-top,cx:row.cx-left,cy:row.cy-top,minX:row.minX-left,maxX:row.maxX-left,minY:row.minY-top,maxY:row.maxY-top}));
   for(let at=0;at<shifted.length;){
    const row=shifted[at];let end=at+1;
    if(row.texture>=0&&row.texture!==4&&row.alpha>=.999&&!row.glow&&!row.shadow){
     while(end<shifted.length){const next=shifted[end];
      if(next.texture!==row.texture||next.alpha<.999||next.glow||next.shadow||next.cutaway!==row.cutaway)break;
      if(row.ground){if(!next.ground||Math.abs(next.groundHeight-row.groundHeight)>1e-5)break;}
      else if(next.ground||!Number.isFinite(row.planeD)||!Number.isFinite(next.planeD)||Math.abs(next.planeNX-row.planeNX)>1e-5||Math.abs(next.planeNY-row.planeNY)>1e-5||Math.abs(next.planeNZ-row.planeNZ)>1e-5||Math.abs(next.planeD-row.planeD)>1e-4)break;
      end++;
     }
     // Seal the exact union of this opaque coplanar surface. Vertical and
     // slanted masonry has the same subdivision AA gaps as paving. Normal
     // and plane distance prevent unrelated faces sharing a depth band from
     // becoming one surface; actual door holes and silhouettes stay empty.
     // Water, effects, shadows and cutaway/non-cutaway bands remain separate.
     // Leave isolated faces at their original single coverage. A lone face
     // at a depth-band boundary still needs support when its actual plane
     // has another visible triangle in a neighbouring band.
     if(row.ground||end>at+1||row.sharedWallPlane){
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle=this._flatTextureColor(shifted[Math.floor((at+end-1)/2)]);ctx.beginPath();
      for(let j=at;j<end;j++){const q=shifted[j];ctx.moveTo(q.ax,q.ay);ctx.lineTo(q.bx,q.by);ctx.lineTo(q.cx,q.cy);ctx.closePath();}ctx.fill();rasterCalls++;
     }
    }
    for(let j=at;j<end;j++){const result=this._paintTriangle(ctx,shifted[j],quality);textured+=result.textured;rasterCalls+=result.draws;}at=end;
   }
   pixels+=canvas.width*canvas.height;const depth=i===0?1e6:group.reduce((sum,r)=>sum+r.depth,0)/group.length;
   bands.push({type:'band',canvas,left,top,minX:left,maxX:right,minY:top,maxY:bottom,layer:i===0?-2:0,depth,cutaway:i>0&&group.every(row=>row.cutaway)});
  }
  return {key,source,material:this.textureSource,water:this.waterSource,wood:this.woodSource,patternCount:this.patterns.length,bands,triangles:rows.length,textured,submitted,rasterCalls,pixels};
 }
 render({meshes,vp,billboardVP,eye=[0,8,20],time=0,state={},quality='high',lights,lighting,sceneKey,materialImage,sprites=[],art}={}){
  if(this.destroyed||!vp||!meshes)return this.stats;const ctx=this.context,w=this.canvas.width,h=this.canvas.height;if(!(w>0&&h>0))return this.stats;
  this.frameLighting=lightingConfiguration(lighting);
  this._materials(materialImage);this._waterMaterial(art?.assets?.scenicMaterials);this._woodMaterial(art?.assets?.architectureMaterials);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=true;
  const skyColors=this.frameLighting?.sky||DUNGEON_SKY,sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,skyColors[0]);sky.addColorStop(skyColors.length===2?1:.6,skyColors[1]);if(skyColors.length>2)sky.addColorStop(1,skyColors[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  const p=state.player,providedLights=Array.isArray(lights),illumination=providedLights?lights.slice(0,8):TORCHES.map((p,i)=>({p,c:[1.35,.62+.025*Math.sin(time*8+i),.21]})).sort((a,b)=>{const px=p?.x||0,pz=p?.z||0;return(a.p[0]-px)**2+(a.p[2]-pz)**2-(b.p[0]-px)**2-(b.p[2]-pz)**2;}).slice(0,6);
  if(p&&!providedLights)illumination.push({p:[p.x,2.0,p.z+.1],c:[.16,.23,.23]});
  const rawBounds=state.scenicBackdropBounds,sceneryBounds=rawBounds&&[rawBounds.x,rawBounds.z,rawBounds.w,rawBounds.d].every(Number.isFinite)&&rawBounds.w>0&&rawBounds.d>0?rawBounds:null;
  const sceneryKey=state.scenicHorizon?'|coast|'+(sceneryBounds?[sceneryBounds.x,sceneryBounds.z,sceneryBounds.w,sceneryBounds.d].join(','):'sea'):'';
  const cutaway=leadCutawayWindow({state,sprites,vp,billboardVP,width:w,height:h});
  const lightKey=(this.frameLighting?.cacheKey||'dungeon')+(cutaway?'|interior-cutaway':'')+(providedLights?'|'+illumination.map(l=>quantized(l.p||[],.25)+':'+quantized(l.c||[])).join(';'):'')+sceneryKey,mesh=meshes.static;
  const cacheKey=this._staticKey(vp,w,h,quality,lightKey,sceneKey??state.scene??state.sceneId??state.location??'',mesh?.revision??mesh?.version??0,mesh?.count??0),staticHit=!!(this.staticFrame&&this.staticFrame.key===cacheKey&&this.staticFrame.source===mesh?.data&&this.staticFrame.material===this.textureSource&&this.staticFrame.water===this.waterSource&&this.staticFrame.wood===this.woodSource&&this.staticFrame.patternCount===this.patterns.length);
  this.visible.length=0;let used=0,total=staticHit?this.staticFrame.submitted:0;const m=vp,clipRadiusX=Math.hypot(m[0],m[4],m[8])+1,clipRadiusY=Math.hypot(m[1],m[5],m[9])+1,project=(x,y,z,u=0,v=0)=>[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],m[3]*x+m[7]*y+m[11]*z+m[15],u,v,y];
  const maxTriangles=quality==='low'?35000:50000,maxDistance=state.adventure?Math.max(24,Math.hypot(eye[0]-finite(p?.x),eye[1],eye[2]-finite(p?.z))+14):24;
  for(const kind of ['static','dynamic','shadows','glow']){if(kind==='static'&&staticHit)continue;const t=this._geometry(meshes[kind],kind==='static');
   for(let i=0;i<t.length;i+=STRIDE){total++;const x=t[i+18],y=t[i+19],z=t[i+20],radius=t[i+21],mat=t[i+15],alpha=t[i+17],nx=t[i+9],ny=t[i+10],nz=t[i+11];
    // The headland's sea and its authored northern reply station are scenery.
    // Keep these bounded static forms to the real far clip. Actors and every
    // ordinary scene retain their local distance budget.
    const backdrop=sceneryBounds,inBackdrop=backdrop&&x>=backdrop.x&&x<=backdrop.x+backdrop.w&&z>=backdrop.z&&z<=backdrop.z+backdrop.d;
    const distanceLimit=state.scenicHorizon&&kind==='static'&&(y<-5||inBackdrop)?125:maxDistance;
    if((x-eye[0])**2+(y-eye[1])**2+(z-eye[2])**2>(distanceLimit+radius)**2||!(alpha>.005))continue;
    if((kind==='static'||kind==='dynamic')&&mat<7.5&&nx*(eye[0]-x)+ny*(eye[1]-y)+nz*(eye[2]-z)<-.03)continue;
    const cw=m[3]*x+m[7]*y+m[11]*z+m[15],cxClip=m[0]*x+m[4]*y+m[8]*z+m[12],cyClip=m[1]*x+m[5]*y+m[9]*z+m[13];
    if(cw+radius<.15||Math.abs(cxClip)>cw+radius*clipRadiusX||Math.abs(cyClip)>cw+radius*clipRadiusY)continue;
    const water=mat>2.5&&mat<3.5,texture=softwareMaterialIndex(mat,ny,{surface:!!this.patterns[0],water:!!this.patterns[4],wood:!!this.patterns[5]});
    const a=project(t[i],t[i+1],t[i+2],...worldUV(t[i],t[i+1],t[i+2],nx,ny,nz,mat)),b=project(t[i+3],t[i+4],t[i+5],...worldUV(t[i+3],t[i+4],t[i+5],nx,ny,nz,mat)),c=project(t[i+6],t[i+7],t[i+8],...worldUV(t[i+6],t[i+7],t[i+8],nx,ny,nz,mat));
    if(a[0]<-a[3]&&b[0]<-b[3]&&c[0]<-c[3]||a[0]>a[3]&&b[0]>b[3]&&c[0]>c[3]||a[1]<-a[3]&&b[1]<-b[3]&&c[1]<-c[3]||a[1]>a[3]&&b[1]>b[3]&&c[1]>c[3]||a[2]>a[3]&&b[2]>b[3]&&c[2]>c[3])continue;
    const groundY=state.adventure&&kind==='static'?(Number.isFinite(state.groundClipY)?state.groundClipY:-.13):null;
    const clipped=clipSoftwarePolygon([a,b,c],{groundY});if(clipped.length<3)continue;if(water)for(const v of clipped){v[4]+=time*.006;v[5]+=time*.003;}
    const surface=this._surface(t,i,eye,time,illumination,kind),eligible=!!cutaway&&(kind==='static'||kind==='dynamic')&&alpha>=.999&&mat<7.5&&!water&&clipped.some(v=>v[6]>.3500001)&&clipped.some(v=>v[3]<cutaway.depthW);
    const parts=eligible?[{vertices:cutawayHeight(clipped,false),cutaway:false},{vertices:cutawayHeight(clipped,true),cutaway:true}]:[{vertices:clipped,cutaway:false}];
    for(const part of parts){const polygon=part.vertices;
     for(let j=1;j+1<polygon.length&&used<maxTriangles;j++){const aa=polygon[0],bb=polygon[j],cc=polygon[j+1],ax=(aa[0]/aa[3]*.5+.5)*w,ay=(.5-aa[1]/aa[3]*.5)*h,bx=(bb[0]/bb[3]*.5+.5)*w,by=(.5-bb[1]/bb[3]*.5)*h,cx=(cc[0]/cc[3]*.5+.5)*w,cy=(.5-cc[1]/cc[3]*.5)*h,area=Math.abs((bx-ax)*(cy-ay)-(by-ay)*(cx-ax)),minX=Math.min(ax,bx,cx),maxX=Math.max(ax,bx,cx),minY=Math.min(ay,by,cy),maxY=Math.max(ay,by,cy);
      if(area<(quality==='low'?5:3)||maxX<-1||minX>w+1||maxY<-1||minY>h+1)continue;const row=this.pool[used]||(this.pool[used]={});used++;
      const ground=kind==='static'&&ny>(state.adventure?.999:.65)&&y<.21;
      Object.assign(row,{type:'triangle',ax,ay,bx,by,cx,cy,minX,minY,maxX,maxY,au:aa[4],av:aa[5],bu:bb[4],bv:bb[5],cu:cc[4],cv:cc[5],depth:(aa[3]+bb[3]+cc[3])/3,layer:t[i+22],texture,color:surface.color,light:water&&!this.frameLighting?[.28,.48,.47]:surface.light,fog:surface.fog,fogColor:surface.fogColor,fogRgb:surface.fogRgb,alpha:clamp(alpha,0,1),glow:kind==='glow',shadow:kind==='shadows',architecture:kind==='static',ground,groundHeight:state.adventure&&ground?y:null,planeNX:nx,planeNY:ny,planeNZ:nz,planeD:nx*x+ny*y+nz*z,area,cutaway:part.cutaway});this.visible.push(row);
     }
    }
   }
  }
  if(!staticHit){
   const staticRows=this.visible.filter(row=>row.architecture),submittedStatic=Math.floor((meshes.static?.count||0)/3);
   this.staticFrame=this._staticBands(staticRows,w,h,quality,cacheKey,meshes.static?.data,submittedStatic);
  }
  if(this.staticFrame){let live=0;for(const row of this.visible)if(!row.architecture)this.visible[live++]=row;this.visible.length=live;this.visible.push(...this.staticFrame.bands);}
  // Camera-facing atlas billboards have constant camera depth. Their feet use
  // the same projected floor coordinates and sorting as walls, rails and piers.
  const basis=billboardVP||m,right=norm([basis[0],basis[4],basis[8]]),up=norm([basis[1],basis[5],basis[9]]);
  let spriteCount=0;
  for(const sprite of sprites){const image=sprite?.image,source=sprite?.source;if(!image||!source||!(source.w>0&&source.h>0)||image.complete===false)continue;
   const foot=project(sprite.x,finite(sprite.y,.04),sprite.z),head=project(sprite.x+up[0]*sprite.height,finite(sprite.y,.04)+up[1]*sprite.height,sprite.z+up[2]*sprite.height),edge=project(sprite.x+right[0]*sprite.width/2,finite(sprite.y,.04)+right[1]*sprite.width/2,sprite.z+right[2]*sprite.width/2);
   if(foot[3]<=.15||head[3]<=.15)continue;const sx=(foot[0]/foot[3]*.5+.5)*w,sy=(.5-foot[1]/foot[3]*.5)*h,pixelWidth=Math.abs((edge[0]/edge[3]*.5+.5)*w-sx)*2,pixelHeight=sy-(.5-head[1]/head[3]*.5)*h,anchorX=sprite.flip?1-finite(sprite.anchorX,.5):finite(sprite.anchorX,.5),anchorY=finite(sprite.anchorY,1),left=sx-anchorX*pixelWidth,top=sy-anchorY*pixelHeight;if(pixelWidth<1||pixelHeight<1||left+pixelWidth<0||left>w||top+pixelHeight<0||top>h)continue;
   this.visible.push({type:'sprite',depth:foot[3]-.04,layer:0,sprite,x:left,y:top,width:pixelWidth,height:pixelHeight});spriteCount++;
  }
  this.visible.sort((a,b)=>a.layer-b.layer||b.depth-a.depth);let draws=1,triangles=this.staticFrame?.triangles||0,textured=this.staticFrame?.textured||0;
  ctx.lineJoin='round';ctx.lineWidth=.5;
  for(const row of this.visible){
   if(row.type==='band'){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;if(overlapsCutaway(row,cutaway)){paintCutaway(ctx,cutaway,w,h,alpha=>{ctx.globalAlpha=alpha;ctx.drawImage(row.canvas,row.left,row.top);draws++;});}else{ctx.drawImage(row.canvas,row.left,row.top);draws++;}continue;}
   if(row.type==='sprite'){const s=row.sprite;ctx.globalCompositeOperation='source-over';ctx.globalAlpha=clamp(finite(s.alpha,1),0,1);ctx.imageSmoothingEnabled=false;ctx.save();if(s.flip){ctx.translate(row.x+row.width,row.y);ctx.scale(-1,1);}else ctx.translate(row.x,row.y);const picture=this.actorTintCache.resolve(s);ctx.drawImage(picture.image,picture.source.x,picture.source.y,picture.source.w,picture.source.h,0,0,row.width,row.height);ctx.restore();ctx.imageSmoothingEnabled=true;draws++;continue;}
   let painted;if(overlapsCutaway(row,cutaway)){painted={draws:0,textured:0};paintCutaway(ctx,cutaway,w,h,alpha=>{const result=this._paintTriangle(ctx,{...row,alpha:row.alpha*alpha},quality);painted.draws+=result.draws;painted.textured=Math.max(painted.textured,result.textured);});}else painted=this._paintTriangle(ctx,row,quality);draws+=painted.draws;textured+=painted.textured;triangles++;
  }
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;const vignette=ctx.createRadialGradient(w*.5,h*.44,Math.min(w,h)*.15,w*.5,h*.47,Math.max(w,h)*.72);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.65,'rgba(0,5,8,.06)');vignette.addColorStop(1,'rgba(0,3,7,.55)');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);draws++;
  this.stats={drawCalls:draws,triangles,texturedTriangles:textured,sprites:spriteCount,submittedTriangles:total,staticCacheHit:staticHit,staticLayers:this.staticFrame?.bands.length||0,staticCachePixels:this.staticFrame?.pixels||0,interiorCutaway:!!cutaway,backend:'software-3d'};return this.stats;
 }
 destroy(){this.destroyed=true;this.actorTintCache.clear();this.cache=new WeakMap();this.pool.length=0;this.visible.length=0;this.tiles.length=0;this.patterns.length=0;this.tileSizes.length=0;this.litPatterns.clear();this.woodSource=null;this.staticFrame=null;this.bandSurfaces.length=0;this.context=null;}
}
