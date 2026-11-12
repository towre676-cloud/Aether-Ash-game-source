import {readJourneyProfiles} from './journey-roster.js?v=5.18.0';
import {validateSave} from './save-validation.js?v=5.43';

export function journeyArchiveKeys(storage, key) {
 const prefix=key+'-origin-archive-';
 return Array.from({length:storage.length},(_,i)=>storage.key(i))
  .filter(name=>name?.startsWith(prefix))
  .sort((a,b)=>Number(b.slice(prefix.length))-Number(a.slice(prefix.length)));
}

export function findJourneyResume(storage, key, data) {
 const primary=storage.getItem(key);
 const check=(raw,source)=>{
  if(!raw)return null;
  try{return {value:validateSave(data,raw),source,primary};}
  catch{return null;}
 };
 const active=check(primary,'primary');
 if(active)return active;
 const profiles=readJourneyProfiles(storage).filter(Boolean)
  .sort((a,b)=>(Number(b.savedAt)||0)-(Number(a.savedAt)||0));
 for(const profile of profiles){
  const checked=check(profile.value,'traveller');
  if(checked)return checked;
 }
 for(const name of [...journeyArchiveKeys(storage,key),key+'-previous']){
  const checked=check(storage.getItem(name),'archive');
  if(checked)return checked;
 }
 return null;
}

export function archiveJourney(storage,key,raw) {
 const prefix=key+'-origin-archive-';
 let stamp=Date.now();
 while(storage.getItem(prefix+stamp)!==null)stamp++;
 storage.setItem(prefix+stamp,raw);
}

// Keep the original bytes before a validated fallback replaces the primary.
export function preserveUnreadableJourney(storage,key,resume) {
 if(resume.source!=='primary'&&resume.primary!==null)archiveJourney(storage,key,resume.primary);
}
