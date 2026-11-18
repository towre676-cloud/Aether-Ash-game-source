/**
 * Real current public Ash & Aether Site, with in-memory HD module overrides.
 * No account credentials, no save import, no publication, no Site writes.
 * Calls the Site's built-in read-only scene review entry.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
const site='https://ash-aether-clay-water.towre676.chatgpt.site/game/';
const root=path.resolve('build/current-hd-overlay/game/engine2');
const out=path.resolve('qa-artifacts-hd-browser');
const patchedLandscape=readFileSync(path.join(root,'adventure-landscape.js'));
const hdModels=readFileSync(path.join(root,'hd-environment-models.mjs'));
const patchedCistern=readFileSync(path.join(root,'cistern-renderer.js'));
mkdirSync(out,{recursive:true});
const args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args});
const report=[];
const canonicalHost=new URL(site).host;
async function run(label,viewport,{mobile=false,patched=false}={}){
 const ctx=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,serviceWorkers:'block',permissions:[]});
 const page=await ctx.newPage(),errors=[],missing=[],served=[],warnings=[];
 page.on('pageerror',e=>errors.push(String(e.message).slice(0,1000)));
 page.on('console',e=>{if(e.type()==='error')warnings.push(e.text().slice(0,400));});
 page.on('response',r=>{if(r.status()>=400&&r.url().includes('/game/engine2/'))missing.push(r.status()+' '+r.url());});
 if(patched)await page.route('**/game/engine2/*',async route=>{
  const u=new URL(route.request().url());
  if(u.host===canonicalHost&&u.pathname==='/game/engine2/adventure-landscape.js'){
   served.push('adventure-landscape.js');return route.fulfill({status:200,body:patchedLandscape,contentType:'text/javascript',headers:{'cache-control':'no-store'}});
  }
  if(u.host===canonicalHost&&u.pathname==='/game/engine2/cistern-renderer.js'){
   served.push('cistern-renderer.js');return route.fulfill({status:200,body:patchedCistern,contentType:'text/javascript',headers:{'cache-control':'no-store'}});
  }
  if(u.host===canonicalHost&&u.pathname==='/game/engine2/hd-environment-models.mjs'){
   served.push('hd-environment-models.mjs');return route.fulfill({status:200,body:hdModels,contentType:'text/javascript',headers:{'cache-control':'no-store'}});
  }
  return route.continue();
 });
 let stage='start',success=false,metrics={};
 try{
  await page.goto(site+'?dev=1&reviewScene=2000&hdAssetQA='+label,{waitUntil:'domcontentloaded',timeout:90000});
  stage='field loaded';
  await page.waitForFunction(()=>{
   const canvas=document.querySelector('#screen');
   return canvas&&canvas.width>200&&canvas.height>200&&document.querySelector('#opening')?.hidden===true;
  },null,{timeout:70000});
  stage='wait until 3D frame is actually painted';
  await page.waitForFunction(()=>{
   const canvas=document.querySelector('#screen');
   return canvas&&Number(canvas.dataset.drawMs)>0&&canvas.dataset.mode==='field';
  },null,{timeout:85000});
  await page.waitForTimeout(1700);
  const samples=await page.evaluate(()=>new Promise(resolve=>{
   const values=[],end=performance.now()+2600;
   const timer=setInterval(()=>{
    const n=Number(document.querySelector('#screen')?.dataset.drawMs);
    if(Number.isFinite(n)&&n>0)values.push(n);
    if(performance.now()>=end){clearInterval(timer);resolve(values);}
   },220);
  }));
  stage='scene screenshot';
  metrics=await page.evaluate(()=>{
   const c=document.querySelector('#screen'),badge=document.querySelector('#dev-session-badge');
   return {canvasWidth:c.width,canvasHeight:c.height,
    renderBackend:c.dataset.renderBackend||c.dataset.renderer||null,
    mode:c.dataset.mode||'',scene:c.dataset.scene||'',drawMs:Number(c.dataset.drawMs)||null,
    fps:document.querySelector('#fps')?.textContent?.slice(0,40)||null,
    bodyText:document.body?.innerText?.slice(0,180)||null,
    badge:badge?.textContent?.slice(0,95)||null,
    documentReady:document.readyState,
    timing:performance.getEntriesByType('resource').length};
  });
  metrics.frameSamplesMs=samples;
  metrics.p50RenderMs=samples.length?[...samples].sort((a,b)=>a-b)[Math.floor((samples.length-1)*.5)]:null;
  metrics.p95RenderMs=samples.length?[...samples].sort((a,b)=>a-b)[Math.floor((samples.length-1)*.95)]:null;
  const png=await page.screenshot({path:path.join(out,label+'.png'),timeout:20000});
  if(png.byteLength<110000)throw Error('World screenshot was probably captured before 3D world draw: '+png.byteLength+' bytes');
  if(patched&&['adventure-landscape.js','hd-environment-models.mjs','cistern-renderer.js'].some(x=>!served.includes(x)))throw Error('Browser did not load BOTH exact HD source overrides: '+served);
  if(patched&&(missing.some(x=>x.includes('hd-environment-models.mjs'))))throw Error('HD model script missing: '+missing.join(' | '));
  if(patched){
   const bad=missing.filter(x=>x.includes('hd-material-atlas-compatible.webp'));
   if(bad.length)throw Error('Required HD compatible atlas fetch failed: '+bad.join('; '));
  }
  const fatal=errors.filter(x=>/SyntaxError|ReferenceError|TypeError|Failed to fetch dynamically imported module|module specifier|Cannot find module/i.test(x));
  if(fatal.length)throw Error('Browser runtime errors: '+fatal.join(' | ').slice(0,900));
  success=true;
 }catch(e){
  errors.push('qa failure at '+stage+': '+e.message);
  await page.screenshot({path:path.join(out,label+'-failure.png'),timeout:12000}).catch(()=>{});
 }finally{
  const record={label,patched,mobile,pass:success,stage,metrics,served:[...new Set(served)],errors:errors.slice(0,12),missing:missing.slice(0,12),warnings:warnings.slice(0,10)};
  report.push(record);console.log('HD-LIVE-OVERLAY-QA '+JSON.stringify(record));
  await ctx.close();
 }
}
try{
 await run('baseline-desktop',{width:1280,height:800});
 await run('hd-desktop',{width:1280,height:800},{patched:true});
 await run('hd-mobile',{width:390,height:844},{patched:true,mobile:true});
}finally{await browser.close();}
writeFileSync(path.join(out,'report.json'),JSON.stringify({productionSiteUnmodified:true,actualGPUValidated:false,runs:report},null,2));
const baseline=report[0],candidate=report.slice(1);
if(candidate.some(x=>!x.pass))process.exitCode=1;
if(!baseline.pass)console.warn('Baseline public Site failed; no claim of production-wide game stability');
