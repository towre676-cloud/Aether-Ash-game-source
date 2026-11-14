/**
 * Prepare, but NEVER deploy, a modern Site source overlay containing the
 * region-scale + ecology work from PRs #12–#14.
 *
 * Current Site contains its own room-map.js and quest/encounter systems. This
 * adapter extends those, rather than installing a duplicate map or reverting
 * newer fracture, reward, tutorial, inventory or movement features.
 *
 * Input must be a separately obtained *authenticated owner export* of the
 * current Site's dist directory, not the old GitHub v45 snapshot. Staging is
 * create-only, SHA-256 receipted and refuses unknown source signatures.
 */
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {stageSpatialSources} from './stage-live-spatial-integration.mjs';

const inputs=['world.js','main.js','adventure-3d-geometry.js','field-journey-ui.js',
 'field-encounters.js','adventure-3d-renderer.js','renderer.js','room-map.js'];
const modules=['vast-spatial-expansion.mjs','mainline-courts.mjs','spatial-landmark-art.mjs','spatial-ecology.mjs','spatial-wildlife.mjs'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function replaceOnce(text,from,to,name){
 const occurrences=text.split(from).length-1;
 if(occurrences!==1)throw Error('Fail closed: expected one '+name+' anchor; saw '+occurrences);
 return text.replace(from,to);
}
function insertImport(text,symbol,target){
 const importRe=new RegExp("(^import .* from '\\./"+target.replaceAll('.','\\.')+"\\?v=[^']+';)",'m');
 const found=text.match(importRe);
 if(!found)throw Error('Fail closed: missing modern module import '+target);
 return replaceOnce(text,found[1],found[1]+"\n"+symbol,'module '+target);
}
function preserve(before,after,tokens,name){
 for(const t of tokens)if(!before.includes(t)||!after.includes(t))throw Error('Lost live '+name+' signature '+t);
}
function patchWorld(world){
 const expected=['migrateHeroGrowth','grantCrewExperience','fractureObjects','validateCampaignHandoff','composeCinderfallLayout'];
 let out=insertImport(world,"import {spatialEcologyObjects,interactSpatialEcology,validateSpatialEcology,discoverSpatialEcology} from './spatial-ecology.mjs?v=1';",'field-expeditions.js');
 out=replaceOnce(out,'...expeditionObjects(this)','...expeditionObjects(this),...spatialEcologyObjects(this)','spatial sites in dynamic objects');
 const load='this.state.mode=\'field\';settleHouseholdPosition(this);applyAffordanceScene(this);';
 out=replaceOnce(out,load,load+'discoverSpatialEcology(this,{quiet:true});','modern scene-entry discovery');
 const movement='if(this.walkable(s.x,s.y+dy))s.y+=dy;';
 out=replaceOnce(out,movement,movement+"if(s.mode==='field'){const seen=discoverSpatialEcology(this);if(seen)this.notice('Mapped landmark · '+seen.label);}",'physical walking discovery');
 out=replaceOnce(out,'observeBellArc(this,o);',"if(interactSpatialEcology(this,o))return;observeBellArc(this,o);",'spatial fieldwork interaction');
 out=replaceOnce(out,'validateExpeditions(s);','validateExpeditions(s);validateSpatialEcology(s);','spatial save validation');
 // The second occurrence belongs to restore(); the first was patched above.
 const all=out.split('applyAffordanceScene(this);');
 if(all.length!==3)throw Error('Fail closed: world scene/restore affordance anchors changed');
 out=all[0]+'applyAffordanceScene(this);'+all[1]+'applyAffordanceScene(this);discoverSpatialEcology(this,{quiet:true});'+all[2];
 preserve(world,out,expected,'world');return out;
}
function patchFieldEncounters(source){
 let s=insertImport(source,"import {spatialEcologyEncounterPace} from './spatial-ecology.mjs?v=1';",'scene-identity.js');
 const guard="return (scene.objects||[]).some(o=>o.type==='portal'?near(o,1.1):['npc','guide','shop','camp','transport','frontier-board'].includes(o.type)&&near(o,1.15));";
 const beforeGuard=`if(scene.spatialExpansion?.version===1&&[1,3,5,6,7].some(i=>{
  const xy=scene.spatialExpansion.landmarks?.[i]?.xy;
  return Array.isArray(xy)&&Math.hypot(s.x-xy[0]-.5,s.y-xy[1]-.5)<2.4;
 }))return true;`;
 s=replaceOnce(s,guard,beforeGuard+'\n '+guard,'local noncombat station safety');
 const consumed="const consumed=distance*(Number.isFinite(ecologyPace)?clamp(ecologyPace,.65,1.3):1);";
 s=replaceOnce(s,consumed,"const consumed=distance*(Number.isFinite(ecologyPace)?clamp(ecologyPace,.65,1.3):1)*spatialEcologyEncounterPace(world);",'local ecological encounter pacing');
 preserve(source,s,['advanceEncounters','encounterProtected','resetEncounterGrace'],'encounters');return s;
}
function patch3D(source){
 let s=insertImport(source,"import {appendSpatialWildlifeMotion} from './spatial-wildlife.mjs?v=1';",'adventure-landscape.js');
 const a='appendAdventureLivingDynamic(m,glow,options);';
 s=replaceOnce(s,a,a+'appendSpatialWildlifeMotion(m,glow,options);','modern wildlife dynamics');
 preserve(source,s,['appendFractures','appendAdventureLivingDynamic','buildDynamic'],'3D renderer');
 return s;
}
function patch2D(source){
 let s=insertImport(source,"import {drawSpatialWildlife2D} from './spatial-wildlife.mjs?v=1';",'reconciled-ground.js');
 const anchor='drawBellrun(this,world);';
 s=replaceOnce(s,anchor,anchor+'if(!battle)drawSpatialWildlife2D(c,world,this.time);','compatibility fauna');
 preserve(source,s,['drawLivingAtlas','drawBellrun','this.compatibility'],'2D renderer');return s;
}
function patchRoomMap(source){
 if(!source.includes("mountRoomMap")||!source.includes("roomWayfinding")||!source.includes("onWalk"))
  throw Error('Not the current native Site room map: missing system signature');
 let s=insertImport(source,"import {spatialEcologySites,spatialEcologyRecord} from './spatial-ecology.mjs?v=1';",'room-wayfinding.js');
 const append='panel.append(header,map,list,status);';
 s=replaceOnce(s,append,`const follow=document.createElement('button');follow.type='button';follow.textContent='Follow selected waypoint';follow.hidden=true;
 panel.append(header,map,list,status,follow);`,'native map optional follow button');
 s=replaceOnce(s,'let view=null;','let view=null,selected=null;','native map selected waypoint');
 const old=/function choose\(x,z\)\{\s*if\(onWalk\(x,z\)\)panel\.close\(\);\s*else status\.textContent='That spot is out of reach\.';\s*\}/g;
 const changed=`function choose(x,z){
 selected=[x,z];follow.hidden=false;
 const w=getWorld(),distance=Math.round(Math.hypot(w.state.x-x-.5,w.state.y-z-.5));
 status.textContent='Waypoint selected · '+distance+' tiles straight-line away. Walk manually, or explicitly choose Follow selected waypoint.';
}
follow.onclick=()=>{if(selected&&onWalk(...selected))panel.close();else status.textContent='That route is out of reach.';};`;
 const matches=[...s.matchAll(old)];
 if(matches.length!==1)throw Error('Fail closed: native map explicit-route consent changed');
 s=s.replace(old,changed);
 const reset="list.replaceChildren();status.textContent='';";
 s=replaceOnce(s,reset,"list.replaceChildren();status.textContent='';selected=null;follow.hidden=true;",'selected native waypoint reset');
 const marker="const marks=p.marks.filter(m=>cells.has(m.x+','+m.z));";
 const addition=`const marks=p.marks.filter(m=>cells.has(m.x+','+m.z));
 const eco=spatialEcologyRecord(w);
 for(const station of spatialEcologySites(s)){
  if(!cells.has(station.xy.join(',')))continue;
  const known=!!((eco?.mask||0)&(1<<station.spatialIndex));
  const label=known?'Fieldwork · '+station.label:'Uncharted habitat station';
  marks.push({x:station.xy[0],z:station.xy[1],kind:'service',label});
 }`;
 s=replaceOnce(s,marker,addition,'native map living region markers');
 preserve(source,s,['onWalk','roomWayfinding','panel.showModal()'],'room map');return s;
}
export function stageLivingSources({
 world,main,geometry,journey,encounters,adventure,renderer,roomMap
}){
 const input={world,main,geometry,journey,encounters,adventure,renderer,roomMap};
 for(const[k,v]of Object.entries(input))if(typeof v!=='string'||v.length<50)throw Error('Missing current Site source '+k);
 const base=stageSpatialSources({world,main,geometry,journey});
 // Keep the *current native* room map, including its M shortcut, and add
 // explicit manual selection and ecological labels. No second map HUD button.
 const out={
  world:patchWorld(base.world),main:base.main,geometry:base.geometry,
  journey:base.journey,encounters:patchFieldEncounters(encounters),
  adventure:patch3D(adventure),renderer:patch2D(renderer),roomMap:patchRoomMap(roomMap)
 };
 if(out.main.includes('mountSpatialRegionMap'))throw Error('Duplicate map installation in modern Site');
 return out;
}
const key={world:'world.js',main:'main.js',geometry:'adventure-3d-geometry.js',journey:'field-journey-ui.js',
 encounters:'field-encounters.js',adventure:'adventure-3d-renderer.js',renderer:'renderer.js',roomMap:'room-map.js'};
export function stageLivingSnapshot(sourceRoot,outputRoot){
 const source=resolve(sourceRoot),out=resolve(outputRoot),rel=relative(source,out);
 if(!rel||rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel))throw Error('Review destination must not overwrite current source');
 if(existsSync(out))throw Error('Review destination exists; never overwrite it');
 const origin=resolve(dirname(fileURLToPath(import.meta.url)),'../live-site/dist/game/engine2');
 const input=Object.fromEntries(Object.entries(key).map(([k,p])=>[k,readFileSync(join(source,'game/engine2',p),'utf8')]));
 const patch=stageLivingSources(input),receipt=[];
 for(const[k,p]of Object.entries(key)){
  const dest=join(out,'game/engine2',p),content=patch[k];mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,content);
  receipt.push({file:p,oldSha256:sha(input[k]),newSha256:sha(content),bytes:Buffer.byteLength(content)});
 }
 for(const p of modules){const from=join(origin,p),to=join(out,'game/engine2',p);copyFileSync(from,to);
  const bytes=readFileSync(to);receipt.push({file:p,oldSha256:null,newSha256:sha(bytes),bytes:bytes.length});}
 const manifest={schema:'ash-aether.live-region-overlay/1',kind:'review-only',deployed:false,
  sourceRoot:source,files:receipt,checks:['current live source version verified','full region integration tests','phone/desktop browser test','save and battle regression','explicit approval']};
 writeFileSync(join(out,'LIVING-REGIONS-STAGING.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [source,out]=process.argv.slice(2);
 if(!source||!out)throw Error('Usage: node scripts/stage-live-living-regions.mjs <authenticated-current-site-dist> <new-empty-review-dir>');
 const manifest=stageLivingSnapshot(source,out);
 console.log('Stage-only living region overlay: '+manifest.files.length+' files. No Site deployment performed.');
}
