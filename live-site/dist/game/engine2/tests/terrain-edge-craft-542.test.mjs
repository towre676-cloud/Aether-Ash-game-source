import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry,CisternRenderer} from '../cistern-renderer.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {adventureLandscapePlan} from '../adventure-landscape.js';
import {terrainEdgeCraftPlan542,appendTerrainEdgeCraft542} from '../terrain-edge-craft-542.js';
import {installReconciledGround} from '../reconciled-ground.js';
import {installLivingAtlas} from '../living-atlas.js';
import {installTrailLife} from '../reconciled-travel.js';
import {installTownLife} from '../townlife.js';
import {installRegionalLife} from '../regional-life.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../embodied-origins.js';
import {installCampaignActuators} from '../campaign-actuators.js';
import {createWorldControls} from '../world-controls.js';

const raw=JSON.parse(readFileSync(new URL('../world.json',import.meta.url))),noop=()=>{};
function setup(){
 const world=new World(raw);installReconciledGround(world);installLivingAtlas(world);installTrailLife(world);installTownLife(world);installRegionalLife(world);
 const origins=installEmbodiedOrigins(world),campaign=installCampaignActuators(world);world.worldControls=createWorldControls(world,origins,campaign);
 const native=world.objects.bind(world);world.objects=()=>[...native().filter(o=>!replacesEmbodiedOriginObject(world,o)),...world.embodiedOrigins.objects()];return world;
}
function enter(world,scene){
 world.newGame({quiet:true});world.state.scene=scene.location;world.state.chapter=scene.chapter||1;world.state.mode='field';
 const a=scene.authoredOpening?.arrival||scene.arrive?.map(v=>v+.5);if(a)[world.state.x,world.state.y]=a;
 world.objects();world.livingAtlas.runtime();world.embodiedOrigins.snapshot();
}
const area=p=>Math.abs(p.reduce((a,v,i)=>a+v[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*v[1],0))/2;
function clip(poly,axis,value,greater){
 if(!poly.length)return[];const out=[];let a=poly.at(-1),inside=greater?a[axis]>=value:a[axis]<=value;
 for(const b of poly){const next=greater?b[axis]>=value:b[axis]<=value;if(next!==inside){const t=(value-a[axis])/(b[axis]-a[axis]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}if(next)out.push(b);a=b;inside=next;}return out;
}
function overlap(poly,x,z){let p=clip(poly,0,x,true);p=clip(p,0,x+1,false);p=clip(p,1,z,true);p=clip(p,1,z+1,false);return p.length>=3?area(p):0;}

test('native dry exteriors receive bounded attached terrain facets while water, Veyr and interiors retain their owners',()=>{
 const world=setup();let active=0,excluded=0,frontiers=0,faces=0,max=0;
 for(const scene of world.scenes.values()){
  enter(world,scene);const terrain=adventureLandscapePlan(world),save=world.save(),floor=JSON.stringify(scene.floor),mesh=new Geometry(),plan=appendTerrainEdgeCraft542(mesh,{world,landscapePlan:terrain});
  const excludedScope=terrain.indoor||terrain.water||terrain.coastalStorm||scene.originId==='veyr-storm';
  if(excludedScope){assert.equal(plan.active,false);assert.equal(mesh.v.length,0);excluded++;continue;}
  assert.ok(plan.active,scene.location+' has a real dry bank composition');active++;if(scene.biome&&!scene.originId)frontiers++;
  assert.ok(plan.stats.triangles>100&&plan.stats.triangles<=1800);assert.equal(plan.stats.triangles,mesh.v.length/36);max=Math.max(max,plan.stats.triangles);
  assert.ok(plan.stats.legacyTriangles+plan.stats.netAddedTriangles<10000,'the retained standalone terrain and vegetation budget also bounds the replacement');
  assert.equal(new Set(plan.replacedIndices).size,plan.replacedIndices.length);assert.ok(mesh.v.every(Number.isFinite));
  for(const row of plan.walls){
   assert.equal(terrain.walls[row.index],row.source,'only an actual existing riser can be replaced');
   for(const end of[row.sections[0],row.sections.at(-1)])for(const p of end.levels)assert.ok(Math.abs(p.inset)<1e-8,'the exact native corner remains welded through the entire end profile');
   for(const section of row.sections){assert.equal(section.levels[0].y,row.source.low);assert.equal(section.levels.at(-1).y,row.source.top);assert.equal(section.levels[0].inset,0);assert.equal(section.levels.at(-1).inset,0);}
  }
  for(let i=0;i<mesh.v.length;i+=36){
   const triangle=[0,12,24].map(j=>[mesh.v[i+j],mesh.v[i+j+2]]);if(area(triangle)<1e-9)continue;
   const xs=triangle.map(p=>p[0]),zs=triangle.map(p=>p[1]);
   for(let z=Math.floor(Math.min(...zs));z<=Math.floor(Math.max(...zs));z++)for(let x=Math.floor(Math.min(...xs));x<=Math.floor(Math.max(...xs));x++)if(scene.floor[z]?.[x]==='.')assert.ok(overlap(triangle,x,z)<1e-8,scene.location+' whole inset face never enters an actual walking cell');faces++;
  }
  assert.equal(world.save(),save);assert.equal(JSON.stringify(scene.floor),floor);
 }
 assert.ok(active>=60&&excluded>=60&&frontiers>=40,'the test covers the actual complete native scene population, including regional routes');assert.ok(faces>20000&&max>=1500);
});

test('the actual terrain profile remains deterministic and an opened floor rebuilds its attached face plan',()=>{
 const world=setup();enter(world,world.scenes.get(2000));const terrain=adventureLandscapePlan(world),a=new Geometry(),b=new Geometry(),first=appendTerrainEdgeCraft542(a,{world,landscapePlan:terrain});appendTerrainEdgeCraft542(b,{world,landscapePlan:terrain});
 assert.deepEqual(a.v,b.v);assert.equal(terrainEdgeCraftPlan542(world,{landscapePlan:terrain}),first);
 const w=first.walls.find(row=>{const p=row.sections[Math.floor(row.sections.length/2)],x=row.source.axis==='x'?p.u:row.source.fixed-row.source.dx*.4,z=row.source.axis==='x'?row.source.fixed-row.source.dz*.4:p.u;return world.scene.floor[Math.floor(z)]?.[Math.floor(x)]==='#';});assert.ok(w);
 const u=w.sections[Math.floor(w.sections.length/2)].u,x=Math.floor(w.source.axis==='x'?u:w.source.fixed-w.source.dx*.4),z=Math.floor(w.source.axis==='x'?w.source.fixed-w.source.dz*.4:u),floor=[...world.scene.floor];floor[z]=floor[z].slice(0,x)+'.'+floor[z].slice(x+1);world.scene.floor=floor;
 const changed=adventureLandscapePlan(world);assert.notEqual(changed,terrain);assert.notEqual(terrainEdgeCraftPlan542(world,{landscapePlan:changed}),first);
});

test('recessed faces keep their native outward normals and survive the real phone software culling threshold',()=>{
 const world=setup(),W=388,H=842;
 for(const id of[5,19,68,145,2000,2015,2030,2055]){
  enter(world,world.scenes.get(id));const m=new Geometry(),plan=appendTerrainEdgeCraft542(m,{world,landscapePlan:adventureLandscapePlan(world)});assert.ok(plan.active);
  let index=0;for(const row of plan.walls)for(let segment=0;segment<row.segments;segment++)for(let level=0;level<3;level++)for(let half=0;half<2;half++){
   const nx=m.v[index+3],nz=m.v[index+5];assert.ok(nx*row.source.dx+nz*row.source.dz>.2,'the broad inset face points out of its actual closed terrain body');index+=36;
  }
  assert.equal(index,m.v.length);
  const canvas={width:W,height:H,getBoundingClientRect:()=>({left:0,top:0,width:W,height:H})},r=Object.create(Adventure3DRenderer.prototype);
  Object.assign(r,{canvas,world,zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],resize:noop,buildDynamic:noop,getLights:()=>[],getLighting:()=>({ambient:[.3,.3,.3],key:[.7,.7,.6],fog:[.2,.2,.2],fogDensity:0}),software:{render:()=>({})},ui:{hudHeight:106,touch:true,touchReserve:177},sceneObjects:world.objects()});
  CisternRenderer.prototype.render.call(r,{adventure:true,time:2,player:{x:world.state.x,z:world.state.y}},[],1/60);
  const ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop}),painter=new CisternSoftwarePainter({width:W,height:H,getContext:()=>ctx}),painted=[];
  painter._paintTriangle=(context,row)=>(painted.push(row),{draws:1,textured:0});const data=m.data();painter.render({meshes:{static:{data,count:data.length/12}},vp:r.vp,eye:r.eye,state:{adventure:true},time:2,quality:'low',lighting:r.getLighting()});
  assert.ok(painted.length>=12,id+' retains broad visible rock faces at actual native arrival phone framing');assert.ok(painted.every(row=>row.area>=5),'the native five-pixel cutoff is unchanged');painter.destroy();
 }
});
