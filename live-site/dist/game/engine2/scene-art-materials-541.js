/** Authored material families for the native world. A small, bounded atlas
 * cache supplies the same painted surfaces to WebGL and the phone renderer. */
import {isInteriorScene} from './scene-identity.js';
import {environmentFor} from './environment.js';

const TILE=512,MAX_ATLASES=3,TAU=Math.PI*2;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const css=(c,a=1)=>`rgba(${c.map(v=>Math.round(Math.max(0,Math.min(1,v))*255)).join(',')},${a})`;
const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(1,v*n)));
const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const random=seed=>{let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};};
// floor recipe, floor, wall, metal, geological rock, accent, foliage
const OUTDOORS={
 village:['meadow','#929b70','#c4b994','#a0794e','#53696a','#d7ad69','#47725a'],
 woodland:['meadow','#718963','#a4ad91','#8c7e60','#42616a','#b7c892','#315e50'],
 riverbank:['loam','#91a18e','#c0c3aa','#7d9d91','#426b75','#86c7bf','#477963'],
 highland:['mineral','#a3b4ac','#bdc8bd','#9c9d86','#526f7e','#bdd6c6','#667e67'],
 ruins:['flagstone','#aaaab0','#bdb5ac','#8c7a83','#5b6579','#b5afd0','#697e71'],
 foundry:['industrial','#939084','#b7a98b','#b5824d','#53656c','#e1af72','#69816d'],
 storm:['mineral','#8ba5a3','#bfbdab','#b9844c','#355d70','#79bcb4','#5f7f6b'],
 salt:['crust','#c4c8b5','#ded7bc','#a5936b','#61787e','#c2d8c6','#718e75'],
 coral:['loam','#bbc9af','#dfc5b4','#b59d71','#527e82','#efb99f','#528f7d'],
 mangrove:['loam','#8e9f80','#b6b9a2','#839a7a','#3f6971','#93c7a8','#366b52'],
 sand:['sand','#c7b386','#d9c89e','#b28a50','#7b7464','#d7b989','#8f9364'],
 cactus:['sand','#b7b47e','#d2c59a','#a2874e','#727963','#d9b66a','#63815c'],
 ice:['ice','#bbcfd0','#d6dfd7','#98aaa7','#577b8e','#b1d9de','#6e968d'],
 aurora:['ice','#b0c7d0','#d1d9df','#9a9ea8','#596f89','#c4bde5','#7b9498'],
 lava:['mineral','#8b8177','#b7a898','#ab7957','#4b535c','#e4ac77','#776d58'],
 caldera:['mineral','#938678','#bdab91','#b78352','#575c62','#e7b586','#77715c'],
 spore:['meadow','#9da69c','#c9c7bb','#9d9386','#4c6d73','#bdcbb8','#4f8271'],
 crystal:['mineral','#abbfc1','#cbd8d1','#a6a995','#536e88','#badbd7','#73958e'],
 marble:['flagstone','#c4cbc3','#dad9c6','#b6a577','#667b89','#d2c8ac','#819888']
};
const INTERIORS={
 home:['timber','#b09268','#d0c4a5','#b38c56','#576b70','#a1b499','#66816b'],
 hospitality:['timber','#b28b65','#d2bda0','#bf965d','#617177','#b27366','#668876'],
 care:['ceramic','#bdcabc','#d8decc','#a7b896','#5e7b7d','#83b8a7','#609383'],
 craft:['timber','#b29570','#d2c1a0','#be8d55','#637171','#a6b99f','#718475'],
 archive:['archive','#aaa9b1','#d0c9b8','#b59c6c','#5e6d81','#b1a5c4','#75867a'],
 civic:['flagstone','#b8b9b0','#d8cfb6','#b19d6b','#657986','#aebca9','#6a8b77'],
 water:['ceramic','#a4bbb0','#c9d2bd','#9caf92','#4d7783','#81bdb4','#5a9382'],
 garden:['loam','#a7b291','#d4cfb5','#b1a178','#4f7078','#adc795','#5f8f71'],
 industrial:['industrial','#9b9e91','#bfc0aa','#b59c6c','#566c76','#a9bfaf','#748b79']
};
const ORIGINS={
 'sable-reed':{family:'reed',interior:'home',wall:'#cfbf9b',metal:'#b18b56',accent:'#a7bf9a',edge:'#d4ba87'},
 'iona-lowbank':{family:'waterline',interior:'care',wall:'#d4dbca',metal:'#b3a171',accent:'#8bc8c0',edge:'#d4c9a5'},
 'rook-regulator':{family:'furnace',interior:'industrial',wall:'#c2aa8f',metal:'#c18b55',accent:'#e2ad74',edge:'#d2b67e'},
 'brass-rail':{family:'rail',interior:'industrial',wall:'#acb8b6',metal:'#c2a169',accent:'#bc7462',edge:'#d2ba81'},
 'riven-tide':{family:'sluice',interior:'water',wall:'#c5c9b4',metal:'#91ab92',accent:'#85c5bb',edge:'#c4b88e'},
 'mira-archive':{family:'archive',interior:'archive',wall:'#d4c8b8',metal:'#bda16d',accent:'#b6a6cf',edge:'#d7c296'}
};
function interiorFamily(s){
 const text=[s.household?.kind,s.interior,s.key].join(' ');
 if(/security|reactor|console|engine|boiler|cargo|depot|hold|vent/.test(text))return'industrial';
 if(/archive|vault|register|witness|library/.test(text))return'archive';
 if(/clinic|washroom|physician|hospital\b/.test(text))return'care';
 if(/cistern|drain|pump|water/.test(text))return'water';
 if(/garden|nursery_green|greenhouse/.test(text))return'garden';
 if(/inn|mess|kitchen|waiting/.test(text))return'hospitality';
 if(/guild|chapel|sanctuary|council/.test(text))return'civic';
 if(/workshop|instrument|carpenter|assembly|tailor|optics|pottery|print|music|listening|store/.test(text))return'craft';
 return'home';
}
function definition(world){
 const s=world?.scene;if(!s||s.originId==='veyr-storm')return null;
 const indoor=isInteriorScene(s),env=environmentFor(s),rawStyle=(typeof env==='string'?env:env?.style)||'village',style=OUTDOORS[rawStyle]?rawStyle:'village';
 const origin=ORIGINS[s.originId],family=origin?.family||(indoor?interiorFamily(s):style);
 const base=(indoor?INTERIORS[origin?.interior||family]:OUTDOORS[style])||OUTDOORS.village;
 const [floorKind,floor,wall,metal,rock,accent,foliage]=base;
 return {id:origin?`${s.originId}:${indoor?'interior':'exterior'}`:`${indoor?'interior':'outdoor'}:${indoor?family:style}`,family,indoor,style,floorKind,
  hex:{floor,wall:origin?.wall||wall,metal:origin?.metal||metal,rock,accent:origin?.accent||accent,foliage,edge:origin?.edge||(indoor?'#d2bf92':'#c6bd91')}};
}
const SPECS=new Map();
export function sceneArtSpec(world){
 const d=definition(world);if(!d)return null;if(SPECS.has(d.id))return SPECS.get(d.id);
 const palette=Object.fromEntries(Object.entries(d.hex).map(([k,v])=>[k,Object.freeze(rgb(v))]));
 palette.dark=Object.freeze(mix(palette.rock,[.035,.065,.085],.65));palette.water=Object.freeze(mix(palette.rock,[.035,.17,.22],.52));
 const cold=/ice|aurora|crystal|riverbank|water/.test(d.style+' '+d.family),hot=/lava|caldera|furnace|foundry/.test(d.style+' '+d.family);
 const fog=d.indoor?mix(palette.rock,[.12,.16,.20],.70):mix(palette.rock,[.12,.22,.25],.58);
 const spec=Object.freeze({...d,palette:Object.freeze(palette),lighting:Object.freeze({
  ambient:Object.freeze(d.indoor?[.29,.32,.34]:cold?[.28,.34,.38]:[.29,.33,.33]),
  key:Object.freeze(hot?[.84,.66,.43]:cold?[.74,.75,.64]:[.83,.73,.52]),
  fog:Object.freeze(fog),fogDensity:d.indoor?.00045:.00011,
  sky:Object.freeze(d.indoor?['#19252b','#3e5155','#243b42']:cold?['#1d3746','#789caa','#456d7b']:hot?['#312f32','#a59b82','#3e5a60']:['#263d46','#95a8a2','#446d74'])
 })});SPECS.set(d.id,spec);return spec;
}

function polygon(ctx,points){ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.closePath();}
function stroke(ctx,points,color,width=1){ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function cloud(ctx,x,y,r,color,alpha=.12){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,css(color,alpha));g.addColorStop(.45,css(color,alpha*.50));g.addColorStop(1,css(color,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function broadPaint(ctx,base,rnd,{count=38,depth=.13}={}){
 ctx.fillStyle=css(base);ctx.fillRect(0,0,TILE,TILE);
 for(let i=0;i<count;i++){
  const x=rnd()*TILE,y=rnd()*TILE,r=26+rnd()*115,c=i%3?mix(base,[.10,.25,.28],.60):mix(base,[.94,.84,.61],.48);
  for(const ox of[-TILE,0,TILE])for(const oy of[-TILE,0,TILE])if(x+ox+r>0&&x+ox-r<TILE&&y+oy+r>0&&y+oy-r<TILE)cloud(ctx,x+ox,y+oy,r,c,depth);
 }
}
function clipHalf(poly,nx,ny,limit){const out=[];if(!poly.length)return out;let a=poly.at(-1),da=a[0]*nx+a[1]*ny-limit;for(const b of poly){const db=b[0]*nx+b[1]*ny-limit;if((da<=0)!==(db<=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}if(db<=0)out.push(b);a=b;da=db;}return out;}
function fittedPieces(rnd,columns=4,rows=3){
 const sites=[];for(let y=0;y<rows;y++)for(let x=0;x<columns;x++)sites.push([(x+.2+rnd()*.6)*TILE/columns,(y+.2+rnd()*.6)*TILE/rows]);
 const pieces=[];for(let id=0;id<sites.length;id++){
  const a=sites[id];let poly=[[-TILE,-TILE],[TILE*2,-TILE],[TILE*2,TILE*2],[-TILE,TILE*2]];
  for(let j=0;j<sites.length;j++)for(const ox of[-TILE,0,TILE])for(const oy of[-TILE,0,TILE]){if(id===j&&!ox&&!oy)continue;const x=sites[j][0]+ox,y=sites[j][1]+oy;poly=clipHalf(poly,x-a[0],y-a[1],(x*x+y*y-a[0]*a[0]-a[1]*a[1])/2);}
  for(const ox of[-TILE,0,TILE])for(const oy of[-TILE,0,TILE]){
   let p=poly.map(([x,y])=>[x+ox,y+oy]);for(const [nx,ny,d]of[[1,0,TILE],[-1,0,0],[0,1,TILE],[0,-1,0]])p=clipHalf(p,nx,ny,d);if(p.length>=3)pieces.push({id,points:p});
  }
 }return pieces;
}
function fittedStone(ctx,base,rnd,{rock=false,archive=false}={}){
 broadPaint(ctx,base,rnd,{count:25,depth:.12});const pieces=fittedPieces(rnd,rock?3:4,rock?2:4);
 for(const piece of pieces){
  polygon(ctx,piece.points);ctx.fillStyle=css(mix(base,piece.id%3?[.19,.34,.37]:[.95,.88,.73],rock?.11:.07));ctx.fill();
  ctx.save();ctx.clip();for(let i=0;i<4;i++)cloud(ctx,rnd()*TILE,rnd()*TILE,45+rnd()*100,i%2?mix(base,[.17,.31,.34],.8):[.95,.87,.70],rock?.09:.12);ctx.restore();
  for(let i=0;i<piece.points.length;i++)if((i+piece.id)%3!==1){const a=piece.points[i],b=piece.points[(i+1)%piece.points.length],t=.15+rnd()*.15,u=.65+rnd()*.22;stroke(ctx,[[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]],css(tint(base,.66),rock?.32:.25),rock?1.9:1.2);}
 }
 if(rock)for(let i=0;i<7;i++){const points=Array.from({length:15},(_,j)=>[-40+j*44,-120+i*112+j*7+Math.sin(j*.54+i)*20]);stroke(ctx,points,css(tint(base,.58),.17),4+i%3);stroke(ctx,points.map(([x,y])=>[x,y-2]),css(mix(base,[.88,.89,.74],.3),.22),1.2);}
 if(archive)for(let i=0;i<4;i++){const p=-70+i*167;stroke(ctx,Array.from({length:18},(_,j)=>[j*32,p+j*7+Math.sin(j*.5+i)*15]),css(mix(base,[.44,.36,.49],.5),.18),2.2);}
}
function organic(ctx,s,rnd,kind){
 const base=s.palette.floor;broadPaint(ctx,base,rnd,{count:48,depth:kind==='meadow'?.16:.11});
 if(kind==='meadow'){
  for(let i=0;i<60;i++){const x=rnd()*TILE,y=rnd()*TILE,w=10+rnd()*38,h=5+rnd()*14;polygon(ctx,[[x-w*.55,y],[x-w*.15,y-h],[x+w*.45,y-h*.7],[x+w*.6,y],[x+w*.16,y+h*.27]]);ctx.fillStyle=css(i%3?mix(base,s.palette.foliage,.48):mix(base,s.palette.edge,.35),.17);ctx.fill();}
  for(let i=0;i<22;i++){const x=rnd()*TILE,y=rnd()*TILE;stroke(ctx,[[x,y],[x+9,y-3],[x+25+rnd()*20,y-1]],css(mix(base,s.palette.foliage,.65),.19),2+rnd()*3);}
 }else if(kind==='loam'){
  for(let i=0;i<18;i++){const x=-20+rnd()*440,y=rnd()*TILE;stroke(ctx,[[x,y],[x+40,y+3],[x+79,y-4],[x+120,y-1]],css(i%2?mix(base,s.palette.rock,.45):mix(base,s.palette.edge,.5),.19),3+rnd()*5);}
  for(let i=0;i<20;i++){const x=rnd()*TILE,y=rnd()*TILE,r=4+rnd()*12;polygon(ctx,[[x-r,y],[x-r*.3,y-r*.6],[x+r*.8,y-r*.3],[x+r,y+r*.4],[x-r*.4,y+r*.5]]);ctx.fillStyle=css(mix(base,s.palette.rock,.6),.21);ctx.fill();}
 }else if(kind==='sand'){
  for(let i=-1;i<16;i++){const points=Array.from({length:18},(_,j)=>[-35+j*35,i*39+Math.sin(j*.56+i*.30)*10+j*3]);stroke(ctx,points,css(mix(base,s.palette.rock,.35),.16),3);stroke(ctx,points.map(([x,y])=>[x,y-3]),css(mix(base,[.97,.91,.73],.6),.30),2);}
 }else if(kind==='ice'){
  for(let i=0;i<14;i++){const x=rnd()*TILE,y=rnd()*TILE,len=80+rnd()*180,points=[[x-40,y-len*.3],[x,y],[x+21,y+len*.35],[x+15,y+len*.70]];stroke(ctx,points,css(mix(base,s.palette.rock,.6),.18),1.7);stroke(ctx,points.map(([x,y])=>[x+2,y]),css([.91,.98,.97],.32),1.2);}
  for(let i=0;i<16;i++)cloud(ctx,rnd()*TILE,rnd()*TILE,25+rnd()*65,[.94,.97,.89],.18);
 }else if(kind==='crust'){
  for(let i=0;i<20;i++){const x=rnd()*TILE,y=rnd()*TILE,r=12+rnd()*27;const pts=Array.from({length:7},(_,j)=>[x+Math.cos(j*TAU/7)*r,y+Math.sin(j*TAU/7)*r*.7]);stroke(ctx,pts,css(mix(base,s.palette.rock,.5),.17),1.3);}
 }
}
function timber(ctx,s,rnd){
 const base=s.palette.floor;broadPaint(ctx,base,rnd,{count:16,depth:.08});
 for(let i=0;i<8;i++){
  const x=i*64;ctx.fillStyle=css(mix(base,i%3?[.35,.20,.11]:[.88,.73,.48],.045));ctx.fillRect(x,0,64,TILE);
  stroke(ctx,[[x+1,0],[x+.4,180],[x+1.4,350],[x+.7,TILE]],css(tint(base,.56),.33),1.6);
  stroke(ctx,[[x+3,0],[x+3,TILE]],css(mix(base,[.97,.85,.58],.45),.18),1.3);
  const end=(i*79+97)%TILE;stroke(ctx,[[x+2,end],[x+62,end+1]],css(tint(base,.6),.24),1.2);
  for(let j=0;j<7;j++){const xx=x+8+rnd()*49,yy=-30+rnd()*TILE;stroke(ctx,[[xx,yy],[xx+Math.sin(j)*2,yy+70],[xx-2,yy+150],[xx,yy+230]],css(j%2?mix(base,[.28,.16,.1],.65):mix(base,[.91,.79,.55],.65),.12),.8+rnd()*1.2);}
  for(const y of[end+7,end-7]){ctx.fillStyle=css(tint(base,.54),.32);ctx.fillRect(x+9,y,2,2);ctx.fillRect(x+53,y,2,2);}
 }
}
function ceramic(ctx,s,rnd){
 const base=s.palette.floor;broadPaint(ctx,base,rnd,{count:18,depth:.07});
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  const x=col*128,y=row*128;ctx.fillStyle=css(mix(base,(row+col)%3?s.palette.wall:s.palette.accent,.04));ctx.fillRect(x+1,y+1,126,126);
  stroke(ctx,[[x+1,y+126],[x+1,y+1],[x+126,y+1]],css(tint(base,.72),.3),1.6);stroke(ctx,[[x+4,y+124],[x+124,y+124],[x+124,y+4]],css(mix(base,[.96,.97,.83],.5),.25),1.2);
  cloud(ctx,x+48,y+43,85,s.palette.accent,.1);
  if((row+col)%3===0){stroke(ctx,[[x+15,y+35],[x+15,y+15],[x+35,y+15]],css(mix(base,s.palette.accent,.8),.22),2.4);}
 }
}
function industrial(ctx,s,rnd){
 fittedStone(ctx,s.palette.floor,rnd);
 for(let i=0;i<16;i++){const x=rnd()*TILE,y=rnd()*TILE;stroke(ctx,[[x,y],[x+18,y-3],[x+45+rnd()*45,y-1]],css(mix(s.palette.floor,s.palette.metal,.45),.24),3+rnd()*3);}
 for(let i=0;i<8;i++)cloud(ctx,rnd()*TILE,rnd()*TILE,20+rnd()*48,s.palette.dark,.15);
}
function walls(ctx,s,rnd){
 const base=s.palette.wall;broadPaint(ctx,base,rnd,{count:36,depth:.09});
 if(s.indoor&&['home','hospitality','reed','craft'].includes(s.family)){
  const wood=mix(s.palette.floor,s.palette.metal,.15);ctx.fillStyle=css(wood,.38);ctx.fillRect(0,350,TILE,162);
  for(let i=0;i<8;i++)stroke(ctx,[[i*64,352],[i*64,TILE]],css(tint(wood,.56),.35),2);
  for(const x of[0,256]){ctx.fillStyle=css(tint(wood,.86));ctx.fillRect(x,0,8,TILE);stroke(ctx,[[x+8,0],[x+8,TILE]],css(s.palette.edge,.7),1.1);}
  for(const y of[348,360])stroke(ctx,[[0,y],[TILE,y]],css(y===348?s.palette.edge:tint(wood,.62),.65),y===348?5:2);
 }else{
  const heights=s.family==='industrial'||s.family==='furnace'?[77,81,86,85,91,92]:[118,132,124,138];let y=0,row=0;
  for(const h of heights){let x=row%2?-74:0;while(x<TILE){const w=144+rnd()*88;ctx.fillStyle=css(mix(base,row%3?s.palette.rock:s.palette.edge,.035));ctx.fillRect(x+1,y+1,w-2,h-2);stroke(ctx,[[x+1,y+h-1],[x+1,y+1],[x+w-1,y+1]],css(tint(base,.74),.28),1.15);stroke(ctx,[[x+2,y+h-2],[x+w-2,y+h-2]],css(mix(base,[.98,.94,.78],.35),.20),1);cloud(ctx,x+w*.5,y+h*.5,Math.min(w,h)*.7,s.palette.accent,.07);x+=w;}y+=h;row++;}
 }
}
function metal(ctx,s,rnd){
 const base=s.palette.metal;ctx.fillStyle=css(tint(base,.72));ctx.fillRect(0,0,TILE,TILE);
 for(let row=0;row<2;row++)for(let col=0;col<4;col++){
  const x=col*128+2,y=row*256+2,w=124,h=252,g=ctx.createLinearGradient(x,y,x+w,y+h*.1);
  for(const [at,c]of[[0,tint(base,.64)],[.13,base],[.43,mix(base,[.96,.86,.62],.30)],[.76,base],[1,tint(base,.70)]])g.addColorStop(at,css(c));ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
  const patina=mix(s.palette.accent,s.palette.rock,.55);for(let i=0;i<4;i++)cloud(ctx,x+82+rnd()*35,y+rnd()*h,16+rnd()*37,patina,.21);
  stroke(ctx,[[x,y+h],[x,y],[x+w,y]],css(mix(base,[.99,.88,.65],.55),.6),1.3);stroke(ctx,[[x+w,y],[x+w,y+h],[x,y+h]],css(s.palette.dark,.55),2);
  for(const xx of[x+9,x+w-9])for(const yy of[y+12,y+h-12]){ctx.beginPath();ctx.arc(xx,yy,2.4,0,TAU);ctx.fillStyle=css(s.palette.dark,.7);ctx.fill();ctx.fillStyle=css(s.palette.edge,.8);ctx.fillRect(xx-1,yy-1,1.7,1.3);}
  for(let i=0;i<8;i++){const xx=x+10+rnd()*99,yy=y+15+rnd()*218;stroke(ctx,[[xx,yy],[xx+9+rnd()*20,yy-1]],css(s.palette.edge,.22),.9);}
 }
}
function floor(ctx,s,rnd){
 const kind=s.floorKind;
 if(kind==='timber')timber(ctx,s,rnd);else if(kind==='ceramic')ceramic(ctx,s,rnd);else if(kind==='industrial')industrial(ctx,s,rnd);else if(kind==='flagstone'||kind==='archive'||kind==='mineral')fittedStone(ctx,s.palette.floor,rnd,{rock:kind==='mineral',archive:kind==='archive'});else organic(ctx,s,rnd,kind);
}

// Calibrated from this painter with the offline Canvas implementation. Runtime
// rendering never reads GPU pixels or invokes a synchronous canvas readback.
const MATERIAL_AVERAGES={
 "outdoor:village": [
  [
   0.5388,
   0.581,
   0.4302
  ],
  [
   0.7614,
   0.7178,
   0.5743
  ],
  [
   0.5934,
   0.4658,
   0.3101
  ],
  [
   0.3392,
   0.4232,
   0.4238
  ]
 ],
 "outdoor:woodland": [
  [
   0.4301,
   0.5215,
   0.3854
  ],
  [
   0.64,
   0.6762,
   0.5661
  ],
  [
   0.5296,
   0.4817,
   0.3667
  ],
  [
   0.2847,
   0.3996,
   0.4261
  ]
 ],
 "outdoor:riverbank": [
  [
   0.5422,
   0.6084,
   0.5387
  ],
  [
   0.7398,
   0.758,
   0.6613
  ],
  [
   0.4814,
   0.5774,
   0.5197
  ],
  [
   0.2798,
   0.431,
   0.4625
  ]
 ],
 "outdoor:highland": [
  [
   0.6069,
   0.6776,
   0.6462
  ],
  [
   0.7325,
   0.7789,
   0.7335
  ],
  [
   0.5805,
   0.5782,
   0.4862
  ],
  [
   0.336,
   0.4431,
   0.494
  ]
 ],
 "outdoor:ruins": [
  [
   0.6531,
   0.6583,
   0.6742
  ],
  [
   0.7342,
   0.7027,
   0.6707
  ],
  [
   0.5313,
   0.4675,
   0.477
  ],
  [
   0.3691,
   0.4113,
   0.4749
  ]
 ],
 "outdoor:foundry": [
  [
   0.5641,
   0.5592,
   0.512
  ],
  [
   0.7164,
   0.6602,
   0.5402
  ],
  [
   0.6586,
   0.4929,
   0.3064
  ],
  [
   0.3404,
   0.41,
   0.4297
  ]
 ],
 "outdoor:storm": [
  [
   0.5336,
   0.6308,
   0.6188
  ],
  [
   0.7333,
   0.7345,
   0.6647
  ],
  [
   0.663,
   0.4985,
   0.3083
  ],
  [
   0.2361,
   0.3815,
   0.4436
  ]
 ],
 "outdoor:salt": [
  [
   0.7333,
   0.7531,
   0.6817
  ],
  [
   0.8577,
   0.8345,
   0.7297
  ],
  [
   0.6099,
   0.5484,
   0.403
  ],
  [
   0.3853,
   0.4714,
   0.4921
  ]
 ],
 "outdoor:coral": [
  [
   0.7004,
   0.7572,
   0.6614
  ],
  [
   0.8632,
   0.7665,
   0.6973
  ],
  [
   0.6592,
   0.578,
   0.4207
  ],
  [
   0.3345,
   0.4962,
   0.5051
  ]
 ],
 "outdoor:mangrove": [
  [
   0.5405,
   0.6085,
   0.493
  ],
  [
   0.7043,
   0.7202,
   0.6295
  ],
  [
   0.5004,
   0.5685,
   0.4477
  ],
  [
   0.2739,
   0.4262,
   0.4489
  ]
 ],
 "outdoor:sand": [
  [
   0.7474,
   0.6818,
   0.5146
  ],
  [
   0.842,
   0.7764,
   0.6137
  ],
  [
   0.6517,
   0.5181,
   0.3153
  ],
  [
   0.482,
   0.465,
   0.4029
  ]
 ],
 "outdoor:cactus": [
  [
   0.6894,
   0.6841,
   0.4885
  ],
  [
   0.8173,
   0.7643,
   0.595
  ],
  [
   0.6022,
   0.509,
   0.3091
  ],
  [
   0.4415,
   0.4741,
   0.3958
  ]
 ],
 "outdoor:ice": [
  [
   0.704,
   0.7812,
   0.7779
  ],
  [
   0.8251,
   0.8654,
   0.8328
  ],
  [
   0.5681,
   0.6195,
   0.5902
  ],
  [
   0.3477,
   0.4813,
   0.5451
  ]
 ],
 "outdoor:aurora": [
  [
   0.6716,
   0.7587,
   0.7828
  ],
  [
   0.8099,
   0.8374,
   0.8624
  ],
  [
   0.5749,
   0.5795,
   0.5925
  ],
  [
   0.359,
   0.441,
   0.5275
  ]
 ],
 "outdoor:lava": [
  [
   0.529,
   0.5031,
   0.4656
  ],
  [
   0.7147,
   0.6544,
   0.5884
  ],
  [
   0.6271,
   0.4628,
   0.3354
  ],
  [
   0.3143,
   0.3496,
   0.3752
  ]
 ],
 "outdoor:caldera": [
  [
   0.5591,
   0.5241,
   0.4709
  ],
  [
   0.7363,
   0.6668,
   0.5636
  ],
  [
   0.6657,
   0.4951,
   0.3216
  ],
  [
   0.3526,
   0.3777,
   0.3965
  ]
 ],
 "outdoor:spore": [
  [
   0.5857,
   0.6255,
   0.5856
  ],
  [
   0.7783,
   0.7741,
   0.7245
  ],
  [
   0.5823,
   0.5468,
   0.4844
  ],
  [
   0.3146,
   0.4387,
   0.4547
  ]
 ],
 "outdoor:crystal": [
  [
   0.6492,
   0.7253,
   0.7247
  ],
  [
   0.7857,
   0.8367,
   0.8096
  ],
  [
   0.6114,
   0.6146,
   0.5341
  ],
  [
   0.3429,
   0.4427,
   0.526
  ]
 ],
 "outdoor:marble": [
  [
   0.7467,
   0.7756,
   0.743
  ],
  [
   0.8434,
   0.8407,
   0.7654
  ],
  [
   0.6622,
   0.6028,
   0.4399
  ],
  [
   0.4048,
   0.486,
   0.5288
  ]
 ],
 "interior:home": [
  [
   0.6812,
   0.5639,
   0.4008
  ],
  [
   0.7714,
   0.7199,
   0.5943
  ],
  [
   0.65,
   0.5241,
   0.3361
  ],
  [
   0.3587,
   0.4349,
   0.4458
  ]
 ],
 "interior:hospitality": [
  [
   0.6889,
   0.5367,
   0.3891
  ],
  [
   0.7725,
   0.6901,
   0.5753
  ],
  [
   0.6888,
   0.5525,
   0.356
  ],
  [
   0.3839,
   0.4474,
   0.4646
  ]
 ],
 "interior:care": [
  [
   0.7317,
   0.7887,
   0.734
  ],
  [
   0.8322,
   0.8586,
   0.7864
  ],
  [
   0.6118,
   0.6607,
   0.5336
  ],
  [
   0.3762,
   0.485,
   0.4897
  ]
 ],
 "interior:craft": [
  [
   0.689,
   0.5757,
   0.428
  ],
  [
   0.7805,
   0.712,
   0.5829
  ],
  [
   0.6848,
   0.5283,
   0.3341
  ],
  [
   0.3923,
   0.4496,
   0.4466
  ]
 ],
 "interior:archive": [
  [
   0.6513,
   0.6531,
   0.678
  ],
  [
   0.8042,
   0.7785,
   0.7159
  ],
  [
   0.6568,
   0.5721,
   0.4083
  ],
  [
   0.3789,
   0.4404,
   0.5024
  ]
 ],
 "interior:civic": [
  [
   0.7009,
   0.709,
   0.6736
  ],
  [
   0.8349,
   0.8013,
   0.7061
  ],
  [
   0.6452,
   0.5782,
   0.4033
  ],
  [
   0.4001,
   0.4767,
   0.5195
  ]
 ],
 "interior:water": [
  [
   0.6387,
   0.7346,
   0.692
  ],
  [
   0.7744,
   0.8129,
   0.7321
  ],
  [
   0.5767,
   0.6315,
   0.523
  ],
  [
   0.3195,
   0.4712,
   0.5093
  ]
 ],
 "interior:garden": [
  [
   0.6175,
   0.6659,
   0.547
  ],
  [
   0.8176,
   0.8025,
   0.7007
  ],
  [
   0.6434,
   0.5888,
   0.4396
  ],
  [
   0.3334,
   0.4513,
   0.473
  ]
 ],
 "interior:industrial": [
  [
   0.5969,
   0.6115,
   0.5596
  ],
  [
   0.7374,
   0.7436,
   0.6592
  ],
  [
   0.6564,
   0.5734,
   0.4057
  ],
  [
   0.3544,
   0.4386,
   0.4649
  ]
 ],
 "sable-reed:exterior": [
  [
   0.5533,
   0.5917,
   0.4357
  ],
  [
   0.8,
   0.7423,
   0.6013
  ],
  [
   0.6432,
   0.5209,
   0.3363
  ],
  [
   0.3458,
   0.428,
   0.4268
  ]
 ],
 "sable-reed:interior": [
  [
   0.6811,
   0.5638,
   0.4007
  ],
  [
   0.7667,
   0.7041,
   0.562
  ],
  [
   0.6432,
   0.5211,
   0.3369
  ],
  [
   0.3513,
   0.4296,
   0.4423
  ]
 ],
 "iona-lowbank:exterior": [
  [
   0.5459,
   0.611,
   0.5402
  ],
  [
   0.8149,
   0.8464,
   0.7829
  ],
  [
   0.6466,
   0.5897,
   0.4231
  ],
  [
   0.2768,
   0.4287,
   0.461
  ]
 ],
 "iona-lowbank:interior": [
  [
   0.7324,
   0.7927,
   0.7395
  ],
  [
   0.8172,
   0.8485,
   0.783
  ],
  [
   0.6483,
   0.59,
   0.4224
  ],
  [
   0.3733,
   0.4828,
   0.4881
  ]
 ],
 "rook-regulator:exterior": [
  [
   0.5662,
   0.5605,
   0.5127
  ],
  [
   0.7523,
   0.6605,
   0.5547
  ],
  [
   0.6953,
   0.5191,
   0.33
  ],
  [
   0.34,
   0.4098,
   0.4295
  ]
 ],
 "rook-regulator:interior": [
  [
   0.5968,
   0.6116,
   0.56
  ],
  [
   0.7523,
   0.6605,
   0.5546
  ],
  [
   0.696,
   0.5207,
   0.332
  ],
  [
   0.3509,
   0.436,
   0.4633
  ]
 ],
 "brass-rail:exterior": [
  [
   0.5647,
   0.5594,
   0.5123
  ],
  [
   0.6709,
   0.7097,
   0.6969
  ],
  [
   0.696,
   0.584,
   0.392
  ],
  [
   0.3403,
   0.41,
   0.4296
  ]
 ],
 "brass-rail:interior": [
  [
   0.595,
   0.6103,
   0.5592
  ],
  [
   0.6709,
   0.7091,
   0.6982
  ],
  [
   0.6959,
   0.5843,
   0.393
  ],
  [
   0.3508,
   0.436,
   0.463
  ]
 ],
 "riven-tide:exterior": [
  [
   0.5558,
   0.6186,
   0.5452
  ],
  [
   0.7571,
   0.7794,
   0.6998
  ],
  [
   0.5438,
   0.6193,
   0.5217
  ],
  [
   0.2827,
   0.4329,
   0.4637
  ]
 ],
 "riven-tide:interior": [
  [
   0.6388,
   0.7362,
   0.6907
  ],
  [
   0.7592,
   0.7793,
   0.6997
  ],
  [
   0.5445,
   0.6203,
   0.523
  ],
  [
   0.3163,
   0.4691,
   0.5081
  ]
 ],
 "mira-archive:exterior": [
  [
   0.5305,
   0.5751,
   0.4267
  ],
  [
   0.8184,
   0.775,
   0.7147
  ],
  [
   0.681,
   0.587,
   0.4089
  ],
  [
   0.3429,
   0.426,
   0.4254
  ]
 ],
 "mira-archive:interior": [
  [
   0.6509,
   0.6528,
   0.6786
  ],
  [
   0.8206,
   0.7755,
   0.7165
  ],
  [
   0.682,
   0.5878,
   0.411
  ],
  [
   0.3783,
   0.4401,
   0.5019
  ]
 ]
};
const defaultCache=new Map(),factoryCaches=new WeakMap();
function nativeCanvas(width,height){let c;if(typeof document!=='undefined')c=document.createElement('canvas');else if(typeof OffscreenCanvas==='function')c=new OffscreenCanvas(width,height);else return null;c.width=width;c.height=height;return c;}
export function createSceneArtAtlas(world,assets={}, {createCanvas}={}){
 const spec=sceneArtSpec(world);if(!spec)return null;
 let cache=defaultCache;if(createCanvas){cache=factoryCaches.get(createCanvas);if(!cache){cache=new Map();factoryCaches.set(createCanvas,cache);}}
 if(cache.has(spec.id)){const old=cache.get(spec.id);cache.delete(spec.id);cache.set(spec.id,old);return old;}
 const canvas=(createCanvas||nativeCanvas)(1024,1024);if(!canvas)return null;const ctx=canvas.getContext?.('2d');if(!ctx)return null;canvas.width=canvas.height=1024;
 const averages=MATERIAL_AVERAGES[spec.id]||[spec.palette.floor,spec.palette.wall,spec.palette.metal,spec.palette.rock];
 canvas.observatoryMaterialAverages=Object.freeze(averages.map(c=>Object.freeze(c.slice())));canvas.sceneArtMaterialAverages=canvas.observatoryMaterialAverages;canvas.sceneArtTheme=spec.id;
 const rnd=random(hash(spec.id)^0x541a17);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=true;ctx.lineJoin='round';ctx.lineCap='round';
 for(const [id,x,y]of[['floor',0,0],['wall',TILE,0],['metal',0,TILE],['rock',TILE,TILE]]){
  ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.rect(0,0,TILE,TILE);ctx.clip();
  if(id==='floor')floor(ctx,spec,rnd);else if(id==='wall')walls(ctx,spec,rnd);else if(id==='metal')metal(ctx,spec,rnd);else fittedStone(ctx,spec.palette.rock,rnd,{rock:true});ctx.restore();
 }
 ctx.restore();cache.set(spec.id,canvas);while(cache.size>MAX_ATLASES)cache.delete(cache.keys().next().value);return canvas;
}
export const SCENE_ART_MATERIALS=Object.freeze({schema:'ash-aether.scene-art-materials/1',width:1024,height:1024,tileSize:TILE,maxCachedAtlases:MAX_ATLASES,rgbaBytesPerAtlas:4*1024*1024,quadrants:Object.freeze(['floor','wall','metal','rock'])});
/** Canonical native identities used by offline material calibration and QA. */
export const SCENE_ART_THEME_SAMPLES=Object.freeze([
 ...Object.keys(OUTDOORS).map(style=>Object.freeze({scene:Object.freeze({key:'field',biome:Object.freeze({style})})})),
 ...Object.keys(INTERIORS).map(family=>Object.freeze({scene:Object.freeze({key:({home:'home',hospitality:'inn',care:'clinic',craft:'workshop',archive:'archive',civic:'chapel',water:'cistern',garden:'garden',industrial:'reactor'})[family],interior:family,household:Object.freeze({kind:family})})})),
 ...Object.keys(ORIGINS).flatMap(originId=>[false,true].map(originIndoor=>Object.freeze({scene:Object.freeze({originId,originIndoor,key:'origin_'+originId,household:originIndoor?Object.freeze({kind:ORIGINS[originId].interior}):undefined})})))
]);
