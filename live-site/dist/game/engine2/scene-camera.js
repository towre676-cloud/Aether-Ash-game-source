import {patternGeometry} from './boss-patterns.js?v=5.16.0';
import {personFor} from './presentation.js?v=5.41';
import {damp} from './reconciled-content/vista/vista-core.mjs?v=5.25.0';
import {cameraZoomValue} from './camera-zoom.js?v=5.27.0';

/** Compose the playable view inside the measured HUD and command bands. */
const TILE=48,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const smooth=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
function bounds(){return {left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};}
function include(b,x,y,padX=0,padTop=0,padBottom=padTop){if(!Number.isFinite(x+y))return;b.left=Math.min(b.left,x-padX);b.right=Math.max(b.right,x+padX);b.top=Math.min(b.top,y-padTop);b.bottom=Math.max(b.bottom,y+padBottom);}
function frame(b,width,height,maxZoom){const zoom=Math.min(maxZoom,Math.max(1,width-36)/Math.max(1,b.right-b.left),Math.max(1,height-24)/Math.max(1,b.bottom-b.top));return {zoom,x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};}
function includeActor(b,a){if(!point(a))return;include(b,a.x*TILE,a.y*TILE,a.boss?72:38,a.boss?148:92,28);}
function includePrimitive(b,g){
 if(g.kind==='rect'){include(b,g.x*TILE,g.y*TILE);include(b,(g.x+g.w)*TILE,(g.y+g.h)*TILE);}
 else if(g.kind==='lane'){include(b,g.x*TILE,g.y*TILE,g.width*TILE,g.width*TILE);include(b,g.endX*TILE,g.endY*TILE,g.width*TILE,g.width*TILE);}
 else if(g.kind==='sector'){
  // Only the announced fan, rather than a full circle around its caster.
  include(b,g.x*TILE,g.y*TILE);const angles=[g.heading-g.angle,g.heading+g.angle];
  for(let a=0;a<Math.PI*2;a+=Math.PI/2)if(Math.abs(Math.atan2(Math.sin(a-g.heading),Math.cos(a-g.heading)))<=g.angle)angles.push(a);
  for(const a of angles)include(b,(g.x+Math.cos(a)*g.radius)*TILE,(g.y+Math.sin(a)*g.radius)*TILE);
 }else include(b,g.x*TILE,g.y*TILE,g.radius*TILE,g.radius*TILE);
}
function battleFrame(battle,state,width,height,layout,steady){
 if(!battle||typeof battle!=='object')return {zoom:layout.zoom*.9,x:state.x*TILE,y:state.y*TILE};
 const b=bounds(),actors=[...(battle.heroes||[]),...(battle.enemies||[])].filter(a=>a.hp>0&&!a.withdrawn);
 for(const a of actors)includeActor(b,a);
 if(point(battle.objective?.asset)&&battle.objective.asset.hp>0)includeActor(b,battle.objective.asset);
 for(const e of battle.enemies||[]){
  if(e.hp<=0||e.withdrawn)continue;
  if(steady&&e.boss)include(b,e.x*TILE,e.y*TILE,6.25*TILE,6.25*TILE);
  for(const g of patternGeometry(e.intent||{})||[])includePrimitive(b,g);
 }
 if(!Number.isFinite(b.left))includeActor(b,state);
 // A little room beyond each warning edge shows the available escape space.
 b.left-=18;b.right+=18;b.top-=12;b.bottom+=12;
 return frame(b,width,height,height<180?.98:width<600?1.2:1.48);
}
/** A named speaker must really be in this scene or in the travelling party. */
export function conversationFocus(world,speaker,followers=[]){
 if(!world?.state||typeof speaker!=='string')return null;
 const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(),name=normalize(speaker);
 if(!name)return null;
 const state=world.state,near=p=>point(p)&&Math.hypot(p.x-state.x,p.y-state.y)<7;
 const people=(world.objects?.()||[]).filter(o=>o.xy&&(normalize(o.name)===name||normalize(personFor(o)?.name)===name)).map(o=>({x:o.xy[0]+.5,y:o.xy[1]+.5})).filter(near).sort((a,b)=>Math.hypot(a.x-state.x,a.y-state.y)-Math.hypot(b.x-state.x,b.y-state.y));
 if(people.length)return people[0];
 const hero=(state.heroes||[]).find(h=>state.party?.includes(h.id)&&normalize(h.name)===name);
 if(!hero)return null;
 const actor=hero.id===state.party[0]?state:followers.find(f=>f.id===hero.id);
 return near(actor)?{x:actor.x,y:actor.y}:null;
}
export function sceneCamera(scene,state,layout,width,height,{battle=false,focus=null,landmarks=[],steady=false,manualZoom=null,battleFocus=null}={}){
 const usableH=Math.max(1,layout.visibleHeight??height-layout.top-layout.bottom),short=height<500,narrow=width<600;
 const manual=cameraZoomValue(manualZoom);
 // A chosen lens stays exact even when a guardian warning or dialog changes
 // the automatic composition. Keep the controlled traveller in view.
 if(battle&&manual!==null){const actor=point(battleFocus)&&battleFocus.hp>0&&(battle.heroes||[]).includes(battleFocus)?battleFocus:(battle.heroes||[]).find(h=>h.hp>0&&point(h))||state;return {zoom:manual,x:actor.x*TILE,y:actor.y*TILE-36};}
 if(battle)return battleFrame(battle,state,width,usableH,layout,steady);
 let zoom=manual??Math.max(layout.zoom,short?1.02:narrow?1.16:width<1000?1.34:1.44),x=state.x*TILE,y=state.y*TILE;
 const box=scene.household?.box;
 if(box){
  const left=box.left*TILE,right=(box.right+1)*TILE,top=box.top*TILE-88,bottom=(box.bottom+1)*TILE;
  const roomW=right-left,roomH=bottom-top,cx=(left+right)/2,cy=(top+bottom)/2;
  const fit=Math.min(Math.max(120,width-72)/(roomW+32),Math.max(100,usableH-24)/(roomH+28));
  // Large rooms follow the actor; small rooms retain the room's composition.
  const readable=short?1.04:narrow?1.22:width<1000?1.48:1.68;
  if(manual===null)zoom=fit>=readable*.97?Math.min(1.9,Math.max(readable,fit)):readable;
  const halfW=width/zoom/2,halfH=usableH/zoom/2,pad=20;
  x=roomW+pad*2<=width/zoom?cx:clamp(x,left+halfW-pad,right-halfW+pad);
  y=roomH+pad*2<=usableH/zoom?cy:clamp(y,top+halfH-pad,bottom-halfH+pad);
 }
 if(manual!==null)return {zoom,x,y};
 if(state.mode==='dialog'&&point(focus)&&Math.hypot(focus.x-state.x,focus.y-state.y)<7){
  const b=bounds();includeActor(b,state);includeActor(b,focus);
  const close=short?1.12:narrow?1.4:1.86;
  return frame(b,width,usableH,steady?Math.min(zoom,close):close);
 }
 if(steady)return {zoom,x,y};
 if(!box&&usableH>=240){
  // The lens moves toward an authored landmark only when the player is close.
  // Continuous proximity weighting avoids a zoom jump at a trigger boundary.
  const authored=scene.authoredOpening?.landmark,sites=[...landmarks];
  if(authored?.xy)sites.push({x:authored.xy[0],y:authored.xy[1]});
  const landmark=sites.filter(point).map(p=>({...p,d:Math.hypot(p.x-state.x,p.y-state.y)})).filter(p=>p.d<4.6).sort((a,b)=>a.d-b.d)[0];
  if(landmark){const weight=smooth((4.6-landmark.d)/3.5);zoom+=weight*(narrow?.08:.14);x+=(landmark.x*TILE-x)*weight*.16;y+=((landmark.y-.65)*TILE-y)*weight*.16;}
 }
 return {zoom,x,y};
}

/** Fast outward safety framing; a calmer return to the closer scenic lens. */
export function cameraFollow(camera,composition,dt,{steady=false}={}){
 const time=Math.max(0,Math.min(.1,Number(dt)||0));
 const zoomRate=composition.zoom<camera.zoom?12:steady?8:2.2,positionRate=composition.zoom<camera.zoom?12:8;
 return {zoom:damp(camera.zoom,composition.zoom,zoomRate,time),x:damp(camera.x,composition.x,positionRate,time),y:damp(camera.y,composition.y,positionRate,time)};
}
