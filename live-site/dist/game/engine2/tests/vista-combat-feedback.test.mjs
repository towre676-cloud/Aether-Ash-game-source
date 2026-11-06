import test from 'node:test';
import assert from 'node:assert/strict';
import {VistaCombatFeedback} from '../vista-combat-feedback.js';

const hit=(extra={})=>({type:'damage',physical:true,amount:12,actor:{id:7,x:5,y:6,hp:50,armor:0},source:{id:1,x:3,y:6},...extra});
const result=(kind,extra={})=>({type:'tactical-result',kind,actor:{id:7,x:5,y:6,hp:50,armor:0},amount:8,...extra});
function freeze(o){if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
function context(){
 const calls=[],c={calls,depth:0,save(){this.depth++;},restore(){this.depth--;},measureText(s){return {width:s.length*6};}};
 for(const name of ['beginPath','closePath','moveTo','lineTo','stroke','fill','fillRect','strokeRect','translate','rotate','fillText'])c[name]=(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),name+' has a nonfinite coordinate');calls.push([name,...args]);};
 return c;
}
function draw(v){const c=context();v.drawGround(c);v.drawForeground(c);assert.equal(c.depth,0);return c.calls;}
const labels=calls=>calls.filter(c=>c[0]==='fillText').map(c=>c[1]);

test('sparks require confirmed positive direct physical damage, never input or periodic damage',()=>{
 const v=new VistaCombatFeedback();
 for(const e of [hit({physical:false}),hit({amount:0}),hit({amount:NaN}),hit({dot:true}),hit({source:null}),hit({actor:{x:Infinity,y:6}}),hit({actor:{x:1e308,y:6}}),{type:'cast'},{type:'enemy-cast'},{type:'boss_telegraph'},{type:'guard'},{type:'dodge'},null])assert.equal(v.event(e),false);
 assert.equal(v.activeCount,0);assert.equal(v.event(hit()),true);assert.equal(v.activeCount,1);
});
test('tactical result vocabulary maps to the affected actor and rejects contradictory result payloads',()=>{
 const v=new VistaCombatFeedback();
 for(const kind of ['armor-break','guard','evade'])assert.equal(v.event(result(kind)),true);
 assert.deepEqual(labels(draw(v)),['Armor broken','Guard held','Evaded']);
 for(const e of [result('guard',{amount:0}),result('guard',{amount:NaN}),result('armor-break',{actor:{x:3,y:4,hp:0,armor:0}}),result('armor-break',{actor:{x:3,y:4,hp:30,armor:8}}),result('critical'),result('evade',{actor:{x:NaN,y:5}})])assert.equal(v.event(e),false);
 assert.equal(v.activeCount,3);
 const target={id:8,x:9,y:10,hp:25,armor:0};assert.equal(v.event(result('armor-break',{target})),true);
 assert.ok(draw(v).some(c=>c[0]==='fillText'&&c[1]==='Armor broken'&&c[3]===10*48+31));
});
test('events, actors, sampled ground and world state remain unchanged and are not retained',()=>{
 const sample=freeze({wetness:.8,conduction:.5,cover:.6}),state=freeze({hp:90,inventory:['clay'],save:{sequence:44}});
 const world=freeze({state,reconciledGround:{surface:()=>sample}}),e=freeze(hit()),before=JSON.stringify({e,state,sample});
 const v=new VistaCombatFeedback();assert.equal(v.event(e,world),true);v.tick(.1);draw(v);
 assert.equal(JSON.stringify({e,state,sample}),before);
 const moving=hit();v.event(moving,world);moving.actor.x=500;moving.actor.y=600;
 const translations=draw(v).filter(c=>c[0]==='translate');assert.ok(translations.every(c=>c[1]===5*48&&c[2]===6*48-25));
});
test('same event object and explicit event identifiers are idempotent until scene reset',()=>{
 const v=new VistaCombatFeedback(),e=hit({eventId:'battle:1'});let samples=0;
 const world={reconciledGround:{surface:()=>{samples++;return {wetness:1};}}};
 assert.equal(v.event(e,world),true);assert.equal(v.event(e,world),false);assert.equal(v.event(hit({eventId:'battle:1'}),world),false);
 assert.equal(v.event(hit({id:0}),world),true);assert.equal(v.event(hit({id:0}),world),false);assert.equal(samples,2);
 v.reset();assert.equal(v.activeCount,0);assert.equal(v.event(e,world),true);
});
test('hit floods cannot evict tactical labels and repeated results do not flood one actor',()=>{
 const v=new VistaCombatFeedback();v.event(result('guard'));
 for(let i=0;i<200;i++)v.event(hit({eventId:'hit:'+i}));
 assert.ok(v.activeCount<=13);assert.deepEqual(labels(draw(v)),['Guard held']);
 for(let i=0;i<20;i++)v.event(result('guard'));
 assert.ok(v.activeCount<=13);assert.deepEqual(labels(draw(v)),['Guard held']);
 for(let i=0;i<20;i++)v.event(result('armor-break',{actor:{id:i+100,x:i,y:5,hp:10,armor:0}}));
 assert.ok(v.activeCount<=18);assert.ok(labels(draw(v)).length<=6);
});
test('surface queries are bounded per host frame and failure cannot suppress confirmed results',()=>{
 const v=new VistaCombatFeedback();let samples=0;
 const world={reconciledGround:{surface:()=>{samples++;throw Error('surface unavailable');}}};
 for(let i=0;i<50;i++)assert.equal(v.event(hit(),world),true);
 assert.equal(samples,4);v.tick(.016);v.event(hit(),world);assert.equal(samples,5);
 assert.equal(v.event(result('guard'),world),true);assert.deepEqual(labels(draw(v)),['Guard held']);assert.equal(samples,5);
});
test('quality changes optional density while compatibility and reduced motion retain every result label',()=>{
 const v=new VistaCombatFeedback();v.event(hit());for(const kind of ['armor-break','guard','evade'])v.event(result(kind));
 v.tick(0,{quality:'high'});const high=draw(v),expected=labels(high),count=v.activeCount;
 v.tick(0,{quality:'low'});const low=draw(v);assert.deepEqual(labels(low),expected);assert.ok(low.length<high.length);
 for(const options of [{steady:true},{compatibility:true},{quality:'low',steady:true,compatibility:true}]){
  v.tick(0,options);const quiet=draw(v);assert.deepEqual(labels(quiet),expected);assert.ok(!quiet.some(c=>c[0]==='translate'));assert.equal(v.activeCount,count);
 }
});
test('visual time is bounded, invalid deltas are harmless, and suspended frames expire stale cues',()=>{
 const v=new VistaCombatFeedback();v.event(hit());v.event(result('evade'));
 for(const dt of [-1,NaN,Infinity])v.tick(dt);assert.equal(v.activeCount,2);
 v.tick(.3);assert.equal(v.activeCount,1);assert.deepEqual(labels(draw(v)),['Evaded']);
 v.tick(20);assert.equal(v.activeCount,0);assert.deepEqual(labels(draw(v)),[]);
});
test('identifier memory is bounded to the active scene and reset clears stale visuals',()=>{
 const v=new VistaCombatFeedback();v.event(hit({eventId:'old'}));
 for(let i=0;i<250;i++)v.event(hit({eventId:'later:'+i}));
 assert.equal(v.event(hit({eventId:'old'})),true);v.reset();assert.equal(v.activeCount,0);
 assert.equal(v.event(hit({eventId:'later:249'})),true);v.tick(.3);assert.equal(v.activeCount,0);
});
