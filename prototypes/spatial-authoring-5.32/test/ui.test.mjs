import test from 'node:test';import assert from 'node:assert/strict';import {selectContext,actionBar} from '../src/context-ui.mjs';
test('danger outranks lore',()=>{const x=selectContext([{kind:'lore',id:'l'},{kind:'danger',id:'d'}],1);assert.equal(x[0].id,'d');});
test('action bar stays compact',()=>assert.ok(actionBar({danger:true,target:true,techniques:['a','b','c'],reward:true}).length<=5));
