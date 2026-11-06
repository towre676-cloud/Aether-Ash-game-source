#!/usr/bin/env python3
"""Optional desktop/mobile browser QA with Playwright + local Chromium.
Uses page.set_content intentionally: some hosted sandboxes block file:// and localhost.
No test claims anything about the deployed A&A game or end-user hardware FPS.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent

def cover(text):
    v=re.search(r'(?:Ground cover|Cover)\s+(\d+)%',text,re.I)
    return int(v.group(1)) if v else None

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for file in ('cinematic-grass-offline.html','reconciliation-lab-offline.html'):
        content=(ROOT/file).read_text()
        for width,height in ((1280,780),(390,844)):
            page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
            problems=[]
            page.on('pageerror',lambda e: problems.append(str(e)))
            page.set_content(content,wait_until='load',timeout=15000)
            page.wait_for_timeout(1000)
            label=('scenic' if file.startswith('cinematic') else 'ecology')+f'-{width}'
            page.screenshot(path=str(ROOT/(label+'.png')))
            if file.startswith('cinematic'):
                original=cover(page.locator('#readout').inner_text())
                page.locator('#burn').click()
                burned=cover(page.locator('#readout').inner_text())
                assert original is not None and burned is not None and burned<original,(label,original,burned)
                page.locator('#season').select_option('winter')
                page.locator('#habitat').select_option('marsh')
                page.locator('#water').click()
                page.locator('#recover').click()
                assert 'Day 30' in page.locator('#readout').inner_text()
            else:
                page.locator('#habitat').select_option('marsh')
                page.locator('#neighbor').select_option('orchard')
                page.locator('#season').select_option('winter')
                page.locator('#ignite').click() if page.locator('#ignite').count() else page.locator('#burn').click()
                page.locator('#timeline').click()
                assert 'NG+' in page.locator('#status').inner_text() or 'ng-plus' in page.locator('#status').inner_text()
            page.wait_for_timeout(300)
            assert not problems,(label,problems)
            print('PASS',label,'interactive workflow; errors=0')
            page.close()
    browser.close()
