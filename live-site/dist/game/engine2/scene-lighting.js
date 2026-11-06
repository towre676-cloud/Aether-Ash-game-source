/** Fixture-driven, clock-aware light. Interior pools are confined by the room's
 * real walls; there are no permanent sunlight decals or speculative desk casts. */
const T=48,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function daylightAt(minutes=600){const hour=((minutes/60)%24+24)%24,sun=clamp(Math.sin((hour-6)/12*Math.PI),0,1);return {hour,sun,night:1-sun,dx:Math.cos((hour-6)/12*Math.PI)*.6,dy:.32+sun*.24};}
export function sceneLights(scene){
 const lights=[],add=(x,y,kind,radius,power)=>{const l={x:x*T,y:y*T,kind,radius,power},near=lights.find(a=>a.kind===kind&&Math.hypot(a.x-l.x,a.y-l.y)<T*.7);if(near){near.power=Math.max(near.power,power);near.radius=Math.max(near.radius,radius);}else lights.push(l);};
 for(const o of scene.household?.furnishings||[]){const b=o.footprint;if(!b)continue;const x=b.x+b.w/2,y=b.y+b.h;if(o.furniture===18)add(x,y-.35,'window',132,.22);else if(o.furniture===3||o.furniture===4||o.specialType==='hearth'||o.specialType==='kiln')add(x,y-.35,'fire',115,.23);else if(o.furniture===20||o.specialType==='candle')add(x,y-.35,'fire',78,.15);}
 for(const o of scene.objects||[]){if(!o.xy)continue;const x=o.xy[0]+.5,y=o.xy[1]+.5;if(o.type==='camp')add(x,y-.35,'fire',105,.2);else if(o.type==='listen'||o.kakeyaStation)add(x,y-.65,'glass',80,.12);}
 return lights.slice(0,24);
}
/** Geometry is cached once per scene, not rebuilt per frame or per furnishing. */
const roomCache=new WeakMap();
export function lightingFloor(scene){
 if(roomCache.has(scene))return roomCache.get(scene);const cells=new Set(),spans=[];
 const base=scene.household?.floorBase||scene.floor||[],outline=scene.architecture?.outline;
 if(scene.household){for(let y=0;y<base.length;y++)for(let x=0;x<base[y].length;x++)if(base[y][x]==='.')cells.add(x+','+y);}
 else if(outline?.length){for(const r of outline)for(let x=r.left;x<=r.right;x++)cells.add(x+','+r.y);}
 else{for(let y=0;y<base.length;y++)for(let x=0;x<base[y].length;x++)if(base[y][x]==='.')cells.add(x+','+y);for(const b of scene.blocks||[])for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)cells.add(x+','+y);}
 for(const b of scene.household?.partitions||[])for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)cells.delete(x+','+y);
 const rows=new Map();for(const key of cells){const [x,y]=key.split(',').map(Number);if(!rows.has(y))rows.set(y,[]);rows.get(y).push(x);}for(const[y,xs]of rows){xs.sort((a,b)=>a-b);let left=xs[0],right=left;for(const x of xs.slice(1)){if(x===right+1)right=x;else{spans.push({x:left*T,y:y*T,w:(right-left+1)*T,h:T});left=right=x;}}spans.push({x:left*T,y:y*T,w:(right-left+1)*T,h:T});}
 const result={cells,spans,visibility:new WeakMap()};roomCache.set(scene,result);return result;
}
export function lightVisibility(scene,l){
 const floor=lightingFloor(scene);if(floor.visibility.has(l))return floor.visibility.get(l);const open=(x,y)=>floor.cells.has(Math.floor(x/T)+','+Math.floor(y/T));let sx=l.x,sy=l.y;
 if(!open(sx,sy)){let best=null;for(const key of floor.cells){const[x,y]=key.split(',').map(Number),px=(x+.5)*T,py=(y+.5)*T,d=Math.hypot(px-sx,py-sy);if(d<T*1.5&&(!best||d<best.d))best={x:px,y:py,d};}if(best){sx=best.x;sy=best.y;}}
 const points=[];if(open(sx,sy))for(let i=0;i<72;i++){const a=i*Math.PI/36,dx=Math.cos(a),dy=Math.sin(a);let x=sx,y=sy;for(let d=6;d<=l.radius;d+=6){const nx=sx+dx*d,ny=sy+dy*d;if(!open(nx,ny))break;x=nx;y=ny;}points.push([x,y]);}
 floor.visibility.set(l,points);return points;
}
export function fixturePower(l,day,{indoor=false,time=0,steady=false}={}){const pulse=l.kind==='fire'&&!steady?1+Math.sin(time*3.1+l.x)*.018+Math.sin(time*7.7+l.y)*.01:1;return l.power*(l.kind==='window'?day.sun:indoor?1:.35+day.night*.65)*pulse;}
const pools=new Map();
function lightPool(kind){if(pools.has(kind))return pools.get(kind);const a=document.createElement('canvas');a.width=a.height=256;const c=a.getContext('2d'),g=c.createRadialGradient(128,128,1,128,128,128),rgb=kind==='glass'?'145,203,209':kind==='window'?'255,233,199':'255,191,125';g.addColorStop(0,`rgba(${rgb},.8)`);g.addColorStop(.15,`rgba(${rgb},.45)`);g.addColorStop(.55,`rgba(${rgb},.1)`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(0,0,256,256);pools.set(kind,a);return a;}
function clipFloor(c,scene){const spans=lightingFloor(scene).spans;if(!spans.length)return false;c.beginPath();for(const b of spans)c.rect(b.x,b.y,b.w+.25,b.h+.25);c.clip();return true;}
export function paintSceneLighting(c,rig,{scene,state,time,indoor,view,steady=false}){
 const day=daylightAt(state.townLife?.minutes??600),{x0,y0,x1,y1}=view;c.save();
 // Readable ambient floor value: night is cooler, never a black screen.
 if(indoor)clipFloor(c,scene);c.globalCompositeOperation='source-over';c.fillStyle=indoor?`rgba(20,27,34,${.025+day.night*.05})`:`rgba(17,32,57,${.025+day.night*.19})`;c.fillRect(x0*T,y0*T,(x1-x0)*T,(y1-y0)*T);
 c.globalCompositeOperation='screen';let painted=0;
 for(const l of rig){if(l.x+l.radius<x0*T||l.x-l.radius>x1*T||l.y+l.radius<y0*T||l.y-l.radius>y1*T)continue;const power=fixturePower(l,day,{time,indoor,steady});if(power<.001)continue;if(++painted>14)break;c.save();if(indoor){const polygon=lightVisibility(scene,l);if(!polygon.length){c.restore();continue;}c.beginPath();polygon.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();}c.globalAlpha=power;c.drawImage(lightPool(l.kind),l.x-l.radius,l.y-l.radius*.6,l.radius*2,l.radius*1.2);c.restore();}
 c.restore();
}
