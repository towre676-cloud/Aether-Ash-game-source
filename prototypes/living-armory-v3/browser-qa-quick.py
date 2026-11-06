from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys,time
P=Path(__file__).resolve().parent
h=(P/'armory-playable.html').read_text()
with sync_playwright() as pl:
 b=pl.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'],headless=True)
 for name,w in [('desktop',1400),('mobile',390)]:
  print('opening',name,flush=True)
  page=b.new_page(viewport={'width':w,'height':850})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('about:blank');print('setting HTML',flush=True)
  page.set_content(h,wait_until='commit',timeout=15000)
  page.wait_for_timeout(450)
  print('metrics',name,page.evaluate('''()=>({ready:!!window.AAArmoryPreview,panels:document.querySelectorAll('.item-painted img').length,width:document.documentElement.scrollWidth,viewport:innerWidth,hasHarmonics:!!document.querySelector('#harmonyPanel')})'''), 'errors',errors,flush=True)
  page.screenshot(path=str(P/'assets'/f'v3-final-{name}.png'),full_page=False,timeout=15000)
  print('screenshot saved',name,flush=True)
  page.close()
 b.close()
