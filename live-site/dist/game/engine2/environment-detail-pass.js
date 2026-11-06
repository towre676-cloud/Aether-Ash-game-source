import {regionalGroundSpec,regionalFurnitureSpec,regionalPropOcclusion,drawRegionalProp} from './environment-art-v17.js?v=5.22.0';
import {outdoorLayout} from './outdoor-layout.js?v=5.22.0';
import {paintFurnitureContact} from './contact-shadow.js?v=5.1.0';
const T=48;
/** A shared bank composition owns the few ground accents beside each grove. */
export function regionalGroundSites(scene){return outdoorLayout(scene).groundSites;}
/** Called inside the existing clipped floor pass, before objects and actors. */
export function paintRegionalGround(renderer,plan,view){
 if(!plan?.enabled||plan.indoor)return;const c=renderer.ctx;let count=0;
 for(const site of regionalGroundSites(plan.scene)){
  if(site.x<view.x0-2||site.x>view.x1+2||site.y<view.y0-1||site.y>view.y1+1)continue;
  if(++count>(renderer.compatibility?24:48))break;
  const spec=regionalGroundSpec(plan.scene,site.seed,plan);if(!spec)continue;
  drawRegionalProp(renderer,spec,site.x*T,site.y*T,{alpha:.36,flip:!!(site.seed&1)});
 }
}
/** Richer artwork replaces only the same functional furniture footprint. */
export function drawRegionalFurniture(renderer,object,state,near){
 const spec=regionalFurnitureSpec(renderer.currentScene,object);if(!spec)return false;
 const b=object.footprint,x=(b.x+b.w/2)*T,y=(b.y+b.h)*T,actors=[renderer.lastWorld?.state,...(renderer.followers||[])].filter(Boolean),alpha=regionalPropOcclusion({x:x/T,y:y/T,scale:1},spec,actors),c=renderer.ctx;
 if(!renderer.assets?.[spec.asset]?.width)return false;
 c.save();paintFurnitureContact(c,b,{opacity:.12});
 const drew=drawRegionalProp(renderer,spec,x,y,{alpha});c.restore();if(!drew)return false;
 if(state.household?.openFurniture?.includes(object.householdId)){c.save();c.fillStyle='#ffe7ad88';c.fillRect(x-b.w*T*.3,y-12,b.w*T*.6,4);c.restore();}
 if(near){c.save();c.strokeStyle='#e4ce9380';c.lineWidth=1.5;c.beginPath();c.ellipse(x,y+2,Math.max(18,b.w*T*.42),8,0,0,7);c.stroke();c.restore();renderer.label(object.label+(state.household?.examined?.includes(object.householdId)?' · ✓':''),x,y-spec.height-8,true);}
 return true;
}

