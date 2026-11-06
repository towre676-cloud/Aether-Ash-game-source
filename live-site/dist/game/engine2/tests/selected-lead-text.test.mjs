import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectedLeadText} from '../campaign-purpose.js';

const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
const mission=n=>data.campaign.missions[n-1];
const room=(n,key)=>mission(n).rooms.find(r=>r.key===key);
const npc=(n,key,name)=>room(n,key).objects.find(o=>o.type==='npc'&&o.text?.startsWith(name+':'));
const state=hero=>({chapter:6,journey:{hero},party:[hero,0].filter((v,i,a)=>a.indexOf(v)===i),recruited:[hero,0],story:{journal:[]}});

test('Iona and Rook retain their early participation without a second arrival or departure',()=>{
 const iona='IONA: Stop. You’re heading for the cells?\nSABLE: A man was taken from the festival. His daughter is waiting for him.\nIONA: Then take me. There are people in there who can barely stand.\nROOK: Can you fight?\nIONA: I can get them home breathing. Can you open the door?';
 const a=selectedLeadText(state(1),iona);assert.doesNotMatch(a,/Then take me|You’re heading/);assert.match(a,/His daughter is waiting/);assert.match(a,/patients/);assert.match(a,/Can you open the door/);
 assert.equal(selectedLeadText(state(1),'Iona joined the crew. Mend / Focus is ready.'),'Iona’s Mend / Focus is ready.');
 const repair=room(1,'town').objects.find(o=>o.done?.includes("go on, I'll clean up"));assert.ok(repair);
 const b=selectedLeadText(state(2),repair.done);assert.doesNotMatch(b,/go on, I'll clean up/);assert.match(b,/Nell's father is singing by the lantern/);
 assert.doesNotMatch(selectedLeadText(state(2),'The Kiln service is closed for the festival. Rook is waiting beside the orchestra.'),/Rook is waiting/);
});

test('Brass follows the same docket to the same refuge without being described as absent',()=>{
 const s=state(3),debrief=selectedLeadText(s,mission(1).debrief),brief=selectedLeadText(s,mission(2).briefing),entry=selectedLeadText(s,room(2,'bridge').entry_text),clue=selectedLeadText(s,npc(2,'bridge','BRASS').text);
 assert.doesNotMatch(debrief,/Where can we find him/);assert.match(debrief,/glass viaduct/);assert.match(debrief,/refuge underneath the west end/);assert.match(debrief,/Their children are still waiting/);
 assert.match(brief,/Brass follows the docket back/);assert.match(brief,/warden/);assert.doesNotMatch(entry,/Brass stands beside/);
 assert.doesNotMatch(clue,/Nell sent you/);assert.match(clue,/zero, nine, one/);assert.match(clue,/SABLE: Dare one thing more/);
});

test('Riven remains answerable for his signature and the same poisoned well while already travelling with the crew',()=>{
 const s=state(4),prior=selectedLeadText(s,mission(2).debrief),brief=selectedLeadText(s,mission(3).briefing),debrief=selectedLeadText(s,mission(3).debrief);
 assert.doesNotMatch(prior,/Riven's still down there/);assert.match(prior,/that is your signature/);assert.match(prior,/drain stairs are below this bridge/);
 assert.doesNotMatch(brief,/Find him/);assert.match(brief,/Return with Riven/);assert.match(brief,/stop anyone else from drinking/);
 assert.match(debrief,/I changed the result/);assert.match(debrief,/Hesper/);assert.doesNotMatch(debrief,/Take me with you/);
});

test('Mira carries Hesper’s account back to the unchanged archive access and evidence sequence',()=>{
 const s=state(5),handoff=selectedLeadText(s,mission(4).debrief),brief=selectedLeadText(s,mission(5).briefing),entry=selectedLeadText(s,room(5,'west').entry_text),clue=selectedLeadText(s,npc(5,'west','MIRA').text);
 assert.doesNotMatch(handoff,/Will she believe us|Take her my account/);assert.match(handoff,/missing person/);assert.match(handoff,/east of here/);
 assert.doesNotMatch(brief,/Reach her/);assert.match(brief,/west-wing access point/);assert.match(brief,/eastern index/);
 assert.doesNotMatch(entry,/Mira is waiting/);assert.doesNotMatch(clue,/Hesper sent you/);assert.match(clue,/Names first, voices after, seal the record last/);assert.match(clue,/If a voice has no name, we keep it anyway/);
});

test('Veyr returns to his controls without losing the accusation, daughter, or heat constraint',()=>{
 const s=state(6),debrief=selectedLeadText(s,mission(5).debrief),entry=selectedLeadText(s,room(6,'catwalk').entry_text),clue=selectedLeadText(s,npc(6,'office','VEYR').text);
 assert.doesNotMatch(debrief,/He's in the sky engine/);assert.match(debrief,/your authorization is on every transfer/);assert.match(debrief,/dated after she died/);
 assert.doesNotMatch(entry,/He's still here/);assert.match(entry,/office is still lit/);
 assert.match(clue,/Set the brake, then release both moorings/);assert.match(clue,/Keep the engine stopped/);
 assert.equal(selectedLeadText(s,mission(6).debrief),mission(6).debrief,'his culpability, lost daughter and the freezing city remain intact');
});

test('adaptation is pure and idempotent, skips the past, and never substitutes names in unrelated lines',()=>{
 const samples=[mission(1).debrief,mission(2).briefing,mission(2).debrief,mission(3).briefing,mission(4).debrief,mission(5).briefing,mission(5).debrief,mission(6).briefing,mission(6).intro,mission(14).intro,mission(24).intro];
 for(let hero=0;hero<7;hero++){
  const s=state(hero),before=JSON.stringify(s);
  for(const text of samples){const adjusted=selectedLeadText(s,text);assert.equal(selectedLeadText(s,adjusted),adjusted);if(hero===0)assert.equal(adjusted,text);assert.equal(selectedLeadText({...s,chronicle:{phase:'past'}},text),text);}
  assert.equal(JSON.stringify(s),before);
  const privateLine='MARA: Your mother’s reed belongs here.\nVEYR: The living girl keeps the name she chose.\nROOK: His father left a letter, not an order.';
  assert.equal(selectedLeadText(s,privateLine),privateLine);
 }
 assert.equal(selectedLeadText({journey:{hero:3},party:[0],recruited:[0]},mission(1).debrief),mission(1).debrief,'unmet travellers must not be placed in a scene');
});
