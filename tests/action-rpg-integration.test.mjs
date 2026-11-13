import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url),'utf8');

test('canonical game mounts the quick bar and retains its battle command handlers',()=>{
 const html=read('../live-site/dist/game/index.html');
 const main=read('../live-site/dist/game/engine2/main.js');
 const bar=read('../live-site/dist/game/engine2/action-rpg-bar.js');
 assert.match(html,/mountActionBar\(\{onAction:/);
 for(const name of ['attack','mako','personal','guard','item','retreat']){
   assert.match(html,new RegExp('id="cmd-'+name+'"'));
   assert.match(bar,new RegExp("\\['"+name+"'"));
 }
 assert.match(main,/function command\(kind,tech\)/);
 assert.match(bar,/\.command-grid\{display:none\}/);
 assert.match(bar,/source\.disabled/);
});
test('canonical battle events feed feedback without changing battle ownership',()=>{
 const main=read('../live-site/dist/game/engine2/main.js');
 const feedback=read('../live-site/dist/game/engine2/action-combat-feedback.js');
 const renderer=read('../live-site/dist/game/engine2/renderer.js');
 assert.match(main,/function battleEvent\(e\)\{actionCombatFeedback\.emit\(e\)/);
 assert.match(main,/renderer\?\.event\(e\)/);
 assert.match(renderer,/if\(e\.type==='damage'\)/);
 assert.doesNotMatch(feedback,/type==='damage'/);
 assert.doesNotMatch(feedback,/type==='interrupt'/);
});

test('world-space reward effects only follow canonical successful armory awards',()=>{
 const main=read('../live-site/dist/game/engine2/main.js');
 const renderer=read('../live-site/dist/game/engine2/renderer.js');
 assert.match(main,/award\?\.ok&&Array\.isArray\(award\.items\)/);
 assert.match(main,/renderer\?\.event\(\{type:'armory-drop'/);
 assert.match(renderer,/e\.type==='armory-drop'/);
 assert.match(renderer,/kind:'spell'/);
});
