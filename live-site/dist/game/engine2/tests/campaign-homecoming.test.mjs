import test from 'node:test';
import assert from 'node:assert/strict';
import {flow,earnOpening} from './opening-flow.mjs';
import {ORIGINS} from '../origin-content.js';
import {convergeOrigin} from '../origins.js';
import {journeyWeave} from '../journey-roster.js';
import {selectedJourneyLead,journeyPurpose} from '../campaign-purpose.js';
import {setAssistanceMode} from '../quest-assistance.js';
import {finishStory,storyInteraction} from '../opening.js';

test('all seven selected beginnings reach the festival with their kit, lead, civic history and full assistance intact',()=>{
 for(const origin of ORIGINS){
  const h=flow(),w=h.w;w.newGame({originId:origin.id,legacy:{cycle:0,unlocked:[origin.hero],records:[],journey:journeyWeave(origin.hero,5)}});h.finish();
  const past=w.state;past.chronicle.step=4;past.chronicle.choices={repair:1,destiny:origin.hero%2,approach:'diversion'};
  past.items.tonic+=3;past.gold=37;past.xp=80;past.heroes[origin.hero].ap={earth:9};setAssistanceMode(past,'full');
  const kit=structuredClone({hero:past.heroes[origin.hero],items:past.items,gold:past.gold,xp:past.xp,journey:past.journey,help:past.questAssistance});
  convergeOrigin(w);h.finish();const s=w.state;
  assert.equal(s.chronicle.phase,'present');assert.equal(s.party[0],origin.hero);assert.equal(selectedJourneyLead(s),origin.hero);assert.ok(s.recruited.includes(0));
  assert.deepEqual(s.heroes[origin.hero],kit.hero);assert.deepEqual(s.items,kit.items);assert.equal(s.gold,kit.gold);assert.equal(s.xp,kit.xp);assert.deepEqual(s.journey,kit.journey);assert.deepEqual(s.questAssistance,kit.help);
  assert.equal(s.chronicle.records.at(-1).effect,origin.effects[origin.hero%2]);assert.equal(s.story.parcel,false);assert.equal(w.scene.key,'home');
  const entry=s.story.journal.find(e=>e.id==='arrival:'+origin.id);assert.ok(entry);assert.match(entry.text,/reed/i);assert.ok(entry.text.includes(journeyPurpose(s).promise));
  w.restore(w.save());assert.equal(selectedJourneyLead(w.state),origin.hero);assert.deepEqual(w.state.questAssistance,kit.help);
 }
});

test('the first clay reading teaches the return without claiming a physical repair',()=>{
 const {w}=earnOpening(),s=w.state;
 assert.ok(s.story.journal.some(e=>e.id==='earth'));
 assert.ok(s.story.journal.some(e=>e.id==='network-first'&&/return conductor/.test(e.text)));
 assert.ok(!s.answeringNetwork?.works?.includes('chapel-return'));
 assert.ok(!s.answeringNetwork?.works?.includes('heat-independent'));
});

test('milestone visits persist through saves without repeating rewards or resetting the road',()=>{
 const h=earnOpening(),w=h.w;w.state.chapter=6;w.loadScene(2);h.finish();const mara=w.objects().find(o=>o.type==='npc');
 const before={items:structuredClone(w.state.items),gold:w.state.gold,party:[...w.state.party],flags:structuredClone(w.state.flags)};
 h.use(mara);assert.equal(w.state.story.journal.filter(e=>e.id==='home-visit:copied-song').length,1);
 w.restore(w.save());h.finish();h.use(w.objects().find(o=>o.type==='npc'));
 assert.equal(w.state.story.journal.filter(e=>e.id==='home-visit:copied-song').length,1);assert.equal(w.state.chapter,6);
 assert.deepEqual(w.state.items,before.items);assert.equal(w.state.gold,before.gold);assert.deepEqual(w.state.party,before.party);assert.deepEqual(w.state.flags,before.flags);
 w.state.chapter=22;h.use(w.objects().find(o=>o.type==='npc'));assert.equal(w.state.story.journal.filter(e=>e.id==='home-visit:one-recording').length,1);
 assert.equal(w.state.story.journal.some(e=>e.id==='home-visit:after-crown'),false,'a later visit must not pretend an earlier conversation happened');
});

test('community recognition precedes either personal ending, which keeps the chosen lead and returns to Mara',()=>{
 for(const hero of [0,1,2,3,4,5,6])for(const option of [0,1]){
  const h=flow(),w=h.w;w.state.journey=journeyWeave(hero);w.state.party=hero===0?[0]:[hero,0];w.state.recruited=[...w.state.party];w.state.chapter=24;w.state.story.parcel=true;
  if(option===1)w.state.answeringNetwork={version:1,works:['chapel-return','heat-independent']};
  const before=structuredClone({network:w.state.answeringNetwork,choices:w.state.storyChoices,party:w.state.party});
  finishStory(w);const prompt=h.dialog;
  assert.equal(prompt.choices.length,2);assert.ok(prompt.pages.length>=2);assert.ok(prompt.pages.at(-1).includes('Sable must decide'));
  assert.equal(w.state.story.finalChoice,undefined);assert.equal(w.state.complete,false);assert.deepEqual(w.state.answeringNetwork,before.network);
  h.choose(option);assert.equal(w.state.complete,true);assert.equal(w.state.chapter,25);assert.equal(w.state.story.finalChoice,option+1);assert.equal(w.scene.key,'home');assert.deepEqual(w.state.party,before.party);assert.equal(selectedJourneyLead(w.state),hero);assert.deepEqual(w.state.storyChoices,before.choices);
  assert.ok(w.state.story.journal.some(e=>e.id==='city-answer'));assert.ok(w.state.story.journal.some(e=>e.id==='ending'));
  const beforeItems=structuredClone(w.state.items);h.use(w.objects().find(o=>o.type==='npc'));
  assert.equal(w.state.story.returnedHome,true);assert.equal(w.state.story.journal.filter(e=>e.id==='home').length,1);
  const closure=w.state.story.journal.find(e=>e.id==='home').text;assert.match(closure,/You came home/);if(hero!==0)assert.ok(closure.includes(['','IONA:','ROOK:','BRASS:','RIVEN:','MIRA:','VEYR:'][hero]));
  if(option===0)assert.doesNotMatch(closure,/heard it from the square/);else assert.match(closure,/heard it from the square/);
  h.use(w.objects().find(o=>o.type==='npc'));assert.equal(w.state.story.journal.filter(e=>e.id==='home').length,1);assert.deepEqual(w.state.items,beforeItems);
 }
});

test('a legacy completion without a recorded final choice gets no invented public broadcast',()=>{
 const h=flow(),w=h.w;w.state.complete=true;w.state.chapter=25;w.state.story.parcel=true;let page;
 const original=w.callbacks.onDialog;w.callbacks.onDialog=d=>{page=d.pages.join('\n');original(d);};
 assert.equal(storyInteraction(w,{type:'npc'}),true);assert.doesNotMatch(page,/heard it from the square|listen when we want/);assert.equal(w.state.story.finalChoice,undefined);
});
