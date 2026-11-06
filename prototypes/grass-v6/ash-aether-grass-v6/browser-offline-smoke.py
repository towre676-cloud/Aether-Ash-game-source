from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).parent
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 reports=[]
 for page_name in ['cinematic-grass-offline.html','reconciliation-lab-offline.html']:
  html=(root/page_name).read_text()
  for width,height in [(1120,730),(390,844)]:
   pg=b.new_page(viewport={'width':width,'height':height});errors=[]
   pg.on('pageerror',lambda ex:errors.append(str(ex)))
   try:
    pg.set_content(html,timeout=15000,wait_until='domcontentloaded')
    pg.wait_for_timeout(650)
    data=pg.evaluate('''() => ({title:document.title,canvas:document.querySelector('canvas')?.width||0,
      htmlScrollWidth:document.documentElement.scrollWidth,bodyClientWidth:document.body.clientWidth,
      buttons:document.querySelectorAll('button').length})''')
    reports.append({'name':page_name,'viewport':width,'errors':errors,'render':data})
   except Exception as e:reports.append({'name':page_name,'viewport':width,'error':str(e)[:350]})
   finally:pg.close()
 b.close()
(root/'OFFLINE_BROWSER_V6.json').write_text(json.dumps(reports,indent=2))
print(json.dumps(reports,indent=2))
