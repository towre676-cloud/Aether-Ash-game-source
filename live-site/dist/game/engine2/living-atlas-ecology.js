/** Atlas v7's bounded disturbance / carrying-capacity equations, adapted to
 * the real campaign's scene and species IDs. No lab cohorts or actors spawn.
 * Abundance is a local encounter-pressure index, not a literal animal count.
 */
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const freshAtlasEcology=()=>({abundance:1,alert:0,travel:0,defeated:0,peaceful:0,lastDay:0,species:{},receipts:[]});
export function advanceAtlasEcology(e,day){
 const delta=clamp(day-e.lastDay,0,90);if(!delta)return e;
 // Logistic recovery approaches carrying capacity; alert decays independently.
 e.abundance=clamp(1-(1-e.abundance)*Math.exp(-.055*delta),.35,1);e.alert=clamp(e.alert*Math.exp(-.85*delta));e.lastDay=day;return e;
}
export function disturbAtlasEcology(e,{distance=0,noise=.2,fire=0,water=0}={}){
 e.travel=Math.min(1e8,e.travel+Math.max(0,distance));
 e.alert=clamp(e.alert+Math.max(0,distance)*noise*.004+fire*.08-water*.025);return e;
}
export function settleAtlasEcology(e,{id,enemies=[],result}={}){
 if(result!=='win'||typeof id!=='string'||!id||e.receipts.includes(id))return false;
 const real=enemies.filter(a=>!a.boss&&a.rivalAvatar===undefined&&(a.species||a.family));
 if(!real.length)return false;
 for(const a of real){const key=String(a.species||a.family).slice(0,100),r=e.species[key]??={defeated:0,peaceful:0};
  if(a.hp<=0){r.defeated++;e.defeated++;e.abundance=clamp(e.abundance-.045,.35,1);e.alert=clamp(e.alert+.09);}
  else if(a.withdrawn){r.peaceful++;e.peaceful++;e.alert=clamp(e.alert-.08);}
 }
 e.receipts.push(id);if(e.receipts.length>512)e.receipts.splice(0,e.receipts.length-512);return true;
}
export function atlasEcologyPace(e,sample){
 const cover=sample?.combined?.concealment||0,noise=sample?.combined?.footstepNoise||0;
 return clamp((.72+.28*e.abundance)*(1+.18*e.alert+.1*noise)*(1-.2*cover),.65,1.3);
}
export function validAtlasEcology(e){
 if(!e||!['abundance','alert','travel','defeated','peaceful','lastDay'].every(k=>Number.isFinite(e[k]))||e.abundance<.35||e.abundance>1||e.alert<0||e.alert>1||e.travel<0||e.travel>1e8||e.lastDay<0||e.lastDay>1e6||!Number.isSafeInteger(e.defeated)||!Number.isSafeInteger(e.peaceful)||e.defeated<0||e.peaceful<0)return false;
 if(!e.species||typeof e.species!=='object'||Array.isArray(e.species)||Object.keys(e.species).length>512||!Array.isArray(e.receipts)||e.receipts.length>512||new Set(e.receipts).size!==e.receipts.length||e.receipts.some(v=>typeof v!=='string'||!v||v.length>180))return false;
 return Object.entries(e.species).every(([id,r])=>id&&id.length<=100&&!['__proto__','constructor','prototype'].includes(id)&&r&&Number.isSafeInteger(r.defeated)&&r.defeated>=0&&Number.isSafeInteger(r.peaceful)&&r.peaceful>=0);
}
