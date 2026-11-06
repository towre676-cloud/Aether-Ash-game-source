import test from 'node:test';import assert from 'node:assert/strict';
import {ACOUSTIC_QUESTS,questCandidateSources,applyAcousticReward} from '../src/acoustic-quests.js';
import {BIOME_IDS,ACOUSTIC_SIGNALS} from '../src/acoustic-world.js';
test('24 acoustic quest templates validate against actual audio signal and biome manifests',()=>{
 assert.equal(ACOUSTIC_QUESTS.length,24);assert.equal(new Set(ACOUSTIC_QUESTS.map(x=>x.id)).size,24);
 for(const q of ACOUSTIC_QUESTS){assert.ok(BIOME_IDS.includes(q.biome));assert.ok(q.signal in ACOUSTIC_SIGNALS);assert.ok(q.gives&&q.consequence);}
});
test('world sources are never invented; authored object position is preserved',()=>{
 const specs=questCandidateSources({biome:'reed_marsh',worldObjects:[]});assert.equal(specs.length,0);
 const src=questCandidateSources({biome:'reed_marsh',worldObjects:[{id:'sluice1',acousticQuestId:'marsh_sluice',position:{x:5,z:8}}]});
 assert.equal(src.length,1);assert.deepEqual(src[0].position,{x:5,z:8});assert.equal(src[0].kind,'water');
});
test('quest unlocking, duplicate gate, and New Game Plus flags are enforced',()=>{
 const flags=new Set();const worldObjects=[{id:'sluice1',acousticQuestId:'marsh_sluice',position:{x:5,z:8}}];let emitted=[];
 const args={discovery:{sourceId:'sluice1',signal:'water'},worldObjects,flags,gameCallbacks:{onQuestUnlock:x=>emitted.push(x)}};
 assert.equal(applyAcousticReward(args).applied,true);assert.equal(applyAcousticReward(args).applied,false);assert.equal(emitted.length,1);
 assert.equal(questCandidateSources({biome:'final_rift',ngPlus:false,worldObjects:[{id:'rift1',acousticQuestId:'rift_choir',position:{x:2,z:8}}]}).length,0);
});
