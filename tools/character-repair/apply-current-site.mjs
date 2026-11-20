#!/usr/bin/env node
/**
 * Ash & Aether: regression-safe repair overlay for the CURRENT served Site.
 *
 * Do not apply this to the exported v45 tree and do not deploy automatically.
 * Each exact anchor is checked once. A changed production structure aborts
 * rather than overwriting newer character, state, save or combat work.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const TARGETS=Object.freeze([
  'equipped-appearance.js',
  'character-screen.js',
  'character-showcase.js',
  'articulated-surface-model.js',
  'articulated-equipment.js',
  'character-motion.js'
]);
const sha=s=>createHash('sha256').update(s).digest('hex');
function replaceExact(source,before,after,label){
  const start=source.indexOf(before);
  if(start<0||source.indexOf(before,start+before.length)!==-1)
    throw Error('Current Site structure differs; refusing '+label);
  if(source.includes(after))throw Error('Already patched: '+label);
  return source.slice(0,start)+after+source.slice(start+before.length);
}
function patchAppearance(s){
  const before=String.raw`function purchasedCrewKit(heroId){
 const weapon=CREW_KIT_VISUALS[heroId];if(!weapon)return [];
 return [weapon,{slot:'ring2',shape:'ring',artVariant:0,name:'Reinforced focus band'}].map((visual,index)=>({
  physicalSlot:visual.slot,id:'crew-kit:'+heroId+':'+(index?'focus':'weapon'),name:visual.name,slot:group(visual.slot),icon:visual.shape,artVariant:visual.artVariant,material:index?'Astral Silver':'Cindersteel',rarity:'common',appearanceSource:'crew-kit',appearanceSourceSlot:index?'focus':'weapon',displayOnly:true
 }));
}`;
  const after=String.raw`function purchasedCrewKit(heroId){
 const weapon=CREW_KIT_VISUALS[heroId];if(!weapon)return [];
 // The legacy market receipt is a boolean, not six invented inventory items.
 // These are display-only *worn* pieces; real armory gear remains first-choice
 // for every physical slot and keeps its own item/material/condition.
 const material=['Cindersteel','Tideglass','Kiln-Bronze','Bell Brass','Living Yew','Cindersteel','Astral Silver'][heroId];
 const soft=heroId===1||heroId===6,beast=heroId===4;
 const wardrobe=[
  {slot:'chest',shape:soft?'robe':'armor',name:'Reinforced fitted '+(soft?'robe':'chestpiece')},
  {slot:'shoulders',shape:soft||beast?'mantle':'pauldrons',name:'Reinforced shoulder protection'},
  {slot:'legs',shape:'legs',name:'Reinforced fitted legwear'},
  {slot:'feet',shape:'boots',name:'Reinforced travelling boots'}
 ];
 const visuals=[weapon,{slot:'ring2',shape:'ring',artVariant:0,name:'Reinforced focus band'},...wardrobe];
 return visuals.map((visual,index)=>({
  physicalSlot:visual.slot,id:'crew-kit:'+heroId+':'+(index===0?'weapon':index===1?'focus':visual.slot),
  name:visual.name,slot:group(visual.slot),icon:visual.shape,artVariant:visual.artVariant??0,
  material:index===1?'Astral Silver':material,rarity:'common',
  appearanceSource:'crew-kit',appearanceSourceSlot:index===0?'weapon':index===1?'focus':visual.slot,displayOnly:true
 }));
}`;
  s=replaceExact(s,before,after,'legacy equipped outfit');
  const old=String.raw`const poseOptions=identifyEquipmentPose(sprite,profile.heroId,options),scale=sprite.height/sprite.source.h,bodyHeight=options.bodyHeight?options.bodyHeight/scale:sprite.source.bodyHeight||sprite.source.h,compose=Number.isInteger(profile.heroId)?composeArticulatedCharacterCrop:composeEquippedCrop,result=compose(sprite.image,sprite.source,profile,{...poseOptions,bodyHeight,anchorX:sprite.anchorX*sprite.source.w,anchorY:sprite.anchorY*sprite.source.h});`;
  const next=String.raw`const poseOptions=identifyEquipmentPose(sprite,profile.heroId,options),scale=sprite.height/sprite.source.h,bodyHeight=options.bodyHeight?options.bodyHeight/scale:sprite.source.bodyHeight||sprite.source.h;
 const nativeCrew=Number.isInteger(profile.heroId)&&['crew','run','starter'].includes(poseOptions.kind||options.kind)&&options.preferArticulated!==true;
 // Restore the original drawn silhouette, measured foot pivot and action/run
 // animation with fitted gear. The articulated body remains a safe fallback
 // before equipment atlases load and is still used by the rotating stage.
 const compose=nativeCrew?composeEquippedCrop:Number.isInteger(profile.heroId)?composeArticulatedCharacterCrop:composeEquippedCrop;
 const drawOptions={...poseOptions,bodyHeight,anchorX:sprite.anchorX*sprite.source.w,anchorY:sprite.anchorY*sprite.source.h};
 const result=compose(sprite.image,sprite.source,profile,drawOptions)||(nativeCrew?composeArticulatedCharacterCrop(sprite.image,sprite.source,profile,drawOptions):null);`;
  return replaceExact(s,old,next,'authored motion and face silhouette');
}
function patchScreen(s){
  s=replaceExact(s,'equippedAppearanceItems,composeArticulatedCharacterCrop,APPEARANCE_SLOT_LABELS',
    'equippedAppearanceItems,composeArticulatedCharacterCrop,composeEquippedCrop,APPEARANCE_SLOT_LABELS','character screen imports');
  const old='compose=composeArticulatedCharacterCrop';
  if(s.split(old).length!==3)throw Error('Character portrait entry count changed; refusing screen patch');
  s=s.split(old).join('compose=composeEquippedCrop');
  const from='const profile=equippedAppearance(state,heroId),drawn=compose(image,source,profile,{kind,frame:0,row:basic?0:heroId,heroId,quality:\'high\'});';
  const to='const profile=equippedAppearance(state,heroId),options={kind,frame:0,row:basic?0:heroId,heroId,quality:\'high\'},drawn=compose(image,source,profile,options)||(profile.active&&compose===composeEquippedCrop?composeArticulatedCharacterCrop(image,source,profile,options):null);';
  return replaceExact(s,from,to,'portrait equipment fallback');
}
function patchShowcase(s){
  s=replaceExact(s,'equipment=null,onAtlas=()=>{}','equipment=null,equipmentForHero=null,onAtlas=()=>{}','hero-scoped profile resolver');
  const from="select(id){if(!validHero(id)||id===current)return;current=id;angle=(view==='back'?Math.PI:0)+.18;autoAt=null;manualUntil=performance.now()+1500;renderer.upload(art,current,appearance,equipment);dirty=true;},";
  const to="select(id,nextEquipment=null){if(!validHero(id)||id===current)return;current=id;const resolved=nextEquipment?.heroId===id?nextEquipment:typeof equipmentForHero==='function'?equipmentForHero(id):null;equipment=resolved?.heroId===id?resolved:null;presentation();refreshEquipmentArt();angle=(view==='back'?Math.PI:0)+.18;autoAt=null;manualUntil=performance.now()+1500;renderer.upload(art,current,appearance,equipment);dirty=true;},";
  return replaceExact(s,from,to,'hero switch retains other hero gear');
}
function patchSurface(s){
  const old='const radius=bone.radius,rel=clamp(bone.distance/(radius*1.9),0,1),round=Math.sqrt(Math.max(0,1-rel*rel))';
  const next="const headScale=[1.14,1,1.08,1,1,1,1][r.heroId]||1;if(bone.name==='head'&&headScale!==1){p[0]=r.joints.head[0]+(p[0]-r.joints.head[0])*headScale;p[1]=r.joints.head[1]+(p[1]-r.joints.head[1])*headScale;}const radius=bone.radius,rel=clamp(bone.distance/(radius*1.9),0,1),round=Math.sqrt(Math.max(0,1-rel*rel))";
  return replaceExact(s,old,next,'Sable/Rook textured head calibration');
}
function patchFallback(s){
  s=replaceExact(s,'hw=Math.max(.067,r.headWidth*.45),hy=',
    'hw=Math.max(.067,r.headWidth*.45)*(r.heroId===0?1.14:r.heroId===2?1.08:1),hy=',
    'fallback head geometry');
  s=replaceExact(s,'rx=Math.max(.08,r.headWidth*.51),hood=',
    'rx=Math.max(.08,r.headWidth*.51)*(r.heroId===0?1.14:r.heroId===2?1.08:1),hood=',
    'fallback helmet geometry');
  return s;
}
function patchMovement(s){
  s=replaceExact(s,'CYCLE={walk:1.45,run:1.6}','CYCLE={walk:1.45,run:1.96}','sprint stride cycle');
  s=replaceExact(s,'stance=run?.12:.24','stance=run?.18:.24','sprint contact interval');
  s=replaceExact(s,'(run?.55:.25)*weight,lift=swing*(run?1.15:.38)',
    '(run?.32:.25)*weight,lift=swing*(run?.66:.38)','sprint sway and bob restraint');
  return s;
}
const patches={
 'equipped-appearance.js':patchAppearance,
 'character-screen.js':patchScreen,
 'character-showcase.js':patchShowcase,
 'articulated-surface-model.js':patchSurface,
 'articulated-equipment.js':patchFallback,
 'character-motion.js':patchMovement
};
export function patchProductionSource(name,source){
  if(!TARGETS.includes(name)||typeof source!=='string'||source.length<1000)throw Error('Invalid current Site source: '+name);
  if(name!=='character-motion.js'&&!source.includes('remaining-scenes-'))throw Error('Not a current live module: '+name);
  const result=patches[name](source);
  if(result===source||!result.includes('export '))throw Error('No valid modifications produced for '+name);
  return {name,content:result,before:sha(source),after:sha(result),beforeBytes:Buffer.byteLength(source),afterBytes:Buffer.byteLength(result)};
}
export function stageCurrentSite(inputDir,outputDir){
  if(!inputDir||!outputDir||path.resolve(inputDir)===path.resolve(outputDir))throw Error('Supply separate current source and output directories');
  const jobs=TARGETS.map(name=>patchProductionSource(name,fs.readFileSync(path.join(inputDir,name),'utf8')));
  fs.mkdirSync(outputDir,{recursive:true});
  for(const job of jobs)fs.writeFileSync(path.join(outputDir,job.name),job.content);
  const report={source:'Public live Site modules, read-only',target:'ash-aether-clay-water.towre676.chatgpt.site',deployed:false,
    behavior:['preserve all authored crew motion and native head/body proportions in field/battle','show all worn legacy crew clothing without changing stats','prefer real equipped gear over display-only legacy clothing','recalculate character stage profile on hero switch','increase Sable/Rook head/helmet size in articulated previews','calm sprint animation without changing travel speed','preserve all saves, world state, loadouts and combat'],
    files:jobs.map(({name,before,after,beforeBytes,afterBytes})=>({name,before,after,beforeBytes,afterBytes}))};
  fs.writeFileSync(path.join(outputDir,'character-repair-manifest.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  try{
    const [inputDir,outputDir]=process.argv.slice(2);
    const report=stageCurrentSite(inputDir,outputDir);
    console.log(JSON.stringify(report,null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
