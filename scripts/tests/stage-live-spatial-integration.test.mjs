import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stageSpatialSources,stageSpatialSnapshot} from '../stage-live-spatial-integration.mjs';

const sources={
 world:[
  "import {expandAuthoredOpenings} from './authored-openings.js?v=5.38';",
  "const migrateHeroGrowth=1,grantCrewExperience=2,fractureObjects=3,validateCampaignHandoff=4;",
  "function composeCinderfallLayout(x){return x}",
  "this.preparedHouseholds=expandAuthoredOpenings(expandFieldOrigins(composeCinderfallLayout(this.preparedHouseholds)));",
  "this.data=s.story?clone(this.preparedHouseholds):expandFrontiers(furnishCampaign(furnishWorld(clone(this.sourceData))));"
 ].join('\n'),
 geometry:[
  "import {paintNativeGroundFinish} from './native-ground-537.js?v=5.37.0';",
  "function appendAdventureLandscape(){}",
  "function appendInteriorSurround(){}",
  "export function buildAdventureGeometry(){",
  "  return m;",
  "}"
 ].join('\n'),
 main:[
  "import {} from './mineral-resonance.js';",
  "import {} from './journey-experience.js';",
  "const fractureUI={},skipCinderfallTutorial=()=>{};",
  "function continueFieldJourney(){if(fractureUI.active){fractureUI.open();return;}return 'normal'}",
  "onExplore(){currentVictoryReport=null;release();notice('Explore at your pace. Tap the objective when you want to continue.');}"
 ].join('\n'),
 journey:[
  "const hint='Continue route resumes guidance.';",
  "const touchHint='Continue route resumes guidance.';",
  "button(value.continueLabel||'Continue route','continue',onContinue);"
 ].join('\n')
};
test('pure current-live overlay preserves fracture, tutorial, campaign and mineral systems',()=>{
 const patch=stageSpatialSources(sources);
 assert.ok(patch.world.includes('expandVastScenes(broadenMainline(expandAuthoredOpenings('));
 assert.ok(patch.world.includes('composeCinderfallLayout(this.preparedHouseholds)'));
 assert.ok(patch.world.includes('migrateHeroGrowth')&&patch.world.includes('validateCampaignHandoff'));
 assert.ok(patch.geometry.includes('appendSpatialLandmarks(m,{world});\n  return m;'));
 assert.ok(patch.main.includes('fractureUI.open()')&&patch.main.includes('skipCinderfallTutorial'));
 assert.ok(patch.main.includes('questGuide?.cancel();path=[]'));
 assert.ok(patch.journey.includes("button(value.continueLabel||'Follow story path'"));
 assert.equal(patch.journey.split('Continue route resumes guidance.').length-1,0);
 assert.ok(patch.journey.includes('value.continueLabel'),'special fracture continuation preserved');
});
test('bridge fails closed on missing new systems, mismatched anchors and duplicate installation',()=>{
 assert.throws(()=>stageSpatialSources({...sources,main:sources.main.replace('fractureUI','retiredUI')}),/modern live/);
 assert.throws(()=>stageSpatialSources({...sources,world:sources.world.replace('composeCinderfallLayout(this.preparedHouseholds)','this.preparedHouseholds')}),/modern live|Fail closed/);
 const patched=stageSpatialSources(sources);
 assert.throws(()=>stageSpatialSources(patched),/already present/);
 assert.throws(()=>stageSpatialSources({...sources,journey:sources.journey.replace('Continue route resumes guidance.','route retired')}),/Fail closed/);
});
test('staging creates new SHA-256 patch bundle and never edits authenticated source',()=>{
 const base=mkdtempSync(join(tmpdir(),'ash-spatial-stage-'));
 try{
  const src=join(base,'source'),out=join(base,'review');
  mkdirSync(join(src,'game/engine2'),{recursive:true});
  for(const[key,file]of Object.entries({world:'world.js',geometry:'adventure-3d-geometry.js',main:'main.js',journey:'field-journey-ui.js'}))writeFileSync(join(src,'game/engine2',file),sources[key]);
  const manifest=stageSpatialSnapshot(src,out);
  assert.equal(manifest.deployed,false);assert.equal(manifest.files.length,7);
  assert.ok(existsSync(join(out,'game/engine2','vast-spatial-expansion.mjs')));
  assert.equal(readFileSync(join(src,'game/engine2/world.js'),'utf8'),sources.world);
  assert.ok(readFileSync(join(out,'game/engine2/world.js'),'utf8').includes('expandVastScenes('));
  assert.throws(()=>stageSpatialSnapshot(src,out),/Output exists/);
  assert.throws(()=>stageSpatialSnapshot(src,join(src,'patch')),/Output must not/);
 }finally{rmSync(base,{recursive:true,force:true});}
});
