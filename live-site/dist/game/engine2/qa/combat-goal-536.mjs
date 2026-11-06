import {Battle,makeEnemy} from '../battle.js?v=5.38';
import {defaultHero} from '../mako.js?v=5.16.0';
import {mountObjectiveUI} from '../objective-ui.js?v=5.36.0';
import {mountBattleFlow} from '../battle-flow.js?v=5.38';
import {mountBattleLayout} from '../battle-layout.js?v=5.36.0';

/** Canonical objective-UI setup, isolated from all journey and storage modules.
 * Two native Record commands seed distinct real patterns. Readiness is then
 * held at one for acceptance checks; no elapsed battle time is invented. */
export function createControlledGoalBattle(){
  const hero=defaultHero(1),enemy=makeEnemy('predator',1);
  Object.assign(hero,{x:2.5,y:3.5});Object.assign(enemy,{x:5.5,y:3.5});
  const context={reinforcementLimit:0,objective:{
    id:'controlled-goal-536',kind:'regulator',label:'Controlled regulator',
    asset:{id:'fixture-regulator',name:'Working regulator',x:3.5,y:3.5,hp:300,maxHp:300},
    floor:Array.from({length:10},()=>'.'.repeat(18)),route:[],
    safeNodes:[{id:'east',label:'East approach',x:4.5,y:3.5},{id:'north',label:'North approach',x:3.5,y:1.5}],
    required:3,deadline:90,stableTime:3,pressure:70,
    provenance:['Controlled acceptance setup; no journey history is loaded.']
  }};
  const battle=new Battle({heroes:[hero],enemies:[enemy],chapter:1,context,rng:()=>.5});
  for(const shape of ['line','burst']){
    hero.atb=1;
    enemy.intent={kind:'objective-sabotage',shape,target:battle.objective.asset.id,targetKind:'objective',objectiveId:battle.objective.id,
      x:3.5,y:3.5,fromX:5.5,fromY:3.5,left:2,total:2,power:15,label:'Controlled '+shape+' charge'};
    if(!battle.command(hero.id,'instrument',enemy.id,{action:'record'}))throw Error('Controlled native Record setup failed.');
  }
  hero.atb=1;
  return {battle,hero,enemy};
}

function mountControlledGoalFixture(){
  const {battle,hero,enemy}=createControlledGoalBattle(),world={state:{xp:0},activeHeroes:[hero]};
  const menu=document.querySelector('#spell-menu'),receipt=document.querySelector('#fixture-receipt'),party=document.querySelector('#party');
  let target=enemy.id,goalUI,layout,lastCommand=null,refreshQueued=false;
  const card=document.createElement('button');card.type='button';card.className='party-card selected ready';card.dataset.hero=hero.id;
  card.innerHTML='<strong><em></em><small></small></strong><span class="hp-text"></span><i class="hp"><b></b></i><span class="mp-text"></span><i class="atb"><b></b></i>';
  card.onclick=()=>refresh();party.append(card);
  const flow=mountBattleFlow({getBattle:()=>battle,getWorld:()=>world,getTarget:()=>target,setTarget:id=>{target=id;refresh();},storage:null});
  layout=mountBattleLayout();
  function queueRefresh(){if(refreshQueued)return;refreshQueued=true;queueMicrotask(()=>{refreshQueued=false;refresh();});}
  function describe(){
    const decoy=battle.instruments.decoy,pattern=decoy&&battle.instruments.patterns.find(p=>p.id===decoy.patternId);
    const lines=['Controlled Goal fixture · no journey saves · time '+battle.time.toFixed(1)+'s',
      hero.name+' readiness '+Math.round(hero.atb*100)+'% · retained patterns '+battle.instruments.patterns.length+' · replay uses '+battle.instruments.replayUses];
    if(lastCommand)lines.push('Native command '+lastCommand.system+'/'+lastCommand.action+': '+(lastCommand.accepted?'accepted':'rejected')+(lastCommand.patternId?' · '+lastCommand.patternId:'')+(lastCommand.nodeId?' · '+lastCommand.nodeId:''));
    if(decoy)lines.push('Native decoy: '+pattern.name+' at ('+decoy.x+', '+decoy.y+') · '+decoy.charges+' charge');
    return lines.join('\n');
  }
  function refresh(){
    card.classList.toggle('ready',hero.atb>=1);card.setAttribute('aria-pressed','true');
    card.setAttribute('aria-label',hero.name+' HP '+Math.ceil(hero.hp)+' of '+hero.maxHp+', MP '+Math.floor(hero.mp)+' of '+hero.maxMp);
    card.querySelector('em').textContent=hero.name;card.querySelector('strong small').textContent='Lv '+hero.level;
    card.querySelector('.hp-text').textContent=Math.ceil(hero.hp)+' / '+hero.maxHp+' HP';card.querySelector('.mp-text').textContent=Math.floor(hero.mp)+' MP';
    card.querySelector('.hp b').style.width=Math.max(0,hero.hp/hero.maxHp*100)+'%';card.querySelector('.atb b').style.width=Math.min(100,hero.atb*100)+'%';
    document.querySelector('#ready-name').textContent=hero.name+(hero.atb>=1?' is ready · controlled time held':' · action spent · reset fixture to repeat');
    document.querySelector('#target-name').textContent=enemy.name+' · '+Math.ceil(enemy.hp)+' HP';
    document.querySelector('#cmd-attack').disabled=document.querySelector('#cmd-guard').disabled=hero.atb<1||!!battle.ended;
    flow.draw();goalUI?.update();layout.measure();
    const text=describe();receipt.textContent=text;
    if(window.parent!==window)window.parent.postMessage({type:'controlled-goal-536',text},location.origin);
  }
  function command(request){
    const accepted=battle.command(hero.id,request.system,target,request);
    lastCommand={...request,accepted};queueRefresh();return accepted;
  }
  goalUI=mountObjectiveUI({getBattle:()=>battle,getActor:()=>hero,getTarget:()=>battle.livingEnemies.find(e=>e.id===target),onCommand:command,
    onRefresh:queueRefresh,onNotice:text=>{const notice=document.querySelector('#notice');notice.textContent=text;notice.hidden=false;}});
  document.querySelector('#cmd-attack').onclick=()=>command({system:'attack',action:'attack'});
  document.querySelector('#cmd-guard').onclick=()=>command({system:'guard',action:'guard'});
  document.querySelector('#menu-button').onclick=()=>location.reload();
  // No requestAnimationFrame, advance(), timer or persistence: only native
  // command callbacks mutate this controlled battle after the setup above.
  refresh();
  window.addEventListener('pagehide',()=>layout.destroy(),{once:true});
}

if(typeof document!=='undefined')mountControlledGoalFixture();
