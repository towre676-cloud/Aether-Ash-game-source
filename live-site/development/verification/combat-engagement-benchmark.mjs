import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {earnOpening} from '../../dist/game/engine2/tests/opening-flow.mjs';
import {createCombatOrders} from '../../dist/game/engine2/combat-order.js';
import {Battle,encounterEnemies} from '../../dist/game/engine2/battle.js';
import {defaultHero,compileTechnique,compileLoadoutTechnique} from '../../dist/game/engine2/mako.js';
import {combatContext} from '../../dist/game/engine2/combat-reactions.js';
import {battlefieldContext} from '../../dist/game/engine2/battlefield-context.js';
import {livingEncounterContext} from '../../dist/game/engine2/living-world.js';
import {objectiveEncounterContext} from '../../dist/game/engine2/objective-context.js';
const {w}=earnOpening(),saved=structuredClone(w.state),dt=.05;
export function run({name,chapter=1,boss=false,policy='attack',dodge=false,level=null,contextual=true,maxTime=180,engagement=false,driver=false}){
 w.state=structuredClone(saved);const scene=chapter===1?w.scene:[...w.scenes.values()].find(s=>s.chapter===chapter&&s.objects?.some(o=>o.type===(boss?'boss':'patrol')));
 if(scene)w.state.scene=scene.location;w.state.chapter=chapter;
 const object=w.scene.objects.find(o=>o.type===(boss?'boss':'patrol'))||{type:boss?'boss':'patrol',xy:[10,10],enemies:[[1,[10,10]],[1,[11,10]]]};
 const xy=object.xy||object.enemies[0][1];
 let pos={x:xy[0]+.5,y:xy[1]+2.7};if(!w.walkable(pos.x,pos.y)){const found=[];for(let y=0;y<w.scene.height;y++)for(let x=0;x<w.scene.width;x++)if(w.walkable(x+.5,y+.5))found.push({x:x+.5,y:y+.5,d:Math.hypot(x-xy[0],y-xy[1])});found.sort((a,b)=>Math.abs(a.d-2.2)-Math.abs(b.d-2.2));pos=found[0];}
 w.state.x=pos.x;w.state.y=pos.y;
 const hs=level?[0,2,1].map(id=>defaultHero(id,level)):w.activeHeroes;hs.forEach((h,i)=>Object.assign(h,{x:pos.x+(i===1?-.9:i===2?.9:0),y:pos.y+(i?.7:0)}));
 const es=encounterEnemies(chapter,boss,2);es.forEach((e,i)=>Object.assign(e,{x:xy[0]+.5+(i%2)*1.3,y:xy[1]+.5+Math.floor(i/2)*1.4}));
 let context=contextual?livingEncounterContext(w,object,objectiveEncounterContext(w,object,battlefieldContext(w,object,combatContext(w)))):{version:1,tags:[]};context={...context,encounterSerial:1,encounterKey:object.bit??object.type,reinforcementLimit:2};
 if(engagement)context.engagement={version:1};w.state.mode='battle';
 const out={name,chapter,boss,policy,dodge,engagement,driver,firstRequest:null,approachDistance:0,blockedNotices:[],level:level||1,geometry:context.walkable?.length||0,initialEnemyHP:es.reduce((s,e)=>s+e.hp,0),firstAction:null,firstIntent:null,firstEnemyCast:null,actions:0,heroDamage:0,enemyDamage:0,enemyCasts:0,enemyHitCasts:0,interrupts:0,defeats:0,attackDamage:[],techDamage:[]};
 let b; b=new Battle({heroes:hs,enemies:es,chapter,context,inventory:structuredClone(w.state.items),rng:()=>.5,onEvent:e=>{if(e.type==='intent')out.firstIntent??=b?.time||0;if(e.type==='enemy-cast'){out.firstEnemyCast??=b.time;out.enemyCasts++;if(e.targets?.length)out.enemyHitCasts++;}if(e.type==='interrupt')out.interrupts++;if(e.type==='damage'){if(hs.includes(e.actor))out.heroDamage+=e.amount;else{out.enemyDamage+=e.amount;if(!e.dot)(e.tech?out.techDamage:out.attackDamage).push(e.amount);}}if(e.type==='defeat'&&hs.includes(e.actor))out.defeats++;}});

 if(engagement){b.engagementFloor=[];for(let y=0;y<w.scene.height;y++)for(let x=0;x<w.scene.width;x++)if(w.walkable(x+.5,y+.5))b.engagementFloor.push([x,y]);
  for(const actor of [...hs,...es])if(!w.walkable(actor.x,actor.y)){const cell=b.engagementFloor.reduce((a,p)=>!a||Math.hypot(p[0]+.5-actor.x,p[1]+.5-actor.y)<Math.hypot(a[0]+.5-actor.x,a[1]+.5-actor.y)?p:a,null);if(cell)Object.assign(actor,{x:cell[0]+.5,y:cell[1]+.5});}}
 const orders=createCombatOrders({onNotice:message=>out.blockedNotices.push(message),onExecute:()=>{out.firstAction??=b.time;out.actions++;}});
 function act(h){
  if(!b.livingEnemies.length||policy==='idle')return false;const target=b.livingEnemies[0],low=hs.filter(x=>x.hp>0).sort((a,z)=>a.hp/a.maxHp-z.hp/z.maxHp)[0];let kind='attack',tech=null,t=target;
  if(policy==='earned'){
   if(h.id===1&&low.hp<low.maxHp*.65){kind='tech';tech=compileTechnique('mend','focus',{character:1});t=low;}
   else if(h.id===0&&h.mp>=6){kind='tech';tech=compileTechnique('earth','focus');}
  }else if(policy==='break'){
   if(low.hp<low.maxHp*.6){kind='tech';tech=compileTechnique('mend','burst',{character:h.id});t=low;}
   else if(h.mp<9||h.strain>70){kind='guard';t=h;}
   else{kind='tech';tech=compileTechnique('earth','break',{character:h.id,ap:120});}
  }
  if(driver){const accepted=orders.request(b,w,h,kind,t,tech);if(accepted)out.firstRequest??=b.time;return accepted;}
  const accepted=b.command(h.id,kind,t.id,tech);if(accepted){out.firstRequest??=b.time;out.firstAction??=b.time;out.actions++;}return accepted;
 }
 function queueNext(){if(!orders.pending&&policy!=='idle'){const h=b.ready[0]||hs.filter(h=>h.hp>0).sort((a,z)=>z.atb-a.atb||z.speed-a.speed)[0];if(h)act(h);}}
 if(driver&&policy!=='attack')queueNext();
 while(b.time<maxTime&&!b.ended){
  if(dodge){const intents=b.livingEnemies.filter(e=>e.intent&&e.intent.power>0);if(intents.length){const candidates=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,dx=Math.cos(a)*2.65*dt,dy=Math.sin(a)*2.65*dt;const valid=hs.filter(h=>h.hp>0).every(h=>!contextual||w.walkable(h.x+dx,h.y+dy));const danger=hs.filter(h=>h.hp>0).reduce((sum,h)=>sum+intents.filter(e=>b.intentHits(e,e.intent,{...h,x:h.x+dx*12,y:h.y+dy*12})).length,0);return {dx,dy,danger,valid};}).filter(p=>p.valid).sort((a,z)=>a.danger-z.danger);const p=candidates[0];if(p&&driver)orders.manual();if(p)for(const h of hs){h.x+=p.dx;h.y+=p.dy;}}}
  b.advance(dt);
  if(driver){
   if(policy==='attack'){out.firstRequest??=b.time;orders.automatic(b,w,b.livingEnemies[0]?.id);}else queueNext();
   const before=hs.map(h=>({x:h.x,y:h.y}));orders.step(b,w,dt);
   for(let i=0;i<hs.length;i++)out.approachDistance+=Math.hypot(hs[i].x-before[i].x,hs[i].y-before[i].y);
   w.state.x=hs[0].x;w.state.y=hs[0].y;
  }else for(const h of [...b.ready])act(h);
 }
 out.approachDistance=+out.approachDistance.toFixed(2);out.result=b.ended||'timeout';out.seconds=+b.time.toFixed(2);out.remainingHP=hs.map(h=>Math.round(h.hp));out.remainingMP=hs.map(h=>h.mp);out.reinforcements=b.reinforcements;out.enemyRemaining=b.livingEnemies.map(e=>Math.round(e.hp));out.attackDamage=[...new Set(out.attackDamage)];out.techDamage=[...new Set(out.techDamage)];return out;
}
const cases=[
 {name:'earned opening patrol / Attack'}, {name:'earned opening patrol / earned techniques',policy:'earned'},
 {name:'earned first guardian / Attack',boss:true}, {name:'earned first guardian / earned techniques',boss:true,policy:'earned'},
 {name:'earned first guardian / earned techniques + dodge',boss:true,policy:'earned',dodge:true},
 {name:'earned first guardian / idle',boss:true,policy:'idle',maxTime:120},
 ...[2,4,8].flatMap(chapter=>[{name:'chapter '+chapter+' patrol fixture / Attack',chapter,level:chapter+2},{name:'chapter '+chapter+' guardian fixture / Break',chapter,boss:true,level:chapter+3,policy:'break'}])
];
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
const recordedBaseline=JSON.parse(fs.readFileSync(new URL('./combat-baseline-5.23.json',import.meta.url)));
const matchedCases=cases.slice(0,6);
const report={baselineCommit:'ad071bc412abdae6eefd8edd835cd533c29fe02e',integrationVersion:'5.24.0',stepSeconds:dt,
 methodology:'The earned opening uses earnOpening(), canonical enemy construction and actual scene/context. No gear or spells are invented for the opening cases. Legacy behavior is preserved by leaving engagement unmarked. New runs use createCombatOrders request/step or its existing automatic path, plus a full World.walkable floor. All actors and AI are deterministic. The dodge policy is an idealized 50ms geometry-aware input policy, not a human playtest. Menus, animation/cinematic pauses and physical pointer operation are outside this simulation. Ground Forge and Living Atlas modifiers are outside both sides of the controlled benchmark.',
 baselineRecorded:recordedBaseline,legacyReplay:matchedCases.map(run),legacyWithOrderDriver:matchedCases.map(c=>run({...c,driver:true})),engagementWithOrderDriver:matchedCases.map(c=>run({...c,driver:true,engagement:true}))};
fs.writeFileSync(new URL('./combat-engagement-benchmark.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
for(const group of ['legacyReplay','legacyWithOrderDriver','engagementWithOrderDriver'])for(const row of report[group])console.log(JSON.stringify({group,...row}));
}
