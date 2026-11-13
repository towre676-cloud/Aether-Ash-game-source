/** Presentation-only reward toast; award ownership stays in Living Armory. */
export function showArmoryReward(result,{root=document}={}){
 if(!result?.ok || !Array.isArray(result.items) || !result.items.length) return false;
 let layer=root.getElementById('action-armory-reward');
 if(!layer){
   layer=root.createElement('aside');layer.id='action-armory-reward';
   layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');
   root.body.append(layer);
 }
 const items=result.items.slice(0,4);
 const rarityColor={common:'#cbd1d5',uncommon:'#9ce4b0',rare:'#81b9ff',epic:'#cda1ff',legendary:'#ffcd78',unique:'#ffb66b'};
 layer.replaceChildren();
 const heading=root.createElement('strong');heading.textContent='Recovered equipment';layer.append(heading);
 for(const item of items){
   const line=root.createElement('div');line.className='action-reward-item';
   line.style.borderLeftColor=rarityColor[String(item.rarity||'').toLowerCase()]||rarityColor.common;
   line.textContent=String(item.name||'Recovered item').slice(0,90);
   layer.append(line);
 }
 if(result.items.length>4){
   const more=root.createElement('small');more.textContent='+'+(result.items.length-4)+' more';layer.append(more);
 }
 let style=root.getElementById('action-armory-reward-style');
 if(!style){
   style=root.createElement('style');style.id='action-armory-reward-style';
   style.textContent=`#action-armory-reward{position:fixed;right:12px;bottom:clamp(95px,17vh,180px);z-index:120;max-width:min(300px,75vw);padding:12px 14px;border:1px solid #b59b69;border-radius:12px;background:#101c27ee;color:#f6e6c6;box-shadow:0 8px 28px #0009;font:13px/1.4 system-ui;pointer-events:none}#action-armory-reward strong{display:block;margin-bottom:7px}.action-reward-item{border-left:4px solid #cbd1d5;padding:4px 8px;margin:4px 0;background:#ffffff10}`;
   root.head.append(style);
 }
 // Replace a previous toast without creating or awarding items.
 const token=String(Date.now())+'-'+String(Math.random());
 layer.dataset.token=token;
 setTimeout(()=>{if(layer.dataset.token===token)layer.remove();},4200);
 return true;
}
