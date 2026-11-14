import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stageLivingSources,stageLivingSnapshot} from '../stage-live-living-regions.mjs';

const source={
 world:[
  "import {expandAuthoredOpenings} from './authored-openings.js?v=5.38';",
  "import {expeditionObjects,interactExpedition,validateExpeditions} from './field-expeditions.js?v=fractures-4';",
  'const migrateHeroGrowth=1,grantCrewExperience=2,fractureObjects=3,validateCampaignHandoff=4;',
  'function composeCinderfallLayout(x){return x}',
  "this.preparedHouseholds=expandAuthoredOpenings(expandFieldOrigins(composeCinderfallLayout(this.preparedHouseholds)));",
  "this.data=s.story?clone(this.preparedHouseholds):expandFrontiers(furnishCampaign(furnishWorld(clone(this.sourceData))));",
  "objects(){return [...expeditionObjects(this)].filter(o=>this.available(o));}",
  "loadScene(){this.state.mode='field';settleHouseholdPosition(this);applyAffordanceScene(this);this.callbacks.onScene(next);}",
  "move(dx,dy){const s=this.state;if(this.walkable(s.x,s.y+dy))s.y+=dy;}",
  "interact(o){observeBellArc(this,o);}",
  "restore(){validateExpeditions(s);applyAffordanceScene(this);}"
 ].join('\n'),
 geometry:[
  "import {paintNativeGroundFinish} from './native-ground-537.js?v=5.37.0';",
  "function appendAdventureLandscape(){}function appendInteriorSurround(){}",
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
 ].join('\n'),
 encounters:[
  "import {isInteriorScene} from './scene-identity.js?v=4.0.0';",
  "function encounterProtected(world){",
  "return (scene.objects||[]).some(o=>o.type==='portal'?near(o,1.1):['npc','guide','shop','camp','transport','frontier-board'].includes(o.type)&&near(o,1.15));",
  "}",
  "function resetEncounterGrace(){}function advanceEncounters(){",
  "const consumed=distance*(Number.isFinite(ecologyPace)?clamp(ecologyPace,.65,1.3):1);",
  "}"
 ].join('\n'),
 adventure:[
  "import {appendAdventureLandscapeDynamics} from './adventure-landscape.js?v=fractures-4';",
  "function appendFractures(){}function buildDynamic(){",
  "appendAdventureLivingDynamic(m,glow,options);",
  "}"
 ].join('\n'),
 renderer:[
  "import {drawReconciledGround} from './reconciled-ground.js?v=fractures-4';",
  "function drawLivingAtlas(){}function render(){drawBellrun(this,world);}",
  "const known=this.compatibility;"
 ].join('\n'),
 roomMap:[
  "import {roomWayfinding} from './room-wayfinding.js?v=scene-finish-1';",
  "export function mountRoomMap({game,getWorld,getObjective,onOpen,onWalk}){",
  "const panel={};const status={};",
  "panel.append(header,map,list,status);let view=null;",
  "function choose(x,z){",
  "if(onWalk(x,z))panel.close();",
  "else status.textContent='That spot is out of reach.';",
  "}",
  "function render(){const w=getWorld(),s=w.scene,p=roomWayfinding(w,w.objects());",
  "list.replaceChildren();status.textContent='';",
  "const marks=p.marks.filter(m=>cells.has(m.x+','+m.z));",
  "}",
  "panel.showModal();}"
 ].join('\n')
};
test('modern live overlay preserves newer systems and extends the current native room map, not duplicate controls',()=>{
 const result=stageLivingSources(source);
 assert.equal(Object.keys(result).length,8);
 assert.ok(result.world.includes('composeCinderfallLayout(this.preparedHouseholds)'));
 assert.ok(result.world.includes('fractureObjects')&&result.world.includes('validateCampaignHandoff'));
 assert.ok(result.world.includes('spatialEcologyObjects(this)'));
 assert.ok(result.world.includes('validateSpatialEcology(s)')&&result.world.includes('discoverSpatialEcology(this'));
 assert.ok(result.main.includes('fractureUI.open()')&&result.main.includes('skipCinderfallTutorial'));
 assert.ok(!result.main.includes('mountSpatialRegionMap'),'one map system in the current Site');
 assert.ok(result.geometry.includes('appendSpatialLandmarks(m,{world});'));
 assert.ok(result.encounters.includes('spatialEcologyEncounterPace(world)'));
 assert.ok(result.adventure.includes('appendSpatialWildlifeMotion(m,glow,options);'));
 assert.ok(result.renderer.includes('drawSpatialWildlife2D(c,world,this.time);'));
 assert.ok(result.roomMap.includes('Follow selected waypoint'));
 assert.ok(result.roomMap.includes('spatialEcologySites(s)'));
 assert.ok(result.roomMap.includes("const label=known?'Fieldwork"));
 assert.ok(!result.roomMap.includes('if(onWalk(x,z))panel.close()'),'clicking an ordinary map pin may not autowalk');
 assert.ok(result.roomMap.includes('if(selected&&onWalk(...selected))panel.close()'),'explicit follow remains possible');
 for(const[k,v]of Object.entries(source))assert.ok(v.length>50,'source fixture nonempty '+k);
});
test('staging refuses changed, duplicate, missing and incompatible current Site sources',()=>{
 assert.throws(()=>stageLivingSources({...source,world:source.world.replaceAll('fractureObjects','oldFracture')}),/modern live/);
 assert.throws(()=>stageLivingSources({...source,roomMap:source.roomMap.replaceAll('onWalk','retiredWalk')}),/current native/);
 assert.throws(()=>stageLivingSources({...source,encounters:source.encounters.replace('const consumed=','const cost=')}),/Fail closed/);
 const staged=stageLivingSources(source);
 assert.throws(()=>stageLivingSources({...source,world:staged.world}),/already present|Fail closed/);
});
test('the create-only 13-file staging manifest has real SHA-256 receipts and does not mutate the source export',()=>{
 const root=mkdtempSync(join(tmpdir(),'ash-live-region-'));
 try{
  const sourceRoot=join(root,'modern-site-dist'),out=join(root,'review');
  mkdirSync(join(sourceRoot,'game/engine2'),{recursive:true});
  const fileMap={world:'world.js',main:'main.js',geometry:'adventure-3d-geometry.js',
   journey:'field-journey-ui.js',encounters:'field-encounters.js',adventure:'adventure-3d-renderer.js',
   renderer:'renderer.js',roomMap:'room-map.js'};
  for(const[k,v]of Object.entries(fileMap))writeFileSync(join(sourceRoot,'game/engine2',v),source[k]);
  const manifest=stageLivingSnapshot(sourceRoot,out);
  assert.equal(manifest.deployed,false);assert.equal(manifest.kind,'review-only');
  assert.equal(manifest.files.length,13);
  assert.equal(new Set(manifest.files.map(f=>f.file)).size,13);
  for(const entry of manifest.files){
   assert.match(entry.newSha256,/^[0-9a-f]{64}$/);
   assert.ok(existsSync(join(out,'game/engine2',entry.file)));
  }
  assert.ok(existsSync(join(out,'LIVING-REGIONS-STAGING.json')));
  assert.equal(readFileSync(join(sourceRoot,'game/engine2/world.js'),'utf8'),source.world);
  assert.throws(()=>stageLivingSnapshot(sourceRoot,out),/exists/);
  assert.throws(()=>stageLivingSnapshot(sourceRoot,join(sourceRoot,'unsafe')),/must not/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
