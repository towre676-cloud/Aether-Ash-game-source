import {drawFrontierWayfinding} from './frontier-art.js?v=5.22.0';
const T=48;
export function destinationLabel(exit){const route=(exit.travel_label||'').replaceAll('\n',' ').replace(/^TO\s*\/\s*/i,'').trim();const name=exit.to_room||route||exit.to||exit.to_scene||'Passage';return String(name).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());}
export function exitKind(exit){if(exit.architecturalKind)return exit.architecturalKind;const text=(exit.travel_label||'')+' '+(exit.to||'');return /hatch|crypt|drain/i.test(text)?'stairs':/road|gate|viaduct|bridge|hub/i.test(text)?'gate':'door';}
/** Roads join permanent destinations into a shared network. A person does not
 * receive a private nine-tile plaza; door forecourts belong to the architecture. */
export function streetPlan(scene){
 const walk=(x,y)=>scene.floor?.[y]?.[x]==='.',key=([x,y])=>x+','+y;
 const anchors=[...(scene.arrive?[{xy:scene.arrive,arrival:true}]:[]),...(scene.doors||[]),...(scene.objects||[]).filter(o=>o.xy&&!['patrol','cache','boss','furnishing','life','secret','note'].includes(o.type))];
 const points=[],seen=new Set();
 for(const o of anchors){
  const [ax,ay]=o.xy.map(Math.floor);let p=null;
  for(let r=0;r<4&&!p;r++){
   const nearby=[];for(let y=ay-r;y<=ay+r;y++)for(let x=ax-r;x<=ax+r;x++)if(walk(x,y))nearby.push([x,y]);
   nearby.sort((a,b)=>Math.hypot(a[0]-ax,a[1]-ay)-Math.hypot(b[0]-ax,b[1]-ay)||a[1]-b[1]||a[0]-b[0]);p=nearby[0];
  }
  if(p&&!seen.has(key(p))){seen.add(key(p));points.push({p,entrance:!!(o.to||o.buildingEntrance||o.arrival)});}
 }
 const tiles=new Set();if(!points.length)return tiles;
 const first=points.shift();tiles.add(key(first.p));
 // Each new destination joins the closest existing street. The old single-root
 // BFS produced several parallel L-shaped roads that never shared a useful trunk.
 const pending=[...points],joined=[first];
 while(pending.length){
  pending.sort((a,b)=>Math.min(...joined.map(q=>Math.hypot(a.p[0]-q.p[0],a.p[1]-q.p[1])))-Math.min(...joined.map(q=>Math.hypot(b.p[0]-q.p[0],b.p[1]-q.p[1])))||a.p[1]-b.p[1]||a.p[0]-b.p[0]);
  const target=pending.shift(),start=key(target.p),queue=[target.p],parents=new Map([[start,null]]);let meeting=null;
  for(let i=0;i<queue.length;i++){
   const p=queue[i],k=key(p);if(tiles.has(k)){meeting=k;break;}
   const directions=[[0,-1],[-1,0],[1,0],[0,1]];
   // Continue straight when distances tie, avoiding gratuitous one-cell jogs.
   const previous=parents.get(k);if(previous){const [px,py]=previous.split(',').map(Number);directions.sort((a,b)=>((b[0]===p[0]-px&&b[1]===p[1]-py)?1:0)-((a[0]===p[0]-px&&a[1]===p[1]-py)?1:0));}
   for(const [dx,dy]of directions){const next=[p[0]+dx,p[1]+dy],n=key(next);if(walk(...next)&&!parents.has(n)){parents.set(n,k);queue.push(next);}}
  }
  if(meeting!==null){let at=meeting;while(at!==null){tiles.add(at);at=parents.get(at);}joined.push(target);}
 }
 // Compact cross-shaped thresholds soften to small round courts when painted.
 // Ordinary interactions keep a narrow approach, with vegetation beside it.
 for(const {p:[x,y],entrance}of joined)if(entrance)for(const [dx,dy]of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])if(walk(x+dx,y+dy))tiles.add((x+dx)+','+(y+dy));
 return tiles;
}
export function paintPaving(c,x,y,n,plaza=false){c.save();c.translate(x*T,y*T);c.beginPath();c.rect(0,0,T,T);c.clip();c.fillStyle=plaza?'#b29a73':'#9b917e';c.fillRect(0,0,T,T);for(let r=0;r<4;r++)for(let b=-1;b<3;b++){const bx=b*24+(r%2)*12;c.fillStyle=['#c4b394','#ae9d85','#baaa8e','#a69984'][(n+r+b+8)%4];c.fillRect(bx+1,r*12+1,22,10);}c.strokeStyle='#e1c384';c.lineWidth=1;if(plaza){c.strokeStyle='#607f80';c.lineWidth=3;c.beginPath();c.moveTo(24,8);c.lineTo(40,24);c.lineTo(24,40);c.lineTo(8,24);c.closePath();c.stroke();}c.restore();}
export function paintExit(renderer,exit,x,y,indoor,near){const c=renderer.ctx,kind=exitKind(exit),label=destinationLabel(exit),name=(exit.to||'')+' '+label,painted=drawFrontierWayfinding(renderer,exit,x,y,{indoor,near});if(painted){renderer.label(label,x*T,y*T-painted.height-10,near);return;}c.save();c.translate(x*T,y*T);c.fillStyle='#10131a55';c.beginPath();c.ellipse(0,6,30,10,0,0,7);c.fill();
 if(indoor&&exit.wallMounted){const side=Array.isArray(exit.wallSide)?exit.wallSide:({north:[0,-1],south:[0,1],west:[-1,0],east:[1,0]})[exit.wallSide]||[0,1];c.fillStyle='#171d22';c.strokeStyle='#b7a580';c.lineWidth=4;if(side[0]){c.fillRect(-9,-23,18,46);c.strokeRect(-11,-25,22,50);c.fillStyle='#b4a488';c.fillRect(-5,-20,10,40);}else{c.fillRect(-24,-8,48,16);c.strokeRect(-26,-10,52,20);c.fillStyle='#b4a488';c.fillRect(-21,-4,42,8);}c.fillStyle='#ead4a1';c.beginPath();c.moveTo(side[0]*14,side[1]*14);c.lineTo(side[0]*5-side[1]*4,side[1]*5+side[0]*4);c.lineTo(side[0]*5+side[1]*4,side[1]*5-side[0]*4);c.closePath();c.fill();}
 else if(exit.facade){c.fillStyle='#b5a080';c.fillRect(-22,0,44,7);c.strokeStyle='#ebd3a1';c.lineWidth=1;c.strokeRect(-22,0,44,7);}else if(kind==='stairs'){c.fillStyle='#342c26';c.fillRect(-23,-20,46,27);for(let i=0;i<5;i++){c.fillStyle=i%2?'#ad9e83':'#6a6355';c.fillRect(-21,-18+i*5,42,4);}c.strokeStyle='#40372b';c.lineWidth=4;c.strokeRect(-25,-23,50,31);}
 else if(!indoor){c.strokeStyle='#785d3c';c.lineWidth=5;for(const side of[-1,1]){c.beginPath();c.moveTo(side*28,8);c.lineTo(side*28,-39);c.moveTo(side*28,-16);c.lineTo(side*46,-16);c.moveTo(side*28,-30);c.lineTo(side*46,-30);c.stroke();}c.fillStyle='#c4ac7c';c.fillRect(22,-46,40,13);c.fillStyle='#574b37';c.beginPath();c.moveTo(62,-40);c.lineTo(54,-46);c.lineTo(54,-33);c.fill();}
 else{const metal=/work|security|console|reactor|depot/i.test(name),wood=/home|inn|carpenter/i.test(name),frame=metal?'#59656a':wood?'#785039':'#8d8575';c.fillStyle=frame;c.fillRect(-27,-65,54,71);c.fillStyle='#202528';c.fillRect(-20,-59,40,62);const g=c.createLinearGradient(-18,-55,18,0);g.addColorStop(0,metal?'#4c666a':wood?'#956948':'#67576d');g.addColorStop(1,metal?'#2b3b3e':wood?'#533a2a':'#3b3446');c.fillStyle=g;c.fillRect(-17,-56,34,57);c.strokeStyle=metal?'#90a8ad':'#382c23';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(-14+i*9,-53);c.lineTo(-14+i*9,0);c.stroke();}c.fillStyle='#c8ad70';c.beginPath();c.arc(11,-24,2.5,0,7);c.fill();c.fillStyle='#b5a28a';c.fillRect(-31,3,62,7);c.fillStyle=frame;c.beginPath();c.moveTo(-33,-65);c.lineTo(0,-77);c.lineTo(33,-65);c.fill();if(!indoor){c.fillStyle=/clinic/.test(name)?'#b5d2c1':/inn/.test(name)?'#a56153':'#6f8294';c.fillRect(-33,-64,66,8);}}
 c.restore();if(near||indoor&&!exit.wallMounted)renderer.label(label,x*T,y*T-(exit.facade?200:kind==='stairs'?35:kind==='gate'?58:90),near);else if(!indoor)renderer.label(label,x*T,y*T-(exit.facade?200:kind==='gate'?58:90),false);}
export function paintGarden(c,x,y,n,time){c.save();c.translate(x*T,y*T);c.fillStyle='#43372b';c.fillRect(-23,-15,46,16);c.fillStyle='#638269';c.fillRect(-22,-22,44,10);for(let i=0;i<7;i++){const px=-19+i*6;c.fillStyle=['#e7b171','#cf778b','#a9c2de'][(n+i)%3];c.beginPath();c.arc(px,-24-Math.sin(i*2)*4,3,0,7);c.fill();}c.strokeStyle='#b49a68';c.lineWidth=3;c.beginPath();c.moveTo(24,0);c.lineTo(24,-65);c.quadraticCurveTo(24,-78,34,-78);c.stroke();const glow=c.createRadialGradient(34,-69,2,34,-69,32);glow.addColorStop(0,'#ffd59566');glow.addColorStop(1,'#ffd59500');c.fillStyle=glow;c.fillRect(2,-101,64,64);c.fillStyle='#ffdb95';c.fillRect(29,-76,10,13);c.restore();}
