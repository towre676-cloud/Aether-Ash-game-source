import test from 'node:test';
import assert from 'node:assert/strict';
import {mountBattleLayout} from '../battle-layout.js';

/** A minimal DOM with real MutationObserver scheduling semantics. Equal attribute
 * writes still notify, so a self-observing render loop fails instead of hanging. */
function fixture({withParty=false}={}){
 const tasks=[],observers=[];let active=null;
 const notify=(target,record)=>{for(const o of observers)if(o.target&&(o.target===target||o.options.subtree&&o.target.contains(target))&&((record.type==='childList'&&o.options.childList)||(record.type==='attributes'&&o.options.attributes&&o.options.attributeFilter.includes(record.attributeName)))){o.records.push({...record,target});if(!o.queued){o.queued=true;tasks.push(()=>{o.queued=false;const records=o.records.splice(0);if(o.target)o.callback(records);});}}};
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this._text='';this._hidden=false;this.disabled=false;this.attrs={};this.classes=new Set();const props={};this.style={setProperty:(k,v)=>props[k]=v,getPropertyValue:k=>props[k]||''};this.dataset=new Proxy({}, {set:(o,k,v)=>{o[k]=String(v);notify(this,{type:'attributes',attributeName:'data-'+k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())});return true;}});this.classList={contains:k=>this.classes.has(k),add:k=>this.classes.add(k),toggle:(k,v)=>{const on=v===undefined?!this.classes.has(k):v;if(on)this.classes.add(k);else this.classes.delete(k);}};}
  get nextElementSibling(){if(!this.parentElement)return null;return this.parentElement.children[this.parentElement.children.indexOf(this)+1]||null;}
  get className(){return [...this.classes].join(' ');}set className(v){this.classes=new Set(v.split(/\s+/).filter(Boolean));}
  get hidden(){return this._hidden;}set hidden(v){this._hidden=v;notify(this,{type:'attributes',attributeName:'hidden'});}
  get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}set textContent(v){this._text=String(v);this.replaceChildren();}
  append(...nodes){for(const n of nodes){if(n.parentElement){const p=n.parentElement;p.children.splice(p.children.indexOf(n),1);notify(p,{type:'childList'});}n.parentElement=this;this.children.push(n);}notify(this,{type:'childList'});}
  prepend(n){this.append(n);this.children.splice(this.children.indexOf(n),1);this.children.unshift(n);notify(this,{type:'childList'});}
  insertBefore(n,before){this.append(n);this.children.splice(this.children.indexOf(n),1);this.children.splice(this.children.indexOf(before),0,n);notify(this,{type:'childList'});}
  after(n){const p=this.parentElement;p.append(n);p.children.splice(p.children.indexOf(n),1);p.children.splice(p.children.indexOf(this)+1,0,n);notify(p,{type:'childList'});}
  replaceChildren(...nodes){for(const n of this.children)n.parentElement=null;this.children=[];notify(this,{type:'childList'});this.append(...nodes);}
  setAttribute(k,v){this.attrs[k]=String(v);notify(this,{type:'attributes',attributeName:k});}getAttribute(k){return this.attrs[k]??null;}
  contains(n){return n===this||this.children.some(c=>c.contains(n));}
  matches(s){if(s.includes(' ')){const parts=s.split(' '),last=parts.pop();return this.matches(last)&&this.parentElement?.closest(parts.join(' '));}const attr=s.match(/\[data-([\w-]+)(?:="([^"]*)")?\]/);if(attr){const k=attr[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());if(this.dataset[k]===undefined||attr[2]!==undefined&&this.dataset[k]!==attr[2])return false;s=s.replace(attr[0],'');}if(!s)return true;return s[0]==='#'?this.id===s.slice(1):s[0]==='.'?this.classes.has(s.slice(1)):this.tagName===s.toUpperCase();}
  closest(s){return this.matches(s)?this:this.parentElement?.closest(s);}
  querySelectorAll(s){return this.children.flatMap(n=>[...(n.matches(s)?[n]:[]),...n.querySelectorAll(s)]);}querySelector(s){return this.querySelectorAll(s)[0]||null;}
  focus(){active=this;}click(){if(!this.disabled)this.onclick?.();}addEventListener(){}scrollIntoView(){this.revealed=true;}getBoundingClientRect(){return {height:this.id==='hud'?85:190,width:this.id==='commands'?(root.clientWidth>=1100?350:330):root.clientWidth};}
 }
 const doc={createElement:tag=>new Element(tag)},root=doc.createElement('main');root.id='game';root.clientWidth=1280;root.clientHeight=720;
 doc.querySelector=s=>root.matches(s)?root:root.querySelector(s);
 const add=(parent,tag,id,cls,text)=>{const n=doc.createElement(tag);n.id=id||'';n.className=cls||'';n.textContent=text||'';parent.append(n);return n;};
 const hud=add(root,'header','hud'),party=withParty?add(hud,'section','party'):null,afterParty=withParty?add(hud,'button','objective'):null,commands=add(root,'section','commands'),grid=add(commands,'div','','command-grid'),flow=add(commands,'section','battle-flow'),menu=add(root,'section','spell-menu');
 for(const id of ['attack','mako','personal','guard','item','retreat','field','objective'])add(grid,'button','cmd-'+id,'',id);
 add(flow,'div','','battle-topline');add(flow,'div','','enemy-list','Sentinel');add(flow,'details','','growth-details');add(flow,'p','','combat-advice','Dodge the marked line.');
 menu.hidden=false;menu.dataset.command='mako';
 const rows=Array.from({length:9},(_,i)=>{const b=add(menu,'button','','technique-option','Technique '+i);b.dataset.pageKey='action:'+i;return b;});
 const notes=add(menu,'p','','','Long authored context'),cancel=add(menu,'button','','','Cancel');let spends=0,closes=0,pages=0;for(const row of rows)row.onclick=()=>spends++;cancel.onclick=()=>{closes++;menu.hidden=true;};
 const prior={document:globalThis.document,MutationObserver:globalThis.MutationObserver,ResizeObserver:globalThis.ResizeObserver,queueMicrotask:globalThis.queueMicrotask};
 globalThis.document=doc;globalThis.queueMicrotask=f=>tasks.push(f);
 globalThis.MutationObserver=class{constructor(callback){this.callback=callback;this.records=[];observers.push(this);}observe(target,options){this.target=target;this.options=options;}disconnect(){this.target=null;}};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 const flush=()=>{let turns=0;while(tasks.length){assert.ok(++turns<100,'a render must settle rather than repeatedly observing its own writes');tasks.shift()();}};
 const api=mountBattleLayout({onPageChange:()=>pages++});flush();
 return {api,root,hud,party,afterParty,add,commands,grid,flow,menu,rows,notes,flush,active:()=>active,spends:()=>spends,closes:()=>closes,pages:()=>pages,restore(){api.destroy();Object.assign(globalThis,prior);}};
}

test('picker paging settles its observer and preserves fixed commands, targets and paid callbacks',()=>{
 const f=fixture();try{
  assert.equal(f.commands.classList.contains('battle-picker-open'),true);assert.equal(f.flow.querySelector('.enemy-list').textContent,'Sentinel');assert.equal(f.grid.querySelector('#cmd-mako').dataset.pickerActive,'true');
  assert.equal(f.menu.querySelectorAll('.battle-page-hidden').length,5);assert.ok(f.menu.querySelector('.battle-picker-context').contains(f.notes));assert.equal(f.spends(),0);
  assert.equal(f.api.turnPage(1),true);f.flush();assert.equal(f.pages(),1);assert.equal(f.active(),f.rows[4]);assert.equal(f.rows[0].classList.contains('battle-page-hidden'),true);assert.equal(f.rows[4].classList.contains('battle-page-hidden'),false);
  assert.equal(f.api.reveal(f.rows[8]),true);f.flush();assert.equal(f.rows[8].classList.contains('battle-page-hidden'),false);assert.equal(f.rows[8].revealed,undefined,'page reveal must not scroll the document');assert.equal(f.active(),f.rows[8]);assert.equal(f.api.reveal(undefined),false);
  f.rows[8].click();assert.equal(f.spends(),1,'paging never fires an action');
  // A live cost/selector refresh with stable action identity must retain page 3.
  f.rows[8].textContent='Technique 8 · revised cost';f.flush();assert.equal(f.menu.dataset.battlePage,'2');
  f.commands.querySelector('.battle-picker-bar').querySelector('button').click();f.flush();assert.equal(f.closes(),1);assert.equal(f.spends(),1);assert.equal(f.menu.hidden,true);assert.equal(f.commands.classList.contains('battle-picker-open'),false);
 }finally{f.restore();}
});

test('switching the open command resets the page and keeps the correct visible active category',()=>{
 const f=fixture();try{
  f.api.turnPage(1);f.flush();f.menu.dataset.command='item';f.flush();assert.equal(f.menu.dataset.battlePage,'0');assert.equal(f.grid.querySelector('#cmd-item').dataset.pickerActive,'true');assert.equal(f.grid.querySelector('#cmd-mako').dataset.pickerActive,'false');assert.equal(f.spends(),0);
  const replay=f.rows[8],group=globalThis.document.createElement('div');replay.dataset.objectiveKey='replay:pattern1';group.dataset.actionFor='replay:pattern1';f.menu.append(group);f.flush();assert.equal(group.classList.contains('battle-page-hidden'),true);f.api.reveal(replay);f.flush();assert.equal(group.classList.contains('battle-page-hidden'),false);
  replay.dataset.objectiveKey='replay:pattern2';group.dataset.actionFor='replay:pattern2';f.menu.append(group);f.flush();assert.equal(f.menu.dataset.battlePage,'2');assert.equal(group.classList.contains('battle-page-hidden'),false);
 }finally{f.restore();}
});


test('portrait touch pages expose two cards at a time and all actions stay reachable without scrolling',()=>{
 const f=fixture();try{
  f.root.clientWidth=390;f.root.clientHeight=844;f.root.classList.add('touch-on');f.api.reveal(f.rows[0]);f.flush();
  const visible=()=>f.rows.filter(n=>!n.classList.contains('battle-page-hidden'));assert.deepEqual(visible(),f.rows.slice(0,2));
  const seen=[...visible()];while(f.api.turnPage(1)){f.flush();seen.push(...visible());}assert.deepEqual(seen,f.rows);assert.equal(f.spends(),0);
  f.root.classList.toggle('touch-on',false);f.api.reveal(f.rows[0]);f.flush();assert.deepEqual(visible(),f.rows.slice(0,4));
 }finally{f.restore();}
});

test('landscape mode reports width instead of height reservation, then resets when the viewport narrows',()=>{
 const f=fixture();try{
  f.root.clientWidth=844;f.root.clientHeight=390;f.api.measure();f.flush();assert.equal(f.commands.dataset.layout,'side');assert.equal(f.api.dockHeight,0);assert.equal(f.api.dockWidth,354);
  f.root.clientWidth=740;f.api.measure();f.flush();assert.equal(f.commands.dataset.layout,'bottom');assert.equal(f.api.dockHeight,190);assert.equal(f.api.dockWidth,0);
 }finally{f.restore();}
});


test('native crew nodes move to the thumb belt and restore with their callbacks intact',()=>{
 const f=fixture({withParty:true});try{
  const actor=f.add(f.party,'button','','','Iona');let selections=0;actor.onclick=()=>selections++;
  assert.equal(f.party.parentElement,f.commands);actor.click();assert.equal(selections,1);
  f.commands.hidden=true;f.flush();assert.equal(f.party.parentElement,f.hud);assert.equal(f.party.nextElementSibling,f.afterParty);
  f.commands.hidden=false;f.flush();assert.equal(f.party.parentElement,f.commands);actor.click();assert.equal(selections,2);
  f.api.destroy();assert.equal(f.party.parentElement,f.hud);assert.equal(f.party.nextElementSibling,f.afterParty);
 }finally{f.restore();}
});

test('a late guardian lesson joins the advice disclosure without adding a dock row',()=>{
 const f=fixture();try{
  const advice=f.flow.querySelector('.combat-advice');advice.hidden=true;f.flush();
  const cue=f.add(f.commands,'p','guardian-rule-cue','','Break the relay during recovery.');f.flush();
  const disclosure=f.flow.querySelector('.battle-tactical-readout');assert.equal(cue.parentElement,disclosure);assert.equal(disclosure.hidden,false);
  cue.hidden=true;f.flush();assert.equal(disclosure.hidden,true);assert.equal(f.spends(),0);
 }finally{f.restore();}
});

test('target arrows call native selection and present one selected enemy without a scrolling list',()=>{
 const f=fixture();try{
  const list=f.flow.querySelector('.enemy-list'),a=f.add(list,'button','','','Sentinel'),b=f.add(list,'button','','','Relay hound');let targeted=0;
  a.setAttribute('aria-pressed','true');b.setAttribute('aria-pressed','false');
  const select=n=>{targeted++;a.setAttribute('aria-pressed',String(n===a));b.setAttribute('aria-pressed',String(n===b));};a.onclick=()=>select(a);b.onclick=()=>select(b);f.flush();
  assert.equal(a.classList.contains('battle-target-hidden'),false);assert.equal(b.classList.contains('battle-target-hidden'),true);
  const arrows=f.flow.querySelector('.battle-target-rail').children;arrows.at(-1).click();f.flush();assert.equal(targeted,1);assert.equal(b.classList.contains('battle-target-hidden'),false);assert.equal(a.classList.contains('battle-target-hidden'),true);assert.equal(f.spends(),0);
 }finally{f.restore();}
});

test('short instrument pages keep each native selector group beside its own action',()=>{
 const f=fixture();try{
  f.root.clientWidth=740;f.root.clientHeight=360;f.root.classList.add('touch-on');
  const replay=f.rows[8],group=globalThis.document.createElement('div');replay.dataset.objectiveKey='replay:pattern';group.dataset.actionFor='replay:pattern';f.menu.append(group);f.api.reveal(replay);f.flush();
  const visible=f.rows.filter(n=>!n.classList.contains('battle-page-hidden'));assert.deepEqual(visible,[replay]);assert.equal(group.classList.contains('battle-page-hidden'),false);assert.equal(f.commands.querySelector('.battle-picker-bar').querySelector('button').disabled,false);assert.equal(f.spends(),0);
 }finally{f.restore();}
});


test('battle options expose a bottom native Pause route after Back and safely handle a missing menu',()=>{
 const f=fixture();try{
  const actions=f.flow.querySelector('.battle-detail-actions'),back=actions.children[0],pause=actions.children[1];
  assert.equal(back.textContent,'Back to battle');assert.equal(pause.textContent,'Pause game');
  assert.doesNotThrow(()=>pause.click());let pauses=0;const native=f.add(f.root,'button','menu-button','','Pause');native.onclick=()=>pauses++;
  const options=f.flow.querySelector('.battle-settings');options.open=true;pause.click();assert.equal(pauses,1);assert.equal(options.open,false);assert.equal(f.spends(),0);
 }finally{f.restore();}
});
