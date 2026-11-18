# Real-WebGL2 flight performance report — 2026-11-18

**Scope:** Standalone continuous-world flight prototype only; NOT the separate, much newer live ChatGPT Site.

**Evidence:** [GitHub Actions paired profile, run 44273061275](https://github.com/towre676-cloud/Aether-Ash-game-source/actions/runs/44273061275), downloadable artifact *flight-realgl-perf-raw-comparison* with per-frame samples, six phases, both viewport sizes, stage timers, and actual screenshots. Historical baseline source pinned at commit 46497b71d156efd145898bd2c62c7d9eb537bda5; optimized candidate at b23e76a2e3a608a251abca697f2155f97be55466.

## Findings

The original renderer created four huge immutable batches and drew the *entire 1480m world* every frame regardless of view. The candidate now creates static 192m spatial chunks, culls distant and rearward geometry conservatively, separates detailed foliage and distant lightweight canopy, and samples 48m coarse terrain only beyond protected road, river and settlement envelopes. Both variants retain the same 60 Hz simulation, deterministic route, movement, rover/aircraft mechanics, landing, and delivery outcomes. The exact uninterrupted foot → rover → takeoff → flight → landing → foot journey passes in real WebGL2, not merely a mocked browser context.

### Measured frame-time distributions, 1024×576 SwiftShader

All values are milliseconds, **original → optimized**. Numbers are delivered rAF frame intervals, not GPU-only time.

| Phase | p50 | p95 | p99 | Triangles/frame |
|---|---:|---:|---:|---:|
| Walking | 35.3 → 32.7 | 66.9 → 48.6 | 76.3 → 145.8 | 47,181 → 19,727 |
| Driving | 44.4 → 38.4 | 75.1 → 65.8 | 80.4 → 71.1 | 47,151 → 24,977 |
| Takeoff | 36.9 → 36.3 | 62.1 → 65.3 | 83.9 → 77.7 | 47,151 → 27,905 |
| Flight | 37.2 → 35.9 | 59.3 → 55.0 | 61.1 → 55.7 | 47,151 → 22,491 |
| Landing | 36.8 → 28.5 | 57.7 → 55.1 | 63.1 → 65.4 | 47,151 → 19,311 |
| Arrival | 39.5 → 26.3 | 61.5 → 32.0 | 68.8 → 43.5 | 47,181 → 13,599 |

### Measured frame-time distributions, 1280×720 SwiftShader

| Phase | p50 | p95 | p99 | Triangles/frame |
|---|---:|---:|---:|---:|
| Walking | 45.0 → 33.5 | 94.4 → 59.6 | 164.3 → 127.1 | 47,181 → 19,878 |
| Driving | 54.7 → 36.8 | 92.1 → 43.1 | 92.6 → 52.6 | 47,151 → 24,993 |
| Takeoff | 46.4 → 36.3 | 72.3 → 52.5 | 74.3 → 75.3 | 47,151 → 27,919 |
| Flight | 45.0 → 34.9 | 72.0 → 42.2 | 100.3 → 51.3 | 47,151 → 22,511 |
| Landing | 45.0 → 34.0 | 72.0 → 50.3 | 73.8 → 69.4 | 47,151 → 19,356 |
| Arrival | 46.6 → 32.8 | 79.8 → 50.3 | 99.5 → 76.7 | 47,181 → 13,588 |

**Interpretation:** The 1280×720 flight median went from 45.0 to 34.9 ms; p95 72.0 to 42.2 ms. These still miss the **16.67 ms** frame-time budget. The 1024 takeoff p95 and walking p99 *regress*, and independent CI runs showed material scheduling variation. This is promising *software* evidence, not repeatable hardware certification or universal 60fps.

## Structural and staged-cost measurements

- Draw calls/frame increased from **15–16** to ~**69–141**, in return for reducing submitted triangles by roughly 40–71% depending on phase. This trades visibility savings for CPU/driver call overhead, a candidate for further batching or real instancing.
- One-time static WebGL buffer uploads increased from **9 buffers / 5,023,836 bytes** to **301 buffers / 6,140,232 bytes**. Those allocations occur during world construction, not per frame. No new geometry is generated on each position update.
- Median JS requestAnimationFrame callback time approximately **0.1 ms** original, **0.1–0.2 ms** candidate. The bottleneck is not proven to be JS update cost.
- WebGL debug renderer identity: **ANGLE (Google, Vulkan 1.3.0, SwiftShader Subzero)** for both. EXT_disjoint_timer_query_webgl2 exists. Its *separate* asynchronous stage diagnostic measured p50 GPU terrain ~4.17/5.23/4.23ms in walking/flight/arrival, detail-road-decor ~3.29/1.59/1.63ms, building/town ~2.47/2.52/3.55ms, river water ~0.10ms, active actors ~0.5–0.7ms. Each stage has only ~10–12 samples, with occasional >15ms outliers. **GPU timer runs are excluded from the paired rAF performance comparisons** to prevent query overhead contaminating before/after numbers.
- Visible cell count averaged **24 at arrival to 59 at takeoff**; observed cell-selection changes ~2–8 per measured phase. Detailed terrain chunks ~14–23 with additional coarse terrain where safe. This is geometry visibility selection, **not** network/disk streaming.
- PerformanceObserver registered no long tasks in sampled phases; rAF stalls >50ms still occurred. Reported usedJSHeapSize around **60.3 MB** was quantized at all measured samples, so cannot be taken as evidence of stable allocation behavior. Raw frame samples and stall counts (>33, >50, >100ms) are in the CI artifact.

## Visual and release caveats

The screenshots genuinely come from the optimized software-rendered prototype. Its scenery and buildings are still low-poly, and the engine is not an AAA-quality environment. The new LOD must still be reviewed for clipped roads, uneven triangle seams, and detail transitions on physical GPU devices. Test screenshot synchronization against the actual rendered HUD and completed journey; stale HUDs can result from the software-renderer cadence.

**The test does not prove performance on any desktop or Android GPU.** To claim crisp 60 FPS, run long sessions on representative actual hardware with p50/p95/p99 and GPU frame timers at multiple resolutions, optimize remaining terrain and shader pixel cost without blanking scenes, implement material/geometry instancing or batching to reduce draw calls, check loading/allocation stalls, and require p95 ≤16.67ms for defined device/scene budgets.

**Cross-PR integration:** PR #21 adds the saved festival catastrophe to the historical mainline campaign. PR #20 adds a standalone simulated vehicle/flight atlas. Both preserve existing canonical behavior as separate modules. Neither alone is a production-quality integration into the newer ChatGPT Site: current vehicle controls, 230+ destinations, equipment, economy, saves, menu and rendering must be audited against the authoritative live Site, not overwritten by the older GitHub export.

## Reproduction

With Playwright 1.56, Chromium, and Xvfb installed, run the benchmark driver with --source for original and optimized HTML, --width 1024 --height 576 or --width 1280 --height 720, and --out for JSON. Compare the resulting files with compare_perf_trip.py. Use --gpu-stages only for a separate diagnostic run. The CI workflow automatically fetches the pinned original and runs both viewports, the full unteleported route and GPU diagnostic.

Files: flight-perf-shim.js, test_perf_trip.py, compare_perf_trip.py, and .github/workflows/flight-perf.yml.
