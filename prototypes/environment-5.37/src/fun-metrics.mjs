export function createFunSession(){return {encounters:[],rewards:[],detours:[],ui:[],startedAt:0};}
export function recordEncounter(s,e){const x={duration:e.duration||0,actions:[...(e.actions||[])],damageTaken:e.damageTaken||0,objective:e.objective||'defeat',optional:!!e.optional};s.encounters.push(x);return s;}
export function recordReward(s,r){s.rewards.push({kind:r.kind,obtainedAt:r.obtainedAt||0,equippedAt:r.equippedAt??null,usedInNextEncounter:!!r.usedInNextEncounter});return s;}
export function recordDetour(s,d){s.detours.push({reason:d.reason||'curiosity',guided:!!d.guided,duration:d.duration||0,found:!!d.found});return s;}
export function summarizeFun(s){
 const encounters=s.encounters||[];const actions=encounters.flatMap(x=>x.actions);const unique=new Set(actions).size;const repeated=actions.length?actions.filter((a,i)=>i&&a===actions[i-1]).length/actions.length:0;
 const optional=encounters.filter(x=>x.optional).length;const used=(s.rewards||[]).filter(x=>x.usedInNextEncounter).length;const equip=(s.rewards||[]).filter(x=>x.equippedAt!=null&&x.equippedAt-x.obtainedAt<=120).length;
 const det=(s.detours||[]);const voluntary=det.filter(x=>!x.guided).length;const found=det.filter(x=>x.found).length;
 return {encounterCount:encounters.length,actionVariety:unique,repeatedActionRatio:+repeated.toFixed(3),optionalEncounterRate:encounters.length?optional/encounters.length:0,rewardNextEncounterUseRate:(s.rewards||[]).length?used/s.rewards.length:0,rewardEquipWithin2mRate:(s.rewards||[]).length?equip/s.rewards.length:0,voluntaryDetours:voluntary,discoveryYield:det.length?found/det.length:0};
}
