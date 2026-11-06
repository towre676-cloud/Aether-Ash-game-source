/** Reproducible CPU-only benchmark. Does not imply browser FPS or visual quality. */
import fs from 'node:fs';
import {AtlasWorld} from '../src/adventure.mjs';
const a=new AtlasWorld(2301),trials=[];
for(let j=0;j<150;j++){
 const t=performance.now(),rs=a.residents();trials.push(performance.now()-t);
 if(j%7===0){a.residentTick++;}
 if(!rs.length)throw Error('No spatial wildlife to benchmark');
}
trials.sort((a,b)=>a-b);
const r={schema:'AA-resident-v8-cpu-only',iterations:trials.length,visibleResidents:a.residents().length,
 minMs:+trials[0].toFixed(4),medianMs:+trials[Math.floor(trials.length/2)].toFixed(4),p95Ms:+trials[Math.floor(trials.length*.95)].toFixed(4),
 saveBytes:Buffer.byteLength(JSON.stringify(a.snapshot())),note:'No WebGL, GPU, networking, thermals, 3D draw calls or production engine involved.'};
console.log(JSON.stringify(r,null,2));
