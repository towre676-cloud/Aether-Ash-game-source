const LIMIT=240;
const text=value=>typeof value==='string'?value:String(value??'');

// Prefer complete authored sentences; full, untouched pages stay in the journal.
function excerpt(value,{preferLast=false}={}){
  const original=text(value),clean=original.trim();
  if(!clean)return '';
  const sentences=clean.match(/[\s\S]+?(?:[.!?…]+[”"’']*(?=\s|$)|$)/gu)?.map(s=>s.trim()).filter(Boolean)||[clean];
  if(original.length<=LIMIT&&sentences.length<=2)return original;
  const complete=sentences.filter(s=>/[.!?…][”"’']*$/u.test(s)&&s.length<=LIMIT);
  if(preferLast)complete.reverse();
  if(complete.length){
    let body=complete[0];
    if(complete[1]&&body.length+complete[1].length+1<=LIMIT)body=preferLast?complete[1]+' '+body:body+' '+complete[1];
    return body;
  }
  if(clean.length<=LIMIT)return clean;
  // Never cut a word or play a longer recording over a shortened line.
  const clause=clean.slice(0,LIMIT-1).match(/^(.{24,}[,;:])\s/u)?.[1];
  return clause?clause.slice(0,-1).trimEnd()+'.':'The full account is recorded in your journal.';
}

/** A brief spoken exchange or consequence, independent of dialog lifecycle. */
export function compactDialogueTurns(turns,{hasChoices=false}={}){
  const source=(Array.isArray(turns)?turns:[]).filter(turn=>turn&&typeof turn==='object');
  const meaningful=source.filter(turn=>text(turn.body).trim());
  const spoken=meaningful.filter(turn=>turn.kind==='dialogue'&&turn.speaker);
  let selected;
  if(spoken.length){
    selected=spoken.length>1?[spoken[0],spoken.at(-1)]:[spoken[0]];
    // A final question or condition must remain beside its actual choices.
    const final=meaningful.at(-1);
    if(hasChoices&&final&&!selected.includes(final))selected=[spoken.at(-1),final];
  }else{
    selected=hasChoices&&meaningful.length>1?[meaningful[0],meaningful.at(-1)]:meaningful.length?[meaningful.at(-1)]:source.length?[source.at(-1)]:[];
  }
  const status=[...new Set(source.flatMap(turn=>Array.isArray(turn.status)?turn.status:[]))];
  return selected.map((turn,index)=>{
    const body=excerpt(turn.body,{preferLast:hasChoices&&index===selected.length-1}),unchanged=body===text(turn.body);
    return {...turn,body,status:index===selected.length-1?status:[],voiceSegments:unchanged?turn.voiceSegments||[]:[]};
  });
}

/** Preserve the exact original pages in the existing Story journal format. */
export function archiveWorldDialogue(world,value){
  if(!world?.state||!value)return null;
  const pages=Array.isArray(value.pages)?value.pages.slice():value.pages==null?[]:[value.pages];
  if(!pages.length)return null;
  const scene=world.state.scene;
  const label=text(value.label||value.title||world.scene?.name||world.scene?.title||scene||'Conversation');
  const effects=(Array.isArray(value.effects)?value.effects:[]).map(effect=>typeof effect==='string'?effect:effect?.text).filter(effect=>typeof effect==='string');
  const note={scene,label,pages,effects};
  const notes=Array.isArray(world.state.fieldNotes)?world.state.fieldNotes:[];
  const last=notes.at(-1);
  if(last?.scene===scene&&last.label===label&&JSON.stringify(last.pages)===JSON.stringify(pages)&&JSON.stringify(last.effects)===JSON.stringify(effects))return last;
  notes.push(note);if(notes.length>40)notes.splice(0,notes.length-40);
  world.state.fieldNotes=notes;return note;
}
