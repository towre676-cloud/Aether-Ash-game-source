# Playable SNES runtime

`player.js` defaults to **SnesJs Canvas2D**: a real SNES CPU, PPU and APU emulator that needs no GPU, browser extension, CDN, account, or SharedArrayBuffer. The original MIT core is pinned to angelo-wf/SnesJs commit `b904fdb63be15dc0470b69091622ba5b1bde7275`; source hashes, license and the precise module adaptation are under `vendor/snesjs/`. Game ROMs are absent from public source.

The exact uploaded Chrono Trigger USA ROM, after the host's validated audio patch, was executed headlessly for 1200 frames. Real native WRAM hook events appeared, and a Start input reached the game's Battle Mode ACTIVE/WAIT selection. The actual 512×480 framebuffer was rendered and inspected. This verifies early game execution, not a complete playthrough. The original project's documented emulation limitations still apply; SnesJs is not cycle accurate and its original DSP implementation lacks echo.

```js
import { SNESPlayer } from './emulator/player.js';
const player = new SNESPlayer(document.querySelector('canvas'), {
  onStatus: status => console.log(status),
  onLog: entry => console.log(entry.message),
  onError: error => console.error(error),
});
await player.load(new Uint8Array(await file.arrayBuffer()));
player.setVolume(0.3);
```

`load` accepts a `File`, `Uint8Array`, or `ArrayBuffer`, with an optional second argument `{ name, state: Blob, sram: Blob }`. The status callback receives `idle`, `loading`, `running`, `paused`, or `error`. `pause()`, `resume()`, and `exit()` change the running state. `getDiagnostics()` returns the selected backend, renderer, successful frame count, native error latch and bounded runtime logs. The default renderer targets sixty emulated frames per second using a monotonic timer and fixed-time accumulator, independently of requestAnimationFrame. Catchup and accumulated backlog are capped at six frames; suspended time is dropped. This avoids the GPU-free test browser’s one-callback-per-second animation-frame throttle. Actual speed depends on the device. Pass constructor option `{debug:true}` to log diagnostics every120 emulated frames and timing diagnostics every second. They expose real RGB pixel counts, CPU/PPU progress, frame computation time, visibility and clock cadence. Production defaults to a single initial frame diagnostic; `getDiagnostics()` remains available without periodic logging. The live browser verified960→1020 actual core frames in0.993seconds and visibly rendered the title/pendulum while actual cue0x30 selected the orchestra.

`setVolume(0..1)` takes a linear amplitude and controls all emulated sound, including effects. Separating original music from effects is the host's checksum-verified game-specific patch. Original orchestral performances are played independently by the host's soundtrack engine.

Keyboard handling accepts both physical `event.code` and a case-insensitive `event.key` fallback, including key-only synthetic events. The default keyboard map is arrows, Enter = Start, Shift = Select, X = SNES A/confirm, Z = B/cancel, S = X/menu, A = Y, Q/W = L/R. Standard gamepads are polled, with face buttons following their physical SNES positions. For touch controls call `buttonDown`/`buttonUp` using lowercase `up`, `down`, `left`, `right`, `a`, `b`, `x`, `y`, `l`, `r`, `start`, `select`. Keyboard, gamepad and touch sources are combined so releasing one source does not cancel another held source. Pausing and window blur release keys. The host releases touch buttons on pointer cancellation.

`exportState()` and `exportSRAM()` return Blobs for download or browser storage. `importState(blob)` restores an existing state. Software states have schema `hydrophone.snesjs-state/1` and validate the patched ROM's CRC32 and backend. Only data is serialized. The original functions, typed-array views and circular constructor links remain intact. State layout, types and array ranges are fully checked before any field is applied; missing or unknown fields, prototype keys, ROM/code replacement and malformed arrays are rejected. A real frame-180 state (1,381,757 bytes of JSON) restored its frame, registers and WRAM, retained its original links, and continued at frame181. These local saves are not an external backup service.

`readMemory(offset, length)` and `writeMemory(offset, Uint8Array)` access actual emulated WRAM. Offsets `0..0x1ffff` map to bus `0x7e0000..0x7fffff`; explicit WRAM bus addresses are also accepted. Maximum operation length is 4096 bytes. The host validates the exact target ROM revision before patching or reading song-latch events. No clock-based scene simulation is substituted for native cues.

Twelve focused adapter/state tests cover volume conversion, button lifecycle, memory protocol failure handling, byte writes, state Blobs, native error latching, register and typed-view restoration, circular links, complete schema atomic malformed-state rejection, timer cadence/backlog bounds, and both physical-code/key-only keyboard events. Run `node --test game/emulator/test_player.mjs game/emulator/test_software.mjs` from the repository root with a current Node runtime. Hardware/browser input and full-game compatibility are separate from these tests.

## Optional native core

`new SNESPlayer(canvas, {backend:'snes9x'})` retains Nostalgist0.23.0 and the vendored single-thread SNES9x/RetroArch v1.22.2 build. That alternative needs working WebGL. It was not playable in the GPU-free test browser and is not the default. Its memory API uses asynchronous native RetroArch commands and fails on missing/malformed responses. Default SnesJs uses direct WRAM and does not load the native WASM.

The vendor runtime files are pinned by SHA-256 in `runtime.json`. Nostalgist is MIT licensed, RetroArch GPLv3 or later, and SNES9x has its own noncommercial license. Full notices and upstream source/version links are retained. The vendored official fflate0.8.2 browser ESM build is MIT licensed and extracts local ZIPs in the host. Its real extraction of the uploaded archive returned one 4,194,304-byte SNES ROM. No ROM or save bytes are sent to an external service by the emulator adapter.

The optional SNES9x WASM binary is a pinned, reproducible dependency rather than a committed source file. Run `python game/emulator/fetch_native.py` before selecting the developer-only `snes9x` backend. The default SnesJs game needs no downloads. The private hosted build already includes its local dependency.
