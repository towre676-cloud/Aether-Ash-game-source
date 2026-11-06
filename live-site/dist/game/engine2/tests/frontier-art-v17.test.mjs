import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {frontierVisible} from '../frontiers.js';
import {ENVIRONMENT_PROP_BY_ID,ENVIRONMENT_STAGED_IDS} from '../environment-art-v17.js';
import {frontierObjectSpec,frontierWayfindingSpec,drawFrontierWayfinding,frontierObject} from '../frontier-art.js';

const outdoor={key:'field',location:2000,width:34,height:28,biome:{style:'sand'}};
function surface({throwDraw=false}={}){
 const calls=[],stack=[],ctx={globalAlpha:.75,
  save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},
  drawImage(...args){if(throwDraw)throw Error('image decode failed');calls.push(['drawImage',...args,this.globalAlpha]);}
 };
 for(const method of ['translate','scale','rotate','fillRect','strokeRect','beginPath','moveTo','lineTo','closePath','fill','stroke','arc','ellipse'])ctx[method]=(...args)=>calls.push([method,...args]);
 return {ctx,calls,stack};
}
function renderer(ctx,scene=outdoor){return {ctx,currentScene:scene,assets:{environmentWayfinding:{width:1774,height:887},environmentShelters:{width:1774,height:887}},lastWorld:{state:{x:30,y:26}},followers:[]};}

test('new utility sprites preserve their approved measured crops and staging policy',()=>{
 for(const file of ['wayfinding-v17.json','shelters-v17.json']){
  const metadata=JSON.parse(fs.readFileSync(new URL('../../../../development/art/'+file,import.meta.url),'utf8'));
  for(const sheet of metadata.sheets)for(const sprite of sheet.sprites){const registered=ENVIRONMENT_PROP_BY_ID[sprite.id];assert.ok(registered);assert.deepEqual(registered.crop,sprite.crop);assert.equal(registered.asset,sheet.assetKey);assert.equal(registered.role,'utility');}
 }
 assert.ok(ENVIRONMENT_STAGED_IDS.includes('rope-trail-gate'));assert.ok(ENVIRONMENT_STAGED_IDS.includes('river-stairs'));
});

test('painted utility roles cover actual dispatches, surveys and supplies without changing the world',()=>{
 const world=new World(JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url),'utf8'))),before=JSON.stringify({data:world.data,state:world.state}),counts={};
 for(const scene of world.data.scenes){
  for(const object of scene.objects||[]){
   const spec=frontierObjectSpec(scene,object);if(spec){counts[spec.id]=(counts[spec.id]||0)+1;assert.ok(!ENVIRONMENT_STAGED_IDS.includes(spec.id));assert.ok(spec.height<=108);assert.ok(spec.width<=140);}
   if(object.type==='camp'&&spec)assert.equal(spec.collection,'shelters','rest markers remain shelters rather than supply caches');
   if(object.type==='frontier-landmark'&&object.frontierStep===1&&['sand','cactus','coral','marble'].includes(scene.biome.style))assert.equal(spec,null,'unmatched repair machinery keeps its established drawing');
  }
  for(const exit of [...(scene.doors||[]),...(scene.objects||[])]){const spec=frontierWayfindingSpec(scene,exit);if(spec){counts[spec.id]=(counts[spec.id]||0)+1;assert.ok(spec.height<=80);assert.ok(!ENVIRONMENT_STAGED_IDS.includes(spec.id));}}
 }
 assert.equal(counts['frontier-noticeboard'],61);assert.equal(counts['survey-marker']+counts['carved-standing-stone'],60);assert.equal(counts['weather-beacon'],10);
 assert.ok(counts['refuge-cache']>0);assert.ok(counts['trail-fingerpost']>0);assert.ok(counts['travel-waystone']>0);
 assert.equal(JSON.stringify({data:world.data,state:world.state}),before,'selection does not alter positions, routes, commissions, items or journey state');
});

test('travel artwork stays on existing outdoor routes and arrows follow a clear horizontal exit',()=>{
 const route={type:'portal',to:'frontier_dunes_1',xy:[29,13]};
 assert.equal(frontierWayfindingSpec(outdoor,route).id,'trail-fingerpost');assert.equal(frontierWayfindingSpec(outdoor,route).flip,false);
 const west=frontierWayfindingSpec(outdoor,{...route,xy:[4,13]});assert.equal(west.id,'trail-fingerpost');assert.equal(west.flip,true);
 for(const xy of [[16,2],[16,25],[4,23],[17,14]])assert.equal(frontierWayfindingSpec(outdoor,{...route,xy}).id,'travel-waystone','vertical or ambiguous route has no guessed arrow');
 assert.equal(frontierWayfindingSpec({...outdoor,biome:{style:'storm'}},route).id,'travel-waystone');
 for(const blocked of [{facade:{}},{wallMounted:true},{buildingEntrance:true},{architecturalKind:'stairs'},{to:'archive'},{to:'home'},{to:'underground_drain'},{type:'camp'}])assert.equal(frontierWayfindingSpec(outdoor,{...route,...blocked}),null);
 assert.equal(frontierWayfindingSpec(outdoor,route,{indoor:true}),null);assert.equal(frontierWayfindingSpec({key:'home',household:{kind:'home'}},route),null);assert.equal(frontierWayfindingSpec(outdoor,{type:'portal',xy:[29,13]}),null);
 for(const object of [{type:'trail-refuge'},{type:'camp',storyAuthored:true},{type:'cache',physicalId:'specific-cache'},{type:'cache',battleRelic:'artifact'},{type:'cache',buildingEntrance:true}])assert.equal(frontierObjectSpec(outdoor,object),null);
 assert.equal(frontierObjectSpec({key:'home',household:{kind:'home'}},{type:'cache'}),null);
});

test('regional shelters replace actual outdoor rest points and preserve specialized or indoor services',()=>{
 const world=new World(JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url),'utf8'))),counts={},frontierStyles=new Set();let outdoorCamps=0,indoorCamps=0;
 for(const scene of world.data.scenes)for(const object of scene.objects||[]){if(object.type!=='camp')continue;const before=JSON.stringify({scene,object}),spec=frontierObjectSpec(scene,object);if(!spec){indoorCamps++;continue;}outdoorCamps++;counts[spec.id]=(counts[spec.id]||0)+1;assert.equal(spec.collection,'shelters');assert.ok(spec.height>=90&&spec.height<=104);assert.ok(spec.width<=140);assert.equal(JSON.stringify({scene,object}),before);if(scene.biome)frontierStyles.add(scene.biome.style);}
 assert.equal(outdoorCamps,77);assert.equal(indoorCamps,3);assert.equal(frontierStyles.size,12);assert.equal(Object.keys(counts).length,8);
 assert.equal(counts['frost-windbreak'],10);assert.equal(counts['basalt-refuge'],5);assert.equal(counts['spore-root-shelter'],5);
 for(const special of [{physicalId:'known'},{battleRelic:'known'},{affordanceId:'known'},{authoredArt:'known'},{storyAuthored:true},{originStep:0},{bellArc:'known'},{investigationRole:'known'},{legacyId:'known'},{wayglassSeam:'known'}])assert.equal(frontierObjectSpec(outdoor,{type:'camp',...special}),null);
 assert.equal(frontierObjectSpec({...outdoor,originId:'sable-reed'},{type:'camp'}),null);assert.equal(frontierObjectSpec({key:'inn',household:{kind:'inn'}},{type:'camp'}),null);
});

test('a painted rest shelter retains its exact interaction anchor and label in both graphics modes',()=>{
 const object={type:'camp',xy:[8,23],label:'Frontier shelter'},before=JSON.stringify(object);
 for(const compatibility of [false,true]){const {ctx,calls,stack}=surface(),r={...renderer(ctx),compatibility},spec=frontierObjectSpec(outdoor,object);assert.equal(frontierObject(ctx,object,8.5,23.5,0,r),true);const draw=calls.find(c=>c[0]==='drawImage');assert.deepEqual(draw.slice(2,6),ENVIRONMENT_PROP_BY_ID['desert-awning'].crop);assert.equal(draw[6],8.5*48-spec.width/2);assert.equal(draw[7],23.5*48-spec.height);assert.equal(stack.length,0);assert.equal(ctx.globalAlpha,.75);assert.equal(JSON.stringify(object),before);}
});

test('frontier stage visibility and labels survive a successful painted replacement',()=>{
 const scene={...outdoor,location:2000},state={frontiers:{active:'commission-0',stages:{},claimed:[],visited:[]}},world={scene,state};
 const survey={type:'frontier-landmark',frontierStep:0,xy:[10,8],label:'Survey marker'},apparatus={type:'frontier-landmark',frontierStep:1,xy:[24,7],label:'Field apparatus'};
 for(const stage of [0,1,2]){
  state.frontiers.stages['commission-0']=stage;const before=JSON.stringify({survey,apparatus,state}),{ctx,calls,stack}=surface(),r=renderer(ctx,scene);r.lastWorld=world;
  assert.equal(frontierVisible(world,survey),stage===0);assert.equal(frontierVisible(world,apparatus),stage===1);
  assert.equal(frontierObject(ctx,survey,10.5,8.5,0,r),true);assert.equal(calls.filter(c=>c[0]==='drawImage').length,1);assert.equal(stack.length,0);assert.equal(ctx.globalAlpha,.75);
  assert.equal(JSON.stringify({survey,apparatus,state}),before);
 }
});

test('travel props use tile coordinates, correct mirroring and the same direct image path in either graphics mode',()=>{
 const exit={type:'portal',to:'frontier_dunes_0',xy:[4,13],travel_label:'Trailhead'};
 for(const compatibility of [false,true]){
  const {ctx,calls,stack}=surface(),r={...renderer(ctx),compatibility},before=JSON.stringify(exit),spec=drawFrontierWayfinding(r,exit,4.5,13.5);
  assert.equal(spec.id,'trail-fingerpost');assert.equal(spec.flip,true);assert.deepEqual(calls[0],['translate',4.5*48,13.5*48]);assert.deepEqual(calls[1],['scale',-1,1]);
  const draw=calls.find(c=>c[0]==='drawImage');assert.deepEqual(draw.slice(2,6),ENVIRONMENT_PROP_BY_ID['trail-fingerpost'].crop);assert.equal(draw[6],-spec.width/2);assert.equal(draw[7],-spec.height);
  assert.equal(ctx.globalAlpha,.75);assert.equal(stack.length,0);assert.equal(JSON.stringify(exit),before,'the real destination and label are retained');
 }
});

test('missing or failed sprites preserve established frontier and route fallbacks',()=>{
 const board={type:'frontier-board',label:'Dispatch ledger'},cache={type:'cache'},camp={type:'camp',label:'Frontier shelter'},exit={type:'portal',to:'hub',xy:[4,23]};
 for(const fail of ['absent','decoder']){
  const {ctx,calls,stack}=surface({throwDraw:fail==='decoder'}),r=renderer(ctx);if(fail==='absent')r.assets={};
  frontierObject(ctx,board,6.5,22.5,0,r);assert.ok(calls.some(c=>c[0]==='strokeRect'),'established board fallback draws');assert.equal(stack.length,0);assert.equal(ctx.globalAlpha,.75);
  const count=calls.length;assert.equal(frontierObject(ctx,cache,9,12,0,r),false);assert.equal(calls.length,count,'cache fallback remains with the cache caller');
  assert.equal(frontierObject(ctx,camp,8.5,23.5,0,r),false);assert.equal(calls.length,count,'rest fallback remains with the existing camp caller');
  assert.equal(drawFrontierWayfinding(r,exit,4.5,23.5),null);assert.equal(stack.length,0);assert.equal(ctx.globalAlpha,.75);
 }
 const old=surface();frontierObject(old.ctx,board,6.5,22.5,0);assert.ok(old.calls.some(c=>c[0]==='strokeRect'),'legacy five-argument call remains supported');assert.equal(old.stack.length,0);
});
