/** Soft ambient contact only. Directional cast shadows need a real light/occluder;
 * a floating offset rectangle is never a substitute for desk legs touching floor. */
const T=48;
export function furnitureContact(b,{opacity=.16,span=1}={}){
 if(!b||![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<=0||b.h<=0)return null;
 return {x:(b.x+b.w/2)*T,y:(b.y+b.h)*T-2,rx:Math.max(4,b.w*T*.43*span),ry:Math.min(6,Math.max(2.5,b.h*T*.055)),opacity:Math.max(0,Math.min(.22,opacity))};
}
export function paintContactShadow(c,p){if(!p)return;c.save();c.globalCompositeOperation='source-over';c.translate(p.x,p.y);c.scale(p.rx,p.ry);const g=c.createRadialGradient(0,0,.03,0,0,1);g.addColorStop(0,'rgba(7,16,20,'+p.opacity+')');g.addColorStop(.4,'rgba(7,16,20,'+(p.opacity*.58)+')');g.addColorStop(1,'rgba(7,16,20,0)');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();}
export function paintFurnitureContact(c,b,options){paintContactShadow(c,furnitureContact(b,options));}
