import test from 'node:test';
import assert from 'node:assert/strict';
import {mountReachableMenus} from '../reachable-menus.js';
class Node{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.dataset={};this.hidden=false;this.disabled=false;this.textContent='';this.classes=new Set();this.classList={add:s=>this.classes.add(s),remove:s=>this.classes.delete(s)};}
 append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
 prepend(n){n.parentElement=this;this.children.unshift(n);}
 remove(){const p=this.parentElement;if(p)p.children.splice(p.children.indexOf(this),1);this.parentElement=null;}
 setAttribute(k,v){this.attributes[k]=String(v);}
 get id(){return this.attributes.id;}set id(v){this.attributes.id=v;}
 querySelector(s){for(const n of this.children){if(s.startsWith('#')?n.id===s.slice(1):s.startsWith('.')?n.className===s.slice(1):n.tagName===s)return n;const found=n.querySelector(s);if(found)return found;}return null;}
 getContext(){return null;}
}
function fixture(){
 const doc={defaultView:{},createElement(tag){return new Node(tag,this);},getElementById(id){return root.id===id?root:root.querySelector('#'+id);}};
 const root=doc.createElement('section'),card=doc.createElement('div'),body=doc.createElement('div'),resume=doc.createElement('button');root.id='pause';card.className='menu-card';body.id='pause-body';resume.id='resume';root.append(card);card.append(body);body.append(resume);
 return {root,card,body,resume};
}
test('reachable menu uses the host callbacks and follows native view and disabled state',()=>{
 const f=fixture();let menuCalls=0,resumeCalls=0;
 const api=mountReachableMenus({root:f.root,getCompanion:()=>({hero:null,name:'Veyr'}),onMenu(){menuCalls++;f.body.hidden=false;},onResume(){resumeCalls++;f.root.hidden=true;}});
 const bar=f.root.querySelector('.menu-return-bar'),[menu,resume]=bar.children;
 assert.equal(menu.hidden,true);assert.equal(resume.disabled,false);assert.equal(f.root.dataset.menuView,'main');
 f.body.hidden=true;api.refresh();assert.equal(menu.hidden,false);assert.equal(f.root.dataset.menuView,'page');
 menu.onclick();assert.equal(menuCalls,1);assert.equal(f.body.hidden,false);assert.equal(menu.hidden,true);
 f.resume.disabled=true;api.refresh();resume.onclick();assert.equal(resumeCalls,0,'disabled native Resume must not be bypassed');
 f.resume.disabled=false;api.refresh();resume.onclick();assert.equal(resumeCalls,1);assert.equal(f.root.hidden,true);
 api.destroy();assert.equal(f.root.querySelector('.menu-return-bar'),null);assert.equal(f.card.querySelector('.menu-companion'),null);
});
test('repeated mounting keeps a single persistent bar and destroyed mounts can reopen',()=>{
 const f=fixture(),options={root:f.root,getCompanion:()=>({hero:null})};
 const first=mountReachableMenus(options);assert.equal(mountReachableMenus(options),first);
 assert.equal(f.root.children.filter(n=>n.className==='menu-return-bar').length,1);
 first.destroy();first.destroy();const next=mountReachableMenus(options);assert.notEqual(next,first);next.destroy();
 assert.equal(mountReachableMenus({root:null}),null);
});
