import test from 'node:test';
import assert from 'node:assert/strict';
import {AtlasWorld} from '../src/adventure.mjs';
import {REGIONS, REGION_BY_ID} from '../src/content.mjs';
import {materialAt,roomMaterial,SurfaceLayer,vegetationObstacle,biomeAt} from '../src/surfaces.mjs';
import {MATERIALS,analyzeGround} from '../src/ground/ground-materials.mjs';
import {generateGroundMaps} from '../src/ground/ground-synthesis.mjs';
import {SPECIES as PLANTS,BIOMES} from '../src/grass/grass-ecology.mjs';
const coord={x:-14,z:-11}, stepCoord={x:-15,z:-10};
test('parallel authored packages are genuinely preserved: 16 species, 15 habitats, 48 substrates',()=>{
 assert.equal(Object.keys(PLANTS).length,16);assert.equal(Object.keys(BIOMES).length,15);assert.equal(MATERIALS.length,48);
 assert.equal(new Set(MATERIALS.map(x=>x.id)).size,48);
});
test('all regional material mappings are authored valid IDs and distinguish world geology',()=>{
 const found=new Set();for(const region of REGIONS){const a=new AtlasWorld();a.ensure(region.id);const w=a.worlds[region.id];
  for(const [x,z] of [[-31,-25],[3,8],[17,14],[15,21],[-16,-10]]){const id=materialAt(region,w,x,z);assert.ok(MATERIALS.some(m=>m.id===id));found.add(id);}
 }assert.ok(found.size>=13,`only ${found.size} materials`);
});
test('semantic footprints block growing tufts through occupied structures',()=>{
 const a=new AtlasWorld();assert.equal(vegetationObstacle(a.region,a.world,17,14),true);
 assert.equal(vegetationObstacle(a.region,a.world,-17,-10),true);
 assert.equal(biomeAt(a.region,a.world,17,14),'ruins');
});
test('room identities yield actual physically different materials',()=>{
 const inn=roomMaterial(['inn']),reactor=roomMaterial(['reactor']);assert.equal(inn.id,'clay-rug');assert.equal(reactor.id,'aether-enamel');
 assert.ok(analyzeGround(inn.id,{wetness:.7}).conduction<analyzeGround(reactor.id,{wetness:.7}).conduction);
});
test('an accepted footfall persists vegetation traces and ground traffic without minting items',()=>{
 const a=new AtlasWorld(),before=structuredClone(a.inventory),p=a.surfaceAt(stepCoord.x,stepCoord.z);
 const step=a.dispatch({kind:'FOOTFALL_CONFIRMED',...stepCoord,actor:'iona',weight:1.5,speed:1});
 assert.equal(step.ok,true);const after=a.surfaceAt(stepCoord.x,stepCoord.z);assert.equal(after.vegetation.flatten,p.vegetation.flatten,'no invented grass footprint within the built plaza');assert.ok(after.traffic>p.traffic);
 const meadow=a.surface.sample(-28,-27);a.surface.step(-28,-27,{weight:1});assert.ok(a.surface.sample(-28,-27).vegetation.flatten>meadow.vegetation.flatten);
 assert.deepEqual(a.inventory,before);assert.equal(a.ledger.at(-1).type,'FOOTFALL_CONFIRMED');
});
test('invalid or blocked movement never changes surface state or the position',()=>{
 const a=new AtlasWorld(),before=a.snapshot(),old=a.characters[0].position;
 const r=a.dispatch({kind:'FOOTFALL_CONFIRMED',x:1000,z:12});assert.equal(r.ok,false);
 assert.deepEqual(a.characters[0].position,old);assert.deepEqual(a.snapshot(),before);
});
test('confirmed elemental spell changes same ground state used by battle',()=>{
 const a=new AtlasWorld(),p=a.surfaceAt(coord.x,coord.z);
 assert.equal(a.dispatch({kind:'ELEMENTAL_SKILL_CAST',...coord,element:'aether',power:3}).ok,true);
 const q=a.surfaceAt(coord.x,coord.z);assert.ok(q.phase>p.phase);assert.ok(q.resonance>=0);
});
test('invalid game event cannot change ground or vegetation persistence',()=>{
 const a=new AtlasWorld(),before=JSON.stringify(a.snapshot());
 assert.throws(()=>a.dispatch({kind:'RESOURCE_HARVESTED',x:9999,z:9999}),/outside world/);assert.equal(JSON.stringify(a.snapshot()),before);
});
test('water treatment adds persistent ground wetness and grass moisture',()=>{
 const a=new AtlasWorld(),p=a.surfaceAt(coord.x,coord.z),r=a.dispatch({kind:'ELEMENTAL_SKILL_CAST',...coord,element:'water',power:4});
 assert.ok(r.ok);const q=a.surfaceAt(coord.x,coord.z);assert.ok(q.wetness>p.wetness);assert.ok(q.vegetation.wet>p.vegetation.wet);
});
test('surface data survive serialisation and restoration unchanged, including multiple regions',()=>{
 const a=new AtlasWorld();a.dispatch({kind:'FOOTFALL_CONFIRMED',...stepCoord});a.dispatch({kind:'ELEMENTAL_SKILL_CAST',...coord,element:'aether',power:4});
 a.travel('mosswake');a.dispatch({kind:'FOOTFALL_CONFIRMED',...stepCoord});const b=AtlasWorld.restore(a.snapshot());
 assert.ok(Math.abs(b.surfaceAt(coord.x,coord.z).vegetation.vigor-a.surfaceAt(coord.x,coord.z).vegetation.vigor)<.00001);assert.deepEqual(b.snapshot(),a.snapshot());
 b.travel('hearthland');a.travel('hearthland');assert.ok(Math.abs(b.surfaceAt(coord.x,coord.z).vegetation.flatten-a.surfaceAt(coord.x,coord.z).vegetation.flatten)<.00001);
});
test('older v3 save files with no surfaces still restore without dropping quests',()=>{
 const a=new AtlasWorld();a.resolveQuest('rain_recovery');const save=a.snapshot();delete save.surfaceStates;
 const b=AtlasWorld.restore(save);assert.equal(b.completed.includes('rain_recovery'),true);assert.ok(b.surfaceAt(0,0));
});
test('new game plus preserves prior epoch surface provenance in history and resets disturbances',()=>{
 const a=new AtlasWorld();a.dispatch({kind:'FOOTFALL_CONFIRMED',...stepCoord});const s=a.surfaceAt(stepCoord.x,stepCoord.z);assert.ok(s.traffic>0);
 a.newGamePlus();assert.equal(a.history[0].surfaceHistory[0].region,'hearthland');
 assert.equal(a.surfaceAt(stepCoord.x,stepCoord.z).traffic,0);
});
test('material maps are derived deterministically from game fields, not decorative randomness',()=>{
 const a=new AtlasWorld(),make=()=>generateGroundMaps({seed:a.world.seed,width:24,height:24,metresX:64,metresZ:64,
  materialAt:(x,z)=>materialAt(a.region,a.world,x,z),weatherAt:(x,z)=>({rain:a.world.sample(x,z).moisture})});
 const m=make(),n=make();assert.deepEqual(m.albedo,n.albedo);assert.deepEqual(m.normal,n.normal);assert.ok(new Set(m.albedo.filter((_,i)=>i%4===0)).size>20);
});
test('a prior surface injury affects traversal costs in the same region',()=>{
 const a=new AtlasWorld(),before=a.surfaceAt(coord.x,coord.z).movementCost;
 for(let j=0;j<5;j++)a.surface.impact(coord.x,coord.z,'kinetic',1);
 const after=a.surfaceAt(coord.x,coord.z);assert.ok(after.fracture>0);assert.ok(after.movementCost>before);
});
