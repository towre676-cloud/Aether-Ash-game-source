/** Read-only measurements; never pause rendering or disable animations. */
export async function inspectMapStability(doc=document, samples=12, interval=80){
 const win=doc.defaultView, panel=doc.querySelector('#room-map-panel'), frames=[];
 if(!panel?.open)throw Error('Native map is not open');
 const started=win.performance.now();
 const raf=[];let active=true,request;
 const observe=t=>{raf.push(t);if(active)request=win.requestAnimationFrame(observe);};
 request=win.requestAnimationFrame(observe);
 const animations=panel.getAnimations({subtree:true}).map(a=>({playState:a.playState,
  target:a.effect?.target?.id||a.effect?.target?.tagName,timing:a.effect?.getTiming()}));
 try{for(let i=0;i<samples;i++){
  const r=panel.getBoundingClientRect(),cs=win.getComputedStyle(panel);
  frames.push({at:win.performance.now()-started,x:r.x,y:r.y,width:r.width,height:r.height,
   scrollTop:panel.scrollTop,scrollHeight:panel.scrollHeight,transform:cs.transform,
   position:doc.querySelector('#screen')?.dataset.position,open:panel.open,
   focused:doc.hasFocus(),visibility:doc.visibilityState});
  await new Promise(resolve=>win.setTimeout(resolve,interval));
 }}finally{active=false;win.cancelAnimationFrame(request);}
 return {animations,frames,rafTimestamps:raf,geometryChanged:frames.some(f=>['x','y','width','height'].some(k=>f[k]!==frames[0][k])),
  viewport:{width:win.innerWidth,height:win.innerHeight},status:panel.querySelector('[role=status]')?.textContent};
}
