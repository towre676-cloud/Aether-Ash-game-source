import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {createSceneArtAtlas,sceneArtSpec,SCENE_ART_MATERIALS,SCENE_ART_THEME_SAMPLES} from '../scene-art-materials-541.js';

function recordedCanvas(){
 const events=[],ctx={};
 for(const name of['save','restore','setTransform','translate','beginPath','closePath','moveTo','lineTo','rect','clip','fill','stroke','fillRect','arc'])ctx[name]=(...args)=>{for(const v of args)if(typeof v==='number')assert.ok(Number.isFinite(v),name+' receives a finite coordinate');events.push([name,...args]);};
 for(const name of['createLinearGradient','createRadialGradient'])ctx[name]=(...args)=>{for(const v of args)assert.ok(Number.isFinite(v));events.push([name,...args]);return{addColorStop:(at,color)=>{assert.ok(at>=0&&at<=1);events.push(['stop',at,color]);}};};
 for(const name of['fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','imageSmoothingEnabled'])Object.defineProperty(ctx,name,{set(value){events.push([name,typeof value==='object'?'gradient':value]);}});
 return{events,canvas:{width:0,height:0,getContext:kind=>kind==='2d'?ctx:null}};
}
const outdoor=style=>({scene:{key:'field',biome:{style}}});
const room=(kind,key=kind)=>({scene:{key,household:{kind}}});
const digest=events=>createHash('sha256').update(JSON.stringify(events)).digest('hex');

test('every real non-observatory scene has a native, distinct and read-only material direction',()=>{
 const world=new World(source),before=JSON.stringify([...world.scenes.values()]),ids=new Set(),families=new Set(),floors=new Set();let covered=0,protectedScenes=0;
 for(const scene of world.scenes.values()){
  const spec=sceneArtSpec({scene});if(scene.originId==='veyr-storm'){assert.equal(spec,null);protectedScenes++;continue;}
  covered++;assert.ok(spec,spec?.id);ids.add(spec.id);families.add(spec.family);floors.add(spec.floorKind);
  for(const color of Object.values(spec.palette))assert.ok(Array.isArray(color)&&color.length===3&&color.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
  assert.ok(Object.isFrozen(spec)&&Object.isFrozen(spec.palette));assert.ok(spec.lighting.ambient.every(v=>v>.2),'the authored floor retains readable indirect light');
  assert.ok(spec.lighting.key.every(v=>v>.3));assert.ok(spec.lighting.fogDensity>0&&spec.lighting.fogDensity<.001);
 }
 assert.equal(covered,165);assert.equal(protectedScenes,2);assert.ok(ids.size>=30,'native regions, room craft and remembered lives do not collapse into one surface');assert.ok(families.size>=24);assert.ok(floors.size>=10);
 assert.equal(JSON.stringify([...world.scenes.values()]),before,'material selection never mutates floor, scene objects, anchors or story data');
 assert.equal(sceneArtSpec(room('inn')).family,'hospitality','hospitality is not mistaken for a hospital');
 assert.equal(sceneArtSpec(room('workshop','security')).family,'industrial');
 assert.equal(sceneArtSpec(room('clinic')).family,'care');
 assert.equal(sceneArtSpec(room('printshop')).family,'craft');
});

test('organic ground, ice, timber and civic stone actually paint different material structures',()=>{
 const cases=[outdoor('woodland'),outdoor('riverbank'),outdoor('sand'),outdoor('ice'),outdoor('crystal'),room('home'),room('clinic'),room('archive')],hashes=new Set();
 for(const world of cases){
  const first=recordedCanvas(),atlas=createSceneArtAtlas(world,{}, {createCanvas:()=>first.canvas});
  assert.equal(atlas.width,1024);assert.equal(atlas.height,1024);assert.equal(atlas.sceneArtTheme,sceneArtSpec(world).id);
  assert.deepEqual(first.events.filter(e=>e[0]==='translate'),[['translate',0,0],['translate',512,0],['translate',0,512],['translate',512,512]]);
  assert.equal(first.events.filter(e=>e[0]==='clip').length>=4,true,'every quadrant is clipped before painting');
  assert.ok(first.events.filter(e=>e[0]==='createRadialGradient').length>90,'the painter builds mineral, wear and vegetation masses instead of flat rectangles');
  assert.ok(first.events.filter(e=>e[0]==='stroke').length>130,'material edges, grain and partial geological bedding are emitted');
  hashes.add(digest(first.events));const second=recordedCanvas();createSceneArtAtlas(world,{}, {createCanvas:()=>second.canvas});assert.equal(digest(first.events),digest(second.events),'same native family paints identical material commands on a fresh surface');
  for(const color of atlas.sceneArtMaterialAverages)assert.ok(color.length===3&&color.every(v=>v>0&&v<1));assert.equal(atlas.sceneArtMaterialAverages,atlas.observatoryMaterialAverages,'both renderers consume the calibrated swatch family through the established atlas contract');
 }
 assert.equal(hashes.size,cases.length,'the actual painting, not only metadata, changes between craft and landscape families');
 assert.equal(sceneArtSpec(outdoor('woodland')).floorKind,'meadow');assert.equal(sceneArtSpec(outdoor('sand')).floorKind,'sand');assert.equal(sceneArtSpec(outdoor('ice')).floorKind,'ice');assert.equal(sceneArtSpec(room('home')).floorKind,'timber');
});

test('a three-atlas LRU bounds retained canvas memory while preserving valid renderer references',()=>{
 let calls=0;const factory=()=>{calls++;return recordedCanvas().canvas;},a=outdoor('woodland'),b=room('home'),c=outdoor('ice'),d=room('archive');
 const aa=createSceneArtAtlas(a,{}, {createCanvas:factory}),bb=createSceneArtAtlas(b,{}, {createCanvas:factory});createSceneArtAtlas(c,{}, {createCanvas:factory});assert.equal(calls,3);
 assert.equal(createSceneArtAtlas(b,{}, {createCanvas:factory}),bb);assert.equal(calls,3,'the currently reused native family remains cached');
 createSceneArtAtlas(d,{}, {createCanvas:factory});assert.equal(calls,4);const next=createSceneArtAtlas(a,{}, {createCanvas:factory});assert.equal(calls,5);assert.notEqual(next,aa,'the least recently used atlas is regenerated after a fourth family');
 assert.equal(aa.width,1024);assert.equal(aa.height,1024,'eviction never clears an atlas still referenced by a native renderer');
 assert.equal(SCENE_ART_MATERIALS.maxCachedAtlases,3);assert.equal(SCENE_ART_MATERIALS.rgbaBytesPerAtlas,4*1024*1024);
});

test('all canonical palettes contain calibrated floor, wall, metal and geological midtones',()=>{
 const ids=new Set();for(const world of SCENE_ART_THEME_SAMPLES){
  const spec=sceneArtSpec(world);if(ids.has(spec.id))continue;ids.add(spec.id);const record=recordedCanvas(),atlas=createSceneArtAtlas(world,{}, {createCanvas:()=>record.canvas}),a=atlas.sceneArtMaterialAverages;
  assert.equal(a.length,4);assert.ok(a.every(c=>Object.isFrozen(c)&&c.every(v=>Number.isFinite(v)&&v>0&&v<1)));
  assert.notDeepEqual(a[0],spec.palette.floor,'software midtones are the rendered painter average, not an unrelated input fill');
  assert.ok(a[0].reduce((n,v)=>n+v,0)>a[3].reduce((n,v)=>n+v,0)*1.16,'walking material stays distinct from the closed geological mass');
 }
 assert.equal(ids.size,40,'all outdoor, craft and origin material identities have an actual calibration');
});

test('missing drawing surfaces return to the host without caching broken atlases',()=>{
 const world=room('home');let tries=0;const record=recordedCanvas(),factory=()=>++tries===1?null:record.canvas;
 assert.equal(createSceneArtAtlas(world,{}, {createCanvas:factory}),null);assert.equal(createSceneArtAtlas(world,{}, {createCanvas:factory}),record.canvas);assert.equal(tries,2);
 assert.equal(createSceneArtAtlas(world,{}, {createCanvas:()=>({getContext:()=>null})}),null);
 const oldDocument=globalThis.document,oldOffscreen=globalThis.OffscreenCanvas;
 try{delete globalThis.document;delete globalThis.OffscreenCanvas;assert.equal(createSceneArtAtlas(world),null);}finally{if(oldDocument!==undefined)globalThis.document=oldDocument;if(oldOffscreen!==undefined)globalThis.OffscreenCanvas=oldOffscreen;}
 assert.equal(createSceneArtAtlas({scene:{originId:'veyr-storm'}}),null,'Veyr retains its existing dedicated atlas');
});
