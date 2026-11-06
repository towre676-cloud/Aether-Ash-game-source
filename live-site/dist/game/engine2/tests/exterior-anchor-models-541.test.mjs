import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry} from '../cistern-renderer.js';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {isInteriorScene} from '../scene-identity.js';
import {sceneArtSpec} from '../scene-art-materials-541.js';
import {exteriorAnchorSites} from '../exterior-anchor-plan-541.js';
import {appendExteriorAnchorModel,appendExteriorAnchorDynamics} from '../exterior-anchor-models-541.js';
import {installReconciledGround} from '../reconciled-ground.js';
import {installLivingAtlas} from '../living-atlas.js';
import {installTrailLife} from '../reconciled-travel.js';
import {installTownLife} from '../townlife.js';
import {installRegionalLife} from '../regional-life.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../embodied-origins.js';
import {installCampaignActuators} from '../campaign-actuators.js';
import {createWorldControls} from '../world-controls.js';

const raw=JSON.parse(readFileSync(new URL('../world.json',import.meta.url))),KINDS=['canopy','roots','collector','aqueduct','cactus','coral','tideglass','waterwheel','windharp','conduit','basalt','mineral','ice-rib','aurora-rib','ruin','marble','pavilion'];
function setup(){const world=new World(raw);world.newGame({quiet:true});return world;}
function runtimeSetup(){
 const world=new World(raw);installReconciledGround(world);installLivingAtlas(world);installTrailLife(world);installTownLife(world);installRegionalLife(world);
 const origins=installEmbodiedOrigins(world),campaign=installCampaignActuators(world);world.worldControls=createWorldControls(world,origins,campaign);
 const native=world.objects.bind(world);world.objects=()=>[...native().filter(o=>!replacesEmbodiedOriginObject(world,o)),...world.embodiedOrigins.objects()];return world;
}
function draw(site,spec){const mesh=new Geometry(),result=appendExteriorAnchorModel(mesh,site,spec);return{mesh,result};}
function lowPolygon(points,ceiling){
 const out=[];let a=points.at(-1),da=a[1]-ceiling;
 for(const b of points){const db=b[1]-ceiling;if((da<=0)!==(db<=0)){const t=da/(da-db);out.push(a.map((v,i)=>v+(b[i]-v)*t));}if(db<=0)out.push(b);a=b;da=db;}
 return out;
}

test('all seventeen regional vocabularies form bounded deterministic connected landmarks at narrow and full sites',()=>{
 const world=setup(),spec=sceneArtSpec(world);let upperCrowns=0;
 for(const kind of KINDS)for(const slim of[false,true]){
  const site={x:17.5,z:11.5,y:.63,kind,slim,index:3,anchorId:'native-approach'},a=draw(site,spec),b=draw(site,spec);
  assert.ok(a.result.triangles>=250&&a.result.triangles<=850,kind+' fits the per-site mobile budget');assert.equal(a.result.triangles,a.mesh.v.length/36);assert.deepEqual(a.mesh.v,b.mesh.v);assert.ok(a.mesh.v.every(Number.isFinite));
  let radius=0,top=-Infinity;for(let i=0;i<a.mesh.v.length;i+=12){radius=Math.max(radius,Math.hypot(a.mesh.v[i]-site.x,a.mesh.v[i+2]-site.z));top=Math.max(top,a.mesh.v[i+1]-site.y);}
  assert.ok(radius<=1.85&&top<=4.5,kind+' stays within the actual near-approach silhouette envelope');if(slim&&radius>.65)upperCrowns++;
  for(let i=0;i<a.mesh.v.length;i+=36){const tri=[0,12,24].map(j=>[a.mesh.v[i+j]-site.x,a.mesh.v[i+j+1]-site.y,a.mesh.v[i+j+2]-site.z]);for(const p of lowPolygon(tri,2.6))assert.ok(Math.hypot(p[0],p[2])<=(slim?.34:1.36)+1e-8,kind+' keeps the whole clipped low face inside its real closed root, including edges crossing head height');}
 }
 assert.ok(upperCrowns>=10,'narrow roots carry substantial grouped crowns rather than distant token sticks');
 const mesh=new Geometry();assert.equal(appendExteriorAnchorModel(mesh,{x:NaN,z:0},spec),null);assert.equal(mesh.v.length,0);
});

test('actual new lower faces fit native closed tiles in every exterior without changing floor, state or native anchors',()=>{
 const world=runtimeSetup(),scenes=[...world.scenes.values()].filter(s=>s.floor&&!s.originId&&!s.secret_key&&!isInteriorScene(s));let checked=0,sites=0,faces=0;
 assert.equal(scenes.length,95,'the geometry check uses the complete actual exterior population');
 for(const scene of scenes){
  world.newGame({quiet:true});world.state.scene=scene.location;world.state.chapter=scene.chapter||1;world.state.mode='field';const at=scene.authoredOpening?.arrival||scene.arrive.map(v=>v+.5);[world.state.x,world.state.y]=at;
  world.objects();world.livingAtlas.runtime();world.embodiedOrigins.snapshot();const objects=world.objects(),before=world.save(),identity=JSON.stringify(scene),spec=sceneArtSpec(world),actual=exteriorAnchorSites(world,{objects}),blocked=new Set((scene.affordanceBlocked||[]).map(p=>p[0]+','+p[1]));assert.ok(actual.length&&actual.length<=12,'each actual native exterior receives bounded composed approach sites');
  for(const site of actual){
   const {mesh,result}=draw(site,spec);assert.ok(result&&result.triangles>250);sites++;
   for(let i=0;i<mesh.v.length;i+=36){const tri=[0,12,24].map(j=>[mesh.v[i+j],mesh.v[i+j+1]-site.y,mesh.v[i+j+2]]),low=lowPolygon(tri,2.6);
    for(const p of low){const x=Math.floor(p[0]),z=Math.floor(p[2]);assert.ok(scene.floor[z]?.[x]!=='.'||blocked.has(x+','+z),scene.location+' has no low model vertex or clipped edge on the fully installed native walk mask');}faces+=!!low.length;
   }
  }
  assert.equal(world.save(),before);assert.equal(JSON.stringify(scene),identity);checked++;
 }
 assert.equal(checked,95);assert.ok(sites>=500&&sites<=95*12,'the check consumes the real complete near-anchor composition');assert.ok(faces>50000,'the proof checks actual emitted low geometry across all native exteriors');
});

const noop=()=>{};
function context(){return{setTransform:noop,fillRect:noop,save:noop,restore:noop,translate:noop,scale:noop,drawImage:noop,clearRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,closePath:noop,clip:noop,stroke:noop,fill:noop,createPattern:()=>({}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})};}
function withSurfaces(run){const previous=globalThis.OffscreenCanvas;globalThis.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;this.context=context();}getContext(){return this.context;}};try{return run();}finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}}

test('actual low-quality software culling retains broad coloured crown and body faces for every regional model',()=>withSurfaces(()=>{
 const world=setup(),spec=sceneArtSpec(world),d=[.22,.75,.78],L=Math.hypot(...d);for(let i=0;i<3;i++)d[i]/=L;
 const h=Math.hypot(d[0],d[2]),right=[d[2]/h,0,-d[0]/h],up=[d[1]*right[2],d[2]*right[0]-d[0]*right[2],-d[1]*right[0]],scale=.32;
 const vp=new Float32Array([scale*right[0],scale*up[0],0,0,0,scale*up[1],0,0,scale*right[2],scale*up[2],0,0,0,-.45,0,1]);
 for(const kind of KINDS)for(const slim of[false,true]){
  const {mesh}=draw({x:0,y:0,z:0,kind,slim,index:2},spec),painter=new CisternSoftwarePainter({width:388,height:842,getContext:()=>context()}),painted=[];
  painter._paintTriangle=(ctx,row)=>(painted.push({...row}),{draws:1,textured:0});
  const stats=painter.render({meshes:{static:{data:mesh.data(),count:mesh.v.length/12}},vp,eye:[2.64,11,9.36],quality:'low',lights:[],lighting:spec.lighting,state:{adventure:true,groundClipY:-.13,player:{x:0,z:0}}});
  assert.ok(stats.triangles>=45,kind+' survives actual backface, clipping and 5px area culling at phone resolution');
  const width=Math.max(...painted.map(t=>t.maxX))-Math.min(...painted.map(t=>t.minX)),height=Math.max(...painted.map(t=>t.maxY))-Math.min(...painted.map(t=>t.minY));
  assert.ok(width>=45&&height>=100,'the visible silhouette occupies a readable phone region, including human-scale grounded masses');assert.ok(new Set(painted.map(t=>t.color)).size>=5,'the visible body has multiple actual lit material faces');painter.destroy();
 }
}));

test('wind cloth follows the shared clock above head height and never advances a native mechanism',()=>{
 const world=setup(),spec=sceneArtSpec(world),site={x:3.5,z:5.5,y:.42,slim:true,index:2,kind:'windharp'},a=new Geometry(),b=new Geometry(),c=new Geometry(),saved=world.save();
 assert.equal(appendExteriorAnchorDynamics(a,site,spec,1).triangles,4);appendExteriorAnchorDynamics(b,site,spec,1);appendExteriorAnchorDynamics(c,site,spec,2);assert.deepEqual(a.v,b.v);assert.notDeepEqual(a.v,c.v);
 for(let i=0;i<a.v.length;i+=12)assert.ok(a.v[i+1]>site.y+2.6);assert.equal(world.save(),saved);
});

test('full regional sites carry grounded understory and human-scale mass rather than the narrow-site pole silhouette',()=>{
 const world=setup(),spec=sceneArtSpec(world);
 for(const kind of['canopy','roots','collector','aqueduct','basalt','mineral','ice-rib','waterwheel']){
  const {mesh}=draw({x:0,y:0,z:0,kind,slim:false,index:2},spec);let broadLow=0;
  for(let i=0;i<mesh.v.length;i+=36){const x=(mesh.v[i]+mesh.v[i+12]+mesh.v[i+24])/3,y=(mesh.v[i+1]+mesh.v[i+13]+mesh.v[i+25])/3,z=(mesh.v[i+2]+mesh.v[i+14]+mesh.v[i+26])/3;if(y<1.5&&Math.hypot(x,z)>.35)broadLow++;}
  assert.ok(broadLow>=140,kind+' has substantial real lower mass outside a slim pole, grounded inside its unchanged closed root patch');
 }
 const spore=draw({x:0,y:0,z:0,kind:'collector',slim:false,index:0},spec).mesh;
 for(const h of[1.2,2.0,3.1]){let cap=0;for(let i=0;i<spore.v.length;i+=36)if(spore.v[i+9]===5&&Math.abs((spore.v[i+1]+spore.v[i+13]+spore.v[i+25])/3-h)<.25)cap++;assert.ok(cap>=40,'the actual rooted spore group has a substantial cap at each human-scale tier');}
 const basalt=draw({x:0,y:0,z:0,kind:'basalt',slim:false,index:0},spec).mesh;let fissure=0;
 for(let i=0;i<basalt.v.length;i+=36)if(basalt.v[i+10]>.15&&(basalt.v[i+1]+basalt.v[i+13]+basalt.v[i+25])/3<1.3){assert.ok(basalt.v[i+5]>.8,'the fitted hot cleft faces out of the actual mass toward the game camera');fissure++;}
 assert.equal(fissure,6,'three broad joined fissure spans cross the connected basalt body');
});
