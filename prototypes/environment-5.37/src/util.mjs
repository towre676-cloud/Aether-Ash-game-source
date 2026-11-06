export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function hash32(s){let h=2166136261>>>0;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0}
export function pick(seed,arr){if(!arr?.length)return null;return arr[hash32(seed)%arr.length]}
export function deepClone(x){return x==null?x:structuredClone(x)}
