/** Quiet regional water, painted once at scene entry from the original PNG.
 * Navigation, depth masks and animated reflections remain the caller's work. */
export const ENVIRONMENT_WATER_FILE='environment-water-v17.webp';
export const ENVIRONMENT_WATER_SIZE=Object.freeze([1254,1254]);
export const ENVIRONMENT_WATER_MATERIALS=Object.freeze([
 {id:'alluvial-river',style:'riverbank',name:'Alluvial river',crop:[20,20,587,587],base:'#285a51',deep:'#173b3a'},
 {id:'mangrove-tide',style:'mangrove',name:'Mangrove tide',crop:[647,20,587,587],base:'#2d5145',deep:'#183a34'},
 {id:'coral-shallows',style:'coral',name:'Coral shallows',crop:[20,647,587,587],base:'#347d83',deep:'#245563'},
 {id:'saltglass-lagoon',style:'salt',name:'Saltglass lagoon',crop:[647,647,587,587],base:'#6e9990',deep:'#355e62'}
].map(p=>Object.freeze({...p,crop:Object.freeze(p.crop)})));
const byStyle=Object.fromEntries(ENVIRONMENT_WATER_MATERIALS.map(p=>[p.style,p]));
export function environmentWaterSpec(style){return byStyle[style]||null;}
export function environmentWaterReady(image){
 const w=Number(image?.naturalWidth??image?.width),h=Number(image?.naturalHeight??image?.height);
 return image?.complete!==false&&w>=ENVIRONMENT_WATER_SIZE[0]&&h>=ENVIRONMENT_WATER_SIZE[1];
}
/** Current path and all drawing state survive this helper. Crops retain only
 * their own water swatch; repeated edges meet through alternating reflection. */
export function paintEnvironmentWaterSurface(c,image,style,size=768){
 const spec=environmentWaterSpec(style);
 if(!spec||!environmentWaterReady(image)||!c?.save||!c?.drawImage||!Number.isFinite(size)||size<=0||size>4096)return false;
 const [sx,sy,sw,sh]=spec.crop,tile=384;
 c.save();
 try{
  c.globalAlpha*=.68;
  for(let y=0,row=0;y<size;y+=tile,row++)for(let x=0,col=0;x<size;x+=tile,col++){
   const w=Math.min(tile,size-x),h=Math.min(tile,size-y),fx=col%2,fy=row%2,cw=sw*w/tile,ch=sh*h/tile;
   c.save();
   try{c.translate(x+(fx?w:0),y+(fy?h:0));c.scale(fx?-1:1,fy?-1:1);c.drawImage(image,sx+(fx?sw-cw:0),sy+(fy?sh-ch:0),cw,ch,0,0,w,h);}
   finally{c.restore();}
  }
  return true;
 }catch{return false;}finally{c.restore();}
}
const caches=new WeakMap();
/** At most four 768px water tiles per loaded atlas, reused between scenes. */
export function environmentWaterPattern(c,image,style){
 const spec=environmentWaterSpec(style);
 if(!spec||!environmentWaterReady(image)||typeof document==='undefined')return null;
 let cache=caches.get(image);if(!cache){cache=new Map();caches.set(image,cache);}
 if(!cache.has(style)){
  const tile=document.createElement('canvas');tile.width=tile.height=768;
  const g=tile.getContext('2d');if(!g)return null;
  g.fillStyle=spec.base;g.fillRect(0,0,768,768);
  if(!paintEnvironmentWaterSurface(g,image,style,768))return null;
  cache.set(style,tile);
 }
 return c.createPattern(cache.get(style),'repeat');
}

