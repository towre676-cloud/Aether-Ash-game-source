import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../world.js';
import {Battle,makeEnemy} from '../battle.js';
import {compileTechnique} from '../mako.js';
import {validateSave} from '../save-validation.js';
import {migrateObservatoryBattleSnapshot} from '../observatory-battle-migration.js';
import {source} from './opening-flow.mjs';

const copy=v=>JSON.parse(JSON.stringify(v));
function legacyEncounter(){
 const w=new World(source);w.newGame({originId:'veyr-storm'});w.state.mode='field';w.state.chronicle.step=2;w.state.chronicle.choices.repair=0;w.loadScene(50013);
 // The source summit is the actual pre-rebuild Veyr layout, retained as a
 // separate campaign place. Its connected cells model a real old encounter.
 const old=w.scenes.get(w.scene.originSource),start=old.arrive,queue=[start],seen=new Set([start.join(',')]);
 for(let i=0;i<queue.length&&queue.length<200;i++)for(const[dx,dy]of[[1,0],[0,1],[-1,0],[0,-1]]){const p=[queue[i][0]+dx,queue[i][1]+dy],k=p.join(',');if(old.floor[p[1]]?.[p[0]]==='.'&&!seen.has(k)){seen.add(k);queue.push(p);if(queue.length===200)break;}}
 const cells=queue.slice(0,200),lead={x:start[0]+.5,y:start[1]+.5},enemySpot=cells.find(([x,y])=>Math.hypot(x+.5-lead.x,y+.5-lead.y)>3)||cells.at(-1),assetSpot=cells[2];
 w.state.x=lead.x;w.state.y=lead.y;delete w.state.observatoryLayoutVersion;
 Object.assign(w.activeHeroes[0],lead);
 const enemy={...makeEnemy('scout',1,0,false),x:enemySpot[0]+.5,y:enemySpot[1]+.5};
 const b=new Battle({heroes:w.activeHeroes,enemies:[enemy],chapter:1,inventory:w.state.items,context:{version:1,tags:['wet'],wild:true,engagement:{version:1,walkCells:cells},walkable:cells,fieldProps:[{type:'plank',x:lead.x+1,y:lead.y},{type:'jar',x:lead.x,y:lead.y+1}],objective:{kind:'regulator',id:'legacy-regulator',walkable:cells,asset:{x:assetSpot[0]+.5,y:assetSpot[1]+.5},safeNodes:[{id:'west',label:'West angle',x:lead.x,y:lead.y}],deadline:90}}});
 b.time=8.5;b.heroes[0].atb=.72;b.heroes[0].mp=Math.max(0,b.heroes[0].mp-2);b.enemies[0].atb=.68;
 b.enemies[0].intent={kind:'strike',shape:'line',x:lead.x,y:lead.y,fromX:enemy.x,fromY:enemy.y,endX:lead.x+1,endY:lead.y+1,target:b.heroes[0].id,left:2,total:3,power:7};
 const tech=compileTechnique('flame','focus');b.fields.push({caster:b.heroes[0],tech,x:lead.x,y:lead.y,next:10,ticks:2});b.delayed.push({caster:b.heroes[0].id,targets:[enemy.id],tech,at:11,multiplier:.4});
 const n=b.instruments.safeNodes[0];b.instruments.coverage=[{id:'legacy-line',nodeId:n.id,x:n.x,y:n.y,x1:n.x-.4,y1:n.y,x2:n.x+.4,y2:n.y,charges:1,ownerId:b.heroes[0].id}];
 const o=w.objects().find(o=>o.type==='patrol'&&o.originId==='veyr-storm');
 return {schema:'ash-aether.enhanced-save/1',world:JSON.parse(w.save()),origin:{scene:50013,type:o.type,bit:o.bit,flag:o.flag_address},battle:b.snapshot()};
}
const resources=b=>({heroes:b.heroes.map(({x,y,intent,...a})=>a),enemies:b.enemies.map(({x,y,intent,...a})=>a),time:b.time,reinforcements:b.reinforcements,delayed:b.delayed,fieldCounters:b.field.props.map(({x,y,...p})=>p),objectiveProgress:b.objective&&{progress:b.objective.progress,pressure:b.objective.pressure,elapsed:b.objective.elapsed,hp:b.objective.asset.hp},instrumentUses:[b.instruments.listenUses,b.instruments.replayUses,b.instruments.coverageUses]});

test('actual legacy Veyr battle imports resume on compact native floor without changing resources or input',()=>{
 const value=legacyEncounter(),before=JSON.stringify(value),checked=validateSave(source,value);
 assert.equal(JSON.stringify(value),before);assert.equal(checked.world.mode,'battle');assert.equal(checked.world.observatoryLayoutVersion,1);assert.deepEqual(resources(checked.battle),resources(value.battle));
 for(const key of ['items','gold','xp','flags','chronicle','recruited','party'])assert.deepEqual(checked.world[key],value.world[key],key);
 const w=new World(source);w.restore(checked.world);const actors=[...checked.battle.heroes,...checked.battle.enemies];
 assert.ok(actors.every(a=>w.walkable(a.x,a.y)));assert.equal(new Set(actors.map(a=>Math.floor(a.x)+','+Math.floor(a.y))).size,actors.length);
 assert.ok(checked.battle.ecology.walkable.every(([x,y])=>w.walkable(x+.5,y+.5)));
 const b=new Battle({heroes:copy(w.activeHeroes),enemies:[],chapter:checked.battle.chapter,inventory:copy(w.state.items)});b.restore(copy(checked.battle));b.engagementFloor=checked.battle.context.engagement.walkCells;b.advance(0);
 assert.equal(b.ended,null);assert.equal(b.time,value.battle.time);assert.equal(b.enemies[0].intent.left,2);assert.equal(b.fields[0].next,10);assert.equal(b.delayed[0].at,11);
 const again=validateSave(source,checked);assert.deepEqual(again.battle,checked.battle,'already migrated snapshots never translate twice');
});

test('collision fitting separates displaced actors and preserves relative line geometry and non-spatial data',()=>{
 const v=legacyEncounter(),w=new World(source);w.restore(v.world);const raw=copy(v.battle);
 raw.heroes[0].x=raw.enemies[0].x=100;raw.heroes[0].y=raw.enemies[0].y=100;raw.heroes[0].status.x=42;raw.heroes[0].status.y=43;
 const original=JSON.stringify(raw),out=migrateObservatoryBattleSnapshot(raw,v.world,w.state,w.scene);
 assert.equal(JSON.stringify(raw),original);assert.ok([...out.heroes,...out.enemies].every(a=>w.walkable(a.x,a.y)));assert.ok(Math.hypot(out.heroes[0].x-out.enemies[0].x,out.heroes[0].y-out.enemies[0].y)>=.55);
 assert.equal(out.heroes[0].status.x,42);assert.equal(out.heroes[0].status.y,43);assert.equal(out.enemies[0].intent.target,raw.enemies[0].intent.target);
 const a=raw.instruments.coverage[0],b=out.instruments.coverage[0];assert.ok(Math.abs(Math.hypot(a.x2-a.x1,a.y2-a.y1)-Math.hypot(b.x2-b.x1,b.y2-b.y1))<1e-9);
 assert.throws(()=>migrateObservatoryBattleSnapshot(raw,{...v.world,observatoryLayoutVersion:1},w.state,w.scene),/actor outside its native floor/);
 assert.equal(migrateObservatoryBattleSnapshot(raw,v.world,w.state,{...w.scene,originId:'other'}),raw);
});

test('marked observatory snapshots cannot bypass actor or captured engagement-floor validation',()=>{
 const falseMarker=legacyEncounter();falseMarker.world.observatoryLayoutVersion=1;const original=JSON.stringify(falseMarker);
 assert.throws(()=>validateSave(source,falseMarker),/observatory.*native floor/);assert.equal(JSON.stringify(falseMarker),original);
 const current=validateSave(source,legacyEncounter());
 for(const mutate of [
  v=>{v.battle.enemies[0].x=100;v.battle.enemies[0].y=100;},
  v=>v.battle.context.engagement.walkCells.pop(),
  v=>v.battle.context.engagement.walkCells.push([0,0]),
  v=>v.battle.context.engagement.walkCells.push(v.battle.context.engagement.walkCells[0]),
  v=>v.battle.context.walkable.push([0,0]),
  v=>{v.battle.engagementFloor=[[0,0]];}
 ]){const bad=copy(current);mutate(bad);const before=JSON.stringify(bad);assert.throws(()=>validateSave(source,bad),/observatory.*floor/);assert.equal(JSON.stringify(bad),before);}
});

test('a native marked battle round-trips exactly and may rely on the host to attach its engagement floor',()=>{
 const current=validateSave(source,legacyEncounter()),w=new World(source);w.restore(current.world);
 const hero=copy(w.activeHeroes[0]);Object.assign(hero,{x:9.5,y:15.5});const enemy={...makeEnemy('scout',1,0,false),x:12.5,y:12.5};
 const battle=new Battle({heroes:[hero],enemies:[enemy],chapter:1,inventory:copy(w.state.items),context:{version:1,tags:[],engagement:{version:1}}});battle.time=4;hero.atb=.61;enemy.atb=.43;
 const native={...current,battle:battle.snapshot()},before=JSON.stringify(native),checked=validateSave(source,native);
 assert.equal(JSON.stringify(native),before);assert.deepEqual(checked.battle,native.battle);assert.equal(checked.world.mode,'battle');
 const resumed=new Battle({heroes:copy(w.activeHeroes),enemies:[],chapter:1});resumed.restore(copy(checked.battle));resumed.engagementFloor=[];for(let y=0;y<w.scene.height;y++)for(let x=0;x<w.scene.width;x++)if(w.walkable(x+.5,y+.5))resumed.engagementFloor.push([x,y]);resumed.advance(0);
 assert.equal(resumed.ended,null);assert.equal(resumed.time,4);assert.equal(resumed.heroes[0].atb,.61);assert.equal(resumed.enemies[0].atb,.43);
});

test('corrupt legacy battle data is rejected before spatial migration can repair it',()=>{
 const value=legacyEncounter();for(const mutate of [v=>v.battle.enemies[0].hp=-1,v=>v.battle.heroes[0].status=null,v=>v.battle.ecology.walkable=[[1.5,2]],v=>v.battle.field.props[0].uses=-1,v=>v.origin.scene=-1]){
  const bad=copy(value);mutate(bad);const before=JSON.stringify(bad);assert.throws(()=>validateSave(source,bad));assert.equal(JSON.stringify(bad),before);
 }
});
