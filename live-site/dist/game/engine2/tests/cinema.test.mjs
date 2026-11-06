import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {cinematicRegistry,battleTrack,markCinematic,seenCinematic,canShowArrival} from '../cinema-content.js';
import {BESTIARY,FRONTIER_BESTIARY,ITEMS} from '../repertoire.js?v=5.6.0';import {TECHNIQUE_CATALOG,CREW} from '../mako.js';
const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),entries=cinematicRegistry(data);
test('all actual chapters have arrival, guardian, victory and attack scenes with exact boss identities',()=>{for(const m of data.campaign.missions){for(const kind of ['arrival','guardian','victory','assault'])assert.equal(entries.filter(e=>e.id===kind+':'+m.id).length,1);assert.equal(entries.find(e=>e.id==='guardian:'+m.id).title,m.enemy_name);}assert.equal(entries.length,4*data.campaign.missions.length+2*(BESTIARY.length+FRONTIER_BESTIARY.length+4)+ITEMS.length+CREW.length+TECHNIQUE_CATALOG.length);assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);});
test('every active bestiary species, supply and usable Mako recipe has cinematic coverage',()=>{for(const s of [...BESTIARY,...FRONTIER_BESTIARY])for(const k of ['creature','creature-move'])assert.ok(entries.some(e=>e.id===k+':'+s.id));for(const s of ITEMS)assert.ok(entries.some(e=>e.id==='supply:'+s.id));for(const t of TECHNIQUE_CATALOG)assert.ok(entries.some(e=>e.id==='technique:'+t.id));});
test('presentation history roundtrips through existing save without granting rewards or changing flags',()=>{const state={gold:37,flags:{8:2},items:{tonic:1},bosses:[1]};const before=JSON.stringify(state);markCinematic(state,'guardian:2');markCinematic(state,'guardian:2');assert.deepEqual(state.cinemaSeen,['guardian:2']);assert.ok(seenCinematic(JSON.parse(JSON.stringify(state)),'guardian:2'));const {cinemaSeen,...rest}=state;assert.equal(JSON.stringify(rest),before);});
test('all cinematic art and action tracks resolve to packaged files',()=>{const catalog=JSON.parse(fs.readFileSync(new URL('../../music/catalog.json',import.meta.url)));for(const e of entries){if(e.art)assert.ok(fs.existsSync(new URL('../../cinema/expanded/art/'+e.art,import.meta.url)),e.art);if(e.video)assert.ok(fs.existsSync(new URL('../../cinema/'+e.video,import.meta.url)),e.video);if(e.music)assert.ok(catalog.tracks.some(t=>t.id===e.music));}for(const m of data.campaign.missions)for(const boss of [true,false])assert.ok(catalog.tracks.some(t=>t.id===battleTrack(m.id,boss)));});
test('arrival cards respect the earned opening and never fire in home or town',()=>{for(const key of ['home','town','workshop'])assert.equal(canShowArrival({scene:{key,chapter:1}}),false);assert.ok(canShowArrival({scene:{key:'security',chapter:1}}));assert.ok(canShowArrival({scene:{key:'field',chapter:24}}));assert.equal(canShowArrival({scene:{key:'hub',chapter:0}}),false);});

// A minimal DOM verifies modal completion/skip behavior independently of timing and rendering.
const context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
function node(){return{hidden:true,style:{setProperty(){}},classList:{toggle(){}},setAttribute(){},append(){},focus(){},getContext:()=>context,toDataURL:()=>'',querySelector(){return node();},isConnected:true};}
globalThis.document={activeElement:node(),createElement:node,querySelector:()=>node()};globalThis.window={addEventListener(){}};globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.matchMedia=()=>({matches:true});globalThis.Image=class{complete=false;naturalWidth=0;};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const {CinemaDirector}=await import('../cinema-director.js');
test('skipping a guardian victory delivers rewards callback once, and presentation can be disabled safely',()=>{let opened=0,closed=0,reward=0;const d=new CinemaDirector({data,renderer:{canvas:node(),assets:{},bounds:{}},onOpen:()=>opened++,onClose:()=>closed++});const world={state:{party:[0],cinemaSeen:[]}};const e={...d.get('victory:1'),music:null};assert.ok(d.present(e,world,{after:()=>reward++}));assert.equal(d.busy,true);assert.equal(reward,0);d.finish();d.finish();assert.equal(reward,1);assert.equal(opened,1);assert.equal(closed,1);assert.equal(d.busy,false);d.enabled=false;assert.equal(d.present(d.get('guardian:2'),world,{after:()=>reward++}),false);assert.equal(reward,2);});
test('compact techniques do not suspend gameplay or invoke the full scene audio lifecycle',()=>{let opened=0;const d=new CinemaDirector({data,renderer:{canvas:node(),assets:{},bounds:{}},onOpen:()=>opened++});const world={state:{party:[0],cinemaSeen:[]}};assert.ok(d.present(d.get('technique:volt:focus'),world));assert.equal(d.busy,false);assert.equal(opened,0);d.finish();});

test('previous journey history suppresses duplicate arrival and base-creature introductions',()=>{const state={cinemaSeen:['arrival-1','creature-mossback']};assert.ok(seenCinematic(state,'arrival:1'));assert.ok(seenCinematic(state,'creature:mossback'));assert.equal(seenCinematic(state,'arrival:2'),false);});

test('a graphics-recovery canvas export failure cannot interrupt cinematic presentation or completion',()=>{
 let closed=0,completed=0;const canvas=node();canvas.toDataURL=()=>{throw new Error('drawing surface interrupted');};
 const d=new CinemaDirector({data,renderer:{canvas,assets:{},bounds:{}},onClose:()=>closed++}),world={state:{party:[0],cinemaSeen:[]}};
 assert.doesNotThrow(()=>d.present({...d.get('guardian:1'),music:null},world,{after:()=>completed++}));
 assert.equal(d.backdrop,null);assert.equal(d.busy,true);d.finish();assert.equal(closed,1);assert.equal(completed,1);
});

test('existing arrival videos also stay static in reduced-motion and compatibility graphics',()=>{
 for(const mode of ['reduced','compatibility']){
  let videos=0;const create=document.createElement;document.createElement=tag=>{if(tag==='video')videos++;return node();};
  try{const d=new CinemaDirector({data,renderer:{canvas:node(),assets:{},bounds:{},compatibility:mode==='compatibility'}});d.reduced=mode==='reduced';d.present({...d.get('arrival:1'),music:null},{state:{party:[0],cinemaSeen:[]}});assert.equal(videos,0,mode);d.finish();}finally{document.createElement=create;}
 }
});

test('compatibility cinematics still draw a captured backdrop without requesting a blur filter',()=>{
 for(const compatibility of [false,true]){
  const d=new CinemaDirector({data,renderer:{canvas:node(),assets:{},bounds:{},compatibility}}),filters=[],drawn=[];
  d.entry={kind:'crew',duration:2};d.backdrop={complete:true,naturalWidth:1280};d.hero=0;
  const base=d.ctx;d.ctx=new Proxy(base,{get(target,key){if(key==='drawImage')return source=>drawn.push(source);return target[key];},set(target,key,value){if(key==='filter')filters.push(value);target[key]=value;return true;}});
  d.draw(1);assert.ok(drawn.includes(d.backdrop));assert.equal(filters.includes('blur(14px)'),!compatibility);
 }
});
