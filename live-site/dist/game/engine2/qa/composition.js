import {createAdventurePresentation} from '../adventure-presentation.js?v=5.42';
import {buildingFadeAlpha} from '../building-art.js?v=5.22.0';
import {interiorWallPlan} from '../environment-interiors-v19.js?v=5.18.1';
import {canopyVariationGeometry} from '../environment-canopies-v19.js?v=5.18.1';
import {originById} from '../origin-content.js?v=5.18.0';
import {World} from '../world.js?v=5.41';
import {Renderer} from '../renderer.js?v=5.41';
import {loadArtAssets} from '../asset-loader.js?v=5.18.0';
import {gameArtDefinitions} from '../art-definitions.js?v=5.22.0';
import {isInteriorScene} from '../scene-identity.js';
import {installReconciledGround} from '../reconciled-ground.js?v=5.41';
import {installLivingAtlas} from '../living-atlas.js?v=5.41';
import {installTrailLife} from '../reconciled-travel.js?v=5.38';
import {installTownLife} from '../townlife.js?v=5.38';
import {installRegionalLife} from '../regional-life.js?v=5.38';
import {installEmbodiedOrigins,replacesEmbodiedOriginObject} from '../embodied-origins.js?v=5.38';
import {installCampaignActuators} from '../campaign-actuators.js?v=5.31.0';
import {createWorldControls} from '../world-controls.js?v=5.38';
import {movementDelta} from '../player-locomotion.js?v=5.14.0';
import {ENVIRONMENT_ART_FILES,regionalArtStyle,regionalSiteSpec} from '../environment-art-v17.js?v=5.22.0';
const $=s=>document.querySelector(s),canvas=$('#view'),status=$('#status'),picker=$('#scene'),caption=$('#caption');
const params=new URL(location.href).searchParams,held=new Set();canvas.dataset.artCollection='v19';
let world,renderer,originalArt,route=[],at=0,last=0,running=false,frames=0,drawTimes=[],detailAt=0,reviewArrival=null;
function stop(){running=false;held.clear();if(renderer)renderer.locomotion=null;}
function applyCollection(){for(const key of [...Object.keys(ENVIRONMENT_ART_FILES),'environmentSurfaces','environmentWater','environmentCanopies','environmentArchitecture','environmentCanopyVariations','environmentHomeWalls','environmentWorkshopWalls','environmentCivicWalls','environmentFacades','environmentRoofcraft'])renderer.assets[key]=$('#collection').checked?originalArt[key]:undefined;}
function safeArrival(scene){
 const authored=scene.authoredOpening?.arrival;if(authored?.length===2&&world.walkable(...authored))return authored;
 const a=scene.arrive;if(a?.length===2&&world.walkable(a[0]+.5,a[1]+.5))return [a[0]+.5,a[1]+.5];
 for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(world.walkable(x+.5,y+.5))return [x+.5,y+.5];
 throw new Error('No traversable arrival in this scene.');
}
function describe(){
 const scene=world.scene,plan=renderer.craftPlan,ids=new Set(plan.sites.map(s=>regionalSiteSpec(s,scene,plan)?.id).filter(Boolean));
 caption.replaceChildren();const title=document.createElement('strong');title.textContent=scene.title||scene.name||scene.key;caption.append(title);
 const sub=document.createElement('small');sub.textContent=(isInteriorScene(scene)?'Interior · '+(scene.household?.kind||scene.interior):regionalArtStyle(scene,plan))+' · Scene '+scene.location+' · '+(isInteriorScene(scene)?'Existing furniture footprints':ids.size+' regional scenery motifs');caption.append(sub);
 $('#walk').disabled=!route.length;$('#walk').title=route.length?'Follow the authored approach':'Use arrow keys or the directional controls to explore.';
 $('#new-detail').disabled=!detailTargets().length;$('#new-detail').title='Visit each new room, building or tree detail in this scene';
}
function show(){
 stop();const id=Number(picker.value),identity=world.scenes.get(id);if(!identity)return;world.newGame(identity.originId?{originId:identity.originId,quiet:true}:{quiet:true});const scene=world.scenes.get(id);reviewArrival=scene.originId&&scene.originPart===0?[world.state.x,world.state.y]:null;if(scene.originId&&scene.originPart===1)world.state.chronicle.step=2;
 const hero=Number.isInteger(scene.fieldOrigin)?scene.fieldOrigin:scene.originId?originById(scene.originId)?.hero??0:0;
 world.state.scene=scene.location;world.state.chapter=scene.chapter||1;world.state.party=[hero];world.state.mode='field';
 [world.state.x,world.state.y]=reviewArrival||safeArrival(scene);applyCollection();renderer.scene(world);route=scene.authoredOpening?.approach||[];at=0;detailAt=0;drawTimes=[];delete canvas.dataset.error;describe();
 const url=new URL(location.href);url.searchParams.set('scene',String(scene.location));history.replaceState(null,'',url);
}
function detailTargets(){
 const scene=world.scene;
 if(isInteriorScene(scene))return interiorWallPlan(scene).filter(p=>renderer.assets[p.asset]).map(p=>({point:[p.x/48,p.y/48+1.6],label:p.spec.piece.label}));
 if((renderer.assets.environmentFacades||renderer.assets.environmentRoofcraft)&&renderer.exteriors?.length)return renderer.exteriors.filter(p=>p.projection.kind!=='underground').map(p=>({point:[p.projection.outside[0]+.5,p.projection.outside[1]+3.2],label:p.exit.travel_label||p.projection.style||'Building detail',building:p}));
 const style=regionalArtStyle(scene,renderer.craftPlan);
 return (renderer.treeSites||[]).map(p=>({p,g:canopyVariationGeometry(p.seed,style,renderer.assets.environmentCanopyVariations)})).filter(v=>v.g).map(({p,g})=>({point:[p.x,p.y-.3],label:g.canopy.label}));
}
function nearestReviewPoint(point,building=null){
 let best=null;for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
  const p=[Math.floor(point[0])+dx+.5,Math.floor(point[1])+dy+.5],d=Math.hypot(p[0]-point[0],p[1]-point[1]);
  const score=d+(building&&buildingFadeAlpha(building,{x:p[0],y:p[1]})<1?20:0);
  if(world.walkable(...p)&&(!best||score<best.score))best={p,score};
 }return best?.p;
}
function resetAt(point){stop();if(!point||!world.walkable(point[0],point[1]))return;[world.state.x,world.state.y]=point;renderer.scene(world);}
try{
 const [data,assets]=await Promise.all([fetch('../world.json').then(r=>r.json()),loadArtAssets(gameArtDefinitions(),{onProgress:p=>status.textContent='Artwork '+p.loaded+'/'+p.total})]);
 originalArt={...assets};world=new World(data);installReconciledGround(world);installLivingAtlas(world);installTrailLife(world);installTownLife(world);installRegionalLife(world);
 const origins=installEmbodiedOrigins(world),campaign=installCampaignActuators(world);world.worldControls=createWorldControls(world,origins,campaign);
 const nativeObjects=world.objects.bind(world);world.objects=()=>[...nativeObjects().filter(o=>!replacesEmbodiedOriginObject(world,o)),...world.embodiedOrigins.objects()];
 renderer=createAdventurePresentation(new Renderer(canvas,assets,{compatibility:params.get('graphics')==='compatible'}),{getWorld:()=>world});renderer.ui={hudHeight:0};renderer.comfort={steadyLighting:false,screenShake:false};
 const scenes=[...world.scenes.values()].filter(s=>s.width&&s.height&&s.floor).sort((a,b)=>a.location-b.location),groups=new Map();
 for(const scene of scenes){const group=scene.originId?'Remembered lives':isInteriorScene(scene)?'Rooms and workshops':scene.biome?'Frontier landscapes':'Towns and story places';if(!groups.has(group)){const opt=document.createElement('optgroup');opt.label=group;groups.set(group,opt);picker.append(opt);}const option=document.createElement('option');option.value=String(scene.location);option.textContent=(scene.title||scene.name||scene.key)+' · '+scene.location;groups.get(group).append(option);}
 picker.value=scenes.some(s=>s.location===Number(params.get('scene')))?params.get('scene'):'50001';picker.onchange=()=>{show();$('#new-detail').textContent='New detail';};show();$('#count').textContent=scenes.length+' places';
 $('#mode').textContent=renderer.compatibility?'Use Standard':'Use Compatibility';
 $('#mode').onclick=()=>{stop();renderer.setGraphicsMode(!renderer.compatibility);applyCollection();renderer.scene(world);describe();detailAt=0;$('#new-detail').textContent='New detail';$('#mode').textContent=renderer.compatibility?'Use Standard':'Use Compatibility';drawTimes=[];};
 $('#collection').onchange=()=>{applyCollection();renderer.scene(world);describe();detailAt=0;$('#new-detail').textContent='New detail';drawTimes=[];};
 $('#still').onchange=()=>{renderer.comfort.steadyLighting=$('#still').checked;};
 $('#walk').onclick=()=>{stop();at=0;running=route.length>0;};$('#stop').onclick=stop;$('#arrival').onclick=()=>resetAt(reviewArrival||safeArrival(world.scene));
 $('#new-detail').onclick=()=>{const targets=detailTargets();if(!targets.length)return;const at=detailAt++%targets.length,target=targets[at],point=nearestReviewPoint(target.point,target.building);if(point)resetAt(point);$('#new-detail').textContent='Detail '+(at+1)+' / '+targets.length;$('#new-detail').title=target.label;};
 $('#landmark').onclick=()=>{const scene=world.scene,p=scene.authoredOpening?.landmark?.focus||route[Math.floor(route.length*.65)];if(p)resetAt(p);else{const sites=renderer.craftPlan.sites,site=sites[Math.floor(sites.length/2)];if(site){let best=null;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const p=[Math.floor(site.x)+dx+.5,Math.floor(site.y)+dy+.5],d=Math.hypot(p[0]-site.x,p[1]-site.y);if(world.walkable(...p)&&(!best||d<best.d))best={p,d};}if(best)resetAt(best.p);}}};
 for(const button of document.querySelectorAll('[data-heading]')){const key=button.dataset.heading;button.onpointerdown=e=>{e.preventDefault();running=false;held.add(key);button.setPointerCapture?.(e.pointerId);};const release=()=>held.delete(key);button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;}
 window.addEventListener('keydown',e=>{if(e.target.closest?.('input,select,textarea,button,a'))return;if(e.code.startsWith('Arrow')||e.code.startsWith('Shift')){e.preventDefault();running=false;held.add(e.code);}});window.addEventListener('keyup',e=>held.delete(e.code));window.addEventListener('blur',stop);window.addEventListener('resize',()=>renderer.resize());canvas.onpointerdown=()=>canvas.focus();
 status.textContent='Ready · full 3D game renderer · '+scenes.length+' places';
 function frame(now){const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(document.hidden){requestAnimationFrame(frame);return;}try{
  let dx=(held.has('ArrowRight')?1:0)-(held.has('ArrowLeft')?1:0),dy=(held.has('ArrowDown')?1:0)-(held.has('ArrowUp')?1:0);
  if(running&&route.length){const p=route[at],x=p[0]-world.state.x,y=p[1]-world.state.y,d=Math.hypot(x,y);if(d<.09){at++;if(at>=route.length)running=false;}else{dx=x/d;dy=y/d;}}
  const move=movementDelta(dx,dy,dt,{run:held.has('ShiftLeft')||held.has('ShiftRight')});renderer.locomotion=move;world.move(move.x,move.y);world.reconciledGround.update(dt);world.townLife.update(dt);renderer.draw(world,null,dt);frames++;drawTimes.push(renderer.frameMs);if(drawTimes.length>180)drawTimes.shift();
  canvas.dataset.scene=String(world.state.scene);canvas.dataset.frames=String(frames);canvas.dataset.collection=String($('#collection').checked);canvas.dataset.graphicsMode=renderer.compatibility?'compatible':'standard';
  if(frames%30===0){const times=[...drawTimes].sort((a,b)=>a-b),p95=times[Math.floor(times.length*.95)]||0;status.textContent=(renderer.compatibility?'Compatibility':'Standard')+' · draw p95 '+p95.toFixed(1)+' ms · '+world.state.x.toFixed(1)+', '+world.state.y.toFixed(1);}
 }catch(error){status.textContent='Render error: '+error.message;canvas.dataset.error=error.message;console.error(error);return;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
}catch(error){status.textContent='Unable to open art studio: '+error.message;canvas.dataset.error=error.message;console.error(error);}
