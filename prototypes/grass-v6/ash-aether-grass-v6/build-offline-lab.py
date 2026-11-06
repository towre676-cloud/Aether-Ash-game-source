#!/usr/bin/env python3
"""Bundle existing local ES modules into a genuinely offline, one-file QA lab.
This is a tiny deliberately fixed-graph bundler, not a general JavaScript parser.
"""
from pathlib import Path
import re
base=Path(__file__).parent
files=['grass-ecology.mjs','grass-appearance.mjs','grass-state.mjs','grass-renderer.mjs','canvas-grass-fallback.mjs',
       'ground-forge-compat.mjs','living-landscape.mjs','foliage-quality-governor.mjs','aa-game-integration.mjs']
lines=['const __aaModules=Object.create(null);']
for filename in files:
    source=(base/filename).read_text()
    exports=re.findall(r'^export\s+(?:const|function)\s+(\w+)',source,re.M)
    if not exports: raise ValueError('No exports: '+filename)
    def import_repl(match):
        names,path=match.group(1),match.group(2)
        if path not in files: raise ValueError('Missing local module '+path)
        return 'const {'+names+'}=__aaModules['+repr(path)+'];'
    source=re.sub(r'^import\s+\{([^}]+)\}\s+from\s+[\'"]\./([^\'"]+)[\'"];?',import_repl,source,flags=re.M)
    if re.search(r'^import\b',source,re.M): raise ValueError('Unresolved imports in '+filename)
    source=re.sub(r'^export\s+(?=(const|function)\b)','',source,flags=re.M)
    lines.append('__aaModules['+repr(filename)+']=(()=>{\n'+source+'\nreturn {'+','.join(exports)+'};\n})();')
lines.append('const {createAAGameVegetationBridge}=__aaModules["aa-game-integration.mjs"];')
bundle='\n'.join(lines)
html=(base/'reconciliation-lab.template.html').read_text()
if '<!--AA_BUNDLE-->' not in html: raise ValueError('Bundle marker missing')
html=html.replace('<!--AA_BUNDLE-->',bundle)
(base/'reconciliation-lab-offline.html').write_text(html)
print(f'Wrote reconciliation-lab-offline.html ({len(html):,} bytes; exact bridge modules embedded).')
