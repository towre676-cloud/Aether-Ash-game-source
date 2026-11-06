import {environmentFor} from './environment.js?v=5.18.0';
import {environmentWaterSpec,environmentWaterReady,environmentWaterPattern} from './environment-water-v17.js?v=5.18.0';
import {paintEnvironmentSurface,ENVIRONMENT_SURFACE_SIZE} from './environment-materials-v17.js?v=5.18.0';
import {paintEnvironmentBanks,environmentMood} from './environment-depth.js?v=5.18.0';
import {terrainPixel,terrainHash,terrainNoise,terrainKind,TERRAIN_MATERIALS,terrainTrails} from './terrain-materials.js?v=4.0.0';
const T=48,M=576;
/** Exact collision boundary loops. Rendering rounds them; navigation is unchanged. */
export function groundContours(s,select=(x,y)=>s.floor[y]?.[x]==='.'){const edges=[],at=new Map();const add=(a,b)=>{const e={a,b,used:false};edges.push(e);const k=a.join(',');if(!at.has(k))at.set(k,[]);at.get(k).push(e);};for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++)if(select(x,y)){if(!select(x,y-1))add([x,y],[x+1,y]);if(!select(x+1,y))add([x+1,y],[x+1,y+1]);if(!select(x,y+1))add([x+1,y+1],[x,y+1]);if(!select(x-1,y))add([x,y+1],[x,y]);}const loops=[];for(const start of edges){if(start.used)continue;let e=start;const loop=[];while(e&&!e.used){e.used=true;loop.push(e.a);const choices=(at.get(e.b.join(','))||[]).filter(e=>!e.used),dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1];choices.sort((a,b)=>{const turn=v=>dx*(v.b[1]-v.a[1])-dy*(v.b[0]-v.a[0]);return turn(b)-turn(a);});e=choices[0];}if(loop.length>=4)loops.push(loop);}return loops;}
export function roundedGroundPath(loops,radius=23){const p=new Path2D();for(const loop of loops){const pts=loop.map(([x,y],i)=>{const a=loop[(i+loop.length-1)%loop.length],b=loop[(i+1)%loop.length],nx=(y-a[1])+(b[1]-y),ny=-((x-a[0])+(b[0]-x)),d=Math.hypot(nx,ny)||1,j=(Math.sin(x*2.37+y*1.71)+Math.sin(x*.83-y*2.19))*(radius<22?1.6:3.2);return[x*T+nx/d*j,y*T+ny/d*j];});for(let i=0;i<pts.length;i++){const prev=pts[(i+pts.length-1)%pts.length],v=pts[i],next=pts[(i+1)%pts.length],approach=a=>{const dx=a[0]-v[0],dy=a[1]-v[1],d=Math.hypot(dx,dy);return[v[0]+dx/d*Math.min(radius,d*.48),v[1]+dy/d*Math.min(radius,d*.48)];},a=approach(prev),b=approach(next);if(i===0)p.moveTo(...a);else p.lineTo(...a);p.quadraticCurveTo(v[0],v[1],b[0],b[1]);}p.closePath();}return p;}
const patterns=new Map(),TEXTURE_SIZE=768;
/** Small, grouped surface marks belong to one larger cached material tile.
 * Sparse leaf flecks supply scale without engraving the entire floor with blades. */
export function groundTextureMarks(kind){
 const green=!!TERRAIN_MATERIALS[kind]?.stems,marks=[];
 for(let group=0;group<(green?24:34);group++){
  const cx=terrainHash(group,2,17)*TEXTURE_SIZE,cy=terrainHash(group,4,18)*TEXTURE_SIZE;
  const count=2+Math.floor(terrainHash(group,3,19)*4);
  for(let j=0;j<count;j++){
   const n=group*7+j,a=terrainHash(n,6,20)*Math.PI*2,r=terrainHash(n,8,21)*9;
   marks.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r,rx:.7+terrainHash(n,9,22)*1.5,ry:.35+terrainHash(n,10,23)*.5,angle:a,light:terrainHash(n,11,24)>.7});
  }
 }
 return marks;
}
const paintedPatterns=new WeakMap();
export function scenicMaterialCell(kind){return /^(grass|woodland|spore|mangrove)$/.test(kind)?0:/^(soil|sand|cactus)$/.test(kind)?1:kind==='water'?3:2;}
/** Alternating reflected crops join identical edge pixels in the generated material art. */
export function paintScenicMaterial(c,image,kind,size=768){
 if(!image?.width||!image?.height)return false;
 const cell=scenicMaterialCell(kind),sw=image.width/2,sh=image.height/2,sx=(cell%2)*sw,sy=Math.floor(cell/2)*sh,tile=192;
 c.save();c.globalAlpha=kind==='water'?.9:.64;
 for(let y=0;y<size;y+=tile)for(let x=0;x<size;x+=tile){const flipX=(x/tile)%2,flipY=(y/tile)%2;c.save();c.translate(x+(flipX?tile:0),y+(flipY?tile:0));c.scale(flipX?-1:1,flipY?-1:1);c.drawImage(image,sx,sy,sw,sh,0,0,tile+.5,tile+.5);c.restore();}
 c.restore();return true;
}
function material(c,kind,scenicMaterials=null,environmentSurfaces=null){
 let cache=patterns;
 const painted=environmentSurfaces?.complete!==false&&environmentSurfaces?.width>=ENVIRONMENT_SURFACE_SIZE[0]&&environmentSurfaces?.height>=ENVIRONMENT_SURFACE_SIZE[1]?environmentSurfaces:scenicMaterials;
 if(painted?.width){if(!paintedPatterns.has(painted))paintedPatterns.set(painted,new Map());cache=paintedPatterns.get(painted);}
 if(!cache.has(kind)){
 const a=document.createElement('canvas');a.width=a.height=TEXTURE_SIZE;
 const g=a.getContext('2d'),raw=g.createImageData(TEXTURE_SIZE,TEXTURE_SIZE),m=TERRAIN_MATERIALS[kind]||TERRAIN_MATERIALS.stone;
 for(let y=0;y<TEXTURE_SIZE;y++)for(let x=0;x<TEXTURE_SIZE;x++){
  const pixel=terrainPixel(kind,x,y),broad=(terrainNoise(x,y,192,18,4)-.5)*14+(terrainNoise(x,y,384,29,2)-.5)*10,at=(y*TEXTURE_SIZE+x)*4;
  for(let k=0;k<3;k++)raw.data[at+k]=Math.max(0,Math.min(255,Math.round(m.base[k]+(pixel[k]-m.base[k])*.32+broad)));
  raw.data[at+3]=255;
 }
 g.putImageData(raw,0,0);
 if(!paintEnvironmentSurface(g,environmentSurfaces,kind,TEXTURE_SIZE))paintScenicMaterial(g,scenicMaterials,kind,TEXTURE_SIZE);
 const green=!!m.stems;
 for(const p of groundTextureMarks(kind)){
  g.fillStyle=green?(p.light?'#a6ad7a24':'#17271932'):(p.light?'#ded4ab28':'#30372f2b');
  // Wrap the tiny clusters so the 768px tile remains seamless.
  for(const dx of[-TEXTURE_SIZE,0,TEXTURE_SIZE])for(const dy of[-TEXTURE_SIZE,0,TEXTURE_SIZE]){
   const x=p.x+dx,y=p.y+dy;if(x<-4||x>TEXTURE_SIZE+4||y<-4||y>TEXTURE_SIZE+4)continue;
   g.beginPath();g.ellipse(x,y,p.rx,p.ry,p.angle,0,Math.PI*2);g.fill();
  }
 }
 cache.set(kind,a);
 }return c.createPattern(cache.get(kind),'repeat');}
function fill(c,s,style,path){c.save();if(path)c.clip(path,'evenodd');c.fillStyle=style;c.fillRect(-M,-M,s.width*T+M*2,s.height*T+M*2);c.restore();}
function broadVariation(c,s,path,kind){
 c.save();if(path)c.clip(path,'evenodd');const green=TERRAIN_MATERIALS[kind]?.stems;
 const count=Math.min(96,Math.max(8,Math.floor(s.width*s.height/65)));
 for(let i=0;i<count;i++){
  const x=terrainHash(i,11,5)*s.width*T,y=terrainHash(i,12,5)*s.height*T,r=140+terrainHash(i,13,5)*270;
  c.save();c.translate(x,y);c.rotate(terrainHash(i,14,5)*Math.PI);c.scale(.8+terrainHash(i,15,5)*.85,.55+terrainHash(i,16,5)*.4);
  const g=c.createRadialGradient(0,0,r*.06,0,0,r);
  g.addColorStop(0,green?(i%3?'#a9a16d29':'#1b352c32'):(i%3?'#ded5a31b':'#252f3727'));
  g.addColorStop(.58,green?(i%3?'#a9a16d12':'#1b352c19'):(i%3?'#ded5a30b':'#252f3710'));
  g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();
 }c.restore();
}
function paintTrails(c,s,path,streets,kind,scenicMaterials=null,compatibility=false,environmentSurfaces=null){
 const town=['town','market','hub'].includes(s.key),green=TERRAIN_MATERIALS[kind]?.stems;
 if(town&&streets?.size){const contours=groundContours(s,(x,y)=>streets.has(x+','+y)),route=roundedGroundPath(contours,16);c.save();c.clip(path,'evenodd');c.lineWidth=32;c.strokeStyle='#746d4550';c.lineJoin='round';if(!compatibility)c.filter='blur(6px)';c.stroke(route);if(!compatibility)c.filter='none';fill(c,s,material(c,'soil',scenicMaterials,environmentSurfaces),route);broadVariation(c,s,route,'soil');
 // A worn verge interrupts the mathematical outline. Grass enters the verge,
 // and displaced gravel leaves the road, with a different profile at every edge.
 c.save();if(!compatibility)c.filter='blur(3px)';c.lineWidth=12;c.strokeStyle='#68704475';c.stroke(route);c.restore();
 for(const loop of contours)for(let edge=0;edge<loop.length;edge++){const a=loop[edge],b=loop[(edge+1)%loop.length],dx=b[0]-a[0],dy=b[1]-a[1];for(let j=0;j<2;j++){const k=edge*13+j+loop.length*29,t=(j+.5)/2,rx=(a[0]+dx*t)*T,ry=(a[1]+dy*t)*T,drift=(terrainHash(k,7,3)-.5)*11;c.fillStyle=j%3?'#4f633b57':'#81925747';c.beginPath();c.ellipse(rx+dy*drift,ry-dx*drift,3+terrainHash(k,3)*4,1.5+terrainHash(k,4)*2,terrainHash(k,5)*3,0,7);c.fill();if(terrainHash(k,9)>.84){c.strokeStyle='#a1a87048';c.lineWidth=1.1;c.beginPath();c.moveTo(rx,ry);c.quadraticCurveTo(rx+dy*3,ry-3,rx+dy*6,ry-7-terrainHash(k,6)*4);c.stroke();}}}
 c.save();c.clip(route,'evenodd');for(const tile of streets){const [tx,ty]=tile.split(',').map(Number);for(let j=0;j<3;j++){const k=tx*973+ty*17+j*113,x=(tx+terrainHash(k,1))*T,y=(ty+terrainHash(k,2))*T,r=terrainHash(k,3);c.fillStyle=r>.5?'#d1c29a48':'#4b4c3945';c.beginPath();c.ellipse(x,y,1.2+r*2.7,.6+r*1.2,r*3,0,7);c.fill();if(r>.73){c.strokeStyle='#e7d8b538';c.lineWidth=.7;c.beginPath();c.moveTo(x-1,y-1);c.lineTo(x+1.6,y-1.6);c.stroke();}}}c.restore();c.restore();return;}
 if(!green&&!['soil','sand','salt','highland','ruins'].includes(kind))return;
 const routes=terrainTrails(s);c.save();c.clip(path,'evenodd');c.lineJoin=c.lineCap='round';for(const route of routes){if(route.length<3)continue;c.beginPath();const first=route[0];c.moveTo((first[0]+.5)*T,(first[1]+.5)*T);for(let i=1;i<route.length;i++){const prev=route[i-1],p=route[i],x=(p[0]+.5)*T,y=(p[1]+.5)*T;if(i<route.length-1){const n=route[i+1];c.quadraticCurveTo(x,y,(p[0]+n[0]+1)*T*.5,(p[1]+n[1]+1)*T*.5);}else c.lineTo(x,y);}c.strokeStyle=green?'#c0ad7530':'#d3c39921';c.lineWidth=34;c.stroke();c.strokeStyle=green?'#a2966c48':'#514b3b25';c.lineWidth=18;c.stroke();c.strokeStyle=green?'#c3b28232':'#d2c6a126';c.lineWidth=8;c.stroke();}c.restore();}
/** Floor-scale dressing is grouped by low-frequency habitat patches. The
 * central walking space and every story interaction keep a quiet margin. */
export function groundDressingSites(s,streets,kind){
 const green=!!TERRAIN_MATERIALS[kind]?.stems,points=[...(s.doors||[]),...(s.objects||[])].filter(o=>o.xy&&o.type!=='furnishing').map(o=>o.xy.map(v=>v+.5));
 if(s.arrive)points.push(s.arrive.map(v=>v+.5));
 const sites=[],open=(x,y)=>s.floor[y]?.[x]==='.',limit=Math.min(320,Math.ceil(s.width*s.height/12));
 for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){
  if(!open(x,y)||streets?.has(x+','+y))continue;
  const n=terrainHash(x,y,71),patch=terrainNoise(x,y,4,73),nearEdge=[[2,0],[-2,0],[0,2],[0,-2]].some(([dx,dy])=>!open(x+dx,y+dy));
  const grass=green&&patch>.5&&(nearEdge?n>.70:n>.955),litter=!grass&&patch>.47&&n>.89;
  if(!grass&&!litter)continue;
  const px=x+.18+terrainHash(x,y,74)*.64,py=y+.18+terrainHash(x,y,75)*.64;
  if(points.some(p=>Math.hypot(px-p[0],py-p[1])<1.7))continue;
  sites.push({x:px,y:py,seed:Math.floor(terrainHash(x,y,76)*2147483647),kind:grass?'grass':green?'leaf':'grit'});
  if(sites.length>=limit)return sites;
 }
 return sites;
}
function grassClusters(c,s,path,streets,kind){
 c.save();c.clip(path,'evenodd');c.lineCap='round';
 for(const p of groundDressingSites(s,streets,kind)){
  const x=p.x*T,y=p.y*T,r=terrainHash(p.seed,54),count=3+Math.floor(r*3);
  if(p.kind==='grass'){
   c.fillStyle='#152d1e1c';c.beginPath();c.ellipse(x,y+1,5+r*5,1.3+r,0,0,Math.PI*2);c.fill();
   for(let j=0;j<count;j++){
    const px=x+(j-count*.5)*1.6,h=2+terrainHash(p.seed,j,55)*4.5,lean=(terrainHash(p.seed,j,56)-.5)*4;
    c.strokeStyle=j%3?'#7d925b66':'#a1aa744a';c.lineWidth=.8+r*.35;c.beginPath();c.moveTo(px,y);c.quadraticCurveTo(px+lean*.5,y-h*.5,px+lean,y-h);c.stroke();
   }
  }else for(let j=0;j<count;j++){
   const angle=terrainHash(p.seed,j,57)*Math.PI*2,spread=terrainHash(p.seed,j,58)*7,light=terrainHash(p.seed,j,59)>.6;
   c.fillStyle=p.kind==='leaf'?(light?'#bcae783d':'#293e2c3d'):(light?'#d8d7bf37':'#2c34383b');
   c.beginPath();c.ellipse(x+Math.cos(angle)*spread,y+Math.sin(angle)*spread*.65,.9+r*1.8,.4+r*.65,angle,0,Math.PI*2);c.fill();
  }
 }
 c.restore();
}
/** Terrain is one bounded scene-entry bitmap in either graphics mode. */
export function terrainBakeSize(scene,{compatibility=false,margin=576}={}){
 const width=scene.width*T+margin*2,height=scene.height*T+margin*2,maxPixels=compatibility?1500000:3200000,maxDimension=compatibility?2048:3072;
 const ratio=Math.min(compatibility?.42:.65,maxDimension/width,maxDimension/height,Math.sqrt(maxPixels/(width*height)));
 return {width:Math.max(1,Math.floor(width*ratio)),height:Math.max(1,Math.floor(height*ratio)),ratio,margin};
}
export function bakeOrganicGround(s,image,streets,{scenicMaterials=null,compatibility=false,environmentSurfaces=null,environmentWater=null}={}){
 const size=terrainBakeSize(s,{compatibility}),a=document.createElement('canvas');a.width=size.width;a.height=size.height;a.worldX=a.worldY=-size.margin;a.worldWidth=a.width/size.ratio;a.worldHeight=a.height/size.ratio;
 const c=a.getContext('2d');if(!c)throw Error('Terrain canvas unavailable');c.scale(size.ratio,size.ratio);c.translate(size.margin,size.margin);
 const e=environmentFor(s),style=e.style,water=environmentMood(s).wet,kind=terrainKind(style),loops=groundContours(s),path=roundedGroundPath(loops);
 if(water){
  const regionalWater=environmentWaterReady(environmentWater)?environmentWaterSpec(style):null,sea=c.createLinearGradient(0,0,s.width*T,s.height*T);sea.addColorStop(0,regionalWater?.base||'#3b777c');sea.addColorStop(.5,regionalWater?.base||'#315d6a');sea.addColorStop(1,regionalWater?.deep||'#1d4358');fill(c,s,sea);
  const waterTexture=environmentWaterPattern(c,environmentWater,style)||(scenicMaterials?.width?material(c,'water',scenicMaterials):null);if(waterTexture){c.save();c.globalAlpha=regionalWater?.86:.62;fill(c,s,waterTexture);c.restore();}
 }else fill(c,s,material(c,kind,scenicMaterials,environmentSurfaces));
 fill(c,s,material(c,kind,scenicMaterials,environmentSurfaces),path);broadVariation(c,s,path,kind);
 if(!water){const blocked=roundedGroundPath(groundContours(s,(x,y)=>x>=0&&y>=0&&x<s.width&&y<s.height&&s.floor[y]?.[x]!=='.'),22);c.save();c.fillStyle=TERRAIN_MATERIALS[kind]?.stems?'#122b2130':'#1721262c';c.fill(blocked,'evenodd');c.strokeStyle='#17271e10';c.lineWidth=22;c.stroke(blocked);c.restore();}
 paintEnvironmentBanks(c,s,path);
 paintTrails(c,s,path,streets,kind,scenicMaterials,compatibility,environmentSurfaces);grassClusters(c,s,path,streets,kind);
 a.contourCount=loops.length;return a;
}
/** Boundary vegetation uses modest, shaded leaves rooted to one ground plane.
 * Tall reeds remain specific to wet ground; flowers are occasional tiny accents. */
export function naturalObstacle(c,s,x,y,n,time){const style=environmentFor(s).style,green=['woodland','village','spore','cactus','mangrove','coral'].includes(style);c.save();c.translate((x+.5)*T,(y+.85)*T);c.lineCap='round';c.lineJoin='round';if(green){const wet=['mangrove','coral'].includes(style),colors=style==='coral'?['#a77e72','#c3a08b','#725e55']:style==='spore'?['#526d58','#82896c','#3e5848']:['#354f35','#61764c','#7d8757'];c.fillStyle='#071b1825';c.beginPath();c.ellipse(0,2,18,5,0,0,7);c.fill();for(let i=0;i<11+n%9;i++){const px=Math.sin(i*2.39+n)*18,py=Math.cos(i*1.3+n)*4,h=(wet?15:5)+(n+i*11)%(wet?19:12),sway=Math.sin(time*1.1+i)*.6;c.strokeStyle=colors[i%3];c.lineWidth=.7+(i%3)*.35;c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px+Math.sin(i*3.2+n)*3,py-h*.6,px+sway,py-h);c.stroke();if(i%3===0){c.fillStyle=colors[(i+1)%3];c.beginPath();c.ellipse(px+sway+1.5,py-h*.6,3.8,1.5,-.7,0,7);c.fill();}}if(n%7===0){c.fillStyle='#c8ba845e';for(let i=0;i<3;i++){c.beginPath();c.arc(Math.sin(i*3+n)*12,-7-i*2,1.1,0,7);c.fill();}}}else for(let i=0;i<2+n%2;i++){const px=(i-1)*10+(n%7)-3,py=i%2*3,w=7+(n+i*7)%7,h=6+(n+i*3)%12,g=c.createLinearGradient(px-w,py-h,px+w,py);g.addColorStop(0,['ice','aurora'].includes(style)?'#b4cbd0':style==='sand'?'#b59b72':'#91988d');g.addColorStop(.55,style==='crystal'?'#796d89':'#626d64');g.addColorStop(1,'#35423d');c.fillStyle='#12211d35';c.beginPath();c.ellipse(px+2,py+2,w+4,4,0,0,7);c.fill();c.fillStyle=g;c.beginPath();c.moveTo(px-w,py-2);c.bezierCurveTo(px-w-3,py-h*.5,px-w*.3,py-h,px+2,py-h);c.bezierCurveTo(px+w,py-h,px+w+3,py-2,px+w*.5,py+2);c.bezierCurveTo(px,py+4,px-w*.8,py+3,px-w,py-2);c.fill();c.strokeStyle='#c1c9b633';c.lineWidth=.7;c.beginPath();c.moveTo(px-w*.55,py-h*.45);c.bezierCurveTo(px-w*.2,py-h*.72,px+w*.25,py-h*.4,px+w*.48,py-h*.5);c.stroke();}c.restore();}
