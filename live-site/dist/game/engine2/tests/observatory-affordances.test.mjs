import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {worldAffordanceObjects,worldAffordanceReservations,applyAffordanceScene,affordanceEncounterContext,applyAffordancePreparation,validWorldAffordances} from '../world-affordances.js';

const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url),'utf8'));
function make(part=0){const w=new World(data);w.newGame({originId:'veyr-storm',quiet:true});w.state.mode='field';if(part){w.state.chronicle.step=2;w.loadScene(50013);}return w;}

test('the authored observatory has no generated stock, repairs or invisible optional blockers',()=>{
 for(const part of[0,1]){const w=make(part),floor=w.scene.floor.slice(),markers=JSON.stringify(w.scene.objects);
  assert.deepEqual(worldAffordanceObjects(w),[]);assert.deepEqual(worldAffordanceReservations(w.scene),[]);assert.deepEqual(applyAffordanceScene(w),[]);
  for(let z=0;z<w.scene.height;z++)for(let x=0;x<w.scene.width;x++)if(w.scene.floor[z][x]==='.')assert.ok(w.walkable(x+.5,z+.5),'authored floor stays open at '+x+','+z);
  assert.deepEqual(w.scene.floor,floor);assert.equal(JSON.stringify(w.scene.objects),markers);
 }
});

test('legacy knowledge, finite kit, repair history and paid preparations survive the authored layout',()=>{
 const w=make(1);worldAffordanceObjects(w);const ledger=w.state.worldAffordances;
 Object.assign(ledger,{kit:{plank:2,hook:1,bell:0,jar:3,coil:1,reed:0},sources:['aff-50013-salvage-0'],knowledge:['vane-relay'],sites:{'aff-50013-site':{solved:true,progress:0},'aff-50013-scout':{solved:false,progress:0,scouted:true}},plans:{'50013':{plan:'quiet',packed:'coil',spent:false}},records:[{id:'past-observatory-contact',scene:50013,plan:'quiet',packed:null,result:'win'}]});
 assert.equal(validWorldAffordances(ledger),true,'fixture is an accepted legacy ledger');
 // Existing save schema owns the history. Presentation must not rewrite it.
 const before=JSON.stringify(ledger);assert.deepEqual(worldAffordanceObjects(w),[]);applyAffordanceScene(w);assert.equal(JSON.stringify(ledger),before);
 const object={type:'patrol',scene:50013,originId:'veyr-storm',originStep:2},context=affordanceEncounterContext(w,object,{reinforcementLimit:2});
 assert.equal(context.reinforcementLimit,1);assert.equal(context.recon.plan,'quiet');assert.equal(context.recon.enemyDelay,.75);
 assert.ok(context.fieldProps.some(p=>p.type==='coil'&&w.walkable(p.x,p.y)),'the already-paid tool appears on real new floor');
 const battle={context,heroes:[{x:w.state.x,y:w.state.y}],enemies:[{id:'kite',x:12.5,y:12.5,atb:0}]};assert.equal(applyAffordancePreparation(battle),true);
 assert.deepEqual(ledger.kit,{plank:2,hook:1,bell:0,jar:3,coil:1,reed:0});assert.deepEqual(ledger.sources,['aff-50013-salvage-0']);assert.deepEqual(ledger.knowledge,['vane-relay']);assert.equal(ledger.sites['aff-50013-site'].solved,true);
 assert.equal(ledger.plans['50013'].spent,true);assert.equal(applyAffordancePreparation(battle),false,'paid preparation is not duplicated');
 assert.equal(validWorldAffordances(ledger),true);
});
