import test from 'node:test';
import assert from 'node:assert/strict';
import {REGIONS} from '../regional-content.js';
import {regionalHerbSpec,drawRegional} from '../regional-art.js';

function surface(){
 const calls=[],stack=[],gradient={addColorStop(){}};
 const c=new Proxy({globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},createLinearGradient(){return gradient;},createRadialGradient(){return gradient;}},{get(target,key){return key in target?target[key]:(...args)=>calls.push([key,...args]);}});
 return {c,calls,stack};
}

test('every harvest profile uses modest matching painted vegetation without changing campaign data',()=>{
 const assets={environmentWoodland:{width:1774,height:887},environmentStorm:{width:1774,height:887}},state={regionalLife:{harvests:{1:4}},townLife:{minutes:480}};
 for(const profile of REGIONS){
  const o={lifeKind:'herb',profile,xy:[3,4]},before=JSON.stringify({o,state}),spec=regionalHerbSpec(profile),{c,calls,stack}=surface();
  assert.ok(spec.width<=42&&spec.height<=34);drawRegional(c,o,1,state,{assets});const draw=calls.find(v=>v[0]==='drawImage');assert.ok(draw,profile.plant);assert.deepEqual(draw.slice(2,6),spec.crop);assert.equal(draw.at(-3)+draw.at(-1),0,'painted roots meet the ground');assert.equal(JSON.stringify({o,state}),before);assert.equal(stack.length,0);assert.equal(c.globalAlpha,1);
 }
 assert.equal(regionalHerbSpec({plant:'Cloud flax'}).id,'wind-grasses');assert.equal(regionalHerbSpec({plant:'Bellflower'}).id,'bluebell-log');assert.equal(regionalHerbSpec({plant:'Flood mint'}).id,'meadow-shrubs');
});

test('missing painted assets retain readable small plants and fauna without altering their species or behavior',()=>{
 for(const lifeKind of ['herb','fauna'])for(const profile of REGIONS){
  const o={lifeKind,profile,xy:[1,2]},state={townLife:{minutes:1200}},before=JSON.stringify({o,state}),{c,calls,stack}=surface();drawRegional(c,o,2,state);
  assert.equal(calls.some(v=>v[0]==='drawImage'),false);assert.ok(calls.some(v=>v[0]==='scale'&&v[1]===(lifeKind==='herb'?.84:.86)));assert.equal(JSON.stringify({o,state}),before);assert.equal(stack.length,0);assert.equal(c.globalAlpha,1);
 }
});
