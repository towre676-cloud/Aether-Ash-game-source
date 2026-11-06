import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELD_TOOLS,createBattlefield,fieldGear,fieldOptions,fieldCommand,planFieldIntent,executeFieldIntent,modifyFieldIntent,resolveToolHit,applyFieldImpact,finishFieldIntent,releaseFieldGear,interceptFieldHit,validBattlefield} from '../battlefield.js';
import {Battle,makeEnemy} from '../battle.js?v=5.6.0';
import {defaultHero} from '../mako.js';

function setup(types=['hook'],{wild=false,enemies=1}={}){
 const heroes=[{id:0,name:'Iona',hp:180,x:0,y:0,atb:1,status:{}}],foes=Array.from({length:enemies},(_,i)=>({id:'e'+i,name:'Creature '+i,hp:100,x:2+i*.4,y:0,atb:1,status:{}}));
 const context={wild,encounterSerial:1,fieldProps:types.map((type,i)=>({type,x:1+i*.25,y:0,source:'loose tools beside the workbench'}))};
 const b={context,heroes,enemies:foes,events:[],event(e){this.events.push(e);},time:0,ended:null};b.field=createBattlefield(context,heroes,foes);return b;
}
function pickupEnemy(b,e=b.enemies[0]){const intent=planFieldIntent(b,e);assert.ok(intent);assert.equal(executeFieldIntent(b,e,intent),true);return fieldGear(b,e);}
function pickupHero(b,type){const p=b.field.props.find(p=>p.type===type&&p.ownerId===null);b.heroes[0].atb=1;assert.equal(fieldCommand(b,b.heroes[0],b.enemies[0],{action:'take',propId:p.id}),true);return p;}

test('ordinary legacy, friendly and tutorial fights retain an empty optional battlefield',()=>{
 for(const context of [{},{friendly:true,wild:true},{tutorial:true,wild:true}]){const h={id:0,hp:20,x:0,y:0,fieldGear:'old'},field=createBattlefield(context,[h],[]);assert.equal(field.enabled,false);assert.deepEqual(field.props,[]);assert.equal(h.fieldGear,null);assert.ok(validBattlefield(field,[h]));}
});
test('wild formations equip no more than half their members from the same finite pool',()=>{
 for(let count=1;count<=5;count++){const b=setup(['hook','plank','bell','jar','coil','reed'],{wild:true,enemies:count}),equipped=b.enemies.filter(e=>fieldGear(b,e));assert.equal(equipped.length,Math.ceil(count/2));assert.equal(b.field.props.filter(p=>p.condition==='carried').length,equipped.length);assert.equal(new Set(equipped.map(e=>e.fieldGear)).size,equipped.length);assert.ok(validBattlefield(b.field,[...b.heroes,...b.enemies]));}
});
test('two creatures contest one object; a claim is not an item duplication',()=>{
 const b=setup(['hook'],{enemies:2}),a=planFieldIntent(b,b.enemies[0]),z=planFieldIntent(b,b.enemies[1]);assert.ok(a&&z);executeFieldIntent(b,b.enemies[0],a);executeFieldIntent(b,b.enemies[1],z);assert.ok(fieldGear(b,b.enemies[0]));assert.equal(fieldGear(b,b.enemies[1]),null);assert.equal(b.field.props.length,1);assert.equal(b.events.at(-1).action,'claim-lost');
});
test('disarm then reclaim changes ownership, stops a charge and exposes its owner',()=>{
 const b=setup(),e=b.enemies[0],h=b.heroes[0],p=pickupEnemy(b);e.intent={kind:'strike',left:.5};assert.equal(fieldCommand(b,h,e,{action:'disarm',propId:p.id}),true);assert.equal(h.atb,0);assert.equal(e.intent,null);assert.ok(e.status.exposed);assert.ok(e.status.stagger);assert.equal(p.ownerId,null);assert.equal(p.condition,'loose');h.atb=1;assert.equal(fieldCommand(b,h,e,{action:'take',propId:p.id}),true);assert.equal(p.ownerId,0);assert.equal(fieldGear(b,e),null);assert.equal(fieldGear(b,h),p);assert.equal(b.field.props.length,1);
 e.intent={kind:'alarm',left:.6};assert.equal(resolveToolHit(b,h,e,100,{physical:true}),115);assert.equal(e.intent,null);assert.equal(p.uses,1);
});
test('failed actions preserve readiness, ownership and charges',()=>{
 const b=setup(['bell']),h=b.heroes[0],e=b.enemies[0],p=b.field.props[0];p.x=10;assert.equal(fieldCommand(b,h,e,{action:'take',propId:p.id}),false);assert.equal(h.atb,1);assert.equal(p.uses,2);assert.equal(p.ownerId,null);p.x=1;pickupHero(b,'bell');h.atb=1;const snapshot=JSON.stringify(b.field);assert.equal(fieldCommand(b,h,e,{action:'ring',propId:p.id}),false);assert.equal(h.atb,1);assert.equal(JSON.stringify(b.field),snapshot);assert.ok(fieldOptions(b,h,e).some(row=>row.action==='ring'&&!row.enabled&&row.reason));
});
test('carried tools change enemy telegraphs, attack geometry and readiness effects',()=>{
 for(const type of Object.keys(FIELD_TOOLS)){const b=setup([type]),e=b.enemies[0],h=b.heroes[0],p=pickupEnemy(b),i=modifyFieldIntent(b,e,{kind:'strike',shape:'single',label:'Pounce',left:1,total:1,power:20});assert.equal(i.fieldPropId,p.id);assert.ok(i.label.includes(p.name));if(['hook','plank'].includes(type))assert.equal(i.shape,'line');h.atb=1;applyFieldImpact(b,e,i,h);if(['bell','coil','plank'].includes(type))assert.ok(h.atb<1);finishFieldIntent(b,e,i);assert.equal(p.uses,FIELD_TOOLS[type].uses-1);}
});
test('enemy tools spend once per intent across misses or multiple struck actors',()=>{
 const b=setup(['coil']),e=b.enemies[0],p=pickupEnemy(b),i=modifyFieldIntent(b,e,{kind:'strike',shape:'line',label:'Sweep',left:1,total:1,power:20});const targets=[b.heroes[0],{id:1,hp:100,atb:1,status:{}}];for(const h of targets)applyFieldImpact(b,e,i,h);assert.equal(p.uses,2);finishFieldIntent(b,e,i);assert.equal(p.uses,1);finishFieldIntent(b,e,i);assert.equal(p.uses,1);finishFieldIntent(b,e,{kind:'strike'});assert.equal(p.uses,1);const miss=modifyFieldIntent(b,e,{kind:'strike',shape:'line',label:'Miss',left:1,total:1,power:20});finishFieldIntent(b,e,miss);assert.equal(p.uses,0);assert.equal(fieldGear(b,e),null);
});
test('ordinary player strikes spend finite tools; DOT, spells and secondary arcs do not',()=>{
 const b=setup(['jar']),h=b.heroes[0],e=b.enemies[0],p=pickupHero(b,'jar');for(const options of [{physical:true,dot:true},{physical:true,secondary:true},{physical:true,tech:{core:'earth'}}])assert.equal(resolveToolHit(b,h,e,100,options),100);assert.equal(p.uses,1);e.status.burn=5;resolveToolHit(b,h,e,100,{physical:true});assert.equal(e.status.burn,undefined);assert.ok(e.status.wet);assert.equal(p.uses,0);assert.equal(fieldGear(b,h),null);assert.equal(p.condition,'spent');
});
test('bell action cancels an alarm, but delays a normal attack instead of universally stunning',()=>{
 const b=setup(['bell']),h=b.heroes[0],e=b.enemies[0],p=pickupHero(b,'bell');h.atb=1;e.intent={kind:'strike',left:.4,total:1};assert.equal(fieldCommand(b,h,e,{action:'ring',propId:p.id}),true);assert.equal(e.intent.left,1.4);assert.equal(p.uses,1);h.atb=1;e.intent={kind:'alarm',left:.5,total:1};assert.equal(fieldCommand(b,h,e,{action:'ring',propId:p.id}),true);assert.equal(e.intent,null);assert.equal(p.uses,0);assert.equal(fieldGear(b,h),null);
});
test('cover depends on geometry and blocks a single aimed crossing attack',()=>{
 const b=setup(['plank']),h=b.heroes[0],e=b.enemies[0];e.x=4;pickupHero(b,'plank');h.atb=1;assert.equal(fieldCommand(b,h,e,{action:'cover'}),true);assert.equal(fieldGear(b,h),null);assert.equal(b.field.cover.length,1);assert.equal(interceptFieldHit(b,e,{shape:'burst'},h),false);const cover=b.field.cover[0];cover.y=2;assert.equal(interceptFieldHit(b,e,{shape:'line'},h),false);cover.y=0;assert.equal(interceptFieldHit(b,e,{shape:'line'},h),true);assert.equal(cover.integrity,0);assert.equal(interceptFieldHit(b,e,{shape:'line'},h),false);assert.equal(b.field.props[0].condition,'spent');
});
test('dropping or defeating a carrier releases the original tool with its remaining uses',()=>{
 const b=setup(['hook']),e=b.enemies[0],p=pickupEnemy(b);p.uses=1;e.hp=0;assert.equal(releaseFieldGear(b,e),p);assert.equal(p.ownerId,null);assert.equal(p.condition,'loose');assert.equal(p.uses,1);assert.equal(fieldGear(b,e),null);assert.equal(b.field.props.length,1);
});
test('plain state roundtrips; invalid ownership, duplicate IDs and orphan gear are rejected',()=>{
 const b=setup(['hook','plank']),p=pickupEnemy(b),all=[...b.heroes,...b.enemies];assert.ok(validBattlefield(JSON.parse(JSON.stringify(b.field)),JSON.parse(JSON.stringify(all))));const orphan=structuredClone(all);orphan[1].fieldGear=null;assert.equal(validBattlefield(b.field,orphan),false);const duplicate=structuredClone(b.field);duplicate.props[1].id=duplicate.props[0].id;assert.equal(validBattlefield(duplicate,all),false);assert.equal(validBattlefield(b.field,[...all,all[0]]),false);assert.equal(validBattlefield(undefined,all),false);const old=all.map(a=>({...a,fieldGear:null}));assert.ok(validBattlefield(undefined,old));assert.equal(validBattlefield({...b.field,enabled:false},all),false);p.ownerId='missing';assert.equal(validBattlefield(b.field,all),false);
});

test('actual Battle can equip, disarm, reclaim, use and restore a finite tool',()=>{
 const h=defaultHero(0),e=makeEnemy('predator',1);h.x=0;h.y=0;e.x=2;e.y=0;e.hp=e.maxHp=500;
 const b=new Battle({heroes:[h],enemies:[e],chapter:1,context:{wild:true,fieldProps:[{type:'hook',x:1,y:0}],reinforcementLimit:0}});
 assert.ok(fieldGear(b,e));h.atb=1;assert.equal(b.command(h.id,'field',e.id,{action:'disarm'}),true);h.atb=1;const p=b.field.props[0];assert.equal(b.command(h.id,'field',e.id,{action:'take',propId:p.id}),true);h.atb=1;assert.equal(b.command(h.id,'attack',e.id),true);assert.equal(p.uses,1);
 const saved=b.snapshot(),next=new Battle({heroes:[defaultHero(0)],enemies:[],chapter:1});next.restore(saved);assert.deepEqual(next.field,b.field);assert.equal(fieldGear(next,next.heroes[0]).id,p.id);assert.ok(validBattlefield(next.field,[...next.heroes,...next.enemies]));
});

test('actual Battle spends one enemy tool use per multi-target swing and one for a miss',()=>{
 const heroes=[defaultHero(0),defaultHero(1)],e=makeEnemy('predator',1);heroes.forEach((h,i)=>{h.x=-i;h.y=0;});e.x=2;e.y=0;
 const b=new Battle({heroes,enemies:[e],chapter:1,context:{wild:true,fieldProps:[{type:'coil',x:1,y:0}]}}),p=fieldGear(b,e);heroes.forEach(h=>h.atb=1);e.atb=1;b.planEnemy(e);assert.equal(e.intent.fieldPhysical,true);const sweep={...e.intent,shape:'line',power:2};b.executeIntent(e,sweep);assert.equal(p.uses,1);assert.ok(heroes.every(h=>h.atb===.6));
 const miss=modifyFieldIntent(b,e,{kind:'strike',shape:'single',target:'missing',x:30,y:30,fromX:e.x,fromY:e.y,left:1,total:1,power:2,label:'Aimed miss'});b.executeIntent(e,miss);assert.equal(p.uses,0);assert.equal(fieldGear(b,e),null);
});
test('a counter-defeated carrier cannot restore the use spent on its attempted swing',()=>{
 const b=setup(['hook']),e=b.enemies[0],p=pickupEnemy(b),intent=modifyFieldIntent(b,e,{kind:'strike',shape:'line',label:'Swing',power:20,left:1,total:1});e.hp=0;releaseFieldGear(b,e);finishFieldIntent(b,e,intent);assert.equal(p.uses,1);assert.equal(p.ownerId,null);assert.equal(p.condition,'loose');
});
