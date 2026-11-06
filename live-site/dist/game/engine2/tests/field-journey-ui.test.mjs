import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mountFieldJourneyUI} from '../field-journey-ui.js';
import {defaultHero} from '../mako.js';
import {ensureLivingArmory,claimLivingArmoryVictory} from '../living-armory/campaign.js';
import {rollItem} from '../living-armory/src/armory.mjs';
import {captureFieldProgress,fieldVictoryReport,refreshFieldRewardReport,equipFieldReward} from '../field-journey-model.js';
import {encounterEnemies} from '../battle.js';
import {earnOpening} from './opening-flow.mjs';

function dom(){
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.handlers={};this.classes=new Set();this.style={setProperty(){}};this.hidden=false;this._text='';this.classList={contains:value=>this.classes.has(value),add:value=>this.classes.add(value)};}
  set className(value){this.classes=new Set(value.split(/\s+/).filter(Boolean));}get className(){return [...this.classes].join(' ');}
  set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(child=>child.textContent).join(' ');}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  replaceChildren(...children){this.children=[];this._text='';this.append(...children);}
  setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
  addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
  fire(type,key){const event={key,stopped:false,stopPropagation(){this.stopped=true;}};for(const fn of this.handlers[type]||[])fn(event);return event;}
  getBoundingClientRect(){return {top:0,bottom:0,width:1280,height:720};}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);}
 }
 const game=new Element('main'),head=new Element('head'),doc={createElement:tag=>new Element(tag),head,activeElement:null,
  querySelector:selector=>selector==='#game'?game:selector==='#hud'?null:head.children.find(child=>Object.hasOwn(child.dataset,'fieldJourneyStyle'))||null};
 const win={addEventListener(){},removeEventListener(){}};
 const find=(predicate,node=game)=>predicate(node)?node:node.children.map(child=>find(predicate,child)).find(Boolean);
 return {doc,win,game,find};
}

test('a compact invitation keeps its first threat visible and all counterplay and guide choices available',()=>{
 const f=dom(),old={document:globalThis.document,window:globalThis.window};globalThis.document=f.doc;globalThis.window=f.win;
 const pack=Object.freeze({type:'patrol',bit:2});let continued=0,engaged=0,setup=0,api;
 try{
  api=mountFieldJourneyUI({onContinue(){continued++;},onEngage(value){assert.equal(value,pack);engaged++;},onSetup(){setup++;}});
  api.showHandoff({title:'Marked striker ahead',text:'Mender announces its strike at 0.55 seconds. Move clear or Guard before release.',pack,rewardHint:'Resolution: 40 credits.'});
  const summary=f.find(node=>node.classList.contains('field-journey-summary')),details=f.find(node=>node.classList.contains('field-journey-details'));
  assert.equal(summary.textContent,'Mender announces its strike at 0.55 seconds.');assert.equal(details.hidden,false);assert.equal(details.open,false);
  assert.equal(details.children[0].fire('keydown','Enter').stopped,true);assert.equal(details.children[0].fire('keyup',' ').stopped,true);assert.equal(details.children[0].fire('keydown','ArrowUp').stopped,false);
  assert.match(details.textContent,/Move clear or Guard before release/);assert.match(details.textContent,/40 credits/);assert.equal(continued+engaged+setup,0);
  const prepare=f.find(node=>node.dataset.action==='setup');assert.equal(prepare.parentElement.parentElement,details);prepare.fire('click');assert.equal(setup,1);assert.equal(api.active,true);
  assert.ok(api.bounds);api.update({blocked:true});assert.equal(api.bounds,null);api.update({blocked:false});assert.ok(api.bounds);
  f.find(node=>node.dataset.action==='continue').fire('click');assert.equal(continued,1);assert.equal(engaged,0);assert.equal(api.active,false);assert.equal(api.bounds,null);
 }finally{api?.destroy();globalThis.document=old.document;globalThis.window=old.window;}
});

test('a victory after a compact invitation restores the full earned receipt',()=>{
 const f=dom(),old={document:globalThis.document,window:globalThis.window};globalThis.document=f.doc;globalThis.window=f.win;let api;
 try{
  api=mountFieldJourneyUI();api.showHandoff({title:'Patrol',text:'Watch its mark. Guard or move.'});
  api.showVictory({title:'Encounter resolved',summary:'The route is clear.',rewards:['+40 credits'],progress:['Earth mastery advanced'],worldChange:'Refuge repaired.'});
  const details=f.find(node=>node.classList.contains('field-journey-details')),hint=f.find(node=>node.classList.contains('field-journey-hint'));
  assert.equal(details.hidden,true);assert.equal(hint.hidden,false);
  const progress=f.find(node=>node.getAttribute('aria-label')==='Progress toward your next choices');assert.equal(progress.hidden,false);assert.match(progress.textContent,/Earth mastery/);
  assert.match(f.game.textContent,/\+40 credits/);assert.match(f.game.textContent,/Refuge repaired/);
 }finally{api?.destroy();globalThis.document=old.document;globalThis.window=old.window;}
});

test('the nonblocking receipt selects a real bearer/slot, equips once, preserves rewards, and returns to exploration',async()=>{
 const f=dom(),old={document:globalThis.document,window:globalThis.window};globalThis.document=f.doc;globalThis.window=f.win;
 const world={state:{scene:15,xp:0,gold:30,chapter:1,mode:'field',party:[0],recruited:[0,1,2,3,4,5,6],heroes:Array.from({length:7},(_,id)=>defaultHero(id,3)),items:{},bosses:[]},scene:{tags:[]}};
 const before=captureFieldProgress(world),item=rollItem({seed:'receipt-ui',eventId:'earned',level:4,forceSlot:'ring',forceRarity:'uncommon'});item.requiredLevel=3;item.name='Prismatic Emberthread Loop';item.stats={precision:8,aether:7};item.runes=[];item.sockets=0;
 ensureLivingArmory(world.state).snapshot.overflow.push(item);world.state.livingArmory.snapshot.resources.scrap=3;
 let report=fieldVictoryReport(world,before,{type:'wild'}),equips=0,armory=0,explored=0,api;
 try{
  api=mountFieldJourneyUI({onEquip(choice){equips++;const result=equipFieldReward(world,choice);if(result.ok){report=refreshFieldRewardReport(world,report);api.showVictory(report);}return result;},onArmory(){armory++;},onExplore(){explored++;}});
  const saved=JSON.stringify(world.state);api.showVictory(report);assert.equal(JSON.stringify(world.state),saved);assert.equal(equips,0);assert.equal(f.doc.activeElement,null);
  assert.match(f.game.textContent,/Precision \+8.*Aether \+7/);assert.match(f.game.textContent,/Gale \/ Volt \/ Gravity.*\+5\.88%/);assert.match(f.game.textContent,/Other direct hits.*\+3\.1%/);assert.doesNotMatch(f.game.textContent,/No change to the five headline stats/);
  const image=f.find(node=>node.tagName==='IMG');assert.ok(image);assert.ok(fs.existsSync(new URL(image.src)),'painted item art must resolve to a delivered file');
  const comparison=f.find(node=>node.getAttribute('aria-label')==='Compare for');assert.equal(comparison.children.length,14);assert.equal(comparison.fire('keydown','ArrowDown').stopped,true);
  comparison.value=report.gear.choices.find(choice=>choice.heroId===6&&choice.slot==='ring2').id;comparison.fire('change');
  const equip=f.find(node=>node.dataset.action==='equip-reward');assert.equal(equip.textContent,'Equip on Veyr');equip.fire('click');await Promise.resolve();
  assert.equal(equips,1);assert.equal(world.state.livingArmory.gearByHero[6].ring2.id,item.id);assert.equal(api.active,true);assert.match(f.game.textContent,/Equipped by Veyr/);assert.match(f.game.textContent,/\+3 Forge scrap/);assert.equal(f.find(node=>node.dataset.action==='equip-reward'),undefined);
  f.find(node=>node.dataset.action==='armory').fire('click');assert.equal(armory,1);assert.equal(api.active,true);
  api.update({blocked:true});assert.equal(f.find(node=>node.classList.contains('field-journey')).hidden,true);api.update({blocked:false});assert.equal(f.find(node=>node.classList.contains('field-journey')).hidden,false);
  f.find(node=>node.dataset.action==='explore').fire('click');assert.equal(explored,1);assert.equal(api.active,false);
 }finally{api?.destroy();globalThis.document=old.document;globalThis.window=old.window;}
});

function productionSceneCallback(world,fieldJourney,currentVictoryReport,refreshVictoryReceipt,worldGestures){
 // Execute the actual boot callback without booting media/rendering. Keeping
 // its receipt branch in production code makes an unconditional hide regress
 // this story-flow test, rather than merely retesting a copied policy.
 const main=fs.readFileSync(new URL('../main.js',import.meta.url),'utf8'),start=main.indexOf('onScene(){',main.indexOf('world=new World(data,')),end=main.indexOf(',onMusic:music,onNotice:notice}',start);
 assert.ok(start>=0&&end>start,'Main must expose the canonical World scene callback');
 return Function('world','fieldJourney','currentVictoryReport','refreshVictoryReceipt','worldGestures',
  'const playtest=null,questGuide={sceneChanged(){}},voices={stop(){}},renderer={scene(){}},audio={},hud=()=>{},queueMicrotask=()=>{};let path=[],arrivalAction=null,doorLock=0;return ({'+main.slice(start,end)+'}).onScene;'
 )(world,fieldJourney,currentVictoryReport,refreshVictoryReceipt,worldGestures);
}

for(const destination of ['Continue the journey','Return to Cinderfall'])test('Sentinel story transition keeps its earned receipt after '+destination+', but never resurrects a dismissed card',()=>{
 const f=dom(),old={document:globalThis.document,window:globalThis.window};globalThis.document=f.doc;globalThis.window=f.win;
 let api;
 try{
  const h=earnOpening(),world=h.w;
  world.loadScene(229);h.finish();h.use(world.objects().find(object=>object.type==='puzzle'&&object.bit===1));h.choose(0);
  if(world.state.scene!==230){world.loadScene(230);h.finish();}
  const guardian=world.objects().find(object=>object.type==='boss');world.interact(guardian);assert.ok(world.currentBattle,'The real relay interaction must release the Sentinel encounter');
  const before=captureFieldProgress(world),origin=world.currentBattle,enemies=encounterEnemies(1,true);for(const enemy of enemies)enemy.hp=0;
  const award=claimLivingArmoryVictory(world,{ended:'win',chapter:1,context:{encounterSerial:1,tags:[]},enemies});assert.ok(award.ok);
  world.winBattle();assert.equal(world.state.mode,'dialog');assert.ok(world.state.bossGear.owned.includes('guardian-1'));
  let report=fieldVictoryReport(world,before,origin),savedRewards=structuredClone(report.rewards),savedGearIds=report.gear.items.map(item=>item.itemId),savedClaims=JSON.stringify(world.state.livingArmory.snapshot.claimedEvents);
  api=mountFieldJourneyUI({onEquip(choice){const result=equipFieldReward(world,choice);if(result.ok){report=refreshFieldRewardReport(world,report);api.showVictory(report);}return result;}});
  api.showVictory(report);api.update({blocked:true});assert.equal(api.active,true);assert.equal(f.find(node=>node.classList.contains('field-journey')).hidden,true);
  let gestureCancels=0;const worldGestures={cancel(){gestureCancels++;}};
  world.callbacks.onScene=productionSceneCallback(world,api,report,()=>{report=refreshFieldRewardReport(world,report);api.showVictory(report);},worldGestures);
  h.choose(0);assert.ok(h.dialog?.choices.some(choice=>choice.label===destination),'Guardian branch and debrief must lead to the real journey choice');
  h.choose(h.dialog.choices.findIndex(choice=>choice.label===destination));api.update({blocked:!!h.dialog||world.state.mode!=='field'});
  assert.equal(gestureCancels,1,'The story portal must cancel any active world gesture');
  assert.equal(api.active,true,'The story portal erased an undisplayed victory receipt');assert.equal(f.find(node=>node.classList.contains('field-journey')).hidden,false);assert.notEqual(world.state.scene,230);
  assert.deepEqual(report.rewards,savedRewards);assert.deepEqual(report.gear.items.map(item=>item.itemId),savedGearIds);assert.equal(JSON.stringify(world.state.livingArmory.snapshot.claimedEvents),savedClaims);
  const chooser=f.find(node=>node.getAttribute('aria-label')==='Inspect an item');assert.ok(chooser);chooser.value='guardian:guardian-1';chooser.fire('change');
  assert.match(f.game.textContent,/Freed Conduit/);f.find(node=>node.dataset.action==='equip-reward').fire('click');assert.ok(world.state.heroes.some(hero=>hero.guardianGear?.weapon?.id==='guardian-1'));
  f.find(node=>node.dataset.action==='explore').fire('click');assert.equal(api.active,false);world.loadScene(5);h.finish();api.update({blocked:false});assert.equal(gestureCancels,2,'Scene changes must cancel gestures even after the receipt is dismissed');assert.equal(api.active,false);assert.equal(f.find(node=>node.classList.contains('field-journey')).hidden,true);
 }finally{api?.destroy();globalThis.document=old.document;globalThis.window=old.window;}
});
