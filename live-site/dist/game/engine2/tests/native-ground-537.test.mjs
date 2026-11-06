import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {MATERIALS} from '../aa-env537/ground-materials.mjs';
import {nativeGroundFinishPlan,nativeGroundFinishTile,seamlessGroundAlbedo,paintNativeGroundFinish,nativeGroundFinishCacheStats} from '../native-ground-537.js';

const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
const materials=new Set(MATERIALS.map(m=>m.id));
function canvasDocument(){
 const written=[],doc={createElement(){const context={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),putImageData:(data)=>written.push(data)};return {width:0,height:0,getContext:()=>context};}};
 return {doc,written};
}

test('native finishes use real scene identity and preserve all167 scene/save inputs',()=>{
 const w=new World(source);w.newGame({quiet:true});const before=w.save();let count=0,choices=new Set();
 for(const [id,s]of w.scenes){w.state.scene=id;const snapshot=JSON.stringify(s),plan=nativeGroundFinishPlan(w);assert.ok(materials.has(plan.floor));assert.ok(materials.has(plan.substrate));assert.ok(plan.floorAlpha>=.4&&plan.floorAlpha<=.75);assert.equal(JSON.stringify(s),snapshot);choices.add(plan.floor);count++;}
 assert.ok(count>=167);assert.ok(choices.size>=8,'real rooms and biomes retain distinct finishes');w.state.scene=JSON.parse(before).scene;assert.equal(w.save(),before);
 assert.equal(nativeGroundFinishPlan({scene:{originId:'veyr-storm',floor:['.']}}).floor,'water-limestone');
 assert.equal(nativeGroundFinishPlan({scene:{interior:'security',floor:['.']}}).floor,'aether-enamel');
 assert.equal(nativeGroundFinishPlan({scene:{interior:'home',floor:['.']}}).floor,'clay-floorboards');
 assert.ok(materials.has(nativeGroundFinishPlan().floor),'missing world uses a valid native fallback');
 assert.ok(materials.has(nativeGroundFinishPlan({scene:{biome:'unknown',floor:['.']}}).floor),'unknown scene uses a valid quiet finish');
});

test('native repeat tiles join at exact opposite edges without mutating upstream albedo',()=>{
 const width=32,height=24,input=Uint8ClampedArray.from({length:width*height*4},(_,i)=>i%4===3?255:(i*17+i%7)%256),copy=new Uint8ClampedArray(input);
 const out=seamlessGroundAlbedo(input,width,height);
 for(let y=0;y<height;y++)assert.deepEqual([...out.slice(y*width*4,y*width*4+4)],[...out.slice((y*width+width-1)*4,(y*width+width)*4)]);
 for(let x=0;x<width;x++)assert.deepEqual([...out.slice(x*4,x*4+4)],[...out.slice(((height-1)*width+x)*4,((height-1)*width+x+1)*4)]);
 assert.deepEqual(input,copy);assert.notEqual(out,input);assert.throws(()=>seamlessGroundAlbedo(input,2,height));
});

test('the shared finish synthesizes bounded opaque course texture once and reuses it across scenes',()=>{
 const {doc,written}=canvasDocument(),a=nativeGroundFinishTile('water-limestone',{documentRef:doc,resolution:96});
 assert.equal(a.width,96);assert.equal(a.height,96);assert.equal(written.length,1);const image=written[0].data;
 assert.ok(image.every((v,i)=>i%4!==3||v===255));
 let min=255,max=0;for(let i=0;i<image.length;i+=4){min=Math.min(min,image[i]);max=Math.max(max,image[i]);}assert.ok(max-min>35,'mortar and broad stone courses stay readable');
 assert.equal(nativeGroundFinishTile('water-limestone',{documentRef:doc,resolution:96}),a);assert.equal(written.length,1);
 const wet=nativeGroundFinishTile('water-limestone',{documentRef:doc,resolution:96,weather:{rain:1}});assert.notEqual(wet,a);assert.notDeepEqual(written[1].data,image,'explicit native rain changes the finish');
 for(const m of MATERIALS.slice(0,16))nativeGroundFinishTile(m.id,{documentRef:doc,resolution:32});assert.equal(nativeGroundFinishCacheStats().tiles,12);
 assert.equal(nativeGroundFinishTile('water-limestone',{documentRef:null}),null);
});

test('atlas finishing targets only floor/substrate quadrants and restores native canvas state',()=>{
 const {doc}=canvasDocument(),calls=[],stack=[],ctx={globalAlpha:1,imageSmoothingEnabled:false,imageSmoothingQuality:'low',save(){stack.push([this.globalAlpha,this.imageSmoothingEnabled,this.imageSmoothingQuality]);},restore(){[this.globalAlpha,this.imageSmoothingEnabled,this.imageSmoothingQuality]=stack.pop();},drawImage(...args){calls.push({args,alpha:this.globalAlpha});}};
 const world={scene:{originId:'veyr-storm',floor:['...','...']},state:{scene:50013}},before=JSON.stringify(world);
 const plan=paintNativeGroundFinish(ctx,world,{documentRef:doc});assert.equal(plan.floor,'water-limestone');assert.equal(calls.length,2);assert.deepEqual(calls[0].args.slice(-4),[0,0,512,512]);assert.deepEqual(calls[1].args.slice(-4),[512,512,512,512]);assert.equal(ctx.globalAlpha,1);assert.equal(ctx.imageSmoothingEnabled,false);assert.equal(ctx.imageSmoothingQuality,'low');assert.equal(stack.length,0);assert.equal(JSON.stringify(world),before);
 assert.equal(paintNativeGroundFinish(ctx,world,{documentRef:null}),false);assert.equal(calls.length,2,'canvas failure keeps original art');
 const previous=ctx.drawImage;ctx.drawImage=()=>{throw new Error('unavailable draw surface');};
 assert.equal(paintNativeGroundFinish(ctx,world,{documentRef:doc}),false);assert.equal(ctx.globalAlpha,1);assert.equal(ctx.imageSmoothingEnabled,false);assert.equal(stack.length,0);ctx.drawImage=previous;
});
