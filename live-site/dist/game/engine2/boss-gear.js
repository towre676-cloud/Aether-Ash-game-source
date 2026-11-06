/** Historical forms are equipment choices, never permission to rewrite world time. */
export const GEAR_ERAS=['origin','present','aftermath'];
export const GEAR_SLOTS=['weapon','mantle','focus'];
const names=['Freed Conduit','Carriage Brake','Wellkeeper Ring','Rainbell Mantle','Unfiled Stylus','Groundwire Lance','Graftheart Cloak','Crownless Lens','Lowbank Lifeline','Unbound Clasp','Siltglass Focus','Unnumbered Needle','Hearthkeeper Wrap','Windowlight Prism','Unsworn Staff','Mountain Rest','Starwater Lens','Open Hearth','Borrowed Wing','Witness Seal','Unmolded Reed','Breathing Cloth','Answering Hand','Unfinished Circle'];
const cores=['earth','volt','tide','frost','shade','gale','mend','flame','ward','earth','tide','shade','ward','frost','earth','gale','gravity','flame','gale','shade','earth','mend','volt','ward'];
export const GUARDIAN_REWARD_RULES=Object.freeze({
 'guardian-4':{name:'Answer the bell',detail:'Guard catches one direct strike during its seven-second window and returns half its force to the attacker. The return cannot trigger another return.'},
 'guardian-8':{name:'A space between voices',detail:'Guard shelters the furthest living ally four to eight tiles away. Their next direct hit within seven seconds is halved; staying apart keeps the conduit safe.'},
 'guardian-16':{name:'Contain the wave',detail:'Once per encounter, a personal art against a charged area attack contains it to a fixed one-tile circle. Damage and later attacks remain; the larger warning geometry is removed.'},
 'guardian-24':{name:'Leave an answer',detail:'A personal hit leaves an eight-second answer. A different crew member hitting with a different element or an ordinary strike restores four MP to both voices.'}
});
export const BOSS_GEAR=names.map((name,i)=>({id:'guardian-'+(i+1),chapter:i+1,name,slot:GEAR_SLOTS[i%3],core:cores[i],color:['#dbaa75','#8dd7cf','#b9aae7'][i%3],lore:['A working part recovered before anyone could turn it into another command.','Its worn surface records the hands that kept a place alive.','Rebuilt with an opening for the next person’s answer.'][i%3],rule:GUARDIAN_REWARD_RULES['guardian-'+(i+1)]||null}));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function gearEra(s){return GEAR_ERAS.includes(s.timeline?.era)?s.timeline.era:'present';}
export function gearTimeline(s){return typeof s.timeline?.id==='string'?s.timeline.id.slice(0,96):'main';}
export function bossGearState(s){const p=s.bossGear??={version:1,patterns:[],owned:[],claims:[]};for(const k of ['patterns','owned','claims'])if(!Array.isArray(p[k]))p[k]=[];for(const chapter of s.bosses||[]){const g=BOSS_GEAR.find(g=>g.chapter===chapter);if(g){if(!p.owned.includes(g.id))p.owned.push(g.id);if(!p.patterns.includes(g.id))p.patterns.push(g.id);}}return p;}
export function claimBossGear(s,chapter){const g=BOSS_GEAR.find(g=>g.chapter===chapter);if(!g)return null;const p=bossGearState(s),key=gearTimeline(s)+':'+chapter;if(p.claims.includes(key))return null;p.claims.push(key);if(!p.owned.includes(g.id))p.owned.push(g.id);if(!p.patterns.includes(g.id))p.patterns.push(g.id);return g;}
export function gearStats(s,g,era=gearEra(s)){if(!g||!GEAR_ERAS.includes(era))return {};const progress=clamp(Math.floor(Number(s.chapter)||1),1,24),tier=Math.min(g.chapter,progress),n=1+Math.floor((tier-1)/4);const base=g.slot==='weapon'?{power:2*n,magic:n}:g.slot==='mantle'?{maxHp:16*n,maxMp:n}:{magic:2*n,maxMp:2*n};if(era==='origin'){if(g.slot==='weapon'){base.power+=n;base.magic=0;}else if(g.slot==='mantle'){base.maxHp+=8*n;base.maxMp=0;}else{base.maxMp+=n;base.magic=n;}}if(era==='aftermath'){if(g.slot==='weapon'){base.power=n;base.magic=2*n;}else if(g.slot==='mantle'){base.maxHp=12*n;base.maxMp=3*n;}else{base.magic=n;base.speed=.008*n;}}return base;}
export function equippedBossGear(s,h){const p=bossGearState(s);return GEAR_SLOTS.flatMap(slot=>{const worn=h.guardianGear?.[slot],g=BOSS_GEAR.find(g=>g.id===worn?.id&&g.slot===slot);return g&&p.owned.includes(g.id)?[{...g,era:GEAR_ERAS.includes(worn.era)?worn.era:gearEra(s)}]:[];});}
export function gearBonuses(s,h){const out={};for(const g of equippedBossGear(s,h))for(const[k,v]of Object.entries(gearStats(s,g,g.era)))out[k]=(out[k]||0)+v;for(const[k,max]of Object.entries({power:18,magic:24,maxHp:144,maxMp:30,speed:.05}))if(out[k])out[k]=Math.min(max,out[k]);return out;}
export function stripBossGear(s){for(const h of s.heroes)for(const[k,v]of Object.entries(h.bossGearBonuses||{}))h[k]-=v;for(const h of s.heroes){h.bossGearBonuses={};h.guardianTraits=[];}}
export function syncBossGear(s){stripBossGear(s);bossGearState(s);for(const h of s.heroes){const bonuses=gearBonuses(s,h);for(const[k,v]of Object.entries(bonuses))h[k]+=v;h.bossGearBonuses=bonuses;h.guardianTraits=equippedBossGear(s,h).map(g=>({id:g.id,core:g.core,era:g.era}));h.hp=Math.min(h.hp,h.maxHp);h.mp=Math.min(h.mp,h.maxMp);}}
export function equipBossGear(s,heroId,id,era=gearEra(s)){const h=s.heroes[heroId],g=BOSS_GEAR.find(g=>g.id===id);if(s.mode==='battle'||!h||!s.recruited.includes(heroId)||!g||!GEAR_ERAS.includes(era)||!bossGearState(s).owned.includes(id))return false;if(s.heroes.some(other=>other!==h&&Object.values(other.guardianGear||{}).some(v=>v?.id===id)))return false;h.guardianGear??={};h.guardianGear[g.slot]={id,era};syncBossGear(s);return true;}
export function unequipBossGear(s,heroId,slot){if(s.mode==='battle'||!s.recruited.includes(heroId)||!GEAR_SLOTS.includes(slot))return false;const h=s.heroes[heroId];if(h.guardianGear)delete h.guardianGear[slot];syncBossGear(s);return true;}
export function gearDamage(b,caster,target,amount,{tech,core,physical,dot,secondary}={}){if(dot||secondary)return amount;core=tech?.core||core;let bonus=0,resist=0;for(const t of caster?.guardianTraits||[]){if(t.era==='origin'&&physical&&target.armor>0)bonus+=.04;if(t.era==='present'&&core===t.core)bonus+=.04;if(t.era==='aftermath'&&target.status?.exposed)bonus+=.04;}for(const t of target.guardianTraits||[])if(core===t.core)resist+=.06;return amount*(1+Math.min(.12,bonus))*(1-Math.min(.18,resist));}
const hasRule=(h,id)=>h?.guardianTraits?.some(t=>t.id===id);
const ruleEvent=(b,h,label,extra={})=>b.event({type:'guardian-reward',actor:h,label,...extra});
export function guardianGearGuard(b,h){
 if(hasRule(h,'guardian-4'))h.status.rainbellListening=7;
 if(hasRule(h,'guardian-8')){
  const allies=b.heroes.filter(a=>a!==h&&a.hp>0&&!a.withdrawn).map(a=>({a,d:Math.hypot(a.x-h.x,a.y-h.y)})).filter(v=>v.d>=4&&v.d<=8).sort((a,z)=>z.d-a.d);
  if(allies[0]){allies[0].a.status.conduitShelter=7;ruleEvent(b,h,'A separated voice is sheltered · '+allies[0].a.name,{target:allies[0].a});}
 }
}
export function guardianGearIncoming(b,caster,target,amount,{dot=false,secondary=false,core=null,tech=null}={}){
 if(dot||secondary||!b.heroes.includes(target)||!b.enemies.includes(caster))return amount;
 if(target.status.conduitShelter){delete target.status.conduitShelter;amount*=.5;ruleEvent(b,target,'The separated conduit catches half the strike');}
 if(hasRule(target,'guardian-4')&&target.status.guard&&target.status.rainbellListening){
  delete target.status.rainbellListening;
  b.damage(target,caster,Math.max(1,amount*.5),{core:tech?.core||core||'ward',secondary:true,color:'#c5dec9'});
  ruleEvent(b,target,'Rainbell answers the guarded strike',{target:caster});
 }
 return amount;
}
export function guardianGearPersonal(b,h,tech,targets){
 if(!tech?.personal)return;
 const foes=targets.filter(t=>b.enemies.includes(t)&&t.hp>0&&!t.withdrawn);
 h.guardianUses??={};
 if(hasRule(h,'guardian-16')&&!h.guardianUses.containedWave){
  const target=foes.find(t=>t.intent&&['line','rails','cross','ring','cleave','pair','burst'].includes(t.intent.shape));
  if(target){
   h.guardianUses.containedWave=true;const i=target.intent;i.shape='burst';i.radius=1;i.points=undefined;i.disabledChannels=undefined;
   i.counterplay='The Mountain brace contains this wave to the small fixed circle. Leave it before impact.';i.label='Contained wave · '+i.label;
   ruleEvent(b,h,'Mountain Rest contains the charged wave',{target});
  }
 }
 if(hasRule(h,'guardian-24')&&foes[0]){foes[0].gearAnswer={owner:h.id,core:tech.core,until:b.time+8};ruleEvent(b,h,'An unfinished answer waits for another crew member',{target:foes[0]});}
}
export function guardianGearAnswer(b,caster,target,{core=null,dot=false,secondary=false}={}){
 const answer=target.gearAnswer;if(!answer||dot||secondary||!b.heroes.includes(caster))return;
 if(answer.until<b.time){delete target.gearAnswer;return;}
 if(caster.id===answer.owner||(core||'physical')===answer.core)return;
 delete target.gearAnswer;const owner=b.heroes.find(h=>h.id===answer.owner&&h.hp>0);
 for(const h of [owner,caster].filter(Boolean))h.mp=Math.min(h.maxMp,h.mp+4);
 ruleEvent(b,caster,'The answered phrase restores four MP to both voices',{target});
}
// Discoveries cross histories; ownership, stats, equipment, claims and story flags do not.
export function inheritBossPatterns(previous,next){const p=bossGearState(previous),q=bossGearState(next);for(const id of p.patterns)if(BOSS_GEAR.some(g=>g.id===id)&&!q.patterns.includes(id))q.patterns.push(id);return q.patterns;}
export function reforgeInheritedGear(s,id){const p=bossGearState(s),g=BOSS_GEAR.find(g=>g.id===id);if(s.mode==='battle'||!g||!p.patterns.includes(id)||p.owned.includes(id)||s.chapter<Math.min(g.chapter,6)||!s.story?.weapon)return false;const cost=40+g.chapter*5;if(s.gold<cost)return false;s.gold-=cost;p.owned.push(id);return true;}
export const BOSS_ERA_ARMAMENTS={origin:{name:'Founding plate',hp:.95,armor:1.15,power:.95},present:{name:'Worn command plate',hp:1,armor:1,power:1},aftermath:{name:'Rebuilt open frame',hp:1.08,armor:.8,power:1}};
export function applyBossEra(enemy,era='present'){if(!enemy.boss)return;era=GEAR_ERAS.includes(era)?era:'present';const p=BOSS_ERA_ARMAMENTS[era];enemy.timelineBase??={maxHp:enemy.maxHp,maxArmor:enemy.maxArmor,power:enemy.power};const base=enemy.timelineBase,health=enemy.maxHp?enemy.hp/enemy.maxHp:1,armor=enemy.maxArmor?enemy.armor/enemy.maxArmor:0;enemy.maxHp=Math.round(base.maxHp*p.hp);enemy.hp=Math.round(enemy.maxHp*health);enemy.maxArmor=Math.round(base.maxArmor*p.armor);enemy.armor=Math.round(enemy.maxArmor*armor);enemy.power=base.power*p.power;enemy.armament=p.name;enemy.gearEra=era;}
