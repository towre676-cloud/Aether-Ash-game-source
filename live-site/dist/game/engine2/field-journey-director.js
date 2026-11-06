import {fieldPatrolPosition} from './field-patrols.js?v=5.33.0';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function fieldApproach(world,object){
 if(['patrol','wild'].includes(object?.type)){
  const positions=(object.enemies||[]).map((_,i)=>fieldPatrolPosition(world,object,i));
  const p=positions.sort((a,b)=>distance(a,world.state)-distance(b,world.state))[0];
  return p?{...object,xy:[p.x-.5,p.y-.5]}:null;
 }
 return object?.xy?object:null;
}
export function fieldInteractionTargets(world){
 const targets=[...world.objects()];if(world.roamingPack?.scene===world.state.scene)targets.push(world.roamingPack.object);
 const result=targets.map(object=>({object,approach:fieldApproach(world,object)})).filter(v=>v.approach);
 const situation=world.roamingPack?.scene===world.state.scene&&world.roamingPack.objective;if(situation?.asset){const object={type:'field-situation',xy:[situation.asset.x-.5,situation.asset.y-.5],pack:world.roamingPack.object,label:situation.label};result.push({object,approach:object});}
 return result;
}
function lineOfSight(scene,from,to){
 const n=Math.max(1,Math.ceil(distance(from,to)*6));
 for(let i=1;i<n;i++){const x=Math.floor(from.x+(to.x-from.x)*i/n),y=Math.floor(from.y+(to.y-from.y)*i/n);if(scene.floor[y]?.[x]!=='.'||scene.affordanceBlocked?.some(p=>p[0]===x&&p[1]===y))return false;}
 return true;
}
/** One invitation per dangerous scene. It never resolves a fight or chooses a
 * reward. Continuing the guide is always an explicit player action. */
export function createFieldJourneyDirector(){
 let state=null,scene=null,walked=0,poll=0;const seen=new Set();
 return {
  reset(){state=null;scene=null;walked=0;poll=0;seen.clear();},
  observe(world,dt,{guideActive=false,held=false,distance:travel=0}={}){
   if(world.state!==state){state=world.state;scene=null;walked=0;poll=0;seen.clear();}
   if(scene!==world.state.scene){scene=world.state.scene;walked=0;poll=0;}
   if(world.state.mode!=='field'||!guideActive||held||seen.has(scene))return null;
   if(Number.isFinite(travel)&&travel>0&&travel<1.25)walked+=travel;
   poll-=Math.max(0,Math.min(.1,dt||0));if(poll>0||walked<1.5)return null;poll=.2;
   const candidates=fieldInteractionTargets(world).filter(({object})=>object.type==='patrol'||object.type==='wild'||object.type==='affordance'&&!object.solved);
   const nearby=candidates.map(row=>({...row,p:{x:row.approach.xy[0]+.5,y:row.approach.xy[1]+.5}})).filter(row=>distance(row.p,world.state)<(row.object.type==='affordance'?3.5:6)&&lineOfSight(world.scene,world.state,row.p)).sort((a,b)=>distance(a.p,world.state)-distance(b.p,world.state));
   const row=nearby[0];if(!row)return null;seen.add(scene);
   const creature=['patrol','wild'].includes(row.object.type);
   return {title:creature?'Movement on the trail':'Something worth a closer look',text:creature?'Watch the creatures, prepare your crew, or find a way around. The guide will wait while you explore.':(row.object.label||'A working part of this place')+'. Walk over and try it. The guide will wait.',object:row.object,pack:creature?row.object:null,rewardHint:creature?'Resolved encounters yield core mastery and materials for a local trail refuge.':null};
  }
 };
}
