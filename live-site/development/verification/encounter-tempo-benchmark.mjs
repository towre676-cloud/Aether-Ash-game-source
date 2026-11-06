import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {earnOpening} from '../../dist/game/engine2/tests/opening-flow.mjs';
import {createCombatOrders} from '../../dist/game/engine2/combat-order.js';
import {Battle,encounterEnemies} from '../../dist/game/engine2/battle.js';
import {compileTechnique} from '../../dist/game/engine2/mako.js';
import {combatContext} from '../../dist/game/engine2/combat-reactions.js';
import {battlefieldContext} from '../../dist/game/engine2/battlefield-context.js';
import {livingEncounterContext} from '../../dist/game/engine2/living-world.js';
import {objectiveEncounterContext} from '../../dist/game/engine2/objective-context.js';

const dt=.05,round=n=>+n.toFixed(2);
export function runOpening({name,tempo=false,policy='attack',targeting='caller',response='none',boss=false,maxTime=60}={}){
 const {w}=earnOpening(),object=w.scene.objects.find(o=>o.type===(boss?'boss':'patrol')),xy=object.xy||object.enemies[0][1];
 let pos={x:xy[0]+.5,y:xy[1]+2.7};
 if(!w.walkable(pos.x,pos.y)){
  const found=[];for(let y=0;y<w.scene.height;y++)for(let x=0;x<w.scene.width;x++)if(w.walkable(x+.5,y+.5))found.push({x:x+.5,y:y+.5,d:Math.hypot(x-xy[0],y-xy[1])});
  found.sort((a,b)=>Math.abs(a.d-2.2)-Math.abs(b.d-2.2));pos=found[0];
 }
 w.state.x=pos.x;w.state.y=pos.y;w.state.mode='battle';
 const heroes=w.activeHeroes;heroes.forEach((h,i)=>Object.assign(h,{x:pos.x+(i===1?-.9:i===2?.9:0),y:pos.y+(i?.7:0)}));
 const enemies=encounterEnemies(1,boss,2);enemies.forEach((e,i)=>Object.assign(e,{x:xy[0]+.5+(i%2)*1.3,y:xy[1]+.5+Math.floor(i/2)*1.4}));
 const context={...livingEncounterContext(w,object,objectiveEncounterContext(w,object,battlefieldContext(w,object,combatContext(w)))),engagement:{version:1},...(tempo?{encounterTempo:{version:1}}:{}),encounterSerial:1,encounterKey:object.bit??object.type,reinforcementLimit:2};
 const out={name,tempo,policy,targeting,response,boss,initialEnemyHP:enemies.reduce((sum,e)=>sum+e.hp,0),firstAction:null,warnings:[],resolutions:[],heroDamage:0,actions:0,interrupts:0,responses:{guard:0,evade:0,'armor-break':0},guardPrevented:0,blockedNotices:[]};
 let b;b=new Battle({heroes,enemies,chapter:1,context,inventory:structuredClone(w.state.items),rng:()=>.5,onEvent:e=>{
  if(e.type==='intent')out.warnings.push({at:round(b.time),actor:e.actor.name,role:e.actor.role,kind:e.intent.kind,windup:round(e.intent.total),label:e.intent.label});
  if(e.type==='enemy-cast')out.resolutions.push({at:round(b.time),actor:e.actor.name,kind:e.intent.kind,sourceId:e.actor.id,targets:e.targets.map(h=>h.name),damage:0});
  if(e.type==='damage'&&heroes.includes(e.actor)){out.heroDamage+=e.amount;const release=out.resolutions.at(-1);if(release?.at===round(b.time)&&release.sourceId===e.source?.id)release.damage+=e.amount;}
  if(e.type==='interrupt')out.interrupts++;
  if(e.type==='tactical-result'){out.responses[e.kind]++;if(e.kind==='guard')out.guardPrevented+=e.amount;}
 }});
 b.engagementFloor=[];for(let y=0;y<w.scene.height;y++)for(let x=0;x<w.scene.width;x++)if(w.walkable(x+.5,y+.5))b.engagementFloor.push([x,y]);
 for(const actor of [...heroes,...enemies])if(!w.walkable(actor.x,actor.y)){
  const cell=b.engagementFloor.reduce((a,p)=>!a||Math.hypot(p[0]+.5-actor.x,p[1]+.5-actor.y)<Math.hypot(a[0]+.5-actor.x,a[1]+.5-actor.y)?p:a,null);
  if(cell)Object.assign(actor,{x:cell[0]+.5,y:cell[1]+.5});
 }
 const orders=createCombatOrders({onNotice:message=>out.blockedNotices.push(message),onExecute:()=>{out.firstAction??=round(b.time);out.actions++;}}),guarded=new Set();
 const threat=()=>b.livingEnemies.filter(e=>e.intent?.kind==='strike'&&e.intent.power>0).sort((a,z)=>a.intent.left-z.intent.left)[0];
 const target=()=>targeting==='first-threat'&&threat()||b.livingEnemies[0];
 function choose(h){
  const t=target();if(!t||policy==='idle')return false;
  const low=heroes.filter(h=>h.hp>0).sort((a,z)=>a.hp/a.maxHp-z.hp/z.maxHp)[0];let kind='attack',tech=null,aim=t;
  if(policy==='earned'){
   if(h.id===1&&low.hp<low.maxHp*.65){kind='tech';tech=compileTechnique('mend','focus',{character:1});aim=low;}
   else if(h.id===0&&h.mp>=6){kind='tech';tech=compileTechnique('earth','focus');}
  }
  return orders.request(b,w,h,kind,aim,tech);
 }
 function queue(){if(!orders.pending&&policy!=='idle'){const h=b.ready[0]||heroes.filter(h=>h.hp>0).sort((a,z)=>z.atb-a.atb||z.speed-a.speed)[0];if(h)choose(h);}}
 if(policy==='earned')queue();
 while(b.time<maxTime&&!b.ended){
  if(response==='dodge'){
   const intents=b.livingEnemies.filter(e=>e.intent?.kind==='strike'&&e.intent.power>0),live=heroes.filter(h=>h.hp>0);
   for(const h of live)if(intents.some(e=>b.intentHits(e,e.intent,h))){
    const candidates=Array.from({length:16},(_,n)=>{const a=n*Math.PI/8,dx=Math.cos(a)*2.65*dt,dy=Math.sin(a)*2.65*dt;return {dx,dy,valid:w.walkable(h.x+dx,h.y+dy)&&w.walkable(h.x+dx,h.y)&&w.walkable(h.x,h.y+dy),danger:intents.filter(e=>b.intentHits(e,e.intent,{...h,x:h.x+dx*12,y:h.y+dy*12})).length};}).filter(p=>p.valid).sort((a,z)=>a.danger-z.danger);
    const p=candidates[0];if(p){orders.manual();h.x+=p.dx;h.y+=p.dy;}
   }
  }
  b.advance(dt);
  if(response==='dodge'&&b.livingEnemies.some(e=>e.intent?.kind==='strike'&&e.intent.power>0)){orders.manual();w.state.x=heroes[0].x;w.state.y=heroes[0].y;continue;}
  if(response==='guard'&&!guarded.size){
   const h=b.ready.find(h=>!guarded.has(h.id)&&b.livingEnemies.some(e=>e.intent?.kind==='strike'&&e.intent.power>0&&b.intentHits(e,e.intent,h)));
   if(h){orders.request(b,w,h,'guard',h);guarded.add(h.id);}
  }
  if(policy==='attack')orders.automatic(b,w,target()?.id);
  else{
   if(targeting==='first-threat'&&threat()&&orders.pending&&orders.pending.targetId!==threat().id){const h=heroes.find(h=>h.id===orders.pending.heroId);if(h)choose(h);}
   queue();
  }
  orders.step(b,w,dt);w.state.x=heroes[0].x;w.state.y=heroes[0].y;
 }
 return {...out,result:b.ended||'timeout',seconds:round(b.time),remainingHP:heroes.map(h=>Math.round(h.hp)),remainingMP:heroes.map(h=>h.mp),reinforcements:b.reinforcements,enemyRemaining:b.livingEnemies.map(e=>Math.round(e.hp))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const cases=[
  {name:'5.24 control / Attack'},
  {name:'5.24 control / earned Earth',policy:'earned'},
  {name:'5.25 / Attack caller',tempo:true},
  {name:'5.25 / earned Earth caller',tempo:true,policy:'earned'},
  {name:'5.25 / answer first strike with earned Earth',tempo:true,policy:'earned',targeting:'first-threat'},
  {name:'5.25 / Guard once, then Attack caller',tempo:true,response:'guard'},
  {name:'5.25 / move clear, then Attack caller',tempo:true,response:'dodge'},
  {name:'5.25 / idle through the opening',tempo:true,policy:'idle',maxTime:12},
  {name:'guardian unchanged / control',boss:true},
  {name:'guardian unchanged / opted in',boss:true,tempo:true}
 ];
 const report={baselineCommit:'7424016cf051d24c88abca541e734a37490384f9',integrationVersion:'5.25.0',stepSeconds:dt,
  methodology:'All cases earn the actual opening party, equipment and loadout through earnOpening(), then use the canonical enemy, context, floor and combat-order driver. No HP, damage, rewards or gear are added. The only independent variable in matched controls is the fresh encounterTempo version marker. The first-threat policy redirects the queued earned Earth at the announced damaging strike. Guard responds once with the first threatened ready hero. Dodge is an idealized 50ms geometry-aware per-hero movement policy, not a human playtest. Menus, cinematic pauses, pointer input, Ground Forge and Living Atlas modifiers are outside this simulation.',rows:cases.map(runOpening)};
 fs.writeFileSync(new URL('./encounter-tempo-benchmark.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 for(const row of report.rows)console.log(JSON.stringify({name:row.name,hp:row.initialEnemyHP,firstTell:row.warnings[0]?.at,firstTellKind:row.warnings[0]?.kind,firstResolution:row.resolutions[0]?.at,firstStrikeDamage:row.resolutions[0]?.damage,damage:row.heroDamage,responses:row.responses,guardPrevented:row.guardPrevented,reinforcements:row.reinforcements,result:row.result,seconds:row.seconds,remainingMP:row.remainingMP}));
}
