import {environmentMood} from './environment-depth.js';
import {isInteriorScene} from './scene-identity.js';
import {QualityGovernor,composeLandmark} from './reconciled-content/vista/vista-core.mjs?v=5.25.0';

const T=48,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const viewRect=v=>({x:v.x0*T,y:v.y0*T,w:(v.x1-v.x0)*T,h:(v.y1-v.y0)*T});

/** Presentation masks follow the delivered floor. No new objects, paths or water. */
export function buildVistaPlan(scene,craft={}){
 const indoor=isInteriorScene(scene),mood=environmentMood(scene),open=[],banks=[];
 if(indoor)return {indoor,mood,open,banks,anchors:[]};
 const floor=scene.floor||[],width=scene.width||0,height=scene.height||0;
 for(let y=0;y<height;y++){
  let left=0,walking=floor[y]?.[0]==='.';
  for(let x=1;x<=width;x++){
   const next=x<width&&floor[y]?.[x]==='.';
   if(x===width||next!==walking){(walking?open:banks).push({x:left*T,y:y*T,w:(x-left)*T,h:T});left=x;walking=next;}
  }
 }
 const walk=(x,y)=>floor[Math.floor(y)]?.[Math.floor(x)]==='.',anchors=[];
 for(const landmark of craft.landmarks||[]){
  const p=Array.isArray(landmark.focus)?{x:landmark.focus[0],y:landmark.focus[1]}:landmark;
  if(!finite(p)||!walk(p.x,p.y)||anchors.some(a=>Math.hypot(a.x-p.x,a.y-p.y)<3))continue;
  // Reconcile the prototype classifier against an existing, traversable focus.
  // Only a light pool is added; center checks never authorize new geometry.
  const spec=composeLandmark({x:p.x,z:p.y,tag:'vista',regionAt:()=>({outdoor:true,style:mood.family}),groundAt:()=>({y:0,indoor:false}),obstacleAt:(x,y)=>!walk(x,y),nearPathAt:()=>1,waterAt:()=>mood.wet?1:0});
  if(spec)anchors.push({x:p.x,y:p.y,label:landmark.label||'',kind:landmark.kind||'',radius:4.2,descriptor:spec});
  if(anchors.length===3)break;
 }
 return {indoor,mood,open,banks,anchors,width:width*T,height:height*T};
}

function clipSpans(c,spans,view){
 const r=viewRect(view);let count=0;c.beginPath();
 for(const p of spans){if(p.x+p.w<r.x||p.x>r.x+r.w||p.y+p.h<r.y||p.y>r.y+r.h)continue;c.rect(p.x,p.y,p.w+.15,p.h+.15);count++;}
 if(count)c.clip();return count>0;
}
function softEllipse(c,x,y,rx,ry,color,alpha){
 c.save();c.translate(x,y);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,rx*.12,0,0,rx);g.addColorStop(0,color+alpha);g.addColorStop(.55,color+'14');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(-rx,-rx,rx*2,rx*2);c.restore();
}

/** Optional draw budgets respond to draw cost; they never claim measured FPS. */
export class VistaScenePresentation{
 constructor(){this.governor=new QualityGovernor({initial:'medium',min:'low',max:'high',targetMs:16.7});this.plan=null;this.lastShadowCount=0;}
 scene(scene,craft){this.plan=buildVistaPlan(scene,craft);this.lastShadowCount=0;}
 quality({compatibility=false,steady=false}={}){return compatibility?'low':this.governor.tier;}
 record(drawMs,dt){return this.governor.record(drawMs,dt);}
 drawGround(c,{view,day={sun:1,dx:.3,dy:.5},trees=[],compatibility=false,steady=false}={}){
  const p=this.plan;this.lastShadowCount=0;if(!p||p.indoor||!view)return;
  const r=viewRect(view),sun=clamp(Number(day.sun)||0,0,1),tier=this.quality({compatibility,steady});
  // Cool low-contrast banks recede; the open floor keeps its own material detail.
  // Both passes are below actors, pickups, warning geometry and result labels.
  c.save();if(clipSpans(c,p.banks,view)){
   const haze=c.createLinearGradient(0,r.y,0,r.y+r.h);haze.addColorStop(0,p.mood.mist+(compatibility?'15':'28'));haze.addColorStop(.5,p.mood.mist+'08');haze.addColorStop(1,p.mood.shade+'28');c.fillStyle=haze;c.fillRect(r.x,r.y,r.w,r.h);
  }c.restore();
  c.save();if(clipSpans(c,p.open,view)){
   c.globalCompositeOperation='screen';
   const light=c.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);light.addColorStop(0,p.mood.light+(sun>.4?'15':'06'));light.addColorStop(.55,p.mood.light+(sun>.4?'08':'03'));light.addColorStop(1,p.mood.light+'00');c.fillStyle=light;c.fillRect(r.x,r.y,r.w,r.h);
   for(const a of p.anchors){if(a.x<view.x0-5||a.x>view.x1+5||a.y<view.y0-5||a.y>view.y1+5)continue;softEllipse(c,a.x*T,a.y*T,a.radius*T,a.radius*T*.6,p.mood.light,sun>.4?'25':'0c');}
   c.globalCompositeOperation='source-over';
   // Directional shade is attached only to actual admitted outdoor trees.
   const budget=tier==='high'?20:tier==='medium'?10:0;
   for(const tree of trees){
    if(this.lastShadowCount>=budget||sun<.15)break;
    if(!finite(tree)||tree.x<view.x0-4||tree.x>view.x1+4||tree.y<view.y0-3||tree.y>view.y1+3)continue;
    const dx=(Number(day.dx)||0)*72,dy=(Number(day.dy)||.4)*72;
    softEllipse(c,tree.x*T+dx,tree.y*T+dy,63,30,p.mood.shade,'32');this.lastShadowCount++;
   }
  }c.restore();
 }
 snapshot(){return {version:1,quality:this.governor.tier,indoor:!!this.plan?.indoor,authoredFoci:this.plan?.anchors.length||0,treeShadows:this.lastShadowCount};}
}

/** A small dark silhouette keeps the travelling crew separate from bright FX. */
export function applyCrewSeparation(c,{compatibility=false,quality='medium'}={}){
 if(compatibility)return;
 // Low quality retains a crisp contact edge; only the soft halo is optional.
 c.shadowColor='#03131ee0';c.shadowBlur=quality==='low'?0:2.5;c.shadowOffsetX=quality==='low'?1:0;c.shadowOffsetY=1;
}
