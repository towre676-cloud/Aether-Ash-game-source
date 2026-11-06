import {characterShowcase} from '../../character-showcase.js?v=5.35.0';

/** One native portrait while the Bearer destination is open. Nothing is kept
 * rendering behind another destination, and a reopened view receives a fresh
 * canvas because the software fallback may replace the original element. */
export function createBearerPortrait({getStage,createShowcase=characterShowcase}={}){
 let renderer=null,stage=null,currentHero=null,currentName='Traveller',observer=null;
 function clear(){
  observer?.disconnect();observer=null;
  renderer?.destroy();renderer=null;currentHero=null;
  stage?.replaceChildren?.();stage=null;
 }
 function describe(){
  const canvas=stage?.querySelector?.('canvas');
  const note=stage?.querySelector?.('.traveller-art-note');
  const label=note?`${currentName} portrait unavailable`:`${currentName}, original character art. Drag to turn.`;
  if(canvas?.getAttribute?.('aria-label')!==label)canvas?.setAttribute?.('aria-label',label);
  if(note&&note.textContent!==`${currentName}’s portrait is unavailable.`)note.textContent=`${currentName}’s portrait is unavailable.`;
 }
 function update({active=false,hero,name='Traveller'}={}){
  if(!active){clear();return false;}
  const next=getStage?.(),doc=next?.ownerDocument;
  if(!next||!doc?.createElement)return false;
  currentName=String(name||'Traveller');
  if(!Number.isInteger(hero)||hero<0||hero>6){clear();next.textContent=`${currentName}’s portrait is unavailable.`;return false;}
  if(renderer&&stage===next){
   if(currentHero!==hero){renderer.select(hero);currentHero=hero;}
   describe();return true;
  }
  clear();stage=next;
  const canvas=doc.createElement('canvas');
  if(typeof canvas.getContext!=='function'){stage=null;return false;}
  canvas.className='native-bearer-canvas';canvas.width=500;canvas.height=600;
  canvas.setAttribute('aria-label',`${currentName}, original character art. Drag to turn.`);
  stage.replaceChildren(canvas);
  try{
   renderer=createShowcase(canvas,{hero,reduced:true,onAtlas:()=>describe()});currentHero=hero;
   const Observer=doc.defaultView?.MutationObserver;
   if(Observer){observer=new Observer(describe);observer.observe(stage,{childList:true,subtree:true});}
   describe();return true;
  }catch{
   renderer=null;stage.replaceChildren();stage.textContent=`${currentName}’s portrait is unavailable.`;return false;
  }
 }
 return {update,destroy:clear};
}
