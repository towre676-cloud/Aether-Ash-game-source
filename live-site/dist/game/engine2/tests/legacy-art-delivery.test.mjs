import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gameArtDefinitions} from '../art-definitions.js';
import {ROOM_LIFE_BOUNDS} from '../room-life-bounds.js';
import {SCENE_PROP_CROPS} from '../scene-craft.js';
import {REPERTOIRE_ART_URL,REPERTOIRE_PROPS} from '../scene-prop-repertoire.js';

const root=new URL('../../../../',import.meta.url);
const receipt=JSON.parse(fs.readFileSync(new URL('development/art/legacy-delivery.json',root)));
const expected={
 roomLife:{stem:'occupied-workstations-v6',dimensions:[1536,1024],sha256:'15f62c279cbae5e0197609b1bd2e8823f24868f4221ef9791cfad33a4ed866c9',crops:ROOM_LIFE_BOUNDS.map(p=>[p.x,p.y,p.w,p.h])},
 sceneProps:{stem:'scene-props-v10',dimensions:[1774,887],sha256:'058be38f04612bb56c46bf17bab87b30ad75b31c0c499079326e54b3686ee674',crops:SCENE_PROP_CROPS},
 scenePropsExtra:{stem:'scene-props-v11',dimensions:[1774,887],sha256:'3ba1e7fe5df715f0fba67f14361f7545fd46cf2cef77f1835275bd542830cc7e',crops:REPERTOIRE_PROPS.map(p=>p.crop)}
};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('three legacy originals retain their exact PNG bytes, dimensions and existing source crops',()=>{
 assert.deepEqual(receipt.files.map(p=>p.assetKey).sort(),Object.keys(expected).sort());
 for(const record of receipt.files){
  const original=expected[record.assetKey],bytes=fs.readFileSync(new URL(record.original,root));
  assert.equal(record.original,'development/art/source-legacy-delivery/'+original.stem+'.png');
  assert.equal(bytes.toString('ascii',1,4),'PNG');assert.equal(bytes[25],6);
  const dimensions=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
  assert.deepEqual(dimensions,original.dimensions);assert.deepEqual(record.dimensions,dimensions);
  assert.equal(hash(bytes),original.sha256);assert.equal(record.originalSha256,original.sha256);assert.equal(record.originalBytes,bytes.length);
  for(const [x,y,w,h]of original.crops)assert.ok([x,y,w,h].every(Number.isInteger)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=dimensions[0]&&y+h<=dimensions[1],original.stem+' crop fits unchanged source');
 }
});

test('WebP delivery headers and hash-bound full-image alpha verification match every original',()=>{
 let originalBytes=0,deliveryBytes=0;
 for(const record of receipt.files){
  const bytes=fs.readFileSync(new URL(record.delivery,root));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(bytes.readUInt32LE(4)+8,bytes.length);
  const chunks=new Map();let offset=12;
  while(offset<bytes.length){assert.ok(offset+8<=bytes.length);const id=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4);assert.ok(offset+8+size<=bytes.length);chunks.set(id,bytes.subarray(offset+8,offset+8+size));offset+=8+size+(size%2);}
  assert.equal(offset,bytes.length);assert.ok(chunks.has('VP8 ')&&chunks.has('ALPH'));
  const extended=chunks.get('VP8X');assert.ok(extended&&extended.length===10);assert.ok(extended[0]&0x10,'alpha-present flag');
  assert.deepEqual([1+extended.readUIntLE(4,3),1+extended.readUIntLE(7,3)],record.dimensions);
  assert.equal(hash(bytes),record.deliverySha256);assert.equal(bytes.length,record.deliveryBytes);
  assert.equal(record.alphaExact,true);assert.equal(record.maxAlphaError,0);assert.equal(record.differentAlphaPixels,0);assert.equal(record.comparedAlphaPixels,record.dimensions[0]*record.dimensions[1]);
  assert.ok(record.deliveryBytes<record.originalBytes);originalBytes+=record.originalBytes;deliveryBytes+=record.deliveryBytes;
 }
 assert.equal(receipt.originalBytes,originalBytes);assert.equal(receipt.deliveryBytes,deliveryBytes);assert.equal(receipt.savedBytes,originalBytes-deliveryBytes);
 assert.equal(receipt.encoding.quality,95);assert.equal(receipt.encoding.compressionLevel,6);assert.equal(receipt.encoding.losslessColor,false);
});

test('existing required asset keys resolve to the validated delivery files without changing their source identities',()=>{
 const definitions=gameArtDefinitions(),manifest=JSON.parse(fs.readFileSync(new URL('../art/manifest.json',import.meta.url)));
 for(const record of receipt.files){
  const definition=definitions.find(p=>p.name===record.assetKey),filename=expected[record.assetKey].stem+'.webp';
  assert.ok(definition);assert.equal(definition.optional,undefined,'legacy required asset remains required');assert.ok(new URL(definition.src).pathname.endsWith('/art/'+filename));
  const entry=manifest.sources.find(p=>p.path==='art/'+filename);assert.ok(entry);assert.equal(entry.sha256,record.deliverySha256);assert.equal(entry.original_source.sha256,record.originalSha256);assert.equal(entry.original_source.path,record.original);
  assert.ok(!fs.existsSync(new URL(record.originalProductionPath,root)),'original PNG is archived outside dist');
 }
 assert.ok(new URL(REPERTOIRE_ART_URL).pathname.endsWith('/art/scene-props-v11.webp'));
});
