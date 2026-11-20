import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {TARGETS,patchProductionSource,stageCurrentSite} from './apply-current-site.mjs';

const input=process.env.ASH_CURRENT_SOURCE_DIR;
test('all live modules are explicitly targeted and fail closed',()=>{
 assert.equal(TARGETS.length,6);
 assert.equal(new Set(TARGETS).size,TARGETS.length);
 assert.throws(()=>patchProductionSource('legacy-unknown.js','export const test=1;'),/Invalid/);
 assert.throws(()=>patchProductionSource('equipped-appearance.js','export const stub=1;'.repeat(200)),/Not a current live module/);
});
test('real production sources patch once, then reject a duplicate application',{skip:!input},()=>{
 const out=path.resolve(input,'../patched-character-qa');
 const report=stageCurrentSite(input,out);
 assert.equal(report.deployed,false);
 assert.equal(report.files.length,TARGETS.length);
 for(const name of TARGETS){
  const original=fs.readFileSync(path.join(input,name),'utf8');
  const patched=fs.readFileSync(path.join(out,name),'utf8');
  assert.notEqual(original,patched,name);
  assert.match(patched,/export /);
  assert.throws(()=>patchProductionSource(name,patched),/Already patched|structure differs|Character portrait entry count/);
 }
 const appearance=fs.readFileSync(path.join(out,'equipped-appearance.js'),'utf8');
 const screen=fs.readFileSync(path.join(out,'character-screen.js'),'utf8');
 const stage=fs.readFileSync(path.join(out,'character-showcase.js'),'utf8');
 assert.match(appearance,/nativeCrew\?composeEquippedCrop/);
 assert.match(appearance,/nativeCrew\?composeArticulatedCharacterCrop/);
 assert.match(appearance,/purchasedCrewKit\(heroId\)/);
 assert.match(appearance,/if\(compatible\(gear\[slot\],slot\)\)add/); // real items take priority
 assert.match(screen,/compose=composeEquippedCrop/);
 assert.match(screen,/composeArticulatedCharacterCrop\(image,source,profile,options\)/);
 assert.match(stage,/equipmentForHero\(id\)/);
 assert.match(stage,/equipment=resolved\?\.heroId===id\?resolved:null/);
});
test('Rook and all seven characters have fitted display-only outfit pieces when the older equip receipt is set',{skip:!input},()=>{
 const source=patchProductionSource('equipped-appearance.js',fs.readFileSync(path.join(input,'equipped-appearance.js'),'utf8')).content;
 const start=source.indexOf('function purchasedCrewKit(heroId){'),end=source.indexOf('\n}\n',start);
 assert.ok(start>=0&&end>start);
 const fn=source.slice(start,end+2);
 const names=['Sable','Iona','Rook','Brass','Riven','Mira','Veyr'];
 const context={CREW_KIT_VISUALS:names.map((name,i)=>({slot:i===2?'hands':'mainhand',shape:i===2?'gauntlet':'sword',name:name+' weapon'})),group:slot=>slot.startsWith('ring')?'ring':slot};
 vm.runInNewContext(fn,context);
 for(let hero=0;hero<7;hero++){
  const kit=vm.runInNewContext('purchasedCrewKit('+hero+')',context);
  const slots=kit.map(item=>item.physicalSlot);
  for(const required of ['chest','shoulders','legs','feet'])assert.ok(slots.includes(required),names[hero]+' '+required);
  assert.ok(kit.every(x=>x.displayOnly===true));
  assert.ok(kit.every(x=>x.id.startsWith('crew-kit:'+hero+':')));
 }
 const rook=vm.runInNewContext('purchasedCrewKit(2)',context);
 assert.ok(rook.some(x=>x.physicalSlot==='chest'&&x.icon==='armor'));
 assert.ok(rook.some(x=>x.physicalSlot==='feet'&&x.icon==='boots'));
});
test('the sprint is still displacement-driven and no longer over-animates at high travel speed',{skip:!input},async()=>{
 const original=fs.readFileSync(path.join(input,'character-motion.js'),'utf8');
 const patched=patchProductionSource('character-motion.js',original).content;
 const mod=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(patched));
 assert.equal(mod.strideOffsets({moving:false,gait:'run',phase:1,speed:8.4}).lift,0);
 assert.equal(mod.strideOffsets({moving:true,gait:'run',phase:1,speed:8.4},{reducedMotion:true}).sway,0);
 assert.ok(mod.strideOffsets({moving:true,gait:'run',phase:1,speed:8.4}).lift<.8);
 let p={x:0,y:0,facing:1,back:false,phase:0};const frames=new Set();
 for(let i=0;i<120;i++){
  const next=mod.characterPose(p,p.x+8.4/60,p.y,1/60,{gait:'run',intent:{x:1,y:0}});
  frames.add(next.frame);p=next;
 }
 assert.deepEqual([...frames].sort(),[0,1,2,3]);
 assert.ok(p.phase>=0&&p.phase<4);
 const blocked=mod.characterPose(p,p.x,p.y,1/60,{gait:'run',intent:{x:1,y:0}});
 assert.equal(blocked.strideAdvance,0);
 assert.equal(blocked.phase,p.phase);
 assert.equal(blocked.moving,false);
 const back=mod.characterPose(blocked,blocked.x,blocked.y-.1,1/60,{gait:'run',intent:{x:0,y:-1}});
 assert.ok(back.frame>=4&&back.frame<=7);
 for(const hero of [0,1,2,3,4,5,6])
  for(let frame=4;frame<8;frame++)assert.equal(typeof mod.spriteFacingFlip('run',frame,false,hero),'boolean');
});
