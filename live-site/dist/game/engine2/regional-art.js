import {environmentPropSpec,drawRegionalProp} from './environment-art-v17.js?v=5.22.0';

/** Small, grounded regional life. Crafts show the material being worked, not a generic marker. */
const TAU=Math.PI*2;
function ellipse(c,x,y,rx,ry,color,rotation=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fill();}
function line(c,points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function round(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function gradient(c,x,y,w,h,a,b){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
function contact(c,w=22,h=6){const g=c.createRadialGradient(0,0,1,0,0,w);g.addColorStop(0,'#111e254e');g.addColorStop(1,'#111e2500');c.save();c.scale(1,h/w);c.fillStyle=g;c.fillRect(-w,-w,w*2,w*2);c.restore();}
function wood(c,x,y,w,h){round(c,x,y,w,h,1.4,gradient(c,x,y,w,h,'#a48e63','#64563f'));line(c,[[x+2,y+2],[x+w-2,y+2]],'#d0bb8b77',.7);for(let i=0;i<3;i++)line(c,[[x+3,y+4+i*h/4],[x+w*.48,y+4+i*h/4+.5],[x+w-3,y+4+i*h/4]],'#3c382525',.5);}
function table(c,width=51){const l=-width/2,r=width/2;for(const [x,y]of [[l+5,-5],[r-8,-5],[l+10,-15],[r-13,-15]]){poly(c,[[x-2,y],[x+2,y],[x+1,0],[x-2,0]],'#554b3c');line(c,[[x-1,y],[x-1,-1]],'#a08a5b',.6);}line(c,[[l+4,-7],[r-7,-7]],'#7c6748',3);poly(c,[[l,-24],[r-4,-27],[r,-20],[l+2,-17]],'#4b4236');poly(c,[[l,-28],[r-4,-31],[r,-24],[l+2,-21]],gradient(c,l,-31,width,10,'#b7a075','#826c48'));line(c,[[l,-28],[l+2,-21],[r,-24]],'#d2bb8b',.8);for(let i=0;i<4;i++)line(c,[[l+4,-28+i*1.8],[r-8,-31+i*1.8]],'#63553a44',.5);}
function frame(c,w=42,h=43){wood(c,-w/2,-h,4,h);wood(c,w/2-4,-h-3,4,h+3);wood(c,-w/2-2,-h-3,w+4,4);line(c,[[-w/2,-12],[w/2-2,-h+2]],'#4e4a3a',1.5);}
function paper(c,x,y,w=17,h=11){poly(c,[[x,y],[x+w,y-2],[x+w+1,y+h-2],[x+1,y+h]],'#c9c2a5');line(c,[[x+3,y+3],[x+w-3,y+2]],'#777d7180',.7);line(c,[[x+4,y+6],[x+w-4,y+5]],'#777d7160',.6);}
export function regionalCraftKind(p){return ['vent','cloth','sieve','rope','paper','splice','seed','baffle','laundry','trolley','bank','cradle','patch','stool','boots','reed','lens','tea','mooring','press','clay','gutter','table','chairs'][(p.chapter-1)%24]||'table';}
function craft(c,p,done,time){const k=regionalCraftKind(p),metal=gradient(c,-15,-38,20,30,'#a6b0a6','#54646a');
 if(['cloth','paper','laundry','boots','patch'].includes(k)){
  frame(c,k==='laundry'?56:43,k==='paper'?41:47);
  if(k==='laundry'||k==='cloth')for(let i=0;i<3;i++){const x=-19+i*14,sway=Math.sin(time*.8+i)*.7,col=['#a3afa2','#b7aa8b','#7d9896'][i];c.fillStyle=col;c.beginPath();c.moveTo(x,-41);c.lineTo(x+11,-42);c.lineTo(x+12+sway,-17+i%2*5);c.quadraticCurveTo(x+6+sway,-14+i%2*5,x+sway,-17+i%2*5);c.closePath();c.fill();line(c,[[x+3,-39],[x+3+sway,-19]],'#e3d8ba55',.7);line(c,[[x,-42],[x+1,-37]],'#5b503c',1.5);}
  else if(k==='boots'){for(const x of[-11,7]){round(c,x,-37,9,18,2,'#5b5346');ellipse(c,x+5,-19,7,3,'#6d6452');line(c,[[x+2,-35],[x+2,-23]],'#b5a383',.8);}}
  else if(k==='paper'){for(let i=0;i<3;i++)paper(c,-15+i*11,-36+i%2*6,10,20);}
  else {const fabric='#8b9e98';poly(c,[[-17,-39],[15,-40],[14,-16],[-15,-17]],fabric);poly(c,[[-6,-32],[7,-31],[6,-21],[-7,-22]],'#b29871');for(let i=0;i<6;i++){line(c,[[-7+i*2.5,-32],[-7+i*2.5,-30]],'#ddd1a6',.65);line(c,[[-7+i*2.5,-23],[-7+i*2.5,-21]],'#ddd1a6',.65);}}
 }else if(['vent','sieve','baffle','gutter'].includes(k)){
  if(k==='vent'){round(c,-19,-38,38,36,3,'#394c4d');poly(c,[[-23,-37],[-16,-46],[20,-46],[23,-37]],metal);for(let j=0;j<6;j++){line(c,[[-16,-33+j*5],[16,-33+j*5]],'#9aab9e',2);line(c,[[-15,-31+j*5],[15,-31+j*5]],'#22383c',1);}for(const x of[-15,15])for(const y of[-35,-7])ellipse(c,x,y,1.2,1.2,'#b9c2a8');}
  else if(k==='gutter'){frame(c,51,26);poly(c,[[-27,-30],[22,-32],[27,-25],[-23,-23]],'#8c9a91');poly(c,[[-24,-28],[21,-30],[23,-27],[-23,-25]],'#435d61');line(c,[[-26,-30],[23,-32],[27,-25]],'#b9c8b6',1.2);ellipse(c,26,-9,7,4,'#5e7069');round(c,19,-14,14,8,2,'#7d8d7b');ellipse(c,26,-14,7,3,'#c0c3a5');ellipse(c,26,-14,5.5,1.8,'#4e7980');}
  else {table(c,47);const yy=k==='baffle'?-47:-38;poly(c,[[-17,yy],[15,yy-3],[19,-26],[-12,-23]],metal);line(c,[[-17,yy],[15,yy-3],[19,-26]],'#d2d6bd',1);if(k==='sieve'){for(let i=0;i<6;i++){line(c,[[-14+i*5,-37],[-10+i*5,-25]],'#344e4f99',.7);line(c,[[-14,-35+i*2],[15,-38+i*2]],'#344e4f99',.7);}}else for(let i=0;i<3;i++)line(c,[[-13,-42+i*6],[13,-45+i*6]],'#5a6e70',2);}
 }else if(k==='trolley'){
  for(const x of[-18,18]){ellipse(c,x,-4,6,7,'#323d39');ellipse(c,x-1,-5,3.5,4.5,'#7f8d7c');ellipse(c,x-1,-5,1,1.5,'#c4b28a');}wood(c,-26,-18,52,7);line(c,[[23,-14],[25,-38],[33,-42]],'#8d9c91',3);line(c,[[-22,-19],[-20,-35],[4,-38],[10,-20]],'#75634a',1.4);round(c,-20,-34,29,16,2,gradient(c,-20,-34,29,16,'#9c8762','#6c6048'));line(c,[[-11,-35],[-10,-19]],'#d0c29b',2);}
 else if(k==='stool'||k==='chairs'){
  const count=k==='chairs'?3:1;for(let i=0;i<count;i++){c.save();c.translate((i-(count-1)/2)*24,k==='chairs'&&i===1?-10:0);for(const x of[-8,7])wood(c,x,-18,3,18);poly(c,[[-12,-24],[10,-26],[13,-19],[-9,-17]],'#a9946c');line(c,[[-12,-24],[-9,-17],[13,-19]],'#d3bd8c',.8);if(k==='chairs'){wood(c,-11,-43,3,24);wood(c,8,-45,3,24);wood(c,-10,-42,20,4);wood(c,-10,-34,20,3);}c.restore();}
 }else if(k==='bank'||k==='seed'){
  const tall=k==='seed';if(tall){frame(c,43,32);poly(c,[[-25,-38],[19,-41],[27,-28],[-19,-26]],'#a6aa83');line(c,[[-25,-38],[19,-41],[27,-28]],'#d3c99c',1);}
  poly(c,[[-25,-13],[18,-16],[24,-4],[-19,-1]],'#6d6248');poly(c,[[-23,-13],[17,-15],[21,-5],[-18,-3]],'#3f4a36');for(let i=0;i<9;i++){const x=-15+i*4,y=-7-(i%3)*1.6;line(c,[[x,y],[x-1,-17-i%4*2]],'#657e4b',1);ellipse(c,x-3,-14-i%4*2,3,1.2,'#87975d',.6);ellipse(c,x+1,-17-i%4*2,3,1.2,'#73925b',-.6);}}
 else {
  table(c,k==='table'?77:51);
  if(['rope','splice','mooring'].includes(k)){
   for(let i=0;i<6;i++){c.strokeStyle=i%2?'#c8b687':'#8e7956';c.lineWidth=2;c.beginPath();c.ellipse(-8+i*.5,-28-i*.5,13-i*1.1,4-i*.2,-.1,0,TAU);c.stroke();}line(c,[[1,-28],[13,-29],[19,-34]],'#c0ad7c',2);if(k==='mooring'){c.strokeStyle='#687e7c';c.lineWidth=3;c.beginPath();c.ellipse(18,-36,7,9,.25,0,TAU);c.stroke();}else{wood(c,14,-42,4,18);line(c,[[15,-42],[-11,-27]],'#c7b17f',1.1);line(c,[[17,-42],[-8,-27]],'#7c6b4e',1.1);}}
  else if(['reed','tea'].includes(k)){poly(c,[[-20,-30],[17,-32],[21,-25],[-17,-23]],'#7c7150');for(let i=0;i<14;i++){const x=-16+(i%7)*5,y=-29+Math.floor(i/7)*3;if(k==='tea')ellipse(c,x,y,3,1,'#7d8b54',i*.7);else line(c,[[x,y],[x+2,y-5]],'#b5b181',1.2);}line(c,[[-20,-30],[17,-32],[21,-25],[-17,-23],[-20,-30]],'#baa77d',1);}
  else if(k==='lens'){round(c,-16,-33,30,7,3,'#8a9e94');ellipse(c,-1,-33,12,5,'#b4c1ae');ellipse(c,-1,-34,10,3.5,'#6f999d');line(c,[[-8,-35],[3,-36]],'#e4e9cf',1);wood(c,12,-34,3,7);ellipse(c,18,-31,3,2,'#b8baa4');}
  else if(k==='cradle'){wood(c,-17,-36,5,10);wood(c,12,-37,5,10);poly(c,[[-14,-32],[13,-34],[12,-28],[-13,-26]],'#a9a893');ellipse(c,0,-35,10,7,'#947e5e');ellipse(c,0,-39,9,3,'#b7a889');ellipse(c,0,-39,6.5,2,'#4b5148');line(c,[[-5,-36],[-3,-31]],'#d2bd8f',1);}
  else if(k==='press'){for(const x of[-15,13]){round(c,x,-48,3,24,1,'#7a877e');ellipse(c,x+1,-46,4,2,'#b7b796');}for(let i=0;i<3;i++)paper(c,-15,-31-i*2,30,6);wood(c,-22,-39,44,5);wood(c,-22,-48,44,5);line(c,[[-17,-48],[-17,-39]],'#d1c29b',1);}
  else if(k==='clay'){poly(c,[[-21,-31],[17,-33],[21,-25],[-17,-23]],'#8e7759');for(const [x,y]of[[-10,-31],[4,-32],[14,-29]]){ellipse(c,x,y,6,4,'#a99278');ellipse(c,x,y-2,4.7,2.2,'#c2ad8e');ellipse(c,x,y-2,3.5,1.3,'#6d6855');}poly(c,[[-18,-36],[-6,-38],[0,-28],[-15,-26]],'#a7ada0');line(c,[[-15,-35],[-11,-28]],'#d2d4b955',.8);}
  else if(k==='table'){paper(c,-26,-30,19,8);ellipse(c,6,-30,8,3.5,'#c4b590');ellipse(c,6,-30,5,2,'#a4784b');ellipse(c,24,-32,4,2,'#c8c3a4');round(c,20,-38,8,6,1,'#9eaaa0');}
 }
 if(done){c.save();c.globalAlpha=.8;ellipse(c,-21,-3,2.4,1.8,'#a2b78c');c.restore();}
}
function herb(c,p,time){
 const seed=p.chapter,fern=/fern|cress|moss|mint/.test(p.plant),grass=/grass|flax|rye/.test(p.plant),flower=/flower|violet|lavender|chamomile|clover/.test(p.plant),sway=Math.sin(time*.8+seed)*.65;
 ellipse(c,0,-1,19,5,'#354b3438');for(let i=0;i<9;i++){const x=Math.sin(i*2.399+seed)*16,y=Math.cos(i*1.7)*3,h=(grass?27:19)+(i*7+seed)%12;c.strokeStyle=i%2?'#61764c':'#7e8c59';c.lineWidth=.8;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+sway*.3,y-h*.55,x+sway+(i%3-1)*4,y-h);c.stroke();for(let j=0;j<(grass?1:fern?5:3);j++){const ly=y-h*(.3+j*(fern?.13:.22)),lx=x+sway*(j+1)/5,leaf=fern?3.5:4.5;ellipse(c,lx-2,ly,leaf,fern?1.4:2,'#58744b',.5);ellipse(c,lx+2,ly-3,leaf,fern?1.4:2,'#8a9c62',-.5);}if(flower){const yy=y-h,col=seed%2?'#c9bbcc':'#d4cdb0';for(let j=0;j<5;j++)ellipse(c,x+sway+Math.cos(j*TAU/5)*1.7,yy+Math.sin(j*TAU/5)*1.7,1.6,1.1,col);ellipse(c,x+sway,yy,.8,.8,'#c9af68');}if(grass){for(let j=0;j<4;j++)ellipse(c,x+sway+(j%2?1:-1)*1.3,y-h+j*2,1,2,'#b2ad7a',j%2?.4:-.4);}}
}

/** Harvest beds share the world's painted vegetation at a one-tile scale.
 * These are visual families; the profile retains the actual plant and rewards. */
export function regionalHerbSpec(profile={}){
 const name=String(profile.plant||'').toLowerCase();
 const id=/grass|flax|rye|fennel/.test(name)?'wind-grasses':/flower|violet|lavender|chamomile|clover|marigold/.test(name)?'bluebell-log':'meadow-shrubs';
 return environmentPropSpec(id,{width:42,height:id==='wind-grasses'?34:31});
}
function fauna(c,p,time,state){const k=p.fauna,night=(state.townLife?.minutes??480)>=1080||(state.townLife?.minutes??480)<360;
 if(k==='firefly'){for(let i=0;i<5;i++){const x=Math.sin(time*.55+i*2.2)*18,y=-22+Math.cos(time*.7+i)*12,a=night?.35+.6*Math.max(0,Math.sin(time*1.5+i)):.12;c.save();c.globalAlpha=a;if(night){const g=c.createRadialGradient(x,y,0,x,y,8);g.addColorStop(0,'#d6df8b80');g.addColorStop(1,'#d6df8b00');c.fillStyle=g;c.fillRect(x-8,y-8,16,16);}ellipse(c,x,y,1.2,1.4,night?'#e0e5ab':'#849575');c.restore();}return;}
 if(k==='moth'){c.save();c.translate(Math.sin(time*.7+p.chapter)*5,-27+Math.sin(time*1.3)*2);const flap=.38+Math.abs(Math.sin(time*6))*.62;c.scale(flap,1);for(const side of[-1,1]){ellipse(c,side*6,-2,7,9,gradient(c,-8,-10,14,15,'#bdb8a0','#8e8d77'),side*.5);ellipse(c,side*5,6,5,6,'#92927c',-side*.5);ellipse(c,side*7,-3,2.5,3,'#647a7a');ellipse(c,side*7,-3,1,1.4,'#bcb69a');}ellipse(c,0,1,1.4,8,'#515e52');line(c,[[0,-6],[-3,-11]],'#85937a',.6);line(c,[[0,-6],[3,-11]],'#85937a',.6);c.restore();return;}
 contact(c,k==='goat'?25:16,k==='goat'?6:4);
 if(k==='goat'){
  const fur=gradient(c,-21,-39,42,30,'#c0c3ad','#7a8372');for(const [x,y]of[[-13,-14],[11,-13],[-8,-14],[16,-14]]){poly(c,[[x-2,y],[x+2,y],[x+2,0],[x-1,0]],x<0?'#8b917c':'#949982');round(c,x-2,-2,5,3,1,'#4e5a4e');}ellipse(c,-2,-21,23,14,fur,-.04);c.fillStyle=fur;c.beginPath();c.moveTo(9,-23);c.quadraticCurveTo(8,-37,16,-42);c.quadraticCurveTo(29,-41,27,-32);c.lineTo(23,-25);c.lineTo(12,-17);c.fill();ellipse(c,25,-30,7,4,'#b9bca3');ellipse(c,26,-30,1.2,1.2,'#5d6959');ellipse(c,22,-36,1.2,1.4,'#283b32');line(c,[[13,-42],[10,-49],[7,-49],[7,-43]],'#8f927c',2.2);line(c,[[21,-43],[18,-51],[15,-50]],'#b1ad8c',2);ellipse(c,11,-38,7,2.5,'#a0aa90',-.3);line(c,[[-23,-24],[-27,-31]],'#afb39b',2.4);line(c,[[24,-25],[23,-20]],'#8b947d',2);for(let i=0;i<18;i++)line(c,[[-19+i*2,-25+(i%3)*2],[-16+i*2,-22+(i%3)*2]],'#e1dfc633',.7);return;
 }
 const duck=k==='duck',hen=k==='hen',sparrow=!duck&&!hen,col=duck?'#aebdab':hen?'#b39165':'#928c74',sz=duck?.74:hen?.64:.37;c.save();c.scale(sz,sz);const headTurn=Math.sin(time*.37+p.chapter)>.8?-1:1;if(headTurn<0)c.scale(-1,1);
 for(const x of[-5,5]){line(c,[[x,-9],[x-1,-1],[x+4,0]],duck?'#aa9660':'#8f8f67',1.1);line(c,[[x-1,-1],[x-4,1]],'#8b8c66',.7);}ellipse(c,0,-17,17,11,gradient(c,-16,-28,32,20,duck?'#d4d8bb':'#bdad89',col),-.12);poly(c,[[-12,-18],[-25,-27],[-22,-16],[-12,-11]],hen?'#657b70':sparrow?'#6f7566':'#738878');ellipse(c,-3,-18,11,7,duck?'#8faaa1':hen?'#977e58':'#7c806c',-.18);for(let i=0;i<6;i++)line(c,[[-11+i*3,-21],[-7+i*3,-14]],'#dfd7b04d',.7);ellipse(c,11,-29,7,8,duck?'#527e72':col);ellipse(c,12,-27,5,4,duck?'#638e7a':'#b7aa86');poly(c,[[16,-29],[24,-27],[16,-25]],'#bfa16b');ellipse(c,13,-31,1.3,1.5,'#253b31');ellipse(c,13.4,-31.5,.35,.45,'#e0dec0');if(hen){ellipse(c,10,-37,4,2.5,'#9c6251');ellipse(c,15,-23,1.8,3,'#a57058');}if(duck){line(c,[[5,-26],[13,-25]],'#c8cdb0',1.2);ellipse(c,-14,-17,4,4,'#d6d9bf');}c.restore();
}
export function drawRegional(c,o,time,state,options={}){const p=o.profile;if(!p)return;const x=(o.xy[0]+.5)*48,y=(o.xy[1]+.5)*48;c.save();c.translate(x,y);c.lineCap='round';c.lineJoin='round';if(o.lifeKind==='herb'){if(!drawRegionalProp({ctx:c,assets:options.assets},regionalHerbSpec(p),0,0)){c.scale(.84,.84);herb(c,p,time);}}else if(o.lifeKind==='project'){contact(c,31,7);craft(c,p,state.regionalLife?.projects?.includes(p.chapter),time);}else{c.scale(.86,.86);c.globalAlpha*=.92;fauna(c,p,time,state);}c.restore();}
