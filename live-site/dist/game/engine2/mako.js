import {withDoctrines} from './constellation-model.js';
import {RARE_MAKO,isMakoAttuned} from './wayglass-model.js?v=5.11.0';
import {signatureMetadata} from './personal-signatures.js?v=5.16.0';
/** Gameplay recipes, not a catalogue of renamed native ROM slots. */
export const CORES=[
 {id:'flame',name:'Flame',color:'#ff873f',power:1.35,cost:7,status:'burn',verb:'Cinder'},
 {id:'frost',name:'Frost',color:'#9be8ff',power:1.1,cost:7,status:'slow',verb:'Rime'},
 {id:'volt',name:'Volt',color:'#ffe87b',power:1.25,cost:8,status:'shock',verb:'Lightning'},
 {id:'tide',name:'Tide',color:'#53cce8',power:1.05,cost:6,status:'wet',verb:'Tide'},
 {id:'gravity',name:'Gravity',color:'#ba9aff',power:1.2,cost:10,status:'pull',verb:'Orbit'},
 {id:'mend',name:'Mend',color:'#89ffb8',power:1.5,cost:8,healing:true,verb:'Renewal'},
 {id:'ward',name:'Ward',color:'#f6dba1',power:1.3,cost:7,healing:true,verb:'Sanctuary'},
 {id:'gale',name:'Gale',color:'#adffd8',power:1.05,cost:6,status:'push',verb:'Gale'},
 {id:'shade',name:'Shade',color:'#cf9dff',power:1.4,cost:9,status:'drain',verb:'Nightglass'},
 {id:'earth',name:'Earth',color:'#e6ae77',power:1.15,cost:7,status:'break',verb:'Fault'}
];
export const SUPPORTS=[
 {id:'focus',name:'Focus',shape:'single',power:1.3,cost:1,label:'Lance'},
 {id:'chain',name:'Chain',shape:'chain',power:.8,cost:1.3,label:'Ricochet'},
 {id:'burst',name:'Burst',shape:'burst',power:.8,cost:1.4,label:'Nova'},
 {id:'pierce',name:'Pierce',shape:'line',power:1,cost:1.2,label:'Thread'},
 {id:'echo',name:'Echo',shape:'single',power:.8,cost:1.5,label:'Refrain'},
 {id:'counter',name:'Counter',shape:'single',power:1.1,cost:1.1,label:'Reprisal'},
 {id:'field',name:'Field',shape:'field',power:.55,cost:1.6,label:'Garden'},
 {id:'leech',name:'Leech',shape:'single',power:1,cost:1.3,label:'Siphon'},
 {id:'quick',name:'Quick',shape:'single',power:.7,cost:.65,label:'Flicker'},
 {id:'break',name:'Break',shape:'single',power:1.05,cost:1.25,label:'Rupture'},
 {id:'link',name:'Link',shape:'burst',power:1.3,cost:1.3,label:'Concord'},
 {id:'overdrive',name:'Overdrive',shape:'burst',power:2.1,cost:2,label:'Cataclysm'}
];
export const CREW=[
 {name:'Sable',affinity:'earth',speed:1.15},{name:'Iona',affinity:'mend',speed:1},
 {name:'Rook',affinity:'flame',speed:.95},{name:'Brass',affinity:'ward',speed:.8},
 {name:'Riven',affinity:'tide',speed:1.1},{name:'Mira',affinity:'gale',speed:1.25},{name:'Veyr',affinity:'shade',speed:1}
];
export const masteryRank=ap=>ap>=120?3:ap>=35?2:1;
export function compileTechnique(coreId,supportId='focus',{ap=0,character=0}={}){
 const core=CORES.find(v=>v.id===coreId),support=SUPPORTS.find(v=>v.id===supportId);
 if(!core||!support)throw Error('Unknown Mako crystal');
 const rank=masteryRank(ap),affinity=CREW[character]?.affinity===coreId;
 return {...core,id:coreId+':'+supportId,core:coreId,support:supportId,name:`${core.verb} ${support.label}`,shape:support.shape,rank,
  power:core.power*support.power*(1+.18*(rank-1))*(affinity?1.12:1),cost:Math.max(2,Math.round(core.cost*support.cost*(affinity?.85:1))),
  targets:supportId==='chain'?2+rank:support.shape==='burst'?9:1,interrupt:supportId==='break'||coreId==='gravity',
  echo:supportId==='echo',counter:supportId==='counter',field:supportId==='field',leech:supportId==='leech',quick:supportId==='quick',link:supportId==='link',overdrive:supportId==='overdrive'};
}
export const TECHNIQUE_CATALOG=CORES.flatMap(c=>SUPPORTS.map(s=>compileTechnique(c.id,s.id)));
export function payTechnique(actor,tech){
 const missing=Math.max(0,tech.cost-actor.mp),strain=missing?missing*4:tech.overdrive?22:3;
 if(actor.hp<=0||actor.strain+strain>100||missing&&actor.hp<=missing*3)return false;
 actor.mp=Math.max(0,actor.mp-tech.cost);actor.hp-=missing*3;actor.strain=Math.min(100,actor.strain+strain);return true;
}
export function defaultHero(id,level=1){
 const base=CREW[id];return {id,name:base.name,level,maxHp:180+(level-1)*24,maxMp:38+(level-1)*3,hp:180+(level-1)*24,mp:38+(level-1)*3,
 power:24+(level-1)*4,magic:24+(level-1)*4,speed:base.speed,strain:0,ap:{},learned:128,signature:false,
 loadout:[{core:base.affinity,support:'focus'},{core:id===1?'ward':id===2?'volt':'mend',support:id===1?'counter':'chain'},{core:'earth',support:'break'}]};
}
const PERSONAL=[
 [['gale','burst'],['gale','pierce'],['volt','focus'],['gale','burst'],['earth','focus'],['volt','burst'],['earth','echo'],['volt','overdrive']],
 [['mend','focus'],['ward','counter'],['frost','pierce'],['mend','quick'],['ward','quick'],['frost','burst'],['mend','burst'],['mend','echo']],
 [['flame','pierce'],['ward','focus'],['gale','quick'],['flame','burst'],['earth','break'],['flame','chain'],['ward','field'],['flame','overdrive']],
 [['earth','focus'],['mend','focus'],['volt','pierce'],['earth','burst'],['shade','chain'],['ward','counter'],['mend','burst'],['shade','overdrive']],
 [['earth','focus'],['mend','focus'],['tide','pierce'],['earth','break'],['mend','quick'],['tide','burst'],['mend','burst'],['earth','overdrive']],
 [['gale','focus'],['mend','quick'],['earth','break'],['gale','chain'],['shade','leech'],['earth','echo'],['gale','link'],['earth','overdrive']],
 [['shade','focus'],['volt','burst'],['frost','burst'],['flame','burst'],['ward','counter'],['gravity','field'],['shade','leech'],['shade','overdrive']]
];
export function personalTechnique(hero,rank,label){const [c,s]=PERSONAL[hero.id][rank-1];return withDoctrines(hero,{...compileTechnique(c,s,{character:hero.id,ap:hero.ap[c]||0}),id:`personal:${hero.id}:${rank}`,name:label,revive:hero.id===1&&rank===8,personal:true,...signatureMetadata(hero.id)});}
export function selectTargets(tech,caster,target,all){
 const alive=all.filter(a=>!a.withdrawn&&(tech.revive?true:a.hp>0)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 if(!target)return [];
 if(tech.shape==='chain')return alive.sort((a,b)=>dist(a,target)-dist(b,target)).slice(0,tech.targets);
 if(tech.shape==='burst'||tech.shape==='field')return alive.filter(a=>dist(a,target)<=3.2);
 if(tech.shape==='line'){const dx=target.x-caster.x,dy=target.y-caster.y,len=Math.hypot(dx,dy)||1;return alive.filter(a=>{const x=a.x-caster.x,y=a.y-caster.y,t=(x*dx+y*dy)/len;return t>=0&&t<=len+2&&Math.abs(x*dy-y*dx)/len<.85;});}
 return [target];
}

/** Rare Mako modifies the same resource-paying recipe used by battle and menus. */
export function compileLoadoutTechnique(slot,hero,state){const base=compileTechnique(slot.core,slot.support,{character:hero.id,ap:hero.ap[slot.core]||0}),r=RARE_MAKO.find(v=>v.id===slot.makoId&&v.core===slot.core);if(!r||!isMakoAttuned(state,hero.id,r.id))return withDoctrines(hero,base);return withDoctrines(hero,{...base,id:base.id+':'+r.id,name:r.name+' · '+base.name,makoId:r.id,power:base.power*r.power,cost:Math.max(2,base.cost+r.costDelta),interrupt:base.interrupt||!!r.interrupt,echo:base.echo||!!r.echo});}
