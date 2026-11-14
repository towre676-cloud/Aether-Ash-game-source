/**
 * An in-world, player-controlled survey map: not a quest autopilot.
 * The portrait/landscape dialog is visible from the field HUD, and the active
 * floor map, confirmed landmarks and fieldwork evidence all come from World.
 * The renderer never alters floor geometry, save state, or companion position.
 */
import {spatialEcologyRecord,spatialEcologySummary,spatialEcologySites} from './spatial-ecology.mjs?v=1';
const text=(s,max=160)=>String(s??'').slice(0,max);
const countMask=mask=>Array.from({length:8},(_,i)=>!!(mask&(1<<i))).filter(Boolean).length;
export function spatialRegionMapModel(world){
 const scene=world?.scene,state=world?.state,meta=scene?.spatialExpansion;
 if(meta?.version!==1||!state)return null;
 const record=spatialEcologyRecord(world),mask=record?.mask||0,sites=spatialEcologySites(scene),
   summary=spatialEcologySummary(world),byIndex=new Map(sites.map(o=>[o.spatialIndex,o]));
 const points=(meta.landmarks||[]).map((p,i)=>({
  index:i,xy:p.xy.slice(),known:!!(mask&(1<<i)),label:mask&(1<<i)?p.name:'Uncharted site',
  role:byIndex.get(i)?.spatialRole||'landmark',site:byIndex.get(i)||null,
  next:byIndex.get(i)?.spatialStage===summary.stage&&summary.stage<4,
  complete:byIndex.get(i)?.spatialStage<summary.stage,
  detail:mask&(1<<i)?byIndex.get(i)?.description||'A surveyed passage and its return paths.':'Walk near this site to reveal its field notes.'
 }));
 return {scene:scene.location,title:scene.title||scene.key.replaceAll('_',' '),
  biome:scene.biome?.name||meta.archetype,width:scene.width,height:scene.height,
  floor:scene.floor,player:{x:state.x,y:state.y},points,mask,summary,
  known:countMask(mask),total:points.length,stage:summary?.stage||0};
}
const el=(tag,cls,textValue)=>{
 const node=document.createElement(tag);if(cls)node.className=cls;
 if(textValue!==undefined)node.textContent=textValue;return node;
};
function draw(map,model,chosen){
 const ctx=map.getContext('2d');if(!ctx)return;
 const width=map.width,height=map.height;ctx.clearRect(0,0,width,height);
 ctx.fillStyle='#162629';ctx.fillRect(0,0,width,height);
 const margin=23,scale=Math.min((width-margin*2)/model.width,(height-margin*2)/model.height),
   x0=(width-model.width*scale)/2,y0=(height-model.height*scale)/2;
 ctx.fillStyle='#b7a77c';ctx.fillRect(x0-7,y0-7,model.width*scale+14,model.height*scale+14);
 ctx.fillStyle='#344540';ctx.fillRect(x0,y0,model.width*scale,model.height*scale);
 for(let y=0;y<model.height;y++){
  const row=model.floor[y];let x=0;
  while(x<model.width){
   const open=row[x]==='.';let end=x+1;while(end<model.width&&(row[end]==='.')===open)end++;
   if(open){ctx.fillStyle='#b5a786';ctx.fillRect(x0+x*scale,y0+y*scale,Math.max(1,(end-x)*scale),Math.max(1,scale));}
   x=end;
  }
 }
 // Route rings show shape and traversal possibilities, not an auto-walk command.
 for(const point of model.points){
  const x=x0+(point.xy[0]+.5)*scale,y=y0+(point.xy[1]+.5)*scale;
  ctx.beginPath();ctx.arc(x,y,point.index===chosen?8:6,0,Math.PI*2);
  ctx.fillStyle=point.next?'#78afab':point.known?'#d3b878':'#536568';ctx.fill();
  ctx.lineWidth=point.index===chosen?2:1;ctx.strokeStyle=point.index===chosen?'#fff1ba':'#172a2b';ctx.stroke();
  ctx.fillStyle=point.known?'#1d2b28':'#f1e0b2';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(point.known?String(point.index+1):'?',x,y+.5);
 }
 if(Number.isFinite(chosen)&&model.points[chosen]){
  const point=model.points[chosen],sx=x0+(point.xy[0]+.5)*scale,sy=y0+(point.xy[1]+.5)*scale;
  ctx.beginPath();ctx.setLineDash([5,5]);ctx.lineWidth=2;ctx.strokeStyle='#bce6da';
  ctx.moveTo(x0+model.player.x*scale,y0+model.player.y*scale);ctx.lineTo(sx,sy);ctx.stroke();ctx.setLineDash([]);
 }
 ctx.beginPath();ctx.arc(x0+model.player.x*scale,y0+model.player.y*scale,5,0,Math.PI*2);
 ctx.fillStyle='#fff1d4';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#1b4e4c';ctx.stroke();
 ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='bold 12px system-ui';ctx.fillStyle='#f5e2b4';
 ctx.fillText('N',width-21,18);
}
/** The map is a normal dialog and is intentionally absent on nonexpanded
 * scenes. It never moves the party or chooses quest/puzzle actions. */
export function mountSpatialRegionMap(game,{getWorld=()=>null,canOpen=()=>true}={}){
 if(!game||typeof document==='undefined')return null;
 const header=game.querySelector('#hud header'),menu=header?.querySelector('#menu-button');
 if(!header||!menu)throw Error('Region map requires the canonical game HUD');
 const button=el('button','spatial-map-toggle','Map');button.id='spatial-map-button';
 button.type='button';button.setAttribute('aria-label','Open region exploration map');
 menu.before(button);
 const overlay=el('section','spatial-region-veil');overlay.id='spatial-region-map';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','Region exploration map');overlay.hidden=true;overlay.tabIndex=-1;
 const panel=el('div','spatial-region-panel'),head=el('div','spatial-region-header'),
   title=el('h2','', 'Region atlas'),description=el('p','spatial-region-description'),
   close=el('button','spatial-region-close','Return to journey');
 close.type='button';head.append(title,close);
 const contents=el('div','spatial-region-content'),map=el('canvas','spatial-region-canvas');
 map.width=600;map.height=560;map.setAttribute('aria-label','Overview of connected region floor and surveyed landmarks');
 const sidebar=el('section','spatial-region-sidebar'),progress=el('p','spatial-region-progress'),
   list=el('div','spatial-region-list'),details=el('p','spatial-region-selection'),
   note=el('p','spatial-region-footer','Routes are yours to choose. Selecting a landmark marks the map only; it never moves your party or triggers a battle.');
 sidebar.append(progress,list,details,note);contents.append(map,sidebar);
 panel.append(head,description,contents);overlay.append(panel);game.append(overlay);
 let opened=false,selected=null,previousKey='',returnFocus=null;
 function closeMap(){
  if(!opened)return;
  opened=false;overlay.hidden=true;previousKey='';
  if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
 }
 function render(){
  if(!opened)return;
  const model=spatialRegionMapModel(getWorld());if(!model){closeMap();return;}
  if(selected===null||!model.points[selected])selected=model.points.find(p=>p.next)?.index??0;
  const key=JSON.stringify([model.scene,model.mask,model.stage,model.summary?.fauna,
    Math.floor(model.player.x),Math.floor(model.player.y),selected]);
  if(key===previousKey)return;previousKey=key;
  title.textContent=model.title;description.textContent='SURVEY MAP · '+text(model.biome,80)+
   ' · '+model.known+'/'+model.total+' landmarks recorded';
  progress.textContent=model.summary?.stage===4
   ?'Region fieldwork complete · '+(model.summary.choice==='protect'?'Habitat protected':'Loose salvage recovered')
   :'Regional fieldwork '+model.summary.stage+'/4 · '+model.summary.next;
  list.replaceChildren();
  for(const p of model.points){
   const b=el('button','spatial-region-point',(p.known?String(p.index+1)+' · '+p.label:'? · Uncharted passage')+(p.next?' · NEXT':''));
   b.type='button';b.setAttribute('aria-pressed',String(selected===p.index));
   b.onclick=()=>{selected=p.index;previousKey='';render();};
   list.append(b);
  }
  const chosen=model.points[selected],dist=Math.hypot(chosen.xy[0]+.5-model.player.x,chosen.xy[1]+.5-model.player.y);
  details.textContent=(chosen.known?chosen.label+' — '+chosen.detail:'Uncharted area — explore to learn its identity')+
    ' · '+Math.round(dist)+' tiles straight-line from your crew. This is not an estimated walking route.';
  draw(map,model,selected);
 }
 function openMap(){
  if(opened)return true;
  const model=spatialRegionMapModel(getWorld());if(!model||!canOpen())return false;
  returnFocus=document.activeElement;opened=true;overlay.hidden=false;selected=model.points.find(p=>p.next)?.index??0;
  previousKey='';render();close.focus();return true;
 }
 button.onclick=()=>{if(opened)closeMap();else openMap();};
 close.onclick=closeMap;
 overlay.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMap();return;}
  if(e.key==='Tab'){
   const controls=[close,...list.querySelectorAll('button')],index=controls.indexOf(document.activeElement);
   if(e.shiftKey&&index<=0){e.preventDefault();controls.at(-1).focus();}
   else if(!e.shiftKey&&index===controls.length-1){e.preventDefault();controls[0].focus();}
  }
 });
 overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)closeMap();});
 function refresh(){
  const available=!!spatialRegionMapModel(getWorld())&&!!canOpen();
  button.hidden=!available;
  if(!available&&opened)closeMap();
  if(opened)render();
 }
 refresh();
 return{get open(){return opened;},openMap,close:closeMap,refresh,destroy(){closeMap();button.remove();overlay.remove();}};
}
