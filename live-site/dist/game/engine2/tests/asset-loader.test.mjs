import test from 'node:test';
import assert from 'node:assert/strict';
import {loadArtAssets} from '../asset-loader.js?v=5.6.0';
import {gameArtDefinitions} from '../art-definitions.js?v=5.17.1';
import {ENVIRONMENT_ART_FILES} from '../environment-art-v17.js?v=5.17.1';

function imageFactory(outcomes){
 const images=[],requests=[];
 return {images,requests,createImage(){
  const image={onload:null,onerror:null,removed:false,removeAttribute(name){if(name==='src')this.removed=true;},set src(value){requests.push(value);const outcome=outcomes.shift();queueMicrotask(()=>{if(outcome==='load')this.onload?.();else if(outcome==='error')this.onerror?.();});}};
  images.push(image);return image;
 }};
}
test('required art resolves under its original keys and reports named completed progress',async()=>{
 const factory=imageFactory(['load','load']),progress=[],definitions=[{name:'crew',src:'/crew.webp',label:'Travellers'},{name:'terrain',src:new URL('https://example.test/terrain.webp')}];
 const assets=await loadArtAssets(definitions,{...factory,onProgress:p=>progress.push(p),timeoutMs:100});
 assert.deepEqual(Object.keys(assets).sort(),['crew','terrain']);assert.equal(assets.crew,factory.images[0]);assert.equal(progress.at(-1).loaded,2);assert.equal(progress.at(-1).total,2);
 assert.equal(progress.find(p=>p.name==='crew').label,'Travellers');assert.ok(factory.images.every(i=>i.onload===null&&i.onerror===null));
});
test('a transient atlas error gets exactly one fresh image attempt without double-counting progress',async()=>{
 const factory=imageFactory(['error','load']),progress=[];
 const assets=await loadArtAssets([{name:'crew',src:'/crew.webp'}],{...factory,onProgress:p=>progress.push(p),timeoutMs:100});
 assert.equal(assets.crew,factory.images[1]);assert.deepEqual(factory.requests,['/crew.webp','/crew.webp']);assert.deepEqual(progress.map(p=>p.status),['loading','retrying','loaded']);assert.equal(progress.at(-1).loaded,1);assert.equal(factory.images[0].removed,true);
});
test('persistent failure names the missing atlas and releases every other pending image',async()=>{
 const factory=imageFactory(['error','hang','error']);
 await assert.rejects(loadArtAssets([{name:'crew',label:'Character art',src:'/crew.webp'},{name:'terrain',src:'/terrain.webp'}],{...factory,timeoutMs:100}),/Character art after two attempts/);
 assert.equal(factory.requests.filter(s=>s==='/crew.webp').length,2);assert.ok(factory.images.every(i=>i.onload===null&&i.onerror===null&&i.removed));
});
test('a hung request times out, retries once, and cannot hang startup indefinitely',async()=>{
 const factory=imageFactory(['hang','hang']),progress=[];
 await assert.rejects(loadArtAssets([{name:'terrain',src:'/terrain.webp'}],{...factory,onProgress:p=>progress.push(p),timeoutMs:5}),/terrain.*loading timed out/);
 assert.equal(factory.images.length,2);assert.equal(progress.at(-1).status,'error');assert.ok(factory.images.every(i=>i.onload===null&&i.onerror===null&&i.removed));
});
test('invalid manifests fail before requests and a broken progress display does not discard loaded art',async()=>{
 const factory=imageFactory(['load']);
 await assert.rejects(loadArtAssets([{name:'crew',src:'/a'},{name:'crew',src:'/b'}],factory),/unique name/);assert.equal(factory.requests.length,0);
 await assert.rejects(loadArtAssets([{name:'crew',src:'/a'}],{...factory,timeoutMs:0}),/timeout/);assert.equal(factory.requests.length,0);
 const assets=await loadArtAssets([{name:'crew',src:'/a'}],{...factory,onProgress(){throw Error('display unavailable');}});assert.ok(assets.crew);
 assert.deepEqual(await loadArtAssets([]),{});
});

test('all twenty-two environment atlases are optional while the core art stays required',()=>{
 const definitions=gameArtDefinitions(),expected=[...Object.keys(ENVIRONMENT_ART_FILES),'environmentSurfaces','environmentWater','environmentCanopies','environmentArchitecture','environmentCanopyVariations','environmentHomeWalls','environmentWorkshopWalls','environmentCivicWalls','environmentFacades','environmentRoofcraft'];
 assert.equal(expected.length,22);
 assert.deepEqual(definitions.filter(d=>d.optional===true).map(d=>d.name).sort(),expected.sort());
 assert.ok(definitions.filter(d=>!expected.includes(d.name)).every(d=>d.optional===undefined));
 for(const name of ['crew','terrain','naturalTrees','buildings','architectureMaterials','sceneProps','scenePropsExtra'])assert.equal(definitions.find(d=>d.name===name).optional,undefined,name+' remains required');
});

test('optional failure retries once then omits only that image and completes honest progress',async()=>{
 const factory=imageFactory(['load','error','error']),progress=[];
 const assets=await loadArtAssets([{name:'crew',src:'/crew.webp'},{name:'environmentCanopies',src:'/canopies.png',optional:true}],{...factory,onProgress:p=>progress.push(p),timeoutMs:100});
 assert.deepEqual(Object.keys(assets),['crew']);assert.equal(assets.crew,factory.images[0]);
 assert.deepEqual(factory.requests,['/crew.webp','/canopies.png','/canopies.png']);
 assert.deepEqual(progress.filter(p=>p.name==='environmentCanopies').map(p=>p.status),['loading','retrying','skipped']);
 assert.deepEqual([progress.at(-1).loaded,progress.at(-1).completed,progress.at(-1).skipped,progress.at(-1).total],[1,2,1,2]);
 assert.ok(factory.images.every(i=>i.onload===null&&i.onerror===null));assert.ok(factory.images.slice(1).every(i=>i.removed));
});

test('optional timeout is bounded while optional success retains its real image key',async()=>{
 const hanging=imageFactory(['hang','hang']),progress=[];
 assert.deepEqual(await loadArtAssets([{name:'environmentWater',src:'/water.png',optional:true}],{...hanging,onProgress:p=>progress.push(p),timeoutMs:5}),{});
 assert.equal(hanging.images.length,2);assert.equal(progress.at(-1).status,'skipped');assert.equal(progress.at(-1).completed,1);assert.ok(hanging.images.every(i=>i.removed&&i.onload===null&&i.onerror===null));
 const success=imageFactory(['error','load']),loaded=[];
 const assets=await loadArtAssets([{name:'environmentWater',src:'/water.png',optional:true}],{...success,onProgress:p=>loaded.push(p),timeoutMs:100});
 assert.equal(assets.environmentWater,success.images[1]);assert.deepEqual(loaded.map(p=>p.status),['loading','retrying','loaded']);
 assert.deepEqual([loaded.at(-1).loaded,loaded.at(-1).completed,loaded.at(-1).skipped],[1,1,0]);
});

test('an optional asset never masks a required failure or keeps other requests alive',async()=>{
 const factory=imageFactory(['error','hang','error']),progress=[];
 await assert.rejects(loadArtAssets([{name:'crew',src:'/crew.webp'},{name:'environmentWater',src:'/water.png',optional:true}],{...factory,onProgress:p=>progress.push(p),timeoutMs:100}),/crew after two attempts/);
 assert.equal(factory.requests.filter(s=>s==='/crew.webp').length,2);assert.ok(factory.images.every(i=>i.onload===null&&i.onerror===null&&i.removed));
 assert.equal(progress.at(-1).status,'error');assert.equal(progress.at(-1).skipped,0);
});
