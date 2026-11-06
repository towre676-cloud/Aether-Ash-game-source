import test from 'node:test';
import assert from 'node:assert/strict';
import {affordanceArtSpec,affordanceArtOpacity,drawAffordanceArt} from '../affordance-art.js';
import {drawWorldAffordance} from '../living-world-ui.js';

const outdoor={key:'origin_sable_reed',originId:'sable-reed',originIndoor:false,title:'Reedbank',width:30,height:30};
const mechanism=(art,extra={})=>({type:'affordance',affordanceKind:'mechanism',art,xy:[5,6],label:'Useful surroundings',...extra});
function renderer(scene=outdoor){
 const calls=[],labels=[],stack=[];const c=new Proxy({globalAlpha:1},{get(t,k){if(k in t)return t[k];return(...args)=>{if(k==='save')stack.push(t.globalAlpha);if(k==='restore')t.globalAlpha=stack.pop();for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),String(k));calls.push([k,...args]);};},set(t,k,v){t[k]=v;calls.push(['set',k,v]);return true;}});
 return {ctx:c,currentScene:scene,assets:{sceneProps:{width:1776,height:888}},time:1,followers:[],label(...v){labels.push(v);},calls,labels};
}
test('outdoor mechanisms select faithful source art at usable-object scale',()=>{
 for(const [art,id] of [['sluice',2],['relay',7],['resonancegate',0]]){const spec=affordanceArtSpec(outdoor,mechanism(art));assert.equal(spec.id,id);assert.ok(spec.height<=100);assert.ok(spec.width<=110);}
 assert.equal(affordanceArtSpec(outdoor,mechanism('brace')),null);
 assert.equal(affordanceArtSpec({key:'home',interior:true},mechanism('sluice')),null);
 assert.equal(affordanceArtSpec({key:'workshop',household:{}},mechanism('relay')),null);
});
test('floor listening stays compact, dry burrows never borrow waterwheels, and tools retain their semantics',()=>{
 const listen=mechanism('hydrophone',{affordanceKind:'scout'});assert.equal(affordanceArtSpec(outdoor,listen),null);assert.equal(affordanceArtSpec({key:'foundry_relay',biome:{id:'caldera'}},listen),null);
 assert.equal(affordanceArtSpec(outdoor,mechanism('burrow',{profileId:'burrow-trail'})),null);assert.equal(affordanceArtSpec(outdoor,mechanism('sluice',{profileId:'burrow-trail'})),null);
 for(const object of [listen,mechanism('burrow',{profileId:'burrow-trail'})]){const r=renderer();drawWorldAffordance(r,object,48,{near:true});assert.equal(r.calls.filter(v=>v[0]==='drawImage').length,0);assert.equal(r.labels.length,1);}
 for(const toolType of ['jar','plank','hook','bell','coil'])assert.equal(affordanceArtSpec(outdoor,mechanism(toolType,{affordanceKind:'salvage',toolType})),null);
 const reed=affordanceArtSpec(outdoor,mechanism('reed',{affordanceKind:'salvage',toolType:'reed'}));assert.equal(reed.id,5);assert.ok(reed.height<=30);
});
test('only actors behind the painted body fade it and collected salvage stays identifiable',()=>{
 const spec=affordanceArtSpec(outdoor,mechanism('relay')),position={x:5.5,y:6.5};
 assert.equal(affordanceArtOpacity(spec,position,[{x:5.5,y:6.1}]),.43);
 assert.equal(affordanceArtOpacity(spec,position,[{x:5.5,y:7.1}]),1);
 assert.equal(affordanceArtOpacity(spec,position,[{x:8,y:6}]),1);
 const reed=affordanceArtSpec(outdoor,mechanism('reed',{affordanceKind:'salvage',toolType:'reed'}));assert.ok(affordanceArtOpacity(reed,position,[],true)>0);assert.ok(affordanceArtOpacity(reed,position,[],true)<.5);
});
test('painted and fallback surroundings retain their actual near label and collected state',()=>{
 for(const object of [mechanism('sluice'),mechanism('relay',{solved:true}),mechanism('jar',{affordanceKind:'salvage',toolType:'jar',solved:true})]){
  const r=renderer();drawWorldAffordance(r,object,48,{near:true});assert.equal(r.labels.length,1);assert.match(r.labels[0][0],/Useful surroundings/);if(object.solved)assert.match(r.labels[0][0],/restored|collected/);
  assert.equal(r.calls.filter(v=>v[0]==='drawImage').length,object.art==='jar'?0:1);
 }
});
test('missing or truncated atlases use the existing fallback in both graphics modes',()=>{
 for(const compatibility of [false,true]){const r=renderer();r.compatibility=compatibility;r.assets.sceneProps={width:10,height:10};assert.equal(drawAffordanceArt(r,mechanism('sluice')),false);drawWorldAffordance(r,mechanism('sluice'),48,{near:true});assert.equal(r.calls.filter(v=>v[0]==='drawImage').length,0);assert.equal(r.labels.length,1);}
 const r=renderer();r.compatibility=true;assert.equal(drawAffordanceArt(r,mechanism('relay',{progress:2})),true);assert.equal(r.calls.filter(v=>v[0]==='drawImage').length,1);
});

test('compact constrained-room artwork retains the same semantic crop and uniform scale',()=>{for(const art of ['sluice','relay','resonancegate']){const original=affordanceArtSpec(outdoor,mechanism(art)),small=affordanceArtSpec(outdoor,mechanism(art,{compactArt:true}));assert.equal(small.id,original.id);assert.deepEqual(small.crop,original.crop);assert.ok(Math.abs(small.height/original.height-.72)<1e-9);assert.ok(Math.abs(small.width/original.width-.72)<1e-9);}const r=renderer();drawWorldAffordance(r,mechanism('jar',{affordanceKind:'salvage',toolType:'jar'}));assert.ok(r.calls.some(c=>c[0]==='scale'&&c[1]===.62));assert.ok(!r.calls.some(c=>c[0]==='ellipse'&&c[3]===21&&c[4]===7));});

test('a burrow-profile scout draws the same compact Hydrophone as another profile, never a second soil repair',()=>{
 for(const compactArt of [false,true])for(const solved of [false,true]){
  const scout=mechanism('hydrophone',{affordanceKind:'scout',profileId:'burrow-trail',compactArt,solved}),r=renderer(),reference=renderer();
  drawWorldAffordance(r,scout,48,{near:true});drawWorldAffordance(reference,{...scout,profileId:'flood-sluice'},48,{near:true});
  assert.deepEqual(r.calls,reference.calls);assert.ok(r.calls.some(c=>c[0]==='roundRect'&&c[1]===-6&&c[2]===-22&&c[3]===6&&c[4]===20));
  assert.ok(!r.calls.some(c=>c[0]==='roundRect'&&c[1]===-7&&c[2]===-8&&c[3]===13&&c[4]===15));
 }
 const r=renderer();drawWorldAffordance(r,mechanism('burrow',{affordanceKind:'site',profileId:'burrow-trail'}));assert.ok(r.calls.some(c=>c[0]==='roundRect'&&c[1]===-7&&c[2]===-8&&c[3]===13&&c[4]===15));
});

test('loose repair stock uses muted clay, metal, wood and reed colours within its original scale',()=>{
 const forbidden=new Set(['#80cdd3','#4c8e9a','#e2c477','#c5cdd0','#b9c4ce']);
 for(const toolType of ['jar','plank','hook','bell','coil','reed']){const r=renderer();r.assets={};drawWorldAffordance(r,mechanism(toolType,{affordanceKind:'salvage',toolType}));assert.ok(r.calls.some(c=>c[0]==='scale'&&c[1]===.62));assert.ok(!r.calls.some(c=>c[0]==='set'&&forbidden.has(c[2])));if(toolType==='jar')assert.ok(r.calls.some(c=>c[0]==='set'&&c[1]==='fillStyle'&&c[2]==='#917354'));}
});

test('real electrical and archive profiles never borrow a wind vane or water fountain',()=>{
 for(const [profileId,art]of [['ground-loop','relay'],['index-gate','resonancegate'],['echo-gallery','resonancegate'],['witness-arch','resonancegate']]){const o=mechanism(art,{affordanceKind:'site',profileId}),r=renderer();assert.equal(affordanceArtSpec(outdoor,o),null);drawWorldAffordance(r,o);assert.equal(r.calls.filter(c=>c[0]==='drawImage').length,0);assert.ok(r.calls.some(c=>c[0]==='stroke'));}
 assert.equal(affordanceArtSpec(outdoor,mechanism('relay',{affordanceKind:'site',profileId:'vane-relay'})).id,7);
});
