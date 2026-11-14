/**
 * Exploration authored around *actual* wide-area geometry.
 *
 * Four separated, meaningful fieldwork stations per region form a physical
 * investigation, with a fifth optional creature-habitat observation. Players
 * walk the connected regions themselves. No forced pathing, stat boosts,
 * regenerated treasure, global quest flags, or per-frame procedural spawn.
 *
 * Pure world-object lookup does not mutate the save. Only walking near a
 * landmark or deliberately using a station records discovery/progression.
 */
export const SPATIAL_ECOLOGY_VERSION=1;
const QUADRANTS=['western approach','upper ground','sheltered crossing','outer reach','lower return'];
const STORIES=Object.freeze({
 sand:{subject:'amber beetle burrows',sign:'windward entrances sealed with pale sand',evidence:'A narrow undercut shows the beetles emerge after the gusts, never during them.',work:'buried aqueduct vent',clue:'The sheltered lip protects the burrow and the vent at the same time.',choices:['Dig through the living burrows','Uncover the sheltered lip without collapsing the sand','Seal every outlet with clay'],answer:1,fauna:'Amber beetles leave paired tracks around the buried watercourse. One group carries plant fragments toward deeper shade.',effect:'Water can escape through the cleaned vent; the burrows remain intact.',habitat:'Wind, shelter, and underground moisture determine where these beetles forage.'},
 salt:{subject:'saltglass shorebirds',sign:'three concentric prints above the wet line',evidence:'The outer tracks vanish with the brine; the inner nest stays above the highest tide mark.',work:'tidal gauge',clue:'A dry channel, rather than the shoreline, holds the reference mark.',choices:['Read from the dissolving outer crust','Move the nest to the inland plate','Clear the dry gauge slot and compare the high-water line'],answer:2,fauna:'The shorebirds feed where salt crystals meet water. They retreat together before each tidal pulse.',effect:'The new gauge distinguishes safe passage from rising brine.',habitat:'The tide lays down temporary paths, but the nesting shelf must stay dry.'},
 cactus:{subject:'barrel cactus seed runners',sign:'fallen seed cases scattered beside the shaded spine beds',evidence:'Unbroken flowering stems point toward the older animal trail; wind has carried the loose cases sideways.',work:'caravan water stop',clue:'Fallen pads retain usable moisture; cutting a flowering stem destroys the next crop.',choices:['Collect only fallen pads to shade the basin','Break green flowering stems for a faster repair','Leave the basin exposed to the noon sun'],answer:0,fauna:'Small seed runners travel between cactus shadows, moving seeds rather than eating every pod.',effect:'The basin holds water without stripping the living plants.',habitat:'Shade, fallen pads and animal movement create a fragile desert corridor.'},
 lava:{subject:'basalt vent crawlers',sign:'iridescent shell fragments on the cool black rock',evidence:'The crawlers avoid the hottest fissure, returning only after a vent has released its pressure.',work:'pressure-relief manifold',clue:'Hot gas must leave before a cold seal is fitted.',choices:['Seal the active vent without a release','Force coolant into the glowing fracture','Open the pressure channel, then cool the isolated collar'],answer:2,fauna:'Vent crawlers gather in the residual heat and scatter when a crack begins to sing.',effect:'The pressure channel steadies; the surrounding basalt cools gradually.',habitat:'A gradient of heat, not a single safe temperature, governs this ecology.'},
 coral:{subject:'shelf-grazing tide eels',sign:'silver ribbons of disturbed sand between the coral heads',evidence:'The grazers cross only when the third marker is uncovered and the water is receding.',work:'reef crossing marker',clue:'A rising tide hides the shelf immediately after the second marker disappears.',choices:['Cross as the first marker floods','Set the marker above the third exposed shelf','Cut away the living coral to widen the causeway'],answer:1,fauna:'Tide eels graze the current-facing side of the shelf and vanish into deep blue slots when water climbs.',effect:'The safe crossing is marked above the living reef.',habitat:'Moving tides link several small shelves without making any one of them permanent land.'},
 mangrove:{subject:'root-walking reed crabs',sign:'paired claw impressions between the standing mangrove roots',evidence:'Fresh water reaches this bank only when both narrow side channels remain open.',work:'root-bank sluice',clue:'Releasing the central gate first would wash out the crab nursery.',choices:['Open both side channels before releasing the central gate','Shut the side channels and flush the nursery','Pile dredged sediment over the living roots'],answer:0,fauna:'Reed crabs carry seed husks across damp roots, feeding fish and sheltering the youngest shoots.',effect:'Water distributes across the root bank without washing away the nursery.',habitat:'Roots, silt, salt and fresh water form one living support system.'},
 crystal:{subject:'cavern prism moths',sign:'dustless wing marks beneath violet mineral seams',evidence:'The moths follow reflected low light, not the brightest exposed vein.',work:'facet-light receiver',clue:'The dull facet sends light through the intact seam without attracting every moth into the machine.',choices:['Face the brightest fractured crystal directly','Turn the dull facet toward the intact seam','Shatter the main vein for an open beam'],answer:1,fauna:'Prism moths change course at each reflective face; their flight maps unseen crystal angles.',effect:'The receiver holds a steady, low-intensity reference beam.',habitat:'Light is an ecological resource in the cave, not just a mineral spectacle.'},
 ice:{subject:'glacier rope-hares',sign:'narrow leaps across snow bridging a concealed crack',evidence:'The snow layer looks continuous, but the old survey cairn marks a deep shear below.',work:'glacier traverse anchor',clue:'A fixed rope anchor must be tested before anyone steps onto the bridge.',choices:['Follow the freshest animal tracks without checking','Strike the unsupported ice to widen the ledge','Secure a rope at the cairn and load-test the crossing'],answer:2,fauna:'Small rope-hares change paths with the wind, avoiding hollow snow where larger travellers would break through.',effect:'The crossing is tested without opening a new fracture.',habitat:'Wind-carved snow preserves tracks that are not reliable footpaths.'},
 aurora:{subject:'tundra lichen grazers',sign:'soft hoof prints that skirt glowing patches of lichen',evidence:'The grazer path shifts under green aurora before the violet return signal is visible.',work:'auroral trail beacon',clue:'The green reference must be matched before the violet return pulse.',choices:['Send violet first to attract attention','Flash both signals continuously','Align green, then answer with violet'],answer:2,fauna:'Lichen grazers stand quiet during the violet pulse and feed when the green glow weakens.',effect:'The beacon returns the correct two-part signal without disturbing the herd.',habitat:'Light, cold and the slow regrowth of lichen set the route of every herd.'},
 spore:{subject:'sporewood collector beetles',sign:'delicate fungal dust gathered on the leeward side of a fallen log',evidence:'Spores reach the water catchment when the collector is brushed upwind.',work:'rain collector hood',clue:'The leeward surface sheds dust away from the drinking bowl.',choices:['Brush spores toward the clean water','Turn the hood downwind and brush the dry edge','Burn the living fungal mat beneath the hood'],answer:1,fauna:'Collector beetles carry spores on their backs and rest in the dim gaps between fungal trunks.',effect:'The collector can catch rain while the spore carpet stays undisturbed.',habitat:'Wind direction matters as much as shelter in this living forest.'},
 storm:{subject:'thunder-kite roosts',sign:'copper-coloured feathers pressed against a grounded rock',evidence:'A low mast draws discharge into the nesting shelf when its grounding coil has come loose.',work:'observatory grounding vane',clue:'Ground the mast before allowing the vane to rise into the wind.',choices:['Raise the vane while the line is live','Join the ground coil, then adjust the vane','Move the nest beneath the discharge ring'],answer:1,fauna:'Thunder-kites glide along a still air layer immediately below the electrical cloud bank.',effect:'The vane turns freely and the nesting shelf lies outside the discharge path.',habitat:'A grounded ridge can shelter wildlife even amid lightning.'},
 marble:{subject:'terrace stone swallows',sign:'mud-lined nests inside the least damaged statues',evidence:'The cracked lintel supports a nesting pocket; shifting it before bracing would collapse both.',work:'sunken colonnade lintel',clue:'The side braces must take the weight before the broken column is moved.',choices:['Lift the broken column first','Remove the nest to expose all masonry','Brace the lintel, then reset the loose column'],answer:2,fauna:'Stone swallows nest in the weathered statue cavities and hunt insects along the shallow warm terraces.',effect:'The arch stands again and the nests remain sheltered.',habitat:'Old masonry can become living habitat; repair need not erase it.'},
 village:{subject:'courtyard pollinators',sign:'pollen under an old shaded sill',evidence:'The narrow garden run carries water past two neighbourhood courtyards.',work:'public rain channel',clue:'The sharing channel must be freed from the downstream end.',choices:['Dig through the flowering planter','Clear downstream debris before touching the inlet','Close the outlet and increase pressure'],answer:1,fauna:'Small pollinators travel between garden walls. Their short flights trace a route through the district.',effect:'Rain reaches both courtyards without flooding the planted beds.',habitat:'The settlement works because several households share the same water and growing space.'},
 dungeon:{subject:'service-gallery cave moths',sign:'fine dust lines beside the old machine conduit',evidence:'The darker route is a maintenance return, not a dead-end; air flows toward its lower vent.',work:'ancient air-channel regulator',clue:'The lower vent should open before the upper plate is rebalanced.',choices:['Block the lower vent','Open the lower vent and ease the upper plate','Force the plate against the old bearing'],answer:1,fauna:'Cave moths circle the cooler vent, revealing airflow even when the mechanism has fallen silent.',effect:'The old air passage carries a steady, safe current again.',habitat:'Old machinery changes the airflow and therefore the small creatures that survive beside it.'}
});
const STOPS=Object.freeze([{index:1,role:'trace'},{index:3,role:'evidence'},{index:5,role:'work'},{index:7,role:'return'},{index:6,role:'fauna'}]);
const isPlain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const siteKey=scene=>String(scene?.location??'');
const names=s=>s?.spatialExpansion?.landmarks||[];
export function spatialEcologyStory(scene){
 const style=scene?.biome?.style||({wild:'village',civic:'village',dungeon:'dungeon'}[scene?.spatialExpansion?.archetype]||'dungeon');
 return STORIES[style]||STORIES.dungeon;
}
function locationPhrase(scene){
 const phase=scene?.frontierAuthoring541?.phaseId?.replaceAll('-',' ')||'';
 const zone=scene?.title||scene?.key?.replaceAll('_',' ')||'this place';
 return zone+(phase?' — '+phase:'');
}
export function spatialEcologySites(scene){
 if(scene?.spatialExpansion?.version!==1)return[];
 const list=names(scene),profile=spatialEcologyStory(scene),place=locationPhrase(scene);
 return STOPS.map(({index,role},number)=>{
  const node=list[index],xy=node?.xy;
  if(!Array.isArray(xy)||xy.length!==2||!xy.every(Number.isFinite)||scene.floor[xy[1]]?.[xy[0]]!=='.')return null;
  const label=role==='trace'?'Follow '+profile.subject:role==='evidence'?'Read the land':role==='work'?'Repair '+profile.work:role==='return'?'Far-route stewardship':'Observe the habitat';
  return {type:'spatial-fieldwork',spatialId:'eco:'+scene.location+':'+role,spatialRole:role,
   spatialStage:number<4?number:null,xy:xy.slice(),label,siteTitle:place,subject:profile.subject,
   routeName:node.name,spatialIndex:index,description:profile.habitat};
 }).filter(Boolean);
}
export function spatialEcologyRecord(world){
 return world?.state?.spatialEcology?.sites?.[siteKey(world?.scene)]||null;
}
function ensureRecord(world){
 if(!world.state.spatialEcology)world.state.spatialEcology={version:SPATIAL_ECOLOGY_VERSION,sites:{}};
 const sites=world.state.spatialEcology.sites,k=siteKey(world.scene);
 return sites[k]??=( {stage:0,choice:null,fauna:false,mask:0} );
}
export function validateSpatialEcology(state){
 const value=state?.spatialEcology;
 if(value===undefined)return true;
 if(!isPlain(value)||value.version!==SPATIAL_ECOLOGY_VERSION||!isPlain(value.sites))throw Error('Invalid spatial exploration ledger');
 const entries=Object.entries(value.sites);
 if(entries.length>256)throw Error('Spatial exploration ledger exceeds map capacity');
 for(const[k,v]of entries){
  if(!/^(0|[1-9][0-9]{0,4})$/.test(k)||Number(k)>9999||!isPlain(v)||Object.keys(v).sort().join(',')!=='choice,fauna,mask,stage'
    ||!int(v.stage,0,4)||!int(v.mask,0,255)||typeof v.fauna!=='boolean'
    ||![null,'protect','salvage'].includes(v.choice)||(v.stage!==4&&v.choice!==null)||(v.stage===4&&v.choice===null))
    throw Error('Invalid spatial exploration record '+k);
 }
 return true;
}
/** Called only after a real walking or scene-entry transition, never by a paint
 * callback. Records a compact 8-bit neighbourhood map rather than every tile. */
export function discoverSpatialEcology(world,{quiet=false}={}){
 const scene=world?.scene,meta=scene?.spatialExpansion,state=world?.state;
 if(meta?.version!==1||!state||state.mode!=='field')return null;
 const nearby=[];
 for(let i=0;i<Math.min(8,names(scene).length);i++){
  const at=names(scene)[i]?.xy;
  if(!Array.isArray(at))continue;
  if(Math.hypot(state.x-at[0]-.5,state.y-at[1]-.5)<=6.5)nearby.push(i);
 }
 if(!nearby.length)return null;
 const old=spatialEcologyRecord(world)?.mask||0;
 const next=nearby.reduce((mask,i)=>mask|(1<<i),old);
 if(next===old)return null;
 ensureRecord(world).mask=next;
 const novel=nearby.find(i=>!(old&(1<<i)));
 if(!quiet&&novel!==undefined)return {scene:scene.location,index:novel,label:names(scene)[novel].name};
 return null;
}
export function spatialEcologyObjects(world){
 const scene=world?.scene;if(scene?.spatialExpansion?.version!==1)return[];
 const stage=spatialEcologyRecord(world)?.stage||0,fauna=spatialEcologyRecord(world)?.fauna||false;
 return spatialEcologySites(scene).map(o=>({...o,completed:o.spatialRole==='fauna'?fauna:o.spatialStage<stage,
   next:o.spatialRole!=='fauna'&&o.spatialStage===stage}));
}
function stepText(scene,role){
 const p=spatialEcologyStory(scene),place=locationPhrase(scene);
 if(role==='trace')return place+'. The first tracks: '+p.sign+'. '+p.habitat;
 if(role==='evidence')return place+'. '+p.evidence+' Worksite principle: '+p.clue;
 if(role==='work')return place+'. The failing structure is the '+p.work+'. '+p.clue;
 if(role==='fauna')return place+'. '+p.fauna+' '+p.habitat;
 return place+'. '+p.effect;
}
export function interactSpatialEcology(world,object){
 if(object?.type!=='spatial-fieldwork')return false;
 const scene=world?.scene,canonical=spatialEcologySites(scene).find(o=>o.spatialId===object.spatialId);
 if(!canonical)return true;
 const distance=Math.hypot(world.state.x-canonical.xy[0]-.5,world.state.y-canonical.xy[1]-.5);
 if(distance>2.3){world.notice('Walk closer to the site before examining it.');return true;}
 discoverSpatialEcology(world,{quiet:true});
 const role=canonical.spatialRole,profile=spatialEcologyStory(scene),record=spatialEcologyRecord(world);
 if(role==='fauna'){
  if(!record?.fauna)ensureRecord(world).fauna=true;
  world.text(['CREATURE TERRITORY — '+profile.subject,stepText(scene,role),
   'You can leave the creatures undisturbed, or return later. This observation is now recorded on the region map.']);
  return true;
 }
 const step={trace:0,evidence:1,work:2,return:3}[role],stage=record?.stage||0;
 if(stage>step){world.text(stepText(scene,role)+'\nRecorded in your field journal.');return true;}
 if(stage<step){
  const prior=['the first tracks','the habitat evidence','the worksite adjustment'][stage];
  world.text('This site is part of a longer field investigation. First examine '+prior+'. The region map shows your next station.');
  return true;
 }
 if(role==='trace'){
  ensureRecord(world).stage=1;
  world.text(['REGIONAL SURVEY — '+profile.subject,stepText(scene,'trace'),
   'Look for the habitat evidence near the crossing. You may take any route, including the longer return loop.']);
  return true;
 }
 if(role==='evidence'){
  ensureRecord(world).stage=2;
  world.text(['FIELD EVIDENCE — '+profile.subject,stepText(scene,'evidence'),
   'The worksite can now be repaired. The evidence stays in your field notes.']);
  return true;
 }
 if(role==='work'){
  world.choose('ENVIRONMENTAL WORK — '+profile.work+'\n'+stepText(scene,'work')+'\nWhich intervention protects the surrounding habitat?',profile.choices.map((label,i)=>[label,()=>{
   if(i!==profile.answer){world.text('The evidence suggests this would cause damage. Nothing has been spent. Re-examine the clue and choose another approach.');return;}
   ensureRecord(world).stage=3;
   world.text(['The adjustment holds. '+profile.effect,'The far route remains open. Return through the outer reach to decide what should be kept or recovered.']);
  }]));
  return true;
 }
 if(role==='return'){
  world.choose('REGIONAL STEWARDSHIP — '+profile.subject+'\n'+stepText(scene,'return')+'\nYour work is complete. Choose the lasting result.',[
   ['Protect the habitat · fewer disturbances here',()=>{
    const r=ensureRecord(world);r.stage=4;r.choice='protect';
    world.text('You mark the habitat for protection and leave its living resources untouched. Nearby spontaneous creature disturbances become slightly less frequent in this region. No combat statistics change.');
   }],
   ['Salvage loose material · modest trade credits',()=>{
    const r=ensureRecord(world);r.stage=4;r.choice='salvage';
    const credit=8+Math.floor((scene.chapter||1)/5)*3;
    world.state.gold+=credit;
    world.text('You pack only recoverable, discarded material. Earned: '+credit+' credits. The wildlife remains at its normal encounter pace. This claim cannot be repeated.');
   }]
  ]);
  return true;
 }
 return true;
}
/** Habitat stewardship is a narrow local encounter-frequency change only. */
export function spatialEcologyEncounterPace(world){
 return spatialEcologyRecord(world)?.choice==='protect' ? 0.82 : 1;
}
export function spatialEcologySummary(world){
 const scene=world?.scene,record=spatialEcologyRecord(world),stage=record?.stage||0;
 if(scene?.spatialExpansion?.version!==1)return null;
 const next=['Follow the first tracks','Read the habitat evidence','Repair the ecological worksite','Visit the far return','Survey complete'][stage];
 return {stage,total:4,discovered:Array.from({length:8},(_,i)=>!!((record?.mask||0)&(1<<i))).filter(Boolean).length,
  fauna:!!record?.fauna,choice:record?.choice||null,next,subject:spatialEcologyStory(scene).subject};
}
