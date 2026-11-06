import {isObservatory,buildObservatoryGeometry,appendObservatoryDynamics,appendObservatoryCastShadows,observatoryLighting,observatoryLights,observatoryScenePlan} from './observatory-art.js?v=5.40.1';
import {groundActorSprite,appendActorContactShadow} from './actor-grounding.js?v=5.41';
import {appendSceneGroundArt541} from './scene-ground-art-541.js?v=5.41';
import {nativeSpatialPlan} from './native-spatial-authoring.js?v=5.33.0';
import {appendNativeDungeonLegibility} from './native-dungeon-director.js?v=5.41';
import {adventureLandscapeSprites,adventureLandscapePlan,appendAdventureLandscapeDynamics} from './adventure-landscape.js?v=5.42';
import {originStagingActors,originStagingSpec,originStagingPlan} from './adventure-origin-staging.js?v=5.41';
import {appendOriginArt541,appendOriginArtDynamics541} from './origin-art-541.js?v=5.41';
import {appendOriginArrivalArt541} from './origin-arrival-art-541.js?v=5.42';
import {appendInteriorCraft} from './interior-art-541.js?v=5.41';
import {appendDungeonArt541,appendDungeonArtDynamics541} from './dungeon-art-541.js?v=5.41';
import {sceneArtSpec,createSceneArtAtlas} from './scene-art-materials-541.js?v=5.41';
import {createSceneSurfaceAtlas542} from './scene-surface-finish-542.js?v=5.42';
import {appendSceneContactDepth542} from './scene-contact-depth-542.js?v=5.42';
import {appendExteriorArt,appendExteriorArtDynamics} from './exterior-art-541.js?v=5.42';
import {sceneArtCameraFrame} from './scene-art-camera-541.js?v=5.41';
import {exteriorSceneArtCameraFrame} from './exterior-scene-camera-541.js?v=5.41';
import {exteriorAnchorSites} from './exterior-anchor-plan-541.js?v=5.42';
import {appendExteriorWorksites,appendExteriorWorksiteDynamics,ownsExteriorProp541,exteriorWorksitePlan541} from './exterior-worksites-541.js?v=5.42';
import {appendNativeEnvironmentArt537} from './native-environment-art537.js?v=5.37.0';
import {appendDungeonArchitecture,appendDungeonDynamics,dungeonInvestigationStation} from './adventure-dungeon-architecture.js?v=5.37.0';
import {appendAdventureSetDressing,appendAdventureSetDynamics} from './adventure-set-dressing.js?v=5.41';
import {appendAdventureContentStatic,appendAdventureContentDynamic,adventureContentFamily} from './adventure-content-models.js?v=5.31.0';
import {appendAdventureLivingStatic,appendAdventureLivingDynamic,adventureLivingSprites,livingContentFamily} from './adventure-living-content.js?v=5.31.0';
import {appendAdventureSurfaceStates} from './adventure-surface-states.js?v=5.31.0';
import {appendAdventureEncounterContent,adventureEncounterActors} from './adventure-encounter-content.js?v=5.31.0';
import {appendAdventureStaticProps,appendAdventureWorldProps,adventurePropFamily} from './adventure-world-props.js?v=5.41';
/** The ordinary Ash & Aether journey, rendered as a continuous 3D world.
 * Gameplay, collision, quest state and inventory remain owned by World/Battle.
 * This layer only projects their real actors and physically staged objects.
 */
import {CisternRenderer,Geometry,C} from './cistern-renderer.js?v=5.42';
import {createObservatoryMaterialAtlas} from './observatory-materials.js?v=5.40.1';
import {OBSERVATORY_BACKDROP_BOUNDS} from './observatory-detail.js?v=5.40.1';
import * as architecture from './adventure-3d-geometry.js?v=5.42';
import {createFollowerFormation} from './follower-motion.js?v=5.41';
import {characterPose,spriteFacingFlip} from './character-motion.js';
import {personFor} from './presentation.js?v=5.41';
import {fieldPatrolPosition} from './field-patrols.js?v=5.33.0';
import {decorateEnemy,frontierEnemy} from './repertoire.js?v=5.38';
import {patrolFormationEnemies} from './patrol-formations.js?v=5.38';
import {daylightAt} from './scene-lighting.js';
import {civilianStyle,civilianStance} from './npc-art.js?v=5.38';

const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const color=(value,fallback=C.teal)=>{if(Array.isArray(value))return value;const m=/^#([a-f\d]{6})$/i.exec(value||'');return m?[parseInt(m[1].slice(0,2),16)/255,parseInt(m[1].slice(2,4),16)/255,parseInt(m[1].slice(4,6),16)/255]:fallback;};
const objectPoint=o=>o?.xy?{x:o.xy[0]+.5,z:o.xy[1]+.5}:o?.footprint?{x:o.footprint.x+o.footprint.w/2,z:o.footprint.y+o.footprint.h}:null;

export class Adventure3DRenderer extends CisternRenderer {
  constructor(canvas,options={}){
    super(canvas,options);this.adventureTime=0;this.motion=new Map();this.followers=[];this.sceneObjects=[];this.dynamicFeedback=[];this.ui={};this.frameOptions={};this.geometryRefresh=0;this.departures=[];this.departureKeys=new Set();
    this.canvas.dataset.renderer='adventure-3d';
  }
  setZoom(value,anchor=null){
    const zoom=clamp(Number(value)||1,.5,3),rect=this.canvas.getBoundingClientRect();
    if(Number.isFinite(anchor?.x)&&Number.isFinite(anchor?.y)&&rect.width>0&&rect.height>0){
      const x=clamp(anchor.x,0,rect.width),y=clamp(anchor.y,0,rect.height),point=this.pendingZoomAnchor?.point||this.screenToWorld(rect.left+x,rect.top+y);
      if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))this.pendingZoomAnchor={point,x,y};
    }else{this.pendingZoomAnchor=null;this.fieldViewOffset={x:0,y:0};}
    if(zoom!==this.zoom||anchor)this.forceRender=true;this.zoom=zoom;
  }
  resetView(){this.pendingZoomAnchor=null;this.fieldViewOffset={x:0,y:0};this.camera=null;this.zoom=1.35;this.forceRender=true;}
  render(state,party=[],dt=0){
    // A lens zoom keeps the viewing angle and the camera outside room walls.
    // The dungeon retains its original dolly camera; only the adventure uses
    // this fixed camera distance and scales the projection around its focus.
    const lens=this.zoom;this.lensZoom=lens;this.zoom=1.35;
    try{return super.render(state,party,dt);}finally{this.zoom=lens;this.lensZoom=null;}
  }
  lensProjection(vp){
    const factor=finite(this.lensZoom,this.zoom)/1.35,result=new Float32Array(vp),rect=this.canvas.getBoundingClientRect(),width=rect.width,height=rect.height;
    if((isObservatory(this.world)||this.sceneArtFraming)&&!this.battle){
      const previous=this.observatoryViewport;
      // A baseline lens follows the newly composed field after rotation. A
      // pan inherited from the old aspect ratio can otherwise hide the mast.
      if(previous&&(previous.width!==width||previous.height!==height)&&factor===1&&!this.pendingZoomAnchor)this.fieldViewOffset={x:0,y:0};
      this.observatoryViewport={width,height};
    }
    for(let column=0;column<4;column++){const i=column*4;result[i]*=factor;result[i+1]*=factor;}
    if(this.battle||!this.world?.state||!(width>0&&height>0)){this.pendingZoomAnchor=null;return result;}
    const project=(matrix,x,z)=>{const w=matrix[3]*x+matrix[11]*z+matrix[15];return w>.001?{x:(.5+(matrix[0]*x+matrix[8]*z+matrix[12])/w*.5)*width,y:(.5-(matrix[1]*x+matrix[9]*z+matrix[13])/w*.5)*height}:null;};
    const player=this.world.state,base=project(vp,player.x,player.y),scaled=project(result,player.x,player.y);if(!base||!scaled)return result;
    const offset=this.fieldViewOffset||{x:0,y:0};let target={x:base.x+offset.x*width/2,y:base.y-offset.y*height/2};
    const anchor=this.pendingZoomAnchor;if(anchor){const at=project(result,anchor.point.x,anchor.point.y);if(at)target={x:scaled.x+anchor.x-at.x,y:scaled.y+anchor.y-at.y};this.pendingZoomAnchor=null;}
    const ui=this.ui||{},top=clamp(finite(ui.hudHeight,16)+8,8,height*.43),bottom=Math.max(top+64,height-(ui.touch?Math.min(finite(ui.touchReserve),height*.35):16)),side=Math.min(38,width*.09);
    target.x=clamp(target.x,side,width-side);target.y=clamp(target.y,top+Math.min(72,(bottom-top)*.24),bottom-12);
    this.fieldViewOffset={x:(target.x-base.x)/width*2||0,y:-(target.y-base.y)/height*2||0};
    const dx=(target.x-scaled.x)/width*2,dy=-(target.y-scaled.y)/height*2;
    for(let column=0;column<4;column++){const i=column*4;result[i]+=dx*result[i+3];result[i+1]+=dy*result[i+3];}return result;
  }
  frameProjection(vp){
    // Compose the authored observatory inside the actual field window before
    // the player's lens and pinch anchor are applied. Other scenes retain the
    // established projection without a second camera owner.
    const authoredFrame=isObservatory(this.world)?this.observatoryFraming:this.sceneArtFraming;
    if(!this.battle&&authoredFrame){
      const {x,y}=authoredFrame,result=new Float32Array(vp);
      for(let column=0;column<4;column++){const i=column*4;result[i]+=x*vp[i+3];result[i+1]+=y*vp[i+3];}vp=result;
    }
    vp=this.lensProjection(vp);
    if(!this.battle)return vp;const ui=this.ui||{},rect=this.canvas.getBoundingClientRect(),width=rect.width,height=rect.height;if(!(width>0&&height>0)||!(finite(ui.battleDockHeight)>0||finite(ui.battleDockWidth)>0||ui.touch&&finite(ui.touchReserve)>0))return vp;
    const top=clamp(finite(ui.hudHeight,48)+8,8,height*.65),bottomReserve=Math.max(finite(ui.battleDockHeight)+12,ui.touch?finite(ui.touchReserve):0,24),rightReserve=clamp(finite(ui.battleDockWidth),0,width*.46),left=8,right=Math.max(left+40,width-rightReserve-8),bottom=Math.max(top+40,height-bottomReserve-12),availableHeight=bottom-top;
    const actors=(this.battle.heroes||[]).filter(h=>h.hp>0&&Number.isFinite(h.x)&&Number.isFinite(h.y));if(!actors.length)return vp;
    const points=actors.map(h=>{const w=vp[3]*h.x+vp[11]*h.y+vp[15];return w>.001?{x:(.5+(vp[0]*h.x+vp[8]*h.y+vp[12])/w*.5)*width,y:(.5-(vp[1]*h.x+vp[9]*h.y+vp[13])/w*.5)*height}:null;}).filter(Boolean);if(!points.length)return vp;
    const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y)),centerX=(minX+maxX)/2,centerY=(minY+maxY)/2,targetX=(left+right)/2;let targetY=top+availableHeight*.64;
    if(maxY-minY<availableHeight-32)targetY=clamp(targetY,top+16+(maxY-minY)/2,bottom-12-(maxY-minY)/2);
    const dx=(targetX-centerX)/width*2,dy=-(targetY-centerY)/height*2,result=new Float32Array(vp);for(let column=0;column<4;column++){const i=column*4;result[i]+=dx*vp[i+3];result[i+1]+=dy*vp[i+3];}
    this.battleFrame={left,right,top,bottom,shiftX:dx,shiftY:dy};return result;
  }
  getClearColor(lighting){return lighting?.fog||[.16,.22,.24];}
  getSoftwareLighting(state,p,time,lighting){return lighting||this.getLighting();}
  getSoftwareLights(state,p,time,lights){return lights||this.getLights(state,p,time);}
  buildArchitecture(){
    if(isObservatory(this.world)){const mesh=buildObservatoryGeometry(Geometry,C,this.world);this.compositionPlan={stats:{authored:'listening-headland',part:this.world.scene.originPart}};this.environmentArt537=null;this.sceneArt541={retained:'observatory-5.40'};return mesh;}
    const options=this.world?{world:this.world,objects:this.world.objects()}:null;
    if(options){
      const exterior=!this.world.scene.originId&&!sceneArtSpec(this.world)?.indoor;
      options.worksitePlan=exterior?exteriorWorksitePlan541(this.world,{objects:options.objects}):null;
      const reservedRects=(options.worksitePlan?.sites||[]).map(s=>({x:s.x-s.radius-.35,y:s.z-s.radius-.35,w:s.radius*2+.70,h:s.radius*2+.70}));
      options.exteriorSites=exterior?exteriorAnchorSites(this.world,{objects:options.objects,landscapePlan:adventureLandscapePlan(this.world),reservedRects}):[];
    }
    const mesh=this.world&&architecture.buildAdventureGeometry?architecture.buildAdventureGeometry(Geometry,C,this.world,{exteriorSites:[...(options?.exteriorSites||[]),...(options?.worksitePlan?.sites||[])],terrainCraft:!this.software||this.effectiveQuality()!=='low'}):new Geometry();
    if(this.world){
      const indoor=architecture.adventureSceneStyle(this.world).indoor;
      this.compositionPlan=nativeSpatialPlan(this.world,options);
      appendAdventureStaticProps(mesh,{...options,objects:options.objects.filter(o=>(!o.investigationRole||!dungeonInvestigationStation(this.world,o))&&!ownsExteriorProp541(this.world,o,{objects:options.objects}))});
      appendSceneGroundArt541(mesh,options);const originCraft=appendOriginArt541(mesh,options),originArrival=appendOriginArrivalArt541(mesh,options);appendDungeonArchitecture(mesh,options);
      this.exteriorFrame541={sites:options.exteriorSites||[],worksites:[...(originArrival?.sites||[]),...(originCraft?.bodies||options.worksitePlan?.sites||[])]};
      this.sceneContactOptions542={...options,sites:options.exteriorSites||[],worksites:this.exteriorFrame541.worksites,buildings:architecture.adventureBuildingPlan(this.world)};
      if(indoor)appendAdventureSetDressing(mesh,options);
      appendAdventureContentStatic(mesh,options);appendAdventureLivingStatic(mesh,options);
      const origin=mesh.originArt541||null,interior=appendInteriorCraft(mesh,options),dungeon=appendDungeonArt541(mesh,options),exterior=appendExteriorArt(mesh,options);
      appendExteriorWorksites(mesh,options);
      this.sceneArt541={release:'5.42',material:sceneArtSpec(this.world)?.id,origin,arrival:originArrival?.stats||null,interior:{family:interior.family,triangles:interior.triangles},dungeon:{family:dungeon.spec?.group,triangles:dungeon.triangles||0},exterior:mesh.exteriorArt541||{family:exterior?.family,triangles:0},worksites:mesh.exteriorWorksites541||null};
    }
    if(this.world){
      const before=mesh.v.length;
      try{appendNativeEnvironmentArt537(mesh,{world:this.world,buildingPlans:architecture.adventureBuildingPlan(this.world),originPlan:originStagingPlan(this.world),landscapePlan:architecture.adventureSceneStyle(this.world).indoor?null:adventureLandscapePlan(this.world),quality:this.effectiveQuality()});this.environmentArt537=mesh.environmentArt537||{release:'5.37',addedTriangles:(mesh.v.length-before)/36};}
      catch(error){mesh.v.length=before;this.environmentArt537={release:'5.37',fallback:true,error:error.message};}
    }
    return mesh;
  }
  // Regular scenes supply their own surface atlas. The dungeon atlas is never
  // silently substituted for a sunny field, a workshop or a wooden home.
  loadMaterialImage(){}
  setArt(art){this.art=art||this.art;}
  scene(world){
    if(!world?.scene)return;this.world=world;this.sceneObjects=world.objects();this.sceneId=world.state.scene;this.sceneRef=world.scene;this.camera=null;this.observatoryView=null;this.pendingZoomAnchor=null;this.fieldViewOffset={x:0,y:0};this.forceRender=true;
    this.motion.clear();this.partyKey=world.state.party.join(',');const formation=createFollowerFormation({x:world.state.x,y:world.state.y},world.state.party,(x,y)=>world.walkable(x,y),{gap:1.05});this.trail=formation.trail;this.followers=formation.followers;
    this.rebuildGeometry();this.geometrySignature=this.signature();this.geometryRefresh=0;
    const image=(isObservatory(world)&&createObservatoryMaterialAtlas())||createSceneSurfaceAtlas542(world,this.art.assets||{})||createSceneArtAtlas(world,this.art.assets||{})||architecture.prepareAdventureMaterials?.(world,this.art.assets||{});
    if(image?.then){const id=this.sceneId;image.then(value=>{if(!this.destroyed&&id===this.sceneId)this.setMaterialImage(value);}).catch(()=>{});}else this.setMaterialImage(image);
    this.canvas.dataset.scene=String(this.sceneId);this.canvas.dataset.adventureBiome=world.scene.originId||world.scene.interior||world.scene.biome||world.scene.key||'world';
  }
  setMaterialImage(image){if(!image?.width)return;this.materialImage=image;this.forceRender=true;if(this.gl&&!this.lost)this.uploadMaterial();}
  rebuildGeometry(){this.makeMesh('static',this.buildArchitecture().data(),false);this.sceneLights=isObservatory(this.world)?observatoryLights(this.world):(architecture.adventureLightRig?.(this.world)||[]);this.forceRender=true;}
  signature(){
    const w=this.world;if(!w?.scene)return '';const scene=w.scene,objects=w.objects(),snapshot=w.embodiedOrigins?.snapshot?.(),aff=w.state.worldAffordances||{},lore=w.state.physicalLore||{},prefix='aff-'+scene.location+'-';
    const physicalIds=new Set(objects.filter(o=>o.physicalId).map(o=>o.physicalId));for(const o of scene.architecture?.physicalSites||[])if(o.physicalId)physicalIds.add(o.physicalId);
    const localPhysical=Object.fromEntries([...physicalIds].sort().map(id=>[id,{taken:lore.taken?.includes(id)||false,installed:lore.installed?.includes(id)||false,completed:lore.completed?.includes(id)||false,claimed:lore.claimed?.includes(id)||false,step:lore.steps?.[id]??0,drop:lore.dropped?.[id]||null}]));
    // Exact row snapshots detect in-place floor edits as well as replacements.
    // Animation clocks are intentionally excluded: their moving parts draw in
    // the dynamic mesh, while discrete changes rebuild the authored structure.
    return JSON.stringify([w.state.scene,scene.floor,scene.household?.floorBase,scene.affordanceBlocked||[],scene.blocks||[],scene.household?.partitions||[],scene.geometryRevision??scene.floorRevision??scene.revision??null,w.state.project,w.state.flags,w.state.bosses,[w.state.frontiers?.active,w.state.frontiers?.stages,w.state.frontiers?.claimed],w.state.exploration,w.state.answeringNetwork,w.state.regionalLife?.projects,w.state.regionalLife?.work,w.state.chronicle?.step,w.state.chronicle?.choices?.repair,snapshot?.devices||null,w.state.household?.openFurniture||[],Object.entries(aff.sites||{}).filter(([id])=>id.startsWith(prefix)),(aff.sources||[]).filter(id=>id.startsWith(prefix)),aff.plans?.[String(scene.location)]||null,localPhysical,objects.filter(o=>['portal','embodied-action','furnishing','puzzle','switch','cache','affordance'].includes(o.type)||o.physicalId||adventurePropFamily(w,o)||adventureContentFamily(w,o)||livingContentFamily(w,o)==='stable').map(o=>[o.type,o.id||o.householdId||o.affordanceId||o.physicalId||o.bit||o.manipulation||'',o.xy,o.footprint,o.solved??w.done?.(o),o.ready,o.wins,o.networkStage,o.physicalRole,o.lock])]);
  }
  drawWorld(world,battle,dt,{effects=[],objective=null,locomotion=null,feedback=null}={}){
    if(!world?.scene||this.destroyed)return;
    if(this.sceneId!==world.state.scene||this.sceneRef!==world.scene)this.scene(world);else this.world=world;
    this.battle=battle;this.drawDt=clamp(finite(dt,.016),0,.1);this.adventureTime+=this.drawDt;this.frameOptions={effects,objective,locomotion,feedback};this.sceneObjects=world.objects();this.updateDepartures();
    this.geometryRefresh+=this.drawDt;if(this.geometryRefresh>.25){this.geometryRefresh=0;const signature=this.signature();if(signature!==this.geometrySignature){this.geometrySignature=signature;this.rebuildGeometry();}}
    const prior=this.lastLead||{x:world.state.x,z:world.state.y},dx=world.state.x-prior.x,dz=world.state.y-prior.z;
    const player={x:world.state.x,z:world.state.y,facing:Math.hypot(dx,dz)>.0001?Math.atan2(dx,dz):this.lastFacing??Math.PI,moving:Math.hypot(dx,dz)>.0001};
    this.lastLead={x:player.x,z:player.z};this.lastFacing=player.facing;
    const state={time:this.adventureTime,player,guard:!!world.activeHeroes[0]?.status?.guard,resonators:[],effects:[],adventure:true,interiorCutaway:!battle&&!!sceneArtSpec(world),scenicHorizon:isObservatory(world),scenicBackdropBounds:isObservatory(world)?OBSERVATORY_BACKDROP_BOUNDS:null,groundClipY:isObservatory(world)?-5.4:adventureLandscapePlan(world).coastalStorm?-3.15:-.13};
    this.render(state,world.activeHeroes,this.drawDt);
    this.canvas.dataset.renderBackend=this.stats.backend||'webgl';this.canvas.dataset.renderStats=JSON.stringify({backend:this.stats.backend,triangles:this.stats.triangles,sprites:this.sprites.length,quality:this.stats.quality});
    this.canvas.dataset.nativeComposition=JSON.stringify(this.compositionPlan?.stats||{});
    this.canvas.dataset.environmentArt537=JSON.stringify(this.environmentArt537||{});
    this.canvas.dataset.nativeDungeon=JSON.stringify({phase:this.nativeDungeonFrame?.currentPhase||null,progress:this.nativeDungeonFrame?.progress||null,forms:this.nativeDungeonFrame?.forms||[]});
    this.canvas.dataset.sceneArt=JSON.stringify(this.sceneArt541||{});
  }
  getCameraFrame(state,p,aspect){
    this.sceneArtFraming=null;
    if(!isObservatory(this.world)&&!this.battle){
      const params={world:this.world,canvas:this.canvas,ui:this.ui,lead:this.camera||p,p,objects:this.sceneObjects||[],aspect};
      const frame=sceneArtCameraFrame(params)||exteriorSceneArtCameraFrame({...params,...this.exteriorFrame541});
      if(frame){this.observatoryFraming=null;this.sceneArtFraming=frame.shift;return frame;}
    }
    if(!isObservatory(this.world)||this.battle){this.observatoryFraming=null;return null;}
    const plan=observatoryScenePlan(this.world),lead=this.camera||p,controls=(this.sceneObjects||[]).filter(o=>o.role==='embodiedAction'&&o.xy);
    const points=[],add=(x,y,z)=>points.push([x,y,z]);
    add(lead.x,0,lead.z);add(lead.x,2.0,lead.z);
    for(const o of controls){
      add(o.xy[0]+.5,0,o.xy[1]+.5);add(o.xy[0]+.5,1.0,o.xy[1]+.5);
      if(o.manipulation==='cable')for(const end of[o.from,o.to])if(Number.isFinite(end?.x)&&Number.isFinite(end?.y)){add(end.x,0,end.y);add(end.x,.9,end.y);}
    }
    if(this.world.state.chronicle?.step===2)for(const o of(this.sceneObjects||[]).filter(o=>o.type==='patrol'&&o.originId===this.world.scene.originId&&o.originStep===2)){
      for(const xy of(o.enemies?.length?o.enemies.map(enemy=>enemy?.[1]):[o.xy]).filter(xy=>Array.isArray(xy)&&xy.length===2&&xy.every(Number.isFinite))){add(xy[0]+.5,0,xy[1]+.5);add(xy[0]+.5,2.3,xy[1]+.5);for(const dx of[-.8,.8])for(const dz of[-.8,.8])add(xy[0]+.5+dx,1.0,xy[1]+.5+dz);}
    }
    // Include the silhouette, rather than only the foot of a seven-metre mast.
    // Keep the traveller on the east of the receiver silhouette, while fitting
    // the real roofline and both physical choices into the usable field.
    const b=plan.body,r=plan.lodge,nearMast=Math.hypot(b.x-lead.x,b.z-lead.z)<11||controls.some(o=>Math.hypot(o.xy[0]+.5-b.x,o.xy[1]+.5-b.z)<7);
    if(nearMast){for(const dx of[-1.65,1.65])for(const dz of[-1.35,1.35])add(b.x+dx,.25,b.z+dz);for(const [height,radius]of[[4.2,1.45],[5.4,1.0]])for(let i=0;i<8;i++){const a=i*Math.PI/4;add(b.x+Math.cos(a)*radius,height,b.z+Math.sin(a)*radius);}add(b.x,7.35,b.z);}
    const front=r.z+r.d,nearLodge=Math.hypot(r.x+r.w/2-lead.x,front-lead.z)<8||controls.some(o=>Math.hypot(o.xy[0]+.5-r.x-r.w/2,o.xy[1]+.5-front)<5);
    if(nearLodge){const station=plan.anchors.operator||plan.anchors.decision,roofX=clamp(station?.x??r.x+r.w/2,r.x+.7,r.x+r.w-.7);for(const x of[roofX-.8,roofX+.8]){add(x,.1,front+.15);add(x,4.55,front-.65);}}
    if(plan.part===0&&Math.hypot(plan.gate.x-lead.x,plan.gate.z-lead.z)<6)for(const side of[-1,1]){add(plan.gate.x+side*3.3,0,plan.gate.z);add(plan.gate.x+side*3.3,3.5,plan.gate.z);}
    const tx=(Math.min(...points.map(q=>q[0]))+Math.max(...points.map(q=>q[0])))/2,tz=(Math.min(...points.map(q=>q[2]))+Math.max(...points.map(q=>q[2])))/2;
    const ease=1-Math.exp(-(this.drawDt||.016)*5),view=this.observatoryView||(this.observatoryView={x:tx,z:tz});view.x+=(tx-view.x)*ease;view.z+=(tz-view.z)*ease;
    const at=[view.x,1.25,view.z],raw=[.35,.92,.78],length=Math.hypot(...raw),direction=raw.map(v=>v/length),horizontal=Math.hypot(direction[0],direction[2]),right=[direction[2]/horizontal,0,-direction[0]/horizontal],up=[direction[1]*right[2],direction[2]*right[0]-direction[0]*right[2],-direction[1]*right[0]];
    const rect=this.canvas.getBoundingClientRect(),height=rect.height||this.canvas.height,width=rect.width||this.canvas.width,ui=this.ui||{},wide=width>height*1.3,top=Math.min(height*.30,Math.max(26,finite(ui.hudHeight,16)+14)),bottom=Math.max(top+80,height-(ui.touch&&!wide?Math.min(finite(ui.touchReserve,177),height*.35)+64:28)),left=ui.touch&&wide?Math.min(144,width*.20):Math.min(28,width*.075),rightEdge=width-left,fov=Math.PI/3.4,tangent=Math.tan(fov/2);
    const local=points.map(q=>{const a=q.map((v,i)=>v-at[i]);return{u:a[0]*right[0]+a[2]*right[2],v:a[0]*up[0]+a[1]*up[1]+a[2]*up[2],depth:a[0]*direction[0]+a[1]*direction[1]+a[2]*direction[2]};});
    const bounds=distance=>{const projected=local.map(q=>({x:q.u/(tangent*aspect*(distance-q.depth)),y:q.v/(tangent*(distance-q.depth))}));return{left:Math.min(...projected.map(q=>q.x)),right:Math.max(...projected.map(q=>q.x)),bottom:Math.min(...projected.map(q=>q.y)),top:Math.max(...projected.map(q=>q.y))};};
    const maxWidth=2*(rightEdge-left)/width,maxHeight=2*(bottom-top)/height;let lo=Math.max(9.5,...local.map(q=>q.depth+1)),hi=80;
    for(let i=0;i<14;i++){const mid=(lo+hi)/2,c=bounds(mid);if(c.right-c.left>maxWidth||c.top-c.bottom>maxHeight)lo=mid;else hi=mid;}
    const previous=this.observatoryDistance??hi,d=Math.max(hi,previous+(hi-previous)*ease);this.observatoryDistance=d;const c=bounds(d);
    // A narrow screen can be width-limited. Spend its remaining vertical room
    // on the foreground court instead of centring a band of empty sea above it.
    this.observatoryFraming={x:(left+rightEdge)/width-1-(c.left+c.right)/2,y:1-2*top/height-c.top};
    return {eye:at.map((v,i)=>v+direction[i]*d),at,fov};
  }
  getLighting(){
    if(isObservatory(this.world))return observatoryLighting(this.world);
    const scene=this.world?.scene;if(!scene)return super.getLighting();
    const style=architecture.adventureSceneStyle(this.world),key=[scene.key,scene.household?.kind,scene.interior].join(' '),biome=style.style;
    const day=daylightAt(this.world.state.townLife?.minutes??600),night=day.night;
    const authored=sceneArtSpec(this.world);
    if(authored?.lighting){
      const light=authored.lighting;if(authored.indoor)return light;
      return {...light,ambient:light.ambient.map(v=>v*(1-night*.43)),key:light.key.map(v=>v*(.40+day.sun*.60)),fog:light.fog.map(v=>v*(1-night*.58)),sky:night>.7?['#142734','#2d4651','#18323a']:light.sky};
    }
    if(style.indoor){
      const warm=style.timber||/kiln|forge|pottery/.test(key),cold=/reactor|console|security|lens|crystal/.test(key);
      return{ambient:warm?[.255,.225,.19]:cold?[.20,.245,.275]:[.235,.25,.245],key:warm?[.39,.32,.24]:cold?[.31,.39,.43]:[.38,.375,.33],fog:warm?[.065,.052,.040]:[.035,.057,.066],fogDensity:.00055,sky:warm?['#302b24','#514538','#242921']:['#14232a','#1b3034','#09171d']};
    }
    if(style.storm)return{ambient:[.18,.23,.27],key:[.42,.48,.56],fog:[.055,.09,.115],fogDensity:.00028,sky:['#35434f','#596970','#263c47']};
    const palettes={
      marble:{ambient:[.39,.42,.41],key:[.62,.66,.60],fog:[.27,.32,.31],sky:['#8da7af','#c8d0c4','#899f99']},
      foundry:{ambient:[.38,.33,.28],key:[.63,.52,.37],fog:[.24,.21,.18],sky:['#7c8689','#b7aa91','#777d70']},
      highland:{ambient:[.33,.39,.43],key:[.55,.62,.66],fog:[.19,.27,.32],sky:['#7999ad','#b5c8ca','#6c899a']},
      ruins:{ambient:[.36,.35,.39],key:[.60,.56,.59],fog:[.25,.23,.29],sky:['#8c9aa9','#c4c3b7','#858e9a']},
      lava:{ambient:[.38,.28,.24],key:[.67,.43,.27],fog:[.21,.115,.10],sky:['#493b3c','#8a6250','#443938']},
      caldera:{ambient:[.38,.28,.24],key:[.67,.43,.27],fog:[.21,.115,.10],sky:['#493b3c','#8a6250','#443938']},
      sand:{ambient:[.43,.38,.28],key:[.70,.60,.42],fog:[.38,.31,.21],sky:['#92afb8','#d6c7a0','#a99d75']},
      cactus:{ambient:[.39,.39,.28],key:[.66,.60,.41],fog:[.30,.31,.20],sky:['#8eafb4','#cad0ad','#839878']},
      ice:{ambient:[.32,.40,.45],key:[.58,.68,.73],fog:[.24,.33,.38],sky:['#809dab','#c1d3d5','#748e9a']},
      aurora:{ambient:[.28,.35,.43],key:[.48,.59,.70],fog:[.13,.24,.30],sky:['#243e58','#6b9f9a','#3b586a']},
      crystal:{ambient:[.32,.35,.43],key:[.58,.59,.72],fog:[.20,.23,.32],sky:['#647f9d','#b1c5ca','#758da5']},
      spore:{ambient:[.30,.37,.32],key:[.45,.58,.45],fog:[.16,.25,.21],sky:['#69867e','#a5b9a1','#58776b']},
      mangrove:{ambient:[.30,.39,.34],key:[.45,.59,.49],fog:[.16,.27,.24],sky:['#719990','#b0c6b1','#5f887a']},
      coral:{ambient:[.34,.42,.40],key:[.57,.67,.60],fog:[.18,.32,.31],sky:['#86b2b9','#c0d5c3','#6f9b99']},
      salt:{ambient:[.40,.43,.40],key:[.65,.67,.57],fog:[.30,.36,.34],sky:['#9bb7ba','#d9d9c1','#9db2aa']}
    };
    const p=palettes[biome];
    if(p)return{ambient:p.ambient.map(v=>v*(1-night*.47)),key:p.key.map(v=>v*(.38+day.sun*.62)),fog:p.fog.map(v=>v*(1-night*.62)),fogDensity:.00045,sky:night>.7?['#172939','#314552','#1b3238']:p.sky};
    return{ambient:[.38-night*.18,.41-night*.19,.39-night*.14],key:[.55*day.sun+.12,.50*day.sun+.15,.40*day.sun+.20],fog:[.18-night*.12,.24-night*.15,.25-night*.12],fogDensity:.00045,sky:night>.7?['#172939','#314552','#1b3238']:['#8dabb5','#b1c2b9','#718c82']};
  }
  getLights(state,p,time){
    if(!this.world)return[];const lights=(this.sceneLights||[]).map(l=>({p:l.p||[l.x,l.height||1.9,l.z??l.y],c:l.c||l.color||[1,.6,.3]}));
    const snap=this.feedbackSnapshot();
    if(snap?.pending?.xy){const xy=snap.pending.xy;lights.push({p:[xy[0]+.5,1.7,xy[1]+.5],c:[.16,.75,.80]});}
    for(const e of snap?.effects||[]){if(Number.isFinite(e.x)&&Number.isFinite(e.y))lights.push({p:[e.x,1.1,e.y],c:color(e.color,[.2,.6,.7])});}
    if(this.world.scene.interior||this.world.scene.household)lights.push({p:[p.x,2.3,p.z+.3],c:[.12,.16,.17]});
    return lights.filter(l=>l.p.every(Number.isFinite)).sort((a,b)=>Math.hypot(a.p[0]-p.x,a.p[2]-p.z)-Math.hypot(b.p[0]-p.x,b.p[2]-p.z)).slice(0,8);
  }
  feedbackSnapshot(){const f=this.frameOptions.feedback;return(typeof f?.snapshot==='function'?f.snapshot():f)||this.world?.embodiedOrigins?.snapshot?.()||null;}
  actorSprite(actor,x,z,dt,{hero=false,person=null,enemy=false,fieldMoving=false,facing=1}={}){
    const w=this.world;if(!Number.isFinite(x)||!Number.isFinite(z))return;
    if(Math.hypot(x-w.state.x,z-w.state.y)>25)return;
    if(hero){const previous=this.motion.get(actor.id)||{x,y:z,facing:1,back:false,phase:0},pose=characterPose(previous,x,z,dt,{intent:actor.id===w.state.party[0]?this.frameOptions.locomotion?.intent:null,gait:actor.id===w.state.party[0]?this.frameOptions.locomotion?.gait:null});this.motion.set(actor.id,pose);const acting=actor.pose>0,basic=actor.id===0&&w.state.story&&!w.state.story.armor,kind=basic?'starter':!acting&&pose.moving&&this.art.assets?.run?'run':'crew',row=basic?(kind==='run'?1:0):actor.id,col=acting?(actor.poseFrame??3):pose.moving?(kind==='run'?pose.frame:pose.crewFrame):pose.back?5:0;let sprite=this.sprite(kind,col,row,x,z,1.94,spriteFacingFlip(kind,col,pose.facing<0,row),actor.hp<=0?.35:1);if(sprite){if(actor.id===w.state.party[0]&&!this.battle&&w.trailLife?.mounted)sprite.y+=.78;this.sprites.push(sprite);}return;}
    if(person){const kind=person.npcKind||'crew',cols=kind==='npcs'?4:8,row=kind==='npcs'?Math.floor((person.row||0)/cols):person.row||0,col=kind==='npcs'?(person.row||0)%cols:0;const sprite=this.sprite(kind,col,row,x,z,person.child?1.3:1.94,!!person.flip,1);if(sprite)this.sprites.push(sprite);return;}
    if(enemy&&Number.isInteger(actor.rivalAvatar)){const sprite=this.sprite('crew',actor.pose>0?3:0,actor.rivalAvatar,x,z,1.94,false,actor.hp<=0?.2:1);if(sprite)this.sprites.push(sprite);return;}
    if(enemy){const kind=actor.atlas?.startsWith('bestiary')?actor.atlas:'creatures',cols=kind==='bestiary3'?6:4,index=finite(actor.sprite,actor.boss?4:0),row=kind==='creatures'?index:Math.floor(index/cols),col=kind==='creatures'?(actor.intent?1:actor.pose>0?(actor.poseFrame??2):0):index%cols;const sprite=this.sprite(kind,col,row,x,z,actor.boss?3.7:1.5,fieldMoving&&facing<0,actor.hp<=0?.2:1);if(sprite)this.sprites.push(sprite);}
  }
  fieldEnemies(){
    const w=this.world,out=[],packs=this.sceneObjects.filter(o=>['patrol','boss'].includes(o.type)&&(o.xy?.every(Number.isFinite)||o.enemies?.some(e=>e[1]?.every(Number.isFinite))));if(w.roamingPack?.object?.enemies?.length)packs.push(w.roamingPack.object);
    for(const o of packs){
      const formation=o.type==='patrol'?patrolFormationEnemies(w.scene,o):null,count=o.type==='boss'?1:Math.min(4,o.enemies?.length||o.count||formation?.length||1);
      for(let i=0;i<count;i++){const at=fieldPatrolPosition(w,o,i),defined=o.type==='wild'?w.roamingPack?.preview?.[i]:formation?.[i],base=defined||frontierEnemy(decorateEnemy({id:'field-'+(o.bit??o.originStep??o.xy?.join('-')??o.enemies?.[0]?.[1]?.join('-')??'pack')+'-'+i,hp:1,maxHp:1,sprite:o.type==='boss'?(w.scene.chapter%3===0?5:4):(w.scene.chapter+i)%4,boss:o.type==='boss',object:o},w.scene.chapter||w.state.chapter,i),o.originSpecies||o.frontierSpecies?.[i%o.frontierSpecies.length]);out.push({...base,object:o,x:at.x,y:at.y,fieldMoving:at.moving,fieldFacing:at.facing});}
    }return out;
  }
  buildDynamic(state,party){
    const m=new Geometry(),shadow=new Geometry(),glow=new Geometry();this.sprites=[];const w=this.world;if(!w){for(const name of ['dynamic','shadows','glow'])this.updateMesh(name,new Geometry());return;}
    const time=state.time,b=this.battle,dt=this.drawDt||.016;
    if(!isObservatory(w)&&this.sceneContactOptions542)this.sceneArt541.contactDepth=appendSceneContactDepth542(shadow,this.sceneContactOptions542);
    if(!b){if(this.partyKey!==w.state.party.join(',')||!this.trail){const f=createFollowerFormation({x:w.state.x,y:w.state.y},w.state.party,(x,y)=>w.walkable(x,y));this.trail=f.trail;this.followers=f.followers;this.partyKey=w.state.party.join(',');}this.trail.record(w.state.x,w.state.y);}
    for(let i=0;i<party.length;i++){const h=party[i],at=b?{x:h.x,y:h.y}:i?this.trail.sample(i*1.05):{x:w.state.x,y:w.state.y};this.followers[i]={id:h.id,x:at.x,y:at.y};this.actorSprite(h,at.x,at.y,dt,{hero:true});if(!appendActorContactShadow(shadow,{world:w,authored:true,x:at.x,z:at.y,groundY:.02,kind:'hero'}))shadow.disc(at.x,.045,at.y,.35,.25,[.005,.015,.02],8,.48);if(h.status?.guard)glow.ring(at.x,.08,at.y,.48,.54,C.teal,9,1,.3);}
    for(const o of this.sceneObjects){const at=objectPoint(o);if(!at||Math.hypot(at.x-w.state.x,at.z-w.state.y)>24)continue;const person=personFor(o);if(person&&(['npc','guide','mentor','shop','transport','aid'].includes(o.type)||o.lifeKind==='resident'||o.rivalId)){const style=civilianStyle(o,person),stance=civilianStance(o,time,w.state,at.x,at.z),identity=style!==null&&this.art.assets?.npcs?{...person,row:style,npcKind:'npcs',child:[1,12].includes(style),flip:stance.flip}:person;this.actorSprite({},at.x,at.z,dt,{person:identity});if(!appendActorContactShadow(shadow,{world:w,authored:true,x:at.x,z:at.z,groundY:.02,kind:'npc'}))shadow.disc(at.x,.045,at.z,.32,.23,[.005,.015,.02],8,.4);}if(o.type==='portal'){const near=Math.hypot(at.x-w.state.x,at.z-w.state.y)<3;glow.ring(at.x,.06,at.z,.39,.43,C.teal,9,1,near?.38:.13);} }
    const enemies=b?b.enemies:this.fieldEnemies();for(const e of enemies){if(!b&&e.object?.originId)this.originThreatSnapshot={...e,sceneId:w.state.scene};if(e.hp<=0||e.withdrawn)continue;this.actorSprite(e,e.x,e.y,dt,{enemy:true,fieldMoving:e.fieldMoving,facing:e.fieldFacing});if(!appendActorContactShadow(shadow,{world:w,authored:true,x:e.x,z:e.y,groundY:.02,kind:e.boss?'boss':'enemy'}))shadow.disc(e.x,.05,e.y,e.boss?.9:.44,e.boss?.58:.29,[.005,.015,.02],8,.5);if(e.intent){const intent=e.intent,x=finite(intent.x,e.x),z=finite(intent.y,e.y),r=intent.shape==='burst'?2.2:intent.radius||.75;glow.ring(x,.07,z,r-.045,r+.045,color(e.color,[1,.35,.20]),9,1,.65);const ratio=1-(intent.left||0)/(intent.total||1);glow.ring(x,.08,z,r*.88,r*.92,C.warm,9,1,.65,40,clamp(ratio,0,1));if(intent.shape!=='burst'&&Math.hypot(x-e.x,z-e.y)>.1)m.tube([e.x,.08,e.y],[x,.08,z],.025,.025,color(e.color,C.warm),4,5,.55);}}
    const target=objectPoint(this.frameOptions.objective?.object);if(target&&Math.hypot(target.x-w.state.x,target.z-w.state.y)<12){const pulse=.22+.08*Math.sin(time*3);glow.ring(target.x,.075,target.z,.58,.64,C.warm,9,1,pulse);}
    this.drawDepartures(shadow,time);this.buildFieldProps(m,glow,time);this.buildAffordances(m,glow,time);if(!isObservatory(w)){this.buildObjectState(m,glow,time);this.buildEmbodied(m,glow,time);}
    const options={world:w,time,objects:this.sceneObjects,feedback:this.feedbackSnapshot()};
    if(isObservatory(w)){appendObservatoryDynamics(m,glow,options);if(this.software)appendObservatoryCastShadows(shadow,options);this.nativeDungeonFrame=null;}else{
    appendAdventureWorldProps(m,glow,{...options,objects:this.sceneObjects.filter(o=>(!o.investigationRole||!dungeonInvestigationStation(w,o))&&!ownsExteriorProp541(w,o,{objects:this.sceneObjects}))});
    if(!architecture.adventureSceneStyle(w).indoor)appendAdventureLandscapeDynamics(m,glow,options);
    appendOriginArtDynamics541(m,glow,options);appendDungeonDynamics(m,glow,options);appendDungeonArtDynamics541(m,glow,options);appendExteriorArtDynamics(m,glow,options);appendExteriorWorksiteDynamics(m,glow,options);
    if(architecture.adventureSceneStyle(w).indoor)appendAdventureSetDynamics(m,glow,options);
    appendAdventureContentDynamic(m,glow,options);appendAdventureLivingDynamic(m,glow,options);appendAdventureSurfaceStates(m,glow,options);appendAdventureEncounterContent(m,shadow,glow,{world:w,battle:b,time});
    this.nativeDungeonFrame=appendNativeDungeonLegibility(m,glow,options);
    this.sprites.push(...adventureLandscapeSprites({...options,assets:this.art.assets}));
    }
    for(const actor of originStagingActors(w,{objects:this.sceneObjects,time})){this.actorSprite({},actor.x,actor.y,dt,{person:actor.person});if(!appendActorContactShadow(shadow,{world:w,authored:true,x:actor.x,z:actor.y,groundY:.02,kind:'npc'}))shadow.disc(actor.x,.045,actor.y,.32,.23,[.005,.015,.02],8,.4);}
    this.sprites.push(...adventureLivingSprites({...options,assets:this.art.assets,bounds:this.art.bounds}));
    for(const actor of adventureEncounterActors(w,b)){this.actorSprite({},actor.x,actor.y,dt,{person:actor.person||{npcKind:'npcs',row:14}});}
    for(const effect of this.frameOptions.effects||[]){const x=finite(effect.x,NaN),z=finite(effect.y,NaN);if(!Number.isFinite(x)||!Number.isFinite(z))continue;const q=clamp((effect.t||0)/(effect.life||1),0,1),col=color(effect.color,C.warm);if(['hit','impact','cast','resonance','reaction','heal','element','inspect'].includes(effect.kind))glow.ring(x,.10,z,.3+q*.5,.36+q*.5,col,9,1,(1-q)*.55);}
    for(const l of(this.sceneLights||[])){const p=l.p;if(!p||Math.hypot(p[0]-w.state.x,p[2]-w.state.y)>19)continue;const col=l.c||C.warm;m.sphere(p[0],p[1],p[2],.045,col,4,.9,6,4);}
    if(isObservatory(w)||sceneArtSpec(w)){const lighting=this.getLighting(),lights=this.sceneLights||[];this.sprites=this.sprites.map(sprite=>groundActorSprite(sprite,{world:w,authored:true,lighting,lights,groundY:.02}));}
    this.updateMesh('dynamic',m);this.updateMesh('shadows',shadow);this.updateMesh('glow',glow);
  }
  updateDepartures(){
    const snapshot=this.feedbackSnapshot();for(const e of snapshot?.effects||[]){if(snapshot.originId!=='veyr-storm'||e.kind!=='lure'||e.type!=='complete'&&!e.peaceful)continue;const key=[this.world.state.scene,snapshot.originId,e.id||'lure'].join(':');if(this.departureKeys.has(key))continue;const native=this.world.scene.objects.find(o=>o.originId===snapshot.originId&&o.type==='patrol'&&o.originStep===2);if(!native)continue;const start=this.originThreatSnapshot?.sceneId===this.world.state.scene?this.originThreatSnapshot:{x:(native.enemies?.[0]?.[1]?.[0]??native.xy[0])+.5,y:(native.enemies?.[0]?.[1]?.[1]??native.xy[1])+.5,sprite:(this.world.scene.chapter||1)%4,boss:false,object:native};const actor=frontierEnemy({...start,hp:1,maxHp:1},native.originSpecies);this.departures.push({key,scene:this.world.state.scene,actor,x:start.x,z:start.y,toX:finite(e.x,start.x-3),toZ:finite(e.y,start.y),started:this.adventureTime});this.departureKeys.add(key);}
    this.departures=this.departures.filter(d=>d.scene===this.world.state.scene&&this.adventureTime-d.started<2);
  }
  drawDepartures(shadow,time){
    for(const d of this.departures){const q=clamp((time-d.started)/2,0,1),approach=Math.min(1,q/.70),ease=approach*approach*(3-2*approach),tail=Math.max(0,(q-.70)/.30),dx=d.toX-d.x,dz=d.toZ-d.z,length=Math.hypot(dx,dz)||1,x=d.x+dx*ease+dx/length*tail*2.4,z=d.z+dz*ease+dz/length*tail*2.4,before=this.sprites.length;this.actorSprite({...d.actor,hp:1,pose:0,intent:null},x,z,this.drawDt,{enemy:true,fieldMoving:true,facing:Math.sign(dx)||1});if(this.sprites.length>before){const sprite=this.sprites.at(-1);sprite.y=.9+Math.sin(approach*Math.PI)*.9+tail*2.8+Math.sin(time*8)*.035;sprite.alpha=1-tail;}shadow.disc(x,.065,z,.38*(1-q*.5),.25*(1-q*.5),[.005,.015,.02],8,.28*(1-q));}
  }
  buildAffordances(m,glow,time){
    const w=this.world,blocked=new Set((w.scene.affordanceBlocked||[]).map(p=>p.join(','))),wood=C.brass.map(n=>n*.57);
    for(const o of this.sceneObjects.filter(o=>o.type==='affordance'&&o.xy)){
      const at=objectPoint(o);if(Math.hypot(at.x-w.state.x,at.z-w.state.y)>22)continue;
      if(o.affordanceKind==='site'){
        const closed=blocked.has(o.xy.join(',')),solved=!!o.solved,gate=['resonancegate','relay'].includes(o.art||o.reservationArt);
        if(gate){
          for(const side of[-1,1])m.tube([at.x+side*.43,.03,at.z],[at.x+side*.43,closed?1.28:.24,at.z],.055,.055,C.metal,1,7);
          if(closed){for(const dx of[-.30,0,.30])m.tube([at.x+dx,.06,at.z],[at.x+dx,1.17,at.z],.027,.027,C.brass,1,6);m.box(at.x,.68,at.z,.84,.07,.09,C.brass,1);m.sphere(at.x,.68,at.z+.07,.10,C.warm,4,.18,8,5);}
          else if(solved){for(const side of[-1,1])m.tube([at.x+side*.43,.20,at.z],[at.x+side*.43,.20,at.z+side*.38],.028,.028,C.brass,1,6);glow.ring(at.x,.065,at.z,.32,.36,C.teal,9,1,.16);}
        }else{
          for(let i=0;i<5;i++){const x=at.x-.36+i*.18,lift=closed&&i%2?.12:0;m.box(x,.055+lift,at.z,.145,.055,.88,wood,2,0,closed?(i%2?.18:-.13):0);}
          if(closed){m.tube([at.x-.39,.08,at.z-.32],[at.x+.39,.47,at.z+.32],.055,.055,wood,2,7);m.tube([at.x+.39,.08,at.z-.32],[at.x-.39,.47,at.z+.32],.055,.055,wood,2,7);m.box(at.x,.045,at.z,.86,.018,.86,C.dark,7);}
          else if(solved){for(const z of[at.z-.30,at.z+.30])m.box(at.x,.10,z,.84,.035,.045,C.brass,1);}
        }
        if(!solved&&o.progress)glow.ring(at.x,.08,at.z,.30,.34,C.warm,9,1,.3,30,clamp(o.progress/3,0,1));
      }else if(o.affordanceKind==='salvage'&&!o.solved){
        if(o.toolType==='plank')m.box(at.x,.10,at.z,.68,.06,.18,wood,2,0,.2);
        else if(o.toolType==='hook')m.tube([at.x-.24,.08,at.z],[at.x+.20,.15,at.z+.13],.03,.02,C.edge,1,6);
        else if(o.toolType==='bell'){m.cylinder(at.x,.17,at.z,.14,.22,C.brass,1,9,.06);m.cylinder(at.x,.06,at.z,.17,.035,C.brass,1,9);}
        else if(o.toolType==='jar')m.sphere(at.x,.18,at.z,.16,[.18,.46,.47],5,0,9,6);
        else if(o.toolType==='coil')for(let j=0;j<3;j++)m.ring(at.x,.05+j*.035,at.z,.10,.15,C.brass,1,0,1,16);
        else for(let j=0;j<4;j++)m.tube([at.x-.24,.06+j*.025,at.z+j*.03],[at.x+.24,.09+j*.025,at.z+j*.03],.014,.01,[.36,.47,.24],2,5);
      }else if(o.affordanceKind==='scout'){m.cylinder(at.x,.07,at.z,.16,.12,C.metal,1,10);m.ring(at.x,.14,at.z,.08,.13,C.brass,1,0,1,16);}
    }
  }
  buildFieldProps(m,glow,time){
    const battle=this.battle;if(!battle?.field?.enabled)return;const actors=[...(battle.heroes||[]),...(battle.enemies||[])];
    for(const prop of battle.field.props||[]){if(prop.condition==='spent')continue;const owner=prop.ownerId!=null?actors.find(a=>a.id===prop.ownerId):null,x=owner?owner.x+.40:prop.x,z=owner?owner.y+.08:prop.y,y=owner?1.0:.12;if(!Number.isFinite(x)||!Number.isFinite(z))continue;
      if(prop.condition==='cover'){const cover=battle.field.cover?.find(c=>c.propId===prop.id);if(cover?.integrity>0){m.box(x,.48,z,1.3,.8,.13,C.brass.map(v=>v*.55),2);for(const dx of[-.4,.4])m.tube([x+dx,.04,z+.35],[x+dx,.7,z],.045,.045,C.metal,1,6);}continue;}
      if(prop.type==='plank')m.box(x,y,z,.9,.085,.24,C.brass.map(v=>v*.6),2,0,.28);
      else if(prop.type==='bell'){m.cylinder(x,y+.15,z,.18,.26,C.brass,1,10,.075);m.cylinder(x,y+.01,z,.21,.05,C.brass,1,10);}
      else if(prop.type==='jar'){m.sphere(x,y+.16,z,.19,[.17,.43,.46],5,0,10,7,[.85,1,.85]);m.cylinder(x,y+.34,z,.065,.10,C.edge,1,8);}
      else if(prop.type==='coil'){for(let i=0;i<4;i++)m.ring(x,y+i*.04,z,.12,.18,C.brass,1,0,1,20);}
      else if(prop.type==='hook'){m.tube([x-.25,y,z],[x+.20,y+.04,z],.035,.035,C.edge,1,7);m.tube([x+.2,y+.04,z],[x+.28,y+.10,z+.12],.035,.03,C.edge,1,7);m.tube([x+.28,y+.10,z+.12],[x+.15,y+.10,z+.18],.03,.025,C.edge,1,7);}
      else if(prop.type==='reed'){for(let i=0;i<5;i++)m.tube([x-.30,y+i*.02,z+i*.035],[x+.28,y+.06+i*.02,z+i*.035],.02,.012,[.36,.48,.24],2,5);}
      if(!owner)glow.ring(x,.075,z,.29,.32,C.warm,9,1,.17+.04*Math.sin(time*2));
    }
  }
  buildObjectState(m,glow,time){
    const w=this.world,objects=[...this.sceneObjects,...(w.scene.household?.furnishings||[])],seen=new Set(),openFurniture=w.state.household?.openFurniture||[];
    for(const o of objects){const at=objectPoint(o);if(!at||Math.hypot(at.x-w.state.x,at.z-w.state.y)>20)continue;const id=o.householdId||o.id||o.type+':'+at.x+':'+at.z;if(seen.has(id))continue;seen.add(id);
      if(o.type==='switch'&&!adventurePropFamily(w,o)){const done=!!w.done?.(o),angle=done?.7:-.7;m.tube([at.x,.38,at.z],[at.x+Math.sin(angle)*.48,.38+Math.cos(angle)*.48,at.z],.038,.038,C.brass,1,7);m.sphere(at.x+Math.sin(angle)*.48,.38+Math.cos(angle)*.48,at.z,.075,done?C.teal:C.edge,1,done?.25:0,7,5);}
      if(o.type==='cache'){const angle=w.done?.(o)?1.30:0,hinge=at.z-.26,y=w.walkable(at.x,at.z)?.06:.43,wid=.82,depth=.52,a=[at.x-wid/2,y,hinge],b=[at.x+wid/2,y,hinge],c=[at.x+wid/2,y+Math.sin(angle)*depth,hinge+Math.cos(angle)*depth],d=[at.x-wid/2,y+Math.sin(angle)*depth,hinge+Math.cos(angle)*depth];m.quad(a,b,c,d,C.brass,1);m.quad(d,c,b,a,C.brass,1);}
      if(o.type==='furnishing'&&o.footprint&&(['cabinet','cupboard','dresser','trunk','nightstand'].includes(o.specialType||o.furnitureType||o.kind)||[1,2,7,10,12,19,20].includes(o.furniture))){const f=o.footprint,width=f.w*.86,height=Math.min(1.5,f.h+.5),opened=openFurniture.includes(o.householdId),angle=opened?Math.PI*.43:0,hingeX=f.x+.06,hingeZ=f.y+f.h+.025,cx=hingeX+Math.cos(angle)*width/2,cz=hingeZ+Math.sin(angle)*width/2;m.box(cx,height/2+.08,cz,width,height,.065,C.brass.map(n=>n*.5),2,0,-angle);m.sphere(cx+Math.cos(angle)*width*.30,height*.55,cz+Math.sin(angle)*width*.30+.05,.035,C.brass,1,0,6,4);}
    }
  }
  buildEmbodied(m,glow,time){
    const snapshot=this.feedbackSnapshot();if(!snapshot)return;const pending=snapshot.pending,devices=snapshot.devices||{},staged=!!originStagingSpec(this.world);
    const physicalObjects=this.sceneObjects.filter(o=>o.type==='embodied-action'||o.embodiedAction);if(snapshot.originId==='veyr-storm'&&devices.receiver&&!physicalObjects.some(o=>o.manipulation==='receiver')){const receiver=this.world.scene.objects.find(o=>o.originId===snapshot.originId&&o.originStep===0&&o.xy);if(receiver)physicalObjects.push({...receiver,id:'remembered-receiver',manipulation:'receiver'});}
    for(const o of physicalObjects){const at=objectPoint(o);if(!at)continue;const kind=o.manipulation||o.kind||o.embodiedAction,active=pending&&(pending.id===o.id||pending.kind===kind),progress=active?clamp(pending.progress||0,0,1):0;
      if(kind==='receiver'&&!staged){m.cylinder(at.x,.98,at.z,.36,.10,C.brass,1,12);const angle=time*(devices.receiver?.22:.035);m.tube([at.x+Math.cos(angle)*.38,1.05,at.z+Math.sin(angle)*.38],[at.x-Math.cos(angle)*.38,1.05,at.z-Math.sin(angle)*.38],.035,.035,C.edge,1,6);if(devices.receiver)glow.ring(at.x,.06,at.z,.5,.55,C.teal,9,1,.25);}
      if(kind==='cable'){const grounded=devices.grounded||progress>.98,from=o.from||pending?.from||{x:at.x,y:at.z},to=o.to||pending?.to||{x:at.x+1.5,y:at.z},drag=active?pending?.dragPoint:null,end=grounded?to:drag||{x:from.x+(to.x-from.x)*progress*.9+.30*(1-progress),y:from.y+(to.y-from.y)*progress*.9};const a=[from.x,.26,from.y],b=[(from.x+end.x)/2,.15+(1-progress)*.13,(from.y+end.y)/2],c=[end.x,grounded?.08:.13,end.y];m.tube(a,b,.045,.045,grounded?C.teal:C.brass,1,8,grounded?.24:0);m.tube(b,c,.045,.045,grounded?C.teal:C.brass,1,8,grounded?.24:0);m.cylinder(to.x,.035,to.y,.17,.05,C.brass,1,12);glow.ring(to.x,.07,to.y,.17,.22,C.teal,9,1,active?.5:.15);m.sphere(end.x,c[1],end.y,.075,grounded?C.teal:C.edge,1,grounded?.5:0,8,5);}
      if(kind==='lever'&&!staged){const a=(devices.vaneRaised?1:progress)*1.2-.6;m.tube([at.x,.45,at.z],[at.x+Math.sin(a)*.6,.45+Math.cos(a)*.6,at.z],.045,.045,C.brass,1,8);m.sphere(at.x+Math.sin(a)*.6,.45+Math.cos(a)*.6,at.z,.09,C.edge,1,0,8,5);}
      if(kind==='coil'&&!staged){const split=devices.coilSeparated?.35:progress*.35;for(const side of[-1,1])for(let ring=0;ring<5;ring++)m.cylinder(at.x+side*(.22+split),.4+ring*.12,at.z,.19,.045,C.brass,1,10);}
      if(kind==='lure'&&devices.diverted)for(let i=0;i<5;i++){const phase=(time*.2+i*.2)%1;m.sphere(at.x+Math.sin(time+i)*phase,.35+phase*.8,at.z-phase*1.5,.025,C.teal,4,1,5,4);}
      if(active)glow.ring(at.x,.09,at.z,.66,.74,C.teal,9,1,.7,48,progress);
    }
    for(const effect of snapshot.effects||[]){const x=effect.x,z=effect.y;if(!Number.isFinite(x)||!Number.isFinite(z))continue;const q=clamp((effect.t??effect.age??0)/(effect.life||effect.duration||1),0,1),r=.4+q*1.1,col=color(effect.color,C.teal);glow.ring(x,.1,z,r,r+.045,col,9,1,(1-q)*.5);for(let i=0;i<5;i++){const phase=(q+i*.17)%1,a=i*TAU/5+time*.6;m.sphere(x+Math.cos(a)*phase*.45,.15+phase*1.2,z+Math.sin(a)*phase*.45,.025*(1-q),col,4,.6,5,3);}if(['puzzle','switch','signal','vane'].includes(effect.kind)){const a=time*3*(1-q);m.tube([x+Math.cos(a)*.32,.85,z+Math.sin(a)*.32],[x-Math.cos(a)*.32,.85,z-Math.sin(a)*.32],.025,.025,C.brass,1,6);}}
  }
  screenToWorld(clientX,clientY){if(clientX&&typeof clientX==='object'){clientY=clientX.clientY??clientX.y;clientX=clientX.clientX??clientX.x;}const p=this.screenToGround(clientX,clientY);return p?{x:p.x,y:p.z}:null;}
  worldToScreen(x,y,height=0){if(!this.vp)return null;const m=this.vp,z=y,w=m[3]*x+m[7]*height+m[11]*z+m[15],r=this.canvas.getBoundingClientRect();if(w<=.001)return{x:0,y:0,visible:false,depth:w};const sx=(m[0]*x+m[4]*height+m[8]*z+m[12])/w,sy=(m[1]*x+m[5]*height+m[9]*z+m[13])/w;return{x:(sx*.5+.5)*r.width,y:(.5-sy*.5)*r.height,visible:Math.abs(sx)<1.1&&Math.abs(sy)<1.1,depth:w};}
}
