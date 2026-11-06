import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {SCENE_ART_THEME_SAMPLES,sceneArtSpec,createSceneArtAtlas} from '../scene-art-materials-541.js';
import {createSceneSurfaceAtlas542,sceneSurfaceSpec542,SCENE_SURFACES_542} from '../scene-surface-finish-542.js';

let raster;try{raster=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd(),'scene-surfaces-test.cjs'))('@napi-rs/canvas');}catch{}
const options={skip:!raster&&'The optional actual Canvas raster backend is unavailable'};
let loaded;
async function assets(){if(!loaded)loaded=Promise.all(Object.entries({materials:'world-materials-v3.webp',scenicMaterials:'scenic-materials-v12.webp',environmentSurfaces:'environment-surfaces-v17.webp',architectureMaterials:'architectural-materials-v4.webp'}).map(async([key,file])=>[key,await raster.loadImage(fileURLToPath(new URL('../art/'+file,import.meta.url)))])).then(Object.fromEntries);return loaded;}
const outdoor=style=>({scene:{key:'field',biome:{style}}}),room=kind=>({scene:{key:kind,household:{kind}}});
function average(data){const sums=Array.from({length:4},()=>[0,0,0]);for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){const i=(y*1024+x)*4,k=(x>=512?1:0)+(y>=512?2:0);for(let c=0;c<3;c++)sums[k][c]+=data[i+c];}return sums.map(c=>c.map(v=>v/(512*512*255)));}
function detail(data){let sum=0,n=0;for(let y=2;y<510;y+=3)for(let x=2;x<510;x+=3){const a=(y*1024+x)*4,b=(y*1024+x+1)*4;sum+=Math.abs(data[a]-data[b])+Math.abs(data[a+1]-data[b+1])+Math.abs(data[a+2]-data[b+2]);n+=3;}return sum/n;}

test('all165 native World scenes retain their identities and data, including protected Veyr',()=>{
 const w=new World(source),before=JSON.stringify([...w.scenes]),ids=new Set();let active=0,protectedCount=0;
 for(const scene of w.scenes.values()){const s=sceneSurfaceSpec542({scene}),old=sceneArtSpec({scene});if(scene.originId==='veyr-storm'){assert.equal(s,null);protectedCount++;continue;}
  assert.ok(Object.isFrozen(s)&&Object.isFrozen(s.surfaceFloor));assert.equal(s.id,old.id);assert.equal(s.palette,old.palette);assert.equal(s.lighting,old.lighting);ids.add(s.id);active++;
  if(!s.indoor&&s.floorKind==='mineral')assert.equal(s.surfaceFloor.recipe,'natural-mineral','geological terrain never inherits constructed fitted paving');
  if(s.floorKind==='ceramic')assert.equal(s.surfaceFloor.recipe,'ceramic','care rooms and water interiors do not receive outdoor gravel');
 }
 assert.equal(active,165);assert.equal(protectedCount,2);assert.ok(ids.size>=30,'raw native scenes retain their regional and room identities');assert.equal(JSON.stringify([...w.scenes]),before);
});

test('the actual painted atlases carry forty accurate small-face averages without runtime readback',options,async()=>{
 const images=await assets(),seen=new Set(),signatures=new Set();let allocations=0;
 const readers=new WeakMap(),factory=(w,h)=>{allocations++;const canvas=raster.createCanvas(w,h),ctx=canvas.getContext('2d');readers.set(canvas,ctx.getImageData.bind(ctx));ctx.getImageData=()=>{throw Error('production atlas painter attempted readback');};return canvas;};
 for(const world of SCENE_ART_THEME_SAMPLES){const s=sceneSurfaceSpec542(world);if(seen.has(s.id))continue;seen.add(s.id);const saved=JSON.stringify(world),atlas=createSceneSurfaceAtlas542(world,images,{createCanvas:factory});
  assert.equal(atlas.width,1024);assert.equal(atlas.height,1024);assert.equal(atlas.sceneArtTheme,s.id);assert.equal(atlas.sceneArtMaterialAverages,atlas.observatoryMaterialAverages);
  const data=readers.get(atlas)(0,0,1024,1024).data,measured=average(data);
  for(let k=0;k<4;k++)for(let c=0;c<3;c++)assert.ok(Math.abs(measured[k][c]-atlas.observatoryMaterialAverages[k][c])<.015,`${s.id} swatch ${k} channel ${c} uses the real painted average`);
  signatures.add(createHash('sha256').update(data).digest('hex'));assert.equal(JSON.stringify(world),saved);
 }
 assert.equal(seen.size,40);assert.equal(signatures.size,40,'regional and remembered-life palettes remain visibly distinct');assert.equal(allocations,40,'no hidden base atlas is allocated by the painted finish');
});

test('actual grass, volcanic ground and timber retain physical grain while clinic floors remain quiet',options,async()=>{
 const images=await assets(),factory=raster.createCanvas,measure=atlas=>detail(atlas.getContext('2d').getImageData(0,0,1024,1024).data),qualities=[];
 for(const world of[outdoor('woodland'),outdoor('lava'),room('home')]){
  const atlas=createSceneSurfaceAtlas542(world,images,{createCanvas:factory}),old=createSceneArtAtlas(world,{}, {createCanvas:factory}),painted=measure(atlas),procedural=measure(old);
  assert.ok(painted>1.25&&painted>procedural*1.12,`${atlas.sceneArtTheme} has resolved physical grain: ${painted.toFixed(2)} vs ${procedural.toFixed(2)}`);qualities.push(painted);
 }
 const clinic=measure(createSceneSurfaceAtlas542(room('clinic'),images,{createCanvas:factory}));assert.ok(clinic<qualities[1]*.55,'clinic plaster-grain ceramic remains much quieter than volcanic aggregate');
});

test('cold mineral routes stay lighter than closed rock and quieter than a hot aggregate field',options,async()=>{
 const images=await assets(),factory=raster.createCanvas,data=world=>createSceneSurfaceAtlas542(world,images,{createCanvas:factory}).getContext('2d').getImageData(0,0,1024,1024).data;
 const hotDetail=detail(data(outdoor('lava'))),luma=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
 for(const style of['crystal','storm','highland']){
  const actual=data(outdoor(style)),a=average(actual),grain=detail(actual);
  assert.ok(luma(a[0])>luma(a[3])+.045,style+' has a readable walking plane against the darker geological riser');
  assert.ok(grain>.25&&grain<hotDetail*.65,style+' retains subdued mineral grain without full-strength gravel contrast');
 }
});

test('three-atlas LRU retains live surfaces, invalidates changed images and never touches the 541 cached canvas',options,async()=>{
 const images=await assets();let count=0;const factory=(w,h)=>{count++;return raster.createCanvas(w,h);},a=outdoor('woodland'),b=room('home'),c=outdoor('ice'),d=room('archive');
 const first=createSceneSurfaceAtlas542(a,images,{createCanvas:factory}),home=createSceneSurfaceAtlas542(b,images,{createCanvas:factory});createSceneSurfaceAtlas542(c,images,{createCanvas:factory});assert.equal(count,3);
 assert.equal(createSceneSurfaceAtlas542(b,images,{createCanvas:factory}),home);createSceneSurfaceAtlas542(d,images,{createCanvas:factory});assert.equal(count,4);
 assert.notEqual(createSceneSurfaceAtlas542(a,images,{createCanvas:factory}),first);assert.equal(count,5);assert.equal(first.width,1024);assert.equal(first.height,1024);
 const altered={...images,scenicMaterials:await raster.loadImage(fileURLToPath(new URL('../art/scenic-materials-v12.webp',import.meta.url)))};
 assert.notEqual(createSceneSurfaceAtlas542(a,altered,{createCanvas:factory}),createSceneSurfaceAtlas542(a,images,{createCanvas:factory}),'reloaded assets rebuild the same theme');
 const base=createSceneArtAtlas(b,{}, {createCanvas:factory}),before=createHash('sha256').update(base.getContext('2d').getImageData(0,0,1024,1024).data).digest('hex');
 createSceneSurfaceAtlas542(b,images,{createCanvas:factory});assert.equal(createHash('sha256').update(base.getContext('2d').getImageData(0,0,1024,1024).data).digest('hex'),before);
 assert.equal(SCENE_SURFACES_542.maxCachedAtlases,3);assert.equal(SCENE_SURFACES_542.rgbaBytesPerAtlas,4*1024*1024);
});

test('missing optional art or drawing surface delegates to the existing host fallback',options,async()=>{
 const images=await assets(),world=room('home');assert.equal(createSceneSurfaceAtlas542(world,{}),null);assert.equal(createSceneSurfaceAtlas542(world,{...images,environmentSurfaces:null}),null);
 let tries=0;const factory=(w,h)=>++tries===1?null:raster.createCanvas(w,h);assert.equal(createSceneSurfaceAtlas542(world,images,{createCanvas:factory}),null);assert.ok(createSceneSurfaceAtlas542(world,images,{createCanvas:factory}));assert.equal(tries,2);
 assert.equal(createSceneSurfaceAtlas542(world,images,{createCanvas:()=>({getContext:()=>null})}),null);assert.equal(createSceneSurfaceAtlas542({scene:{originId:'veyr-storm'}},images,{createCanvas:raster.createCanvas}),null);
 const source=readFileSync(new URL('../scene-surface-finish-542.js',import.meta.url),'utf8');assert.doesNotMatch(source,/getImageData\s*\(/,'readback stays confined to offline calibration and QA');
});
