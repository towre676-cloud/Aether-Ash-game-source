import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {Geometry} from '../cistern-renderer.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {installReconciledGround} from '../reconciled-ground.js';
import {installLivingAtlas} from '../living-atlas.js';
import {installTrailLife} from '../reconciled-travel.js';
import {installTownLife} from '../townlife.js';
import {installRegionalLife} from '../regional-life.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../embodied-origins.js';
import {installCampaignActuators} from '../campaign-actuators.js';
import {createWorldControls} from '../world-controls.js';
import {SIDE_CAMPAIGNS} from '../frontiers.js';
import {isExteriorArtScene} from '../exterior-art-selection-541.js';
import {sceneArtSpec} from '../scene-art-materials-541.js';
import {exteriorWorksitePlan541,appendExteriorWorksites,appendExteriorWorksiteDynamics,ownsExteriorProp541} from '../exterior-worksites-541.js';

function setup(){
 const world=new World(source);installReconciledGround(world);installLivingAtlas(world);installTrailLife(world);installTownLife(world);installRegionalLife(world);
 const origins=installEmbodiedOrigins(world),campaign=installCampaignActuators(world);world.worldControls=createWorldControls(world,origins,campaign);
 const native=world.objects.bind(world);world.objects=()=>[...native().filter(o=>!replacesEmbodiedOriginObject(world,o)),...world.embodiedOrigins.objects()];return world;
}
function enter(w,id){
 w.newGame({quiet:true});w.state.scene=id;w.state.chapter=w.scene.chapter||1;w.state.mode='field';const a=w.scene.arrive;[w.state.x,w.state.y]=[a[0]+.5,a[1]+.5];
 w.objects();w.livingAtlas.runtime();w.embodiedOrigins.snapshot();return w.objects();
}
function clip(poly,axis,value,greater){
 const out=[];if(!poly.length)return out;let a=poly.at(-1),da=(a[axis]-value)*(greater?1:-1);
 for(const b of poly){const db=(b[axis]-value)*(greater?1:-1);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((v,i)=>v+(b[i]-v)*t));}if(db>=0)out.push(b);a=b;da=db;}return out;
}
function area(poly){let a=0;for(let i=0;i<poly.length;i++){const b=poly[(i+1)%poly.length];a+=poly[i][0]*b[2]-b[0]*poly[i][2];}return Math.abs(a)/2;}
function assertLowSolidsClosed(mesh,scene){
 const blocked=new Set((scene.affordanceBlocked||[]).map(p=>p.join(',')));
 for(let i=0;i<mesh.v.length;i+=36){
  const tri=[0,12,24].map(j=>mesh.v.slice(i+j,i+j+3));if(Math.max(...tri.map(v=>v[1]))<=.075)continue;
  let p=clip(clip(tri,1,.075,true),1,2.6,false);if(p.length<3||area(p)<1e-9)continue;
  const x0=Math.floor(Math.min(...p.map(v=>v[0]))),x1=Math.floor(Math.max(...p.map(v=>v[0]))),z0=Math.floor(Math.min(...p.map(v=>v[2]))),z1=Math.floor(Math.max(...p.map(v=>v[2])));
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)if(scene.floor[z]?.[x]==='.'&&!blocked.has(x+','+z)){
   let q=clip(clip(clip(clip(p,0,x,true),0,x+1,false),2,z,true),2,z+1,false);assert.ok(area(q)<1e-7,`new low worksite face intrudes on ${scene.location} walk cell ${x},${z}`);
  }
 }
}

test('actual native exterior services receive purposeful grounded work bays without changing floor, actors, resources or inputs',()=>{
 const w=setup();let scenes=0,frontiers=0,sites=0,max=0;
 for(const[id,identity]of w.scenes){
  if(!isExteriorArtScene(identity))continue;const objects=enter(w,id),before=w.save(),floor=JSON.stringify(w.scene.floor),anchors=JSON.stringify(objects.map(o=>[o.type,o.xy,o.footprint])),plan=exteriorWorksitePlan541(w,{objects}),m=new Geometry(),g=new Geometry(),d=new Geometry();
  assert.ok(plan.sites.length>=1&&plan.sites.length<=4,`${id} has an actual service or threshold worksite`);
  const p=appendExteriorWorksites(m,{world:w,objects});appendExteriorWorksiteDynamics(d,g,{world:w,objects,time:1.25});
  assert.ok(p.stats.triangles>200&&p.stats.triangles<6000);assert.ok(m.v.every(Number.isFinite)&&d.v.every(Number.isFinite));assertLowSolidsClosed(m,w.scene);assertLowSolidsClosed(d,w.scene);
  for(const s of plan.sites){assert.ok(s.radius>=.36);assert.ok(Math.hypot(s.x-s.at.x,s.z-s.at.z)>=1.8&&Math.hypot(s.x-s.at.x,s.z-s.at.z)<=4.55);assert.equal(ownsExteriorProp541(w,s.anchor,{objects}),true);}
  assert.equal(w.save(),before);assert.equal(JSON.stringify(w.scene.floor),floor);assert.equal(JSON.stringify(objects.map(o=>[o.type,o.xy,o.footprint])),anchors);
  scenes++;sites+=plan.sites.length;max=Math.max(max,p.stats.triangles);if(id>=2000&&id<2060){frontiers++;assert.ok(plan.sites.some(s=>s.kind==='shelter'));assert.ok(plan.sites.some(s=>s.kind==='survey'));assert.ok(plan.sites.some(s=>s.anchor.frontierStep===1));}
 }
 assert.equal(scenes,95);assert.equal(frontiers,60);assert.ok(sites>180&&max<6000);
 for(const[id,s]of w.scenes)if(!isExteriorArtScene(s)){w.state.scene=id;assert.equal(exteriorWorksitePlan541(w).active,false);}
});

test('native commission survey and repair progress move the large physical instruments through distinct before, moving and changed states',()=>{
 const w=setup();
 for(let ri=0;ri<12;ri++){
  const id=2000+ri*5;enter(w,id);const c=SIDE_CAMPAIGNS.find(c=>c.regionIndex===ri&&c.area===0),objects=w.scene.objects.slice();w.state.frontiers={version:1,active:c.id,stages:{[c.id]:1},claimed:[],visited:[id]};
  const native=w.worldControls.objects().find(o=>o.frontierStep===1);assert.ok(native,'uses the actual eligible native field-apparatus descriptor');
  const draw=feedback=>{const m=new Geometry(),g=new Geometry(),saved=w.save();appendExteriorWorksiteDynamics(m,g,{world:w,objects,time:1.25,feedback});assert.equal(w.save(),saved);return m.v;};
  const before=draw(null),moving=draw({pending:{object:native,progress:.5}});w.state.frontiers.stages[c.id]=2;const changed=draw(null);
  assert.notDeepEqual(moving,before);assert.notDeepEqual(changed,before);assert.notDeepEqual(changed,moving);
 }
});

test('the changed apparatus signal sits in front of its opaque casing rather than being buried inside the new tank',()=>{
 const w=setup();enter(w,2030);const c=SIDE_CAMPAIGNS.find(c=>c.regionIndex===6&&c.area===0),objects=w.scene.objects.slice();w.state.frontiers={version:1,active:c.id,stages:{[c.id]:2},claimed:[],visited:[2030]};
 const m=new Geometry(),d=new Geometry(),g=new Geometry(),p=appendExteriorWorksites(m,{world:w,objects}),s=p.sites.find(s=>s.kind==='lens'),range=p.stats.ranges.find(r=>r.id===s.id),metal=p.spec.palette.metal;
 appendExteriorWorksiteDynamics(d,g,{world:w,objects,time:1.25});const body=[],signals=[];
 for(let i=range.start*12;i<range.end*12;i+=12)if(metal.every((v,k)=>Math.abs(m.v[i+6+k]-v)<1e-9)&&m.v[i+1]>s.y+.30&&m.v[i+1]<s.y+2.10)body.push(m.v[i+2]);
 for(let i=0;i<d.v.length;i+=12)if(d.v[i+9]===4&&Math.abs(d.v[i]-s.x)<s.radius&&Math.abs(d.v[i+2]-s.z)<s.radius&&d.v[i+1]>s.y+1.1&&d.v[i+1]<s.y+1.9)signals.push({z:d.v[i+2],nz:d.v[i+5]});
 assert.ok(body.length>20&&signals.length>=12);assert.ok(signals.every(v=>v.z>Math.max(...body)+.015&&v.nz>0),'the real emitted signal faces clear the opaque chamber and face the normal operating view');
});

const require=createRequire(import.meta.url),candidates=['@napi-rs/canvas'];if(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)candidates.push(join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
const runtime='/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/index.js';if(existsSync(runtime))candidates.push(runtime);
let raster=null;for(const name of candidates)try{raster=require(name);if(raster.createCanvas)break;}catch{}

test('the actual phone software renderer retains broad shelter and apparatus faces at their real native operating positions',raster?{}:{skip:'Optional real Skia canvas backend is not installed'},()=>{
 const previous=globalThis.OffscreenCanvas;globalThis.OffscreenCanvas=class{constructor(w,h){return raster.createCanvas(w,h);}};
 try{
  const w=setup(),seen=new Set();
  for(const id of[2000,2015,2030,2035,2045,2050,2055]){
   const objects=enter(w,id),m=new Geometry(),p=appendExteriorWorksites(m,{world:w,objects});
   for(const [index,s]of p.sites.entries()){
    if(seen.has(s.kind))continue;seen.add(s.kind);const range=p.stats.ranges[index],data=new Float32Array(m.v.slice(range.start*12,range.end*12)),canvas=raster.createCanvas(388,842),camera=Object.create(Adventure3DRenderer.prototype),rect={left:0,top:0,width:388,height:842},noop=()=>{};
    Object.assign(camera,{world:w,sceneObjects:objects,frameOptions:{},canvas:{width:388,height:842,getBoundingClientRect:()=>rect},zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],ui:{hudHeight:100,touch:true,touchReserve:177},drawDt:1/60,resize:noop,buildDynamic:noop,software:{render:()=>({})}});
    const at=s.at;w.state.x=at.x;w.state.y=at.z;camera.forceRender=true;camera.render({time:1,adventure:true,player:{x:at.x,z:at.z}},w.activeHeroes,1/60);
    const painter=new CisternSoftwarePainter(canvas),stats=painter.render({meshes:{static:{data,count:data.length/12}},vp:camera.vp,eye:camera.eye,time:1,state:{adventure:true,player:{x:at.x,z:at.z}},quality:'low',lighting:sceneArtSpec(w).lighting,lights:[]});
    assert.ok(stats.triangles>=18,`${s.kind} retains large front-facing readable geometry in the actual five-pixel phone raster (${stats.triangles})`);painter.destroy();
   }
  }
  assert.ok(seen.size>=9,'shelter, survey and the full family of native apparatus are exercised');
 }finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}
});
