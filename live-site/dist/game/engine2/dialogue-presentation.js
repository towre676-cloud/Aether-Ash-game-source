import {AUTHORED_SPEAKERS} from './authored-speakers.js?v=2.5.0';
/**
 * A lossless boundary between authored dialogue and interface messages.
 * No inventory, controls, choice label, heading or unrecognized speaker is sent to voice.
 * Render block.text with textContent (or body plus a separately rendered speaker label).
 * Concatenating block.raw always reconstructs the input exactly.
 */
export const DEFAULT_SPEAKERS = Object.freeze({...AUTHORED_SPEAKERS,
 SABLE:'Sable',IONA:'Iona',ROOK:'Rook',BRASS:'Brass',RIVEN:'Riven',MIRA:'Mira',VEYR:'Veyr',
 MARA:'Mara',NELL:'Nell',FATHER:'Father',DARA:'Dara',HESPER:'Hesper',CORIN:'Corin',
 WOMAN:'Woman',MAN:'Man',CHILD:'Child',DRIVER:'Driver',WARDEN:'Warden','RAIL WARDEN':'Rail Warden',
 SENTINEL:'Sentinel',COMMANDER:'Commander',CHOIR:'Choir','THE CHOIR':'The Choir',
 MERCHANT:'Merchant',MEDIC:'Medic',KEEPER:'Keeper',WITNESS:'Witness',GUARD:'Guard'
});

// Deliberately narrow: unfamiliar prose stays narration rather than being hidden or voiced.
const SYSTEM_RULES = [
 ['inventory',/^(?:Received|Found|Reward|Rewards|Supplies|Keepsake|Learned):(?:\s|$)/i],
 ['learning',/^[A-Z][A-Z /+—–-]{2,55}\s+learned(?:\s*[—–:.]|$)/],
 ['controls',/^(?:Attack and Guard are ready\.|(?:Arrows|Controller|Keyboard|Touch controls|Controls):)/i],
 ['controls',/^(?:Press|Tap|Hold) (?:X|A|B|Y|Z|S|Enter|Start|Escape|the (?:button|stick|screen))\b/],
 ['party',/^(?:Sable|Iona|Rook|Brass|Riven|Mira|Veyr) (?:joins|joined)(?: the (?:journey|crew|party))?\.(?:\s|$)/],
 ['progress',/^\d+ hidden caches found(?:\s*·\s*\d+ keepsakes recovered)?\s*$/],
 ['inventory',/^\d+ (?:credits|Tonics?|Ethers?|Revives?)(?:\s*·\s*\d+ (?:credits|Tonics?|Ethers?|Revives?))*\s*$/i],
 ['status',/^(?:Saved\.|Saved game restored\.|Save imported\.|The spare work gear is already packed\.)$/]
];
const SPEAKER_PREFIX=/^([A-Z][A-Z ’'−–-]{1,30}):[ \t]*/u;
const HEADING=/^[A-Z0-9][A-Z0-9 ·/—–'’!?-]{3,100}$/u;
const wrapped = text => text.trimEnd().length > 0 && !/[.!?…:;”"']\s*$/u.test(text.trimEnd());
function systemReason(text){return SYSTEM_RULES.find(([,re])=>re.test(text.trim()))?.[0]||null;}
function linesWithOffsets(raw){
 const out=[];let start=0;
 for(const match of raw.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/g)){
  if(!match[0])continue;
  const part=match[0],ending=part.match(/(?:\r\n|\n|\r)$/)?.[0]||'';
  out.push({raw:part,text:ending?part.slice(0,-ending.length):part,start,end:start+part.length});start+=part.length;
 }
 return out;
}

export function presentDialogue(value,options={}){
 const raw=String(value??''),speakers={...DEFAULT_SPEAKERS,...options.speakers},blocks=[];
 let active=null,mayWrap=false;
 for(const line of linesWithOffsets(raw)){
  const stripped=line.text.trim(),reason=systemReason(line.text),prefix=line.text.match(SPEAKER_PREFIX);
  let kind='narration',speaker=null,body=line.text,sourceSpeaker=null;
  if(!stripped){kind='separator';active=null;mayWrap=false;}
  else if(reason){kind='system';active=null;mayWrap=false;}
  else if(prefix){
   sourceSpeaker=prefix[1];
   if(Object.hasOwn(speakers,sourceSpeaker)){
    kind='dialogue';speaker=speakers[sourceSpeaker];body=line.text.slice(prefix[0].length);active=speaker;mayWrap=wrapped(body);
   }else{active=null;mayWrap=false;}
  }else if(HEADING.test(stripped)){kind='heading';active=null;mayWrap=false;}
  else if(active&&mayWrap){kind='dialogue';speaker=active;mayWrap=wrapped(body);}
  else{active=null;mayWrap=false;}
  const voiceText=kind==='dialogue'?body.trim():options.voiceNarration===true&&kind==='narration'?body.trim():'';
  blocks.push({...line,kind,speaker,sourceSpeaker,body,voiceText,systemReason:reason});
 }
 // Merge only adjacent lines belonging to the same spoken turn. raw/text remain lossless.
 const turns=[];
 for(const b of blocks){
  const previous=turns.at(-1);
  if(b.voiceText&&previous&&b.kind==='dialogue'&&previous.speaker===b.speaker&&previous.end===b.start&&!b.sourceSpeaker){previous.text+='\n'+b.voiceText;previous.end=b.end;}
  else if(b.voiceText)turns.push({speaker:b.speaker||'Narrator',text:b.voiceText,start:b.start,end:b.end,kind:b.kind});
 }
 const named=[...new Set(blocks.filter(b=>b.kind==='dialogue').map(b=>b.speaker))];
 return {raw,displayText:raw,blocks,voiceSegments:turns,speakableText:turns.map(t=>t.text).join('\n'),speaker:named.length===1?named[0]:null,
  hasMultipleSpeakers:named.length>1,hasSystem:blocks.some(b=>b.kind==='system'),
  systemBlocks:blocks.filter(b=>b.kind==='system'),narrationBlocks:blocks.filter(b=>b.kind==='narration'||b.kind==='heading')};
}

/** Stable explicit text key; the voice manifest should match exact text, never a loose substring. */
export function dialogueVoiceKey(speaker,text){return String(speaker||'Narrator')+'\u0000'+String(text);}

/** One speaker per displayed turn; receipts remain visible in a separate status panel. */
export function dialoguePages(rawPages){
 const result=[];
 for(const raw of rawPages){const p=presentDialogue(raw),groups=[];for(const b of p.blocks){if(b.kind==='separator'||b.kind==='system')continue;const last=groups.at(-1),kind=b.kind==='heading'?'narration':b.kind;if(last&&last.kind===kind&&last.speaker===b.speaker&&!(kind==='dialogue'&&b.sourceSpeaker)){last.body+='\n'+b.body;last.raw+=b.raw;}else groups.push({kind,speaker:b.speaker,body:b.body,raw:b.raw,status:[]});}if(!groups.length)groups.push({kind:'system',speaker:null,body:'',raw:p.raw,status:[]});groups.at(-1).status=p.systemBlocks.map(b=>b.text);for(const g of groups){g.voiceSegments=g.kind==='dialogue'?[{speaker:g.speaker,text:g.body.trim()}]:[];result.push(g);}}
 return result;
}
