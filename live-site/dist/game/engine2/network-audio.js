/** Finite replies from completed, local works. Sound is descriptive feedback;
 * this controller never awards a repair, changes a choice or advances a route. */
export function boundedReplyScore(works=[]){
 const seen=new Set();
 return works.filter(work=>work&&typeof work.id==='string'&&!seen.has(work.id)&&seen.add(work.id))
  .slice(0,5).map(work=>({id:work.id,label:String(work.label||''),motif:(Array.isArray(work.motif)?work.motif:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=2).slice(0,3)})).filter(work=>work.motif.length);
}

export function createNetworkAudio({getWorld,getView,getInstrument,isActive,getVolume,onReply=()=>{}}){
 let journey=null,scene=null,played='',cancel=null;
 const stop=()=>{cancel?.();cancel=null;};
 function snapshot(){
  const world=getWorld();if(!world?.state)return null;
  if(journey!==world.state||scene!==world.state.scene){stop();journey=world.state;scene=world.state.scene;played='';}
  const works=boundedReplyScore(getView(world)?.works||[]),key=scene+':'+works.map(work=>work.id).join(',');
  return {world,works,key};
 }
 function play(value,works,quiet){
  const volume=Number(getVolume()),instrument=getInstrument();
  if(!isActive()||!Number.isFinite(volume)||volume<=0||!instrument?.playCityAnswer||!works.length)return false;
  stop();const handle=instrument.playCityAnswer(works,{quiet,volume:Math.min(1,volume)});
  if(typeof handle!=='function')return false;
  cancel=handle;played=value.key;onReply({scene,ids:works.map(work=>work.id),quiet});return true;
 }
 return {
  sync(){const value=snapshot();if(!value||!isActive()||getVolume()<=0){stop();return false;}return value.key!==played&&play(value,value.works,true);},
  reply(id){const value=snapshot();if(!value)return false;const work=value.works.find(work=>work.id===id);return !!work&&play(value,[work],false);},
  stop,
  destroy(){stop();journey=null;scene=null;played='';}
 };
}
