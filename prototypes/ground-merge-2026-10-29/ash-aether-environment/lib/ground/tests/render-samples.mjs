import fs from 'node:fs';
import path from 'node:path';
import {MATERIALS} from '../ground-materials.mjs';
import {generateGroundMaps} from '../ground-synthesis.mjs';
const out=new URL('../docs/samples/',import.meta.url);fs.mkdirSync(out,{recursive:true});
for(const mat of MATERIALS){const size=184;const m=generateGroundMaps({materialId:mat.id,width:size,height:size,metresX:8.4,metresZ:8.4,seed:61029,weather:{age:.34,moss:mat.realm==='Clay'?.34:.07,rain:mat.realm==='Water'?.45:.08}});fs.writeFileSync(new URL(mat.id+'.rgba',out),Buffer.from(m.albedo));}
fs.writeFileSync(new URL('manifest.json',out),JSON.stringify(MATERIALS.map(m=>({id:m.id,name:m.label,realm:m.realm})),null,2));
console.log('Rendered '+MATERIALS.length+' sample albedo maps');
