import test from 'node:test';
import assert from 'node:assert/strict';
import {pauseActionGroup,mountPauseNavigation} from '../pause-navigation.js';
class Element{
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.parentElement=null;this.attributes={};this.dataset={};this.hidden=false;this.disabled=false;this.nodeType=1;this._text='';this.classes=new Set();this.classList={contains:n=>this.classes.has(n),add:n=>this.classes.add(n),remove:n=>this.classes.delete(n)};}
 get id(){return this.attributes.id||'';}set id(v){this.attributes.id=v;}
 get className(){return [...this.classes].join(' ');}set className(v){this.classes=new Set(v.split(/\s+/).filter(Boolean));}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}set textContent(v){this._text=v;for(const n of this.children)n.parentElement=null;this.children=[];}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='open')this.open=true;}
 getAttribute(k){return this.attributes[k]??null;}
 append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children.splice(n.parentElement.children.indexOf(n),1);n.parentElement=this;this.children.push(n);}}
 after(n){const p=this.parentElement;if(n.parentElement)n.parentElement.children.splice(n.parentElement.children.indexOf(n),1);n.parentElement=p;p.children.splice(p.children.indexOf(this)+1,0,n);}
 contains(n){return this===n||this.children.some(c=>c.contains(n));}
 matches(s){return s[0]==='#'?this.id===s.slice(1):s[0]==='.'?this.classList.contains(s.slice(1)):this.tagName===s.toUpperCase();}
 querySelector(s){for(const n of this.children){if(n.matches(s))return n;const next=n.querySelector(s);if(next)return next;}return null;}
 closest(s){return this.matches(s)?this:this.parentElement?.closest(s)||null;}
 focus(){this.ownerDocument.activeElement=this;}
 click(){this.onclick?.();}
}
function fixture(){
 const doc={defaultView:{},createElement(tag){return new Element(tag,this);},getElementById(id){return this.root.id===id?this.root:this.root.querySelector('#'+id);}};
 const root=doc.createElement('section');root.id='pause';doc.root=root;
 const body=doc.createElement('div');body.id='pause-body';root.append(body);
 const grid=doc.createElement('div');grid.className='menu-grid';body.append(grid);
 const add=(id,text=id,tag='button',parent=grid)=>{const n=doc.createElement(tag);n.id=id;n.textContent=text;parent.append(n);return n;};
 const actions={};for(const id of ['resume','equip-mako','skill-grid-button','party-button','bag-button','frontier-button','story-button','pause-films','observatory-button','journey-album','save','load','export','fullscreen','preparation-button','origin-button','key-items-button','world-lore-button'])actions[id]=add(id);
 actions['preparation-button'].hidden=true;actions['skill-grid-button'].hidden=true;
 const imported=add('','Import save','label');imported.className='file-button';actions.import=add('import','','input',imported);
 const checkbox=add('touch-setting','','input',body),setting=doc.createElement('label');setting.className='setting';setting.textContent='Touch joystick';body.append(setting);setting.append(checkbox);checkbox.checked=true;
 const comfort=doc.createElement('details');comfort.className='player-comfort';body.append(comfort);
 const classic=add('classic-link','Previous edition','a',body);classic.setAttribute('href','./classic.html');
 const guide=add('field-link','Creatures & supplies','a');guide.setAttribute('href','./field-guide/');
 return {doc,root,body,grid,actions,add,checkbox,setting,classic,guide};
}
test('pause keeps one unified setup and six primary actions while preserving callbacks and IDs',()=>{
 const f=fixture();let visits=0;f.actions['preparation-button'].onclick=()=>visits++;
 const all=Object.values(f.actions),api=mountPauseNavigation({root:f.root});
 assert.deepEqual(f.grid.children.filter(n=>!n.hidden).map(n=>n.id),['resume','preparation-button','party-button','bag-button','story-button','save']);
 f.actions['preparation-button'].click();assert.equal(visits,1);assert.equal(f.actions['equip-mako'].hidden,true);assert.equal(f.actions['skill-grid-button'].hidden,true);
 for(const action of all)assert.ok(f.body.contains(action),action.id+' dropped');
 assert.equal(f.doc.getElementById('preparation-button'),f.actions['preparation-button']);assert.equal(api.status.id,'save-status');assert.equal(api.status.getAttribute('role'),'status');
 assert.equal(mountPauseNavigation({root:f.root}),api,'mounting twice duplicated navigation');
});
test('settings retain their controls and values; import and old edition remain available under save files',()=>{
 const f=fixture(),api=mountPauseNavigation({root:f.root});
 assert.ok(api.groups.get('settings').content.contains(f.checkbox));assert.equal(f.checkbox.checked,true);
 assert.ok(api.groups.get('files').content.contains(f.actions.import));assert.ok(api.groups.get('files').content.contains(f.classic));
 assert.ok(api.groups.get('tools').content.contains(f.guide));assert.ok(api.groups.get('memories').content.contains(f.actions['world-lore-button']));
});
test('future appended actions remain reachable and revealing one opens only its own disclosure',()=>{
 const f=fixture(),api=mountPauseNavigation({root:f.root}),newAction=f.add('new-expedition','New expedition');let started=false;newAction.onclick=()=>started=true;
 api.refresh();assert.ok(api.groups.get('world').content.contains(newAction));assert.equal(api.revealAction('new-expedition',{focus:true}),true);assert.equal(api.groups.get('world').details.open,true);assert.equal(api.groups.get('files').details.open,undefined);assert.equal(f.doc.activeElement,newAction);newAction.click();assert.equal(started,true);
 assert.equal(api.revealAction('equip-mako'),false);assert.equal(api.revealAction('missing'),false);
 api.destroy();
});
test('group classification recognizes dynamically authored buttons without losing unknown features',()=>{
 const f=fixture();for(const [text,group]of [['Practice skirmish','tools'],['Battle approaches · your crew','tools'],['Trade satchel · community economy','tools'],['Creature field guide','tools'],['Another Listening · return-channel ledger','world'],['Future feature','world']])assert.equal(pauseActionGroup(f.add('',text)),group);
});
