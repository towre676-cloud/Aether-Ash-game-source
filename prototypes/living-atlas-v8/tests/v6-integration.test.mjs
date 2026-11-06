import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AtlasWorld} from '../src/adventure.mjs';
import {AtlasSurveyV6,authoredSurveySources,materialShield,scoreGains} from '../src/acoustic-survey-v6.mjs';
import {terrainEcotone,visualSeason,substrateFor} from '../src/world-ecotones-v6.mjs';
import {authoredSignalSources} from '../src/perception.mjs';

const built=()=>new AtlasWorld(441);
test('v6: map-authored-event survey is empty until authoritative Hydrophone acceptance',()=>{
 const a=built(),s=new AtlasSurveyV6(a);
 assert.deepEqual(authoredSurveySources(a),[]);
 assert.deepEqual(s.scan({x:1,z:1}).heard,[]);
 assert.equal(s.resolve('unknown').resolved,false);
 assert.deepEqual(a.inventory,{timber:4,clay:2,silt:1});
});
test('v6: two separated scans locate a real event and survive save/load with no minted items',()=>{
 const a=built(),r=a.dispatch({kind:'HYDROPHONE_PLAYED',type:'hydrophone',x:10,z:8,phase:0,intensity:1});assert.equal(r.ok,true,JSON.stringify(r));
 const source=authoredSurveySources(a)[0];assert.ok(source.id.startsWith('hydrophone:0:hearthland:'));
 const s=new AtlasSurveyV6(a),p1={x:8,z:7},p2={x:9,z:10};
 const q=s.scan(p1);assert.equal(q.ok,true);assert.ok(q.heard.length>0);
 assert.equal(s.resolve(source.id).resolved,false);
 s.scan(p2);const solved=s.resolve(source.id);assert.equal(solved.resolved,true,JSON.stringify(solved));
 assert.equal(solved.authoritativeAward,false);
 assert.equal(s.resolve(source.id).reason,'already_discovered');
 const b=AtlasWorld.restore(a.snapshot()),t=new AtlasSurveyV6(b);
 assert.equal(t.resolve(source.id).reason,'already_discovered');
 assert.deepEqual(b.inventory,a.inventory);assert.deepEqual(b.completed,a.completed);
});
test('v6: duplicate and impossible echo positions never create maps, rewards or a new source',()=>{
 const a=built();assert.equal(a.dispatch({kind:'HYDROPHONE_PLAYED',x:12,z:6,phase:.1,intensity:1}).ok,true);
 const s=new AtlasSurveyV6(a),before=a.snapshot();
 assert.equal(s.scan({x:900,z:3}).ok,false);
 assert.equal(s.resolve('imaginary').reason,'not_authored');
 assert.deepEqual(a.inventory,before.inventory);
 assert.equal(authoredSurveySources(a).length,1);
});
test('v6: pre-fix saves preserve accepted Hydrophone evidence via canonical kind',()=>{
 const a=built(),ok=a.dispatch({kind:'HYDROPHONE_PLAYED',type:'hydrophone',x:10,z:8,phase:0,intensity:1});assert.equal(ok.ok,true);
 const save=a.snapshot();save.ledger.at(-1).type='hydrophone';
 const b=AtlasWorld.restore(save);assert.equal(authoredSurveySources(b).length,1);
});
test('v6: forged event payload cannot overwrite the authoritative ledger identity',()=>{
 const a=built(),event={kind:'HYDROPHONE_PLAYED',type:'hydrophone',id:999999,region:'unreal',age:999,x:10,z:8,phase:0,intensity:1};
 assert.equal(a.dispatch(event).ok,true);const e=a.ledger.at(-1);
 assert.equal(e.type,'HYDROPHONE_PLAYED');assert.notEqual(e.id,999999);assert.equal(e.region,'hearthland');assert.equal(e.age,a.age);
});
test('v6: NG+ starts a fresh survey, and historical signals cannot leak across epochs',()=>{
 const a=built();assert.equal(a.dispatch({kind:'HYDROPHONE_PLAYED',x:10,z:8,phase:0,intensity:1}).ok,true);
 new AtlasSurveyV6(a).scan({x:8,z:7});
 assert.equal(authoredSignalSources(a).length,1);
 a.newGamePlus();assert.equal(a.epoch,1);assert.equal(authoredSignalSources(a).length,0);
 assert.equal(new AtlasSurveyV6(a).scan({x:8,z:7}).heard.length,0);
 assert.equal(AtlasWorld.restore(a.snapshot()).epoch,1);
});
test('v6: old version-3 save without new survey data remains compatible',()=>{
 const a=built(),old=a.snapshot();delete old.acousticSurveyV2;
 const b=AtlasWorld.restore(old),s=new AtlasSurveyV6(b);
 assert.equal(s.scan({x:1,z:1}).ok,true);assert.equal(b.acousticSurveyV2.epoch,0);
});
test('v6: terrain ecotones use canonical existing biomes and change across water gradients',()=>{
 const a=built(),samples=[];
 for(let z=-20;z<=20;z+=5){
  for(let x=-20;x<=20;x+=2){const mix=terrainEcotone(a.region,a.world,x,z);
   if(mix?.riverbank && Object.keys(mix).length===2)samples.push(mix);}}
 assert.ok(samples.length>0,'Expected at least one authored river/land blend');
 for(const mix of samples){const n=Object.values(mix).reduce((p,q)=>p+q,0);assert.ok(Math.abs(n-1)<.001);assert.ok(Object.keys(mix).every(k=>['meadow','woodland','marsh','orchard','highlands','ashlands','aether','riverbank','farmlands','ruins','bog','alpine'].includes(k)),JSON.stringify(mix));}
 assert.equal(terrainEcotone(a.region,a.world,100,0),null);
});
test('v6: seasons and substrate are derived from host world, not from GPU frame rate',()=>{
 const a=built(),season=visualSeason(a.age,a.region.heat);
 assert.ok(['spring','summer','autumn','winter'].includes(season));
 assert.notEqual(visualSeason(0,0),visualSeason(220,0));
 const soil=substrateFor(a.region,a.world,0,19);
 assert.ok(soil.vegetationSuitability>=0&&soil.vegetationSuitability<=1);
 assert.deepEqual(substrateFor(a.region,a.world,0,19),soil);
});
test('v6: acoustic perception and adaptive gain are mechanical views independent of output audio',()=>{
 const a=built(),s=new AtlasSurveyV6(a),v=s.soundscape();
 assert.ok(v.scene);assert.deepEqual(v.gains,scoreGains({danger:0,travel:0,discovery:0,story:0}));
 assert.equal(s.footfall({x:2,z:0},{surface:'wet_moss',enemies:[{id:'beast',position:{x:4,z:0}}]}).ok,true);
 assert.equal(materialShield({material:'clay',attackFrequency:196}).vulnerable,true);
 assert.equal(materialShield({material:'clay',attackFrequency:270}).vulnerable,false);
});
test('v6: viewer exposes optional score, two-bearing survey, v4 foliage and existing controls',()=>{
 const v=fs.readFileSync(new URL('../src/view.mjs',import.meta.url),'utf8');
 const h=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(v,/grass-v4\/grass-renderer/);assert.match(v,/foliageGovernor.observe/);
 for(const action of ['scan-v6','resolve-v6','score-v6','listen','battle','ngplus','walk']){assert.match(h,new RegExp(`data-action="${action}"`));}
 assert.match(v,/if\(!step\.ok\)/);assert.match(v,/if\(!r\.ok\)return announce\(r\.reason\)/);
});

test('v6: invalid survey extension fails closed without modifying a live world',()=>{
 const a=built(),save=a.snapshot();save.acousticSurveyV2={epoch:900,survey:{discovered:[],samples:[]}};
 assert.throws(()=>AtlasWorld.restore(save),/Invalid acoustic survey/);
});
