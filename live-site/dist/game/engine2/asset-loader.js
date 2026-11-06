/** Load required atlases strictly. Optional decoration may use its renderer
 * fallback after the same one bounded recovery attempt. */
export async function loadArtAssets(definitions,{onProgress=()=>{},createImage=()=>new Image(),timeoutMs=20000}={}){
 if(!Array.isArray(definitions))throw new TypeError('Art definitions must be an array.');
 const names=new Set();
 for(const d of definitions){
  if(!d||typeof d.name!=='string'||!d.name||names.has(d.name)||!d.src||typeof d.src!=='string'&&!(d.src instanceof URL))throw new TypeError('Each art asset needs a unique name and source.');
  names.add(d.name);
 }
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>2147483647)throw new TypeError('Art loading needs a positive, finite timeout.');
 const total=definitions.length,assets={},pending=new Set();let loaded=0,completed=0,skipped=0;
 const report=(d,attempt,status)=>{try{onProgress({name:d.name,label:d.label||d.name,loaded,completed,skipped,total,attempt,status});}catch{/* A progress display cannot prevent the game from loading. */}};
 function load(d){return new Promise((resolve,reject)=>{
  let image=null,timer=null,settled=false,attempt=0;
  const cleanup=()=>{if(timer!==null){clearTimeout(timer);timer=null;}if(image){image.onload=null;image.onerror=null;}};
  const stop=error=>{if(settled)return;settled=true;cleanup();image?.removeAttribute?.('src');pending.delete(stop);reject(error);};
  pending.add(stop);
  function failed(reason){
   if(settled)return;cleanup();image?.removeAttribute?.('src');
   if(attempt<2){start();return;}
   if(d.optional===true){settled=true;pending.delete(stop);completed++;skipped++;report(d,attempt,'skipped');resolve();return;}
   report(d,attempt,'error');stop(new Error('Unable to load '+(d.label||d.name)+' after two attempts ('+reason+'). Please retry loading; your saved journey is unchanged.'));
  }
  function start(){
   attempt++;report(d,attempt,attempt===1?'loading':'retrying');
   try{
    image=createImage();
    image.onload=()=>{if(settled)return;settled=true;cleanup();pending.delete(stop);assets[d.name]=image;loaded++;completed++;report(d,attempt,'loaded');resolve();};
    image.onerror=()=>failed('image unavailable');
    timer=setTimeout(()=>failed('loading timed out'),timeoutMs);
    image.src=String(d.src);
   }catch{failed('image unavailable');}
  }
  start();
 });}
 try{await Promise.all(definitions.map(load));return assets;}
 catch(error){for(const stop of [...pending])stop(error);throw error;}
}
