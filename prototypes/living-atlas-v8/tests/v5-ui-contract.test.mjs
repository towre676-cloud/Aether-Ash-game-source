import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const view=fs.readFileSync(new URL('../src/view.mjs',import.meta.url),'utf8');
const adventure=fs.readFileSync(new URL('../src/adventure.mjs',import.meta.url),'utf8');
test('new listen control exists and is reachable within the existing World panel',()=>{
  assert.match(html,/data-action="listen"/);assert.match(view,/case 'listen':/);
  assert.match(html,/data-action="sound"/);
});
test('recorded audio triggers are downstream of accepted gameplay commands',()=>{
 assert.match(view,/if\(!r\.ok\)return announce\(r\.reason\);world=atlas\.world;refresh\(\);save\(\);announce/);
 assert.match(view,/acoustic\.acceptedEvent\(atlas,event\)/);
 assert.match(view,/const step=atlas\.dispatch\(\{kind:'FOOTFALL_CONFIRMED'/);
 assert.match(view,/if\(!step\.ok\)/);
 assert.match(view,/acoustic\.acceptedStep\(/);
});
test('version-3 save compatibility is retained and acoustic extension is namespaced',()=>{
 assert.match(adventure,/snapshot\(\)\{return \{version:3,/);
 assert.match(adventure,/acousticState:copy\(this\.acousticState\)/);
 assert.match(adventure,/data\.acousticState\?\?\{flags:\[\]\}/);
});
test('acoustic source and 3D graphical imports are local except the pinned Three CDN',()=>{
 assert.match(view,/\.\/perception\.mjs/);
 assert.match(view,/\.\/grass-v4\/grass-renderer\.mjs/);
 assert.match(view,/\.\/sound\.mjs/);
 assert.match(html,/three@0\.180\.0/);
});
