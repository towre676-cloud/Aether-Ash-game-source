import {MONSTER_CATALOG,MONSTER_HABITATS,MONSTER_SILHOUETTES} from './monster-catalog.js?v=5.38';

export function monsterFieldGuide(world,renderer,onBack){
 const root=document.createElement('div');root.className='monster-guide';
 const intro=document.createElement('p');intro.textContent=MONSTER_CATALOG.length+' varieties · '+MONSTER_SILHOUETTES+' creature families. Local adaptations change attacks, elements, behavior and salvage.';
 const status=document.createElement('p'),search=document.createElement('input'),habitat=document.createElement('select'),seen=document.createElement('select'),list=document.createElement('div'),more=document.createElement('button'),back=document.createElement('button');
 search.type='search';search.placeholder='Find a creature, element or tactic';search.setAttribute('aria-label','Search creature field guide');
 habitat.setAttribute('aria-label','Creature habitat');for(const [value,label] of [['','Every habitat'],...Object.entries(MONSTER_HABITATS)]){const option=document.createElement('option');option.value=value;option.textContent=label;habitat.append(option);}
 seen.setAttribute('aria-label','Creature sightings');for(const [value,label] of [['all','All varieties'],['seen','Encountered'],['won','Defeated']]){const option=document.createElement('option');option.value=value;option.textContent=label;seen.append(option);}
 list.className='monster-guide-list';more.textContent='Show more creatures';back.textContent='Back to pause';back.onclick=onBack;let limit=24;
 const render=()=>{list.replaceChildren();const q=search.value.toLowerCase(),journal=world.state.monsterJournal||{},matches=MONSTER_CATALOG.filter(s=>(!habitat.value||s.habitatKeys.includes(habitat.value))&&(seen.value==='all'||(seen.value==='seen'?journal.sightings?.[s.id]:journal.victories?.[s.id]))&&(!q||[s.name,s.role,s.element,s.trait,s.lore,s.move].join(' ').toLowerCase().includes(q)));
  status.textContent=matches.length+' varieties · '+Object.keys(journal.sightings||{}).length+' encountered on this journey';
  for(const s of matches.slice(0,limit)){const card=document.createElement('article'),art=document.createElement('canvas'),body=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('p'),tell=document.createElement('p');art.width=100;art.height=100;art.setAttribute('aria-label',s.name);const ctx=art.getContext('2d'),cols=s.atlas==='bestiary3'?6:4,bounds=renderer?.bounds[s.atlas]?.[s.sprite],image=renderer?.assets[s.atlas];if(bounds&&image){const scale=Math.min(90/bounds.w,90/bounds.h);if(s.hue)ctx.filter='hue-rotate('+s.hue+'deg)';ctx.drawImage(image,bounds.x,bounds.y,bounds.w,bounds.h,(100-bounds.w*scale)/2,96-bounds.h*scale,bounds.w*scale,bounds.h*scale);}name.textContent=s.name;detail.textContent=s.element+' · '+s.role+' · '+(s.trait||'native')+' · '+(journal.victories?.[s.id]?'Defeated '+journal.victories[s.id]+' times':journal.sightings?.[s.id]?'Encountered':'Undiscovered');tell.textContent=s.tell||s.move;body.append(name,detail,tell);card.append(art,body);list.append(card);}
  more.hidden=matches.length<=limit;
 };
 const filter=()=>{limit=24;render();};search.oninput=filter;habitat.onchange=filter;seen.onchange=filter;more.onclick=()=>{limit+=24;render();};
 root.append(intro,search,habitat,seen,status,list,more,back);render();return root;
}
