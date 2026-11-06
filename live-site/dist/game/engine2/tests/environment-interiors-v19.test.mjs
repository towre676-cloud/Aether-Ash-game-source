import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {World} from '../world.js';
import {bakeHousehold,paintCompatibilityHousehold} from '../household-render.js';
import {INTERIOR_ART_FILES,INTERIOR_WALL_PIECES,interiorWallFamily,interiorWallPieceSpec,drawInteriorWallPiece,interiorWallPlan,paintInteriorWallDetails} from '../environment-interiors-v19.js';

const world=new World(JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))));
const rooms=world.data.scenes.filter(s=>s.household);
const images=Object.fromEntries(Object.keys(INTERIOR_ART_FILES).map(key=>[key,{width:1774,height:887,complete:true,key}]));
const imageSet=new Set(Object.values(images));
const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function surface({fail=false}={}){
 const calls=[],stack=[],gradient={addColorStop(){}},ctx=new Proxy({globalAlpha:.8,pathChanges:0,
  save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},
  beginPath(){this.pathChanges++;},clip(){this.pathChanges++;},
  drawImage(...args){if(fail)throw Error('decode failure');calls.push({args,alpha:this.globalAlpha});}
 },{get(t,k){if(k in t)return t[k];if(['createLinearGradient','createRadialGradient'].includes(k))return()=>gradient;if(k==='createPattern')return()=>null;return()=>{};},set(t,k,v){t[k]=v;return true;}});
 return {ctx,calls,stack};
}
function withDocument(ctx,fn){const previous=globalThis.document;globalThis.document={createElement(tag){assert.equal(tag,'canvas');return{width:0,height:0,getContext(){return ctx;}};}};try{return fn();}finally{globalThis.document=previous;}}

test('24 wall pieces match archived source metadata and the three exact delivery files',()=>{
 const meta=JSON.parse(fs.readFileSync(new URL('../../../../development/art/interiors-v19.json',import.meta.url)));
 assert.equal(INTERIOR_WALL_PIECES.length,24);assert.equal(new Set(INTERIOR_WALL_PIECES.map(p=>p.id)).size,24);assert.deepEqual(meta.runtimeFiles,INTERIOR_ART_FILES);
 for(const sheet of meta.sheets){const source=fs.readFileSync(new URL('../../../../'+sheet.archivedSourcePath,import.meta.url)),delivery=fs.readFileSync(new URL('../../../../'+sheet.delivery.file,import.meta.url));
  assert.equal(source.toString('ascii',1,4),'PNG');assert.equal(source[25],6);assert.deepEqual([source.readUInt32BE(16),source.readUInt32BE(20)],[1774,887]);assert.equal(crypto.createHash('sha256').update(source).digest('hex'),sheet.sha256);assert.equal(source.length,sheet.bytes);
  assert.equal(delivery.toString('ascii',0,4),'RIFF');assert.equal(delivery.toString('ascii',8,12),'WEBP');assert.equal(delivery.length,sheet.delivery.bytes);assert.equal(crypto.createHash('sha256').update(delivery).digest('hex'),sheet.delivery.sha256);assert.equal(sheet.delivery.maxAlphaError,0);
  assert.equal(sheet.sprites.length,8);for(const sprite of sheet.sprites){const piece=INTERIOR_WALL_PIECES.find(p=>p.id===sprite.id);assert.ok(piece);assert.deepEqual(piece.crop,sprite.crop);assert.equal(piece.asset,sheet.assetKey);const[x,y,w,h]=piece.crop;assert.ok(piece.crop.every(Number.isInteger));assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1774&&y+h<=887);assert.deepEqual(sprite.anchor,[x+w/2,y+h]);}
 }
});

test('wall fitting preserves aspect, bottom-center registration, canvas state and the caller path',()=>{
 for(const piece of INTERIOR_WALL_PIECES)for(const box of [{width:37,height:70},{width:164,height:70},{width:200,height:120}]){
  const spec=interiorWallPieceSpec(piece.id,box),{ctx,calls,stack}=surface();assert.ok(spec.width<=box.width+1e-8&&spec.height<=box.height+1e-8);assert.ok(Math.abs(spec.width/spec.height-piece.crop[2]/piece.crop[3])<1e-10);
  assert.equal(drawInteriorWallPiece(ctx,images[piece.asset],spec,100,200,.5),true);assert.equal(calls.length,1);assert.deepEqual(calls[0].args.slice(1,5),piece.crop);assert.deepEqual(calls[0].args.slice(5),[100-spec.width/2,200-spec.height,spec.width,spec.height]);assert.equal(calls[0].alpha,.4);assert.equal(ctx.globalAlpha,.8);assert.equal(ctx.pathChanges,0);assert.equal(stack.length,0);
 }
});

test('cached placements stay on real back walls, spare windows and doorways, and preserve all room and journey data',()=>{
 const before=JSON.stringify({data:world.data,state:world.state}),used=new Set();assert.ok(rooms.length>=64);
 for(const scene of rooms){const h=scene.household,plan=interiorWallPlan(scene);assert.equal(interiorWallPlan(scene),plan);assert.ok(plan.length<=16);if(h.kind==='chapel'){assert.equal(plan.length,0);continue;}
  for(const p of plan){used.add(p.id);assert.equal(p.family,interiorWallFamily(h.kind));assert.ok(p.wall.w>=96);assert.ok(p.bounds.x>=p.wall.x+5&&p.bounds.x+p.bounds.w<=p.wall.x+p.wall.w-5);assert.ok(p.bounds.y>=p.wall.y+7&&p.bounds.y+p.bounds.h<=p.wall.y+79);
   const floorY=(p.wall.y+88)/48;assert.ok(Number.isInteger(floorY));
   for(const o of h.furnishings.filter(o=>o.furniture===18)){const b=o.footprint,window={x:b.x*48,y:(b.y+b.h)*48-80,w:b.w*48,h:80};assert.equal(intersects(p.bounds,window),false,scene.key+' must spare '+o.label);}
   for(const d of h.architectureProgram?.doorways||[]){const a=d.cells[0],b=d.cells.at(-1),opening=d.axis==='h'?{x:a[0]*48,y:a[1]*48-38,w:(b[0]-a[0]+1)*48,h:86}:{x:a[0]*48,y:a[1]*48-25,w:48,h:(b[1]-a[1]+1)*48+25};assert.equal(intersects(p.bounds,opening),false,scene.key+' must spare its real doorway');}
   for(const d of scene.doors||[]){if(!d.xy)continue;assert.equal(intersects(p.bounds,{x:(d.xy[0]-.5)*48,y:(d.xy[1]-1.5)*48,w:48,h:96}),false,scene.key+' exterior approach');}
   if(p.id==='civic-herb-recess')assert.ok(['clinic','waiting','washroom'].includes(h.kind));if(p.id==='civic-archive-recess')assert.ok(['archive','guild','assembly','listening','music'].includes(h.kind));
  }
 }
 assert.deepEqual([...used].sort(),INTERIOR_WALL_PIECES.map(p=>p.id).sort());assert.equal(JSON.stringify({data:world.data,state:world.state}),before);
});

test('both household modes draw identical wall art without changing bake bounds or chapel rendering',()=>{
 const before=JSON.stringify(world.data),{ctx,calls,stack}=surface();
 withDocument(ctx,()=>{for(const scene of rooms){
  const blank=bakeHousehold(scene,{bounds:{}}),start=calls.length,painted=bakeHousehold(scene,{bounds:{},...images}),baked=calls.slice(start).filter(x=>imageSet.has(x.args[0])).map(x=>x.args);
  assert.deepEqual([painted.worldX,painted.worldY,painted.width,painted.height],[blank.worldX,blank.worldY,blank.width,blank.height]);
  const directStart=calls.length;assert.equal(paintCompatibilityHousehold(ctx,scene,null,null,images),true);const direct=calls.slice(directStart).filter(x=>imageSet.has(x.args[0])).map(x=>x.args);
  assert.deepEqual(direct,baked,scene.key+' uses the same wall crop and coordinates in both modes');assert.equal(baked.length,interiorWallPlan(scene).length);
  for(const a of baked){const[x,y,w,h]=a.slice(5);assert.ok(x>=painted.worldX&&y>=painted.worldY&&x+w<=painted.worldX+painted.width&&y+h<=painted.worldY+painted.height);}
 }});
 assert.equal(stack.length,0);assert.equal(JSON.stringify(world.data),before);
});

test('optional-art fallback, view culling and decode failures remain bounded and restore state',()=>{
 const scene=rooms.find(s=>s.key==='home'),piece=INTERIOR_WALL_PIECES[0],spec=interiorWallPieceSpec(piece.id),{ctx,calls}=surface();
 for(const image of [null,undefined,{width:0,height:0},{width:1773,height:887},{width:1774,height:887,complete:false}])assert.equal(drawInteriorWallPiece(ctx,image,spec,0,0),false);
 assert.equal(calls.length,0);assert.equal(paintInteriorWallDetails(ctx,scene),0);assert.equal(paintInteriorWallDetails(ctx,scene,{}),0);assert.equal(paintInteriorWallDetails(ctx,scene,images,{x0:-100,y0:-100,x1:-90,y1:-90}),0);
 assert.equal(paintInteriorWallDetails(ctx,scene,images),interiorWallPlan(scene).length);assert.equal(ctx.pathChanges,0);
 const failed=surface({fail:true});assert.equal(drawInteriorWallPiece(failed.ctx,images[piece.asset],spec,0,0),false);assert.equal(failed.ctx.globalAlpha,.8);assert.equal(failed.stack.length,0);
 assert.equal(interiorWallPieceSpec('unknown'),null);assert.equal(interiorWallPieceSpec(piece.id,{height:NaN}),null);assert.equal(interiorWallPieceSpec(piece.id,{width:0}),null);assert.equal(drawInteriorWallPiece(ctx,images[piece.asset],spec,NaN,0),false);assert.equal(interiorWallPlan(null).length,0);assert.equal(interiorWallFamily('chapel'),null);assert.equal(interiorWallFamily('unknown'),null);
});
