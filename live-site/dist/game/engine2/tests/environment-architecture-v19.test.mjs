import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {World} from '../world.js';
import {bakeBuilding,buildingDetailPlan,buildingFadeAlpha,paintBuilding} from '../building-art.js';
import {ARCHITECTURE_V19_FILES,FACADE_BAYS,ROOFCRAFT_DETAILS,architecturePieceSpec,drawArchitecturePiece,facadeBayPlacement,roofCraftPlacement,gableCraftPlacement,wallCraftPlacement} from '../environment-architecture-v19.js';

const world=new World(JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url),'utf8'))),plans=world.data.scenes.flatMap(s=>s.exteriorBuildings||[]).filter(p=>p.projection.kind!=='underground');
const image={width:1774,height:887,complete:true},assets={environmentFacades:image,environmentRoofcraft:{...image}},pieces=[...FACADE_BAYS,...ROOFCRAFT_DETAILS];
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} equals ${b}`);
function surface(fail=false){const calls=[],stack=[],gradient={addColorStop(){}},c=new Proxy({globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},drawImage(...a){if(fail)throw Error('decode unavailable');calls.push({args:a,alpha:this.globalAlpha});}},{get(t,k){if(k in t)return t[k];if(['createLinearGradient','createRadialGradient'].includes(k))return()=>gradient;return()=>{};},set(t,k,v){t[k]=v;return true;}});return {c,calls,stack};}
function withDocument(c,fn){const old=globalThis.document;globalThis.document={createElement(name){assert.equal(name,'canvas');return {width:0,height:0,getContext(){return c;}};}};try{return fn();}finally{globalThis.document=old;}}
const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

test('sixteen original pieces agree with their retained source and delivery audit',()=>{
 const meta=JSON.parse(fs.readFileSync(new URL('../../../../development/art/architecture-v19.json',import.meta.url),'utf8'));
 assert.equal(pieces.length,16);assert.equal(new Set(pieces.map(p=>p.id)).size,16);
 for(const sheet of meta.sheets){assert.equal(ARCHITECTURE_V19_FILES[sheet.assetKey],sheet.runtimeFile.split('/').at(-1));assert.deepEqual(sheet.dimensions,[1774,887]);assert.equal(sheet.cropAudit.alphaRetentionByThreshold['32'].omitted,0);assert.equal(sheet.cropAudit.opaqueImageEdgePixels,0);assert.equal(sheet.encoding.alpha,'exact original alpha');
  for(const [path,sha]of [[sheet.sourceFile,sheet.sourceSha256],[sheet.runtimeFile,sheet.deliverySha256]]){const data=fs.readFileSync(new URL('../../../../'+path,import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),sha);}
  for(const row of sheet.sprites){const piece=pieces.find(p=>p.id===row.id);assert.ok(piece);assert.deepEqual(piece.crop,row.crop);assert.equal(piece.asset,sheet.assetKey);if(row.windowAnchor)assert.deepEqual(piece.windowAnchor,row.windowAnchor);const[x,y,w,h]=piece.crop;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1774&&y+h<=887);}
 }
});

test('gallery fits and draw failures retain aspect, alpha and context state',()=>{
 for(const p of pieces){const spec=architecturePieceSpec(p.id,{width:92,height:94}),{c,calls,stack}=surface();c.globalAlpha=.8;assert.ok(spec.width<=92&&spec.height<=94);close(spec.width/spec.height,p.crop[2]/p.crop[3]);assert.equal(drawArchitecturePiece(c,assets,spec,100,120,.5),true);assert.equal(calls.length,1);assert.equal(calls[0].alpha,.4);close(calls[0].args[5]+spec.width/2,100);close(calls[0].args[6]+spec.height,120);assert.equal(c.globalAlpha,.8);assert.equal(stack.length,0);}
 const spec=architecturePieceSpec(FACADE_BAYS[0].id),good=surface(),failed=surface(true);
 for(const bad of [undefined,{...image,complete:false},{width:100,height:100},{naturalWidth:0,naturalHeight:0,...image}])assert.equal(drawArchitecturePiece(good.c,{environmentFacades:bad},spec,0,0),false);
 assert.equal(good.calls.length,0);assert.equal(drawArchitecturePiece(failed.c,assets,spec,0,0),false);assert.equal(failed.stack.length,0);assert.equal(failed.c.globalAlpha,1);
 assert.equal(architecturePieceSpec('missing'),null);assert.equal(architecturePieceSpec(FACADE_BAYS[0].id,{width:NaN}),null);
});

test('real window centers and complete wall bays fit without reaching doors or neighbors',()=>{
 let count=0;const used=new Set(),before=JSON.stringify(world.data);
 for(const plan of plans){const d=buildingDetailPlan(plan),door={left:-27,right:27,top:d.door.y-d.door.height,bottom:d.door.y+10};
  for(const f of d.frontages){const selected=f.windows.map(win=>({win,placed:facadeBayPlacement(d,f,win)})).filter(v=>v.placed);
   for(const {win,placed:v}of selected){count++;used.add(v.spec.id);const r=v.bounds,[sx,sy]=v.spec.crop,[ax,ay]=v.spec.piece.windowAnchor;
    assert.ok(r.left>=f.x+2-1e-7&&r.right<=f.x+f.w-2+1e-7&&r.top>=f.y+2-1e-7&&r.bottom<=f.ground-8+1e-7);assert.ok(!intersects(r,door));
    close(r.left+(ax-sx)*v.spec.scale,win.x);close(r.top+(ay-sy)*v.spec.scale,win.y-win.h/2);assert.ok(v.spec.width>=28&&v.spec.height>=30);assert.ok(v.spec.width<=48.00001&&v.spec.height<=49.00001);
   }
   for(let i=0;i<selected.length;i++)for(let j=i+1;j<selected.length;j++)assert.ok(!intersects(selected[i].placed.bounds,selected[j].placed.bounds));
  }
 }
 assert.ok(count>35);assert.deepEqual([...used].sort(),FACADE_BAYS.map(p=>p.id).sort());assert.equal(JSON.stringify(world.data),before);
});

test('roof craft fits actual cells and wall fittings retain actual frontages',()=>{
 const used=new Set();
 for(const plan of plans){const d=buildingDetailPlan(plan),roof=roofCraftPlacement(plan),unit=d.unit,cells=new Set(plan.projection.cells.map(v=>v.join(',')));
  if(roof){used.add(roof.spec.id);const r=roof.bounds;for(let y=Math.floor((r.top+64+.001)/unit);y<=Math.floor((r.bottom+64-.001)/unit);y++)for(let x=Math.floor((r.left+.001)/unit);x<=Math.floor((r.right-.001)/unit);x++)assert.ok(cells.has(x+','+y),'roof detail never bridges a concave gap');}
  let wallPlaced=false;for(const f of d.frontages){const g=gableCraftPlacement(d,f);if(g){used.add(g.spec.id);assert.equal(d.material,'carpenter');assert.ok(g.bounds.left>=f.x&&g.bounds.right<=f.x+f.w&&g.bounds.top>=f.gable.y-f.gable.rise&&g.bounds.bottom<=f.y);}
   const wall=!wallPlaced&&wallCraftPlacement(d,f);if(wall){wallPlaced=true;used.add(wall.spec.id);const r=wall.bounds;assert.ok(r.left>=f.x+2&&r.right<=f.x+f.w-2&&r.top>=f.y+2&&r.bottom<=f.ground-5);}
  }
 }
 assert.deepEqual([...used].sort(),ROOFCRAFT_DETAILS.map(p=>p.id).sort());
 for(const p of world.data.scenes.flatMap(s=>s.exteriorBuildings||[]).filter(p=>p.projection.kind==='underground'))assert.equal(roofCraftPlacement(p),null);
});

test('building bakes preserve geometry and all sixteen motifs are meaningful production draws',()=>{
 const {c,calls,stack}=surface(),before=JSON.stringify(world.data),used=new Set();
 withDocument(c,()=>{for(const plan of plans){const base=bakeBuilding(plan),start=calls.length,painted=bakeBuilding(plan,assets);assert.deepEqual([painted.width,painted.height,painted.worldX,painted.worldY],[base.width,base.height,base.worldX,base.worldY]);
  for(const {args}of calls.slice(start)){const p=pieces.find(p=>assets[p.asset]===args[0]&&p.crop.every((v,i)=>v===args[i+1]));assert.ok(p);used.add(p.id);const [x,y,w,h]=args.slice(5);assert.ok(x>=painted.worldX&&x+w<=painted.worldX+painted.width&&y>=painted.worldY&&y+h<=painted.worldY+painted.height);}
 }});assert.deepEqual([...used].sort(),pieces.map(p=>p.id).sort());assert.equal(stack.length,0);assert.equal(JSON.stringify(world.data),before);
});

test('missing new atlases keep legacy details and successful families can load independently',()=>{
 const home=plans.find(p=>p.projection.material==='home'),{c,calls}=surface();
 withDocument(c,()=>{const base=bakeBuilding(home);for(const bad of [{},{environmentFacades:{width:0,height:0},environmentRoofcraft:{...image,complete:false}}]){const start=calls.length,next=bakeBuilding(home,bad);assert.equal(calls.length,start);assert.deepEqual([next.width,next.height,next.worldX,next.worldY],[base.width,base.height,base.worldX,base.worldY]);}
  for(const key of ['environmentFacades','environmentRoofcraft']){const start=calls.length;bakeBuilding(home,{[key]:assets[key]});assert.ok(calls.slice(start).length>0);assert.ok(calls.slice(start).every(v=>v.args[0]===assets[key]));}
 });
});

test('a foreground building fades for a covered companion and keeps hero-only doorway labels',()=>{
 const source=plans.find(p=>p.projection.material==='home'),plan={...source,art:{worldX:0,worldY:0}},p=plan.projection,[ox,oy]=p.outside;
 const far={x:ox+80,y:oy+80},behind={x:ox+.5+(p.bounds.minX+p.bounds.maxX+1)*p.scale/2,y:oy+.5+(p.bounds.minY+p.bounds.maxY+1)*p.scale/2};
 assert.equal(buildingFadeAlpha(plan,far),1);assert.equal(buildingFadeAlpha(plan,far,[far,{x:NaN,y:0}]),1);assert.equal(buildingFadeAlpha(plan,far,[behind]),.32);assert.equal(buildingFadeAlpha(plan,behind),.32);
 const {c,calls,stack}=surface(),labels=[],renderer={ctx:c,followers:[behind],label(...v){labels.push(v);}};paintBuilding(renderer,plan,far);assert.equal(calls.at(-1).alpha,.32);assert.equal(labels.length,0);assert.equal(stack.length,0);assert.equal(c.globalAlpha,1);
 renderer.followers=[far];paintBuilding(renderer,plan,far);assert.equal(calls.at(-1).alpha,1);assert.equal(labels.length,0);
});
