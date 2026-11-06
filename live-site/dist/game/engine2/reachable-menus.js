import {cutoutAtlas} from './sprite-cutout.js';

const mounted=new WeakMap();
let portraitArt;
function crewArtwork(doc){
 if(!portraitArt)portraitArt=new Promise((resolve,reject)=>{
  const ImageType=doc.defaultView?.Image||globalThis.Image;
  if(!ImageType){reject(Error('Portrait unavailable'));return;}
  const picture=new ImageType();
  picture.onload=()=>{try{resolve(cutoutAtlas(picture,8,7));}catch(error){reject(error);}};
  picture.onerror=()=>reject(Error('Portrait unavailable'));
  picture.src=new URL('./art/crew.webp',import.meta.url).href;
 }).catch(error=>{portraitArt=null;throw error;});
 return portraitArt;
}
/** Persistent navigation stays outside the menu's content scroller. Each
 * button invokes the host's existing pause action; it owns no game state. */
export function mountReachableMenus({root=globalThis.document?.querySelector?.('#pause'),onMenu=()=>{},onResume=()=>{},getCompanion=()=>({hero:0,name:'Traveller'})}={}){
 if(!root?.ownerDocument)return null;
 if(mounted.has(root))return mounted.get(root);
 const doc=root.ownerDocument,card=root.querySelector('.menu-card'),body=root.querySelector('#pause-body');
 if(!card||!body)return null;
 const bar=doc.createElement('nav'),menu=doc.createElement('button'),resume=doc.createElement('button');
 bar.className='menu-return-bar';bar.setAttribute('aria-label','Menu navigation');
 menu.type=resume.type='button';menu.textContent='Menu';resume.textContent='Return to game';
 menu.setAttribute('aria-label','Back to main menu');resume.setAttribute('aria-label','Return to game');
 bar.append(menu,resume);root.append(bar);
 const companion=doc.createElement('div'),canvas=doc.createElement('canvas'),caption=doc.createElement('span');
 companion.className='menu-companion';canvas.width=110;canvas.height=140;canvas.setAttribute('aria-hidden','true');
 companion.append(canvas,caption);card.prepend(companion);
 root.classList.add('has-reachable-menu');
 let destroyed=false,queued=false,lastHero=null,art=null;
 function draw(){
  if(!art||!Number.isInteger(lastHero))return;
  const context=canvas.getContext?.('2d'),bounds=art.bounds?.[lastHero*8];
  if(!context||!bounds)return;
  context.clearRect(0,0,110,140);
  const fit=Math.min(102/bounds.w,132/bounds.h),w=bounds.w*fit,h=bounds.h*fit;
  context.drawImage(art.image,bounds.x,bounds.y,bounds.w,bounds.h,(110-w)/2,138-h,w,h);
 }
 function refresh(){
  if(destroyed)return;
  queued=false;
  const main=!body.hidden,original=doc.getElementById('resume'),blocked=!!original?.disabled;
  if(menu.hidden!==main)menu.hidden=main;
  if(resume.disabled!==blocked)resume.disabled=blocked;
  if(companion.hidden!==!main)companion.hidden=!main;
  if(root.dataset.menuView!==(main?'main':'page'))root.dataset.menuView=main?'main':'page';
  if(!main||root.hidden)return;
  const lead=getCompanion()||{},hero=Number.isInteger(lead.hero)&&lead.hero>=0&&lead.hero<7?lead.hero:null;
  const text=lead.name||'Your crew';if(caption.textContent!==text)caption.textContent=text;
  if(hero!==lastHero){lastHero=hero;draw();}
  if(!art&&hero!==null)crewArtwork(doc).then(value=>{if(destroyed)return;art=value;draw();}).catch(()=>{});
 }
 function schedule(){if(queued||destroyed)return;queued=true;queueMicrotask(refresh);}
 menu.onclick=()=>{onMenu();refresh();};
 resume.onclick=()=>{if(!resume.disabled){onResume();refresh();}};
 const Observer=doc.defaultView?.MutationObserver;
 const observer=Observer?new Observer(records=>{
  if(records.some(record=>record.type==='childList'||['hidden','disabled'].includes(record.attributeName)))schedule();
 }):null;
 observer?.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled']});
 refresh();
 const api={refresh,destroy(){if(destroyed)return;destroyed=true;observer?.disconnect();bar.remove();companion.remove();root.classList.remove('has-reachable-menu');delete root.dataset.menuView;mounted.delete(root);}};
 mounted.set(root,api);return api;
}
