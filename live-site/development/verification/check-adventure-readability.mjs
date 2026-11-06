#!/usr/bin/env node
import {adventureLandscapePlan} from '../../dist/game/engine2/adventure-landscape.js';
/** Independent check of emitted top-down floor masks and existing native patrols.
 * Material/colors and exact triangles are checked; browser appearance remains QA.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {World} from '../../dist/game/engine2/world.js';
import {Geometry,C} from '../../dist/game/engine2/cistern-renderer.js';
import {Adventure3DRenderer} from '../../dist/game/engine2/adventure-3d-renderer.js';
import {buildAdventureGeometry,adventureSceneBounds,adventureSurfacePalette,adventureSceneStyle} from '../../dist/game/engine2/adventure-3d-geometry.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),source=JSON.parse(readFileSync(resolve(ROOT,'dist/game/engine2/world.json'),'utf8'));
const report={schema:'ash-aether.adventure-readability-check/1',release:'5.33',checked_at_utc:new Date().toISOString(),method:'Actual prepared World scenes; independent cell-center rasterization of emitted horizontal floor/substrate triangles at their two distinct elevations. Actual native patrol descriptors without xy exercised through fieldEnemies, using each enemies[i][1] spawn.',scene_checks:[],patrol_checks:[],limits:['This establishes cell-mask/material/color contracts, finite vertices, backdrop ground coverage and correct native encounter selection; it does not establish final shaded contrast or GPU speed.','Renderer fixture omits sprite atlases and pixel painting; browser screenshots verify appearance separately.'],passed:false};
const noop=()=>{};
function cv(){return{width:500,height:824,clientWidth:500,clientHeight:824,dataset:{},getBoundingClientRect:()=>({width:500,height:824,left:0,top:0}),getContext:k=>k==='2d'?{}:null,addEventListener:noop,removeEventListener:noop};}
function bary(x,z,a,b,c){const d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(d)<1e-9)return false;const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d;return u>=-1e-6&&v>=-1e-6&&u+v<=1+1e-6;}
function samples(data,y,material){const cells=new Set();for(let i=0;i<data.length;i+=36){if(Math.abs(data[i+1]-y)>1e-6||Math.abs(data[i+13]-y)>1e-6||Math.abs(data[i+25]-y)>1e-6||Math.abs(data[i+9]-material)>1e-6||data[i+4]<.99)continue;const a={x:data[i],z:data[i+2]},b={x:data[i+12],z:data[i+14]},c={x:data[i+24],z:data[i+26]};for(let z=Math.floor(Math.min(a.z,b.z,c.z));z<Math.ceil(Math.max(a.z,b.z,c.z));z++)for(let x=Math.floor(Math.min(a.x,b.x,c.x));x<Math.ceil(Math.max(a.x,b.x,c.x));x++)if(bary(x+.5,z+.5,a,b,c))cells.add(x+','+z);}return cells;}
function topPoint(data,x,z,y){for(let i=0;i<data.length;i+=36){if(Math.abs(data[i+1]-y)>1e-6||Math.abs(data[i+13]-y)>1e-6||Math.abs(data[i+25]-y)>1e-6||data[i+4]<.99)continue;if(bary(x,z,{x:data[i],z:data[i+2]},{x:data[i+12],z:data[i+14]},{x:data[i+24],z:data[i+26]}))return data[i+9];}return null;}
const luma=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
try{
 const w=new World(source);w.newGame({quiet:true});
 for(const[id,scene]of w.scenes){
  w.state.scene=id;const floor=scene.household?.floorBase||scene.floor,partitions=new Set((scene.household?.partitions||[]).map(p=>p.x+','+p.y)),bounds=adventureSceneBounds(w),palette=adventureSurfacePalette(w),style=adventureSceneStyle(w);w.objects();const before=w.save(),data=buildAdventureGeometry(Geometry,C,w).data();assert.ok(data.length>0&&data.length%36===0);for(const value of data)assert.ok(Number.isFinite(value));assert.equal(w.save(),before,'scenery does not alter the live save');
  const open=samples(data,.012,palette.floorMaterial),closed=samples(data,.008,palette.closedMaterial);let walkCells=0,closedCells=0;
  for(let z=bounds.z0;z<bounds.z1;z++)for(let x=bounds.x0;x<bounds.x1;x++){const key=x+','+z,structural=floor[z]?.[x]==='.'&&!partitions.has(key);if(structural){walkCells++;assert.ok(open.has(key),'missing floor at '+id+':'+key);assert.ok(!closed.has(key),'dark closed mask overlays floor '+id+':'+key);}else{closedCells++;assert.ok(closed.has(key),'missing dark closed mask at '+id+':'+key);assert.ok(!open.has(key),'walkable-color floor crosses blocked cell '+id+':'+key);}}
  const ratio=luma(palette.closed)/luma(palette.floor);assert.ok(ratio<.55,'closed cells clearly darker in actual palette');assert.equal(palette.closedMaterial,6,'closed tint bypasses painted-atlas clamp');
  const base=adventureLandscapePlan(w).base,midX=(bounds.x0+bounds.x1)/2,midZ=(bounds.z0+bounds.z1)/2,backdrop=[[bounds.x0-8,midZ],[bounds.x1+8,midZ],[midX,bounds.z0-8],[midX,bounds.z1+8]].map(([x,z])=>topPoint(data,x,z,base));assert.ok(backdrop.every(v=>v===6||v===3),'background ground fills all sides '+id);
  report.scene_checks.push({scene:id,key:scene.key||null,walk_cells:walkCells,dark_closed_cells:closedCells,closed_to_floor_luminance:ratio,all_emitted_masks_match:true,continuous_surroundings:true,vertices:data.length/12,save_unchanged:true});
 }
 for(const id of[230,228,19]){
  const w=new World(source);w.newGame({quiet:true});w.state.story.parcel=true;w.state.story.weapon=true;w.state.story.firstCore=true;w.state.scene=id;const native=w.scene.objects.find(o=>o.type==='patrol'&&!o.xy);assert.ok(native?.enemies?.length,'actual native patrol fixture');w.state.x=native.enemies[0][1][0]+.5;w.state.y=native.enemies[0][1][1]+.5;w.objects();const before=w.save(),r=new Adventure3DRenderer(cv(),{art:{assets:{}}});r.software.render=()=>({backend:'fixture',triangles:0,drawCalls:0});r.scene(w);const rows=r.fieldEnemies().filter(e=>e.object===native);assert.equal(rows.length,Math.min(4,native.enemies.length),'every native actor remains visible despite missing object.xy');for(let i=0;i<rows.length;i++){assert.equal(rows[i].x,native.enemies[i][1][0]+.5);assert.equal(rows[i].y,native.enemies[i][1][1]+.5);}assert.equal(w.save(),before,'field actor selection preserves save');report.patrol_checks.push({scene:id,key:w.scene.key,native_xy_absent:true,actors:rows.length,spawn_coordinates_match:true,save_unchanged:true});r.destroy();
 }
 report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
const path=resolve(ROOT,process.argv.find(v=>v.startsWith('--report='))?.slice(9)||'docs/verification/adventure-readability-5.33.json');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,scenes:report.scene_checks.length,patrols:report.patrol_checks.length,error:report.error?.message||null,report:path}));
