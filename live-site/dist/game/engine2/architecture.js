import {dressRoomProgram} from './room-programs.js';
import {installBuildingGeometry} from './building-geometry.js';
import {physicalBindings} from './physical-lore.js?v=5.16.0';
/** Deterministic, route-checked furnishing. No story flags, rewards or coordinates are consumed. */
const DIR=[[1,0],[-1,0],[0,1],[0,-1]];
const STYLES={
 home:['quarters','Family hearth house',['hearth','dresser','bed','table','chair','washstand','basket','rug']],
 inn:['quarters','Coaching inn',['counter','keyrack','table','chair','bed','bed','bed','nightstand','cupboard','hearth','basket','rug']],
 instrumentworks:['loft','Instrument maker’s hall',['bench','strings','piano','cabinet','reedrack','table','chair','washstand','basket']],
 workshop:['loft','Repair workshop',['bench','toolrack','cabinet','vice','table','stool','coil','parts','washstand']],
 carpenter:['loft','Joiner’s longhouse',['sawbench','timber','toolrack','cabinet','bench','stool','basket']],
 guild:['archive','Guild counting house',['maptable','shelf','counter','chair','noticeboard','cabinet','bench','rug']],
 clinic:['quarters','Community infirmary',['cot','cot','cot','washstand','medicine','privacy','desk','chair','linen','planter']],
 refuge:['quarters','Converted refuge',['bedroll','bedroll','soup','table','bench','linen','basket','washstand']],
 lowbank_shelter:['quarters','Flood shelter kitchen',['soup','table','bench','bedroll','linen','washstand','basket']],
 console:['loft','Relay control room',['console','console','desk','chair','coil','cabinet']],
 office:['archive','Sky office',['desk','chair','maptable','shelf','cabinet','noticeboard']],
 hold:['loft','Cargo hold',['barrel','crate','rope','crate','linen']],
 chapel:['chapel','Bell chapel',['altar','pew','pew','pew','candle','lectern','bell']],
 bell_crypt:['chapel','Bell undercroft',['bell','candle','plinth','urn','lectern']],
 unindexed:['archive','Hidden index room',['shelf','desk','candle']],
 sanctuary:['garden','Orchard sanctuary',['planter','planter','bench','altar','urn']],
 manifest_depot:['loft','Rail manifest depot',['counter','crate','scale','desk','shelf','barrel']],
 flood_spillway:['cistern','Spillway pump house',['pump','pipe','bench','valve','cabinet']],
 name_vault:['archive','Names archive',['shelf','shelf','desk','lectern','candle']],
 letter_attic:['quarters','Gabled letter attic',['trunk','desk','chair','shelf','basket','bed']],
 echo_chamber:['chapel','Resonance rotunda',['bell','plinth','lectern','bench','candle']],
 resonance_gallery:['chapel','Acoustic gallery',['plinth','bell','bench','piano','candle']],
 lens_workshop:['loft','Optician’s bay workshop',['lensbench','cabinet','desk','chair','scope','washstand']],
 relief_store:['quarters','Relief pantry',['sack','sack','barrel','counter','scale','shelf','basket']],
 witness_vault:['archive','Witness records vault',['shelf','desk','lectern','cabinet','candle']],
 pottery_floor:['loft','Potter’s work floor',['wheel','kiln','clay','shelf','washstand','bench']],
 vent_house:['loft','Ventilation house',['pump','pipe','valve','bench','toolrack']],
 common_assembly:['quarters','Commons assembly hall',['table','bench','bench','noticeboard','lectern','hearth']],
 listening_chamber:['chapel','Hydrophone listening hall',['piano','bell','bench','plinth','candle','lectern']]
};
export const ROOM_STYLES=Object.fromEntries(Object.entries(STYLES).map(([k,v])=>[k,{material:v[0],name:v[1],furnishings:v[2]}]));
export function floodCells(floor,start){const q=[start],seen=new Set([start.join(',')]);for(let i=0;i<q.length;i++)for(const[d,e]of DIR){const x=q[i][0]+d,y=q[i][1]+e,k=x+','+y;if(floor[y]?.[x]==='.'&&!seen.has(k)){seen.add(k);q.push([x,y]);}}return seen;}
const signature=d=>[d.to,d.to_region||'',d.to_room||''].join(':');
function contour(floor){const rows=[];for(let y=0;y<floor.length;y++){let l=-1;for(let x=0;x<=floor[y].length;x++){if(floor[y][x]==='.'&&l<0)l=x;if(floor[y][x]!=='.'&&l>=0){rows.push({y,left:l,right:x-1});l=-1;}}}return rows;}
const size=type=>({bed:[1,2],cot:[1,2],bedroll:[1,2],table:[2,1],maptable:[2,2],bench:[2,1],sawbench:[3,1],counter:[3,1],shelf:[2,1],timber:[3,1],piano:[2,1],console:[2,1],lensbench:[2,1],privacy:[2,1],rug:[2,2]})[type]||[1,1];
const NAMES={cot:'Patient cot',bedroll:'Travel blankets',soup:'Shared soup kettle',keyrack:'Guest keys',strings:'Seasoned string cabinet',reedrack:'Drying reeds',vice:'Repair vice',coil:'Insulated wire spool',parts:'Sorted repair parts',timber:'Seasoning timber',sawbench:'Joiner’s bench',toolrack:'Tools on pegs',medicine:'Medicine cupboard',privacy:'Linen privacy screen',linen:'Clean folded linen',noticeboard:'Community noticeboard',maptable:'Route map table',scale:'Balance scales',scope:'Wayglass inspection stand',lensbench:'Lens polishing bench',clay:'Covered clay',wheel:'Potter’s wheel',kiln:'Glazing kiln',washstand:'Wash basin',dresser:'Family dresser',nightstand:'Bedside cup',rope:'Coiled cargo rope',plinth:'Resonance pedestal',lectern:'Open reading stand',candle:'Candle stand'};
const READS={home:'A cup has been left upside down beside the basin. Mara always sets a second one out when Sable is late.',inn:'The night clerk has tied each key to a differently shaped wooden tag. You could find your room in the dark.',clinic:'Clean cloth lies above the used linen, never beside it. Someone has made order out of a very long shift.',carpenter:'The tool handles are polished where a thumb rests. The smallest saw has a child’s name burned into it.',workshop:'Every tool has a chalk outline. One missing spanner has acquired an accusatory question mark.',instrumentworks:'The reeds dry in loose bundles, away from the stove. A neat sign reads: “Please do not improve these.”',guild:'A route has been crossed out, then drawn again in a different hand. The newer line goes past the clinic.',relief_store:'The heaviest sacks sit lowest. A little space has been left for whoever brings the next one.',pottery_floor:'The clay is covered with damp cloth. Beside it, a thumbprint has survived every attempt to smooth the bowl.',listening_chamber:'The seats face the water bowl. No one has reserved the best place; the room was made for everyone to hear.'};
function readFor(key,type){return READS[key]||(['shelf','desk','lectern'].includes(type)?'The newest record is not yet bound. Its corners have been held down with smooth river stones.':['pump','valve','pipe'].includes(type)?'The handle has been wiped clean. Fresh grease marks the joint; someone still tends this place.':'The worn edges and careful repairs say more about the people here than a polished display ever could.');}
function furnish(scene,physical=[],inbound=[]){const spec=ROOM_STYLES[scene.key]||(scene.household?{material:scene.household.kind,name:scene.title||({security:'Foundry loading yard',passages:'River passage network',reactor:'Crown reactor hall'})[scene.key]||scene.key.replaceAll('_',' '),furnishings:[]}:null);if(!spec||scene.architecture?.campaign)return;
 // The merged household renderer owns its painted props and interactions. Annotate its actual plan
 // rather than stacking a second furniture pass over it.
 if(scene.household){const h=scene.household,b=h.box,base=h.floorBase.map(r=>[...r]);
 const specialty={pottery_floor:[['wheel','Potter’s wheel','A half-formed bowl waits under a damp cloth. The pedal is worn smooth by years of steady work.'],['kiln','Glazing kiln','A row of test tiles records the heat of earlier firings. The pale blue glaze has finally held.']],lens_workshop:[['scope','Wayglass inspection stand','The lens rests in a padded ring. Its fine adjustment follows a chalk mark toward the window.'],['lensbench','Lens polishing bench','Fine polishing powder is kept away from the coarse grit. Each finished lens has its maker’s mark.']],vent_house:[['pump','Air circulation pump','Fresh grease marks the crank bearing. A ribbon on the outlet shows which way the air is moving.'],['valve','Pressure balancing valve','The working range is scratched into the brass. Someone has tied a warning thread above the safe limit.']],flood_spillway:[['pump','Spillway pump','The handle reaches the platform without forcing its operator to lean over the water.'],['pipe','Relief pipework','A removable sleeve lets the crew clean silt out of the bend. The bolts have been numbered in chalk.']],console:[['console','Relay desk','A shaded glass dial shows the load on the carriage line. The labels are written in Rook’s hand.']],listening_chamber:[['piano','Reed and string console','The keys share a wooden bridge with the water bowl. Quiet notes still travel through the clay.']],echo_chamber:[['bell','Listening bell','The bell hangs clear of its frame. A little felt pad waits below it to catch the final vibration.']],resonance_gallery:[['bell','Resonance bell','Wear on the brass shows where generations of listeners have steadied the bell after its last note.']] }[scene.key]||[];
 const holders=h.furnishings.filter(o=>[8,22,23,7].includes(o.furniture));for(let i=0;i<Math.min(specialty.length,holders.length);i++){const o=holders[i],[type,label,text]=specialty[i];Object.assign(o,{specialType:type,label,text,detail:text+' The surrounding tools are kept within reach, leaving the passage clear.'});}
dressRoomProgram(scene);
for(const block of scene.blocks||[])for(let y=block.y;y<block.y+block.h;y++)for(let x=block.x;x<block.x+block.w;x++)if(base[y]?.[x])base[y][x]='.';
 for(const d of [...scene.doors,...scene.objects.filter(o=>o.type==='portal')])if(d.architecturalKind!=='stairs')d.wallMounted=true;
 scene.architecture={version:4,campaign:true,optional:scene.key.startsWith('secret_'),style:spec.name,family:scene.key,outline:contour(base),bounds:[b.left,b.top,b.right,b.bottom],entry:scene.doors[0]?.xy||scene.arrive,area:base.reduce((n,r)=>n+r.filter(v=>v==='.').length,0),physicalSites:scene.householdPhysicalSites||physical,renderer:'household',doorPolicy:'perimeter',sourceFurnitureCount:h.furnishings.length};return;}

 const grid=scene.floor.map(r=>[...r]),original=scene.floor.slice(),blocks=[],protectedPoints=[scene.arrive,...scene.objects.flatMap(o=>o.xy?[o.xy]:(o.enemies||[]).map(e=>e[1])),...scene.doors.map(d=>d.xy)];
 // Keep authored event staging and all inbound arrival coordinates intact.
 protectedPoints.push(...physical.map(o=>o.xy),...inbound);
 const reserved=(x,y)=>protectedPoints.some(p=>Math.hypot(x-p[0],y-p[1])<2.2);
 let reachable=floodCells(grid,scene.arrive),bounds=[Infinity,Infinity,-1,-1];for(const cell of reachable){const[x,y]=cell.split(',').map(Number);bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x),Math.max(bounds[3],y)];}
 const [left,top,right,bottom]=bounds;
 // Small clipped corners make coherent vestibules without moving an authored action.
 for(const [cx,cy]of(scene.key==='home'?[[left,bottom],[right,bottom]]:[[left,top],[right,top],[left,bottom],[right,bottom]]))for(let dy=0;dy<2;dy++)for(let dx=0;dx<2-dy;dx++){const x=cx+(cx===left?dx:-dx),y=cy+(cy===top?dy:-dy);if(grid[y]?.[x]!=='.'||reserved(x,y))continue;grid[y][x]='#';const next=floodCells(grid,scene.arrive);if(next.size!==reachable.size-1)grid[y][x]='.';else reachable=next;}
 // The inn has a separate sleeping wing, joined to its common room by a wide opening.
 if(scene.key==='inn'){const y=top+Math.floor((bottom-top)*.4),middle=Math.round((left+right)/2);for(let x=left;x<=right;x++){if(Math.abs(x-middle)<=1||reserved(x,y)||grid[y]?.[x]!=='.')continue;grid[y][x]='#';const next=floodCells(grid,scene.arrive);if(next.size===reachable.size-1)reachable=next;else grid[y][x]='.';}}
 const outline=contour(grid);
 // Consolidate duplicate exits to the same destination, then mount them on the shell.
 const boundary=[...reachable].map(k=>k.split(',').map(Number)).filter(([x,y])=>DIR.some(([dx,dy])=>grid[y+dy]?.[x+dx]!=='.'));
 const doors=[];for(const old of scene.doors){if(doors.some(d=>signature(d)===signature(old)))continue;const candidates=boundary.filter(([x,y])=>!physical.some(o=>Math.hypot(x-o.xy[0],y-o.xy[1])<2.2)&&!scene.objects.some(o=>o.type!=='portal'&&o.xy&&Math.hypot(x-o.xy[0],y-o.xy[1])<1.8));candidates.sort((a,b)=>Math.hypot(a[0]-old.xy[0],a[1]-old.xy[1])-Math.hypot(b[0]-old.xy[0],b[1]-old.xy[1]));const xy=candidates[0]||old.xy;const side=DIR.find(([dx,dy])=>grid[xy[1]+dy]?.[xy[0]+dx]!=='.')||[0,1];doors.push({...old,xy:[...xy],wallMounted:true,wallSide:side});protectedPoints.push(xy);}
 scene.doors=doors;
 for(const o of scene.objects.filter(o=>o.type==='portal')){const d=doors.find(d=>signature(d)===signature(o));if(d){o.xy=[...d.xy];o.wallMounted=true;o.wallSide=d.wallSide;o.sharedDoor=true;}}
 const floorArea=reachable.size,limit=Math.min(24,Math.max(4,Math.floor(floorArea/11))),types=spec.furnishings;
 let index=0;for(let attempt=0;attempt<limit*3&&blocks.length<limit;attempt++){const type=types[index++%types.length], [w,h]=size(type);if(type==='rug')continue;const cap=type==='bed'?(scene.key==='inn'?3:1):type==='table'?3:type==='cot'?6:Infinity;if(blocks.filter(b=>b.type===type).length>=cap)continue;const repeatable=new Set(['bed','cot','bedroll','chair','stool','table','bench','shelf','barrel','crate','sack','planter','pew','candle','plinth']);if(!repeatable.has(type)&&blocks.some(b=>b.type===type))continue;
 const candidates=[];for(let y=top;y<=bottom-h+1;y++)for(let x=left;x<=right-w+1;x++){
 let okay=true;for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(grid[j]?.[i]!=='.'||reserved(i,j)||blocks.some(b=>i>=b.x-1&&i<b.x+b.w+1&&j>=b.y-1&&j<b.y+b.h+1))okay=false;if(!okay)continue;
 const wall=Array.from({length:w},(_,i)=>grid[y-1]?.[x+i]!=='.').filter(Boolean).length;
 const side=(grid[y]?.[x-1]!=='.'?1:0)+(grid[y]?.[x+w]!=='.'?1:0),perimeter=wall+side;
 const prefersWall=!['table','maptable','wheel','scale','soup','plinth'].includes(type);
 const neighbors=blocks.filter(b=>({chair:['table','desk','maptable','piano'],stool:['bench','wheel','sawbench'],nightstand:['bed','cot'],linen:['cot','washstand'],soup:['table'],basket:['washstand','hearth']})[type]?.includes(b.type));const grouping=neighbors.length?Math.max(...neighbors.map(b=>16-Math.abs(Math.hypot(x-b.x,y-b.y)-2.5)*5)):0;
 const innZone=scene.key==='inn'?(type==='bed'?-((y-(top+3))**2): ['table','chair','counter','hearth'].includes(type)?-Math.abs(y-(top+(bottom-top)*.65))*7:0):0;
 const score=innZone+grouping+(prefersWall?perimeter*12:-perimeter*4)+Math.min(8,Math.hypot(x-scene.arrive[0],y-scene.arrive[1]))+(scene.location%3)*((x+y)%3)*.1;
 candidates.push({x,y,w,h,type,score});}
 candidates.sort((a,b)=>b.score-a.score||a.y-b.y||a.x-b.x);
 for(const b of candidates){for(let j=b.y;j<b.y+h;j++)for(let i=b.x;i<b.x+w;i++)grid[j][i]='#';const next=floodCells(grid,scene.arrive);if(next.size!==reachable.size-w*h){for(let j=b.y;j<b.y+h;j++)for(let i=b.x;i<b.x+w;i++)grid[j][i]='.';continue;}
 const stands=[];for(let y=b.y-1;y<=b.y+h;y++)for(let x=b.x-1;x<=b.x+w;x++)if(!physical.some(o=>Math.hypot(x-o.xy[0],y-o.xy[1])<2.2)&&next.has(x+','+y)&&Math.hypot(x-(b.x+(w-1)/2),y-(b.y+(h-1)/2))<=2)stands.push([x,y]);if(!stands.length){for(let j=b.y;j<b.y+h;j++)for(let i=b.x;i<b.x+w;i++)grid[j][i]='.';continue;}
 const stand=stands.sort((a,c)=>Math.abs(a[1]-b.y-h)-Math.abs(c[1]-b.y-h))[0];b.id='furnishing:'+scene.location+':'+blocks.length;blocks.push(b);reachable=next;
 // A few curated touchpoints, rather than a label on every decorative object.
 if(blocks.length<=3)scene.objects.push({type:'furnishing',furnishingId:b.id,xy:stand,label:NAMES[type]||type[0].toUpperCase()+type.slice(1),text:readFor(scene.key,type),quiet:true});break;}
 }
 scene.floor=grid.map(r=>r.join(''));scene.blocks=blocks;scene.interior=spec.material;scene.architecture={version:2,campaign:true,style:spec.name,outline,bounds,entry:doors[0]?.xy||scene.arrive,area:floorArea,originalFloor:original,physicalSites:physical,family:scene.key,doorPolicy:'perimeter',protectedPoints};
}
export function furnishCampaign(data){const physical=physicalBindings({data});for(const s of data.scenes){const inbound=data.scenes.flatMap(from=>[...from.objects,...from.doors].filter(o=>o.arrive&&o.to===s.key&&(o.to_region?o.to_region===s.chapter:from.chapter===s.chapter)).map(o=>o.arrive));furnish(s,physical.filter(o=>o.physicalLocation===s.location),inbound);}for(const m of data.campaign.missions)for(let i=0;i<m.rooms.length;i++){const s=data.scenes.find(r=>r.location===m.rooms[i].location);if(s?.architecture?.campaign)m.rooms[i]=s;}data.buildingRegistry=data.scenes.filter(s=>s.architecture?.campaign).map(s=>({id:'building:'+s.location,roomLocation:s.location,key:s.key,chapter:s.chapter,style:s.architecture.style,footprint:s.architecture.outline,entrances:s.doors.map(d=>({xy:d.xy,side:d.wallSide,to:d.to})),exteriorLinks:data.scenes.filter(from=>!from.interior).flatMap(from=>[...from.objects,...from.doors].filter(o=>o.to===s.key&&(o.to_region?o.to_region===s.chapter:from.chapter===s.chapter)).map(o=>({location:from.location,xy:o.xy}))) }));return installBuildingGeometry(data);}
