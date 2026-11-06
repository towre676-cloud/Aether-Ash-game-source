# Release 5.9 — voices and living places

## Scope

- 23 new exact-text origin recordings using established cast identities; 422 packaged lines total. Eight turns with unregistered speaker labels and two previously blocked legacy turns remain subtitle-only.
- Four generated 12-second ambient beds: Commons, workshop, enclosed water and orchard/garden. Sparse scene mapping avoids unsuitable sounds in unrelated rooms or origins. Separate persisted ambient volume defaults to 0.24; dialogue ducks to 30% of that level.
- Two 10-second 720p/24fps animations of existing canonical Wayglass and Cinderfall artwork. Earned memory triggers, captions, durations and rewards remain unchanged. The film room offers scored versions of those same assets; in-play video remains muted beneath the original score.
- Compatibility and reduced-motion settings retain artwork, skip optional video decoding and avoid cinematic blur/hue filters. Failed video creation, playback, decoding, drawing or backdrop export does not block a scene.
- Existing save schemas and localStorage save key are unchanged. Optional audio uses HTMLAudio independently of musical tuning and does not block startup or gameplay.

## Validation

`node --test dist/game/engine2/tests/*.test.mjs`: 649 passed, 0 failed. The full output is `release-5.9-tests.log`.

The suite checks exact origin text/cast/provenance, all 422 voice asset hashes, media mapping, deferred video creation, still fallback, resource disposal, compatibility/reduced-motion behavior, audio gating, failed playback suppression, timeouts and cancellation. A browser-discovered race where a fade worker paused an incoming deck during its unresolved play request is reproduced by a new delayed-media regression test and fixed by protecting the pending deck.

All 29 new media assets fully decoded with FFmpeg. New delivered media totals 7,687,004 bytes. Motion files use H.264/yuv420p and AAC with faststart; ambient files are mono MP3. Ambient beds are normalized and have short boundary fades. Provenance, prompts, task IDs, hashes and credit accounting are in `development/media-5.9-provenance.json`. The pass used 187 Runway credits; the provider reported 117 remaining after the final generation.

Cloud Chrome preview checks verified:

- Main game loaded the existing Sable save in compatibility mode; the ambient volume slider appeared at 0.24 in Sound, display & controls.
- Mara's exact new origin recording played in the actual opening with readyState 4 and an advancing audio clock; replay became available.
- Wayglass and Cinderfall motion frames decoded and were composited behind existing captions in the isolated media harness. Compatibility and reduced motion kept the original artwork.
- The scored Wayglass film played from the main film room with readyState 4 and an advancing video clock. `release-5.9-media.jpg` records that presentation.
- Town/workshop/water/garden ambience played; the final repaired controller transitioned town → water → garden successfully, ducked for dialogue and stopped on pause.

The managed preview is shared across checkouts. A concurrent visual pass in `ash-aether-lastmoon` temporarily replaced the served checkout and caused reloads/stale assets during QA. Final media QA was performed after selecting this checkout again; source changes from that other checkout were not copied or overwritten. Both checkouts started at b34f9fb, so later publication of the visual pass must merge this release's pushed source, especially main.js and index.html, to retain the new media.

These checks establish local integration and decoding, not subjective acting/musical quality or actual Edge/phone performance. The user confirmed release 5.8 graphics on their laptop; this media pass has not been retested on that hardware. New media is lazy loaded, and compatibility mode avoids the new in-play video load.
