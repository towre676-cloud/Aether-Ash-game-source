import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createObservatoryMaterialAtlas,observatoryMaterialRecipe,OBSERVATORY_MATERIALS} from '../observatory-materials.js';

function recordedCanvas(){
 const events=[],ctx={};
 for(const name of ['save','restore','setTransform','translate','beginPath','closePath','moveTo','lineTo','rect','clip','fill','stroke','fillRect','arc'])ctx[name]=(...args)=>{
  for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),name+' receives a finite coordinate');
  events.push([name,...args]);
 };
 for(const name of ['createLinearGradient','createRadialGradient'])ctx[name]=(...args)=>{events.push([name,...args]);return{addColorStop:(at,color)=>{assert.ok(at>=0&&at<=1);events.push(['stop',at,color]);}};};
 for(const name of ['fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','imageSmoothingEnabled'])Object.defineProperty(ctx,name,{set(value){events.push([name,typeof value==='object'?'gradient':value]);}});
 return{events,canvas:{width:0,height:0,getContext:kind=>kind==='2d'?ctx:null}};
}

function polygonArea(poly){let sum=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];sum+=a[0]*b[1]-b[0]*a[1];}return Math.abs(sum)/2;}
function contains(poly,x,y){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;}

test('fitted flags and natural fracture planes cover the actual tile without rectangular cliff courses',()=>{
 const recipe=observatoryMaterialRecipe();assert.deepEqual(recipe,observatoryMaterialRecipe());
 assert.equal(recipe.quadrants.length,4);assert.equal(recipe.tileSize,512);
 assert.deepEqual(recipe.quadrants.map(q=>q.id),['floor','wall','copper','cliff']);
 const floor=recipe.quadrants[0],wall=recipe.quadrants[1],cliff=recipe.quadrants[3];
 for(const [label,planes]of[['floor',floor.blocks],['cliff',cliff.rocks]]){
  assert.ok(Math.abs(planes.reduce((n,p)=>n+polygonArea(p.polygon),0)-512*512)<.001,label+' irregular pieces conserve the complete tile area');
  for(const p of planes){assert.ok(p.polygon.length>=3);for(const point of p.polygon)assert.ok(point.every(Number.isFinite)&&point.every(v=>v>=-.000001&&v<=512.000001),label+' polygon stays inside the atlas tile');}
  for(let y=3;y<512;y+=13)for(let x=3;x<512;x+=13)assert.ok(planes.some(p=>contains(p.polygon,x,y)),label+' has no unintended unpainted void at '+x+','+y);
  const edges=planes.flatMap(p=>p.polygon.map((a,i)=>[a,p.polygon[(i+1)%p.polygon.length]])),oblique=edges.filter(([a,b])=>Math.abs(a[0]-b[0])>1&&Math.abs(a[1]-b[1])>1);
  assert.ok(oblique.length>edges.length*.55,label+' has fitted oblique edges instead of an uninterrupted rectangular grid');
 }
 assert.ok(floor.jointWidth<=1.2,'floor joints have restrained scale instead of heavy enclosing mortar');
 assert.ok(new Set(floor.blocks.map(b=>b.color)).size>=4,'flags contain genuine material hue variation');
 assert.ok(new Set(cliff.rocks.map(b=>b.id)).size<=12,'cliff uses broad geological planes rather than many masonry blocks');
 assert.ok(cliff.strata.every(s=>Math.max(...s.map(p=>p[0]))-Math.min(...s.map(p=>p[0]))>=512&&Math.max(...s.map(p=>p[1]))-Math.min(...s.map(p=>p[1]))>80),'geological bedding crosses the tile obliquely');
 assert.ok(cliff.runnels.every(r=>Math.max(...r.points.map(p=>p[1]))-Math.min(...r.points.map(p=>p[1]))<450),'seepage appears in partial irregular channels rather than full-height regular grid lines');
 for(let y=0;y<512;y+=4)for(let x=0;x<512;x+=4)assert.ok(wall.blocks.some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h),'native cut-stone lodge wall remains fully covered');
 const copper=recipe.quadrants[2];assert.equal(copper.panels.length,8);assert.ok(copper.panels.every(p=>p.tide.length>=8&&p.scratches.length>=8));
 assert.notDeepEqual(observatoryMaterialRecipe({seed:123}).quadrants,recipe.quadrants,'the authored generator uses its seed rather than a fixed decorative manifest');
});

test('the real factory paints four clipped swatches, caches the bounded atlas and exposes matching small-face colors',()=>{
 const first=recordedCanvas();let calls=0;const createCanvas=(width,height)=>{calls++;assert.equal(width,1024);assert.equal(height,1024);return first.canvas;};
 const atlas=createObservatoryMaterialAtlas({createCanvas});assert.equal(atlas,first.canvas);assert.equal(atlas.width*atlas.height*4,4*1024*1024);assert.equal(OBSERVATORY_MATERIALS.rgbaBytes,atlas.width*atlas.height*4);
 assert.equal(createObservatoryMaterialAtlas({createCanvas}),atlas);assert.equal(calls,1,'scene changes reuse the same painted canvas');
 assert.deepEqual(first.events.filter(e=>e[0]==='translate'),[['translate',0,0],['translate',512,0],['translate',0,512],['translate',512,512]]);
 assert.ok(first.events.filter(e=>e[0]==='fillRect').length>500,'the actual painting applies broad material washes rather than four flat rectangles');
 assert.ok(first.events.filter(e=>e[0]==='createLinearGradient').length>60);assert.ok(first.events.filter(e=>e[0]==='createRadialGradient').length>100);
 assert.equal(atlas.observatoryMaterialAverages.length,4);for(const rgb of atlas.observatoryMaterialAverages)assert.ok(rgb.length===3&&rgb.every(v=>v>0&&v<1));
 assert.ok(atlas.observatoryMaterialAverages[0][0]>atlas.observatoryMaterialAverages[3][0]*1.8,'distant stone and cliff stay visibly distinct');
 const second=recordedCanvas();createObservatoryMaterialAtlas({createCanvas:()=>second.canvas});
 const hash=events=>createHash('sha256').update(JSON.stringify(events)).digest('hex');assert.equal(hash(first.events),hash(second.events),'all actual drawing commands are deterministic across fresh canvases');
});

test('a headless or unavailable drawing surface falls back without caching a broken image',()=>{
 assert.equal(createObservatoryMaterialAtlas({createCanvas:()=>null}),null);
 assert.equal(createObservatoryMaterialAtlas({createCanvas:()=>({getContext:()=>null})}),null);
 const oldDocument=globalThis.document,oldOffscreen=globalThis.OffscreenCanvas;
 try{delete globalThis.document;delete globalThis.OffscreenCanvas;assert.equal(createObservatoryMaterialAtlas(),null);}finally{if(oldDocument!==undefined)globalThis.document=oldDocument;if(oldOffscreen!==undefined)globalThis.OffscreenCanvas=oldOffscreen;}
});
