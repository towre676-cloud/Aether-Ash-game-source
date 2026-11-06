import {CinemaDirector} from '../../engine2/cinema-director.js?v=5.38';
import {Renderer} from '../../engine2/renderer.js?v=5.41';
const $=s=>document.querySelector(s),assets={};
const data=await fetch('../../engine2/world.json').then(r=>r.json());
await Promise.all(['crew','creatures','bestiary'].map(name=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>{assets[name]=i;resolve();};i.onerror=reject;i.src='../../engine2/art/'+name+'.webp';})));
const canvas=$('#stage-source');canvas.style.display='block';const renderer=new Renderer(canvas,assets);canvas.style.display='none';canvas.width=1280;canvas.height=720;const c=canvas.getContext('2d');c.fillStyle='#10242c';c.fillRect(0,0,1280,720);
const music=$('#music-player'),world={state:{party:[0,1,2],recruited:[0],cinemaSeen:[]}};
const director=new CinemaDirector({data,renderer,volume:()=>.7,onOpen:()=>music.pause()});let running=false,list=[];
const catalog=await fetch('../../music/catalog.json').then(r=>r.json());const tracks=catalog.tracks.filter(t=>t.role==='action-original');for(const t of tracks){const o=document.createElement('option');o.value=t.id;o.textContent=t.title+' · '+t.bpm+' BPM';$('#music-choice').append(o);}
function selectMusic(play=false){const t=tracks.find(t=>t.id===$('#music-choice').value);if(t){music.src=new URL('../../music/action/'+t.audio.split('/').pop(),location.href);if(play)music.play().catch(()=>{});}}
$('#music-choice').onchange=()=>selectMusic(true);selectMusic();
function preview(e,after=()=>{}){director.present({...e,duration:Math.max(4,e.duration)},world,{force:true,after});}
function render(){running=false;const q=$('#search').value.toLowerCase(),kind=$('#kind').value;list=director.entries.filter(e=>e.kind===kind&&(!q||[e.title,e.subtitle,e.detail].join(' ').toLowerCase().includes(q)));$('#count').textContent=list.length+' scenes · '+director.entries.length+' cinematic entries in the game';$('#scene-list').replaceChildren();for(const e of list){const b=document.createElement('button');b.className='scene';const title=document.createElement('strong');title.textContent=e.title;const detail=document.createElement('span');detail.textContent=e.chapter?'Chapter '+e.chapter+' · '+e.duration+' seconds':e.subtitle;const action=document.createElement('span');action.textContent='▶ Watch';b.append(title,detail,action);b.onclick=()=>{running=false;preview(e);};$('#scene-list').append(b);}}
$('#search').oninput=render;$('#kind').onchange=render;$('#watch-all').onclick=()=>{running=!running;if(!running){director.finish();return;}let i=0;const next=()=>{if(running&&i<list.length)preview(list[i++],()=>setTimeout(next,160));else running=false;};next();};render();
