import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {CANOPY_VARIATIONS,CANOPY_VARIATION_POOLS,selectCanopyVariation,canopyVariationGeometry,canopyVariationSpec,drawCanopyVariation} from '../environment-canopies-v19.js';
import {scenicTreeGeometry,scenicTreeAlpha,drawScenicTree,scenicTreeSites} from '../scenic-trees.js';
import {selectEnvironmentCanopy} from '../environment-canopies-v17.js';
import {flow} from './opening-flow.mjs';
const image={width:1774,height:887,complete:true};
const seeds=Array.from({length:2048},(_,i)=>i*4);
function context(fail=false){const calls=[],stack=[],c={globalAlpha:.8,transform:[1,1,0,0],save(){stack.push([this.globalAlpha,this.transform.slice()]);},restore(){[this.globalAlpha,this.transform]=stack.pop();},translate(x,y){this.transform[2]+=x;this.transform[3]+=y;},scale(x,y){this.transform[0]*=x;this.transform[1]*=y;},drawImage(...args){if(fail)throw Error('decode');calls.push({args,alpha:this.globalAlpha,transform:this.transform.slice()});}};return {c,calls,stack};}

test('delivery matches its verified original and exact-alpha/crop receipt',()=>{
 const receipt=JSON.parse(fs.readFileSync(new URL('../../../../development/art/canopies-v19.json',import.meta.url)));
 const png=fs.readFileSync(new URL('../../../../'+receipt.archivePath,import.meta.url));
 const webp=fs.readFileSync(new URL('../../../../'+receipt.runtimePath,import.meta.url));
 assert.equal(createHash('sha256').update(png).digest('hex'),receipt.source.sha256);
 assert.equal(createHash('sha256').update(webp).digest('hex'),receipt.delivery.sha256);
 assert.equal(png[25],6);assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[1774,887]);
 assert.equal(receipt.delivery.alphaMaxError,0);assert.equal(receipt.cropVerification.unassignedOpaquePixels,0);assert.equal(receipt.cropVerification.multiplyAssignedOpaquePixels,0);
 assert.equal(receipt.cropVerification.opaquePixels,535719);
 for(const p of CANOPY_VARIATIONS){const [x,y,w,h]=p.crop;assert.ok(x>=0&&y>=0&&x+w<=image.width&&y+h<=image.height);for(const [sx,sy,sw,sh]of p.parts)assert.ok(sx>=x&&sy>=y&&sx+sw<=x+w&&sy+sh<=y+h,p.id);const spec=canopyVariationSpec(p.id);assert.ok(spec.draw.w<=240.00001&&spec.draw.h<=240.00001);}
});

test('admitted tree seeds sample a minority of sites with strictly regional age and exposure forms',()=>{
 const used=new Set();
 for(const [style,pool]of Object.entries(CANOPY_VARIATION_POOLS)){
  const selected=seeds.map(seed=>{const p=selectCanopyVariation(seed,style);assert.deepEqual(p,selectCanopyVariation(seed,style));if(p){assert.ok(pool.includes(p.id));used.add(p.id);}return p;}).filter(Boolean);
  assert.ok(selected.length>seeds.length*.25&&selected.length<seeds.length*.39,style+' bounded density');
  assert.deepEqual([...new Set(selected.map(p=>p.id))].sort(),[...pool].sort());
 }
 assert.equal(used.size,8);
 for(const seed of seeds)if(selectCanopyVariation(seed,'storm'))assert.ok(selectEnvironmentCanopy(seed,'storm'),'storm silhouettes stay within the already-visible tree cohort');
 for(const style of ['interior','foundry','spore','sand','cactus','coral','marble','salt','unknown'])for(const seed of seeds.slice(0,64))assert.equal(selectCanopyVariation(seed,style),null);
 assert.equal(selectCanopyVariation(NaN,'woodland'),null);
});

test('optional variation loss preserves the previous canopy or legacy geometry exactly',()=>{
 for(const style of ['village','mangrove','ice','storm','sand'])for(const atlas of [true,false])for(const seed of seeds.slice(0,80)){
  const options={atlas,environmentCanopies:image},baseline=scenicTreeGeometry(seed,style,options);
  for(const missing of [undefined,null,{width:0,height:0},{...image,complete:false},{width:1773,height:887}])assert.deepEqual(scenicTreeGeometry(seed,style,{...options,environmentCanopyVariations:missing}),baseline);
 }
});

test('new geometry uses existing sites and does not mutate the expanded world or tree plan',()=>{
 const {w}=flow(),before=JSON.stringify(w.data),scene=w.scenes.get(5),sites=scenicTreeSites(scene),used=[];
 for(const site of sites){const g=canopyVariationGeometry(site.seed,'village',image);if(g){used.push(g.id);assert.deepEqual(scenicTreeGeometry(site.seed,'village',{environmentCanopyVariations:image}),g);}}
 assert.ok(used.length>0);assert.deepEqual(scenicTreeSites(scene),sites);assert.equal(JSON.stringify(w.data),before);
});

test('drawing and companion fades use the same measured root frame in both handednesses',()=>{
 for(const style of ['village','riverbank','mangrove','ice','storm']){
  const seed=seeds.find(seed=>canopyVariationGeometry(seed,style,image)),site={x:10,y:10,seed},opts={environmentCanopyVariations:image},g=scenicTreeGeometry(seed,style,opts),b=g.opaque;
  const actor={x:site.x+(b.left+b.right)/96,y:site.y+(b.top+b.bottom)/96+.4};
  assert.equal(scenicTreeAlpha(site,[{x:30,y:30},actor],style,opts),.28,style+' companion');
  assert.equal(scenicTreeAlpha(site,[{x:10,y:10.3}],style,opts),1,style+' already in foreground');
  const {c,calls,stack}=context();drawScenicTree(c,site.x,site.y,seed,style,.5,null,null,image);
  assert.equal(calls.length,g.parts.length);assert.equal(c.globalAlpha,.8);assert.equal(stack.length,0);
  for(let i=0;i<calls.length;i++){const call=calls[i],[sx,sy,sw,sh]=g.parts[i],[mx,my,tx,ty]=call.transform;assert.deepEqual(call.args.slice(1,5),g.parts[i]);assert.equal(call.alpha,.4);const rootX=(call.args[5]+(g.canopy.anchor[0]-sx)*g.scale)*mx+tx,rootY=(call.args[6]+(g.canopy.anchor[1]-sy)*g.scale)*my+ty;assert.ok(Math.abs(rootX-site.x*48)<1e-8);assert.ok(Math.abs(rootY-site.y*48)<1e-8);}
 }
});

test('both wind-shaped trees retain direction and failed drawing restores caller state',()=>{
 for(const p of CANOPY_VARIATIONS){const spec=canopyVariationSpec(p.id,{flip:true});assert.equal(spec.flip,!p.wind);const {c,stack}=context(true);assert.equal(drawCanopyVariation(c,image,spec,4,8,.4),false);assert.equal(c.globalAlpha,.8);assert.deepEqual(c.transform,[1,1,0,0]);assert.equal(stack.length,0);}
 for(const seed of seeds){const g=canopyVariationGeometry(seed,'storm',image);if(g)assert.equal(g.flip,false);}
 assert.equal(drawCanopyVariation(context().c,{...image,complete:false},canopyVariationSpec('elder-orchard'),0,0),false);
});
