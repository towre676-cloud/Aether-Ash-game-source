import {paintFurnitureContact} from './contact-shadow.js?v=5.1.0';
import {ROOM_LIFE_BOUNDS} from './room-life-bounds.js';
import {REALISM_ATLAS} from './room-realism.js';
const T=48;

export function drawOccupiedFixture(renderer,o,state,near){const index=REALISM_ATLAS[o.visual],image=renderer.assets.roomLife;if(index===undefined||!image)return false;const src=ROOM_LIFE_BOUNDS[index],b=o.footprint,c=renderer.ctx,w=b.w*T,h=b.h*T+38,scale=Math.min(w/src.w,h/src.h),dw=src.w*scale,dh=src.h*scale,x=(b.x+b.w/2)*T,y=(b.y+b.h)*T;
 paintFurnitureContact(c,b,{opacity:.14});c.save();c.drawImage(image,src.x,src.y,src.w,src.h,x-dw/2,y-dh,dw,dh);if(state.household?.openFurniture?.includes(o.householdId)){c.fillStyle='#ffe3ab99';c.fillRect(x-w*.2,y-12,w*.4,3);}if(near){c.strokeStyle='#e5d0a277';c.lineWidth=1.5;c.beginPath();c.ellipse(x,y+2,w*.4,8,0,0,Math.PI*2);c.stroke();renderer.label(o.label,x,y-dh-12,true);}c.restore();return true;}
/** Baked, walkable surfaces define work zones and circulation. Nothing here blocks or hides a route. */
export function paintOccupiedFloor(c,scene){const h=scene.household,k=h.kind,fixtures=h.furnishings.filter(o=>o.visual),industrial=['workshop','cistern','carpenter','pottery','instrumentworks','optics'].includes(k);
 for(const o of fixtures){const b=o.footprint,x=(b.x-.55)*T,y=(b.y-.4)*T,w=(b.w+1.1)*T,hh=(b.h+1.25)*T;c.save();const g=c.createRadialGradient(x+w*.5,y+hh*.65,8,x+w*.5,y+hh*.65,Math.max(w,hh)*.65);g.addColorStop(0,industrial?'#6a594b16':'#7b644916');g.addColorStop(1,'#503e2300');c.fillStyle=g;c.fillRect(x-30,y-30,w+60,hh+60);if(industrial){for(let i=0;i<5;i++){c.strokeStyle='#302b2333';c.lineWidth=1;c.beginPath();c.moveTo(x+13+i*23,y+hh-10);c.lineTo(x+23+i*23,y+hh-8);c.stroke();}}c.restore();}
 if(industrial){for(const o of fixtures.filter(o=>['pumping','joinery','ceramics'].includes(o.visual))){const b=o.footprint,x=(b.x+b.w+.3)*T,y=(b.y+.5)*T;c.fillStyle='#252b2b77';c.fillRect(x,y,9,Math.max(24,b.h*T));c.strokeStyle='#8a927a66';c.lineWidth=1;for(let yy=y+4;yy<y+b.h*T;yy+=7){c.beginPath();c.moveTo(x+1,yy);c.lineTo(x+8,yy);c.stroke();}}}
 // A runner follows the actual entry approach rather than the centre of an irregular bounding box.
 for(const d of scene.doors){if(!d.xy||d.architecturalKind==='stairs')continue;const [x,y]=d.xy,vertical=['north','south'].includes(d.wallSide),toward=d.wallSide==='north'?1:d.wallSide==='south'?-1:d.wallSide==='west'?1:-1;c.save();c.fillStyle=industrial?'#b5a58118':'#8b65552b';c.strokeStyle='#c4ad7f33';c.lineWidth=2;if(vertical){const yy=y+(toward<0?-2:0);c.fillRect((x-.45)*T,yy*T,1.9*T,3*T);c.strokeRect((x-.45)*T+5,yy*T+5,1.9*T-10,3*T-10);}else{const xx=x+(toward<0?-2:0);c.fillRect(xx*T,(y-.4)*T,3*T,1.8*T);c.strokeRect(xx*T+5,(y-.4)*T+5,3*T-10,1.8*T-10);}c.restore();}
}
