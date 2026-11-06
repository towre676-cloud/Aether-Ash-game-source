/** Reversible item disciplines shared by every character; no class locks or free consumables. */
export const APPROACHES=[
 {id:'weatherwright',name:'Weatherwright',core:'volt',items:['tideFlask','thunderPin','emberBomb'],text:'Elemental setup supplies hold wet, burn, slow or exposed for 2 extra seconds, giving allies time to combine them.'},
 {id:'saboteur',name:'Saboteur',core:'earth',items:['shatterCharge','duskInk','breakerChime'],text:'Armor-breaking and interrupting supplies expose affected enemies for 5 seconds. Follow with Shade or a partner’s strike.'},
 {id:'courier',name:'Relay runner',core:'gale',items:['clockOil','clockSand','rallyWhistle'],text:'Tempo supplies return 25% of your readiness. Pass turns around the crew instead of racing for damage.'},
 {id:'glasskeeper',name:'Glasskeeper',core:'ward',items:['glazeWard','wardPearl','emberBomb'],text:'While shielded, an incoming direct hit spends 12 shield to reflect 20% of its raw force once. Heat and glaze still change your defenses.'},
 {id:'reclaimer',name:'Reclaimer',core:'frost',items:['frostShard','echoSponge','tideFlask'],text:'An offensive supply that affects an enemy recovers 4 MP. Convert a finite bag into casting opportunities.'},
 {id:'witness',name:'Witness',core:'shade',items:['greenPoultice','clearSalt','duskInk'],text:'A remedy that actually clears a harmful condition exposes the nearest enemy for 5 seconds. Rescue creates an opening.'}
];
export const approachFor=h=>APPROACHES.find(a=>a.id===h?.battleApproach);
export function setApproach(s,id,key){if(s.mode==='battle'||!s.heroes?.[id]||!APPROACHES.some(a=>a.id===key))return false;s.heroes[id].battleApproach=key;return true;}
export function approachSupply(b,actor,item,targets,before){const a=approachFor(actor);if(!a)return;let changed=false;const foes=targets.filter(t=>b.enemies.includes(t)&&t.hp>0);
 if(a.id==='weatherwright')for(const t of foes)for(const k of ['wet','burn','slow','exposed'])if(t.status[k]>0){t.status[k]=Math.min(12,t.status[k]+2);changed=true;}
 if(a.id==='saboteur'&&['shatter','interruptAll'].includes(item.effect))for(const t of foes){t.status.exposed=Math.max(t.status.exposed||0,5);changed=true;}
 if(a.id==='courier'&&['haste','hasteAll','delayAll','rally','slowAll'].includes(item.effect)){actor.atb=Math.min(1,actor.atb+.25);changed=true;}
 if(a.id==='reclaimer'&&targets.some(t=>b.enemies.includes(t))){const old=actor.mp;actor.mp=Math.min(actor.maxMp,actor.mp+4);changed=actor.mp>old;if(changed)b.event({type:'resource',actor,resource:'MP',amount:actor.mp-old});}
 if(a.id==='witness'&&['cleanse','cleanseAll','healCleanse','cool','insulate'].includes(item.effect)&&b.heroes.some(h=>{const old=before.get(h.id);return old&&['burn','slow','wet','shock','exposed','brittle','stagger'].some(k=>old[k]>0&&!h.status[k]);})){const t=[...b.livingEnemies].sort((x,y)=>Math.hypot(x.x-actor.x,x.y-actor.y)-Math.hypot(y.x-actor.x,y.y-actor.y))[0];if(t){t.status.exposed=Math.max(5,t.status.exposed||0);changed=true;}}
 if(changed)b.event({type:'reaction',reaction:'approach',label:a.name,actor,source:actor,core:a.core});
}
export function approachReflection(b,caster,target,amount){if(approachFor(target)?.id!=='glasskeeper'||!caster||caster.hp<=0||(target.status.shield||0)<12)return null;target.status.shield-=12;b.event({type:'reaction',reaction:'glass-return',label:'Glass return',actor:target,source:target,core:'ward'});return {target:caster,amount:Math.round(amount*.2),core:'ward',reaction:'glass-return'};}
