import {createActivityPlacer,activityObstacles,activityPlaceAnchors,nearestActivityPoint} from './activity-sites.js?v=5.38';
import {pointInGroundRect,intersectsGroundRect} from './environmental-grounding.js?v=5.22.0';
import {isInteriorScene} from './scene-identity.js';
import {gatherTradeGoods,awardReciprocity,economicComment} from './economy.js?v=5.18.0';
import {residentActivity,npcRoute,advanceResident} from './npc-routines.js?v=5.38';
import {ITEMS} from './repertoire.js?v=5.38';
import {REGIONS} from './regional-content.js?v=5.16.0';
import {reachableCells,lifeState,dayPeriod} from './townlife.js?v=5.38';
import {HOUSEHOLDS} from './townlife-content.js';
import {findPath} from './navigation.js?v=5.5.0';
import {grantResonance} from './resonance-link.js';
function say(w,pages,choices){w.state.mode='dialog';w.callbacks.onDialog({pages:Array.isArray(pages)?pages:[pages],silent:true,choices:choices?.map(([label,action])=>({label,action:()=>{w.state.mode='field';action();}})),after:()=>{w.state.mode='field';}});}
export function regionalState(s){s.regionalLife??={version:1,projects:[],botany:[],harvests:{},studies:{},materials:0};const r=s.regionalLife;r.projects??=[];r.botany??=[];r.harvests??={};r.studies??={};r.materials??=0;r.work??={};return r;}
export function validateRegionalWork(s){const work=s.regionalLife?.work;if(work===undefined)return;if(!work||typeof work!=='object'||Array.isArray(work)||Object.keys(work).length>24||Object.entries(work).some(([key,n])=>!/^([1-9]|1[0-9]|2[0-4])$/.test(key)||!Number.isInteger(n)||n<0||n>2))throw Error('Invalid regional work');}
export function regionalWorkView(s,chapter){return {phase:s.regionalLife?.projects?.includes(chapter)?2:s.regionalLife?.work?.[chapter]||0,project:REGIONS.find(p=>p.chapter===chapter)?.craft||''};}
function regionalPlacementCells(scene,objects){
 const available=reachableCells(scene),legacyCells=available.filter(a=>!objects.some(o=>Math.hypot(a[0]-o.xy[0],a[1]-o.xy[1])<1.6));
 // A spacious furnished room can lose its workbench to the broad point-radius
 // prefilter when small repair spares move nearby. Their exact rectangles keep
 // the existing regional work available. Tiny rooms retain the established gate.
 const tightInterior=isInteriorScene(scene)&&legacyCells.length<6&&available.length>=10;
 if(!tightInterior)return {cells:legacyCells,tightInterior:false};
 const obstacles=activityObstacles(scene,objects);
 return {cells:available.filter(p=>!obstacles.some(b=>pointInGroundRect(b,p[0]+.5,p[1]+.5))),tightInterior:true};
}
export function completeProject(s,chapter){const p=REGIONS.find(p=>p.chapter===chapter),r=regionalState(s);if(!p||r.projects.includes(chapter)||s.chapter<chapter)return false;r.projects.push(chapter);awardReciprocity(s,chapter,'regional-project:'+chapter,3);s.items[p.item]=(s.items[p.item]||0)+1;grantResonance(s,{sourceId:'regional:project:'+chapter,label:p.name+' · '+p.craft,points:1});return true;}
export function harvestRegion(s,chapter){const r=regionalState(s),day=lifeState(s).day;if(s.chapter<chapter||r.harvests[chapter]===day)return false;r.harvests[chapter]=day;r.materials++;gatherTradeGoods(s,chapter,chapter+':'+day);if(!r.botany.includes(chapter))r.botany.push(chapter);return true;}
export function regionalWorkMenu(w,p){
 const r=regionalState(w.state),work=p.work,phase=regionalWorkView(w.state,p.chapter).phase;
 if(phase===2)return say(w,work.complete+' The '+p.craft+' remains available to its neighbours.');
 const changed=text=>{w.callbacks.onExploration?.({type:'regional-work',scene:w.state.scene,chapter:p.chapter,phase:regionalWorkView(w.state,p.chapter).phase});say(w,text);};
 const actions=[
  [work.prepare,()=>{if(r.work[p.chapter]===1)return say(w,work.prepared+' The work is ready for its next adjustment.');r.work[p.chapter]=1;changed(work.prepared);}],
  [work.finish,()=>{if(r.work[p.chapter]!==1)return say(w,'You test it gently. The loaded or covered part cannot be adjusted safely yet. '+work.observation);if(!completeProject(w.state,p.chapter))return say(w,'The community work is already complete.');r.work[p.chapter]=2;changed(work.complete+'\nThe keeper packs one '+ITEMS.find(i=>i.id===p.item).name+' for the road. Your crew earns 1 growth point each.');}],
  [work.unsafe,()=>say(w,'You try the position without fastening it. It would make the original problem worse, so you leave the working parts intact.')]
 ];
 const offset=p.chapter%actions.length,ordered=[...actions.slice(offset),...actions.slice(0,offset)];
 say(w,p.name+' · '+p.craft+'\n'+(phase===1?work.prepared:work.observation),ordered.concat([['Ask the keeper for a practical hint',()=>say(w,p.lesson+'\nFirst: '+work.prepare+'. Then: '+work.finish+'.')],['Leave the work for now',()=>{}]]));
}
// Unfinished Row's small, furnished room has no space for another full
// bench. Its existing work is a compact floor patching frame, seed pot and
// resting moth. Use only reachable floor with exact clear footprints; never
// borrow a furniture tile or move an authored door, cache or actor.
function compactUnfinishedWork(scene,objects,p){
 if(scene.location!==359||p.chapter!==13)return null;
 const fixed=activityObstacles(scene,objects),chosen=[],positions=[];
 const bounds=xy=>({x:xy[0]+.18,y:xy[1]+.18,w:.64,h:.64});
 const candidates=reachableCells(scene).filter(xy=>!fixed.some(b=>intersectsGroundRect(bounds(xy),b,.035)));
 candidates.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
 for(const kind of ['project','herb','fauna']){
  const xy=candidates.find(xy=>!chosen.some(point=>Math.hypot(point[0]-xy[0],point[1]-xy[1])<1.3));if(!xy)return null;chosen.push(xy);positions.push({type:'life',life:true,regional:true,regionalCompact:true,compactArt:true,lifeKind:kind,label:kind==='project'?p.craft:kind==='herb'?p.plant:p.fauna+' · local wildlife',...(kind==='fauna'?{name:p.fauna}:{}),profile:p,xy:xy.slice()});
 }
 return positions;
}
export function installRegionalLife(w){
 const cache=new Map(),oldObjects=w.objects.bind(w),oldInteract=w.interact.bind(w),oldUpdate=w.townLife.update.bind(w.townLife);
 function records(){
  const scene=w.scene;if(cache.has(scene))return cache.get(scene);
  const p=REGIONS.find(p=>p.scene===scene.location);if(!p)return[];
  const occupied=oldObjects().filter(o=>o.xy),{cells}=regionalPlacementCells(scene,occupied);
  if(cells.length<6){const compact=compactUnfinishedWork(scene,occupied,p);if(compact){cache.set(scene,compact);return compact;}return[];}
  const placer=createActivityPlacer(scene,cells,occupied),places=activityPlaceAnchors(scene,occupied,p.craft),list=[];
  const pick=(role,index,target,{reserve=true,activity=p.craft}={})=>{
   let xy=placer.pick(role,index,{reserve,activity,target});
   if(!xy&&['resident','pet'].includes(role)){xy=nearestActivityPoint(scene,cells,target,{occupied:[...occupied,...list],role});if(xy&&reserve)placer.reserve(xy,role);}
   return xy;
  };
  const work=pick('work',0,places.work);if(!work){const compact=compactUnfinishedWork(scene,occupied,p);if(compact){cache.set(scene,compact);return compact;}return[];}
  list.push({type:'life',life:true,regional:true,lifeKind:'project',label:p.craft,profile:p,xy:work});
  let herb=pick('plant',0,[work[0]-2.5,work[1]+1.4]),fauna=pick('fauna',0,herb?[herb[0]+1.5,herb[1]+1.6]:[work[0]+2.6,work[1]+1.8]);
  const compactKinds=new Set();
  const compactPoint=(kind,target)=>{const fixed=activityObstacles(scene,[...occupied,...list,...(herb?[{type:'life',life:true,lifeKind:'herb',xy:herb}]:[])]),candidate=cells.filter(xy=>!fixed.some(b=>intersectsGroundRect({x:xy[0]+.18,y:xy[1]+.18,w:.64,h:.64},b,.035))).sort((a,b)=>Math.hypot(a[0]-target[0],a[1]-target[1])-Math.hypot(b[0]-target[0],b[1]-target[1])||a[1]-b[1]||a[0]-b[0])[0];if(candidate){compactKinds.add(kind);placer.reserve(candidate,kind==='herb'?'plant':'fauna');return candidate.slice();}return null;};
  if(!herb)herb=compactPoint('herb',[work[0]-2,work[1]]);
  if(!fauna)fauna=compactPoint('fauna',[work[0]+2,work[1]]);
  if(herb)list.push({type:'life',life:true,regional:true,lifeKind:'herb',label:p.plant,profile:p,xy:herb,...(compactKinds.has('herb')?{regionalCompact:true,compactArt:true}:{})});
  if(fauna)list.push({type:'life',life:true,regional:true,lifeKind:'fauna',label:p.fauna+' · local wildlife',name:p.fauna,profile:p,xy:fauna,...(compactKinds.has('fauna')?{regionalCompact:true,compactArt:true}:{})});
  if(!HOUSEHOLDS.some(f=>f.chapter===p.chapter))for(const [i,person]of p.people.entries()){
   const side=i%2?-1:1,home=pick('resident',i,[places.home[0]+side*1.2,places.home[1]],{reserve:false,activity:person.role}),job=pick('resident',i,[work[0]+side*2.1,work[1]+.8],{reserve:false,activity:person.role});
   if(!home||!job)continue;
   const working=['Morning','Afternoon'].includes(dayPeriod(lifeState(w.state).minutes).name),xy=pick('resident',i,working?job:home,{activity:person.role});if(!xy)continue;
   list.push({type:'npc',life:true,regional:true,lifeKind:'resident',profile:p,name:person.name,label:person.name+' · '+person.role,sprite:(p.chapter+i)%7,xy,anchors:[home,job],path:[],period:'',activitySites:{home:places.features.home,work:work.slice(),common:work.slice()}});
  }
  cache.set(scene,list);return list;
 }

w.objects=()=>[...oldObjects(),...records()];w.townLife.update=dt=>{oldUpdate(dt);const phase=dayPeriod(lifeState(w.state).minutes);for(const o of records()){if(o.lifeKind!=='resident')continue;if(o.period!==phase.name){o.period=phase.name;const working=['Morning','Afternoon'].includes(phase.name);o.activity=residentActivity(o,phase);o.path=npcRoute(w.scene,o,o.anchors[working?1:0],w.objects());}advanceResident(w,o,dt,w.objects(),.55);}};
w.interact=o=>{if(!o?.regional)return oldInteract(o);if(w.state.mode!=='field')return;const s=w.state,p=o.profile,r=regionalState(s),day=lifeState(s).day;if(o.lifeKind!=='resident')o.path=[];
if(o.lifeKind==='herb')return say(w,p.plant+'\n'+p.custom+' The keepers take a small cutting and leave the roots.',[[r.botany.includes(p.chapter)?'Gather a modest cutting':'Study and gather a cutting',()=>{if(!harvestRegion(s,p.chapter))return say(w,'You have taken enough here today. The new shoots stay where they belong.');say(w,'You record '+p.plant+' and pack one botanical bundle. Bundles can be exchanged at any regional workbench.');}],['Leave it growing',()=>{}]]);
if(o.lifeKind==='fauna'){const phase=dayPeriod(lifeState(s).minutes).name,night=phase==='Night';const text={sparrow:night?'The sparrow has tucked itself beneath a warm eave.':'A sparrow steals a thread, rejects it, then steals the same thread with renewed confidence.',duck:night?'The duck sleeps with its bill beneath a wing.':'The duck tests every puddle as if it might contain a larger duck.',hen:night?'The hen has gone to roost. She considers the working day concluded.':'The hen scratches a neat semicircle, then stands in it like a proud architect.',moth:night?'A moth circles the pale edge of the lantern, never quite touching it.':'A moth rests on the cool side of a post. Its folded wings look like a tiny roof.',goat:night?'The goat sleeps beside the packed supplies, guarding them mostly from itself.':'The goat examines a strap with the solemn attention usually reserved for lunch.',firefly:night?'Fireflies answer in separate pulses. The dark between them is part of the pattern.':'The fireflies rest among the leaves. Their light belongs to evening.'}[p.fauna];return say(w,text,[['Watch without disturbing',()=>{if(r.studies['wild:'+p.chapter])return say(w,'You know this rhythm now. It is pleasant to watch without needing to take anything.');r.studies['wild:'+p.chapter]=true;for(const id of s.party)s.heroes[id].strain=Math.max(0,(s.heroes[id].strain||0)-12);say(w,'You slow your breathing to the small movements. The travelling crew releases up to 12 strain. This observation is saved in your field notes.');}],['Move on quietly',()=>{}]]);}
const openWorkbench=()=>say(w,p.name+' · '+p.craft+' · '+r.materials+' botanical bundles\nA piece of community work stands ready for inspection.',[['Common exchange · trade and community',()=>w.callbacks.onEconomy?.(o)],[r.projects.includes(p.chapter)?'Inspect the finished community work':'Help with the repair',()=>{if(r.projects.includes(p.chapter))return say(w,'The '+p.craft+' is still in use. “Good work survives its applause,” someone says.');return regionalWorkMenu(w,p);}],['Exchange a botanical bundle for supplies',()=>{if(r.materials<1)return say(w,'“Bring one modest cutting from a regional plant bed. No coin, and no hurry.”');r.materials--;s.items[p.item]=(s.items[p.item]||0)+1;say(w,'One botanical bundle becomes one '+ITEMS.find(i=>i.id===p.item).name+'. The rest is put aside for neighbours.');}],['Practice an owned core pattern',()=>{if(r.studies['core:'+p.chapter])return say(w,'You have practised this local pattern already. Its AP stays with the character who learned it.');if(!s.cores.length)return say(w,'“Come back when you carry a core. Watching is welcome; nobody needs to borrow a power they have not found.”');say(w,'Choose who will practise. This local study grants 8 AP to one owned core, once.',s.recruited.map(id=>[s.heroes[id].name,()=>say(w,'Choose an owned core to study.',s.cores.map(core=>[core,()=>{if(r.studies['core:'+p.chapter])return say(w,'This lesson has already been recorded.');r.studies['core:'+p.chapter]={hero:id,core};const h=s.heroes[id];h.ap[core]=(h.ap[core]||0)+8;say(w,h.name+' gains 8 '+core+' AP. Equip the core in Crystal craft to use its developing rank.');}]))]));}],['Sit for a field meal',()=>{if(r.studies['meal:'+p.chapter]===day)return say(w,'“The pot needs to last the day. Stay and talk, though.”');r.studies['meal:'+p.chapter]=day;for(const id of s.party){const h=s.heroes[id];if(h.hp>0){h.hp=Math.min(h.maxHp,h.hp+Math.ceil(h.maxHp*.15));h.strain=Math.max(0,(h.strain||0)-15);}}say(w,'A shared meal restores 15% health to living travelling companions and removes up to 15 strain. Tomorrow there will be another pot.');}],['Read the field notebook',()=>{const pages=['Field notebook · '+r.botany.length+'/24 plants · '+r.projects.length+'/24 community projects'];for(const region of REGIONS.filter(v=>r.botany.includes(v.chapter)||r.projects.includes(v.chapter)||r.studies['wild:'+v.chapter]))pages.push(region.name+'\n'+(r.botany.includes(region.chapter)?'Botany: '+region.plant+'. ':'')+(r.projects.includes(region.chapter)?'Community work: '+region.craft+' repaired. ':'')+(r.studies['wild:'+region.chapter]?'Observed '+region.fauna+'. ':'')+'\n'+region.custom);say(w,pages);}],['Leave the workbench',()=>{}]]);
if(o.lifeKind==='project')return openWorkbench();say(w,o.name+' · '+o.activity+'\n“'+p.custom+'”',[['Ask about their work',()=>say(w,o.name+': “We keep the '+p.craft+' working. A grand victory is wonderful. It still leaves someone needing a dry pair of socks.”')],['Join the local work',openWorkbench],['Ask what is changing',()=>say(w,o.name+': “'+(economicComment(s,p.chapter)||'')+' '+(s.bosses.includes(p.chapter)||s.complete?'People have begun deciding things together. It is slower than orders. I prefer it.':'We still do the ordinary jobs. If we stop, the people on the road have nowhere to come back to.')+'”')],['Wish them well',()=>{}]]);};return {records};}
