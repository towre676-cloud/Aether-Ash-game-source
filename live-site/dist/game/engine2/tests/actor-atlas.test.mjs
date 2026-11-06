import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {ACTOR_SHEETS,actorSourceRect} from '../actor-atlas.js';
import {ACTOR_ANCHOR_SOURCES,ACTOR_SOURCE_ANCHORS} from '../actor-source-anchors.js';
test('measured source rectangles preserve all 128 actor poses inside their sheets',()=>{
 let total=0;
 for(const [kind,sheet] of Object.entries(ACTOR_SHEETS)){
  for(let row=0;row<sheet.rows.length;row++){
   assert.equal(sheet.rows[row].length,8);
   for(let col=0;col<8;col++){
    const r=actorSourceRect(kind,row,col);total++;
    assert.ok(r.x>=0&&r.y>=0&&r.w>70&&r.h>100);
    assert.ok(r.x+r.w<=sheet.width&&r.y+r.h<=sheet.height);
    assert.ok(r.w*sheet.scale+2<224&&r.h*sheet.scale+2<216);
   }
  }
 }
 assert.equal(total,128);assert.equal(actorSourceRect('run',7,0),null);
});
test('offline torso and sole measurements belong to the delivered artwork and all 128 crops',()=>{
 const files={crew:'crew.webp',run:'crew-run-v2.webp',starter:'sable-starter.webp'};let total=0;
 for(const [kind,file] of Object.entries(files)){
  assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../art/'+file,import.meta.url))).digest('hex'),ACTOR_ANCHOR_SOURCES[kind],kind+' art changed without regenerating its pivots');
  assert.equal(ACTOR_SOURCE_ANCHORS[kind].length,ACTOR_SHEETS[kind].rows.length);
  for(let row=0;row<ACTOR_SHEETS[kind].rows.length;row++)for(let col=0;col<8;col++){
   const b=actorSourceRect(kind,row,col);total++;
   assert.ok(Number.isFinite(b.anchorX)&&b.anchorX>0&&b.anchorX<b.w,kind+' torso '+row+':'+col);
   assert.ok(Number.isFinite(b.anchorY)&&b.anchorY>0&&b.anchorY<=b.h,kind+' sole '+row+':'+col);
   assert.ok(b.bodyHeight>0&&b.bodyHeight<=b.anchorY,kind+' body '+row+':'+col);
  }
 }
 assert.equal(total,128);
});
test('Iona boots and wide action poses extend beyond the old equal-grid cells',()=>{
 const sheet=ACTOR_SHEETS.run;
 for(let col=0;col<8;col++){
  const r=actorSourceRect('run',1,col);assert.ok(r.y+r.h>=349);assert.ok(r.y+r.h>sheet.height*2/7);
 }
 const sword=actorSourceRect('starter',0,3);assert.ok(sword.x+sword.w>ACTOR_SHEETS.starter.width*4/8);
 const walk=actorSourceRect('crew',0,1);assert.ok(walk.x<ACTOR_SHEETS.crew.width/8);
});
