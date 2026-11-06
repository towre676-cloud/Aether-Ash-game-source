/** Short-lived material contact, recorded in world space so it never follows the camera. */
const PHASE_EPSILON=1e-9;
export function contactMaterial(scene,indoor=false){if(indoor)return null;const style=scene.biome?.style||'';if(/ice|aurora/.test(style))return 'snow';if(/mangrove|coral|salt/.test(style)||/river/.test(scene.key))return 'wet';if(/sand|cactus|lava|storm/.test(style))return 'dust';return 'grass';}
export class GroundContacts{
 constructor(){this.marks=[];this.actors=new Map();}
 reset(){this.marks=[];this.actors.clear();}
 record(id,pose,scene,indoor){const old=this.actors.get(id);this.actors.set(id,pose);const material=contactMaterial(scene,indoor);if(!material||!pose.moving||!old)return;
  const dx=pose.x-old.x,dy=pose.y-old.y,d=Math.hypot(dx,dy);if(!Number.isFinite(d)||d>.8||d<.00001)return;
  if(!Number.isFinite(old.phase)||!Number.isFinite(pose.phase)||old.phase<0||old.phase>=4||pose.phase<0||pose.phase>=4)return;
  // Older callers can describe only a short forward interval. The explicit
  // distance-clock advance preserves crossings even when the final pose skips
  // a planted frame, and lets us reject a reset or mismatched pose history.
  const legacy=pose.strideAdvance===undefined,advance=legacy?(pose.phase-old.phase+4)%4:pose.strideAdvance;
  if(!Number.isFinite(advance)||advance<=0||advance>(legacy?2:4))return;
  const expected=(old.phase+advance)%4,gap=Math.abs(expected-pose.phase);
  if(!legacy&&Math.min(gap,4-gap)>PHASE_EPSILON)return;
  const end=old.phase+advance;
  for(let phase=(Math.floor((old.phase+PHASE_EPSILON)/2)+1)*2;phase<=end+PHASE_EPSILON;phase+=2){
   const progress=Math.max(0,Math.min(1,(phase-old.phase)/advance)),side=phase%4===0?-1:1;
   this.marks.push({x:old.x+dx*progress-dy/d*.075*side,y:old.y+dy*progress+dx/d*.075*side,dx:dx/d,dy:dy/d,t:0,material,life:material==='snow'?4.5:material==='wet'?1.25:pose.gait==='run'?.65:.4,running:pose.gait==='run'});
   if(this.marks.length>54)this.marks.shift();
  }
 }
 draw(c,dt){for(let i=this.marks.length-1;i>=0;i--){const m=this.marks[i];m.t+=dt;if(m.t>=m.life){this.marks.splice(i,1);continue;}const p=m.t/m.life,x=m.x*48,y=m.y*48;c.save();c.translate(x,y);c.globalAlpha=(1-p)*(m.material==='snow'?.22:.16);c.fillStyle=m.material==='snow'?'#4e6e7a':m.material==='wet'?'#b3d2cd':m.material==='dust'?'#c3ad83':'#283d26';if(m.material==='wet'){c.strokeStyle='#a7d0ca';c.lineWidth=.7;c.beginPath();c.ellipse(0,1,3+p*12,1+p*4,0,0,Math.PI*2);c.stroke();}else if(m.material==='dust'&&m.running){for(let j=0;j<3;j++){c.beginPath();c.ellipse(-m.dx*p*9+(j-1)*3,-m.dy*p*9-p*3,1.5+p*3,1+p*2,0,0,Math.PI*2);c.fill();}}else{c.rotate(Math.atan2(m.dy,m.dx));c.beginPath();c.ellipse(0,0,m.material==='snow'?3.5:4,1.5,0,0,Math.PI*2);c.fill();}c.restore();}}
}
