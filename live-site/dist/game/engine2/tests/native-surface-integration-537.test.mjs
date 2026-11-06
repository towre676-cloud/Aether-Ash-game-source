import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../world.js';
import {Geometry,C} from '../cistern-renderer.js';
import {Adventure3DRenderer} from '../adventure-3d-renderer.js';
import {buildObservatoryGeometry,observatoryScenePlan} from '../observatory-art.js';
import {softwareMaterialIndex} from '../cistern-software.js';
import {appendAdventureGroundComposition} from '../adventure-ground-composition.js';
import {appendAdventureLandscape} from '../adventure-landscape.js';

const data=JSON.parse(readFileSync(new URL('../world.json',import.meta.url)));
const ready={surface:true,water:true,wood:true};
function upward(mesh){const out=[];for(let i=0;i<mesh.v.length;i+=36)if(mesh.v[i+4]>.9)out.push({height:mesh.v[i+1],material:mesh.v[i+9]});return out;}

test('actual town circulation overlays expose finish maps instead of covering them with matte panels',()=>{
 const w=new World(data);w.newGame({quiet:true});w.state.scene=5;
 const mesh=new Geometry(),plan=appendAdventureGroundComposition(mesh,{world:w}),surfaces=upward(mesh).filter(p=>[.019,.023,.026].some(h=>Math.abs(h-p.height)<.0001));
 assert.ok(plan.paths.length&&plan.habitat.length&&surfaces.length>50);
 assert.ok(surfaces.every(p=>softwareMaterialIndex(p.material,1,ready)>=0),'the visible street and verge faces must actually consume the shared material atlas');
});

test('authored observatory paving consumes its stone surface at the exact native ground height',()=>{
 const w=new World(data);w.newGame({originId:'veyr-storm',quiet:true});
 for(const id of[50012,50013]){w.state.scene=id;const before=w.save(),plan=observatoryScenePlan(w),renderer={world:w},mesh=Adventure3DRenderer.prototype.buildArchitecture.call(renderer),paving=upward(mesh).filter(p=>Math.abs(p.height-plan.groundY)<.00001);
  assert.equal(plan.groundY,.02);assert.ok(paving.length>100);assert.ok(paving.every(p=>p.material===0&&softwareMaterialIndex(p.material,1,ready)===0),'each court face uses the authored limestone atlas quadrant, rather than flat matte color or the retired slate/gravel overlay');
  assert.equal(renderer.environmentArt537,null);assert.deepEqual(mesh.v,buildObservatoryGeometry(Geometry,C,w).v,'no generic .050 service-route skin obscures native court art');assert.equal(w.save(),before);
 }
});

test('ordinary shaped terrain keeps the shared substrate finish on every exposed upper cap',()=>{
 const w=new World(data);w.newGame({quiet:true});
 // Landscape cap faces carry an explicit ground normal. Tree canopies and
 // other upward-facing object geometry are deliberately outside this check.
 class TerrainGeometry extends Geometry{constructor(){super();this.caps=[];}quad(a,b,c,d,color,mat,em,alpha,normal){if(normal?.[1]===1&&a[1]>-.1)this.caps.push({material:mat});return super.quad(a,b,c,d,color,mat,em,alpha,normal);}}
 for(const id of [5,20,49,2040]){w.state.scene=id;const terrain=new TerrainGeometry();appendAdventureLandscape(terrain,{world:w});const caps=terrain.caps;
  assert.ok(caps.length>0,id+' actual terrain caps');assert.ok(caps.every(p=>softwareMaterialIndex(p.material,1,ready)>=0),id+' exposed land must use the substrate finish');
 }
});
