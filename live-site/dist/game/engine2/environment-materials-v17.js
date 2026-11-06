/** Original painted ground surfaces. This helper only layers fine material
 * texture; scene geometry, palette, navigation and water stay with the caller. */
export const ENVIRONMENT_SURFACE_FILE='environment-surfaces-v17.webp';
export const ENVIRONMENT_SURFACE_SIZE=Object.freeze([1774,887]);
export const ENVIRONMENT_SURFACE_TILE=384;
export const ENVIRONMENT_SURFACE_ALPHA=.24;
export const ENVIRONMENT_SURFACE_CROPS=Object.freeze([
 [20,20,404,404],[464,20,404,404],[907,20,404,404],[1351,20,404,404],
 [20,464,404,404],[464,464,404,404],[907,464,404,404],[1351,464,404,404]
].map(c=>Object.freeze(c)));
export const ENVIRONMENT_SURFACE_NAMES=Object.freeze([
 'meadow-moss','alluvial-mud','ochre-sand','blue-slate',
 'frost-crust','mycelium-soil','volcanic-clinker','limestone-fragments'
]);
const KINDS=Object.freeze({
 grass:0,woodland:0,village:0,
 soil:1,mangrove:1,riverbank:1,
 sand:2,cactus:2,dunes:2,
 stone:3,ruins:3,highland:3,storm:3,crystal:3,
 ice:4,aurora:4,glacier:4,
 spore:5,
 foundry:6,lava:6,caldera:6,
 marble:7,salt:7,coral:7
});

/** Null deliberately leaves water and unknown materials on their old fallback. */
export function environmentSurfaceSpec(kind){
 const index=KINDS[kind];
 return Number.isInteger(index)?{index,name:ENVIRONMENT_SURFACE_NAMES[index],crop:ENVIRONMENT_SURFACE_CROPS[index],alpha:ENVIRONMENT_SURFACE_ALPHA}:null;
}

/** Reflect alternate tiles to join matching edge pixels. Central 404px source
 * crops avoid bleed between adjacent swatches. Drawing stays inside size×size,
 * including a partial last tile, and never changes the caller's current path.
 * No canvas allocation, pixel readback, filter, mutation, or per-frame cache. */
export function paintEnvironmentSurface(c,image,kind,size=768){
 const spec=environmentSurfaceSpec(kind),iw=Number(image?.naturalWidth??image?.width),ih=Number(image?.naturalHeight??image?.height);
 if(!spec||!c||typeof c.save!=='function'||typeof c.drawImage!=='function'||
    image?.complete===false||!Number.isFinite(iw)||!Number.isFinite(ih)||
    iw<ENVIRONMENT_SURFACE_SIZE[0]||ih<ENVIRONMENT_SURFACE_SIZE[1]||
    !Number.isFinite(size)||size<=0||size>4096)return false;
 const [sx,sy,sw,sh]=spec.crop,tile=ENVIRONMENT_SURFACE_TILE;
 c.save();
 try{
  c.globalAlpha*=spec.alpha;
  for(let y=0,row=0;y<size;y+=tile,row++)for(let x=0,col=0;x<size;x+=tile,col++){
   const w=Math.min(tile,size-x),h=Math.min(tile,size-y),flipX=col%2,flipY=row%2,
    cw=sw*w/tile,ch=sh*h/tile,sourceX=sx+(flipX?sw-cw:0),sourceY=sy+(flipY?sh-ch:0);
   c.save();
   try{
    c.translate(x+(flipX?w:0),y+(flipY?h:0));c.scale(flipX?-1:1,flipY?-1:1);
    c.drawImage(image,sourceX,sourceY,cw,ch,0,0,w,h);
   }finally{c.restore();}
  }
  return true;
 }catch{return false;}
 finally{c.restore();}
}
