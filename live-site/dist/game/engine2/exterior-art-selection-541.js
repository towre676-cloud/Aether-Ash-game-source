/** Shared selection lets the old landscape omit only the placeholders that
 * receive an authored replacement. Coordinates still come from its bank plan. */
import {isInteriorScene} from './scene-identity.js';
export function isExteriorArtScene(scene){return !!scene?.floor&&!scene.originId&&!scene.secret_key&&!isInteriorScene(scene);}
export function exteriorHeroFeatures(scene,features=[]){
 if(!isExteriorArtScene(scene))return[];
 const anchors=(scene.objects||[]).filter(o=>!o.hidden&&o.revealed!==false&&Array.isArray(o.xy)&&['portal','camp','shop','project','frontier-landmark','frontier-board','puzzle','switch','aid'].includes(o.type));
 const score=f=>(f.authored?-24:0)+(anchors.length?Math.min(...anchors.map(o=>Math.hypot(f.x-o.xy[0]-.5,f.z-o.xy[1]-.5))):f.band||5);
 const candidates=features.filter(f=>!f.near).slice().sort((a,b)=>score(a)-score(b)||a.index-b.index),out=[];
 for(const f of candidates){if(out.every(p=>Math.hypot(p.x-f.x,p.z-f.z)>=5)){out.push(f);if(out.length===3)break;}}
 return out;
}
