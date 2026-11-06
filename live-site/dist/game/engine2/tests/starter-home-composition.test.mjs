import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {findPath} from '../navigation.js';
import {HOUSEHOLD_PLANS} from '../household-plans.js';
import {composeStarterHome} from '../households.js';
import {drawHouseholdFurniture,drawRoomService,householdRestFixture} from '../household-render.js';
const source=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));

function metrics(scene){let open=0,narrow=0;for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(scene.floor[y][x]==='.'){open++;if([[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>scene.floor[y+dy]?.[x+dx]==='.').length<=2)narrow++;}return {open,narrow};}
function surface(){const calls=[],stack=[],gradient={addColorStop(){}};const c=new Proxy({globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},createRadialGradient(){return gradient;},createLinearGradient(){return gradient;}},{get(target,key){return key in target?target[key]:(...args)=>calls.push([key,...args]);}});return {c,calls,stack};}

test('starter house preserves its perimeter and fixture identities while opening a real entrance and living area',()=>{
 const w=new World(source),scene=w.scenes.get(2),prior=HOUSEHOLD_PLANS[2];assert.deepEqual(scene.household.floorBase,prior.household.floorBase);assert.deepEqual(metrics(scene),{open:56,narrow:13});
 assert.deepEqual(scene.household.furnishings.map(o=>o.householdId).sort(),prior.household.furnishings.map(o=>o.householdId).sort());
 for(const o of scene.household.furnishings){const old=prior.household.furnishings.find(p=>p.householdId===o.householdId);for(const key of ['furniture','label','text','detail','supply'])assert.equal(o[key],old[key]);assert.equal(scene.floor[o.xy[1]][o.xy[0]],'.');assert.ok(findPath(scene,scene.arrive,o.xy,1).length||Math.hypot(scene.arrive[0]-o.xy[0],scene.arrive[1]-o.xy[1])<=1);}
 for(let y=10;y<=14;y++)for(let x=22;x<=24;x++)assert.equal(scene.floor[y][x],'.','three-cell entrance and living aisle');
 for(const xy of [[24,6],[22,9],[19,8],[23,14],[27,9]])assert.equal(scene.floor[xy[1]][xy[0]],'.','retained story station '+xy);
 assert.deepEqual(scene.doors.map(d=>({xy:d.xy,to:d.to})),[{xy:[23,14],to:'town'}]);
 for(const room of w.data.scenes.filter(s=>s.household&&s.location!==2)){const before=JSON.stringify(room);assert.equal(composeStarterHome(room),false);assert.equal(JSON.stringify(room),before,'other room collision plans are untouched');}
});

test('Sable inherits the compact home with distinct keeper, clamp and doorway approaches',()=>{
 const w=new World(source),scene=w.scenes.get(50000),home=w.scenes.get(2);assert.deepEqual(scene.floor,home.floor);assert.deepEqual(metrics(scene),{open:56,narrow:13});
 const npc=scene.objects.find(o=>o.originStep===0),clamp=scene.objects.find(o=>o.originStep===1),exit=scene.objects.find(o=>o.originTravel===1);
 assert.deepEqual(npc.xy,[24,9]);assert.deepEqual(clamp.xy,[27,9]);assert.deepEqual(exit.xy,[23,14]);
 assert.ok(Math.hypot(npc.xy[0]-exit.xy[0],npc.xy[1]-exit.xy[1])>3);
 for(const o of [npc,clamp,exit])assert.ok(findPath(scene,scene.arrive,o.xy,1).length,'story approach '+o.label);
});

test('old saves inside a newly wall-backed fixture repair their landing without losing crew, claims or story',()=>{
 for(const past of [false,true]){const w=new World(source);if(past)w.newGame({originId:'sable-reed'});w.state.mode='field';w.state.household={examined:['room:2:v2:2'],opened:['retained-shared-compartment'],openFurniture:['room:2:1']};const saved=JSON.parse(w.save());saved.x=20.5;saved.y=6.5;assert.equal(HOUSEHOLD_PLANS[2].floor[6][20],'.','the former save landing was open');const before=JSON.stringify({heroes:saved.heroes,items:saved.items,flags:saved.flags,household:saved.household,chronicle:saved.chronicle});w.restore(saved);assert.ok(w.walkable(w.state.x,w.state.y));assert.equal(w.state.scene,past?50000:2);assert.ok(Math.hypot(w.state.x-saved.x,w.state.y-saved.y)<3);assert.equal(JSON.stringify({heroes:w.state.heroes,items:w.state.items,flags:w.state.flags,household:w.state.household,chronicle:w.state.chronicle}),before);}
});

test('authored activity groups own their pictures in both graphics modes and missing images fall back safely',()=>{
 const w=new World(source),scene=w.scenes.get(2),roomLife={width:1536,height:1024},artisans={width:1774,height:887};
 for(const compatibility of [false,true])for(const o of scene.household.furnishings.filter(o=>o.visual)){const {c,calls,stack}=surface(),renderer={ctx:c,compatibility,currentScene:scene,assets:{roomLife,environmentArtisans:artisans},bounds:{props:[]},label(){},followers:[]};drawHouseholdFurniture(renderer,o,w.state,false);const draw=calls.find(v=>v[0]==='drawImage');assert.ok(draw);assert.equal(draw[1],roomLife,o.visual+' keeps its complete painted kit');assert.equal(stack.length,0);assert.equal(c.globalAlpha,1);}
 const {c,calls}=surface(),bed=scene.household.furnishings.find(o=>o.visual==='sleeping');drawHouseholdFurniture({ctx:c,currentScene:scene,assets:{roomLife:{width:0,complete:false},environmentArtisans:artisans},bounds:{props:[]},label(){},followers:[]},bed,w.state,false);assert.equal(calls.find(v=>v[0]==='drawImage')[1],artisans);
});

test('the home rest interaction points to the existing bed instead of adding an aisle cabinet',()=>{
 const w=new World(source),scene=w.scenes.get(2),camp=scene.objects.find(o=>o.type==='camp'),{c,calls,stack}=surface();assert.equal(householdRestFixture(scene,camp).visual,'sleeping');drawRoomService({ctx:c,currentScene:scene,assets:{},bounds:{}},camp,camp.xy[0]+.5,camp.xy[1]+.5);assert.equal(calls.some(v=>v[0]==='drawImage'),false);assert.ok(calls.some(v=>v[0]==='ellipse'));assert.equal(stack.length,0);assert.equal(householdRestFixture(scene,{type:'cache',xy:camp.xy}),null);
});
