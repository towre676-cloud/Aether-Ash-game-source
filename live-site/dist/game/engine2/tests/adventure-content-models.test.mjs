import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {PHYSICAL_LORE} from '../physical-lore-content.js';
import {physicalBindings} from '../physical-lore.js';
import {NETWORK_WORKS,networkObjects} from '../answering-network.js';
import {COMBAT_RELICS} from '../combat-relics.js';
import {adventureContentFamily,appendAdventureContentStatic,appendAdventureContentDynamic} from '../adventure-content-models.js';

const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
function setup(){const w=new World(data);w.newGame({quiet:true});w.state.chapter=24;w.state.story.firstCore=true;w.state.story.parcel=true;w.state.mode='field';return w;}
function scene(w,id){w.state.scene=id;w.state.x=w.scene.arrive[0]+.5;w.state.y=w.scene.arrive[1]+.5;w.objects();return w;}
function draw(w,provided){const objects=provided||w.objects();const before=w.save(),staticMesh=new Geometry(),dynamic=new Geometry(),glow=new Geometry();const a=appendAdventureContentStatic(staticMesh,{world:w,objects}),b=appendAdventureContentDynamic(dynamic,glow,{world:w,objects,time:7,range:Infinity});assert.equal(w.save(),before,'drawing is read-only');for(const m of[staticMesh,dynamic,glow])assert.ok(m.v.every(Number.isFinite),'finite content vertices');return {static:staticMesh.v,dynamic:[...dynamic.v,...glow.v],stats:{a,b}};}
function clone(w){const b=setup();b.restore(w.save());return b;}

test('all 167 actual scenes accept native content models without changing saves or collision',()=>{
 const w=setup();let modeled=0,triangles=0;for(const[id,s]of w.scenes){scene(w,id);const floor=JSON.stringify([s.floor,s.affordanceBlocked]);const result=draw(w);assert.equal(JSON.stringify([s.floor,s.affordanceBlocked]),floor);modeled+=result.stats.a.count;triangles=Math.max(triangles,(result.static.length+result.dynamic.length)/36);}
 assert.equal(w.scenes.size,167);assert.ok(modeled>=48,'available physical sources and receivers all have bodies');assert.ok(triangles<12000,'per-scene content geometry remains bounded');
});

test('all 24 artifact identities have different portable meshes and five receiver actions respond to actual state',()=>{
 const w=setup(),portable=new Set(),modes=new Set();for(const e of PHYSICAL_LORE){const site=physicalBindings(w).find(o=>o.physicalId===e.id&&o.physicalRole==='source');scene(w,site.physicalLocation);portable.add(JSON.stringify(draw(w,[site]).dynamic));const target=physicalBindings(w).find(o=>o.physicalId===e.id&&o.physicalRole==='device');scene(w,target.physicalLocation);const blank=draw(w,[target]);w.state.physicalLore.installed.push(e.id);const fitted=draw(w,[target]);assert.notDeepEqual(blank.dynamic,fitted.dynamic,e.id+' changes when fitted');if(e.mode==='turn'||e.mode==='pump')w.state.physicalLore.steps[e.id]=1;else if(e.mode==='grow'||e.mode==='listen')w.state.physicalLore.clocks[e.id]=2;else w.state.physicalLore.completed.push(e.id);const moved=draw(w,[target]);assert.notDeepEqual(fitted.dynamic,moved.dynamic,e.id+' responds to its native action');modes.add(e.mode);}
 assert.equal(modes.size,5);assert.ok(portable.size>=20,'distinct glyph, material and carried silhouettes');
});

test('physical source disappearance, trace, revealed reward and all rare relics follow native availability',()=>{
 const w=setup();for(const e of PHYSICAL_LORE){const source=physicalBindings(w).find(o=>o.physicalId===e.id&&o.physicalRole==='source'),reward=physicalBindings(w).find(o=>o.physicalId===e.id&&o.physicalRole==='reward');scene(w,source.physicalLocation);assert.equal(adventureContentFamily(w,source),'artifact-source');w.state.physicalLore.taken.push(e.id);assert.equal(adventureContentFamily(w,source),null);assert.ok(w.objects().some(o=>o.physicalId===e.id&&adventureContentFamily(w,o)==='artifact-trace'));scene(w,reward.physicalLocation);assert.equal(adventureContentFamily(w,reward),null,'concealed reward has no mesh');w.state.physicalLore.completed.push(e.id);assert.equal(adventureContentFamily(w,reward),'artifact-reward');w.state.physicalLore.claimed.push(e.id);assert.equal(adventureContentFamily(w,reward),null,'claimed cache vanishes');}
 for(const r of COMBAT_RELICS){const target=physicalBindings(w).find(o=>o.physicalId===r.source&&o.physicalRole==='reward');scene(w,target.physicalLocation);const relic=w.objects().find(o=>o.battleRelic===r.id);assert.ok(relic);assert.equal(adventureContentFamily(w,relic),'rare-relic');const result=draw(w,[relic]);assert.ok(result.static.length&&result.dynamic.length);w.state.combatRelics.claimed.push(r.id);assert.ok(!w.objects().some(o=>o.battleRelic===r.id));}
});

test('all nine answering-network instruments change with their true work and heard ledgers at the same clock',()=>{
 const w=setup();let count=0;for(const def of NETWORK_WORKS){scene(w,def.scene);const beforeObjects=networkObjects(w);for(const o of beforeObjects){assert.ok(adventureContentFamily(w,o)?.startsWith('network-'));const a=draw(w,[o]),b=clone(w);b.state.answeringNetwork={version:1,works:['chapel-inspected','chapel-return','root-installed','heat-diverted','heat-independent','water-opened','water-return','relays-opened','relays-distinct','assembly-posted','assembly-return'],heard:['chapel-answer','heat-answer','water-west','water-east','relay-low','relay-high','relay-middle','assembly-reply']};const changed=networkObjects(b).find(v=>v.networkId===o.networkId);assert.ok(changed);const completed=draw(b,[changed]);assert.notDeepEqual(a.dynamic,completed.dynamic,o.networkId+' responds to ledger');count++;}}
 assert.equal(count,9);
});

test('hidden exploration panels stay absent outside actual discovery range and expose supplies only after their latch opens',()=>{
 const w=setup(),room=[...w.scenes.values()].find(s=>s.key==='secret_5');assert.ok(room);scene(w,room.location);const hidden=room.objects.find(o=>o.type==='secret'&&o.lock);assert.ok(hidden);w.state.x=room.arrive[0]+.5;w.state.y=room.arrive[1]+.5;assert.equal(adventureContentFamily(w,hidden),null);assert.equal(draw(w,[hidden]).static.length,0,'even explicitly supplied hidden objects are rejected');w.state.x=hidden.xy[0]+.5;w.state.y=hidden.xy[1]+.5;const shut=draw(w,[hidden]);assert.ok(shut.static.length);w.state.exploration.solved.push(hidden.lock);const open=draw(w,[hidden]);assert.notDeepEqual(shut.dynamic,open.dynamic);w.state.exploration.found.push(hidden.exploreId);assert.equal(draw(w,[hidden]).static.length,0);
});

test('held artifacts remain visible across a scene transition and all open-floor devices stay low',()=>{
 const w=setup(),e=PHYSICAL_LORE.find(e=>e.glyph==='lantern'),source=physicalBindings(w).find(o=>o.physicalId===e.id&&o.physicalRole==='source');scene(w,source.physicalLocation);w.state.physicalLore.held=e.id;const held=draw(w,[]);assert.equal(held.stats.b.held,e.id);assert.ok(held.dynamic.length);scene(w,5);assert.equal(draw(w,[]).stats.b.held,e.id);w.state.physicalLore.held=null;
 for(const e of PHYSICAL_LORE){const o=physicalBindings(w).find(o=>o.physicalId===e.id&&o.physicalRole==='device');scene(w,o.physicalLocation);const d=draw(w,[o]);for(const vertices of[d.static,d.dynamic])for(let i=1;i<vertices.length;i+=12)assert.ok(vertices[i]<=.50,'walkable receiver cannot introduce a tall obstacle');}
});
