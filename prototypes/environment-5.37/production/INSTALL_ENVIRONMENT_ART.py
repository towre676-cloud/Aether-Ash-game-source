#!/usr/bin/env python3
"""Safe additive staging for the A&A 5.37 3D environment kit.

Never overwrites user game source or deploys a site. Writes only new namespaced
ES modules after the operator supplies and fingerprints the current source tree.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parent
MODULES=ROOT/'modules'
FILES=tuple(sorted(p.relative_to(MODULES).as_posix() for p in MODULES.rglob('*.mjs')))
EXCLUDE={'.git','node_modules','dist','build','.next','__pycache__','.aa-merge-snapshots'}

def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()

def inventory(root:Path):
    records=[]
    for base,dirs,names in os.walk(root):
        dirs[:]=sorted(n for n in dirs if n not in EXCLUDE and not n.startswith('.aa-merge-'))
        for name in sorted(names):
            f=Path(base)/name
            if f.is_symlink():continue
            if f.suffix.lower() not in {'.html','.js','.mjs','.cjs','.json','.ts','.tsx','.css'}:continue
            records.append([f.relative_to(root).as_posix(),f.stat().st_size,sha(f.read_bytes())])
    return sorted(records)

def run(target:Path,apply=False,expect=None):
    if not target.is_dir() or target.is_symlink() or not any((target/x).exists() for x in ('index.html','package.json','src','app')):
        raise ValueError('Must point to an existing editable web game source root')
    if not (target/'index.html').is_file() and not (target/'package.json').is_file():
        raise ValueError('Expected a real web application checkout, not a bare assets folder')
    before=inventory(target);fingerprint=sha(json.dumps(before,separators=(',',':')).encode())
    collisions,entries=[],[]
    for rel in FILES:
        source=MODULES/rel;dest=target/rel
        for ancestor in [dest,*dest.parents]:
            if ancestor==target.parent:break
            if ancestor.is_symlink():raise ValueError(f'Symlink destination rejected: {rel}')
        old=dest.read_bytes() if dest.is_file() else None
        new=source.read_bytes()
        state='identical' if old==new else 'collision' if old is not None else 'add'
        if state=='collision':collisions.append(rel)
        entries.append({'path':rel,'state':state,'bytes':len(new),'sha256':sha(new)})
    result={'schema':'aa-art-merge-537','target':str(target.resolve()),'source_fingerprint':fingerprint,
            'state':'dry_run','collisions':collisions,'modules':entries,'safe_to_apply':not bool(collisions),
            'note':'Only new module files; the gameplay host still needs explicit wiring. Not published.'}
    if apply:
        if not expect or expect!=fingerprint:raise ValueError('Stale or missing --expect-fingerprint: source must be re-planned')
        if collisions:raise ValueError('Conflicting module names: '+', '.join(collisions))
        written=[]
        try:
            for e in entries:
                if e['state']=='identical':continue
                dest=target/e['path'];dest.parent.mkdir(parents=True,exist_ok=True)
                # Race-safe O_EXCL; concurrent authors cannot be overwritten.
                with dest.open('xb') as f:f.write((MODULES/e['path']).read_bytes())
                written.append(dest)
            result['state']='modules_added_not_wired';result['written']=[x.relative_to(target).as_posix() for x in written]
        except Exception:
            for f in reversed(written):f.unlink(missing_ok=True)
            raise
    return result

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('site_source',type=Path)
    ap.add_argument('--apply',action='store_true')
    ap.add_argument('--expect-fingerprint')
    ap.add_argument('--output',type=Path)
    args=ap.parse_args()
    report=run(args.site_source.resolve(),apply=args.apply,expect=args.expect_fingerprint)
    output=json.dumps(report,indent=2,sort_keys=True)+'\n'
    if args.output:args.output.write_text(output)
    print(output,end='')
    return 0 if not report['collisions'] else 2

if __name__=='__main__':
    try:sys.exit(main())
    except (OSError,ValueError) as err:
        print(f'FAIL-CLOSED: {err}',file=sys.stderr);sys.exit(2)
