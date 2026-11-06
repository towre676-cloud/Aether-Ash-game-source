import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WildlifeNetwork} from '../src/wildlife-v7.mjs';
import {AtlasWorld} from '../src/adventure.mjs';
import {REGIONS,SPECIES} from '../src/content.mjs';

const make=()=>new AtlasWorld(721);

test('v7: deterministic census has exactly 54 authored cohorts and nine regions',()=>{
 const a=new WildlifeNetwork(721),b=new WildlifeNetwork(721);
 assert.deepEqual(a.snapshot(),b.snapshot());
 assert.equal(Object.keys(a.cohorts).length,SPECIES.length);
 assert.equal(REGIONS.length,9);
 for(const r of REGIONS){assert.equal(a.summary(r.id).length,6);assert.ok(a.summary(r.id).every(s=>s.count>0&&s.count<=30));}
});

test('v7: wildlife is a gameplay state and is unaffected by renderer or quality settings',()=>{
 const a=make();a.inspect(4,5);const before=a.snapshot();const s=a.wildlife.summary('hearthland');
 for(let i=0;i<5;i++){a.habitats(2,3);a.inspect(4,5);a.wildlife.sample('hearthland.grazer',8,9);}
 assert.deepEqual(a.snapshot(),before);
 assert.ok(s.every(x=>Number.isFinite(x.alert)&&Number.isFinite(x.density)));
});

test('v7: accepted movement disturbs local animals; denied teleports do not',()=>{
 const a=make(),id='hearthland.grazer';const before=a.wildlife.sample(id,-15,-10);
 assert.equal(a.stepAt(31,30).ok,false);
 assert.deepEqual(a.wildlife.sample(id,-15,-10),before);
 const ok=a.stepAt(-15,-10);
 assert.equal(ok.ok,true,JSON.stringify(ok));
 assert.ok(a.wildlife.sample(id,-15,-10).alert>before.alert);
 assert.ok(a.wildlife.sample(id,-15,-10).visible<before.visible);
 assert.equal(a.wildlife.sample(id,20,20).disturbance,0);
});

test('v7: confirmed encounter defeat reduces population and save preserves outcome',()=>{
 const a=make(),id='hearthland.stalker',before=a.wildlife.cohort(id).count;
 assert.equal(a.engageVisible(id,-15,-10).ok,true);
 let r;
 for(let i=0;i<12;i++){r=a.fight(-15,-10,id,'water',5);if(r.victorious)break;}
 assert.equal(r.victorious,true,JSON.stringify(r));
 assert.equal(a.wildlife.cohort(id).count,+Math.max(0,before-1).toFixed(5));
 const b=AtlasWorld.restore(a.snapshot());assert.deepEqual(b.wildlife.snapshot(),a.wildlife.snapshot());
 assert.equal(b.habitats(-15,-10).find(s=>s.id===id).population,a.habitats(-15,-10).find(s=>s.id===id).population);
});

test('v7: ecological recovery varies with material and water history',()=>{
 const a=new WildlifeNetwork(15),b=new WildlifeNetwork(15);
 const world={sample:()=>({biomass:.9,moisture:.85,ash:0,fire:0})};
 const burned={sample:()=>({biomass:.03,moisture:.03,ash:.95,fire:.8})};
 a.advance(90,{hearthland:world});b.advance(90,{hearthland:burned});
 assert.ok(a.cohort('hearthland.grazer').count>b.cohort('hearthland.grazer').count);
 assert.notDeepEqual(a.snapshot(),b.snapshot());
 assert.deepEqual(new WildlifeNetwork(15).snapshot(),new WildlifeNetwork(15).snapshot());
});

test('v7: alarm and disturbance recover with time; no unbounded event memory',()=>{
 const w=new WildlifeNetwork(23);for(let i=0;i<200;i++)w.disturb('hearthland',1,2,{strength:.1});
 assert.equal(w.disturbances.hearthland.length,48);
 const high=w.cohort('hearthland.grazer').alert;
 w.advance(30);
 assert.ok(w.cohort('hearthland.grazer').alert<high);
 assert.equal(w.disturbances.hearthland.length,0);
});

test('v7: saves with corrupted census or events reject instead of contaminating the world',()=>{
 const a=make(),raw=a.snapshot();raw.wildlifeV7.cohorts['hearthland.grazer'].count=-1;
 assert.throws(()=>AtlasWorld.restore(raw),/Invalid wildlife cohort/);
 const b=make().snapshot();b.wildlifeV7.disturbances.hearthland=[{x:9999,z:2,strength:.2,radius:2,day:0}];
 assert.throws(()=>AtlasWorld.restore(b),/Invalid wildlife disturbance/);
});

test('v7: pre-v7 version 3 saves still load and preserve quests, inventory and day',()=>{
 const a=make();a.passDays(3);const raw=a.snapshot();delete raw.wildlifeV7;
 const b=AtlasWorld.restore(raw);assert.equal(b.age,a.age);assert.equal(b.wildlife.day,a.age);
 assert.deepEqual(b.inventory,a.inventory);assert.deepEqual(b.completed,a.completed);
});

test('v7: NG+ retains an environmental imprint but begins a fresh coherent census',()=>{
 const a=make(),id='hearthland.grazer',original=a.wildlife.cohort(id).count;
 a.wildlife.defeat(id,-13,-9);assert.ok(a.wildlife.cohort(id).count<original);
 a.newGamePlus();assert.equal(a.epoch,1);assert.equal(a.wildlife.day,0);assert.equal(a.wildlife.cohort(id).defeated,0);
 assert.equal(AtlasWorld.restore(a.snapshot()).wildlife.day,0);
});

test('v7: visual actor source uses authoritative census and legal habitat paths',()=>{
 const file=fs.readFileSync(new URL('../src/actors.mjs',import.meta.url),'utf8');
 assert.match(file,/wildlife\?\.sample/);
 assert.match(file,/world\.evaluate\(px,pz\)\.traversalPassable/);
 const view=fs.readFileSync(new URL('../src/view.mjs',import.meta.url),'utf8');
 assert.match(view,/atlas\.wildlife/);
 assert.match(view,/getWildlife/);
});

test('v7: field observations require real habitat, are limited per day and persist',()=>{
 const a=make(),id='hearthland.stalker',before=a.inventory.timber;
 assert.equal(a.trackSpecies('glass_coast.chanter',1,1).ok,false);
 assert.equal(a.trackSpecies(id,100,1).ok,false);
 const r=a.trackSpecies(id,-15,-10);assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(r.confidence>0);assert.equal(a.trackSpecies(id,-15,-10).ok,false);
 assert.equal(a.inventory.timber,before);
 const b=AtlasWorld.restore(a.snapshot());assert.deepEqual(b.fieldGuide,a.fieldGuide);
 assert.equal(b.trackSpecies(id,-15,-10).ok,false);
 b.passDays(1);assert.equal(b.trackSpecies(id,-15,-10).ok,true);
});

test('v7: learned wildlife knowledge modestly reduces retaliation in real combat',()=>{
 const id='hearthland.sentry',x=-15,z=-10;
 const tracked=make(),unknown=make();assert.equal(tracked.trackSpecies(id,x,z).ok,true);
 assert.equal(tracked.engageVisible(id,x,z).ok,true);
 assert.equal(unknown.engageVisible(id,x,z).ok,true);
 const a=tracked.fight(x,z,id,'fire',.5),b=unknown.fight(x,z,id,'fire',.5);
 assert.equal(a.victorious,false);assert.equal(b.victorious,false);
 assert.ok(a.incoming<=b.incoming,`field guide incoming ${a.incoming} should not exceed ${b.incoming}`);
});

test('v7: field-guide corruption is rejected, older saves without field notes load',()=>{
 const a=make(),older=a.snapshot();delete older.fieldGuideV7;
 assert.deepEqual(AtlasWorld.restore(older).fieldGuide,[]);
 older.fieldGuideV7=[{species:'bad',region:'hearthland',confidence:1,x:0,z:0,age:0,epoch:0,material:'soil'}];
 assert.throws(()=>AtlasWorld.restore(older),/Invalid field guide/);
});

test('v7: field guide learned in one age carries diminished information into NG+',()=>{
 const a=make(),id='hearthland.grazer';const r=a.trackSpecies(id,-15,-10);assert.equal(r.ok,true);
 a.newGamePlus();assert.ok(a.fieldGuide.length>=1);
 assert.equal(a.fieldGuide[0].epoch,0);
 assert.ok(a.fieldGuide[0].confidence<r.confidence);
 assert.equal(AtlasWorld.restore(a.snapshot()).fieldGuide.length,a.fieldGuide.length);
});
