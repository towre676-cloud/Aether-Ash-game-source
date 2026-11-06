import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMusicPlan,continuityAudit} from '../src/music-continuity.mjs';

test('long musical dead zones are filled by adaptive bridges',()=>{
 const p=buildMusicPlan({maxSilence:8,segments:[
   {track:'field-a',start:0,duration:20},
   {track:'battle',start:52,duration:15}
 ]});
 assert.ok(p.some(x=>x.kind==='bridge'&&x.start===20&&x.end===52));
 assert.equal(continuityAudit(p,{maxSilence:8}).pass,true);
});
