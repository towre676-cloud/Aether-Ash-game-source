import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const viewer=fs.readFileSync(new URL('../src/view.mjs',import.meta.url),'utf8');
const actors=fs.readFileSync(new URL('../src/actors.mjs',import.meta.url),'utf8');

test('Every interactive button in the 3D viewer has a real action handler',()=>{
 const actions=[...html.matchAll(/data-action="([^"]+)"/g)].map(m=>m[1]);
 for(const a of actions)assert.ok(viewer.includes(`case '${a}':`),`Missing gameplay handler: ${a}`);
});
test('Direct creature encounter controls use spatial actor selection, not remote menu challenge',()=>{
 for(const id of ['resident-select','resident-status'])assert.ok(html.includes(`id="${id}"`));
 for(const a of ['approach-resident','study-resident','engage-resident'])assert.ok(html.includes(`data-action="${a}"`)&&viewer.includes(`case '${a}':`));
 assert.ok(!html.includes('data-action="challenge"'));
 assert.ok(viewer.includes('atlas.engageResident(id)'));
});
test('The Three.js renderer assigns clickable canonical resident IDs and uses the atlas roster',()=>{
 assert.ok(actors.includes('residentId:`${region.id}:${source.id}:'));
 assert.ok(actors.includes('atlas.residents()'));
 assert.ok(viewer.includes('atlas.resident(node.userData.residentId)'));
});
test('Vegetation v5 is active with a version-4 renderer fallback, never a second physical world',()=>{
 assert.ok(viewer.includes('createGrassFieldV5'));
 assert.ok(viewer.includes('createGrassFieldV4'));
 assert.ok(viewer.includes('worldGroup.remove(grassRoot)'));
});
