/** Small, bounded diagnostics for Canvas 2D. A successful probe is not a GPU certification. */
export const GRAPHICS_MODE_KEY='ash-aether-graphics-mode';
export function graphicsPolicy(compatibility=false){return {maxDpr:compatibility?1:2,maxPixels:compatibility?2000000:2800000,maxDimension:4096,canvasFilters:!compatibility,cssFilters:!compatibility,smoothingQuality:compatibility?'low':'high'};}
export function backingStoreSize(width,height,deviceRatio=1,{compatibility=false}={}){
 const w=Number(width),h=Number(height),policy=graphicsPolicy(compatibility);
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return {width:1,height:1,dpr:1,drawable:false};
 const ratio=Number(deviceRatio),requested=Number.isFinite(ratio)&&ratio>0?ratio:1;
 const dpr=Math.min(requested,policy.maxDpr,Math.sqrt(policy.maxPixels)/Math.sqrt(w)/Math.sqrt(h),policy.maxDimension/w,policy.maxDimension/h);
 // Floor keeps both the total pixel budget and individual dimensions bounded.
 return {width:Math.max(1,Math.floor(w*dpr)),height:Math.max(1,Math.floor(h*dpr)),dpr,drawable:true};
}
export function canvasContextHealth(context){
 if(!context)return {ok:false,state:'unavailable'};
 try{if(typeof context.isContextLost==='function'&&context.isContextLost())return {ok:false,state:'lost'};}
 catch{return {ok:null,state:'unknown'};}
 return {ok:true,state:'ready'};
}
export function imageSize(image){
 if(!image)return {width:0,height:0};
 const width=Number('naturalWidth'in image?image.naturalWidth:image.width),height=Number('naturalHeight'in image?image.naturalHeight:image.height);
 return {width:Number.isFinite(width)&&width>0?width:0,height:Number.isFinite(height)&&height>0?height:0};
}
export function validSourceRect(image,rect){
 const {width,height}=imageSize(image);if(!width||!height||!rect)return false;
 const {x,y,w,h}=rect;return [x,y,w,h].every(Number.isFinite)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=width&&y+h<=height;
}
/** Validate rectangles and optionally the pixel data already read during atlas prep.
 * No canvas is allocated or read back by this function. One-pixel empty-cell
 * placeholders produced by isolateAtlas are diagnosed before they can hide actors.
 */
export function preparedAtlasHealth(image,bounds,{expectedCells=bounds?.length??0,pixels=null,alphaThreshold=0}={}){
 const {width,height}=imageSize(image),issues=[];let nonempty=0;
 if(!width||!height)issues.push({kind:'image-unavailable'});
 if(!Array.isArray(bounds)||bounds.length!==expectedCells)issues.push({kind:'cell-count',expected:expectedCells,actual:Array.isArray(bounds)?bounds.length:0});
 const verified=!!pixels&&pixels.length===width*height*4;
 if(pixels&&!verified)issues.push({kind:'pixel-length'});
 for(const [index,rect]of (Array.isArray(bounds)?bounds:[]).entries()){
  if(!validSourceRect(image,rect)){issues.push({kind:'source-rectangle',index});continue;}
  if(rect.w<=1||rect.h<=1){issues.push({kind:'empty-cell',index});continue;}
  let visible=!verified;
  if(verified){
   const x0=Math.max(0,Math.floor(rect.x)),y0=Math.max(0,Math.floor(rect.y)),x1=Math.min(width,Math.ceil(rect.x+rect.w)),y1=Math.min(height,Math.ceil(rect.y+rect.h));
   for(let y=y0;y<y1&&!visible;y++)for(let x=x0;x<x1;x++)if(pixels[(y*width+x)*4+3]>alphaThreshold){visible=true;break;}
  }
  if(visible)nonempty++;else issues.push({kind:'transparent-cell',index});
 }
 return {ok:issues.length===0,width,height,nonempty,pixelsVerified:verified,issues};
}
/** Check a tiny throwaway canvas; never disturb the game canvas or its contents. */
export function probeCanvas2D({createCanvas=()=>document.createElement('canvas')}={}){
 let canvas,context;
 try{canvas=createCanvas();canvas.width=canvas.height=4;context=canvas.getContext('2d',{willReadFrequently:true});}
 catch{return {ok:false,state:'unavailable',filters:'unknown'};}
 const health=canvasContextHealth(context);if(health.ok!==true)return {...health,filters:'unknown'};
 const matches=data=>data?.length>=4&&Math.abs(data[0]-60)<=2&&Math.abs(data[1]-120)<=2&&Math.abs(data[2]-180)<=2&&data[3]>=253;
 try{
  context.fillStyle='rgb(60,120,180)';context.fillRect(0,0,4,4);
  if(!matches(context.getImageData(1,1,1,1).data))return {ok:false,state:'readback-mismatch',filters:'unknown'};
  if(!('filter'in context))return {ok:true,state:'ready',filters:'unsupported'};
  context.clearRect(0,0,4,4);context.filter='brightness(1)';
  if(context.filter!=='brightness(1)')return {ok:true,state:'ready',filters:'unsupported'};
  context.fillRect(0,0,4,4);
  return {ok:true,state:'ready',filters:matches(context.getImageData(1,1,1,1).data)?'working':'failed'};
 }catch{return {ok:null,state:'readback-unavailable',filters:'unknown'};}
 finally{if(context&&'filter'in context)context.filter='none';}
}
/** A 2D context can be lost without a drawing exception; report and observe restoration. */
export function monitorCanvasContext(canvas,{getContext=()=>canvas.getContext('2d'),onLost=()=>{},onRestored=()=>{}}={}){
 let lost=false;
 const lostHandler=event=>{lost=true;onLost(event);};
 const restoredHandler=event=>{lost=false;onRestored(event);};
 canvas.addEventListener('contextlost',lostHandler);canvas.addEventListener('contextrestored',restoredHandler);
 return {health(){return lost?{ok:false,state:'lost'}:canvasContextHealth(getContext());},destroy(){canvas.removeEventListener('contextlost',lostHandler);canvas.removeEventListener('contextrestored',restoredHandler);}};
}
