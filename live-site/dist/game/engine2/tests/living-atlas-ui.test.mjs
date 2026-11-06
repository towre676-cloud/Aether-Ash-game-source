import test from 'node:test';
import assert from 'node:assert/strict';
import {mountLivingAtlasReadout} from '../living-atlas-art.js';

function fixture(initial={}){
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.dataset={};this.hidden=false;this.handlers={};this.textContent='';}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  addEventListener(type,handler){(this.handlers[type]??=[]).push(handler);}
  fire(type,key){const event={key,stopped:false,prevented:false,stopPropagation(){this.stopped=true;},preventDefault(){this.prevented=true;}};for(const handler of this.handlers[type]||[])handler(event);return event;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
 }
 const old=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
 const field=new Element('div'),pause=new Element('div'),world={state:{mode:'field'},livingAtlas:{status(){calls++;return status;}}};
 let status=Object.freeze({indoor:false,habitat:'orchard',cover:0,resonance:0,alert:0,abundance:1,...initial}),calls=0;
 const ui=mountLivingAtlasReadout({getWorld:()=>world,parent:field,inspectionParent:pause});
 return {ui,world,field,pause,get status(){return status;},set status(value){status=Object.freeze(value);},get calls(){return calls;},close(){ui.destroy();if(old===undefined)delete globalThis.document;else globalThis.document=old;}};
}

test('a zero settled outdoor state stays quiet while Pause retains actual values and labelled habitat',()=>{
 const f=fixture();try{
  f.ui.update();assert.equal(f.ui.node.hidden,true);assert.equal(f.ui.node.style.display,'none');assert.equal(f.ui.node.textContent,'');
  f.ui.update({hidden:true,inspect:true});assert.equal(f.ui.node.hidden,true);assert.equal(f.ui.inspection.hidden,false);assert.equal(f.ui.inspection.open,false);
  const detail=f.ui.inspection.children[1].textContent;assert.match(detail,/Foliage concealment: 0%/);assert.match(detail,/Local resonance: 0%/);assert.match(detail,/Wildlife: settled/);assert.match(detail,/Vegetation habitat: orchard/);
  assert.deepEqual(f.ui.inspection.dataset,{cover:'0',resonance:'0',alert:'0',abundance:'1'});
 }finally{f.close();}
});

test('meaningful concealment, resonance and disturbed wildlife use short field cues without a habitat heading',()=>{
 const f=fixture({cover:.23,resonance:.125,alert:.61,abundance:.72});try{
  const before=JSON.stringify(f.status);f.ui.update();assert.equal(f.ui.node.hidden,false);
  assert.equal(f.ui.node.textContent,'Foliage offers cover · Local resonance is active · Wildlife is alert');assert.doesNotMatch(f.ui.node.textContent,/ORCHARD|%|population/i);
  f.ui.update({hidden:true,inspect:true});assert.equal(f.ui.node.hidden,true);assert.equal(f.ui.inspection.dataset.resonance,'0.125');assert.equal(JSON.stringify(f.status),before);
  f.status={...f.status,cover:0,resonance:0,alert:0};f.ui.update();assert.equal(f.ui.node.textContent,'Wildlife is recovering');
 }finally{f.close();}
});

test('presentation thresholds ignore negligible samples and interiors never claim foliage cover',()=>{
 const f=fixture({cover:.079,resonance:.03,alert:.55,abundance:.8});try{
  f.ui.update();assert.equal(f.ui.node.hidden,true);
  f.status={...f.status,indoor:true,cover:.9};f.ui.update();assert.equal(f.ui.node.hidden,true);
  f.status={...f.status,resonance:.3};f.ui.update();assert.equal(f.ui.node.textContent,'Local resonance is active');assert.equal(f.ui.node.hidden,false);
  f.world.state.mode='battle';f.ui.update();assert.equal(f.ui.node.hidden,true);assert.equal(f.ui.inspection.hidden,true);
 }finally{f.close();}
});

test('the Pause disclosure keeps native keyboard activation without passing confirmation to game shortcuts',()=>{
 const f=fixture();try{
  const summary=f.ui.inspection.children[0];assert.equal(summary.tagName,'SUMMARY');assert.equal(summary.textContent,'Local landscape');
  for(const type of ['keydown','keyup'])for(const key of ['Enter',' ']){const event=summary.fire(type,key);assert.equal(event.stopped,true);assert.equal(event.prevented,false);}
  assert.equal(summary.fire('keydown','ArrowDown').stopped,false);assert.equal(summary.fire('click').stopped,true);
 }finally{f.close();}
});

test('hidden views avoid status reads, a visible Pause inspection samples once, and invalid state clears both surfaces',()=>{
 const f=fixture({cover:.3});try{
  assert.equal(f.calls,0);f.ui.update({hidden:true});assert.equal(f.calls,0);f.ui.update({hidden:true,inspect:true});assert.equal(f.calls,1);
  f.status={...f.status,resonance:NaN};f.ui.update({inspect:true});assert.equal(f.ui.node.hidden,true);assert.equal(f.ui.inspection.hidden,true);
  delete f.world.livingAtlas;assert.doesNotThrow(()=>f.ui.update({inspect:true}));
  f.ui.destroy();assert.equal(f.field.children.length,0);assert.equal(f.pause.children.length,0);
 }finally{f.close();}
});
