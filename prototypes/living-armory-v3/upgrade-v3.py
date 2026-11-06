from pathlib import Path
root=Path(__file__).resolve().parent
p=root/'src/armory.mjs';s=p.read_text()
s=s.replace("const cleanObj=o=>Object.fromEntries(Object.entries(o??{}).filter(([,v])=>Number.isFinite(v)&&v!==0));", """const cleanObj=o=>Object.fromEntries(Object.entries(o??{}).filter(([,v])=>Number.isFinite(v)&&v!==0));
export const IMPRINT_STATS=Object.freeze(['attack','armor','vigor','ward','precision','focus','haste','pierce','block','shielding','resonance','leech','discovery',...ELEMENTS]);
/** Ordered pair resonance grammar; a chord only wakes when both voices have two sources. */
export const HARMONIC_CHORDS=Object.freeze([
 {id:'kindled-orchard',name:'The Kindled Orchard',elements:['ember','verdant'],when:'organic terrain',attack:.06,guard:.015},
 {id:'memory-in-water',name:'Memory in Water',elements:['tide','echo'],when:'water terrain',attack:.055,guard:.035},
 {id:'sky-furnace',name:'Sky Furnace',elements:['stone','aether'],when:'resonant ground',pierce:.07},
 {id:'bell-of-embers',name:'Bell of Embers',elements:['ember','echo'],when:'resonance ≥ 45%',attack:.05},
 {id:'river-root',name:'River Root',elements:['tide','verdant'],when:'wet or organic terrain',guard:.055},
 {id:'living-bastion',name:'Living Bastion',elements:['stone','verdant'],when:'organic terrain',protection:.045},
 {id:'unfinished-song',name:'The Unfinished Song',elements:['aether','echo'],when:'harmonic enemy shield',pierce:.06}
]);""")
s=s.replace(" effectiveItemStats(item){const out={...item.stats};", """ /** Retune one focused statistic, never rewriting the artifact's base, set or history. */
 imprintItem(id,stat){const f=this.get(id);if(!f)return {ok:false,reason:'missing'};
  if(!IMPRINT_STATS.includes(stat))return {ok:false,reason:'stat'};
  const item=f.item,rolls=item.imprint?.rolls||0;if(rolls>=12)return {ok:false,reason:'maxed'};
  const cost={scrap:12+9*rolls,essence:4+Math.floor(item.level/12)+2*rolls,starshard:RARITIES.indexOf(item.rarity)>=4?1:0};
  if(Object.entries(cost).some(([k,v])=>(this.state.resources[k]||0)<v))return {ok:false,reason:'resources',cost};
  const value=Math.max(1,Math.round((4+item.level*.32)*(1+.13*RARITIES.indexOf(item.rarity))*(1+.07*(item.upgrade||0))));
  for(const [k,v]of Object.entries(cost))this.state.resources[k]-=v;
  const old=item.imprint;
  item.imprint={stat,value,rolls:rolls+1};
  item.itemPower=Math.max(1,item.itemPower-(old?Math.ceil(old.value/3):0)+Math.ceil(value/3));
  this.emit('imprint',{item,stat,value,cost});return {ok:true,item,stat,value,cost};
 }
 /** Item voices and socketed rune voices form a material chord, bounded independently of rendering quality. */
 gearResonance(overrides={}){const counts=Object.fromEntries(ELEMENTS.map(e=>[e,0]));
  for(const item of Object.values({...this.state.gear,...overrides})){if(!item)continue;if(ELEMENTS.includes(item.element))counts[item.element]++;
   for(const socket of item.runes||[]){const element=RUNES.find(x=>x.id===socket.id)?.element;if(element)counts[element]++;}}
  const active=HARMONIC_CHORDS.filter(chord=>chord.elements.every(e=>counts[e]>=2)).map(chord=>({...chord,mode:'chord'}));
  for(const element of ELEMENTS){if(counts[element]>=3)active.push({id:`overtone-${element}`,name:`${element[0].toUpperCase()+element.slice(1)} Overtone`,mode:'overtone',element,when:'matching ground and attack',attack:counts[element]>=5?.055:.03});}
  return {counts,active};
 }
 effectiveItemStats(item){const out={...item.stats};if(item.imprint&&IMPRINT_STATS.includes(item.imprint.stat))out[item.imprint.stat]=(out[item.imprint.stat]||0)+item.imprint.value;""")
s=s.replace(" const shield=clamp((Number(enemyShielding)||0)*(1-rawPierce),0,.95);", """ const harmony=this.gearResonance();
 const activeHarmonies=harmony.active.map(h=>{
  const engaged=h.mode==='overtone'?h.element===element&&terrainElement===element:
   h.id==='kindled-orchard'?organicTerrain:
   h.id==='memory-in-water'?waterTerrain:
   h.id==='sky-furnace'?terrainResonance>=.4:
   h.id==='bell-of-embers'?terrainResonance>=.45:
   h.id==='river-root'?waterTerrain||organicTerrain:
   h.id==='living-bastion'?organicTerrain:
   h.id==='unfinished-song'?harmonicShield:false;
  return {...h,engaged};
 });
 const engaged=activeHarmonies.filter(x=>x.engaged);
 const harmonyPierce=clamp(engaged.reduce((sum,h)=>sum+(h.pierce||0),0),0,.14);
 rawPierce=clamp(rawPierce+harmonyPierce,0,.90);
 const shield=clamp((Number(enemyShielding)||0)*(1-rawPierce),0,.95);""")
s=s.replace(" const damageFactor=clamp((1-shield)*(1+.004*(s.precision||0))*elemental*nonlinearity,.1,6);", """ const harmonyAttack=clamp(engaged.reduce((sum,h)=>sum+(h.attack||0),0),0,.20);
 let damageFactor=clamp((1-shield)*(1+.004*(s.precision||0))*elemental*nonlinearity*(1+harmonyAttack),.1,6);""")
s=s.replace(" let guard=clamp((s.shielding||0)/200+terrain*(s.block||0)/300,0,.55);", """ protection=clamp(protection+engaged.reduce((sum,h)=>sum+(h.protection||0),0),0,.92);
 let guard=clamp((s.shielding||0)/200+terrain*(s.block||0)/300,0,.55);""")
s=s.replace(" let grip=clamp(environmentGrip+(.004*s.haste)-.1*(1-terrain),0,1);", """ guard=clamp(guard+engaged.reduce((sum,h)=>sum+(h.guard||0),0),0,.70);
 let grip=clamp(environmentGrip+(.004*s.haste)-.1*(1-terrain),0,1);""")
s=s.replace("   runeResonance:runes,eventHooks:onEvent,patrolDetectionMultiplier", "   runeResonance:runes,harmonyResonance:harmony.counts,harmonies:activeHarmonies,harmonyAttack,harmonyPierce,eventHooks:onEvent,patrolDetectionMultiplier")
s=s.replace(" if(!Array.isArray(item.runes||[])||(item.runes||[]).length>(item.sockets||0)"," if(item.imprint&&(!IMPRINT_STATS.includes(item.imprint.stat)||!Number.isInteger(item.imprint.rolls)||item.imprint.rolls<1||item.imprint.rolls>12||!Number.isFinite(item.imprint.value)||item.imprint.value<1||item.imprint.value>5000))throw Error('Invalid attunement imprint');if(!Array.isArray(item.runes||[])||(item.runes||[]).length>(item.sockets||0)")
p.write_text(s)

p=root/'index.html';s=p.read_text()
anchor='<details class="hunt-journal">'
assert anchor in s
insert='''<div class="imprint-station"><div class="atelier-top"><div class="eyebrow">THE ECHO-ENGRAVER</div><strong>Choose an artifact's fate</strong><small>Focus one permanent secondary stat without destroying its material, sockets, legendary power or identity. Retuning has escalating costs.</small></div><div class="imprint-controls"><select id="imprintStat" aria-label="Choose a focused secondary statistic"></select><button id="imprintBtn" class="secondary-button gold-button">✦ Imprint</button></div><div class="rune-hint" id="imprintHint"></div></div><div class="harmony-station" id="harmonyPanel" aria-live="polite"></div>'''
s=s.replace(anchor,insert+anchor,1);p.write_text(s)

p=root/'src/ui.mjs';s=p.read_text()
s=s.replace("import {Armory,GRID_SIZES} from './armory.mjs';", "import {Armory,GRID_SIZES,IMPRINT_STATS} from './armory.mjs';")
s=s.replace(" $('setSummary').innerHTML=sets.length?", " $('setSummary').innerHTML=sets.length?")
needle="`<strong>NO SET ATTUNED</strong><small>Gather pieces of the same covenant to awaken set bonuses.</small>`;"
assert needle in s
s=s.replace(needle,"`<strong>NO SET ATTUNED</strong><small>Gather pieces of the same covenant to awaken set bonuses.</small>`;")
s=s.replace("${set?`<div class=\"effect-panel\"><b>◈ ${escape(set.name.toUpperCase())}</b><p>${escape(set.text)}</p></div>`:''}<p class=\"item-lore\">", "${set?`<div class=\"effect-panel\"><b>◈ ${escape(set.name.toUpperCase())}</b><p>${escape(set.text)}</p></div>`:''}${i.imprint?`<div class=\"effect-panel\"><b>✧ FOCUSED MEMORY</b><p>+${i.imprint.value} ${escape(STAT_LABELS[i.imprint.stat]||i.imprint.stat)} · ${i.imprint.rolls} engravings</p></div>`:''}<p class=\"item-lore\">")
needle=" $('engraveBtn').disabled=!item||filled>=limit;$('extractBtn').disabled=!item||filled===0;"
assert needle in s
s=s.replace(needle,needle+"\n const stat=$('imprintStat').value,rolls=item?.imprint?.rolls||0;const imCost={scrap:12+9*rolls,essence:4+Math.floor((item?.level||1)/12)+2*rolls,starshard:item&&['legendary','mythic'].includes(item.rarity)?1:0};$('imprintHint').textContent=item?`${item.name} · ${item.imprint?`Current: +${item.imprint.value} ${STAT_LABELS[item.imprint.stat]||item.imprint.stat} · `:''}${Object.entries(imCost).filter(([,v])=>v).map(([k,v])=>`${v} ${k}`).join(' · ')} · ${rolls}/12 retunings`:'Select an artifact to focus its secondary statistic.';$('imprintBtn').disabled=!item||rolls>=12||!stat;\n const harmonies=game.gearResonance();$('harmonyPanel').innerHTML=`<div class=\"atelier-top\"><div class=\"eyebrow\">THE MATERIAL HARMONICS</div><strong>Equipment changes the world</strong><small>Equipped element and socketed rune voices form true numerical chords, activated by ground and enemy shielding.</small></div><div class=\"voice-graph\">${Object.entries(harmonies.counts).map(([elem,n])=>`<div class=\"voice-node\" style=\"--voice:${colors[elem]||'#ddd'}\"><span>${escape(elem)}</span><b>${n}</b></div>`).join('')}</div><div class=\"chord-list\">${harmonies.active.map(c=>`<div class=\"chord\"><b>${escape(c.name)}</b><small>${escape(c.when)}${c.attack?` · +${Math.round(c.attack*100)}% offense`:''}${c.pierce?` · +${Math.round(c.pierce*100)}% pierce`:''}${c.guard?` · +${Math.round(c.guard*100)}% guard`:''}</small></div>`).join('')||'<span class=\"muted\">Equip two of each participating element to awaken paired harmonics, or three of one element to awaken an overtone.</span>'}</div>`;")
needle="function init(){ $('craftSlot').innerHTML="
assert needle in s
s=s.replace(needle,"function init(){ $('imprintStat').innerHTML=IMPRINT_STATS.map(k=>`<option value=\"${escape(k)}\">${escape(STAT_LABELS[k]||k)}</option>`).join('');$('craftSlot').innerHTML=")
needle=" $('engraveBtn').addEventListener('click',()=>{"
assert needle in s
s=s.replace(needle," $('imprintStat').addEventListener('change',renderAtelier);$('imprintBtn').addEventListener('click',()=>{const result=game.imprintItem(selectedId,$('imprintStat').value);toast(result.ok?`${STAT_LABELS[result.stat]||result.stat} engraved +${result.value} on the selected artifact.`:result.reason==='resources'?`Missing materials: ${Object.entries(result.cost).filter(([,v])=>v).map(([k,v])=>`${v} ${k}`).join(', ')}.`:result.reason==='maxed'?'This artifact has reached its 12-imprint limit.':`Engraving unavailable: ${result.reason}`);});\n"+needle)
p.write_text(s)

p=root/'src/armory.css';s=p.read_text();s+='''\n/* Material mathematics become visible in the gear window; compact on small phones. */
.imprint-station,.harmony-station{margin-top:12px;border:1px solid #a68a5d73;padding:13px;background:linear-gradient(122deg,#111e27 30%,#222c31 72%,#171d23);box-shadow:inset 0 0 0 2px #0a151d}
.imprint-controls{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap}
.imprint-controls select{flex:2;min-width:130px;max-width:100%;background:#101c26;color:#dfd0b2;border:1px solid #7b755c;padding:10px;font:11px var(--serif)}
.imprint-controls button{min-height:36px;flex:1}
.voice-graph{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;margin-top:12px}
.voice-node{background:linear-gradient(155deg,#13232e,#0b171e);border:1px solid color-mix(in srgb,var(--voice) 48%,#46515a);text-align:center;padding:7px 2px;min-width:0}
.voice-node span{display:block;font:7px var(--sans);text-transform:uppercase;letter-spacing:.3px;color:var(--voice);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.voice-node b{font:17px var(--serif);color:#f4e3be;display:block;margin-top:4px}
.chord-list{display:grid;gap:6px;margin-top:10px;max-height:184px;overflow:auto}
.chord{border-left:2px solid #9eafad;background:#20323c99;padding:7px 9px}
.chord b,.chord small{display:block}.chord b{font:600 11px var(--serif);color:#e9cda0}.chord small{font:9px/1.45 var(--sans);color:#aac5c8;margin-top:3px}
@media(max-width:390px){.voice-node span{font-size:6px}.voice-node b{font-size:14px}.imprint-controls select{flex-basis:100%}}
''';p.write_text(s)
print('v3 sources updated')
