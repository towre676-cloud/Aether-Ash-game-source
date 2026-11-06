#!/usr/bin/env python3
"""Record the tested delivery tree immediately before Sites source packaging."""
from pathlib import Path
import hashlib
import json
import sys

report_path = Path(sys.argv[1])
report = json.loads(report_path.read_text())
if not report['passed'] or report['totals']['fail'] or report['totals']['skipped']:
    raise SystemExit('The final release regression has not passed cleanly.')
digest = hashlib.sha256()
entries = []
for file in sorted(p for p in Path('dist').rglob('*') if p.is_file()):
    sha = hashlib.sha256(file.read_bytes()).hexdigest()
    entries.append({'path': str(file), 'bytes': file.stat().st_size, 'sha256': sha})
    digest.update((str(file) + '\0' + sha + '\n').encode())
size = sum(row['bytes'] for row in entries)
limit = 268435456
if size >= limit:
    raise SystemExit('Expanded deployment assets exceed the hosting limit.')
fingerprint = {
    'schema': 'aa-delivery-fingerprint/1', 'game_version': '5.21.0',
    'date': '2026-10-29', 'files': len(entries), 'expanded_bytes': size,
    'limit_bytes': limit, 'tree_sha256': digest.hexdigest(), 'entries': entries,
}
Path('development/reconciliation/frozen-delivery-5.21.json').write_text(json.dumps(fingerprint, indent=2) + '\n')
text = f'''# Release verification — A&A 5.21.0

## Final automated gate

The frozen release passed **{report['totals']['tests']:,} actual test cases across
{report['files']} modules**, with zero failures, skips, cancellations or pending
cases. Each module ran in a separate Node process and its actual Node summary
was counted. The runner did not substitute file-level counts for test cases.

- Invocation: `node development/verification/run-release-tests.mjs --prefix docs/verification/release-5.21-publish`
- Machine-readable receipt: `{report_path.name}`
- Full output: `{Path(report['combined_log']).name}`
- Duration: {report['elapsed_seconds']:.3f} seconds.
- Finished: {report['finished_at_utc']}.
- Existing source baseline: `68e6673a8bc7d72ea44e3ae2edef436054e550cf`.

The test runner records the existing Git HEAD while the additive source changes
are still uncommitted. The Sites workflow commits and pushes that exact tested
tree and these receipts before packaging. The deployment fingerprint below
identifies the actual tested bytes independently of that pre-commit HEAD. The
native Site version is the authoritative mapping to the final pushed commit.

## Integrated regression coverage

The full gate includes the pre-existing story, origin, guide, encounter,
combat, save, media and environment suites, the 69 recovered Armory cases,
17 campaign Armory cases, 16 Atlas cases, 12 Ground cases, seven Acoustic cases,
nine travel cases and three cross-system campaign cases.

Cross-system tests use the real `World`, with all installers in their production
order. They cover exact equipment/ground/Atlas/relay round trips, corrupt-import
atomicity, an old save with no unearned prototype kit, origin convergence in
the same lineage, and clean physical state in a new telling. The guide test
retains a selected destination through an exploration pause and resumes the
story after arrival. Reward tests reject replayed caches/victories and repeated
Bellrun circuit pay.

The final vegetation optimization retains immediate accepted-effect redraws
while refreshing wind at most about eight times per second and reusing chunk
canvases. Its regression simulates 60 frames: eight bakes, one canvas allocation,
unchanged numerical fields, and an immediate dirty-event redraw.

## Browser observations

The exact local release was opened in the managed Sites preview and exercised
through the ordinary rendered UI, using an isolated Developer portal session.

| Observed action | Result |
| --- | --- |
| Ordinary game entry and Developer portal | Seven traveller entry choices and all 24 chapter choices load; combined-content launch prepares the intended temporary kit |
| Open Gear and equip Moonwater Pillar | Main-hand slot fills; campaign stat delta reads Magic +3 / MP +1; after closing, Sable reads 47/48 MP |
| Forge one rare artifact | Campaign credits 650 → 430, scrap 35 → 17, essence 10 → 6; one new artifact appears |
| Sound Hydrophone and answer in counterphase | Sable MP 47 → 45 → 43; local displayed resonance 0% → 19% → 0%; nearby-life caption identifies the actual stable east of the party |
| Ride Mossback | The real leader renders on Mossback; mounted field status appears and traversal reaches the clicked trail point |
| Start Bellrun | Mount dismounts, four-gate circuit starts, route arrow/return ring and live timer appear; menu pause and subsequent resume preserve the run |
| Switch graphics mode | Standard and Compatibility both render the integrated terrain and vegetation; run, location, MP and resonance survive |
| Launch Sentinel guardian test and attack | Existing encounter flow opens the canonical fight; gear is locked during combat; a normal attack lowers Sentinel 418 → 378 HP |
| Audio settings | Optional cue, caption, volume and adaptive-texture controls are present under Sound, display & controls |

The final Armory screenshot under `browser/` shows the equipped item within the
real campaign frame. Preview live reloads during implementation interrupted
earlier practice runs; final verification was performed after runtime freeze.
No ordinary user journey was imported or overwritten by the playtest fixture.

Browser checks confirm the actions above, not a continuous controller-earned
playthrough of every chapter. The scripted suite covers the full campaign
transition and guardian models. No physical-phone, Edge or GPU certification
is claimed. The browser's rolling draw-cost diagnostic included older samples
across mode changes; it is not an FPS guarantee.

## Delivery identity and size

- Expanded published assets: **{size:,} bytes** ({size / 1048576:.2f} MiB).
- Hosting gate: {limit:,} bytes (256 MiB).
- Headroom: {limit-size:,} bytes.
- Files in `dist`: {len(entries)}.
- Deterministic file/path SHA-256 aggregate: `{digest.hexdigest()}`.
- Per-file hashes: `development/reconciliation/frozen-delivery-5.21.json`.

The four v16 delivery conversions preserve every decoded RGBA byte. All 512
Acoustic World files match the recovered manifest hashes. Original large art
and unused unclean animation drafts remain in source development directories.

## Publication destination

Existing project: `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`.
Existing URL: https://ash-aether-clay-water.towre676.chatgpt.site

The current source head was refreshed before publishing and still matched the
version-22 baseline. The owner-private audience was confirmed and is preserved.
The Sites workflow performs a normal fast-forward push, packages the tested
assets from that pushed commit, and publishes through the private version
operation. Final version number, commit and terminal deployment status are
returned by Sites; an attempted upload alone is not considered completion.

See `docs/SESSION_RECONCILIATION_5.21.md` for recovered package provenance,
playable entry points, the rebuilt Bellrun scope and remaining source limits.
'''
Path('docs/verification/release-5.21.md').write_text(text)
print(json.dumps({k: v for k, v in fingerprint.items() if k != 'entries'}))
