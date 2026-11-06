#!/usr/bin/env node
/** Offline only: actual painted atlas averages for the small-face software
 * path. Production performs no getImageData or asset network readback. */
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {SCENE_ART_THEME_SAMPLES} from '../dist/game/engine2/scene-art-materials-541.js';
import {createSceneSurfaceAtlas542,sceneSurfaceSpec542} from '../dist/game/engine2/scene-surface-finish-542.js';
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd(),'scene-surfaces-calibration.cjs'));
const {createCanvas,loadImage}=require('@napi-rs/canvas'),root=new URL('../dist/game/engine2/art/',import.meta.url);
const files={materials:'world-materials-v3.webp',scenicMaterials:'scenic-materials-v12.webp',environmentSurfaces:'environment-surfaces-v17.webp',architectureMaterials:'architectural-materials-v4.webp'},assets={};
await Promise.all(Object.entries(files).map(async([k,file])=>assets[k]=await loadImage(fileURLToPath(new URL(file,root)))));
const args=process.argv.slice(2),at=args.indexOf('--output'),output=at>=0?path.resolve(args[at+1]):null;if(output)await mkdir(output,{recursive:true});
const averages={},rows=[];
for(const world of SCENE_ART_THEME_SAMPLES){const s=sceneSurfaceSpec542(world);if(averages[s.id])continue;const atlas=createSceneSurfaceAtlas542(world,assets,{createCanvas}),data=atlas.getContext('2d').getImageData(0,0,1024,1024).data,sums=Array.from({length:4},()=>[0,0,0]);
 for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){const i=(y*1024+x)*4,k=(x>=512?1:0)+(y>=512?2:0);for(let c=0;c<3;c++)sums[k][c]+=data[i+c];}
 averages[s.id]=sums.map(c=>c.map(v=>Number((v/(512*512*255)).toFixed(5))));rows.push({theme:s.id,floor:s.surfaceFloor.recipe,averages:averages[s.id]});
 if(output)await writeFile(path.join(output,s.id.replaceAll(':','-')+'.jpg'),atlas.toBuffer('image/jpeg',90));
}
if(args.includes('--write')){const file=new URL('../dist/game/engine2/scene-surface-finish-542.js',import.meta.url),source=await readFile(file,'utf8'),block='// CALIBRATED_SURFACE_AVERAGES_START\nconst AVERAGES='+JSON.stringify(averages,null,1)+';\n// CALIBRATED_SURFACE_AVERAGES_END';await writeFile(file,source.replace(/\/\/ CALIBRATED_SURFACE_AVERAGES_START[\s\S]*?\/\/ CALIBRATED_SURFACE_AVERAGES_END/,block));}
if(output)await writeFile(path.join(output,'calibration.json'),JSON.stringify({themes:rows.length,rows},null,2));
console.log(JSON.stringify({themes:rows.length,output,written:args.includes('--write')}));
