"""Deterministic browser interaction smoke test. Mocks only WebGL calls, never physics.

Usage: python test_slice.py
Requires: playwright and an installed Chromium (CHROMIUM_PATH can override).
This does NOT certify visual fidelity, real GPU drawing, or 60 FPS.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os

ROOT = Path(__file__).resolve().parent
HTML = (ROOT / 'index.html').read_text(encoding='utf-8')
FAKE_GL = '''<script>
window.__ENABLE_SLICE_TEST__=true;
const prior=HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext=function(kind,...args){
 if(kind!=='webgl2')return prior.call(this,kind,...args);
 return new Proxy({}, {get(target,key){
  if(key==='getShaderParameter'||key==='getProgramParameter')return ()=>true;
  if(key==='getShaderInfoLog'||key==='getProgramInfoLog')return ()=>'';
  if(['createShader','createBuffer','createProgram','createVertexArray','getUniformLocation'].includes(key))return ()=>({});
  return ()=>{};
 }});
};</script>'''

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True,
                                    args=['--no-sandbox'])
        page = browser.new_page(viewport={'width':1280,'height':720})
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(HTML.replace('<script>', FAKE_GL+'<script>', 1), wait_until='domcontentloaded', timeout=30000)
        state=lambda: page.evaluate('window.__sliceTest.state()')
        assert state()['mode']=='foot'
        page.evaluate('window.__sliceTest.teleport(-345,-389)')
        page.keyboard.press('e')
        assert state()['mode']=='ground'
        page.keyboard.down('w')
        page.evaluate('for(let i=0;i<60;i++)window.__sliceTest.step(1/60)')
        page.keyboard.up('w')
        assert state()['car']['speed']>5.0, state()['car']
        page.evaluate('window.__sliceTest.stopCar();window.__sliceTest.teleport(25,143)')
        page.keyboard.press('e')
        assert state()['mode']=='foot'
        page.evaluate('window.__sliceTest.teleport(-84,38)')
        page.keyboard.press('f')
        assert state()['inventory']['grain']==4, state()['inventory']
        page.evaluate('window.__sliceTest.teleport(25,143)')
        page.keyboard.press('e')
        assert state()['mode']=='flight'
        page.keyboard.down('w');page.keyboard.down(' ')
        page.evaluate('for(let i=0;i<150;i++)window.__sliceTest.step(1/60)')
        page.keyboard.up('w');page.keyboard.up(' ')
        a=state()['plane']
        assert a['speed']>10 and a['y']>3 and not a['landed'],a
        page.evaluate('window.__sliceTest.teleport(300,304)')
        page.keyboard.press('l')
        page.evaluate('for(let i=0;i<1500;i++)window.__sliceTest.step(1/60)')
        a=state()['plane']
        assert a['landed'] and a['speed']==0, a
        assert abs(a['x']-316)<2 and abs(a['z']-332)<2, a
        page.keyboard.press('e')
        assert state()['mode']=='foot',state()
        page.evaluate('window.__sliceTest.teleport(398,420);for(let i=0;i<5;i++)window.__sliceTest.step(1/60)')
        assert state()['stage']==5 and state()['delivered'],state()
        page.keyboard.press('m')
        assert page.locator('#map').get_attribute('class')=='open'
        assert not errors, errors
        browser.close()
        print('PASS: boot, walking state, rover boarding and acceleration, gathering, flight takeoff, auto-landing, disembark, delivery, map, no JS errors')
        print('LIMITATION: Graphics API was stubbed; this is logic verification, not WebGL frame-rate certification.')

if __name__=='__main__': run()
