# Ash & Aether — deployment status, 2026-10-29

- **Production project:** `appgprj_6adf63724e5c8191bd55637b8ecd8d9a` / `ash-aether-clay-water`.
- **Reported target:** A&A v5.17, commit `070c9f58c75202871f51651c0009659cd385db3f`. Latest live editable source could not be independently inspected; do not assume that head remains current.
- **Production access:** public Site URL returned HTTP 401 from the available fetcher. Neither the connected GitHub repositories nor the accessible Library projection contains the A&A production source. No Site write-capable connector was available.
- **Auth attempt:** secure external browser profile setup requested but not saved at packaging time; user must authorize the login directly in that browser. No passwords are stored in this package.
- **Code prepared:** 48-material Ground Forge + Living Grass v2 + Living World lab + production adapter. This release also adds a **fail-closed, additive-only** merge tool with concurrent-change detection. The tool cannot wire unknown production APIs by guessing.
- **Local validation:** 62 Node tests and 7 Python safety tests passed. All packages preserved from preceding handoff. Real-game visual/browser and gameplay tests NOT run; local Playwright Chromium navigation was blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`.
- **Live game changed:** **NO**. Do not describe this as published or integrated into the authenticated Site. `PRODUCTION_SITE_MERGE.md` lists all remaining steps and guards.

## Additive hardening continuation

- This release now passes **68 Node tests and 7 Python installer tests (75/75)**.
- Fixed deferred-map save preservation, future environment-save extension preservation, road/architecture grass masking, callback failure safety and ground coordinate integrity.
- No browser-based Site edit or publication occurred. A Google sign-in may be available in the external browser profile, but ChatGPT/Sites login has not been confirmed.
- See `MERGE_UPDATES_2026-10-29.md`.

## Same-day continuation — physical material QA

- **83/83 local automated tests now pass** (76 Node, 7 Python); see updated logs.
- Fixed resolution-dependent normal flattening and same-pitch chunk-edge normal seams; non-destructive `syncMap` now stages all material changes before commit.
- **Live Site changed: NO.** The browser profile checked in this continuation does not confirm a ChatGPT/Sites login. Latest editable Site source and current production version remain unverified. Runtime hook wiring and on-device GPU QA have not been performed.
