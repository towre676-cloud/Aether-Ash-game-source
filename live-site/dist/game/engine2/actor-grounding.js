/** Native actor presentation for the rebuilt Veyr observatory.
 * These helpers transform display sprites and shadow meshes only. The original
 * atlas, animation registration, actor coordinates and gameplay state are never
 * edited. Tint values are shared by the GPU shader and the cached CPU crops.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
export const isObservatoryActorScene=world=>world?.scene?.originId==='veyr-storm';

/** Modest exposure adaptation: art remains readable, while a warm lamp or cool
 * ambient environment no longer leaves an otherwise full-bright character.
 * Quantized display tints avoid making a new CPU crop for every light tick.
 */
export function resolveActorTint(value,fallback=null){
 if(!Array.isArray(value)||value.length<3||!value.slice(0,3).every(Number.isFinite))return fallback;
 return value.slice(0,3).map(v=>clamp(Math.round(clamp(v,.88,1)*64)/64,.88,1));
}

export function actorGroundingTint({lighting={},lights=[],x=0,z=0}={}){
 const ambient=lighting.ambient||[.28,.26,.22],key=lighting.key||[.55,.49,.37];
 const channels=[0,1,2].map(k=>Math.max(.01,finite(ambient[k],.25)+finite(key[k],.4)*.48));
 for(const light of lights.slice(0,8)){
  const p=light?.p,c=light?.c;if(!Array.isArray(p)||!Array.isArray(c))continue;
  const d2=(finite(p[0])-x)**2+(finite(p[2])-z)**2+(finite(p[1])-1.1)**2;
  const strength=.12/(1+d2*.24);
  for(let k=0;k<3;k++)channels[k]+=clamp(finite(c[k]),0,2)*strength;
 }
 const peak=Math.max(...channels),exposure=.97+.03*clamp(peak/.65,0,1);
 return resolveActorTint(channels.map(v=>exposure*(.88+.12*Math.sqrt(v/peak))));
}

export function groundActorSprite(sprite,{world,lighting,lights,groundY=.04,authored=false}={}){
 if(!sprite||!isObservatoryActorScene(world)&&!authored)return sprite;
 const floor=finite(groundY,.04);
 return {...sprite,y:Math.max(finite(sprite.y),floor+.016),tint:actorGroundingTint({lighting,lights,x:sprite.x,z:sprite.z})};
}

/** Three translucent ellipses make a soft edge and a darker foot contact.
 * Every layer is above the actual floor, rather than buried beneath its finish.
 */
export function appendActorContactShadow(mesh,{world,x,z,groundY=.04,kind='hero',authored=false}={}){
 if(!mesh?.disc||!isObservatoryActorScene(world)&&!authored||!Number.isFinite(x+z))return false;
 const shape=kind==='boss'?[.90,.58]:kind==='enemy'?[.44,.29]:kind==='npc'?[.31,.21]:[.35,.24];
 const floor=finite(groundY,.04),color=[.018,.024,.026];
 for(const [scale,alpha,level]of [[1.22,.09,0],[.93,.15,1],[.54,.24,2]])mesh.disc(x,floor+.004+level*.0007,z,shape[0]*scale,shape[1]*scale,color,8,alpha,20);
 return true;
}

function defaultCanvas(width,height){
 if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(width,height);
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;
}

/** CPU tint crops are generated only on cache misses. Pixel alpha is copied
 * unchanged, so transparent atlas padding can never become an opaque rectangle.
 * A failed/tainted/unsupported readback returns the original sprite for that
 * frame. No full atlas readback or alteration is performed.
 */
export function createActorTintCache({createCanvas=defaultCanvas,maxEntries=48,maxBytes=4*1024*1024,maxEdge=192}={}){
 const entries=new Map(),imageIds=new WeakMap();let nextId=1,bytes=0;
 const trim=()=>{while(entries.size>maxEntries||bytes>maxBytes){const [key,item]=entries.entries().next().value;entries.delete(key);bytes-=item.bytes;}};
 return {
  resolve(sprite){
   const tint=resolveActorTint(sprite?.tint),image=sprite?.image,source=sprite?.source;
   if(!tint||!image||!source||image.complete===false||![source.x,source.y,source.w,source.h].every(Number.isFinite)||source.w<=0||source.h<=0)return sprite;
   if(!imageIds.has(image))imageIds.set(image,nextId++);
   const key=[imageIds.get(image),source.x,source.y,source.w,source.h,...tint].join(':');
   const prior=entries.get(key);if(prior){entries.delete(key);entries.set(key,prior);return prior.display?{...sprite,...prior.display}:sprite;}
   const ratio=Math.min(1,maxEdge/Math.max(source.w,source.h)),width=Math.max(1,Math.round(source.w*ratio)),height=Math.max(1,Math.round(source.h*ratio));
   let display=null,cost=0;
   try{
    const canvas=createCanvas(width,height),ctx=canvas?.getContext?.('2d',{willReadFrequently:true});
    if(ctx?.drawImage&&ctx?.getImageData&&ctx?.putImageData){
     ctx.clearRect?.(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.drawImage(image,source.x,source.y,source.w,source.h,0,0,width,height);
     const pixels=ctx.getImageData(0,0,width,height),data=pixels.data;
     for(let i=0;i<data.length;i+=4)for(let k=0;k<3;k++)data[i+k]=Math.round(data[i+k]*tint[k]);
     ctx.putImageData(pixels,0,0);display={image:canvas,source:{x:0,y:0,w:width,h:height}};cost=width*height*4;
    }
   }catch{}
   // Cache failed attempts too, avoiding repeated security/readback exceptions.
   entries.set(key,{display,bytes:cost});bytes+=cost;trim();return display?{...sprite,...display}:sprite;
  },
  stats(){return{entries:entries.size,bytes,maxEntries,maxBytes};},
  clear(){entries.clear();bytes=0;}
 };
}
