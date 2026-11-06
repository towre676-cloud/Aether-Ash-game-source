import {assistanceMode,setAssistanceMode,questHint,guidanceDestinations,musicDestinations} from './quest-assistance.js?v=5.18.0';
import {journeyPurpose} from './campaign-purpose.js?v=5.18.0';
import {cityAnswerView} from './city-answer.js?v=5.18.0';

/** Walking support is always available, independently of how much solution help is wanted. */
export function mountJourneyHelp({objective,getWorld,getGuide,getGoal,onChange=()=>{},onTravel=()=>{},onNotice=()=>{},onRecord=()=>{}}){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const game=objective.closest('#game'),wrap=el('div');wrap.className='journey-objective';objective.before(wrap);wrap.append(objective);
 const actions=el('div');actions.className='journey-help';const hint=el('button','Clues & destinations'),full=el('button');hint.type=full.type='button';hint.setAttribute('aria-expanded','false');hint.setAttribute('aria-controls','journey-help-panel');actions.append(hint,full);wrap.append(actions);
 const panel=el('section');panel.id='journey-help-panel';panel.className='journey-help-panel';panel.hidden=true;panel.setAttribute('aria-label','Journey guidance');wrap.append(panel);
 let key='',blocked=false;
 function setOpen(open){panel.hidden=!open;hint.setAttribute('aria-expanded',String(open));game?.classList.toggle('journey-guidance-open',open);}
 function close(){setOpen(false);}
 function paint(){
  const world=getWorld();if(!world)return;const goal=getGoal(),help=questHint(world,{goal}),purpose=journeyPurpose(world.state),city=cityAnswerView(world.state);panel.replaceChildren();
  const reason=el('section');reason.className='journey-purpose';reason.setAttribute('aria-label','Why this matters');
  const purposeLabel=el('small','WHY THIS MATTERS');purposeLabel.className='hint-stages';
  reason.append(purposeLabel,el('h3',purpose.title),el('p',purpose.why));
  const promise=el('p',purpose.lead.name+' · '+purpose.promise);promise.className='journey-promise';reason.append(promise);panel.append(reason);
  const stage=el('small',help.stage?'HINT '+help.stage+' OF 3':'EXPLORE AT YOUR PACE');stage.className='hint-stages';panel.append(stage,el('h3',help.title),el('p',help.text));
  const row=el('div');row.className='hint-actions';const next=el('button',help.stage?'A stronger hint':'Give me a clue');next.type='button';next.disabled=!help.canAdvance;next.onclick=()=>{const value=questHint(world,{advance:true,goal});onRecord('hint',{stage:value.stage});onChange();paint();};const done=el('button','Close');done.type='button';done.onclick=()=>{close();hint.focus();};row.append(next,done);panel.append(row);
  const destinationKey=d=>[d.scene,d.object.type,d.object.xy?.join(','),d.object.sequence_address,d.object.bellArc,d.object.exploreId,d.object.legacyId,d.object.networkId,d.object.networkStage].join(':');
  const destinations=[...(goal?.object?.type==='note'?musicDestinations(world,goal.object):[]),...guidanceDestinations(world)].filter((d,i,a)=>a.findIndex(v=>destinationKey(v)===destinationKey(d))===i);
  if(destinations.length){
   const label=el('label',goal?.object?.type==='note'?'Choose a sound, person or working object':'Walk to a person or working object');const select=el('select');select.id='journey-destination';label.htmlFor=select.id;select.setAttribute('aria-label',label.textContent);
   destinations.forEach((d,i)=>{const option=el('option',d.label);option.value=String(i);select.append(option);});
   const go=el('button','Walk there');go.type='button';go.onclick=()=>{const destination=destinations[Number(select.value)];if(!destination)return;onRecord('destination',{label:destination.label});onTravel();getGuide()?.visit(destination);close();onNotice('Following a route to '+destination.label+'.');onChange();};panel.append(label,select,go);
  }
  if(city.contributions.length||world.state.chapter>=23){
   const answers=el('details');answers.className='journey-city-answers';answers.append(el('summary',city.title),el('p',city.summary));
   if(city.contributions.length){const list=el('ul');for(const contribution of city.contributions){const item=el('li');item.append(el('strong',contribution.label),el('span',contribution.detail));if(contribution.sourceLabels?.length)item.append(el('span','From: '+contribution.sourceLabels.join('; ')+'.'));list.append(item);}answers.append(list);}
   panel.append(answers);
  }
  const note=el('p','Both guidance modes walk the route for you. Full assistance also follows remembered musical phrases. Conversations and story choices remain yours.');note.className='help-note';panel.append(note);
 }
 hint.onclick=()=>{if(blocked)return;setOpen(panel.hidden);if(!panel.hidden)paint();};
 full.onclick=()=>{const world=getWorld();if(!world||blocked)return;const mode=assistanceMode(world.state)==='full'?'destination':'full';setAssistanceMode(world.state,mode);if(mode==='full'&&getGuide()?.held&&getGuide()?.status?.reason==='destination')getGuide().resume();onRecord('assistance',{mode});onNotice(mode==='full'?'Full assistance enabled. The guide can carry you through the route and musical phrases.':'Destination guidance enabled. Walking support remains available.');key='';onChange();paint();};
 panel.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){close();hint.focus();}});
 return {update({hidden=false}={}){blocked=hidden;wrap.classList.toggle('journey-help-blocked',hidden);if(hidden)close();const world=getWorld();if(!world)return;const mode=assistanceMode(world.state);full.textContent=mode==='full'?'Full assistance · on':'Full assistance';full.setAttribute('aria-pressed',String(mode==='full'));const goal=getGoal(),nextKey=world.state.scene+':'+world.state.chapter+':'+goal?.label+':'+mode+':'+JSON.stringify(world.state.answeringNetwork);if(key!==nextKey){key=nextKey;if(!panel.hidden)paint();}},close,destroy(){close();wrap.before(objective);wrap.remove();}};
}
