import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTOR_SHEETS,actorSourceRect} from '../actor-atlas.js';
import {originalAtlas,preparedAtlasUsable} from '../atlas-fallback.js';
import {atlasRegistration,registeredFit,shareActorRegistrations} from '../motion-realism.js';

test('original actor recovery retains the actual image and all measured poses',()=>{
 let poses=0;
 for(const [kind,sheet] of Object.entries(ACTOR_SHEETS)){
  const image={width:sheet.width,height:sheet.height},recovered=originalAtlas(image,kind,8,sheet.rows.length);
  assert.equal(recovered.image,image);assert.equal(recovered.bounds.length,sheet.rows.length*8);assert.equal(preparedAtlasUsable(recovered,sheet.rows.length*8),true);
  for(let row=0;row<sheet.rows.length;row++)for(let col=0;col<8;col++){assert.deepEqual(recovered.bounds[row*8+col],actorSourceRect(kind,row,col));poses++;}
  if(kind!=='starter')assert.equal(recovered.bounds.length,56);
 }
 assert.equal(poses,128);
});
test('actor fallback scales packed source rectangles to delivered image dimensions',()=>{
 const sheet=ACTOR_SHEETS.run,image={width:sheet.width/2,height:sheet.height/4},recovered=originalAtlas(image,'run',8,7),expected=actorSourceRect('run',1,7),actual=recovered.bounds[15];
 assert.deepEqual(actual,{x:expected.x/2,y:expected.y/4,w:expected.w/2,h:expected.h/4,anchorX:expected.anchorX/2,anchorY:expected.anchorY/4,bodyHeight:expected.bodyHeight/4});assert.ok(preparedAtlasUsable(recovered,56));
 // Iona's boots must remain in the measured pose instead of the old equal row.
 assert.ok(actual.y+actual.h>image.height*2/7);
});
test('compatibility locomotion pins the actual torso and soles rather than a moving cape bounding box',()=>{
 const atlases={},registrations={};
 for(const kind of ['crew','run','starter']){
  const sheet=ACTOR_SHEETS[kind];atlases[kind]=originalAtlas({width:sheet.width,height:sheet.height},kind,8,sheet.rows.length);
  registrations[kind]=atlasRegistration(atlases[kind].bounds,8,sheet.rows.length,kind==='crew'?[0,1,2,5,6,7]:null);
 }
 shareActorRegistrations(registrations);
 // Riven's opposite-side walk paintings have markedly asymmetric cloaks.
 const a=actorSourceRect('crew',4,1),b=actorSourceRect('crew',4,2);
 assert.ok(Math.abs((a.anchorX-a.w/2)-(b.anchorX-b.w/2))>40,'the real-art regression must exercise an asymmetric silhouette');
 for(const [kind,atlas] of Object.entries(atlases))for(let i=0;i<atlas.bounds.length;i++){
  const source=atlas.bounds[i],fit=registeredFit(source,registrations[kind][Math.floor(i/8)],60,74),scale=fit.width/source.w;
  for(const mirror of [-1,1])assert.ok(Math.abs((fit.left+source.anchorX*scale)*mirror)<1e-10,kind+' torso drifts at pose '+i);
  assert.ok(Math.abs(fit.top+source.anchorY*scale)<1e-10,kind+' soles float at pose '+i);
 }
});
test('nonactor fallback uses complete equal-grid cells without canvas or pixel reads',()=>{
 const image={width:1448,height:1086},recovered=originalAtlas(image,'creatures',4,6);
 assert.equal(recovered.image,image);assert.equal(recovered.bounds.length,24);assert.deepEqual(recovered.bounds[23],{x:1086,y:905,w:362,h:181});assert.ok(preparedAtlasUsable(recovered,24));
});
test('blank processed atlases and an entirely empty actor row are rejected',()=>{
 const image={width:1792,height:1568},blank={image,bounds:Array.from({length:56},(_,i)=>({x:i%8*224,y:Math.floor(i/8)*224,w:1,h:1}))};
 assert.equal(preparedAtlasUsable(blank,56),false);
 const partial={image,bounds:blank.bounds.map((b,i)=>i<8?{...b,w:100,h:160}:b)};assert.equal(preparedAtlasUsable(partial,56),false);
 const recovered=originalAtlas({width:1341,height:1173},'crew',8,7);assert.ok(preparedAtlasUsable(recovered,56));
 for(let i=16;i<24;i++)recovered.bounds[i]={x:0,y:0,w:1,h:1};assert.equal(preparedAtlasUsable(recovered,56),false);
});
test('invalid dimensions, missing image, stale cell count and unsafe source bounds cannot be accepted',()=>{
 const valid=originalAtlas({width:1341,height:1173},'crew',8,7);
 for(const bad of [null,{...valid,image:null},{...valid,image:{width:0,height:1173}},{...valid,bounds:valid.bounds.slice(1)},...[-1,NaN,Infinity,1400].map(x=>({...valid,bounds:valid.bounds.map((b,i)=>i?b:{...b,x})}))])assert.equal(preparedAtlasUsable(bad,56),false);
 assert.throws(()=>originalAtlas({width:0,height:10},'crew',8,7),/dimensions/);assert.throws(()=>originalAtlas(valid.image,'crew',4,7),/layout/);
});
