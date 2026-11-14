/** The same six materials work on a journey and on a battlefield.  These are
 * discrete, previewable tile rules, not a second physics engine.  The map is
 * never cut through: an optional damaged floor tile opens after a repair, and
 * its removal is proven not to disconnect any existing floor or story object. */
import {encounterHabitat} from './field-encounters.js?v=5.21.0';
import {outdoorLayout} from './outdoor-layout.js?v=5.22.0';
import {buildingReservations,intersectsGroundRect} from './environmental-grounding.js?v=5.22.0';
import {isInteriorScene} from './scene-identity.js';
import {isObservatoryScene} from './observatory-layout.js?v=5.38';

export const WORLD_TOOL_NAMES=Object.freeze({plank:'Brace plank',hook:'Salvage hook',bell:'Signal bell',jar:'Water vessel',coil:'Grounding coil',reed:'Binding reeds'});
const TYPES=Object.keys(WORLD_TOOL_NAMES),BEATS=['low','middle','high'];
const profile=(id,habitat,label,art,primary,recipe,alternate,effect,pattern,evidence,description)=>Object.freeze({id,habitat,label,art,primary,recipe,alternate,effect,pattern,evidence,description});
export const WORLD_AFFORDANCE_PROFILES=Object.freeze([
 profile('flood-sluice','wetland','Flood-marked side sluice','sluice',['plank','reed'],'Lash a floating footway','jar','bridge',[0,2,1],['Water knocks against a hollow gate.','A dragging shell pauses between three returning knocks.'],'The short crossing has lifted from its pegs. A lashed footway, a water-balanced latch or its returning rhythm can make it safe.'),
 profile('kiln-catwalk','foundry','Sagging kiln catwalk','brace',['plank','hook'],'Pin a load-bearing brace','coil','brace',[2,0,1],['Cooling metal ticks under strain.','One loose conductor is making the alarm answer itself.'],'A support has slipped beside the cooling channel. Pin a brace, isolate the current or answer its cooling rhythm.'),
 profile('index-gate','archive','Unindexed return gate','resonancegate',['bell','reed'],'Hang a soft return chime','hook','resonant',[1,0,2],['Paper moves with a slow scraping sound.','A small indexing bell answers in three unequal pitches.'],'An old gate closes the reading shortcut. Its latch can be lifted, persuaded by a soft chime or answered by hand.'),
 profile('vane-relay','highland','Windbound maintenance relay','relay',['coil','hook'],'Ground and lower the spare vane','bell','grounded',[2,1,0],['Copper rattles when the wind changes.','A high call is followed by two quieter returns.'],'The maintenance vane feeds its own call back into the passage. Ground it, interrupt the call or answer its return rhythm.'),
 profile('burrow-trail','meadow','Burrowed causeway','burrow',['jar','reed'],'Set a water-scented diversion','plank','shelter',[0,1,2],['Dry reeds move without wind.','Something is carrying loose boards toward a burrow.'],'A burrow has undermined the short trail. Divert the small diggers with water, span the soft patch or settle its hollow rhythm.'),
 profile('rootwalk','woodland','Tangled rootwalk','brace',['hook','reed'],'Lift and bind the living roots','bell','shelter',[1,2,0],['Roots creak in a slow pulse.','A nesting animal stops moving whenever the grove falls quiet.'],'Living roots have lifted the walkway. Bind them aside, settle their vibration or answer the sequence carried through the wood.'),
 profile('silt-grate','sewer','Silted inspection grate','sluice',['jar','hook'],'Wash and lift the silt latch','coil','ventilated',[0,2,0],['Bubbles rise on every second pressure return.','A tool drags over the grate, then stops.'],'Silt has jammed a service grate. Wash and lift it, ground its pump or equalize pressure with the correct rhythm.'),
 profile('cellar-step','cellar','Split cellar landing','brace',['plank','reed'],'Lash a replacement landing','hook','shelter',[1,0,1],['A loose step knocks against a stone riser.','Small feet retreat whenever the landing shifts.'],'The cellar landing has split along an old repair. Lash a fresh board, hook the old peg home or match the settling knocks.'),
 profile('echo-gallery','cavern','Echo-closed gallery','resonancegate',['bell','jar'],'Tune a water-cup resonator','hook','resonant',[2,0,2],['A water drop returns as three different notes.','The far echo is much softer than the nearest one.'],'A balancing stone closes the short gallery. A tuned water cup, a lifted pin or a precise returning phrase will release it.'),
 profile('rime-channel','frostland','Rimed return channel','sluice',['coil','jar'],'Warm a grounded water loop','plank','ventilated',[2,2,0],['Ice ticks before each small pressure release.','The channel carries a low hum beneath the brittle crust.'],'Rime has locked a maintenance channel. Warm a grounded water loop, bridge the crust or tap its release sequence.'),
 profile('witness-arch','ruins','Folded witness arch','resonancegate',['bell','reed'],'Suspend a witness chime','hook','resonant',[0,1,0],['An old arch answers only the softest sound.','Two dry scrapes are followed by a long silence.'],'A folded witness panel seals the service path. Hang a soft chime, lift its catch or reproduce the remembered phrase.'),
 profile('ground-loop','workshop','Ground-loop inspection channel','relay',['coil','hook'],'Ground and separate the return loop','bell','grounded',[1,2,1],['A return coil hums after its switch is open.','A loose contact makes a second, quieter click.'],'A self-feeding return loop blocks the inspection channel. Ground it, break its reply with a bell or tap the test sequence.')
]);
const ORIGIN_PROFILES={'sable-reed':'burrow-trail','iona-lowbank':'flood-sluice','rook-regulator':'ground-loop','brass-rail':'kiln-catwalk','riven-tide':'flood-sluice','mira-archive':'index-gate','veyr-storm':'vane-relay'};
const clone=v=>JSON.parse(JSON.stringify(v));
const key=p=>p.join(','),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const boundedId=s=>typeof s==='string'&&s.length>0&&s.length<=100&&!['__proto__','prototype','constructor'].includes(s);
const SCENE_CACHE=new WeakMap();
const fresh=knowledge=>({version:1,kit:Object.fromEntries(TYPES.map(t=>[t,0])),sources:[],sites:{},knowledge:[...new Set(knowledge||[])].slice(0,12),plans:{},records:[]});
function ledger(state){if(!state.worldAffordances)state.worldAffordances=fresh();return state.worldAffordances;}
function profileFor(scene){
 const exact=ORIGIN_PROFILES[scene.originId];
 if(exact)return WORLD_AFFORDANCE_PROFILES.find(p=>p.id===exact);
 const habitat=encounterHabitat(scene);
 if(habitat)return WORLD_AFFORDANCE_PROFILES.find(p=>p.habitat===habitat)||WORLD_AFFORDANCE_PROFILES[4];
 // Refuges keep their existing quiet role; one appropriate, useful repair is
 // still possible at their work surfaces without adding an encounter scout.
 const name=[scene.key,scene.interior,scene.household?.kind].join(' ');
 return WORLD_AFFORDANCE_PROFILES.find(p=>p.id===(/archive|office|study/.test(name)?'index-gate':/water|clinic|refuge|shelter/.test(name)?'flood-sluice':/garden|home|nursery/.test(name)?'rootwalk':'ground-loop'));
}
/** A domestic presentation does not rename a recipe, its stored knowledge, or
 * its effects. The same historical repair can be an underfloor household job. */
function presentationFor(scene,p){
 const home=isInteriorScene(scene)&&/home|quarters|nursery|kitchen|inn/.test([scene.key,scene.household?.kind].join(' '));
 if(home&&p.id==='rootwalk')return {label:'Loose floorboard',art:'floorboard',recipe:'Hook and bind the loose board',description:'A floorboard has lifted from an old fixing. Lift it with a hook and bind it back with reeds, settle its vibration with a small bell, or answer the knocks beneath it.'};
 if(home&&p.id==='burrow-trail')return {label:'Underfloor maintenance patch',art:'floorboard',recipe:'Set an underfloor scent diversion',description:'Small diggers have loosened a board beneath the room. Set a water-scented reed diversion, brace the opening with a plank, or answer the hollow knocks to settle them.'};
 return {label:p.label,art:p.art,recipe:p.recipe,description:p.description};
}
function floor(scene,x,y){return scene.floor?.[y]?.[x]==='.';}
function flood(scene,start,blocked=null){
 const q=[start],seen=new Set([key(start)]);
 for(let i=0;i<q.length&&q.length<5000;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
  const p=[q[i][0]+dx,q[i][1]+dy],k=key(p);
  if(seen.has(k)||blocked&&k===key(blocked)||!floor(scene,...p))continue;
  seen.add(k);q.push(p);
 }
 return {cells:q,seen};
}
/** Conservative rectangles for both the painted and Canvas fallback versions.
 * Kept independent of the painter: scene-craft's authored art imports origins,
 * so importing that draw graph here would create a simulation/art cycle. */
export function worldAffordanceBounds(scene,object){
 const [tx,ty]=object.xy||[0,0],x=tx+.5,y=ty+.5,kind=object.affordanceKind,indoor=isInteriorScene(scene),art=object.reservationArt||object.art;
 let w,h,bottom=9;
 if(kind==='salvage'){w=36;h=43;}
 else if(kind==='scout'||art==='hydrophone'||art==='lookout'){w=38;h=43;}
 else if(art==='burrow'||art==='floorboard'){w=60;h=31;bottom=12;}
 else if(art==='brace'){w=62;h=51;}
 else if(indoor){w=64;h=art==='relay'?74:art==='resonancegate'?72:55;}
 else{w=104;h=108;}
 const scale=object.compactArt?.72:1;
 return {x:x-w*scale/96,y:y-(h-bottom)*scale/48,w:w*scale/48,h:h*scale/48};
}
/** Exact O(V+E) articulation detection for optional repair sites.
 * Iterative lowlinks avoid recursion overflow on expanded 100x100 maps. */
export function articulationCells(scene,patch){
 const cells=patch?.cells||[],index=new Map(cells.map((p,i)=>[p[0]+','+p[1],i])),n=cells.length;
 const disc=new Int32Array(n),low=new Int32Array(n),parent=new Int32Array(n).fill(-1),children=new Int32Array(n),cut=new Set();
 const directions=[[1,0],[-1,0],[0,1],[0,-1]];let clock=0;
 for(let root=0;root<n;root++){
  if(disc[root])continue;
  disc[root]=low[root]=++clock;
  const stack=[{v:root,next:0}];
  while(stack.length){
   const frame=stack[stack.length-1],v=frame.v;
   if(frame.next<4){
    const [dx,dy]=directions[frame.next++],u=index.get((cells[v][0]+dx)+','+(cells[v][1]+dy));
    if(u===undefined)continue;
    if(!disc[u]){parent[u]=v;children[v]++;disc[u]=low[u]=++clock;stack.push({v:u,next:0});}
    else if(u!==parent[v])low[v]=Math.min(low[v],disc[u]);
   }else{
    stack.pop();const p=parent[v];
    if(p>=0){low[p]=Math.min(low[p],low[v]);if(parent[p]>=0&&low[v]>=disc[p])cut.add(p);}
    else if(children[v]>1)cut.add(v);
   }
  }
 }
 return new Set([...cut].map(i=>cells[i][0]+','+cells[i][1]));
}

function layout(world){
 const scene=world.scene;if(!scene?.floor)return null;
 if(SCENE_CACHE.has(scene))return SCENE_CACHE.get(scene);
 const open=[];for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(floor(scene,x,y))open.push([x,y]);
 if(!open.length){SCENE_CACHE.set(scene,null);return null;}
 // The rebuilt observatory owns all of its work stations. Do not generate an
 // unrelated repair, stock pile or invisible optional blocker inside its court.
 // Keep a real floor patch so already-paid encounter preparations and packed
 // player tools retain their native effect when that saved encounter begins.
 if(isObservatoryScene(scene)){
  const start=scene.arrive.slice(),value={profile:profileFor(scene),start,site:null,sources:[],scout:null,patch:flood(scene,start).cells,authored:true};
  SCENE_CACHE.set(scene,value);return value;
 }
 const arrive=scene.arrive||[Math.floor(world.state.x),Math.floor(world.state.y)],start=open.reduce((a,b)=>dist(a,arrive)<=dist(b,arrive)?a:b),patch=flood(scene,start),objects=scene.objects||[],profile=profileFor(scene),composition=outdoorLayout(scene),buildings=buildingReservations(scene),routes=composition.reservations?.paths||new Set();
 const protectedPoints=[arrive,...(scene.doors||[]).map(o=>o.xy),...objects.filter(o=>o.xy&&!['furnishing','note'].includes(o.type)).map(o=>o.xy)].filter(Array.isArray);
 const fixedRects=[...buildings.flatMap(b=>[b.visual,b.approach]),...[...composition.sites,...composition.trees,...composition.landmarks].map(p=>p.bounds)];
 const furnitureRects=objects.filter(o=>o.footprint&&o.furniture!==16).map(o=>o.footprint);
 const bodyRects=[...(scene.doors||[]),...objects.filter(o=>o.xy&&!['furnishing','note'].includes(o.type))].filter(o=>o.xy).map(o=>({x:o.xy[0]+.02,y:o.xy[1]-.95,w:.96,h:1.6}));
 const clearRoot=p=>protectedPoints.every(q=>dist(p,q)>=1.5)&&dist(p,start)>=1.5&&objects.every(o=>!o.footprint||p[0]<o.footprint.x||p[0]>=o.footprint.x+o.footprint.w||p[1]<o.footprint.y||p[1]>=o.footprint.y+o.footprint.h);
 const clear=(p,kind,art,compactArt=false)=>{
  if(!clearRoot(p))return false;const b=worldAffordanceBounds(scene,{xy:p,affordanceKind:kind,art,compactArt});
  return b.x>=.05&&b.y>=.05&&b.x+b.w<scene.width-.05&&b.y+b.h<scene.height-.05&&!fixedRects.some(r=>intersectsGroundRect(b,r,.15))&&!furnitureRects.some(r=>intersectsGroundRect(b,r))&&!bodyRects.some(r=>intersectsGroundRect(b,r,.12));
 };
 const edges=new Set(open.filter(([x,y])=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!floor(scene,x+dx,y+dy))).map(key)),edgeCache=new Map(),edgeDistance=p=>{const k=key(p);if(edgeCache.has(k))return edgeCache.get(k);let best=5;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(edges.has((p[0]+dx)+','+(p[1]+dy)))best=Math.min(best,Math.hypot(dx,dy));edgeCache.set(k,best);return best;};
 const work=composition.groups.filter(g=>g.role==='work'),natural=composition.groups.filter(g=>g.role==='bank'),preferred=/meadow|woodland|wetland|ruins/.test(profile.habitat)?natural:work;
 const anchors=preferred.length?preferred.map(g=>[g.anchor.x-.5,g.anchor.y-.5]):[];
 const scores=new Map(),score=p=>{const k=key(p);if(!scores.has(k))scores.set(k,edgeDistance(p)*3+(anchors.length?Math.min(...anchors.map(q=>dist(p,q)))*.3:0)+dist(p,start)*.15+(routes.has(k)?15:0));return scores.get(k);};
 const candidates=patch.cells.filter(clearRoot).sort((a,b)=>score(a)-score(b)||a[1]-b[1]||a[0]-b[0]);
 const needScout=!!encounterHabitat(scene),critical=articulationCells(scene,patch);
 const optional=p=>{
  const degree=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>floor(scene,p[0]+dx,p[1]+dy)).length;
  // A non-articulation tile cannot sever any existing story or repair route.
  return degree>=3&&!critical.has(key(p));
 };
 function cluster(site,{compactArt=false,compactStock=false,allowRoute=false,radius=4.5}={}){
  const used=[{xy:site,bounds:worldAffordanceBounds(scene,{xy:site,affordanceKind:'site',art:profile.art,compactArt})}],sources=[];
  const nearby=candidates.filter(p=>dist(p,site)>=(compactStock?1:1.5)&&dist(p,site)<=radius&&(allowRoute||!routes.has(key(p)))).sort((a,b)=>dist(a,site)-dist(b,site)||edgeDistance(a)-edgeDistance(b)||a[1]-b[1]||a[0]-b[0]);
  const place=(kind,art)=>{
   for(const p of nearby){if(!clear(p,kind,art,compactStock)||used.some(q=>dist(p,q.xy)<(compactStock?1:1.5)))continue;const bounds=worldAffordanceBounds(scene,{xy:p,affordanceKind:kind,art,compactArt:compactStock});if(used.some(q=>intersectsGroundRect(bounds,q.bounds,.12)))continue;used.push({xy:p,bounds});return p;}
   return null;
  };
  for(const tool of profile.primary){const p=place('salvage',tool);if(!p)return null;sources.push(p);}
  const scout=needScout?place('scout','hydrophone'):null;
  if(needScout&&!scout)return null;
  return {site,sources,scout,compactArt,compactStock};
 }
 let chosen=null;
 // A complete work patch is chosen as a unit. The broad pass preserves a valid
 // opportunity in constrained rooms; architecture and art are never relaxed.
 for(const settings of [{},{radius:7},{radius:7,compactArt:true},{radius:7,compactArt:true,compactStock:true},{radius:10,compactArt:true,compactStock:true,allowRoute:true}]){
  for(const p of candidates){if(!settings.allowRoute&&routes.has(key(p)))continue;if(!clear(p,'site',profile.art,settings.compactArt)||!optional(p))continue;chosen=cluster(p,settings);if(chosen)break;}
  if(chosen)break;
 }
 // Very small rooms may have had only a repair and one or two spares. Retain
 // those finite IDs where each individual piece has safe, reachable floor.
 if(!chosen){
  const site=candidates.find(p=>clear(p,'site',profile.art,true)&&optional(p))||null,sources=[],taken=[];
  if(site)taken.push({xy:site,bounds:worldAffordanceBounds(scene,{xy:site,affordanceKind:'site',art:profile.art,compactArt:true})});
  const spare=(kind,art)=>{for(const p of candidates){if(!clear(p,kind,art,true)||taken.some(q=>dist(p,q.xy)<1))continue;const bounds=worldAffordanceBounds(scene,{xy:p,affordanceKind:kind,art,compactArt:true});if(taken.some(q=>intersectsGroundRect(bounds,q.bounds,.12)))continue;taken.push({xy:p,bounds});return p;}return null;};
  for(const tool of profile.primary){const p=spare('salvage',tool);if(p)sources.push(p);}
  const scout=needScout?spare('scout','hydrophone'):null;
  chosen={site,sources,scout,compactArt:true,compactStock:true};
 }
 const value={profile,start,...chosen,patch:patch.cells};SCENE_CACHE.set(scene,value);return value;
}

/** Read-only layout reservations for other generated activities. This does not
 * initialize a kit, apply a collision mask, or call world.objects(). */
export function worldAffordanceReservations(scene){
 const spec=layout({scene,state:{x:(scene?.arrive?.[0]||0)+.5,y:(scene?.arrive?.[1]||0)+.5}});if(!spec)return[];
 const descriptors=spec.sources.map((xy,i)=>({id:'aff-'+scene.location+'-salvage-'+i,kind:'salvage',xy,art:spec.profile.primary[i],compactArt:spec.compactStock}));
 if(spec.site)descriptors.push({id:'aff-'+scene.location+'-site',kind:'site',xy:spec.site,art:spec.profile.art,compactArt:spec.compactArt});
 if(spec.scout)descriptors.push({id:'aff-'+scene.location+'-scout',kind:'scout',xy:spec.scout,art:'hydrophone',compactArt:spec.compactStock});
 return descriptors.map(o=>({...o,xy:o.xy.slice(),bounds:worldAffordanceBounds(scene,{...o,affordanceKind:o.kind})}));
}
function localState(world,object){const l=ledger(world.state);return l.sites[object.affordanceId]||{solved:false,progress:0};}
export function worldAffordanceObjects(world){
 const spec=layout(world);if(!spec)return[];applyAffordanceScene(world);const l=ledger(world.state),scene=world.scene.location,p=spec.profile,appearance=presentationFor(world.scene,p),out=[];
 for(const [i,xy]of spec.sources.entries()){
  const id='aff-'+scene+'-salvage-'+i,type=p.primary[i];
  out.push({type:'affordance',affordanceId:id,affordanceKind:'salvage',profileId:p.id,xy:xy.slice(),label:WORLD_TOOL_NAMES[type]+' · loose repair stock',art:type,toolType:type,compactArt:spec.compactStock,solved:l.sources.includes(id),text:'A marked spare beside the local work surface. It can travel in your field kit.'});
 }
 if(spec.site){const id='aff-'+scene+'-site',state=l.sites[id]||{solved:false,progress:0};out.push({type:'affordance',affordanceId:id,affordanceKind:'site',profileId:p.id,xy:spec.site.slice(),label:appearance.label,art:appearance.art,reservationArt:p.art,compactArt:spec.compactArt,solved:state.solved,progress:state.progress,text:appearance.description,effect:p.effect,optional:true});}
 if(spec.scout){const id='aff-'+scene+'-scout',state=l.sites[id]||{solved:false,progress:0};out.push({type:'affordance',affordanceId:id,affordanceKind:'scout',profileId:p.id,xy:spec.scout.slice(),label:'Listening point · '+appearance.label.toLowerCase(),art:'hydrophone',compactArt:spec.compactStock,solved:!!state.scouted,progress:0,text:'Set the hydrophone against the floor and choose how to approach the next local contact.'});}
 return out;
}
function canonical(world,object){return object?.affordanceId?worldAffordanceObjects(world).find(o=>o.affordanceId===object.affordanceId):null;}
function commonReason(world,o){
 if(!o)return 'This opportunity is no longer here.';
 if(world.state.mode!=='field')return 'Finish the current encounter first.';
 if(dist([world.state.x,world.state.y],[o.xy[0]+.5,o.xy[1]+.5])>2.8)return 'Move within three tiles.';
 const start=[Math.floor(world.state.x),Math.floor(world.state.y)],q=[{p:start,n:0}],seen=new Set([key(start)]),blocked=world.scene.affordanceBlocked||[];
 let reached=false;for(let i=0;i<q.length;i++){
  const {p,n}=q[i];if(Math.abs(p[0]-o.xy[0])+Math.abs(p[1]-o.xy[1])<=1){reached=true;break;}
  if(n>=4)continue;
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=[p[0]+dx,p[1]+dy],k=key(a);if(seen.has(k)||!floor(world.scene,...a)||blocked.some(b=>key(b)===k))continue;seen.add(k);q.push({p:a,n:n+1});}
 }
 if(!reached)return 'Move around the wall to reach this work surface.';
 return '';
}
function actionReason(world,o,row){
 const common=commonReason(world,o);if(common)return common;
 const l=ledger(world.state),p=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===o.profileId),site=localState(world,o);
 if(row.action==='take')return o.affordanceKind!=='salvage'?'Choose loose repair stock.':o.solved?'This spare has already been taken.':l.sources.length>=1024?'The field record is full.':l.kit[o.toolType]>=30?'The kit already holds thirty of these.':'';
 if(row.action==='pack')return !TYPES.includes(row.tool)?'Choose a field tool.':!l.kit[row.tool]?'There is none in the kit.':l.plans[String(world.scene.location)]?.encounter?'The next contact already has its preparation.':l.plans[String(world.scene.location)]?.packed?'One tool is already packed for the next contact.':'';
 if(o.affordanceKind==='salvage')return 'Choose a repair or listening point.';
 if(row.action==='scout')return o.affordanceKind!=='scout'?'Choose the listening point.':site.scouted?'The room has already been surveyed.':'';
 if(row.action==='prepare'){
  if(o.affordanceKind!=='scout'||!site.scouted)return 'Listen to this room before preparing an approach.';
  const plan=l.plans[String(world.scene.location)];
  if(plan?.plan||plan?.spent)return 'This room’s approach has already been prepared.';
  if(!['quiet','flank','lure'].includes(row.plan))return 'Choose an approach.';
  if(row.plan==='flank'&&!l.kit.hook)return 'Requires one salvage hook.';
  if(row.plan==='lure'&&(!l.kit.bell||!l.kit.reed))return 'Requires a signal bell and binding reeds.';
  return '';
 }
 if(o.affordanceKind!=='site')return 'Choose the damaged route.';
 if(row.action==='listen')return l.knowledge.includes(p.id)?'This rhythm is already remembered.':'';
 if(site.solved)return o.art==='floorboard'?'The floor patch is already repaired.':'The route is already repaired.';
 if(row.action==='assemble')return p.primary.every(t=>l.kit[t]>0)?'':'Requires '+p.primary.map(t=>WORLD_TOOL_NAMES[t]).join(' and ')+'.';
 if(row.action==='use-tool')return row.tool!==p.alternate?'That tool does not fit this repair.':l.kit[row.tool]>0?'':'Requires '+WORLD_TOOL_NAMES[row.tool]+'.';
 if(row.action==='beat')return Number.isInteger(row.beat)&&row.beat>=0&&row.beat<=2?'':'Choose a low, middle or high knock.';
 return 'Choose one of the available actions.';
}
export function worldAffordanceActions(world,object){
 const o=canonical(world,object);if(!o)return[];const p=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===o.profileId),appearance=presentationFor(world.scene,p),l=ledger(world.state),rows=[];
 const add=(row)=>{const reason=actionReason(world,o,row);rows.push({...row,enabled:!reason,reason});};
 if(o.affordanceKind==='salvage')add({action:'take',label:'Take '+WORLD_TOOL_NAMES[o.toolType],detail:'One finite spare. Carry it to a repair, assemble it with another tool or pack it into a battle.'});
 if(o.affordanceKind==='site'){
  add({action:'assemble',label:appearance.recipe,recipe:p.id,detail:'Consumes '+p.primary.map(t=>WORLD_TOOL_NAMES[t]).join(' + ')+(o.art==='floorboard'?'. Restores this optional floor patch and improves later local encounters.':'. Opens the marked optional shortcut and improves later local encounters.')});
  add({action:'use-tool',tool:p.alternate,label:'Use '+WORLD_TOOL_NAMES[p.alternate],detail:o.art==='floorboard'?'A direct alternative repair. Consumes one tool and restores the same floor patch.':'A direct alternative repair. Consumes one tool and opens the same physical route.'});
  add({action:'listen',label:o.art==='floorboard'?'Listen beneath the boards':'Listen to the mechanism',detail:'Hear and remember its three-part return. You can reproduce it by hand whenever you know it.'});
  for(let beat=0;beat<3;beat++)add({action:'beat',beat,label:'Tap the '+BEATS[beat]+' return',detail:'Tap an actual sequence. Correct notes advance the latch; a wrong note starts a new phrase. No prior clue flag is required.'});
 }
 if(o.affordanceKind==='scout'){
  add({action:'scout',label:'Listen through the floor',detail:'Hear partial evidence, then prepare one local approach. The evidence does not reveal an exact enemy list.'});
  add({action:'prepare',plan:'quiet',label:'Approach between the calls',detail:'One quiet approach per room. The next local contact charges more slowly and has one fewer reinforcement call.'});
  add({action:'prepare',plan:'flank',label:'Rig a side-entry line',detail:'Consumes one hook. The next local formation is drawn away from your entry point; its first charges are delayed.'});
  add({action:'prepare',plan:'lure',label:'Assemble a distant reed chime',detail:'Consumes a bell and reeds. Draw the next local formation toward a marked decoy and gain eight seconds on its objective.'});
 }
 for(const tool of TYPES)if(l.kit[tool])add({action:'pack',tool,label:'Pack '+WORLD_TOOL_NAMES[tool]+' for the next contact',detail:'Moves one carried tool into the next shared battlefield. Either side can claim it; it is consumed from the travel kit.'});
 return rows;
}
function resolveSite(world,o,p,state){
 const l=ledger(world.state);state.solved=true;state.progress=0;l.knowledge=[...new Set([...l.knowledge,p.id])];
 const reward={gold:8,item:p.effect==='grounded'?'ether':'tonic',count:1};
 world.state.gold=(world.state.gold||0)+reward.gold;world.state.items??={};world.state.items[reward.item]=(world.state.items[reward.item]||0)+1;
 applyAffordanceScene(world);
 return {ok:true,action:'repair',notice:o.label+(o.art==='floorboard'?' settles · floor restored':' opens · shortcut restored')+' · +8 credits · '+(reward.item==='ether'?'Ether':'Tonic')+' recovered.',site:o.affordanceId,effect:p.effect,reward,pattern:p.pattern.slice(),deed:{id:o.affordanceId,kind:'repair',goal:p.effect,label:'Restored '+o.label.toLowerCase()}};
}
export function applyWorldAffordance(world,object,request={}){
 const o=canonical(world,object),reason=actionReason(world,o,request);if(reason)return {ok:false,notice:reason};
 const l=ledger(world.state),p=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===o.profileId),id=o.affordanceId;
 if(request.action==='take'){l.kit[o.toolType]++;l.sources.push(id);return {ok:true,action:'take',notice:WORLD_TOOL_NAMES[o.toolType]+' added to the travel kit.',tool:o.toolType};}
 if(request.action==='pack'){
  const plan=l.plans[String(world.scene.location)]??={};plan.packed=request.tool;l.kit[request.tool]--;
  return {ok:true,action:'pack',notice:WORLD_TOOL_NAMES[request.tool]+' reserved for the next local contact.',tool:request.tool};
 }
 const site=l.sites[id]??={solved:false,progress:0};
 if(request.action==='listen'){
  l.knowledge=[...new Set([...l.knowledge,p.id])];
  return {ok:true,action:'listen',notice:'The return is '+p.pattern.map(i=>BEATS[i]).join(' → ')+'. The clay remembers it.',pattern:p.pattern.slice()};
 }
 if(request.action==='scout'){
  site.scouted=true;return {ok:true,action:'scout',notice:p.evidence.join(' ')+' Choose an approach before the next contact.',evidence:p.evidence.slice()};
 }
 if(request.action==='prepare'){
  if(request.plan==='flank')l.kit.hook--;if(request.plan==='lure'){l.kit.bell--;l.kit.reed--;}
  const plan=l.plans[String(world.scene.location)]??={};plan.plan=request.plan;plan.spent=false;
  return {ok:true,action:'prepare',notice:{quiet:'You wait for the gap between calls.',flank:'The side-entry line is fastened.',lure:'The distant reed chime is ready.'}[request.plan]+' The next local encounter will begin differently.',plan:request.plan,deed:{id:'plan-'+world.scene.location,kind:'scouting',goal:request.plan,label:'Prepared a '+request.plan+' approach'}};
 }
 if(request.action==='assemble'){for(const t of p.primary)l.kit[t]--;return resolveSite(world,o,p,site);}
 if(request.action==='use-tool'){l.kit[request.tool]--;return resolveSite(world,o,p,site);}
 if(request.action==='beat'){
  if(p.pattern[site.progress]===request.beat)site.progress++;
  else site.progress=p.pattern[0]===request.beat?1:0;
  if(site.progress===p.pattern.length){const out=resolveSite(world,o,p,site);out.deed.kind='knowledge';out.deed.label='Answered '+o.label.toLowerCase()+' by its remembered rhythm';return {...out,tone:request.beat};}
  return {ok:true,action:'beat',tone:request.beat,progress:site.progress,notice:site.progress?(o.art==='floorboard'?'The boards answer · ':'The latch answers · ')+site.progress+' / 3 returns.':'The phrase falls quiet. Begin again.'};
 }
 return {ok:false,notice:'Choose one of the available actions.'};
}
export function worldAffordanceSummary(world,object){
 const o=canonical(world,object);if(!o)return null;const l=ledger(world.state),p=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===o.profileId),site=localState(world,o),plan=l.plans[String(world.scene.location)];
 return {label:o.label,text:o.text,status:o.affordanceKind==='salvage'?(o.solved?'Spare already taken':'One marked spare'):o.affordanceKind==='scout'?(plan?.spent?'Prepared approach used':plan?.plan?'Approach prepared: '+plan.plan:site.scouted?'Survey heard · choose an approach':'Unheard room'):site.solved?(o.art==='floorboard'?'Floor patch secure · local conditions improved':'Shortcut open · local conditions improved'):(o.art==='floorboard'?'Loose floor patch · ':'Shortcut closed · ')+(site.progress||0)+' / 3 returns',kit:TYPES.map(type=>({type,name:WORLD_TOOL_NAMES[type],count:l.kit[type]})),knowledge:l.knowledge.slice(),evidence:site.scouted?p.evidence.slice():[],solved:o.solved,progress:site.progress||0,pattern:l.knowledge.includes(p.id)?p.pattern.slice():[],effect:p.effect};
}
export function isWalkableOverride(world,x,y){
 const spec=layout(world);if(!spec?.site||Math.floor(x)!==spec.site[0]||Math.floor(y)!==spec.site[1])return null;
 // A legacy save can legitimately place a hero here. Never close a repair
 // underneath that hero; opening the route does not award its finite salvage.
 if(Math.floor(world.state.x)===spec.site[0]&&Math.floor(world.state.y)===spec.site[1])return null;
 return ledger(world.state).sites['aff-'+world.scene.location+'-site']?.solved?null:false;
}
/** Navigation consumes this small runtime mask while scenery retains its
 * authored floor. It is rebuilt from persistent repair state on scene entry. */
export function applyAffordanceScene(world){
 const spec=layout(world),scene=world.scene;if(!scene)return;
 const site=spec?.site,standing=site&&Math.floor(world.state.x)===site[0]&&Math.floor(world.state.y)===site[1],solved=site&&ledger(world.state).sites['aff-'+scene.location+'-site']?.solved;
 scene.affordanceBlocked=site&&!solved&&!standing?[site.slice()]:[];
 return scene.affordanceBlocked;
}
const encounterKey=(state,object)=>[object.type,state.scene,object.serial||0,object.seed||0,object.bit??'',object.originStep??''].join(':').slice(0,100);
export function affordanceEncounterContext(world,object,base={}){
 if(!object||object.type==='boss'||base.friendly||base.tutorial)return {...base};
 const spec=layout(world);if(!spec)return {...base};const l=ledger(world.state),scene=String(world.scene.location),prepared=l.plans[scene],id=encounterKey(world.state,object);
 const context={...base},closed=l.sites['aff-'+scene+'-site']?.solved!==true;
 context.walkable=spec.patch.filter(p=>!closed||!spec.site||key(p)!==key(spec.site)).filter(p=>Math.hypot(p[0]+.5-world.state.x,p[1]+.5-world.state.y)<=10).slice(0,220).map(p=>p.slice());
 if(!context.walkable.length)context.walkable=spec.patch.slice(0,220).map(p=>p.slice());
 if(!closed){context.tags=[...new Set([...(base.tags||[]),'prepared',spec.profile.effect])];if(context.objective){context.objective=clone(context.objective);context.objective.provenance??=[];context.objective.provenance.push(spec.profile.label+' restored · '+spec.profile.effect+' local approach');context.objective.asset.maxHp+=8;context.objective.asset.hp+=8;}}
 if(!prepared||prepared.spent&&prepared.encounter!==id)return context;
 if(!prepared.plan&&!prepared.packed)return context;
 if(!prepared.encounter){prepared.encounter=id;prepared.spent=true;}
 if(prepared.encounter!==id)return context;
 const plan=prepared.plan||'packed',delay=plan==='lure'?1.4:plan==='flank'?1.1:plan==='quiet'?.75:0;
 const points=context.walkable.map(p=>({x:p[0]+.5,y:p[1]+.5})).filter(p=>Math.hypot(p.x-world.state.x,p.y-world.state.y)>=2&&Math.hypot(p.x-world.state.x,p.y-world.state.y)<=5).sort((a,b)=>plan==='flank'?b.x-a.x||a.y-b.y:b.y-a.y||a.x-b.x);
 context.recon={version:1,id,plan,enemyDelay:delay,alarmSuppressed:plan==='quiet',evidence:spec.profile.evidence.slice(),points:points.slice(0,6),packed:prepared.packed||null};
 if(plan==='quiet')context.reinforcementLimit=Math.max(0,(base.reinforcementLimit??2)-1);
 if(plan==='lure'&&context.objective){context.objective=clone(context.objective);context.objective.deadline+=8;context.objective.provenance??=[];context.objective.provenance.push('A distant reed chime draws the formation aside · eight extra seconds');}
 if(prepared.packed){const p=context.recon.points[0]||{x:world.state.x,y:world.state.y};context.fieldProps=[{id:'travel-kit-'+id,type:prepared.packed,...p,source:'Finite tool packed from the travel kit'},...(base.fieldProps||[])].slice(0,6);context.wild=object.type==='wild';}
 return context;
}
/** Called after Battle constructs its dressed enemies and objective.  It only
 * relocates onto checked floor, and never repeats after snapshot restoration. */
export function applyAffordancePreparation(battle){
 const r=battle.context?.recon;if(!r||battle.affordancePrepared)return false;battle.affordancePrepared=true;
 const occupied=[...(battle.heroes||[]),...(battle.objective?.asset?[battle.objective.asset]:[])],points=r.points||[];
 if(['flank','lure'].includes(r.plan))for(const e of battle.enemies||[]){if(e.boss)continue;const p=points.find(p=>occupied.every(a=>Math.hypot(a.x-p.x,a.y-p.y)>=1));if(p){e.x=p.x;e.y=p.y;occupied.push(e);}}
 for(const e of battle.enemies||[])if(!e.boss){e.reconWindup=r.enemyDelay;e.reconUnused=true;e.atb=Math.max(0,(e.atb||0)-.05);}
 return true;
}
export function modifyPreparedIntent(battle,enemy,intent){
 if(!intent||!enemy?.reconUnused||enemy.boss)return intent;
 enemy.reconUnused=false;const delay=Math.max(0,Math.min(2,enemy.reconWindup||0));
 return {...intent,left:intent.left+delay,total:intent.total+delay,label:intent.label+' · approach disrupted'};
}
export function settleAffordanceEncounter(state,object,result){
 const l=state.worldAffordances;if(!l)return null;const id=encounterKey(state,object),plan=l.plans[String(object.scene??state.scene)];
 if(!plan||plan.encounter!==id||l.records.some(r=>r.id===id))return null;
 const record={id,scene:object.scene??state.scene,plan:plan.plan||'packed',packed:plan.packed||null,result:['win','loss','retreat'].includes(result)?result:'retreat'};l.records.push(record);l.records=l.records.slice(-256);return record;
}
export function worldAffordanceLegacy(state){return fresh(state?.worldAffordances?.knowledge);}
export const affordanceKnowledgeLegacy=worldAffordanceLegacy;
export function validWorldAffordances(value){
 if(value==null)return true;
 if(!plain(value)||value.version!==1||!plain(value.kit)||TYPES.some(t=>!Number.isInteger(value.kit[t])||value.kit[t]<0||value.kit[t]>30)||Object.keys(value.kit).some(t=>!TYPES.includes(t)))return false;
 if(!Array.isArray(value.sources)||value.sources.length>1024||new Set(value.sources).size!==value.sources.length||value.sources.some(s=>!boundedId(s)||!/^aff-[\w-]+-salvage-[01]$/.test(s)))return false;
 if(!plain(value.sites)||Object.keys(value.sites).length>1024||Object.entries(value.sites).some(([id,s])=>!boundedId(id)||!/^aff-[\w-]+-(site|scout)$/.test(id)||!plain(s)||typeof s.solved!=='boolean'||!Number.isInteger(s.progress)||s.progress<0||s.progress>2||s.scouted!==undefined&&typeof s.scouted!=='boolean'))return false;
 if(!Array.isArray(value.knowledge)||value.knowledge.length>12||new Set(value.knowledge).size!==value.knowledge.length||value.knowledge.some(id=>!WORLD_AFFORDANCE_PROFILES.some(p=>p.id===id)))return false;
 if(!plain(value.plans)||Object.keys(value.plans).length>512||Object.entries(value.plans).some(([scene,p])=>!/^\d+$/.test(scene)||!plain(p)||p.plan!==undefined&&!['quiet','flank','lure'].includes(p.plan)||p.packed!==undefined&&!TYPES.includes(p.packed)||p.spent!==undefined&&typeof p.spent!=='boolean'||p.encounter!==undefined&&!boundedId(p.encounter)))return false;
 if(!Array.isArray(value.records)||value.records.length>256||new Set(value.records.map(r=>r.id)).size!==value.records.length||value.records.some(r=>!plain(r)||!boundedId(r.id)||!Number.isInteger(r.scene)||!['quiet','flank','lure','packed'].includes(r.plan)||r.packed!==null&&!TYPES.includes(r.packed)||!['win','loss','retreat'].includes(r.result)))return false;
 return true;
}
