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

test('loot inspect forwards to canonical Living Armory without granting another item',()=>{
 const main=read('../live-site/dist/game/engine2/main.js');
 const ui=read('../live-site/dist/game/engine2/action-armory-reward.js');
 assert.match(main,/showArmoryReward\(award,\{onInspect:\(\)=>openLivingArmory/);
 assert.match(ui,/onInspect\(\)/);
 assert.doesNotMatch(ui,/grantItem\(/);
 assert.doesNotMatch(ui,/claimLivingArmoryVictory\(/);
});

test('training shortcut uses the existing story-gated practice encounter',()=>{
 const main=read('../live-site/dist/game/engine2/main.js');
 assert.match(main,/training\.id='practice-skirmish'/);
 assert.match(main,/trainingQuick\.id='training-quick'/);
 assert.match(main,/trainingQuick\.onclick=\(\)=>\{if\(trainingQuick\.hidden\|\|paused\|\|battle\|\|dialog\)return;training\.click\(\);\}/);
 assert.match(main,/!world\.state\.story\?\.weapon\|\|!world\.state\.story\?\.firstCore/);
 assert.match(main,/type:'practice'/);
});

test('training HUD shortcut is hidden until unlocked and cannot start over overlays',()=>{
 const main=read('../live-site/dist/game/engine2/main.js');
 assert.match(main,/trainingQuick\.hidden=true/);
 assert.match(main,/trainingButton\.hidden=!\(started&&!paused&&!battle&&!dialog/);
 assert.match(main,/world\?\.state\?\.story\?\.weapon&&!!world\?\.state\?\.story\?\.firstCore/);
 assert.match(main,/if\(trainingQuick\.hidden\|\|paused\|\|battle\|\|dialog\)return/);
});

test('QA battle is dev-only and uses isolated save plus practice rewards',()=>{
 const main=read('../live-site/dist/game/engine2/main.js');
 assert.match(main,/STORE=DEV_MODE\?'ash-aether-playtest-v1':'ash-aether-enhanced-v2'/);
 assert.match(main,/if\(DEV_MODE\)\{\s*const qa=document\.createElement\('button'\)/);
 assert.match(main,/qa\.id='action-rpg-qa-battle'/);
 assert.match(main,/const object=\{type:'practice'/);
 assert.match(main,/startBattle\(world\.currentBattle\)/);
 const armory=read('../live-site/dist/game/engine2/living-armory/campaign.js');
 assert.match(armory,/\['practice','rival'\]\.includes\(o\.type\)/);
});
