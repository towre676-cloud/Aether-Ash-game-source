import test from 'node:test';
import assert from 'node:assert/strict';
import {livingBattleActions,livingBattleSummary,drawWorldAffordance,drawCreatureDepth,drawLivingGround,livingEventVisual,mountLivingWorldUI,worldActionCaption,worldActionTrayLayout} from '../living-world-ui.js';
import {createCreatureEcology} from '../creature-ecology.js';
import {createAnatomy,anatomyCommand} from '../functional-anatomy.js';
import {prepareLegacyBattle} from '../hero-legacy.js';
import {WORLD_AFFORDANCE_PROFILES,worldAffordanceObjects,applyWorldAffordance} from '../world-affordances.js';

function battle(){
 const h={id:0,name:'Rook',hp:200,maxHp:200,mp:30,maxMp:30,atb:1,power:18,x:2.5,y:3.5,status:{}},e={id:'e0',name:'Mossback',family:'mossback',species:'mossback-region-0',hp:140,maxHp:140,power:8,x:4.5,y:3.5,atb:0,status:{},armor:30,maxArmor:30};
 const context={wild:true,region:'workshop',key:'workshop',encounterSerial:5,walkable:Array.from({length:8},(_,y)=>Array.from({length:10},(_,x)=>[x,y])).flat(),heroLegacies:{version:1,heroes:Array.from({length:7},(_,id)=>({id,deeds:[],unlocked:id===0?['ceramic-arm']:[],equipped:id===0?'ceramic-arm':null,signature:null,attuned:id===0})),settled:[]}};
 const b={context,heroes:[h],enemies:[e],time:0,ended:null,field:{enabled:true,props:[],cover:[]},events:[],event(e){this.events.push(e);},damage(s,t,n){t.hp=Math.max(0,t.hp-n);}};
 b.ecology=createCreatureEcology(context,b.heroes,b.enemies);b.anatomy=createAnatomy(context,b.enemies);prepareLegacyBattle(b);return {b,h,e};
}
function drawing(){const calls=[],ctx=new Proxy({},{get(_o,key){if(key==='measureText')return s=>({width:s.length*6});return (...args)=>{for(const v of args)if(typeof v==='number')assert.ok(Number.isFinite(v),key+' received a nonfinite coordinate');calls.push([key,...args]);};},set(_o,key,value){calls.push(['set',key,value]);return true;}});return {calls,renderer:{ctx,time:2,effects:[],label(...args){calls.push(['label',...args]);}}};}
function world(profile='ground-loop'){
 const p=WORLD_AFFORDANCE_PROFILES.find(v=>v.id===profile),scene={location:7,key:'workshop',encounterHabitat:p.habitat,chapter:1,width:22,height:20,arrive:[2,2],floor:Array.from({length:20},(_,y)=>Array.from({length:22},(_,x)=>!x||!y||x===21||y===19?'#':'.').join('')),objects:[{type:'portal',xy:[2,1]}]};
 return {scene,state:{scene:7,mode:'field',chapter:1,x:2.5,y:2.5,party:[0],items:{tonic:0,ether:0},gold:0,flags:{}},walkable(x,y){return this.scene.floor[Math.floor(y)]?.[Math.floor(x)]==='.';}};
}

test('the shared tactics picker receives real paid choices and their live readiness reasons',()=>{
 const {b,h,e}=battle(),rows=livingBattleActions(b,h,e,{tonic:2,ether:1});
 for(const system of ['ecology','anatomy','position','legacy'])assert.ok(rows.some(r=>r.system===system),system);
 assert.ok(rows.some(r=>r.system==='ecology'&&r.action==='food'&&r.enabled));
 assert.equal(rows.filter(r=>r.system==='anatomy').length,3);
 const push=rows.find(r=>r.system==='position'&&r.action==='push');assert.ok(push.enabled);assert.ok(push.preview.to.x>e.x);
 h.atb=0;const waiting=livingBattleActions(b,h,e,{tonic:2});assert.ok(waiting.every(r=>!r.enabled));assert.ok(waiting.every(r=>r.reason));
});

test('selected creature details report actual needs, relationships and disabled capabilities',()=>{
 const {b,h,e}=battle();b.ecology.creatures[0].trust=2;const before=livingBattleSummary(b,h,e);assert.ok(before.lines.some(s=>s.includes('Appetite:')));assert.ok(before.lines.some(s=>s.includes('Trust 2')));
 const plate=b.anatomy.actors[0].parts[0];plate.integrity=1;assert.ok(anatomyCommand(b,h,e,{action:'target-part',partId:plate.id}));
 const after=livingBattleSummary(b,h,e);assert.ok(after.lines.some(s=>s.includes('Changed anatomy:')));assert.ok(after.lines.some(s=>s.includes(plate.name)));
});

test('all site families and finite sources draw distinct material silhouettes at their physical coordinates',()=>{
 const art=new Map();for(const profile of WORLD_AFFORDANCE_PROFILES){const w=world(profile.id);for(const o of worldAffordanceObjects(w)){const {renderer,calls}=drawing();drawWorldAffordance(renderer,o,48,{near:true});assert.ok(calls.some(c=>c[0]==='translate'&&c[1]===(o.xy[0]+.5)*48&&c[2]===(o.xy[1]+.5)*48));assert.ok(calls.some(c=>c[0]==='label'&&c[1]===o.label));art.set(o.art,JSON.stringify(calls));}}
 assert.ok(art.size>=9);assert.equal(new Set(art.values()).size,art.size);
 const w=world(),o=worldAffordanceObjects(w).find(o=>o.affordanceKind==='salvage');w.state.x=o.xy[0]+.5;w.state.y=o.xy[1]+1.5;assert.ok(applyWorldAffordance(w,o,{action:'take'}).ok);const used=worldAffordanceObjects(w).find(v=>v.affordanceId===o.affordanceId),d=drawing();drawWorldAffordance(d.renderer,used,48,{near:true});assert.ok(d.calls.some(c=>c[0]==='set'&&c[1]==='globalAlpha'&&c[2]===.35));
});

test('motive, anatomy and finite legacy geometry are drawn from their live runtime state',()=>{
 const {b,e}=battle();b.target=e.id;b.ecology.creatures[0].motive='nesting';b.ecology.creatures[0].lure={x:5.5,y:4.5,charges:1};b.legacy.anchors.push({ownerId:0,x:3.5,y:3.5,charges:1,expiresAt:12});b.legacy.shadows.push({ownerId:0,x:2.5,y:3.5,charges:1,expiresAt:10});const d=drawing();drawCreatureDepth(d.renderer,b,e);drawLivingGround(d.renderer,b);assert.ok(d.calls.some(c=>c[0]==='fillText'&&String(c[1]).includes('Nesting')));assert.ok(d.calls.some(c=>c[0]==='translate'&&c[1]===3.5*48));assert.ok(d.calls.some(c=>c[0]==='translate'&&c[1]===2.5*48));const count=d.calls.length;b.legacy.anchors[0].charges=0;b.legacy.shadows[0].charges=0;b.ecology.creatures[0].lure.charges=0;const expired=drawing();drawCreatureDepth(expired.renderer,b,e);drawLivingGround(expired.renderer,b);assert.ok(expired.calls.length<count);
});

test('committed movement preview shows the exact legal path while absent or invalid geometry stays silent',()=>{
 const {b}=battle(),d=drawing();drawLivingGround(d.renderer,b);const before=d.calls.length;d.renderer.livingPreview={enabled:true,from:{x:4.5,y:3.5},to:{x:5.5,y:3.5},path:[{x:4.75,y:3.5},{x:5.5,y:3.5}]};drawLivingGround(d.renderer,b);assert.ok(d.calls.slice(before).some(c=>c[0]==='lineTo'&&c[1]===5.5*48&&c[2]===3.5*48));d.renderer.livingPreview={enabled:true,from:{x:NaN,y:0},to:{x:2,y:2}};assert.doesNotThrow(()=>drawLivingGround(d.renderer,b));
});

test('live outcomes produce in-world feedback without inventing a modal or changing combat state',()=>{
 const {b,h,e}=battle(),d=drawing();const hp=e.hp;assert.equal(livingEventVisual(d.renderer,{type:'anatomy',action:'break-part',actor:h,target:e,label:'Bell sac silenced'}),true);assert.equal(d.renderer.effects[0].value,'Bell sac silenced');assert.equal(d.renderer.effects[0].x,e.x);assert.equal(e.hp,hp);assert.equal(livingEventVisual(d.renderer,{type:'other',actor:h}),false);
});


function fieldDOM(){
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.dataset={};this.attributes={};this.hidden=false;this.disabled=false;this.open=false;this.scrollTop=0;this._text='';this.className='';this.style={};this.classList={contains:s=>this.className.split(' ').includes(s),add:s=>{this.className+=' '+s;},remove:s=>{this.className=this.className.split(' ').filter(c=>c!==s).join(' ');}};}
  set textContent(v){this._text=String(v);this.replaceChildren();}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children.splice(n.parentElement.children.indexOf(n),1);n.parentElement=this;this.children.push(n);}}
  replaceChildren(...nodes){for(const n of this.children)n.parentElement=null;this.children=[];this.append(...nodes);}
  insertBefore(n,b){this.append(n);if(b){this.children.pop();this.children.splice(this.children.indexOf(b),0,n);}}
  get nextSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
  get isConnected(){return this.id==='game'||!!this.parentElement?.isConnected;}
  setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k];}
  addEventListener(){}focus(){doc.activeElement=this;}click(){if(!this.disabled)this.onclick?.();}
  matches(s){if(s==='[data-world-key]')return this.dataset.worldKey!==undefined;if(s==='button:not(:disabled)')return this.tagName==='BUTTON'&&!this.disabled;if(s[0]==='#')return this.id===s.slice(1);if(s[0]==='.')return this.className.split(' ').includes(s.slice(1));return this.tagName===s.toUpperCase();}
  querySelectorAll(s){const selectors=s.split(',');return this.children.flatMap(n=>[...(selectors.some(s=>n.matches(s))?[n]:[]),...n.querySelectorAll(s)]);}querySelector(s){return this.querySelectorAll(s)[0]||null;}
  getBoundingClientRect(){return {left:0,top:0,width:390,height:this.id==='hud'?140:844,right:390,bottom:this.id==='hud'?140:844};}
 }
 const doc={activeElement:null,createElement:tag=>new Element(tag)},root=doc.createElement('main');root.id='game';const hud=doc.createElement('header');hud.id='hud';const menu=doc.createElement('section');menu.id='spell-menu';menu.hidden=true;root.append(hud,menu);doc.querySelector=s=>root.matches(s)?root:root.querySelector(s);return{doc,root,menu};
}
function fieldUI(w){
 const f=fieldDOM(),old=globalThis.document;globalThis.document=f.doc;let current=w,active=true,commands=0,opened=0;const notices=[];
 const ui=mountLivingWorldUI({getWorld:()=>current,getActive:()=>active,onWorldCommand(world,object,row){commands++;return applyWorldAffordance(world,object,row);},onOpen:()=>opened++,onNotice:t=>notices.push(t)});
 return {...f,ui,notices,get commands(){return commands;},get opened(){return opened;},set world(v){current=v;},set active(v){active=v;},restore(){globalThis.document=old;}};
}
function beside(w,o){w.state.x=o.xy[0]+.5;w.state.y=o.xy[1]+1.5;}

test('explicit salvage pickup uses the native finite take once without opening a sheet or auto-gathering nearby',()=>{
 const w=world(),o=worldAffordanceObjects(w).find(o=>o.affordanceKind==='salvage'),f=fieldUI(w);try{
  beside(w,o);const before=JSON.stringify(w.state.worldAffordances);f.ui.update();assert.equal(JSON.stringify(w.state.worldAffordances),before,'proximity never gathers');assert.equal(f.commands,0);assert.ok(f.ui.button.textContent.startsWith('◇Take '));
  f.ui.button.click();assert.equal(f.commands,1);assert.equal(w.state.worldAffordances.kit[o.toolType],1);assert.ok(w.state.worldAffordances.sources.includes(o.affordanceId));assert.equal(f.opened,0);assert.equal(f.ui.active,false);assert.equal(f.ui.panel.hidden,true);assert.equal(f.menu.parentElement,f.root);assert.equal(f.ui.open(o),false,'same source cannot be taken twice');assert.equal(w.state.worldAffordances.kit[o.toolType],1);
 }finally{f.restore();}
});

test('pickup revalidates current state, scene, range, native capacity and gameplay state at explicit press',()=>{
 for(const change of [w=>{w.state={...w.state};},w=>{w.state.scene=8;},w=>{w.state.x=1.5;w.state.y=1.5;},w=>{w.state.mode='battle';},w=>{w.state.worldAffordances.kit=Object.fromEntries(Object.keys(w.state.worldAffordances.kit).map(k=>[k,30]));}]){
  const w=world(),o=worldAffordanceObjects(w).find(o=>o.affordanceKind==='salvage'),f=fieldUI(w);try{beside(w,o);f.ui.update();change(w);f.ui.button.click();assert.equal(f.commands,0);assert.ok(!w.state.worldAffordances.sources.includes(o.affordanceId));}finally{f.restore();}
 }
});

test('repairs retain explicit paid native choices in a shallow tray with collapsed prose and visible costs',()=>{
 const w=world(),o=worldAffordanceObjects(w).find(o=>o.affordanceKind==='site'),f=fieldUI(w);try{
  beside(w,o);w.state.worldAffordances.kit.coil=1;w.state.worldAffordances.kit.hook=1;f.ui.update();assert.equal(f.ui.open(o),true);assert.equal(f.commands,0,'opening work never pays');assert.equal(f.opened,1);assert.equal(f.ui.active,true);assert.equal(f.ui.panel.style.maxHeight,'236px');
  const details=f.menu.querySelector('details'),grid=f.menu.querySelector('.world-action-grid');assert.equal(details.open,false);assert.ok(details.querySelector('.world-action-description'));assert.ok(grid.children.some(row=>row.textContent.includes('Consumes')&&row.textContent.includes('opens shortcut')),'cost and physical result stay outside disclosure');
  const assemble=grid.children.find(row=>row.dataset.worldKey?.startsWith('assemble:'));assert.equal(assemble.disabled,false);assemble.click();assert.equal(f.commands,1);assert.equal(w.state.worldAffordances.kit.coil,0);assert.equal(w.state.worldAffordances.kit.hook,0);assert.equal(w.state.worldAffordances.sites[o.affordanceId].solved,true);
  f.ui.close();assert.equal(f.menu.parentElement,f.root);
 }finally{f.restore();}
});

test('field kit remains available beside taken stock and packing is always an explicit native action',()=>{
 const w=world(),o=worldAffordanceObjects(w).find(o=>o.affordanceKind==='salvage'),f=fieldUI(w);try{
  beside(w,o);f.ui.update();f.ui.button.click();f.ui.update();assert.equal(f.ui.kitButton.hidden,false);f.ui.kitButton.click();assert.equal(f.ui.active,true);assert.equal(f.commands,1);const pack=f.menu.querySelector('.world-action-grid').children.find(row=>row.dataset.worldKey?.startsWith('pack:'));assert.ok(pack);assert.ok(pack.textContent.includes('Moves 1 → next encounter'));pack.click();assert.equal(f.commands,2);assert.equal(w.state.worldAffordances.kit[o.toolType],0);assert.equal(w.state.worldAffordances.plans[String(w.state.scene)].packed,o.toolType);assert.equal(f.ui.active,false);
 }finally{f.restore();}
});

test('work action callbacks reject restored state and retain original native guards after the tray opens',()=>{
 const w=world(),o=worldAffordanceObjects(w).find(o=>o.affordanceKind==='site'),f=fieldUI(w);try{
  beside(w,o);w.state.worldAffordances.kit.coil=1;w.state.worldAffordances.kit.hook=1;f.ui.open(o);const row=f.menu.querySelector('.world-action-grid').children.find(row=>row.dataset.worldKey?.startsWith('assemble:'));w.state=JSON.parse(JSON.stringify(w.state));row.click();assert.equal(f.commands,0);assert.equal(w.state.worldAffordances.kit.coil,1);assert.equal(f.ui.active,false);
 }finally{f.restore();}
});

test('tray geometry stays below the HUD and above portrait and landscape touch controls',()=>{
 for(const view of [{width:390,height:844,hudBottom:150,controlTop:580},{width:320,height:568,hudBottom:132,controlTop:307},{width:844,height:390,hudBottom:90,controlTop:230},{width:500,height:824,hudBottom:140,controlTop:540}]){
  const p=worldActionTrayLayout(view),bottom=view.height-p.bottom,top=bottom-p.maxHeight;assert.ok(top>=view.hudBottom+8);assert.ok(bottom<=view.controlTop-8);assert.ok(p.width<=view.width-20);assert.ok(p.maxHeight<=236);
 }
 assert.match(worldActionCaption({enabled:true,action:'prepare',plan:'lure'}),/Uses 1 bell \+ 1 reeds.*8 seconds/);
});
