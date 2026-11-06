import test from 'node:test';
import assert from 'node:assert/strict';
import {authorScene} from '../src/scene-composer.mjs';
import {landmarkRole,planEnvironment,validateEnvironmentPlan,biomeFamily,pathClearance} from '../src/environment-plan.mjs';
import {createSpatialAuthoringLayer} from '../src/spatial-3d-integration.mjs';

const spec={id:'old-furnace-quarter',kind:'settlement',bounds:{minX:-35,maxX:35,minZ:-33,maxZ:33},
 anchors:[
  {id:'south-gate',kind:'threshold',x:0,z:19,importance:8},
  {id:'blacksmith-forge',kind:'workshop',x:-10,z:7,importance:4},
  {id:'old-well',kind:'well',x:11,z:4,importance:6},
  {id:'watch-tower',kind:'tower',x:-12,z:-13,importance:2},
  {id:'houses',kind:'dwelling',x:8,z:-12,importance:5},
  {id:'the-choir-sanctuary',kind:'sanctuary',x:0,z:-20,importance:3}
 ]};

test('environment roles follow meaning; named anchors produce distinct architecture',()=>{
 const plan=planEnvironment(authorScene(spec),{region:'clay'});
 assert.deepEqual(new Set(plan.placements.map(p=>p.role)),new Set(['threshold','workshop','well','tower','dwelling','sanctuary']));
 assert.equal(plan.stats.buildings,4);
 assert.equal(plan.stats.blindVoidFillers,0);
 assert.ok(plan.walkways.length>=5);
 assert.equal(validateEnvironmentPlan(plan).ok,true);
 const replay=planEnvironment(authorScene(spec),{region:'clay'});assert.deepEqual([plan.placements,plan.walkways,plan.landscapes],[replay.placements,replay.walkways,replay.landscapes]);
});

test('walkways use shortest connected paths not importance-order hop-scotch',()=>{
 const anchors=[{id:'A',x:0,z:0,importance:9},{id:'B',x:1,z:0,importance:1},{id:'C',x:2,z:0,importance:8},{id:'D',x:3,z:0,importance:2}];
 const layout=authorScene({id:'route-test',kind:'wilderness',anchors,bounds:{minX:-10,maxX:12,minZ:-12,maxZ:12}});
 const plan=planEnvironment(layout);
 assert.ok(plan.walkways.every(w=>Math.hypot(w.to.x-w.from.x,w.to.z-w.from.z)<=1.01));
 assert.equal(plan.walkways.length,3);
});

test('environment accepts explicit authored paths',()=>{
 const a=authorScene(spec);
 a.routes=[{from:'old-well',to:'houses'},{from:'south-gate',to:'blacksmith-forge'}];
 const p=planEnvironment(a);
 assert.equal(p.walkways.length,2);
 assert.ok(p.walkways.some(w=>w.id.includes('old-well:houses')));
});

test('procedural horizon never fills story routes or blocks doors',()=>{
 const plan=planEnvironment(authorScene(spec),{region:'water'});
 for(const cluster of plan.landscapes){
  assert.ok(!plan.hasClearRoute(cluster,0),cluster.id);
  for(const w of plan.walkways)assert.ok(pathClearance(cluster,w.from,w.to)>.5*w.width,cluster.id);
 }
 assert.ok(plan.landscapes.every(p=>p.semantic==='framed-horizon'||p.semantic==='inhabited-threshold'));
});

test('mobile has fewer environment instances with identical gameplay anchors',()=>{
 const layout=authorScene(spec);
 const mobile=planEnvironment(layout,{quality:'low'}),high=planEnvironment(layout,{quality:'high'});
 assert.deepEqual(mobile.placements,high.placements);
 assert.ok(mobile.landscapes.length<=high.landscapes.length);
 assert.deepEqual(mobile.walkways,high.walkways);
});

test('four narrative regions receive different material and habitat families',()=>{
 assert.equal(biomeFamily('ash city'),'ash');
 assert.equal(biomeFamily('water marsh'),'water');
 assert.equal(biomeFamily('clay orchard'),'clay');
 assert.equal(biomeFamily('sky aether'),'aether');
 const regs=['ash','water','clay','aether'];
 const sets=regs.map(r=>planEnvironment(authorScene({...spec,id:`e-${r}`}),{region:r}));
 assert.equal(new Set(sets.map(x=>x.region)).size,4);
 assert.ok(sets.every(x=>x.stats.blindVoidFillers===0));
});

test('scene filler objects have no prop geometry or collision authority',()=>{
 const world=authorScene({id:'blank-test',kind:'wilderness',bounds:{minX:-75,maxX:75,minZ:-75,maxZ:75},anchors:[{id:'bridge',x:0,z:0}]});
 assert.ok(world.voidFillers.length>0);
 assert.ok(world.voidFillers.every(v=>v.visualOnly===true&&v.renderAsProp===false&&v.geometry==='surface-decal'));
 assert.ok(world.connectors.every(v=>v.renderAsProp===false));
});

test('host visual renderer is invoked on build and action without changing gameplay delegation',()=>{
 const calls=[];
 const drawing={draw:(plan,opts)=>calls.push(['draw',plan.id,opts.region]),drawDungeon:(d,opts)=>calls.push(['dungeon-draw',d.id,opts.activeOnly]),showDungeonConsequence:r=>calls.push(['consequence',r.roomId]),tick:()=>calls.push(['tick']),stats:()=>({meshes:123}),clear:()=>calls.push(['clear'])};
 const host={graphics:{environmentRenderer:drawing,environmentQuality:'high',setLegacySceneryVisible:v=>calls.push(['legacy',v])},world:{region:'clay',applyAuthoredLayout:l=>calls.push(['layout',l.id]),registerDungeonSequence:d=>calls.push(['dungeon',d.id]),applyVisibleConsequence:r=>calls.push(['host-action',r.roomId])}};
 const bridge=createSpatialAuthoringLayer(host);const out=bridge.composeScene(spec);
 assert.equal(out.environmentStats.meshes,123);
 const dungeon=bridge.composeDungeon({id:'undercity',rooms:3});
 bridge.act(dungeon.rooms[1],dungeon.rooms[1].verb);bridge.tick(.016,3.2);bridge.clearVisuals();
 assert.deepEqual(calls.map(x=>x[0]),['layout','draw','legacy','dungeon','dungeon-draw','legacy','host-action','consequence','tick','clear','legacy']);
});

test('wrong dungeon verb does not trigger world or visual effects',()=>{
 const effects=[];
 const layer=createSpatialAuthoringLayer({graphics:{environmentRenderer:{showDungeonConsequence:r=>effects.push('visual')}},world:{applyVisibleConsequence:r=>effects.push('world')}});
 const room={id:'one',verb:'match-frequency',visibleState:{before:'b',during:'d',after:'a'}};
 assert.equal(layer.act(room,'bad').success,false);assert.deepEqual(effects,[]);
});

test('renderer failure leaves original scenery available instead of blanking the game',()=>{
 const events=[];
 const layer=createSpatialAuthoringLayer({
  graphics:{environmentRenderer:{draw(){throw Error('simulated GPU init failure');},stats:()=>({})},setLegacySceneryVisible:v=>events.push(v)},
  world:{applyAuthoredLayout:()=>events.push('gameplay-layout')},
  telemetry:{reportEnvironmentFallback:e=>events.push(e.message)}
 });
 const result=layer.composeScene({id:'safe',kind:'settlement'});
 assert.equal(result.authored.id,'safe');
 assert.deepEqual(events,['gameplay-layout',true,'simulated GPU init failure']);
});
