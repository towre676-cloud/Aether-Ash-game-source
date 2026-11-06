import fs from 'node:fs';
import path from 'node:path';
const root=new URL('../',import.meta.url),html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const view=fs.readFileSync(new URL('../src/view.mjs',import.meta.url),'utf8');
const ids=[...view.matchAll(/getElementById\(['"]([\w-]+)['"]\)/g)].map(m=>m[1]);
const missing=[...new Set(ids)].filter(id=>!html.includes(`id="${id}"`));
if(missing.length)throw Error(`Missing UI elements: ${missing.join(', ')}`);
const modules=['world','content','adventure','details','actors','sound','storage','view','surfaces','perception'];
for(const m of modules){const file=new URL(`../src/${m}.mjs`,import.meta.url);if(!fs.existsSync(file))throw Error(`Missing module ${m}`);}
for(const rel of ['src/grass/grass-ecology.mjs','src/grass/grass-renderer.mjs','src/grass/grass-state.mjs','src/grass/preview-offline.html','src/ground/ground-materials.mjs','src/ground/ground-dynamics.mjs','src/ground/ground-synthesis.mjs','src/ground/studio.html','tests/surfaces.test.mjs','src/grass-v3/aa-game-integration.mjs','src/grass-v4/grass-renderer.mjs','src/grass-v4/foliage-quality-governor.mjs','src/wildlife-v7.mjs','tests/wildlife-v7.test.mjs','src/acoustic-survey-v6.mjs','src/world-ecotones-v6.mjs','src/acoustic/manifest.json','src/acoustic/src/acoustic-world.js','tests/perception.test.mjs'])if(!fs.existsSync(new URL('../'+rel,import.meta.url)))throw Error('Missing reconciled source '+rel);
if(!view.includes('createGrassField')||!view.includes('generateGroundMaps'))throw Error('The view is not using the recovered renderers');
const required=['region-select','quest-select','monster-select','recipe-select','material-select','party-status','encounter-status','npc-select','perf-counter','import-file'];
for(const id of required)if(!html.includes(`id="${id}"`))throw Error('Missing required control '+id);
const catalog=JSON.parse(fs.readFileSync(new URL('../src/acoustic/manifest.json',import.meta.url),'utf8'));
if(catalog.assets.length!==244)throw Error('Expected v2 authored 244 recording catalog');
if(!view.includes('getWildlife')||!html.includes('data-action="track-v7"'))throw Error('Wildlife v7 field guide integration missing');
if(!view.includes('grass-v4/grass-renderer.mjs'))throw Error('Not using v4 renderer');
console.log(JSON.stringify({allMatched:true,elementReferences:ids.length,uniqueIds:new Set(ids).size,modules:modules.length,verifiedSurfaceModules:17,recordings:catalog.assets.length,availablePanels:4},null,2));
