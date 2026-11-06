import {SLOT_GROUPS,EQUIP_SLOTS,EQUIPMENT_BASES,REGIONS,ENEMIES,MATERIALS,PREFIXES,SUFFIXES,SETS,UNIQUES,ELEMENTS,RARITIES,RUNES,STAT_LABELS} from './catalog.mjs?v=5.21.0';
/** Deterministic numerical equipment/loot core. Never performs I/O or owns a frame loop. */
const GRID={bag:{w:10,h:6},stash:{w:10,h:8}};
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const int=n=>Math.trunc(Number(n)||0);
const cleanObj=o=>Object.fromEntries(Object.entries(o??{}).filter(([,v])=>Number.isFinite(v)&&v!==0));
export const IMPRINT_STATS=Object.freeze(['attack','armor','vigor','ward','precision','focus','haste','pierce','block','shielding','resonance','leech','discovery',...ELEMENTS]);
/** Ordered pair resonance grammar; a chord only wakes when both voices have two sources. */
export const HARMONIC_CHORDS=Object.freeze([
 {id:'kindled-orchard',name:'The Kindled Orchard',elements:['ember','verdant'],when:'organic terrain',attack:.06,guard:.015},
 {id:'memory-in-water',name:'Memory in Water',elements:['tide','echo'],when:'water terrain',attack:.055,guard:.035},
 {id:'sky-furnace',name:'Sky Furnace',elements:['stone','aether'],when:'resonant ground',pierce:.07},
 {id:'bell-of-embers',name:'Bell of Embers',elements:['ember','echo'],when:'resonance ≥ 45%',attack:.05},
 {id:'river-root',name:'River Root',elements:['tide','verdant'],when:'wet or organic terrain',guard:.055},
 {id:'living-bastion',name:'Living Bastion',elements:['stone','verdant'],when:'organic terrain',protection:.045},
 {id:'unfinished-song',name:'The Unfinished Song',elements:['aether','echo'],when:'harmonic enemy shield',pierce:.06}
]);
export function hash32(s){let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
export function rng(seed){let a=hash32(seed);return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
const sample=(r,a)=>a[Math.floor(r()*a.length)];
const weighted=(r,arr)=>{const total=arr.reduce((a,x)=>a+x.weight,0);let roll=r()*total;for(const x of arr){roll-=x.weight;if(roll<=0)return x.value}return arr.at(-1).value};
const regionById=id=>REGIONS.find(x=>x.id===id)??REGIONS[0];
const rarityWeight=(level,elite,boss,pity)=>{
 const shift=clamp(level/30+(elite?0.65:0)+(boss?1.45:0)+pity*.08,0,4.5);
 return [70,37,17,6,1.5,.10].map((base,i)=>({value:RARITIES[i],weight:base*Math.pow(1+shift,i*.9)}));
};
function itemStats(base,level,rarity,affixes,material){
 const mult=({common:1,uncommon:1.17,rare:1.37,epic:1.65,legendary:2.1,mythic:2.65})[rarity];
 const primary=base.primary;
 const value=Math.round((2.2+level*.93)*(primary==='attack'?1.70:primary==='armor'?2.45:primary==='block'?1.4:1)*mult*material.mult);
 const stats={[primary]:value};
 // On-gear secondary elemental attunement is functional, not visual fluff.
 stats[material.element]=(stats[material.element]||0)+Math.ceil(level*.13*mult);
 for(const a of affixes)stats[a.stat]=(stats[a.stat]||0)+Math.round(a.value*(.62+level*.084)*mult);
 return cleanObj(stats);
}
export function rollItem({seed,eventId='world',serial=0,level=8,region='orchard',elite=false,boss=false,pity=0,forceRarity=null,forceSlot=null,forceUnique=null}={}){
 const rand=rng(`${seed}|${eventId}|${serial}|equipment-v1`),l=clamp(int(level),1,99);
 const rarity=forceRarity&&RARITIES.includes(forceRarity)?forceRarity:weighted(rand,rarityWeight(l,elite,boss,pity));
 const reg=regionById(region),material=(MATERIALS.find(m=>m.region===reg.id)??sample(rand,MATERIALS));
 const slotPool=EQUIPMENT_BASES.filter(b=>!forceSlot||b.slot===SLOT_GROUPS[forceSlot]||b.slot===forceSlot);
 if(!slotPool.length)throw Error('No bases for slot');
 const uniquePool=UNIQUES.filter(x=>(!forceSlot||x.slot===SLOT_GROUPS[forceSlot]||x.slot===forceSlot)&&(!forceUnique||x.id===forceUnique));
 const chosenUnique=(forceUnique||(['legendary','mythic'].includes(rarity)&&rand()<.63))&&uniquePool.length?sample(rand,uniquePool):null;
 const b=chosenUnique??sample(rand,slotPool);
 const affixCount=rarity==='common'?0:rarity==='uncommon'?1:rarity==='rare'?2:rarity==='epic'?3:rarity==='legendary'?4:5;
 const prefix=sample(rand,PREFIXES),suffix=sample(rand,SUFFIXES);
 const affixes=[];if(affixCount){affixes.push({...prefix});if(affixCount>1)affixes.push({...suffix});}
 while(affixes.length<affixCount){const next=sample(rand,[...PREFIXES,...SUFFIXES]);if(affixes.some(x=>x.stat===next.stat))continue;affixes.push({...next});}
 const stats=itemStats(b,l,rarity,affixes,material);
 const origin=reg.name;
 const name=chosenUnique?.name??(rarity==='common'?`${material.name} ${b.name}`:rarity==='uncommon'?`${prefix.name} ${b.name}`:`${prefix.name} ${b.name} of ${suffix.name}`);
 const uniqueId=`aa-${hash32(`${seed}:${eventId}:${serial}:${b.id}:${name}`).toString(36)}-${hash32(`${eventId}:${serial}`).toString(36)}`;
 return {id:uniqueId,baseId:b.id??b.id,slot:b.slot,w:b.w,h:b.h,icon:b.icon,name,rarity,element:chosenUnique?.element??material.element,
 level:l,requiredLevel:Math.max(1,Math.floor(l*.79)),itemPower:Math.round(l*multFor(rarity)*11+affixCount*9),
 stats,affixes,material:material.name,region:reg.id,origin,set:chosenUnique?.set??(rarity==='epic'&&rand()<.32?sample(rand,SETS).id:null),
 unique:chosenUnique?.id??null,effect:chosenUnique?.effect??null,effectText:chosenUnique?.effectText??null,
 lore:chosenUnique?.lore??`${material.name} recovered from ${origin.toLowerCase()}. Its grain still carries the local ${reg.element} resonance.`,
 upgrade:0,locked:false,sockets:rarity==='mythic'?3:rarity==='legendary'?2:rarity==='epic'?2:rarity==='rare'?1:0,runes:[],value:Math.ceil(l*l*.8*multFor(rarity)),createdBy:String(eventId)};
}
function multFor(r){return ({common:1,uncommon:1.4,rare:2.1,epic:3.2,legendary:5.1,mythic:8})[r]??1}
function compatible(item,slot){return item.slot===SLOT_GROUPS[slot]}
function intersects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
export function fitPosition(items,item,container='bag',at=null,except=null){
 const size=GRID[container];if(!size)throw Error('Invalid container');
 const occupied=items.filter(p=>p.id!==except&&p.container===container).map(p=>({x:p.x,y:p.y,w:p.item.w,h:p.item.h}));
 const open=(x,y)=>x>=0&&y>=0&&x+item.w<=size.w&&y+item.h<=size.h&&!occupied.some(o=>intersects({x,y,w:item.w,h:item.h},o));
 if(at){return open(int(at.x),int(at.y))?{x:int(at.x),y:int(at.y)}:null}
 for(let y=0;y<=size.h-item.h;y++)for(let x=0;x<=size.w-item.w;x++)if(open(x,y))return {x,y};
 return null;
}
function packed(items,container){const sorted=[...items].sort((a,b)=>b.item.w*b.item.h-a.item.w*a.item.h||b.item.itemPower-a.item.itemPower);const placed=[];
 for(const p of sorted){const pos=fitPosition(placed,p.item,container);if(!pos)return null;placed.push({...p,container,...pos})}return placed;
}
const EFFECT_HOOKS=Object.freeze({
 'harmonic-reprise':{trigger:'on-next-different-element',magnitude:.32},
 'memory-ward':{trigger:'enter-water',magnitude:.18},
 'root-shelter':{trigger:'organic-terrain-defense',magnitude:.16},
 'unbroken-oath':{trigger:'end-turn-stone-shield',magnitude:.25},
 'backwash':{trigger:'every-fourth-encounter',magnitude:.10},
 'sky-convergence':{trigger:'aether-resonance',magnitude:.15},
 'hollow-bell':{trigger:'echo-attack',magnitude:.18},
 'second-timeline':{trigger:'ngplus-memory',magnitude:1},
 'founders-touch':{trigger:'precise-harmonic-hit',magnitude:.12},
 'living-stride':{trigger:'rooted-terrain-movement',magnitude:.16},
 'seven-waves':{trigger:'guarded-tide-hit',magnitude:.10},
 'falling-stars':{trigger:'long-range-aether',magnitude:.15}
});

const emptyEquipment=()=>Object.fromEntries(EQUIP_SLOTS.map(x=>[x,null]));
function initState({timeline='prime',character='Iona',level=12,seed='ash-aether-demo'}={}){
 return {version:1,timeline:String(timeline),character:String(character),level:clamp(int(level),1,99),seed:String(seed),gear:emptyEquipment(),placements:[],
 coins:1825,resources:{scrap:24,essence:9,starshard:2},history:[],claimedEvents:{},pity:0,nextAction:0,overflow:[],legacyMemories:[],loadouts:[null,null,null],defeated:{},discovered:{},forgeLog:[],forgeSerial:0,settings:{autoStash:true}};
}
export class Armory {
 constructor(opts={}){this.state=initState(opts);this.listeners=new Set();if(opts.seedStarter!==false)this.seedStarter();}
 subscribe(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn)}
 emit(kind,detail={}){for(const fn of this.listeners)fn({kind,...detail},this.state)}
 get(itemId){const p=this.state.placements.find(x=>x.id===itemId);if(p)return {item:p.item,where:p.container,placement:p};for(const [slot,item] of Object.entries(this.state.gear))if(item?.id===itemId)return {item,where:slot};const of=this.state.overflow.find(x=>x.id===itemId);if(of)return {item:of,where:'overflow'};return null}
 has(itemId){return Boolean(this.get(itemId))}
 _place(item,container='bag',at=null){if(this.has(item.id))return false;let position=fitPosition(this.state.placements,item,container,at);if(!position)return false;this.state.placements.push({id:item.id,item,container,...position});return true}
 grantItem(item,location='auto'){
   if(!item||typeof item.id!=='string'||!Number.isInteger(item.w)||!Number.isInteger(item.h)||item.w<1||item.h<1||!RARITIES.includes(item.rarity))throw Error('Invalid item');
   if(this.has(item.id))return {ok:false,reason:'duplicate'};
   const preference=location==='auto'?['bag','stash']:location==='bag'?['bag']:location==='stash'?['stash']:[];
   for(const box of preference)if(this._place(item,box)){this.emit('grant',{item,container:box});return {ok:true,container:box}}
   if(location==='auto'){this.state.overflow.push(item);this.emit('overflow',{item});return {ok:true,container:'overflow'}}
   return {ok:false,reason:'full'};
 }
 equip(id,slot=null){const found=this.get(id);if(!found||!['bag','stash','overflow'].includes(found.where))return {ok:false,reason:'not-in-inventory'};
 const item=found.item;if(item.requiredLevel>this.state.level)return {ok:false,reason:'level'};
 const candidates=EQUIP_SLOTS.filter(s=>compatible(item,s));const dest=slot??candidates.find(s=>!this.state.gear[s])??candidates[0];
 if(!candidates.includes(dest))return {ok:false,reason:'incompatible'};
 // Atomic simulation, including displaced item placement; never lose one on full bags.
 const old=this.state.gear[dest];
 this.state.placements=this.state.placements.filter(p=>p.id!==id);this.state.overflow=this.state.overflow.filter(i=>i.id!==id);
 this.state.gear[dest]=item;
 if(old&&!this._place(old,found.where==='bag'?'bag':found.where==='stash'?'stash':'bag')&&!this._place(old,'stash')){
   // Safe fallback: stash overflow, never destroy a previously equipped item.
   this.state.overflow.push(old);
 }
 this.emit('equip',{item,slot:dest,displaced:old});return {ok:true,slot:dest,displaced:old?.id??null};
 }
 unequip(slot,container='bag'){
 const item=this.state.gear[slot];if(!item)return {ok:false,reason:'empty'};
 const target=container==='stash'?'stash':'bag';if(!fitPosition(this.state.placements,item,target))return {ok:false,reason:'full'};
 this.state.gear[slot]=null;this._place(item,target);this.emit('unequip',{item,slot});return {ok:true};
 }
 move(id,container,position=null){const f=this.get(id);if(!f)return {ok:false,reason:'missing'};
 if(!['bag','stash'].includes(container))return {ok:false,reason:'invalid-container'};
 if(f.where==='overflow'){const p=fitPosition(this.state.placements,f.item,container,position);if(!p)return {ok:false,reason:'full'};this.state.overflow=this.state.overflow.filter(x=>x.id!==id);this.state.placements.push({id,item:f.item,container,...p});this.emit('move',{id,container});return {ok:true}}
 if(f.where!=='bag'&&f.where!=='stash')return {ok:false,reason:'equipped'};
 const p=fitPosition(this.state.placements,f.item,container,position,id);if(!p)return {ok:false,reason:'blocked'};
 Object.assign(f.placement,{container,...p});this.emit('move',{id,container});return {ok:true};
 }
 sort(container='bag'){if(!GRID[container])return {ok:false};const contents=this.state.placements.filter(p=>p.container===container);const result=packed(contents,container);
 if(!result)return {ok:false,reason:'no-fit'};
 const keep=this.state.placements.filter(p=>p.container!==container);this.state.placements=[...keep,...result];this.emit('sort',{container});return {ok:true};}
 setLocked(id,locked){const f=this.get(id);if(!f)return false;f.item.locked=Boolean(locked);this.emit('lock',{id,locked:!!locked});return true;}
 salvage(id){const f=this.get(id);if(!f||!['bag','stash','overflow'].includes(f.where))return {ok:false,reason:'not-stored'};if(f.item.locked)return {ok:false,reason:'locked'};
 const scrap=Math.ceil(f.item.itemPower/26),essence=RARITIES.indexOf(f.item.rarity)>=2?1+Math.floor(f.item.itemPower/110):0,starshard=RARITIES.indexOf(f.item.rarity)>=4?1:0;
 this.state.placements=this.state.placements.filter(p=>p.id!==id);this.state.overflow=this.state.overflow.filter(i=>i.id!==id);
 this.state.resources.scrap+=scrap;this.state.resources.essence+=essence;this.state.resources.starshard+=starshard;
 this.emit('salvage',{item:f.item,scrap,essence,starshard});return {ok:true,scrap,essence,starshard};}
 upgrade(id){const f=this.get(id);if(!f)return {ok:false,reason:'missing'};
 const item=f.item,rank=item.upgrade||0;if(rank>=8)return {ok:false,reason:'maxed'};
 const cost={scrap:8+rank*7,essence:rank>=2?2+rank:0,starshard:rank>=5?1:0};
 if(Object.entries(cost).some(([k,v])=>this.state.resources[k]<v))return {ok:false,reason:'resources',cost};
 for(const [k,v]of Object.entries(cost))this.state.resources[k]-=v;
 item.upgrade=rank+1;item.stats=Object.fromEntries(Object.entries(item.stats).map(([k,v])=>[k,v+Math.max(1,Math.ceil(v*.065))]));item.itemPower+=14;
 this.emit('upgrade',{item,cost});return {ok:true,cost};}
 /** Return deterministic preview and claim once. Never re-roll or mint from renderers. */
 previewEncounter({eventId,enemyId='cinderstag',enemySpec=null,region,level,elite,boss,difficulty=1,partyLoot=1}={}){
 if(!eventId||typeof eventId!=='string')throw Error('An immutable encounter eventId is required');
 const enemy=ENEMIES.find(e=>e.id===enemyId)??(enemySpec&&enemySpec.id===enemyId?{id:enemyId,name:String(enemySpec.name||enemyId).slice(0,100),body:enemySpec.body||'sinew',region:enemySpec.region||region||'orchard',level:enemySpec.level||1,shielding:clamp(Number(enemySpec.shielding)||0,0,1),signature:enemySpec.signature||'stone',elite:Boolean(enemySpec.elite),boss:Boolean(enemySpec.boss)}:{id:enemyId,name:String(enemyId).slice(0,100),body:'sinew',region:region||'orchard',level:1,shielding:0,signature:'stone'});const r=regionById(region??enemy.region),l=clamp(int(level??enemy.level),1,99);
 const e=Boolean(elite??enemy.elite),b=Boolean(boss??enemy.boss),d=clamp(Number(difficulty)||1,0.5,10),luck=clamp((this.stats().discovery||0)/400,0,.23),rand=rng(`${this.state.seed}|${this.state.timeline}|${eventId}|drop-v1`);
 const number=clamp(Math.floor((b?2:e?1:0)+(rand()<clamp(.43+Math.log2(d)*.06+luck,0,.95)?1:0)),0,3);
 const equipment=[];
 // Anatomy matters: winged creatures favor ornaments, plate guardians favor defenses,
 // instruments/constructs favor focus implements. No monster is reduced to a color swap.
 const anatomyDrops={horns:['head','shoulders','mainhand','head','ring'],shell:['chest','offhand','shoulders','relic'],veil:['neck','ring','offhand','relic','sigil'],prism:['sigil','relic','mainhand','neck'],plate:['chest','offhand','hands','legs'],choral:['relic','mainhand','neck','sigil'],wings:['feet','shoulders','neck','ring'],sinew:['feet','hands','mainhand','ring']};
 const favored=anatomyDrops[enemy.body]||['mainhand','chest','ring'];
 for(let i=0;i<number;i++){
   const forceSlot=rand()<.74?sample(rand,favored):undefined;
   const special=b&&i>0&&rand()<.23;
   const bossStreak=this.state.defeated?.[enemy.id]||0;
   const signatureUnique=b&&i===1&&(bossStreak+1)%4===0 ? (UNIQUES.find(u=>u.element===enemy.signature)??UNIQUES[0]) : null;
   equipment.push(rollItem({seed:`${this.state.seed}|${this.state.timeline}`,eventId,serial:i,level:l,region:r.id,elite:e,boss:b,pity:this.state.pity+luck*5,
     forceSlot:signatureUnique?signatureUnique.slot:forceSlot,forceUnique:signatureUnique?.id,forceRarity:b&&i===0?'epic':signatureUnique||special?'legendary':undefined}));
 }
 // Other materials are canonical resource records and not item icons masquerading as loot.
 const resources={coins:Math.round((10+rand()*18+l*2.1)*d*clamp(partyLoot,.1,5)),scrap:1+Math.floor(rand()*(b?8:4)),essence:b?3+Math.floor(rand()*4):e?1+Math.floor(rand()*2):rand()<.28?1:0,starshard:b?1:0};
 return {eventId,enemyId:enemy.id,enemy:enemy.name,region:r.id,level:l,elite:e,boss:b,equipment,resources,signature:enemy.signature,shielding:enemy.shielding,material:r.material};
 }
 claimEncounter(args){const eventId=args?.eventId;if(!eventId)throw Error('eventId is required');if(Object.hasOwn(this.state.claimedEvents,eventId))return {ok:false,reason:'already-claimed',eventId};
 const reward=this.previewEncounter(args);this.state.claimedEvents[eventId]={level:reward.level,enemyId:reward.enemyId};
 this.state.defeated??={};this.state.discovered??={};this.state.defeated[reward.enemyId]=(this.state.defeated[reward.enemyId]||0)+1;
 this.state.coins+=reward.resources.coins;
 for(const k of ['scrap','essence','starshard'])this.state.resources[k]+=reward.resources[k];
 const items=reward.equipment.map(i=>{const granted=this.grantItem(i);if(!granted.ok)throw Error('Loot grant failed');this.state.discovered[i.baseId]=(this.state.discovered[i.baseId]||0)+1;if(i.unique)this.state.discovered[i.unique]=(this.state.discovered[i.unique]||0)+1;return {...i,container:granted.container}});
 this.state.pity=items.some(x=>['epic','legendary','mythic'].includes(x.rarity))?0:this.state.pity+1;
 this.state.history.unshift({eventId,enemy:reward.enemy,region:reward.region,items:items.map(i=>i.id),resources:reward.resources});this.state.history=this.state.history.slice(0,40);
 const encounterCount=Object.keys(this.state.claimedEvents).length;
 const triggeredEffects=this.effects().filter(f=>f.trigger==='every-fourth-encounter'&&encounterCount%4===0);
 this.emit('encounter',{...reward,items,triggeredEffects});return {ok:true,...reward,items,triggeredEffects};
 }

 /** Every slot references immutable item IDs; names are only display labels. */
 saveLoadout(index,name=''){if(!Number.isInteger(index)||index<0||index>=3)return {ok:false,reason:'slot'};
  this.state.loadouts??=[null,null,null];this.state.loadouts[index]={name:String(name||`Armament ${index+1}`).slice(0,32),gear:Object.fromEntries(EQUIP_SLOTS.map(k=>[k,this.state.gear[k]?.id||null]))};this.emit('loadout-saved',{index});return {ok:true};}
 equipLoadout(index){const preset=this.state.loadouts?.[index];if(!preset)return {ok:false,reason:'empty'};
  const ids=Object.values(preset.gear).filter(Boolean);if(new Set(ids).size!==ids.length)return {ok:false,reason:'corrupt'};
  const all=[...this.state.placements.map(p=>p.item),...this.state.overflow,...Object.values(this.state.gear).filter(Boolean)];const lookup=new Map(all.map(i=>[i.id,i]));
  for(const [slot,id]of Object.entries(preset.gear)){if(!id)continue;const item=lookup.get(id);if(!item)return {ok:false,reason:'missing-item',itemId:id};if(!Object.hasOwn(SLOT_GROUPS,slot)||!compatible(item,slot))return {ok:false,reason:'incompatible'};if(item.requiredLevel>this.state.level)return {ok:false,reason:'level'};}
  const backup=this.snapshot();try{
   const selected=new Set(ids);this.state.placements=this.state.placements.filter(p=>!selected.has(p.id));this.state.overflow=this.state.overflow.filter(i=>!selected.has(i.id));
   this.state.gear=emptyEquipment();for(const [slot,id]of Object.entries(preset.gear))if(id)this.state.gear[slot]=lookup.get(id);
   for(const item of Object.values(backup.gear).filter(Boolean))if(!selected.has(item.id)&&!this._place(item,'bag')&&!this._place(item,'stash'))this.state.overflow.push(item);
   this.emit('loadout-equipped',{index});return {ok:true};
  }catch(err){this.state=backup;return {ok:false,reason:'rollback'};}
 }
 /** Runes are spent from the canonical material pouch and become bound to the item. */
 runeBonus(rune,item){const power=Math.max(2,Math.round((2+item.level*.18)*(1+item.upgrade*.07)));return {[rune.stat]:power,[rune.element]:Math.max(1,Math.round(power*.66))};}
 socketRune(id,runeId){const f=this.get(id),rune=RUNES.find(x=>x.id===runeId);if(!f||!rune)return {ok:false,reason:'missing'};
  const item=f.item;item.runes??=[];const capacity=item.sockets??0;if(item.runes.length>=capacity)return {ok:false,reason:'full'};
  const cost={essence:3+Math.floor(item.level/15),starshard:item.runes.length>=2?1:0};if(Object.entries(cost).some(([k,v])=>this.state.resources[k]<v))return {ok:false,reason:'resources',cost};
  const bonus=this.runeBonus(rune,item);for(const [k,v]of Object.entries(cost))this.state.resources[k]-=v;
  item.runes.push({id:rune.id,bonus});
  item.itemPower+=9;this.emit('socket',{item,rune,cost});return {ok:true,cost,bonus};}
 extractRune(id,index){const f=this.get(id);if(!f)return {ok:false,reason:'missing'};
  const item=f.item;if(!Number.isInteger(index)||index<0||index>=(item.runes||[]).length)return {ok:false,reason:'missing-rune'};
  const cost={essence:2};if(this.state.resources.essence<cost.essence)return {ok:false,reason:'resources',cost};
  this.state.resources.essence-=cost.essence;const [rune]=item.runes.splice(index,1);
  // Affix/base statistics are never modified by extraction. Rune bonuses are derived at read time.
  item.itemPower-=9;this.emit('extract',{item,rune});return {ok:true,rune};}
 /** Forge offers a deterministic, paid path toward chosen region/slot without faking monster drops. */
 craftItem({slot='mainhand',region='orchard',rarity='rare'}={}){
  if(!Object.values(SLOT_GROUPS).includes(slot)||!REGIONS.some(r=>r.id===region)||!['rare','epic'].includes(rarity))return {ok:false,reason:'recipe'};
  const cost=rarity==='epic'?{coins:850,scrap:45,essence:12,starshard:1}:{coins:220,scrap:18,essence:4,starshard:0};
  if(this.state.coins<cost.coins||Object.entries(cost).some(([k,v])=>k!=='coins'&&this.state.resources[k]<v))return {ok:false,reason:'resources',cost};
  const serial=this.state.forgeSerial||0;const item=rollItem({seed:`${this.state.seed}|${this.state.timeline}`,eventId:`forge:${serial}:${region}:${slot}`,serial:0,level:this.state.level,region,forceSlot:slot,forceRarity:rarity});
  if(this.has(item.id))return {ok:false,reason:'duplicate'};
  this.state.coins-=cost.coins;for(const [k,v]of Object.entries(cost))if(k!=='coins')this.state.resources[k]-=v;
  item.createdBy='field-forge';item.lore=`Forged by hand with ${regionById(region).material} and bound to the bearer’s remembered song.`;
  const granted=this.grantItem(item);if(!granted.ok)throw Error('Forge item could not be stored');
  this.state.forgeSerial=serial+1;this.state.forgeLog??=[];this.state.forgeLog.unshift({id:item.id,name:item.name,slot,region,rarity,cost});this.state.forgeLog.length=Math.min(this.state.forgeLog.length,40);
  this.emit('craft',{item,cost});return {ok:true,item,container:granted.container,cost};
 }
 lootJournal(){return ENEMIES.map(e=>({id:e.id,name:e.name,region:e.region,body:e.body,shield:e.shield,defeats:this.state.defeated?.[e.id]||0,boss:Boolean(e.boss),elite:Boolean(e.elite)}));}
 /** Retune one focused statistic, never rewriting the artifact's base, set or history. */
 imprintItem(id,stat){const f=this.get(id);if(!f)return {ok:false,reason:'missing'};
  if(!IMPRINT_STATS.includes(stat))return {ok:false,reason:'stat'};
  const item=f.item,rolls=item.imprint?.rolls||0;if(rolls>=12)return {ok:false,reason:'maxed'};
  const cost={scrap:12+9*rolls,essence:4+Math.floor(item.level/12)+2*rolls,starshard:RARITIES.indexOf(item.rarity)>=4?1:0};
  if(Object.entries(cost).some(([k,v])=>(this.state.resources[k]||0)<v))return {ok:false,reason:'resources',cost};
  const value=Math.max(1,Math.round((4+item.level*.32)*(1+.13*RARITIES.indexOf(item.rarity))*(1+.07*(item.upgrade||0))));
  for(const [k,v]of Object.entries(cost))this.state.resources[k]-=v;
  const old=item.imprint;
  item.imprint={stat,value,rolls:rolls+1};
  item.itemPower=Math.max(1,item.itemPower-(old?Math.ceil(old.value/3):0)+Math.ceil(value/3));
  this.emit('imprint',{item,stat,value,cost});return {ok:true,item,stat,value,cost};
 }
 /** Read-only growth offers. Run the native operation on an isolated copy so
  * previews, resource prices and stat losses cannot drift from its rules. */
 weaponGrowthView(itemId=null,{stat,runeId,runeIndex=0}={}){
  const candidates=[...Object.values(this.state.gear).filter(Boolean),...this.state.placements.map(p=>p.item),...this.state.overflow].filter(item=>item.slot==='mainhand');
  const best=this.state.gear.mainhand||[...candidates].sort((a,b)=>(a.requiredLevel>this.state.level)-(b.requiredLevel>this.state.level)||b.itemPower-a.itemPower)[0];
  const selected=itemId?this.get(itemId):best?this.get(best.id):null;
  const resources={coins:this.state.coins,...this.state.resources};
  if(!selected||selected.item.slot!=='mainhand')return {ready:false,reason:itemId?'missing-weapon':'no-weapon',actions:[],primaryAction:null,resources};
  const item=selected.item,before=this.effectiveItemStats(item),base=[...EQUIPMENT_BASES,...UNIQUES].find(base=>base.id===item.baseId);
  const primary=base?.primary||['attack','focus','precision','resonance'].sort((a,b)=>(before[b]||0)-(before[a]||0))[0];
  const chosenStat=IMPRINT_STATS.includes(stat)?stat:primary;
  const chosenRune=RUNES.find(r=>r.id===runeId)||RUNES.find(r=>r.stat===primary&&r.element===item.element)||RUNES.find(r=>r.stat===primary)||RUNES.find(r=>r.element===item.element)||RUNES[0];
  const label=key=>STAT_LABELS[key]||key;
  const descriptions={maxed:'This weapon has reached its tempering limit.',full:item.sockets?'Every rune socket is filled. Extract a rune to change its voice.':'This weapon has no rune sockets.',level:`Requires bearer level ${item.requiredLevel}.`,'missing-rune':'There is no bound rune to extract.',unchanged:'This attunement already has the same strength. Temper the weapon or choose another stat.'};
  const preview=(id,title,method,args,detail)=>{
   const simulation=new Armory({seedStarter:false});simulation.state=this.snapshot();
   simulation.state.coins=1e9;for(const key of ['scrap','essence','starshard'])simulation.state.resources[key]=1e9;
   const budget={coins:simulation.state.coins,...simulation.state.resources},result=simulation[method](...args),afterItem=simulation.get(item.id)?.item;
   const cost=Object.fromEntries(Object.keys(budget).map(key=>[key,budget[key]-(key==='coins'?simulation.state.coins:simulation.state.resources[key])]).filter(([,value])=>value>0));
   const next=afterItem?simulation.effectiveItemStats(afterItem):before;
   const changes=Object.fromEntries([...new Set([...Object.keys(before),...Object.keys(next)])].map(key=>[key,(next[key]||0)-(before[key]||0)]).filter(([,value])=>value));
   const missing=Object.entries(cost).filter(([key,value])=>(resources[key]||0)<value).map(([resource,required])=>({resource,required,available:resources[resource]||0,amount:required-(resources[resource]||0)}));
   const unchanged=id==='attune'&&result.ok&&!Object.keys(changes).length&&afterItem.itemPower===item.itemPower;
   const reason=!result.ok?result.reason:unchanged?'unchanged':missing.length?'resources':null;
   const reasonText=reason==='resources'?`Need ${missing.map(({resource,amount})=>`${amount} more ${resource}`).join(', ')}. Earn materials from victories or salvage stored spare equipment.`:reason==='maxed'&&id==='attune'?'This weapon has used all 12 attunements.':descriptions[reason]||reason||'';
   return {id,label:title,detail,cost,missing,enabled:!reason,reason,reasonText,changes,method,args,
    after:{stats:next,itemPower:afterItem?.itemPower??item.itemPower,upgrade:afterItem?.upgrade??item.upgrade,sockets:afterItem?.sockets??0,runes:structuredClone(afterItem?.runes||[]),imprint:structuredClone(afterItem?.imprint||null)}};
  };
  const actions=[];
  if(selected.where!=='mainhand')actions.push(preview('equip','Take in hand','equip',[item.id,'mainhand'],'Equip this weapon on the selected bearer.'));
  actions.push(preview('temper',`Temper to +${Math.min(8,(item.upgrade||0)+1)}`,'upgrade',[item.id],'Strengthens every base stat and raises weapon power by 14.'));
  actions.push(preview('attune',`${item.imprint?'Retune':'Attune'} ${label(chosenStat)}`,'imprintItem',[item.id,chosenStat],item.imprint?`Replaces the current ${label(item.imprint.stat)} attunement; any lost stats are shown below.`:'Bind one focused stat to this weapon.'));
  actions.push(preview('socket',`Bind ${chosenRune.name}`,'socketRune',[item.id,chosenRune.id],`${label(chosenRune.stat)} and ${label(chosenRune.element)}; uses one empty rune socket.`));
  if(item.runes?.length)actions.push(preview('extract','Extract rune','extractRune',[item.id,runeIndex],'Removes the selected bound rune and its bonuses, freeing its socket.'));
  const primaryAction=actions.find(action=>action.enabled)||actions.find(action=>action.id==='temper')||actions[0];
  return {ready:true,itemId:item.id,name:item.name,item:structuredClone(item),where:selected.where,level:item.level,upgrade:item.upgrade||0,maxUpgrade:8,stats:before,itemPower:item.itemPower,resources,
   progress:{current:item.upgrade||0,max:8,label:`Tempered +${item.upgrade||0} / +8`},primaryStat:primary,selectedStat:chosenStat,selectedRune:chosenRune.id,
   actions,primaryAction,runeChoices:RUNES.map(r=>({...r})),attunementChoices:IMPRINT_STATS.map(id=>({id,label:label(id)}))};
 }
 /** Item voices and socketed rune voices form a material chord, bounded independently of rendering quality. */
 gearResonance(overrides={}){const counts=Object.fromEntries(ELEMENTS.map(e=>[e,0]));
  for(const item of Object.values({...this.state.gear,...overrides})){if(!item)continue;if(ELEMENTS.includes(item.element))counts[item.element]++;
   for(const socket of item.runes||[]){const element=RUNES.find(x=>x.id===socket.id)?.element;if(element)counts[element]++;}}
  const active=HARMONIC_CHORDS.filter(chord=>chord.elements.every(e=>counts[e]>=2)).map(chord=>({...chord,mode:'chord'}));
  for(const element of ELEMENTS){if(counts[element]>=3)active.push({id:`overtone-${element}`,name:`${element[0].toUpperCase()+element.slice(1)} Overtone`,mode:'overtone',element,when:'matching ground and attack',attack:counts[element]>=5?.055:.03});}
  return {counts,active};
 }
 effectiveItemStats(item){const out={...item.stats};if(item.imprint&&IMPRINT_STATS.includes(item.imprint.stat))out[item.imprint.stat]=(out[item.imprint.stat]||0)+item.imprint.value;for(const socket of item.runes||[]){const rune=RUNES.find(x=>x.id===socket.id);if(!rune)continue;for(const [k,v]of Object.entries(this.runeBonus(rune,item)))out[k]=(out[k]||0)+v;}return out;}
 runeResonance(){const counts=Object.fromEntries(ELEMENTS.map(e=>[e,0]));for(const item of Object.values(this.state.gear))for(const rune of item?.runes||[]){const elem=RUNES.find(x=>x.id===rune.id)?.element;if(elem)counts[elem]++;}return counts;}
 stats(overrides={}){const tally={attack:9+this.state.level*2,armor:12+this.state.level,ward:8+this.state.level,precision:8,focus:7,vigor:10+this.state.level,haste:4,block:4,pierce:0,resonance:4,shielding:3,leech:0,discovery:0,...Object.fromEntries(ELEMENTS.map(e=>[e,0]))};
 for(const item of Object.values({...this.state.gear,...overrides}))if(item)for(const [k,v]of Object.entries(this.effectiveItemStats(item)))tally[k]=(tally[k]||0)+v;
 const sets=this.setProgress(overrides);for(const s of sets)for(const b of s.active)tally[b.stat]=(tally[b.stat]||0)+b.value;
 return tally;
 }
 effects(){return Object.entries(this.state.gear).filter(([,item])=>item?.effect&&EFFECT_HOOKS[item.effect]).map(([slot,item])=>({slot,itemId:item.id,id:item.effect,...EFFECT_HOOKS[item.effect],description:item.effectText}));}
 setProgress(overrides={}){const entries=Object.values({...this.state.gear,...overrides});return SETS.map(s=>{const count=entries.filter(i=>i?.set===s.id).length;return {...s,count,active:s.bonuses.filter(b=>b.count<=count),next:s.bonuses.find(b=>b.count>count)??null}}).filter(s=>s.count>0)}
 compare(itemId){const f=this.get(itemId);if(!f)return null;
 const slot=EQUIP_SLOTS.filter(x=>compatible(f.item,x)).find(x=>!this.state.gear[x])??EQUIP_SLOTS.find(x=>compatible(f.item,x));
 const original=this.stats(),next=this.stats({[slot]:f.item});return {slot,replaced:this.state.gear[slot],diff:Object.fromEntries(Object.keys(next).map(k=>[k,next[k]-original[k]]).filter(([,v])=>v)),before:original,after:next};}
 /** Numeric example bridge for a canonical combat engine to consume, not a new battle resolver. */
 combatModifiers({attackElement='ember',terrainElement='stone',terrainShielding=0.4,enemyShielding=0.35,terrainResonance=0.3,environmentGrip=0.5,organicTerrain=false,rootedTerrain=false,waterTerrain=false,harmonicShield=false,longRange=false}={}){
 const s=this.stats(),element=ELEMENTS.includes(attackElement)?attackElement:'ember',effects=this.effects(),runes=this.runeResonance();
 const has=id=>effects.some(f=>f.id===id);
 let rawPierce=clamp((s.pierce||0)/190,0,.72);
 if(element==='aether'&&longRange&&has('falling-stars'))rawPierce=clamp(rawPierce+.15,0,.90);
 if(element==='echo'&&harmonicShield&&has('hollow-bell'))rawPierce=clamp(rawPierce+.18,0,.90);
 const harmony=this.gearResonance();
 const activeHarmonies=harmony.active.map(h=>{
  const engaged=h.mode==='overtone'?h.element===element&&terrainElement===element:
   h.id==='kindled-orchard'?organicTerrain:
   h.id==='memory-in-water'?waterTerrain:
   h.id==='sky-furnace'?terrainResonance>=.4:
   h.id==='bell-of-embers'?terrainResonance>=.45:
   h.id==='river-root'?waterTerrain||organicTerrain:
   h.id==='living-bastion'?organicTerrain:
   h.id==='unfinished-song'?harmonicShield:false;
  return {...h,engaged};
 });
 const engaged=activeHarmonies.filter(x=>x.engaged);
 const harmonyPierce=clamp(engaged.reduce((sum,h)=>sum+(h.pierce||0),0),0,.14);
 rawPierce=clamp(rawPierce+harmonyPierce,0,.90);
 const shield=clamp((Number(enemyShielding)||0)*(1-rawPierce),0,.95);
 const terrain=clamp(Number(terrainShielding)||0,0,1);
 let resonant=clamp(Number(terrainResonance)||0,0,1)*(element===terrainElement?1.22:.65);
 if(element==='aether'&&has('sky-convergence'))resonant*=1.15;
 const nonlinearity=1+((s.resonance||0)/350)*resonant*(1+.35*terrain);
 const elemental=(1+(s[element]||0)/260)*(1+Math.min(.16,Math.max(0,(runes[element]||0)-1)*.04));
 const harmonyAttack=clamp(engaged.reduce((sum,h)=>sum+(h.attack||0),0),0,.20);
 let damageFactor=clamp((1-shield)*(1+.004*(s.precision||0))*elemental*nonlinearity*(1+harmonyAttack),.1,6);
 let protection=clamp(1-Math.exp(-((s.armor||0)*(.7+.3*terrain)+(s.ward||0)*.45)/215),0,.88);
 if(organicTerrain&&has('root-shelter'))protection=clamp(protection+(1-protection)*.16,0,.92);
 protection=clamp(protection+engaged.reduce((sum,h)=>sum+(h.protection||0),0),0,.92);
 let guard=clamp((s.shielding||0)/200+terrain*(s.block||0)/300,0,.55);
 if(waterTerrain&&has('memory-ward'))guard=clamp(guard+.18*clamp((s.tide||0)/120,0,1),0,.70);
 guard=clamp(guard+engaged.reduce((sum,h)=>sum+(h.guard||0),0),0,.70);
 let grip=clamp(environmentGrip+(.004*s.haste)-.1*(1-terrain),0,1);
 if(rootedTerrain&&has('living-stride'))grip=clamp(grip+.16,0,1);
 const onEvent=effects.filter(x=>!['root-shelter','memory-ward','sky-convergence','hollow-bell','living-stride','falling-stars'].includes(x.id));
 return {damageFactor,protection,guard,grip,shieldBroken:1-shield,elemental,nonlinearity,attuned:element===terrainElement,stats:s,
   runeResonance:runes,harmonyResonance:harmony.counts,harmonies:activeHarmonies,harmonyAttack,harmonyPierce,eventHooks:onEvent,patrolDetectionMultiplier:rootedTerrain&&has('living-stride')?.92:1};
 }
 seedStarter(){const picks=[['mainhand','rare',12],['chest','uncommon',11],['head','rare',10],['offhand','uncommon',10],['ring','epic',12],['feet','uncommon',9],['relic','legendary',12],['neck','rare',12],['hands','rare',10],['shoulders','uncommon',9],['legs','uncommon',9],['sigil','rare',12],['mainhand','epic',15],['chest','rare',13],['ring','rare',14],['offhand','epic',16],['hands','legendary',17]];
 picks.forEach(([slot,rarity,level],index)=>{let item=rollItem({seed:this.state.seed,eventId:'starter',serial:index,level,forceRarity:rarity,forceSlot:slot,region:REGIONS[index%REGIONS.length].id});if(index===6)item=rollItem({seed:this.state.seed,eventId:'starter',serial:index,level,forceRarity:'legendary',forceUnique:'u_clock',forceSlot:'relic',region:'water'});
 if(index<5){const dest=EQUIP_SLOTS.find(s=>compatible(item,s)&&!this.state.gear[s]);if(dest){this.state.gear[dest]=item;return}}this.grantItem(item)});
 }
 snapshot(){return JSON.parse(JSON.stringify(this.state))}
 load(snapshot){if(!snapshot||snapshot.version!==1||typeof snapshot!=='object')throw Error('Unsupported Armory snapshot');
 const next=JSON.parse(JSON.stringify(snapshot));next.loadouts??=[null,null,null];next.defeated??={};next.discovered??={};next.forgeLog??=[];next.forgeSerial??=0;if(!Array.isArray(next.placements)||!Array.isArray(next.overflow)||!next.gear||!next.resources||!next.claimedEvents||typeof next.timeline!=='string')throw Error('Invalid Armory snapshot');
 if(!Number.isSafeInteger(next.coins)||next.coins<0||!['scrap','essence','starshard'].every(key=>Number.isSafeInteger(next.resources[key])&&next.resources[key]>=0))throw Error('Invalid forge materials or credits');
 const ids=new Set();for(const item of [...next.placements.map(x=>x.item),...Object.values(next.gear).filter(Boolean),...next.overflow]){if(typeof item?.id!=='string'||ids.has(item.id)||!RARITIES.includes(item.rarity))throw Error('Corrupt or duplicated item');ids.add(item.id)}
 for(const item of [...next.placements.map(x=>x.item),...Object.values(next.gear).filter(Boolean),...next.overflow]){item.upgrade??=0;if(!Number.isInteger(item.upgrade)||item.upgrade<0||item.upgrade>8||!Number.isInteger(item.level)||item.level<1||item.level>99)throw Error('Invalid weapon growth level');}
 // Validate geometry without allowing a malformed import to replace current state.
 for(const container of ['bag','stash']){let placed=[];for(const p of next.placements.filter(x=>x.container===container)){if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||!fitPosition(placed,p.item,container,{x:p.x,y:p.y}))throw Error('Overlapping or invalid inventory');placed.push(p)}}
 for(const [slot,item]of Object.entries(next.gear))if(item&&(!Object.hasOwn(SLOT_GROUPS,slot)||!compatible(item,slot)))throw Error('Invalid equipped slot');
 if(Object.keys(next.gear).some(slot=>!Object.hasOwn(SLOT_GROUPS,slot)))throw Error('Unknown equipment slot');
 if(!Array.isArray(next.loadouts)||next.loadouts.length!==3||!Number.isInteger(next.forgeSerial)||next.forgeSerial<0)throw Error('Invalid loadout or forge state');
 for(const item of [...next.placements.map(x=>x.item),...Object.values(next.gear).filter(Boolean),...next.overflow]){if(!Number.isInteger(item.w)||!Number.isInteger(item.h)||item.w<1||item.h<1||item.w>10||item.h>8||!Object.values(SLOT_GROUPS).includes(item.slot)||!item.stats||typeof item.stats!=='object'||Object.values(item.stats).some(x=>!Number.isFinite(x)))throw Error('Invalid item stats');if(item.imprint&&(!IMPRINT_STATS.includes(item.imprint.stat)||!Number.isInteger(item.imprint.rolls)||item.imprint.rolls<1||item.imprint.rolls>12||!Number.isFinite(item.imprint.value)||item.imprint.value<1||item.imprint.value>5000))throw Error('Invalid attunement imprint');if(!Array.isArray(item.runes||[])||(item.runes||[]).length>(item.sockets||0)||!Number.isInteger(item.sockets??0)||(item.sockets??0)<0||(item.sockets??0)>3||(item.runes||[]).some(x=>!RUNES.some(r=>r.id===x.id)))throw Error('Invalid runes');}
 this.state=next;this.emit('load');return true;
 }
 newTimeline(timeline,{carry=null}={}){if(!timeline||timeline===this.state.timeline)throw Error('Supply a different timeline ID');const old=this.state;this.state=initState({timeline,seed:old.seed,character:old.character,level:old.level});
 this.state.coins=Math.round(old.coins*.25);this.state.resources={scrap:0,essence:0,starshard:0};
 const carried=carry?this.getFromState(old,carry):null;if(carried)this.grantItem({...carried,id:`${carried.id}@${timeline}`,createdBy:'ngplus'});
 // An equipped Unlived Lives sigil carries one extra attuned historical memory.
 this.state.legacyMemories=[...(old.legacyMemories||[])];
 if(Object.values(old.gear).some(i=>i?.effect==='second-timeline')){
   const memory=old.history[0]??{enemy:'The First Song',region:'aether',eventId:'origin'};
   this.state.legacyMemories.push({from:old.timeline,eventId:memory.eventId,name:memory.enemy,region:memory.region});
 }
 this.emit('timeline',{timeline,carried:carried?.name??null,legacyMemories:this.state.legacyMemories});}
 getFromState(state,id){return state.placements.find(p=>p.id===id)?.item??Object.values(state.gear).find(i=>i?.id===id)??state.overflow.find(i=>i.id===id)??null}
}
export const GRID_SIZES=GRID;
