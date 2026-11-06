/** Field names share one attention budget. This never changes interaction targets. */
const ranks={threat:700,interaction:650,objective:340,exit:300,story:260,creature:180,ambient:100};
const ranges={threat:7,interaction:3.4,objective:4.2,exit:6,story:5,creature:3.2,ambient:3.2};
const finite=Number.isFinite;

function portalKey(object){
 const o=object?.exit||object;if(!o||!(o.type==='portal'||o.to!=null||o.buildingEntrance))return null;
 return o.buildingEntrance?.id||['portal',o.to||'',o.to_region||'',o.xy?.join(',')||''].join(':');
}
export function portalLabelFocused(object,nearest,state){
 const key=portalKey(object),other=portalKey(nearest?.o),o=object?.exit||object;
 if(key&&key===other)return true;
 // Scene doors are checked after usable world objects by the interaction code.
 return !!o?.xy&&(!nearest||nearest.d>=2.05)&&Math.hypot(state.x-o.xy[0]-.5,state.y-o.xy[1]-.5)<1.4;
}

export function fieldLabelSource(object,x,y,state,{nearest=false,kind}={}){
 const type=object?.type||'object';
 const category=kind||(nearest?'interaction':type==='portal'?'exit':type==='field-situation'?'objective':'ambient');
 const identity=object?.id??object?.affordanceId??object?.networkId??object?.physicalId??object?.householdId??object?.rivalId??object?.label??object?.name??type;
 return {kind:category,sourceKey:portalKey(object)||type+':'+identity+':'+Math.round(x*4)+','+Math.round(y*4),sourceX:x*48,sourceY:y*48,distance:Math.hypot((state?.x||0)-x,(state?.y||0)-y)};
}

export function prioritizeFieldLabels(labels,{width=1280,previous=[]}={}){
 const limit=width<600?2:3,retained=new Set(previous),candidates=[];
 for(const item of labels||[]){
  if(!item||typeof item.text!=='string'||!item.text.trim()||!finite(item.x)||!finite(item.y))continue;
  const kind=Object.hasOwn(ranks,item.kind)?item.kind:'ambient';
  const distance=finite(item.distance)?Math.max(0,item.distance):item.active?0:3;
  if(distance>ranges[kind])continue;
  const key=item.sourceKey||kind+':'+item.text+':'+Math.round(item.x)+','+Math.round(item.y);
  candidates.push({...item,kind,key,distance,rank:ranks[kind]+(item.active?10:0)-distance*8+(retained.has(key)?3:0)});
 }
 candidates.sort((a,b)=>b.rank-a.rank||a.distance-b.distance||a.key.localeCompare(b.key));
 const selected=[],sources=new Set(),categories=new Set();
 for(const item of candidates){
  if(sources.has(item.key)||categories.has(item.kind))continue;
  selected.push(item);sources.add(item.key);categories.add(item.kind);
  if(selected.length===limit)break;
 }
 return selected;
}
