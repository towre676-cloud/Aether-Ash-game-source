/** Production Canvas presentation. Cached six-tile chunks keep thousands of
 * varied v6 plants inexpensive; the nearby chunk animates at a bounded cadence.
 * Cache quality is independent of all saved ecology and gameplay samples.
 */
const SIZE=6,T=48,MARGIN=72,MAX_CHUNKS=48;
function bake(rt,cx,cy,quality,time,player,previous){
 const resolution=quality==='low'?.65:1,size=SIZE*T+MARGIN*2,a=previous?.canvas||document.createElement('canvas'),pixels=Math.ceil(size*resolution);if(a.width!==pixels||a.height!==pixels)a.width=a.height=pixels;const c=a.getContext('2d');if(!c)return null;
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,a.width,a.height);
 c.scale(resolution,resolution);c.translate(MARGIN-cx*SIZE*T,MARGIN-cy*SIZE*T);
 const stats=rt.bridge.draw(c,{bounds:{minX:cx*SIZE,minZ:cy*SIZE,maxX:(cx+1)*SIZE,maxZ:(cy+1)*SIZE},dt:0,time,wind:.22,player:{x:player.x,z:player.y},pixelScale:13});
 return {canvas:a,x:cx*SIZE*T-MARGIN,y:cy*SIZE*T-MARGIN,size,plants:stats.plants,time,revision:rt.revision};
}
export function drawLivingAtlas(renderer,world,battle,bounds,dt){
 const rt=world?.livingAtlas?.runtime?.();if(!rt||rt.layout.indoor)return;
 const quality=renderer.compatibility?'low':'medium';
 if(rt.layout.setCanopy(renderer.treeSites||[])){rt.drawCache.clear();rt.revision++;}
 if(rt.quality!==quality){rt.bridge.setVisualSettings({quality,reducedMotion:!!renderer.comfort?.steadyLighting});rt.quality=quality;rt.drawCache.clear();}
 for(const dirty of rt.dirty)for(const [key,cached] of rt.drawCache){const [x,y]=key.split(',').map(Number),nearX=Math.max(x*SIZE,Math.min(dirty.x,(x+1)*SIZE)),nearY=Math.max(y*SIZE,Math.min(dirty.y,(y+1)*SIZE));if(Math.hypot(nearX-dirty.x,nearY-dirty.y)<dirty.radius+1)cached.stale=true;}
 rt.dirty.length=0;
 const time=renderer.comfort?.steadyLighting?0:renderer.time,player=world.state,near=[Math.floor(player.x/SIZE),Math.floor(player.y/SIZE)].join(','),list=[];
 for(let y=Math.floor(bounds.y0/SIZE);y<Math.ceil(bounds.y1/SIZE);y++)for(let x=Math.floor(bounds.x0/SIZE);x<Math.ceil(bounds.x1/SIZE);x++)list.push({x,y,key:x+','+y,d:Math.hypot((x+.5)*SIZE-player.x,(y+.5)*SIZE-player.y)});
 list.sort((a,b)=>a.d-b.d);let budget=2,bakes=0,plants=0;
 for(const p of list){let cached=rt.drawCache.get(p.key);const animate=p.key===near&&quality!=='low'&&time-(cached?.time||0)>.12;
  if((!cached||cached.stale||animate)&&budget>0){const next=bake(rt,p.x,p.y,quality,time,player,cached);if(next){cached=next;rt.drawCache.delete(p.key);rt.drawCache.set(p.key,next);budget--;bakes++;}}
  p.cached=cached;plants+=cached?.plants||0;
 }
 // Far rows first; actor silhouettes are drawn later by the host renderer.
 list.sort((a,b)=>a.y-b.y||a.x-b.x);renderer.ctx.save();renderer.ctx.globalAlpha*=.76;for(const {cached}of list)if(cached)renderer.ctx.drawImage(cached.canvas,cached.x,cached.y,cached.size,cached.size);renderer.ctx.restore();
 while(rt.drawCache.size>MAX_CHUNKS)rt.drawCache.delete(rt.drawCache.keys().next().value);
 rt.metrics={plants,chunks:rt.drawCache.size,bakes};
 if(renderer.canvas?.dataset){renderer.canvas.dataset.livingGrass='v6';renderer.canvas.dataset.livingGrassPlants=String(plants);renderer.canvas.dataset.livingAtlas='v8-campaign';}
}
/** Presentation thresholds suppress neutral terrain telemetry. The status values
 * remain authoritative and unchanged; the optional Pause disclosure shows them. */
function landscapeReadout(status){
 if(!status||!['cover','resonance','alert','abundance'].every(key=>Number.isFinite(status[key])))return null;
 const cues=[],pressure=status.alert>.55?'alert':status.abundance<.8?'recovering':'settled';
 if(!status.indoor&&status.cover>=.08)cues.push('Foliage offers cover');
 if(status.resonance>.03)cues.push('Local resonance is active');
 if(pressure!=='settled')cues.push('Wildlife is '+pressure);
 const percent=value=>Math.round(value*100)+'%',habitat=typeof status.habitat==='string'?status.habitat.replace(/_/g,' ').slice(0,80):'unspecified';
 return {cue:cues.join(' · '),detail:[
  'Foliage concealment: '+percent(status.cover)+'. Local resonance: '+percent(status.resonance)+'.',
  'Wildlife: '+pressure+'. Alert: '+percent(status.alert)+'. Population pressure index: '+percent(status.abundance)+'.',
  'Vegetation habitat: '+(status.indoor?'interior':habitat)+'.',
  'Cover reduces patrol detection; footsteps flatten it. The Hydrophone and counterphase controls change local resonance.'
 ].join('\n')};
}
export function mountLivingAtlasReadout({getWorld,parent,inspectionParent=null}={}){
 if(typeof document==='undefined'||!parent||typeof getWorld!=='function')return {update(){},destroy(){}};
 const node=document.createElement('div');node.id='living-land-readout';node.className='living-land-readout';node.style.cssText='font:11px/1.4 system-ui,sans-serif;color:#bdd4bb;padding:3px 10px;pointer-events:none;white-space:normal;background:linear-gradient(90deg,#101e1ac9,#101e1a00);max-width:100%;';parent.append(node);
 node.title='Cover can reduce patrol detection. Inspect Local landscape in Pause for the values and use the Hydrophone controls to alter resonance.';
 let inspection=null,detail=null;
 if(inspectionParent){
  inspection=document.createElement('details');inspection.id='living-land-inspection';inspection.className='living-land-inspection';inspection.open=false;
  inspection.style.cssText='grid-column:1/-1;padding:8px 10px;border:1px solid #8da9a744;border-radius:4px;color:#c6d5cf;font:12px/1.5 system-ui,sans-serif;';
  const summary=document.createElement('summary');summary.textContent='Local landscape';summary.style.cssText='cursor:pointer;min-height:36px;align-content:center;';
  // Native disclosure activation is retained, while global game shortcuts do
  // not treat Enter/Space as resume or a world interaction underneath Pause.
  for(const type of ['keydown','keyup'])summary.addEventListener(type,event=>{if(event.key==='Enter'||event.key===' ')event.stopPropagation();});
  summary.addEventListener('click',event=>event.stopPropagation());
  detail=document.createElement('p');detail.style.cssText='white-space:pre-line;margin:8px 0 0;';inspection.append(summary,detail);inspectionParent.append(inspection);
 }
 const show=(target,visible)=>{if(!target)return;const hidden=!visible;if(target.hidden!==hidden)target.hidden=hidden;const display=visible?'block':'none';if(target.style.display!==display)target.style.display=display;};
 const update=({hidden=false,inspect=false}={})=>{
  const w=getWorld(),fieldVisible=!hidden&&w?.state?.mode==='field',inspectVisible=!!inspection&&!!inspect;
  if((!fieldVisible&&!inspectVisible)||typeof w?.livingAtlas?.status!=='function'){show(node,false);show(inspection,false);return;}
  const status=w.livingAtlas.status(),view=landscapeReadout(status);
  show(node,!!view?.cue&&fieldVisible);show(inspection,!!view&&inspectVisible);
  if(!view)return;
  if(node.textContent!==view.cue)node.textContent=view.cue;
  if(detail&&detail.textContent!==view.detail)detail.textContent=view.detail;
  // Exact normalized samples remain inspectable without putting percentages
  // into the field cue or introducing another simulation owner.
  if(inspection?.dataset)for(const key of ['cover','resonance','alert','abundance']){const value=String(status[key]);if(inspection.dataset[key]!==value)inspection.dataset[key]=value;}
 };
 update({hidden:true});return {node,inspection,update,destroy(){node.remove();inspection?.remove();}};
}
