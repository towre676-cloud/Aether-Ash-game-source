#!/usr/bin/env python3
"""Seal 5.25 only after the complete gate and browser review are recorded.

Usage from any directory:
  python3 development/reconciliation/seal-release-5.25.py \
    --browser-evidence docs/verification/<actual-browser-receipt>

This writes the delivery fingerprint only. It does not change runtime files,
rewrite review prose, commit source, save a Site version, or publish anything.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[2]
GATE = ROOT / 'docs/verification/release-5.25-tests.json'
FREEZE = ROOT / 'development/reconciliation/runtime-freeze-5.25.json'
OUTPUT = ROOT / 'development/reconciliation/frozen-delivery-5.25.json'
LIMIT = 268435456


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def local_file(value):
    path = (ROOT / value).resolve()
    require(path.is_relative_to(ROOT) and path.is_file() and path.stat().st_size > 0,
            'Expected a nonempty repository evidence file: ' + value)
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser-evidence', nargs='+', required=True,
                        help='Actual completed browser receipt and/or proof files, relative to the repository.')
    parser.add_argument('--report', default='development/reconciliation/reconciliation-5.25.md')
    args = parser.parse_args()
    report_path = local_file(args.report)
    prose = report_path.read_text()
    require(not re.search(r'\*\*(?:Automated release gate|Browser verification): PENDING', prose),
            'Complete the actual gate and browser status in the reconciliation report before sealing.')
    gate = json.loads(GATE.read_text())
    require(gate.get('passed') is True and not gate.get('revision_changed'), 'The complete gate did not pass unchanged.')
    for field in ['failures', 'missing_count_summaries', 'inconsistent_count_summaries']:
        require(field in gate and not gate[field], 'Unresolved gate field: ' + field)
    counts = gate['totals']
    require(counts['tests'] > 0 and counts['tests'] == counts['pass'], 'Not every discovered case passed.')
    require(all(counts[k] == 0 for k in ['fail', 'skipped', 'cancelled', 'todo']), 'The gate has nonpassing cases.')
    require(bool(gate.get('finished_at_utc')), 'The complete gate has not finished.')
    frozen = json.loads(FREEZE.read_text())
    require(frozen['revision'] == gate['revision'], 'The gate and runtime-freeze revision differ.')

    digest = hashlib.sha256()
    entries = []
    for path in sorted(p for p in (ROOT / 'dist').rglob('*') if p.is_file()):
        relative = path.relative_to(ROOT).as_posix()
        data = path.read_bytes()
        sha = hashlib.sha256(data).hexdigest()
        entries.append({'path': relative, 'bytes': len(data), 'sha256': sha})
        digest.update((relative + '\0' + sha + '\n').encode())
    tree_sha = digest.hexdigest()
    size = sum(item['bytes'] for item in entries)
    require(tree_sha == frozen['tree_sha256'] and len(entries) == frozen['files']
            and size == frozen['expanded_bytes'], 'Runtime bytes changed after the post-gate freeze capture; reconcile and reverify before sealing.')
    require(size < LIMIT, 'Expanded static assets exceed the hosting limit.')
    evidence = []
    for value in args.browser_evidence:
        path = local_file(value)
        data = path.read_bytes()
        evidence.append({'path': path.relative_to(ROOT).as_posix(), 'bytes': len(data),
                         'sha256': hashlib.sha256(data).hexdigest()})
    fingerprint = {
        'schema': 'aa-delivery-fingerprint/1', 'game_version': '5.25.0',
        'date': datetime.now(timezone.utc).date().isoformat(),
        'sealed_at_utc': datetime.now(timezone.utc).isoformat(),
        'files': len(entries), 'expanded_bytes': size, 'limit_bytes': LIMIT,
        'headroom_bytes': LIMIT - size, 'tree_sha256': tree_sha,
        'verification': {
            'full_gate': GATE.relative_to(ROOT).as_posix(), 'modules': gate['files'],
            'full_gate_cases': counts['tests'], 'finished_at_utc': gate['finished_at_utc'],
            'source_revision': gate['revision'],
            'runtime_freeze': FREEZE.relative_to(ROOT).as_posix(),
            'final_tree_matches_runtime_freeze': True,
            'freeze_scope': frozen['capture_context'],
            'browser_evidence': evidence,
            'reconciliation_report': report_path.relative_to(ROOT).as_posix(),
        },
        'publication': 'Not performed or asserted by this seal; use the subsequent Sites saved-version/deployment receipt.',
        'entries': entries,
    }
    with OUTPUT.open('x') as stream:
        stream.write(json.dumps(fingerprint, indent=2) + '\n')
    print(json.dumps({k: v for k, v in fingerprint.items() if k != 'entries'}, indent=2))


if __name__ == '__main__':
    main()
