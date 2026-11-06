# Original artwork and motion — release 5.16

This pass adds **37 painted motion poses and eight environment props**, derived from the project's existing original character, creature and scenery art. The generated PNGs are copied into the game unchanged. Animation selects genuinely different drawings; the runtime does not stretch or rotate a standing body to imitate an action.

## Review the real assets

Open [Authored motion review](../dist/game/engine2/qa/authored-motion.html) through the game's local server at `/game/engine2/qa/authored-motion.html`. The existing movement studio links to it. The page imports the actual runtime drawing helper and state machine, and offers idle, walk, run, attack, impact, guard and defeat controls. It also supports mirroring, individual-pose inspection, pause and frame stepping, reduced motion and two review scales. A disclosure displays every environment prop through its production drawing helper.

The review is isolated from journey saves. This is an asset and presentation review, not a substitute for checking placements and transitions in the live renderer.

## Delivered assets

| File in `dist/game/engine2/art/` | Dimensions | Content |
| --- | --- | --- |
| `sable-motion-v16.png` | 1341 × 1173 | 16 poses: two idle drawings, four strides, brake, turn, anticipation, swing, strike, follow-through, recovery, impact, guard and kneeling defeat |
| `ash-herald-motion-v16.png` | 1448 × 1086 | 12 poses: idle and breathing, four leg articulations, crouched preparation, strike, slam, recovery, impact and collapsed defeat |
| `moonveil-motion-v16.png` | 1536 × 1024 | 9 poses: four wing articulations, cupped preparation, release, recovery, impact and resting defeat |
| `authored-props-v16.png` | 1774 × 887 | Carved arch, rain bell altar, chapel bench, gutter and brass diverter, clay workbench, clay hearth, reed/stepping-stone bank and shrine window |

These files preserve actual RGBA transparency. Some transparent pixels retain unused background RGB values, especially in the Moonveil sheet. A viewer that ignores the alpha channel can display those colors as a backdrop. Canvas `drawImage` uses the alpha channel correctly; the runtime performs no background-removal pass.

## Drawing contract

`authored-art.js` exports `AUTHORED_ART_FILES`, `AUTHORED_MOTION_ATLASES`, `AUTHORED_PROPS`, `drawAuthoredMotion` and `drawAuthoredProp`.

```js
drawAuthoredProp(ctx, assets.authoredProps, 'bell', x, y, width, height);
drawAuthoredMotion(ctx, assets, selection, x, y, standingHeight, {flip});
```

Both return `true` when they draw a usable image and `false` when a safe fallback is required. The caller retains the old art path on `false`. An image that is still loading, has zero dimensions, or cannot contain the requested source region is not drawn. No pixel readback or graphics filter is required, so the same implementation works in compatibility mode.

Props fit inside the requested box with preserved aspect ratio, anchored at bottom center. The motion `standingHeight` has a different contract: it scales the entire atlas against **one shared reference height**. Every pose uses its measured foot or thorax anchor. A crouch stays shorter, a raised wing stays taller, and an extended sword stays wider without changing the character's body scale.

The source layout is approximate, so nominal equal grid cells are unsuitable for production cropping. Exact rectangles live in the metadata. Sable's strike and follow-through use two source pieces each because a sword crosses the nominal cell boundary. The bell/hearth edge also uses separate strips. Each piece retains its original image-space offset. This preserves the entire subject while excluding the neighboring pose, without editing, masking, painting or warping the generated pixels.

## Motion integration

Create an `AuthoredMotion` instance with the renderer, call `reset()` when changing scenes, and send each existing presentation event to `event(event, rendererTime)`.

```js
const selection = authoredMotion.select(actor, {
  hero: isHero,
  starter: usesCourierOutfit,
  chapter: scene.chapter,
  pose: existingCharacterPose,
  time: rendererTime,
  battle: Boolean(battle),
  reducedMotion
});
```

For Sable, the existing `characterPose` supplies its distance-based phase. The helper adds a short turn and braking transition, and resolves physical action, impact, guard and recovery drawings from presentation events. Multi-target physical damage does not restart the same action for every target. Damage-over-time ticks do not repeatedly force an impact pose. Event presentation does not delay commands or alter combat resolution.

Field creatures are often reconstructed as fresh objects each draw, so state uses stable actor IDs. The guardian's leg phase advances with resolved world travel. Moonveil's wingbeat keeps one thorax anchor. The state cache is bounded and is cleared with the scene.

## Scope and limitations

- New hero art applies to armored Sable's forward/three-quarter views. Courier clothing, rear-facing travel, other heroes and Sable's spell-casting pose retain their existing atlases.
- The cathedral guardian sheet applies to the chapter-four Ash Herald. Other guardians retain their existing identities.
- The ordinary-creature sheet applies to `species === 'moonmoth'`. Other species retain their existing art.
- Defeat poses are available to the review and helper. Their visibility in the live game follows the renderer's existing actor lifecycle; this helper does not keep removed enemies alive.
- This pass supplies original poses and a practical coherent prop kit. It does not claim a complete eight-direction motion set, every creature, every cast animation or new ground-material atlases.

## Evidence and provenance

[Generation manifest](verification/release-5.16-art-generation.json) records all six built-in image-generation prompts, references, selected outputs and rejected layouts. The first Moonveil sheet was rejected because broad wings crossed cells; the selected nine-pose version provides clean separations.

[Art receipt](verification/release-5.16-art-receipt.json) records file hashes, dimensions, byte sizes, alpha counts and a read-only connected-component crop audit. At alpha greater than 32, every one of the 37 motion poses and eight props retains its complete main subject, and no source crop includes a neighboring subject. Small detached details are counted separately. This audit checks the delivered pixels and runtime crop metadata, not merely the requested grid in the prompt.

[Focused test log](verification/release-5.16-art-tests.log) records 14 passing tests. They cover PNG dimensions, source bounds, fallback behavior, fixed scale and anchor math, distance phase at 30/60/120/144 fps, turn/brake timing, action progression, impact priority, event deduplication, stable field IDs, reduced motion, bounded state and prop fitting.

```sh
node dist/game/engine2/tests/authored-motion.test.mjs
```

The original generated assets were inspected at full-sheet scale. The runtime review page is the next check for browser presentation, clean isolated crops and live perceived registration. Environment placement and complete release browser checks belong to the integrating renderer pass.


## Lossless delivery in the reconciliation release

The four original PNG sheets are preserved byte-for-byte under `development/art/source-v16/`. Runtime delivery uses the same basenames with `.webp` extensions. Each WebP preserves dimensions and **every decoded RGBA pixel exactly**, including RGB values under transparency. The authored rectangles and registration anchors remain unchanged. `development/art/delivery-v16-lossless-5.21.json` binds the source and delivery hashes and records the full-image equality check. Historical 5.16 and 5.18 receipts describe the earlier PNG publication; their original hashes remain valid for the archived sources.

The three unclean draft motion sheets are preserved under `development/publication-originals/motion/`. The cleaned display sheets and every existing preview video remain in the playable build. `motion-manifest.json` and its rebuild script now point to those exact preserved source paths.
