import test from 'node:test';
import assert from 'node:assert/strict';
import {presentDialogue,dialogueVoiceKey} from '../dialogue-presentation.js';
const lossless=p=>assert.equal(p.blocks.map(b=>b.raw).join(''),p.raw);

test('mixed reward and named dialogue retain every character but voice only the character',()=>{
 const raw='Received: insulated pry-staff and work wrap.\nAttack and Guard are ready.\nROOK: Keep the end away from the live rails.';
 const p=presentDialogue(raw);lossless(p);assert.equal(p.displayText,raw);assert.deepEqual(p.blocks.map(b=>b.kind),['system','system','dialogue']);
 assert.deepEqual(p.voiceSegments.map(s=>[s.speaker,s.text]),[['Rook','Keep the end away from the live rails.']]);assert.equal(p.hasSystem,true);
});
test('a conversation creates distinct exact voice turns without reading speaker names',()=>{
 const p=presentDialogue('ROOK: They said it carried heat.\nSABLE: What did it carry?\nROOK: People.');lossless(p);
 assert.equal(p.hasMultipleSpeakers,true);assert.equal(p.speaker,null);assert.deepEqual(p.voiceSegments.map(s=>s.speaker),['Rook','Sable','Rook']);
 assert.equal(p.speakableText,'They said it carried heat.\nWhat did it carry?\nPeople.');
});
test('line-wrapped sentences continue a speaker; finished sentences do not absorb action narration',()=>{
 const p=presentDialogue('MARA: Bring the case back\ntonight.\nShe takes the case, then your hands.\nMARA: You came home.');lossless(p);
 assert.deepEqual(p.voiceSegments.map(s=>s.text),['Bring the case back\ntonight.','You came home.']);assert.equal(p.blocks[2].kind,'narration');
});
test('blank paragraphs, CRLF, apostrophes and headings are preserved losslessly',()=>{
 const raw="CINDERFALL · FESTIVAL\r\n\r\nNELL: Papa's still in there.\r\n\r\nThe bell doesn't ring.";const p=presentDialogue(raw);lossless(p);
 assert.equal(p.blocks[0].kind,'heading');assert.equal(p.voiceSegments[0].text,"Papa's still in there.");assert.equal(p.narrationBlocks.at(-1).text,"The bell doesn't ring.");
});
test('cache receipts and progress never become speech',()=>{
 const p=presentDialogue('A loose board lifts.\nFound: 2 Tonics · 1 Ether\nKeepsake: Brakekeeper’s pin\n12 hidden caches found · 4 keepsakes recovered');lossless(p);
 assert.equal(p.voiceSegments.length,0);assert.equal(p.systemBlocks.length,3);assert.equal(p.blocks[0].kind,'narration');
});
test('unknown labels and option labels remain visible without guessed voice casting',()=>{
 const raw='UNKNOWN COLLECTOR: Return the plate.\nTurn the red lantern\nPull the sleeping berth';const p=presentDialogue(raw);lossless(p);
 assert.equal(p.voiceSegments.length,0);assert.equal(p.blocks[0].sourceSpeaker,'UNKNOWN COLLECTOR');assert.equal(p.blocks[0].kind,'narration');
 const bound=presentDialogue(raw,{speakers:{'UNKNOWN COLLECTOR':'Collector'}});assert.equal(bound.voiceSegments[0].speaker,'Collector');
});
test('empty input and unpunctuated ordinary prose are safe and lossless',()=>{
 for(const raw of ['',null,'No costs are spent','We need both before entering the yard.']){const p=presentDialogue(raw);lossless(p);assert.equal(p.voiceSegments.length,0);}
});
test('interface vocabulary inside real dialogue is not stripped',()=>{
 const p=presentDialogue('IONA: Guard the door. I will take the wounded.\nMIRA: We found their names.');lossless(p);assert.equal(p.hasSystem,false);assert.equal(p.voiceSegments.length,2);
});
test('learning notices and party joins are distinct from surrounding prose',()=>{
 const p=presentDialogue('Iona joins.\nMEND / FOCUS learned — her first healing phrase.\nIONA: Stay with me.');lossless(p);assert.equal(p.systemBlocks.length,2);assert.equal(p.voiceSegments[0].text,'Stay with me.');
});
test('voice keys cannot accidentally match a different speaker or shortened text',()=>{
 assert.notEqual(dialogueVoiceKey('Mara','Come home.'),dialogueVoiceKey('Sable','Come home.'));
 assert.notEqual(dialogueVoiceKey('Mara','Come home.'),dialogueVoiceKey('Mara','Come home'));
});
import{dialoguePages}from '../dialogue-presentation.js';
test('display pages keep each explicit speaker turn and move receipts out of spoken prose',()=>{const pages=dialoguePages(['SABLE: We can open it.\nROOK: Give me a moment.\nReceived: 2 Tonics.']);assert.equal(pages.length,2);assert.equal(pages[0].speaker,'Sable');assert.equal(pages[1].speaker,'Rook');assert.deepEqual(pages[1].status,['Received: 2 Tonics.']);assert.equal(pages[1].voiceSegments[0].text,'Give me a moment.');});
test('explicit repeated turns still match separately recorded lines while pure receipts stay visible',()=>{const pages=dialoguePages(['MARA: Come home.\nMARA: Both of you.','Found: 1 Ether.']);assert.equal(pages.length,3);assert.equal(pages[0].body,'Come home.');assert.equal(pages[1].body,'Both of you.');assert.equal(pages[2].kind,'system');assert.deepEqual(pages[2].status,['Found: 1 Ether.']);assert.deepEqual(pages[2].voiceSegments,[]);});
