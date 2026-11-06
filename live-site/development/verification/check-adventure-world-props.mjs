#!/usr/bin/env node
/** Saved-state visual checks against real authored campaign objects.
 * Mesh changes establish state response; screenshots establish appearance.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {World} from '../../dist/game/engine2/world.js';
import {Geometry} from '../../dist/game/engine2/cistern-renderer.js';
import {adventurePropFamily,appendAdventureStaticProps,appendAdventureWorldProps} from '../../dist/game/engine2/adventure-world-props.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),source=JSON.parse(readFileSync(resolve(ROOT,'dist/game/engine2/world.json'),'utf8'));
const report={schema:'ash-aether.adventure-props-state-check/1',release:'5.31',checked_at_utc:new Date().toISOString(),checks:[],limits:['Actual authored state and emitted meshes are checked independently of native reward/dialogue progression.','Comparisons use one identical animation time, so a state response cannot pass merely because a clock advanced.'],passed:false};
function worldAt(id){const w=new World(source);w.newGame({quiet:true});w.state.scene=id;w.state.chapter=w.scene.chapter||1;w.state.story.parcel=true;w.state.story.weapon=true;w.state.story.firstCore=true;w.objects();return w;}
function draw(w,objects){w.objects();const before=w.save(),body=new Geometry(),moving=new Geometry(),glow=new Geometry(),a=appendAdventureStaticProps(body,{world:w,objects}),b=appendAdventureWorldProps(moving,glow,{world:w,objects,time:10,range:Infinity});assert.equal(w.save(),before,'prop presentation never changes a save');for(const m of[body,moving,glow])for(const n of m.v)assert.ok(Number.isFinite(n),'finite prop vertex');return{static:body.v,dynamic:[...moving.v,...glow.v],stats:{static:a,dynamic:b}};}
function different(a,b,label){assert.notDeepEqual(a,b,label);}
function stateCase(id,type,change,label,select=()=>true){const a=worldAt(id),ao=a.scene.objects.find(o=>o.type===type&&select(o));assert.ok(ao,'actual '+label+' object');const b=worldAt(id),bo=b.scene.objects.find(o=>o.type===type&&select(o));change(b,bo);const before=draw(a,[ao]),after=draw(b,[bo]);assert.ok(before.static.length>0);different(before.dynamic,after.dynamic,label+' responds to native state at the same clock');report.checks.push({label,scene:id,type,family:adventurePropFamily(a,ao),native_state_changes_mesh:true,save_unchanged:true,finite:true});}
try{
 stateCase(135,'puzzle',(w,o)=>w.setBit(w.flagFor(o),o.bit),'rail bridge control completion');
 stateCase(47,'puzzle',(w,o)=>w.setBit(...o.stage_flag),'two-stage drainage valve midpoint',o=>!!o.stage_flag);
 stateCase(292,'note',(w,o)=>w.state.flags['sequence:'+o.sequence_address]=1,'bell phrase first-note progress');
 stateCase(112,'note',(w,o)=>w.state.flags['sequence:'+o.sequence_address]=1,'field stone first-note progress');
 stateCase(112,'note',(w,o)=>w.setBit(w.flagFor(o),o.completes_bit),'field stone completed phrase');
 stateCase(61,'project',(w,o)=>{w.setBit(w.flagFor(o),o.bit);w.state.project|=1<<o.project_bit;},'public work committed branch');
 stateCase(406,'aid',(w,o)=>w.setBit(w.flagFor(o),o.bit),'lowbank shelter powered');
 const before=worldAt(2000);before.state.frontiers={version:1,active:'commission-0',stages:{'commission-0':1},claimed:[],visited:[]};const after=worldAt(2000);after.state.frontiers={version:1,active:'commission-0',stages:{'commission-0':2},claimed:[],visited:[]};
 const initial=draw(before),restored=draw(after);assert.ok(initial.stats.static.families.valve>0&&restored.stats.static.families.valve>0,'repaired frontier apparatus remains a visible prop after interaction marker disappears');different(initial.dynamic,restored.dynamic,'frontier apparatus responds to native repair stage');report.checks.push({label:'frontier repaired apparatus persists',scene:2000,family:'valve',static_prop_retained:true,native_state_changes_mesh:true,save_unchanged:true});
 let hidden=0;const all=worldAt(2);for(const[id,scene]of all.scenes){all.state.scene=id;for(const o of scene.objects||[])if(o.type==='secret'||o.hidden){hidden++;assert.equal(adventurePropFamily(all,o),null,'hidden treasure receives no new visible prop');}}
 assert.ok(hidden>=72);report.hidden_rewards={objects:hidden,new_visible_props:0};report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
const path=resolve(ROOT,process.argv.find(v=>v.startsWith('--report='))?.slice(9)||'docs/verification/adventure-props-state-5.31.json');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,hidden:report.hidden_rewards?.objects,error:report.error?.message||null,report:path}));
