import {groundContours,roundedGroundPath,bakeOrganicGround} from './organic-ground.js?v=5.18.0';
import {environmentFor} from './environment.js?v=5.18.0';
import {terrainKind,TERRAIN_MATERIALS,terrainHash} from './terrain-materials.js';
/** Keep natural collision outlines and painterly variation with direct canvas drawing. */
export function compatibilityGround(scene,streets,{makePath=roundedGroundPath,scenicMaterials=null,environmentSurfaces=null,environmentWater=null,bake=true}={}){
 const kind=terrainKind(environmentFor(scene).style),rgb=(TERRAIN_MATERIALS[kind]||TERRAIN_MATERIALS.stone).base,green=!!TERRAIN_MATERIALS[kind]?.stems,patches=[];
 for(let y=1;y<scene.height;y+=4)for(let x=1;x<scene.width;x+=4){const seed=x*79+y*331;patches.push({x:(x+terrainHash(seed,1)*2)*48,y:(y+terrainHash(seed,2)*2)*48,rx:74+terrainHash(seed,3)*100,ry:44+terrainHash(seed,4)*62,angle:terrainHash(seed,5)*Math.PI,color:green?(seed%3?'#8f9a5820':'#193f3628'):(seed%3?'#e2d2a214':'#2639441b')});}
 let baked=null;if(bake&&typeof document!=='undefined')try{baked=bakeOrganicGround(scene,null,streets,{scenicMaterials,environmentSurfaces,environmentWater,compatibility:true});}catch{}
 return {baked,path:makePath(groundContours(scene)),streets:streets?.size?makePath(groundContours(scene,(x,y)=>scene.floor[y]?.[x]==='.'&&streets.has(x+','+y)),16):null,color:'rgb('+rgb.join(',')+')',width:scene.width*48,height:scene.height*48,patches};
}
export function paintCompatibilityGround(c,ground,view=null){
 if(ground.baked){const b=ground.baked;c.save();c.drawImage(b,b.worldX,b.worldY,b.worldWidth,b.worldHeight);c.restore();return;}
 c.save();c.fillStyle=ground.color;c.fill(ground.path,'evenodd');
 if(typeof c.clip==='function'&&typeof c.ellipse==='function'){
  c.save();c.clip(ground.path,'evenodd');for(const p of ground.patches||[]){if(view&&(p.x+p.rx<view.x0*48||p.x-p.rx>view.x1*48||p.y+p.ry<view.y0*48||p.y-p.ry>view.y1*48))continue;c.fillStyle=p.color;c.beginPath();c.ellipse(p.x,p.y,p.rx,p.ry,p.angle,0,Math.PI*2);c.fill();}c.restore();
 }
 if(ground.streets){c.fillStyle='#8b7c58';c.fill(ground.streets,'evenodd');}c.restore();
}
