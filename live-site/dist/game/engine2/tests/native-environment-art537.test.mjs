import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry,C} from '../cistern-renderer.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';
import {isObservatory,buildObservatoryGeometry} from '../observatory-art.js';
import {adventureBuildingPlan} from '../adventure-3d-geometry.js';
import {originStagingPlan,appendOriginStaging} from '../adventure-origin-staging.js';
import {adventureLandscapePlan} from '../adventure-landscape.js';
import {nativeEnvironmentArtPlan537,appendNativeEnvironmentArt537,NATIVE_ENV537_ART_PROVENANCE} from '../native-environment-art537.js';

const source=JSON.parse(readFileSync(new URL('../world.json',import.meta.url),'utf8'));
const world=()=>{const w=new World(source);w.newGame({quiet:true});return w;};
const options=w=>({world:w,buildingPlans:adventureBuildingPlan(w),originPlan:originStagingPlan(w),landscapePlan:adventureLandscapePlan(w)});

test('authored Veyr headlands replace the additive service-bank layer under the actual renderer owner',()=>{
 const w=world();
 for(const id of[50012,50013]){w.state.scene=id;w.objects();const before=w.save(),scene=JSON.stringify(w.scene),renderer={world:w,effectiveQuality(){throw Error('compact headlands must bypass generic ornament assembly');}},mesh=Adventure3DRenderer.prototype.buildArchitecture.call(renderer);
  assert.ok(isObservatory(w));assert.equal(renderer.environmentArt537,null);assert.equal(renderer.compositionPlan.stats.authored,'listening-headland');assert.equal(mesh.observatory.schema,1);assert.equal(mesh.observatory.groundY,.02);assert.ok(mesh.v.length/36<15000,'the authored headland and secondary craft remain bounded');
  assert.deepEqual(mesh.v,buildObservatoryGeometry(Geometry,C,w).v,'no second layer of legacy roof banks may cover the authored headland');assert.equal(w.save(),before);assert.equal(JSON.stringify(w.scene),scene);
 }
 assert.match(NATIVE_ENV537_ART_PROVENANCE.adaptedFrom,/dressHouse/);
});

test('native building details respect full parcel bodies and leave actual thresholds untouched',()=>{
  const w=world();w.state.scene=5;w.objects();const o=options(w),p=nativeEnvironmentArtPlan537(o);
  const facades=p.groups.filter(g=>g.kind==='attached-facade'),roofs=p.groups.filter(g=>g.kind==='roof-slope-courses');
  assert.ok(facades.length>=5);assert.equal(facades.length,roofs.length);
  for(const g of [...facades,...roofs]){
    const bounds=g.footprint;assert.ok(o.buildingPlans.some(b=>b.bodyRects.some(r=>r.x===bounds.x&&r.z===bounds.z&&r.w===bounds.w&&r.d===bounds.d)));
    for(const f of g.quads)for(const [x,y,z]of f.points){assert.ok(Number.isFinite(y)&&y>=0);assert.notEqual(w.scene.floor[Math.floor(z)]?.[Math.floor(x)],'.',g.id+' added solid-looking art to the native walking lane');}
  }
  assert.ok(facades.some(g=>g.quads.some(f=>f.color[0]<.15&&f.points[0][1]>.9)),'industrial bodies have readable dark slit recesses');
});

test('all 165 generic places retain bounded native detail while both authored headlands keep exclusive geometry ownership',()=>{
  const w=world();let places=0,decorated=0,maxAdded=0,maxOrigin=0,headlands=0,origins=0;
  for(const[id,s]of w.scenes){
    w.state.scene=id;w.objects();if(isObservatory(w)){const before=w.save(),renderer={world:w};const mesh=Adventure3DRenderer.prototype.buildArchitecture.call(renderer);assert.equal(mesh.observatory.part,s.originPart);assert.equal(renderer.environmentArt537,null);assert.ok(mesh.v.every(Number.isFinite));assert.equal(w.save(),before);headlands++;continue;}const o=options(w),saved=w.save(),floor=JSON.stringify(s.floor),objects=JSON.stringify(s.objects),doors=JSON.stringify(s.doors),p=nativeEnvironmentArtPlan537(o),g=new Geometry();
    appendNativeEnvironmentArt537(g,o);const data=g.data(),triangles=data.length/36;
    assert.ok(data.every(Number.isFinite));assert.equal(data.length%36,0);assert.ok(triangles<=(s.originId?1100:1200),id+' static budget');
    assert.equal(JSON.stringify(nativeEnvironmentArtPlan537(o)),JSON.stringify(p),'scene rebuilds retain the same architecture finish');
    assert.equal(w.save(),saved);assert.equal(JSON.stringify(s.floor),floor);assert.equal(JSON.stringify(s.objects),objects);assert.equal(JSON.stringify(s.doors),doors);
    for(const group of p.groups.filter(g=>g.kind!=='existing-cliff-strata'))for(const q of group.quads)for(const[x,,z]of q.points){
      const base=s.household?.floorBase||s.floor,partition=(s.household?.partitions||[]).some(p=>p.x===Math.floor(x)&&p.y===Math.floor(z));
      assert.ok(base[Math.floor(z)]?.[Math.floor(x)]!=='.'||partition,id+' finish overlaps structural floor');
    }
    if(s.originId){origins++;const origin=new Geometry();appendOriginStaging(origin,{world:w});maxOrigin=Math.max(maxOrigin,origin.v.length/36+triangles);assert.ok(origin.v.length/36+triangles<7000,id+' origin plus detail remains bounded');}
    if(triangles)decorated++;maxAdded=Math.max(maxAdded,triangles);places++;
  }
  assert.equal(places,165);assert.equal(headlands,2);assert.equal(origins,12);assert.ok(decorated>120);assert.ok(maxAdded>1000);assert.ok(maxOrigin>3000&&maxOrigin<7000);
});

test('battery art reduces only ornament count and invalid or absent native inputs create no scenery',()=>{
  const w=world();w.state.scene=5;const o=options(w),high=new Geometry(),low=new Geometry();appendNativeEnvironmentArt537(high,o);appendNativeEnvironmentArt537(low,{...o,quality:'battery'});
  assert.ok(low.v.length/36<=600&&low.v.length<high.v.length);assert.ok(low.v.length>0);
  const zero=new Geometry();appendNativeEnvironmentArt537(zero,{...o,maxTriangles:0});assert.equal(zero.v.length,0);
  const missing=new Geometry();appendNativeEnvironmentArt537(missing,{});assert.equal(missing.v.length,0);
  const before=w.save(),invalid=new Geometry();appendNativeEnvironmentArt537(invalid,{world:w,buildingPlans:[{id:'bad',height:3,bodyRects:[{x:NaN,z:1,w:3,d:3},{x:-4,z:-3,w:1,d:1}]}]});assert.equal(invalid.v.length,0);assert.equal(w.save(),before);
});

test('limited generic static detail selects the nearest native facade and repeats exactly at the same native or explicit focus',()=>{
  const w=world();w.state.scene=5;w.objects();const o=options(w),plan=nativeEnvironmentArtPlan537(o);
  const cover=plan.groups.filter(g=>g.kind==='attached-facade').at(-1),r=cover.footprint,focus={x:r.x+r.w/2,z:r.z+r.d/2};
  const limit=cover.quads.length*2;
  assert.ok(limit<=600);assert.notEqual(plan.groups[0].id,cover.id,'fixture exercises the source-order allocation across actual building parcels');
  const capture=opts=>{const faces=[];appendNativeEnvironmentArt537({quad:(...args)=>faces.push(args)},{...o,quality:'battery',maxTriangles:limit,...opts});return faces;};
  const before=w.save(),first=capture({focus}),repeat=capture({focus});
  assert.deepEqual(first,repeat,'same focus and source plans produce byte-equivalent face arguments');
  assert.deepEqual(first[0].slice(0,4),cover.quads[0].points,'the foreground facade receives detail before distant native parcels');
  assert.equal(first.length,cover.quads.length,'whole nearest group fits the bounded allowance');
  assert.equal(w.save(),before,'explicit review focus does not move the player or update a save');
  w.state.x=focus.x;w.state.y=focus.z;
  const saved=w.save();assert.deepEqual(capture({}),first,'the native player position supplies the same static focus');assert.equal(w.save(),saved);
});
