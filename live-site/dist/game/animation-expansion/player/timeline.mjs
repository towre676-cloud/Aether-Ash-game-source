import {dialoguePages} from '../../engine2/dialogue-presentation.js';
export function buildTimeline(text,lines){
 const byKey=new Map(lines.map(l=>[l.speaker+'\0'+l.text,l]));let end=0;
 const turns=dialoguePages([text]).map(page=>{const line=page.voiceSegments.length?byKey.get(page.speaker+'\0'+page.body.trim()):null;const duration=line?line.duration_seconds:Math.max(2.5,page.body.length/16);const cue={...page,start:end,end:end+duration,duration,audio:line?.audio||null};end=cue.end;return cue;});
 return {turns,duration:end||2.5};
}
export function cueAt(timeline,time){return timeline.turns.find(c=>time>=c.start&&time<c.end)||timeline.turns.at(-1);}
