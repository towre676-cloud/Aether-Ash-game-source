import test from 'node:test';
import assert from 'node:assert/strict';
import {MOTION_MEDIA,motionPath,createMotionMedia} from '../motion-media.js';
import {expansionCinematics,expansionEarned} from '../expansion-cinema-content.js';
import {drawExpansion} from '../expansion-cinema-render.js';
import {installExpansionCinema} from '../expansion-cinema.js';
const entries=expansionCinematics(),wayglass=entries.find(e=>e.id==='world:wayglass'),vale=entries.find(e=>e.id==='world:household:vale');
function fakeVideo(){const listeners=new Map();return {readyState:0,videoWidth:0,videoHeight:0,paused:true,ended:false,removed:0,loaded:0,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;},addEventListener(k,fn){listeners.set(k,fn);},removeEventListener(k){listeners.delete(k);},removeAttribute(k){if(k==='src'){this.removed++;this.src='';}},load(){this.loaded++;},fail(){this.error={code:3};listeners.get('error')?.();},get listenerCount(){return listeners.size;}};}
const ready=v=>Object.assign(v,{readyState:3,videoWidth:1280,videoHeight:720});

test('only two full earned scenes opt into motion, preserving their original duration and unlock rules',()=>{
 assert.deepEqual(Object.keys(MOTION_MEDIA),['world:wayglass','world:household:vale']);
 assert.equal(wayglass.duration,8);assert.equal(vale.duration,6.8);
 assert.equal(motionPath(wayglass),'../cinema/living-world/wayglass-motion-v1.mp4');
 assert.equal(motionPath(vale),'../cinema/living-world/cinderfall-motion-v1.mp4');
 for(const e of entries)if(!Object.hasOwn(MOTION_MEDIA,e.id))assert.equal(motionPath(e),null);
 assert.equal(motionPath({...wayglass,compact:true}),null);
 assert.equal(expansionEarned(wayglass,{}),false);assert.equal(expansionEarned(wayglass,{carriedObjects:{'rook-wayglass':{}}}),true);
 assert.equal(expansionEarned(vale,{}),false);assert.equal(expansionEarned(vale,{townLife:{delivered:['vale']}}),true);
});

test('media creation is deferred to presentation and remains disabled in reduced-motion or compatibility mode',()=>{
 let created=0;const media=createMotionMedia({createVideo(){created++;return fakeVideo();},urlFor:p=>p});assert.equal(created,0);
 for(const options of [{reduced:true},{compatibility:true}])assert.equal(media.start(wayglass,options),false);
 assert.equal(media.start({...wayglass,compact:true}),false);assert.equal(created,0);
 assert.ok(media.start(wayglass));assert.equal(created,1);media.dispose();
});

test('the compositor receives a real ready video frame only after media becomes drawable',()=>{
 const video=fakeVideo(),media=createMotionMedia({createVideo:()=>video,urlFor:p=>'https://local.test/game/'+p});
 media.start(wayglass);assert.equal(video.muted,true);assert.equal(video.defaultMuted,true);assert.equal(video.playsInline,true);assert.equal(video.preload,'none');assert.equal(video.loop,false);
 assert.equal(media.frame(),null);ready(video);assert.equal(media.frame(),video);
 video.readyState=1;assert.equal(media.frame(),null);video.readyState=3;video.ended=true;assert.equal(media.frame(),null);
 media.dispose();assert.equal(video.paused,true);assert.equal(video.removed,1);assert.equal(video.loaded,1);assert.equal(video.listenerCount,0);
});

test('blocked playback and decode errors dispose media and fall back without changing story state',async()=>{
 const blocked=fakeVideo();blocked.play=()=>Promise.reject(Error('blocked'));
 const media=createMotionMedia({createVideo:()=>blocked,urlFor:p=>p});media.start(wayglass);await Promise.resolve();await Promise.resolve();assert.equal(media.frame(),null);assert.equal(blocked.removed,1);
 const broken=fakeVideo(),m=createMotionMedia({createVideo:()=>broken,urlFor:p=>p});m.start(vale);ready(broken);broken.fail();assert.equal(m.frame(),null);assert.equal(broken.removed,1);m.dispose();assert.equal(broken.removed,1);
});

test('a stale rejected play promise cannot dispose a newer scene and changing graphics mode stops playback',async()=>{
 let reject;const old=fakeVideo();old.play=()=>new Promise((_,r)=>reject=r);const next=fakeVideo(),videos=[old,next];
 const media=createMotionMedia({createVideo:()=>videos.shift(),urlFor:p=>p});media.start(wayglass);media.start(vale);ready(next);reject(Error('old scene stopped'));await Promise.resolve();await Promise.resolve();assert.equal(media.frame(),next);
 assert.equal(media.frame({compatibility:true}),null);assert.equal(next.removed,1);
});

function drawHarness(media,{compatibility=false,reduced=false,throwVideo=false}={}){
 const art={width:1672,height:941},drawn=[],gradient={addColorStop(){}},context=new Proxy({createRadialGradient:()=>gradient,createLinearGradient:()=>gradient,drawImage(source,...args){if(throwVideo&&source.videoWidth)throw Error('surface unavailable');drawn.push({source,args});}},{get:(o,k)=>o[k]||(()=>{})});
 const nodes=new Map(),d={ctx:context,entry:wayglass,canvas:{width:1920,height:1080},renderer:{compatibility},reduced,motionMedia:media,image:()=>art,root:{querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{});return nodes.get(selector);}}};
 return {d,art,drawn};
}

test('expansion cinema composites motion behind unchanged captions, using the video’s decoded dimensions',()=>{
 const video=fakeVideo(),media=createMotionMedia({createVideo:()=>video,urlFor:p=>p});media.start(wayglass);ready(video);video.width=300;video.height=150;
 const {d,drawn}=drawHarness(media);drawExpansion(d,1);assert.equal(drawn[0].source,video);assert.deepEqual(drawn[0].args,[0,0,1280,720]);assert.equal(d.root.querySelector('.cinematic-copy p').textContent,wayglass.shots[0].caption);
 media.dispose();
});

test('not-ready, reduced-motion, compatibility and failed canvas video draws retain canonical static art',()=>{
 for(const mode of ['not-ready','reduced','compatibility','draw-error']){
  const video=fakeVideo(),media=createMotionMedia({createVideo:()=>video,urlFor:p=>p});media.start(wayglass);if(mode!=='not-ready')ready(video);
  const {d,art,drawn}=drawHarness(media,{reduced:mode==='reduced',compatibility:mode==='compatibility',throwVideo:mode==='draw-error'});
  assert.doesNotThrow(()=>drawExpansion(d,1),mode);assert.equal(drawn[0].source,art,mode);media.dispose();
 }
});

test('the existing director finish path releases motion video once, including repeated skips',()=>{
 const videos=[];const oldDocument=globalThis.document;globalThis.document={createElement:()=>{const v=fakeVideo();videos.push(v);return v;}};
 try{
  const cinema={entries:[],map:new Map(),canvas:{},root:{classList:{add(){},remove(){}}},renderer:{compatibility:false},image(){return null;},observe(){},draw(){},present(e){this.entry=e;return true;},finish(){this.entry=null;},battleEvent(){}};
  installExpansionCinema(cinema);assert.equal(videos.length,0);cinema.present(wayglass,{state:{}});assert.equal(videos.length,1);cinema.finish();cinema.finish();assert.equal(videos[0].removed,1);assert.equal(videos[0].listenerCount,0);
 }finally{globalThis.document=oldDocument;}
});

test('frontier portraits avoid hue filters and bobbing in compatibility and reduced-motion modes',()=>{
 for(const mode of ['standard','compatibility','reduced']){
  const {d}=drawHarness(null,{compatibility:mode==='compatibility',reduced:mode==='reduced'}),filters=[],poses=[];
  d.entry={...entries.find(e=>e.frontierPortrait),hue:120};d.sprite=(...args)=>poses.push(args);
  const base=d.ctx;d.ctx=new Proxy(base,{set(target,key,value){if(key==='filter')filters.push(value);target[key]=value;return true;}});
  drawExpansion(d,1);
  assert.equal(filters.some(f=>f==='hue-rotate(120deg)'),mode==='standard',mode);
  assert.equal(poses.length,1);assert.equal(poses[0][4]===590,mode!=='standard',mode);
 }
});
