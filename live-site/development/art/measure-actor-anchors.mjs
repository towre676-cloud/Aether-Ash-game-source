/** Replay the raw-atlas pivots using the same opacity measurement as normal graphics.
 * Pillow only decodes the existing WebP into RGBA; no artwork is edited or generated.
 * Usage: node development/art/measure-actor-anchors.mjs --check | --write
 */
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ACTOR_SHEETS} from '../../dist/game/engine2/actor-atlas.js';
import {measureActorAnchors} from '../../dist/game/engine2/motion-realism.js';

const files={crew:'crew.webp',run:'crew-run-v2.webp',starter:'sable-starter.webp'};
const anchors={},sources={};
const decoder="from PIL import Image; import sys; image=Image.open(sys.argv[1]).convert('RGBA'); sys.stdout.buffer.write(image.tobytes())";
for(const [kind,name] of Object.entries(files)){
 const path=fileURLToPath(new URL('../../dist/game/engine2/art/'+name,import.meta.url));
 const sheet=ACTOR_SHEETS[kind],decoded=spawnSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python3',['-c',decoder,path],{maxBuffer:40*1024*1024});
 if(decoded.status!==0)throw Error('Unable to decode '+name+': '+decoded.stderr.toString());
 if(decoded.stdout.length!==sheet.width*sheet.height*4)throw Error(name+' dimensions changed; update its source rectangles before measuring anchors.');
 const bounds=sheet.rows.flat().map(([x,y,right,bottom])=>({x,y,w:right-x,h:bottom-y}));
 const measured=measureActorAnchors(decoded.stdout,sheet.width,sheet.height,bounds);
 anchors[kind]=sheet.rows.map((_,row)=>measured.slice(row*8,row*8+8).map(b=>[b.anchorX,b.anchorY,b.bodyHeight]));
 if(anchors[kind].flat().some(a=>a.some(n=>!Number.isFinite(n))))throw Error('An actor pivot could not be measured in '+name);
 sources[kind]=createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}
const output='/** Generated offline from the delivered actor artwork. No image pixels are changed.\n * Regenerate: node development/art/measure-actor-anchors.mjs --write\n * Coordinates are torso X, sole Y and body height relative to each source rectangle.\n */\n'+
 'export const ACTOR_ANCHOR_SOURCES='+JSON.stringify(sources,null,1)+';\n'+
 'export const ACTOR_SOURCE_ANCHORS={\n'+Object.entries(anchors).map(([kind,rows])=>' '+kind+':[\n'+rows.map(row=>'  '+JSON.stringify(row)).join(',\n')+'\n ]').join(',\n')+'\n};\n';
const destination=new URL('../../dist/game/engine2/actor-source-anchors.js',import.meta.url);
if(process.argv.includes('--write')){fs.writeFileSync(destination,output);console.log('Measured 128 actor pivots without modifying artwork.');}
else if(process.argv.includes('--check')){if(fs.readFileSync(destination,'utf8')!==output)throw Error('Actor anchors are stale. Regenerate with --write.');console.log('All 128 source pivots and artwork hashes reproduce exactly.');}
else process.stdout.write(output);
