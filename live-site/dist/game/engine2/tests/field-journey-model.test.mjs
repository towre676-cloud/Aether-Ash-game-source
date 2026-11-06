import test from 'node:test';
import assert from 'node:assert/strict';
import {captureFieldProgress,fieldVictoryReport} from '../field-journey-model.js';

function fixture(){
 const state={scene:15,chapter:1,mode:'field',xp:0,gold:4,party:[0],bosses:[],items:{tonic:2},heroes:[{id:0,name:'Sable',level:1,ap:{flame:26},loadout:[{core:'flame'}]}]};
 return {state,done:o=>o.bit===1&&state.flags?.won===true};
}

test('capture does not create ledgers or retain mutable state references',()=>{
 const w=fixture(),original=JSON.stringify(w.state),before=captureFieldProgress(w);
 assert.equal(JSON.stringify(w.state),original);assert.equal(w.state.economy,undefined);assert.equal(w.state.objectiveHistory,undefined);
 w.state.heroes[0].ap.flame=34;w.state.items.tonic=0;w.state.party.push(1);
 assert.equal(before.heroes[0].ap.flame,26);assert.equal(before.items.tonic,2);assert.equal(before.heroes.length,1);
});

test('victory reports exact XP, credits, material and item changes without predicted loot',()=>{
 const w=fixture(),before=captureFieldProgress(w);w.state.xp=28;w.state.gold=15;w.state.items={tonic:1,mossWrap:1};w.state.economy={goods:{metal:2,glass:1,fiber:0}};w.state.heroes[0].ap.flame=30;
 const report=fieldVictoryReport(w,before,{object:{type:'wild'}});
 assert.deepEqual(report.rewards,['+28 XP','+11 credits','+2 Reclaimed metal','+1 Resonant glass','-1 Tonic','+1 Moss wrap']);
 assert.match(report.progress.join(' '),/Flame.*\+4 AP.*5 AP to rank 2/);assert.equal(report.worldChange,'');
});

test('earned rank and growth point reports use actual before and after values',()=>{
 const w=fixture();w.state.heroes[0].ap.flame=33;const before=captureFieldProgress(w);
 w.state.xp=65;w.state.heroes[0].level=2;w.state.heroes[0].ap.flame=37;
 const report=fieldVictoryReport(w,before,{type:'patrol'}),lines=report.progress.join(' ');
 assert.match(lines,/Sable reached level 2/);assert.match(lines,/earned 2 growth points · 2 available in Crew setup/);
 assert.match(lines,/Flame · Rank 2 earned · \+4 AP · 83 AP to rank 3/);assert.equal(report.worldChange,'');
});

test('the two closest mastery goals are bounded and earned ranks take precedence',()=>{
 const w=fixture();w.state.heroes[0].loadout=[{core:'flame'},{core:'frost'},{core:'tide'},{core:'flame'}];w.state.heroes[0].ap={flame:1,frost:29,tide:118};const before=captureFieldProgress(w);
 w.state.heroes[0].ap={flame:5,frost:33,tide:122};const lines=fieldVictoryReport(w,before,{type:'wild'}).progress;
 assert.equal(lines.length,2);assert.match(lines[0],/Tide · Rank 3 earned · \+4 AP · mastered/);assert.match(lines[1],/Frost.*2 AP to rank 2/);assert.doesNotMatch(lines.join(' '),/Flame/);
});

test('local aid changes name their existing mechanical effect and are reported only once',()=>{
 const w=fixture();w.state.objectiveHistory={version:1,records:[],aids:{15:{supply:true}}};const before=captureFieldProgress(w);
 w.state.objectiveHistory.aids[15].escort=true;w.state.objectiveHistory.aids[15].signal=true;
 const change=fieldVictoryReport(w,before,{type:'wild',objectiveOutcome:{nonlethal:true}});
 assert.equal(change.title,'Encounter resolved peacefully');assert.match(change.worldChange,/shorter route and gain 12 integrity/);assert.match(change.worldChange,/six seconds/);assert.doesNotMatch(change.worldChange,/spare brace/);
 assert.equal(fieldVictoryReport(w,captureFieldProgress(w),{type:'wild'}).worldChange,'');
});

test('a confirmed patrol clearance and actual guardian milestone have physical consequences',()=>{
 const w=fixture(),before=captureFieldProgress(w);w.state.flags={won:true};
 assert.match(fieldVictoryReport(w,before,{object:{type:'patrol',bit:1}}).worldChange,/patrol is gone/);
 assert.equal(fieldVictoryReport(w,before,{object:{type:'boss'}}).worldChange,'');w.state.bosses.push(1);
 assert.match(fieldVictoryReport(w,before,{object:{type:'boss'}}).worldChange,/story milestone is complete/);
});

test('expedition progress distinguishes a future shelter from the refuge actually unlocked',()=>{
 const w=fixture(),before=captureFieldProgress(w);
 assert.equal(fieldVictoryReport(w,before,{type:'wild'},{wins:2,refugeUnlocked:false}).worldChange,'Trail refuge: 2 / 3 encounters resolved.');
 const complete=fieldVictoryReport(w,before,{type:'wild'},{wins:3,refugeUnlocked:true});assert.match(complete.worldChange,/Trail refuge restored/);assert.match(complete.worldChange,/25% max HP and 20% max MP/);
});

test('an unchanged settlement invents neither resources nor progress and tolerates absent optional ledgers',()=>{
 const w=fixture(),before=captureFieldProgress(w),original=JSON.stringify(w.state),report=fieldVictoryReport(w,before,{type:'wild'});
 assert.deepEqual(report.rewards,[]);assert.deepEqual(report.progress,[]);assert.equal(report.worldChange,'');assert.equal(JSON.stringify(w.state),original);
});
