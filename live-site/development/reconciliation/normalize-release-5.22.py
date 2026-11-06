#!/usr/bin/env python3
"""Version the changed browser module graph, including every transitive caller."""
from pathlib import Path
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
VERSION = '5.22.0'

def git_paths(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).splitlines()

initial = set(git_paths('diff', '--name-only')) | set(git_paths('ls-files', '--others', '--exclude-standard'))
files = [p for p in (ROOT / 'dist').rglob('*') if p.suffix in {'.js', '.html'} and '/tests/' not in p.as_posix()]
changed = {ROOT / name for name in initial if (ROOT / name) in files}
refs = re.compile(r"(?P<quote>['\"])(?P<path>\.{1,2}/[^'\"\s?#]+\.(?:js|html))(?P<query>\?v=[^'\"\s#]+)?(?P=quote)")
rewritten = set()

while True:
    before = len(changed)
    for path in files:
        text = path.read_text()
        def replace(match):
            target = (path.parent / match['path']).resolve()
            if target not in changed:
                return match[0]
            return match['quote'] + match['path'] + '?v=' + VERSION + match['quote']
        updated = refs.sub(replace, text)
        if updated != text:
            path.write_text(updated)
            changed.add(path)
            rewritten.add(path)
    if len(changed) == before:
        break

stale = []
for path in files:
    for match in refs.finditer(path.read_text()):
        if (path.parent / match['path']).resolve() in changed and match['query'] != '?v=' + VERSION:
            stale.append(str(path.relative_to(ROOT)) + ': ' + match[0])
if stale:
    raise SystemExit('\n'.join(stale))
print(json.dumps({'release': VERSION, 'changed_browser_files': len(changed), 'rewritten_importers': len(rewritten), 'stale_references': len(stale)}))
