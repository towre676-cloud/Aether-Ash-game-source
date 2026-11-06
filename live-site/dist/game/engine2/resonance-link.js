/** Shared save contract for portable instruments, environmental objects and discoveries.
 * Call once after granting the actual story reward. Stable source IDs prevent farming.
 * No time based polling and no assumptions about future object schemas.
 */
export function grantResonance(state,{sourceId,label,points=1,core=null}){
 if(typeof sourceId!=='string'||!sourceId.trim()||typeof label!=='string'||!Number.isInteger(points)||points<0||points>3)return false;
 state.resonance??={version:1,sources:{}};state.resonance.sources??={};
 if(Object.hasOwn(state.resonance.sources,sourceId))return false;
 state.resonance.sources[sourceId]={label,points,core};return true;
}
export function resonanceSources(state){const records=Object.entries(state.resonance?.sources||{}).filter(([,r])=>r&&Number.isInteger(r.points)&&r.points>=0&&r.points<=3).map(([id,r])=>({id,...r}));
 for(const n of [...new Set((state.kakeya?.version||1)<2?state.kakeya?.solved||[]:[])])if([2,3,4].includes(n)&&!records.some(r=>r.id==='prism:chamber:'+n))records.push({id:'prism:chamber:'+n,label:'Prism chamber '+n+' · a complete pattern of light',points:1,core:null});return records;}
export const resonancePoints=state=>resonanceSources(state).reduce((sum,r)=>sum+r.points,0);
