import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ARCHITECTURE_ACCENT_FILE,ARCHITECTURE_ACCENTS,architectureWindowId,architectureAccentSpec,drawArchitectureAccent} from '../environment-architecture-v17.js';
import {bakeBuilding,buildingDetailPlan} from '../building-art.js';
import {World} from '../world.js';

const image={width:1774,height:887,complete:true};
const world=new World(JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))));
const plans=world.data.scenes.flatMap(s=>s.exteriorBuildings||[]).filter(p=>p.projection.kind!=='underground');
function surface(fail=false){const calls=[],stack=[],gradient={addColorStop(){}},ctx=new Proxy({globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},drawImage(...args){if(fail)throw new Error('missing decoder');calls.push(args);}},{get(t,k){if(k in t)return t[k];if(['createLinearGradient','createRadialGradient'].includes(k))return()=>gradient;return()=>{};},set(t,k,v){t[k]=v;return true;}});return {ctx,calls,stack};}
function withDocument(context,fn){const old=globalThis.document;globalThis.document={createElement(name){assert.equal(name,'canvas');return{width:0,height:0,getContext(){return context;}};}};try{return fn();}finally{globalThis.document=old;}}

test('architectural accents have valid isolated source bounds in the actual original PNG',()=>{
 const bytes=fs.readFileSync(new URL('../../../../development/art/source-v17/'+ARCHITECTURE_ACCENT_FILE.replace(/\.webp$/i,'.png'),import.meta.url));assert.equal(bytes.toString('ascii',1,4),'PNG');assert.equal(bytes[25],6);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[1774,887]);assert.equal(ARCHITECTURE_ACCENTS.length,8);
 for(const p of ARCHITECTURE_ACCENTS){const[x,y,w,h]=p.crop;assert.ok(p.crop.every(Number.isInteger));assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1774&&y+h<=887,p.id);}
 assert.equal(architectureWindowId('clinic'),'clinic-herb-window');for(const family of ['guild','archive','chapel','cistern'])assert.equal(architectureWindowId(family),'archive-leaded-window');for(const family of ['home','inn','carpenter','instrumentworks'])assert.equal(architectureWindowId(family),'timber-flower-window');
});

test('window-sized and gallery-sized accent draws preserve aspect and a bottom-center anchor',()=>{
 for(const p of ARCHITECTURE_ACCENTS)for(const box of [{width:23,height:36},{width:132,height:166}]){
  const spec=architectureAccentSpec(p.id,box),{ctx,calls,stack}=surface();ctx.globalAlpha=.8;assert.ok(spec.width<=box.width+.00001&&spec.height<=box.height+.00001);assert.ok(Math.abs(spec.width/spec.height-p.crop[2]/p.crop[3])<1e-10);assert.equal(drawArchitectureAccent(ctx,image,spec,81,93,.5),true);assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(1,5),p.crop);assert.equal(calls[0][5],81-spec.width/2);assert.equal(calls[0][6],93-spec.height);assert.equal(ctx.globalAlpha,.8);assert.equal(stack.length,0);
 }
});

test('normal building bakes use all eight accents at existing detail locations without changing geometry',()=>{
 const {ctx,calls,stack}=surface(),before=JSON.stringify(world.data),used=new Set();
 withDocument(ctx,()=>{for(const plan of plans){const initial=JSON.stringify(plan),detail=buildingDetailPlan(plan),baseline=bakeBuilding(plan),start=calls.length,painted=bakeBuilding(plan,{environmentArchitecture:image});assert.deepEqual([painted.width,painted.height,painted.worldX,painted.worldY],[baseline.width,baseline.height,baseline.worldX,baseline.worldY]);assert.equal(JSON.stringify(plan),initial);assert.deepEqual(buildingDetailPlan(plan),detail);
  const draws=calls.slice(start).filter(a=>a[0]===image);for(const args of draws){assert.ok(args.slice(1).every(Number.isFinite));const p=ARCHITECTURE_ACCENTS.find(p=>p.crop.every((v,i)=>v===args[i+1]));assert.ok(p);used.add(p.id);const [dx,dy,dw,dh]=args.slice(5);assert.ok(dx>=painted.worldX-1&&dy>=painted.worldY-1&&dx+dw<=painted.worldX+painted.width+1&&dy+dh<=painted.worldY+painted.height+1,p.id+' inside retained bake canvas');if(p.id.endsWith('window')){assert.ok(detail.frontages.some(f=>f.windows.some(win=>Math.abs(dx+dw/2-win.x)<1e-8&&Math.abs(dy+dh-(win.y+5))<1e-8)),'window matches existing bay');}if(p.id==='wrought-lantern'){assert.ok(Math.abs(Math.abs(dx+dw/2)-25)<1e-8,'same entrance light x');assert.ok(Math.abs(dy+dh-(detail.unit*.5-20))<1e-8,'same entrance light anchor');}}
 }});
 assert.deepEqual([...used].sort(),ARCHITECTURE_ACCENTS.map(p=>p.id).sort());assert.equal(stack.length,0);assert.equal(JSON.stringify(world.data),before);
});

test('missing or malformed images retain legacy baked details; decode errors restore context',()=>{
 const {ctx,calls}=surface();withDocument(ctx,()=>{for(const bad of [undefined,{...image,complete:false},{width:1773,height:887},{width:0,height:0}]){const start=calls.length;bakeBuilding(plans[0],{environmentArchitecture:bad});assert.ok(!calls.slice(start).some(a=>a[0]===bad));}});
 const failed=surface(true),spec=architectureAccentSpec('brick-chimney');failed.ctx.globalAlpha=.6;assert.equal(drawArchitectureAccent(failed.ctx,image,spec,0,0),false);assert.equal(failed.ctx.globalAlpha,.6);assert.equal(failed.stack.length,0);assert.equal(architectureAccentSpec('ivy-corner',{width:NaN}),null);assert.equal(drawArchitectureAccent(ctx,image,spec,NaN,0),false);
});
