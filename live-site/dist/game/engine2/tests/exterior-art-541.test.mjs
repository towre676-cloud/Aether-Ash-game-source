import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {isInteriorScene} from '../scene-identity.js';
import {adventureLandscapePlan} from '../adventure-landscape.js';
import {exteriorHeroFeatures} from '../exterior-art-selection-541.js';
import {exteriorArtPlan,appendExteriorArt,appendExteriorArtDynamics} from '../exterior-art-541.js';
const raw=JSON.parse(readFileSync(new URL('../world.json',import.meta.url)));
function setup(){const world=new World(raw);world.newGame({quiet:true});return world;}

test('all 95 native exterior places receive bounded authored geometry while native state and floors stay unchanged',()=>{
 const world=setup(),families=new Set(),kinds=new Set();let count=0,max=0,min=Infinity;
 for(const[id,scene]of world.scenes){
  world.state.scene=id;const before=world.save(),floor=JSON.stringify(scene.floor),mesh=new Geometry(),plan=appendExteriorArt(mesh,{world});
  const expected=!scene.originId&&!scene.secret_key&&!isInteriorScene(scene);assert.equal(plan.active,expected,'native category '+id);
  if(!expected){assert.equal(mesh.v.length,0);continue;}count++;families.add(plan.family);for(const p of[...plan.heroes,...plan.waterSites,...plan.anchorSites])kinds.add(p.kind);
  const triangles=mesh.v.length/36;max=Math.max(max,triangles);min=Math.min(min,triangles);
  // The integrated pass retains the original facade/bank allowance and adds
  // at most twelve rooted regional models, individually capped at 752 faces.
  assert.ok(triangles>=200&&triangles<=4000+plan.anchorSites.length*752,id+' receives substantial, bounded integrated craft');assert.ok(plan.anchorSites.length<=12);assert.ok(mesh.v.every(Number.isFinite));
  const repeat=new Geometry();appendExteriorArt(repeat,{world});assert.deepEqual(mesh.v,repeat.v,'unchanged topology is deterministic '+id);
  assert.equal(world.save(),before);assert.equal(JSON.stringify(scene.floor),floor);
 }
 assert.equal(count,95);assert.ok(families.size>=17);assert.ok(kinds.size>=14,'region silhouettes include distinct ecology and building forms');assert.ok(max>min*2,'building craft follows real scene content instead of fixed filler counts');
});

test('new low solid faces stay in real closed ground and all landmark replacements come from the existing bank composition',()=>{
 const world=setup();let faces=0,shoreSites=0;
 for(const[id,scene]of world.scenes){world.state.scene=id;const mesh=new Geometry(),plan=appendExteriorArt(mesh,{world});if(!plan.active)continue;
  const landscape=adventureLandscapePlan(world),chosen=exteriorHeroFeatures(scene,landscape.features);
  assert.ok(plan.heroes.every(p=>chosen.some(f=>f.x===p.x&&f.z===p.z&&f.index===p.index)));
  assert.ok(plan.heroes.every(p=>!p.near),'large silhouettes remain on the far bank');
  for(const p of plan.waterSites){assert.ok(landscape.water);assert.ok(landscape.closedPatch(p.x,p.z,1.36),'a real closed shore footprint supports the water structure');shoreSites++;}
  // Near-arrival water architecture replaces an old distant shore station
  // when their footprints would overlap; count the actual composed owner.
  for(const p of plan.anchorSites.filter(p=>p.water&&!p.slim)){assert.ok(landscape.water);shoreSites++;}
  for(let i=0;i<mesh.v.length;i+=36){const x=(mesh.v[i]+mesh.v[i+12]+mesh.v[i+24])/3,y=(mesh.v[i+1]+mesh.v[i+13]+mesh.v[i+25])/3,z=(mesh.v[i+2]+mesh.v[i+14]+mesh.v[i+26])/3;
   if(y<.06||y>=2.2)continue;assert.notEqual(scene.floor[Math.floor(z)]?.[Math.floor(x)],'.',id+' new low face occupies native walking cell at '+x+','+z);faces++;
  }
 }
 assert.ok(faces>10000);assert.ok(shoreSites>=10,'all five brine phases and river settlements receive shoreline composition');
});

test('the real exterior model families differ and time-driven attached cloth and vanes never own world consequences',()=>{
 const world=setup(),signatures=new Set();
 for(const id of[17,19,2000,2005,2010,2015,2020,2025,2030,2035,2040,2045,2050,2055]){
  world.state.scene=id;const mesh=new Geometry(),plan=appendExteriorArt(mesh,{world});assert.ok(plan.active);signatures.add(JSON.stringify(mesh.v));
  const before=world.save(),a=new Geometry(),ag=new Geometry(),b=new Geometry(),bg=new Geometry();appendExteriorArtDynamics(a,ag,{world,time:2});appendExteriorArtDynamics(b,bg,{world,time:4});
  assert.ok(a.v.every(Number.isFinite)&&b.v.every(Number.isFinite));assert.ok(a.v.length/36<=40);assert.equal(world.save(),before);
  if(plan.heroes.some(p=>['pavilion','windharp'].includes(p.kind))){assert.ok(a.v.length>0);assert.notDeepEqual(a.v,b.v,'the existing animation clock changes attached cloth or vane geometry');}
 }
 assert.equal(signatures.size,14);
 world.state.scene=5;const plan=exteriorArtPlan(world),floor=world.scene.floor;assert.equal(exteriorArtPlan(world),plan,'unchanged topology reuses the plan');const z=floor.findIndex(row=>row.includes('.')),x=floor[z].indexOf('.');world.scene.floor=[...floor];world.scene.floor[z]=floor[z].slice(0,x)+'#'+floor[z].slice(x+1);assert.notEqual(exteriorArtPlan(world),plan,'a changed native floor mask rebuilds the bank composition');
});
