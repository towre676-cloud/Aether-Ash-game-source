import test from 'node:test';
import assert from 'node:assert/strict';
import {ORIGINS} from '../origin-content.js';
import {selectedJourneyLead,journeyPurpose,journeyConvergence,homeConversation,homecomingPages} from '../campaign-purpose.js';

function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
const state=(hero=0,chapter=1)=>({chapter,party:[hero],journey:{hero},story:{firstCore:true,journal:[]},flags:{},bosses:[]});

test('journey identity survives party changes and falls back through validated legacy identity',()=>{
 assert.equal(selectedJourneyLead({journey:{hero:5},chronicle:{originId:'veyr-storm',hero:6},party:[2]}),5);
 assert.equal(selectedJourneyLead({journey:{hero:90},chronicle:{originId:'veyr-storm'},party:[2]}),6);
 assert.equal(selectedJourneyLead({chronicle:{originId:'missing',hero:4},party:[2]}),4);
 assert.equal(selectedJourneyLead({chronicle:{hero:-1},party:[3]}),3);
 assert.equal(selectedJourneyLead({party:[0]}),0);
 for(const value of [undefined,null,{}, {journey:{hero:'5'},party:[NaN]}])assert.equal(selectedJourneyLead(value),0);
});

test('all 24 chapters have distinct causal reasons for each selected lead without mutating the save',()=>{
 for(const origin of ORIGINS){
  const reasons=new Set();
  for(let chapter=1;chapter<=24;chapter++){
   const s=freeze({...state(origin.hero,chapter),party:[0,1,2]}),before=JSON.stringify(s),purpose=journeyPurpose(s);
   assert.deepEqual(purpose.lead,{id:origin.hero,name:['Sable','Iona','Rook','Brass','Riven','Mira','Veyr'][origin.hero]});
   for(const key of ['id','title','aim','why','promise'])assert.ok(typeof purpose[key]==='string'&&purpose[key].trim(),origin.id+':'+chapter+':'+key);
   assert.ok(purpose.aim.length<100,'HUD aim should fit its compact role');
   assert.ok(purpose.why.includes(purpose.lead.name),origin.id+':'+chapter);
   assert.equal(JSON.stringify(s),before);reasons.add(purpose.why);
  }
  assert.equal(reasons.size,24,origin.id);
 }
});

test('the first purpose follows the inciting events instead of revealing the stolen recording before it is heard',()=>{
 const s={chapter:1,party:[0],story:{parcel:false},flags:{}};
 assert.match(journeyPurpose(s).aim,/reed.*festival/i);
 assert.doesNotMatch(journeyPurpose(s).why,/cop|after.*death|prisoner|inside the carriage/i);
 s.story.parcel=true;s.flags[8323526]=2;
 assert.match(journeyPurpose(s).why,/Nell/);assert.doesNotMatch(journeyPurpose(s).why,/copy of his mother/i);
 s.story.firstCore=true;assert.match(journeyPurpose(s).why,/copy of his mother/);
});

test('each origin retains its own obligation and both civic decisions in the present',()=>{
 for(const origin of ORIGINS)for(const destiny of [0,1]){
  const s=state(origin.hero);s.chronicle={phase:'past',originId:origin.id,choices:{destiny},records:[]};
  const before=JSON.stringify(s),past=journeyPurpose(freeze(structuredClone(s)));
  assert.equal(past.id,'origin:'+origin.id);assert.equal(past.aim,origin.journey.aim);
  assert.equal(past.promise,origin.journey.promise[destiny]);assert.equal(JSON.stringify(s),before);
  s.chronicle.phase='present';s.chronicle.records=[{originId:origin.id,destiny}];delete s.chronicle.choices;
  assert.equal(journeyPurpose(s).promise,origin.journey.promise[destiny]);
  const arrival=journeyConvergence(s).join('\n');assert.ok(arrival.includes(origin.journey.arrival[destiny]));
  if(origin.hero!==0){assert.match(arrival,/MARA:/);assert.match(arrival,/SABLE:/);assert.doesNotMatch(arrival,/Their paths now share a destination/);}
 }
});

test('physical proof changes the reason only after its actual earned work exists',()=>{
 const chapel=state(5,4),before=journeyPurpose(chapel);assert.match(before.why,/can show/);
 chapel.answeringNetwork={version:1,works:['chapel-inspected']};assert.equal(journeyPurpose(chapel).why,before.why);
 chapel.answeringNetwork.works.push('chapel-return');assert.match(journeyPurpose(chapel).why,/has answered a pulse/);
 const reactor=state(2,8);reactor.answeringNetwork={version:1,works:['root-installed','heat-diverted']};assert.match(journeyPurpose(reactor).why,/must carry the heat/);
 reactor.answeringNetwork.works.push('heat-independent');assert.match(journeyPurpose(reactor).why,/heat gauge is still warm/);
});

test('home conversations follow earned milestones, repeat briefly, and do not fabricate missed visits',()=>{
 const s=state(1,1);assert.equal(homeConversation(s),null);
 const visits=[];
 for(const chapter of [2,6,9,16,22]){
  s.chapter=chapter;const visit=homeConversation(s);assert.equal(visit.fresh,true);assert.ok(visit.pages.some(p=>p.includes('IONA:')));
  const before=JSON.stringify(s);assert.deepEqual(homeConversation(freeze(structuredClone(s))),visit);assert.equal(JSON.stringify(s),before);
  s.story.journal.push({id:visit.id});const repeat=homeConversation(s);assert.equal(repeat.fresh,false);assert.equal(repeat.pages.length,1);assert.notDeepEqual(repeat.pages,visit.pages);visits.push(visit.id);
 }
 assert.equal(new Set(visits).size,5);
 const old=state(6,22);assert.equal(homeConversation(old).id,visits.at(-1));assert.equal(old.story.journal.length,0);
});

test('homecoming keeps the family decision distinct from the selected lead and does not invent an old save’s ending',()=>{
 const s={...state(6,25),complete:true,recruited:[6,0,2]};
 s.story.finalChoice=1;assert.match(homecomingPages(s)[0],/listen when we want/);assert.doesNotMatch(homecomingPages(s).join('\n'),/heard it from the square/);
 assert.ok(homecomingPages(s).some(p=>p.startsWith('VEYR:')));assert.match(journeyPurpose(s).aim,/Sable.*Mara/);
 s.story.finalChoice=2;assert.match(homecomingPages(s)[0],/heard it from the square/);
 delete s.story.finalChoice;assert.doesNotMatch(homecomingPages(s)[0],/square|listen when we want/);
 s.story.returnedHome=true;assert.equal(journeyPurpose(s).id,'after-homecoming');
});
