/** Painted surface finish for the authored World scenes. The original art
 * sheets supply physical grain; scene palettes supply a restrained colour
 * direction. No gameplay data or cached 5.41 atlas is modified here. */
import {sceneArtSpec} from './scene-art-materials-541.js';

const SIZE=1024,TILE=512,MAX=3;
const defaultCache=new Map(),factoryCaches=new WeakMap();
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const css=(c,a=1)=>`rgba(${c.map(v=>Math.round(Math.max(0,Math.min(1,v))*255)).join(',')},${a})`;
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const ref=(sheet,col,row)=>Object.freeze({sheet,col,row});
const SHEETS=Object.freeze({materials:[4,2],scenicMaterials:[2,2],environmentSurfaces:[4,2],architectureMaterials:[3,2]});
const R=Object.freeze({grass:ref('scenicMaterials',0,0),earth:ref('scenicMaterials',1,0),pavers:ref('scenicMaterials',0,1),
 moss:ref('environmentSurfaces',0,0),wet:ref('environmentSurfaces',1,0),sand:ref('environmentSurfaces',2,0),aggregate:ref('environmentSurfaces',3,0),
 ice:ref('environmentSurfaces',0,1),amethyst:ref('environmentSurfaces',1,1),volcanic:ref('environmentSurfaces',2,1),chalk:ref('environmentSurfaces',3,1),
 stone:ref('materials',2,0),snowRock:ref('materials',3,0),leafEarth:ref('materials',0,1),warmPavers:ref('materials',0,0),
 timber:ref('architectureMaterials',0,0),masonry:ref('architectureMaterials',1,0),plaster:ref('architectureMaterials',2,0),
 darkTimber:ref('architectureMaterials',0,1),copper:ref('architectureMaterials',2,1)});

function floorRecipe(s){
 const kind=s.floorKind,style=s.style;
 if(kind==='timber')return{source:R.timber,recipe:'timber'};
 if(kind==='ceramic')return{source:R.plaster,recipe:'ceramic'};
 if(kind==='archive')return{source:R.masonry,recipe:'quiet-stone'};
 if(kind==='industrial')return{source:R.masonry,second:R.copper,alpha:.08,recipe:'industrial-stone'};
 if(kind==='flagstone')return{source:s.indoor||style==='marble'?R.masonry:R.pavers,recipe:'built-paving'};
 if(kind==='meadow')return{source:R.grass,second:style==='spore'?R.moss:undefined,alpha:.28,recipe:'living-ground'};
 if(kind==='loam')return{source:s.indoor?R.earth:R.wet,second:s.indoor?R.moss:style==='coral'?R.sand:style==='mangrove'?R.moss:R.earth,alpha:s.indoor?.20:style==='mangrove'?.30:.46,recipe:'damp-earth'};
 if(kind==='sand')return{source:R.sand,recipe:'sand'};
 if(kind==='ice')return{source:R.ice,second:style==='aurora'?R.amethyst:undefined,alpha:.20,recipe:'ice'};
 if(kind==='crust')return{source:R.chalk,second:R.sand,alpha:.12,recipe:'salt-crust'};
 // Mineral landscape is loose aggregate or continuous rock, never the
 // fitted blocks used by a constructed plaza or an indoor corridor.
 if(kind==='mineral')return{source:/lava|caldera|foundry/.test(style)?R.volcanic:style==='crystal'?R.amethyst:R.aggregate,
  second:/lava|caldera|foundry/.test(style)?R.earth:undefined,alpha:.18,quiet:!/lava|caldera|foundry/.test(style),recipe:'natural-mineral'};
 return{source:R.earth,recipe:'earth'};
}
const SPECS=new Map();
export function sceneSurfaceSpec542(world){
 const base=sceneArtSpec(world);if(!base)return null;if(SPECS.has(base.id))return SPECS.get(base.id);
 const floor=Object.freeze(floorRecipe(base)),wall=base.indoor?(base.floorKind==='industrial'?R.masonry:R.plaster):R.masonry;
 // Indoor identity is the room family, not its enclosing region. Its swatch
 // must stay identical whether the clinic/archive was first visited in a
 // coastal or volcanic scene; otherwise its calibrated average is unstable.
 const rock=base.indoor?R.stone:/ice|aurora/.test(base.style)?R.snowRock:/lava|caldera|foundry/.test(base.style)?R.volcanic:R.stone;
 const out=Object.freeze({...base,surfaceFloor:floor,surfaceWall:wall,surfaceMetal:R.copper,surfaceRock:rock});SPECS.set(base.id,out);return out;
}
function nativeCanvas(w,h){let c;if(typeof document!=='undefined')c=document.createElement('canvas');else if(typeof OffscreenCanvas==='function')c=new OffscreenCanvas(w,h);else return null;c.width=w;c.height=h;return c;}
function ready(image){const w=image?.naturalWidth||image?.width,h=image?.naturalHeight||image?.height;return Number.isFinite(w)&&Number.isFinite(h)&&w>=64&&h>=64&&image.complete!==false;}
function draw(ctx,assets,source,alpha=1){
 if(!source)return;const image=assets[source.sheet],[cols,rows]=SHEETS[source.sheet],w=(image.naturalWidth||image.width)/cols,h=(image.naturalHeight||image.height)/rows;
 ctx.globalAlpha=alpha;ctx.drawImage(image,source.col*w+1,source.row*h+1,w-2,h-2,0,0,TILE,TILE);ctx.globalAlpha=1;
}
function wash(ctx,color,{hue=.32,light=.12}={}){
 // 'color' preserves the painted luminosity and material relief. The light
 // wash is deliberately small so grout, foliage and stone do not flatten.
 ctx.globalCompositeOperation='color';ctx.globalAlpha=hue;ctx.fillStyle=css(color);ctx.fillRect(0,0,TILE,TILE);
 ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=light;ctx.fillStyle=css(color);ctx.fillRect(0,0,TILE,TILE);
 ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
}
function ceramicJoints(ctx,s){
 ctx.lineWidth=1.3;ctx.strokeStyle=css(tint(s.palette.floor,.48),.29);ctx.beginPath();
 for(let i=1;i<4;i++){const n=i*TILE/4;ctx.moveTo(n,0);ctx.lineTo(n,TILE);ctx.moveTo(0,n);ctx.lineTo(TILE,n);}ctx.stroke();
 ctx.lineWidth=.75;ctx.strokeStyle=css(mix(s.palette.floor,[1,1,.92],.5),.19);ctx.beginPath();
 for(let i=1;i<4;i++){const n=i*TILE/4+1.5;ctx.moveTo(n,0);ctx.lineTo(n,TILE);ctx.moveTo(0,n);ctx.lineTo(TILE,n);}ctx.stroke();
}
function paintQuadrant(ctx,assets,s,kind){
 if(kind==='floor'){
  if(s.surfaceFloor.quiet){
   // Cold mineral routes are a quiet value plane, with actual geological
   // grain below it. Full-strength pebbles across both route and banks read
   // like carpet and destroy the readable silhouette of crystal and storm
   // mechanisms. Preserve the source texture without its full dark contrast.
   ctx.fillStyle=css(tint(s.palette.floor,.85));ctx.fillRect(0,0,TILE,TILE);
   draw(ctx,assets,s.surfaceFloor.source,.26);
  }else draw(ctx,assets,s.surfaceFloor.source);
  draw(ctx,assets,s.surfaceFloor.second,s.surfaceFloor.alpha);
  wash(ctx,s.palette.floor,{hue:s.floorKind==='ceramic'?.84:s.floorKind==='timber'?.22:.38,light:.12});
  if(s.floorKind==='ceramic')ceramicJoints(ctx,s);
 }else if(kind==='wall'){
  draw(ctx,assets,s.surfaceWall);wash(ctx,s.palette.wall,{hue:s.floorKind==='ceramic'?.82:.42,light:.11});
 }else if(kind==='metal'){
  draw(ctx,assets,s.surfaceMetal);wash(ctx,s.palette.metal,{hue:.68,light:.16});
 }else{
  draw(ctx,assets,s.surfaceRock);wash(ctx,s.palette.rock,{hue:.48,light:.12});
  // Closed rock keeps a lower value than the route without painting the
  // route itself dark. This is a material tint, not a screen-wide filter.
  ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.42;ctx.fillStyle=css(mix(s.palette.rock,[.12,.16,.18],.35));ctx.fillRect(0,0,TILE,TILE);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
 }
}

// CALIBRATED_SURFACE_AVERAGES_START
const AVERAGES={
 "outdoor:village": [
  [
   0.39688,
   0.4243,
   0.20878
  ],
  [
   0.82444,
   0.73849,
   0.59207
  ],
  [
   0.50514,
   0.43377,
   0.28555
  ],
  [
   0.42697,
   0.46118,
   0.46044
  ]
 ],
 "outdoor:woodland": [
  [
   0.37272,
   0.42664,
   0.22052
  ],
  [
   0.79855,
   0.745,
   0.61497
  ],
  [
   0.45105,
   0.45159,
   0.34042
  ],
  [
   0.40582,
   0.4546,
   0.4736
  ]
 ],
 "outdoor:riverbank": [
  [
   0.42894,
   0.40784,
   0.30412
  ],
  [
   0.80631,
   0.74434,
   0.61905
  ],
  [
   0.35624,
   0.49059,
   0.43113
  ],
  [
   0.39685,
   0.46751,
   0.48796
  ]
 ],
 "outdoor:highland": [
  [
   0.505,
   0.56186,
   0.54105
  ],
  [
   0.79456,
   0.74621,
   0.64515
  ],
  [
   0.42497,
   0.4692,
   0.37723
  ],
  [
   0.41837,
   0.46456,
   0.49596
  ]
 ],
 "outdoor:ruins": [
  [
   0.47182,
   0.46052,
   0.42799
  ],
  [
   0.81563,
   0.73453,
   0.63674
  ],
  [
   0.44713,
   0.43698,
   0.43697
  ],
  [
   0.44103,
   0.45054,
   0.49157
  ]
 ],
 "outdoor:foundry": [
  [
   0.78015,
   0.71429,
   0.60818
  ],
  [
   0.82578,
   0.73394,
   0.59744
  ],
  [
   0.53449,
   0.42908,
   0.25423
  ],
  [
   0.16176,
   0.17646,
   0.1819
  ]
 ],
 "outdoor:storm": [
  [
   0.43612,
   0.52612,
   0.52479
  ],
  [
   0.81063,
   0.74012,
   0.62658
  ],
  [
   0.53971,
   0.42843,
   0.24597
  ],
  [
   0.38598,
   0.45367,
   0.49222
  ]
 ],
 "outdoor:salt": [
  [
   0.73009,
   0.69958,
   0.63517
  ],
  [
   0.82019,
   0.74187,
   0.61345
  ],
  [
   0.46756,
   0.45567,
   0.31606
  ],
  [
   0.43657,
   0.47375,
   0.48239
  ]
 ],
 "outdoor:coral": [
  [
   0.48465,
   0.45881,
   0.34741
  ],
  [
   0.83961,
   0.72913,
   0.61752
  ],
  [
   0.48378,
   0.45547,
   0.30345
  ],
  [
   0.4063,
   0.48522,
   0.49113
  ]
 ],
 "outdoor:mangrove": [
  [
   0.30293,
   0.33576,
   0.22334
  ],
  [
   0.80512,
   0.74281,
   0.61986
  ],
  [
   0.37882,
   0.48885,
   0.37262
  ],
  [
   0.39341,
   0.46818,
   0.48237
  ]
 ],
 "outdoor:sand": [
  [
   0.73991,
   0.6028,
   0.40397
  ],
  [
   0.83363,
   0.73827,
   0.58188
  ],
  [
   0.51517,
   0.44311,
   0.25215
  ],
  [
   0.48999,
   0.46012,
   0.42255
  ]
 ],
 "outdoor:cactus": [
  [
   0.72249,
   0.61188,
   0.39976
  ],
  [
   0.82886,
   0.73985,
   0.58227
  ],
  [
   0.48719,
   0.45151,
   0.26338
  ],
  [
   0.47004,
   0.47139,
   0.42083
  ]
 ],
 "outdoor:ice": [
  [
   0.69278,
   0.77215,
   0.84241
  ],
  [
   0.79842,
   0.74706,
   0.65208
  ],
  [
   0.38744,
   0.48021,
   0.44822
  ],
  [
   0.24079,
   0.34066,
   0.42375
  ]
 ],
 "outdoor:aurora": [
  [
   0.60861,
   0.68076,
   0.75579
  ],
  [
   0.79677,
   0.74365,
   0.67269
  ],
  [
   0.40975,
   0.46202,
   0.46778
  ],
  [
   0.25373,
   0.32604,
   0.42334
  ]
 ],
 "outdoor:lava": [
  [
   0.3475,
   0.28555,
   0.23911
  ],
  [
   0.82441,
   0.73087,
   0.62051
  ],
  [
   0.52581,
   0.42246,
   0.2998
  ],
  [
   0.16737,
   0.16537,
   0.17478
  ]
 ],
 "outdoor:caldera": [
  [
   0.3513,
   0.28496,
   0.23256
  ],
  [
   0.82994,
   0.73135,
   0.60429
  ],
  [
   0.53589,
   0.42708,
   0.26357
  ],
  [
   0.17464,
   0.16735,
   0.17278
  ]
 ],
 "outdoor:spore": [
  [
   0.38246,
   0.41012,
   0.25226
  ],
  [
   0.81042,
   0.73987,
   0.63702
  ],
  [
   0.44254,
   0.45416,
   0.39201
  ],
  [
   0.41046,
   0.46748,
   0.47647
  ]
 ],
 "outdoor:crystal": [
  [
   0.49911,
   0.55903,
   0.57543
  ],
  [
   0.79295,
   0.74809,
   0.65462
  ],
  [
   0.42368,
   0.47312,
   0.39168
  ],
  [
   0.41902,
   0.46206,
   0.51602
  ]
 ],
 "outdoor:marble": [
  [
   0.80442,
   0.74325,
   0.64314
  ],
  [
   0.8118,
   0.74373,
   0.62939
  ],
  [
   0.47181,
   0.46399,
   0.30501
  ],
  [
   0.4413,
   0.47173,
   0.49898
  ]
 ],
 "interior:home": [
  [
   0.6979,
   0.49963,
   0.2677
  ],
  [
   0.92798,
   0.85679,
   0.73148
  ],
  [
   0.51272,
   0.44272,
   0.26303
  ],
  [
   0.43123,
   0.4598,
   0.46714
  ]
 ],
 "interior:hospitality": [
  [
   0.70312,
   0.49725,
   0.26841
  ],
  [
   0.9374,
   0.85228,
   0.7296
  ],
  [
   0.52004,
   0.44456,
   0.2566
  ],
  [
   0.44307,
   0.4633,
   0.47443
  ]
 ],
 "interior:care": [
  [
   0.85001,
   0.87839,
   0.81232
  ],
  [
   0.87197,
   0.87545,
   0.79655
  ],
  [
   0.40212,
   0.49189,
   0.37033
  ],
  [
   0.42885,
   0.47682,
   0.47989
  ]
 ],
 "interior:craft": [
  [
   0.69713,
   0.49951,
   0.27187
  ],
  [
   0.93379,
   0.85543,
   0.72607
  ],
  [
   0.53385,
   0.43548,
   0.251
  ],
  [
   0.44624,
   0.4634,
   0.46111
  ]
 ],
 "interior:archive": [
  [
   0.80804,
   0.73288,
   0.65789
  ],
  [
   0.92021,
   0.85685,
   0.75542
  ],
  [
   0.48666,
   0.45578,
   0.29294
  ],
  [
   0.43917,
   0.4581,
   0.49896
  ]
 ],
 "interior:civic": [
  [
   0.80952,
   0.73873,
   0.63672
  ],
  [
   0.92392,
   0.85757,
   0.74293
  ],
  [
   0.47689,
   0.46039,
   0.29161
  ],
  [
   0.44178,
   0.47147,
   0.49489
  ]
 ],
 "interior:water": [
  [
   0.82573,
   0.88671,
   0.83049
  ],
  [
   0.86586,
   0.87873,
   0.78868
  ],
  [
   0.39322,
   0.48973,
   0.38045
  ],
  [
   0.40399,
   0.48062,
   0.50013
  ]
 ],
 "interior:garden": [
  [
   0.55666,
   0.49589,
   0.30863
  ],
  [
   0.9196,
   0.86024,
   0.74344
  ],
  [
   0.46716,
   0.46178,
   0.31813
  ],
  [
   0.41287,
   0.4699,
   0.48374
  ]
 ],
 "interior:industrial": [
  [
   0.77611,
   0.71888,
   0.61338
  ],
  [
   0.80795,
   0.74243,
   0.62232
  ],
  [
   0.48666,
   0.45578,
   0.29294
  ],
  [
   0.42871,
   0.45987,
   0.48078
  ]
 ],
 "sable-reed:exterior": [
  [
   0.39688,
   0.4243,
   0.20878
  ],
  [
   0.83077,
   0.73677,
   0.5911
  ],
  [
   0.51021,
   0.44321,
   0.26599
  ],
  [
   0.42697,
   0.46118,
   0.46044
  ]
 ],
 "sable-reed:interior": [
  [
   0.6979,
   0.49963,
   0.2677
  ],
  [
   0.93307,
   0.85612,
   0.72218
  ],
  [
   0.51021,
   0.44321,
   0.26599
  ],
  [
   0.43123,
   0.4598,
   0.46714
  ]
 ],
 "iona-lowbank:exterior": [
  [
   0.42894,
   0.40784,
   0.30412
  ],
  [
   0.8021,
   0.74741,
   0.63688
  ],
  [
   0.47335,
   0.46222,
   0.29888
  ],
  [
   0.39685,
   0.46751,
   0.48796
  ]
 ],
 "iona-lowbank:interior": [
  [
   0.85001,
   0.87839,
   0.81232
  ],
  [
   0.86925,
   0.87593,
   0.79996
  ],
  [
   0.47335,
   0.46222,
   0.29888
  ],
  [
   0.42885,
   0.47682,
   0.47989
  ]
 ],
 "rook-regulator:exterior": [
  [
   0.78015,
   0.71429,
   0.60818
  ],
  [
   0.83723,
   0.72835,
   0.59951
  ],
  [
   0.54293,
   0.43095,
   0.25168
  ],
  [
   0.16176,
   0.17646,
   0.1819
  ]
 ],
 "rook-regulator:interior": [
  [
   0.77611,
   0.71888,
   0.61338
  ],
  [
   0.83723,
   0.72835,
   0.59951
  ],
  [
   0.54293,
   0.43095,
   0.25168
  ],
  [
   0.42871,
   0.45987,
   0.48078
  ]
 ],
 "brass-rail:exterior": [
  [
   0.78015,
   0.71429,
   0.60818
  ],
  [
   0.79069,
   0.74342,
   0.65792
  ],
  [
   0.50627,
   0.45275,
   0.2675
  ],
  [
   0.16176,
   0.17646,
   0.1819
  ]
 ],
 "brass-rail:interior": [
  [
   0.77611,
   0.71888,
   0.61338
  ],
  [
   0.79069,
   0.74342,
   0.65792
  ],
  [
   0.50627,
   0.45275,
   0.2675
  ],
  [
   0.42871,
   0.45987,
   0.48078
  ]
 ],
 "riven-tide:exterior": [
  [
   0.42894,
   0.40784,
   0.30412
  ],
  [
   0.80495,
   0.74461,
   0.62672
  ],
  [
   0.3751,
   0.49303,
   0.39552
  ],
  [
   0.39685,
   0.46751,
   0.48796
  ]
 ],
 "riven-tide:interior": [
  [
   0.82573,
   0.88671,
   0.83049
  ],
  [
   0.87712,
   0.87376,
   0.78303
  ],
  [
   0.3751,
   0.49303,
   0.39552
  ],
  [
   0.40399,
   0.48062,
   0.50013
  ]
 ],
 "mira-archive:exterior": [
  [
   0.39688,
   0.4243,
   0.20878
  ],
  [
   0.82309,
   0.73591,
   0.62606
  ],
  [
   0.49507,
   0.4555,
   0.28189
  ],
  [
   0.42697,
   0.46118,
   0.46044
  ]
 ],
 "mira-archive:interior": [
  [
   0.80804,
   0.73288,
   0.65789
  ],
  [
   0.92569,
   0.85468,
   0.75448
  ],
  [
   0.49507,
   0.4555,
   0.28189
  ],
  [
   0.43917,
   0.4581,
   0.49896
  ]
 ]
};
// CALIBRATED_SURFACE_AVERAGES_END

export function createSceneSurfaceAtlas542(world,assets={}, {createCanvas}={}){
 const s=sceneSurfaceSpec542(world);if(!s)return null;
 // The host owns fallback. Do not call the cached 5.41 factory here: doing so
 // would retain two independent three-atlas caches during ordinary play.
 if(Object.keys(SHEETS).some(k=>!ready(assets[k])))return null;
 let cache=defaultCache;if(createCanvas){cache=factoryCaches.get(createCanvas);if(!cache){cache=new Map();factoryCaches.set(createCanvas,cache);}}
 const inputs=Object.keys(SHEETS).map(k=>assets[k]),old=cache.get(s.id);
 if(old&&old.inputs.every((v,i)=>v===inputs[i])){cache.delete(s.id);cache.set(s.id,old);return old.canvas;}
 const canvas=(createCanvas||nativeCanvas)(SIZE,SIZE);if(!canvas)return null;canvas.width=canvas.height=SIZE;const ctx=canvas.getContext?.('2d');if(!ctx)return null;
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=true;
 for(const[k,x,y]of[['floor',0,0],['wall',TILE,0],['metal',0,TILE],['rock',TILE,TILE]]){ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.rect(0,0,TILE,TILE);ctx.clip();paintQuadrant(ctx,assets,s,k);ctx.restore();}ctx.restore();
 const averages=AVERAGES[s.id]||[s.palette.floor,s.palette.wall,s.palette.metal,s.palette.rock];
 canvas.observatoryMaterialAverages=Object.freeze(averages.map(c=>Object.freeze(c.slice())));canvas.sceneArtMaterialAverages=canvas.observatoryMaterialAverages;
 canvas.sceneArtTheme=s.id;canvas.sceneSurface542=Object.freeze({schema:'ash-aether.painted-surfaces/1',theme:s.id,floor:s.surfaceFloor.recipe});
 cache.delete(s.id);cache.set(s.id,{canvas,inputs});while(cache.size>MAX)cache.delete(cache.keys().next().value);return canvas;
}
export const SCENE_SURFACES_542=Object.freeze({width:SIZE,height:SIZE,tileSize:TILE,maxCachedAtlases:MAX,rgbaBytesPerAtlas:SIZE*SIZE*4,quadrants:Object.freeze(['floor','wall','metal','rock'])});
