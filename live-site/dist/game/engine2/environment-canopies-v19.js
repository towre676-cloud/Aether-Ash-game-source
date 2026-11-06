import {selectEnvironmentCanopy} from './environment-canopies-v17.js?v=5.18.0';
/** Age and exposure variants for the existing scenic-tree sites. This registry
 * changes artwork only; its deterministic sampling does not create trees. */
export const CANOPY_VARIATION_FILE='environment-canopy-variations-v19.webp';
export const CANOPY_VARIATION_ASSET='environmentCanopyVariations';
export const CANOPY_VARIATION_SIZE=Object.freeze([1774,887]);
export const CANOPY_VARIATION_COVERAGE=32;

// Measured alpha>32 bodies plus a four-pixel fringe. The last two crowns have
// overlapping rectangular envelopes, so disjoint source strips retain every
// visible branch without importing the neighbouring tree. Original PNG intact.
export const CANOPY_VARIATIONS=Object.freeze([
 {id:'elder-orchard',label:'Hollow orchard elder',crop:[15,30,429,385],opaque:[19,34,421,377],anchor:[229,402],height:178},
 {id:'open-coppice',label:'Open-crowned coppice',crop:[454,25,470,401],opaque:[458,29,462,393],anchor:[674,411],height:184},
 {id:'leaning-alder',label:'Leaning river alder',crop:[981,6,331,445],opaque:[985,10,323,437],anchor:[1192,435],height:202},
 {id:'stilt-mangrove',label:'Young stilt-root mangrove',crop:[1386,34,347,388],opaque:[1390,38,339,380],anchor:[1565,408],height:186},
 {id:'broken-spruce',label:'Broken-top alpine spruce',crop:[60,430,333,439],opaque:[64,434,325,431],anchor:[216,852],height:216},
 {id:'open-larch',label:'Open winter larch',crop:[503,431,339,442],opaque:[507,435,331,434],anchor:[679,855],height:207},
 {id:'low-juniper',label:'Low wind-pruned juniper',crop:[911,526,483,316],opaque:[915,530,475,308],anchor:[1060,826],height:177,wind:true,parts:[[911,526,483,238],[911,764,417,78]]},
 {id:'split-birch',label:'Wind-split upland birch',crop:[1369,450,393,406],opaque:[1373,454,385,398],anchor:[1503,839],height:195,wind:true,parts:[[1395,450,367,314],[1369,764,393,92]]}
].map(p=>Object.freeze({...p,crop:Object.freeze(p.crop),opaque:Object.freeze(p.opaque),anchor:Object.freeze(p.anchor),parts:Object.freeze((p.parts||[p.crop]).map(r=>Object.freeze(r)))})));

export const CANOPY_VARIATION_POOLS=Object.freeze(Object.fromEntries(Object.entries({
 village:['elder-orchard','open-coppice'],woodland:['open-coppice','elder-orchard'],
 riverbank:['leaning-alder'],river:['leaning-alder'],mangrove:['stilt-mangrove'],
 ice:['broken-spruce','open-larch'],glacier:['broken-spruce','open-larch'],aurora:['broken-spruce','open-larch'],
 highland:['low-juniper','split-birch'],storm:['low-juniper','split-birch']
}).map(([k,v])=>[k,Object.freeze(v)])));
const mix=seed=>{let n=seed>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return(n^(n>>>16))>>>0;};
const ready=image=>!!image&&image.complete!==false&&image.width===CANOPY_VARIATION_SIZE[0]&&image.height===CANOPY_VARIATION_SIZE[1];

export function selectCanopyVariation(seed,style='woodland'){
 const pool=CANOPY_VARIATION_POOLS[style];if(!pool||!Number.isFinite(seed))return null;
 // Storm terrain previously admitted only the v17 painted cohort. Vary that
 // same cohort so an art pass does not quietly turn sparse uplands into forest.
 if(style==='storm'&&!selectEnvironmentCanopy(seed,style))return null;
 const n=mix((seed>>>0)^0x4d927a31);if(n%100>=(style==='storm'?62:CANOPY_VARIATION_COVERAGE))return null;
 return CANOPY_VARIATIONS.find(p=>p.id===pool[mix(n^0x1437ec91)%pool.length])||null;
}

export function canopyVariationSpec(id,{height,flip=false}={}){
 const p=CANOPY_VARIATIONS.find(p=>p.id===id);if(!p)return null;
 const h=Number.isFinite(height)?Math.max(96,Math.min(240,height)):p.height;
 const [sx,sy,sw,sh]=p.crop,[ax,ay]=p.anchor,[ox,oy,ow,oh]=p.opaque;
 const scale=Math.min(h/oh,240/sw,240/sh),flipped=flip===true&&!p.wind;
 return {id:p.id,collection:'v19',asset:CANOPY_VARIATION_ASSET,canopy:p,source:p.crop,parts:p.parts,scale,flip:flipped,
  draw:{x:(flipped?ax-sx-sw:sx-ax)*scale,y:(sy-ay)*scale,w:sw*scale,h:sh*scale},
  opaque:{left:(flipped?ax-ox-ow:ox-ax)*scale,top:(oy-ay)*scale,right:(flipped?ax-ox:ox+ow-ax)*scale,bottom:(oy+oh-ay)*scale}};
}

export function canopyVariationGeometry(seed,style,image){
 if(!ready(image))return null;const p=selectCanopyVariation(seed,style);if(!p)return null;
 return canopyVariationSpec(p.id,{height:p.height+(mix(seed^0x48b196d3)%15)-7,flip:!p.wind&&!!(mix(seed^0x69d31a47)&1)});
}

/** Root registration and source strips are identical in every render mode. */
export function drawCanopyVariation(c,image,spec,x,y,alpha=1){
 if(!c||!ready(image)||!spec?.canopy||spec.collection!=='v19'||![x,y,alpha,spec.scale,...Object.values(spec.draw)].every(Number.isFinite))return false;
 c.save();try{c.globalAlpha*=Math.max(0,Math.min(1,alpha));if(spec.flip){c.translate(x,y);c.scale(-1,1);x=0;y=0;}
  const [ax,ay]=spec.canopy.anchor,s=spec.scale;for(const [sx,sy,sw,sh]of spec.parts)c.drawImage(image,sx,sy,sw,sh,x+(sx-ax)*s,y+(sy-ay)*s,sw*s,sh*s);return true;
 }catch{return false;}finally{c.restore();}
}
