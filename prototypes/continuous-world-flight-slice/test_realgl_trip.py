"""Real WebGL2 under Xvfb / SwiftShader. Does not certify hardware FPS."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
html=(ROOT/'index.html').read_text(encoding='utf-8')
html=html.replace('<script>','<script>window.__ENABLE_SLICE_TEST__=true;</script><script>',1)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),headless=False,args=['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'])
 page=b.new_page(viewport={'width':1024,'height':576})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=30000)
 s=lambda:page.evaluate('window.__sliceTest.state()')
 assert s()['mode']=='foot'
 page.keyboard.press('r');page.evaluate('for(let i=0;i<600;i++)window.__sliceTest.step(1/60)');page.keyboard.press('e');assert s()['mode']=='ground'
 page.keyboard.press('r');page.evaluate('for(let i=0;i<3300;i++)window.__sliceTest.step(1/60)');assert s()['stage']>=2
 page.keyboard.press('e');page.keyboard.press('e');assert s()['mode']=='flight'
 page.keyboard.press('l');page.evaluate('for(let i=0;i<330;i++)window.__sliceTest.step(1/60)')
 page.wait_for_timeout(800);page.screenshot(path=str(ROOT/'flight-preview.png'))
 print('Flight while rendering:',s()['plane'], 'FPS',page.locator('#fps').inner_text(),flush=True)
 page.evaluate('for(let i=0;i<3600;i++)window.__sliceTest.step(1/60)');assert s()['plane']['landed']
 page.keyboard.press('e');page.keyboard.press('r');page.evaluate('for(let i=0;i<2100;i++)window.__sliceTest.step(1/60)')
 assert s()['stage']==5
 page.wait_for_timeout(400);page.screenshot(path=str(ROOT/'destination-preview.png'))
 print('PASS realGL whole trip:',s()['stage'],'FPS',page.locator('#fps').inner_text(),'errors:',errors,flush=True)
 b.close()
