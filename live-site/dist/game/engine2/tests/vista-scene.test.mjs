import test from 'node:test';
import assert from 'node:assert/strict';
import {buildVistaPlan,VistaScenePresentation,applyCrewSeparation} from '../vista-scene.js';

const scene=()=>({width:8,height:6,key:'town',theme:0,floor:['########','#......#','#..##..#','#......#','#......#','########']});
const freeze=o=>{if(o&&typeof o==='object'){Object.freeze(o);for(const x of Object.values(o))freeze(x);}return o;};
const context=()=>{const calls=[];const g={addColorStop(...args){calls.push(['stop',...args]);}};return new Proxy({calls,createLinearGradient:()=>g,createRadialGradient:()=>g},{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>{o[k]=v;return true;}});};

test('vista masks partition the actual floor without changing the scene or authored plan',()=>{
 const s=freeze(scene()),craft=freeze({landmarks:[{x:4,y:2,focus:[2.5,3.5],label:'Old bell'}]}),before=JSON.stringify({s,craft}),p=buildVistaPlan(s,craft);
 const all=[...p.open,...p.banks];assert.equal(all.reduce((n,r)=>n+r.w*r.h,0),s.width*s.height*48*48);
 for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){const contains=spans=>spans.some(r=>x*48>=r.x&&x*48<r.x+r.w&&y*48===r.y);assert.equal(contains(p.open),s.floor[y][x]==='.');assert.notEqual(contains(p.open),contains(p.banks));}
 assert.equal(p.anchors.length,1);assert.deepEqual([p.anchors[0].x,p.anchors[0].y],[2.5,3.5]);assert.equal(JSON.stringify({s,craft}),before);
});
test('indoor rooms never receive outdoor masks, anchor lights or tree shadows',()=>{
 const s={...scene(),interior:true},p=buildVistaPlan(s,{landmarks:[{x:2,y:3}]});assert.equal(p.indoor,true);assert.deepEqual(p.open,[]);assert.deepEqual(p.anchors,[]);
 const v=new VistaScenePresentation(),c=context();v.scene(s,{});v.drawGround(c,{view:{x0:0,y0:0,x1:8,y1:6},trees:[{x:2,y:3}]});assert.equal(c.calls.length,0);
});
test('only real traversable authored foci are admitted, deduplicated and bounded',()=>{
 const p=buildVistaPlan(scene(),{landmarks:[{x:NaN,y:2},{x:3.5,y:2.5},{x:1.5,y:1.5},{x:1.6,y:1.6},{x:6.5,y:1.5},{x:1.5,y:4.5},{x:6.5,y:4.5}]});assert.equal(p.anchors.length,3);assert.ok(p.anchors.every(a=>Number.isFinite(a.x+a.y)));
});
test('quality changes only optional tree shade; geometry and light anchors stay intact',()=>{
 const v=new VistaScenePresentation();v.scene(scene(),{landmarks:[{x:2,y:3}]});const before=JSON.stringify(v.plan),view={x0:0,y0:0,x1:8,y1:6},trees=Array.from({length:30},(_,i)=>({x:1+i%5,y:2}));
 v.drawGround(context(),{view,trees});assert.equal(v.lastShadowCount,10);v.drawGround(context(),{view,trees,compatibility:true});assert.equal(v.lastShadowCount,0);assert.equal(JSON.stringify(v.plan),before);
 for(let i=0;i<80;i++)v.record(70,.1);assert.equal(v.governor.tier,'low');assert.equal(JSON.stringify(v.plan),before);
});
test('scene replacement clears old foci and all draw coordinates remain finite',()=>{
 const v=new VistaScenePresentation();v.scene(scene(),{landmarks:[{x:2,y:3}]});const c=context();v.drawGround(c,{view:{x0:0,y0:0,x1:8,y1:6},trees:[{x:2,y:3},{x:NaN,y:1}]});
 for(const call of c.calls)for(const n of call.slice(1))if(typeof n==='number')assert.ok(Number.isFinite(n));v.scene({...scene(),interior:true},{});assert.equal(v.snapshot().authoredFoci,0);assert.equal(v.snapshot().treeShadows,0);
});
test('crew separation is a bounded draw-state effect and respects compatibility quality',()=>{
 const c={};applyCrewSeparation(c);assert.equal(c.shadowBlur,2.5);const a={};applyCrewSeparation(a,{compatibility:true});assert.deepEqual(a,{});applyCrewSeparation(a,{quality:'low'});assert.equal(a.shadowBlur,0);assert.equal(a.shadowOffsetX,1);assert.equal(a.shadowOffsetY,1);
});
