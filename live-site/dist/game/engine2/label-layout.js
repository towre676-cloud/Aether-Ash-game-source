const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const clamp=(v,a,b)=>Math.max(a,Math.min(Math.max(a,b),v));
/** Small field labels avoid faces and each other, while remaining near their subjects. */
export function layoutFieldLabels(labels,{bounds,faces=[],obstacles=[]}={}){
 if(!bounds||![bounds.x,bounds.y,bounds.w,bounds.h].every(Number.isFinite)||bounds.w<24||bounds.h<25)return [];
 const placed=[];for(const item of labels.slice(0,3)){
  const w=Math.min(item.w||170,bounds.w),h=25,candidates=[];
  for(const dy of [0,-30,-60,-95,32,62])for(const dx of [0,-w*.65,w*.65,-w,w]){
   const rect={x:clamp(item.x-w/2+dx,bounds.x,bounds.x+bounds.w-w),y:clamp(item.y-14+dy,bounds.y,bounds.y+bounds.h-h),w,h};
   if(obstacles.some(o=>overlap(rect,o)>0))continue;
   const faceCost=faces.reduce((n,f)=>n+overlap(rect,f),0),labelCost=placed.reduce((n,f)=>n+overlap(rect,f),0);
   candidates.push({...rect,score:faceCost*200+labelCost*300+Math.hypot(rect.x+w/2-item.x,rect.y+14-item.y)});
  }
  candidates.sort((a,b)=>a.score-b.score);const rect=candidates[0];if(!rect)continue;
  if(faces.some(f=>overlap(rect,f)>0)||placed.some(f=>overlap(rect,f)>0))continue;
  placed.push({...item,...rect,anchorX:item.x,anchorY:item.y,drawX:rect.x+rect.w/2,drawY:rect.y+14});
 }return placed;
}
