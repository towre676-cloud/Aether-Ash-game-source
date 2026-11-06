import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ENVIRONMENT_CANOPY_FILE,ENVIRONMENT_CANOPIES,CANOPY_STYLE_POOLS,selectEnvironmentCanopy,environmentCanopySpec,environmentCanopyGeometry,drawEnvironmentCanopy} from '../environment-canopies-v17.js';
import {scenicTreeGeometry,scenicTreeAlpha,drawScenicTree,scenicTreeSites} from '../scenic-trees.js';
import {flow} from './opening-flow.mjs';

const image={width:1774,height:887,complete:true};
const selectedSeed=style=>Array.from({length:1000},(_,i)=>i*4).find(s=>selectEnvironmentCanopy(s,style));
function surface(throwDraw=false){const calls=[],stack=[],c={globalAlpha:.8,matrix:[1,1,0,0],save(){stack.push({alpha:this.globalAlpha,matrix:this.matrix.slice()});},restore(){const saved=stack.pop();this.globalAlpha=saved.alpha;this.matrix=saved.matrix;},translate(x,y){this.matrix[2]+=x*this.matrix[0];this.matrix[3]+=y*this.matrix[1];},scale(x,y){this.matrix[0]*=x;this.matrix[1]*=y;},drawImage(...args){if(throwDraw)throw new Error('decode failure');calls.push({args,alpha:this.globalAlpha,matrix:this.matrix.slice()});}};return {c,calls,stack};}
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-8,message||`${actual} ≈ ${expected}`);

test('measured canopy source parts fit the original RGBA atlas and one common root frame',()=>{
 const png=fs.readFileSync(new URL('../../../../development/art/source-v17/'+ENVIRONMENT_CANOPY_FILE.replace(/\.webp$/i,'.png'),import.meta.url));
 assert.equal(png.toString('ascii',1,4),'PNG');assert.equal(png[25],6);assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[1774,887]);
 assert.equal(ENVIRONMENT_CANOPIES.length,8);assert.equal(new Set(ENVIRONMENT_CANOPIES.map(p=>p.id)).size,8);
 for(const p of ENVIRONMENT_CANOPIES){const [x,y,w,h]=p.crop;assert.ok(p.anchor[0]>=x&&p.anchor[0]<=x+w&&p.anchor[1]>=y&&p.anchor[1]<=y+h,p.id);assert.ok(p.parts.length>=1&&p.parts.length<=6);for(const [sx,sy,sw,sh]of p.parts){assert.ok([sx,sy,sw,sh].every(Number.isInteger));assert.ok(sx>=x&&sy>=y&&sx+sw<=x+w&&sy+sh<=y+h&&sx+sw<=image.width&&sy+sh<=image.height,p.id+' source part');}const spec=environmentCanopySpec(p.id);assert.ok(spec.draw.w<=240.00001&&spec.draw.h<=240.00001);assert.ok(spec.opaque.left>=spec.draw.x&&spec.opaque.right<=spec.draw.x+spec.draw.w+.00001);assert.ok(spec.opaque.top>=spec.draw.y&&spec.opaque.bottom<=spec.draw.y+spec.draw.h+.00001);}
});

test('admitted seed pattern selects about half the sites without snowy or dry-biome leakage',()=>{
 const seeds=Array.from({length:2000},(_,i)=>i*4);
 for(const [style,pool]of Object.entries(CANOPY_STYLE_POOLS)){
  const ids=new Set(),selected=seeds.filter(seed=>{const p=selectEnvironmentCanopy(seed,style);assert.deepEqual(p,selectEnvironmentCanopy(seed,style));if(p){assert.ok(pool.includes(p.id));ids.add(p.id);}return p;});
  assert.ok(selected.length>=800&&selected.length<=1200,style+' replacement density');assert.deepEqual([...ids].sort(),[...pool].sort());
  if(!['ice','glacier','aurora'].includes(style))assert.ok(!ids.has('snow-spruce'),style);
  if(!['sand','dunes','cactus','desert'].includes(style))assert.ok(!ids.has('desert-acacia'),style);
 }
 for(const style of ['foundry','coral','salt','marble','interior','unknown'])for(const seed of seeds.slice(0,50))assert.equal(selectEnvironmentCanopy(seed,style),null);
});

test('stable admitted seeds vary non-wind canopy handedness while junipers keep one wind direction',()=>{
 const counts=new Map();
 for(const style of ['village','riverbank','mangrove','ice','storm','sand','spore'])for(let i=0;i<1024;i++){
  const seed=i*4,spec=environmentCanopyGeometry(seed,style,image);if(!spec)continue;assert.deepEqual(spec,environmentCanopyGeometry(seed,style,image));
  const count=counts.get(spec.id)||{original:0,flipped:0};count[spec.flip?'flipped':'original']++;counts.set(spec.id,count);
 }
 assert.equal(counts.size,8);
 for(const [id,{original,flipped}]of counts){assert.equal(environmentCanopySpec(id).flip,false,'gallery default remains the original orientation');if(id==='storm-juniper'){assert.equal(flipped,0);assert.equal(environmentCanopySpec(id,{flip:true}).flip,false);}else{assert.ok(original>0&&flipped>0,id+' has both orientations');assert.ok(flipped/(original+flipped)>.35&&flipped/(original+flipped)<.65,id+' balanced variation');}}
});

test('an unavailable or mismatched optional atlas leaves all legacy geometry unchanged',()=>{
 for(const style of ['woodland','village','riverbank','highland','ice'])for(const atlas of [true,false]){
  const seed=selectedSeed(style),baseline=scenicTreeGeometry(seed,style,{atlas});
  for(const missing of [null,undefined,{width:0,height:0},{...image,complete:false},{width:1773,height:887},{width:1774,height:886}])assert.deepEqual(scenicTreeGeometry(seed,style,{atlas,environmentCanopies:missing}),baseline);
 }
});

test('the optional tree artwork uses existing safe sites and leaves the expanded world unchanged',()=>{
 const {w}=flow(),before=JSON.stringify(w.data),scene=w.scenes.get(5),sites=scenicTreeSites(scene),again=scenicTreeSites(scene),used=new Set();
 for(const p of sites){const spec=environmentCanopyGeometry(p.seed,'village',image);if(spec)used.add(spec.id);assert.deepEqual(scenicTreeGeometry(p.seed,'village',{environmentCanopies:image}),spec||scenicTreeGeometry(p.seed,'village'));}
 assert.ok(used.size>=1);assert.deepEqual(sites,again);assert.equal(JSON.stringify(w.data),before);
});

test('drawing isolated source strips keeps one fixed scale and off-center root anchor',()=>{
 for(const p of ENVIRONMENT_CANOPIES){const {c,calls,stack}=surface(),spec=environmentCanopySpec(p.id);assert.equal(drawEnvironmentCanopy(c,image,spec,123,245,.5),true);assert.equal(calls.length,p.parts.length);assert.equal(c.globalAlpha,.8);assert.equal(stack.length,0);
  for(let i=0;i<calls.length;i++){const {args,alpha}=calls[i],[sx,sy,sw,sh]=p.parts[i];assert.equal(args[0],image);assert.deepEqual(args.slice(1,5),p.parts[i]);assert.equal(args[5],123+(sx-p.anchor[0])*spec.scale);assert.equal(args[6],245+(sy-p.anchor[1])*spec.scale);assert.equal(args[7],sw*spec.scale);assert.equal(args[8],sh*spec.scale);assert.equal(alpha,.4);}
 }
 const alder=ENVIRONMENT_CANOPIES.find(p=>p.id==='river-alder'),juniper=ENVIRONMENT_CANOPIES.find(p=>p.id==='storm-juniper');assert.notEqual(alder.anchor[0],alder.crop[0]+alder.crop[2]/2);assert.notEqual(juniper.anchor[0],juniper.crop[0]+juniper.crop[2]/2);
});

test('horizontal reflection retains each original source part, fixed root and matching opaque bounds',()=>{
 for(const p of ENVIRONMENT_CANOPIES.filter(p=>p.id!=='storm-juniper')){
  const original=environmentCanopySpec(p.id),spec=environmentCanopySpec(p.id,{flip:true}),{c,calls,stack}=surface(),x=123,y=245;
  assert.equal(spec.parts,original.parts);assert.equal(spec.source,original.source);assert.equal(spec.scale,original.scale);close(spec.draw.x,-original.draw.x-original.draw.w);close(spec.opaque.left,-original.opaque.right);close(spec.opaque.right,-original.opaque.left);assert.equal(spec.opaque.top,original.opaque.top);assert.equal(spec.opaque.bottom,original.opaque.bottom);assert.ok(spec.draw.w<=240.00001&&spec.draw.h<=240.00001);
  assert.equal(drawEnvironmentCanopy(c,image,spec,x,y,.5),true);assert.equal(calls.length,p.parts.length);
  for(let i=0;i<calls.length;i++){
   const {args,matrix}=calls[i],[sx,sy,sw,sh]=p.parts[i],[mx,my,tx,ty]=matrix;assert.deepEqual(args.slice(1,5),p.parts[i]);assert.deepEqual(matrix,[-1,1,x,y]);
   const sourcePoint=(px,py)=>[(args[5]+(px-sx)*spec.scale)*mx+tx,(args[6]+(py-sy)*spec.scale)*my+ty],root=sourcePoint(...p.anchor);
   close(root[0],x,p.id+' horizontal root registration');close(root[1],y,p.id+' vertical root registration');
   const [ox,oy,ow,oh]=p.opaque,a=sourcePoint(ox,oy),b=sourcePoint(ox+ow,oy+oh);close(Math.min(a[0],b[0]),x+spec.opaque.left);close(Math.max(a[0],b[0]),x+spec.opaque.right);close(a[1],y+spec.opaque.top);close(b[1],y+spec.opaque.bottom);
   close(args[7],sw*spec.scale);close(args[8],sh*spec.scale);
  }
  assert.equal(c.globalAlpha,.8);assert.equal(stack.length,0);assert.deepEqual(c.matrix,[1,1,0,0]);
 }
});

test('new tree alpha uses exactly the transformed painted canopy and protects companions',()=>{
 for(const style of ['village','riverbank','mangrove','highland','ice','spore','sand']){
  const site={x:10,y:10,seed:selectedSeed(style)},opts={atlas:true,environmentCanopies:image},g=scenicTreeGeometry(site.seed,style,opts),b=g.opaque;
  assert.ok(g.canopy);const actor={x:site.x+(b.left+b.right)/96,y:site.y+(b.top+b.bottom)/96+.5};
  assert.equal(scenicTreeAlpha(site,[{x:30,y:30},actor],style,opts),.28,style+' visible upper-body protection');
  assert.equal(scenicTreeAlpha(site,[{x:site.x,y:site.y+.2}],style,opts),1,style+' foreground actor');
  assert.equal(scenicTreeAlpha(site,[{x:site.x+20,y:site.y-2}],style,opts),1,style+' distant actor');
 }
});

test('an off-center reflected crown fades on its newly occupied side rather than its original side',()=>{
 const seeds=Array.from({length:1000},(_,i)=>i*4),flippedSeed=seeds.find(seed=>environmentCanopyGeometry(seed,'riverbank',image)?.flip===true),originalSeed=seeds.find(seed=>environmentCanopyGeometry(seed,'riverbank',image)?.flip===false),site={x:10,y:10,seed:flippedSeed},opts={atlas:true,environmentCanopies:image},spec=scenicTreeGeometry(site.seed,'riverbank',opts),b=spec.opaque;
 const canopyBottom=b.bottom-(b.bottom-b.top)*.22,actor={x:site.x+b.left/48+.23,y:site.y+(b.top+canopyBottom)/96+.5};
 assert.equal(spec.flip,true);assert.equal(scenicTreeAlpha(site,[actor],'riverbank',opts),.28,'traveller behind the reflected broad branch is protected');
 assert.equal(scenicTreeAlpha({...site,seed:originalSeed},[actor],'riverbank',opts),1,'the same traveller is outside the original narrow side');
 assert.equal(scenicTreeAlpha(site,[{x:site.x,y:site.y+.2}],'riverbank',opts),1,'a traveller already in front remains unfaded');
});

test('new draw path needs no DOM or texture preparation and restores context on decode failure',()=>{
 const seed=selectedSeed('highland'),{c,calls}=surface();drawScenicTree(c,4,6,seed,'highland',.4,null,image);assert.equal(calls.length,ENVIRONMENT_CANOPIES.find(p=>p.id==='storm-juniper').parts.length);assert.equal(c.globalAlpha,.8);
 const failed=surface(true),spec=environmentCanopySpec('desert-acacia');assert.equal(drawEnvironmentCanopy(failed.c,image,spec,1,2),false);assert.equal(failed.c.globalAlpha,.8);assert.equal(failed.stack.length,0);
 const flippedFailure=surface(true);assert.equal(drawEnvironmentCanopy(flippedFailure.c,image,environmentCanopySpec('desert-acacia',{flip:true}),1,2),false);assert.equal(flippedFailure.c.globalAlpha,.8);assert.equal(flippedFailure.stack.length,0);assert.deepEqual(flippedFailure.c.matrix,[1,1,0,0]);
 assert.equal(drawEnvironmentCanopy(c,{...image,complete:false},spec,1,2),false);assert.equal(drawEnvironmentCanopy(c,image,spec,NaN,2),false);
});
