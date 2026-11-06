import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {AUTHORED_ART_FILES} from '../authored-art.js';
import {gameArtDefinitions} from '../art-definitions.js';
const root=new URL('../../../../',import.meta.url);
const receipt=JSON.parse(fs.readFileSync(new URL('development/art/delivery-v16-lossless-5.21.json',root)));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('every v16 source survives exactly and lossless delivery preserves the full alpha/RGBA verification',()=>{
 assert.equal(receipt.authored_art.length,4);assert.equal(receipt.encoding.lossless,true);assert.equal(receipt.encoding.exact_transparent_rgb,true);
 for(const entry of receipt.authored_art){
  const source=fs.readFileSync(new URL(entry.source,root)),delivery=fs.readFileSync(new URL(entry.delivery,root));
  assert.equal(hash(source),entry.source_sha256);assert.equal(hash(delivery),entry.delivery_sha256);
  assert.equal(source.length,entry.source_bytes);assert.equal(delivery.length,entry.delivery_bytes);
  assert.equal(source.toString('ascii',1,4),'PNG');assert.equal(source.readUInt32BE(16),entry.width);assert.equal(source.readUInt32BE(20),entry.height);
  assert.equal(delivery.toString('ascii',12,16),'VP8L');const bits=delivery.readUInt32LE(21);assert.equal((bits&0x3fff)+1,entry.width);assert.equal(((bits>>>14)&0x3fff)+1,entry.height);
  assert.equal(entry.alpha_equal,true);assert.equal(entry.all_rgba_pixels_equal,true);assert.equal(entry.decoded_rgba_sha256.length,64);
  assert.ok(entry.delivery_bytes<entry.source_bytes);
 }
});
test('live authored art keys resolve to preserved-dimension lossless deliverables',()=>{
 const definitions=gameArtDefinitions();
 for(const [key,file]of Object.entries(AUTHORED_ART_FILES)){
  assert.ok(file.endsWith('.webp'));const entry=receipt.authored_art.find(p=>p.delivery.endsWith('/'+file));assert.ok(entry);
  const definition=definitions.find(p=>p.name===key);assert.ok(definition);assert.ok(new URL(definition.src).pathname.endsWith('/art/'+file));
 }
});
test('unclean draft sources are archived, while clean atlases and motion videos remain playable',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('dist/game/animation-expansion/motion/motion-manifest.json',root)));
 for(const asset of manifest.assets){
  const entry=receipt.relocated_motion_sources.find(e=>e.preserved===asset.original_file);assert.ok(entry);assert.equal(hash(fs.readFileSync(new URL(entry.preserved,root))),entry.sha256);
  assert.equal(fs.existsSync(new URL(entry.source,root)),false);
  for(const file of [asset.file,asset.clip])assert.ok(fs.existsSync(new URL('dist/game/animation-expansion/motion/'+file,root)));
 }
});
