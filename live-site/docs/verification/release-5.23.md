# Release verification — A&A 5.23.0

## Outcome

The campaign now uses finite contextual music programs, remembered rotation,
quiet intervals and a measured mix. This corrects the old routing that replaced
authored scene selections with a small RPG pool, including the 25.17-second
Explore loop, and intercepted the longer Dyletsky and chapter-action recordings.
The environment corrections from 5.22 and the merged campaign systems remain.

No audio assets were added, rewritten or recomposed. The inventory contains 101
delivered music recordings inside `game/music`, plus two existing complete
symphonies outside that directory. The catalog and RPG manifest expose 109
descriptors backed by 103 distinct recordings; movement aliases share recording
identity. The full measured inventory and provenance are in
[music-audit-5.23.md](../../development/reconciliation/music-audit-5.23.md).

## Implemented behavior

- Every canonical scene has a contextual field pool with at least four distinct
  recordings and three melodic families. Homes, study rooms, workshops, rivers,
  highland paths and other places have different programs. Seven origins have
  distinct opening choices; all fourteen origin-scene opening pairs differ.
- A piece finishes once. Spacious mode leaves 18–38 seconds in ordinary daytime
  fields, 25–50 in quiet rooms, or 35–65 at night before the next selection.
  Program context is refreshed on music requests and scene entry.
- The last sixteen heard recordings persist across reloads. Selection avoids
  the last recording, recent recordings and the previous melodic family when
  alternatives exist. Movement aliases cannot defeat that exclusion.
- Compatible rooms retain a playing piece. Different field contexts give a
  phrase at least 24 seconds before replacing it; combat receives priority.
  Download time is excluded from listening time.
- Normal battle and guardian programs use the corresponding four action cues
  in chapter order, with appropriate additional combat recordings. Victory,
  defeat and retreat return to field selection; finite authored story and
  victory performances keep their own identities.
- Pause and full-screen interruptions retain playback offsets and freeze rests.
  Cinematic and Observatory close no longer restart the main recording. Late
  downloads and stale failures cannot overwrite newer requests or heard history.
- Both media and decoded playback support finite segment ends, measured gain,
  transitions and cancellation. Media and decoded sources crossfade after a
  replacement starts. Failed recordings are tried once, with a bounded manual
  retry; exhausting a pool stops remaining score playback cleanly.
- Per-recording playback gain attenuates toward −22 LUFS and never amplifies a
  quiet recording. Fresh master volume is 42%; existing explicit preferences,
  including zero, survive. Optional instrument coloration starts off for fresh
  preferences. Voices and dialogue duck the score. Score stings and cinematic
  cues also receive the measured gain.
- Pause → Sound, display & controls contains Spacious, Continuous and Ambience
  only, plus Next piece and the actual title/status. A skip during Pause waits
  until resume. Ambience only gates the score and optional music textures while
  preserving environmental sound, voices, Hydrophone/network signals and
  Observatory calibration tones.

## Automated gate

The final runtime passed **1,293 actual cases across
170 modules**, with zero failures, skips, cancellations or pending
cases. Modules ran in separate Node processes; the report counts their actual
test summaries. No runtime changes followed the start of this final gate.

- Invocation: `node development/verification/run-release-tests.mjs --prefix docs/verification/release-5.23-final`
- Machine receipt: [release-5.23-final-tests.json](release-5.23-final-tests.json).
- Full output: [release-5.23-final-tests.log](release-5.23-final-tests.log).
- Elapsed: 225.776 seconds.
- Finished: 2026-10-29T17:47:12.498Z.
- Source baseline: `6a2237f21e64926bf1b1a44228cc7470bf395918` (Site version 24).
- Browser module graph: 13 changed browser files, four rewritten importers and
  no stale references to changed code after normalization to 5.23.0.

New coverage includes 20 director cases, 11 transport cases, six preference/UI
cases, five program/inventory cases and the optional-score texture gate. Program
checks cover all 167 prepared scenes at day/night and early/late chapters, all
109 descriptor paths, all 103 recording hashes, origin diversity, real biome
classification, explicit performances, story cues, silence and combat pools.
Transport/director coverage includes late cancellation, failures, finite media
and buffer ends, cross-transport fades, aliases, pause offsets, frozen rests,
pending skips, rapid context changes and old-source ends during replacement
loading. Existing campaign, origin, save, combat and integrated-system checks
ran in the same gate.

## Browser verification

The managed preview served the exact frozen runtime. Tests used the Developer
portal's temporary practice fixtures and did not overwrite ordinary journeys.

| Action | Observed result |
| --- | --- |
| Start combined-content practice in Cinderfall | Spacious mode; The Kettle and the Reed (`dyletsky_home`) starts, and the music analyser reports a nonzero signal |
| Pause and select Next piece | Status remains paused, no current track, and the score signal becomes zero |
| Return to game | An Unexpected Friend starts instead of repeating the previous recording |
| Let that performance finish naturally | Status changes to a quiet interval, with 30 seconds remaining when observed |
| Pause that interval | 26 seconds remains before and after other checks; the score signal is zero |
| Select Continuous and return | Millennial Morning starts immediately without another quiet interval |
| Select Ambience only and return | Score phase is quiet, no score track and zero score signal; environmental ambience remains active |
| Restore Spacious; approach chapter 13 guardian | Combat selects `action_boss_2` with Guardian encounter context |
| Retreat and close the retreat dialogue | Combat music gives way to Hometown Before Dawn with Archives and quiet study context; field playback has a nonzero signal |

Screenshots in `browser/`: `aa-music-controls-5.23.png`,
`aa-music-rest-5.23.png`, and `aa-music-handoff-5.23.png`.
These are direct browser captures. They establish the UI and observed playback
lifecycle, not a subjective headphone listening review. The mix uses measured
complete-file LUFS; it does not promise identical loudness during every passage.
Representative browser checks are not a manual playthrough of all chapters.

## Delivery identity

- Expanded static assets: **261,957,426 bytes** (249.82 MiB).
- Hosting limit: 268,435,456 bytes; headroom: 6,478,030 bytes.
- Files in `dist`: 2113.
- Deterministic path/file SHA-256 aggregate: `d80d7050cbb1cd2243bcc9515307124b7ab235f9554d612c9853d00586046a00`.
- Per-file hashes: `development/reconciliation/frozen-delivery-5.23.json`.

The Sites source helper owns commit/push and packaging. Native saved-version
provenance maps that pushed commit to the published archive. This report seals
the verified bytes before the source commit. The existing owner-private audience
is preserved.

Project: `appgprj_6adf63724e5c8191bd55637b8ecd8d9a`.
Destination: https://ash-aether-clay-water.towre676.chatgpt.site/
