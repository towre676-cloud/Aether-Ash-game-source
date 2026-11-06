import {createCampaignArmoryController} from './campaign.js?v=5.33.0';

/** A same-origin presentation frame isolates the recovered artwork and layout.
 * All actions call the campaign controller; the frame has no save or reward API.
 */
export function mountCampaignArmory({world,onSave=()=>{},onClose=()=>{}}={}){
 if(!world?.state)throw Error('The campaign must be ready before opening the armory.');
 if(world.state.mode==='battle')return null;
 window.__aaArmoryHost?.close();
 const previous=document.activeElement,dialog=document.createElement('dialog'),frame=document.createElement('iframe');
 dialog.className='living-armory-dialog';dialog.setAttribute('aria-label','Living Armory');
 dialog.style.cssText='padding:0;border:0;margin:0;background:#15120f;color:#eee;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;overflow:hidden;border-radius:0;box-shadow:none;';
 frame.title='Campaign equipment, shared inventory and forge';frame.style.cssText='display:block;border:0;width:100%;height:100%;background:#15120f;';
 let closed=false;
 function close(){if(closed)return;closed=true;try{frame.contentWindow?.AAArmoryCampaign?.destroy?.();}catch{}onSave();dialog.close();dialog.remove();if(window.__aaArmoryHost===host)delete window.__aaArmoryHost;previous?.focus();onClose();}
 const controller=createCampaignArmoryController({getState:()=>world.state,onChange:()=>onSave()});
 const host={controller,close};window.__aaArmoryHost=host;
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 frame.src=new URL('./frame.html?v=5.36.0',import.meta.url).href;
 dialog.append(frame);document.body.append(dialog);dialog.showModal();
 return {dialog,controller,close};
}
