/** Create-only isolated snapshot; never modifies or publishes a Site checkout. */
import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,relative,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const [sourceArg,overlayArg,outArg]=process.argv.slice(2);
if(!sourceArg||!overlayArg||!outArg)throw Error('Usage: prepare-current-review.mjs CURRENT_DIST OVERLAY NEW_REVIEW_DIR');
const source=resolve(sourceArg),overlay=resolve(overlayArg),out=resolve(outArg);
for(const origin of [source,overlay]){const rel=relative(origin,out);if(!rel||rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel))throw Error('Review must be outside its inputs');}
if(existsSync(out))throw Error('Output exists; refusing overwrite');
const manifest=JSON.parse(readFileSync(join(overlay,'LIVING-REGIONS-STAGING.json')));
if(manifest.deployed||manifest.kind!=='review-only'||manifest.files.length!==14)throw Error('Expected review-only overlay');
const sha=x=>createHash('sha256').update(x).digest('hex');
for(const entry of manifest.files){
 if(entry.oldSha256&&sha(readFileSync(join(source,'game/engine2',entry.file)))!==entry.oldSha256)throw Error('Wrong current source '+entry.file);
 if(sha(readFileSync(join(overlay,'game/engine2',entry.file)))!==entry.newSha256)throw Error('Overlay hash mismatch '+entry.file);
}
cpSync(source,join(out,'dist'),{recursive:true});
for(const entry of manifest.files)cpSync(join(overlay,'game/engine2',entry.file),join(out,'dist/game/engine2',entry.file));
const qa=join(out,'dist/qa');
if(existsSync(qa))throw Error('Current source already owns /qa; choose another review namespace');
cpSync(fileURLToPath(new URL('./current-review-ui',import.meta.url)),qa,{recursive:true});
cpSync(fileURLToPath(new URL('./inspect-map-stability.mjs',import.meta.url)),join(qa,'inspect-map-stability.mjs'));
// No Site project ID or deployment source metadata in this local preview.
mkdirSync(join(out,'.openai'),{recursive:true});
writeFileSync(join(out,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}},null,2)+'\n');
writeFileSync(join(out,'REVIEW-PROVENANCE.json'),JSON.stringify({deployed:false,source,overlay,manifest},null,2)+'\n');
console.log('Created isolated current-game review at '+out+'. No deployment.');
