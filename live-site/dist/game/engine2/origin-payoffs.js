import {ORIGINS} from './origin-content.js?v=5.18.0';
const rows=[
 ['family-remedies','care',50,'Mara’s neighbours','Mara names the clinic neighbour who kept the family shelf stocked. They promise to leave a dry place and a steady hand for your return.','Ask the family’s neighbours to prepare a safe return','Use the neighbours’ clinic passage'],
 ['workshop-conductors','release',4,'The lending bench','Rook lays out a conductor with a release you can reach from either side. The signed loan lets another worker use the same plan.','Ask Rook to prepare the release conductors','Use the lending bench’s instrumentworks passage'],
 ['lowbank-clinic','care',112,'The neighbourhood clinic','Dara gives each traveller the name of someone waiting at the clinic. No one has to make the next return alone.','Arrange a return with Dara’s clinic','Use the clinic’s dry embankment stair'],
 ['lowbank-relief','release',112,'The travelling relief line','The boat crew marks a gap between pressure surges. The relief stores can move through it while a guard gathers another charge.','Coordinate a travelling relief approach','Use the relief crew’s embankment passage'],
 ['public-bench','care',4,'The public repair bench','A worker tests your loose straps before testing the machine. The published plan has made the workshop useful to people Rook has never met.','Have the public bench brace the travelling kit','Use the workers’ instrumentworks passage'],
 ['contract-drawer','release',4,'The unsigned contract','The duplicate plate still has the omitted release marked in Rook’s hand. The foreman can no longer say nobody knew where it belonged.','Study the omitted release in the contract','Use the contract runners’ instrumentworks passage'],
 ['rail-crossing','release',214,'The passenger crossing','The porter walks the signal interval with you. Passengers can cross during the return instead of waiting for an inspector’s permission.','Learn the porter’s crossing interval','Take the public crossing to the refuge'],
 ['rail-relief','care',214,'The relief platform','The stretcher crew lays down a brace where the old step was. Brass recognises the extra width before anybody mentions the order.','Ask the stretcher crew to brace your return','Take the level relief way to the refuge'],
 ['shared-water','care',48,'The two-key gate house','A keeper from each bank checks the other’s water jar. The agreement is now a daily action, not a signature left at the sluice.','Prepare a shared-water resting point','Take the gate-house bypass'],
 ['ferry-record','release',47,'The public tide record','The ferryman points to a blank interval on the new chart. Both banks can use that pause without waiting for one keeper to answer.','Plan an approach from the public tide record','Follow the recorded tide walk to the passages'],
 ['family-copies','release',234,'The voluntary copies desk','A family chooses which copy may leave the shelf. Its margin marks the service interval when the archive’s listening machinery is quiet.','Ask permission to use the copied service interval','Use the families’ unindexed stair'],
 ['witness-desk','care',213,'The protected witness desk','The clerk asks where the account may be heard before opening it. A second chair and a clear exit remain beside the desk.','Arrange a protected return with the witness desk','Take the witness desk’s east-wing passage'],
 ['listening-watch','care',29,'The shared listening watch','The operator leaves an entire interval for a weak station to answer. Someone has brought a blanket for the person who stays through it.','Ask the listening watch to hold a quiet return','Take the watch’s sheltered office stair'],
 ['reply-windows','release',30,'The independent reply windows','A distant operator answers in their own allotted interval. Veyr can now tell where a returning charge must pause to leave that space.','Time an approach to the independent replies','Follow the reply cable to the cargo hold']
];
const PAYOFFS=new Map(rows.map(([id,mode,to,name,text,action,route])=>[id,{id,mode,to,name,text,action,route}]));
export function originPayoff(record){return PAYOFFS.get(record?.effect)||null;}
export function originRouteReady(state,record){const origin=ORIGINS.find(o=>o.id===record?.originId);return !!origin&&!!state.chronicle?.services?.includes(record.effect)&&(origin.chapter===1?!!state.story?.weapon&&!!state.story?.firstCore:state.bosses?.includes(origin.chapter));}
export function activateOriginSupport(state,record){
 const p=originPayoff(record),origin=ORIGINS.find(o=>o.id===record?.originId),c=state.chronicle;
 if(!p||!origin||origin.effects[record.destiny]!==record.effect||c?.phase!=='present'||!c.records?.some(r=>r.originId===record.originId&&r.effect===record.effect)||state.chapter<origin.chapter)return false;
 c.services??=[];if(!c.services.includes(record.effect))c.services.push(record.effect);
 c.support={version:1,originId:origin.id,region:origin.chapter,mode:p.mode};return true;
}
export function originLegacyContext(world){
 const c=world.state?.chronicle,s=c?.support;
 if(c?.phase!=='present'||!s||world.scene?.originId||world.scene?.chapter!==s.region)return {};
 const record=c.records?.find(r=>r.originId===s.originId),p=originPayoff(record),origin=ORIGINS.find(o=>o.id===s.originId);
 if(!p||!origin||origin.chapter!==s.region||p.mode!==s.mode||!c.services?.includes(record.effect))return {};
 return {originSupport:{version:1,originId:s.originId,region:s.region,mode:s.mode}};
}
export function originPayoffView(state,scene){
 if(state.chronicle?.phase!=='present'||scene?.originId)return [];
 return (state.chronicle.records||[]).flatMap(record=>{const p=originPayoff(record),o=ORIGINS.find(o=>o.id===record.originId);return p&&o?.chapter===scene?.chapter?[{originId:o.id,effect:record.effect,name:p.name,mode:p.mode,serviceOpen:!!state.chronicle.services?.includes(record.effect),routeReady:originRouteReady(state,record),routeTarget:p.to}]:[];});
}
export function validateOriginPayoffs(state){
 const c=state.chronicle;if(!c)return;
 if(c.services!==undefined&&(!Array.isArray(c.services)||c.services.length>14||new Set(c.services).size!==c.services.length||c.services.some(id=>!PAYOFFS.has(id)||!c.records?.some(r=>r.effect===id&&ORIGINS.find(o=>o.id===r.originId)?.effects[r.destiny]===id))))throw Error('Invalid inherited service');
 if(c.support!==undefined){const s=c.support,record=c.records?.find(r=>r.originId===s?.originId),p=originPayoff(record),o=ORIGINS.find(o=>o.id===s?.originId);if(!s||s.version!==1||!p||!o||s.region!==o.chapter||s.mode!==p.mode||!c.services?.includes(record.effect)||c.phase!=='present')throw Error('Invalid inherited support');}
}
