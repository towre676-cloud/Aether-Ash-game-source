import test from 'node:test';
import assert from 'node:assert/strict';
import {CisternRenderer,Geometry} from '../cistern-renderer.js';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {groundActorSprite,actorGroundingTint,resolveActorTint,appendActorContactShadow,createActorTintCache} from '../actor-grounding.js';

const observatory={scene:{originId:'veyr-storm'},state:{x:5,y:8,inventory:{tonic:2}}};
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function sprite(){return{image:{width:2,height:2},source:{x:0,y:0,w:2,h:2},x:2,z:3,y:.045,width:1,height:2,anchorX:.5,anchorY:1,alpha:.6};}

test('observatory feet and soft contact shadows share the actual floor without changing actor registration or game state',()=>{
 const original=sprite(),saved=JSON.stringify(observatory),lit=groundActorSprite(original,{world:observatory,groundY:.05,lighting:{ambient:[.4,.3,.2],key:[.5,.4,.3]}});
 assert.notEqual(lit,original);assert.equal(original.y,.045);assert.ok(lit.y>.05);assert.deepEqual(lit.source,original.source);assert.equal(lit.x,original.x);assert.equal(lit.z,original.z);assert.equal(lit.height,original.height);assert.equal(lit.anchorY,original.anchorY);assert.ok(lit.tint.every(v=>v>=.88&&v<=1));assert.ok(lit.tint[0]>=lit.tint[2],'warm ambient reaches the character display');
 assert.equal(groundActorSprite(original,{world:{scene:{originId:'sable-reed'}}}),original,'other scenes retain their original sprite pipeline');
 const mesh=new Geometry();assert.equal(appendActorContactShadow(mesh,{world:observatory,x:2,z:3,groundY:.05}),true);assert.equal(mesh.v.length/36,60);
 for(let i=0;i<mesh.v.length;i+=12){assert.ok(mesh.v[i+1]>.05&&mesh.v[i+1]<.06,'contact never hides below the floor');assert.ok(mesh.v[i+11]>.05&&mesh.v[i+11]<.3);}
 const far=new Geometry();assert.equal(appendActorContactShadow(far,{world:{scene:{}},x:2,z:3}),false);assert.equal(far.v.length,0);assert.equal(JSON.stringify(observatory),saved);
 const cold=actorGroundingTint({lighting:{ambient:[.2,.3,.5],key:[.3,.4,.6]}});assert.ok(cold[2]>=cold[0]);
});

function pixelCanvasFactory(original,calls){
 return(width,height)=>{let pixels=new Uint8ClampedArray(original);const canvas={width,height};canvas.getContext=()=>({clearRect(){},drawImage(){calls.draw++;},getImageData(){calls.read++;return{data:new Uint8ClampedArray(pixels),width,height};},putImageData(value){pixels=new Uint8ClampedArray(value.data);canvas.pixels=pixels;}});return canvas;};
}

function gpuTintFor(s){
 const result=[],noop=()=>{},g={BLEND:1,SRC_ALPHA:2,ONE_MINUS_SRC_ALPHA:3,TEXTURE2:4,TEXTURE_2D:5,ARRAY_BUFFER:6,DYNAMIC_DRAW:7,FLOAT:8,TRIANGLES:9};
 for(const name of ['useProgram','uniformMatrix4fv','uniform1i','disableVertexAttribArray','enable','blendFunc','depthMask','activeTexture','bindTexture','bindBuffer','bufferData','enableVertexAttribArray','vertexAttribPointer','uniform1f','drawArrays','disable'])g[name]=noop;
 g.uniform3f=(location,...tint)=>result.push(tint);
 const renderer={gl:g,sprites:[s],unframedVP:identity(),vp:identity(),spriteLocations:{position:1,uv:2,vp:3,texture:4,tint:5,alpha:6},locations:{},spriteTextures:new WeakMap([[s.image,{}]]),stats:{drawCalls:0,triangles:0}};
 CisternRenderer.prototype.drawSprites.call(renderer);return result[0];
}

test('CPU tinted crops preserve every alpha byte and use the same factor as the GPU sprite draw',()=>{
 const rgba=new Uint8ClampedArray([200,100,50,0,100,150,200,64,80,120,160,128,40,60,80,255]),before=new Uint8ClampedArray(rgba),calls={draw:0,read:0},cache=createActorTintCache({createCanvas:pixelCanvasFactory(rgba,calls),maxEntries:2,maxBytes:32,maxEdge:2});
 const s={...sprite(),tint:[.91,.95,.99]},tinted=cache.resolve(s),factor=gpuTintFor(s);assert.notEqual(tinted.image,s.image);assert.deepEqual(factor,resolveActorTint(s.tint));
 for(let i=0;i<rgba.length;i+=4){assert.equal(tinted.image.pixels[i+3],rgba[i+3]);for(let k=0;k<3;k++)assert.equal(tinted.image.pixels[i+k],Math.round(rgba[i+k]*factor[k]));}
 assert.deepEqual(rgba,before,'original art pixels never change');const moved=cache.resolve({...s,x:19,alpha:.2});assert.equal(moved.image,tinted.image);assert.equal(moved.x,19);assert.equal(moved.alpha,.2);assert.equal(calls.read,1,'stable frames do not read pixels repeatedly');
 cache.resolve({...s,tint:[.88,.92,.96]});cache.resolve({...s,tint:[1,.98,.96]});assert.ok(cache.stats().entries<=2);assert.ok(cache.stats().bytes<=32);cache.clear();assert.equal(cache.stats().bytes,0);assert.equal(cache.stats().entries,0);
 assert.deepEqual(gpuTintFor(sprite()),[.94,.96,.95],'unscoped GPU sprites keep their original exposure');
});

test('unsupported or tainted crop rendering falls back once and actual software draws consume the selected cached art',()=>{
 let attempts=0;const cache=createActorTintCache({createCanvas:()=>{attempts++;return{getContext:()=>({drawImage(){throw Error('tainted');},getImageData(){},putImageData(){}})};}}),s={...sprite(),tint:[.9,.9,.9]};
 assert.equal(cache.resolve(s),s);assert.equal(cache.resolve(s),s);assert.equal(attempts,1,'failed tint does not throw/read back on every animation tick');
 const noop=()=>{},draws=[],ctx={setTransform:noop,createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),fillRect:noop,save:noop,restore:noop,translate:noop,scale:noop,drawImage:(...args)=>draws.push(args)},painter=new CisternSoftwarePainter({width:100,height:100,getContext:()=>ctx});
 const chosen={image:{tinted:true},source:{x:0,y:0,w:8,h:8}};let resolved=0;painter.actorTintCache={resolve:()=>{resolved++;return chosen;},clear:noop};
 painter.render({meshes:{},vp:identity(),time:1,lights:[],sprites:[{...s,x:0,z:0,y:0,width:.5,height:.5}],state:{player:{x:0,z:0}}});
 assert.equal(resolved,1);assert.ok(draws.some(args=>args[0]===chosen.image),'the actual CPU sprite pass draws its tinted frame');painter.destroy();
});

function cameraRenderer(frame){
 const r=Object.create(CisternRenderer.prototype);Object.assign(r,{canvas:{width:390,height:844,getBoundingClientRect:()=>({left:0,top:0,width:390,height:844})},zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],resize(){},buildDynamic(){},software:{render(){return{};}},getCameraFrame:()=>frame});return r;
}
test('camera hook preserves the default frame and custom framing keeps screen-to-floor picking exact',()=>{
 const state={time:1,player:{x:4,z:8}},base=cameraRenderer(null),invalid=cameraRenderer({eye:[NaN,0,0],at:[0,0,0]});base.render(state,[],.016);invalid.render(state,[],.016);assert.deepEqual(Array.from(invalid.vp),Array.from(base.vp));
 const frame={eye:[9,12,18],at:[4,0,6],fov:.72},custom=cameraRenderer(frame);custom.render(state,[],.016);assert.deepEqual(custom.eye,frame.eye);assert.ok([...custom.vp].every(Number.isFinite));assert.notDeepEqual(Array.from(custom.vp),Array.from(base.vp));
 const m=custom.vp,x=4,z=6,w=m[3]*x+m[11]*z+m[15],cx=(.5+(m[0]*x+m[8]*z+m[12])/w*.5)*390,cy=(.5-(m[1]*x+m[9]*z+m[13])/w*.5)*844,picked=custom.screenToGround(cx,cy);
 assert.ok(Math.abs(picked.x-x)<.0001);assert.ok(Math.abs(picked.z-z)<.0001);
});
