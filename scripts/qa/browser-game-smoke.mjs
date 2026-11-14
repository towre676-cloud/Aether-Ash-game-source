/** Browser QA of the actual archived-source campaign executable (NOT the separately hosted Site).
 * Chrome starts a real canvas renderer and an isolated dev-session journey.
 * No user account, existing saved game, or live deployment is touched.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright-core';
const root=path.resolve(process.cwd(),'live-site/dist'),artifacts=path.resolve(process.cwd(),'qa-artifacts');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json',
 '.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg',
 '.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.woff2':'font/woff2','.wasm':'application/wasm','.mp4':'video/mp4'};
const server=http.createServer((request,res)=>{
 try{
  const u=new URL(request.url,'http://127.0.0.1'),name=decodeURIComponent(u.pathname),relative=name.endsWith('/')?name+'index.html':name;
  const full=path.resolve(root,'.'+relative);
  if(!full.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(full,(err,stat)=>{
   if(err||!stat.isFile()){res.writeHead(404);res.end();return;}
   const typ=types[path.extname(full)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':typ,'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});
   fs.createReadStream(full).pipe(res);
  });
 }catch(e){res.writeHead(400);res.end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const port=server.address().port,origin='http://127.0.0.1:'+port,records=[];
mkdirSync(artifacts,{recursive:true});
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
let browser;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 async function exercise(label,viewport,mobile=false){
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,permissions:[]});
  const page=await context.newPage(),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/game/engine2/'))missing.push(r.status()+' '+r.url().replace(origin,''));});
  let stage='load';
  try{
   const url=origin+'/game/?dev=1&browserQA='+label;
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
   await page.locator('#play:enabled').waitFor({state:'visible',timeout:110000});
   stage='developer portal';
   // Dev sessions open the chapter chooser automatically during boot; don't
   // click the now-obscured title button behind an already modal dialog.
   if(!await page.locator('#dev-portal[open]').isVisible())await page.locator('#play').click();
   await page.locator('#dev-portal[open]').waitFor({state:'visible',timeout:18000});
   stage='chapter select';await page.locator('#dev-portal [data-chapter="10"]').click();
   stage='enter scene';await page.getByRole('button',{name:'Explore this chapter'}).click();
   await page.waitForFunction(()=>{
    const badge=document.getElementById('dev-session-badge'),error=document.querySelector('#dev-portal .dev-error')?.textContent?.trim();
    return badge&&!badge.hidden||error&&!/^Preparing this chapter/.test(error);
   },null,{timeout:70000});
   const entry=await page.evaluate(()=>({badgeVisible:!document.getElementById('dev-session-badge')?.hidden,
     portalOpen:document.getElementById('dev-portal')?.open,
     chosen:document.querySelector('#dev-portal [data-chapter="10"]')?.getAttribute('aria-pressed'),
     error:document.querySelector('#dev-portal .dev-error')?.textContent?.trim()}));
   console.log('QA-DEV-ENTRY '+label+' '+JSON.stringify(entry));
   if(!entry.badgeVisible)throw Error('Developer scene launch failed: '+entry.error);

   await page.waitForFunction(()=>document.querySelector('#screen')?.dataset.mode==='field'&&
    document.querySelector('#opening')?.hidden===true,null,{timeout:110000});
   // Developer chapter tests sometimes re-open their chapter picker after
   // the canvas initializes. Dismiss the test picker, not the real game.
   if(await page.locator('#dev-portal[open]').isVisible()){
    await page.getByRole('button',{name:'Return to test'}).click({timeout:12000});
    await page.locator('#dev-portal[open]').waitFor({state:'hidden',timeout:12000});
   }
   // An authored entry may present a brief dialogue; dismiss only dialog,
   // never guess any story choices or spend currency.
   for(let i=0;i<6;i++){
    const visible=await page.locator('#dialog').isVisible().catch(()=>false);
    if(!visible)break;
    const btn=page.locator('#dialog-next');if(await btn.isVisible())await btn.click();else break;
    await sleep(300);
   }
   stage='expanded map';
   await page.locator('#spatial-map-button:visible').waitFor({state:'visible',timeout:30000});
   const mapDiagnostic=await page.evaluate(()=>{
    const e=document.querySelector('#spatial-map-button'),r=e.getBoundingClientRect(),
     hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),dialog=document.querySelector('#dialog'),
     game=document.querySelector('#game'),canvas=document.querySelector('#screen');
    return {hidden:e.hidden,display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility,
     rect:{x:r.x,y:r.y,w:r.width,h:r.height},hit:hit?.id||hit?.className?.toString().slice(0,90)||hit?.tagName,
     modal:document.querySelector('#dev-portal')?.open,dialogVisible:dialog&&!dialog.hidden,
     openingVisible:!document.querySelector('#opening')?.hidden,
     pauseVisible:!document.querySelector('#pause')?.hidden,game:game?.className,
     mode:canvas?.dataset.mode,drawMs:canvas?.dataset.drawMs,scene:canvas?.dataset.scene};
   });
   console.log('QA-MAP-PRECLICK '+label+' '+JSON.stringify(mapDiagnostic));
   if(mapDiagnostic.hidden||mapDiagnostic.display==='none'||mapDiagnostic.dialogVisible||mapDiagnostic.modal)throw Error('Map inaccessible because field is blocked: '+JSON.stringify(mapDiagnostic));
   const before=(await page.locator('#screen').getAttribute('data-position'))||'';
   // A real pointer click at the verified visible hit-target avoids Playwright's
   // unstable-layout actionability heuristic without dispatching a fake DOM event.
   const hit=mapDiagnostic.rect;
   await page.mouse.click(hit.x+hit.w/2,hit.y+hit.h/2);
   await page.locator('#spatial-region-map:not([hidden])').waitFor({state:'visible',timeout:8000});
   const points=await page.locator('#spatial-region-map .spatial-region-point').count();
   if(points!==8)throw Error('Expected eight reachable-survey map pins, found '+points);
   const markRect=await page.locator('#spatial-region-map .spatial-region-point').nth(6).boundingBox();
   if(!markRect)throw Error('Atlas waypoint is not on screen');
   await page.mouse.click(markRect.x+markRect.width/2,markRect.y+markRect.height/2);
   const selected=await page.locator('#spatial-region-map .spatial-region-point').nth(6).getAttribute('aria-pressed');
   if(selected!=='true')throw Error('Region atlas did not select waypoint');
   const during=(await page.locator('#screen').getAttribute('data-position'))||'';
   if(before!==during)throw Error('Selecting a map pin moved the party');
   await page.locator('#spatial-region-map').screenshot({path:path.join(artifacts,label+'-map.png')});
   const closeRect=await page.getByRole('button',{name:'Return to journey'}).boundingBox();
   if(!closeRect)throw Error('Atlas close button is not on screen');
   await page.mouse.click(closeRect.x+closeRect.width/2,closeRect.y+closeRect.height/2);
   await page.locator('#spatial-region-map[hidden]').waitFor({state:'attached',timeout:6000});
   stage='movement';
   let moved=false,after=before;
   for(const direction of ['ArrowRight','ArrowDown','ArrowLeft','ArrowUp']){
    await page.keyboard.down(direction);await sleep(350);await page.keyboard.up(direction);await sleep(200);
    after=(await page.locator('#screen').getAttribute('data-position'))||'';
    if(after&&after!==before){moved=true;break;}
   }
   if(!moved)throw Error('No manual movement in any arrow-key direction at arrival');
   await page.locator('#screen').screenshot({path:path.join(artifacts,label+'-field.png')});
   const metrics=await page.locator('#screen').evaluate(canvas=>({
    scene:canvas.dataset.scene,mode:canvas.dataset.mode,renderMs:Number(canvas.dataset.drawMs)||null,
    cameraZoom:canvas.dataset.cameraZoom||null,position:canvas.dataset.position||null,
    width:canvas.width,height:canvas.height,role:canvas.getAttribute('aria-label')
   }));
   if(metrics.mode!=='field')throw Error('World left field state unexpectedly');
   if(errors.some(s=>/TypeError|ReferenceError|SyntaxError|module/i.test(s)))throw Error('Browser runtime exception: '+errors.join(' | ').slice(0,380));
   if(missing.length)throw Error('Missing engine scripts: '+missing.join(', ').slice(0,380));
   records.push({label,pass:true,points,moved,metrics,errors,missing});
   console.log('BROWSER-QA '+JSON.stringify(records.at(-1)));
  }catch(e){
   await page.screenshot({path:path.join(artifacts,label+'-failed.png'),fullPage:true,timeout:9000}).catch(()=>{});
   records.push({label,pass:false,stage,error:String(e),errors:errors.slice(0,14),missing:missing.slice(0,14),
    screen:{loadStatus:await page.locator('#load-status').textContent().catch(()=>null),startup:await page.locator('#startup-message').textContent().catch(()=>null)}});
   console.error('BROWSER-QA '+JSON.stringify(records.at(-1)));
  }finally{await context.close();}
 }
 await exercise('desktop-3d',{width:1280,height:800});
 if(process.env.QA_MOBILE==='1')await exercise('mobile-touch',{width:390,height:844},true);
 const failed=records.filter(r=>!r.pass);
 fs.writeFileSync(path.join(artifacts,'report.json'),JSON.stringify({source:'archived site development branch',liveDeploymentVerified:false,runs:records},null,2)+'\n');
 if(failed.length)process.exitCode=1;
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
