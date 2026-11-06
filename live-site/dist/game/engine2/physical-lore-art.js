import {PHYSICAL_LORE} from './physical-lore-content.js';
const TAU=Math.PI*2;
function line(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function oval(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill)c.fill();else c.stroke();}
/** Crisp vector objects share an in-world copper, clay and cloth material system. */
export function artifactGlyph(c,glyph,size=1,color='#d7b67c',time=0){c.save();c.scale(size,size);c.lineWidth=2;c.lineCap='round';c.lineJoin='round';c.strokeStyle=color;c.fillStyle=color;
 const metal=c.createLinearGradient(-18,-20,20,20);metal.addColorStop(0,'#fff0c2');metal.addColorStop(.35,color);metal.addColorStop(1,'#615146');
 if(glyph==='reed'||glyph==='fork'){c.strokeStyle=metal;c.lineWidth=4;line(c,[[-12,15],[-12,-15],[-5,-20],[3,-15],[3,12],[11,15]]);c.lineWidth=1;for(let i=0;i<4;i++)line(c,[[-8,-8+i*6],[-1,-8+i*6]]);if(glyph==='fork')line(c,[[9,-19],[15,-10],[15,11],[8,18]]);}
 else if(glyph==='lantern'){c.fillStyle='#302f36';c.fillRect(-13,-14,26,31);c.fillStyle=color;for(let i=0;i<3;i++){c.globalAlpha=.12+i*.13;oval(c,0,0,17-i*4,22-i*5,true);}c.globalAlpha=1;c.strokeStyle=metal;c.strokeRect(-13,-14,26,31);line(c,[[-16,18],[16,18]]);line(c,[[-9,-14],[-6,-23],[6,-23],[9,-14]]);c.fillStyle='#ffdf9a';c.beginPath();c.moveTo(0,-8);c.lineTo(6,8);c.lineTo(-6,8);c.closePath();c.fill();}
 else if(glyph==='graft'||glyph==='pebble'){c.strokeStyle='#b48e60';c.lineWidth=4;line(c,[[0,20],[0,-13],[-9,-21]]);for(let i=0;i<4;i++){c.save();c.translate(i%2?-6:6,8-i*9);c.rotate(i%2?-.6:.6);c.fillStyle=i%2?'#82bb87':color;oval(c,0,-3,8,4,true);c.restore();}if(glyph==='pebble'){c.fillStyle='#a1a3b8';oval(c,0,17,16,7,true);}}
 else if(glyph==='lens'||glyph==='shell'||glyph==='ring'){c.strokeStyle=metal;c.lineWidth=4;oval(c,0,0,16,18);c.lineWidth=1;oval(c,0,0,11,13);c.fillStyle='#78c8e255';oval(c,0,0,12,14,true);line(c,[[-5,-9],[7,-4]]);line(c,[[-10,20],[9,20]]);if(glyph==='shell')for(let i=0;i<5;i++)line(c,[[-13+i*5,8],[0,-13]]);}
 else if(glyph==='float'||glyph==='ruler'){c.fillStyle='#755341';c.fillRect(-7,-23,14,45);c.strokeStyle='#ead2a1';for(let y=-17;y<17;y+=6)line(c,[[-6,y],[y%12===1?5:0,y]]);if(glyph==='float'){c.fillStyle=color;oval(c,0,7,15,7,true);c.strokeStyle='#f3e1b1';oval(c,0,7,15,7);}}
 else if(glyph==='spool'||glyph==='spindle'){c.fillStyle=metal;oval(c,0,-13,17,6,true);oval(c,0,14,17,6,true);c.fillStyle='#7d5b43';c.fillRect(-11,-12,22,26);c.strokeStyle=color;for(let y=-8;y<13;y+=4)line(c,[[-11,y],[11,y+2]]);line(c,[[10,5],[22,8],[23,18]]);}
 else if(glyph==='vane'){c.fillStyle=metal;c.fillRect(-2,-20,4,43);c.beginPath();c.moveTo(-18,-7);c.lineTo(19,-7);c.lineTo(12,-16);c.lineTo(24,-5);c.lineTo(12,6);c.lineTo(19,-3);c.lineTo(-18,-3);c.closePath();c.fill();oval(c,0,17,10,3,true);}
 else if(glyph==='hinge'||glyph==='wedge'){c.fillStyle=metal;c.beginPath();c.moveTo(-18,14);c.lineTo(glyph==='wedge'?14:-18,-16);c.lineTo(18,14);c.closePath();c.fill();if(glyph==='hinge'){c.fillRect(-14,-15,28,28);c.fillStyle='#543f33';c.fillRect(-2,-17,4,33);for(const x of [-8,8])for(const y of [-7,8])oval(c,x,y,2,2,true);}}
 else if(glyph==='crown'){c.fillStyle=metal;c.beginPath();for(const [i,p]of [[-20,12],[-21,-13],[-8,-5],[-1,-21],[4,-2],[13,-11],[18,13]].entries())i?c.lineTo(...p):c.moveTo(...p);c.closePath();c.fill();c.strokeStyle='#66534a';line(c,[[-2,-9],[-5,3],[4,8],[0,14]]);}
 else{c.fillStyle=glyph==='brick'?'#a5654c':glyph==='clay'?'#b27d62':'#786f6c';c.beginPath();c.roundRect(-18,-15,36,30,5);c.fill();c.strokeStyle=color;c.stroke();if(glyph==='seal'){oval(c,0,0,11,11);line(c,[[-5,0],[-1,5],[7,-5]]);}else if(glyph==='clay')for(let y=-10;y<13;y+=6)line(c,[[-13,y],[12,y+2]]);else if(glyph==='tile'){c.fillStyle=color;oval(c,0,3,6,8,true);for(let i=0;i<4;i++)oval(c,-7+i*4,-7-Math.sin(i)*2,2,5,true);}else{for(let i=0;i<3;i++)line(c,[[-10+i*9,-7],[-10+i*9,7]]);}}
 c.restore();}

// Receiver silhouettes express their affordance before any label appears.
function drawReceiverHousing(c,e){c.save();c.lineWidth=2;c.strokeStyle='#b59b70';
 if(e.mode==='fit'){const wood=c.createLinearGradient(-17,0,16,0);wood.addColorStop(0,'#514131');wood.addColorStop(.4,'#947352');wood.addColorStop(1,'#44372d');c.fillStyle=wood;c.beginPath();c.moveTo(-18,5);c.lineTo(-16,-51);c.lineTo(-8,-58);c.lineTo(16,-54);c.lineTo(19,5);c.closePath();c.fill();c.strokeStyle='#b69a7166';for(let x=-11;x<15;x+=7)line(c,[[x,0],[x-2,-48]]);c.fillStyle='#292b27';c.fillRect(-10,-43,20,24);c.strokeStyle='#c0aa7b';line(c,[[-12,-19],[-12,-46],[12,-46],[12,-19]]);}
 else if(e.mode==='turn'){c.fillStyle='#69695d';oval(c,0,-5,25,10,true);c.fillStyle='#434a47';c.beginPath();c.moveTo(-22,-4);c.lineTo(-22,-39);c.quadraticCurveTo(0,-66,22,-39);c.lineTo(22,-4);c.closePath();c.fill();c.strokeStyle='#a79873';oval(c,0,-32,22,24);for(let i=0;i<8;i++){const a=i*Math.PI/4;line(c,[[Math.cos(a)*23,-32+Math.sin(a)*25],[Math.cos(a)*26,-32+Math.sin(a)*28]]);}}
 else if(e.mode==='pump'){c.fillStyle='#614b38';c.beginPath();c.roundRect(-24,-27,48,30,4);c.fill();c.fillStyle='#9b835d';c.fillRect(-19,-27,4,30);c.fillRect(15,-27,4,30);c.strokeStyle='#c1aa77';line(c,[[-24,-27],[0,-35],[24,-27]]);c.lineWidth=4;line(c,[[16,-19],[22,-44],[34,-44]]);c.strokeStyle='#493c2e';c.lineWidth=7;line(c,[[29,-44],[39,-44]]);}
 else if(e.mode==='listen'){c.fillStyle='#76604a';for(const x of [-21,17])c.fillRect(x,-55,5,58);c.fillRect(-24,-57,50,6);c.strokeStyle='#bcae8b';line(c,[[0,-54],[0,-42]]);c.fillStyle='#938f79';c.beginPath();c.moveTo(-8,-41);c.quadraticCurveTo(-8,-20,-18,-16);c.quadraticCurveTo(0,-8,18,-16);c.quadraticCurveTo(8,-20,8,-41);c.closePath();c.fill();c.strokeStyle='#d2c3a2';oval(c,0,-16,18,5);}
 else {c.fillStyle='#9c6d50';c.beginPath();c.moveTo(-23,-20);c.lineTo(-17,3);c.quadraticCurveTo(0,12,17,3);c.lineTo(23,-20);c.closePath();c.fill();c.strokeStyle='#d1a37b';oval(c,0,-20,24,8);c.fillStyle='#3d382b';oval(c,0,-20,21,6,true);c.strokeStyle='#554232';line(c,[[-8,-14],[-4,-6],[-9,3]]);}
 c.restore();}

function glow(c,color,r){const g=c.createRadialGradient(0,0,2,0,0,r);g.addColorStop(0,color+'55');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);}
export function drawPhysical(c,o,state,x,y,time,T=48){const e=PHYSICAL_LORE.find(e=>e.id===o.physicalId);if(!e)return;const p=state.physicalLore||{},placed=(p.installed||[]).includes(e.id),done=(p.completed||[]).includes(e.id),step=p.steps?.[e.id]||0,clock=p.clocks?.[e.id]||0;c.save();c.translate(x*T,y*T);c.lineJoin='round';c.lineWidth=2;
 if(o.physicalRole==='trace'){c.restore();return;}
 if(o.physicalRole==='crossing'){c.strokeStyle=e.color;c.lineWidth=5;line(c,[[-20,3],[-20,-45],[20,-45],[20,3]]);c.lineWidth=1;c.setLineDash([3,5]);line(c,[[-12,-9],[0,-20],[12,-9]]);c.setLineDash([]);glow(c,e.color,45);c.restore();return;}
 if(o.physicalRole==='source'||o.physicalRole==='dropped'){c.save();c.translate(0,-12);c.fillStyle='#30271e';oval(c,1,15,19,6,true);artifactGlyph(c,e.glyph,.7,e.color,time);c.restore();c.strokeStyle='#a48a6666';oval(c,0,2,15,5);c.restore();return;}
 if(o.physicalRole==='reward'){glow(c,e.color,45);c.fillStyle='#453d36';c.beginPath();c.roundRect(-18,-24,36,27,4);c.fill();c.strokeStyle='#c3ac77';c.stroke();c.fillStyle='#8dd9ca';c.beginPath();c.moveTo(0,-31-Math.sin(time*3)*2);c.lineTo(9,-20);c.lineTo(0,-9);c.lineTo(-9,-20);c.closePath();c.fill();c.restore();return;}
 drawReceiverHousing(c,e);
 // A matching silhouette remains visible before carrying the object here.
 c.save();c.translate(0,-34);c.globalAlpha=placed?1:.23;if(e.mode==='turn')c.rotate(step*Math.PI/2);artifactGlyph(c,e.glyph,.72,e.color,time);c.restore();
 if(e.mode==='turn'){const angle=e.orientation*Math.PI/2-Math.PI/2;c.strokeStyle=done?'#9fe2ba':'#f4d584';c.lineWidth=3;line(c,[[Math.cos(angle)*25,-34+Math.sin(angle)*25],[Math.cos(angle)*32,-34+Math.sin(angle)*32]]);const a=step*Math.PI/2-Math.PI/2;c.strokeStyle=e.color;c.lineWidth=2;line(c,[[0,-34],[Math.cos(a)*22,-34+Math.sin(a)*22]]);if(placed){c.save();c.translate(0,-34);c.rotate(a);const g=c.createLinearGradient(0,0,115,0);g.addColorStop(0,e.color+'66');g.addColorStop(1,e.color+'00');c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.lineTo(115,-24);c.lineTo(115,24);c.closePath();c.fill();c.restore();}}
 if(e.mode==='pump'){for(let i=0;i<3;i++){c.fillStyle=i<step?e.color:'#283b42';c.fillRect(-30+i*22,-5,16,7);}c.strokeStyle=e.color;line(c,[[18,-20],[30,-28],[36,-20]]);if(placed){c.fillStyle=e.color+'66';c.fillRect(-21,-12,42*(step/3),4);if(e.glyph==='brick')for(let i=0;i<step;i++){c.strokeStyle='#f3e3c4';line(c,[[-21+i*20,-18],[-24+i*20,-26-Math.sin(time*3+i)*3]]);}}}
 if(e.mode==='grow'&&placed){const f=Math.min(1,clock/4);c.strokeStyle='#8bbf8f';c.lineWidth=3;line(c,[[0,-17],[0,-17-f*44]]);for(let i=0;i<5*f;i++){c.fillStyle=i%2?e.color:'#8ab7a0';oval(c,(i%2?1:-1)*8,-21-i*8,9,4,true);}}
 if(e.mode==='listen'&&placed){const fade=Math.max(0,1-clock/1.6);c.strokeStyle=e.color;c.globalAlpha=fade;for(let i=0;i<3;i++){c.beginPath();c.arc(0,-36,16+i*8+(1-fade)*15,-2.7,-.4);c.stroke();}c.globalAlpha=1;c.strokeStyle=clock>=1.6?'#a6e6ba':'#655a52';c.beginPath();c.arc(0,-34,29,-Math.PI/2,Math.PI*1.25);c.stroke();}
 if(done){c.strokeStyle='#b8e6c7';c.lineWidth=2;for(let i=0;i<4;i++){const px=(i-1.5)*12;c.beginPath();c.moveTo(px,5);c.lineTo(px,8);c.stroke();}c.globalAlpha=.45;glow(c,e.color,42);c.globalAlpha=1;}
 c.restore();}
export function drawCarriedPhysical(c,state,x,y,time,T=48){const id=state.physicalLore?.held,e=PHYSICAL_LORE.find(e=>e.id===id);if(!e)return;c.save();c.translate(x*T+20,y*T-20);if(['lantern','lens'].includes(e.glyph)){c.save();c.globalAlpha=.18;glow(c,e.color,T*5.8);c.restore();}artifactGlyph(c,e.glyph,.5,e.color,time);c.restore();}

/** Physical signs sit on the floor beneath actors; they never point through walls. */
export function drawPhysicalTraces(c,objects,state,scene,T=48){
 for(const o of objects){if(!o.physicalId||!o.xy||!['source','trace','device'].includes(o.physicalRole))continue;
  const e=PHYSICAL_LORE.find(v=>v.id===o.physicalId);if(!e)continue;
  const [tx,ty]=o.xy;if(scene.floor[ty]?.[tx]!=='.')continue;
  const done=state.physicalLore?.completed?.includes(e.id),step=state.physicalLore?.steps?.[e.id]||0;
  c.save();c.beginPath();c.rect(tx*T,ty*T,T,T);c.clip();c.translate((tx+.5)*T,(ty+.5)*T);
  // An inlaid maker's stamp survives removal of the object. The identical
  // silhouette is carved on its receiver: recognition works without colour.
  c.save();c.translate(-13,12);c.scale(1,.55);c.globalAlpha=.42;artifactGlyph(c,e.glyph,.28,'#ba9b70',0);c.restore();
  c.strokeStyle='#352a2380';c.lineWidth=1;
  for(let i=0;i<5;i++)line(c,[[-18+i*7,18],[-16+i*7,23]]);
  if(o.physicalRole==='device'){
   if(e.mode==='turn'){const a=e.orientation*Math.PI/2-Math.PI/2;c.strokeStyle='#c2a57199';c.beginPath();c.arc(0,0,21,a-.8,a);c.stroke();line(c,[[Math.cos(a)*18,Math.sin(a)*18],[Math.cos(a)*23,Math.sin(a)*23]]);}
   if(e.mode==='pump'){for(let i=0;i<3;i++){c.strokeStyle=i<step?'#99bca5aa':'#362b2788';line(c,[[5+i*6,-20],[5+i*6,-7]]);}}
   if(e.mode==='listen'){c.strokeStyle='#c6b89c99';c.beginPath();c.ellipse(0,0,21,12,0,-1.1,Math.PI*1.35);c.stroke();}
   if(e.mode==='grow'){c.strokeStyle=done?'#7c9e78aa':'#6b735c88';line(c,[[0,19],[3,6],[-3,-4],[2,-20]]);line(c,[[3,6],[15,0]]);}
   if(e.mode==='fit'){c.strokeStyle='#c1ad8499';line(c,[[-19,-6],[-19,-19],[19,-19],[19,-6]]);}
  }
  c.restore();
 }
}
