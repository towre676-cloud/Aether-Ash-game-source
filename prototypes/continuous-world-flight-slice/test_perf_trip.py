"""Repeatable real-WebGL2 route profile; same route and instrumentation for baseline and candidate.

This is a SwiftShader software-renderer benchmark unless the renderer metadata says
otherwise. rAF intervals are delivered-frame time; JS callback time is CPU wall time.
GPU pipeline time is NOT inferred when EXT_disjoint_timer_query_webgl2 is absent.
"""
import argparse, json, os, statistics
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--source',type=Path,default=ROOT/'index.html')
 p.add_argument('--out',type=Path,default=ROOT/'flight-perf-result.json')
 p.add_argument('--width',type=int,default=1024)
 p.add_argument('--height',type=int,default=576)
 p.add_argument('--hold-ms',type=int,default=2000)
 p.add_argument('--headless',action='store_true')
 args=p.parse_args()
 html=args.source.read_text(encoding='utf-8')
 shim=(ROOT/'flight-perf-shim.js').read_text(encoding='utf-8')
 assert html.count('<script>')==1, 'Expected a self-contained flight slice'
 html=html.replace('<script>','<script>'+shim+'</script><script>',1)
 phases=[]
 with sync_playwright() as playwright:
  browser=playwright.chromium.launch(
   executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),
   headless=args.headless,
   args=['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--disable-background-timer-throttling']
  )
  page=browser.new_page(viewport={'width':args.width,'height':args.height},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content(html,wait_until='domcontentloaded',timeout=60000)
  page.wait_for_function('window.__flightPerf && window.__sliceTest && window.__sliceTest.state().mode==="foot"',timeout=60000)
  state=lambda:page.evaluate('window.__sliceTest.state()')
  def step(count):
   for at in range(0,count,200):
    n=min(200,count-at)
    page.evaluate('(n)=>{for(let k=0;k<n;k++)window.__sliceTest.step(1/60);}',n)
  def measure(name):
   page.evaluate('(name)=>window.__flightPerf.select(name)',name)
   page.wait_for_timeout(args.hold_ms)
   # The current phase is summarized in result() but not otherwise touched.
   snapshot=page.evaluate('window.__flightPerf.result().phases.at(-1)')
   assert snapshot['frameCount']>=4, (name,snapshot,'Browser stopped rendering')
   phases.append({'phase':name,'frameCount':snapshot['frameCount'],'p50':snapshot['raf']['p50'],'p95':snapshot['raf']['p95'],'p99':snapshot['raf']['p99'],'drawCalls':snapshot['meanDrawCalls'],'triangles':snapshot['meanTriangles']})
  # A six-stage unteleported route, replayed unchanged for both builds.
  page.keyboard.press('r')
  measure('walking')
  step(600)
  assert state()['mode']=='foot',state()
  page.keyboard.press('e')
  assert state()['mode']=='ground',state()
  page.keyboard.press('r')
  step(850)
  measure('driving')
  for i in range(18):
   if state()['stage']>=2 and abs(state()['car']['speed'])<2:break
   step(200)
  assert state()['stage']>=2 and abs(state()['car']['speed'])<2,state()
  page.keyboard.press('e')
  assert state()['mode']=='foot',state()
  page.keyboard.press('e')
  assert state()['mode']=='flight',state()
  page.keyboard.down('w')
  page.keyboard.down(' ')
  step(100)
  page.keyboard.up(' ')
  page.keyboard.up('w')
  assert not state()['plane']['landed'],state()
  measure('takeoff')
  page.keyboard.press('l')
  step(200)
  measure('flight')
  # Record final approach separately while the same autopilot remains active.
  for i in range(45):
   a=state()['plane']
   if (abs(a['x']-316)**2+abs(a['z']-332)**2)**.5<105 and not a['landed']:break
   if a['landed']:break
   step(100)
  measure('landing')
  for i in range(45):
   if state()['plane']['landed']:break
   step(100)
  assert state()['plane']['landed'],state()
  assert abs(state()['plane']['x']-316)<5 and abs(state()['plane']['z']-332)<5,state()
  page.keyboard.press('e')
  assert state()['mode']=='foot',state()
  page.keyboard.press('r')
  for i in range(16):
   if state()['stage']==5:break
   step(200)
  assert state()['stage']==5 and state()['delivered'],state()
  measure('arrival')
  result=page.evaluate('window.__flightPerf.result()')
  result.update({'source':args.source.name,'sampleHoldMs':args.hold_ms,'simulation':'fixed 60Hz, no test teleport','realWebGL2':page.evaluate('!!document.querySelector("#scene").getContext("webgl2")'),'state':state(),'errors':errors})
  assert not errors,errors
  for phase in result['phases']:
   assert phase['frameCount']>=4,phase
  args.out.parent.mkdir(parents=True,exist_ok=True)
  args.out.write_text(json.dumps(result,indent=2,sort_keys=True),encoding='utf-8')
  print('PROFILE '+str(args.out)+' '+json.dumps(phases),flush=True)
  print('RENDERER',result['renderer'], 'UPLOADS',result['uploads'],flush=True)
  browser.close()

if __name__=='__main__': main()
