import {BOSS_GEAR,equipBossGear} from './boss-gear.js?v=5.16.0';
import {transactLivingArmory} from './living-armory/campaign.js?v=5.38';
import {APPROACHES,setApproach} from './battle-approaches.js';
import {originLedger} from './field-origins.js?v=5.38';
import {guidanceActions} from './adventure-guidance.js?v=5.16.0';
import {CREW,CORES,SUPPORTS,personalTechnique} from './mako.js?v=5.16.0';
import {techniqueIcon} from './technique-icons.js?v=5.13.0';
import {PATHS,unlockNode,nodesFor,nodeState,availablePoints} from './skill-grid-model.js?v=5.16.0';
import {SCHOOLS,learnedSchool,doctrineDescription,clearSchool} from './constellation-model.js';
import {RARE_MAKO,ownsRelic} from './wayglass-model.js?v=5.11.0';
import {equipRecipe,loomTechnique} from './recipe-loom.js?v=5.16.0';
import {RIVALS,equipRivalGear} from './npc-challenges.js?v=5.38';
import {settleCrewSetup,growthChoices,rarePlan,learnAndFitRare,learnAndWearSchool,moveSummary,matchingSchools,collectSetupUnlocks} from './crew-setup-model.js?v=5.16.0';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function crewSetup({world,data,onSave,onBack,onAdvanced,onVendor,onArmory,initialHero=null,initialMakoId=null,initialSchoolId=null,initialSection=null}){const s=world.state,root=el('section','crew-setup');let hero=s.recruited.includes(initialHero)?initialHero:s.party[0],slot=0,receipt='';
if(initialSection==='growth'&&!s.recruited.includes(initialHero)&&!growthChoices(s,hero).length)hero=s.recruited.find(id=>growthChoices(s,id).length)??hero;
const focusSection=initialSection||'growth';const commit=text=>{settleCrewSetup(s);collectSetupUnlocks(s);receipt=text;onSave();paint();};
function paint(){
 const focused=root.contains(document.activeElement)?document.activeElement:null;
 const action=focused?.dataset.quickAction,previousSection=focused?.closest('.crew-quick > section')?.dataset.setupSection;
 const h=s.heroes[hero];
 root.replaceChildren();const toolbar=el('div','crew-toolbar');for(const id of s.recruited){const b=el('button','',CREW[id].name);b.dataset.quickAction='hero:'+id;b.setAttribute('aria-pressed',String(id===hero));b.onclick=()=>{hero=id;slot=0;receipt='';paint();};toolbar.append(b);}const back=el('button','crew-return','Back to the road');back.onclick=onBack;toolbar.append(back);root.append(toolbar);const live=el('div','crew-live');live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.textContent=receipt||s.crewSetup?.recent?.[0]||'';root.append(live);
const vitals=el('div','crew-vitals');for(const text of [availablePoints(s,hero)+' growth to spend','Power '+h.power,'Magic '+h.magic,'HP '+h.hp+'/'+h.maxHp])vitals.append(el('span','',text));root.append(vitals);
const quick=el('div','crew-quick');
root.append(quick);
const moves=el('section','crew-moves');moves.append(el('h4','','Your battle moves'));if(!h.loadout.length)moves.append(el('p','','Read Rook’s first core plate to awaken your first move.'));const sockets=el('div','crew-sockets');h.loadout.forEach((x,i)=>{const t=moveSummary(s,hero,i),compiled=loomTechnique(s,hero,i,x.core,x.support),b=el('button','crew-socket'+(slot===i?' selected':''));b.append(techniqueIcon(compiled,{size:44}),el('small','','SOCKET '+(i+1)),el('strong','',t.name),el('span','',t.cost+' MP · '+t.notes.join(' · ')));b.setAttribute('aria-pressed',String(slot===i));b.onclick=()=>{slot=i;paint();};sockets.append(b);});moves.append(sockets);
const current=h.loadout[slot];if(current){const t=moveSummary(s,hero,slot),compiled=loomTechnique(s,hero,slot,current.core,current.support),flow=el('div','crew-move-flow');flow.style.setProperty('--move-color',t.color);const resultIcon=techniqueIcon(compiled,{size:52});resultIcon.style.margin='0 auto';resultIcon.style.display='inline-grid';for(const [icon,label]of [['◈',CORES.find(x=>x.id===current.core)?.name],['⌁',SUPPORTS.find(x=>x.id===current.support)?.name], [null,t.name]]){const gem=el('div');gem.append(icon?el('strong','',icon):resultIcon,el('span','',label));flow.append(gem);}moves.append(flow,el('p','crew-effect',t.notes.join(' · ')+' · Rank '+t.rank+' · '+t.cost+' MP per cast.'));
const edit=el('details','crew-edit'),summary=el('summary','','Change this move');edit.append(summary);const core=el('select'),support=el('select');core.setAttribute('aria-label','Move core');support.setAttribute('aria-label','Move support');for(const c of CORES.filter(c=>s.cores.includes(c.id)))core.add(new Option(c.name,c.id));for(const p of SUPPORTS.filter(p=>s.supports.includes(p.id)))support.add(new Option(p.name,p.id));core.value=current.core;support.value=current.support;const preview=el('p','crew-preview'),use=el('button','primary','Use this move');preview.style.display='flex';preview.style.alignItems='center';preview.style.gap='10px';function show(){const next=loomTechnique(s,hero,slot,core.value,support.value);preview.replaceChildren(techniqueIcon(next,{size:40}),el('span','',t.name+' → '+next.name+' · '+t.cost+' → '+next.cost+' MP. '+(next.healing?'Restores allies.':'Attacks enemies.')+(next.echo?' Repeats once.':'')+(next.interrupt?' Interrupts a charge.':'')));}core.onchange=show;support.onchange=show;show();use.disabled=s.mode==='battle';use.onclick=()=>{if(equipRecipe(s,hero,slot,core.value,support.value))commit(h.name+' · '+loomTechnique(s,hero,slot,core.value,support.value).name+' is ready in battle.');};edit.append(core,support,preview,use);moves.append(edit);}root.append(moves);
for(const r of RARE_MAKO.filter(r=>ownsRelic(s,r.id))){const plan=rarePlan(s,hero,r.id),already=h.loadout.some(x=>x.makoId===r.id),card=el('article','crew-rare');card.dataset.mako=r.id;card.append(el('small','crew-kicker',already?'ACTIVE RARE TRAIT':'RECOVERED MAKO'),el('h4','',r.name),el('p','',r.effect));if(already)card.append(el('p','crew-applied','✓ Applied to this companion’s move.'));else if(!plan)card.append(el('p','','Its '+r.core+' base core opens through the story.'));else{const b=el('button','primary',(plan.cost?'Learn & fit · '+plan.cost+' growth':'Fit in this socket')+' · '+(slot+1));b.disabled=!plan.ready||!h.loadout[slot]||s.mode==='battle';b.onclick=()=>{if(learnAndFitRare(s,hero,r.id,slot))commit(r.name+' learned and equipped. '+h.name+' can use its trait immediately.');};card.append(el('p','','This choice fits '+r.core+' in socket '+(slot+1)+'. '+(plan.cost?'Includes its required mastery nodes; '+plan.cost+' growth total.':'Its attunement is already learned.')),b);}root.append(card);}
const approaches=el('section','crew-growth');approaches.append(el('h4','','Battle approach · '+(APPROACHES.find(a=>a.id===h.battleApproach)?.name||'Undecided')),el('p','crew-muted','Every companion can choose any approach. These change supplies, defenses and openings in battle.'));for(const a of APPROACHES){const b=el('button','',a.name);b.title=a.text;b.setAttribute('aria-pressed',String(h.battleApproach===a.id));b.disabled=s.mode==='battle';b.onclick=()=>{if(setApproach(s,hero,a.id)){originLedger(s).roles[hero]=a.id;commit(a.name+' applied. '+a.text);}};approaches.append(b);}const currentApproach=APPROACHES.find(a=>a.id===h.battleApproach);if(currentApproach)approaches.append(el('p','crew-applied',currentApproach.text));root.append(approaches);const grow=el('section','crew-growth');grow.dataset.setupSection='growth';grow.tabIndex=-1;grow.setAttribute('aria-label','Upgrade skills');grow.append(el('h4','','Upgrade skills'));const choices=growthChoices(s,hero),grid=el('div','crew-growth-grid');for(const n of choices){const p=PATHS[n.branch],b=el('button','crew-growth-choice');const effect=n.stat==='skill'?'Learn '+data.skills.characters[hero].skills[n.step].name:n.stat==='ap'?'+18 '+CREW[hero].affinity+' mastery AP':n.stat==='speed'?'+2.5% base speed':'+'+n.value+' '+p.name;const choiceIcon=n.stat==='skill'?techniqueIcon(personalTechnique(h,n.step+1,data.skills.characters[hero].skills[n.step].name),{size:32}):el('span','',p.icon);if(n.stat==='skill'){b.style.gridTemplateColumns='36px 1fr';choiceIcon.style.gridRow='span 2';}b.append(choiceIcon,el('strong','',effect),el('small','',n.cost+' growth'));b.dataset.quickAction='growth:'+n.id;b.disabled=s.mode==='battle';b.onclick=()=>{const before=h.power+' power / '+h.magic+' magic / '+h.maxHp+' max HP';if(unlockNode(s,hero,n.id))commit(effect+' applied. '+before+' → '+h.power+' / '+h.magic+' / '+h.maxHp+'.');};grid.append(b);}if(!choices.length)grid.append(el('p','crew-muted',availablePoints(s,hero)?'The next choices open with story progress.':'Your points are applied. More growth arrives through levels and discoveries.'));grow.append(grid);
const schools=el('details','crew-school-drawer'),schoolSummary=el('summary','','Shape this companion’s school · '+(h.doctrineSlots||[]).filter(Boolean).length+'/2 equipped');schools.open=!!initialSchoolId;schools.append(schoolSummary,el('p','crew-muted','Schools modify compatible moves. Two slots, three capacity. Learning and fitting are one choice here.'));for(const school of matchingSchools(s,hero)){const card=el('article','crew-school'),worn=h.doctrineSlots?.includes(school.id),known=learnedSchool(s,hero,school.id).root,node=nodesFor(hero).find(n=>n.id==='discipline:'+school.id+':root');card.append(el('h4','',school.icon+' '+school.name),el('p','',school.weight+'/3 capacity · '+school.condition));if(worn){card.append(el('p','crew-applied','✓ Equipped · matching moves benefit now.'));for(const n of nodesFor(hero).filter(n=>n.school===school.id&&nodeState(s,hero,n)==='available')){const b=el('button','',n.name+' · '+n.cost+' growth');b.title=doctrineDescription(n);b.onclick=()=>{if(unlockNode(s,hero,n.id))commit(n.name+' applied to '+school.name+'.');};card.append(el('p','crew-muted',doctrineDescription(n)),b);}const remove=el('button','','Remove school');remove.onclick=()=>{clearSchool(s,hero,h.doctrineSlots.indexOf(school.id));commit(school.name+' removed. Its growth remains learned.');};card.append(remove);}else{const b=el('button','',known?'Fit school':'Learn & fit · '+(node?.cost||1)+' growth');b.disabled=s.mode==='battle'||!known&&nodeState(s,hero,node)!=='available';b.onclick=()=>{if(learnAndWearSchool(s,hero,school.id))commit(school.name+' learned and fitted. Matching battle moves updated.');else{receipt='School slots or capacity are full. Remove a school here before changing the build.';paint();}};card.append(b);}schools.append(card);}root.append(schools);
const equipment=el('section');
equipment.dataset.setupSection='gear';
equipment.tabIndex=-1;
equipment.setAttribute('aria-label','Equip gear');
equipment.append(el('h4','','Equip gear'));
function gearRow({id,name,detail,apply,disabled=false}){
 const row=el('article','crew-gear');
 const button=el('button','primary','Equip');
 button.setAttribute('aria-label','Equip '+name);
 button.dataset.quickAction='gear:'+id;
 button.disabled=disabled||s.mode==='battle';
 button.onclick=()=>{
  if(apply())commit(name+' equipped by '+h.name+'.');
  else live.textContent='This item cannot be equipped by '+h.name+'.';
 };
 row.append(el('strong','',name),button,el('small','',detail));
 equipment.append(row);
}
const inventory=s.livingArmory?.snapshot;
for(const item of [...(inventory?.placements||[]).map(p=>p.item),...(inventory?.overflow||[])]){
 gearRow({id:item.id,name:item.name,detail:item.requiredLevel>h.level?'Requires level '+item.requiredLevel:item.slot+' · '+item.rarity+' · '+item.itemPower+' power',
  disabled:item.requiredLevel>h.level,apply:()=>transactLivingArmory(s,hero,'equip',[item.id]).ok});
}
for(const gear of BOSS_GEAR.filter(g=>s.bossGear?.owned.includes(g.id))){
 if(s.heroes.some(member=>member.guardianGear?.[gear.slot]?.id===gear.id))continue;
 const worn=BOSS_GEAR.find(g=>g.id===h.guardianGear?.[gear.slot]?.id);
 gearRow({id:gear.id,name:gear.name,detail:worn?'Replaces '+worn.name:'Guardian '+gear.slot,apply:()=>equipBossGear(s,hero,gear.id)});
}
for(const id of s.rivals?.gear||[]){
 const gear=RIVALS.find(r=>r.gear.id===id)?.gear;
 if(!gear||s.heroes.some(member=>member.rivalGear===id))continue;
 gearRow({id,name:gear.name,detail:'Power +'+gear.power+' · Health +'+gear.hp,apply:()=>equipRivalGear(s,hero,id)});
}
if(equipment.children.length===1)equipment.append(el('p','crew-muted','No unequipped gear in your pack.'));
if(onArmory){
 const armory=el('button','','Open full armory');
 armory.onclick=()=>onArmory(hero);
 equipment.append(armory);
}
quick.append(...(initialSection==='gear'?[equipment,grow]:[grow,equipment]));
const vendors=guidanceActions(s).filter(a=>a.kind==='vendor');for(const a of vendors){const card=el('details','crew-services');card.append(el('summary','',a.title),el('p','',a.detail));const go=el('button','','Follow the restock trail');go.onclick=()=>onVendor(a.shop);card.append(go);root.append(card);}const advanced=el('details','crew-advanced');advanced.append(el('summary','','Explore the full skill map'));const inspect=el('button','','Open advanced map');inspect.onclick=()=>onAdvanced(hero);advanced.append(el('p','crew-muted','Optional map, blueprints and every school. Your active setup stays on this screen.'),inspect);root.append(advanced);if(initialMakoId)queueMicrotask(()=>root.querySelector('[data-mako="'+initialMakoId+'"]')?.scrollIntoView({block:'nearest',behavior:'instant'}));}
paint();return root;}
export function mountSetupUnlocks({getWorld,onOpen,onSave}){const n=el('button','crew-unlock-toast');n.hidden=true;n.setAttribute('aria-live','polite');n.onclick=onOpen;document.querySelector('#game').append(n);let signature='',until=0;return{update(safe){const w=getWorld();if(!w)return;if(!safe){n.hidden=true;return;}const s=w.state,key=JSON.stringify([s.chapter,s.cores,s.supports,s.kakeya?.relics,s.resonance,s.physicalLore?.growthPoints,s.skillGrid,s.recruited?.map(id=>[id,s.heroes[id].level,s.heroes[id].ap,s.heroes[id].unlockedSlots,s.heroes[id].loadout]),s.bosses]);if(key!==signature){signature=key;const applied=settleCrewSetup(s),changes=collectSetupUnlocks(s),items=[...applied,...changes];if(items.length){n.textContent='✦ '+items.slice(0,2).join(' · ')+(items.length>2?' · +'+(items.length-2)+' more':'')+' · Crew setup ›';until=performance.now()+12000;onSave();}}n.hidden=performance.now()>until;}};}
