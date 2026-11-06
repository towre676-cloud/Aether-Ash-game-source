import {ITEMS} from './repertoire.js?v=5.38';
import {settleOpening} from './opening.js?v=5.18.0';
const ROUTINE=new Set(['furnishing','cache','secret','clue','switch','note','riddle','frontier-landmark','life','lore-item','lore-device','lore-crossing']);
const clone=v=>JSON.parse(JSON.stringify(v));
export function isFieldInspection(o){return !!o&&!o.originId&&!o.storyEvent&&!o.rivalId&&(ROUTINE.has(o.type)||!!o.physicalId||!!o.battleRelic||o.life&&o.lifeKind!=='resident');}
const snapshot=s=>({items:{...s.items},gold:s.gold,cores:[...s.cores],supports:[...s.supports],strain:s.party.reduce((n,id)=>n+(s.heroes[id]?.strain||0),0)});
export function inspectionChanges(before,s){const out=[];for(const id of new Set([...Object.keys(before.items),...Object.keys(s.items)])){const n=(s.items[id]||0)-(before.items[id]||0);if(n)out.push({text:(n>0?'+':'')+n+' '+(ITEMS.find(i=>i.id===id)?.name||id),kind:n>0?'gain':'spent'});}const gold=s.gold-before.gold;if(gold)out.push({text:(gold>0?'+':'')+gold+' credits',kind:gold>0?'gain':'spent'});for(const id of s.cores.filter(id=>!before.cores.includes(id)))out.push({text:id+' Mako recovered',kind:'gain'});for(const id of s.supports.filter(id=>!before.supports.includes(id)))out.push({text:id+' support recovered',kind:'gain'});const strain=before.strain-s.party.reduce((n,id)=>n+(s.heroes[id]?.strain||0),0);if(strain>0)out.push({text:'Strain eased',kind:'restore'});return out;}
/** Runtime presentation adapter. Story dialogue retains its existing lifecycle. */
export function installFieldFeedback(w,present){
 const interact=w.interact.bind(w),text=w.text.bind(w),choose=w.choose.bind(w),onDialog=w.callbacks.onDialog;let context=null;
 function within(o,fn){const previous=context;context={o,scene:w.state.scene,before:snapshot(w.state)};try{return fn();}finally{context=previous;}}
 function report(pages,choices){const c=context;if(!c)return;const messages=(Array.isArray(pages)?pages:[pages]).filter(Boolean).map(String);const effects=inspectionChanges(c.before,w.state);c.before=snapshot(w.state);w.state.fieldNotes??=[];w.state.fieldNotes.push({scene:c.scene,label:c.o.label||'Inspection',pages:messages,effects:effects.map(e=>e.text)});if(w.state.fieldNotes.length>40)w.state.fieldNotes.shift();w.state.mode='field';
  const actions=(choices||[]).map(([label,action])=>({label,action:()=>{if(w.state.scene!==c.scene||w.state.mode!=='field'||!c.o.xy||Math.hypot(w.state.x-c.o.xy[0]-.5,w.state.y-c.o.xy[1]-.5)>3)return false;return within(c.o,()=>{action();return true;});}}));
  present({label:c.o.label||'Inspection',pages:messages,effects,actions,scene:c.scene,xy:c.o.xy,object:c.o});
 }
 w.text=(pages,after)=>{if(!context)return text(pages,after);const lines=Array.isArray(pages)?pages:[pages];if(context.o.type!=='furnishing'&&lines.some(p=>/^(SABLE|ROOK|IONA|MARA|BRASS|RIVEN|MIRA|VEYR):/m.test(String(p))))return text(pages,after);report(pages);after?.();if(w.state.mode==='field')settleOpening(w);};
 w.choose=(message,choices)=>context?report(message,choices):choose(message,choices);
 w.callbacks.onDialog=value=>{if(context&&value.silent){report(value.pages,value.choices?.map(c=>[c.label,c.action]));if(!value.choices)value.after?.();return;}onDialog(value);};
 w.interact=o=>{if(!isFieldInspection(o)||w.state.mode!=='field'||!w.available(o))return interact(o);if(o.type==='furnishing'&&o.xy&&Math.hypot(w.state.x-o.xy[0]-.5,w.state.y-o.xy[1]-.5)>2.05)return w.notice('Move closer to examine '+o.label.toLowerCase()+'.');return within(o,()=>{if(o.type==='furnishing'&&o.householdId)return inspectFurniture(w,o,report);return interact(o);});};
 return {report:()=>context,within};
}
function inspectFurniture(w,o,report){const r=w.state.household??={examined:[],opened:[]};r.openFurniture??=[];const first=!r.examined.includes(o.householdId);if(first)r.examined.push(o.householdId);let message=o.text;
 if(o.supply){if(r.opened.includes(o.householdId))message='The shared compartment is empty. You leave the remaining household supplies alone.';else{r.opened.push(o.householdId);if(!r.openFurniture.includes(o.householdId))r.openFurniture.push(o.householdId);w.state.items[o.supply]=(w.state.items[o.supply]||0)+1;message='You open the shared compartment and pocket the remedy left for travellers.';}}
 else if([1,2,7,10,12,19,20].includes(o.furniture)){const open=r.openFurniture.includes(o.householdId);if(open){r.openFurniture=r.openFurniture.filter(id=>id!==o.householdId);message='You close it carefully. Everything stays where its owner left it.';}else{r.openFurniture.push(o.householdId);message='You open it. '+(o.detail||o.text)+' You leave the contents in place.';}}
 else if([3,4].includes(o.furniture)){for(const h of w.activeHeroes)h.strain=Math.max(0,(h.strain||0)-8);message='You hold your hands toward the warmth. The ache eases.';}
 else if(!first)message=o.detail||o.text;
 report([message,o.semioticDetail].filter(Boolean).join(' '));return true;
}
