import {outdoorLayout} from './outdoor-layout.js?v=5.22.0';
import {canopyVariationGeometry,drawCanopyVariation} from './environment-canopies-v19.js?v=5.18.1';
import {environmentCanopyGeometry,drawEnvironmentCanopy} from './environment-canopies-v17.js?v=5.18.0';
/** Cached painted silhouettes, registered at the roots. No collision or random state changes. */
const cache=new Map();let groundShade;
function treeShade(){if(groundShade)return groundShade;const a=document.createElement('canvas');a.width=220;a.height=76;const c=a.getContext('2d');c.scale(1,.32);const g=c.createRadialGradient(110,110,6,110,110,105);g.addColorStop(0,'#15222162');g.addColorStop(.48,'#15222135');g.addColorStop(1,'#15222100');c.fillStyle=g;c.fillRect(0,0,220,235);return groundShade=a;}
function random(seed){let n=(seed>>>0)||1;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function treeProfile(seed,style='woodland'){
 const r=random(seed),pine=/highland|ice|aurora/.test(style),willow=/mangrove|river|salt/.test(style);
 return {seed:seed>>>0,style,pine,willow,height:pine?184+r()*42:willow?138+r()*38:140+r()*54,width:pine?100+r()*18:willow?162+r()*28:134+r()*42,lean:(r()-.5)*14,flowers:style==='village'&&seed%5===0};
}
function paint(profile){
 const a=document.createElement('canvas');a.width=244;a.height=274;const c=a.getContext('2d'),r=random(profile.seed),h=profile.height,w=profile.width,cx=122,base=251,top=base-h;
 c.lineCap='round';c.lineJoin='round';
 const ellipse=(x,y,rx,ry,color,angle=0)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill();};
 // A wide diffused canopy shadow, then the narrow root contact.
 const shadow=c.createRadialGradient(cx,base,1,cx,base,w*.53);shadow.addColorStop(0,'#15262238');shadow.addColorStop(1,'#15262200');c.save();c.translate(0,base*.72);c.scale(1,.28);c.fillStyle=shadow;c.fillRect(cx-w,base-w,w*2,w*2);c.restore();
 ellipse(cx,base+1,15,3,'#1727205c');
 const bark=c.createLinearGradient(cx-13,0,cx+11,0);bark.addColorStop(0,'#30392d');bark.addColorStop(.34,'#6e6744');bark.addColorStop(.6,'#8e8056');bark.addColorStop(1,'#4e5137');
 c.fillStyle=bark;c.beginPath();c.moveTo(cx-17,base+1);c.bezierCurveTo(cx-5,base-23,cx-10,base-h*.47,cx+profile.lean,top+h*.27);c.lineTo(cx+profile.lean+8,top+h*.27);c.bezierCurveTo(cx+7,base-h*.46,cx+5,base-20,cx+19,base+2);c.quadraticCurveTo(cx+3,base-4,cx-17,base+1);c.fill();
 for(let i=0;i<7;i++){const by=base-23-i*12,dx=(i%2?-1:1)*(20+r()*18);c.strokeStyle=i%2?'#666346':'#555b3c';c.lineWidth=4-i*.3;c.beginPath();c.moveTo(cx,by+9);c.quadraticCurveTo(cx+dx*.5,by,cx+dx,by-30);c.stroke();}
 for(let i=0;i<9;i++){c.strokeStyle=i%2?'#b4a47345':'#26332970';c.lineWidth=.7+r();c.beginPath();c.moveTo(cx-6+r()*12,base-5-r()*18);c.quadraticCurveTo(cx+profile.lean*.3,base-h*.28,cx+profile.lean*.6-3+r()*6,base-h*.5);c.stroke();}
 const clusters=[];
 if(profile.pine){for(let i=0;i<9;i++){const y=top+i*h*.079,ww=(i+1)/9*w*.5;clusters.push({x:cx+profile.lean*(1-i/9),y,rx:ww,ry:18+i*.8});}}
 else {for(let i=0;i<33;i++){const angle=r()*Math.PI*2,rad=Math.sqrt(r()),x=cx+profile.lean+Math.cos(angle)*rad*w*.37,y=top+h*.27+Math.sin(angle)*rad*h*.23;clusters.push({x,y,rx:20+r()*21,ry:16+r()*18});}}
 clusters.sort((a,b)=>a.y-b.y);
 const colors=profile.willow?['#293d32','#3c5540','#4e6646','#61754d','#7c8859']:profile.pine?['#243e37','#335449','#426456','#567764','#718771']:['#2c4231','#3f5638','#526b42','#6c7e4d','#899360'];
 for(const q of clusters){ellipse(q.x+2,q.y+5,q.rx,q.ry,colors[0]);const g=c.createLinearGradient(q.x-q.rx,q.y-q.ry,q.x+q.rx,q.y+q.ry);g.addColorStop(0,colors[3]);g.addColorStop(.4,colors[2]);g.addColorStop(1,colors[1]);ellipse(q.x,q.y,q.rx,q.ry,g);for(let i=0;i<14;i++){const an=r()*Math.PI*2,rad=Math.sqrt(r()),x=q.x+Math.cos(an)*rad*q.rx,y=q.y+Math.sin(an)*rad*q.ry;ellipse(x,y,1.7+r()*4,1+r()*1.7,colors[y<q.y?3+(i%2):1+(i%2)],r()-.5);if(profile.flowers&&i%5===0)ellipse(x,y,1.8,1.3,i%2?'#c5b6a0':'#d0cbb1');}}
 if(profile.willow){for(let i=0;i<21;i++){const x=cx-w*.46+i*w*.92/20,y=top+h*.36+(Math.sin(i*2.1)+1)*10,len=22+r()*37;c.strokeStyle=colors[1+i%3];c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-3,y+len*.6,x+2,y+len);c.stroke();for(let j=0;j<5;j++)ellipse(x-1+(j%2)*3,y+j*len/5,2,4,colors[2+j%2],.15);}}
 for(let i=0;i<5;i++){const x=cx-18+r()*36;c.strokeStyle='#626f46';c.lineWidth=1;c.beginPath();c.moveTo(x,base+2);c.quadraticCurveTo(x-4,base-5,x-3,base-9-r()*8);c.stroke();}
 a.treeProfile=profile;return a;
}
// Measured opaque bounds inside each 512px cell of natural-trees-v8.webp.
// The geometry is shared with drawing, so fades follow the delivered canopy size.
const ATLAS_BOUNDS=[[24,25,441,470],[106,25,287,470],[55,25,398,470],[86,25,354,470],[75,25,372,470],[86,25,314,470],[40,25,443,470],[62,25,344,470]];
// Placement admits seeds divisible by four. Mix higher bits before choosing an
// atlas species, otherwise every four-species village silently becomes all oak.
const speciesSeed=seed=>{let n=seed>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return(n^(n>>>16))>>>0;};
export function scenicTreeGeometry(seed,style='woodland',{atlas=true,environmentCanopies=null,environmentCanopyVariations=null}={}){
 const variation=canopyVariationGeometry(seed,style,environmentCanopyVariations);if(variation)return variation;
 const painted=environmentCanopyGeometry(seed,style,environmentCanopies);if(painted)return painted;
 if(atlas){const variants=/ice|aurora|highland/.test(style)?[4,5]:/mangrove|river|salt/.test(style)?[2,7]:style==='village'?[0,1,3,6]:[0,1,3,4,7],id=variants[speciesSeed(seed)%variants.length],size=192+((seed>>>4)%31),scale=size/470,b=ATLAS_BOUNDS[id];
  return {id,draw:{x:-256*scale,y:-495*scale,w:512*scale,h:512*scale},opaque:{left:(b[0]-256)*scale,top:(b[1]-495)*scale,right:(b[0]+b[2]-256)*scale,bottom:(b[1]+b[3]-495)*scale}};
 }
 const variant=(seed>>>0)%24,profile=treeProfile(variant*7297+431,style);
 // Procedural leaves may project beyond the nominal profile by one small cluster.
 return {variant,profile,draw:{x:-122,y:-251,w:244,h:274},opaque:{left:-Math.min(122,profile.width*.37+41),top:Math.max(-251,-profile.height-28),right:Math.min(122,profile.width*.37+41),bottom:3}};
}
/** Fade only foliage painted in front of a traveller's upper body. Root distance
 * misses actors several tiles behind a tall canopy and needlessly fades trees
 * when the actor is already painted in front of them. Positions are world tiles.
 */
export function scenicTreeAlpha(site,actors,style='woodland',options={}){
 if(!site||!Number.isFinite(site.x)||!Number.isFinite(site.y))return 1;
 const b=scenicTreeGeometry(site.seed,style,options).opaque,height=b.bottom-b.top;
 const left=site.x+b.left/48,right=site.x+b.right/48,top=site.y+b.top/48,bottom=site.y+(b.bottom-height*.22)/48;
 const cx=(left+right)/2,cy=(top+bottom)/2,rx=(right-left)/2,ry=(bottom-top)/2;
 for(const actor of actors||[]){
  if(!Number.isFinite(actor?.x)||!Number.isFinite(actor?.y)||actor.y>=site.y-.1)continue;
  const half=(actor.width||.7)/2,head=actor.y-(actor.height||1.24),feet=actor.y-.12;
  const x=Math.max(actor.x-half,Math.min(cx,actor.x+half)),y=Math.max(head,Math.min(cy,feet));
  const canopy=((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
  const trunk=actor.x+half>=site.x-.18&&actor.x-half<=site.x+.18&&feet>=bottom&&head<site.y;
  if(canopy||trunk)return .28;
 }
 return 1;
}
export function drawScenicTree(c,x,y,seed,style='woodland',alpha=1,atlas=null,environmentCanopies=null,environmentCanopyVariations=null){
 const variation=canopyVariationGeometry(seed,style,environmentCanopyVariations);
 if(variation&&drawCanopyVariation(c,environmentCanopyVariations,variation,x*48,y*48,alpha))return;
 const painted=environmentCanopyGeometry(seed,style,environmentCanopies);
 if(painted&&drawEnvironmentCanopy(c,environmentCanopies,painted,x*48,y*48,alpha))return;
 const g=scenicTreeGeometry(seed,style,{atlas:!!atlas?.width}),d=g.draw;
 if(atlas?.width){c.save();c.globalAlpha*=alpha;c.drawImage(treeShade(),x*48-72,y*48-22,166,57);c.drawImage(atlas,(g.id%4)*512,Math.floor(g.id/4)*512,512,512,x*48+d.x,y*48+d.y,d.w,d.h);c.restore();return;}
 const key=style+':'+g.variant;let a=cache.get(key);if(!a){a=paint(g.profile);cache.set(key,a);if(cache.size>120)cache.delete(cache.keys().next().value);}
 c.save();c.globalAlpha*=alpha;c.drawImage(a,x*48+d.x,y*48+d.y);c.restore();
}
/** A planted grove has spacing and clear thresholds, not one tree per hash hit. */
export function scenicTreeSites(scene){return outdoorLayout(scene).trees;}
