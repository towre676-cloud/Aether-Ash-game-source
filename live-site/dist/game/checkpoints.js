// A chapter can continue directly into the next region, without visiting home.
export function checkpointCandidate(recipe,map,flags,fighting,modal){
 const chapter=flags?.[0],last=(recipe.campaign?.missions||0)+1;
 if(!Number.isInteger(chapter)||chapter<1||chapter>last||fighting||(modal&128))return null;
 if(map===0||map===0xeb||!recipe.locations?.some(row=>row.location===map))return null;
 return `${chapter}:${flags[1]}:${flags[2]}`;
}
