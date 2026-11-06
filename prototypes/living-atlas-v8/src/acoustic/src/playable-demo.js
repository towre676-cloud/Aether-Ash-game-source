import {AA_AcousticDirector} from './game-bridge.js';
import {materialShield} from './acoustic-simulation.js';
const $=id=>document.getElementById(id);
const c=$('map'),ctx=c.getContext('2d');
const W=20,H=14,S=50;
const rand=(x,z)=>{let n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n)};
const player={x:3,z:6,health:100};
const guardian={id:'clayback-01',position:{x:8,z:9},hearing:1,range:13,threshold:.037,hp:100,shield:'clay'};
let started=false,gameWon=false,gateOpen=false,ngPlus=0,weapon=196,walkMode='walk',lastStep=0,previous=performance.now(),lastEnemyHit=0,clock=0;
const keys=new Set(),touchKeys=new Set();
const baseWalls=[{from:{x:11,z:2.6},to:{x:11,z:5.4},absorption:.7},{from:{x:11,z:8.6},to:{x:11,z:12.4},absorption:.7}];
let gateWall={from:{x:11,z:5.4},to:{x:11,z:8.6},absorption:.8};
const nodes=[{id:'sluice-01',position:{x:14,z:6.7},acousticQuestId:'marsh_sluice',description:'Stone sluice chamber'}];
let indicator=null;
const log=(kind,msg)=>{const d=document.createElement('div'),strong=document.createElement('strong');strong.textContent=kind.toUpperCase()+' · ';d.append(strong,document.createTextNode(msg));$('feed').prepend(d);while($('feed').children.length>21)$('feed').lastChild.remove();};
const director=new AA_AcousticDirector({manifestUrl:'./manifest.json',assetBase:'../',onCaption:x=>{if(!['world'].includes(x.category))log('hearing',x.text)},onQuest:x=>{gateOpen=true;gameWon=true;gateWall=null;$('objective').textContent='The sluice gate yields! The hidden crossing is now available. The Clayback still guards the banks — tune your resonance and survive the encounter.';log('world changed','A real, map-placed sluice gate opened. New traversable passage unlocked.');updateWorld();},onHearing:x=>{if(x.heard&&x.alertDelta>.04)log('enemy hearing',`Clayback hears ${walkMode} movement, awareness +${Math.round(x.alertDelta*100)}%.`);}});
function walls(){return [...baseWalls,...(gateWall?[gateWall]:[])];}
function updateWorld(){director.setWorld({objects:nodes,walls:walls(),enemies:[guardian]});}
updateWorld();
const path=(points)=>{ctx.beginPath();points.forEach(([x,z],i)=>i?ctx.lineTo(x*S,z*S):ctx.moveTo(x*S,z*S));};
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function scene(){
 const g=ctx.createLinearGradient(0,0,1000,700);g.addColorStop(0,'#2c4e42');g.addColorStop(1,'#182e35');ctx.fillStyle=g;ctx.fillRect(0,0,1000,700);
 // Continuous winding water and mudbank: no square tile grass.
 ctx.fillStyle='#274d52';ctx.beginPath();ctx.moveTo(840,-10);ctx.bezierCurveTo(720,110,920,230,720,355);ctx.bezierCurveTo(610,445,900,520,770,720);ctx.lineTo(1030,720);ctx.lineTo(1030,-10);ctx.fill();
 ctx.strokeStyle='#547a68';ctx.lineWidth=24;ctx.beginPath();ctx.moveTo(822,-8);ctx.bezierCurveTo(678,110,876,223,706,352);ctx.bezierCurveTo(606,449,850,517,744,712);ctx.stroke();
 ctx.strokeStyle='#253d34';ctx.lineWidth=94;ctx.beginPath();ctx.moveTo(62,648);ctx.bezierCurveTo(220,580,204,451,392,455);ctx.bezierCurveTo(560,448,480,286,696,230);ctx.stroke();
 ctx.strokeStyle='#866b49';ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(62,648);ctx.bezierCurveTo(220,580,204,451,392,455);ctx.bezierCurveTo(560,448,480,286,696,230);ctx.stroke();
 for(let x=12;x<1000;x+=23)for(let z=11;z<700;z+=27){const r=rand(x,z);if(r<.12)continue;const px=x+(r-.5)*23,py=z+(rand(z,x)-.5)*19;
  const inwater=px>710&&py>80&&py<640;if(inwater){if(r>.88){ctx.strokeStyle='#b0d4b6'+(Math.floor(r*70)).toString(16);ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(px,py,3+r*5,1+r,0,0,Math.PI*2);ctx.stroke();}continue;}
  if(r>.75){ctx.strokeStyle=r>.9?'#80a073':'#54795e';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(px,py+4);ctx.lineTo(px-3,py-6-r*3);ctx.moveTo(px,py+3);ctx.lineTo(px+3,py-7);ctx.stroke();}else if(r<.2){ctx.fillStyle='#735f4b77';ctx.beginPath();ctx.ellipse(px,py,2+r*8,1+r*5,0,0,7);ctx.fill();}}
 // authored carved wall and gate obstruction
 for(const w of walls()){const x=w.from.x*S,z=w.from.z*S,e=w.to.z*S;ctx.strokeStyle='#0c2022';ctx.lineWidth=29;ctx.beginPath();ctx.moveTo(x+5,z);ctx.lineTo(x+5,e);ctx.stroke();ctx.strokeStyle='#697b76';ctx.lineWidth=21;ctx.beginPath();ctx.moveTo(x,z);ctx.lineTo(x,e);ctx.stroke();ctx.strokeStyle='#a0aa99';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-7,z+4);ctx.lineTo(x-7,e-4);ctx.stroke();for(let zz=z+20;zz<e;zz+=27){ctx.fillStyle='#435953';ctx.fillRect(x-9,zz,18,2);}}
 // ruins, rushes and camp clearings
 for(const [x,z,s] of [[4,2,.9],[2,11,1.2],[9,3,1.3],[17,3,1],[15,11,.8]]){ctx.fillStyle='#667b64';ctx.beginPath();ctx.ellipse(x*S,z*S,28*s,13*s,.24,0,7);ctx.fill();ctx.fillStyle='#344f47';ctx.beginPath();ctx.ellipse(x*S-5,z*S,15*s,9*s,.2,0,7);ctx.fill();}
 const q=nodes[0].position;if(!gateOpen&&indicator){ctx.strokeStyle='#eccb8866';ctx.setLineDash([8,11]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(player.x*S,player.z*S);ctx.lineTo(q.x*S,q.z*S);ctx.stroke();ctx.setLineDash([]);}
 if(gateOpen){ctx.fillStyle='#efbd68';ctx.shadowColor='#fbd48a';ctx.shadowBlur=17;ctx.beginPath();ctx.arc(11*S,7*S,10+2*Math.sin(clock*3),0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
 // guardian is an actual simulated enemy with health and material-shield state.
 if(guardian.hp>0){const x=guardian.position.x*S,y=guardian.position.z*S;const alert=director.monsters.get(guardian.id)?.alertness||0;
 ctx.fillStyle='#141b19aa';ctx.beginPath();ctx.ellipse(x+6,y+12,24,12,0,0,7);ctx.fill();
 ctx.shadowColor='#ecaa5780';ctx.shadowBlur=12+alert*23;ctx.fillStyle='#956d55';ctx.beginPath();ctx.ellipse(x,y,20,17,.45,0,7);ctx.fill();ctx.shadowBlur=0;
 ctx.strokeStyle=alert>.45?'#fa9c72':'#c49e6a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,24,-Math.PI/2,-Math.PI/2+Math.PI*2*guardian.hp/100);ctx.stroke();
 for(let i=0;i<5;i++){ctx.fillStyle='#b2a17d';ctx.beginPath();ctx.arc(x+Math.cos(i*1.25)*14,y+Math.sin(i*1.25)*12,4,0,7);ctx.fill();}
 }
 ctx.fillStyle='#0a2223';ctx.beginPath();ctx.ellipse(player.x*S+5,player.z*S+13,15,8,0,0,7);ctx.fill();
 ctx.fillStyle='#e2c288';ctx.shadowColor='#ffe2a4';ctx.shadowBlur=17;ctx.beginPath();ctx.arc(player.x*S,player.z*S-2,13,0,7);ctx.fill();ctx.shadowBlur=0;
 ctx.fillStyle='#273e48';ctx.beginPath();ctx.arc(player.x*S,player.z*S-3,7,0,7);ctx.fill();
 // positional scan compass marker has a visible parity cue even when muted.
 if(indicator){const theta=indicator.bearing,px=player.x*S,pz=player.z*S;const dx=Math.sin(theta),dz=Math.cos(theta);ctx.strokeStyle='#ffe0a6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px+dx*23,pz+dz*23);ctx.lineTo(px+dx*46,pz+dz*46);ctx.stroke();ctx.fillStyle='#ffe0a6';ctx.beginPath();ctx.arc(px+dx*48,pz+dz*48,4.5,0,7);ctx.fill();}
}
function ui(){const mode=director.monsters.get(guardian.id)?.snapshot();$('health').textContent=`Health ${Math.ceil(player.health)} / 100`;$('awareness').textContent=`Enemy awareness ${Math.round((mode?.alertness||0)*100)}%`;
 $('scans').textContent=`Valid listening positions ${(director.survey.samples.get('sluice-01')||[]).length} / 2`;
 $('resonance').textContent=`Attack ${weapon} Hz · ${weapon===196?'Clay tuned':'Crystal tuned'}`;
 $('scoreText').textContent=`${director.score.scene||'marsh'} · ${mode?.mode||'idle'} · ${walkMode}`;
 $('biometitle').textContent=ngPlus?'REED MARSH · ALTERNATE TIMELINE':'REED MARSH · BEFORE THE FLOOD';}
const fmt=n=>Math.round(n*10)/10;
const canMove=(x,z)=>{if(x<.8||x>19.2||z<.8||z>13.2)return false;if(gateWall && x>10.72&&x<11.28&&z>5.15&&z<8.85)return false;return true;};
function moveTowards(m,target,delta){const dx=target.x-m.x,dz=target.z-m.z,d=Math.hypot(dx,dz);if(d>.02){const next={x:m.x+dx/d*delta,z:m.z+dz/d*delta};if(canMove(next.x,next.z)){m.x=next.x;m.z=next.z;}}}
async function scan(){if(!started)return log('system','Enable audio first.');const heard=await director.event('player:scan',{position:{x:player.x,z:player.z}});
 if(heard.length){indicator=heard[0];const n=(director.survey.samples.get(heard[0].sourceId)||[]).length;log('scan',`Water echo bearing ${Math.round(heard[0].bearing*180/Math.PI)}°, strength ${Math.round(heard[0].strength*100)}%. Recorded ${n}/2 distinct vantage points.`);}
 else log('scan','No eligible authored signal nearby.');ui();}
async function resolve(){if(!started)return;const r=await director.event('player:resolve',{sourceId:'sluice-01'});
 if(r.resolved){indicator=null;log('discovery',`Triangulated source with ${fmt(r.error)} tiles error. Sluice physically opens.`);}
 else log('resolve',r.reason==='need_two_vantage_points'?'Listen again from another spot at least two tiles away, preferably north or south of the first.':`Not resolved: ${r.reason}. Move north or south to change your listening angle.`);ui();}
async function attack(){if(!started||guardian.hp<=0)return;const dx=player.x-guardian.position.x,dz=player.z-guardian.position.z;if(Math.hypot(dx,dz)>3.5){log('combat','The Clayback is out of reach. Move closer.');return;}
 const attack=await director.event('combat:attack',{position:guardian.position,element:'resonance',shieldMaterial:guardian.shield,attackFrequency:weapon});
 const damage=Math.round(19/attack.defenseMultiplier);guardian.hp=Math.max(0,guardian.hp-damage);
 log('combat',`${attack.vulnerable?'Matched the clay resonance!':'Frequency resisted by clay plating.'} ${damage} effective damage. ${guardian.hp} HP remain.`);
 if(guardian.hp===0){log('combat','Clayback defeated. Its warning calls will no longer threaten the crossing.');director.score.setState({danger:0,discovery:1});}
}
async function newGame(){if(!started)return;ngPlus++;gateOpen=false;gameWon=false;gateWall={from:{x:11,z:5.4},to:{x:11,z:8.6},absorption:.8};player.x=3;player.z=6;player.health=100;guardian.hp=100;guardian.position={x:8,z:9};
 director.survey.samples.clear();director.survey.discovered.clear();director.flags.clear();director.monsters.clear();director.ngPlus=ngPlus;director.score.setState({danger:0,travel:0,discovery:.5});indicator=null;updateWorld();
 await director.event('timeline:newgameplus',{cycle:ngPlus});
 $('objective').textContent='A different current runs through the marsh. Listen for the sluice again; the remembered resonance makes this path a new variation, but the guardian still hears your footsteps.';
 log('timeline',`New Game Plus cycle ${ngPlus}: puzzle and state reset; score shifts to an alternate-timeline mood.`);ui();}
async function begin(){if(started)return;$('start').disabled=true;$('start').textContent='Loading sound…';try{
 await director.unlock();started=true;$('start').textContent='Exploring';$('audioStatus').textContent='SPATIAL SOUND ON';
 await director.event('zone:enter',{biome:'reed_marsh',weather:'clear'});
 director.score.setState({travel:.25});log('quest','Sluice buried east of the stone wall. Hear from different positions to reveal it.');c.focus();
 }catch(e){$('start').disabled=false;$('start').textContent='Retry enabling sound';log('audio',e.message);$('audioStatus').textContent='AUDIO FAILED · CAPTIONS REMAIN';}}
$('start').addEventListener('click',begin);$('mute').onclick=()=>{director.audio.setMuted(!director.audio.muted);$('audioStatus').textContent=director.audio.muted?'MUTED · CAPTIONS ON':'SPATIAL SOUND ON';};
$('scan').onclick=scan;$('resolve').onclick=resolve;$('attack').onclick=attack;$('tune').onclick=()=>{weapon=weapon===196?523.25:196;ui();log('weapon',`Frequency tuned to ${weapon} Hz.`);};
$('restart').onclick=newGame;$('volume').oninput=e=>director.audio.setVolume('master',Number(e.target.value)/100);
const modes=['walk','sneak','sprint'];$('pace').onclick=()=>{walkMode=modes[(modes.indexOf(walkMode)+1)%modes.length];$('pace').textContent='Mode: '+walkMode;};
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(e.repeat)return;
 if(k==='l')scan();if(k==='e')resolve();if(k===' ')attack();if(k==='q')$('tune').click();if(k==='r')newGame();});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
for(const btn of document.querySelectorAll('[data-dir]')){
 const dir=btn.dataset.dir;const release=e=>{touchKeys.delete(dir);btn.releasePointerCapture?.(e.pointerId)};
 btn.onpointerdown=e=>{e.preventDefault();touchKeys.add(dir);btn.setPointerCapture?.(e.pointerId)};
 btn.onpointerup=release;btn.onpointercancel=release;btn.onlostpointercapture=()=>touchKeys.delete(dir);
}
let lastPhysicsTick=0,lastUI=-Infinity;
function frame(t){const dt=Math.min(.06,(t-previous)/1000);previous=t;clock+=dt;
 if(started){const m=(keys.has('alt')?'sneak':keys.has('shift')?'sprint':walkMode);
  const vel=(m==='sprint'?3.6:m==='sneak'?1.15:2.25)*dt;
  const dirx=(keys.has('d')||keys.has('arrowright')||touchKeys.has('right')?1:0)-(keys.has('a')||keys.has('arrowleft')||touchKeys.has('left')?1:0);
  const dirz=(keys.has('s')||keys.has('arrowdown')||touchKeys.has('down')?1:0)-(keys.has('w')||keys.has('arrowup')||touchKeys.has('up')?1:0);
  const norm=Math.hypot(dirx,dirz);if(norm){const x=player.x+dirx/norm*vel,z=player.z+dirz/norm*vel;if(canMove(x,z)){player.x=x;player.z=z;}
   director.event('player:position',{x:player.x,z:player.z});
   if(t-lastStep>(m==='sprint'?185:m==='sneak'?470:300)){lastStep=t;const surface=player.x>12?'shallow_water':(player.z>8&&player.x<11?'wet_moss':'wet_clay');director.event('player:step',{position:{x:player.x,z:player.z},surface,speed:m==='sprint'?2:m==='sneak'?.6:1,mode:m,timeMs:t}).catch(e=>log('error',e.message));}
  }
  if(t-lastPhysicsTick>300){director.event('time:tick',{seconds:(t-lastPhysicsTick)/1000>2?.3:(t-lastPhysicsTick)/1000});lastPhysicsTick=t;}
  const ai=director.monsters.get(guardian.id);
  if(guardian.hp>0){if(ai?.mode==='investigating'||ai?.mode==='alert')if(ai.target)moveTowards(guardian.position,ai.target,dt*(ai.mode==='alert'?1.25:.75));
   const d=Math.hypot(player.x-guardian.position.x,player.z-guardian.position.z);if(ai)ai.position={...guardian.position};if(d<1.4&&t-lastEnemyHit>2600){lastEnemyHit=t;player.health=Math.max(0,player.health-11);log('hit','Clayback impact! Health -11. Its movement is audible before it reaches you.');director.event('creature:state',{species:'clayback',intent:'attack',position:guardian.position});if(player.health===0){log('collapse','Return to the starting bank.');player.health=100;player.x=3;player.z=6;}}
  }
 }
 scene();if(t-lastUI>180){lastUI=t;ui();}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
