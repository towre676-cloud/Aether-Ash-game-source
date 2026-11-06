import {AuthoredMotion} from '../authored-motion.js?v=5.16.0';
import {AUTHORED_ART_FILES,AUTHORED_MOTION_ATLASES,AUTHORED_PROPS,drawAuthoredMotion,drawAuthoredProp} from '../authored-art.js?v=5.21.0';
import {characterPose} from '../character-motion.js?v=5.26.0';

const $=id=>document.getElementById(id),assets={},cards=[],actions=[['idle','Idle'],['walk','Walk'],['run','Run'],['attack','Attack'],['hit','Impact'],['guard','Guard'],['down','Defeat']];
let time=0,paused=false,last=0;
const definitions=[
 {atlas:'sable',title:'Sable',description:'Armored traveler · 16 original poses',actor:{id:0,hp:100,x:0,y:0,status:{}},hero:true},
 {atlas:'herald',title:'Ash Herald',description:'Chapter four guardian · 12 original poses',actor:{id:'herald',boss:true,hp:100,x:0,y:0,status:{}},hero:false},
 {atlas:'moonveil',title:'Moonveil Moth',description:'An ordinary creature · 9 original poses',actor:{id:'moonveil',species:'moonmoth',hp:100,x:0,y:0,status:{}},hero:false}
];
for(const def of definitions){
 const card={...def,motion:new AuthoredMotion(),mode:'idle',lastAction:0,pose:{x:0,y:0},facing:1};
 const article=document.createElement('article');article.className='actor';
 article.innerHTML=`<header><h3>${def.title}</h3><p>${def.description}</p></header><canvas width="640" height="480" aria-label="${def.title} motion preview"></canvas><div class="controls" role="group" aria-label="${def.title} actions">${actions.map(([id,label])=>`<button data-action="${id}" aria-pressed="${id==='idle'}">${label}</button>`).join('')}</div><div class="inspection"><label>Inspect <select aria-label="${def.title} pose"><option value="-1">Live sequence</option>${AUTHORED_MOTION_ATLASES[def.atlas].frames.map((f,i)=>`<option value="${i}">${i+1} · ${f.name}</option>`).join('')}</select></label><label><input type="checkbox" aria-label="Mirror ${def.title}">Face left</label></div><p class="readout" aria-live="off">Loading…</p>`;
 card.canvas=article.querySelector('canvas');card.ctx=card.canvas.getContext('2d');card.inspect=article.querySelector('select');card.readout=article.querySelector('.readout');card.buttons=[...article.querySelectorAll('button')];
 for(const button of card.buttons)button.addEventListener('click',()=>setMode(card,button.dataset.action));
 article.querySelector('input').addEventListener('change',e=>{card.facing=e.target.checked?-1:1;card.pose.facing=card.facing;draw(0);});
 card.inspect.addEventListener('change',()=>draw(0));
 $('actors').append(article);cards.push(card);
}
function fireAction(card){
 const actor=card.actor;card.lastAction=time;
 if(card.mode==='attack')card.motion.event(card.hero?{type:'damage',source:actor,actor:{id:'preview-target'},physical:true}:{type:'enemy-cast',actor},time);
 if(card.mode==='hit')card.motion.event({type:'damage',actor},time);
 if(card.mode==='guard')card.motion.event({type:'guard',actor},time);
}
function setMode(card,mode){
 card.mode=mode;card.inspect.value='-1';card.motion.reset();card.actor.hp=mode==='down'?0:100;card.actor.intent=null;card.actor.status=mode==='guard'?{guard:7}:{};
 card.pose={...card.pose,moving:mode==='walk'||mode==='run'};
 for(const button of card.buttons)button.setAttribute('aria-pressed',String(button.dataset.action===mode));
 fireAction(card);draw(0);
}
function ground(ctx,w,h){
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#213c3e';ctx.fillRect(0,0,w,h);
 const cell=32;ctx.fillStyle='#294445';
 for(let y=0;y<h;y+=cell)for(let x=0;x<w;x+=cell)if((x/cell+y/cell)%2)ctx.fillRect(x,y,cell,cell);
 ctx.fillStyle='#10272580';ctx.beginPath();ctx.ellipse(w/2,h*.80,58,13,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#d3bd8366';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(18,h*.8);ctx.lineTo(w-18,h*.8);ctx.moveTo(w/2,h*.8-9);ctx.lineTo(w/2,h*.8+9);ctx.stroke();
}
function draw(dt){
 const reducedMotion=$('reduced').checked,height=Number($('scale').value),loop=$('loop').checked;
 for(const card of cards){
  const {actor,canvas,ctx}=card,w=640,h=480,moving=card.mode==='walk'||card.mode==='run',gait=card.mode==='run'?'run':'walk';
  if(moving)actor.x+=card.facing*(gait==='run'?4.2:2.65)*dt;
  actor.fieldMoving=moving;actor.fieldFacing=card.facing;
  if(dt>0)card.pose=characterPose(card.pose,actor.x,0,dt,{intent:{x:card.facing,y:0},gait,reducedMotion});
  if(loop&&['attack','hit','guard'].includes(card.mode)&&time-card.lastAction>1.4)fireAction(card);
  const live=card.motion.select(actor,{hero:card.hero,chapter:4,pose:card.pose,time,battle:true,reducedMotion});
  const manual=Number(card.inspect.value),selection=manual>=0?{atlas:card.atlas,frame:manual,state:'inspection'}:live;
  ground(ctx,w,h);
  const ok=drawAuthoredMotion(ctx,assets,selection,w/2,h*.8,height*1.5,{flip:card.facing<0});
  if(!ok){ctx.fillStyle='#ecd4a2';ctx.font='18px system-ui';ctx.textAlign='center';ctx.fillText('Artwork loading or unavailable',w/2,h/2);}
  const pose=AUTHORED_MOTION_ATLASES[card.atlas].frames[selection?.frame];
  card.readout.textContent=ok?`${selection.state} · pose ${selection.frame+1}/${AUTHORED_MOTION_ATLASES[card.atlas].frames.length} · ${pose.name}`:'Waiting for original artwork';
 }
}
$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(paused));});
$('step').addEventListener('click',()=>{paused=true;$('pause').textContent='Resume';$('pause').setAttribute('aria-pressed','true');time+=1/12;draw(1/12);});
for(const id of ['scale','reduced','loop'])$(id).addEventListener('change',()=>draw(0));
function tick(stamp){const dt=last?Math.min(.05,(stamp-last)/1000):0;last=stamp;if(!paused){time+=dt;draw(dt);}requestAnimationFrame(tick);}
requestAnimationFrame(tick);
const loaded=await Promise.all(Object.entries(AUTHORED_ART_FILES).map(async([name,file])=>{
 const image=new Image();image.src=new URL('../art/'+file,import.meta.url);
 try{await image.decode();assets[name]=image;return true;}catch{return false;}
}));
$('load-status').textContent=loaded.every(Boolean)?'All 37 motion poses and 8 props loaded. Canvas uses genuine PNG transparency.':`${loaded.filter(Boolean).length}/4 files loaded. Missing images retain a visible loading fallback.`;
for(const [id,meta] of Object.entries(AUTHORED_PROPS)){
 const figure=document.createElement('figure');figure.className='prop';const canvas=document.createElement('canvas');canvas.width=400;canvas.height=300;const caption=document.createElement('figcaption');caption.textContent=({arch:'Carved chapel arch',bell:'Rain bell altar',bench:'Chapel bench',diverter:'Gutter and brass diverter',claybench:'Clay workbench',hearth:'Clay hearth',reedbank:'Reed and stepping-stone bank',window:'Shrine window'})[id];figure.append(canvas,caption);$('props').append(figure);
 const ctx=canvas.getContext('2d');ground(ctx,400,300);drawAuthoredProp(ctx,assets.authoredProps,id,200,260,350,235);
}
draw(0);
