import {drawSupply} from './supply-art.js';
import {cinematicRegistry,cinematicKey,seenCinematic,markCinematic,canShowArrival} from './cinema-content.js?v=5.38';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
/** Runs short camera/pose animatics. Artwork stays upright; gameplay never advances beneath a full scene. */
export class CinemaDirector{
 constructor({data,renderer,onOpen=()=>{},onClose=()=>{},volume=()=>.68,contextFor=()=>'',musicFor=()=>null}){
  this.musicFor=musicFor;this.contextFor=contextFor;this.entries=cinematicRegistry(data);this.map=new Map(this.entries.map(e=>[e.id,e]));this.renderer=renderer;this.onOpen=onOpen;this.onClose=onClose;this.volume=volume;this.images=new Map();this.active=false;this.pending=[];this.cooldown=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.enabled=(localStorage.getItem('ash-cinematics')??localStorage.getItem('ash-cinematic-arrivals'))!=='off';
  this.root=document.createElement('section');this.root.id='cinematic-stage';this.root.hidden=true;this.root.innerHTML='<canvas width="1280" height="720" aria-label="Animated cinematic"></canvas><div class="cinematic-copy"><small></small><h2></h2><p></p><p class="cinematic-context" hidden></p></div><button type="button" class="cinematic-skip">Continue <span>›</span></button><div class="cinematic-progress"></div>';
  document.querySelector('#game').append(this.root);this.canvas=this.root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.root.querySelector('button').onclick=()=>this.finish();
  window.addEventListener('keydown',e=>{if(!this.active)return;e.preventDefault();e.stopImmediatePropagation();if(['Escape','Enter','Space','KeyX','KeyZ'].includes(e.code))this.finish();},true);
 }
 get busy(){return this.active;}
 get(id){return this.map.get(id);}
 setEnabled(value){this.enabled=value;localStorage.setItem('ash-cinematics',value?'on':'off');localStorage.setItem('ash-cinematic-arrivals',value?'on':'off');if(!value)this.finish();}
 image(name){if(!name)return null;if(!this.images.has(name)){const i=new Image();i.src=new URL('../cinema/expanded/art/'+name,import.meta.url);this.images.set(name,i);}const i=this.images.get(name);return i.complete&&i.naturalWidth?i:null;}
 queue(entry){if(entry&&!this.pending.some(e=>e.id===entry.id))this.pending.push(entry);}
 observe(world,available){this.world=world;if(!this.enabled||!available||this.active)return;
  if(canShowArrival(world)){const e=this.get(cinematicKey('arrival',world.scene.chapter));if(e&&!seenCinematic(world.state,e.id))this.queue(e);}
  // Recruitment is observed from earned state, never granted by the presentation layer.
  for(const id of world.state.recruited||[]){if(id===0)continue;const e=this.get(cinematicKey('crew',id));if(e&&!seenCinematic(world.state,e.id))this.queue(e);}
  while(this.pending.length){const e=this.pending.shift();if(e.kind==='arrival'&&e.chapter!==world.scene.chapter)continue;if(!seenCinematic(world.state,e.id)){this.present(e,world);break;}}
 }
 present(entry,world,{force=false,after=()=>{}}={}){
  if(!entry||!this.enabled&&!force||!force&&seenCinematic(world.state,entry.id)){after();return false;}
  if(this.entry){if(entry.compact)return false;if(this.active){after();return false;}this.finish();}
  if(!force){markCinematic(world.state,entry.id);if(entry.kind==='arrival')markCinematic(world.state,`arrival-${entry.chapter}`);if(entry.kind==='creature'&&!entry.legacy){const species=entry.species.replace(/-elder$/,'');markCinematic(world.state,`creature-${species}`);world.state.cinemaEncounters=[...new Set([...(world.state.cinemaEncounters||[]),species])];}}this.world=world;this.entry=entry;this.after=after;this.started=performance.now();this.elapsed=0;this.active=!entry.compact;this.previousFocus=document.activeElement;
  this.root.hidden=false;this.root.classList.toggle('compact',!!entry.compact);this.root.style.setProperty('--cinema-color',entry.color||'#e6c78f');this.root.setAttribute('role',entry.compact?'status':'dialog');this.root.setAttribute('aria-modal',String(!entry.compact));
  this.root.querySelector('small').textContent=({arrival:'THE JOURNEY CONTINUES',guardian:'GUARDIAN',victory:'AFTER THE STORM',creature:'CREATURE DISCOVERED',supply:'SUPPLY',crew:'A NEW COMPANION',technique:'MAKO',assault:'GUARDIAN TECHNIQUE','creature-move':'CREATURE TECHNIQUE'}[entry.kind]||'CLAY & WATER');this.root.querySelector('h2').textContent=entry.title;this.root.querySelector('p').textContent=entry.subtitle;const context=this.root.querySelector('.cinematic-context');context.textContent=this.contextFor(entry,world)||'';context.hidden=!context.textContent;
  this.image(entry.art);this.hero=entry.hero??world.state.party[0];this.actor=entry.actor;this.backdrop=null;try{const source=this.renderer.canvas.toDataURL('image/jpeg',.65);if(source&&source!=='data:,'){this.backdrop=new Image();this.backdrop.src=source;}}catch{/* Scene art and sprite fallback remain available after a canvas export failure. */}
  if(this.active){this.onOpen();this.root.querySelector('button').focus({preventScroll:true});const orchestral=this.musicFor(entry);if(entry.music||orchestral){this.music=new Audio(orchestral||new URL('../music/action/'+entry.music.replace('action_','')+'.ogg',import.meta.url));this.music.volume=clamp(this.volume()*.7,0,1);this.music.play().catch(()=>{});}}
  if(entry.video&&!this.reduced&&!this.renderer?.compatibility){this.video=document.createElement('video');this.video.src=new URL('../cinema/'+entry.video,import.meta.url);this.video.muted=true;this.video.playsInline=true;this.video.play().catch(()=>{});}
  cancelAnimationFrame(this.raf);this.tick();return true;
 }
 finish(){if(!this.entry)return;const wasActive=this.active,after=this.after;this.entry=null;this.active=false;this.root.hidden=true;cancelAnimationFrame(this.raf);if(this.music){this.music.pause();this.music.src='';this.music=null;}if(this.video){this.video.pause();this.video.removeAttribute('src');this.video.load?.();this.video=null;}if(wasActive){this.onClose();if(this.previousFocus?.isConnected)this.previousFocus.focus({preventScroll:true});}this.after=null;after?.();}
 tick(){if(!this.entry)return;const t=(performance.now()-this.started)/1000;this.elapsed=t;if(this.music)this.music.volume=clamp(this.volume()*.7*Math.min(1,t/.15)*Math.min(1,Math.max(0,(this.entry.duration-t)/.35)),0,1);this.draw(t);this.root.querySelector('.cinematic-progress').style.width=(100*clamp(t/this.entry.duration,0,1))+'%';if(t>=this.entry.duration){this.finish();return;}this.raf=requestAnimationFrame(()=>this.tick());}
 sprite(kind,index,frame,x,y,height,alpha=1){const r=this.renderer,a=r.assets[kind],cols=kind==='crew'?8:4,b=r.bounds[kind]?.[kind.startsWith('bestiary')?index:index*cols+frame];if(!a||!b)return;const c=this.ctx,w=height*b.w/b.h;c.save();c.globalAlpha=alpha;c.drawImage(a,b.x,b.y,b.w,b.h,x-w/2,y-height,w,height);c.restore();}
 draw(t){const c=this.ctx,W=1280,H=720,e=this.entry,p=clamp(t/e.duration,0,1),motion=this.reduced?0:1;c.fillStyle='#08131d';c.fillRect(0,0,W,H);
  if(this.backdrop?.complete&&this.backdrop.naturalWidth){c.save();c.globalAlpha=.25;if(!this.renderer?.compatibility)c.filter='blur(14px)';c.drawImage(this.backdrop,-30,-30,W+60,H+60);c.restore();}
  const g=c.createRadialGradient(840,270,20,640,350,760);g.addColorStop(0,(e.color||'#e8c88f')+'33');g.addColorStop(1,'#040a13dd');c.fillStyle=g;c.fillRect(0,0,W,H);
  let art=this.image(e.art);if(e.kind==='guardian'&&e.chapter<=8){const charged=this.image(`guardian-${e.chapter}-1.webp`);if(p>.42&&p<.85&&charged)art=charged;}if(e.kind==='victory'&&e.chapter<=8&&!e.video&&t<1.1){const fallen=this.image(`guardian-${e.chapter}-2.webp`);if(fallen)art=fallen;}
  if(this.video&&(this.reduced||this.renderer?.compatibility)){this.video.pause();this.video.removeAttribute('src');this.video.load?.();this.video=null;}
  if(this.video?.readyState>=2){c.drawImage(this.video,0,0,W,H);}
  else if(art){const wide=art.width/art.height>2;if(e.environment){const z=1.035+p*.045*motion,dh=H*z,dw=art.width/art.height*dh;c.drawImage(art,(W-dw)/2+Math.sin(t*.3)*6*motion,(H-dh)/2,dw,dh);}else if(wide){const dh=500,dw=art.width/art.height*dh,pan=(dw-W)*(.3+p*.22*motion);c.drawImage(art,-pan,70,dw,dh);}else{const h=570,w=h*art.width/art.height;c.drawImage(art,780-w/2+Math.sin(t)*8*motion,40+Math.sin(t*2)*4*motion,w,h);}}
  else if(['guardian','creature','assault','creature-move'].includes(e.kind)){const boss=['guardian','assault'].includes(e.kind),hover=Math.sin(t*2.5)*7*motion;this.sprite(boss||e.legacy?'creatures':e.atlas||'bestiary',e.sprite||0,boss&&p>.4?1:e.kind==='creature-move'&&e.legacy?2:0,820,590+hover,boss?460:410);}
  else if(e.kind==='supply'&&e.icon>=24){c.save();c.translate(720,130);drawSupply(c,e,360);c.restore();}
  else if(e.kind==='supply'){const a=this.supplyImage;if(!a){this.supplyImage=new Image();this.supplyImage.src=new URL('./art/supplies.webp',import.meta.url);}if(this.supplyImage?.complete&&this.supplyImage.naturalWidth&&!e.basic){const a=this.supplyImage,sw=a.width/6,sh=a.height/4;c.drawImage(a,e.icon%6*sw,Math.floor(e.icon/6)*sh,sw,sh,700,120,400,400);}else this.sprite('crew',this.hero,4,850,575,400);}
  else{const hero=e.actor?.id??this.hero,pose=e.kind==='technique'?4:p<.28?0:p<.65?3:0;this.sprite('crew',hero,pose,850+(p<.5?p*50:(1-p)*50)*motion,580,460);}
  if(e.weather==='rain'){c.save();c.strokeStyle='#b5d7ef';c.globalAlpha=.14;c.lineWidth=1.2;for(let j=0;j<68;j++){const x=(j*193+t*90*motion)%W,y=(j*67+t*480*motion)%H;c.beginPath();c.moveTo(x,y);c.lineTo(x-8,y+28);c.stroke();}c.restore();}if(e.weather==='glass'||e.weather==='storm'){c.save();c.globalCompositeOperation='screen';c.globalAlpha=.045+.025*Math.sin(t*1.5)*motion;c.fillStyle=e.weather==='storm'?'#8785ff':'#72dfff';c.fillRect(0,0,W,H);c.restore();}if(e.paint)e.paint(c,t,p);
  // Timed light paths, elemental arcs, and depth particles do not rotate the character image.
  c.save();c.globalCompositeOperation='screen';c.strokeStyle=e.color||'#d7c08f';c.fillStyle=e.color||'#d7c08f';
  for(let i=0;i<42;i++){const x=(i*157.31+t*(e.kind==='victory'?12:35)*motion)%W,y=620-((i*67.7+t*(24+i%5*5)*motion)%560);c.globalAlpha=.12+.25*Math.sin(i+p*2)**2;c.beginPath();c.arc(x,y,1.1+(i%3)*.6,0,TAU);c.fill();}
  if(['guardian','technique','supply','victory'].includes(e.kind)){const radius=80+p*230;c.globalAlpha=Math.sin(p*Math.PI)*.45;c.lineWidth=2;c.beginPath();c.ellipse(840,550,radius,radius*.23,0,0,TAU);c.stroke();
   if(e.core==='volt'){c.lineWidth=4;for(let j=0;j<3;j++){c.beginPath();c.moveTo(650+j*110,130);for(let k=1;k<8;k++)c.lineTo(650+j*110+Math.sin(k*8+t*7)*35,130+k*55);c.stroke();}}
   else if(['flame','earth'].includes(e.core)){for(let j=0;j<8;j++){c.beginPath();c.moveTo(720+j*35,550);c.quadraticCurveTo(700+j*35,400-p*120,760+j*35,280-p*50);c.stroke();}}
   else if(['tide','frost','gale'].includes(e.core)){for(let j=0;j<5;j++){c.beginPath();c.ellipse(830,360,90+j*23,35+j*28,t*.3*motion,0,TAU);c.stroke();}}
   else if(['mend','ward'].includes(e.core)){c.lineWidth=5;c.beginPath();c.arc(840,340,130,0,TAU);c.stroke();c.fillRect(830,280,20,120);c.fillRect(780,330,120,20);}
   else{c.lineWidth=3;for(let j=0;j<3;j++){c.beginPath();c.arc(840,350,95+j*25,t+j*2,t+j*2+Math.PI*1.3);c.stroke();}}
  }c.restore();
  const shade=c.createLinearGradient(0,420,0,720);shade.addColorStop(0,'#040b1300');shade.addColorStop(1,'#040b13f5');c.fillStyle=shade;c.fillRect(0,420,W,300);c.fillStyle='#02050b';c.fillRect(0,0,W,30);c.fillRect(0,690,W,30);
 }
 battleEvent(e,world){if(!this.enabled||this.active)return;const now=performance.now();if(now<this.cooldown)return;
  let entry;if(e.type==='enemy-cast'){entry=this.get(cinematicKey(e.actor.boss?'assault':'creature-move',e.actor.boss?world.mission.id:e.actor.species||e.actor.role));if(entry)entry={...entry,subtitle:e.intent.label};}if(e.type==='supply')entry=this.get(cinematicKey('supply',e.item.id));if(e.type==='cast')entry=this.get(cinematicKey('technique',e.tech.id));
  if(entry&&!seenCinematic(world.state,entry.id)){this.present({...entry,actor:e.actor},world);this.cooldown=now+5000;}
 }
}
