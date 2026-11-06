const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function buildMusicPlan({segments=[],maxSilence=8,crossfade=2.5}={}){
  const ordered=[...segments].sort((a,b)=>a.start-b.start);
  const plan=[];
  let cursor=0,last=null;
  for(const s of ordered){
    const gap=Math.max(0,s.start-cursor);
    if(gap>maxSilence){
      plan.push({kind:'bridge',start:cursor,end:s.start,from:last?.track||null,to:s.track,mode:'adaptive-bed'});
    }
    plan.push({...s,fadeIn:last?crossfade:clamp(crossfade,0,s.duration||crossfade),fadeOut:crossfade});
    cursor=Math.max(cursor,s.start+(s.duration||0));
    last=s;
  }
  return plan;
}
export function continuityAudit(plan,{maxSilence=8}={}){
  const timed=plan.filter(x=>Number.isFinite(x.start)&&Number.isFinite(x.end??(x.start+(x.duration||0)))).sort((a,b)=>a.start-b.start);
  let gaps=[],cursor=0;
  for(const s of timed){
    if(s.start-cursor>maxSilence)gaps.push({start:cursor,end:s.start,duration:s.start-cursor});
    cursor=Math.max(cursor,s.end??(s.start+(s.duration||0)));
  }
  return {pass:gaps.length===0,gaps};
}
