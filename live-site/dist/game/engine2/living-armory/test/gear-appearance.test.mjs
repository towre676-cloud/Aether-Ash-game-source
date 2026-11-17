import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveGearAppearance} from '../src/gear-appearance.mjs';

const manifest={rigs:{sable:{characters:['sable'],baseParts:['shirt','trousers','hair']}},items:{
 'iron-coat':{fits:{sable:{asset:'sable/iron-coat.glb',replaces:['shirt']}}},
 'iron-boots':{fits:{sable:{asset:'sable/iron-boots.glb',replaces:['trousers']}}}
}};
test('equipped parts replace original clothing rather than overlaying it',()=>{
 const result=resolveGearAppearance({characterId:'sable',rigId:'sable',equipment:{chest:'iron-coat',feet:'iron-boots'},manifest});
 assert.equal(result.ready,true);
 assert.deepEqual(result.hideBaseParts,['shirt','trousers']);
 assert.equal(result.replacements.chest.asset,'sable/iron-coat.glb');
});
test('missing fitted gear fails closed rather than drawing mismatched layers',()=>{
 const result=resolveGearAppearance({characterId:'sable',rigId:'sable',equipment:{chest:'unfitted'},manifest});
 assert.equal(result.ready,false);assert.equal(result.reason,'incomplete-fitted-gear');
});
test('wrong character rig cannot borrow another character fitting',()=>{
 const result=resolveGearAppearance({characterId:'other',rigId:'sable',equipment:{chest:'iron-coat'},manifest});
 assert.equal(result.ready,false);assert.equal(result.reason,'unsupported-character-rig');
});
test('duplicate aliases cannot double-render a garment',()=>{
 assert.throws(()=>resolveGearAppearance({characterId:'sable',rigId:'sable',equipment:{body:'iron-coat',chest:'iron-coat'},manifest}),/conflicting/);
});
test('jewelry does not require geometry',()=>{
 const result=resolveGearAppearance({characterId:'sable',rigId:'sable',equipment:{ring1:{id:'luck-ring'}},manifest});
 assert.equal(result.ready,true);assert.deepEqual(result.replacements,{});
});
