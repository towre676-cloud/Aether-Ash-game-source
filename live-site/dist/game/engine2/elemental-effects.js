/** Impact choreography in world coordinates, tied to actual paid casts and hits. */
export function drawElementalEffect(c,f,T){
 if(!f.core||!['spell','beam','chain','heal'].includes(f.kind))return;
 const p=Math.min(1,f.t/f.life),x=f.x*T,y=f.y*T-25,energy=Math.sin(Math.PI*p),r=12+p*70,TAU=Math.PI*2;
 c.save();c.globalCompositeOperation='lighter';c.globalAlpha=energy*.7;c.strokeStyle=f.color||'#c3f4ea';c.fillStyle=f.color||'#c3f4ea';c.lineWidth=2;
 if(f.core==='volt'){
  for(let branch=0;branch<3;branch++){c.beginPath();c.moveTo(x+(branch-1)*12,y-88);for(let k=1;k<=7;k++)c.lineTo(x+(branch-1)*12+Math.sin(k*8+f.t*60)*14,y-88+k*13);c.stroke();}
 }else if(f.core==='flame'){
  for(let j=0;j<16;j++){const a=j*2.399,radius=r*(.4+j%4*.16),px=x+Math.cos(a)*radius,py=y+Math.sin(a)*radius*.4-p*36;const glow=c.createRadialGradient(px,py,0,px,py,9*(1-p)+3);glow.addColorStop(0,'#fff3c3');glow.addColorStop(.4,f.color);glow.addColorStop(1,'#ff520000');c.fillStyle=glow;c.fillRect(px-12,py-12,24,24);}
 }else if(f.core==='frost'){
  for(let j=0;j<8;j++){const a=j*TAU/8,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.6;c.beginPath();c.moveTo(px,py-13*(1-p));c.lineTo(px+5,py);c.lineTo(px,py+8);c.lineTo(px-5,py);c.closePath();c.fill();}
 }else if(f.core==='tide'){
  for(let j=0;j<3;j++){c.beginPath();c.ellipse(x,y+j*4,r*(1-j*.18),r*.32,0,0,TAU);c.stroke();}
 }else if(f.core==='gale'){
  for(let j=0;j<4;j++){c.beginPath();c.ellipse(x,y-j*7,r,12+j*5,-.2,p*TAU+j,p*TAU+j+Math.PI*1.4);c.stroke();}
 }else if(f.core==='earth'){
  c.lineWidth=3;for(let j=0;j<7;j++){const a=j*TAU/7;c.beginPath();c.moveTo(x,y+15);c.lineTo(x+Math.cos(a)*r*.5,y+15+Math.sin(a)*r*.22);c.lineTo(x+Math.cos(a+.2)*r,y+15+Math.sin(a)*r*.38);c.stroke();}
 }else if(f.core==='mend'||f.core==='ward'){
  for(let j=0;j<6;j++){const px=x+Math.cos(j)*30,py=y+20-p*80-j*4;c.fillRect(px-2,py-7,4,14);c.fillRect(px-7,py-2,14,4);}if(f.core==='ward'){c.beginPath();c.ellipse(x,y,36,55,0,0,TAU);c.stroke();}
 }else if(f.core==='gravity'){
  for(let j=0;j<3;j++){c.beginPath();c.ellipse(x,y,r,15+j*14,f.t*3+j,0,TAU);c.stroke();}
 }else{
  for(let j=0;j<10;j++){const a=j*TAU/10+f.t*3;c.beginPath();c.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.6);c.quadraticCurveTo(x,y,x+Math.cos(a+.5)*r*.3,y+Math.sin(a+.5)*r*.3);c.stroke();}
 }c.restore();
}
