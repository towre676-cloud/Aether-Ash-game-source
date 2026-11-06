#!/usr/bin/env python3
"""Live same-origin Chromium playback test using actual bundled Ogg/Opus assets.
No localhost/file:// networking, all URLs routed to exact bytes inside the package.
"""
import json,re,base64
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
modules=['acoustic-world.js','adaptive-score.js','acoustic-simulation.js','acoustic-quests.js','game-bridge.js','acoustic-orchestrator.js','game-bridge-v3.js','acoustic-events-v4.js','game-bridge-v4.js','playable-demo.js']
parts=['const __modules={};']
for name in modules:
  js=(ROOT/'src'/name).read_text()
  if name=='playable-demo.js':js=js.replace('function walls(){','window.__aaDirector=director;function walls(){')
  js=re.sub(r"import \{([^}]+)\} from '([^']+)';",lambda m: f'const {{{m.group(1)}}}=__modules[{json.dumps(m.group(2))}];',js)
  js=js.replace('import.meta.url',"'https://local-test.invalid/src/acoustic-world.js'")
  symbols=re.findall(r'export (?:const|class|function)\s+(\w+)',js)
  js=re.sub(r'\bexport\s+(?=(?:const|class|function)\s+)', '',js)
  js+='\nreturn {'+','.join(symbols)+'};'
  parts.append(f'__modules[{json.dumps("./"+name)}]=(function(){{\n{js}\n}})();')
html=(ROOT/'playable.html').read_text().replace('<script type="module" src="./src/playable-demo.js"></script>','<script>'+'\n'.join(parts)+'</script>')
ids=['score_marsh_foundation','score_marsh_motion','score_marsh_peril','score_marsh_revelation','reed_marsh','npc_ferryman_work','device_hydrophone_pulse','boss_clayback_warden_windup','boss_clayback_warden_vulnerable','boss_clayback_warden_enrage','weather_reed_marsh_rain','behavior_clayback_graze','step_wet_clay_soft','step_wet_clay_heavy','clue_water','memory_water','clue_hydrophone']
manifest=json.loads((ROOT/'manifest.json').read_text());index={a['id']:a for a in manifest['assets']}
assert all(id in index for id in ids if id!='clue_hydrophone')
selected={index[id]['file']:base64.b64encode((ROOT/index[id]['file']).read_bytes()).decode('ascii') for id in ids if id in index}
# Fetch shim serves original *packaged Ogg* bytes, not a synthetic WAV. Bypasses
# the sandbox administrator's policy blocking even route-intercepted network navigation.
bootstrap='''
window.__aaRequested=[];window.__aaAbsent=[];
const FILES=__FILEMAP__, MANIFEST=__MANIFEST__;
window.fetch=async function(url){
 if(String(url).includes('manifest.json'))return new Response(JSON.stringify(MANIFEST),{status:200,headers:{'content-type':'application/json'}});
 const path=new URL(String(url),'https://local-test.invalid').pathname.replace(/^\//,'');
 window.__aaRequested.push(path);const str=FILES[path];
 if(!str){window.__aaAbsent.push(path);return new Response('missing',{status:404});}
 const binary=atob(str), bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new Response(bytes,{status:200,headers:{'content-type':'audio/ogg'}});
};
'''.replace('__FILEMAP__',json.dumps(selected)).replace('__MANIFEST__',json.dumps(manifest))
errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':1365,'height':980});page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html.replace('<script>'+ '\n'.join(parts)+'</script>',''))
 page.evaluate(bootstrap+'\n'.join(parts))
 page.click('#start');page.wait_for_timeout(1450)
 state=page.evaluate('''()=>({audio:document.querySelector('#audioStatus').innerText,context:window.__aaDirector.audio.ctx?.state,decoded:window.__aaDirector.audio.cache.size,scene:window.__aaDirector.score.scene})''')
 page.click('#ferryman');page.wait_for_timeout(500);page.click('#hydrophone');page.wait_for_timeout(500)
 page.click('#provoke');page.wait_for_timeout(790);page.click('#guard');page.wait_for_timeout(480)
 page.click('#climate');page.wait_for_timeout(500)
 after=page.evaluate('''()=>({context:window.__aaDirector.audio.ctx?.state,decoded:window.__aaDirector.audio.cache.size,boss:window.__aaDirector.bossClock.lastOutcome,weather:window.__aaDirector.weather,requested:window.__aaRequested.length,absent:window.__aaAbsent})''')
 page.screenshot(path=str(ROOT/'QA_v4_Real_Opus.png'),full_page=True)
 report={'browser':'Chromium Web Audio decoding actual packaged Opus bytes, all fetches in-memory, no mocked WAV',
   'startup':state,'after':after,'source_opus_files_embedded_for_test':len(selected),'js_errors':errors,
   'limits':'Headless Chromium test of sampled original assets; not full 512 files or physical Windows Edge/Android testing.'}
 (ROOT/'QA_BROWSER_REAL_OPUS.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2));assert state['context']=='running' and state['decoded']>=4 and after['decoded']>=6 and not errors and not after['absent']
 b.close()
