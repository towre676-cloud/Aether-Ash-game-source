import {cutoutAtlas} from './sprite-cutout.js';
// Measured source rectangles from the delivered 1448 × 1086 artwork, normalized
// to separate, padded cells before connected-component isolation.
const RECTS=[[0,0,362,346],[376,0,710,380],[710,0,1094,352],[1090,0,1448,367],[0,344,405,699],[375,345,765,716],[714,345,1093,720],[1090,358,1448,718],[0,680,380,1086],[357,708,716,1086],[700,685,1110,1086],[1087,690,1448,1086]];
export function prepareBestiary(image){const out=document.createElement('canvas');out.width=2048;out.height=1536;const g=out.getContext('2d');RECTS.forEach(([x,y,r,b],i)=>{const sx=image.width/1448,sy=image.height/1086,w=(r-x)*sx,h=(b-y)*sy,scale=Math.min(420/w,420/h),dw=w*scale,dh=h*scale;g.drawImage(image,x*sx,y*sy,w,h,(i%4)*512+(512-dw)/2,Math.floor(i/4)*512+470-dh,dw,dh);});return cutoutAtlas(out,4,3);}
// This transparent atlas contains intentionally detached steam, antennae and
// helmet details. Preserve its alpha instead of discarding smaller components.
const EXTRA_RECTS=[[0,0,366,369],[370,0,740,374],[742,0,1104,378],[1110,0,1448,392],[0,369,368,724],[369,376,739,721],[740,378,1130,720],[1090,394,1448,731],[0,696,381,1086],[376,677,754,1086],[755,686,1106,1086],[1101,715,1448,1086]];
export function prepareExtraBestiary(image){const out=document.createElement('canvas');out.width=2048;out.height=1536;const c=out.getContext('2d'),bounds=[];EXTRA_RECTS.forEach(([x,y,r,b],i)=>{const w=r-x,h=b-y,scale=Math.min(420/w,420/h),dw=w*scale,dh=h*scale,dx=(i%4)*512+(512-dw)/2,dy=Math.floor(i/4)*512+470-dh;c.drawImage(image,x*image.width/1448,y*image.height/1086,w*image.width/1448,h*image.height/1086,dx,dy,dw,dh);bounds.push({x:dx,y:dy,w:dw,h:dh});});return {image:out,bounds};}
