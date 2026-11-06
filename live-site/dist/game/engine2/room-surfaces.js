/** Material units are in world pixels: an adult is 60px high, a board about 14px wide.
 * Cached material tiles avoid the stretched photographic floor and 48px board grid.
 */
const cache=new Map();
export function surfaceSpec(kind){
 if(['clinic','cistern','chapel'].includes(kind))return {kind:'stone',width:64,height:40,palette:kind==='cistern'?['#65777a','#718184','#56696e']:kind==='clinic'?['#8c998b','#98a394','#7f8e82']:['#78747b','#89828a','#696670']};
 if(['workshop','optics','pottery','cargo'].includes(kind))return {kind:'wood',width:168,height:18,palette:['#79654b','#806c51','#705f48']};
 if(['archive','guild','listening','music'].includes(kind))return {kind:'wood',width:144,height:14,palette:['#79644e','#816c53','#6f5d4a']};
 return {kind:'wood',width:132,height:15,palette:['#8c6c50','#967355','#7e614a']};
}
export function surfacePattern(c,kind){
 const spec=surfaceSpec(kind),key=kind+':v2';
 if(!cache.has(key)){
  const a=document.createElement('canvas');a.width=768;a.height=720;const g=a.getContext('2d');
  let seed=971;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  g.fillStyle=spec.palette[2];g.fillRect(0,0,a.width,a.height);
  for(let row=0,y=0;y<a.height;row++,y+=spec.height){
   const shift=(row%3)*spec.width/3;
   for(let x=-spec.width-shift;x<a.width;x+=spec.width){
    const w=spec.width,h=spec.height;
    g.fillStyle=spec.palette[Math.floor(random()*spec.palette.length)];g.fillRect(x,y,w-1,h-1);
    g.fillStyle=spec.kind==='stone'?'#f0eada0d':'#f0d4a410';g.fillRect(x+1,y+1,w-3,1);
    g.fillStyle='#1b211d25';g.fillRect(x,y+h-1,w,1);g.fillRect(x+w-1,y,1,h);
    if(spec.kind==='wood'){
     for(let i=0;i<4;i++){const yy=y+3+random()*(h-5);g.strokeStyle=i%2?'#221e1820':'#e6c18f15';g.lineWidth=.5;g.beginPath();g.moveTo(x+3,yy);g.bezierCurveTo(x+w*.3,yy-1.5,x+w*.65,yy+1.5,x+w-4,yy);g.stroke();}
     if(random()<.25){g.strokeStyle='#32291d40';g.beginPath();g.ellipse(x+w*(.2+random()*.6),y+h*.5,5,1.5,0,0,Math.PI*2);g.stroke();}
    }else{
     for(let i=0;i<10;i++){g.fillStyle=i%2?'#e9e4cc09':'#2b333412';g.fillRect(x+random()*w,y+random()*h,1+random()*3,1);}
    }
   }
  }
  cache.set(key,a);
 }
 return c.createPattern(cache.get(key),'repeat');
}
/** Molded edges and broad floor shading tie the room to its walls without obscuring play. */
export function paintRoomAtmosphere(c,scene,walk,box){
 const T=48,width=(box.right-box.left+1)*T,height=(box.bottom-box.top+1)*T;
 const sweep=c.createLinearGradient(box.left*T,box.top*T,(box.right+1)*T,(box.bottom+1)*T);sweep.addColorStop(0,'#fff1cf11');sweep.addColorStop(.45,'#fff1cf00');sweep.addColorStop(1,'#14233026');c.fillStyle=sweep;c.fillRect(box.left*T,box.top*T,width,height);
 for(let y=box.top;y<=box.bottom;y++)for(let x=box.left;x<=box.right;x++)if(walk(x,y)&&!walk(x,y-1)){
  const g=c.createLinearGradient(0,y*T,0,y*T+58);g.addColorStop(0,'#111a243d');g.addColorStop(.18,'#111a241b');g.addColorStop(1,'#111a2400');c.fillStyle=g;c.fillRect(x*T,y*T,T,58);
 }
}


/** Floor accents belong to a real activity group, never to random empty cells. */
export function roomFloorAccents(scene){
 const h=scene?.household;if(!h)return [];
 const industrial=['workshop','cistern','carpenter','pottery','instrumentworks','optics','cargo','store','printshop'].includes(h.kind);
 const accents=[];
 for(const o of h.furnishings||[]){
  const b=o.footprint;if(!b||![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<=0||b.h<=0)continue;
  if([3,4].includes(o.furniture)&&!o.visual){accents.push({kind:'hearth',x:(b.x-.12)*48,y:(b.y+b.h-.5)*48,w:(b.w+.24)*48,h:40});continue;}
  if(industrial||!['dining','sleeping','reading','hydrophone'].includes(o.visual))continue;
  const color=o.visual==='sleeping'?'#5b7177':o.visual==='reading'?'#69755d':'#8c6052';
  accents.push({kind:'woven',x:(b.x-.22)*48,y:(b.y+.25)*48,w:(b.w+.44)*48,h:(b.h+.12)*48,color,trim:'#c4ad7b',visual:o.visual});
 }
 return accents.slice(0,7);
}

/** Direct, readback-free material paint for the compatibility renderer. */
export function paintDirectRoomSurface(c,kind,box,view=null){
 const spec=surfaceSpec(kind),left=box.left*48,top=box.top*48,right=(box.right+1)*48,bottom=(box.bottom+1)*48;
 const minX=Math.max(left,(view?.x0??box.left)*48-160),maxX=Math.min(right,(view?.x1??box.right+1)*48+160),minY=Math.max(top,(view?.y0??box.top)*48-64),maxY=Math.min(bottom,(view?.y1??box.bottom+1)*48+64);
 c.fillStyle=spec.palette[2];c.fillRect(left,top,right-left,bottom-top);
 const yStart=Math.floor(minY/spec.height)*spec.height;
 for(let y=yStart;y<maxY;y+=spec.height){
  const row=Math.floor(y/spec.height),shift=((row%3+3)%3)*spec.width/3,xStart=Math.floor((minX-shift)/spec.width)*spec.width+shift;
  for(let x=xStart;x<maxX;x+=spec.width){
   const n=((Math.imul(Math.floor(x)+971,374761393)^Math.imul(row+317,668265263))>>>0);
   c.fillStyle=spec.palette[n%spec.palette.length];c.fillRect(x,y,spec.width-.6,spec.height-.6);
   c.fillStyle=spec.kind==='stone'?'#f1ecd614':'#eed2a712';c.fillRect(x+1,y+1,spec.width-3,1);
   c.fillStyle='#161c2024';c.fillRect(x,y+spec.height-1,spec.width,1);c.fillRect(x+spec.width-1,y,1,spec.height);
   if(spec.kind==='wood'){
    c.lineWidth=.6;c.strokeStyle='#37291d23';c.beginPath();const yy=y+4+(n%7);c.moveTo(x+8,yy);c.bezierCurveTo(x+spec.width*.32,yy-1,x+spec.width*.63,yy+1,x+spec.width-8,yy);c.stroke();
    if(n%7===0){c.strokeStyle='#37291d35';c.beginPath();c.ellipse(x+spec.width*.63,y+spec.height*.58,4,1.3,0,0,Math.PI*2);c.stroke();}
   }else{
    c.fillStyle='#e9e5cd0b';c.fillRect(x+8+(n%17),y+8,spec.width*.35,1);c.fillStyle='#26353a0c';c.fillRect(x+15,y+spec.height-7,spec.width*.4,1);
   }
  }
 }
}

export function paintRoomFloorAccents(c,scene){
 for(const a of roomFloorAccents(scene)){
  c.save();
  if(a.kind==='hearth'){
   c.fillStyle='#555354';c.fillRect(a.x,a.y,a.w,a.h);c.strokeStyle='#ad9e8377';c.lineWidth=1;c.strokeRect(a.x+2,a.y+2,a.w-4,a.h-4);c.strokeStyle='#222d3155';c.beginPath();c.moveTo(a.x+a.w*.5,a.y+3);c.lineTo(a.x+a.w*.5,a.y+a.h-3);c.stroke();
  }else{
   c.globalAlpha=.82;c.fillStyle='#18242a55';c.fillRect(a.x+2,a.y+3,a.w,a.h);c.fillStyle=a.color;c.fillRect(a.x,a.y,a.w,a.h);c.strokeStyle=a.trim;c.globalAlpha=.42;c.lineWidth=2;c.strokeRect(a.x+5,a.y+5,a.w-10,a.h-10);c.lineWidth=.65;
   for(let y=a.y+10;y<a.y+a.h-7;y+=5){c.strokeStyle='#e6d1a31a';c.beginPath();c.moveTo(a.x+7,y);c.lineTo(a.x+a.w-7,y);c.stroke();}
   c.strokeStyle=a.trim;c.lineWidth=1;for(let x=a.x+8;x<a.x+a.w-6;x+=11){c.beginPath();c.moveTo(x,a.y-3);c.lineTo(x,a.y+2);c.moveTo(x,a.y+a.h-2);c.lineTo(x,a.y+a.h+3);c.stroke();}
   for(const [x,y]of [[a.x+13,a.y+13],[a.x+a.w-13,a.y+13],[a.x+13,a.y+a.h-13],[a.x+a.w-13,a.y+a.h-13]]){c.beginPath();c.moveTo(x,y-4);c.lineTo(x+4,y);c.lineTo(x,y+4);c.lineTo(x-4,y);c.closePath();c.stroke();}
  }
  c.restore();
 }
}
