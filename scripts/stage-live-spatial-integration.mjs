/**
 * Offline-only integration bridge for an OWNER-AUTHENTICATED current Site export.
 * Never writes to the authenticated source, launches a deploy, or overwrites an
 * existing staging directory. The older GitHub Site-v45 snapshot is NOT live.
 *
 * Usage:
 * node scripts/stage-live-spatial-integration.mjs /path/to/current-site/dist /path/to/new-empty-staging
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const names=Object.freeze({
 world:'world.js',geometry:'adventure-3d-geometry.js',main:'main.js',journey:'field-journey-ui.js'
});
const modules=['vast-spatial-expansion.mjs','mainline-courts.mjs','spatial-landmark-art.mjs'];
const hash=x=>createHash('sha256').update(x).digest('hex');
function single(src,from,to,label){
 const count=src.split(from).length-1;
 if(count!==1)throw Error('Fail closed: expected exactly one '+label+' integration anchor, found '+count);
 return src.replace(from,to);
}
function keep(source,patched,tokens,label){
 for(const token of tokens)if(!source.includes(token)||!patched.includes(token))throw Error('Lost expected live '+label+' feature '+token);
}
/** Pure patcher; caller must provide current source, never an archived deployment. */
export function stageSpatialSources({world,geometry,main,journey}){
 for(const [name,value] of Object.entries({world,geometry,main,journey}))if(typeof value!=='string'||value.length<40)throw Error('Missing current Site source '+name);
 const signatures={
  world:['migrateHeroGrowth','grantCrewExperience','fractureObjects','composeCinderfallLayout','validateCampaignHandoff'],
  main:['fractureUI','mineral-resonance.js','skipCinderfallTutorial','journeyExperience']
 };
 for(const [name,keys]of Object.entries(signatures))for(const token of keys)if(!({world,main}[name]).includes(token))throw Error('Not the verified modern live '+name+' version: '+token);
 if(world.includes('expandVastScenes(')||geometry.includes('appendSpatialLandmarks('))throw Error('Spatial integration already present; refusing duplicate');
 let nextWorld=single(world,"import {expandAuthoredOpenings} from './authored-openings.js?v=5.38';",
  "import {expandAuthoredOpenings} from './authored-openings.js?v=5.38';\nimport {broadenMainline} from './mainline-courts.mjs?v=1';\nimport {expandVastScenes} from './vast-spatial-expansion.mjs?v=2';",'World imports');
 const constructorAnchor='this.preparedHouseholds=expandAuthoredOpenings(expandFieldOrigins(composeCinderfallLayout(this.preparedHouseholds)));';
 nextWorld=single(nextWorld,constructorAnchor,
  'this.preparedHouseholds=expandVastScenes(broadenMainline(expandAuthoredOpenings(expandFieldOrigins(composeCinderfallLayout(this.preparedHouseholds)))));','World composition');
 const fallback='this.data=s.story?clone(this.preparedHouseholds):expandFrontiers(furnishCampaign(furnishWorld(clone(this.sourceData))));';
 nextWorld=single(nextWorld,fallback,'this.data=s.story?clone(this.preparedHouseholds):expandVastScenes(broadenMainline(expandFrontiers(furnishCampaign(furnishWorld(clone(this.sourceData))))));','legacy restore fallback');
 keep(world,nextWorld,signatures.world,'world');

 let nextGeometry=single(geometry,"import {paintNativeGroundFinish} from './native-ground-537.js?v=5.37.0';",
  "import {paintNativeGroundFinish} from './native-ground-537.js?v=5.37.0';\nimport {appendSpatialLandmarks} from './spatial-landmark-art.mjs?v=1';",'3D renderer import');
 const end='  return m;\n}',position=nextGeometry.lastIndexOf(end);
 if(position<0)throw Error('Fail closed: no final 3D geometry return anchor');
 nextGeometry=nextGeometry.slice(0,position)+'  appendSpatialLandmarks(m,{world});\n'+nextGeometry.slice(position);
 keep(geometry,nextGeometry,['buildAdventureGeometry','appendAdventureLandscape','appendInteriorSurround'],'geometry');

 const oldExplore="onExplore(){currentVictoryReport=null;release();notice('Explore at your pace. Tap the objective when you want to continue.');}";
 const newExplore="onExplore(){currentVictoryReport=null;release();questGuide?.cancel();path=[];arrivalAction=null;notice('Free exploration: move anywhere. Tap the objective only when you want optional story guidance.');hud(true);}";
 const nextMain=single(main,oldExplore,newExplore,'free exploration control');
 keep(main,nextMain,signatures.main,'main');
 let nextJourney=single(journey,"Continue route resumes guidance.","Following the story path is optional; Explore keeps movement in your hands.",'journey hint');
 // This preserves the live fractured-run-specific continueLabel when present.
 nextJourney=single(nextJourney,"button(value.continueLabel||'Continue route','continue',onContinue)",
  "button(value.continueLabel||'Follow story path','continue',onContinue)",'optional guided movement label');
 return{world:nextWorld,geometry:nextGeometry,main:nextMain,journey:nextJourney};
}

/** Creates a patch bundle only. Does not change the current Site source root. */
export function stageSpatialSnapshot(sourceRoot,outputRoot){
 const source=resolve(sourceRoot),out=resolve(outputRoot),local=resolve(dirname(fileURLToPath(import.meta.url)),'../live-site/dist/game/engine2');
 if(source===out||out.startsWith(source+'/'))throw Error('Output must not be inside or equal to the current Site source');
 if(existsSync(out))throw Error('Output exists; choose a new directory. No overwriting.');
 const texts=Object.fromEntries(Object.entries(names).map(([key,file])=>[key,readFileSync(join(source,'game/engine2',file),'utf8')]));
 const patched=stageSpatialSources(texts),receipts=[];
 for(const[key,file]of Object.entries(names)){
  const bytes=patched[key],target=join(out,'game/engine2',file);
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes,'utf8');
  receipts.push({file,sourceSha256:hash(texts[key]),stagedSha256:hash(bytes),bytes:Buffer.byteLength(bytes)});
 }
 for(const file of modules){const from=join(local,file),to=join(out,'game/engine2',file);copyFileSync(from,to);receipts.push({file,sourceSha256:null,stagedSha256:hash(readFileSync(to)),bytes:readFileSync(to).length});}
 const manifest={schema:'ash-aether.spatial-live-stage/1',kind:'review-only',sourceRoot:source,files:receipts,requires:['Current authenticated Site reconciliation','Desktop and touch browser QA','Save and load tests','Explicit deployment approval'],deployed:false};
 writeFileSync(join(out,'SPATIAL-STAGING-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node stage-live-spatial-integration.mjs <authenticated-Site-dist> <new-staging-dir>');
 const receipt=stageSpatialSnapshot(input,output);
 console.log('Staged seven patch files; live Site untouched. SHA-256 receipts:',receipt.files.length);
}
