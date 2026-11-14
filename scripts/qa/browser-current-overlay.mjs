/**
 * Non-destructive Chrome preview of the actual current public Site with
 * exactly fourteen staged source files substituted in-browser.
 * Unmodified JS/assets continue loading from the original public Site.
 * The real Site is never written, published, or granted account credentials.
 */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright-core';
import {createHash} from 'node:crypto';
import {inspectMapStability} from './inspect-map-stability.mjs';

const publicGame='https://ash-aether-clay-water.towre676.chatgpt.site/game/';
const review=resolve(process.env.QA_REVIEW_ROOT||'qa-live-review');
const patch=join(review,'game/engine2');
const artifactRoot=resolve(process.env.QA_ARTIFACT_ROOT||'qa-artifacts-live-overlay');
mkdirSync(artifactRoot,{recursive:true});
const manifest=JSON.parse(readFileSync(join(review,'LIVING-REGIONS-STAGING.json'),'utf8'));
if(manifest.kind!=='review-only'||manifest.deployed||manifest.files.length!==14||new Set(manifest.files.map(f=>f.file)).size!==14)throw Error('Stage verification missing or not review-only');
const files=new Set(manifest.files.map(x=>x.file));
const required=['world.js','main.js','room-map.js','spatial-ecology.mjs','vast-spatial-expansion.mjs','spatial-wildlife.mjs'];
if(required.some(x=>!files.has(x)||!existsSync(join(patch,x))))throw Error('Not the complete approved modern overlay');
for(const entry of manifest.files){
 const bytes=readFileSync(join(patch,entry.file));
 if(createHash('sha256').update(bytes).digest('hex')!==entry.newSha256)throw Error('Staged SHA-256 mismatch: '+entry.file);
}
const report=[];
const persist=()=>writeFileSync(join(artifactRoot,'report.json'),JSON.stringify({deployed:false,
 source:'current public Site with hash-verified review-only source overrides',browserVersion:browser?.version(),manifest,report},null,2)+'\n');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 async function run(label,viewport,mobile=false){
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,serviceWorkers:'block'});
  const page=await context.newPage(),served=[],exceptions=[],failed=[],checkpoints=[];
  await context.addInitScript(()=>{window.__qaLongTasks=[];new PerformanceObserver(list=>{for(const e of list.getEntries())window.__qaLongTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const checkpoint=(name,details={})=>{checkpoints.push({name,passed:true,...details});console.log('CHECKPOINT '+label+' '+name);};
  const capture=async name=>{
   // A viewport capture does not scroll a dialog or require its geometry to
   // settle (the precise cause of the original instability is unconfirmed). Gameplay assertions remain independent of image capture.
   await page.screenshot({path:join(artifactRoot,label+'-'+name+'.png'),fullPage:false,timeout:10000});
  };
  const position=async()=>{
   const value=await page.locator('#screen').getAttribute('data-position');
   if(!value||!/^[-\d.]+,[-\d.]+$/.test(value)||value.split(',').some(v=>!Number.isFinite(Number(v))))
    throw Error('Missing or invalid player position: '+value);
   return value;
  };
  page.on('requestfailed',req=>{if(req.url().includes('/game/engine2'))failed.push(req.failure()?.errorText+' '+req.url());});
  page.on('pageerror',error=>exceptions.push(String(error.message)));
  page.on('response',response=>{if(response.status()>=400&&response.url().includes('/game/engine2'))failed.push(response.status()+' '+response.url().replace(publicGame,''));});
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url()),match=u.pathname.match(/^\/game\/engine2\/([^/]+)$/);
   if(route.request().method()!=='GET'){failed.push('Blocked non-GET request '+route.request().url());return route.abort();}
   if(u.origin===new URL(publicGame).origin&&match&&files.has(match[1])){
    const file=match[1],data=readFileSync(join(patch,file));served.push(file);
    await route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:data,headers:{'cache-control':'no-store'}});
   }else await route.continue();
  });
  let step='current site load';
  try{
   // Do not silently test an old overlay against a Site that changed underneath it.
   for(const file of manifest.files.filter(f=>f.oldSha256)){
    const response=await context.request.get(publicGame+'engine2/'+file.file,{timeout:30000});
    if(!response.ok()||createHash('sha256').update(await response.body()).digest('hex')!==file.oldSha256)
     throw Error('Current source drift or unreadable source: '+file.file);
   }
   checkpoint('current source hashes match staging');
   // The modern Site provides a read-only scene-art practice entry; using it
   // bypasses expensive 24-chapter synthetic developer-fixture replay.
   await page.goto(publicGame+'?dev=1&reviewScene=2000&review-only=1',{waitUntil:'domcontentloaded',timeout:70000});
   // Direct reviewScene entry hides the title; wait for the active field instead.
   step='modern scene-art review';
   await page.waitForFunction(()=>{
    const badge=document.getElementById('dev-session-badge'),canvas=document.getElementById('screen');
    return badge&&!badge.hidden&&badge.textContent.includes('Amber Dunes')&&
      canvas?.getBoundingClientRect().width>100&&document.getElementById('opening')?.hidden===true;
   },null,{timeout:60000});
   const entry=await page.evaluate(()=>({scene:document.getElementById('screen')?.dataset.scene,
     badgeVisible:!document.getElementById('dev-session-badge')?.hidden,
     modal:document.getElementById('dev-portal')?.open,
     drawMs:document.getElementById('screen')?.dataset.drawMs}));
   console.log('CURRENT-REVIEW-SCENE '+label+' '+JSON.stringify(entry));
   if(entry.modal)throw Error('Unexpected developer modal in direct modern scene review');
   step='native live map and manual waypoint selection';
   await page.locator('#room-map-button:visible').waitFor({state:'visible',timeout:30000});
   const mapDiagnostic=await page.evaluate(()=>{
    const e=document.querySelector('#room-map-button'),r=e.getBoundingClientRect(),
     hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),dialog=document.querySelector('#dialog'),
     canvas=document.querySelector('#screen');
    return {hidden:e.hidden,display:getComputedStyle(e).display,
     rect:{x:r.x,y:r.y,w:r.width,h:r.height},hit:hit?.id||hit?.className?.toString().slice(0,90)||hit?.tagName,
     modal:document.querySelector('#dev-portal')?.open,dialogVisible:dialog&&!dialog.hidden,
     pauseVisible:!document.querySelector('#pause')?.hidden,
     mode:canvas?.dataset.mode,drawMs:canvas?.dataset.drawMs,scene:canvas?.dataset.scene};
   });
   console.log('QA-MAP-PRECLICK '+label+' '+JSON.stringify(mapDiagnostic));
   if(mapDiagnostic.hidden||mapDiagnostic.display==='none'||mapDiagnostic.dialogVisible||mapDiagnostic.modal)throw Error('Native Map blocked by field state: '+JSON.stringify(mapDiagnostic));
   const before=await position();
   const hit=mapDiagnostic.rect;
   await (mobile?page.touchscreen.tap(hit.x+hit.w/2,hit.y+hit.h/2):page.mouse.click(hit.x+hit.w/2,hit.y+hit.h/2));
   await page.locator('#room-map-panel[open]').waitFor({state:'visible',timeout:12000});
   const marks=page.locator('#room-map-panel .room-map-destinations button'),count=await marks.count();
   if(count<4)throw Error('Current map lacks accessible journey and ecological landmarks: '+count);
   const text=await marks.allTextContents();
   if(!text.some(x=>/Fieldwork|Uncharted habitat/i.test(x)))throw Error('New ecological stations absent from current native room map');
   const markRect=await marks.first().boundingBox();
   if(!markRect)throw Error('Native map label is not on screen');
   await (mobile?page.touchscreen.tap(markRect.x+markRect.width/2,markRect.y+markRect.height/2):page.mouse.click(markRect.x+markRect.width/2,markRect.y+markRect.height/2));
   await page.waitForFunction(()=>document.querySelector('#room-map-panel p[role=status]')?.textContent.includes('Waypoint selected'));
   const status=await page.locator('#room-map-panel p[role="status"]').textContent();
   if(!status.includes('Waypoint selected'))throw Error('Choosing map label did not provide manual waypoint preview: '+status);
   const follow=page.getByRole('button',{name:'Follow selected waypoint'});
   if(!await follow.isVisible())throw Error('Explicit route-follow action missing');
   await sleep(800);
   const still=await position();
   if(before!==still)throw Error('Selecting a map marker automatically walked the party');
   checkpoint('native map and manual selection',{marks:count,before,after:still,status});
   step='map geometry diagnostic';
   const stability=await page.evaluate(inspectMapStability);
   writeFileSync(join(artifactRoot,label+'-map-geometry.json'),JSON.stringify(stability,null,2));
   if(stability.frames.some(f=>!f.open||f.position!==before))throw Error('Native map closed or party moved during evidence sampling');
   step='map viewport evidence';await capture('map');
   const closeRect=await page.locator('#room-map-panel header button').boundingBox();
   if(!closeRect)throw Error('Native map close button is missing');
   await (mobile?page.touchscreen.tap(closeRect.x+closeRect.width/2,closeRect.y+closeRect.height/2):page.mouse.click(closeRect.x+closeRect.width/2,closeRect.y+closeRect.height/2));
   await page.waitForFunction(()=>!document.querySelector('#room-map-panel')?.open);
   step='manual movement';
   let moved=false,last=before;
   if(mobile){
    const joystick=await page.locator('#joystick').boundingBox();
    if(!joystick)throw Error('Touch joystick unavailable');
    const cdp=await context.newCDPSession(page),x=joystick.x+joystick.width/2,y=joystick.y+joystick.height/2;
    for(const [dx,dy] of [[.32,0],[0,.32],[-.32,0],[0,-.32]]){
     const point={x:x+dx*joystick.width,y:y+dy*joystick.height,id:1};
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
     try{await sleep(650);}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
     await sleep(250);last=await position();if(last!==before){moved=true;break;}
    }
    await cdp.detach();
   }else for(const key of ['ArrowRight','ArrowDown','ArrowLeft','ArrowUp']){
    await page.keyboard.down(key);try{await sleep(360);}finally{await page.keyboard.up(key);}await sleep(250);
    last=await position();if(last!==before){moved=true;break;}
   }
   if(!moved)throw Error('Manual player movement missing in all directions after leaving map');
   checkpoint(mobile?'touch joystick movement':'manual keyboard movement',{before,after:last});
   step='field viewport evidence';await capture('field');
   step='native camera settings';
   await page.locator('#menu-button').click();
   const comfort=page.locator('.player-comfort');
   if(await comfort.getAttribute('open')===null)await comfort.locator('summary').click();
   const zoom=page.getByRole('slider',{name:'World zoom',exact:true});
   await zoom.press('Home');await zoom.press('ArrowRight');
   await page.waitForFunction(()=>document.querySelector('#camera-zoom-status')?.textContent==='Manual zoom · 51%');
   await page.locator('#resume').click();
   await page.waitForFunction(()=>document.querySelector('#screen')?.dataset.cameraZoomMode==='manual'&&Number(document.querySelector('#screen').dataset.cameraZoom)===.51);
   checkpoint('native manual camera zoom',{zoom:.51});
   await page.locator('#menu-button').click();
   await page.getByRole('button',{name:'Use automatic zoom',exact:true}).click();
   await page.locator('#resume').click();
   await page.waitForFunction(()=>document.querySelector('#screen')?.dataset.cameraZoomMode==='automatic');
   checkpoint('native automatic camera reset');
   step='explicit route follow';
   await page.locator('#room-map-button').click();
   const crossing=page.getByRole('button',{name:'Crossing',exact:true});
   await (mobile?crossing.tap():crossing.click());
   const followFrom=await position(),explicitFollow=page.getByRole('button',{name:'Follow selected waypoint',exact:true});
   await (mobile?explicitFollow.tap():explicitFollow.click());
   await page.waitForFunction(()=>!document.querySelector('#room-map-panel')?.open);
   await page.waitForFunction(before=>document.querySelector('#screen')?.dataset.position!==before,followFrom,{timeout:15000});
   const followTo=await position();
   if(followTo===followFrom)throw Error('Explicit route follow did not move the party');
   checkpoint('explicit route follow moves only after confirmation',{before:followFrom,after:followTo});
   await capture('explicit-follow');
   const metrics=await page.locator('#screen').evaluate(el=>({
    mode:el.dataset.mode,position:el.dataset.position,scene:el.dataset.scene,
    drawMs:el.dataset.drawMs||null,cameraZoom:el.dataset.cameraZoom||null,
    authoredMotion:el.dataset.authoredMotion?.slice(0,120)||null
   }));
   if(failed.length)throw Error('Live dependency failures: '+failed.join(' | ').slice(0,350));
   const relevant=exceptions;
   if(relevant.length)throw Error('Runtime code error: '+relevant.join(' | ').slice(0,600));
   const mustLoad=[...files];
   if(mustLoad.some(x=>!served.includes(x)))throw Error('Browser did not load all expected modern patched modules: '+served.join(','));
   const output={label,pass:true,checkpoints,marks:count,moved,metrics,overrides:[...new Set(served)].sort(),exceptions:exceptions.slice(0,8),failed};
   report.push(output);console.log('CURRENT-OVERLAY-BROWSER '+JSON.stringify(output));
  }catch(e){
   await page.screenshot({path:join(artifactRoot,label+'-error.png'),fullPage:false,timeout:10000}).catch(()=>{});
   const output={label,pass:false,checkpoints,step,error:String(e).slice(0,1800),overrides:[...new Set(served)],exceptions:exceptions.slice(0,10),failed:failed.slice(0,10),
    page:{load:await page.locator('#load-status').textContent().catch(()=>null),startup:await page.locator('#startup-message').textContent().catch(()=>null)}};
   report.push(output);console.error('CURRENT-OVERLAY-BROWSER '+JSON.stringify(output));
  }finally{
   const tasks=await page.evaluate(()=>window.__qaLongTasks||[]).catch(()=>[]);
   writeFileSync(join(artifactRoot,label+'-long-tasks.json'),JSON.stringify(tasks,null,2));
   persist();await context.tracing.stop({path:join(artifactRoot,label+'-trace.zip')}).catch(e=>console.error('Trace unavailable: '+e.message));await context.close();}
 }
 await run('modern-desktop',{width:1280,height:800});
 if(process.env.QA_MOBILE==='1')await run('modern-mobile',{width:390,height:844},true);
 persist();
 if(report.some(x=>!x.pass))process.exitCode=1;
}catch(e){report.push({label:'browser-setup',pass:false,error:String(e)});persist();process.exitCode=1;}finally{await browser?.close();}
