/** Snapshot an already integrated current game without rewriting its modules.
 * Pre-integration sources still use the original fail-closed overlay builder.
 * This script never modifies its input, overwrites output, or deploys a Site.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join,relative,isAbsolute,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {stageLivingSnapshot} from './stage-live-living-regions.mjs';

export const currentVerificationFiles=[
 'world.js','main.js','adventure-3d-geometry.js','field-journey-ui.js',
 'field-encounters.js','adventure-3d-renderer.js','renderer.js','room-map.js',
 'world-affordances.js','vast-spatial-expansion.mjs','mainline-courts.mjs',
 'spatial-landmark-art.mjs','spatial-ecology.mjs','spatial-wildlife.mjs','floor-connectivity.mjs'
];
const contracts={
 'world.js':['expandVastScenes(broadenMainline(','spatialEcologyObjects(this)','validateSpatialEcology(s)','discoverSpatialEcology(this)','fractureObjects','validateCampaignHandoff'],
 'main.js':['mountRoomMap','mineral-resonance.js','skipCinderfallTutorial','fractureUI','questGuide?.cancel();path=[];arrivalAction=null;notice(\'Free exploration:'],
 'adventure-3d-geometry.js':['appendSpatialLandmarks(m,{world});'],
 'field-journey-ui.js':['Follow story path','value.continueLabel'],
 'field-encounters.js':['spatialEcologyEncounterPace(world)','advanceEncounters','resetEncounterGrace'],
 'adventure-3d-renderer.js':['appendSpatialWildlifeMotion(m,glow,options);','appendFractures'],
 'renderer.js':['drawSpatialWildlife2D(c,world,this.time);','drawLivingAtlas'],
 'room-map.js':['mountRoomMap','spatialEcologySites(s)','Follow selected waypoint','if(selected&&onWalk(...selected))panel.close()','Waypoint selected'],
 'world-affordances.js':['nonSeparatingFloorCells(scene,start)','worldAffordanceObjects','worldAffordanceSummary','applyAffordanceScene'],
 'vast-spatial-expansion.mjs':['expandVastScenes'],
 'mainline-courts.mjs':['broadenMainline'],
 'spatial-landmark-art.mjs':['appendSpatialLandmarks'],
 'spatial-ecology.mjs':['spatialEcologySites','validateSpatialEcology','discoverSpatialEcology'],
 'spatial-wildlife.mjs':['appendSpatialWildlifeMotion','drawSpatialWildlife2D','spatialWildlifeActors'],
 'floor-connectivity.mjs':['export function nonSeparatingFloorCells']
};
export function validateInstalledIntegration(sources){
 for(const name of currentVerificationFiles){
  const text=sources[name];
  if(typeof text!=='string'||text.length<40)throw Error('Incomplete installed integration: '+name);
  for(const token of contracts[name])if(!text.includes(token))throw Error('Unsupported installed integration: '+name+' missing '+token);
 }
 if(sources['world-affordances.js'].includes('q.length<5000'))throw Error('Installed connectivity remains truncated');
 // These are staging contracts, not a claim that the browser tests passed.
 return true;
}
export function stageCurrentVerification(sourceArg,outArg){
 const source=resolve(sourceArg),out=resolve(outArg),rel=relative(source,out);
 if(!rel||rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel))throw Error('Output must not be inside the current source');
 if(existsSync(out))throw Error('Output exists; refusing overwrite');
 const read=name=>readFileSync(join(source,'game/engine2',name),'utf8');
 const world=read('world.js'),geometry=read('adventure-3d-geometry.js');
 if(!world.includes('expandVastScenes(')&&!geometry.includes('appendSpatialLandmarks('))return stageLivingSnapshot(source,out);
 const sources=Object.fromEntries(currentVerificationFiles.map(name=>[name,read(name)]));
 validateInstalledIntegration(sources);
 const files=[];
 for(const name of currentVerificationFiles){
  const bytes=readFileSync(join(source,'game/engine2',name)),sha=createHash('sha256').update(bytes).digest('hex');
  const target=join(out,'game/engine2',name);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);
  files.push({file:name,oldSha256:sha,newSha256:sha,bytes:bytes.length});
 }
 const manifest={schema:'ash-aether.current-verification/1',kind:'review-only',mode:'existing-installation',sourceRoot:source,
  sourceFilesChanged:0,files,deployed:false,requires:['Desktop and mobile browser verification']};
 writeFileSync(join(out,'LIVING-REGIONS-STAGING.json'),JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [source,out]=process.argv.slice(2);if(!source||!out)throw Error('Usage: stage-current-verification.mjs CURRENT_DIST NEW_REVIEW');
 const m=stageCurrentVerification(source,out);console.log((m.mode==='existing-installation'?'Exact installed source snapshot; zero source modifications':'Pre-integration review overlay')+': '+m.files.length+' files. No deployment.');
}
