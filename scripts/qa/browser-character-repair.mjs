/**
 * Runtime smoke for current production with opt-in in-memory character fixes.
 * Does NOT write a Site, alter the user's saved journey, or grant equipment.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright-core';

const site='https://ash-aether-clay-water.towre676.chatgpt.site/game/';
const root=path.resolve('build/character-repair-overlay');
const output=path.resolve('qa-artifacts-character-repair');
const names=['equipped-appearance.js','character-screen.js','character-showcase.js','articulated-surface-model.js','articulated-equipment.js','character-motion.js'];
const modules=Object.fromEntries(names.map(name=>[name,readFileSync(path.join(root,name),'utf8')]));
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({
 executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
let report={stagedOnly:true,siteMutated:false,runs:[]};
async function run(label,{mobile=false,patched=true}={}){
 const context=await browser.newContext({
  viewport:mobile?{width:390,height:844}:{width:1280,height:800},
  isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,
  serviceWorkers:'block',permissions:[]
 });
 const page=await context.newPage(),served=[],errors=[],httpErrors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&r.url().includes('/game/engine2/'))httpErrors.push(r.status()+' '+r.url());});
 if(patched)await page.route('**/game/engine2/**',route=>{
  const u=new URL(route.request().url()),name=u.pathname.split('/').pop();
  if(u.host===new URL(site).host&&u.pathname==='/game/engine2/'+name&&modules[name]){
   served.push(name);
   return route.fulfill({status:200,contentType:'text/javascript',body:'globalThis.__ashCharacterQA=(globalThis.__ashCharacterQA||{});globalThis.__ashCharacterQA['+JSON.stringify(name)+']=(globalThis.__ashCharacterQA['+JSON.stringify(name)+']||0)+1;\n'+modules[name],headers:{'cache-control':'no-store'}});
  }
  return route.continue();
 });
 let results=null,phase='navigation';
 try{
  await page.goto(site+'?dev=1&reviewScene=2000&characterQATest='+label,{waitUntil:'domcontentloaded',timeout:90000});
  phase='load game';
  await page.waitForFunction(()=>{
   const c=document.querySelector('#screen');
   return !!c&&c.width>200&&c.height>200&&document.querySelector('#opening')?.hidden===true;
  },null,{timeout:75000});
  phase='exercise exact current-snapshot modules';
  results=await page.evaluate(async()=>{
   const q='?v=remaining-scenes-13eef7ef894e';
   const [a,m,showcase,screen,surface,equipment]=await Promise.all([
    import('/game/engine2/equipped-appearance.js'+q),
    import('/game/engine2/character-motion.js'+q),
    import('/game/engine2/character-showcase.js'+q),
    import('/game/engine2/character-screen.js'+q),
    import('/game/engine2/articulated-surface-model.js'+q),
    import('/game/engine2/articulated-equipment.js'+q)
   ]);
   const heroes=Array.from({length:7},(_,id)=>({id,name:['Sable','Iona','Rook','Brass','Riven','Mira','Veyr'][id],equipment:true}));
   const state={heroes,recruited:[0,1,2,3,4,5,6],livingArmory:{gearByHero:{},revision:0},inheritance:{appearance:{version:1,revision:0,byHero:{},conditionByItem:{}}}};
   const required=['chest','shoulders','legs','feet'];
   const profiles=heroes.map(hero=>{
    const items=a.equippedAppearanceItems(state,hero.id);
    const p=a.equippedAppearance(state,hero.id);
    return {name:hero.name,slots:Object.keys(items),missing:required.filter(s=>!items[s]),active:p.active,profileHead:p.slots.head?.itemId||null};
   });
   const real={id:'rook-actual-armor-qa',name:'Real armor source',slot:'chest',icon:'armor',material:'Cindersteel',condition:100};
   state.livingArmory.gearByHero[2]={chest:real};state.livingArmory.revision++;
   const rookActual=a.equippedAppearanceItems(state,2).chest?.id;
   const rookProfile=a.equippedAppearance(state,2);
   const movementStart={x:0,y:0,phase:0,gait:'walk',back:false,facing:1};
   const moving=m.characterPose(movementStart,.14,0,1/60,{gait:'run',intent:{x:1,y:0}});
   const blocked=m.characterPose(moving,moving.x,moving.y,1/60,{gait:'run',intent:{x:1,y:0}});
   const canvas=document.querySelector('#screen');
   return {
    profiles,rookActual,rookVisibleChest:rookProfile.slots.chest?.itemId,
    movement:{moving:moving.moving,gait:moving.gait,blocked:blocked.moving,blockedAdvance:blocked.strideAdvance,
      bob:m.strideOffsets({moving:true,gait:'run',phase:1,speed:8.4}).lift},
    modulesLoaded:globalThis.__ashCharacterQA||{},
    rendererExports:[typeof showcase.characterShowcase,typeof screen.paintCharacterPortrait,typeof surface.createArticulatedSurfaceModel,typeof equipment.createArticulatedEquipmentModel],
    game:{mode:canvas?.dataset?.mode||'',width:canvas?.width||0,height:canvas?.height||0}
   };
  });
  if(results.profiles.some(p=>p.missing.length||!p.active))throw Error('One or more of seven crew is missing visible worn gear: '+JSON.stringify(results.profiles));
  if(results.rookActual!=='rook-actual-armor-qa'||results.rookVisibleChest!=='rook-actual-armor-qa')throw Error('Real equipped Rook armor did not override display-only legacy chest');
  if(!results.movement.moving||results.movement.gait!=='run'||results.movement.blocked||results.movement.blockedAdvance!==0||results.movement.bob>.8)throw Error('Movement/blocked stride regression '+JSON.stringify(results.movement));
  if(results.rendererExports.some(v=>v!=='function'))throw Error('Character runtime modules failed to import');
  const missing=names.filter(name=>!results.modulesLoaded[name]);if(missing.length)throw Error('Browser never evaluated repaired JS modules: '+missing.join(', '));
  const fatal=errors.filter(e=>/SyntaxError|ReferenceError|TypeError|Failed to fetch dynamically imported module|Cannot find module/i.test(e));
  if(fatal.length)throw Error('Browser runtime errors: '+fatal.join(' | ').slice(0,500));
  await page.screenshot({path:path.join(output,label+'.png'),timeout:45000,animations:'disabled'});
  report.runs.push({label,mobile,patched,pass:true,results,served:[...new Set(served)],pageErrors:errors.slice(0,5),httpErrors:httpErrors.slice(0,6)});
 }catch(e){
  await page.screenshot({path:path.join(output,label+'-failure.png'),timeout:20000}).catch(()=>{});
  report.runs.push({label,mobile,patched,pass:false,phase,error:e.message,results,served:[...new Set(served)],pageErrors:errors.slice(0,8),httpErrors:httpErrors.slice(0,6)});
 }finally{
  console.log('CHARACTER-LIVE-OVERLAY-QA '+JSON.stringify(report.runs.at(-1)));
  await context.close();
 }
}
try{
 await run('repaired-desktop');
 await run('repaired-mobile',{mobile:true});
}finally{await browser.close();}
writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
if(report.runs.some(r=>!r.pass))process.exitCode=1;
