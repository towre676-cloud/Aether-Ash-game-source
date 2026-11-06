/** A ground-plane opening with stone cheeks and stairs descending into shade. */
export function stairwellSteps(count=7){
 return Array.from({length:count},(_,i)=>{const near=i/count,far=(i+1)/count;return {nearY:18-near*40,farY:18-far*40,nearWidth:54-near*17,farWidth:54-far*17,shade:1-i/(count+1)};});
}
export function drawStairwell(c){
 c.save();
 // The cast shadow stays on the ground rather than surrounding a floating sign.
 const contact=c.createRadialGradient(0,4,8,0,4,43);contact.addColorStop(0,'#101e244a');contact.addColorStop(1,'#101e2400');c.fillStyle=contact;c.fillRect(-44,-38,88,80);
 c.beginPath();c.moveTo(-34,21);c.lineTo(-27,-28);c.lineTo(27,-28);c.lineTo(34,21);c.closePath();
 const hole=c.createLinearGradient(0,-28,0,21);hole.addColorStop(0,'#091519');hole.addColorStop(1,'#303d3b');c.fillStyle=hole;c.fill();
 // Foreshortened tread polygons shrink toward the buried passage. Risers darken with depth.
 const steps=stairwellSteps();for(let i=steps.length-1;i>=0;i--){const s=steps[i],v=Math.round(74+s.shade*45);c.beginPath();c.moveTo(-s.nearWidth/2,s.nearY);c.lineTo(s.nearWidth/2,s.nearY);c.lineTo(s.farWidth/2,s.farY+1.3);c.lineTo(-s.farWidth/2,s.farY+1.3);c.closePath();c.fillStyle=`rgb(${v-3},${v+3},${v-2})`;c.fill();c.strokeStyle=i<3?'#c1c0a96b':'#989f8b36';c.lineWidth=1;c.beginPath();c.moveTo(-s.nearWidth/2+1,s.nearY);c.lineTo(s.nearWidth/2-1,s.nearY);c.stroke();c.fillStyle='#17242666';c.fillRect(-s.farWidth/2,s.farY+1.3,s.farWidth,1.8);}
 // Low stone cheeks project above the opening, with a brighter worn top edge.
 for(const sign of [-1,1]){
  c.beginPath();c.moveTo(sign*35,22);c.lineTo(sign*28,-28);c.lineTo(sign*22,-26);c.lineTo(sign*29,19);c.closePath();c.fillStyle=sign<0?'#6d7770':'#485953';c.fill();
  c.strokeStyle='#aaa99899';c.lineWidth=2;c.beginPath();c.moveTo(sign*35,21);c.lineTo(sign*28,-28);c.lineTo(sign*22,-26);c.stroke();
  for(let i=0;i<4;i++){const y=14-i*11,x=sign*(34-i*1.5);c.strokeStyle='#263b3b66';c.lineWidth=.7;c.beginPath();c.moveTo(x,y);c.lineTo(x-sign*5,y-2);c.stroke();}
  // Waist-height is 22px here, but the railing follows the receding ground plane.
  c.strokeStyle='#3e4b49';c.lineWidth=2.3;c.beginPath();c.moveTo(sign*34,15);c.lineTo(sign*34,-3);c.moveTo(sign*28,-23);c.lineTo(sign*28,-38);c.moveTo(sign*34,-3);c.lineTo(sign*28,-38);c.stroke();c.strokeStyle='#b0b29b66';c.lineWidth=.7;c.beginPath();c.moveTo(sign*33,-4);c.lineTo(sign*27,-38);c.stroke();
 }
 c.fillStyle='#111d20';c.beginPath();c.moveTo(-20,-22);c.lineTo(20,-22);c.lineTo(22,-27);c.lineTo(-22,-27);c.closePath();c.fill();
 // Front is deliberately open: the worn landing and stairs form one continuous approach.
 c.strokeStyle='#b0aa91a0';c.lineWidth=2;c.beginPath();c.moveTo(-28,20);c.lineTo(28,20);c.stroke();
 c.restore();
}
