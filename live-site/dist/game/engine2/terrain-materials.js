/** Human-scale ground. Patterns contain mineral grains and short grass, never
 * flowers large enough to compete with a person. All noise is coordinate stable. */
export function terrainHash(x,y,seed=0){let n=Math.imul(x+seed*31,374761393)^Math.imul(y+seed*17,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
const smooth=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;
export function terrainNoise(x,y,scale=96,seed=0,period=0){const qx=x/scale,qy=y/scale,ix=Math.floor(qx),iy=Math.floor(qy),fx=smooth(qx-ix),fy=smooth(qy-iy),sample=(a,b)=>terrainHash(period?((a%period)+period)%period:a,period?((b%period)+period)%period:b,seed);return mix(mix(sample(ix,iy),sample(ix+1,iy),fx),mix(sample(ix,iy+1),sample(ix+1,iy+1),fx),fy);}
export const TERRAIN_MATERIALS={
 grass:{base:[61,78,48],grain:12,stems:true},woodland:{base:[48,65,43],grain:12,stems:true},soil:{base:[113,99,73],grain:14},stone:{base:[103,108,102],grain:15},foundry:{base:[73,76,73],grain:12},ruins:{base:[89,91,93],grain:15},highland:{base:[99,110,111],grain:16},sand:{base:[161,140,101],grain:13},salt:{base:[159,170,158],grain:12},coral:{base:[143,146,119],grain:12},mangrove:{base:[61,79,65],grain:10,stems:true},crystal:{base:[105,101,121],grain:14},ice:{base:[160,183,189],grain:11},aurora:{base:[135,164,178],grain:12},storm:{base:[98,113,121],grain:15},marble:{base:[168,167,153],grain:10},spore:{base:[66,80,64],grain:13,stems:true},cactus:{base:[135,125,86],grain:13},lava:{base:[71,62,59],grain:16}
};
export function terrainKind(style){return ({village:'grass',riverbank:'soil'})[style]|| (TERRAIN_MATERIALS[style]?style:'stone');}
/** Reproducible RGB values at 1 world pixel. Coarse noise supplies weathering;
 * fine grain supplies detail without photographic scale mismatches. */
export function terrainPixel(kind,x,y){x=((x%384)+384)%384;y=((y%384)+384)%384;const m=TERRAIN_MATERIALS[kind]||TERRAIN_MATERIALS.stone,coarse=(terrainNoise(x,y,64,11,6)-.5)*29,grain=(terrainHash(x,y,4)-.5)*m.grain;return m.base.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+coarse+grain*(i===1?.9:1)))));}
/** A sparse connected visual desire line through the actual floor. It never
 * carves a passage, crosses a wall, or changes the scene's navigation data. */
export function terrainTrails(scene,maxAnchors=12){
 const open=(x,y)=>scene.floor[y]?.[x]==='.',valid=xy=>Array.isArray(xy)&&open(Math.floor(xy[0]),Math.floor(xy[1]));
 const candidates=[...(scene.doors||[]),...(scene.objects||[]).filter(o=>['npc','guide','shop','camp','portal','puzzle','switch','boss'].includes(o.type))];
 const unique=new Map();for(const o of candidates){if(valid(o.xy))unique.set(o.xy.map(Math.floor).join(','),o.xy.map(Math.floor));if(unique.size>=maxAnchors)break;}
 const anchors=[...unique.values()],paths=[];if(anchors.length<2)return paths;const joined=[anchors.shift()];
 while(anchors.length){let best=Infinity,pick=0,root=joined[0];for(let i=0;i<anchors.length;i++)for(const j of joined){const d=Math.hypot(anchors[i][0]-j[0],anchors[i][1]-j[1]);if(d<best){best=d;pick=i;root=j;}}const target=anchors.splice(pick,1)[0],key=p=>p[0]+','+p[1],q=[root],seen=new Map([[key(root),null]]);let found=false;for(let at=0;at<q.length;at++){const p=q[at];if(key(p)===key(target)){found=true;break;}for(const [dx,dy]of[[1,0],[0,1],[-1,0],[0,-1]]){const next=[p[0]+dx,p[1]+dy],k=key(next);if(open(...next)&&!seen.has(k)){seen.set(k,p);q.push(next);}}}if(found){let p=target,path=[];while(p){path.push(p);p=seen.get(key(p));}paths.push(path.reverse());joined.push(target);}}
 return paths;
}
