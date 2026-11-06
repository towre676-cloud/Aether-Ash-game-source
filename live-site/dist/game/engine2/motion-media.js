/** Optional motion backgrounds for two earned, full story scenes. The director
 * owns timing and captions; a failed/blocked video leaves the original art intact.
 * Nothing is fetched until one of these scenes is actually presented.
 */
export const MOTION_MEDIA=Object.freeze({
 'world:wayglass':'../cinema/living-world/wayglass-motion-v1.mp4',
 'world:household:vale':'../cinema/living-world/cinderfall-motion-v1.mp4'
});
export function motionPath(entry,{reduced=false,compatibility=false}={}){
 return !reduced&&!compatibility&&entry?.expansion&&!entry.compact?MOTION_MEDIA[entry.id]||null:null;
}
export function createMotionMedia({createVideo=()=>document.createElement('video'),urlFor=path=>new URL(path,import.meta.url).href}={}){
 let current=null;
 function dispose(){
  const active=current;if(!active)return;current=null;
  const v=active.video;v.removeEventListener?.('error',active.onError);
  try{v.pause();}catch{}
  try{v.removeAttribute('src');v.load?.();}catch{}
 }
 return {
  start(entry,options={}){
   dispose();const path=motionPath(entry,options);if(!path)return false;
   let video;try{video=createVideo();}catch{return false;}
   const active={video,onError:()=>{if(current===active)dispose();}};current=active;
   try{
    video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='none';video.loop=false;
    video.addEventListener?.('error',active.onError);video.src=urlFor(path);
    Promise.resolve(video.play()).catch(()=>{if(current===active)dispose();});
   }catch{dispose();return false;}
   return true;
  },
  frame(options={}){
   if(options.reduced||options.compatibility){dispose();return null;}
   const v=current?.video;
   return v&&!v.error&&!v.paused&&!v.ended&&v.readyState>=2&&v.videoWidth>0&&v.videoHeight>0?v:null;
  },
  dispose
 };
}
