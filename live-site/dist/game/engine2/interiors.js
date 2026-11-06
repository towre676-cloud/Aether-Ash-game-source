import {paintFurnitureContact} from './contact-shadow.js?v=5.1.0';
import {drawDesignedFurniture} from './furniture-art.js?v=5.1.0';
/** Cached architectural floor plans and individually drawn furniture; no per-frame texture allocation. */
const T=48;
const FAMILY_COLORS={clinic:['#3a4842','#718379','#ced8bc'],inn:['#43352c','#735b40','#d6b77b'],home:['#39372e','#6d6147','#d8c28d'],guild:['#303d42','#53646a','#b5beae'],pottery_floor:['#4b3930','#7c5b46','#c5a479'],relief_store:['#423d2d','#716649','#c4b780'],listening_chamber:['#293d41','#48646a','#b8cbb9'],lens_workshop:['#333e45','#596c74','#a6c9d1']};
const COLORS={loft:['#392d28','#5b4432','#b39362'],quarters:['#302e29','#514738','#d5ad70'],archive:['#242e32','#3e4b4b','#d2b36c'],cistern:['#20353b','#38535b','#83bec2'],chapel:['#2b2938','#49445a','#baa5d1'],garden:['#25352e','#425342','#abd29c']};
export function bakeInterior(scene){
 const surface=document.createElement('canvas');surface.width=scene.width*T;surface.height=scene.height*T;const c=surface.getContext('2d'),p=FAMILY_COLORS[scene.architecture?.family]||COLORS[scene.interior]||COLORS.quarters;
 c.clearRect(0,0,surface.width,surface.height);
 const inside=(x,y)=>scene.architecture?scene.architecture.outline.some(r=>r.y===y&&x>=r.left&&x<=r.right):scene.floor[y]?.[x]==='.'||scene.blocks.some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h);
 for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(inside(x,y)){
 c.fillStyle=p[0];c.fillRect(x*T,y*T,T,T);c.strokeStyle='#e2ccaa10';c.lineWidth=1;
 const wood=['quarters','loft','archive'].includes(scene.interior)&&!['clinic','pottery_floor'].includes(scene.key);if(wood){for(let i=0;i<4;i++){c.beginPath();c.moveTo(x*T,y*T+i*12);c.lineTo((x+1)*T,y*T+i*12);c.stroke();}}else c.strokeRect(x*T+1,y*T+1,T-2,T-2);
 if(!inside(x,y-1)){c.fillStyle='#171c20';c.fillRect(x*T,y*T-30,T,34);c.fillStyle=p[1];c.fillRect(x*T+2,y*T-27,T-4,22);c.fillStyle=p[2];c.fillRect(x*T,y*T+2,T,3);if(x%5===0&&inside(x-1,y)&&inside(x+1,y)){c.fillStyle='#202e36';c.fillRect(x*T+10,y*T-25,28,22);c.fillStyle='#c9d6bd';c.fillRect(x*T+13,y*T-22,22,16);c.fillStyle='#615b48';c.fillRect(x*T+23,y*T-22,2,16);}}
 for(const [dx,dy] of [[-1,0],[1,0],[0,1]])if(!inside(x+dx,y+dy)){c.fillStyle=p[1];if(dx)c.fillRect((x+(dx>0?1:0))*T-4,y*T,8,T);else c.fillRect(x*T,(y+1)*T-6,T,6);}
 }
 // Ground furniture groups with woven textiles; clip every rug to the actual room shell.
 c.save();c.beginPath();for(const r of scene.architecture?.outline||[])c.rect(r.left*T,r.y*T,(r.right-r.left+1)*T,T);c.clip();for(const r of scene.architecture?.rugs||[]){c.fillStyle=scene.interior==='chapel'?'#6e52635c':'#7a584950';c.fillRect(r.x*T,r.y*T,r.w*T,r.h*T);c.strokeStyle='#c8b17a55';c.lineWidth=2;c.strokeRect(r.x*T+6,r.y*T+6,r.w*T-12,r.h*T-12);c.strokeStyle='#c8b17a22';c.strokeRect(r.x*T+11,r.y*T+11,r.w*T-22,r.h*T-22);}
 c.restore();
 // A restrained woven runner establishes the entrance without a floating room title.
 const entry=scene.architecture?.entry||[10,17];for(let dy=0;dy<3;dy++)for(let dx=-1;dx<=1;dx++){const x=entry[0]+dx,y=entry[1]-dy;if(inside(x,y)){c.fillStyle='#8b65583d';c.fillRect(x*T+2,y*T+2,T-4,T-4);}}
 return surface;
}
export function drawFurniture(c,kind,b){if(drawDesignedFurniture(c,b))return;kind=({bed:'quarters',shelf:'archive',pool:'cistern',planter:'garden',altar:'altar',pew:'pew'})[b.type]||b.type||kind;const x=b.x*T,y=b.y*T,w=b.w*T,h=b.h*T;paintFurnitureContact(c,b,{opacity:.15});c.save();c.fillStyle='#302b28';c.fillRect(x,y-16,w,h+16);c.strokeStyle='#bc985a77';c.lineWidth=2;c.strokeRect(x+2,y-14,w-4,h+12);
 if(['table','bench','pew','altar'].includes(kind)){c.fillStyle=kind==='altar'?'#938473':'#79563b';c.fillRect(x+4,y-10,w-8,h);c.fillStyle='#ba946133';c.fillRect(x+7,y-8,w-14,4);c.fillStyle='#392a23';for(const dx of [8,w-15])c.fillRect(x+dx,y+h-10,7,12);if(kind==='table'){c.fillStyle='#cbbd91';c.fillRect(x+w*.3,y+5,w*.38,h*.4);c.fillStyle='#d1d0b1';c.beginPath();c.ellipse(x+w*.5,y+h*.35,12,7,0,0,7);c.fill();}if(kind==='pew'){c.fillStyle='#47392d';c.fillRect(x+4,y-13,w-8,8);}}
 else if(kind==='hearth'){c.fillStyle='#777368';c.fillRect(x+3,y-20,w-6,h+20);c.fillStyle='#211d1b';c.fillRect(x+13,y-9,w-26,h);c.fillStyle='#d9954c';c.beginPath();c.ellipse(x+w/2,y+h*.55,10,15,0,0,7);c.fill();}
 else if(kind==='cabinet'){c.fillStyle='#705038';c.fillRect(x+4,y-22,w-8,h+20);c.strokeStyle='#ad8759';c.strokeRect(x+8,y-18,w-16,h+12);c.beginPath();c.moveTo(x+w/2,y-18);c.lineTo(x+w/2,y+h-6);c.stroke();}
 else if(kind==='archive'){c.fillStyle='#654d36';c.fillRect(x+3,y-14,w-6,h+8);for(let row=0;row<Math.floor(h/25);row++){c.fillStyle='#241e1b';c.fillRect(x+7,y+row*25,w-14,17);for(let i=0;i<Math.floor(w/12)-1;i++){c.fillStyle=['#617a71','#a78a67','#775766','#b99d71'][(i+row)%4];c.fillRect(x+9+i*12,y+row*25+2,8,13);}}}
 else if(kind==='cistern'){c.fillStyle='#83b4b933';c.fillRect(x+9,y-7,w-18,h-4);c.strokeStyle='#82bac066';for(let i=0;i<5;i++){c.beginPath();c.ellipse(x+w/2,y+h/2,w*(.1+i*.075),h*(.08+i*.075),0,0,Math.PI*2);c.stroke();}c.fillStyle='#a2ac9c';c.fillRect(x+w-12,y+9,15,30);}
 else if(kind==='quarters'){c.fillStyle='#77736b';c.fillRect(x+7,y-8,w-14,h-2);c.fillStyle='#8caca7';c.fillRect(x+12,y-4,w-24,h*.6);c.fillStyle='#d6ceaf';c.fillRect(x+12,y+h*.62,w-24,h*.21);c.strokeStyle='#405b5f';c.strokeRect(x+12,y-4,w-24,h*.6);}
 else if(kind==='garden'){c.fillStyle='#322a23';c.fillRect(x+7,y-8,w-14,h+2);for(let i=0;i<Math.floor(w/30);i++)for(let j=0;j<Math.floor(h/30);j++){c.fillStyle='#698957';c.beginPath();c.ellipse(x+22+i*30,y+12+j*30,11,5,.5,0,Math.PI*2);c.fill();c.fillStyle='#b9cc8b';c.fillRect(x+21+i*30,y+7+j*30,2,11);}}
 else{c.fillStyle=kind==='chapel'?'#66505c':'#6e5339';c.fillRect(x+5,y-11,w-10,h+3);c.fillStyle='#c59e6b55';c.fillRect(x+8,y-11,w-16,5);for(let i=0;i<Math.floor(w/35);i++){c.fillStyle=kind==='chapel'?'#a5959277':'#c6b88a88';c.fillRect(x+16+i*35,y+5,18,Math.min(27,h-10));}}
 c.restore();}
export function drawSecret(c,x,y,near,time){c.save();c.translate(x*T,y*T);c.fillStyle='#181e22';c.fillRect(-12,-10,24,10);c.strokeStyle='#aa9570';c.lineWidth=1.5;c.beginPath();c.moveTo(-12,-8);c.lineTo(10,-10);c.moveTo(-7,-7);c.lineTo(9,-8);c.stroke();if(near){c.globalAlpha=.5+.3*Math.sin(time*3);c.fillStyle='#ead49b';c.fillRect(7,-12,3,3);}c.restore();}
