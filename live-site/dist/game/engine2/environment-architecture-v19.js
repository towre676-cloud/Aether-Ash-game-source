/** Purpose-specific construction artwork fitted to the existing building plan.
 * These pictures never create a room, door, roof cell or navigation target. */
export const ARCHITECTURE_V19_FILES=Object.freeze({environmentFacades:'facade-bays-v19.webp',environmentRoofcraft:'roofcraft-v19.webp'});
export const ARCHITECTURE_V19_SIZE=Object.freeze([1774,887]);
const freeze=p=>Object.freeze({...p,crop:Object.freeze(p.crop),...(p.windowAnchor?{windowAnchor:Object.freeze(p.windowAnchor)}:{})});
export const FACADE_BAYS=Object.freeze([
 {id:'home-window-bay',label:'Patched domestic timber bay',crop:[36,31,386,382],windowAnchor:[252,232]},
 {id:'clinic-herb-bay',label:'Pale clinic herb bay',crop:[501,52,351,355],windowAnchor:[665,239]},
 {id:'instrumentworks-sound-bay',label:'Instrumentworks sound bay',crop:[929,41,362,370],windowAnchor:[1109,234]},
 {id:'inn-kitchen-bay',label:'Warm kitchen serving bay',crop:[1370,48,371,360],windowAnchor:[1564,245]},
 {id:'archive-leaded-bay',label:'Leaded archive and guild bay',crop:[59,467,352,373],windowAnchor:[230,632]},
 {id:'carpenter-shutter-bay',label:'Pegged carpenter shutter bay',crop:[494,472,385,373],windowAnchor:[651,660]},
 {id:'chapel-stone-bay',label:'Carved chapel window bay',crop:[941,458,338,393],windowAnchor:[1114,674]},
 {id:'cistern-inspection-bay',label:'Glazed cistern inspection bay',crop:[1360,465,362,377],windowAnchor:[1542,642]}
].map(p=>freeze({...p,asset:'environmentFacades',height:48,role:'window-bay'})));
export const ROOFCRAFT_DETAILS=Object.freeze([
 {id:'domestic-chimney',label:'Twin-pot domestic chimney',crop:[94,22,279,411],height:44,role:'roof'},
 {id:'sound-roof-vent',label:'Copper sound vent',crop:[508,88,325,310],height:34,role:'roof'},
 {id:'clinic-air-vent',label:'Ceramic clinic air vent',crop:[968,71,274,329],height:36,role:'roof'},
 {id:'archive-ridge-vent',label:'Slate archive ridge vent',crop:[1336,75,390,323],height:32,role:'roof'},
 {id:'carpenter-gable-truss',label:'Carved carpenter gable truss',crop:[33,476,710,344],height:28,role:'gable'},
 {id:'chapel-stone-medallion',label:'Chapel stone medallion',crop:[744,498,326,330],height:20,role:'wall'},
 {id:'cistern-rain-hopper',label:'Copper rain hopper',crop:[1129,444,203,416],height:44,role:'wall'},
 {id:'ivy-courtyard-pilaster',label:'Ivy courtyard pilaster',crop:[1415,443,266,418],height:42,role:'wall'}
].map(p=>freeze({...p,asset:'environmentRoofcraft'})));
const PIECES=new Map([...FACADE_BAYS,...ROOFCRAFT_DETAILS].map(p=>[p.id,p]));
const FAMILY_BAYS=Object.freeze({home:'home-window-bay',clinic:'clinic-herb-bay',instrumentworks:'instrumentworks-sound-bay',inn:'inn-kitchen-bay',guild:'archive-leaded-bay',archive:'archive-leaded-bay',carpenter:'carpenter-shutter-bay',workshop:'carpenter-shutter-bay',chapel:'chapel-stone-bay',cistern:'cistern-inspection-bay'});
const finite=(...v)=>v.every(Number.isFinite);
const ready=image=>image?.complete!==false&&(image?.naturalWidth??image?.width)===1774&&(image?.naturalHeight??image?.height)===887;

/** Gallery/default registration is bottom-center; every fit preserves aspect. */
export function architecturePieceSpec(id,{width,height}={}){
 const piece=PIECES.get(id);if(!piece)return null;
 if(width!==undefined&&(!Number.isFinite(width)||width<=0)||height!==undefined&&(!Number.isFinite(height)||height<=0))return null;
 const [,,sw,sh]=piece.crop,h=height??piece.height,w=width??h*sw/sh,k=Math.min(w/sw,h/sh);
 return {id,piece,asset:piece.asset,crop:piece.crop,width:sw*k,height:sh*k,scale:k,draw:{x:-sw*k/2,y:-sh*k,w:sw*k,h:sh*k}};
}
export function drawArchitecturePiece(c,assets,spec,x,y,alpha=1){
 const image=assets?.[spec?.asset];if(!c?.drawImage||!c?.save||!c?.restore||!ready(image)||!spec?.piece||!spec?.draw||!finite(x,y,alpha,...Object.values(spec.draw)))return false;
 c.save();try{c.globalAlpha*=Math.max(0,Math.min(1,alpha));const d=spec.draw;c.drawImage(image,...spec.crop,x+d.x,y+d.y,d.w,d.h);return true;}catch{return false;}finally{c.restore();}
}
const boxFor=(spec,x,y)=>({left:x+spec.draw.x,top:y+spec.draw.y,right:x+spec.draw.x+spec.draw.w,bottom:y+spec.draw.y+spec.draw.h});
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const doorBox=detail=>({left:-27,right:27,top:detail.door.y-detail.door.height,bottom:detail.door.y+10});

/** A measured painted window center stays at the old window center. The whole
 * surrounding bay must fit its real wall and cannot spread over another bay or
 * the single real doorway. Tight or historical fragments retain the old art. */
export function facadeBayPlacement(detail,frontage,window){
 const piece=PIECES.get(FAMILY_BAYS[detail?.material]);if(!piece||!frontage||!window)return null;
 const f=frontage,[sx,sy,sw,sh]=piece.crop,[ax,ay]=piece.windowAnchor,x=window.x,y=window.y-window.h/2;
 if(!finite(x,y,f.x,f.y,f.w,f.ground,detail.door?.y))return null;
 let left=x-f.x-2,right=f.x+f.w-x-2,top=y-f.y-2,bottom=f.ground-8-y;
 for(const other of f.windows){if(other===window)continue;const delta=other.x-x;if(delta<0)left=Math.min(left,-delta/2-3);if(delta>0)right=Math.min(right,delta/2-3);}
 const door=doorBox(detail);if(f.ground>door.top&&f.y<door.bottom){if(x<0)right=Math.min(right,-27-x);else left=Math.min(left,x-27);}
 const k=Math.min(48/sw,49/sh,left/(ax-sx),right/(sx+sw-ax),top/(ay-sy),bottom/(sy+sh-ay));
 if(!Number.isFinite(k)||k<=0||sw*k<28||sh*k<30)return null;
 const spec={id:piece.id,piece,asset:piece.asset,crop:piece.crop,scale:k,width:sw*k,height:sh*k,draw:{x:(sx-ax)*k,y:(sy-ay)*k,w:sw*k,h:sh*k}};
 const bounds=boxFor(spec,x,y);if(overlap(bounds,door))return null;
 return {spec,x,y,bounds,registration:'existing-window-center'};
}

/** Full sprite rectangle must lie over actual roof cells, including concavities.
 * Selecting a different mounted fitting does not redraw the roof silhouette. */
export function roofCraftPlacement(plan){
 const p=plan?.projection;if(!p||p.kind==='underground')return null;
 const id=({home:'domestic-chimney',inn:'domestic-chimney',instrumentworks:'sound-roof-vent',clinic:'clinic-air-vent',guild:'archive-ridge-vent',archive:'archive-ridge-vent'})[p.material];if(!id)return null;
 const spec=architecturePieceSpec(id,{width:id==='domestic-chimney'?31:38,height:PIECES.get(id).height}),unit=48*p.scale,b=p.bounds;
 if(!spec||!Number.isFinite(unit)||unit<=0)return null;
 const cells=new Set(p.cells.map(v=>v.join(','))),preferred={x:(b.minX+(b.maxX-b.minX)*.7)*unit+7,y:(b.minY+(b.maxY-b.minY)*.35)*unit-58};
 function fits(x,y){const r=boxFor(spec,x,y);for(let cy=Math.floor((r.top+64+.001)/unit);cy<=Math.floor((r.bottom+64-.001)/unit);cy++)for(let cx=Math.floor((r.left+.001)/unit);cx<=Math.floor((r.right-.001)/unit);cx++)if(!cells.has(cx+','+cy))return false;return true;}
 let best=null;for(const [cx,cy]of p.cells){const x=(cx+.5)*unit,y=(cy+.5)*unit-64,d=(x-preferred.x)**2+(y-preferred.y)**2;if((!best||d<best.d)&&fits(x,y))best={x,y,d};}
 return best?{spec,x:best.x,y:best.y,bounds:boxFor(spec,best.x,best.y),registration:'existing-roof-cells'}:null;
}

export function gableCraftPlacement(detail,frontage){
 const g=frontage?.gable;if(detail?.material!=='carpenter'||!g)return null;
 const spec=architecturePieceSpec('carpenter-gable-truss',{width:Math.min(80,frontage.w*.62),height:Math.max(8,g.rise-7)}),x=g.x,y=frontage.y-6;
 return {spec,x,y,bounds:boxFor(spec,x,y),registration:'existing-gable'};
}

/** One small wall fitting uses an existing post/blank wall bay. No ornament
 * occupies a window, doorway, exposed courtyard gap or ground approach. */
export function wallCraftPlacement(detail,frontage){
 const family=detail?.material,id=family==='chapel'?'chapel-stone-medallion':family==='cistern'?'cistern-rain-hopper':['home','inn','clinic'].includes(family)?'ivy-courtyard-pilaster':null;
 const f=frontage;if(!id||!f||f.w<26)return null;
 const spec=architecturePieceSpec(id,{width:id==='chapel-stone-medallion'?20:id==='cistern-rain-hopper'?20:24,height:PIECES.get(id).height});
 const windows=f.windows.map(win=>facadeBayPlacement(detail,f,win)?.bounds||{left:win.x-win.w/2-4,right:win.x+win.w/2+4,top:win.y-win.h-2,bottom:win.y+10});
 const y=id==='chapel-stone-medallion'?f.y+31:f.ground-8;
 for(const post of f.posts){const x=Math.max(f.x+spec.width/2+2,Math.min(f.x+f.w-spec.width/2-2,post)),bounds=boxFor(spec,x,y);
  if(bounds.left<f.x+2||bounds.right>f.x+f.w-2||bounds.top<f.y+2||bounds.bottom>f.ground-5||overlap(bounds,doorBox(detail))||windows.some(b=>overlap(bounds,{left:b.left-3,right:b.right+3,top:b.top-3,bottom:b.bottom+3})))continue;
  return {spec,x,y,bounds,registration:'existing-wall-post'};
 }
 return null;
}
