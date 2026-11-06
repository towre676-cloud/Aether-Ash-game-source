/** Painted construction details, never a replacement facade or building shape. */
export const ARCHITECTURE_ACCENT_FILE='architecture-accents-v17.webp';
export const ARCHITECTURE_ACCENT_ASSET='environmentArchitecture';
export const ARCHITECTURE_ACCENTS=Object.freeze([
 {id:'timber-flower-window',label:'Timber flowerbox window',crop:[61,54,397,355],height:104},
 {id:'clinic-herb-window',label:'Clinic herb window',crop:[526,39,412,388],height:104},
 {id:'archive-leaded-window',label:'Archive leaded window',crop:[1038,10,225,432],height:104},
 {id:'carved-gable-vent',label:'Carved gable vent',crop:[1367,41,381,377],height:104},
 {id:'brick-chimney',label:'Weathered brick chimney',crop:[106,466,319,394],height:104},
 {id:'copper-stovepipe',label:'Copper stovepipe',crop:[588,444,288,431],height:104},
 {id:'wrought-lantern',label:'Wrought wall lantern',crop:[1007,469,273,389],height:104},
 {id:'ivy-corner',label:'Climbing ivy corner',crop:[1449,429,290,458],height:104}
].map(p=>Object.freeze({...p,crop:Object.freeze(p.crop)})));
const ready=image=>!!image&&image.complete!==false&&image.width===1774&&image.height===887;

export function architectureWindowId(family){
 if(family==='clinic')return 'clinic-herb-window';
 if(/guild|archive|chapel|cistern/.test(family||''))return 'archive-leaded-window';
 return 'timber-flower-window';
}

export function architectureAccentSpec(id,{width,height}={}){
 const accent=ARCHITECTURE_ACCENTS.find(p=>p.id===id);if(!accent)return null;
 if((width!==undefined&&(!Number.isFinite(width)||width<=0))||(height!==undefined&&(!Number.isFinite(height)||height<=0)))return null;
 const h=height??accent.height,w=width??h*accent.crop[2]/accent.crop[3],scale=Math.min(w/accent.crop[2],h/accent.crop[3]),dw=accent.crop[2]*scale,dh=accent.crop[3]*scale;
 return {id,accent,crop:accent.crop,width:dw,height:dh,draw:{x:-dw/2,y:-dh,w:dw,h:dh}};
}

/** Pixel bottom-center registration, aspect preserved, generated PNG unchanged. */
export function drawArchitectureAccent(c,image,spec,x,y,alpha=1){
 if(!c||!ready(image)||!spec?.accent||![x,y,alpha,...Object.values(spec.draw)].every(Number.isFinite))return false;
 c.save();try{c.globalAlpha*=Math.max(0,Math.min(1,alpha));const d=spec.draw;c.drawImage(image,...spec.crop,x+d.x,y+d.y,d.w,d.h);return true;}catch{return false;}finally{c.restore();}
}
