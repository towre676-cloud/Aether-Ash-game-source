const EXPRESSIONS=['neutral','focus','wary','relief','anger','wonder','hurt','victory'];
export function presentationState({hp=1,combat=false,nearDiscovery=false,victory=false,speaking=false,gear=[]}={}){
 let expression='neutral';
 if(hp<.25)expression='hurt'; else if(victory)expression='victory'; else if(combat)expression='focus'; else if(nearDiscovery)expression='wonder'; else if(speaking)expression='wary';
 return {expression,expressionValid:EXPRESSIONS.includes(expression),visibleGear:gear.filter(x=>x?.visible!==false).slice(0,5).map(x=>({slot:x.slot,icon:x.icon||x.kind||'gear',rarity:x.rarity||'common'})),closeup: speaking||victory||nearDiscovery,eyeLead:combat?'target':'camera'};
}
export function silhouetteCue({role='lead',element='clay',mounted=false}={}){const accents={clay:'broad_hem',water:'flowing_sash',aether:'high_collar',ash:'split_coat',echo:'ringed_mantle',verdant:'leafed_shoulder'};return {role,accent:accents[element]||'distinct_hem',mounted,outlineStrength:role==='lead'?1:.7};}
