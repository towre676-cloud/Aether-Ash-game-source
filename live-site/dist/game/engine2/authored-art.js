/** Original, measured release 5.16 artwork. Source rectangles preserve the original alpha exactly in lossless WebP.
 * Nothing in this module reads pixels, applies filters, or changes proportions.
 * Keep this path usable by compatibility graphics and the normal renderer alike.
 */
export const AUTHORED_ART_FILES=Object.freeze({
 sableMotion:'sable-motion-v16.webp',heraldMotion:'ash-herald-motion-v16.webp',
 moonveilMotion:'moonveil-motion-v16.webp',authoredProps:'authored-props-v16.webp'
});

// Tight alpha bounds, with a few transparent edge pixels. Bell and hearth sit
// close vertically; the separated edge strips retain both complete subjects.
export const AUTHORED_PROPS=Object.freeze({
 arch:{source:[29,7,424,442]},bell:{source:[485,15,376,433],parts:[[485,15,376,428],[620,443,90,5]]},
 bench:{source:[904,84,433,375]},diverter:{source:[1357,134,394,309]},
 claybench:{source:[32,475,428,381]},hearth:{source:[477,443,421,420],parts:[[477,448,421,415],[715,443,100,5]]},
 reedbank:{source:[915,482,452,394]},window:{source:[1392,443,356,432]}
});

const frame=(name,source,anchor,parts)=>Object.freeze({name,source:Object.freeze(source),anchor:Object.freeze(anchor),...(parts?{parts:Object.freeze(parts.map(Object.freeze))}:{})});

export const AUTHORED_MOTION_ATLASES=Object.freeze({
 sable:Object.freeze({asset:'sableMotion',width:1341,height:1173,referenceHeight:258,frames:Object.freeze([
  frame('idle',[68,31,199,263],[166,291]),
  frame('breathe',[379,30,198,263],[478,290]),
  frame('stride-contact',[661,48,289,247],[832,292]),
  frame('stride-pass',[1015,47,273,248],[1170,292]),
  frame('stride-opposite',[17,337,289,241],[164,575]),
  frame('stride-return',[352,338,269,240],[499,575]),
  frame('brake',[712,332,263,246],[848,575]),
  frame('turn',[1048,337,272,244],[1172,578]),
  frame('anticipate',[33,613,261,237],[164,847]),
  frame('swing',[366,594,252,256],[496,847]),
  // These two wide actions cross the nominal grid. Two source pieces retain
  // the entire original pose while excluding the adjacent sword/coat. Their
  // destination offsets remain identical to their positions in the source sheet.
  frame('strike',[669,626,405,224],[824,847],[[669,626,336,224],[1005,672,69,37]]),
  frame('follow-through',[1048,639,281,210],[1180,846],[[1076,639,253,210],[1048,711,28,138]]),
  frame('recover',[48,868,233,261],[166,1126]),
  frame('hurt',[408,885,220,244],[505,1126]),
  frame('guard',[704,875,251,254],[832,1126]),
  frame('down',[1033,923,292,202],[1190,1122])
 ])}),
 herald:Object.freeze({asset:'heraldMotion',width:1448,height:1086,referenceHeight:285,frames:Object.freeze([
  frame('idle',[27,43,318,291],[195,331]),
  frame('breathe',[392,47,311,288],[570,332]),
  frame('stride-contact',[739,40,351,301],[928,338]),
  frame('stride-pass',[1129,42,300,297],[1290,336]),
  frame('stride-opposite',[26,402,323,285],[194,684]),
  frame('stride-return',[380,398,348,293],[559,688]),
  frame('anticipate',[744,427,347,266],[927,690]),
  frame('strike',[1115,395,317,299],[1285,691]),
  frame('slam',[17,810,354,220],[198,1027]),
  frame('recover',[390,729,333,305],[561,1031]),
  frame('hurt',[752,737,308,293],[917,1027]),
  frame('down',[1106,825,323,212],[1287,1034])
 ])}),
 moonveil:Object.freeze({asset:'moonveilMotion',width:1536,height:1024,referenceHeight:300,frames:Object.freeze([
  frame('hover',[71,56,394,270],[311,321]),
  frame('upstroke',[649,7,217,328],[823,346]),
  frame('downstroke',[1035,60,434,281],[1307,340]),
  frame('return',[94,386,366,260],[330,654]),
  frame('anticipate',[584,388,342,266],[885,662]),
  frame('release',[1029,413,469,245],[1347,699]),
  frame('recover',[114,695,335,274],[320,962]),
  frame('hurt',[625,702,293,279],[876,961]),
  frame('down',[1109,716,317,254],[1335,965])
 ])})
});

function usableImage(image,source){
 if(!image||image.complete===false)return false;
 const w=image.naturalWidth??image.width,h=image.naturalHeight??image.height;
 return Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0&&source[0]>=0&&source[1]>=0&&source[0]+source[2]<=w&&source[1]+source[3]<=h;
}
const finite=(...values)=>values.every(Number.isFinite);

/** Bottom-center fit. Width/height are a containing box, never a stretch. */
export function drawAuthoredProp(ctx,image,id,x,y,width,height){
 const prop=AUTHORED_PROPS[id];
 if(!prop||!ctx?.drawImage||!finite(x,y,width,height)||width<=0||height<=0||!usableImage(image,prop.source))return false;
 const [sx,sy,sw,sh]=prop.source,k=Math.min(width/sw,height/sh),w=sw*k,h=sh*k;
 for(const [px,py,pw,ph] of prop.parts||[prop.source])ctx.drawImage(image,px,py,pw,ph,x-w/2+(px-sx)*k,y-h+(py-sy)*k,pw*k,ph*k);
 return true;
}

/** Feet/body registration and ONE fixed scale for the entire animation.
 * `height` denotes the atlas reference standing height, not each frame's bbox.
 */
export function drawAuthoredMotion(ctx,assets,selection,x,y,height,{flip=false}={}){
 const atlas=AUTHORED_MOTION_ATLASES[selection?.atlas],pose=atlas?.frames[selection?.frame],image=assets?.[atlas?.asset];
 if(!pose||!ctx?.drawImage||!ctx?.save||!finite(x,y,height)||height<=0||!usableImage(image,pose.source))return false;
 const k=height/atlas.referenceHeight,[ax,ay]=pose.anchor;
 ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
 for(const source of pose.parts||[pose.source]){
  const [sx,sy,sw,sh]=source;
  ctx.drawImage(image,sx,sy,sw,sh,(sx-ax)*k,(sy-ay)*k,sw*k,sh*k);
 }
 ctx.restore();return true;
}
