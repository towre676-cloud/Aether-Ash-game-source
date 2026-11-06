#!/usr/bin/env python3
"""Generate the self-contained offline browser demo from the readable source modules."""
from pathlib import Path
import base64
ROOT=Path(__file__).resolve().parent
html=(ROOT/'index.html').read_text()
css=(ROOT/'src/armory.css').read_text()
modules=[]
for name in ('catalog.mjs','armory.mjs','ui.mjs'):
    s=(ROOT/'src'/name).read_text()
    # This package deliberately has no third-party JS imports or exports.
    s='\n'.join(line for line in s.splitlines() if not line.startswith('import '))
    for before,after in [('export const ','const '),('export function ','function '),('export class ','class ')]:s=s.replace(before,after)
    modules.append(s)
assets=ROOT/'assets'/'items'
rendered_art=['sword','spear','axe','bow','shield','crown','helm','hood','armor','robe','mantle','legs','boots','ring','relic','scepter','sigil']
artmap=','.join(f'{p.stem!r}:"data:image/webp;base64,{base64.b64encode(p.read_bytes()).decode()}"' for p in (assets/f'{k}.webp' for k in rendered_art))
art=f'const artImages={{{artmap}}}; function itemArt(icon){{return artImages[icon]||null}};'
js=art+'\n\n'+'\n\n'.join(modules)
html=html.replace('<link rel="stylesheet" href="src/armory.css">',f'<style>\n{css}\n</style>')
html=html.replace('<script type="module" src="src/ui.mjs"></script>',f'<script type="module">\n{js}\n</script>')
assert '<script type="module">' in html
out=ROOT/'armory-playable.html';out.write_text(html)
print(f'Wrote {out}: {out.stat().st_size:,} bytes')
