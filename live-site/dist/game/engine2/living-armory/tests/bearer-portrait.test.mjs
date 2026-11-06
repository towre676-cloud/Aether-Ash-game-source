import test from 'node:test';
import assert from 'node:assert/strict';
import {createBearerPortrait} from '../src/bearer-portrait.mjs';

test('the native bearer portrait owns one active renderer, tracks actual hero IDs and releases it between destinations',()=>{
 const created=[],calls=[],nodes=[];
 const doc={createElement(){const attrs=new Map();return {getContext(){},setAttribute(k,v){attrs.set(k,v);},getAttribute(k){return attrs.get(k);}};}};
 const stage={ownerDocument:doc,replaceChildren(...children){nodes.splice(0,nodes.length,...children);},querySelector(selector){return selector==='canvas'?nodes[0]:null;}};
 const portrait=createBearerPortrait({getStage:()=>stage,createShowcase(canvas,options){
  created.push(canvas);calls.push(['create',options.hero,options.reduced]);
  return {select(id){calls.push(['select',id]);},destroy(){calls.push(['destroy']);}};
 }});
 assert.equal(portrait.update({active:false,hero:0,name:'Sable'}),false);
 assert.deepEqual(calls,[]);
 portrait.update({active:true,hero:0,name:'Sable'});
 portrait.update({active:true,hero:0,name:'Sable'});
 portrait.update({active:true,hero:6,name:'Veyr'});
 assert.deepEqual(calls,[['create',0,true],['select',6]]);
 assert.match(nodes[0].getAttribute('aria-label'),/^Veyr, original character art/);
 portrait.update({active:false});
 assert.deepEqual(calls.at(-1),['destroy']);assert.equal(nodes.length,0);
 portrait.update({active:true,hero:6,name:'Veyr'});
 assert.notEqual(created[0],created[1],'reopening creates a canvas even if native fallback replaced the previous one');
 assert.deepEqual(calls.at(-1),['create',6,true]);
 portrait.destroy();portrait.destroy();
 assert.equal(calls.filter(c=>c[0]==='create').length,2);
 assert.equal(calls.filter(c=>c[0]==='destroy').length,2);
 assert.equal(nodes.length,0);
});

test('missing DOM and invalid hero identities cannot silently display another bearer',()=>{
 const missing=createBearerPortrait({getStage:()=>null,createShowcase(){assert.fail('no renderer without a stage');}});
 assert.equal(missing.update({active:true,hero:2,name:'Rook'}),false);
 const stage={ownerDocument:{createElement(){assert.fail('invalid identity must not create a canvas');}},replaceChildren(){},textContent:''};
 const invalid=createBearerPortrait({getStage:()=>stage,createShowcase(){assert.fail('invalid identity must not fall back to Sable');}});
 assert.equal(invalid.update({active:true,hero:42,name:'Unknown traveller'}),false);
 assert.equal(stage.textContent,'Unknown traveller’s portrait is unavailable.');
});
