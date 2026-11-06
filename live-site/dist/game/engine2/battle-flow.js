import {combatAdvice,createCombatAnnouncer} from './combat-advice.js?v=5.38';
import {fieldLabel} from './battlefield.js?v=5.18.0';
import {shellLabel,MATERIALS} from './environment-shells.js?v=5.3.0';
import {availablePoints} from './skill-grid-model.js?v=5.16.0';
import {bossPresentation} from './boss-patterns.js?v=5.16.0';
export function growth(xp){const level=Math.min(45,1+Math.floor(Math.sqrt(Math.max(0,xp)/65))),floor=65*(level-1)**2,next=65*level**2;return {level,value:level===45?1:Math.max(0,Math.min(1,(xp-floor)/(next-floor))),remaining:level===45?0:next-xp};}
export function mastery(ap){const floor=ap>=120?120:ap>=35?35:0,next=ap>=120?120:ap>=35?120:35;return {rank:ap>=120?3:ap>=35?2:1,value:ap>=120?1:(ap-floor)/(next-floor),remaining:next-ap};}
export function autoAttack(battle,targetId=null){if(!battle||battle.ended)return;for(const h of [...battle.ready]){const t=battle.livingEnemies.find(e=>e.id===targetId)||battle.livingEnemies[0];if(t)battle.command(h.id,'attack',t.id);}}
/** Reuse the target card's existing two lines; no additional battle overlay. */
export function enemyBattleReadout(battle,enemy){
 const boss=enemy.boss?bossPresentation(enemy,battle?.chapter||1):null;
 const phase=boss?'Phase '+(boss.phaseIndex+1)+' · '+boss.phaseName:'';
 const tell=enemy.intent?(enemy.intent.guardianRule?(boss?.tell||enemy.intent.label):(boss?.sequence?.[enemy.intent.bossMove]||boss?.tell||enemy.intent.label))+' · '+Math.max(0,enemy.intent.left).toFixed(1)+'s':boss?.recovering?'Recovery · exposed for '+boss.recoveryLeft.toFixed(1)+'s':fieldLabel(battle,enemy)?'Carries '+fieldLabel(battle,enemy):enemy.engagement?.closing?'Closing distance · prepare your response':enemy.armor>0?'Armored · wear it down':'Watching the crew';
 return {phase,tell};
}
const MODE_KEY='ash-aether-battle-mode';
/** Wait freezes the entire simulation, including auto commands and goal clocks,
 * only while an action picker is open and a crew member is ready. An early
 * picker cannot prevent readiness from charging. The command view remains live. */
export function createBattlePacing({storage=null}={}){
 let mode='wait';try{if(storage?.getItem(MODE_KEY)==='active')mode='active';}catch{}
 return {get mode(){return mode;},setMode(value){if(!['wait','active'].includes(value))return false;mode=value;try{storage?.setItem(MODE_KEY,mode);}catch{}return true;},
 step(battle,dt,{choosing=false,speed=1,auto=false,targetId=null,onAutoAttack=null}={}){
  const paused=!!battle&&!battle.ended&&mode==='wait'&&choosing&&battle.ready.length>0;
  if(!battle||battle.ended||paused)return {paused};
  const pace=[1,1.5,2].includes(speed)?speed:1;
  for(let t=0;t<pace;t++){battle.advance(dt*Math.min(1,pace-t));if(battle.ended)break;}
  const nowWaiting=!battle.ended&&mode==='wait'&&choosing&&battle.ready.length>0;
  if(auto&&!nowWaiting)(onAutoAttack||autoAttack)(battle,targetId);return {paused:nowWaiting,dt:dt*pace};
 }};
}
export function mountBattleFlow({getBattle,getWorld,getTarget,setTarget,onGrowth=null,onAutoAttack=null,onAutoChange=null,storage=null}){
 const panel=document.createElement('section');panel.id='battle-flow';panel.setAttribute('aria-label','Battle pace and progression');document.querySelector('#commands').prepend(panel);
 panel.innerHTML=`<div class="battle-topline"><span class="eyebrow">RESONANCE / BATTLE RHYTHM</span><div class="pace"><label><span class="sr-only">Battle pace</span><select aria-label="Battle pace"><option value="1">1× Tactical</option><option value="1.5">1.5× Swift</option><option value="2">2× Fast</option></select></label><label><span class="sr-only">Decision timing</span><select aria-label="Decision timing"><option value="wait">Wait while choosing</option><option value="active">Active battle</option></select></label><button type="button" aria-pressed="false">Auto attack: Off</button></div></div><span class="decision-pause" role="status" hidden>Decision time · paused</span><div class="enemy-list"></div><div class="turn-ribbon" aria-label="Action readiness"></div><p class="combat-advice" hidden></p><span class="combat-announcement sr-only" role="status" aria-live="polite" aria-atomic="true"></span><details class="growth-details"><summary><span>CREW GROWTH</span><span class="xp-summary"></span></summary><div class="growth"></div></details>`;
 if(onGrowth){const route=document.createElement('button');route.className='growth-route';route.textContent='View Resonance Paths ↗';route.onclick=onGrowth;panel.querySelector('.growth-details').append(route);}
 const announcer=createCombatAnnouncer(),pacing=createBattlePacing({storage});const mode=panel.querySelector('[aria-label="Decision timing"]');mode.value=pacing.mode;mode.onchange=e=>pacing.setMode(e.target.value);
 let speed=1,auto=false,last='';const button=panel.querySelector('.pace button');function setAuto(value){auto=!!value;button.textContent='Auto attack: '+(auto?'On':'Off');button.setAttribute('aria-pressed',String(auto));onAutoChange?.(auto);}button.onclick=()=>setAuto(!auto);panel.querySelector('select').onchange=e=>speed=Number(e.target.value);
 return {setAuto,step(dt,{choosing=false}={}){const b=getBattle(),state=pacing.step(b,dt,{choosing,speed,auto,targetId:getTarget(),onAutoAttack}),cue=panel.querySelector('.decision-pause');cue.hidden=!choosing||!b||!!b.ended;const text=state.paused?'Decision time · paused':pacing.mode==='wait'?'Readiness charging · battle live':'Active mode · battle live';if(cue.textContent!==text)cue.textContent=text;return state;},draw(){const w=getWorld(),b=getBattle();if(!w)return;const g=growth(w.state.xp);panel.querySelector('.xp-summary').textContent=`Lv ${g.level} · ${g.remaining?g.remaining+' XP to grow':'MAX'}`;
 const html=`<div class="party-growth"><strong>Level ${g.level}</strong><progress max="1" value="${g.value}" aria-label="Party experience"></progress></div>`+w.activeHeroes.map(h=>`<div class="mastery-row"><strong>${h.name}${w.state.heroes?'<small>'+availablePoints(w.state,h.id)+' growth</small>':''}</strong>`+[...new Set(h.loadout.map(s=>s.core))].map(core=>{const m=mastery(h.ap[core]||0);return `<span class="mastery-chip">${core} <b>R${m.rank}</b><progress max="1" value="${m.value}" aria-label="${h.name} ${core} mastery"></progress><small>${m.rank===3?'MASTERED':m.remaining+' AP to rank up'}</small></span>`;}).join('')+'</div>').join('');if(html!==last){panel.querySelector('.growth').innerHTML=html;last=html;}
 const list=panel.querySelector('.enemy-list'),alive=b?.livingEnemies||[];for(const p of [...list.children])if(!alive.some(e=>e.id===p.dataset.enemy))p.remove();for(const e of alive){let p=[...list.children].find(p=>p.dataset.enemy===e.id);if(!p){p=document.createElement('button');p.dataset.enemy=e.id;p.innerHTML='<span class="enemy-heading"><strong></strong><small></small></span><progress class="enemy-health"><\/progress><span class="enemy-shell"></span><span class="enemy-intent"></span><i class="intent-track"><b></b></i>';p.onclick=()=>setTarget(e.id);list.append(p);}p.className=e.id===getTarget()?'selected':'';p.setAttribute('aria-pressed',String(e.id===getTarget()));p.querySelector('strong').textContent=e.name;p.querySelector('small').textContent=Math.ceil(e.hp)+' / '+e.maxHp+(e.boss&&e.gearEra&&e.gearEra!=='present'?' · '+e.armament:'');p.querySelector('progress').max=e.maxHp;p.querySelector('progress').value=e.hp;p.querySelector('progress').setAttribute('aria-label',e.name+' health');const readout=enemyBattleReadout(b,e);p.querySelector('.enemy-shell').textContent=[readout.phase,fieldLabel(b,e),shellLabel(e)].filter(Boolean).join(' · ');p.querySelector('.enemy-shell').title=[readout.phase,MATERIALS[e.shell?.material]?.hint].filter(Boolean).join(' · ');p.querySelector('.enemy-shell').setAttribute('aria-label',[readout.phase,shellLabel(e),MATERIALS[e.shell?.material]?.hint].filter(Boolean).join(' · '));p.querySelector('.enemy-intent').textContent=readout.tell;p.querySelector('.enemy-intent').title=readout.tell;p.querySelector('.intent-track b').style.width=(e.intent?100*(1-e.intent.left/e.intent.total):0)+'%';p.classList.toggle('charging',!!e.intent);}
 const advice=panel.querySelector('.combat-advice'),tip=combatAdvice(b,alive.find(e=>e.id===getTarget())||alive[0],{state:w.state,skills:w.data?.skills});advice.hidden=!tip;if(tip){if(advice.textContent!==tip.text)advice.textContent=tip.text;advice.classList.toggle('urgent',tip.urgent);advice.setAttribute('aria-label',tip.label+' tactical advice');}
 const announcement=announcer.next(b,tip),channel=panel.querySelector('.combat-announcement');if(announcement!==null&&channel.textContent!==announcement)channel.textContent=announcement;
 const ribbon=panel.querySelector('.turn-ribbon');ribbon.replaceChildren();for(const h of b?.heroes||[]){const c=document.createElement('span');c.className=h.hp<=0?'fallen':h.atb>=1?'charged':'';c.textContent=h.name+' '+(h.hp<=0?'DOWN':h.atb>=1?'READY':Math.round((h.atb||0)*100)+'%');ribbon.append(c);}
 }};
}
