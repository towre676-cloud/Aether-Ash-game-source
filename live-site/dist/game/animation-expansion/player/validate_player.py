from pathlib import Path
import hashlib,json,subprocess
p=Path(__file__).resolve().parent
manifest=json.loads((p/'../story/story_manifest.json').read_text())
assert len(manifest['chapters'])==24
assert set(range(1,25)).issubset({r['chapter'] for r in manifest['text_records']})
source=json.loads((p/'assets/copied-assets.json').read_text())
checked=0
for a in source['files']:
 f=p/a['file']
 assert hashlib.sha256(f.read_bytes()).hexdigest()==a['sha256'],a['file']
 checked+=1
assert checked==8,checked
assert len(list((p/'../companion-art/portraits').glob('*.webp')))==18
assert len(list((p/'../companion-art/backgrounds').glob('*.webp')))==6
html=(p/'index.html').read_text();js=(p/'player.js').read_text()
for control in ['chapter','beat','view','action','play','restart','previous','next','scrub','loop','export','transcript']:
 assert f'id="{control}"' in html,control
assert 'textContent=r.text_verbatim' in js
assert "state.chapter:2" not in js
for asset in ['crew-actions-v1.png','monster-actions-v1.png','scenery-chapters-2-5.png']:
 assert asset in js
subprocess.run(['node','--check',str(p/'player.js')],check=True)
print(json.dumps({'result':'PASS','chapters':24,'source_records_available':len(manifest['text_records']),'unchanged_concept_assets':checked,'copied_portraits':6,'copied_backgrounds':2,'controls':12}))
