import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,symlinkSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {reviewDestination} from '../review-destination.mjs';
test('a symlink outside the source cannot redirect review output into authenticated source',()=>{
 const root=mkdtempSync(join(tmpdir(),'region-destination-'));
 try{
  const source=join(root,'source');mkdirSync(source);symlinkSync(source,join(root,'alias'));
  assert.throws(()=>reviewDestination(source,join(root,'alias','new','review')),/must not/);
  assert.throws(()=>reviewDestination(join(root,'alias'),join(source,'review')),/must not/);
  const output=join(root,'review');assert.equal(reviewDestination(source,output).out,output);
  symlinkSync(join(root,'missing'),output);assert.throws(()=>reviewDestination(source,output),/exists/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
