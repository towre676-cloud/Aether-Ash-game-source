import test from 'node:test';
import assert from 'node:assert/strict';
import {encounterPreview,affordancePreview,FIELD_PREVIEW_LIMITS} from '../encounter-preview.js?v=5.24.0';
import {defaultHero} from '../mako.js';
import {makeEnemy} from '../battle.js';
import {shellFor} from '../environment-shells.js';
import {World} from '../world.js';
import {source} from './opening-flow.mjs';
import {WORLD_AFFORDANCE_PROFILES,worldAffordanceObjects,applyWorldAffordance} from '../world-affordances.js?v=5.24.0';
import {buildWildEnemies} from '../wild-combat.js';
import {objectiveEncounterContext} from '../objective-context.js';
import {ORIGINS} from '../origin-content.js';
import {PATROL_FORMATIONS,patrolFormationEnemies} from '../patrol-formations.js';

const clone=value=>JSON.parse(JSON.stringify(value));
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const item of Object.values(value))freeze(item);}return value;}
function fixture(cores=['earth'],items={}){
 const hero=defaultHero(0);hero.learned=0;hero.loadout=cores.map(core=>({core,support:'focus'}));
 return {state:{scene:7,chapter:1,mode:'field',party:[0],heroes:[hero],items,gold:0,xp:0,bosses:[]},scene:{location:7},mission:{id:1,xp:140,gold:50,enemy_name:'Sentinel'},data:{},objects(){throw Error('A preview must not initialize generated content');}};
}
const wild=(more={})=>({type:'wild',tier:1,count:2,serial:1,seed:47,habitat:'meadow',...more});
const enemy=(role='predator',more={})=>({...makeEnemy(role,1),...more});
const site=(profileId='ground-loop',more={})=>({type:'affordance',affordanceKind:'site',affordanceId:'aff-7-site',profileId,label:'Inspection channel',art:'relay',...more});
const stock=(more={})=>site('ground-loop',{affordanceKind:'salvage',affordanceId:'aff-7-salvage-0',label:'Grounding coil · loose repair stock',toolType:'coil',art:'coil',...more});
const scout=()=>site('ground-loop',{affordanceKind:'scout',affordanceId:'aff-7-scout',label:'Listening point',art:'hydrophone'});
function kit(world,values={}){world.state.worldAffordances={version:1,kit:values,sources:[],sites:{},knowledge:[],plans:{},records:[]};return world.state.worldAffordances;}
let formationWorld;
function localFormation(id,cores=['earth'],items={}){
 formationWorld??=new World(source);const p=PATROL_FORMATIONS.find(p=>p.id===id),w=fixture(cores,items);formationWorld.state.scene=p.location;formationWorld.state.chapter=p.chapter;
 w.scene=formationWorld.scene;w.mission=formationWorld.mission;w.state.scene=p.location;w.state.chapter=p.chapter;
 const o=w.scene.objects.find(o=>o.type==='patrol'&&o.bit===p.bit),enemies=patrolFormationEnemies(w.scene,o,p.chapter);return {w,o,enemies};
}

test('placement tokens never become invented enemy identities or material coats',()=>{
 const w=fixture(),o={type:'patrol',enemies:[['wyrm',[8,8]]],bit:1};
 const tip=encounterPreview(w,o);assert.match(tip.text,/not been revealed/);assert.doesNotMatch(tip.text,/wyrm|clay|reed|Tide|Break/i);assert.match(tip.rewardHint,/65 XP · 20 credits/);
 assert.equal(encounterPreview(w,{type:'cache'}),null);assert.equal(affordancePreview(w,{type:'cache'}),null);
});

test('an actual visible coat receives an equipped, affordable material answer',()=>{
 const w=fixture(['tide']),e=enemy('predator',{shell:shellFor('ash'),name:'Ash carrier'});
 let tip=encounterPreview(w,wild(),{enemies:[e]});assert.match(tip.text,/ash coat/);assert.match(tip.text,/Tide Lance washes away/);
 w.state.heroes[0].mp=0;tip=encounterPreview(w,wild(),{enemies:[e]});assert.doesNotMatch(tip.text,/Tide Lance/);assert.match(tip.text,/ordinary strikes|Guard/);
});

test('unrevealed coats are not predicted even when species and stock are known',()=>{
 const w=fixture(['tide']),e=enemy('predator',{name:'Clay Prowler',species:'clay-prowler'}),tip=encounterPreview(w,wild({drops:['tideFlask']}),{enemies:[e]});
 assert.match(tip.text,/Clay Prowler/);assert.doesNotMatch(tip.text,/clay coat|soaks|Tide Lance/);assert.doesNotMatch(tip.rewardHint,/flask|drop/i);
});

test('reserve, fallen, unaffordable and stale Link techniques cannot become the promised counter',()=>{
 const w=fixture([]),reserve=defaultHero(1);reserve.loadout=[{core:'tide',support:'focus'}];w.state.heroes.push(reserve);w.state.cores=['tide'];
 const e=enemy('predator',{shell:shellFor('ash')});assert.doesNotMatch(encounterPreview(w,wild(),{enemies:[e]}).text,/Tide Lance/);
 w.state.party.push(1);reserve.hp=0;assert.doesNotMatch(encounterPreview(w,wild(),{enemies:[e]}).text,/Tide Lance/);
 reserve.hp=50;reserve.atb=1;w.state.heroes[0].atb=1;reserve.loadout=[{core:'tide',support:'link'}];assert.doesNotMatch(encounterPreview(w,wild(),{enemies:[e]}).text,/Tide|Tidal/);
 reserve.loadout=[{core:'tide',support:'focus'}];reserve.strain=99;assert.doesNotMatch(encounterPreview(w,wild(),{enemies:[e]}).text,/Tide Lance/);
});

test('finite supply answers disappear when the carried item is spent',()=>{
 const w=fixture([],{tideFlask:1}),e=enemy('predator',{shell:shellFor('ash')});assert.match(encounterPreview(w,wild(),{enemies:[e]}).text,/Tide flask washes away/);
 w.state.items.tideFlask=0;assert.doesNotMatch(encounterPreview(w,wild(),{enemies:[e]}).text,/Tide flask/);
});

test('alarm and armor advice only name interrupts the active crew can pay for',()=>{
 const w=fixture(['earth']),e=enemy('scout');assert.match(encounterPreview(w,wild(),{enemies:[e]}).text,/focus ready attacks/);
 w.state.heroes[0].loadout=[{core:'earth',support:'break'}];assert.match(encounterPreview(w,wild(),{enemies:[e]}).text,/Fault Rupture can interrupt when ready/);
 w.state.heroes[0].mp=0;assert.doesNotMatch(encounterPreview(w,wild(),{enemies:[e]}).text,/Rupture/);
});

test('an ordinary healthy mender formation previews its early strike before the alarm caller',()=>{
 const w=fixture(['earth']),caller=enemy('scout'),mender=enemy('mender',{id:'e1'}),o={type:'patrol',bit:1};
 const tip=encounterPreview(w,o,{enemies:[caller,mender]});assert.match(tip.text,/Porcelain Mender opens with a marked strike/);assert.match(tip.text,/Defeat that striker before release, move clear.*Guard/);assert.match(tip.text,/Alarmwing is the alarm caller/);
 assert.ok(tip.text.indexOf('Porcelain Mender')<tip.text.indexOf('Alarmwing'));assert.doesNotMatch(tip.text,/Rupture|Break/);
 const before=JSON.stringify([w,caller,mender,o]);encounterPreview(w,o,{enemies:[caller,mender]});assert.equal(JSON.stringify([w,caller,mender,o]),before);
});

test('the new opening preview excludes wounded, special, wild and objective-led formations',()=>{
 const w=fixture([]),mender=enemy('mender'),caller=enemy('scout',{id:'e1'});
 for(const o of [wild(),{type:'patrol',originHero:0},{type:'patrol',frontierId:'foundry'},{type:'patrol',originId:'rook-regulator'},{type:'patrol',rivalId:'friend'}])assert.doesNotMatch(encounterPreview(w,o,{enemies:[caller,mender]}).text,/opens with a marked strike/);
 assert.doesNotMatch(encounterPreview(w,{type:'patrol'},{enemies:[caller,mender],objective:{kind:'signal',label:'Relay'}}).text,/opens with a marked strike/);
 mender.hp=20;assert.doesNotMatch(encounterPreview(w,{type:'patrol'},{enemies:[caller,mender]}).text,/opens with a marked strike/);
});

test('a revealed local guard pair explains interception and an actually affordable direct Mako',()=>{
 const {w,o,enemies}=localFormation('workshop-aisle'),before=JSON.stringify([w.state,o,enemies]),tip=encounterPreview(w,o,{enemies});
 assert.match(tip.text,/Night Raptor.*first mark/);assert.match(tip.text,/Iron Antler can intercept ordinary strikes for a nearby partner/);assert.match(tip.text,/Fault Lance can target Night Raptor directly/);assert.match(tip.text,/Move clear.*Guard/);
 assert.equal(JSON.stringify([w.state,o,enemies]),before);enemies[0].armor=0;assert.doesNotMatch(encounterPreview(w,o,{enemies}).text,/can intercept/);
});

test('a local guard brief keeps useful physical choices when Mako is unavailable',()=>{
 const {w,o,enemies}=localFormation('workshop-aisle');w.state.heroes[0].mp=0;let tip=encounterPreview(w,o,{enemies});assert.doesNotMatch(tip.text,/Fault Lance|can target.*directly/);assert.match(tip.text,/Focus ready attacks on the guard, or draw its partner away/);
 w.state.heroes[0].loadout=[];const reserve=defaultHero(1);reserve.loadout=[{core:'earth',support:'focus'}];w.state.heroes.push(reserve);tip=encounterPreview(w,o,{enemies});assert.doesNotMatch(tip.text,/Fault Lance|can target.*directly/);
});

test('Refuge names its guarded mender without promising an opening strike from a wounded formation',()=>{
 const {w,o,enemies}=localFormation('refuge-stores');let tip=encounterPreview(w,o,{enemies});assert.match(tip.text,/Porcelain Mender.*first mark/);assert.match(tip.text,/repair wounded allies/);assert.match(tip.text,/Clockwork Mole can intercept/);assert.match(tip.text,/can target Porcelain Mender directly/);
 enemies[1].hp=20;tip=encounterPreview(w,o,{enemies});assert.match(tip.text,/Porcelain Mender can repair wounded allies/);assert.doesNotMatch(tip.text,/first mark/);
});

test('Passages presents the striker-versus-caller choice and only a carried or affordable interrupt',()=>{
 const {w,o,enemies}=localFormation('passage-watch',[],{shatterCharge:1});let tip=encounterPreview(w,o,{enemies});assert.match(tip.text,/Reedwheel Serpent threatens a marked lane/);assert.match(tip.text,/Glassbell Jelly can call reinforcements/);assert.match(tip.text,/Defeat the striker.*or focus the caller/);assert.match(tip.text,/Shatter charge can interrupt the call when ready/);
 w.state.items.shatterCharge=0;tip=encounterPreview(w,o,{enemies});assert.doesNotMatch(tip.text,/Shatter charge/);assert.match(tip.text,/Guard reduces damage/);
});

test('local formation advice requires the revealed matching roster and stays within field-card bounds',()=>{
 const {w,o,enemies}=localFormation('workshop-aisle');const anonymous=enemies.map(e=>{const c=clone(e);delete c.patrolFormation;return c;});assert.doesNotMatch(encounterPreview(w,o,{enemies:anonymous}).text,/can target Night Raptor directly/);assert.match(encounterPreview(w,o).text,/not been revealed/);
 for(const e of enemies)e.name='N'.repeat(1000);w.state.heroes[0].name='H'.repeat(1000);const tip=encounterPreview(w,o,{enemies});assert.ok(tip.text.length<=FIELD_PREVIEW_LIMITS.text);assert.ok(tip.title.length<=FIELD_PREVIEW_LIMITS.title);
});

test('actual goal metadata offers its real action without predicting creature loot',()=>{
 const w=fixture([]),e=enemy(),goal={kind:'supply',label:'Secure the scattered stores',asset:{name:'Field medicine stores'}};
 const tip=encounterPreview(w,wild(),{enemies:[e],objective:goal});assert.equal(tip.title,goal.label);assert.match(tip.text,/Goal → Secure a supply bundle/);assert.match(tip.rewardHint,/56 base XP · 22 base credits/);assert.match(tip.rewardHint,/without defeating every creature/);assert.doesNotMatch(tip.rewardHint,/guaranteed|Tonic|Ether|drops/i);
});

test('authored guardian fallback uses real opening geometry without granting unavailable Break',()=>{
 const w=fixture([]),tip=encounterPreview(w,{type:'boss',enemies:[['unknown',[8,8]]]});
 assert.equal(tip.title,'Sentinel');assert.match(tip.text,/Relay lance/);assert.match(tip.text,/Step sideways/);assert.doesNotMatch(tip.text,/Break|clay|Tide/);assert.match(tip.rewardHint,/140 XP · 50 credits/);
 w.state.bosses=[1];assert.match(encounterPreview(w,{type:'boss'}).rewardHint,/already been claimed/);
 w.mission={id:99,enemy_name:'Unknown'};assert.match(encounterPreview(w,{type:'boss'}).text,/not been revealed/);assert.doesNotMatch(encounterPreview(w,{type:'boss'}).text,/Relay lance/);
});

test('special authored variants avoid standard XP, species and milestone promises',()=>{
 const w=fixture([]);
 for(const extra of [{originId:'rook-regulator'},{originHero:0},{frontierId:'foundry'},{rivalId:'ash-friend'}]){
  const tip=encounterPreview(w,{type:'patrol',...extra,enemies:[['wyrm',[1,1]]]});assert.match(tip.text,/not been revealed/);assert.doesNotMatch(tip.rewardHint,/\d+ XP|credits|guardian/);
 }
});

test('preview base rewards agree with actual settled World wins and respect wild tier',()=>{
 for(const [type,tier,count]of [['wild',1,1],['wild',3,2],['patrol',1,2],['practice',1,1]]){
  const w=new World(source);w.state.mode='field';const o=type==='wild'?wild({tier,count}):{type,bit:40,enemies:[],gold:type==='patrol'?73:0};
  const m={...w.mission,id:tier},before={xp:w.state.xp,gold:w.state.gold},tip=encounterPreview(w,o,{mission:m});
  w.currentBattle={scene:w.scene.location,object:o,mission:m};w.state.mode='battle';w.winBattle();
  assert.ok(tip.rewardHint.includes(String(w.state.xp-before.xp)),type+' XP');if(type!=='practice')assert.ok(tip.rewardHint.includes(String(w.state.gold-before.gold)),type+' credits');
 }
});

test('all seven actual opening packs can be previewed without changing state, floor, pack or objective',()=>{
 for(const origin of ORIGINS){
  const w=new World(source);w.newGame({originId:origin.id});w.state.mode='field';const o=wild({count:1}),enemies=buildWildEnemies(w,o),objective=objectiveEncounterContext(w,o).objective;
  const before=JSON.stringify({state:w.state,scene:w.scene,o,enemies,objective});
  const tip=encounterPreview(w,o,{enemies,objective});assert.ok(tip.title&&tip.text&&tip.rewardHint,origin.id);
  assert.equal(JSON.stringify({state:w.state,scene:w.scene,o,enemies,objective}),before,origin.id);
 }
});

test('frozen preview inputs do not initialize ledgers, generate encounters or consume random numbers',()=>{
 const w=fixture(['tide']),e=enemy('predator',{shell:shellFor('ash')}),o=wild(),a=stock();freeze(w);freeze(e);freeze(o);freeze(a);
 const random=Math.random;Math.random=()=>{throw Error('preview rolled RNG');};try{assert.ok(encounterPreview(w,o,{enemies:[e]}));assert.ok(affordancePreview(w,a));}finally{Math.random=random;}
 assert.equal(w.state.worldAffordances,undefined);
});

test('loose repair stock says what it is for and recognizes an already carried partner',()=>{
 const w=fixture(),tip=affordancePreview(w,stock());assert.match(tip.text,/Take one Grounding coil/);assert.match(tip.text,/Salvage hook/);assert.match(tip.rewardHint,/no credit cost/);
 kit(w,{hook:1});assert.match(affordancePreview(w,stock()).rewardHint,/already carry/);
 w.state.worldAffordances.kit.coil=30;assert.match(affordancePreview(w,stock()).text,/holds 30/);
 w.state.worldAffordances.sources.push('aff-7-salvage-0');assert.match(affordancePreview(w,stock()).rewardHint,/No second pickup/);
});

test('repair advice chooses available recipes, a fitting alternate or an item-free learned rhythm',()=>{
 const w=fixture();let tip=affordancePreview(w,site());assert.match(tip.text,/Listen to learn/);assert.match(tip.rewardHint,/\+8 credits \+1 Ether/);
 const l=kit(w,{coil:1,hook:1});assert.match(affordancePreview(w,site()).text,/combine Grounding coil \+ Salvage hook/);
 l.kit={bell:1};assert.match(affordancePreview(w,site()).text,/Signal bell you carry/);
 l.kit={};l.knowledge=['ground-loop'];assert.match(affordancePreview(w,site()).text,/middle → high → middle/);
 l.sites['aff-7-site']={solved:true};assert.match(affordancePreview(w,site()).rewardHint,/already been claimed/);assert.doesNotMatch(affordancePreview(w,site()).rewardHint,/\+8/);
});

test('domestic repairs retain local floorboard language and do not invent an outdoor crossing',()=>{
 const w=fixture(),o=site('burrow-trail',{label:'Underfloor maintenance patch',art:'floorboard'}),tip=affordancePreview(w,o);
 assert.equal(tip.title,o.label);assert.match(tip.rewardHint,/floor patch/);assert.doesNotMatch(JSON.stringify(tip),/causeway|rootwalk|shortcut/i);assert.match(tip.rewardHint,/Tonic/);
});

test('scouting names the free quiet choice and preserves prepared and spent save states',()=>{
 const w=fixture(),o=scout();let tip=affordancePreview(w,o);assert.match(tip.text,/Listen here/);assert.match(tip.text,/costs no tools/);assert.doesNotMatch(tip.rewardHint,/exact enemy|guaranteed|all battles/i);
 const l=kit(w,{});l.sites[o.affordanceId]={scouted:true};assert.doesNotMatch(affordancePreview(w,o).text,/Listen here/);
 l.plans['7']={plan:'quiet',spent:false};assert.match(affordancePreview(w,o).text,/quiet approach is ready/);
 l.plans['7'].spent=true;assert.match(affordancePreview(w,o).text,/already been used/);
 const before=JSON.stringify(w.state);affordancePreview(w,o);assert.equal(JSON.stringify(w.state),before);
});

test('all twelve repair previews agree with actual canonical first rewards and never promise a repeat',()=>{
 for(const p of WORLD_AFFORDANCE_PROFILES){
  const width=22,height=20,scene={location:7,width,height,arrive:[2,2],chapter:1,key:'workshop',encounterHabitat:p.habitat,objects:[],floor:Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>x&&y&&x<width-1&&y<height-1?'.':'#').join(''))};
  const w={scene,state:{scene:7,chapter:1,mode:'field',x:2.5,y:2.5,party:[0],items:{},gold:0,flags:{}}};const o=worldAffordanceObjects(w).find(o=>o.affordanceKind==='site');assert.ok(o,p.id);
  const actual=WORLD_AFFORDANCE_PROFILES.find(p=>p.id===o.profileId);for(const tool of actual.primary)w.state.worldAffordances.kit[tool]=1;
  const before=JSON.stringify({state:w.state,scene:w.scene}),tip=affordancePreview(w,o);assert.equal(JSON.stringify({state:w.state,scene:w.scene}),before);
  w.state.x=o.xy[0]+.5;w.state.y=o.xy[1]+1.5;const out=applyWorldAffordance(w,o,{action:'assemble'});assert.equal(out.ok,true,p.id);
  assert.match(tip.rewardHint,/\+8 credits/);assert.ok(tip.rewardHint.includes(out.reward.item==='ether'?'Ether':'Tonic'));assert.equal(w.state.gold,8);
  assert.match(affordancePreview(w,o).rewardHint,/already been claimed/);
 }
});

test('field cards remain bounded with long authored names and an unavailable crew',()=>{
 const w=fixture(['tide','frost']),e=enemy('predator',{name:'A'.repeat(1000),shell:shellFor('clay')});w.state.heroes[0].name='B'.repeat(1000);
 for(const tip of [encounterPreview(w,wild({label:'C'.repeat(1000)}),{enemies:[e]}),affordancePreview(w,stock({label:'D'.repeat(1000)}))])for(const key of Object.keys(FIELD_PREVIEW_LIMITS))assert.ok(tip[key].length<=FIELD_PREVIEW_LIMITS[key],key);
 w.state.heroes[0].hp=0;assert.match(encounterPreview(w,wild(),{enemies:[e]}).text,/needs recovery/);assert.doesNotMatch(encounterPreview(w,wild(),{enemies:[e]}).text,/Lance/);
});
