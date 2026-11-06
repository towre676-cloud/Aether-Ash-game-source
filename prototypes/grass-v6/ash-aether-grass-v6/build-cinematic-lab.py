#!/usr/bin/env python3
"""Create a self-contained perspective study from exactly the current A&A modules."""
from pathlib import Path
import re
root=Path(__file__).parent
files=['grass-ecology.mjs','grass-appearance.mjs','grass-state.mjs','grass-renderer.mjs','canvas-grass-fallback.mjs','ground-forge-compat.mjs','living-landscape.mjs','foliage-quality-governor.mjs','aa-game-integration.mjs']
chunks=['const __aaModules=Object.create(null);']
for name in files:
 s=(root/name).read_text()
 exports=re.findall(r'^export\s+(?:const|function)\s+(\w+)',s,re.M)
 def handle(m):
  if m[2] not in files:raise ValueError('Unresolved import '+m[2])
  return 'const {'+m[1]+'}=__aaModules['+repr(m[2])+'];'
 s=re.sub(r'^import\s+\{([^}]+)\}\s+from\s+[\'"]\./([^\'"]+)[\'"];?',handle,s,flags=re.M)
 if re.search(r'^import\b',s,re.M):raise ValueError('Unresolved '+name)
 s=re.sub(r'^export\s+(?=(?:const|function)\b)','',s,flags=re.M)
 chunks.append('__aaModules['+repr(name)+']=(()=>{\n'+s+'\nreturn {'+','.join(exports)+'};\n})();')
chunks.append('const {createAAGameVegetationBridge}=__aaModules["aa-game-integration.mjs"];')
s=(root/'cinematic-grass.template.html').read_text().replace('<!--AA_BUNDLE-->','\n'.join(chunks))
(root/'cinematic-grass-offline.html').write_text(s)
print('Created scenic lab',len(s),'bytes.')
