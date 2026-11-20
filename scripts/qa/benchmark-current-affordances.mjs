import {spawnSync} from 'node:child_process';
import {writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
const [baseArg,dir,out]=process.argv.slice(2);
if(!baseArg||!dir||!out)throw Error('Usage: benchmark-current-affordances.mjs CURRENT_DIST STAGED_DIST REPORT.json');
const root=resolve(dir),original=join(root,'game/engine2/qa-original-affordances.js');
if(existsSync(original))throw Error('Temporary benchmark module already exists');
// Both variants use identical staged dependencies, so only this one module differs.
writeFileSync(original,readFileSync(resolve(baseArg,'game/engine2/world-affordances.js')),{flag:'wx'});
const results=[];
try{
for(const [label,file] of [['original-current','qa-original-affordances.js'],['corrected-current','world-affordances.js']]){
 const code=`import fs from 'node:fs';import {World} from './game/engine2/world.js';import {worldAffordanceObjects} from './game/engine2/${file}';const w=new World(JSON.parse(fs.readFileSync('game/engine2/world.json')));w.state.scene=228;w.state.mode='field';[w.state.x,w.state.y]=w.scene.arrive.map(v=>v+.5);console.log('LAYOUT START '+JSON.stringify({scene:228,width:w.scene.width,height:w.scene.height,open:w.scene.floor.join('').split('.').length-1}));const start=performance.now();const objects=worldAffordanceObjects(w);console.log(JSON.stringify({milliseconds:performance.now()-start,count:objects.length}));`;
 const start=Date.now(),r=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 results.push({label,elapsedMs:Date.now()-start,exitCode:r.status,signal:r.signal,error:r.error?.code,stdout:r.stdout,stderr:r.stderr});
}
}finally{rmSync(original);}
writeFileSync(resolve(out),JSON.stringify({scope:'scene 228 repair placement; not a browser screenshot benchmark',results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
