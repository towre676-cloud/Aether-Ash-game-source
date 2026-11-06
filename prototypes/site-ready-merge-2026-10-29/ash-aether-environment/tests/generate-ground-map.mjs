/** Node-only reproducible material map; writes PPM so no image libraries are required. */
import fs from 'node:fs';import {LivingWorld,N,HALF,iAt} from '../src/world.mjs';
import {GroundWorldBridge} from '../src/world-ground-bridge.mjs';
import {generateGroundMaps} from '../lib/ground/ground-synthesis.mjs';
const w=new LivingWorld(71),g=new GroundWorldBridge(w),lookup=Array.from({length:N*N},(_,i)=>g.materialAt(i%N-HALF,Math.floor(i/N)-HALF));
const W=720,maps=generateGroundMaps({seed:g.seed,width:W,height:W,materialAt:(x,z)=>lookup[iAt(x,z)],originX:0,originZ:0,metresX:64,metresZ:64,weather:{age:.48,moss:.18}});
const output=Buffer.alloc(W*W*3);
for(let i=0;i<W*W;i++){for(let c=0;c<3;c++)output[3*i+c]=maps.albedo[4*i+c];}
fs.writeFileSync('docs/reconciled-topdown.ppm',Buffer.concat([Buffer.from(`P6\n${W} ${W}\n255\n`),output]));
console.log('Material map written; NOT an actual rendered gameplay screenshot.');
