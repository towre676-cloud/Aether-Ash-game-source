const T=48;
/** Painted material is sampled directly, including in compatibility mode. */
export function paintMaterialGrain(c,scene,image,{view=null,alpha=.26}={}){
 const h=scene.household;if(!h||!image?.width)return;const stone=['chapel','cistern','clinic'].includes(h.kind),cell=stone?1:0,sw=image.width/3,sh=image.height/2,size=stone?256:192;
 const left=Math.max(h.box.left*T,(view?.x0??h.box.left)*T-size),right=Math.min((h.box.right+1)*T,(view?.x1??h.box.right+1)*T+size),top=Math.max(h.box.top*T,(view?.y0??h.box.top)*T-size),bottom=Math.min((h.box.bottom+1)*T,(view?.y1??h.box.bottom+1)*T+size);
 c.save();c.globalAlpha=alpha;for(let y=Math.floor(top/size)*size;y<bottom;y+=size)for(let x=Math.floor(left/size)*size;x<right;x+=size)c.drawImage(image,cell*sw,0,sw,sh,x,y,size,size);c.restore();
}

export function paintExemplarFloor(c,scene){
 if(scene.authoredSpace!=='rainbell')return;
 c.save();
 // A faded processional runner joins the entrance to the answering bell.
 const left=6*T,width=4*T,top=3*T,height=26*T;
 c.fillStyle='#102b3266';c.fillRect(left,top,width,height);
 c.strokeStyle='#c9b57962';c.lineWidth=2;c.strokeRect(left+7,top+5,width-14,height-10);
 c.strokeStyle='#c9b57935';c.lineWidth=1;c.strokeRect(left+12,top+10,width-24,height-20);
 for(let y=top+56;y<top+height-32;y+=144){const x=left+width/2;c.strokeStyle='#bdab7639';c.beginPath();c.moveTo(x,y-18);c.lineTo(x+13,y);c.lineTo(x,y+18);c.lineTo(x-13,y);c.closePath();c.stroke();}
 // Broad, soft light belongs to the high side windows, not to the tile grid.
 for(const y of [7,15,23]){const g=c.createLinearGradient(T,y*T,10*T,(y+3)*T);g.addColorStop(0,'#f0d5a62b');g.addColorStop(1,'#f0d5a600');c.fillStyle=g;c.beginPath();c.moveTo(T,y*T);c.lineTo(2*T,(y-.5)*T);c.lineTo(12*T,(y+3)*T);c.lineTo(8*T,(y+4)*T);c.closePath();c.fill();}
 c.restore();
}

/** The chapel's architecture uses carved stone; domestic rooms retain timber. */
export function paintChapelWall(c,{x,y,w,h=100,stone=null}){
 c.save();c.fillStyle='#07141c50';c.fillRect(x-8,y-h-4,w+16,h+18);c.fillStyle=stone||'#827e78';c.fillRect(x,y-h,w,h);
 const shade=c.createLinearGradient(0,y-h,0,y);shade.addColorStop(0,'#e4d6b325');shade.addColorStop(.65,'#21303805');shade.addColorStop(1,'#192a355a');c.fillStyle=shade;c.fillRect(x,y-h,w,h);
 c.strokeStyle='#202d344d';c.lineWidth=1;for(let row=0,yy=y-h+24;yy<y;row++,yy+=24){c.beginPath();c.moveTo(x,yy);c.lineTo(x+w,yy);c.stroke();for(let xx=x+((row%2)*34);xx<x+w;xx+=68){c.beginPath();c.moveTo(xx,yy-24);c.lineTo(xx,yy);c.stroke();}}
 c.fillStyle='#bbb29c';c.fillRect(x-4,y-h-5,w+8,8);c.fillStyle='#555f61';c.fillRect(x-4,y-10,w+8,12);c.fillStyle='#aaa18c';c.fillRect(x-4,y-10,w+8,3);
 for(const px of [x-5,x+w-7]){c.fillStyle='#61696a';c.fillRect(px,y-h,12,h);c.fillStyle='#d0c3a267';c.fillRect(px+2,y-h+2,3,h-5);}
 c.restore();
}
