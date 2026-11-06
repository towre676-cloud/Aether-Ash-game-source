import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('./preview-offline.html',import.meta.url),'utf8');
test('no-install preview executes without network, WebGL, Three.js or DOM libraries',()=>{
  const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  let draws=0;
  const noop=()=>{};const grad={addColorStop:noop};
  const ctx={setTransform:noop,clearRect:noop,fillRect:()=>{draws++},createLinearGradient:()=>grad,createRadialGradient:()=>grad,
    beginPath:noop,moveTo:noop,lineTo:noop,quadraticCurveTo:noop,closePath:noop,fill:()=>{draws++},ellipse:noop,
    save:noop,restore:noop,translate:noop,scale:noop};
  const elements=Object.fromEntries(['world','title','region','time','wind','density','walk','trample','burn','water','heal','reset','stats'].map(k=>[k,{id:k,value:k==='region'?'meadow':k==='time'?65:k==='wind'?44:100,onclick:noop,onchange:noop,oninput:noop,textContent:'',addEventListener:noop}]));
  elements.world.getContext=()=>ctx;elements.world.setPointerCapture=noop;
  const callbacks=[];
  const sandbox={document:{getElementById:k=>elements[k]},devicePixelRatio:1,innerWidth:900,innerHeight:600,
    addEventListener:noop,requestAnimationFrame:fn=>{callbacks.push(fn);return callbacks.length;},
    Math,Number,Array,Map,Set,console};
  vm.runInNewContext(code,sandbox,{timeout:4000});
  assert.ok(callbacks.length>0);for(let i=0;i<13;i++)callbacks.shift()(100+i*65);
  assert.ok(draws>100,'Expected generated foliage and landscape drawing');
  assert.match(elements.stats.textContent,/clumps/);
  elements.burn.onclick();for(let i=0;i<12;i++)callbacks.shift()(1050+i*65);
  assert.match(elements.stats.textContent,/Disturbed/);
  elements.heal.onclick();elements.region.value='woodland';elements.region.onchange({target:elements.region});
  const next2=callbacks.shift();next2(1900);
  assert.ok(draws>500);
});
