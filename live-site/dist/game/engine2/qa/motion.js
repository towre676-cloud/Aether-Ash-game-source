import {World} from '../world.js?v=5.41';
import {Renderer} from '../renderer.js?v=5.41';
import {gameArtDefinitions} from '../art-definitions.js?v=5.22.0';
import {loadArtAssets} from '../asset-loader.js';
import {movementDelta} from '../player-locomotion.js?v=5.14.0';
const $=s=>document.querySelector(s),canvas=$('#view'),status=$('#status'),heroSelect=$('#hero'),gait=$('#gait'),tourButton=$('#tour'),recordButton=$('#record');
const headings={e:[1,0],se:[1,1],s:[0,1],sw:[-1,1],w:[-1,0],nw:[-1,-1],n:[0,-1],ne:[1,-1]},tourOrder=['e','se','s','sw','w','nw','n','ne'];
let world,renderer,playing=false,tourTime=0,held=new Set(),pointerHeading=null,last=0,count=0,recording=null,drawTimes=[],frameTimes=[];
function reset(){const hero=Number(heroSelect.value)||0;world.state.party=$('#companions').checked?[hero,(hero+1)%7,(hero+2)%7]:[hero];world.state.mode='field';world.state.x=12;world.state.y=8;world.state.story.armor=!$('#courier').checked;renderer.scene(world);tourTime=0;$('#name').textContent=world.state.heroes[hero].name+' · '+(gait.value==='run'?'running':'walking');}
function stop(){playing=false;held.clear();pointerHeading=null;renderer.locomotion=null;tourButton.setAttribute('aria-pressed','false');tourButton.textContent='Eight-way tour';}
function startTour(){reset();playing=true;held.clear();pointerHeading=null;tourButton.setAttribute('aria-pressed','true');tourButton.textContent='Stop tour';}
function vector(){if(pointerHeading)return headings[pointerHeading]||[0,0];return[(held.has('ArrowRight')?1:0)-(held.has('ArrowLeft')?1:0),(held.has('ArrowDown')?1:0)-(held.has('ArrowUp')?1:0)];}
try{
 const [data,assets]=await Promise.all([fetch('../world.json').then(r=>r.json()),loadArtAssets(gameArtDefinitions(),{onProgress:p=>status.textContent='Artwork '+p.loaded+'/'+p.total})]);
 world=new World(data);const base=world.scenes.get(5),width=32,height=25;
 const scene={...base,location:99014,key:'field',title:'Movement studio',chapter:1,theme:1,width,height,floor:Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>x&&y&&x<width-1&&y<height-1?'.':'#').join('')),blocks:[],objects:[],doors:[],arrive:[12,8],household:null,interior:null,originIndoor:false,originId:null,fieldOrigin:undefined,authoredOpening:null,biome:null,exteriorBuildings:[],affordanceBlocked:[]};
 world.scenes.set(scene.location,scene);world.state.scene=scene.location;renderer=new Renderer(canvas,assets);renderer.ui={hudHeight:0};
 world.state.heroes.forEach((h,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=h.name;heroSelect.append(option);});reset();
 heroSelect.onchange=()=>{stop();reset();};gait.onchange=()=>{$('#name').textContent=world.state.heroes[Number(heroSelect.value)].name+' · '+(gait.value==='run'?'running':'walking');};$('#companions').onchange=()=>reset();$('#courier').onchange=()=>reset();
 $('#camera').onchange=()=>{renderer.cameraWindowEnabled=$('#camera').value==='stable';};
 tourButton.onclick=()=>playing?stop():startTour();$('#graphics').onclick=()=>{renderer.setGraphicsMode(!renderer.compatibility);renderer.scene(world);$('#graphics').textContent=renderer.compatibility?'Use standard':'Use compatibility';};
 for(const b of document.querySelectorAll('[data-dir]')){b.onpointerdown=e=>{e.preventDefault();stop();if(b.dataset.dir!=='stop'){pointerHeading=b.dataset.dir;b.setPointerCapture?.(e.pointerId);}b.setAttribute('aria-pressed','true');};const up=e=>{e.preventDefault();pointerHeading=null;b.setAttribute('aria-pressed','false');};b.onpointerup=up;b.onpointercancel=up;b.onlostpointercapture=up;}
 window.addEventListener('keydown',e=>{if(e.target.closest?.('input,select,textarea,[contenteditable="true"]'))return;if(e.code.startsWith('Arrow')||e.code==='ShiftLeft'||e.code==='ShiftRight'){e.preventDefault();playing=false;tourButton.setAttribute('aria-pressed','false');tourButton.textContent='Eight-way tour';held.add(e.code);}});window.addEventListener('keyup',e=>held.delete(e.code));window.addEventListener('blur',()=>{held.clear();pointerHeading=null;});window.addEventListener('resize',()=>renderer.resize());
 recordButton.disabled=!canvas.captureStream||typeof MediaRecorder==='undefined';
 recordButton.onclick=()=>{
  if(recording)return;startTour();recordButton.disabled=true;const stream=canvas.captureStream(60),types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'],mimeType=types.find(t=>MediaRecorder.isTypeSupported(t)),chunks=[];
  try{const recorder=new MediaRecorder(stream,mimeType?{mimeType,videoBitsPerSecond:3000000}:{});recording={recorder,started:performance.now()};recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType||'video/webm'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ash-aether-motion-'+world.state.heroes[Number(heroSelect.value)].name.toLowerCase()+'-'+(renderer.compatibility?'compatible':'standard')+'.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);stream.getTracks().forEach(t=>t.stop());recording=null;recordButton.disabled=false;recordButton.textContent='Record 9 seconds';status.textContent='Recording ready · original game rendering';};recorder.start();setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},9000);}catch(e){stream.getTracks().forEach(t=>t.stop());recording=null;recordButton.disabled=false;status.textContent='Recording unavailable: '+e.message;}
 };
 status.textContent='Ready · no journey saves';
 function frame(now){const elapsed=(now-(last||now))/1000,dt=Math.min(.05,elapsed);last=now;try{
  if(document.hidden){held.clear();pointerHeading=null;requestAnimationFrame(frame);return;}
  let [x,y]=vector();if(playing){tourTime+=dt;const t=tourTime%8.8;[x,y]=t<8?headings[tourOrder[Math.floor(t)]]:[0,0];}
  const move=movementDelta(x,y,dt,{run:gait.value==='run'||held.has('ShiftLeft')||held.has('ShiftRight')});renderer.locomotion=move;world.move(move.x,move.y);renderer.draw(world,null,dt);count++;drawTimes.push(renderer.frameMs);frameTimes.push(elapsed*1000);if(drawTimes.length>240){drawTimes.shift();frameTimes.shift();}
  if(count%12===0){const p=renderer.motion.get(world.state.party[0]),sorted=[...drawTimes].sort((a,b)=>a-b);canvas.dataset.pose=JSON.stringify(p);canvas.dataset.camera=JSON.stringify(renderer.camera);canvas.dataset.cameraWindow=String(renderer.cameraWindowEnabled!==false);canvas.dataset.frames=String(count);canvas.dataset.graphicsMode=renderer.compatibility?'compatible':'standard';$('#metrics').textContent=(renderer.compatibility?'Compatibility':'Standard')+' · '+(p?.gait||'walk')+' · '+(p?.moving?'moving':'stopped')+' · draw p95 '+(sorted[Math.floor(sorted.length*.95)]||0).toFixed(1)+' ms';if(recording)recordButton.textContent='Recording '+Math.min(9,(now-recording.started)/1000).toFixed(1)+' / 9s';}
 }catch(e){status.textContent='Motion error: '+e.message;canvas.dataset.error=e.message;console.error(e);return;}requestAnimationFrame(frame);}
 requestAnimationFrame(frame);
}catch(e){status.textContent='Unable to prepare movement practice: '+e.message;console.error(e);}
