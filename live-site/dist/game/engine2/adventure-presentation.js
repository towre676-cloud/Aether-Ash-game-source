import {Adventure3DRenderer} from './adventure-3d-renderer.js?v=5.42';
import {cameraZoomValue} from './camera-zoom.js?v=5.30.0';
import {resolveGuidedObjective} from './guided-objective.js?v=5.41';

const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const clock=()=>typeof performance==='object'?performance.now():Date.now();

/** Keep the established game/input API while presenting every scene in 3D. */
export function createAdventurePresentation(base,{
  getWorld=()=>base.lastWorld,
  getFeedback=()=>null,
  getObjective=resolveGuidedObjective,
  onIssue=base.onGraphicsIssue||(()=>{})
}={}){
  const input=base.canvas,parent=input?.parentElement,doc=input?.ownerDocument;
  if(!parent||!doc)throw new Error('The 3D world needs a mounted game canvas.');
  const originalStyle=input.getAttribute('style');
  const surface=doc.createElement('canvas'),overlay=doc.createElement('canvas');
  surface.className='adventure-world-canvas';overlay.className='adventure-overlay-canvas';
  for(const layer of [surface,overlay]){
    layer.setAttribute('aria-hidden','true');
    Object.assign(layer.style,{position:'absolute',inset:'0',display:'block',width:'100%',height:'100%',pointerEvents:'none'});
  }
  surface.style.zIndex='0';overlay.style.zIndex='2';
  // The legacy context was created with alpha:false. Hiding its pixels keeps
  // its existing pointer handlers without covering the new world in black.
  Object.assign(input.style,{position:'absolute',inset:'0',zIndex:'1',background:'transparent',opacity:'0'});
  parent.insertBefore(surface,input);parent.insertBefore(overlay,input.nextSibling);
  const context=overlay.getContext('2d',{alpha:true});
  const art=()=>({assets:base.assets,bounds:base.bounds,registrations:base.registrations});
  let adventure,currentWorld=null,currentScene=null,lastBattle=null,lastOptions=null,destroyed=false,failed=false,lastIssue='',overlayDpr=1;
  const notify=message=>{if(message!==lastIssue){lastIssue=message;onIssue(message);}};
  try{
    adventure=new Adventure3DRenderer(surface,{
      art:art(),quality:base.compatibility?'low':'auto',
      onLost(error){base.contextLost=true;notify(error?.message||'The 3D drawing surface was interrupted. Your journey is paused while graphics recover.');},
      onRestored(){base.contextLost=false;failed=false;lastIssue='';adventure?.setArt(art());if(currentWorld)adventure?.scene(currentWorld);notify('The 3D world has recovered. Resume when you are ready.');}
    });
  }catch(error){
    surface.remove();overlay.remove();
    if(originalStyle===null)input.removeAttribute('style');else input.setAttribute('style',originalStyle);
    notify('The 3D world could not start: '+error.message);throw error;
  }
  base.camera.zoom=adventure.zoom;
  input.dataset.renderer='adventure-3d';
  const bound=new Map();
  // WebGL may discard its back buffer between frames. Cinema captures happen
  // in a separate task, so render once synchronously before exporting it.
  if(typeof surface.toDataURL==='function'){
    const capture=surface.toDataURL.bind(surface);
    surface.toDataURL=(...args)=>{
      if(currentWorld&&!destroyed&&!failed&&!adventure.lost){
        adventure.forceRender=true;adventure.drawWorld(currentWorld,lastBattle,0,lastOptions||{});
      }
      return capture(...args);
    };
  }

  function clearOverlay(){
    if(!context)return;
    context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='source-over';
    context.clearRect(0,0,overlay.width,overlay.height);
    context.setTransform(overlayDpr,0,0,overlayDpr,0,0);
  }
  function resize(){
    if(destroyed)return;
    base.resize();adventure.resize();
    const rect=input.getBoundingClientRect();overlayDpr=clamp(finite(base.dpr,1),1,2);
    const width=Math.max(1,Math.round(rect.width*overlayDpr)),height=Math.max(1,Math.round(rect.height*overlayDpr));
    if(overlay.width!==width)overlay.width=width;if(overlay.height!==height)overlay.height=height;
    clearOverlay();
  }
  function scene(world){
    if(destroyed||!world?.scene)return;
    currentWorld=world;currentScene=world.scene;lastBattle=null;lastOptions=null;
    try{
      base.scene(world);adventure.setArt(art());adventure.scene(world);
      if(base.manualZoom!=null)adventure.setZoom(base.manualZoom);
      base.camera.zoom=adventure.zoom;base.followers=adventure.followers;
      base.motion=adventure.motionMap||adventure.motion||new Map();
      failed=false;lastIssue='';clearOverlay();
    }catch(error){failed=true;clearOverlay();recoveryMessage();notify('The 3D scene could not open: '+error.message);}
  }
  function advanceEffects(dt){
    if(!Array.isArray(base.effects))base.effects=[];
    for(let index=base.effects.length-1;index>=0;index--){
      const effect=base.effects[index];
      if(!effect||typeof effect!=='object'){base.effects.splice(index,1);continue;}
      effect.t=Math.max(0,finite(effect.t))+dt;
      effect.life=clamp(finite(effect.life,1),.05,12);
      if(effect.t>effect.life)base.effects.splice(index,1);
    }
    if(base.effects.length>96)base.effects.splice(0,base.effects.length-96);
  }
  function drawCombatValues(){
    if(!context)return;
    context.save();context.textAlign='center';context.textBaseline='middle';
    context.font='600 16px system-ui, sans-serif';context.lineJoin='round';context.lineWidth=3;
    // Routine narrative and world labels belong to the tangible scene. Only
    // short combat amounts need a projected readout above the action.
    for(const effect of base.effects){
      if(effect.kind!=='number'||!Number.isFinite(effect.x)||!Number.isFinite(effect.y))continue;
      const value=String(effect.value??'').trim();
      if(!/^[+-]?\d+(?:\.\d+)?%?(?:\s(?:HP|MP))?$/.test(value))continue;
      const progress=clamp(effect.t/effect.life,0,1),point=adventure.worldToScreen(effect.x,effect.y+.8,1.9+progress*.65);
      if(!point?.visible)continue;
      context.globalAlpha=Math.min(1,(1-progress)*3);context.strokeStyle='#07151c';
      context.fillStyle=typeof effect.color==='string'?effect.color:'#ffe9bb';
      context.strokeText(value,point.x,point.y);context.fillText(value,point.x,point.y);
    }
    context.restore();
  }
  function recoveryMessage(){
    if(!context)return;
    const rect=input.getBoundingClientRect();context.fillStyle='#07151cdd';context.fillRect(0,0,rect.width,rect.height);
    context.fillStyle='#e6eee8';context.font='500 18px system-ui, sans-serif';context.textAlign='center';
    context.fillText('The 3D world is recovering.',rect.width/2,rect.height/2);
  }
  function draw(world,battle,dt){
    if(destroyed||!world?.scene)return;
    const began=clock(),elapsed=clamp(finite(dt),0,.1);
    if(currentWorld!==world||currentScene!==world.scene||adventure.sceneId!==world.state.scene)scene(world);
    base.time=finite(base.time)+elapsed;base.lastWorld=world;base.currentScene=world.scene;
    base.shake=Math.max(0,finite(base.shake)-elapsed*24);advanceEffects(elapsed);
    clearOverlay();
    // User display filters are attached to the established input canvas.
    if(surface.style.filter!==input.style.filter)surface.style.filter=input.style.filter;
    if(overlay.style.filter!==input.style.filter)overlay.style.filter=input.style.filter;
    if(failed||adventure.lost){recoveryMessage();return;}
    try{
      adventure.ui=base.ui;adventure.comfort=base.comfort;
      lastBattle=battle;lastOptions={effects:base.effects,objective:getObjective?.(world)||null,locomotion:base.locomotion,feedback:getFeedback?.()||null};
      adventure.drawWorld(world,battle,elapsed,lastOptions);
      base.followers=adventure.followers||[];base.motion=adventure.motionMap||adventure.motion||new Map();
      base.camera.zoom=adventure.zoom;
      input.dataset.cameraZoom=String(Number(adventure.zoom.toFixed(4)));
      input.dataset.cameraZoomMode=base.manualZoom!=null?'manual':'automatic';
      input.dataset.renderBackend=surface.dataset.renderBackend||adventure.stats.backend||'webgl';
      input.dataset.renderStats=surface.dataset.renderStats||'';
      input.dataset.sceneArt=surface.dataset.sceneArt||'';
      drawCombatValues();
    }catch(error){failed=true;input.dataset.renderBackend='interrupted';recoveryMessage();notify('The 3D world paused after a graphics error: '+error.message);}
    base.frameMs=Math.max(0,clock()-began);base.metrics.push(base.frameMs);
    if(base.metrics.length>300)base.metrics.splice(0,base.metrics.length-300);
  }
  const overrides={
    adventure,canvas:surface,inputCanvas:input,overlayCanvas:overlay,
    scene,draw,resize,
    screenToWorld(x,y){
      if(x&&typeof x==='object'){y=x.y??x.clientY;x=x.x??x.clientX;}
      const rect=input.getBoundingClientRect();
      return adventure.screenToWorld(rect.left+finite(x),rect.top+finite(y));
    },
    worldToScreen(x,y,height=0){return adventure.worldToScreen(x,y,height);},
    setManualZoom(value,anchor){
      const zoom=cameraZoomValue(value);base.manualZoom=zoom;
      if(zoom!==null)adventure.setZoom(zoom,anchor);else adventure.resetView();
      base.camera.zoom=adventure.zoom;
      input.dataset.cameraZoom=String(Number(adventure.zoom.toFixed(4)));
      input.dataset.cameraZoomMode=zoom!==null?'manual':'automatic';
    },
    setGraphicsMode(compatibility){
      base.setGraphicsMode(compatibility);adventure.setArt(art());
      adventure.setQuality(base.compatibility?'low':'auto');failed=false;lastIssue='';
      const world=currentWorld||getWorld?.();if(world?.scene)adventure.scene(world);resize();
    },
    destroy(){
      if(destroyed)return;destroyed=true;adventure.destroy();surface.remove();overlay.remove();
      if(originalStyle===null)input.removeAttribute('style');else input.setAttribute('style',originalStyle);
      delete input.dataset.renderer;delete input.dataset.renderBackend;delete input.dataset.renderStats;
    }
  };
  resize();
  return new Proxy(base,{
    get(target,key){
      if(Object.hasOwn(overrides,key))return overrides[key];
      const value=Reflect.get(target,key,target);
      if(typeof value!=='function')return value;
      if(!bound.has(key)||bound.get(key).original!==value)bound.set(key,{original:value,fn:value.bind(target)});
      return bound.get(key).fn;
    },
    set(target,key,value){if(Object.hasOwn(overrides,key))return false;return Reflect.set(target,key,value,target);},
    has(target,key){return Object.hasOwn(overrides,key)||Reflect.has(target,key);}
  });
}
