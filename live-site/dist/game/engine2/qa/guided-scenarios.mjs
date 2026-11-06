import {setAssistanceMode} from '../quest-assistance.js';
/** Guided route conformance, using explicit authored choices and simulated encounter
 * outcomes. Frontier chapter unlocks are a declared fixture, not campaign evidence. */
import fs from 'node:fs';import assert from 'node:assert/strict';
import {World} from '../world.js?v=5.41';import {ORIGINS} from '../origin-content.js';
import {resolveGuidedObjective} from '../guided-objective.js?v=5.41';import {createQuestGuide} from '../quest-navigation.js?v=5.21.0';
import {commission,SIDE_CAMPAIGNS,frontierStage} from '../frontiers.js?v=5.41';
const source=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
function session(){let dialog,guide,lastObject,encounters=0,moves=0;const notices=[];
 const w=new World(source,{onDialog:d=>{dialog=d;guide?.interrupt('dialog');},onScene:()=>guide?.sceneChanged(),onNotice:t=>notices.push(t),onBattle:()=>{encounters++;w.winBattle();}});
 const interact=w.interact.bind(w);w.interact=o=>{lastObject=o;interact(o);};
 const drain=choice=>{for(let n=0;dialog&&n<60;n++){const d=dialog;dialog=null;if(d.choices){const index=choice(d,lastObject,w);assert.ok(Number.isInteger(index)&&d.choices[index],'explicit authored choice');d.choices[index].action();}else d.after?.();}assert.ok(!dialog,'dialog drained');};
 setAssistanceMode(w.state,'full');guide=createQuestGuide(w,{resolve:()=>resolveGuidedObjective(w),onNotice:t=>notices.push(t)});
 function until(done,choice){let previous='',stale=0;drain(choice);if(!guide.running)assert.ok(guide.start(),JSON.stringify({goal:resolveGuidedObjective(w),notices}));
  for(let tick=0;!done()&&tick<20000;tick++){const before=[w.state.x,w.state.y];guide.update(.05);if(w.state.x!==before[0]||w.state.y!==before[1])moves++;
   if(guide.status?.reason==='challenge')w.interact(resolveGuidedObjective(w)?.object);drain(choice);
   const signature=JSON.stringify([w.state.scene,w.state.x,w.state.y,w.state.flags,w.state.chronicle,w.state.frontiers,w.state.mode]);stale=signature===previous?stale+1:0;previous=signature;
   assert.ok(stale<80,JSON.stringify({goal:resolveGuidedObjective(w),status:guide.status,notices:notices.slice(-3)}));
  }assert.ok(done(),'guided scenario finished');}
 return {w,guide,drain,until,get moves(){return moves;},get encounters(){return encounters;}};
}
let origins=0,originMoves=0;
for(const origin of ORIGINS)for(const branch of [0,1]){
 const h=session(),w=h.w;w.newGame({originId:origin.id});
 const choice=()=>{const step=w.state.chronicle.step;return step===1?branch:step===2?branch:step===3?branch:0;};
 h.until(()=>w.state.chronicle?.phase==='present',choice);assert.equal(w.state.chronicle.records.at(-1).repair,branch);assert.equal(w.state.chronicle.records.at(-1).destiny,branch);assert.equal(w.state.chronicle.records.at(-1).approach,branch?'battle':'diversion');h.guide.cancel();originMoves+=h.moves;origins++;
}
const h=session(),w=h.w;h.drain(()=>0);w.state.chapter=24;let jobs=0;
for(const job of SIDE_CAMPAIGNS){h.guide.cancel();commission(w,job);h.drain(()=>0);
 const choose=d=>{
  if(d.pages.join(' ').startsWith('Repair the apparatus.'))return job.answer;
  const submit=d.choices.findIndex(c=>c.label.startsWith('Submit report'));if(submit>=0)return submit;
  const current=d.choices.findIndex(c=>c.label.startsWith('Current:'));if(current>=0)return current;
  const travel=d.choices.findIndex(c=>/Travel to the worksite|Take this commission/.test(c.label));if(travel>=0)return travel;
  throw Error('Unexpected frontier menu: '+d.pages.join(' '));
 };
 h.until(()=>frontierStage(w,job.id)===4,choose);assert.ok(w.state.frontiers.claimed.includes(job.id));jobs++;
}
console.log(JSON.stringify({result:'pass',scope:'guided walking with explicit authored answers and simulated encounter outcomes; frontier unlock chapter24 is a fixture; no browser/device claim',originRuns:origins,originMoves,commissions:jobs,frontierMoves:h.moves,frontierEncounters:h.encounters}));
