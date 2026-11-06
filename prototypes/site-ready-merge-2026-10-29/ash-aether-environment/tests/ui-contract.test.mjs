import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const view=fs.readFileSync(new URL('../src/view.mjs',import.meta.url),'utf8');
test('Every displayed intervention has an actual runtime handler',()=>{
 const names=[...index.matchAll(/data-action="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(names.length>=14);
 for(const name of names)assert.ok(view.includes(`case '${name}':`),`${name} is missing implementation`);
 assert.equal(new Set(names).size,names.length);
});
test('Current live game is never claimed to be patched inside this laboratory',()=>{
 assert.match(index,/not the released A&A build/);
 assert.match(index,/No change is made to the deployed game/);
});
