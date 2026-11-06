import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {installCisternEntrance,canVisitCistern} from '../cistern-campaign.js';
import {createCisternState,actionCistern,claimCisternRewards} from '../cistern-model.js';
import {validateSave} from '../save-validation.js';
import {interactionPath} from '../quest-navigation.js';
const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url)));
function present(){const w=new World(data);w.newGame({quiet:true});w.state.scene=5;w.state.x=24.5;w.state.y=42.5;w.state.mode='field';return w;}

test('Cinderfall has a reachable 3D entrance that retains the campaign return position',()=>{
 const w=present();let entered=0;
 installCisternEntrance(w,()=>entered++);
 const entrance=w.objects().find(o=>o.cisternEntrance);
 assert.ok(entrance,'a normal field portal exists');
 assert.ok(interactionPath(w.scene,[w.state.x,w.state.y],entrance)!==null,'the entrance can be reached');
 const before=JSON.stringify(w.state);
 w.interact(entrance);assert.equal(entered,1);assert.equal(JSON.stringify(w.state),before);
 assert.equal(w.objects().filter(o=>o.cisternEntrance).length,1);
});

test('past lives and active field trials keep their existing progression',()=>{
 const w=present();installCisternEntrance(w,()=>assert.fail('unexpected entrance'));
 w.state.chronicle={phase:'past'};assert.equal(canVisitCistern(w),false);assert.equal(w.objects().some(o=>o.cisternEntrance),false);
 delete w.state.chronicle;w.state.fieldOrigins={active:{hero:0}};assert.equal(canVisitCistern(w),false);
});

test('dungeon progress, party HP/MP, supplies, and return position survive the existing save validator',()=>{
 const w=present();w.state.cistern3d=createCisternState({},w.activeHeroes);
 const dungeon=w.state.cistern3d;dungeon.player={x:-8,z:-5,facing:0,moving:false};actionCistern(dungeon,'interact',w.activeHeroes,w.state.items);
 w.activeHeroes[0].hp-=3;w.activeHeroes[0].mp=Math.max(0,w.activeHeroes[0].mp-2);
 const before=JSON.parse(w.save());
 const value=validateSave(data,{schema:'ash-aether.enhanced-save/1',world:before});
 const restored=new World(data);restored.restore(value.world);
 assert.deepEqual(restored.state.cistern3d.resonators,[true,false]);assert.equal(restored.state.cistern3d.player.x,-8);assert.equal(restored.state.cistern3d.player.z,-5);
 assert.deepEqual(restored.state.party,before.party);assert.deepEqual(restored.state.items,before.items);assert.equal(restored.activeHeroes[0].hp,before.heroes[0].hp);assert.equal(restored.state.scene,before.scene);assert.equal(restored.state.x,before.x);assert.equal(restored.state.y,before.y);
 assert.deepEqual(before.cistern3d.resonators,[true,false],'validation did not mutate the import');
});

test('completion rewards cannot be duplicated through campaign save and restore',()=>{
 const w=present();const s=createCisternState();s.resonators=[true,true];s.bossDefeated=true;s.enemies.find(e=>e.boss).hp=0;
 claimCisternRewards(w.state,s);const gold=w.state.gold,xp=w.state.xp,tonic=w.state.items.tonic;
 const checked=validateSave(data,{schema:'ash-aether.enhanced-save/1',world:JSON.parse(w.save())});w.restore(checked.world);
 assert.equal(claimCisternRewards(w.state,w.state.cistern3d).length,0);assert.equal(w.state.gold,gold);assert.equal(w.state.xp,xp);assert.equal(w.state.items.tonic,tonic);
});
