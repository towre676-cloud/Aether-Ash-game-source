/** IndexedDB-backed versioned save store with explicit errors and legacy import. */
const DB='ash-aether-living-world';const STORE='saves';
function database(){return new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined')return reject(new Error('IndexedDB unavailable'));
 const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE);};
 r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('Cannot open save database'));});}
async function transaction(mode,fn){const db=await database();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,mode);const req=fn(tx.objectStore(STORE));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 tx.onabort=()=>reject(tx.error||new Error('Save transaction aborted'));
 });}finally{db.close();}}
export async function loadSave(slot='autosave'){try{return await transaction('readonly',s=>s.get(slot));}catch(e){const backup=typeof localStorage!=='undefined'?localStorage.getItem('aa-living-world-atlas-v3'):null;if(backup)return JSON.parse(backup);throw e;}}
export async function writeSave(value,slot='autosave'){return transaction('readwrite',s=>s.put(value,slot));}
export async function eraseSave(slot='autosave'){return transaction('readwrite',s=>s.delete(slot));}
export async function importSave(file,validate){if(file.size>20_000_000)throw Error('Save file exceeds 20 MB');const data=JSON.parse(await file.text());validate(data);await writeSave(data);return data;}
