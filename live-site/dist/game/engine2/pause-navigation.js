/** Reorganize the existing pause actions without replacing their callbacks. */
const mounted=new WeakMap();
const PRIMARY=['resume','equip-mako','skill-grid-button','preparation-button','party-button','bag-button','story-button','save'];
const GROUPS=[
 ['tools','Field tools & equipment','Key items, keepsakes and battle preparation'],
 ['world','Travellers & the world','Companions, dispatch and the Wayglass'],
 ['memories','Memories & films','Your album, lore and cinematics'],
 ['settings','Sound, display & controls','Audio, motion and touch preferences'],
 ['files','Save files & previous edition','Load, export or bring another save'],
];
export function pauseActionGroup(node){
 const id=node.id||'',text=(node.textContent||'').trim().toLowerCase(),href=node.getAttribute?.('href')||'';
 if(PRIMARY.includes(id))return 'primary';
 if(['load','export','import'].includes(id)||node.querySelector?.('#import')||/classic\.html/.test(href))return 'files';
 if(id==='fullscreen'||node.classList?.contains('setting')||node.classList?.contains('player-comfort')||node.classList?.contains('touch-layout-setting')||node.classList?.contains('aa-acoustic-options'))return 'settings';
 if(['origin-button','frontier-button','observatory-button'].includes(id)||/another listening/.test(text))return 'world';
 if(['pause-films','journey-album','world-lore-button'].includes(id)||/cinema\/|animation-expansion\//.test(href))return 'memories';
 if(['key-items-button','battle-relics-button','guardian-gear-button','living-armory-button'].includes(id)||/battle approaches|practice skirmish|trade satchel|creature field guide/.test(text)||/field-guide\//.test(href))return 'tools';
 // Future actions stay discoverable instead of being dropped by an allowlist.
 return 'world';
}
export function mountPauseNavigation({root=document.querySelector('#pause')}={}){
 if(!root)return null;if(mounted.has(root))return mounted.get(root);
 const doc=root.ownerDocument,body=root.querySelector('#pause-body'),primary=body?.querySelector('.menu-grid');
 if(!body||!primary)return null;
 body.classList.add('pause-navigation');primary.classList.add('pause-primary');primary.setAttribute('aria-label','Journey actions');
 const status=doc.getElementById('save-status')||doc.createElement('p');status.id='save-status';status.classList.add('pause-save-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 if(!status.textContent)status.textContent='Saves stay on this device. Export a copy to keep a backup.';
 primary.after(status);
 const groups=new Map();
 for(const [key,title,description]of GROUPS){
  const details=doc.createElement('details'),summary=doc.createElement('summary'),heading=doc.createElement('strong'),hint=doc.createElement('span'),content=doc.createElement('div');
  details.className='pause-group';details.setAttribute('name','pause-sections');details.dataset.pauseGroup=key;summary.setAttribute('aria-controls','pause-group-'+key);heading.textContent=title;hint.textContent=description;summary.append(heading,hint);content.className='pause-action-grid';content.id='pause-group-'+key;details.append(summary,content);body.append(details);groups.set(key,{details,content});
 }
 let queued=false;
 function revealAction(id,{focus=false}={}){
  const action=doc.getElementById(id);if(!action||!body.contains(action)||action.hidden)return false;
  const group=action.closest('.pause-group');if(group)group.open=true;
  if(focus)action.focus({preventScroll:true});return true;
 }
 function route(node){
  if(node===status||node.classList?.contains('pause-group'))return;
  const key=pauseActionGroup(node);if(key==='primary')return;
  const destination=groups.get(key).content;if(node.parentElement!==destination)destination.append(node);
 }
 function refresh(){
  queued=false;
  const setup=doc.getElementById('preparation-button');
  if(setup){if(setup.hidden)setup.hidden=false;if(setup.textContent!=='Crew setup')setup.textContent='Crew setup';setup.title='Moves, growth and equipment in one place';}
  const names={'equip-mako':'Equip gear','skill-grid-button':'Upgrade skills','party-button':'Characters','bag-button':'Supply bag','story-button':'Story journal','save':'Save game'};
  for(const [id,text]of Object.entries(names)){const n=doc.getElementById(id);if(n&&n.textContent!==text)n.textContent=text;}
  for(const id of ['equip-mako','skill-grid-button']){const button=doc.getElementById(id);if(button?.hidden)button.hidden=false;}
  for(const node of [...primary.children])route(node);
  // These were direct siblings of the old unbounded action grid.
  for(const node of [...body.children]){
   if(node===primary||node===status||node.classList?.contains('pause-group')||['journal-goal','journal-discoveries','pause-overview'].includes(node.id))continue;
   if(node.classList?.contains('setting')||node.classList?.contains('player-comfort')||node.classList?.contains('touch-layout-setting')||node.classList?.contains('aa-acoustic-options')||node.classList?.contains('hint'))groups.get('settings').content.append(node);
   else if(node.tagName==='A')route(node);
  }
  const desired=PRIMARY.map(id=>id==='preparation-button'?setup:doc.getElementById(id)).filter(Boolean),current=[...primary.children].filter(n=>desired.includes(n));
  if(desired.some((n,i)=>current[i]!==n))for(const node of desired)primary.append(node);
  for(const {details,content}of groups.values()){const hidden=![...content.children].some(n=>!n.hidden);if(details.hidden!==hidden)details.hidden=hidden;}
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(refresh);}
 refresh();
 const Observer=doc.defaultView?.MutationObserver;
 const observer=Observer?new Observer(records=>{
  for(const record of records){
   if(record.type==='attributes'&&record.oldValue!==null&&!record.target[record.attributeName])revealAction(record.target.id);
   if(record.type==='childList'&&record.target===primary)for(const node of record.addedNodes)if(node.nodeType===1&&!PRIMARY.includes(node.id)){const key=pauseActionGroup(node);groups.get(key)?.details.setAttribute('open','');}
  }
  schedule();
 }):null;
 observer?.observe(body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled'],attributeOldValue:true});
 const api={refresh,revealAction,status,groups,destroy(){observer?.disconnect();mounted.delete(root);}};mounted.set(root,api);return api;
}
