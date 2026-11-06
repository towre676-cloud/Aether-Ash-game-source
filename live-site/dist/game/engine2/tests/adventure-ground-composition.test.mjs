import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {adventureGroundCompositionPlan,appendAdventureGroundComposition} from '../adventure-ground-composition.js';
const raw=JSON.parse(readFileSync(new URL('../world.json',import.meta.url)));
function setup(){const w=new World(raw);w.newGame({quiet:true});return w;}
test('circulation surfaces retain exact native walkable masks, collision and saves in every scene',()=>{
 const w=setup();let active=0;
 for(const[id,s]of w.scenes){w.state.scene=id;w.state.x=s.arrive[0]+.5;w.state.y=s.arrive[1]+.5;const before=w.save(),floor=[...s.floor],m=new Geometry(),p=appendAdventureGroundComposition(m,{world:w});
  if(p.active)active++;for(const cell of [...p.paths,...p.courts,...p.habitat])assert.equal(s.floor[cell[1]]?.[cell[0]],'.',id+' uses native floor');
  const d=m.data();assert.ok(d.every(Number.isFinite));for(let i=1;i<d.length;i+=12)assert.ok(d[i]>=0&&d[i]<.05,'all circulation is flush ground detail');
  assert.equal(w.save(),before);assert.deepEqual(s.floor,floor);
 }assert.ok(active>80);
});
test('Town and Unfinished House get coherent native circulation and quiet habitat instead of one repeated slab',()=>{
 const w=setup();for(const id of[5,73,2032]){w.state.scene=id;const p=adventureGroundCompositionPlan(w);assert.ok(p.active);assert.ok(p.paths.length>0,id+' native route');assert.ok(p.courts.length>0,id+' real destination forecourt');assert.ok(p.habitat.length>0,id+' surrounding habitat');
 const paths=new Set(p.paths.map(p=>p.join(',')));assert.ok(p.habitat.every(p=>!paths.has(p.join(','))));assert.equal(adventureGroundCompositionPlan(w),p,'unchanged topology reuses the same composition');}
});
test('a closed live worksite can never be painted as open paving and a new floor mask invalidates the plan',()=>{
 const w=setup();w.state.scene=5;const a=adventureGroundCompositionPlan(w),tile=a.paths[Math.floor(a.paths.length/2)];w.scene.affordanceBlocked=[tile];const b=adventureGroundCompositionPlan(w);
 assert.notEqual(a,b);assert.equal([...b.paths,...b.courts,...b.habitat].some(p=>p[0]===tile[0]&&p[1]===tile[1]),false);const[x,z]=b.paths[0];w.scene.floor[z]=w.scene.floor[z].slice(0,x)+'#'+w.scene.floor[z].slice(x+1);const c=adventureGroundCompositionPlan(w);assert.notEqual(c,b);assert.equal(c.paths.some(p=>p[0]===x&&p[1]===z),false);
});
test('private origin workbays and indoor furnished floors keep their own authored composition',()=>{
 const w=setup();for(const id of[2,703,50000,50012]){w.state.scene=id;assert.equal(adventureGroundCompositionPlan(w).active,false);const m=new Geometry();appendAdventureGroundComposition(m,{world:w});assert.equal(m.v.length,0);}
});
