/** Read-only graphics diagnostics. Does not allocate another WebGL context. */
export function graphicsSnapshot({canvas,renderer}={}){
 const context=renderer?.ctx;
 let lost=null;
 try{lost=typeof context?.isContextLost==='function'?context.isContextLost():null;}catch{lost=null;}
 return {
  canvasPresent:!!canvas,
  canvasWidth:canvas?.width??0,
  canvasHeight:canvas?.height??0,
  rendererPresent:!!renderer,
  drawable:renderer?.drawable??null,
  contextLost:lost,
  rendererContextLost:renderer?.contextLost??null,
  compatibility:renderer?.compatibility??null,
  effects:renderer?.effects?.length??null
 };
}
export function installGraphicsDiagnostics({root=document,canvas,getRenderer}={}){
 const button=root.createElement('button');
 button.id='action-graphics-diagnostic';
 button.type='button';
 button.textContent='QA · Graphics status';
 const status=root.createElement('pre');
 status.id='action-graphics-status';
 status.hidden=true;
 status.setAttribute('role','status');
 status.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-width:480px;font:12px/1.5 monospace';
 button.onclick=()=>{
  const snapshot=graphicsSnapshot({canvas,renderer:getRenderer?.()});
  status.textContent=JSON.stringify(snapshot,null,2);
  status.hidden=false;
 };
 return {button,status};
}
