import test from 'node:test';import assert from 'node:assert/strict';import {mutationOffer,applyMutation} from '../src/progression.mjs';
test('offers three unowned verb mutations',()=>{const o=mutationOffer({seed:'x',owned:['echo_step']});assert.equal(o.length,3);assert.ok(o.every(x=>x.id!=='echo_step'));});
test('echo step changes approach not base stat',()=>{const a=applyMutation({kind:'strike',power:10},'echo_step',{echoStored:true});assert.equal(a.approachMode,'blink_flank');assert.equal(a.power,10);});
test('fault chain adds secondary interaction',()=>{const a=applyMutation({power:20},'fault_chain',{armorBroken:true});assert.equal(a.chain.power,9);});
