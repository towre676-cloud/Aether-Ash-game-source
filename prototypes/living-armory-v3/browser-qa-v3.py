from pathlib import Path
from playwright.sync_api import sync_playwright
import json
P=Path(__file__).resolve().parent
url=(P/'armory-playable.html').as_uri()
results={}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for key,width,height in [('desktop',1490,980),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto('about:blank')
  page.set_content((P/'armory-playable.html').read_text(),wait_until='domcontentloaded',timeout=25000)
  page.wait_for_timeout(1300)
  if key=='mobile':
   page.locator('[data-mobile="bag"]').first.click()
   page.wait_for_timeout(200)
  metrics=page.evaluate('''() => ({
    wide:document.documentElement.scrollWidth,
    viewport:innerWidth,
    title:document.title,
    painted:document.querySelectorAll('.item-painted img').length,
    decoded:[...document.querySelectorAll('.item-painted img')].filter(i=>i.complete && i.naturalWidth>0).length,
    harmonics:document.querySelector('#harmonyPanel')?.textContent?.slice(0,100),
    imprints:!!document.querySelector('#imprintBtn'),
    screenshotWidth:innerWidth
  })''')
  page.screenshot(path=str(P/'assets'/f'v3-{key}.png'),full_page=(key=='desktop'),timeout=15000)
  # Select and engrave an item on desktop, including the real stats mutation.
  if key=='desktop':
   page.locator('#imprintStat').select_option('armor')
   pre=page.evaluate('''() => ({resources:AAArmoryPreview.snapshot().resources,stats:AAArmoryPreview.instance.stats()})''')
   page.locator('#imprintBtn').click()
   post=page.evaluate('''() => ({resources:AAArmoryPreview.snapshot().resources,stats:AAArmoryPreview.instance.stats(),items:[...AAArmoryPreview.instance.snapshot().placements.map(p=>p.item),...Object.values(AAArmoryPreview.instance.snapshot().gear).filter(Boolean),...AAArmoryPreview.instance.snapshot().overflow].filter(i=>i.imprint)})''')
   metrics['engraveExecuted']=pre['resources']!=post['resources']
   metrics['engraveItems']=len(post['items'])
   page.locator('#enemyChoice').select_option('sablecantor')
   page.locator('#battleBtn').click()
   metrics['bossLootOpen']=page.locator('#lootOverlay').evaluate("n=>!n.classList.contains('hidden')")
   metrics['lootLabelsContained']=page.evaluate("() => [...document.querySelectorAll('.loot-reward')].every(card => {const art=card.querySelector('.item-painted') || card.querySelector('svg'),txt=card.querySelector('strong');return !art||!txt||art.getBoundingClientRect().bottom <= txt.getBoundingClientRect().top + 3})")
   page.screenshot(path=str(P/'assets'/'v3-boss-loot.png'),full_page=False)
  if key=='mobile':
   page.locator('[data-mobile="gear"]').first.click()
   page.wait_for_timeout(160)
   page.screenshot(path=str(P/'assets'/'v3-mobile-gear.png'),full_page=False,timeout=15000)
  metrics['jsErrors']=errors
  results[key]=metrics
  page.close()
 browser.close()
print(json.dumps(results,indent=2))
