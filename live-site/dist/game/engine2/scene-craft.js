import {drawAuthoredBoundary} from './authored-scenery.js?v=5.38';
import {regionalSiteSpec,drawRegionalProp,regionalPropOcclusion} from './environment-art-v17.js?v=5.22.0';
import {paintRegionalGround} from './environment-detail-pass.js?v=5.22.0';
import {repertoireSiteSpec,drawRepertoireProp,drawRepertoireMechanism,mechanismIdentity} from './scene-prop-repertoire.js?v=5.22.0';
import {environmentFor} from './environment.js?v=5.18.0';
import {isInteriorScene} from './scene-identity.js';
import {outdoorLayout} from './outdoor-layout.js?v=5.22.0';

// These are scene decorations, never colliders. Positions use world tile centres.
// The plan is prepared on scene entry; the draw passes visit only the visible sites.
const TILE=48,TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PALETTES={
 garden:{shadow:'#152b2a',mid:'#36584b',leaf:'#657c56',edge:'#b5bd86',accent:'#c3ab73',stone:'#777f76',light:'#e4d5a5',water:'#719e9d'},
 water:{shadow:'#19363d',mid:'#365f60',leaf:'#658477',edge:'#b9c9ac',accent:'#ae9b6d',stone:'#6f8b8b',light:'#d6e6cb',water:'#77bdba'},
 forge:{shadow:'#292b30',mid:'#65584a',leaf:'#85826a',edge:'#b6a883',accent:'#c38a53',stone:'#7a7c75',light:'#edc584',water:'#82aeb0'},
 stone:{shadow:'#252d3d',mid:'#4c5a69',leaf:'#69798b',edge:'#b1b6b3',accent:'#b69b76',stone:'#778590',light:'#d9dfcf',water:'#86bdc8'},
 glass:{shadow:'#273246',mid:'#465b70',leaf:'#6e8b93',edge:'#b7cfcb',accent:'#b29c77',stone:'#748d9c',light:'#d1ebe2',water:'#92d2d3'}
};
// Measured crops of the delivered original transparent artwork. No runtime pixel
// reads, colour-keying or atlas preparation are involved in either graphics mode.
export const SCENE_PROP_CROPS=Object.freeze([
 [39,15,399,429],[469,21,418,421],[888,21,439,423],[1350,0,397,444],
 [19,444,425,401],[444,450,443,413],[888,444,442,399],[1330,444,426,427]
].map(v=>Object.freeze(v)));
export function craftAtlasSpec(site,scene=null){
 if(site.indoor)return null;
 if(site.landmark){const id=site.kind==='furnace'?1:site.kind==='gauge'?2:site.kind==='mast'?(/relay/.test(site.storyKind||'')?3:7):null;return id===null?null:{id,crop:SCENE_PROP_CROPS[id],height:site.kind==='gauge'?150:site.kind==='furnace'?146:145};}
 const naturalStone=/stone|rock/.test(site.kind)&&scene&&/^(woodland|village|riverbank|mangrove|spore|coral)$/.test(environmentFor(scene).style);
 const id=naturalStone?4:/reed|water/.test(site.kind)?5:/fern|garden|root/.test(site.kind)?4:/glass|crystal/.test(site.kind)?6:null;
 const scale=site.scale||1,height=naturalStone?clamp((60+((site.seed||0)>>>0)%13)*scale,60,72)/scale:id===5?clamp(74*scale,60,80)/scale:id===4?clamp(80*scale,65,85)/scale:59;
 return id===null?null:{id,crop:SCENE_PROP_CROPS[id],height};
}
/** Actual interaction artwork, selected from the scene's narrative identity. */
export function sceneMechanismSpec(scene,object){
 if(!scene||!object||!['puzzle','switch','listen','project'].includes(object.type))return null;
 // Furnished rooms already contain their actual mechanisms and wall fixtures.
 // A bank-sized painted object must never be laid over household architecture.
 if(scene.household&&!(object.type==='listen'&&/observatory|mast|signal/.test((scene.key||'')+' '+(object.label||''))))return null;
 const identity=mechanismIdentity(object),indoor=isInteriorScene(scene);if(!identity)return null;
 let id;if(/mira|archive|guild|ledger|witness|tablet/.test(identity))id=6;else if(/rook|forge|furnace|caldera|kiln|regulator|workshop|instrumentworks/.test(identity))id=1;else if(/riven|iona|river|lowbank|flood|water|tide|sluice|cistern|reedbank|mangrove/.test(identity))id=2;else if(/veyr|storm|observatory|mast|summit/.test(identity))id=7;else if(/sable|reed|home|town|festival|forest|grove|garden/.test(identity))id=object.type==='switch'&&!indoor?0:3;else return null;
 // A mechanism is a usable object, smaller than the monumental bank landmarks.
 const height=indoor?(id===6?90:96):id===2?112:id===1?108:id===3?110:104;
 return {id,crop:SCENE_PROP_CROPS[id],height,width:height*SCENE_PROP_CROPS[id][2]/SCENE_PROP_CROPS[id][3],indoor};
}
export function drawSceneMechanism(renderer,scene,object,x,y){
 if(drawRepertoireMechanism(renderer,scene,object,x,y))return true;
 if(scene.originId==='sable-reed'&&object.originStep===1&&renderer.assets?.home){renderer.atlas('home',3,0,x*TILE,y*TILE,78,86);return true;}
 const atlas=renderer?.assets?.sceneProps,spec=atlas?.width?sceneMechanismSpec(scene,object):null;if(!spec||!Number.isFinite(x)||!Number.isFinite(y))return false;
 const c=renderer.ctx,actors=[renderer.lastWorld?.state,...(renderer.followers||[])].filter(Boolean),covered=actors.some(a=>Number.isFinite(a.x+a.y)&&a.y<y+.04&&a.y>y-spec.height/TILE-1&&Math.abs(a.x-x)<spec.width/TILE*.5+.24),[sx,sy,sw,sh]=spec.crop;
 c.save();c.translate(x*TILE,y*TILE);c.globalAlpha*=covered?.45:1;c.drawImage(atlas,sx,sy,sw,sh,-spec.width/2,-spec.height+3,spec.width,spec.height);c.restore();return true;
}
const hash=(x,y,s=1)=>{let n=Math.imul((x|0)+137,374761393)^Math.imul((y|0)+257,668265263)^Math.imul(s,1597334677);n=Math.imul(n^(n>>>13),1274126177);return(n^(n>>>16))>>>0;};
const finitePoint=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]);
const open=(s,x,y)=>s.floor?.[Math.floor(y)]?.[Math.floor(x)]==='.';
const near=(a,b,r)=>Math.hypot(a[0]-b[0],a[1]-b[1])<r;
function materialFor(scene){const e=environmentFor(scene),style=e.style||e.id||'';return /water|river|coral|mangrove|salt|reed|flood/.test(style)?'water':/foundry|caldera|kiln|forge|lava/.test(style)?'forge':/crystal|aurora|spore/.test(style)?'glass':/ruin|highland|ice|sand|storm/.test(style)?'stone':'garden';}
function spansFor(scene){const rows=[];for(let y=0;y<(scene.height||0);y++){let left=-1;for(let x=0;x<=(scene.width||0);x++){if(x<scene.width&&open(scene,x,y)){if(left<0)left=x;}else if(left>=0){rows.push({x:left,y,w:x-left});left=-1;}}}return rows;}
function narrativeKind(kind,material){return /furnace|kiln|forge/.test(kind)?'furnace':/rail|signal/.test(kind)?'signal':/archive|lamp/.test(kind)?'lamp':/sluice|flood|gauge/.test(kind)?'gauge':/mast|relay|listen/.test(kind)?'mast':material==='water'?'gauge':material==='forge'?'furnace':'mast';}
function dressingKind(material,seed){return material==='water'?(seed%3?'reeds':'stone'):material==='forge'?(seed%3?'forge':'stone'):material==='stone'?(seed%3?'stone':'roots'):material==='glass'?(seed%3?'glass':'fern'):(seed%4===0?'roots':'fern');}
function safetyAnchors(scene){const points=[finitePoint(scene.arrive)?[scene.arrive[0]+.5,scene.arrive[1]+.5]:null,...(scene.doors||[]).map(o=>finitePoint(o.xy)?[o.xy[0]+.5,o.xy[1]+.5]:null),...(scene.objects||[]).filter(o=>o.type!=='furnishing').map(o=>finitePoint(o.xy)?[o.xy[0]+.5,o.xy[1]+.5]:null)];return points.filter(finitePoint);}
function interiorDressing(scene,kind){return /workshop|instrument|security|console|rook|rail/.test(scene.key||'')?'forge':/clinic|iona|lowbank/.test(scene.key||'')?'medicine':/archive|mira|guild/.test(scene.key||'')?'ledgers':'reedcraft';}

export function buildSceneCraft(scene){
 const authored=scene.authoredOpening||{},indoor=isInteriorScene(scene),material=authored.materialKind||authored.landmark?.materialKind||materialFor(scene),palette={...(PALETTES[material]||PALETTES.garden),...(authored.palette||{})},anchors=safetyAnchors(scene),quietRadius=clamp(authored.quietRadius||2.3,1.8,4),sites=[],landmarks=[],width=scene.width||0,height=scene.height||0;
 if(!indoor){const composition=outdoorLayout(scene),approach=(authored.approach||[]).filter(finitePoint).filter(p=>open(scene,...p)).map(p=>p.slice(0,2));return {enabled:!!(width&&height),scene,indoor,material,palette,sites:composition.sites,landmarks:composition.landmarks.map(p=>({...p,material})),approach,spans:spansFor(scene),quietRadius,composition};}
 const safe=(x,y)=>x>=.5&&y>=.5&&x<width&&y<height&&!open(scene,x,y)&&!anchors.some(p=>near([x,y],p,quietRadius));
 // Authored compositions take precedence. The fallback follows the actual bank,
 // never a random field of objects in the middle of a walkable clearing.
 for(const p of authored.clusters||[]){if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!safe(p.x,p.y))continue;const seed=(p.seed??hash(p.x*7,p.y*7))>>>0;sites.push({x:p.x,y:p.y,kind:indoor?interiorDressing(scene,p.kind):p.kind||dressingKind(material,p.seed||0),seed,flip:!indoor&&seed%2===0,scale:clamp(p.scale||1,.65,1.35),authored:true,indoor});if(sites.length>=96)break;}

 const landmark=authored.landmark;if(landmark&&finitePoint(landmark.xy)&&safe(...landmark.xy)){const focus=finitePoint(landmark.focus)?landmark.focus:landmark.xy;landmarks.push({x:landmark.xy[0],y:landmark.xy[1],focus:focus.slice(0,2),kind:narrativeKind(landmark.kind||'',material),storyKind:landmark.kind||'',radius:landmark.radius,seed:hash(scene.location||1,83),scale:clamp(landmark.scale||1,.75,1.35),label:landmark.label||'',material,indoor});}
 const approach=(authored.approach||[]).filter(finitePoint).filter(p=>open(scene,...p)).map(p=>p.slice(0,2));
 return {enabled:!!(width&&height),scene,indoor,material,palette,sites:sites.filter(p=>!landmarks.some(l=>Math.hypot(l.x-p.x,l.y-p.y)<2.1)),landmarks,approach,spans:spansFor(scene),quietRadius};
}

export function visibleCraftSites(plan,view,limit=72){if(!plan?.enabled||plan.indoor)return[];const v=view||{x0:0,y0:0,x1:plan.scene.width,y1:plan.scene.height};return [...plan.landmarks.map(p=>({...p,landmark:true})),...plan.sites].filter(p=>p.x>=v.x0-3&&p.x<=v.x1+3&&p.y>=v.y0-1&&p.y<=v.y1+4).slice(0,Math.min(96,Math.max(0,limit)));}

export function craftOcclusion(site,actors=[]){const h=(site.landmark?3.2:site.kind==='reeds'?1.5:.9)*(site.scale||1),w=(site.landmark?1.65:.78)*(site.scale||1);for(const a of actors)if(Number.isFinite(a?.x)&&Number.isFinite(a?.y)&&a.y<site.y+.05&&a.y>site.y-h-1&&Math.abs(a.x-site.x)<w+.28)return .3;return 1;}

function clipWalkable(c,plan,view){c.beginPath();for(const r of plan.spans)if(r.y>=view.y0-1&&r.y<=view.y1+1&&r.x+r.w>=view.x0&&r.x<=view.x1)c.rect(r.x*TILE,r.y*TILE,r.w*TILE+.2,TILE+.2);c.clip();}
const ellipse=(c,x,y,rx,ry,fill,angle=0)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);c.fill();};
function stroke(c,color,width,points){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function court(c,p,palette){const x=p.focus[0]*TILE,y=p.focus[1]*TILE,r=clamp(p.radius||1.5,.8,2.3)*TILE;c.save();c.translate(x,y);ellipse(c,0,5,r+12,r*.56+8,palette.shadow+'27');for(let i=0;i<13;i++){const a=i/13*TAU,rx=Math.cos(a)*r*.7,ry=Math.sin(a)*r*.43,w=11+(i%3)*3,h=6+(i%2)*2;c.fillStyle=i%3?palette.stone+'48':palette.edge+'45';c.beginPath();c.moveTo(rx-w,ry);c.quadraticCurveTo(rx-w,ry-h,rx,ry-h-1);c.lineTo(rx+w,ry-h*.3);c.lineTo(rx+w*.8,ry+h);c.quadraticCurveTo(rx,ry+h+2,rx-w,ry);c.fill();stroke(c,palette.light+'42',.9,[[rx-w*.6,ry-h*.7],[rx+w*.6,ry-h*.4]]);}c.strokeStyle=palette.accent+'55';c.lineWidth=1.2;c.beginPath();c.ellipse(0,0,r*.52,r*.31,0,.18,Math.PI*1.83);c.stroke();for(let i=0;i<5;i++){const a=(i+.25)/5*TAU;stroke(c,palette.accent+'55',1.2,[[Math.cos(a)*31,Math.sin(a)*18],[Math.cos(a)*38,Math.sin(a)*22]]);}c.restore();}

export function paintSceneCraftGround(renderer,plan,view){if(!plan?.enabled)return;const c=renderer.ctx,v=view||{x0:0,y0:0,x1:plan.scene.width,y1:plan.scene.height},p=plan.palette;c.save();clipWalkable(c,plan,v);paintRegionalGround(renderer,plan,v);c.lineCap=c.lineJoin='round';
 if(plan.approach.length>1){c.beginPath();plan.approach.forEach(([x,y],i)=>i?c.lineTo(x*TILE,y*TILE):c.moveTo(x*TILE,y*TILE));c.strokeStyle=p.shadow+'13';c.lineWidth=29;c.stroke();c.strokeStyle=p.edge+'12';c.lineWidth=18;c.stroke();}
 // The artwork already contains root contact. Repeated broad ellipses and
 // rings made every plant look like a separate display plinth. Only the one
 // authored focal court receives an additional ground treatment.
 for(const site of visibleCraftSites(plan,v,renderer.compatibility?36:72))if(site.landmark)court(c,site,p);
 c.restore();}

function fern(c,p,seed,simple){const count=simple?5:8;ellipse(c,0,2,36,8,p.shadow+'50');for(let f=0;f<count;f++){const a=(-Math.PI+.22)+f/(count-1)*(Math.PI-.44),length=30+(seed+f*13)%24,dx=Math.cos(a)*length,dy=Math.sin(a)*length*.8-5;c.strokeStyle=p.mid;c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(dx*.6,dy*.72,dx,dy);c.stroke();for(let i=1;i<7;i++){const t=i/7,x=dx*t,y=dy*(t*.72+t*t*.28),spread=(1-t)*9+1;for(const side of[-1,1]){c.fillStyle=i%2?p.leaf:p.mid;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+side*spread,y-7,x+side*spread*.95+dx*.05,y-9);c.quadraticCurveTo(x+side*spread*.4,y-3,x,y);c.fill();}if(!simple&&i%2===0)stroke(c,p.edge+'7a',.65,[[x,y],[x+spread*.65,y-6]]);}}}
function reeds(c,p,seed,simple){ellipse(c,0,2,33,7,p.shadow+'55');for(let i=0;i<(simple?8:15);i++){const x=Math.sin(i*2.37+seed)*28,h=37+(seed+i*17)%31,sway=Math.sin(i)*8;c.strokeStyle=i%3?p.leaf:p.mid;c.lineWidth=i%3?1.6:2.2;c.beginPath();c.moveTo(x,1);c.quadraticCurveTo(x+sway*.3,-h*.6,x+sway,-h);c.stroke();if(i%3===0){c.fillStyle=p.accent;c.beginPath();c.roundRect(x+sway-1.5,-h-8,3,12,1.5);c.fill();}if(i%2){c.fillStyle=i%3?p.mid:p.leaf;c.beginPath();c.moveTo(x,-9);c.quadraticCurveTo(x+16,-30,x+12,-43);c.quadraticCurveTo(x+5,-30,x,-9);c.fill();}}}
function stone(c,p,seed,simple){ellipse(c,1,3,36,8,p.shadow+'65');for(let i=0;i<3;i++){const x=(i-1)*20,y=i===1?0:-3,w=15+(seed+i*7)%10,h=17+(seed+i*3)%14,g=c.createLinearGradient(x-w,y-h,x+w,y);g.addColorStop(0,p.edge);g.addColorStop(.25,p.stone);g.addColorStop(1,p.mid);c.fillStyle=g;c.beginPath();c.moveTo(x-w,y-3);c.bezierCurveTo(x-w-3,y-h*.5,x-w*.5,y-h,x+2,y-h);c.lineTo(x+w*.75,y-h*.72);c.quadraticCurveTo(x+w+4,y-h*.3,x+w,y);c.quadraticCurveTo(x,y+7,x-w,y-3);c.fill();stroke(c,p.light+'55',1,[[x-w*.66,y-h*.5],[x-w*.2,y-h*.82],[x+w*.5,y-h*.66]]);if(!simple){stroke(c,p.shadow+'66',1,[[x+2,y-h*.7],[x-2,y-h*.27],[x+6,y-2]]);ellipse(c,x-w*.4,y-h*.4,w*.55,3,p.leaf+'40',-.2);}}}
function rootBank(c,p,seed,simple){stone(c,p,seed,true);for(let i=0;i<(simple?4:7);i++){const sx=-24+i*8,ex=sx+Math.sin(i*1.7+seed)*21;c.strokeStyle=i%2?p.mid:p.accent;c.lineWidth=4-i%3;c.beginPath();c.moveTo(sx,-31-i%3*8);c.bezierCurveTo(sx+12,-20,ex-6,-6,ex,4);c.stroke();stroke(c,p.edge+'55',.8,[[sx+1,-27-i%3*8],[ex+2,2]]);}if(!simple){c.save();c.translate(-18,-4);c.scale(.55,.55);fern(c,p,seed,true);c.restore();}}
function salvage(c,p,seed,simple,glass=false){stone(c,p,seed,true);if(glass){for(let i=0;i<4;i++){const x=-21+i*13,h=24+(seed+i*13)%26;c.fillStyle=i%2?p.water:p.mid;c.beginPath();c.moveTo(x-7,0);c.lineTo(x-5,-h*.7);c.lineTo(x+1,-h);c.lineTo(x+7,-h*.75);c.lineTo(x+5,-2);c.closePath();c.fill();stroke(c,p.light+'99',1,[[x+1,-h+3],[x+1,-5]]);}}else{c.save();c.rotate(-.16);c.fillStyle=p.shadow;c.beginPath();c.roundRect(-26,-28,48,24,6);c.fill();c.strokeStyle=p.accent;c.lineWidth=2;c.stroke();for(let i=0;i<5;i++)stroke(c,p.edge+'88',1,[[-18+i*8,-24],[-18+i*8,-10]]);ellipse(c,-31,-12,8,10,p.mid);ellipse(c,-31,-12,4,6,p.shadow);if(!simple){stroke(c,p.accent,2,[[16,-21],[32,-26],[35,-16]]);for(const x of[-22,18])ellipse(c,x,-8,1.6,1.6,p.light);}c.restore();}}

function base(c,p,w=35){ellipse(c,0,3,w+9,9,p.shadow+'5e');c.fillStyle=p.shadow;c.beginPath();c.roundRect(-w,-10,w*2,13,5);c.fill();stroke(c,p.edge+'88',1.4,[[-w+4,-8],[w-4,-8]]);}
function bolt(c,x,y,p){ellipse(c,x,y,2,2,p.shadow);ellipse(c,x-.4,y-.6,1.1,.8,p.edge);}
function mast(c,p,seed,simple){base(c,p,31);c.lineCap='round';stroke(c,p.shadow,12,[[0,-7],[0,-115]]);stroke(c,p.mid,8,[[0,-7],[0,-115]]);stroke(c,p.accent,2,[[-2,-8],[-2,-114]]);for(let i=0;i<3;i++){const y=-38-i*29,w=34-i*5;stroke(c,p.shadow,8,[[-w,y],[w,y]]);stroke(c,p.accent,4,[[-w,y-1],[w,y-1]]);for(const side of[-1,1]){const x=w*side;stroke(c,p.edge+'aa',1,[[x,y],[x,y+18]]);ellipse(c,x,y+20,5,8,p.mid);ellipse(c,x-1,y+18,3,5,p.water);stroke(c,p.light+'88',.7,[[x-2,y+15],[x-2,y+20]]);}}c.strokeStyle=p.accent;c.lineWidth=3;c.beginPath();c.arc(0,-119,13,.2,Math.PI*1.8);c.stroke();ellipse(c,0,-119,5,5,p.water);if(!simple){stroke(c,p.accent+'bb',1,[[-28,-67],[27,-98],[-25,-39],[28,-67]]);for(let i=0;i<3;i++)bolt(c,0,-14-i*8,p);}}
function gauge(c,p,seed,simple){base(c,p,39);c.fillStyle=p.mid;c.strokeStyle=p.shadow;c.lineWidth=4;c.beginPath();c.moveTo(-32,-8);c.lineTo(-32,-72);c.quadraticCurveTo(-31,-103,0,-104);c.quadraticCurveTo(31,-103,32,-72);c.lineTo(32,-8);c.closePath();c.fill();c.stroke();c.fillStyle=p.shadow;c.beginPath();c.roundRect(-22,-82,44,66,11);c.fill();c.fillStyle=p.water+'a8';c.fillRect(-17,-50,34,27);for(let i=0;i<5;i++)stroke(c,p.edge+'b0',1.2,[[-14,-32-i*8],[-6+(i%2)*4,-32-i*8]]);c.strokeStyle=p.accent;c.lineWidth=4;c.beginPath();c.arc(15,-71,12,0,TAU);c.stroke();stroke(c,p.accent,2,[[15,-83],[15,-59],[3,-71],[27,-71]]);stroke(c,p.edge,1.2,[[15,-71],[19,-78]]);stroke(c,p.accent,5,[[32,-37],[45,-37],[45,-15]]);ellipse(c,45,-12,7,4,p.shadow);if(!simple){for(const x of[-28,28])for(const y of[-20,-52,-73])bolt(c,x,y,p);stroke(c,p.light+'77',1.2,[[-28,-72],[-26,-83],[-16,-93]]);}}
function furnace(c,p,seed,simple){base(c,p,43);const g=c.createLinearGradient(-39,-92,38,0);g.addColorStop(0,p.accent);g.addColorStop(.5,p.mid);g.addColorStop(1,p.shadow);c.fillStyle=g;c.strokeStyle=p.shadow;c.lineWidth=4;c.beginPath();c.moveTo(-37,-8);c.lineTo(-35,-61);c.bezierCurveTo(-32,-102,28,-105,35,-61);c.lineTo(38,-8);c.closePath();c.fill();c.stroke();c.fillStyle=p.shadow;c.beginPath();c.roundRect(-22,-55,44,39,[16,16,4,4]);c.fill();const fire=c.createLinearGradient(0,-48,0,-20);fire.addColorStop(0,'#c56c3e');fire.addColorStop(.7,'#f0bb69');fire.addColorStop(1,'#9e663c');c.fillStyle=fire;c.beginPath();c.roundRect(-14,-46,28,24,[10,10,2,2]);c.fill();for(let i=0;i<4;i++)stroke(c,p.shadow,3,[[-13+i*9,-45],[-13+i*9,-20]]);c.fillStyle=p.shadow;c.fillRect(12,-113,16,35);c.fillStyle=p.mid;c.fillRect(15,-112,9,31);stroke(c,p.accent,3,[[11,-113],[29,-113]]);c.strokeStyle=p.accent;c.lineWidth=2;c.beginPath();c.arc(-11,-74,10,0,TAU);c.stroke();stroke(c,p.edge,1,[[-11,-74],[-7,-79]]);if(!simple)for(let i=0;i<3;i++){stroke(c,p.edge+'66',1,[[-33,-22-i*19],[-24,-22-i*19]]);stroke(c,p.shadow+'88',1,[[25,-31-i*18],[34,-31-i*18]]);}}
function signal(c,p,seed,simple){base(c,p,36);for(const x of[-23,23]){stroke(c,p.shadow,9,[[x,-8],[x,-110]]);stroke(c,p.mid,5,[[x-1,-8],[x-1,-110]]);}stroke(c,p.shadow,10,[[-30,-100],[31,-100]]);stroke(c,p.accent,5,[[-30,-102],[31,-102]]);c.fillStyle=p.shadow;c.beginPath();c.roundRect(-17,-91,34,56,8);c.fill();ellipse(c,0,-74,9,10,p.accent);ellipse(c,-1,-76,5,6,p.light);ellipse(c,0,-49,8,9,p.mid);stroke(c,p.accent,5,[[20,-86],[42,-98]]);ellipse(c,43,-98,5,5,p.edge);if(!simple){for(let y=-20;y>-85;y-=14){stroke(c,p.accent+'77',1,[[-24,y],[24,y-10]]);}bolt(c,-23,-100,p);bolt(c,23,-100,p);}}
function lamp(c,p,seed,simple){base(c,p,30);stroke(c,p.shadow,9,[[-12,-8],[-12,-57],[12,-82],[31,-82]]);stroke(c,p.accent,4,[[-13,-8],[-13,-57],[11,-83],[31,-83]]);ellipse(c,-12,-56,6,6,p.mid);ellipse(c,11,-82,5,5,p.edge);c.fillStyle=p.mid;c.beginPath();c.moveTo(24,-85);c.lineTo(38,-85);c.lineTo(46,-66);c.quadraticCurveTo(31,-61,17,-66);c.closePath();c.fill();stroke(c,p.edge,1.5,[[19,-67],[43,-67]]);ellipse(c,31,-66,10,3,p.light);if(!simple){c.fillStyle=p.light+'12';c.beginPath();c.moveTo(23,-64);c.lineTo(47,-64);c.lineTo(59,-10);c.lineTo(3,-10);c.closePath();c.fill();}c.save();c.translate(-1,-14);c.rotate(-.08);c.fillStyle=p.mid;c.fillRect(-20,-8,38,10);c.fillStyle=p.edge;c.fillRect(-18,-11,35,6);for(let i=0;i<4;i++)stroke(c,p.shadow+'77',.8,[[-14,-9+i*1.4],[8,-9+i*1.4]]);c.restore();}
function stillLife(c,p,kind,seed){ellipse(c,0,3,29,6,p.shadow+'44');if(kind==='medicine'){c.fillStyle=p.mid;c.beginPath();c.roundRect(-28,-8,56,10,3);c.fill();for(let i=0;i<4;i++){const x=-18+i*12,h=17+(i%2)*7;c.fillStyle=i%2?p.water:p.leaf;c.beginPath();c.roundRect(x-4,-h,8,h-6,[3,3,2,2]);c.fill();c.fillStyle=p.accent;c.fillRect(x-3,-h-3,6,4);c.fillStyle=p.light+'b0';c.fillRect(x-2,-h+7,4,5);}}else if(kind==='ledgers'){for(let i=0;i<4;i++){const x=-14+(i%2)*5,y=-6-i*5;c.fillStyle=i%2?p.mid:p.accent;c.beginPath();c.roundRect(x-11,y-5,39-i*3,6,1);c.fill();stroke(c,p.light+'aa',.8,[[x-6,y-2],[x+17-i*3,y-2]]);}c.fillStyle=p.edge;c.beginPath();c.moveTo(13,-5);c.quadraticCurveTo(20,-24,30,-26);c.quadraticCurveTo(30,-15,13,-5);c.fill();stroke(c,p.mid,1,[[13,-5],[29,-25]]);}else{c.fillStyle=p.mid;c.beginPath();c.moveTo(-24,-4);c.lineTo(-28,-21);c.quadraticCurveTo(0,-29,24,-21);c.lineTo(20,-4);c.closePath();c.fill();for(let i=0;i<6;i++)stroke(c,p.accent+'aa',1,[[-24+i*8,-21],[-20+i*7,-5]]);for(let i=0;i<4;i++)stroke(c,p.edge+'aa',1,[[-25,-19+i*4],[22,-19+i*4]]);for(let i=0;i<6;i++)stroke(c,i%2?p.leaf:p.edge,1.2,[[-14+i*5,-20],[-20+i*7,-41+(i%3)*4]]);}}

const stamps=new Map();
function paintSite(c,site,p,simple){c.save();c.lineCap=c.lineJoin='round';if(site.landmark){({mast,gauge,furnace,signal,lamp}[site.kind]||mast)(c,p,site.seed,simple);}else if(site.indoor&&site.kind!=='forge')stillLife(c,p,site.kind,site.seed);else if(/reed|water/.test(site.kind))reeds(c,p,site.seed,simple);else if(/root/.test(site.kind))rootBank(c,p,site.seed,simple);else if(/stone|rock/.test(site.kind))stone(c,p,site.seed,simple);else if(/forge|scrap/.test(site.kind))salvage(c,p,site.seed,simple);else if(/glass|crystal/.test(site.kind))salvage(c,p,site.seed,simple,true);else fern(c,p,site.seed,simple);c.restore();}
function stampFor(site,plan){const key=[site.landmark?1:0,site.kind,site.seed%4,...Object.values(plan.palette)].join('|');if(stamps.has(key))return stamps.get(key);const a=document.createElement('canvas');a.width=192;a.height=192;const c=a.getContext('2d');if(!c)return null;c.translate(96,165);paintSite(c,{...site,seed:site.seed%4},plan.palette,false);stamps.set(key,a);if(stamps.size>128)stamps.delete(stamps.keys().next().value);return a;}

export function sceneCraftObjects(renderer,plan,view,world){
 if(!plan?.enabled)return[];const actors=[world?.state,...(renderer.followers||[])].filter(Boolean);
 return visibleCraftSites(plan,view,renderer.compatibility?38:72).map(site=>{
  const regional=regionalSiteSpec(site,plan.scene,plan),plant=regional?/cattail|willow|meadow|agave|cactus|pine|fungal|resin|coral-fan|mending-line/.test(regional.id):/fern|reed|garden/.test(site.kind);
  return {y:site.y+.02,draw:()=>{const c=renderer.ctx,alpha=Math.min(craftOcclusion(site,actors),regional?regionalPropOcclusion(site,regional,actors):1),wind=!site.landmark&&plant&&!renderer.comfort?.steadyLighting?Math.sin((renderer.time||0)*1.12+site.seed%11)*.008:0;
   c.save();c.translate(site.x*TILE,site.y*TILE);c.globalAlpha*=alpha;c.rotate(wind);c.scale(site.flip?-site.scale:site.scale,site.scale);
   const extra=repertoireSiteSpec(site,plan.scene),painted=drawRegionalProp(renderer,regional,0,3)||drawAuthoredBoundary(renderer,site,plan)||(extra&&drawRepertoireProp(renderer,extra.id,0,0,{...extra,flip:false}));
   const atlas=renderer.assets?.sceneProps,spec=atlas?.width?craftAtlasSpec(site,plan.scene):null;
   if(!painted&&spec){const [sx,sy,sw,sh]=spec.crop,w=spec.height*sw/sh;c.drawImage(atlas,sx,sy,sw,sh,-w/2,-spec.height+3,w,spec.height);}else if(!painted){const stamp=!renderer.compatibility&&typeof document!=='undefined'?stampFor(site,plan):null;if(stamp)c.drawImage(stamp,-96,-165);else paintSite(c,site,plan.palette,true);}c.restore();
  }};
 });
}

export function craftEmitters(plan){if(!plan?.enabled||plan.indoor)return[];return plan.landmarks.filter(p=>p.kind!=='signal').map(p=>({x:p.x,y:p.y-(/mast/.test(p.kind)?2.3:p.kind==='lamp'?1.35:1.1),kind:p.kind==='furnace'?'ember':p.kind==='gauge'?'water':'glass',seed:p.seed}));}
export function paintSceneCraftAtmosphere(renderer,plan,view,world){if(!plan?.enabled||renderer.compatibility)return;const c=renderer.ctx,time=renderer.time||0,p=plan.palette,steady=!!renderer.comfort?.steadyLighting;c.save();for(const e of craftEmitters(plan)){if(e.x<view.x0-2||e.x>view.x1+2||e.y<view.y0-3||e.y>view.y1+2)continue;const light=e.kind==='ember'?'#ecc185':e.kind==='water'?p.water:p.light;for(let i=0;i<(steady?2:5);i++){const cycle=steady?(i+.5)/5:((time*.12+i*.213+e.seed%31/31)%1),x=(e.x+Math.sin(i*2.399+time*.12)*(.16+cycle*.24))*TILE,y=(e.y-cycle*.8)*TILE;c.globalAlpha=Math.sin(cycle*Math.PI)*.38;ellipse(c,x,y,e.kind==='water'?1.4:1.1,e.kind==='water'?.8:1.1,light);}c.globalAlpha=.2;ellipse(c,e.x*TILE,e.y*TILE,4,2,light);}c.restore();}
