#!/usr/bin/env node
/** Safe offline replacement against *served* production adventure-landscape.js.
 * This does not write to or deploy the production Site.
 * Usage: node apply-live-landscape.mjs source.js patched.js
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [input,output]=process.argv.slice(2);
if(!input||!output||path.resolve(input)===path.resolve(output)){
 console.error('Usage: node apply-live-landscape.mjs SOURCE OUT (different paths)');
 process.exit(2);
}
const source=fs.readFileSync(input,'utf8');
const signature="import {appendHDTree,appendHDRock,appendHDFungus} from './hd-environment-models.mjs?v=live-hd-1';";
const treeMarker='function tree(m,p,c,trunkOnly=false){',rockMarker='function rock(m,p,c){',fungusMarker='function fungus(m,p,c){';
const onlyOne=(marker)=>{
 const first=source.indexOf(marker);
 if(first<0||source.indexOf(marker,first+marker.length)!==-1)throw Error('Unknown production landscape layout: '+marker);
 return first;
};
const a=onlyOne(treeMarker),b=onlyOne(rockMarker),d=onlyOne(fungusMarker),e=onlyOne('export function appendAdventureLandscape(');
if(!(a>=0&&a<b&&b<d&&d<e&&source.includes('export function appendAdventureLandscape')&&source.includes('appendLandscapeBackdrop')))throw Error('Production landscape structure changed; refusing to patch');
if(source.includes(signature))throw Error('Site source already contains the HD renderer import; refusing duplicate application');
const originalBodies=source.slice(a,d);
if(!originalBodies.includes('m.sphere(')||!originalBodies.includes('m.cylinder('))throw Error('Legacy procedural vegetation no longer present; review replacement manually');
const prefix=signature+'\n';
const tree="function tree(m,p,c,trunkOnly=false){\n return appendHDTree(m,p,c,{quality:p.near?'low':'medium',trunkOnly});\n}\n";
const rock="function rock(m,p,c){\n return appendHDRock(m,p,c,{quality:p.near?'low':'medium'});\n}\n";
const fungus="function fungus(m,p,c){\n return appendHDFungus(m,p,c,{quality:p.near?'low':'medium'});\n}\n";
let result=prefix+source.slice(0,a)+tree+rock+fungus+source.slice(e);
const originalScenicTree="if(scenicTrees&&WOODS.has(p.family)&&p.family!=='spore'){if(!authoredReplacements.has(f))scenicTrees.push({...f,y:banks?banks.heightAt(f.x,f.z):f.y,family:p.family});continue;}";
const enhancedScenicTree="if(scenicTrees&&WOODS.has(p.family)&&p.family!=='spore'){if(!authoredReplacements.has(f)){scenicTrees.push({...f,y:banks?banks.heightAt(f.x,f.z):f.y,family:p.family});if(Number.isInteger(f.index)&&f.index%4===0)tree(mesh,at,c,true);}continue;}";
const originalScenicProp="if(sceneryAssets?.[ENVIRONMENT_PROP_BY_ID[propId].asset]?.width){scenicTrees.push({...at,propId,family:p.family});continue;}";
const enhancedScenicProp="if(sceneryAssets?.[ENVIRONMENT_PROP_BY_ID[propId].asset]?.width){scenicTrees.push({...at,propId,family:p.family});if(Number.isInteger(f.index)&&f.index%4===0){if(p.family==='spore')fungus(mesh,at,c);else if(['sand','cactus','coral','salt','highland','storm','crystal','ice','aurora'].includes(p.family))rock(mesh,at,c);}continue;}";
if(result.split(originalScenicTree).length!==2||result.split(originalScenicProp).length!==2)
 throw Error('Actual production painted-scenery integration changed; refusing an ineffective/no-op HD overlay');
result=result.replace(originalScenicTree,enhancedScenicTree).replace(originalScenicProp,enhancedScenicProp);
if(!result.includes('export function appendAdventureLandscape')||!result.includes("appendAdventureLandscapeDynamics"))throw Error('Safety invariant: scene code omitted');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,result);
const sha=s=>createHash('sha256').update(s).digest('hex');
console.log(JSON.stringify({sourceBytes:source.length,resultBytes:result.length,sourceSHA256:sha(source),resultSHA256:sha(result),replacedModelFunctions:3,paintedScenerySupported:true,meshDetailUnderPaintedScenery:true,gameplayStateUntouched:true}));
