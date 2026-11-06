import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {ORIGINS} from '../origin-content.js';
import {dialoguePages} from '../dialogue-presentation.js';

const plan=JSON.parse(fs.readFileSync(new URL('../../../../development/media-5.9-origin-voices.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('../voices/manifest.json',import.meta.url)));
const key=l=>l.speaker+'\0'+l.text,current=new Map();
for(const origin of ORIGINS)for(const [field,value]of Object.entries(origin)){
 const pages=typeof value==='string'?[value]:Array.isArray(value)?value.filter(v=>typeof v==='string'):[];
 for(const [index,raw]of pages.entries())for(const page of dialoguePages([raw]))for(const line of page.voiceSegments){const k=key(line);if(!current.has(k))current.set(k,[]);current.get(k).push({origin_id:origin.id,hero:origin.hero,title:origin.title,field,index});}
}
test('origin voice plan contains exact current spoken turns with established cast identities and traceable provenance',()=>{
 const cast=new Map();for(const l of manifest.lines){if(!cast.has(l.speaker))cast.set(l.speaker,new Set());cast.get(l.speaker).add(l.voice);}
 const seen=new Set();for(const line of plan.lines){const k=key(line);assert.ok(current.has(k),line.id);assert.ok(!seen.has(k),line.id);seen.add(k);assert.ok(cast.get(line.speaker)?.has(line.voice),line.id);assert.match(line.id,/^origin-[a-f0-9]{20}$/);assert.equal(line.audio,line.id+'.mp3');assert.equal(line.estimated_credits,Math.ceil(line.text.length/50));
  assert.deepEqual(line.source_records.map(({file,...record})=>{assert.equal(file,'dist/game/engine2/origin-content.js');return record;}),current.get(k));
 }
 const recorded=new Set(manifest.lines.map(key));for(const [k]of current){const speaker=k.split('\0')[0];if(cast.has(speaker))assert.ok(seen.has(k)||recorded.has(k),'Current spoken origin is neither planned nor recorded: '+k);}
 assert.equal(plan.line_count,plan.lines.length);assert.equal(plan.estimated_credits,plan.lines.reduce((n,l)=>n+l.estimated_credits,0));assert.equal(plan.text_characters,plan.lines.reduce((n,l)=>n+l.text.length,0));
});
test('each integrated origin recording matches the current script and its intact local audio without requiring failed jobs',()=>{
 const planned=new Map(plan.lines.map(l=>[l.id,l])),integrated=manifest.lines.filter(l=>l.id.startsWith('origin-'));assert.ok(integrated.length<=plan.lines.length);
 for(const line of integrated){const source=planned.get(line.id);assert.ok(source,line.id);assert.ok(current.has(key(line)),line.id);for(const field of ['speaker','text','voice','audio'])assert.equal(line[field],source[field],line.id+' '+field);const bytes=fs.readFileSync(new URL('../voices/'+line.audio,import.meta.url));assert.ok(bytes.length>0,line.id);assert.equal(bytes.length,line.size_bytes,line.id);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),line.sha256,line.id);assert.ok(line.duration_seconds>.1,line.id);}
});
