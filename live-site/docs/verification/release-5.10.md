# Ash & Aether 5.10 — scene craft and discovery

October 28, 2026 (America/New_York). This release applies a quality review against Last Moon and a selected primary-source scan of fourteen current indie projects. The scan is documented in `docs/INDIE_REFERENCE_SCAN_2026-10-28.md`; design inferences are separated from verified availability and attention evidence.

## Delivered behavior

- Thirty-two opening compositions: fourteen remembered-life scenes, seven field encounter openings, eleven first-chapter locations. Narrative landmark families and regional palettes are prepared once, with clear approach paths and quiet space around arrivals and interactions.
- Sixteen original painted environmental props in two atlases, measured alpha-safe source crops, larger irregular bank vegetation, and artwork for actual outdoor mechanisms and opportunities. Covered actors remain visible. Bank props are suppressed in interiors.
- Quieter ground: broad material variation and sparse habitat patches replace the repeated bright grass hatches. Compatibility draws rounded terrain and variation directly.
- Activity-based interior textiles, material-scale continuous floors, hearth aprons and wall joinery. Compatibility now uses direct continuous material and real wall geometry rather than the old collision-grid floor.
- Building frontages gain fitted windows, timber braces, foundations, deeper eaves, door details and contextual planting. Concave facade gaps are preserved.
- Closer actor-readable room framing, using the actual HUD and control-free viewport. Larger rooms scroll with the actor; compact and portrait framing keep their own scale.
- Material-specific clay, reed, ash, rime and mineral shielding shows saturation, firing, charring, charge, cracking and lost coverage. Local strikes and wind-up indicators reinforce existing combat rules.
- Optional world-space observations and genuine nearby residents' overheard cues point toward actual unfinished opportunities. One four-second caption, eight-second arrival margin, at least forty-five eligible seconds between cues, no repeated opportunity in the session. Pauses, dialogue, battles and guided routes suppress cues. No save fields or quest flags are written.
- Latest 5.9 audio, recorded origin voices and motion-cinema publication was reconciled before packaging; its source remains included.

## Validation

The test log records the full combined engine suite. Focused cue, image-fallback and caption-layout checks were repeated after the final presentation edits. Tests cover source rectangle validity, all seven origin routes and decisions, unchanged geometry, save roundtrips, material transitions, bounded rendering work and caption lifecycle.

Browser inspection used the same World and Renderer with actual source assets. All thirty-two composed scenes rendered in Standard and Compatibility modes without a recorded render error. Inspection is not a full campaign controller playthrough or a Windows Edge GPU benchmark. Actual-game entry, an opening conversation and objective-follow movement were also exercised; final browser details are recorded in the companion receipt.

No claims are made that all indie games have been surveyed or that Ash & Aether has reached a finished commercial quality bar. Later prototypes in the reference scan are explicitly future work.

## Artwork provenance

Built-in image generation produced `dist/game/engine2/art/scene-props-v10.png` and `scene-props-v11.png`. Exact prompts are preserved in `development/art/scene-props-v10-brief.txt` and `scene-prop-repertoire.js`, and its hash is in the art manifest. This is original Ash & Aether artwork; no reference-game assets or code were copied.
