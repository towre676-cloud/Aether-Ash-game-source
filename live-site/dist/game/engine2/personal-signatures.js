/** Character-specific actions ride the existing paid personal-art command.
 * Echoes, field ticks and counter repeats never mint another signature use. */
export const PERSONAL_SIGNATURES=Object.freeze([
 {id:'courier-opening',name:'Pass the opening',detail:'A personal hit marks one foe for eight seconds. Another crew member’s next direct hit spends that opening to advance their next action by 35%.'},
 {id:'field-triage',name:'Field triage',detail:'Restorative personal arts remove one harmful condition. A patient below 40% HP before treatment also receives a protective shield.'},
 {id:'working-brace',name:'Make it useful',detail:'The first personal hit on an armored foe each encounter strips a piece of armor into a two-use shared brace. If there is no material pool, Rook receives its protection directly.'},
 {id:'held-crossing',name:'Hold the crossing',detail:'A personal art readies Brass to intercept 40% of one direct hit on an ally within two and a half tiles during the next eight seconds.'},
 {id:'carried-current',name:'Carry the current',detail:'A personal art dries wet allies within three tiles and shields them. An offensive art carries that water onto the struck foe.'},
 {id:'borrowed-tempo',name:'Borrow the wind',detail:'A personal art clears nearby allies’ slow. Haste stripped from a struck foe becomes four seconds of haste for crew within three tiles.'},
 {id:'remembered-voice',name:'Keep the answer',detail:'A personal hit reads a charging foe’s element and delays that charge once by 0.6 seconds. Veyr’s next ordinary attack carries the remembered element.'}
]);
const alive=a=>a&&a.hp>0&&!a.withdrawn;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const runtime=h=>h.personalState??={};
const valid=(h,t)=>t?.personal===true&&t.signatureId===PERSONAL_SIGNATURES[h.id]?.id;
const emit=(b,h,label,extra={})=>b.event({type:'personal-signature',actor:h,label,...extra});
const harmful=['burn','shock','slow','exposed','wet'];
const elements=new Set(['earth','flame','tide','frost','volt','gale','gravity','shade','ward','mend']);

export function signatureMetadata(heroId){const s=PERSONAL_SIGNATURES[heroId];return s?{signatureId:s.id,signatureName:s.name,signatureDetail:s.detail}:{};}
export function personalBefore(h,tech,targets){return valid(h,tech)?targets.map(t=>({id:t.id,hp:t.hp,armor:t.armor||0})):null;}

export function finishPersonalArt(b,h,tech,targets,before){
 if(!before||!valid(h,tech)||!alive(h))return;
 const foes=targets.filter(t=>b.enemies.includes(t)),crew=b.heroes.filter(a=>alive(a)&&distance(a,h)<=3),own=runtime(h);
 if(h.id===0){
  const target=foes.find(alive);if(target){target.courierOpening={owner:h.id,until:b.time+8};emit(b,h,'Opening passed · another crew member can follow through',{target});}
 }else if(h.id===1&&tech.healing){
  for(const target of targets.filter(alive)){
   const condition=harmful.find(key=>target.status?.[key]);if(condition)delete target.status[condition];
   const critical=(before.find(p=>p.id===target.id)?.hp??target.hp)<target.maxHp*.4;
   if(critical)target.status.shield=Math.min(300,(target.status.shield||0)+Math.ceil(target.maxHp*.12));
   if(condition||critical)emit(b,h,'Triage · '+target.name+(condition?' cleared '+condition:'')+(critical?' · protected through recovery':''),{target});
  }
 }else if(h.id===2&&!own.braceMade){
  const target=foes.find(t=>(before.find(p=>p.id===t.id)?.armor||0)>0);
  if(target){
   const loss=Math.min(target.armor||0,Math.max(12,h.magic*.45));target.armor=Math.max(0,(target.armor||0)-loss);own.braceMade=true;
   if(b.field?.enabled&&b.field.props.length<18){
    const prop={id:'personal-brace-'+h.id,type:'plank',name:'Rook’s recovered brace',x:h.x,y:h.y,uses:2,maxUses:2,ownerId:null,source:'Rook’s personal art · recovered from '+target.name,condition:'loose'};
    if(!b.field.props.some(p=>p.id===prop.id))b.field.props.push(prop);
    emit(b,h,'Armored scrap becomes a two-use shared brace',{target,prop});
   }else{h.status.shield=Math.min(300,(h.status.shield||0)+Math.max(18,Math.round(h.magic*.7)));emit(b,h,'Recovered armor becomes a personal brace',{target});}
  }
 }else if(h.id===3){h.status.signatureCover=8;emit(b,h,'Brass holds the crossing · nearby allies can shelter behind him');}
 else if(h.id===4){
  let carried=0;for(const ally of crew)if(ally.status.wet){delete ally.status.wet;ally.status.shield=Math.min(300,(ally.status.shield||0)+Math.max(12,Math.round(h.magic*.45)));carried++;}
  if(carried){const target=foes.find(alive);if(target)target.status.wet=7;emit(b,h,'Riven carries the water away from '+carried+' crew'+(target?' and onto '+target.name:''),{target});}
 }else if(h.id===5){
  let captured=false,cleared=0;for(const target of foes)if(target.status.haste){delete target.status.haste;captured=true;}
  for(const ally of crew){if(ally.status.slow){delete ally.status.slow;cleared++;}if(captured)ally.status.haste=Math.max(ally.status.haste||0,4);}
  if(captured||cleared)emit(b,h,captured?'Mira turns the enemy’s tempo into a crew tailwind':'Mira clears the crew’s slowed steps');
 }else if(h.id===6){
  const target=foes.find(t=>alive(t)&&t.intent&&elements.has(t.intent.core));
  if(target){
   own.borrowedCore=target.intent.core;
   if(!target.intent.voiceRead){target.intent.voiceRead=true;target.intent.left+=.6;target.intent.total+=.6;}
   emit(b,h,'Veyr remembers '+own.borrowedCore+' for the next ordinary strike',{target});
  }
 }
}

export function consumePersonalAttack(h){const s=runtime(h),core=s.borrowedCore;if(h.id!==6||!elements.has(core))return null;delete s.borrowedCore;return core;}

export function followPersonalOpening(b,caster,target,{dot=false,secondary=false}={}){
 const mark=target.courierOpening;if(!mark||dot||secondary||!alive(caster)||!b.heroes.includes(caster))return;
 if(mark.until<b.time){delete target.courierOpening;return;}
 if(mark.owner===caster.id)return;
 delete target.courierOpening;caster.atb=Math.min(1,(caster.atb||0)+.35);
 emit(b,caster,'Courier opening carried forward · next action advances',{target});
}

export function interceptPersonalHit(b,caster,target,amount,options={}){
 if(options.dot||options.secondary||!b.heroes.includes(target)||!b.enemies.includes(caster))return amount;
 const brass=b.heroes.find(h=>h.id===3&&h!==target&&alive(h)&&h.status.signatureCover>0&&distance(h,target)<=2.5);
 if(!brass)return amount;
 delete brass.status.signatureCover;const share=amount*.4;
 b.damage(caster,brass,share,{...options,secondary:true});
 emit(b,brass,'Brass intercepts the crossing for '+target.name,{target});return amount-share;
}

export function validPersonalState(heroes=[]){return heroes.every(h=>(h.personalState===undefined||h.personalState&&typeof h.personalState==='object'&&!Array.isArray(h.personalState)&&(h.personalState.braceMade===undefined||typeof h.personalState.braceMade==='boolean')&&(h.personalState.borrowedCore===undefined||elements.has(h.personalState.borrowedCore)))&&(h.guardianUses===undefined||h.guardianUses&&typeof h.guardianUses==='object'&&!Array.isArray(h.guardianUses)&&(h.guardianUses.containedWave===undefined||typeof h.guardianUses.containedWave==='boolean')));}
