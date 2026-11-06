#!/usr/bin/env node
/** Retained actual-data projection, geometry and save compatibility check.
 * Run: node development/verification/check-adventure-3d.mjs [--skip-all-scenes]
 * The canvas fixture replaces rasterization, not World, geometry or matrices.
 * This cannot establish browser appearance, measured DOM bounds or GPU speed.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {World} from '../../dist/game/engine2/world.js';
import {Adventure3DRenderer} from '../../dist/game/engine2/adventure-3d-renderer.js';
import {CisternSoftwarePainter} from '../../dist/game/engine2/cistern-software.js';
import {ORIGINS} from '../../dist/game/engine2/origin-content.js';
import {legacyFrom} from '../../dist/game/engine2/origins.js';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../../dist/game/engine2/embodied-origins.js';
import {validateSave} from '../../dist/game/engine2/save-validation.js';
import {installCampaignActuators} from '../../dist/game/engine2/campaign-actuators.js';
import {createWorldControls} from '../../dist/game/engine2/world-controls.js';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const reportOption=process.argv.find(value=>value.startsWith('--report='));
const REPORT=resolve(ROOT,reportOption?reportOption.slice('--report='.length):'docs/verification/adventure-3d-viewport-5.33.json');
const source=JSON.parse(readFileSync(resolve(ROOT,'dist/game/engine2/world.json'),'utf8'));
const hashes=Object.fromEntries(['cistern-renderer.js','cistern-software.js','adventure-3d-renderer.js','adventure-3d-geometry.js','adventure-presentation.js','adventure-world-props.js','adventure-ground-composition.js','native-spatial-authoring.js','native-dungeon-director.js','campaign-actuators.js','world-controls.js','touch-layout.js'].map(name=>{
 const path='dist/game/engine2/'+name;return[path,createHash('sha256').update(readFileSync(resolve(ROOT,path))).digest('hex')];
}));
const report={schema:'ash-aether.adventure-3d-code-review/3',release:'5.33',checked_at_utc:new Date().toISOString(),method:'Node constructs the real World and Adventure3DRenderer with a minimal canvas and software raster callback stub. Actual architecture/dynamic meshes, scene state, projection matrices and save validation run. A separate actual software painter fixture checks billboard projection invariance. UI reservation values are explicit test inputs, not browser DOM measurements.',source_snapshot_at_report:hashes,viewport_projection_checks:[],house_zoom_checks:[],origin_checks:[],scene_geometry_checks:[],limits:['Illustrated sprite textures and actual rasterization are omitted from the actual-data renderer fixture.','Battle command and HUD bounds are representative inputs; browser QA must establish their measured dimensions and final appearance.','Scene sweeps construct geometry against default campaign state; they do not simulate every quest permutation.','Offscreen first objectives require ordinary navigation or the existing guide.'],passed:false};
const noop=()=>{};
function canvas(width,height,left=16,top=30){return{width,height,clientWidth:width,clientHeight:height,dataset:{},getBoundingClientRect:()=>({width,height,left,top}),getContext:kind=>kind==='2d'?{}:null,addEventListener:noop,removeEventListener:noop};}
function renderer(width,height){const r=new Adventure3DRenderer(canvas(width,height),{quality:'high',art:{assets:{}}});r.software.render=frame=>{r.capturedFrame=frame;return{backend:'software-fixture',drawCalls:0,triangles:0};};return r;}
function draw(r,w,battle=null){r.forceRender=true;r.drawWorld(w,battle,1/60);assert.ok(r.vp?.every(Number.isFinite),'finite projection');assert.ok(r.eye?.every(Number.isFinite),'finite eye');return r.capturedFrame;}
function roundtrip(r,x,y){const screen=r.worldToScreen(x,y),rect=r.canvas.getBoundingClientRect();assert.ok(screen&&Number.isFinite(screen.x)&&Number.isFinite(screen.y));const restored=r.screenToWorld(screen.x+rect.left,screen.y+rect.top);assert.ok(restored,'ground unprojection exists');const error=Math.hypot(restored.x-x,restored.y-y);assert.ok(error<.001,`projection error ${error} tiles`);return{screen,error};}
function finiteMeshes(r){let vertices=0;for(const[name,mesh]of Object.entries(r.meshes)){assert.equal(mesh.data.length%12,0,`${name} stride`);assert.equal(mesh.count,mesh.data.length/12,`${name} count`);for(const n of mesh.data)assert.ok(Number.isFinite(n),`${name} finite vertex component`);vertices+=mesh.count;}return vertices;}
function quietWorld(){const w=new World(source);w.newGame({quiet:true});w.objects();return w;}
function installPhysical(w){const controller=installEmbodiedOrigins(w),objects=w.objects.bind(w);w.objects=()=>[...objects().filter(o=>!replacesEmbodiedOriginObject(w,o)),...controller.objects()];return controller;}

function billboardCheck(unframed,framed,w){
 const gradient={addColorStop:noop},ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(obj,key)=>obj[key]||noop}),surface={width:1280,height:720,getContext:()=>ctx};
 const painter=new CisternSoftwarePainter(surface),meshes=Object.fromEntries(['static','dynamic','shadows','glow'].map(name=>[name,{data:new Float32Array(),count:0}]));
 const sprites=[{image:{width:64,height:64,complete:true},source:{x:0,y:0,w:64,h:64},x:w.x,y:.04,z:w.y,width:1,height:1.94,anchorX:.5,anchorY:1}];
 const args={meshes,eye:[w.x,8,w.y+12],state:{player:{x:w.x,z:w.y}},sprites,lights:[]};
 painter.render({...args,vp:unframed});const normal={...painter.visible.find(row=>row.type==='sprite')};assert.ok(normal.width>0);
 painter.render({...args,vp:framed,billboardVP:unframed});const shifted=painter.visible.find(row=>row.type==='sprite');assert.ok(shifted);
 assert.ok(Math.abs(shifted.width-normal.width)<.001,'reserved UI shift preserves billboard width');assert.ok(Math.abs(shifted.height-normal.height)<.001,'reserved UI shift preserves billboard height');
 painter.destroy();return{unframed_pixels:[normal.width,normal.height],framed_pixels:[shifted.width,shifted.height],dimensions_invariant:true};
}

try{
 const w=quietWorld();let billboardSample;
 for(const[width,height,ui]of[
  [1280,720,{hudHeight:58,battleDockHeight:230,battleDockWidth:0,touch:false}],
  [500,824,{hudHeight:112,battleDockHeight:230,battleDockWidth:0,touch:true,touchReserve:190}],
  [390,844,{hudHeight:96,battleDockHeight:260,battleDockWidth:0,touch:true,touchReserve:190}],
  [844,390,{hudHeight:52,battleDockHeight:0,battleDockWidth:324,touch:true,touchReserve:92}],
 ]){
  const r=renderer(width,height),hero=w.activeHeroes[0];hero.x=w.state.x;hero.y=w.state.y;const before=w.save();
  draw(r,w);const ordinary=roundtrip(r,w.state.x,w.state.y);assert.equal(w.save(),before,'field rendering preserves the save');assert.deepEqual(r.vp,r.unframedVP,'default lens with no UI reservation preserves the projection values');
  r.ui=ui;draw(r,w,{heroes:w.activeHeroes,enemies:[]});const battle=roundtrip(r,hero.x,hero.y),frame=r.battleFrame;
  assert.ok(frame,'battle applies its UI reservation');assert.ok(battle.screen.x>=frame.left&&battle.screen.x<=frame.right,'party feet clear side command dock');assert.ok(battle.screen.y>=frame.top&&battle.screen.y<=frame.bottom,'party feet clear bottom command dock');
  const head=r.worldToScreen(hero.x,hero.y,1.94);assert.ok(head.y>=0,'party head remains in viewport');assert.equal(w.save(),before,'battle presentation preserves the save');finiteMeshes(r);
  report.viewport_projection_checks.push({viewport:[width,height],canvas_offset:[16,30],field:{lead_vertical_fraction:ordinary.screen.y/height,world_roundtrip_error_tiles:ordinary.error},battle:{reserved_ui_input:ui,reserved_world_bounds:frame,lead_screen:[battle.screen.x,battle.screen.y],lead_head_screen_y:head.y,world_roundtrip_error_tiles:battle.error,party_feet_clear_reserved_ui:true},save_unchanged:true});
  if(width===1280)billboardSample={unframed:r.unframedVP,framed:r.vp,player:{x:hero.x,y:hero.y}};
  r.destroy();
 }
 report.billboard_projection_check=billboardCheck(billboardSample.unframed,billboardSample.framed,billboardSample.player);
 // The house camera must not dolly into walls when the player changes its lens.
 // Use the exact actual home scene, player location and projection/inverse path.
 for(const[width,height]of[[500,824],[1280,720],[844,390]]){
  const house=quietWorld(),r=renderer(width,height);r.ui={hudHeight:height<500?64:112,touch:width<900,touchReserve:height<500?90:190};draw(r,house);const eye=Array.from(r.eye),before=house.save();
  for(const zoom of[.5,.75,1.35,2,3]){
   r.setZoom(zoom);draw(r,house);const p=roundtrip(r,house.state.x,house.state.y);assert.deepEqual(Array.from(r.eye),eye,'lens zoom keeps the physical camera outside the room');assert.ok(p.screen.visible,'house lead stays within viewport at zoom '+zoom);finiteMeshes(r);assert.equal(house.save(),before,'lens zoom does not alter journey');
   report.house_zoom_checks.push({viewport:[width,height],zoom,lead_screen:[p.screen.x,p.screen.y],camera_eye_fixed:true,lead_visible:true,roundtrip_error_tiles:p.error,save_unchanged:true});
  }
  r.resetView();draw(r,house);assert.equal(r.zoom,1.35,'reset restores automatic lens');r.destroy();
 }

 for(const origin of ORIGINS){
  const originWorld=new World(source),controller=installPhysical(originWorld);originWorld.newGame({originId:origin.id,legacy:legacyFrom({})});originWorld.objects();controller.snapshot();const before=originWorld.save(),r=renderer(390,844);draw(r,originWorld);const control=controller.objects()[0];assert.ok(control,'origin has physical first control');const projection=roundtrip(r,control.xy[0]+.5,control.xy[1]+.5);finiteMeshes(r);assert.equal(originWorld.save(),before,'origin rendering preserves authoritative state');
  const validated=validateSave(source,{schema:'ash-aether.enhanced-save/1',world:JSON.parse(before),battle:null});assert.equal(validated.world.chronicle.originId,origin.id);assert.equal(originWorld.save(),before,'isolated save validation preserves live world');
  report.origin_checks.push({origin:origin.id,physical_action:control.manipulation,save_unchanged:true,validated_save_origin_preserved:true,projected_control_roundtrip_error_tiles:projection.error,initial_control_in_portrait_view:projection.screen.visible});r.destroy();
 }
 // Exercise the same present/past composite owner used by the normal game.
 const controlled=quietWorld(),originOwner=installPhysical(controlled),campaignOwner=installCampaignActuators(controlled),controls=createWorldControls(controlled,originOwner,campaignOwner);controlled.worldControls=controls;controlled.state.scene=135;controlled.state.chapter=2;const native=controlled.scene.objects.find(o=>o.type==='puzzle'),action=controls.objects().find(o=>o.type==='puzzle');assert.ok(action);controlled.state.x=action.xy[0]+.5;controlled.state.y=action.xy[1]+.5;assert.ok(controlled.walkable(controlled.state.x,controlled.state.y),'real campaign control stands on reachable floor');controls.snapshot();const nativeSave=controlled.save();assert.equal(controls.beginAction(action,{manual:true}),true);assert.equal(controls.setProgress(.5),true);assert.equal(controls.snapshot().phase,'world');assert.equal(controls.snapshot().pending.progress,.5);const previewRenderer=renderer(500,824);previewRenderer.forceRender=true;previewRenderer.drawWorld(controlled,null,1/60,{feedback:controls.snapshot()});finiteMeshes(previewRenderer);assert.equal(controlled.save(),nativeSave,'a half-turned campaign device and its rendering commit no native consequence');controls.cancelAction('verification interruption');assert.equal(controls.pending,null);assert.equal(controlled.save(),nativeSave,'cancelling preview retains exact native save');controlled.newGame({originId:'veyr-storm',legacy:legacyFrom({})});assert.ok(controls.objects().every(o=>o.type==='embodied-action'),'composite switches to the actual past-life owner');assert.equal(controls.snapshot().phase,'past');previewRenderer.destroy();report.composite_control_check={native_scene:135,device:native.type,present_preview:.5,native_save_unchanged:true,cancel_keeps_native_state:true,past_owner_selected:true};
 if(!process.argv.includes('--skip-all-scenes')){
  const sceneWorld=quietWorld(),r=renderer(1280,720);
  for(const[id,scene]of sceneWorld.scenes){sceneWorld.state.scene=id;const at=scene.arrive||[sceneWorld.state.x,sceneWorld.state.y];sceneWorld.state.x=at[0]+.5;sceneWorld.state.y=at[1]+.5;sceneWorld.objects();draw(r,sceneWorld);const vertices=finiteMeshes(r);assert.ok(vertices>0,`scene ${id} has geometry`);report.scene_geometry_checks.push({scene:id,key:scene.key||null,vertices,finite:true});}
  r.destroy();
 }
 report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
mkdirSync(dirname(REPORT),{recursive:true});writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify({passed:report.passed,viewports:report.viewport_projection_checks.length,origins:report.origin_checks.length,house_zooms:report.house_zoom_checks.length,scenes:report.scene_geometry_checks.length,billboards:report.billboard_projection_check?.dimensions_invariant||false,error:report.error?.message||null,report:REPORT})+'\n');
