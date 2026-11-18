"""Headless state-continuity validation of whole trip. No position teleport in the test.
Mock WebGL only; tests physics, world coordinates, route guidance and progression.
"""
from test_slice import ROOT, HTML, FAKE_GL
from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1280,'height':720})
        errs=[]
        page.on('pageerror', lambda e:errs.append(str(e)))
        page.set_content(HTML.replace('<script>',FAKE_GL+'<script>',1),wait_until='domcontentloaded',timeout=30000)
        status=lambda:page.evaluate('window.__sliceTest.state()')
        page.keyboard.press('r')
        page.evaluate('for(let i=0;i<600;i++)window.__sliceTest.step(1/60)')
        a=status();print('Walk to rover:',a['player']['x'],a['player']['z'],flush=True)
        assert abs(a['player']['x']+345)<12 and abs(a['player']['z']+389)<12
        page.keyboard.press('e')
        assert status()['mode']=='ground'
        page.keyboard.press('r')
        for i in range(12):
            page.evaluate('for(let k=0;k<300;k++)window.__sliceTest.step(1/60)')
            a=status()
            if a['stage']>=2 and a['car']['speed']<2:break
        print('Rover to airfield:',a['car']['x'],a['car']['z'],'stage',a['stage'],flush=True)
        assert a['stage']>=2 and a['car']['speed']<2 and abs(a['car']['x']-25)<30 and abs(a['car']['z']-143)<30,a
        page.keyboard.press('e')
        assert status()['mode']=='foot'
        page.keyboard.press('e')
        assert status()['mode']=='flight'
        page.keyboard.press('l')
        for i in range(15):
            page.evaluate('for(let k=0;k<300;k++)window.__sliceTest.step(1/60)')
            a=status()
            if a['plane']['landed'] and abs(a['plane']['x']-316)<4 and abs(a['plane']['z']-332)<4:break
        print('Air trip:',a['plane']['x'],a['plane']['z'],a['plane']['y'],a['plane']['landed'],flush=True)
        assert a['plane']['landed'] and abs(a['plane']['x']-316)<4 and abs(a['plane']['z']-332)<4,a
        page.keyboard.press('e')
        assert status()['mode']=='foot'
        page.keyboard.press('r')
        page.evaluate('for(let i=0;i<2100;i++)window.__sliceTest.step(1/60)')
        a=status();print('Finish on foot:',a['player']['x'],a['player']['z'],'stage',a['stage'],flush=True)
        assert a['stage']==5 and a['delivered'],a
        assert not errs,errs
        browser.close()
        print('PASS: full uninterrupted walking → driving → flying → landing → walking journey, no test teleports, no JS errors.')

if __name__=='__main__':run()
