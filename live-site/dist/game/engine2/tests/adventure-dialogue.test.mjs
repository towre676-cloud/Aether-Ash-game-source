import test from 'node:test';
import assert from 'node:assert/strict';
import {dialoguePages} from '../dialogue-presentation.js';
import {archiveWorldDialogue,compactDialogueTurns} from '../adventure-dialogue.js';

test('a long exchange becomes two spoken turns and keeps its receipt',()=>{
  const original=dialoguePages([
    'Rain runs down the empty platform.\nROOK: Keep the cable clear.\nSABLE: I can reach the rail.\nROOK: Wait for the light.\nThe machine begins to turn.\nReceived: insulated gloves.'
  ]);
  const before=JSON.stringify(original),turns=compactDialogueTurns(original);
  assert.deepEqual(turns.map(t=>t.body),['Keep the cable clear.','Wait for the light.']);
  assert.deepEqual(turns.at(-1).status,['Received: insulated gloves.']);
  assert.equal(JSON.stringify(original),before,'compacting must not change the authored turns');
});

test('unchanged speech keeps exact recording keys; shortened speech cannot play the full recording',()=>{
  const short=dialoguePages(['ROOK: Bring the case back\ntonight.'])[0];
  const kept=compactDialogueTurns([short])[0];
  assert.equal(kept.body,short.body);assert.equal(kept.voiceSegments,short.voiceSegments);
  assert.equal(kept.voiceSegments[0].text,'Bring the case back\ntonight.');
  const long=dialoguePages(['ROOK: The cable is clear. The lower rail is dry. The relay is ready. Take the lever.'])[0];
  const shortened=compactDialogueTurns([long])[0];
  assert.equal(shortened.body,'The cable is clear. The lower rail is dry.');
  assert.deepEqual(shortened.voiceSegments,[]);assert.equal(long.voiceSegments.length,1);
});

test('choice context retains the final question and never changes choice callbacks or labels',()=>{
  const action=()=>{},after=()=>{},choices=[{label:'Ground the receiver and leave the upper cable isolated',action}];
  const turns=dialoguePages(['ROOK: We have one chance.\nThe coil is still live. The lower line leads home. Which cable will you ground?']);
  Object.assign(turns.at(-1),{choices,after});
  const result=compactDialogueTurns(turns,{hasChoices:true});
  assert.equal(result.at(-1).body,'The lower line leads home. Which cable will you ground?');
  assert.equal(result.at(-1).choices,choices);assert.equal(result.at(-1).choices[0].action,action);assert.equal(result.at(-1).after,after);
  assert.equal(choices[0].label,'Ground the receiver and leave the upper cable isolated');
});

test('narration shows one consequence, or first and last context beside a choice',()=>{
  const original=dialoguePages(['The room is cold.','Dust floats above the gear.','The gate opens.']);
  assert.deepEqual(compactDialogueTurns(original).map(t=>t.body),['The gate opens.']);
  assert.deepEqual(compactDialogueTurns(original,{hasChoices:true}).map(t=>t.body),['The room is cold.','The gate opens.']);
});

test('excerpts stay bounded at sentence boundaries and preserve decimal values',()=>{
  const turns=dialoguePages(['ROOK: The tool costs 3.5 marks. You can carry two. Keep the spare.']);
  assert.equal(compactDialogueTurns(turns)[0].body,'The tool costs 3.5 marks. You can carry two.');
  for(const body of [('The long cable follows the wall through the workshop '.repeat(8))+'.','First. '+('The current takes the long route '.repeat(12))+'. Last.']){
    const result=compactDialogueTurns([{kind:'dialogue',speaker:'Rook',body,status:[],voiceSegments:[{speaker:'Rook',text:body}]}])[0];
    assert.ok(result.body.length<=240);assert.match(result.body,/[.!?…]$/u);assert.deepEqual(result.voiceSegments,[]);
  }
});

test('receipt-only and empty messages are safe without inventing speech',()=>{
  assert.deepEqual(compactDialogueTurns([]),[]);
  const result=compactDialogueTurns(dialoguePages(['Found: 1 Ether.','Received: 2 Tonics.']));
  assert.equal(result.length,1);assert.equal(result[0].body,'');assert.deepEqual(result[0].status,['Found: 1 Ether.','Received: 2 Tonics.']);assert.deepEqual(result[0].voiceSegments,[]);
});

test('journal archives exact original pages independently from visible excerpts',()=>{
  const world={state:{scene:'origin-veyr'},scene:{name:'The storm mast'}};
  const pages=['VEYR: Wait.\r\n\r\nThe cable moves.  ','Found: 1 Ether.'];
  const action=()=>{},after=()=>{},value={pages,choices:[{label:'Lower the mast',action}],after,effects:[{text:'Receiver grounded'}]};
  const entry=archiveWorldDialogue(world,value);
  assert.deepEqual(entry,{scene:'origin-veyr',label:'The storm mast',pages,effects:['Receiver grounded']});
  assert.notEqual(entry.pages,pages);assert.equal(entry.pages[0],pages[0]);assert.equal(value.choices[0].action,action);assert.equal(value.after,after);
  assert.equal(archiveWorldDialogue(world,value),entry);assert.equal(world.state.fieldNotes.length,1,'reopening the same note must not crowd out history');
});

test('journal retains the newest forty entries in the existing Story format',()=>{
  const world={state:{scene:2},scene:{title:'Home'}};
  for(let index=0;index<45;index++)archiveWorldDialogue(world,{label:'Event '+index,pages:['Exact page '+index]});
  assert.equal(world.state.fieldNotes.length,40);assert.equal(world.state.fieldNotes[0].label,'Event 5');
  assert.equal(world.state.fieldNotes.at(-1).pages[0],'Exact page 44');
  assert.ok(world.state.fieldNotes.every(note=>Array.isArray(note.effects)&&Array.isArray(note.pages)));
  assert.equal(archiveWorldDialogue(null,{pages:['Nothing']}),null);assert.equal(archiveWorldDialogue(world,{pages:[]}),null);
});
