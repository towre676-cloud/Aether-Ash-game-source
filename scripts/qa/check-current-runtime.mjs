/** Test CURRENT source + isolated overlay, never the archived live-site tree.
 * Usage: node scripts/qa/check-current-runtime.mjs CURRENT_DIST STAGED_DIST REPORT.json
 * These are engine checks, not a substitute for browser input/render verification.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const [baseArg,stagedArg,reportArg]=process.argv.slice(2);
if(!baseArg||!stagedArg||!reportArg)throw Error('Expected CURRENT_DIST STAGED_DIST REPORT.json');
const base=resolve(baseArg,'game/engine2'),staged=resolve(stagedArg,'game/engine2');
assert.notEqual(base,staged);
const imp=(root,file)=>import(pathToFileURL(join(root,file)));
const {World:Before}=await imp(base,'world.js'),{World:After}=await imp(staged,'world.js');
const {skipCinderfallTutorial}=await imp(base,'tutorial-skip.js');
const {awardMineral}=await imp(base,'mineral-resonance.js');
const {ensureLivingArmory,transactLivingArmory}=await imp(base,'living-armory/campaign.js');
const {rollItem}=await imp(base,'living-armory/src/armory.mjs');
const {findPath}=await imp(staged,'navigation.js');
const {advanceRoute}=await imp(staged,'player-locomotion.js');
const {spatialEcologySites,validateSpatialEcology}=await imp(staged,'spatial-ecology.mjs');
const {spatialWildlifeActors,appendSpatialWildlifeMotion,drawSpatialWildlife2D}=await imp(staged,'spatial-wildlife.mjs');
const source=JSON.parse(readFileSync(join(base,'world.json'))),report={kind:'current-engine-checks',browserVerified:false,deployed:false,checks:[]};
const persist=()=>writeFileSync(resolve(reportArg),JSON.stringify(report,null,2)+'\n');
function check(name,fn){try{const detail=fn();report.checks.push({name,pass:true,detail});persist();console.log('PASS '+name);}catch(e){report.checks.push({name,pass:false,error:e.stack});persist();throw e;}}
const before=new Before(source),after=new After(source);
check('modern tutorial, campaign, equipment, minerals and Fractures save migration',()=>{
 assert.ok(skipCinderfallTutorial(before));
 awardMineral(before.state,{id:'calcite',source:'qa-existing-save',quantity:2});
 const armory=ensureLivingArmory(before.state),item=rollItem({seed:'qa',eventId:'qa-existing-gear',level:1,forceSlot:'mainhand',forceRarity:'rare'});
 armory.snapshot.overflow.push(item);armory.revision++;
 assert.ok(transactLivingArmory(before.state,0,'equip',[item.id]).ok);
 before.state.fractures={version:1,next:2,clears:{fault:1},anchors:{},active:null};
 const save=JSON.parse(before.save());
 // Compare canonical restore with and without the overlay, not raw unmigrated bytes.
 before.restore(save);after.restore(save);
 const fields=['story','campaignHandoff','chapter','bosses','flags','items','cores','supports','party','recruited','heroes','livingArmory','mineralResonance','fractures','gold','xp'];
 for(const field of fields)assert.deepEqual(after.state[field],before.state[field],field);
 const persisted=after.save();after.restore(persisted);
 for(const field of fields)assert.deepEqual(after.state[field],before.state[field],'roundtrip '+field);
 assert.ok(after.walkable(after.state.x,after.state.y));
 return {fields,equipment:item.id,mineralSamples:after.state.mineralResonance.samples};
});
check('legacy saves retain valid positions across representative expanded frontier scenes',()=>{
 const rows=[];
 for(const id of [2000,2005,2010,2020,2030,2040,2050,2059]){
  const old=before.scenes.get(id);assert.ok(old);
  const s=JSON.parse(before.save());s.scene=id;s.x=old.arrive[0]+.5;s.y=old.arrive[1]+.5;delete s.spatialEcology;
  before.restore(s);after.restore(s);
  assert.ok(after.walkable(after.state.x,after.state.y));
  assert.deepEqual(after.state.mineralResonance,before.state.mineralResonance);
  assert.deepEqual(after.state.livingArmory,before.state.livingArmory);
  rows.push({scene:id,position:[after.state.x,after.state.y],width:after.scene.width,height:after.scene.height});
 }
 return rows;
});
check('expanded-region topology, manual engine traversal and wildlife draw commands',()=>{
 const scenes=after.data.scenes.filter(s=>s.spatialExpansion?.version===1),rows=[];
 assert.ok(scenes.length>=120,'expanded scene inventory');
 for(const scene of scenes){
  after.state.scene=scene.location;after.state.mode='field';
  const sites=spatialEcologySites(scene);assert.equal(sites.length,5,'five stations '+scene.location);
  const start=scene.spatialExpansion.landmarks[0].xy;
  [after.state.x,after.state.y]=start.map(v=>v+.5);
  let distance=0,frames=0;
  for(const site of sites){
   const path=findPath(scene,[after.state.x,after.state.y],site.xy,0);
   assert.ok(path.length||Math.hypot(after.state.x-site.xy[0]-.5,after.state.y-site.xy[1]-.5)<.01,'reachable '+site.spatialId);
   while(path.length){
    const step=advanceRoute(after,path,1/30);distance+=step.distance;
    assert.ok(!step.blocked&&step.distance>0,'movement stalls '+site.spatialId);
    assert.ok(after.walkable(after.state.x,after.state.y),'walkable route');
    assert.ok(++frames<100000,'bounded route');
   }
  }
  const habitat=scene.spatialExpansion.landmarks[6].xy;
  [after.state.x,after.state.y]=habitat.map(v=>v+.5);
  const a=spatialWildlifeActors(after,1),b=spatialWildlifeActors(after,2);
  assert.ok(a.length>0&&a.length<=5,'fauna '+scene.location);assert.notDeepEqual(a,b,'moving fauna');
  for(const actor of a)assert.equal(scene.floor[Math.floor(actor.z)]?.[Math.floor(actor.x)],'.');
  let geometryCalls=0,canvasCalls=0;
  const mesh={sphere(...v){assert.ok(v.slice(0,4).every(Number.isFinite));geometryCalls++;},tube(){geometryCalls++;}};
  assert.equal(appendSpatialWildlifeMotion(mesh,mesh,{world:after,time:1}),a.length);
  const ctx=new Proxy({}, {get:()=>()=>{canvasCalls++;},set:()=>true});
  assert.equal(drawSpatialWildlife2D(ctx,after,1),a.length);
  assert.ok(geometryCalls>0&&canvasCalls>0);
  rows.push({scene:scene.location,stations:sites.length,distance:Number(distance.toFixed(2)),actors:a.length,geometryCalls,canvasCalls});
 }
 return {regions:rows.length,rows};
});
check('ecology validation rejects malformed saves',()=>{
 for(const spatialEcology of [{version:2,sites:{}},{version:1,sites:{2000:{stage:99,choice:null,fauna:false,mask:0}}}])
  assert.throws(()=>validateSpatialEcology({spatialEcology}));
 return {rejected:2};
});
report.pass=true;persist();
