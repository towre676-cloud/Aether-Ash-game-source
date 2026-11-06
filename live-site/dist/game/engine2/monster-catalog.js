import {BESTIARY,FRONTIER_BESTIARY,SPECIES,FRONTIER_SPECIES} from './repertoire.js?v=5.38';

/** Forty-eight delivered creature silhouettes, with local adaptations that change
 * combat behavior as well as palette. Legacy IDs remain valid for older saves. */
export const MONSTER_HABITATS=Object.freeze({
 meadow:'Commons outskirts and grassy roads',woodland:'Woodland and gardens',
 wetland:'Rivers, marshes and flooded paths',foundry:'Kilns, foundries and railworks',
 cavern:'Caves and crystal tunnels',frostland:'Glaciers and cold country',
 highland:'High paths and storm peaks',ruins:'Old stone and abandoned shrines',
 cellar:'Cellars and storerooms',workshop:'Workshop service areas',
 archive:'Archive stacks and disused records rooms',sewer:'Cisterns and drainage works'
});
const ALIASES={river:'wetland',rail:'foundry',storm:'highland',village:'meadow',garden:'woodland',cave:'cavern',ice:'frostland',indoor:'cellar'};
const ROLES=['predator','guard','mender','scout'];
const COLORS={earth:'#d6ae78',tide:'#70d3dd',flame:'#ed9a63',frost:'#b2e8f3',volt:'#e9d27a',shade:'#bfabe4',gale:'#b0dcca',ward:'#e8dca8',mend:'#a3d8a4',gravity:'#c5a8db'};
const PROFILES={
 predator:{hp:.88,power:1.13,speed:1.05,armor:0},
 guard:{hp:1.22,power:.86,speed:.82,armor:1.6},
 mender:{hp:.92,power:.87,speed:.95,armor:.18},
 scout:{hp:.78,power:.9,speed:1.2,armor:0}
};
const ADAPTATIONS=[
 {id:'reedcurrent',prefix:'Reedcurrent',element:'tide',status:'wet',trait:'siphon',shape:'line',hue:130,hp:1.04,power:.94,speed:1.03,habitats:['wetland','sewer','cellar'],drops:['tideFlask','dewVial','mossWrap'],verb:'Undertow',detail:'A water-fed crest stores a current. Its strike wets targets and drains a little focus.'},
 {id:'cinderhide',prefix:'Cinderhide',element:'flame',status:'burn',trait:'pressure',shape:'burst',hue:335,hp:1.12,power:1.06,speed:.9,habitats:['foundry','workshop','cellar'],drops:['coolingPaste','emberBomb','tonic'],verb:'Cinder ring',detail:'Heat has thickened its hide. Below half health, its burning attacks become stronger.'},
 {id:'rimeveil',prefix:'Rimeveil',element:'frost',status:'slow',trait:'molt',shape:'burst',hue:175,hp:1.06,power:.92,speed:.95,habitats:['frostland','cavern','cellar'],drops:['frostShard','clearSalt','ether'],verb:'Rime fan',detail:'A brittle outer growth chills nearby movement. Once wounded, it sheds conditions and gains a brief shield.'},
 {id:'stormcrest',prefix:'Stormcrest',element:'volt',status:'shock',trait:'tempo',shape:'line',hue:255,hp:.86,power:1.02,speed:1.14,habitats:['highland','foundry','workshop','meadow'],drops:['shockInsulator','thunderPin','clockOil'],verb:'Lightning thread',detail:'Conductive growths gather charge. Its shocking attack leaves the creature briefly hastened.'},
 {id:'inkshroud',prefix:'Inkshroud',element:'shade',status:'exposed',trait:'erase',shape:'line',hue:220,hp:.9,power:1.08,speed:1.06,habitats:['archive','ruins','cavern'],drops:['duskInk','echoSponge','focusTea'],verb:'Ink-cut',detail:'Dark pigment masks its approach. Its exposing strike erases a prepared counter and wears down shields.'},
 {id:'bloomward',prefix:'Bloomward',element:'earth',status:'slow',trait:'chorus',shape:'burst',hue:70,hp:1.17,power:.86,speed:.94,habitats:['woodland','meadow','ruins','archive'],drops:['mossWrap','leechSeed','greenPoultice'],verb:'Root chorus',detail:'Living grafts bind it to neighboring creatures. Every third turn it hastens the whole formation.'}
];
function sourceHabitats(s){
 const text=(s.id+' '+s.habitat).toLowerCase(),keys=[];
 if(/garden|wood|forest|orchard|root|bramble|spore|mushroom|blossom|waxstag|candlebranch/.test(text))keys.push('woodland','meadow');
 if(/river|water|well|rain|flood|reef|coral|shoal|mangrove|otter|jelly|nautilus|serpent/.test(text))keys.push('wetland','sewer');
 if(/kiln|boiler|foundry|reactor|copper|brass|rail|caldera|ember|clock/.test(text))keys.push('foundry','workshop');
 if(/archive|folio|paper|ink|memory/.test(text))keys.push('archive');
 if(/cave|cavern|crystal|deep|spider|bat/.test(text))keys.push('cavern','cellar');
 if(/snow|frost|glacier|aurora|ice|cold/.test(text))keys.push('frostland');
 if(/sky|storm|mountain|peak|cloud|ram|griffin|manta/.test(text))keys.push('highland');
 if(/chapel|ruin|waste|marble|gargoyle|sphinx|lantern/.test(text))keys.push('ruins');
 if(/kitchen|teapot|mole|hog|scarab|armadillo|snail/.test(text))keys.push('cellar','meadow');
 return [...new Set(keys.length?keys:['meadow','ruins'])];
}
const baseSpecies=[...SPECIES,...FRONTIER_SPECIES];
const baseIds=new Set(baseSpecies.map(s=>s.id));
const legacy=[...BESTIARY,...FRONTIER_BESTIARY].map(s=>Object.freeze({...s,family:s.id.replace(/-elder$|-region-\d$/g,''),adaptation:s.elder?'elder':s.ecotype?'regional':'native',habitatKeys:Object.freeze(sourceHabitats(s)),chapter:Math.max(1,s.chapter||1),profile:Object.freeze({...PROFILES[s.role]}),color:COLORS[s.element]||'#d6ae78'}));
const adapted=baseSpecies.flatMap((base,familyIndex)=>ADAPTATIONS.map((a,index)=>{
 const role=ROLES[(familyIndex+index)%ROLES.length],profile=PROFILES[role],baseKeys=sourceHabitats(base);
 // Every adaptation has eight starter families; further families arrive through
 // the early and middle journey, rather than waiting for the final chapter.
 const chapter=familyIndex<8?1:Math.min(12,2+Math.floor((familyIndex-8)/5));
 const shape=role==='predator'&&index%2===1?'line':role==='guard'&&index%2===0?'burst':a.shape;
 const move=a.verb+' · '+base.move;
 return Object.freeze({...base,id:base.id+'-'+a.id,family:base.id,adaptation:a.id,name:a.prefix+' '+base.name,
  chapter,role,element:a.element,status:a.status,trait:a.trait,shape,move,hue:a.hue,elder:false,ecotype:true,
  habitatKeys:Object.freeze([...new Set([...a.habitats,...baseKeys])]),
  habitat:a.habitats.map(k=>MONSTER_HABITATS[k]).join(' / '),
  profile:Object.freeze({hp:profile.hp*a.hp,power:profile.power*a.power,speed:profile.speed*a.speed,armor:profile.armor}),
  drop:a.drops[familyIndex%a.drops.length],color:COLORS[a.element],
  tell:move+': '+(shape==='line'?'step sideways from the marked line.':'leave the marked circle.'),
  lore:a.detail+' '+(base.lore||'This local adaptation retains the recognizable silhouette of its native family.')
 });
}));
export const MONSTER_CATALOG=Object.freeze([...legacy,...adapted]);
const byId=new Map(MONSTER_CATALOG.map(s=>[s.id,s]));
export const MONSTER_SILHOUETTES=baseIds.size;

/** Unknown terrain gets a real meadow pool, never an empty encounter. All
 * selected records meet the current tier, including the first step of origins. */
export function monsterPool(habitat,{chapter=1}={}){
 const key=ALIASES[habitat]||habitat,known=Object.hasOwn(MONSTER_HABITATS,key)?key:'meadow',tier=Math.max(1,Number(chapter)||1);
 return MONSTER_CATALOG.filter(s=>s.chapter<=tier&&s.habitatKeys.includes(known));
}
export function monsterById(id){return byId.get(id)||null;}

/** Keep the battle actor ID, positions and mutable condition map. Stat profiles
 * are applied to the encounter builder's tier/party budget, not save levels. */
export function decorateWildEnemy(base,speciesId,{chapter=1,scale=1}={}){
 const s=byId.get(speciesId);if(!s||base.boss)return base;
 const p=s.profile,budget=Math.max(.05,Math.min(10,Number(scale)||1)),tier=Math.max(1,Number(chapter)||1);
 const maxHp=Math.max(1,Math.round((base.maxHp||base.hp||58)*p.hp*budget)),power=Math.max(1,Math.round((base.power||15)*p.power*budget));
 const maxArmor=Math.max(0,Math.round((8+tier*2.2)*p.armor*budget));
 return {...base,species:s.id,family:s.family,adaptation:s.adaptation,name:s.name,atlas:s.atlas,sprite:s.sprite,
  role:s.role,trait:s.trait,element:s.element,drop:s.drop,move:s.move,moveShape:s.shape,moveStatus:s.status,
  habitat:s.habitat,hue:s.hue||0,elder:!!s.elder,color:s.color,hp:maxHp,maxHp,power,
  speed:Math.max(.25,(base.speed||.8)*p.speed),armor:maxArmor,maxArmor};
}
