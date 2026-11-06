#!/usr/bin/env python3
"""Isolated browser gameplay test using the real JS logic and a tiny WAV transport stub.
This does not claim that the packaged Ogg files played in Chromium; codec QA is separate.
Runs around browser navigational policy that blocks file://, localhost and data: URLs.
"""
import re,json,base64,struct,wave,io
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
modules=['acoustic-world.js','adaptive-score.js','acoustic-simulation.js','acoustic-quests.js','game-bridge.js','acoustic-orchestrator.js','game-bridge-v3.js','playable-demo.js']
parts=['const __modules={};']
for module in modules:
    text=(ROOT/'src'/module).read_text()
    lines=[]
    for line in text.splitlines():
        match=re.fullmatch(r"import \{([^}]+)\} from '([^']+)';",line.strip())
        if match:
            pieces=match.group(1);path=match.group(2)
            lines.append(f'const {{{pieces}}}=__modules[{json.dumps(path)}];')
        else:lines.append(line)
    text='\n'.join(lines).replace('import.meta.url',"'https://local-test.invalid/src/acoustic-world.js'")
    symbols=re.findall(r'export (?:const|class|function)\s+(\w+)',text)
    text=re.sub(r'\bexport\s+(?=(?:const|class|function)\s+)', '',text)
    text+= '\nreturn {'+','.join(symbols)+'};'
    parts.append(f'__modules[{json.dumps("./"+module)}]=(function(){{\n{text}\n}})();')
    # Use identifiers as if import had resolved within one of the fake modules
compiled='\n'.join(parts)
manifest=json.loads((ROOT/'manifest.json').read_text())
# In-memory fake streaming WAV supplies AudioContext-compatible 400ms audio to all sample IDs.
with io.BytesIO() as b:
    with wave.open(b,'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(24000);w.writeframes(b'\x00\x00\x00\x00'*9600)
    wav=list(b.getvalue())
bootstrap='''
window.fetch=async function(url){
 if(String(url).includes('manifest.json'))return new Response(JSON.stringify(MANIFEST),{status:200,headers:{'Content-Type':'application/json'}});
 return new Response(new Uint8Array(WAV),{status:200,headers:{'Content-Type':'audio/wav'}});
};
'''.replace('MANIFEST',json.dumps(manifest)).replace('WAV',json.dumps(wav))
html=(ROOT/'playable.html').read_text().replace('<script type="module" src="./src/playable-demo.js"></script>','')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
    page=browser.new_page(viewport={'width':1280,'height':900})
    failures=[];page.on('pageerror',lambda e:failures.append(str(e)))
    page.set_content(html)
    page.evaluate(bootstrap+compiled)
    page.screenshot(path=str(ROOT/'QA_v3_Before.png'),full_page=True)
    page.click('#start');page.wait_for_timeout(700)
    status=page.locator('#audioStatus').inner_text()
    assert 'ON' in status,status
    page.click('#climate');page.wait_for_timeout(120)
    assert 'rain' in page.locator('#climate').inner_text()
    page.click('#scan');page.wait_for_timeout(120)
    page.keyboard.down('w');page.wait_for_timeout(1400);page.keyboard.up('w')
    page.click('#scan');page.wait_for_timeout(120);page.click('#resolve');page.wait_for_timeout(300)
    objective=page.locator('#objective').inner_text()
    assert 'gate yields' in objective.lower(),objective
    page.click('#restart');page.wait_for_timeout(200)
    assert 'different current' in page.locator('#objective').inner_text()
    page.screenshot(path=str(ROOT/'QA_v3_After_NGPlus.png'),full_page=True)
    assert not failures,failures
    report={'browser':'Chromium actual JavaScript + mocked 400ms WAV transport','headless':True,'start':status,'weather':'rain','gate_opened':True,'new_game_plus':True,'js_errors':failures,'audio_limit':'Not a real packaged-Opus playback test.'}
    (ROOT/'QA_BROWSER.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    browser.close()
