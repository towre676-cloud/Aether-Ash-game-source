import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {expandAuthoredOpenings} from '../authored-openings.js';
import {buildSceneCraft,visibleCraftSites,craftOcclusion,craftAtlasSpec,SCENE_PROP_CROPS,paintSceneCraftGround,sceneCraftObjects,paintSceneCraftAtmosphere,craftEmitters} from '../scene-craft.js';

const fixture=()=>({location:711,key:'town',chapter:1,width:28,height:24,arrive:[13,12],doors:[{xy:[7,13]}],objects:[{type:'puzzle',xy:[19,12]}],floor:Array.from({length:24},(_,y)=>Array.from({length:28},(_,x)=>x>=6&&x<22&&y>=5&&y<19?'.':'#').join(''))});
const centre=p=>[p[0]+.5,p[1]+.5];
test('composition stays in blocked banks and protects arrivals, doors and interactions',()=>{
 const s=fixture(),before=JSON.stringify(s),plan=buildSceneCraft(s),anchors=[s.arrive,...s.doors.map(o=>o.xy),...s.objects.map(o=>o.xy)].map(centre);
 assert.ok(plan.sites.length>=3);assert.ok(plan.composition.groups.length>=2);assert.ok(plan.sites.length<=plan.composition.limits.props);
 for(const p of plan.sites){assert.notEqual(s.floor[Math.floor(p.y)]?.[Math.floor(p.x)],'.');assert.ok(anchors.every(a=>Math.hypot(a[0]-p.x,a[1]-p.y)>=plan.quietRadius));}
 assert.equal(JSON.stringify(s),before);assert.deepEqual(buildSceneCraft(s),plan);
});
test('invalid authored decorations cannot move into walking cells or create non-finite draw sites',()=>{
 const s=fixture();s.authoredOpening={clusters:[{x:13.5,y:12.5},{x:NaN,y:5},{x:4.5,y:8.5,kind:'fern',scale:9}],landmark:{xy:[13.5,12.5],kind:'test-furnace'},approach:[[13.5,12.5],[4.5,5.5],[NaN,3]],quietRadius:2.6};
 const p=buildSceneCraft(s);assert.equal(p.landmarks.length,0);assert.equal(p.sites.filter(v=>v.authored).length,1);assert.ok(p.sites.every(v=>Number.isFinite(v.x+v.y)&&v.scale<=1.35));assert.deepEqual(p.approach,[[13.5,12.5]]);
});
test('every authored life and first chapter composition keeps the original collision data',()=>{
 const raw=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),w=new World(raw);expandAuthoredOpenings(w.data);const scenes=w.data.scenes.filter(s=>s.authoredOpening);assert.ok(scenes.length>=28);
 let landmarks=0;for(const s of scenes){const before=JSON.stringify(s),p=buildSceneCraft(s);landmarks+=p.landmarks.length;assert.equal(JSON.stringify(s),before);assert.ok(p.sites.length<=240);for(const site of [...p.sites,...p.landmarks]){assert.notEqual(s.floor[Math.floor(site.y)]?.[Math.floor(site.x)],'.',s.key);assert.ok(Number.isFinite(site.x+site.y+site.scale),s.key);}assert.ok(p.approach.every(([x,y])=>s.floor[Math.floor(y)]?.[Math.floor(x)]==='.'));}
 assert.ok(landmarks>=14);
});
test('interior decoration uses room work rather than outdoor rocks and reeds',()=>{
 const s=fixture();s.key='clinic';s.authoredOpening={clusters:[{kind:'water',x:4.5,y:8.5},{kind:'stone',x:4.5,y:16.5}]};const p=buildSceneCraft(s);assert.equal(p.indoor,true);assert.deepEqual(p.sites.map(s=>s.kind),['medicine','medicine']);assert.ok(p.sites.every(s=>craftAtlasSpec(s)===null));
});
test('visible sites and particles are bounded and actors in front stay opaque',()=>{
 const plan=buildSceneCraft(fixture()),v={x0:5,y0:5,x1:12,y1:14};assert.ok(visibleCraftSites(plan,v,5).length<=5);assert.equal(visibleCraftSites(plan,v,0).length,0);assert.equal(visibleCraftSites(plan,{x0:100,y0:100,x1:110,y1:110}).length,0);
 const site={x:8,y:10,kind:'gauge',landmark:true,scale:1};assert.equal(craftOcclusion(site,[{x:8,y:10.2}]),1);assert.equal(craftOcclusion(site,[{x:8,y:8.7}]),.3);assert.equal(craftOcclusion(site,[{x:14,y:8.7}]),1);assert.equal(craftOcclusion(site,[{x:NaN,y:0}]),1);
 assert.ok(craftEmitters({...plan,landmarks:[{x:1,y:2,kind:'signal'},{x:4,y:5,kind:'furnace',seed:1}]}).length===1);
});
test('painted props use source rectangles within the unchanged archived transparent PNG',()=>{
 const png=fs.readFileSync(new URL('../../../../development/art/source-legacy-delivery/scene-props-v10.png',import.meta.url)),w=png.readUInt32BE(16),h=png.readUInt32BE(20);assert.equal(png.toString('ascii',1,4),'PNG');assert.equal(png[25],6);for(const [x,y,cw,ch]of SCENE_PROP_CROPS){assert.ok(x>=0&&y>=0&&cw>0&&ch>0&&x+cw<=w&&y+ch<=h);}
 assert.equal(craftAtlasSpec({landmark:true,kind:'gauge'}).id,2);assert.equal(craftAtlasSpec({landmark:true,kind:'mast',storyKind:'reed-relay'}).id,3);assert.equal(craftAtlasSpec({kind:'reeds'}).id,5);assert.equal(craftAtlasSpec({landmark:true,kind:'lamp'}),null);
});

test('painted bank boulders replace vector stones only in natural habitats at existing scale',()=>{
 const site={kind:'stone',seed:1295968249,scale:1.01},scene=fixture();
 const spec=craftAtlasSpec(site,scene);assert.equal(spec.id,4);assert.ok(spec.height*site.scale>=60&&spec.height*site.scale<=72);
 for(const style of ['foundry','ice','highland','storm','marble'])assert.equal(craftAtlasSpec(site,{...scene,biome:{style}}),null,style+' retains its regional variant');
 assert.equal(craftAtlasSpec({...site,indoor:true},scene),null);
 const raw=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),w=new World(raw),s=w.data.scenes.find(s=>s.location===50001),before=JSON.stringify(s),p=buildSceneCraft(s),stones=p.sites.filter(p=>p.kind==='stone');
 assert.ok(p.sites.length<=30);assert.ok(p.sites.every(p=>p.groupId&&['bank','work'].includes(p.role)));assert.ok(stones.every(p=>craftAtlasSpec(p,s)?.id===4));assert.equal(JSON.stringify(s),before);
});

function context(){const stack=[],draws=[];const c={globalAlpha:.61,globalCompositeOperation:'source-over',fillStyle:'#123',strokeStyle:'#456',lineWidth:3,save(){stack.push({globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth});},restore(){assert.ok(stack.length);Object.assign(this,stack.pop());},drawImage(...args){draws.push(args);},createLinearGradient(){return{addColorStop(){}};}};return {c:new Proxy(c,{get(target,key){return key in target?target[key]:(()=>{});}}),stack,draws};}
test('compatibility draws original atlas crops directly and all passes restore canvas state',()=>{
 const s=fixture();s.authoredOpening={clusters:[{x:4.5,y:8.5,kind:'reeds'}],landmark:{xy:[23.5,9.5],focus:[20.5,12.5],kind:'tide-sluice',materialKind:'water'}};const p=buildSceneCraft(s),{c,stack,draws}=context(),v={x0:0,y0:0,x1:28,y1:24},r={ctx:c,assets:{sceneProps:{width:1774,height:887}},compatibility:true,time:1,followers:[]},before={alpha:c.globalAlpha,fill:c.fillStyle,stroke:c.strokeStyle,width:c.lineWidth};
 paintSceneCraftGround(r,p,v);for(const o of sceneCraftObjects(r,p,v,{state:{x:13.5,y:12.5}}))o.draw();paintSceneCraftAtmosphere(r,p,v,{});
 assert.ok(draws.some(a=>a.length===9));assert.equal(stack.length,0);assert.deepEqual({alpha:c.globalAlpha,fill:c.fillStyle,stroke:c.strokeStyle,width:c.lineWidth},before);
});
