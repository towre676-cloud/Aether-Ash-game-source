import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Battle,makeEnemy} from '../battle.js';
import {compileTechnique} from '../mako.js';
import {frontierFloorPlan541,legacyFrontierFloor541} from '../frontier-authoring-541.js';
import {migrateFrontierBattleSnapshot,validateFrontierBattleFloor} from '../frontier-battle-541.js';
const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url))),copy=v=>JSON.parse(JSON.stringify(v));
const cells=s=>s.floor.flatMap((row,y)=>[...row].flatMap((v,x)=>v==='.'?[[x,y]]:[]));
function fixture(region=0,location=2000){
 const world=new World(source);world.newGame({quiet:true});world.state.scene=location;world.state.mode='field';world.state.x=15.5;world.state.y=15.5;delete world.state.frontierLayoutVersion;
 const scene={...frontierFloorPlan541(region,0),location,...(location===4700?{fieldOrigin:0}:{})},legacy=legacyFrontierFloor541(region,0),all=cells(legacy),removed=all.find(([x,y])=>scene.floor[y][x]!=='.'&&x>10&&x<21&&y>10&&y<21),valid=[25,20];assert.ok(removed,'fixture uses an actual removed legacy walking cell');
 const hero=copy(world.activeHeroes[0]);Object.assign(hero,{x:removed[0]+.5,y:removed[1]+.5});
 const enemy={...makeEnemy('scout',1,0,false),x:valid[0]+.5,y:valid[1]+.5};
 const patch=all.filter(([x,y])=>Math.hypot(x-removed[0],y-removed[1])<9).slice(0,180),asset=patch.find(([x,y])=>Math.hypot(x-removed[0],y-removed[1])>1)||patch[0];
 if(!patch.some(p=>p[0]===valid[0]&&p[1]===valid[1]))patch.push(valid);
 const b=new Battle({heroes:[hero],enemies:[enemy],inventory:{tonic:2},chapter:2,context:{version:1,tags:['wet'],wild:true,walkable:patch,engagement:{version:1,walkCells:all},fieldProps:[{type:'plank',x:hero.x,y:hero.y},{type:'jar',x:enemy.x,y:enemy.y}],objective:{kind:'regulator',id:'legacy-frontier-regulator',walkable:patch,asset:{x:asset[0]+.5,y:asset[1]+.5},safeNodes:[{id:'angle',label:'Field angle',x:hero.x,y:hero.y}],deadline:90}}});
 b.time=8.5;b.heroes[0].atb=.72;b.heroes[0].mp=0;b.heroes[0].status.x=42;b.heroes[0].status.y=43;b.enemies[0].atb=.68;
 b.enemies[0].intent={kind:'strike',shape:'line',x:hero.x,y:hero.y,fromX:enemy.x,fromY:enemy.y,endX:hero.x+.6,endY:hero.y,target:hero.id,left:2,total:3,power:7};
 const tech=compileTechnique('flame','focus');b.fields.push({caster:hero,tech,x:hero.x,y:hero.y,next:10,ticks:2});b.delayed.push({caster:hero.id,targets:[enemy.id],tech,at:11,multiplier:.4});
 const n=b.instruments.safeNodes[0];b.instruments.coverage=[{id:'legacy-line',nodeId:n.id,x:n.x,y:n.y,x1:n.x-.4,y1:n.y,x2:n.x+.4,y2:n.y,charges:1,ownerId:hero.id}];
 const oldWorld={...JSON.parse(world.save()),scene:location,x:hero.x,y:hero.y},newWorld={...oldWorld,x:4.5,y:23.5,frontierLayoutVersion:1};
 return{world,scene,oldWorld,newWorld,battle:b.snapshot(),valid,removed};
}
function nonSpatial(value){const b=copy(value);for(const a of[...b.heroes,...b.enemies]){delete a.x;delete a.y;if(a.intent)for(const k of['x','y','fromX','fromY','endX','endY','toX','toY','targetX','targetY','x1','y1','x2','y2'])delete a.intent[k];}for(const f of b.fields){delete f.x;delete f.y;}delete b.context;for(const p of [...b.field.props,...b.field.cover]){delete p.x;delete p.y;}for(const o of[b.objective,b.instruments])if(o){delete o.walkable;for(const p of[o.asset,o.decoy,...(o.route||[]),...(o.safeNodes||[]),...(o.coverage||[])])if(p)for(const k of['x','y','x1','y1','x2','y2'])delete p[k];}if(b.ecology){delete b.ecology.walkable;for(const r of b.ecology.creatures)for(const p of[r.den,r.lure])if(p){delete p.x;delete p.y;}}return b;}
function open(scene,p){return scene.floor[Math.floor(p.y)]?.[Math.floor(p.x)]==='.';}
test('legacy frontier actors fit only removed land while native court actors, resources and saved counters remain exact',()=>{
 const f=fixture(),before=JSON.stringify(f.battle),out=migrateFrontierBattleSnapshot(f.battle,f.oldWorld,f.newWorld,f.scene);
 assert.equal(JSON.stringify(f.battle),before);assert.notDeepEqual([out.heroes[0].x,out.heroes[0].y],[f.battle.heroes[0].x,f.battle.heroes[0].y]);assert.deepEqual(out.enemies[0],{...f.battle.enemies[0],intent:out.enemies[0].intent},'the valid court actor does not translate with the moved player');
 assert.ok([...out.heroes,...out.enemies].every(a=>open(f.scene,a)));assert.ok(Math.hypot(out.heroes[0].x-out.enemies[0].x,out.heroes[0].y-out.enemies[0].y)>=.55);
 assert.deepEqual(nonSpatial(out),nonSpatial(f.battle),'HP/MP, gear uses, tactics, objective pressure/progress, timers, identities and rewards survive unchanged');
 assert.equal(out.heroes[0].status.x,42);assert.equal(out.heroes[0].status.y,43);assert.equal(out.time,8.5);assert.equal(out.enemies[0].intent.left,2);assert.equal(out.fields[0].next,10);assert.equal(out.delayed[0].at,11);
 const a=f.battle.instruments.coverage[0],b=out.instruments.coverage[0];assert.ok(Math.abs(Math.hypot(a.x2-a.x1,a.y2-a.y1)-Math.hypot(b.x2-b.x1,b.y2-b.y1))<1e-9,'coverage keeps its exact length when its invalid centre is fitted');
 const resumed=new Battle({heroes:copy(out.heroes),enemies:[],chapter:out.chapter,inventory:{tonic:2}});resumed.restore(copy(out));resumed.engagementFloor=cells(f.scene);resumed.advance(0);assert.equal(resumed.time,8.5);assert.equal(resumed.ended,null);
});
test('captured engagement topology becomes the exact native floor while bounded local masks include their fitted objective and ecology positions',()=>{
 const f=fixture(),out=migrateFrontierBattleSnapshot(f.battle,f.oldWorld,f.newWorld,f.scene),all=cells(f.scene);
 assert.deepEqual(out.context.engagement.walkCells,all);for(const m of[out.context.walkable,out.objective.walkable,out.ecology.walkable]){assert.ok(m.length>0&&m.length<=256);assert.ok(m.every(([x,y])=>f.scene.floor[y]?.[x]==='.'));assert.equal(new Set(m.map(p=>p.join(','))).size,m.length);}
 for(const p of[out.objective.asset,...out.objective.route,...out.ecology.creatures.flatMap(r=>[r.den,r.lure].filter(Boolean))])assert.ok(open(f.scene,p));
 assert.equal(out.context.frontierLayoutVersion,1);assert.equal(validateFrontierBattleFloor(out,f.scene),true);assert.equal(migrateFrontierBattleSnapshot(out,f.oldWorld,f.newWorld,f.scene),out,'snapshot provenance prevents a second adaptation');
 assert.equal(migrateFrontierBattleSnapshot(out,{...f.newWorld},f.newWorld,f.scene),out,'marked native payloads retain reference identity');
});
test('marked payloads cannot forge masks or actors and corrupt legacy state is rejected before collision fitting',()=>{
 const f=fixture(),current=migrateFrontierBattleSnapshot(f.battle,f.oldWorld,f.newWorld,f.scene);
 for(const mutate of[b=>b.context.engagement.walkCells.pop(),b=>b.context.engagement.walkCells.push([0,0]),b=>b.context.engagement.walkCells.push(b.context.engagement.walkCells[0]),b=>{b.heroes[0].x=0;b.heroes[0].y=0;},b=>{b.context.walkable=[[0,0]];}]){const bad=copy(current);mutate(bad);const before=JSON.stringify(bad);assert.throws(()=>migrateFrontierBattleSnapshot(bad,f.newWorld,f.newWorld,f.scene),/frontier.*floor/);assert.equal(JSON.stringify(bad),before);}
 for(const mutate of[b=>b.heroes[0].hp=-1,b=>b.heroes[0].status=null,b=>b.ecology.walkable=[[1.5,2]],b=>b.context.engagement.walkCells.push([0,0]),b=>b.field.props[0].uses=-1,b=>{b.heroes[0].x=0;b.heroes[0].y=0;}]){const bad=copy(f.battle);mutate(bad);assert.throws(()=>migrateFrontierBattleSnapshot(bad,f.oldWorld,f.newWorld,f.scene));}
 assert.equal(migrateFrontierBattleSnapshot(f.battle,f.oldWorld,f.newWorld,{...f.scene,location:1999}),f.battle);
});
test('valid overlapping court actors stay exact while only invalid actors receive distinct new cells',()=>{
 const f=fixture(),raw=copy(f.battle),hero=raw.heroes[0],enemy=raw.enemies[0];Object.assign(hero,{x:15.5,y:15.5});Object.assign(enemy,{x:15.5,y:15.5});
 const out=migrateFrontierBattleSnapshot(raw,f.oldWorld,f.newWorld,f.scene);assert.ok(open(f.scene,out.heroes[0])&&open(f.scene,out.enemies[0]));assert.ok(Math.hypot(out.heroes[0].x-out.enemies[0].x,out.heroes[0].y-out.enemies[0].y)>=.55);
 const native=copy(out);Object.assign(native.heroes[0],{x:25.5,y:20.5});Object.assign(native.enemies[0],{x:25.5,y:20.5});assert.equal(migrateFrontierBattleSnapshot(native,f.newWorld,f.newWorld,f.scene),native,'native valid overlaps are combat state, not a reason to move actors');
});
test('borrowed field-origin snapshots use their source frontier metadata and preserve the original trial enemy anchors',()=>{
 const f=fixture(10,4700),raw=copy(f.battle);Object.assign(raw.heroes[0],{x:14.5,y:21.5});Object.assign(raw.enemies[0],{x:12.5,y:21.5});
 const out=migrateFrontierBattleSnapshot(raw,f.oldWorld,f.newWorld,f.scene);assert.notEqual(out,raw,'the recognized field-origin clone receives topology migration');
 assert.deepEqual([out.heroes[0].x,out.heroes[0].y],[14.5,21.5]);assert.deepEqual([out.enemies[0].x,out.enemies[0].y],[12.5,21.5]);assert.deepEqual(nonSpatial(out),nonSpatial(raw));assert.equal(validateFrontierBattleFloor(out,f.scene),true);
 assert.equal(migrateFrontierBattleSnapshot(out,f.oldWorld,f.newWorld,f.scene),out);assert.equal(migrateFrontierBattleSnapshot(raw,f.oldWorld,f.newWorld,{...f.scene,fieldOrigin:1}),raw,'a mismatched borrowed-trial identity is outside the authoring scope');
});
