import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,makeEnemy} from '../battle.js?v=5.6.0';
import {defaultHero,compileTechnique} from '../mako.js?v=5.5.0';
import {shellFor,resolveShell} from '../environment-shells.js';
import {combatAdvice,combatOptions,createCombatAnnouncer} from '../combat-advice.js?v=5.6.0';

function setup(cores=['earth'],inventory={}){
 const h=defaultHero(0);Object.assign(h,{x:0,y:0,learned:0,loadout:cores.map(core=>({core,support:'focus'}))});
 const e=makeEnemy('predator',1);Object.assign(e,{x:3,y:0});
 const b=new Battle({heroes:[h],enemies:[e],inventory});h.atb=1;return {b,h,e};
}
const coat=(e,material,state={})=>e.shell={...shellFor(material),...state};

test('starting Earth-only kit never requests unowned Tide, Frost or Volt recipes',()=>{
 const {b,e}=setup();
 for(const material of ['clay','reed','ash']){coat(e,material);const text=combatAdvice(b,e).text;assert.match(text,/ordinary strikes/i);assert.doesNotMatch(text,/Tide|Frost|Volt|Flame/);}
 coat(e,'mineral');assert.match(combatAdvice(b,e).text,/chips the mineral plates/);assert.doesNotMatch(combatAdvice(b,e).text,/Volt/);
});

test('equipped finite supplies provide a valid next step and disappear from advice when spent',()=>{
 const {b,e}=setup([],{tideFlask:1});coat(e,'ash');assert.match(combatAdvice(b,e).text,/Tide flask washes away/);
 b.inventory.tideFlask=0;assert.doesNotMatch(combatAdvice(b,e).text,/Tide flask/);assert.match(combatAdvice(b,e).text,/ordinary strikes/i);
 coat(e,'clay');b.inventory.frostShard=1;e.shell.soaked=true;assert.match(combatAdvice(b,e).text,/Frost shard cracks/);
});

test('armor-only and non-damaging supplies are not invented material-shell attacks',()=>{
 const {b,e}=setup([],{shatterCharge:1,breakerChime:1,smokePod:1});coat(e,'mineral',{charged:true});
 assert.equal(combatOptions(b).core('earth'),undefined);assert.equal(combatOptions(b).core('frost'),undefined);assert.match(combatAdvice(b,e).text,/ordinary strikes/i);
 delete e.shell;e.armor=40;assert.match(combatAdvice(b,e).text,/Shatter charge strips armor/);
});

test('known but unequipped cores, unlearned arts and fallen companions cannot supply a counter',()=>{
 const {b,h,e}=setup([]);const unavailable=defaultHero(4);unavailable.hp=0;unavailable.loadout=[{core:'tide',support:'focus'}];b.heroes.push(unavailable);coat(e,'ash');
 const text=combatAdvice(b,e,{state:{cores:['tide'],supports:['focus'],items:{},heroes:[h,unavailable]}}).text;
 assert.doesNotMatch(text,/Tide|personal art/);assert.match(text,/ordinary strikes/i);
 h.learned=128;assert.match(combatAdvice(b,e).text,/Gale personal art scatters/);
});

test('a dry clay coat is never hardened by an ill-advised Flame command',()=>{
 const {b,e}=setup(['flame']);coat(e,'clay');assert.doesNotMatch(combatAdvice(b,e).text,/Cinder|Flame/);
 e.shell.soaked=true;assert.match(combatAdvice(b,e).text,/Cinder Lance loosens the soaked clay/);
 const before=e.shell.integrity;resolveShell(b,e,100,{tech:compileTechnique('flame')});assert.ok(e.shell.integrity<before-.3);assert.equal(e.shell.fired,false);
});

test('multi-step instructions require both usable steps and enough MP for a shared caster',()=>{
 const {b,h,e}=setup(['tide','frost']);coat(e,'clay');h.mp=8;assert.match(combatAdvice(b,e).text,/Tide Lance soaks/);assert.doesNotMatch(combatAdvice(b,e).text,/Rime Lance/);
 h.mp=20;assert.match(combatAdvice(b,e).text,/Follow with .*Rime Lance/);
 h.mp=0;assert.match(combatAdvice(b,e).text,/Guard recovers MP/);assert.doesNotMatch(combatAdvice(b,e).text,/Tide Lance/);
 h.mp=30;h.strain=99;assert.equal(combatOptions(b).sources.length,0);
});

test('armor and alarm advice requests an actual interrupt rather than an unavailable Break',()=>{
 const {b,h,e}=setup(['earth']);e.armor=50;e.intent={kind:'alarm',shape:'single'};assert.doesNotMatch(combatAdvice(b,e).text,/Rupture|can interrupt/);
 h.loadout=[{core:'earth',support:'break'}];assert.match(combatAdvice(b,e).text,/Fault Rupture can interrupt/);
});

test('live objectives offer a feasible alternative to removing an unreachable material recipe',()=>{
 const {b,e}=setup([]);coat(e,'ash');b.objective={complete:false,failed:false};assert.match(combatAdvice(b,e).text,/Goal offers another way to win/);
 b.objective.complete=true;assert.doesNotMatch(combatAdvice(b,e).text,/Goal/);
});

test('an intercepting guard prevents a misleading strike-to-shatter promise',()=>{
 const {b,e}=setup([]);coat(e,'clay',{brittle:true});const guard=makeEnemy('guard',1,1);Object.assign(guard,{x:3.5,y:0});b.enemies.push(guard);
 const text=combatAdvice(b,e).text;assert.match(text,/intercepts strikes/);assert.doesNotMatch(text,/Strike now|shatter/);
});

test('ordinary charge cycles do not repeat screen-reader lessons, while meaningful changes announce once',()=>{
 const {b,e}=setup(['tide','frost']),announcer=createCombatAnnouncer();coat(e,'clay');
 assert.match(announcer.next(b,combatAdvice(b,e)),/Tide Lance/);e.intent={kind:'strike',shape:'line'};assert.equal(announcer.next(b,combatAdvice(b,e)),null);
 e.intent=null;assert.equal(announcer.next(b,combatAdvice(b,e)),null);e.shell.soaked=true;assert.match(announcer.next(b,combatAdvice(b,e)),/Rime Lance cracks/);
 e.intent={kind:'alarm',shape:'single'};assert.match(announcer.next(b,combatAdvice(b,e)),/Calling help/);e.intent=null;announcer.next(b,combatAdvice(b,e));e.intent={kind:'alarm',shape:'single'};assert.equal(announcer.next(b,combatAdvice(b,e)),null);
 const another={...b};assert.match(announcer.next(another,combatAdvice(another,e)),/Calling help/);
});

import {applySupply} from '../repertoire.js?v=5.6.0';
import {flow} from './opening-flow.mjs';
test('the actual new Sable journey receives advice supported by its earned kit',()=>{
 const {w,finish}=flow();w.newGame({originId:'sable-reed'});finish();const e=makeEnemy('predator',1),b=new Battle({heroes:w.activeHeroes,enemies:[e],inventory:w.state.items});coat(e,'mineral');
 const text=combatAdvice(b,e,{state:w.state,skills:w.data.skills}).text;
 assert.match(text,/Fault Lance chips/);assert.doesNotMatch(text,/Volt|Lightning|Tide|Rime|Rupture/);
});

test('recommended supply counters replay through the real finite-item shell rules',()=>{
 let {b,h,e}=setup([],{tideFlask:1});coat(e,'ash');assert.match(combatAdvice(b,e).text,/Tide flask/);assert.ok(applySupply(b,b.inventory,'tideFlask',h,e));assert.equal(e.shell.integrity,0);assert.equal(b.inventory.tideFlask,0);
 ({b,h,e}=setup([],{frostShard:1}));coat(e,'clay',{soaked:true});assert.match(combatAdvice(b,e).text,/Frost shard/);assert.ok(applySupply(b,b.inventory,'frostShard',h,e));assert.equal(e.shell.brittle,true);
 ({b,h,e}=setup([],{shatterCharge:1}));coat(e,'mineral',{charged:true});e.armor=70;const integrity=e.shell.integrity;assert.ok(applySupply(b,b.inventory,'shatterCharge',h,e));assert.equal(e.armor,0);assert.equal(e.shell.integrity,integrity);
});
