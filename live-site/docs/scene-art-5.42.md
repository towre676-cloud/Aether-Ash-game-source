# 5.42 · Surface and shadow

The ordinary World now uses its existing painted grass, earth, stone, wood, plaster and metal artwork as real 3D surfaces. Natural mineral regions use continuous aggregate and mineral grain rather than fitted courtyard paving. Cold mineral walking floors keep subdued detail and a lighter value than the closed banks. Clinic and water-room finishes retain their cool colours.

Three bounded atlas entries cover forty calibrated identities. The original image sheets are reused; this release adds no bitmap downloads. Small software faces use measured swatch averages from the same compositions. Production performs no synchronous canvas readback, and unavailable art retains the previous safe fallback.

Structural contact follows native walls, furniture and authored roots. Cached floor-clipped receivers stay clear of native input cells. Their near geometry remains intact, fades from eight to ten metres and is omitted beyond ten metres, reducing per-frame projection and draw work. Actor contacts retain their existing owner.

Selected dry-bank risers use broad recessed facets. Exact top/bottom rims and corner profiles remain unchanged; inset vertices stay in closed terrain. Replacement geometry is bounded by both a 1,800-face cap and the remaining original landscape allowance. The standalone landscape still stays below 10,000 triangles. Water, interiors and Veyr keep their existing terrain forms. Phone-sized software rendering retains simpler native risers; GPU and higher-quality views receive the optional sculpted faces. This avoids spending extra terrain work on the CPU fallback.

The software painter now seals opaque vertical and slanted coplanar faces as well as floors. The undercoat is the actual polygon union, so door holes and outer silhouettes remain empty. Genuinely isolated faces keep a single fill; coplanar neighbours across cached depth bands receive the necessary seam support. Real phone-sized raster fixtures reduced the original eleven-level wall crack to one RGB level, with perspective and slanted cases within three.

## Validation

The broad suite passed 1,816 tests across 247 modules without failures or skips. After the final software-low terrain guard, 14 targeted renderer/landscape checks passed, including the native 167-scene budget and the actual backend quality choice. These groups overlap. Final scene receipts, native browser captures, regression results and performance measurements are recorded in docs/verification/scene-art-542. Arrival review is distinct from every walking position or physical-phone/GPU testing.

The final arrival inventory rendered all 165 ordinary scenes at 388 × 842 using the actual renderer and game assets. It reported no missing art, nonfinite geometry, changed floor masks or changed saves, and no source drift. All six contact sheets and six representative full-size views are retained with the receipt. This covers native arrival views rather than every possible walking position.

Native browser review used the local game preview. Keyboard X opened Rook’s receiver and advanced the native objective. The orchestral transport was active with analyser RMS 0.01257. At 300% home zoom, all controls remained in bounds; Reset view restored World zoom to 135%. Native home and field captures and the structured browser receipt are retained. These checks do not establish production gameplay, physical-phone or GPU performance.

A final isolated benchmark ran both variant orders with the same actual assets, native moving paths, warmups and twenty measured frames per variant. The definitive result is `full-renderer-perf-542-low-lod.json`.

| Scene | 5.41 wall-time p95 | 5.42 wall-time p95 | Mean process CPU change |
| --- | ---: | ---: | ---: |
| Home 2 | 195 ms | 226 ms | +11.5% |
| Town 5 | 267 ms | 279 ms | −1.3% |
| Forest 145 | 210 ms | 206 ms | +3.5% |

Outdoor work is near baseline; interiors retain a measurable cost. These host software-renderer measurements do not establish smooth physical-phone or WebGL performance.

## Reproduction

```sh
node scripts/calibrate-scene-surfaces-542.mjs
node scripts/qa-scene-art-541.mjs --output /absolute/scratch/scene-art-542
```

Reference study used the official TUNIC and Death’s Door screenshot galleries to assess value hierarchy, quiet traversable ground and connected scenery. This is an art-direction inference; their renderer implementations and assets are not reused.

- https://www.playstation.com/en-us/games/tunic/
- https://www.playstation.com/en-us/games/deaths-door/
