/** Grounded marks keep the expedition's cause and effect in the scene. */
export function drawTrailRefuge(renderer,object,x,y,{near=false}={}){
 const c=renderer.ctx,T=48,ready=object.ready===true||object.restored===true;
 c.save();c.translate(x*T,y*T);c.lineJoin='round';c.lineWidth=2;
 c.fillStyle='#18282477';c.beginPath();c.ellipse(0,2,31,12,0,0,Math.PI*2);c.fill();
 if(ready){
  c.strokeStyle='#685141';c.lineWidth=5;c.beginPath();c.moveTo(-25,0);c.lineTo(-15,-48);c.lineTo(22,-3);c.moveTo(-15,-48);c.lineTo(26,-48);c.stroke();
  c.fillStyle='#71886b';c.strokeStyle='#344f49';c.lineWidth=2;c.beginPath();c.moveTo(-15,-48);c.lineTo(26,-48);c.lineTo(39,-14);c.lineTo(5,-14);c.closePath();c.fill();c.stroke();
  c.fillStyle='#d0bf8d';c.fillRect(24,-47,14,7);c.fillStyle='#514d3b';c.fillRect(-19,-5,29,6);
  c.fillStyle='#b39970';c.fillRect(-5,-16,17,12);c.strokeStyle='#5a6857';c.beginPath();c.moveTo(3,-16);c.lineTo(3,-4);c.stroke();
  c.fillStyle='#759d9d';c.beginPath();c.ellipse(19,-5,7,4,0,0,Math.PI*2);c.fill();c.fillStyle='#c8d5b4';c.fillRect(17,-14,4,9);
 }else{
  c.strokeStyle='#726451';c.lineWidth=5;c.beginPath();c.moveTo(-22,-2);c.lineTo(5,-19);c.moveTo(-9,-17);c.lineTo(24,-4);c.stroke();
  c.fillStyle='#6b7860';c.beginPath();c.moveTo(-20,-9);c.lineTo(8,-26);c.lineTo(28,-10);c.lineTo(5,-6);c.closePath();c.fill();
  c.fillStyle='#aa9771';c.fillRect(12,-13,12,8);
 }
 c.restore();if(near)renderer.label(object.label,x*T,y*T-62,true);
}
export function drawFieldAwareness(renderer,enemy,phase,T=48){
 const c=renderer.ctx,alert=phase==='alert'||phase==='pursue';if(!alert)return;
 c.save();c.strokeStyle=phase==='alert'?'#e7ce8f':'#e9a081';c.fillStyle=c.strokeStyle;c.lineWidth=2;c.globalAlpha=.75;c.beginPath();c.ellipse(enemy.x*T,enemy.y*T,21,8,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;c.font='bold 19px Georgia';c.textAlign='center';c.fillText(phase==='alert'?'?':'!',enemy.x*T,enemy.y*T-78);c.restore();
}
