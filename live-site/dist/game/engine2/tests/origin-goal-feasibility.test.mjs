import assert from 'node:assert/strict';
import test from 'node:test';
import {flow} from './opening-flow.mjs';
import {ORIGINS} from '../origin-content.js?v=5.6.0';
import {findPath} from '../navigation.js';
import {advanceEncounters,encounterHabitat} from '../field-encounters.js';
import {Battle} from '../battle.js?v=5.6.0';
import {buildWildEnemies,wildPositions} from '../wild-combat.js';
import {combatContext} from '../combat-reactions.js';
import {battlefieldContext} from '../battlefield-context.js';
import {objectiveEncounterContext} from '../objective-context.js';
import {livingEncounterContext} from '../living-world.js';
import {positionActions} from '../combat-position.js';
import {objectiveActions} from '../encounter-objectives.js';
function walk(w,path,check=false,rng=()=>.5){for(const [x,y]of path){for(let i=0;i<100;i++){const d=Math.hypot(x-w.state.x,y-w.state.y);if(d<.01)break;const old=[w.state.x,w.state.y];w.move((x-w.state.x)/d*Math.min(d,.265),(y-w.state.y)/d*Math.min(d,.265));const moved=Math.hypot(w.state.x-old[0],w.state.y-old[1]);if(moved<.001)break;if(check){const o=advanceEncounters(w,moved,{dt:.1,rng});if(o)return o;}}}return null;}
for(const o of ORIGINS)test(o.id+' first walked wild encounter supports its real nonlethal goal',()=>{for(const roll of [0,.5,.99]){const helper=flow(),w=helper.w;w.newGame({originId:o.id});helper.finish();if(!encounterHabitat(w.scene)){const door=w.objects().find(x=>x.originTravel===1);walk(w,findPath(w.scene,[w.state.x,w.state.y],door.xy,1));assert.ok(Math.hypot(w.state.x-door.xy[0]-.5,w.state.y-door.xy[1]-.5)<2.2,'the worksite entrance is reached on foot');helper.use(door);}
 let obj;for(let lap=0;lap<4&&!obj;lap++){const cells=[];for(let y=0;y<w.scene.height;y++)for(let x=0;x<w.scene.width;x++)if(w.scene.floor[y]?.[x]==='.')cells.push([x,y]);cells.sort((a,b)=>Math.hypot(b[0]-w.state.x,b[1]-w.state.y)-Math.hypot(a[0]-w.state.x,a[1]-w.state.y));for(const cell of cells){const path=findPath(w.scene,[w.state.x,w.state.y],cell);if(path.length>4){obj=walk(w,path,true,()=>roll);if(obj)break;}}}
 assert.ok(obj,o.id+' has a reachable first encounter');w.startWildEncounter(obj);const enemies=buildWildEnemies(w,obj),spots=wildPositions(w.scene,w.state.x,w.state.y,enemies.length);enemies.forEach((e,i)=>Object.assign(e,{x:spots[i][0]+.5,y:spots[i][1]+.5}));const heroes=w.activeHeroes;heroes.forEach(h=>Object.assign(h,{x:w.state.x,y:w.state.y}));
 const context={...livingEncounterContext(w,obj,objectiveEncounterContext(w,obj,battlefieldContext(w,obj,combatContext(w)))),clayMemory:w.state.clayMemory,encounterSerial:1,encounterKey:'wild',listeningSeed:w.state.encore?.seed||0,friendly:false,tutorial:false,reinforcementLimit:0};
 const b=new Battle({heroes,enemies,context,inventory:w.state.items,chapter:1}),h=heroes[0];assert.ok(b.objective,'walked encounter has a concrete goal');let moves=0;
 for(let tick=0;tick<900&&!b.ended;tick++){const a=b.objective.asset;if(Math.hypot(h.x-a.x,h.y-a.y)>.75){const path=findPath(w.scene,[w.state.x,w.state.y],[a.x,a.y]);const p=path[0]||[a.x,a.y],d=Math.hypot(p[0]-w.state.x,p[1]-w.state.y);if(d>.01){const old=[w.state.x,w.state.y];w.move((p[0]-w.state.x)/d*Math.min(d,.265),(p[1]-w.state.y)/d*Math.min(d,.265));moves+=Math.hypot(w.state.x-old[0],w.state.y-old[1]);h.x=w.state.x;h.y=w.state.y;}}
  if(h.atb>=1){let repositioned=false;if(b.objective.routeBlocked){const blocker=b.livingEnemies.find(e=>Math.hypot(e.x-a.x,e.y-a.y)<1.35);if(blocker){const shift=positionActions(b,h,blocker).filter(r=>r.enabled&&Math.hypot(r.preview.to.x-a.x,r.preview.to.y-a.y)>Math.hypot(blocker.x-a.x,blocker.y-a.y)+.2).sort((u,v)=>Math.hypot(v.preview.to.x-a.x,v.preview.to.y-a.y)-Math.hypot(u.preview.to.x-a.x,u.preview.to.y-a.y))[0];if(shift)repositioned=b.command(h.id,'position',blocker.id,shift);}}if(!repositioned){const actions=objectiveActions(b,h),row=a.hp<a.maxHp*.5?actions.find(x=>x.enabled&&x.action==='repair'):actions.find(x=>x.enabled&&x.action!=='repair');if(row)b.command(h.id,'objective',a.id,row);}}
  b.advance(.1);
 }
 assert.equal(b.ended,'win',o.id+' random roll '+roll+': '+b.objective.resultReason);assert.equal(b.objective.complete,true);assert.ok(b.time<b.objective.deadline);assert.ok(h.hp>0&&b.objective.asset.hp>0);assert.ok(b.enemies.every(e=>e.hp>0),'goal victory must leave creatures alive');assert.ok(moves<30,'objective remains locally reachable');
}});
