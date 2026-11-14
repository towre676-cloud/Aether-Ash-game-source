/**
 * Non-destructive Chrome preview of the actual current public Site with
 * fourteen? No: exactly thirteen staged source files substituted in-browser.
 * Unmodified JS/assets continue loading from the original public Site.
 * The real Site is never written, published, or granted account credentials.
 */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {chromium} from 'playwright-core';

const publicGame='https://ash-aether-clay-water.towre676.chatgpt.site/game/';
const patch=resolve(process.cwd(),'qa-live-review/game/engine2');
const artifactRoot=resolve(process.cwd(),'qa-artifacts-live-overlay');
mkdirSync(artifactRoot,{recursive:true});
const manifest=JSON.parse(readFileSync(resolve(process.cwd(),'qa-live-review/LIVING-REGIONS-STAGING.json'),'utf8'));
if(manifest.deployed||manifest.files.length!==13)throw Error('Stage verification missing or not review-only');
const files=new Set(manifest.files.map(x=>x.file));
const required=['world.js','main.js','room-map.js','spatial-ecology.mjs','vast-spatial-expansion.mjs','spatial-wildlife.mjs'];
if(required.some(x=>!files.has(x)||!existsSync(join(patch,x))))throw Error('Not the complete approved modern overlay');
const report=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 async function run(label,viewport,mobile=false){
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,serviceWorkers:'block'});
  const page=await context.newPage(),served=[],exceptions=[],failed=[];
  page.on('pageerror',error=>exceptions.push(String(error.message)));
  page.on('response',response=>{if(response.status()>=400&&response.url().includes('/game/engine2'))failed.push(response.status()+' '+response.url().replace(publicGame,''));});
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url()),match=u.pathname.match(/^\/game\/engine2\/([^/]+)$/);
   if(u.origin===new URL(publicGame).origin&&match&&files.has(match[1])){
    const file=match[1],data=readFileSync(join(patch,file));served.push(file);
    await route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:data,headers:{'cache-control':'no-store'}});
   }else await route.continue();
  });
  let step='current site load';
  try{
   await page.goto(publicGame+'?dev=1&review-only=1',{waitUntil:'domcontentloaded',timeout:70000});
   await page.locator('#play:enabled').waitFor({state:'visible',timeout:120000});
   step='developer chapter';
   if(!await page.locator('#dev-portal[open]').isVisible())await page.locator('#play').click();
   await page.locator('#dev-portal[open]').waitFor({state:'visible',timeout:20000});
   await page.locator('#dev-portal [data-chapter="10"]').click();
   await page.getByRole('button',{name:'Explore this chapter'}).click();
   await page.waitForFunction(()=>{
    const badge=document.getElementById('dev-session-badge'),error=document.querySelector('#dev-portal .dev-error')?.textContent?.trim();
    return badge&&!badge.hidden||error&&!/^Preparing this chapter/.test(error);
   },null,{timeout:70000});
   const entry=await page.evaluate(()=>({badgeVisible:!document.getElementById('dev-session-badge')?.hidden,
     portalOpen:document.getElementById('dev-portal')?.open,
     chosen:document.querySelector('#dev-portal [data-chapter="10"]')?.getAttribute('aria-pressed'),
     error:document.querySelector('#dev-portal .dev-error')?.textContent?.trim()}));
   console.log('QA-DEV-ENTRY '+label+' '+JSON.stringify(entry));
   if(!entry.badgeVisible)throw Error('Current Site developer scene launch failed: '+entry.error);

   step='render and initialize';
   await page.waitForFunction(()=>{
    const c=document.getElementById('screen'),opening=document.getElementById('opening');
    return c?.dataset?.mode==='field'&&opening?.hidden===true;
   },null,{timeout:120000});
   if(await page.locator('#dev-portal[open]').isVisible()){\n    await page.getByRole('button',{name:'Return to test'}).click({timeout:12000});\n    await page.locator('#dev-portal[open]').waitFor({state:'hidden',timeout:12000});\n   }\n   for(let i=0;i<7;i++){
    if(!await page.locator('#dialog').isVisible())break;
    if(await page.locator('#dialog-next').isVisible())await page.locator('#dialog-next').click();else break;
    await sleep(350);
   }
   step='native live map and manual waypoint selection';
   await page.locator('#room-map-button:visible').waitFor({state:'visible',timeout:30000});
   const position=await page.locator('#screen').getAttribute('data-position');
   await page.locator('#room-map-button').click();
   await page.locator('#room-map-panel[open]').waitFor({state:'visible',timeout:12000});
   const marks=page.locator('#room-map-panel .room-map-destinations button'),count=await marks.count();
   if(count<4)throw Error('Current map lacks accessible journey and ecological landmarks: '+count);
   const text=await marks.allTextContents();
   if(!text.some(x=>/Fieldwork|Uncharted habitat/i.test(x)))throw Error('New ecological stations absent from current native room map');
   await marks.first().click();
   const status=await page.locator('#room-map-panel p[role="status"]').textContent();
   if(!status.includes('Waypoint selected'))throw Error('Choosing map label did not provide manual waypoint preview: '+status);
   const follow=page.getByRole('button',{name:'Follow selected waypoint'});
   if(!await follow.isVisible())throw Error('Explicit route-follow action missing');
   const still=await page.locator('#screen').getAttribute('data-position');
   if(position!==still)throw Error('Selecting a map marker automatically walked the party');
   await page.locator('#room-map-panel').screenshot({path:join(artifactRoot,label+'-map.png')});
   await page.locator('#room-map-panel header button').click();
   step='manual movement';
   let moved=false,last=position;
   for(const key of ['ArrowRight','ArrowDown','ArrowLeft','ArrowUp']){
    await page.keyboard.down(key);await sleep(360);await page.keyboard.up(key);await sleep(250);
    last=await page.locator('#screen').getAttribute('data-position');
    if(last&&last!==position){moved=true;break;}
   }
   if(!moved)throw Error('Manual player movement missing in all directions after leaving map');
   await page.locator('#screen').screenshot({path:join(artifactRoot,label+'-field.png')});
   const metrics=await page.locator('#screen').evaluate(el=>({
    mode:el.dataset.mode,position:el.dataset.position,scene:el.dataset.scene,
    drawMs:el.dataset.drawMs||null,cameraZoom:el.dataset.cameraZoom||null,
    authoredMotion:el.dataset.authoredMotion?.slice(0,120)||null
   }));
   if(failed.length)throw Error('Live dependency failures: '+failed.join(' | ').slice(0,350));
   const relevant=exceptions.filter(e=>/SyntaxError|TypeError|ReferenceError|import|module/i.test(e));
   if(relevant.length)throw Error('Runtime code error: '+relevant.join(' | ').slice(0,600));
   const mustLoad=['world.js','main.js','room-map.js','spatial-ecology.mjs','spatial-wildlife.mjs'];
   if(mustLoad.some(x=>!served.includes(x)))throw Error('Browser did not load all expected modern patched modules: '+served.join(','));
   const output={label,pass:true,marks:count,moved,metrics,overrides:[...new Set(served)].sort(),exceptions:exceptions.slice(0,8),failed};
   report.push(output);console.log('CURRENT-OVERLAY-BROWSER '+JSON.stringify(output));
  }catch(e){
   await page.screenshot({path:join(artifactRoot,label+'-error.png'),fullPage:true,timeout:10000}).catch(()=>{});
   const output={label,pass:false,step,error:String(e).slice(0,1800),overrides:[...new Set(served)],exceptions:exceptions.slice(0,10),failed:failed.slice(0,10),
    page:{load:await page.locator('#load-status').textContent().catch(()=>null),startup:await page.locator('#startup-message').textContent().catch(()=>null)}};
   report.push(output);console.error('CURRENT-OVERLAY-BROWSER '+JSON.stringify(output));
  }finally{await context.close();}
 }
 await run('modern-desktop',{width:1280,height:800});
 if(process.env.QA_MOBILE==='1')await run('modern-mobile',{width:390,height:844},true);
 writeFileSync(join(artifactRoot,'report.json'),JSON.stringify({deployed:false,source:'real publicly served modern Site with thirteen read-only in-browser source overrides',report},null,2)+'\n');
 if(report.some(x=>!x.pass))process.exitCode=1;
}finally{await browser?.close();}
