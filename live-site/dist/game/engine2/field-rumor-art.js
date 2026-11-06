/** A short world-space caption. It respects the same HUD and touch bands as the camera. */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function rumorLines(text,measure,maxWidth=240){
 const lines=[];let line='';for(const word of String(text).split(/\s+/)){const next=line?line+' '+word:word;if(line&&measure(next)>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
 if(lines.length>3){lines.length=3;let last=lines[2];while(last&&measure(last+'…')>maxWidth)last=last.slice(0,-1);lines[2]=last+'…';}return lines;
}
export function rumorBox({x,y,width,height,view}){
 const w=Math.min(width,Math.max(80,view.right-view.left-16));return {x:clamp(x-w/2,view.left+8,view.right-w-8),y:clamp(y-height-86,view.top+8,Math.max(view.top+8,view.bottom-height-12)),w,h:height};
}
export function paintFieldRumor(renderer,f){
 const c=renderer.ctx,tr=renderer.transform,layout=renderer.layout;if(!tr||!layout)return;
 const z=tr.z,view={left:-tr.ox/z,right:(renderer.width-tr.ox)/z,top:(layout.top-tr.oy)/z,bottom:(renderer.height-layout.bottom-tr.oy)/z};
 c.save();c.font='500 11px system-ui';const maxWidth=Math.min(240,Math.max(90,view.right-view.left-44)),lines=rumorLines(f.value,s=>c.measureText(s).width,maxWidth),width=Math.max(100,...lines.map(t=>c.measureText(t).width))+24,height=lines.length*16+20,box=rumorBox({x:f.x*48,y:f.y*48,width,height,view}),p=f.t/f.life;
 c.globalAlpha=Math.min(1,p*10,(1-p)*7)*.96;c.strokeStyle='#a6bc9b99';c.fillStyle='#102b2beb';c.lineWidth=1;c.beginPath();c.roundRect(box.x,box.y,box.w,box.h,7);c.fill();c.stroke();
 c.fillStyle='#e5e0c4';c.textAlign='left';for(let i=0;i<lines.length;i++)c.fillText(lines[i],box.x+12,box.y+20+i*16,box.w-24);
 c.strokeStyle='#b7c79c77';const anchorX=clamp(f.x*48,box.x+12,box.x+box.w-12);c.beginPath();c.moveTo(anchorX,box.y+box.h);c.lineTo(f.x*48,f.y*48-55);c.stroke();c.restore();
}
