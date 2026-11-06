import {setAssistanceMode} from '../quest-assistance.js';
/** Guided walking QA through the actual task resolver. Choices are explicit test
 * inputs; combat is simulated by the battle engine, never awarded by forged flags.
 * This is deterministic engine evidence, not a browser/device playthrough. */
import fs from 'node:fs';import assert from 'node:assert/strict';
import {World} from '../world.js?v=5.41';
import {resolveGuidedObjective} from '../guided-objective.js?v=5.41';
import {createQuestGuide} from '../quest-navigation.js?v=5.21.0';
import {Battle,encounterEnemies} from '../battle.js?v=5.38';
import {compileTechnique} from '../mako.js';
const source=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
const branch=Number(process.argv[2]||0);let dialog,guide,lastObject=null,select=0,steps=0,fights=0,moves=0,starts=0;const visited=new Set(),notices=[];
const w=new World(source,{onDialog:d=>{dialog=d;guide?.interrupt('dialog');},onBattle:fight,onScene:()=>{guide?.sceneChanged();},onNotice:t=>notices.push(t)});
function drain(){for(let i=0;dialog&&i<80;i++){const d=dialog;dialog=null;if(d.choices){let n=0;if(lastObject?.type==='puzzle')n=lastObject.choice_effects?(lastObject.choice_id?branch:0):lastObject.steps[lastObject.stage_flag&&w.bit(...lastObject.stage_flag)?1:0].answer;if(lastObject?.type==='project'&&w.state.gold<300)n=1;d.choices[Math.min(n,d.choices.length-1)].action();}else d.after?.();}assert.ok(!dialog,'dialog cycle');}
function fight(origin){const s=w.state,hs=w.activeHeroes;hs.forEach((h,i)=>{h.x=s.x+(i===1?-.9:i===2?.9:0);h.y=s.y+(i?.7:0);});const xy=origin.object.xy||origin.object.enemies[0][1],es=encounterEnemies(origin.mission.id,origin.object.type==='boss',origin.object.enemies?.length||2);es.forEach((e,i)=>{e.x=xy[0]+.5+(i%2)*1.3;e.y=xy[1]+.5+Math.floor(i/2)*1.4;});const b=new Battle({heroes:hs,enemies:es,chapter:origin.mission.id,rng:()=>.5});
 for(let tick=0;tick<30000&&!b.ended;tick++){b.advance(.1);for(const h of [...b.ready]){const low=hs.filter(a=>a.hp>0).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0],dead=hs.find(a=>a.hp<=0);if(dead&&s.items.revive){s.items.revive--;dead.hp=Math.round(dead.maxHp*.4);h.atb=0;continue;}const heal=h.loadout.find(x=>x.core==='mend');if(low.hp<low.maxHp*.65&&heal){b.command(h.id,'tech',low.id,compileTechnique(heal.core,heal.support,{character:h.id,ap:h.ap[heal.core]||0}));continue;}if(low.hp<low.maxHp*.45&&s.items.tonic){s.items.tonic--;low.hp=Math.min(low.maxHp,low.hp+Math.max(100,low.maxHp*.45));h.atb=0;continue;}if(h.mp<8||h.strain>70){b.command(h.id,'guard',h.id);continue;}const slot=h.loadout.find(x=>x.core==='earth')||h.loadout.find(x=>!['mend','ward','revive'].includes(x.core));if(slot)b.command(h.id,'tech',b.livingEnemies[0]?.id,compileTechnique(slot.core,slot.support,{character:h.id,ap:h.ap[slot.core]||0}));else b.command(h.id,'attack',b.livingEnemies[0]?.id);}}
 assert.equal(b.ended,'win',`battle chapter ${origin.mission.id}, ${origin.object.type}`);fights++;w.winBattle();}

const interact=w.interact.bind(w);w.interact=o=>{lastObject=o;steps++;interact(o);};
setAssistanceMode(w.state,'full');guide=createQuestGuide(w,{resolve:()=>resolveGuidedObjective(w),onNotice:t=>notices.push(t)});
drain();visited.add(w.state.scene);
let previous='',stale=0;
for(let frame=0;frame<5000000&&!w.state.complete;frame++){
 if(!guide.running){assert.ok(guide.start(),JSON.stringify({failed:'start',chapter:w.state.chapter,scene:w.scene.key,goal:resolveGuidedObjective(w),notices:notices.slice(-3)}));starts++;}
 const beforeX=w.state.x,beforeY=w.state.y;guide.update(.05);visited.add(w.state.scene);if(w.state.x!==beforeX||w.state.y!==beforeY)moves++;
 if(guide.status?.reason==='challenge'){const o=resolveGuidedObjective(w)?.object;assert.ok(o);w.interact(o);}
 drain();const key=JSON.stringify([w.state.chapter,w.state.scene,w.state.x,w.state.y,w.state.mode,w.state.flags,w.state.storyChoices,w.state.bosses]);stale=key===previous?stale+1:0;previous=key;
 assert.ok(stale<80,JSON.stringify({failed:'stalled',chapter:w.state.chapter,scene:w.scene.key,goal:resolveGuidedObjective(w),status:guide.status,notices:notices.slice(-5)}));
 if(frame%50000===0)console.log(JSON.stringify({frame,chapter:w.state.chapter,scene:w.scene.key,steps,moves,fights,starts}));
}
assert.equal(w.state.complete,true,'campaign completed');assert.equal(starts,1,'one latched guide follows the complete journey');assert.equal(Object.keys(w.state.storyChoices).filter(k=>w.state.storyChoices[k]!==null).length,7);console.log(JSON.stringify({result:'pass',scope:'real objective resolver and walked guide, explicit choices, simulated battles; not browser/controller proof',branch,fights,rooms:visited.size,steps,moves,starts,choices:w.state.storyChoices}));
