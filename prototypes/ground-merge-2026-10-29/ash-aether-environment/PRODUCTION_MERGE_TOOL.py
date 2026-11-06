#!/usr/bin/env python3
"""Fail-closed, additive Ash & Aether environment-source merger.

This tool deliberately DOES NOT edit existing game logic. It stages only isolated
ES modules after the caller identifies an authenticated, editable production
source directory. Integration hooks must be wired manually against that source.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import time

FILES = (
    'lib/ground/ground-materials.mjs',
    'lib/ground/ground-synthesis.mjs',
    'lib/ground/ground-dynamics.mjs',
    'lib/ground/ground-runtime.mjs',
    'lib/grass/grass-ecology.mjs',
    'lib/grass/grass-renderer.mjs',
    'lib/grass/grass-state.mjs',
    'lib/grass/living-landscape.mjs',
    'lib/grass/canvas-grass-fallback.mjs',
    'src/production-ground-adapter.mjs',
)
ROOT = Path(__file__).resolve().parent
EXCLUDE = {'.git', 'node_modules', 'dist', 'build', '.next', '__pycache__', '.aa-merge-snapshots'}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def inventory(root: Path):
    result = []
    for parent, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in EXCLUDE and not d.startswith('.aa-merge-'))
        for name in sorted(files):
            path = Path(parent) / name
            if not path.is_symlink() and path.suffix.lower() in {'.html', '.js', '.mjs', '.cjs', '.json', '.ts', '.tsx', '.css'}:
                st = path.stat()
                result.append([path.relative_to(root).as_posix(), st.st_size, digest(path.read_bytes())])
    return result


def validate_root(root: Path):
    if not root.is_dir() or root.is_symlink():
        raise ValueError('Production source must be a real directory')
    if root.resolve() == ROOT:
        raise ValueError('Refusing to merge into this laboratory itself')
    if not any((root / x).exists() for x in ('index.html', 'package.json', 'src', 'app')):
        raise ValueError('Not a recognized web-app source root; no changes made')
    if not any(root.glob('**/*.js')) and not any(root.glob('**/*.html')) and not any(root.glob('**/*.mjs')):
        raise ValueError('No game/runtime source found; no changes made')
    return inventory(root)


def plan(root: Path):
    before = validate_root(root)
    fingerprint = digest(json.dumps(before, separators=(',', ':')).encode())
    entries, collisions = [], []
    for rel in FILES:
        source = ROOT / rel
        if not source.is_file():
            raise FileNotFoundError(f'Incomplete patch, missing {rel}')
        dest = root / rel
        if any(parent.is_symlink() for parent in [dest, *[dest.parents[i] for i in range(len(Path(rel).parts)-1)]]):
            raise ValueError(f'Symlink in intended destination path: {rel}')
        content = source.read_bytes()
        current = dest.read_bytes() if dest.is_file() else None
        status = 'identical' if current == content else ('collision' if current is not None else 'add')
        record = {'path': rel, 'sha256': digest(content), 'bytes': len(content), 'status': status}
        entries.append(record)
        if status == 'collision':
            collisions.append(rel)
    return {'schema': 'aa-merge-plan-v1', 'target': str(root.resolve()), 'fingerprint': fingerprint,
            'modules': entries, 'collisions': collisions, 'safe_to_apply': not bool(collisions),
            'note': 'Modules only; no runtime host hooks automatically modified. This is NOT a deployment.'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('production_source', type=Path)
    p.add_argument('--apply', action='store_true', help='Add module files after dry-run verification')
    p.add_argument('--expect-fingerprint', help='Fingerprint printed by a prior dry run (mandatory with --apply)')
    p.add_argument('--report', type=Path, help='Optional JSON report output')
    a = p.parse_args()
    target = a.production_source.resolve()
    result = plan(target)
    if a.apply:
        if not a.expect_fingerprint or a.expect_fingerprint != result['fingerprint']:
            raise ValueError('Production source changed or no prior dry run; refusing to apply')
        if result['collisions']:
            raise ValueError('Existing file differs from patch: ' + ', '.join(result['collisions']))
        written = []
        try:
            for entry in result['modules']:
                if entry['status'] == 'identical':
                    continue
                dest = target / entry['path']
                dest.parent.mkdir(parents=True, exist_ok=True)
                # Detect a concurrent new file written by another session between plan and write.
                with dest.open('xb') as out:
                    out.write((ROOT / entry['path']).read_bytes())
                written.append(dest)
            result['applied'] = [p.relative_to(target).as_posix() for p in written]
            result['state'] = 'modules_added_not_wired'
        except Exception:
            for dest in reversed(written):
                dest.unlink(missing_ok=True)
            raise
    else:
        result['state'] = 'dry_run_no_changes'
    output = json.dumps(result, indent=2, sort_keys=True)
    if a.report:
        a.report.parent.mkdir(parents=True, exist_ok=True)
        a.report.write_text(output + '\n')
    print(output)
    if result['collisions']:
        return 2
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError) as exc:
        print(f'FAIL CLOSED: {exc}', file=sys.stderr)
        sys.exit(2)
