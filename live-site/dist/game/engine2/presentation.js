import {routeObjective} from './objective-routing.js?v=5.11.0';
import {isInteriorScene} from './scene-identity.js?v=4.0.0';
import {battleViewport} from './battle-layout.js?v=5.36.0';
import {originObjective} from './origins.js?v=5.38';
import {SIDE_CAMPAIGNS,frontierState,frontierStage} from './frontiers.js?v=5.41';
import {openingObjective} from './opening.js?v=5.18.0';
/** Shared world proportions, movement poses and collision-respecting party trails. */
export const SCALE={hero:1.24,npc:1.2,creature:1.45,boss:2.65,building:3.8,tree:3.35,shrine:1.25,cache:.65};
export function fitSprite(sourceWidth,sourceHeight,height,maxWidth=Infinity){const scale=Math.min(height/sourceHeight,maxWidth/sourceWidth);return{width:sourceWidth*scale,height:sourceHeight*scale};}
export function motionPose(previous,x,y){const dx=x-previous.x,dy=y-previous.y,distance=Math.hypot(dx,dy),moving=distance>.001&&distance<1.5;let facing=previous.facing??1,back=previous.back??false,phase=previous.phase??0;if(moving){if(Math.abs(dx)>.001)facing=dx<0?-1:1;if(Math.abs(dy)>Math.abs(dx)*.3)back=dy<0;else back=false;phase=(phase+distance/1.35*4)%4;}return{x,y,facing,back,phase,moving,frame:moving?(back?4:0)+Math.floor(phase):back?5:0};}
export class PartyTrail{
 constructor(x,y,{maxDistance=8,maxPoints=8192}={}){this.points=[{x,y}];this.length=0;this.maxDistance=Math.max(2,Number.isFinite(maxDistance)?maxDistance:8);this.maxPoints=Math.max(32,Number.isFinite(maxPoints)?Math.floor(maxPoints):8192);}
 record(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  const last=this.points.at(-1),dx=x-last.x,dy=y-last.y,d=Math.hypot(dx,dy);
  // Keep subpixel steps at high refresh rates; only exact noise is discarded.
  if(d<1e-9)return false;
  if(d>2){this.points=[{x,y}];this.length=0;return true;}
  const before=this.points.at(-2),ax=before?last.x-before.x:0,ay=before?last.y-before.y:0;
  // Replacing a forward-collinear endpoint is lossless. Corners and reversals
  // stay in the history so followers take the route the lead actually used.
  if(before&&ax*dx+ay*dy>0&&Math.abs(ax*dy-ay*dx)<=1e-10*Math.hypot(ax,ay)*d)this.points[this.points.length-1]={x,y};
  else this.points.push({x,y});
  this.length+=d;
  while(this.points.length>1&&(this.length>this.maxDistance+1e-10||this.points.length>this.maxPoints)){
   const a=this.points[0],b=this.points[1],span=Math.hypot(b.x-a.x,b.y-a.y),excess=this.length-this.maxDistance;
   if(this.points.length>this.maxPoints||span<=excess+1e-10){this.points.shift();this.length=Math.max(0,this.length-span);}
   else{const t=excess/span;this.points[0]={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};this.length=this.maxDistance;}
  }
  return true;
 }
 sample(distance){let left=Number.isFinite(distance)?Math.max(0,distance):distance===Infinity?this.length:0;for(let i=this.points.length-1;i>0;i--){const a=this.points[i],b=this.points[i-1],d=Math.hypot(a.x-b.x,a.y-b.y);if(left<=d){const t=left/(d||1);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}left-=d;}return{...this.points[0]};}
}
export function viewLayout(width,height,{touch=false,battle=false,dialog=false,hudHeight=0,battleDockHeight,battleDockWidth=0,touchReserve}={}){if(battle&&Number.isFinite(battleDockHeight)){const bands=battleViewport(height,hudHeight,battleDockHeight);const right=Math.min(width*.46,Math.max(0,battleDockWidth));return {...bands,right,centerX:(width-right)/2,zoom:height<500?.85:width<600?1:1.1,controlZone:battleDockHeight};}const narrow=width<600,short=height<500,controls=touch?(Number.isFinite(touchReserve)?touchReserve:short?112:144):16,top=Math.max(hudHeight,short?77:narrow?112:101),panel=battle?(short?126:164):dialog?(short?154:narrow?224:190):0;const bottom=Math.max(controls,panel+(touch&&!short?controls:12));const y1=Math.max(top,height-bottom);return{top,bottom,centerY:(top+y1)*.5,zoom:short?.9:narrow?1.02:1.12,controlZone:controls};}
export function personFor(object){if(object.rivalId)return{name:object.name,row:object.sprite};if(object.lifeKind==='resident')return {name:object.name,row:object.sprite,child:object.member===2};const prompt=object.steps?.[0]?.prompt||object.text||'';const name=prompt.match(/^([A-Z][A-Z]+):/m)?.[1];const ids={SABLE:0,IONA:1,ROOK:2,BRASS:3,RIVEN:4,MIRA:5,VEYR:6,MARA:1,NELL:1,FATHER:0,DARA:1,HESPER:6,CORIN:4};if(name&&ids[name]!==undefined)return{name:name[0]+name.slice(1).toLowerCase(),row:ids[name],child:name==='NELL'};if(['npc','guide','mentor','transport','shop','aid'].includes(object.type))return{name:name?name[0]+name.slice(1).toLowerCase():object.type==='shop'?'Merchant':object.type==='mentor'?'Mentor':object.type==='transport'?'Wayfinder':'Resident',row:(object.sprite||0)%7};return null;}
export function objectLabel(object){if(object.label)return object.label;const person=personFor(object);if(person){if(object.type==='puzzle'&&person.name==='Rook'&&/mend/i.test(object.steps?.[0]?.prompt||''))return 'Patched orchestra';if(object.type==='puzzle'&&!person.child)return person.name;return person.name;}if(object.travel_label)return object.travel_label.split('/')[0].trim();return({cache:'Supplies',puzzle:'Mechanism',note:'Resonance stone',camp:'Campfire',portal:object.to_room||object.to||'Passage',listen:'Listening kiln',project:'Rebuild',boss:'Guardian'}[object.type]||'Inspect').replaceAll('_',' ');}
export function objectiveFor(world){if(world.scene.fieldOrigin!==undefined)return {label:'Try your supplies against the trail creatures · change approach at the trail marker',object:world.objects().find(o=>o.originHero!==undefined)};const past=originObjective(world);if(past)return past;if(world.scene.biome){const st=frontierState(world),job=SIDE_CAMPAIGNS.find(c=>c.id===st.active),stage=job?frontierStage(world,job.id):4,objects=world.objects(),label=job?['Read the survey marker','Repair the field apparatus','Protect the worksite','Submit the report at the dispatch ledger'][Math.min(stage,3)]:'Choose a frontier commission at the dispatch ledger';if(job&&stage<3&&world.state.scene!==2000+job.regionIndex*5+job.area){const route=routeObjective(world,{label,scene:2000+job.regionIndex*5+job.area});return route.object?route:{label,object:objects.find(o=>o.type==='frontier-board')};}const object=objects.find(o=>stage<2?o.frontierStep===stage:stage===2?o.frontierId===job.id:o.type==='frontier-board');return {label,object:object&&!object.xy&&object.enemies?.[0]?.[1]?{...object,xy:[...object.enemies[0][1]]}:object};}const opening=openingObjective(world);if(opening)return opening;const s=world.state,scene=world.scene,objects=world.objects(),ready=o=>(o.requires_flags||[]).every(v=>world.bit(...v));if(s.scene===5&&!s.complete){const address=8323526;if(!world.bit(address,0))return{label:'Help Rook mend the orchestra',object:objects.find(o=>o.type==='puzzle'&&o.bit===0)};if(!world.bit(address,1))return{label:'Meet Nell beside the lantern',object:objects.find(o=>o.type==='puzzle'&&o.bit===1)};return{label:s.chapter===1?'Take Rook’s service hatch':'Follow the next stolen voice',object:objects.find(o=>o.type==='portal'&&o.to==='workshop')};}const puzzle=objects.find(o=>['puzzle','switch','note'].includes(o.type)&&!world.done(o)&&ready(o)&&!(o.type==='note'&&world.bit(world.flagFor(o),o.completes_bit)));if(puzzle)return{label:personFor(puzzle)?'Speak with '+personFor(puzzle).name:'Investigate the '+objectLabel(puzzle).toLowerCase(),object:puzzle};const boss=objects.find(o=>o.type==='boss');if(boss)return{label:boss.requires!==undefined&&!world.bit(world.mission.flag_address,boss.requires)?'Find the guardian’s relay':'Challenge '+(world.mission.enemy_name||'the guardian'),object:boss.requires!==undefined&&!world.bit(world.mission.flag_address,boss.requires)?null:boss};const portal=objects.find(o=>o.type==='portal'&&ready(o)&&(!o.to_region||o.to_region<=s.chapter));return{label:s.complete?'Explore the city you restored':portal?'Continue through '+objectLabel(portal).toLowerCase():'Explore '+scene.key.replaceAll('_',' '),object:portal};}

// Room identity is independent of the outdoor biome palette.
export function isInterior(scene){return isInteriorScene(scene);}

export function interactionLabel(o){return personFor(o)?'Speak with '+personFor(o).name:o.type==='puzzle'?'Use '+objectLabel(o).toLowerCase():null;}
