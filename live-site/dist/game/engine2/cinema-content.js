import {BESTIARY,FRONTIER_BESTIARY,ITEMS} from './repertoire.js?v=5.38';
import {TECHNIQUE_CATALOG,CREW} from './mako.js?v=5.16.0';
export const battleTrack=(chapter,boss=false)=>`action_${boss?'boss':'battle'}_${(Math.max(1,chapter)-1)%4}`;
export const cinematicKey=(kind,id)=>`${kind}:${id}`;
export function cinematicRegistry(data){
 const entries=[];
 for(const m of data.campaign.missions){
  const common={chapter:m.id,color:['#ffad69','#a2e9e2','#b6cbff','#dec49e'][(m.id-1)%4]};
  entries.push({...common,id:cinematicKey('arrival',m.id),kind:'arrival',title:m.title,subtitle:`Chapter ${m.id} · The journey continues.`,duration:3.5,music:battleTrack(m.id),art:m.id<=8?`chapter-${m.id}-0.webp`:null,video:m.id<=8?`arrivals/chapter-${String(m.id).padStart(2,'0')}.mp4`:null,hero:(m.id-1)%7,trigger:'first arrival after entry conversation'});
  entries.push({...common,id:cinematicKey('guardian',m.id),kind:'guardian',title:m.enemy_name,subtitle:m.title,duration:4,music:battleTrack(m.id,true),art:m.id<=8?`guardian-${m.id}-0.webp`:null,sprite:m.id%3===0?5:4,trigger:'first guardian challenge'});
  entries.push({...common,id:cinematicKey('assault',m.id),kind:'assault',title:m.enemy_name,subtitle:'A guardian unleashes its strength.',duration:1.4,compact:true,sprite:m.id%3===0?5:4,art:m.id<=8?`guardian-${m.id}-1.webp`:null,trigger:'first guardian special attack'});
  entries.push({...common,id:cinematicKey('victory',m.id),kind:'victory',title:m.title,subtitle:'The road opens.',duration:m.id===7?10:4.5,music:battleTrack(m.id),art:m.id<=8?`chapter-${m.id}-2.webp`:null,video:m.id===7?'orchard-pilot.mp4':null,hero:(m.id-1)%7,trigger:'guardian victory before rewards conversation'});
 }
 for(const s of [...BESTIARY,...FRONTIER_BESTIARY,...[['guard','Iron Antler',0],['scout','Alarmwing',1],['mender','Porcelain Mender',2],['predator','Night Raptor',3]].map(([id,name,sprite])=>({id,name,sprite,legacy:true,tell:'Read its warning and move before the strike.',habitat:'Cinderfall'}))])entries.push({id:cinematicKey('creature',s.id),kind:'creature',title:s.name,subtitle:s.elder?`${s.move}: ${s.shape==='line'?'leave the marked circle':'step sideways from the marked line'} before it lands.`:s.tell,detail:s.habitat,duration:2.6,compact:!!s.ecotype||s.atlas==='bestiary3',video:s.legacy||s.ecotype||s.atlas!=='bestiary'?null:`creatures/${s.id.replace(/-elder$/,'')}.mp4`,species:s.id,atlas:s.atlas,legacy:!!s.legacy,sprite:s.sprite,elder:!!s.elder,color:s.elder?'#e9c57b':'#a6dfd5',trigger:'first encounter with species'});
 for(const [i,s] of ITEMS.entries())entries.push({id:cinematicKey('supply',s.id),kind:'supply',title:s.name,subtitle:s.description,duration:1.7,item:s.id,effect:s.effect,icon:Math.max(0,i-3),basic:i<3,color:'#9ce1bb',trigger:'first successful supply use',compact:true});
 for(const [i,h] of CREW.entries())entries.push({id:cinematicKey('crew',i),kind:'crew',title:h.name,subtitle:'Together, the city has a chance.',duration:2.6,hero:i,color:'#edce91',trigger:'first recruitment after conversation'});
 for(const t of TECHNIQUE_CATALOG)entries.push({id:cinematicKey('technique',t.id),kind:'technique',title:t.name,subtitle:t.support==='link'?'Concord · joined strength':t.support==='overdrive'?'Overdrive · all the strength you have':t.healing?'Restoration':'Mako technique',duration:1.35,core:t.core,shape:t.shape,color:t.color,compact:true,trigger:'first successful cast; cooldown limits interruptions'});
 for(const e of entries.filter(e=>e.kind==='creature'))entries.push({...e,id:cinematicKey('creature-move',e.species),kind:'creature-move',video:null,subtitle:[...BESTIARY,...FRONTIER_BESTIARY].find(s=>s.id===e.species)?.move||'Predator strike',duration:1.4,compact:true,trigger:'first species attack'});
 const late={9:['lowbank','rain'],14:['glass-chamber','glass'],20:['witness-court','dust'],24:['choir-storm','storm']};for(const e of entries){if(late[e.chapter]&&['arrival','victory'].includes(e.kind)){const[name,weather]=late[e.chapter];e.art=`late-${name}-v1.webp`;e.environment=true;e.weather=weather;}}
 return entries;
}
export function seenCinematic(state,id){const seen=state.cinemaSeen||[];return seen.includes(id)||(/^(arrival|creature):/.test(id)&&seen.includes(id.replace(':','-')));}
export function markCinematic(state,id){state.cinemaSeen??=[];if(!state.cinemaSeen.includes(id))state.cinemaSeen.push(id);}
export function canShowArrival(world){return world.scene.chapter>0&&(world.scene.chapter!==1||['security','console'].includes(world.scene.key));}
