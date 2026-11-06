import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readMusicPreferences,prepareMusicPreferences,MUSIC_PREFERENCES_VERSION_KEY,MUSIC_PREFERENCES_VERSION,musicIsActive,selectListeningPerformance,createScoreCueGate,musicPresentation,mountMusicControls} from '../music-controls.js';
import {pauseActionGroup} from '../pause-navigation.js';

const storage=values=>({getItem:key=>values[key]??null});
test('fresh music is audible and uncolored while every explicit valid preference survives',()=>{
 assert.deepEqual(readMusicPreferences(storage({})),{volume:.52,instrumentEnabled:false});
 assert.deepEqual(readMusicPreferences(storage({'ash-music-volume':'.68','ash-instrument':'on'})),{volume:.68,instrumentEnabled:true});
 assert.deepEqual(readMusicPreferences(storage({'ash-music-volume':'0','ash-instrument':'off'})),{volume:0,instrumentEnabled:false});
 for(const value of ['bad','','Infinity'])assert.equal(readMusicPreferences(storage({'ash-music-volume':value})).volume,.52);
 assert.equal(readMusicPreferences(storage({'ash-music-volume':'2'})).volume,1);
 assert.equal(readMusicPreferences(storage({'ash-music-volume':'-1'})).volume,0);
 assert.deepEqual(readMusicPreferences({getItem(){throw Error('unavailable');}}),{volume:.52,instrumentEnabled:false});
});

test('every full-screen suspension blocks the score while a field conversation or battle can retain music',()=>{
 assert.equal(musicIsActive({}),false);
 assert.equal(musicIsActive({started:true,dialog:true,battle:true}),true);
 for(const key of ['paused','hidden','recovery','cinema','journey','observatory','traveller','film'])assert.equal(musicIsActive({started:true,[key]:true}),false,key);
});

test('listening stations retain their existing recording cycle and only advance their own saved index',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../../music/catalog.json',import.meta.url)));
 const ordinary=catalog.tracks.filter((track,index,all)=>all.findIndex(other=>other.audio===track.audio)===index);
 const references=catalog.tracks.filter(track=>track.role==='instrument-reference');
 const state={gold:37,flags:{8:2},chronicle:{originId:'mira-archive'},performanceIndex:ordinary.length-1,referenceIndex:references.length-1};
 const before=JSON.stringify({gold:state.gold,flags:state.flags,chronicle:state.chronicle});
 assert.deepEqual(selectListeningPerformance('performance:next',{catalog,state}),{slot:'performance:'+ordinary[0].id,title:ordinary[0].title});
 assert.deepEqual(selectListeningPerformance('reference:next',{catalog,state}),{slot:'performance:'+references[0].id,title:references[0].title});
 assert.equal(state.performanceIndex,0);assert.equal(state.referenceIndex,0);
 assert.equal(JSON.stringify({gold:state.gold,flags:state.flags,chronicle:state.chronicle}),before);
 for(const slot of [29,0,'silence','performance:dyletsky_home'])assert.deepEqual(selectListeningPerformance(slot,{catalog,state}),{slot});
 assert.equal(selectListeningPerformance('reference:next',{catalog:{tracks:[]},state}),null);
});

test('music status reports actual titles, quiet intervals, mute and pause truthfully',()=>{
 const base={mode:'spacious',title:'Clay & Water — Home',trackId:'dyletsky_home',programLabel:'Sable · Cinderfall'};
 assert.equal(musicPresentation({...base,phase:'playing'}).hud,'♪ Clay & Water — Home');
 assert.match(musicPresentation({...base,phase:'paused'}).detail,/Paused: Clay & Water — Home/);
 assert.equal(musicPresentation({...base,phase:'paused'}).nextLabel,'Next piece on resume');
 assert.equal(musicPresentation({...base,phase:'resting'}).hud,'♪ Play next piece');
 assert.equal(musicPresentation({...base,phase:'playing'},{volume:0}).hud,'♪ Play music');
 assert.equal(musicPresentation({...base,phase:'quiet',mode:'ambient'}).hud,'♪ Play music');
 assert.equal(musicPresentation({...base,phase:'quiet',mode:'ambient'}).nextDisabled,true);
 assert.match(musicPresentation({...base,phase:'unavailable'}).detail,/try another recording/);
});

function documentStub(){
 const nodes=new Map();
 const doc={getElementById:id=>nodes.get(id)||null,createTextNode:text=>({textContent:text}),createElement:tag=>new Element(tag)};
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attributes={};this.dataset={};this.textContent='';this.className='';this.classList={contains:value=>this.className.split(' ').includes(value)};}
  set id(value){this._id=value;nodes.set(value,this);}get id(){return this._id||'';}
  append(...values){this.children.push(...values);for(const value of values)value.parentElement=this;}
  setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
 }
 doc.head=doc.createElement('head');return doc;
}

test('pause music controls queue skips, expose modes and stay in the existing settings group',()=>{
 const doc=documentStub(),parent=doc.createElement('div'),indicator=doc.createElement('span');let mode=null,next=0,volume=.42;
 const controls=mountMusicControls({parent,indicator,document:doc,getVolume:()=>volume,onMode:value=>mode=value,onNext:()=>next++});
 controls.update({mode:'spacious',phase:'paused',title:'Original title',trackId:'original',programLabel:'Quiet archive'});
 assert.equal(pauseActionGroup(controls.element),'settings');
 assert.equal(controls.next.disabled,false);assert.equal(controls.next.textContent,'Next piece on resume');
 controls.next.onclick();assert.equal(next,1);
 assert.deepEqual(controls.select.children.map(option=>option.value),['continuous','spacious','ambient']);
 controls.select.value='ambient';controls.select.onchange();assert.equal(mode,'ambient');
 controls.update({mode:'ambient',phase:'quiet'});assert.equal(controls.next.disabled,true);assert.equal(indicator.textContent,'♪ Play music');
 controls.update({mode:'continuous',phase:'playing',title:'Original title',trackId:'original'});
 assert.equal(controls.now.textContent,'Now playing: Original title · the world');assert.equal(indicator.dataset.musicTrack,'original');
 volume=0;controls.update({mode:'continuous',phase:'playing',title:'Original title',trackId:'original'});assert.equal(indicator.textContent,'♪ Play music');
 assert.equal(controls.now.getAttribute('aria-live'),'polite');
});

test('repeated pickup or transition cues cannot pile up in the same instant',()=>{
 let clock=0;const allowed=createScoreCueGate({now:()=>clock});
 assert.equal(allowed('discovery'),true);assert.equal(allowed('discovery'),false);assert.equal(allowed('transition'),false);
 clock=.8;assert.equal(allowed('transition'),true);
 clock=2;assert.equal(allowed('discovery'),false);
 clock=3.1;assert.equal(allowed('discovery'),true);
});

test('the music-first update restores legacy silence once and preserves every later explicit sound choice',()=>{
 for(const mode of['ambient','spacious',null]){
  const saved=new Map([['ash-music-volume','0'],['ash-music-pacing',mode],['journey','untouched'],['ash-instrument','off']]),store={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
  assert.equal(prepareMusicPreferences(store).volume,.52);assert.equal(saved.get('ash-music-pacing'),'continuous');assert.equal(saved.get(MUSIC_PREFERENCES_VERSION_KEY),MUSIC_PREFERENCES_VERSION);assert.equal(saved.get('journey'),'untouched');
  saved.set('ash-music-volume','0');saved.set('ash-music-pacing','ambient');prepareMusicPreferences(store);assert.equal(saved.get('ash-music-volume'),'0');assert.equal(saved.get('ash-music-pacing'),'ambient');
 }
 const saved=new Map([['ash-music-volume','.68'],['ash-instrument','on']]),store={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 assert.deepEqual(prepareMusicPreferences(store),{volume:.68,instrumentEnabled:true});
 assert.deepEqual(prepareMusicPreferences({getItem(){throw Error('denied');},setItem(){throw Error('denied');}}),{volume:.52,instrumentEnabled:false});
});

test('the field music control recovers mute, ambience and a suspended transport by pointer or keyboard',()=>{
 const doc=documentStub(),parent=doc.createElement('div'),indicator=doc.createElement('span');let enabled=0,next=0,volume=0;
 const c=mountMusicControls({parent,indicator,document:doc,getVolume:()=>volume,onEnableMusic:()=>enabled++,onNext:()=>next++});
 c.update({mode:'ambient',phase:'quiet'});assert.equal(c.enable.hidden,false);assert.equal(indicator.getAttribute('role'),'button');assert.equal(indicator.getAttribute('aria-label'),'Play music');assert.equal(indicator.dataset.musicRecovery,'true');indicator.onclick();assert.equal(enabled,1);
 volume=.52;c.update({mode:'continuous',phase:'playing',transportPlaying:false,title:'Paused by device'});assert.equal(indicator.textContent,'♪ Tap for music');let prevented=0,stopped=0;indicator.onkeydown({key:'Enter',preventDefault(){prevented++;},stopPropagation(){stopped++;}});assert.equal(enabled,2);assert.equal(prevented,1);assert.equal(stopped,1);
 c.update({mode:'continuous',phase:'playing',transportPlaying:true,title:'Audible piece'});assert.equal(c.enable.hidden,true);indicator.onclick();assert.equal(next,1);assert.equal(indicator.dataset.musicRecovery,'false');
});

test('the span music control overrides the noninteractive HUD for real pointer hit testing',()=>{
 const baseStyle=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(baseStyle,/#hud\{[^}]*pointer-events:none/,'the ordinary HUD deliberately lets world clicks pass through');
 const doc=documentStub(),parent=doc.createElement('div'),indicator=doc.createElement('span');
 mountMusicControls({parent,indicator,document:doc});
 assert.equal(indicator.tagName,'SPAN');assert.equal(indicator.getAttribute('role'),'button');
 // ARIA alone does not make a span match the existing `header button` rule.
 // The override must apply at every viewport, before mobile-only rules.
 const baseline=doc.getElementById('music-controls-style').textContent.split('@media')[0];
 assert.match(baseline,/#score-indicator\[role=button\]\{[^}]*pointer-events:auto(?:;|})/,'pointer input reaches the music action instead of the floor behind it');
 assert.equal(typeof indicator.onclick,'function');assert.equal(typeof indicator.onkeydown,'function');
});
