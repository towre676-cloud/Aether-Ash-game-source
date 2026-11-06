/** Original painted tree canopies. Selection changes only the visible tree at an
 * already-safe scenic site; it never creates a site or touches world state. */
export const ENVIRONMENT_CANOPY_FILE='environment-canopies-v17.webp';
export const ENVIRONMENT_CANOPY_ASSET='environmentCanopies';
export const ENVIRONMENT_CANOPY_COVERAGE=52;
export const ENVIRONMENT_CANOPY_SIZE=Object.freeze([1774,887]);

// Source rectangles and root anchors are measured from the delivered PNG.
// Adjacent lower crowns have overlapping bounding boxes. Their disjoint source
// strips preserve every branch without drawing a neighbour or editing pixels.
// Each strip keeps its original source-space offset from the one root anchor.
export const ENVIRONMENT_CANOPIES=Object.freeze([
 {id:'orchard-apple',label:'Orchard apple',crop:[0,11,452,423],opaque:[0,15,448,415],anchor:[230,420],height:174},
 {id:'hazel-coppice',label:'Hazel coppice',crop:[454,4,424,431],opaque:[458,8,416,423],anchor:[650,420],height:181},
 {id:'river-alder',label:'River alder',crop:[893,12,430,425],opaque:[897,16,422,417],anchor:[1038,424],height:195},
 {id:'mangrove-cypress',label:'Mangrove cypress',crop:[1334,13,440,424],opaque:[1338,17,436,416],anchor:[1555,424],height:202},
 {id:'snow-spruce',label:'Snow spruce',crop:[30,437,359,436],opaque:[34,441,351,428],anchor:[210,859],height:214},
 {id:'storm-juniper',label:'Storm juniper',crop:[416,457,519,406],opaque:[420,461,511,398],anchor:[615,849],height:185,parts:[[416,457,477,95],[416,552,454,39],[416,591,476,47],[416,638,519,225]]},
 {id:'desert-acacia',label:'Desert acacia',crop:[869,462,499,405],opaque:[873,466,491,397],anchor:[1135,851],height:181,parts:[[893,462,475,90],[870,552,498,31],[870,583,457,8],[892,591,435,47],[937,638,390,229]]},
 {id:'spore-canopy',label:'Spore fungal canopy',crop:[1330,452,436,419],opaque:[1334,456,428,411],anchor:[1582,858],height:201,parts:[[1368,452,398,131],[1330,583,436,288]]}
].map(p=>Object.freeze({...p,crop:Object.freeze(p.crop),opaque:Object.freeze(p.opaque),anchor:Object.freeze(p.anchor),parts:Object.freeze((p.parts||[p.crop]).map(r=>Object.freeze(r)))})));

export const CANOPY_STYLE_POOLS=Object.freeze({
 village:Object.freeze(['orchard-apple','hazel-coppice']),
 woodland:Object.freeze(['hazel-coppice','orchard-apple']),
 riverbank:Object.freeze(['river-alder']),
 river:Object.freeze(['river-alder']),
 mangrove:Object.freeze(['mangrove-cypress']),
 ice:Object.freeze(['snow-spruce']),
 glacier:Object.freeze(['snow-spruce']),
 aurora:Object.freeze(['snow-spruce']),
 highland:Object.freeze(['storm-juniper']),
 storm:Object.freeze(['storm-juniper']),
 sand:Object.freeze(['desert-acacia']),
 dunes:Object.freeze(['desert-acacia']),
 cactus:Object.freeze(['desert-acacia']),
 desert:Object.freeze(['desert-acacia']),
 spore:Object.freeze(['spore-canopy'])
});
const mix=seed=>{let n=seed>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return(n^(n>>>16))>>>0;};
const validImage=image=>!!image&&image.complete!==false&&image.width===ENVIRONMENT_CANOPY_SIZE[0]&&image.height===ENVIRONMENT_CANOPY_SIZE[1];
const cropFits=(image,p)=>validImage(image)&&p.crop[0]+p.crop[2]<=image.width&&p.crop[1]+p.crop[3]<=image.height;

export function selectEnvironmentCanopy(seed,style='woodland'){
 const pool=CANOPY_STYLE_POOLS[style];if(!pool||!Number.isFinite(seed))return null;
 const n=mix((seed>>>0)^0x1a7c4e93);if(n%100>=ENVIRONMENT_CANOPY_COVERAGE)return null;
 const id=pool[mix(n^0x59c726d1)%pool.length];return ENVIRONMENT_CANOPIES.find(p=>p.id===id)||null;
}

/** One measured source crop, one measured root anchor, one uniform scale. The
 * opaque bounds travel through the same root-centered reflection as the pixels.
 * Gallery specs keep their original orientation unless explicitly requested;
 * wind-shaped junipers always retain the prevailing wind direction. */
export function environmentCanopySpec(id,{height,flip=false}={}){
 const p=typeof id==='string'?ENVIRONMENT_CANOPIES.find(v=>v.id===id):null;if(!p)return null;
 const h=Number.isFinite(height)?Math.max(96,Math.min(240,height)):p.height;
 const [sx,sy,sw,sh]=p.crop,[ax,ay]=p.anchor,[ox,oy,ow,oh]=p.opaque;
 const scale=Math.min(h/oh,240/sw,240/sh),flipped=flip===true&&p.id!=='storm-juniper';
 return {id:p.id,canopy:p,source:p.crop,parts:p.parts,scale,flip:flipped,
  draw:{x:(flipped?ax-sx-sw:sx-ax)*scale,y:(sy-ay)*scale,w:sw*scale,h:sh*scale},
  opaque:{left:(flipped?ax-ox-ow:ox-ax)*scale,top:(oy-ay)*scale,right:(flipped?ax-ox:ox+ow-ax)*scale,bottom:(oy+oh-ay)*scale}};
}

export function environmentCanopyGeometry(seed,style,image){
 const p=selectEnvironmentCanopy(seed,style);if(!p||!cropFits(image,p))return null;
 return environmentCanopySpec(p.id,{height:p.height+(mix(seed^0x3785a9c1)%17)-8,flip:p.id!=='storm-juniper'&&!!(mix(seed^0x6c8e9cf5)&1)});
}

/** Works identically in Standard and Compatibility rendering: no pixel reads,
 * offscreen textures, GPU filters, or image mutation. Coordinates are pixels. */
export function drawEnvironmentCanopy(c,image,spec,x,y,alpha=1){
 if(!c||!spec?.canopy||!cropFits(image,spec.canopy)||![x,y,alpha,spec.scale,...Object.values(spec.draw)].every(Number.isFinite))return false;
 c.save();try{c.globalAlpha*=Math.max(0,Math.min(1,alpha));if(spec.flip){c.translate(x,y);c.scale(-1,1);x=0;y=0;}const [ax,ay]=spec.canopy.anchor,s=spec.scale;for(const [sx,sy,sw,sh] of spec.parts)c.drawImage(image,sx,sy,sw,sh,x+(sx-ax)*s,y+(sy-ay)*s,sw*s,sh*s);return true;}catch{return false;}finally{c.restore();}
}
