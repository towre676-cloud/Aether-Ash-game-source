import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {installTrailLife} from '../reconciled-travel.js';
import {installTownLife} from '../townlife.js';
import {installRegionalLife} from '../regional-life.js';
import {activityBounds,activityObstacles,createActivityPlacer} from '../activity-sites.js';
import {outdoorLayout} from '../outdoor-layout.js';
import {buildingReservations,intersectsGroundRect,pointInGroundRect} from '../environmental-grounding.js';
import {worldAffordanceReservations} from '../world-affordances.js';
import {isInteriorScene} from '../scene-identity.js';
import {terrainTrails} from '../terrain-materials.js';

const data=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
function setup(){const w=new World(data);installTrailLife(w);installTownLife(w);installRegionalLife(w);return w;}
function enter(w,scene){w.state.scene=scene.location;w.state.chapter=scene.chapter||1;w.state.mode='field';[w.state.x,w.state.y]=(scene.arrive||[1,1]).map(n=>n+.5);if(!w.walkable(w.state.x,w.state.y)){for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(w.walkable(x+.5,y+.5)){w.state.x=x+.5;w.state.y=y+.5;return;}}}
function component(w){const start=[Math.floor(w.state.x),Math.floor(w.state.y)],q=[start],seen=new Set([start.join(',')]);for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const p=[q[i][0]+dx,q[i][1]+dy],key=p.join(',');if(!seen.has(key)&&w.walkable(p[0]+.5,p[1]+.5)){seen.add(key);q.push(p);}}return {cells:q,seen};}
const role=o=>o.trailService?'stable':o.regional&&o.lifeKind==='project'?'work':['herb','grass'].includes(o.lifeKind)?'plant':o.lifeKind==='fauna'?'fauna':null;

test('every generated service remains reachable and stationary additions clear architecture, scenery and repairs',()=>{
 const w=setup();let scenes=0,services=0,stationary=0;
 for(const scene of w.scenes.values()){
  enter(w,scene);const before=JSON.stringify([scene.floor,scene.doors,scene.objects]),objects=w.objects(),{seen}=component(w),buildings=buildingReservations(scene),layout=outdoorLayout(scene),fixed=[...layout.sites,...layout.trees,...layout.landmarks,...worldAffordanceReservations(scene)].map(o=>o.bounds);
  for(const o of objects.filter(o=>o.life||o.trailService)){
   services++;assert.ok(seen.has(o.xy.map(Math.floor).join(',')),scene.location+' '+(o.label||o.name)+' unreachable');const kind=role(o);if(!kind||isInteriorScene(scene))continue;stationary++;const rect=activityBounds(o.xy,kind);
   assert.ok(buildings.every(b=>!intersectsGroundRect(rect,b.visual,.1)&&!pointInGroundRect(b.approach,o.xy[0]+.5,o.xy[1]+.5,.1)),scene.location+' '+kind+' overlaps architecture');
   assert.ok(fixed.every(b=>!intersectsGroundRect(rect,b)),scene.location+' '+kind+' overlaps scenery or a repair');
  }
  const stations=objects.filter(o=>role(o)),installer=o=>o.trailService?'trail':o.regional?'regional':'town';
  for(let i=0;i<stations.length;i++)for(const b of stations.slice(i+1)){const a=stations[i];if(installer(a)!==installer(b))assert.ok(!intersectsGroundRect(activityBounds(a.xy,role(a)),activityBounds(b.xy,role(b))),scene.location+' independently generated activities overlap');}
  assert.equal(JSON.stringify([scene.floor,scene.doors,scene.objects]),before);scenes++;
 }
 assert.equal(scenes,167);assert.ok(services>250);assert.ok(stationary>100);
});

test('Witness Vault keeps all five regional records and the document press remains actionable beside exact repair footprints',()=>{
 let dialog;const w=new World(data,{onDialog:value=>dialog=value});installTrailLife(w);installTownLife(w);const existing=w.objects.bind(w);installRegionalLife(w);const scene=w.scenes.get(259);enter(w,scene);const fixed=activityObstacles(scene,existing()),records=w.objects().filter(o=>o.regional),work=records.find(o=>o.lifeKind==='project');
 assert.equal(records.length,5);assert.ok(work);assert.equal(work.profile.craft,'document press');assert.ok(fixed.every(b=>!intersectsGroundRect(activityBounds(work.xy,'work'),b)));
 const flags=JSON.stringify(w.state.flags),gold=w.state.gold;w.interact(work);assert.ok(dialog.choices.some(o=>o.label==='Help with the repair'));dialog.choices.find(o=>o.label==='Help with the repair').action();assert.ok(dialog.choices.some(o=>o.label===work.profile.work.prepare));assert.equal(JSON.stringify(w.state.flags),flags);assert.equal(w.state.gold,gold);
 enter(w,w.scenes.get(359));const original=JSON.stringify([w.scene.floor,w.scene.doors,w.scene.objects]),small=w.objects().filter(o=>o.regional),smallFixed=activityObstacles(w.scene,existing());assert.deepEqual(small.map(o=>o.lifeKind).sort(),['fauna','herb','project']);for(const o of small){assert.equal(o.regionalCompact,true);assert.equal(w.scene.floor[o.xy[1]][o.xy[0]],'.');const rect={x:o.xy[0]+.18,y:o.xy[1]+.18,w:.64,h:.64};assert.ok(smallFixed.every(b=>!intersectsGroundRect(rect,b,.035)),'compact work uses exact clear floor');}assert.equal(JSON.stringify([w.scene.floor,w.scene.doors,w.scene.objects]),original);
});

test('field stables follow the actual terrain trail and retain an off-road landing',()=>{
 const w=setup();for(const id of[164,149,2000]){const scene=w.scenes.get(id);enter(w,scene);const service=w.objects().find(o=>o.trailService);assert.ok(service,id+' retains the stable');const paths=new Set(terrainTrails(scene).flat().map(p=>p.join(',')));assert.ok(!paths.has(service.xy.join(',')),id+' stable stands on the painted trail');}
});

test('placement is deterministic, respects the caller reachable component and leaves supplied data unchanged',()=>{
 const w=setup(),scene=w.scenes.get(48);enter(w,scene);const occupied=w.objects(),candidates=component(w).cells,before=JSON.stringify([scene.floor,scene.doors,scene.objects,candidates]);
 const a=createActivityPlacer(scene,candidates,occupied).pick('work'),b=createActivityPlacer(scene,candidates,occupied).pick('work');assert.ok(a);assert.deepEqual(a,b);assert.ok(candidates.some(p=>p[0]===a[0]&&p[1]===a[1]));assert.equal(JSON.stringify([scene.floor,scene.doors,scene.objects,candidates]),before);
});
