#!/usr/bin/env python3
"""Fail-closed, additive staging of the v8 resident/encounter HOST ADAPTER.

Does not modify the existing game's engine, save, UI, script entrypoint, rendering
or publishing configuration. All integration must be performed against the
actual editable Site source and validated using the actual game test suite.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
from PRODUCTION_MERGE_TOOL import validate_root, digest, inventory

BASE=Path(__file__).resolve().parent
REL='src/addons/aa-resident-bridge-v8.mjs'
SOURCE=BASE/'RESIDENT_BRIDGE_V8.mjs'
def plan(root):
    root=root.resolve()
    original=validate_root(root)
    fingerprint=digest(json.dumps(original,separators=(',',':')).encode())
    source=SOURCE.read_bytes()
    dest=root/REL
    if any(p.is_symlink() for p in [root,root/'src',root/'src'/'addons',dest]):
        raise ValueError('Symlink destination prohibited')
    if dest.exists() and not dest.is_file():raise ValueError('Target is not a regular file')
    current=dest.read_bytes() if dest.exists() else None
    status='add' if current is None else ('identical' if current==source else 'collision')
    return dict(schema='aa-resident-v8-stager-v1',target=str(root),fingerprint=fingerprint,relativePath=REL,
                moduleSha256=digest(source),status=status,safeToStage=status!='collision',
                note='Staging module only; not wired, not deployed')
def stage(root,previous):
    actual=plan(root)
    if actual['fingerprint']!=previous:raise ValueError('Stale fingerprint; source changed between plan and stage')
    if actual['status']=='collision':raise ValueError('Different version already exists; refusing overwrite')
    if actual['status']=='add':
        dest=root/REL;dest.parent.mkdir(parents=True,exist_ok=True)
        with dest.open('xb') as f:f.write(SOURCE.read_bytes())
        actual['state']='module_added_not_wired'
    else:actual['state']='module_identical_not_wired'
    return actual
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('site_source',type=Path)
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--expect-fingerprint')
    parser.add_argument('--report',type=Path)
    args=parser.parse_args()
    try:
        result=stage(args.site_source,args.expect_fingerprint) if args.apply else plan(args.site_source)
        if not args.apply:result['state']='dry_run_no_changes'
        output=json.dumps(result,indent=2,sort_keys=True)
        if args.report:args.report.write_text(output+'\n')
        print(output)
        if result['status']=='collision':sys.exit(2)
    except (OSError,ValueError) as error:print('FAIL CLOSED:',error,file=sys.stderr);sys.exit(2)
