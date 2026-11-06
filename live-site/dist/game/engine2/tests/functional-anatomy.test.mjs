import test from 'node:test';
import assert from 'node:assert/strict';
import {ANATOMY_PROFILES,createAnatomy,anatomySummary,anatomyActions,anatomyCommand,damageAnatomyPart,modifyAnatomyIntent,anatomyMobility,validAnatomy} from '../functional-anatomy.js';
import {createBattlefield,fieldCommand,fieldGear,validBattlefield} from '../battlefield.js';
import {MONSTER_CATALOG} from '../monster-catalog.js';

function fixture(family='mossback'){
 const h={id:0,name:'Rook',x:.5,y:.5,hp:200,power:24,atb:1,status:{}},e={id:'e0',name:'Test '+family,family,x:2.5,y:.5,hp:300,maxHp:300,armor:90,maxArmor:90,power:15,atb:1,status:{}},walkable=Array.from({length:8},(_,x)=>[x,0]);
 const b={context:{wild:true,walkable},heroes:[h],enemies:[e],time:0,events:[],event(e){this.events.push(e);},damage(c,t,n){t.hp=Math.max(0,t.hp-n);return {damage:n};}};
 b.field=createBattlefield({fieldProps:[{type:'jar',x:1.5,y:.5}]},[h],[e]);b.anatomy=createAnatomy(b.context,[e]);return b;
}
const byEffect=(b,effect)=>b.anatomy.actors[0].parts.find(p=>p.effect===effect);

test('all432 varieties receive deterministic functional anatomy from16 authored profiles',()=>{
 const seen=new Set();assert.ok(Object.keys(ANATOMY_PROFILES).length>=12);
 for(const s of MONSTER_CATALOG){const e={...s,hp:64,maxHp:64},a=createAnatomy({wild:true},[e]);assert.ok(validAnatomy(a,[e]),s.id);assert.equal(a.actors[0].parts.length,3);assert.equal(a.actors[0].parts.filter(p=>p.tool).length,1);assert.deepEqual(a,createAnatomy({wild:true},[e]));seen.add(a.actors[0].profile);}
 assert.equal(seen.size,16);
});
test('legacy friendly tutorial and anchored bosses retain their authored capabilities',()=>{
 const enemy={id:'e',hp:64,maxHp:64};for(const context of [{},{wild:true,friendly:true},{wild:true,tutorial:true}]){const a=createAnatomy(context,[enemy]);assert.equal(a.enabled,false);assert.deepEqual(a.actors,[]);assert.ok(validAnatomy(a,[enemy]));}
 const boss=createAnatomy({wild:true},[{...enemy,boss:true}]);assert.equal(boss.actors.length,0);assert.ok(validAnatomy(null,[]));
});
test('targeted strikes use real damage and readiness, respect shielded hits, and reject failures',()=>{
 const b=fixture(),h=b.heroes[0],e=b.enemies[0],p=byEffect(b,'guard'),before=p.integrity;
 assert.equal(anatomyCommand(b,h,e,{action:'target-part',partId:p.id}),true);assert.equal(h.atb,0);assert.equal(e.hp,281);assert.equal(p.integrity,before-26);
 const snapshot=JSON.stringify(b.anatomy);assert.equal(anatomyCommand(b,h,e,{action:'target-part',partId:p.id}),false);assert.equal(JSON.stringify(b.anatomy),snapshot);
 h.atb=1;b.damage=()=>({damage:0});assert.equal(anatomyCommand(b,h,e,{action:'target-part',partId:p.id}),true);assert.equal(JSON.stringify(b.anatomy),snapshot);
 h.atb=1;e.x=7.5;assert.equal(anatomyCommand(b,h,e,{action:'target-part',partId:p.id}),false);assert.equal(h.atb,1);assert.ok(anatomyActions(b,h,e).every(a=>!a.enabled&&a.reason));
});
test('part targeting requires a known unbroken floor line and cannot reach through partitions',()=>{
 const b=fixture(),h=b.heroes[0],e=b.enemies[0],p=byEffect(b,'guard');b.context.walkable=[[0,0],[2,0]];
 assert.equal(anatomyCommand(b,h,e,{action:'target-part',partId:p.id}),false);assert.equal(h.atb,1);b.context.walkable=[];assert.equal(anatomyCommand(b,h,e,{action:'target-part',partId:p.id}),false);
});
test('breaking a plate changes guard plans and armor, then releases one finite shared brace',()=>{
 const b=fixture(),e=b.enemies[0],h=b.heroes[0],p=byEffect(b,'guard');e.intent={kind:'guard',shape:'single',target:e.id,x:e.x,y:e.y,fromX:e.x,fromY:e.y,power:15,left:1,total:1,label:'Closing shell'};
 damageAnatomyPart(b,e,p.id,999,{actor:h});assert.equal(e.armor,23);assert.equal(e.maxArmor,27);assert.equal(e.intent.kind,'strike');assert.equal(e.intent.target,h.id);assert.equal(p.salvaged,true);
 const props=b.field.props.filter(x=>x.id==='anatomy-'+e.id+'-'+p.id);assert.equal(props.length,1);assert.equal(props[0].type,'plank');assert.equal(props[0].condition,'loose');
 const count=b.field.props.length;assert.equal(damageAnatomyPart(b,e,p.id,999,{actor:h}),null);assert.equal(b.field.props.length,count);
 assert.ok(validBattlefield(b.field,[h,e]));h.atb=1;assert.equal(fieldCommand(b,h,e,{action:'take',propId:props[0].id}),true);assert.equal(fieldGear(b,h)?.id,props[0].id);assert.equal(fieldGear(b,e),null);
});
test('a broken bell sac rewrites an already charged alarm and every future alarm',()=>{
 const b=fixture('belljelly'),e=b.enemies[0],p=byEffect(b,'silence'),i={kind:'alarm',shape:'single',target:0,x:.5,y:.5,fromX:2.5,fromY:.5,power:25,left:1,total:1,label:'Calling help'};e.intent={...i};damageAnatomyPart(b,e,p.id,999,{actor:b.heroes[0]});
 assert.equal(e.intent.kind,'strike');assert.equal(e.intent.shape,'single');const next=modifyAnatomyIntent(b,e,i);assert.equal(next.kind,'strike');assert.ok(next.label.includes('Disabled'));assert.deepEqual(modifyAnatomyIntent(b,e,next),next);
});
test('horn damage narrows a charge and claw damage changes actual mobility and escape policy',()=>{
 const b=fixture('bramblewolf'),e=b.enemies[0],horn=byEffect(b,'charge'),claw=byEffect(b,'mobility');damageAnatomyPart(b,e,horn.id,999);
 const intent=modifyAnatomyIntent(b,e,{kind:'strike',shape:'line',power:100,label:'Rush'});assert.equal(intent.shape,'single');assert.equal(intent.power,72);assert.deepEqual(modifyAnatomyIntent(b,e,intent),intent);
 assert.deepEqual(anatomyMobility(b,e),{moveScale:1,canEscape:true});damageAnatomyPart(b,e,claw.id,999);assert.equal(e.mobilityImpaired,true);assert.equal(e.escapeBlocked,true);assert.deepEqual(anatomyMobility(b,e),{moveScale:.4,canEscape:false});assert.equal(modifyAnatomyIntent(b,e,{kind:'ecology-escape'}).escapeBlocked,true);
});
test('functional organs disable status and special traits rather than only subtracting HP',()=>{
 for(const [family,effect,trait,status]of[['boilercrab','heat','forge','burn'],['inkcrane','ink','erase','exposed'],['belljelly','siphon','siphon','wet'],['moonmoth','molt','molt',null],['stormmanta','tempo','tempo','shock'],['rootgolem','chorus','chorus',null]]){
  const b=fixture(family),e=b.enemies[0],p=byEffect(b,effect);e.trait=trait;damageAnatomyPart(b,e,p.id,999);assert.equal(e.trait,null,family);if(status){const i=modifyAnatomyIntent(b,e,{kind:'strike',shape:'line',status,core:'flame',power:100,label:'Elemental'});assert.equal(i.status,undefined);assert.equal(i.power,85);}
 }
});
test('parts remain serializable and reject forged profiles, duplicate parts and invalid integrity',()=>{
 const b=fixture(),e=b.enemies[0],p=byEffect(b,'guard');damageAnatomyPart(b,e,p.id,999);const copy=JSON.parse(JSON.stringify(b.anatomy));assert.ok(validAnatomy(copy,[e]));assert.ok(anatomySummary(b,e).text.includes('disabled'));
 for(const mutate of [a=>a.actors[0].profile='invented',a=>a.actors[0].parts[1].id=a.actors[0].parts[0].id,a=>a.actors[0].parts[0].integrity=NaN,a=>a.actors[0].parts[1].salvaged=true,a=>a.actors[0].parts[0].effect='forge']){const bad=structuredClone(copy);mutate(bad);assert.equal(validAnatomy(bad,[e]),false);}
 assert.equal(validAnatomy(copy,[]),false);
});
test('salvage provenance rejects orphan body tools, forged flags and duplicate source identities',()=>{
 const b=fixture(),e=b.enemies[0],p=byEffect(b,'guard');damageAnatomyPart(b,e,p.id,999);assert.ok(validAnatomy(b.anatomy,[e],b.field));
 const missing=structuredClone(b.field);missing.props=missing.props.filter(x=>!x.anatomySource);assert.equal(validAnatomy(b.anatomy,[e],missing),false);
 const duplicate=structuredClone(b.field),salvage=duplicate.props.find(x=>x.anatomySource);duplicate.props.push({...salvage,id:salvage.id+'-copy'});assert.equal(validAnatomy(b.anatomy,[e],duplicate),false);
 const flags=structuredClone(b.anatomy);flags.actors[0].parts.find(x=>x.id===p.id).salvaged=false;assert.equal(validAnatomy(flags,[e],b.field),false);assert.equal(validAnatomy(null,[e],b.field),false);
});
