import fs from 'node:fs';
import {MATERIALS} from '../../dist/game/engine2/reconciled-content/ground/ground-materials.mjs';
import {generateGroundMaps} from '../../dist/game/engine2/reconciled-content/ground/ground-synthesis.mjs';
const w=1536,h=1152,out=new Uint8Array(w*h*3);
for(let i=0;i<MATERIALS.length;i++){
 const m=MATERIALS[i],maps=generateGroundMaps({materialId:m.id,width:192,height:192,metresX:4,metresZ:4,seed:61029,normalReliefMetres:.065});
 for(let y=0;y<192;y++)for(let x=0;x<192;x++){
  const src=(y*192+x)*4,dst=((Math.floor(i/8)*192+y)*w+(i%8)*192+x)*3;
  const nx=maps.normal[src]/127.5-1,ny=maps.normal[src+1]/127.5-1,nz=maps.normal[src+2]/127.5-1;
  const light=Math.max(.62,Math.min(1.10,.83+(-nx*.35-ny*.45+nz*.26)));
  for(let j=0;j<3;j++)out[dst+j]=Math.round(Math.min(255,maps.albedo[src+j]*light));
 }
}
fs.writeFileSync('/tmp/aa-ground-forge-atlas.ppm',Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`),Buffer.from(out)]));
console.log('Baked 48 materials with physically scaled normal lighting.');
