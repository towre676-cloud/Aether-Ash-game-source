const CLUES={tracks:{sense:'sight',weight:2},resonance:{sense:'hearing',weight:3},vegetation:{sense:'ecology',weight:2},routine:{sense:'people',weight:1},geometry:{sense:'shape',weight:2},weather:{sense:'weather',weight:1}};
export function inferDiscoveries(observations=[],known=[]){
 const tally={};for(const o of observations){if(!CLUES[o.kind])continue;(tally[o.target]??={score:0,kinds:new Set()});tally[o.target].score+=CLUES[o.kind].weight;tally[o.target].kinds.add(o.kind)}
 return Object.entries(tally).filter(([id,x])=>x.score>=4&&x.kinds.size>=2&&!known.includes(id)).map(([id,x])=>({id,confidence:Math.min(1,x.score/7),clues:[...x.kinds],marker:false}));
}
export function cluePresentation(clue){return {text:clue.text||`Something here answers to ${clue.kind}.`,pulse:false,worldAnchored:true,expires:clue.urgent?9:0};}
