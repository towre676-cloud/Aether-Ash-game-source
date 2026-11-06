/** Grass v4 bridge: visual fields are derived from the existing, authoritative Atlas/Ground Forge fields. */
import {biomeAt,materialAt,vegetationObstacle} from './surfaces.mjs';
import {riverX} from './world.mjs';
import {getGroundMaterial} from './ground/ground-materials.mjs';
const C=x=>Math.min(1,Math.max(0,x));
export function visualSeason(days=0,heat=0){
 const adjusted=(Math.max(0,days)+Math.round(heat*24))%360;
 return adjusted<85?'spring':adjusted<180?'summer':adjusted<270?'autumn':'winter';
}
export function terrainEcotone(region,world,x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>32||Math.abs(z)>32)return null;
 if(vegetationObstacle(region,world,x,z))return null;
 const base=biomeAt(region,world,x,z);if(base==='ruins')return null;
 const water=world.sample(x,z).moisture;
 const bank=C((8-Math.abs(x-riverX(z)))/6)*C((water-.1)*1.5);
 if(base==='riverbank'||bank<.02)return {[base]:1};
 return {[base]:+(1-bank).toFixed(4),riverbank:+bank.toFixed(4)};
}
export function substrateFor(region,world,x,z){
 if(vegetationObstacle(region,world,x,z))return {vegetationSuitability:0,fuelFactor:0};
 const m=getGroundMaterial(materialAt(region,world,x,z));
 const stone=['rock','flagstone','brick','mosaic','tile','cobble','metal','glass','herringbone','crystal'].includes(m.pattern);
 const water=world.sample(x,z);
 return {vegetationSuitability:C((stone?.12:1)*(.52+.5*water.fertility)*(1-water.fire*.65)),fuelFactor:C((stone?.12:.6)+water.biomass*.4)};
}
