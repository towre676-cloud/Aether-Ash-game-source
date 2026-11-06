/** Original vector marks for the actual crystal recipe. Names and payment text
 * remain beside these decorative icons; hue is never the only distinction. */
const PALETTE=Object.freeze({flame:'#f49a65',frost:'#a8e2f1',volt:'#eed37c',tide:'#79cddb',gravity:'#bca2eb',mend:'#a6d6ac',ward:'#e4c68b',gale:'#a6d6c5',shade:'#c3a4da',earth:'#d7ad80',neutral:'#b7c9c3'});
const NAMES=Object.freeze({flame:'Flame',frost:'Frost',volt:'Volt',tide:'Tide',gravity:'Gravity',mend:'Mend',ward:'Ward',gale:'Gale',shade:'Shade',earth:'Earth',neutral:'Technique'});
const PURPOSES=Object.freeze({heal:'Restores an ally',shield:'Protects an ally',interrupt:'Interrupts a charged attack',echo:'Repeats after a delay',field:'Leaves a lasting field',link:'Combines with an ally',counter:'Prepares a counter',strike:'Strikes a target'});
const SHAPES=Object.freeze({single:'one target',chain:'connected targets',burst:'an area',line:'a line',field:'a persistent area'});
const SUPPORT_SHAPES=Object.freeze({focus:'single',chain:'chain',burst:'burst',pierce:'line',echo:'single',counter:'single',field:'field',leech:'single',quick:'single',break:'single',link:'burst',overdrive:'burst'});
export function techniqueIconSpec(tech={}){
 tech=tech&&typeof tech==='object'?tech:{};
 const candidate=tech.core||String(tech.id||'').split(':')[0],core=Object.hasOwn(PALETTE,candidate)?candidate:'neutral',support=tech.support||String(tech.id||'').split(':')[1]||'';
 const shape=Object.hasOwn(SHAPES,tech.shape)?tech.shape:SUPPORT_SHAPES[support]||'single',rawRank=Number(tech.rank),rank=Number.isFinite(rawRank)?Math.max(1,Math.min(3,Math.floor(rawRank))):1;
 const effects={field:tech.field===true||support==='field',link:tech.link===true||support==='link',echo:tech.echo===true||support==='echo',counter:tech.counter===true||support==='counter',interrupt:tech.interrupt===true||support==='break'||core==='gravity',shield:core==='ward',heal:tech.healing===true||core==='mend'};
 const purposes=Object.keys(PURPOSES).filter(id=>id!=='strike'&&effects[id]);
 // The support is the recipe's visible action; retain all effects in the spec.
 const purpose=['field','link','echo','counter','interrupt','shield','heal'].find(id=>effects[id])||'strike';
 return {core,coreName:NAMES[core],color:PALETTE[core],purpose,purposeLabel:PURPOSES[purpose],purposes:purposes.length?purposes:['strike'],shape,shapeLabel:SHAPES[shape],rank,label:[NAMES[core],PURPOSES[purpose],SHAPES[shape],'rank '+rank].join(' · ')};
}
// Each primary mark has a different silhouette, including in grayscale.
const CORE_MARKS={
 flame:[['path',{d:'M23 8c2 7-4 9-2 14 2-1 4-4 4-7 6 5 9 10 6 16-2 4-7 6-12 3-6-3-6-10-2-15-1 6 1 7 2 8-1-7 5-10 4-19Z',fill:'currentColor','fill-opacity':'.22'}],['path',{d:'M23 8c2 7-4 9-2 14 2-1 4-4 4-7 6 5 9 10 6 16-2 4-7 6-12 3-6-3-6-10-2-15-1 6 1 7 2 8-1-7 5-10 4-19Z'}],['path',{d:'M23 25c4 3 5 6 2 9'}]],
 frost:[['path',{d:'M23 9v27M11 16l24 14M11 30l24-14M19 12l4 4 4-4M19 33l4-4 4 4M12 21l5-1-1-5M30 30l-1-5 5-1M16 31l1-5-5-1M34 21l-5-1 1-5'}]],
 volt:[['path',{d:'m26 8-14 18h10l-3 11 16-21H24l2-8Z',fill:'currentColor','fill-opacity':'.22'}],['path',{d:'m26 8-14 18h10l-3 11 16-21H24l2-8Z'}]],
 tide:[['path',{d:'M11 27c5 2 7-7 12-8 5-1 9 2 8 6-1 4-6 5-7 2 7 0 5-8 0-7M11 32c5 4 8-3 13-1 4 2 7 3 11-1M14 15c4 0 6-3 8-5'}]],
 gravity:[['circle',{cx:23,cy:23,r:5,fill:'currentColor','fill-opacity':'.35'}],['ellipse',{cx:23,cy:23,rx:15,ry:7,transform:'rotate(-32 23 23)'}],['path',{d:'M20 9c-5 8-4 22 3 28M29 10c-1-2-3-3-5-3'}],['circle',{cx:35,cy:16,r:2.1,fill:'currentColor',stroke:'none'}]],
 mend:[['path',{d:'M23 35V21M23 26c-9 1-12-6-12-12 8-1 13 4 12 12ZM23 21c-1-7 4-12 12-12 1 8-4 13-12 12Z',fill:'currentColor','fill-opacity':'.16'}],['path',{d:'m15 18 8 8 8-12M17 34h12'}]],
 ward:[['path',{d:'m23 8 12 5v9c0 7-5 11-12 15-7-4-12-8-12-15v-9l12-5Z',fill:'currentColor','fill-opacity':'.16'}],['path',{d:'m23 8 12 5v9c0 7-5 11-12 15-7-4-12-8-12-15v-9l12-5ZM17 22l4 4 9-9'}]],
 gale:[['path',{d:'M10 18h18c8 0 7-10 1-8-3 1-3 4-2 5M10 24h25M13 30h13c6 0 6 8 1 8-3 0-4-2-3-4'}]],
 shade:[['path',{d:'M30 9c-10 1-16 16-4 24-9 3-19-3-18-13C9 12 18 7 30 9Z',fill:'currentColor','fill-opacity':'.2'}],['path',{d:'M30 9c-10 1-16 16-4 24-9 3-19-3-18-13C9 12 18 7 30 9ZM33 15v8M29 19h8'}]],
 earth:[['path',{d:'m9 32 7-15 8-6 9 12 4 9H9Z',fill:'currentColor','fill-opacity':'.17'}],['path',{d:'m9 32 7-15 8-6 9 12 4 9H9ZM24 11l-2 12 6 4-4 5M16 17l6 6M12 27h6'}]],
 neutral:[['circle',{cx:23,cy:23,r:12}],['path',{d:'M23 15v16M15 23h16'}]]
};
const BADGES={
 heal:[['path',{d:'M37 31v10M32 36h10'}]],
 shield:[['path',{d:'m37 30 5 2v4c0 3-2 5-5 7-3-2-5-4-5-7v-4l5-2Z'}]],
 interrupt:[['path',{d:'m32 32 10 9M41 31l-3 4M36 38l-3 4M36 30l-2-2M43 35l2-1'}]],
 echo:[['path',{d:'M33 32c3-2 6-2 9 1M32 36c3-2 6-2 9 1M32 40c3-2 6-2 9 1'}]],
 field:[['ellipse',{cx:37,cy:39,rx:6,ry:3}],['path',{d:'M33 36v-3M37 35v-4M41 36v-3'}]],
 link:[['path',{d:'m36 34 2-2a3 3 0 0 1 4 4l-3 3M38 38l-2 2a3 3 0 0 1-4-4l3-3M35 38l4-4'}]],
 counter:[['path',{d:'M33 34a5 5 0 1 1-1 5M33 30v4h4M39 36l-4 4'}]],
 strike:[['path',{d:'m33 41 9-11-1 7-8 4ZM32 36l6 5'}]]
};
const COMMAND_MARKS={
 attack:[['path',{d:'m14 34 17-23 4 2-14 26M14 27l13 9M11 39l7-9'}]],
 mako:[['path',{d:'m23 8 10 10-3 14-7 6-8-6-3-14L23 8ZM12 18h21M23 8v30M15 32l8-14 7 14'}]],
 personal:[['path',{d:'M12 35c0-7 5-11 11-11s11 4 11 11M23 9a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z'}]],
 guard:CORE_MARKS.ward,
 item:[['path',{d:'M18 9h10v6l6 8v12H12V23l6-8V9ZM17 9h12M18 15h10M23 23v9M19 27h8',fill:'currentColor','fill-opacity':'.1'}]],
 retreat:[['path',{d:'M27 9h9v27h-9M28 23H10M17 16l-7 7 7 7'}]],
 field:BADGES.field.map(([tag,attrs])=>[tag,{...attrs,transform:'translate(-32 -28) scale(1.5)'}]),
 objectives:[['path',{d:'M13 11h21v27H13V11ZM19 8h9v6h-9V8ZM18 23l3 3 7-7M19 32h10'}]]
};
function stylesheet(){if(typeof document==='undefined'||document.querySelector('link[data-technique-icons-style]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./technique-icons.css?v=5.13.0',import.meta.url).href;link.dataset.techniqueIconsStyle='';document.head.append(link);}
function vector(tag,attrs={}){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));return node;}
function shell(spec,{size=44,title=spec.label}={}){
 stylesheet();const raw=Number(size),pixels=Number.isFinite(raw)?Math.max(16,Math.min(96,raw)):44,span=document.createElement('span');span.className='technique-icon'+(pixels<32?' technique-icon-small':'');span.setAttribute('aria-hidden','true');span.dataset.core=spec.core;span.dataset.purpose=spec.purpose;span.dataset.shape=spec.shape;span.dataset.rank=String(spec.rank);span.style.setProperty('--technique-size',pixels+'px');span.style.setProperty('--technique-color',spec.color);
 const svg=vector('svg',{viewBox:'0 0 48 48',fill:'none','stroke-linecap':'round','stroke-linejoin':'round',focusable:'false','aria-hidden':'true'});
 if(typeof title==='string'&&title){const label=vector('title');label.textContent=title;svg.append(label);}
 svg.append(vector('rect',{x:1.5,y:1.5,width:45,height:45,rx:10,class:'technique-icon-ground'}));span.append(svg);return {span,svg};
}
function marks(parent,definitions,cls){const group=vector('g',{class:cls});for(const [tag,attrs]of definitions)group.append(vector(tag,attrs));parent.append(group);return group;}
export function techniqueIcon(tech,options={}){
 const spec=techniqueIconSpec(tech),{span,svg}=shell(spec,options);marks(svg,CORE_MARKS[spec.core],'technique-core-mark');
 const dots=vector('g',{class:'technique-rank-mark'});for(let i=0;i<spec.rank;i++)dots.append(vector('circle',{cx:10+i*5,cy:40,r:1.35}));svg.append(dots);
 svg.append(vector('circle',{cx:37,cy:36,r:9,class:'technique-purpose-ground'}));marks(svg,BADGES[spec.purpose],'technique-purpose-mark');return span;
}
export function commandIcon(kind,options={}){
 const aliases={supply:'item',tech:'mako',objective:'objectives'},key=aliases[kind]||kind,known=Object.hasOwn(COMMAND_MARKS,key),purpose=key==='guard'?'shield':key==='item'?'heal':key==='field'?'field':'strike',spec={core:key==='guard'?'ward':'neutral',purpose,shape:'single',rank:1,color:key==='guard'?PALETTE.ward:PALETTE.neutral,label:known?key[0].toUpperCase()+key.slice(1):'Action'};
 const {span,svg}=shell(spec,options);span.classList.add('command-icon');span.dataset.command=known?key:'action';marks(svg,known?COMMAND_MARKS[key]:CORE_MARKS.neutral,'technique-command-mark');return span;
}
