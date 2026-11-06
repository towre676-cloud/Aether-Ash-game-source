import test from 'node:test';
import assert from 'node:assert/strict';
import {mountObjectiveUI} from '../objective-ui.js';
import {Battle,makeEnemy} from '../battle.js';
import {defaultHero} from '../mako.js';

class Element{
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.parentElement=null;this.dataset={};this.attributes={};this.hidden=false;this.disabled=false;this.open=false;this.scrollTop=0;this._text='';this.className='';this.style={setProperty(){}};this.classList={toggle:()=>{}};}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 set textContent(value){this._text=String(value);this.replaceChildren();}
 append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children.splice(n.parentElement.children.indexOf(n),1);n.parentElement=this;this.children.push(n);}}
 replaceChildren(...nodes){for(const n of this.children)n.parentElement=null;this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
 contains(n){return this===n||this.children.some(c=>c.contains(n));}
 matches(selector){if(selector==='[data-objective-key]')return this.dataset.objectiveKey!==undefined;if(selector.startsWith('.'))return this.className.split(/\s+/).includes(selector.slice(1));return this.tagName===selector.toUpperCase();}
 querySelectorAll(selector){return this.children.flatMap(n=>[...(n.matches(selector)?[n]:[]),...n.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 focus(){this.ownerDocument.activeElement=this;}
 click(){if(!this.disabled)this.onclick?.();}
}
function fixture(){
 const doc={activeElement:null,createElement(tag){return new Element(tag,this);}},grid=doc.createElement('div'),menu=doc.createElement('section'),hud=doc.createElement('div'),bar=doc.createElement('span');
 doc.querySelector=s=>({'#commands .command-grid':grid,'#spell-menu':menu,'#hud':hud,'.battle-picker-bar>span':bar})[s]||null;
 const h=defaultHero(1),e=makeEnemy('predator',1);Object.assign(h,{x:2.5,y:3.5,atb:1});Object.assign(e,{x:5.5,y:3.5});
 const context={reinforcementLimit:0,objective:{id:'ui-relay',kind:'signal',label:'The relay',asset:{id:'relay',name:'Relay',x:3.5,y:3.5,hp:300,maxHp:300},floor:Array.from({length:10},()=>'.'.repeat(18)),route:[],safeNodes:[{id:'east',label:'East',x:4.5,y:3.5},{id:'north',label:'North',x:3.5,y:1.5}],required:3,deadline:90,stableTime:3,provenance:['A repaired brace protects the relay.']}};
 const b=new Battle({heroes:[h],enemies:[e],chapter:1,context}),requests=[];h.atb=1;
 const old=globalThis.document;globalThis.document=doc;
 const api=mountObjectiveUI({getBattle:()=>b,getActor:()=>h,getTarget:()=>e,onCommand(request){requests.push(request);return b.command(h.id,request.system,e.id,request);}});
 const restore=()=>{globalThis.document=old;};return {doc,menu,api,b,h,e,requests,restore};
}

test('Goal leads with actions and preserves urgent warnings outside optional notes',()=>{
 const f=fixture();try{
  f.b.objective.asset.hp=40;f.api.update();f.api.button.click();
  const warning=f.menu.querySelector('.battle-picker-warning'),notes=f.menu.querySelector('.objective-context'),action=f.menu.querySelector('.objective-action');
  assert.ok(warning&&!notes.contains(warning));assert.equal(notes.open,false);assert.ok(notes.textContent.includes('A repaired brace protects the relay.'));
  assert.ok(f.menu.children.indexOf(action)<f.menu.children.indexOf(notes));assert.ok(notes.textContent.includes('each successful choice uses one ready action'));
  action.click();assert.equal(f.requests[0].action,'disable');assert.equal(f.h.atb,0);assert.equal(f.menu.hidden,true);
 }finally{f.restore();}
});

test('replay selectors retain both choices across refresh and dispatch one real finite action',()=>{
 const f=fixture();try{
  f.e.intent={kind:'objective-sabotage',shape:'line',target:f.b.objective.asset.id,x:3.5,y:3.5,fromX:5.5,fromY:3.5,left:2,total:2,power:15,label:'Relay charge'};
  assert.equal(f.b.command(f.h.id,'instrument',f.e.id,{action:'record'}),true);const first=f.b.instruments.patterns[0];f.b.instruments.patterns.push({...first,id:'alternate-pattern',name:'Second retained rhythm'});f.h.atb=1;
  f.api.update();f.api.button.click();
  let [pattern,node]=f.menu.querySelectorAll('select');pattern.value='alternate-pattern';pattern.onchange();
  [pattern,node]=f.menu.querySelectorAll('select');node.value='north';node.onchange();
  [pattern,node]=f.menu.querySelectorAll('select');assert.equal(pattern.value,'alternate-pattern');assert.equal(node.value,'north');
  const notes=f.menu.querySelector('.objective-context');notes.open=true;notes.ontoggle();f.b.objective.elapsed+=1;f.api.update();assert.equal(f.menu.querySelector('.objective-context').open,true);
  const replay=f.menu.querySelectorAll('.objective-action').find(n=>n.textContent.startsWith('↶Replay retained pattern'));
  assert.ok(replay);assert.equal(f.menu.querySelector('.objective-replay').dataset.actionFor,replay.dataset.objectiveKey);replay.click();
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].patternId,'alternate-pattern');assert.equal(f.requests[0].nodeId,'north');assert.equal(f.b.instruments.decoy.patternId,'alternate-pattern');assert.equal(f.b.instruments.decoy.y,1.5);assert.equal(f.b.instruments.replayUses,1);assert.equal(f.h.atb,0);
 }finally{f.restore();}
});

test('a changing objective preserves notes focus and cancel never spends readiness',()=>{
 const f=fixture();try{
  f.api.update();f.api.button.click();const notes=f.menu.querySelector('.objective-context');notes.open=true;notes.ontoggle();notes.querySelector('summary').focus();f.b.objective.elapsed+=1;f.api.update();
  assert.equal(f.doc.activeElement.dataset.objectiveKey,'notes');assert.equal(f.menu.querySelector('.objective-context').open,true);
  f.menu.querySelector('.objective-picker-cancel').click();assert.equal(f.h.atb,1);assert.equal(f.requests.length,0);assert.equal(f.menu.hidden,true);
 }finally{f.restore();}
});
