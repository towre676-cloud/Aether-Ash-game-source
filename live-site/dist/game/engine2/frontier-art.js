import {environmentPropSpec,drawRegionalProp,regionalPropOcclusion,regionalArtStyle} from './environment-art-v17.js?v=5.22.0';
import {isInteriorScene} from './scene-identity.js';

const SHELTERS=Object.freeze({
 village:'woodland-leanto',woodland:'woodland-leanto',
 sand:'desert-awning',cactus:'desert-awning',salt:'desert-awning',
 riverbank:'marsh-reed-shelter',mangrove:'marsh-reed-shelter',coral:'marsh-reed-shelter',
 ice:'frost-windbreak',aurora:'frost-windbreak',
 foundry:'basalt-refuge',lava:'basalt-refuge',
 highland:'stormcloth-shelter',storm:'stormcloth-shelter',
 spore:'spore-root-shelter',crystal:'marble-alcove',ruins:'marble-alcove',marble:'marble-alcove'
});
const SPECIAL_CAMP_ROLES=Object.freeze(['physicalId','battleRelic','buildingEntrance','affordanceId','authored','authoredArt','authoredId','storyAuthored','storyId','storyRole','bellArc','investigationRole','legacyId','kakeyaStation','wayglassSeam','regional','life']);
function plainOutdoorCamp(scene,object){return object.type==='camp'&&!isInteriorScene(scene)&&!scene.originId&&object.originStep===undefined&&!SPECIAL_CAMP_ROLES.some(key=>object[key]);}

/** The survey and dispatch roles already exist. Their pictures do not create
 * commissions, reveal hidden stages, or change interaction coordinates. */
export function frontierObjectSpec(scene,object){
 if(!scene||!object)return null;
 const style=scene.biome?.style||'',step=object.frontierStep;let id=null,height=88,width=108;
 if(object.type==='frontier-board'){id='frontier-noticeboard';height=88;width=110;}
 else if(object.type==='frontier-landmark'&&step===0){id=['marble','crystal','ice','aurora','lava'].includes(style)?'carved-standing-stone':'survey-marker';height=86;width=94;}
 else if(object.type==='frontier-landmark'&&step===1){
  // The pictured material follows the actual regional repair clue: pressure
  // valves, rain collection, a grounded beacon, a rope anchor, or a light facet.
  if(['storm','aurora'].includes(style)){id='weather-beacon';height=96;width=94;}
  else if(['lava','salt','mangrove'].includes(style)){id='copper-valve';height=84;width=100;}
  else if(style==='spore'){id='rain-catch';height=84;width=100;}
  else if(style==='ice'){id='mooring-bollard';height=72;width=88;}
  else if(style==='crystal'){id='star-slate-cairn';height=86;width=92;}
  // Other repair apparatus keeps its established mechanical drawing until a
  // purpose-specific instrument is authored for that region.
 }
 else if(object.type==='cache'&&!isInteriorScene(scene)&&!object.physicalId&&!object.battleRelic&&!object.buildingEntrance){id='refuge-cache';height=62;width=88;}
 else if(plainOutdoorCamp(scene,object)){
  // Existing rest points keep their exact interaction, label and location.
  // Low, broad roofs retain their natural proportions within three tiles.
  const shelter=SHELTERS[regionalArtStyle(scene)];return shelter?environmentPropSpec(shelter,{width:140}):null;
 }
 return id?environmentPropSpec(id,{height,width}):null;
}

/** Use only a real, non-building exterior route. Architecture keeps its doors,
 * stairs and thresholds, and the caller retains the actual destination label. */
export function frontierWayfindingSpec(scene,exit,{indoor=false}={}){
 if(!scene||!exit||indoor||isInteriorScene(scene)||exit.facade||exit.wallMounted||exit.buildingEntrance)return null;
 if(exit.type&&exit.type!=='portal')return null;
 const destination=exit.to_room||exit.to||exit.to_scene||exit.to_region;
 if(destination===undefined||destination===null||destination==='')return null;
 const architecture=[exit.architecturalKind,exit.to_room,exit.to,exit.travel_label].filter(Boolean).join(' ').toLowerCase();
 if(/stairs|underground|hatch|crypt|drain|home|inn\b|clinic|workshop|chapel|guild|carpenter|instrumentworks|archive|office|attic|vault|chamber|gallery|depot|store|house|reactor|console|security/.test(architecture))return null;
 const style=scene.biome?.style||'',direction=horizontalExitDirection(scene,exit),stone=!direction||['marble','crystal','ice','aurora','storm','lava'].includes(style);
 const spec=environmentPropSpec(stone?'travel-waystone':'trail-fingerpost',{height:stone?74:80,width:82});
 return spec?{...spec,flip:!stone&&direction==='west'}:null;
}

// The painted fingerpost points right. Mirror it only when the real route sits
// clearly on the west edge; vertical or ambiguous routes use a neutral stone.
// No guessed arrow is drawn toward a nearby wall or an unrelated destination.
function horizontalExitDirection(scene,exit){
 const side=exit.wallSide;
 if(side==='west'||side==='east')return side;
 if(side==='north'||side==='south')return null;
 if(Array.isArray(side)&&side.length===2){if(side[1]===0&&side[0]!==0)return side[0]<0?'west':'east';return null;}
 const [x,y]=exit.xy||[],width=scene.width,height=scene.height;
 if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0||x<0||y<0||x>=width||y>=height)return null;
 const west=x,east=width-1-x,vertical=Math.min(y,height-1-y),horizontal=Math.min(west,east);
 if(horizontal>4.5||horizontal>=vertical*.85)return null;
 return west<east?'west':'east';
}

/** Tile coordinates in, source art drawn at world pixels. A successful spec is
 * returned for the caller's label height; unavailable art returns null. */
export function drawFrontierWayfinding(renderer,exit,x,y,options={}){
 if(!renderer||!Number.isFinite(x)||!Number.isFinite(y))return null;
 const spec=frontierWayfindingSpec(renderer.currentScene,exit,options);if(!spec)return null;
 const actors=[renderer.lastWorld?.state,...(renderer.followers||[])].filter(Boolean),alpha=regionalPropOcclusion({x,y,scale:1},spec,actors);
 return drawRegionalProp(renderer,spec,x*48,y*48,{alpha,flip:spec.flip})?spec:null;
}

function drawPaintedFrontier(c,o,x,y,renderer){
 if(!renderer||!Number.isFinite(x)||!Number.isFinite(y))return false;
 const spec=frontierObjectSpec(renderer.currentScene,o);if(!spec)return false;
 const actors=[renderer.lastWorld?.state,...(renderer.followers||[])].filter(Boolean),alpha=regionalPropOcclusion({x,y,scale:1},spec,actors),painter=renderer.ctx===c?renderer:{ctx:c,assets:renderer.assets};
 return drawRegionalProp(painter,spec,x*48,y*48,{alpha});
}

// Deterministic terrain details, integrated into the existing material atlas.
export function frontierTile(c,scene,x,y,n,time,solid){const b=scene.biome;if(!b)return;const px=x*48,py=y*48;c.save();c.globalAlpha=1;
 const palette={sand:['#d9b77d','#675039'],salt:['#dce9db','#6cbec0'],cactus:['#7d9662','#31513c'],lava:['#ee9860','#372f39'],coral:['#f4b5a4','#337f82'],mangrove:['#a4bc7b','#2b534b'],crystal:['#c4a7ea','#51426d'],ice:['#c5f0ef','#5b879b'],aurora:['#97d8c8','#587184'],spore:['#e6bf95','#344f47'],storm:['#b9d1ea','#404b69'],marble:['#e1d8c1','#716b70']},[light,dark]=palette[b.style];c.strokeStyle=light;c.fillStyle=dark;c.lineWidth=1.4;
 if(solid){c.translate(px+24,py+44);if(['cactus','mangrove','spore','coral'].includes(b.style)){c.lineWidth=5;c.strokeStyle=dark;c.beginPath();c.moveTo(0,0);c.lineTo(0,-33);c.moveTo(0,-16);c.lineTo(-12,-25);c.moveTo(0,-22);c.lineTo(12,-34);c.stroke();c.fillStyle=light;if(b.style==='spore'){c.beginPath();c.ellipse(0,-33,21,10,0,Math.PI,2*Math.PI);c.fill();}else for(let i=0;i<5;i++){c.beginPath();c.ellipse((i%2?1:-1)*(5+i*2),-18-i*4,7,4,-.6,0,7);c.fill();}}else{const shade=c.createLinearGradient(-18,-35,18,0);shade.addColorStop(0,light);shade.addColorStop(.42,dark);shade.addColorStop(1,'#283330');c.fillStyle=shade;c.strokeStyle=light+'77';c.beginPath();c.moveTo(-18,0);c.lineTo(-11,-27);c.lineTo(2,-44-n%14);c.lineTo(17,-14);c.lineTo(20,0);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(2,-44-n%14);c.lineTo(1,-5);c.stroke();}}
 else if(!solid&&n%7===0){c.globalAlpha=.38;if(b.style==='sand'){c.beginPath();c.ellipse(px+24,py+25,22,6,-.15,0,Math.PI);c.stroke();}else if(['salt','ice','marble','crystal'].includes(b.style)){c.beginPath();c.moveTo(px+3,py+11);c.lineTo(px+26,py+27);c.lineTo(px+45,py+13);c.moveTo(px+26,py+27);c.lineTo(px+22,py+46);c.stroke();}else if(b.style==='lava'){c.strokeStyle='#ffad69';c.lineWidth=3;c.beginPath();c.moveTo(px+4,py+39);c.lineTo(px+21,py+16);c.lineTo(px+43,py+22);c.stroke();}else{c.fillStyle=light;for(let i=0;i<4;i++){c.beginPath();c.arc(px+9+i*9,py+26+Math.sin(time+i)*3,2,0,7);c.fill();}}}c.restore();}
export function frontierGround(c,s,x,y,n,time,solid){const b=s.biome,px=x*48,py=y*48;c.save();c.fillStyle=solid&&['salt','coral','mangrove','ice'].includes(b.style)?({sand:'#725638',salt:'#457f89',cactus:'#354f39',lava:'#432d32',coral:'#286b77',mangrove:'#274d4c',crystal:'#403650',ice:'#487c96',aurora:'#455e77',spore:'#30483e',storm:'#364559',marble:'#665f5b'}[b.style]):b.color;c.fillRect(px,py,49,49);for(let i=0;i<16;i++){const v=((n>>>0)+i*7919)%997;c.fillStyle=i%2?'#fff2ce0a':'#0618240c';c.fillRect(px+2+v%44,py+2+(v*7)%44,1.2,1.2);}if(solid&&['salt','coral','mangrove','ice'].includes(b.style)){c.strokeStyle='#b5ece755';c.lineWidth=1;for(let i=0;i<2;i++){c.beginPath();c.moveTo(px+4,py+15+i*19);c.quadraticCurveTo(px+24,py+10+i*19+Math.sin(time+x)*3,px+45,py+15+i*19);c.stroke();}}c.restore();}
export function frontierObject(c,o,x,y,time,renderer=null){if(drawPaintedFrontier(c,o,x,y,renderer))return true;if(o.type==='cache'||o.type==='camp')return false;c.save();c.translate(x*48,y*48);c.strokeStyle='#282e2b';c.lineWidth=2;if(o.type==='frontier-board'){c.fillStyle='#4e3929';c.fillRect(-20,-56,5,56);c.fillRect(15,-56,5,56);c.fillStyle='#8b6c45';c.fillRect(-27,-61,54,38);c.strokeRect(-27,-61,54,38);c.fillStyle='#eadbb4';for(let i=0;i<3;i++){c.save();c.translate(-19+i*14,-55+(i%2)*3);c.rotate((i-1)*.08);c.fillRect(0,0,12,23);c.fillStyle='#7c6651';c.fillRect(3,5,6,1);c.fillRect(3,9,6,1);c.fillStyle='#eadbb4';c.restore();}}else if(o.frontierStep===0){c.fillStyle='#8c9182';c.beginPath();c.moveTo(-15,0);c.lineTo(-12,-39);c.lineTo(9,-45);c.lineTo(18,0);c.closePath();c.fill();c.stroke();c.strokeStyle='#f1d59d';c.beginPath();c.moveTo(-6,-30);c.lineTo(7,-25);c.lineTo(-4,-17);c.stroke();}else{c.fillStyle='#786349';c.fillRect(-23,-13,46,14);c.fillStyle='#acc8ba';c.beginPath();c.ellipse(0,-23,15,22,0,0,7);c.fill();c.stroke();c.strokeStyle='#dbc08b';c.lineWidth=5;c.beginPath();c.arc(0,-24,22,time*.2,time*.2+5);c.stroke();c.fillStyle='#314a52';c.fillRect(-5,-35,10,23);}c.restore();}
