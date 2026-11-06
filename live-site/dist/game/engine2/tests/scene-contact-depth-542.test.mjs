import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {Geometry,CisternRenderer} from '../cistern-renderer.js';
import {CisternSoftwarePainter} from '../cistern-software.js';
import {adventureBuildingPlan} from '../adventure-3d-geometry.js';
import {exteriorAnchorSites} from '../exterior-anchor-plan-541.js';
import {exteriorWorksitePlan541} from '../exterior-worksites-541.js';
import {appendSceneContactDepth542,sceneContactDepthPlan542} from '../scene-contact-depth-542.js';

const key=(x,z)=>x+','+z;
function validate(mesh,scene,objects){
 const blocked=new Set((scene.affordanceBlocked||[]).map(p=>key(...p))),controlTypes=new Set(['portal','origin-exit','embodied-action','puzzle','switch','riddle','frontier-landmark']),controls=new Set(objects.filter(o=>!o.hidden&&o.revealed!==false&&controlTypes.has(o.type)&&o.xy).map(o=>key(Math.floor(o.xy[0]+.5),Math.floor(o.xy[1]+.5))));
 assert.ok(mesh.v.every(Number.isFinite));assert.ok(mesh.v.length/36<=1800);
 for(let i=0;i<mesh.v.length;i+=36){
  const a=mesh.v.slice(i,i+3),b=mesh.v.slice(i+12,i+15),c=mesh.v.slice(i+24,i+27);
  assert.ok((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])>1e-10,'actual shadow winding faces the native floor');
  for(const w of[[1/3,1/3,1/3],[.8,.1,.1],[.1,.8,.1],[.1,.1,.8]]){
   const x=Math.floor(a[0]*w[0]+b[0]*w[1]+c[0]*w[2]),z=Math.floor(a[2]*w[0]+b[2]*w[1]+c[2]*w[2]),k=key(x,z);
   assert.equal(scene.floor[z]?.[x],'.','a real open native cell receives every nonzero shadow face');assert.equal(blocked.has(k),false);assert.equal(controls.has(k),false,'native door and manipulation cells retain a clear input floor');
  }
  for(let j=i;j<i+36;j+=12){assert.ok(mesh.v[j+1]>=.026&&mesh.v[j+1]<=.027);assert.equal(mesh.v[j+9],8);assert.equal(mesh.v[j+10],0);assert.ok(mesh.v[j+11]>0&&mesh.v[j+11]<=.22);}
 }
}

test('all 165 ordinary World scenes gain bounded structural contact without changing floor, native inputs or saved state',()=>{
 const w=new World(source);w.newGame({quiet:true});let scenes=0,nonempty=0,rooted=0,max=0;
 for(const[id,scene]of w.scenes){
  w.state.scene=id;const at=scene.authoredOpening?.arrival||scene.arrive?.map(v=>v+.5);if(at)[w.state.x,w.state.y]=at;
  const objects=scene.objects||[],sites=exteriorAnchorSites(w,{objects}),worksites=exteriorWorksitePlan541(w,{objects}).sites,buildings=adventureBuildingPlan(w),before=w.save(),floor=JSON.stringify(scene.floor),m=new Geometry(),stats=appendSceneContactDepth542(m,{world:w,objects,sites,worksites,buildings});
  if(scene.originId==='veyr-storm'){assert.equal(stats.active,false);assert.equal(m.v.length,0);continue;}
  scenes++;if(m.v.length)nonempty++;if(stats.casters)rooted++;max=Math.max(max,stats.triangles);assert.equal(m.v.length/36,stats.visibleTriangles);assert.equal(stats.triangles,stats.visibleTriangles);assert.ok(stats.planTriangles>=stats.visibleTriangles);assert.ok(stats.wallRuns>0);validate(m,scene,objects);
  assert.equal(w.save(),before);assert.equal(JSON.stringify(scene.floor),floor);const again=new Geometry();appendSceneContactDepth542(again,{world:w,objects,sites,worksites,buildings});assert.deepEqual(again.v,m.v,'static native authoring emits the same shadow data');
 }
 assert.equal(scenes,165);assert.equal(nonempty,165);assert.ok(rooted>60,'actual work bays, building parcels and furnishing bases cast onto nearby ground');assert.ok(max<=1800);
 const m=new Geometry();assert.equal(appendSceneContactDepth542(m,{world:{state:{player:{x:0,z:0}}}}).active,false,'the native Cistern is outside the World floor owner');assert.equal(m.v.length,0);
});

function fixture(){return{location:999542,key:'field',chapter:1,width:9,height:8,arrive:[4,5],floor:['#########','#.......#','#.......#','#..##...#','#..##...#','#.......#','#.......#','#########'],objects:[{type:'portal',xy:[4,6]},{type:'switch',xy:[6,2]}],affordanceBlocked:[]};}

test('closed authored roots produce short opposing-key casts and exclude actual water, control and blocker receivers',()=>{
 const scene=fixture(),world={scene},sites=[{x:4.35,z:4,radius:.62,height:2.5,kind:'forge'}],m=new Geometry(),plan=sceneContactDepthPlan542(world,{sites});
 assert.equal(plan.casters,1);assert.ok(plan.shapes.some(s=>s.kind==='cast-shadow'));assert.ok(plan.shapes.some(s=>s.kind==='root-contact'));
 appendSceneContactDepth542(m,{world,sites});validate(m,scene,scene.objects);
 const cast=plan.shapes.filter(s=>s.kind==='cast-shadow').flatMap(s=>s.points);assert.ok(cast.some(p=>p[0]>4.7&&p[1]<3.5),'the native key direction throws a short grounded cast');
 const invalid=new Geometry();const result=appendSceneContactDepth542(invalid,{world,sites:[{x:1.5,z:1.5,radius:.9,height:2}]});assert.equal(result.casters,0,'an invented rooted solid on the real walking lane cannot cast');
 const waterScene={...scene,key:'river'},river={scene:waterScene};const p=sceneContactDepthPlan542(river,{sites});for(const s of p.shapes)for(const q of s.points)assert.ok(Number.isFinite(q[0]+q[1]));
});

test('floor and blocker edits invalidate only the contact plan and long walls stay connected instead of tracing an internal checkerboard',()=>{
 const scene=fixture(),world={scene},a=sceneContactDepthPlan542(world);assert.equal(sceneContactDepthPlan542(world),a,'unchanged descriptors reuse the exact cached static polygons');
 const upper=a.shapes.filter(s=>s.kind==='wall-contact'&&s.points.every(v=>v[1]>=1&&v[1]<1.5));assert.ok(upper.some(s=>Math.max(...s.points.map(v=>v[0]))-Math.min(...s.points.map(v=>v[0]))>=7),'the whole seven-cell wall has one connected receiver');
 scene.affordanceBlocked.push([1,1]);const b=sceneContactDepthPlan542(world);assert.notEqual(b,a);const m=new Geometry();appendSceneContactDepth542(m,{world});validate(m,scene,scene.objects);
 scene.floor[1]='#...#...#';const c=sceneContactDepthPlan542(world);assert.notEqual(c,b);const changed=new Geometry();appendSceneContactDepth542(changed,{world});validate(changed,scene,scene.objects);
});

test('live lead culling reuses cached bounds, softly fades distant receivers and restores identical shadows on re-entry',()=>{
 const floor=Array.from({length:18},(_,z)=>z===0||z===17?'#'.repeat(64):'#'+'.'.repeat(62)+'#');
 for(const x of[4,12,46])for(const z of[7,8])floor[z]=floor[z].slice(0,x-1)+'##'+floor[z].slice(x+1);
 const scene={location:999543,key:'field',chapter:1,width:64,height:18,arrive:[4,11],floor,objects:[],affordanceBlocked:[]},state={x:4.5,y:11.5},world={scene,state},sites=[4.35,12.35,46.35].map(x=>({x,z:8,radius:.62,height:2.5})),plan=sceneContactDepthPlan542(world,{sites});
 assert.ok(plan.shapes.every(s=>s.bounds&&[s.bounds.x0,s.bounds.x1,s.bounds.z0,s.bounds.z1,s.triangles].every(Number.isFinite)),'bounds are authored once with each clipped receiver polygon');
 const before=JSON.stringify(scene),snapshot=JSON.stringify(state),near=new Geometry(),stats=appendSceneContactDepth542(near,{world,sites});
 assert.ok(stats.visibleTriangles<stats.planTriangles);assert.ok(stats.skippedShapes>0&&stats.fadedShapes>0);assert.equal(JSON.stringify(state),snapshot);assert.equal(JSON.stringify(scene),before);
 const full=new Geometry(),fullStats=appendSceneContactDepth542(full,{world:{scene},sites});assert.equal(fullStats.visibleTriangles,plan.triangles,'scene-only callers retain complete authoring');assert.ok(full.v.length>near.v.length);
 state.x=46.5;const far=new Geometry(),other=appendSceneContactDepth542(far,{world,sites});assert.ok(other.visibleTriangles<other.planTriangles);assert.notDeepEqual(far.v,near.v,'walking selects the current native receiver neighbourhood');assert.equal(sceneContactDepthPlan542(world,{sites}),plan,'movement never rebuilds or reclips the cached static plan');
 state.x=4.5;const returned=new Geometry();appendSceneContactDepth542(returned,{world,sites});assert.deepEqual(returned.v,near.v,'re-entering gives the exact same geometry and alpha values');
});

const require=createRequire(import.meta.url),candidates=['@napi-rs/canvas'];if(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)candidates.push(join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
const runtime='/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/index.js';if(existsSync(runtime))candidates.push(runtime);
let raster=null;for(const name of candidates)try{raster=require(name);if(raster.createCanvas)break;}catch{}

test('actual phone software painting darkens the connected structure contact while native input floor stays unchanged',raster?{}:{skip:'Optional real Skia backend is not installed'},()=>{
 const W=388,H=842,scene=fixture(),world={scene},shadow=new Geometry();appendSceneContactDepth542(shadow,{world,sites:[{x:4,z:4,radius:.62,height:2.5}]});
 const bounded=new Geometry();appendSceneContactDepth542(bounded,{world:{scene,state:{x:4,y:4}},sites:[{x:4,z:4,radius:.62,height:2.5}]});assert.deepEqual(bounded.v,shadow.v,'all nearby contact retains exact geometry and alpha before the existing phone raster');
 const camera=Object.create(CisternRenderer.prototype),noop=()=>{};Object.assign(camera,{canvas:{width:W,height:H},zoom:1.35,camera:null,destroyed:false,lost:false,stats:{},meshes:{},sprites:[],resize:noop,buildDynamic:noop,software:{render:()=>({})}});camera.render({time:2,player:{x:4,z:4}},[],1/60);
 const base=new Geometry();base.quad([0,.018,0],[0,.018,8],[9,.018,8],[9,.018,0],[.55,.57,.50],6,0,1,[0,1,0]);
 const paint=enabled=>{const canvas=raster.createCanvas(W,H),painter=new CisternSoftwarePainter(canvas),data=base.data(),sh=shadow.data();painter.render({meshes:{static:{data,count:data.length/12},...(enabled?{shadows:{data:sh,count:sh.length/12}}:{})},vp:camera.vp,eye:camera.eye,state:{adventure:true,player:{x:4,z:4}},time:2,quality:'low',lights:[],lighting:{ambient:[.7,.7,.7],key:[.1,.1,.1],fog:[.02,.03,.04],fogDensity:0}});const p=canvas.getContext('2d').getImageData(0,0,W,H);painter.destroy();return p;};
 const off=paint(false),on=paint(true);let darker=0,worst=0;
 for(let i=0;i<off.data.length;i+=4){const delta=off.data[i]-on.data[i];if(delta>2)darker++;worst=Math.max(worst,delta);}
 assert.ok(darker>100,'real connected contact survives the software five-pixel face threshold');assert.ok(worst>5&&worst<95,'the contact adds depth without turning the floor into a black void');
 const project=(x,z)=>{const vp=camera.vp,w=vp[3]*x+vp[11]*z+vp[15];return{x:Math.round((.5+(vp[0]*x+vp[8]*z+vp[12])/w*.5)*W),y:Math.round((.5-(vp[1]*x+vp[9]*z+vp[13])/w*.5)*H)};};
 for(const o of scene.objects){const q=project(o.xy[0]+.5,o.xy[1]+.5);if(q.x<0||q.x>=W||q.y<0||q.y>=H)continue;const i=(q.y*W+q.x)*4;assert.deepEqual([...on.data.slice(i,i+4)],[...off.data.slice(i,i+4)],'the exact native input centre retains its floor raster');}
});
