import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.GAME_PREVIEW_URL || 'http://127.0.0.1:8765/live-site/dist/game/index.html?dev=1';
const browser = await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page = await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(response.status(),200,'game HTML served');
 await page.waitForSelector('#screen',{timeout:30000});
 const graphics=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true});
  if(!gl)return {webgl:false};
  const img=new Image();
  img.crossOrigin='anonymous';
  img.src=new URL('./engine2/art/cistern/material-atlas-v2.webp',location.href).href;
  const loaded=await new Promise(resolve=>{img.onload=()=>resolve(true);img.onerror=()=>resolve(false);setTimeout(()=>resolve(false),15000);});
  if(!loaded)return {webgl:true,loaded:false,url:img.src};
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  try{
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
   return {webgl:true,loaded:true,uploaded:gl.getError()===gl.NO_ERROR,url:img.src};
  }catch(error){return {webgl:true,loaded:true,uploaded:false,error:String(error),url:img.src};}
 });
 // Exercise the actual Cistern entry, not only a synthetic WebGL upload.
 const entry=page.locator('#dev-cistern');
 await entry.waitFor({state:'visible',timeout:30000});
 await entry.click();
 await page.waitForTimeout(4500);
 const dungeon=await page.evaluate(()=>{
  const canvases=[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height,visible:!!(c.getClientRects().length&&getComputedStyle(c).visibility!=='hidden'),id:c.id}));
  const text=document.body.innerText;
  return {canvases,failed:text.includes('The 3D scene could not draw safely'),hasCistern:text.includes('Remembering Cistern')||text.includes('west resonator'),crossOriginError:text.includes('cross-origin data')};
 });
 const characterArt=await page.evaluate(()=>{
  const sources=[...document.images].filter(i=>/crew|character|sprite|run/i.test(i.src)).slice(0,8);
  return sources.map(img=>{
   const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl');
   if(!gl)return {src:img.src,webgl:false};
   const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
   try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);return {src:img.src,uploaded:gl.getError()===gl.NO_ERROR};}
   catch(error){return {src:img.src,uploaded:false,error:String(error)};}
  });
 });
 console.log(JSON.stringify({characterArt},null,2));
 console.log(JSON.stringify({dungeon},null,2));
 assert.equal(dungeon.failed,false,'Cistern entered graphics failure overlay');
 assert.equal(dungeon.crossOriginError,false,'Cistern has WebGL cross-origin failure');
 assert.ok(dungeon.canvases.some(c=>c.visible&&c.width>100&&c.height>100),'No visible dungeon canvas');
 console.log(JSON.stringify({preview:base,graphics,pageErrors:errors.slice(0,10)},null,2));
 assert.equal(graphics.webgl,true,'WebGL unavailable on CI browser');
 assert.equal(graphics.loaded,true,'Cistern material atlas failed to load');
 assert.equal(graphics.uploaded,true,'Cistern material atlas failed WebGL texture upload');
} finally {await browser.close();}
