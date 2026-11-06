import {environmentFor} from './environment.js?v=5.18.0';
import {isInteriorScene} from './scene-identity.js';

/** Original companion artwork. Crops were measured from the eight connected
 * alpha bodies, rather than guessed equal cells: stump and chimes cross the
 * nominal cell boundary without touching any neighbouring prop. */
// This identity belongs to the unchanged archived PNG source; delivery has its
// own verified hash in development/art/legacy-delivery.json.
export const REPERTOIRE_IMAGE_SHA256='3ba1e7fe5df715f0fba67f14361f7545fd46cf2cef77f1835275bd542830cc7e';
export const REPERTOIRE_IMAGE_SIZE=Object.freeze([1774,887]);
export const REPERTOIRE_ART_URL=new URL('./art/scene-props-v11.webp',import.meta.url).href;
export const REPERTOIRE_PROPS=Object.freeze([
 {id:'rail-signal',crop:[98,8,318,430],height:112},
 {id:'flood-gauge',crop:[517,8,277,432],height:100},
 {id:'archive-desk',crop:[896,31,393,398],height:94},
 {id:'moss-stump',crop:[1326,64,415,365],height:86},
 {id:'amethyst-outcrop',crop:[43,452,371,417],height:86},
 {id:'frost-reeds',crop:[469,451,396,410],height:76},
 {id:'sandstone-shrine',crop:[902,446,418,424],height:126},
 {id:'copper-windchimes',crop:[1372,435,276,439],height:112}
].map(p=>Object.freeze({...p,crop:Object.freeze(p.crop)})));
const T=48,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const number=n=>Number.isFinite(n);
const identity=(scene,object={})=>[scene?.originId,scene?.key,scene?.biome?.style,scene?.biome?.id,scene?.authoredOpening?.landmark?.kind,object.label,object.puzzle_kind].filter(Boolean).join(' ').toLowerCase();

/** The pictured tool must be named by the interaction itself. A traveller's
 * origin and the scene palette cannot turn a creature encounter into a machine. */
export function mechanismIdentity(object={}){
 if(object.originStep===2||/^find a way past\b/i.test(String(object.label||'')))return '';
 return [object.mechanismKind,object.mechanism,object.artRole,object.visual,object.label,object.puzzle_kind,object.interactionRole,object.projectKind].filter(value=>typeof value==='string').join(' ').toLowerCase();
}

export function repertoireSiteSpec(site,scene){
 if(!site||!scene||isInteriorScene(scene)||site.indoor)return null;
 const kind=String(site.kind||''),context=identity(scene)+' '+String(environmentFor(scene).style||''),seed=(site.seed||0)>>>0,scale=site.scale||1;let id,height;
 if(site.landmark){if(kind==='signal')id=0;else if(/sand|desert|ochre/.test(context))id=6;else if(kind==='mast'&&!/relay/.test(site.storyKind||''))id=7;else return null;height=id===6?142:132;}
 else if(/ice|frost|aurora|tundra/.test(context)&&/stone|rock|root|reed|glass/.test(kind)){id=5;height=clamp(77*scale,66,86)/scale;}
 else if(/glass|crystal/.test(kind)){id=4;height=clamp((78+seed%13)*scale,72,96)/scale;}
 else if(/root|garden|fern/.test(kind)&&seed%4===0){id=3;height=clamp((77+seed%11)*scale,72,95)/scale;}
 else return null;
 return {id,height,flip:!site.landmark&&!!site.flip};
}

/** Replaces only real interactable mechanisms at their existing positions. */
export function repertoireMechanismSpec(scene,object){
 if(!scene||!object||!['puzzle','switch','listen','project'].includes(object.type))return null;
 const text=mechanismIdentity(object),indoor=isInteriorScene(scene);if(!text)return null;let id;
 if(/archive|ledger|inscription|witness|tablet|reading desk/.test(text))id=2;
 else if(/rail[- ]?signal|railway|semaphore|signal current|signal gate|crossing gate/.test(text))id=0;
 else if(/flood|water gauge|waterline|tide mark|sluice|gauge|cistern|water intake/.test(text))id=1;
 else if(/wind.?chime|storm|observatory|mast|ground conductor|weather/.test(text))id=7;
 else if(!indoor&&/shrine|sandstone|ochre/.test(text))id=6;
 else return null;
 const height=id===2?(indoor?68:76):id===1?(indoor?66:82):id===6?94:indoor?76:90;
 return {id,height,occlusion:true};
}

/** Both graphics modes draw the same-size delivery atlas directly. This never allocates a
 * canvas, reads pixels, changes world state or creates a collider. x/y are tiles. */
export function drawRepertoireProp(renderer,id,x,y,options={}){
 const image=renderer?.assets?.scenePropsExtra||renderer?.assets?.scenePropsV11||renderer?.assets?.sceneRepertoire,prop=typeof id==='string'?REPERTOIRE_PROPS.find(p=>p.id===id):REPERTOIRE_PROPS[id];
 if(!image?.width||!image?.height||!prop||!number(x)||!number(y))return false;
 const [sx,sy,sw,sh]=prop.crop;if(sx+sw>image.width||sy+sh>image.height)return false;
 const height=clamp(number(options.height)?options.height:prop.height,24,190),width=height*sw/sh,alpha=clamp(number(options.alpha)?options.alpha:1,0,1),actors=[renderer.lastWorld?.state,...(renderer.followers||[])].filter(Boolean),covered=options.occlusion&&actors.some(a=>number(a.x)&&number(a.y)&&a.y<y+.05&&a.y>y-height/T-1&&Math.abs(a.x-x)<width/T*.5+.25),c=renderer.ctx;
 if(!c)return false;c.save();c.translate(x*T,y*T);if(options.flip)c.scale(-1,1);c.globalAlpha*=alpha*(covered?.45:1);c.drawImage(image,sx,sy,sw,sh,-width/2,-height+3,width,height);c.restore();return true;
}

export function drawRepertoireMechanism(renderer,scene,object,x,y){const spec=repertoireMechanismSpec(scene,object);return !!spec&&drawRepertoireProp(renderer,spec.id,x,y,spec);}

export const REPERTOIRE_PROMPT="Use case: stylized-concept. Asset type: production transparent sprite atlas for the original top-down action RPG Ash & Aether. Create ONE wide landscape 2:1 PNG sprite sheet with exactly FOUR columns and TWO rows of EIGHT separate complete environment props, one prop centered inside each equal-sized cell. Each cell has generous transparent padding, at least 7% on every edge; every prop, leaf, chain, shadow and base must be completely contained in its own cell with transparent gutters between cells. No object overlaps any other cell. The background must be genuinely fully transparent, not black, white, checkerboard or painted scenery. Camera: consistent 35-degree elevated orthographic view, clearly showing both fronts and tops, each base grounded at the bottom of its cell. Style: richly detailed original hand-painted fantasy RPG game art with coherent rounded silhouettes, warm ochre clay, weathered cool blue stone, moss, verdigris copper and engraved aged brass, crisp readable edges and softly painted material shading, gentle upper-left light, restrained soft contact shadow directly underneath each object. Attractive craftsmanship suitable for a polished shipped indie game, no pixel art and no photorealism. Exact order left to right: TOP ROW cell 0: a compact old railway signal with two glowing brass lanterns and a mechanical semaphore arm on a weathered short frame; cell 1: a flood gauge on a squat mossy stone post, nail tide marks and copper measuring arms, a small blue glass water tube, markings as short notches only, no numerals; cell 2: a compact archive reading desk with rounded clay tablets, an open ledger with abstract illegible strokes, and a curved brass side lamp illuminating the tablets; cell 3: an old broad cut tree stump with exposed roots, moss, shelf fungi and a few tiny wildflowers. BOTTOM ROW cell 4: a luminous amethyst crystal outcrop emerging from dark blue stone and sparse silver moss; cell 5: a frosted stone and pale reed outcrop with delicate ice crystals, cold muted blues, warm straw tips; cell 6: a dry ochre sandstone arch shrine with eroded rounded columns, subtle engraved wave motifs, a small brass bowl, sparse desert grasses; cell 7: copper wind chimes suspended from a gracefully curved weathered wooden frame, on a small stone base, verdigris and warm brass glints. Only these eight objects; no people, no characters, no animals, no readable text, no numerals, no labels, no borders, no grid lines, no background landscape. Preserve clean alpha transparency and the exact 4-by-2 order.";
