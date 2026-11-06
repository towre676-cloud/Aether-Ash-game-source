import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {adventureSetFamily,adventureSetDressingPlan,appendAdventureSetDressing,appendAdventureSetDynamics} from '../adventure-set-dressing.js';

const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
function world(){const w=new World(source);w.newGame({quiet:true});return w;}

test('every outdoor frontier and every original or refuge origin has an explicit set family',()=>{
 const w=world(),frontiers=[];let origins=0;
 for(const[id,s]of w.scenes){w.state.scene=id;if(s.biome||s.originId){assert.ok(adventureSetFamily(w),s.key);if(s.originId||/^origin_/.test(s.key))origins++;}if(/^frontier_/.test(s.key))frontiers.push(adventureSetFamily(w));}
 assert.equal(frontiers.length,60);assert.equal(new Set(frontiers).size,12);assert.equal(origins,21);
});

test('raised scenery cannot claim walkable floor across all prepared scenes',()=>{
 const w=world();let covered=0,vertices=0;
 for(const[id,s]of w.scenes){w.state.scene=id;const m=new Geometry();appendAdventureSetDressing(m,{world:w});const d=m.data();assert.equal(d.length%12,0);
  if(adventureSetFamily(w))covered++;
  for(let i=0;i<d.length;i+=12){const x=d[i],y=d[i+1],z=d[i+2];assert.ok(Number.isFinite(x+y+z),s.key);if(y>.12)assert.notEqual(s.floor[Math.floor(z)]?.[Math.floor(x)],'.',`raised object on ${s.key} at ${x},${z}`);}
  assert.ok(d.length/36<5500,`${s.key} static scenery budget`);vertices+=d.length/12;
 }
 assert.equal(covered,114);assert.ok(vertices>100000);
});

test('room details and biome architecture preserve exact native saves and deterministic meshes',()=>{
 const w=world();
 for(const id of[2,12,50,61,2000,2010,2015,2020,2025,2030,2035,2040,2045,2050,2055,50000,50004,50010]){
  w.state.scene=id;const before=w.save(),a=new Geometry(),b=new Geometry(),d=new Geometry(),g=new Geometry();appendAdventureSetDressing(a,{world:w});appendAdventureSetDressing(b,{world:w});appendAdventureSetDynamics(d,g,{world:w,time:1.1});assert.deepEqual(a.data(),b.data());assert.equal(w.save(),before);
  for(const mesh of[d,g])for(const value of mesh.data())assert.ok(Number.isFinite(value));
 }
});

test('thin blocked islands retain their own spore, crystal and marble silhouettes',()=>{
 const w=world();
 for(const[id,family]of[[2045,'spore'],[2030,'crystal'],[2055,'marble']]){
  w.state.scene=id;const p=adventureSetDressingPlan(w);assert.equal(p.family,family);assert.ok(p.sites.length);const m=new Geometry();appendAdventureSetDressing(m,{world:w});const d=m.data();let height=0;for(let i=1;i<d.length;i+=12)height=Math.max(height,d[i]);assert.ok(height>.70,`${family} is not reduced to a plain ground rock`);
 }
});

test('newly opened floor invalidates scenery anchors rather than leaving visual blockers',()=>{
 const w=world();w.state.scene=2000;const s=w.scene,p=adventureSetDressingPlan(w),site=p.sites[0];assert.ok(site);const x=Math.floor(site.x),z=Math.floor(site.z),row=s.floor[z];s.floor[z]=row.slice(0,x)+'.'+row.slice(x+1);const next=adventureSetDressingPlan(w);assert.notEqual(next,p);assert.ok(next.sites.every(v=>Math.hypot(v.x-site.x,v.z-site.z)>.10));
});
