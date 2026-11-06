import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIALS,shellFor,shellAppearance,drawShell,resolveShell} from '../environment-shells.js';
import {drawCombatEffect,drawBattleStatuses,intentReadiness} from '../combat-visuals.js';

function canvasRecorder(){
 const calls=[],styles=[],stack=[];let depth=0;
 const c=new Proxy({}, {
  set(target,key,value){if(typeof value==='number'){assert.ok(Number.isFinite(value),key);if(key==='globalAlpha')assert.ok(value>=0&&value<=1,'opacity stays within its canvas range');}target[key]=value;styles.push([key,value]);return true;},
  get(target,key){if(key in target)return target[key];return (...args)=>{for(const n of args.flat())if(typeof n==='number')assert.ok(Number.isFinite(n),String(key));if(key==='save'){depth++;stack.push(1);}if(key==='restore'){assert.ok(stack.length,'restore has matching save');stack.pop();depth--;}calls.push([key,args]);};}
 });
 return {c,calls,styles,verify(){assert.equal(depth,0,'drawing leaves canvas state balanced');}};
}

test('material coats are visibly distinct and real damage removes their surface coverage',()=>{
 const distinct=new Set();for(const material of Object.keys(MATERIALS)){
  const shell=shellFor(material),intact=shellAppearance(shell);distinct.add(intact.fill);
  assert.ok(intact.pieces>0);const worn=shellAppearance({...shell,integrity:.24});assert.ok(worn.pieces<intact.pieces);assert.ok(worn.cracked);
  assert.equal(shellAppearance({...shell,integrity:0}).pieces,0);
 }assert.equal(distinct.size,Object.keys(MATERIALS).length);
 assert.equal(shellAppearance({material:'unrecognized',integrity:1}),null);
});

test('saturation, firing, charring, charge and brittleness use the actual coat state',()=>{
 const clay=shellFor('clay');assert.notEqual(shellAppearance(clay).fill,shellAppearance({...clay,soaked:true}).fill);assert.notEqual(shellAppearance(clay).fill,shellAppearance({...clay,fired:true}).fill);
 const reed=shellFor('reed');assert.notEqual(shellAppearance(reed).fill,shellAppearance({...reed,charred:true}).fill);
 const mineral=shellFor('mineral');assert.notEqual(shellAppearance(mineral).light,shellAppearance({...mineral,charged:true}).light);
 assert.ok(shellAppearance({...clay,brittle:true}).cracked);
});

test('shell reaction metadata identifies the affected material and exact before/after wear',()=>{
 const events=[],target={shell:shellFor('ash'),status:{}};const damage=resolveShell({event:e=>events.push(e)},target,100,{core:'tide'});
 assert.equal(damage,120);assert.equal(target.shell.integrity,0);assert.equal(events.length,1);
 assert.equal(events[0].material,'ash');assert.equal(events[0].shellBefore,1);assert.equal(events[0].shellAfter,0);assert.equal(events[0].actor,target);
 const c=canvasRecorder();assert.equal(drawCombatEffect(c.c,{kind:'reaction',reaction:events[0].reaction,...events[0],kind:'reaction',x:3,y:4,t:.3,life:.9},48),true);c.verify();
});

test('every material and wear state draws with finite bounded canvas work in both modes',()=>{
 for(const material of Object.keys(MATERIALS))for(const integrity of [1,.56,.12,0])for(const compatibility of [false,true]){
  const shell={...shellFor(material),integrity,soaked:true,brittle:true,charred:material==='reed',charged:material==='mineral'},before=structuredClone(shell),r=canvasRecorder();
  drawShell(r.c,{x:2,y:3,shell},48,{time:12.7,compatibility});r.verify();assert.deepEqual(shell,before,'rendering cannot change combat');assert.ok(r.calls.length<500,'fixed fragment budget');if(integrity===0)assert.equal(r.calls.length,0);
 }
});

test('wind-up indicator is continuous and handles expired or legacy intents safely',()=>{
 assert.equal(intentReadiness(null),0);assert.equal(intentReadiness({total:0,left:0}),0);assert.equal(intentReadiness({total:2,left:2}),0);assert.equal(intentReadiness({total:2,left:1}),.5);assert.equal(intentReadiness({total:2,left:-1}),1);
 for(const left of [2,1,.1,0]){const r=canvasRecorder();drawBattleStatuses(r.c,{time:1,heroes:[],enemies:[{hp:10,x:2,y:3,status:{},intent:{total:2,left}}]},48,1);r.verify();assert.ok(r.calls.length<70);}
});

test('directional impacts and shed particles stay bounded with old and new events',()=>{
 for(const p of [0,.25,.75,1])for(const f of [{kind:'slash'},...Object.keys(MATERIALS).map(material=>({kind:'reaction',reaction:'shatter',material,shellAfter:0,shellState:'brittle',label:'Coat shed'}))]){
  const r=canvasRecorder();assert.equal(drawCombatEffect(r.c,{...f,x:3,y:4,fromX:1,fromY:2,t:p,life:1},48),true);r.verify();assert.ok(r.calls.length<160,'localized effects have a fixed particle budget');
 }
 const r=canvasRecorder();assert.equal(drawCombatEffect(r.c,{kind:'slash',x:2,y:1,t:0,life:0},48),true);r.verify();
 assert.equal(drawCombatEffect(r.c,{kind:'unrelated'},48),false);
});
