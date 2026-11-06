import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {Battle,makeEnemy} from '../battle.js';
import {Geometry} from '../cistern-renderer.js';
import {objectiveEncounterContext} from '../objective-context.js';
import {objectiveCommand,executeObjectiveIntent} from '../encounter-objectives.js';
import {instrumentCommand} from '../combat-instruments.js';
import {appendAdventureEncounterContent,adventureEncounterView,adventureEncounterActors} from '../adventure-encounter-content.js';
import {ORIGINS} from '../origin-content.js';

function fixture(kind,origin=null){
 const w=new World(source);w.newGame(origin?{originId:origin.id}:{quiet:true});
 if(!origin){w.state.scene=5;[w.state.x,w.state.y]=w.scene.arrive.map(n=>n+.5);}
 w.state.mode='field';
 const object={type:'wild',serial:1,tier:1,seed:997,objectiveKind:kind,xy:[Math.floor(w.state.x),Math.floor(w.state.y)]};
 const context=objectiveEncounterContext(w,object,{reinforcementLimit:0}),spec=context.objective;assert.ok(spec,kind);
 const h=w.activeHeroes[0];Object.assign(h,{x:spec.asset.x,y:spec.asset.y});
 const far=spec.walkable.at(-1),e=makeEnemy('predator',1);Object.assign(e,{x:far[0]+.5,y:far[1]+.5,power:3});
 const b=new Battle({heroes:[h],enemies:[e],chapter:1,context});assert.ok(b.objective,kind);
 return {w,b,h,e,spec,object};
}
function draw(w,b,time=3){
 const before=JSON.stringify([w.state,b?.snapshot?.(),w.roamingPack]),mesh=new Geometry(),shadow=new Geometry(),glow=new Geometry();
 appendAdventureEncounterContent(mesh,shadow,glow,{world:w,battle:b,time});
 const actors=adventureEncounterActors(w,b),view=adventureEncounterView(w,b);
 assert.equal(JSON.stringify([w.state,b?.snapshot?.(),w.roamingPack]),before,'Rendering must not pay an action, tick a clock, change a save or reveal a reward');
 for(const g of[mesh,shadow,glow]){assert.equal(g.v.length%12,0);assert.ok(g.v.every(Number.isFinite));}
 return {mesh,shadow,glow,actors,view,signature:JSON.stringify([mesh.v,shadow.v,glow.v,actors])};
}

test('native rescue, pressure, store and relay encounters get exact-position assets on all seven origin backdrops',()=>{
 for(const origin of ORIGINS)for(const kind of['escort','regulator','supply','signal']){
  const {w,b}=fixture(kind,origin),r=draw(w,b);
  assert.ok(r.mesh.v.length>0,origin.id+':'+kind);assert.ok(r.shadow.v.length>0);
  assert.equal(r.view.asset,b.objective.asset);assert.equal(r.view.kind,kind);
  assert.equal(w.scene.floor[Math.floor(r.view.asset.y)][Math.floor(r.view.asset.x)],'.');
  if(kind==='escort'){assert.equal(r.actors.length,1);assert.equal(r.actors[0].x,b.objective.asset.x);assert.equal(r.actors[0].y,b.objective.asset.y);assert.equal(r.actors[0].person.row,14);}
  else assert.equal(r.actors.length,0);
 }
});

test('roaming objective preview uses the same native asset without creating a Battle or advancing state',()=>{
 for(const kind of['escort','regulator','supply','signal']){
  const {w,b,spec,object}=fixture(kind);w.roamingPack={object,objective:spec};const before=JSON.stringify(w.state),preview=draw(w,null);
  assert.ok(preview.view.preview);assert.equal(preview.view.asset,spec.asset);assert.equal(preview.view.value,0);assert.equal(preview.view.remaining,1);
  assert.ok(preview.mesh.v.length>0);assert.equal(JSON.stringify(w.state),before);
  const live=draw(w,b);assert.equal(live.view.asset.x,preview.view.asset.x);assert.equal(live.view.asset.y,preview.view.asset.y);
 }
});

test('native objective actions visibly move the patient, wheel, store bindings and disconnected relay contacts',()=>{
 for(const [kind,action]of[['escort','guide'],['regulator','stabilize'],['supply','secure'],['signal','disable']]){
  const {w,b,h,e}=fixture(kind);e.x=b.objective.asset.x+5;e.y=b.objective.asset.y+5;
  const before=draw(w,b);h.atb=1;assert.equal(objectiveCommand(b,h,b.objective.asset,{action}),true);
  const after=draw(w,b);assert.notEqual(after.signature,before.signature,kind);
  if(kind==='escort'){assert.ok(b.objective.escorting);assert.notDeepEqual(after.actors.map(a=>[a.x,a.y]),before.actors.map(a=>[a.x,a.y]));}
  else assert.equal(after.view.progress,1);
 }
});

test('native theft and sabotage remove a bundle and expose integrity or pressure consequences',()=>{
 for(const kind of['supply','regulator','signal','escort']){
  const {w,b,e}=fixture(kind),asset=b.objective.asset;e.x=asset.x+1;e.y=asset.y;
  const before=draw(w,b),intent={kind:kind==='supply'?'objective-steal':'objective-sabotage',objectiveId:b.objective.id,target:asset.id,x:asset.x,y:asset.y,power:24};
  assert.equal(executeObjectiveIntent(b,e,intent),true);const after=draw(w,b);assert.notEqual(after.signature,before.signature,kind);
  if(kind==='supply')assert.equal(after.view.thefts,1);else assert.ok(after.view.integrity<before.view.integrity);
 }
});

test('saved objective snapshot restores the identical machine, route, patient and partial progress',()=>{
 for(const kind of['escort','regulator','supply','signal']){
  const {w,b,h}=fixture(kind);h.atb=1;assert.ok(objectiveCommand(b,h,b.objective.asset,{action:{escort:'guide',regulator:'stabilize',supply:'secure',signal:'disable'}[kind]}));
  const before=draw(w,b),saved=JSON.parse(JSON.stringify(b.snapshot()));const restored=new Battle({heroes:b.heroes,enemies:[],chapter:1,context:b.context});restored.restore(saved);
  const after=draw(w,restored);assert.equal(after.signature,before.signature,kind);
 }
});

test('native listening coverage and clay replay appear only while their finite charges remain',()=>{
 const {w,b,h,e}=fixture('signal'),node=b.instruments.safeNodes[0];assert.ok(node);
 Object.assign(h,{x:node.x,y:node.y,atb:1});const initial=draw(w,b);
 assert.ok(instrumentCommand(b,h,e,{action:'coverage',nodeId:node.id}));const covered=draw(w,b);assert.notEqual(covered.signature,initial.signature);
 b.instruments.coverage[0].charges=0;const spent=draw(w,b);assert.equal(spent.signature,initial.signature);
 b.instruments.patterns=[{id:'saved-test-charge',name:'Retained aimed beat',family:'test-creature',kind:'strike',shape:'line',windup:2,power:10,sourceLabel:'Known charge'}];h.atb=1;
 assert.ok(instrumentCommand(b,h,e,{action:'replay',patternId:'saved-test-charge',nodeId:node.id}));const playing=draw(w,b);assert.notEqual(playing.signature,initial.signature);
 b.instruments.decoy.charges=0;assert.equal(draw(w,b).signature,initial.signature);
});

test('missing, distant and blocked objective positions do not create geometry outside the real world',()=>{
 const {w,b}=fixture('signal');b.objective.asset.x=-100;b.objective.asset.y=-100;
 assert.equal(adventureEncounterView(w,b),null);assert.deepEqual(adventureEncounterActors(w,b),[]);
 const r=draw(w,b);assert.equal(r.shadow.v.length,0);assert.equal(r.mesh.v.length>0,true,'Valid listening nodes can remain visible independently');
 const empty={scene:w.scene,state:w.state};const m=new Geometry(),s=new Geometry(),g=new Geometry();appendAdventureEncounterContent(m,s,g,{world:empty,battle:null});assert.equal(m.v.length+s.v.length+g.v.length,0);
});
