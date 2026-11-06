# Sable, Iona and Rook palette adaptation

This is an authored recolor of the existing Chrono Trigger character sprites. It changes no sprite pixels, anatomy, animation, weapons, portraits, or overworld mini sprites. It does not contain Final Fantasy character art. Sable uses Crono's shapes with gold hair and navy/dark-steel clothes; Iona uses Marle's shapes with copper/umber hair and ivory/teal clothes; Rook uses Lucca's shapes with steel/ochre clothes.

The exact original USA 1.0 ROM SHA-256 is required. Three independent selectors were read and checked: field sprite records select palette numbers 0/1/2; the menu's table pointer resolves to the same offsets; field palette allocation copies those records into live sprite colors 1–12. The resulting file offsets are 0x240000,0x240018 and0x240030, each 24 bytes. These are shared character colors: battle setup retains the field palette and adds weapon colors 13–15. No separate guessed battle palette was changed.

`palette_patch.json` contains 20 authored RGB555 word replacements (39 actual byte changes) and source/payload SHA-256 guards. It contains no original palette dump. Every original24-byte palette has a region hash, and individual sparse edits have original-range and authored-payload hashes. Live transparency color 0 is outside these records and is untouched. Original outline/white colors 1–2 and skin colors 3–4 are preserved for all three characters. Weapon colors 13–15 are untouched. Special effects may temporarily override character colors during gameplay.

The parent chapter builder merges `patches` into its existing recipe before computing its final ROM checksum and final output SHA. The palette builder deliberately does not emit a standalone modified ROM. Existing chapter/audio/event edits do not overlap these addresses. Load the merged ROM or start a new game state to load the new colors; a pre-existing emulator state can retain old palettes in its serialized WRAM/PPU buffers.

```sh
python game/romhack/palette/build_palette.py path/to/your-original-ROM.sfc
```

An optional `--preview /private/path/contact.png` renders an actual original/recolored frame from the supplied ROM for local inspection. It uses original graphics and frame pointers, a 16-tile frame record with 4 signed position pairs, the original horizontal-flip bit, and planar 4bpp pixel data. It generates no new sprite art. No preview or original asset bytes are committed. The contact sheet was generated and visually inspected for all three characters. This verifies the decoded frame and intended palette roles, not every pose, scene, portrait, or full-game effect.

All address/layout evidence is pinned to ChronoRET commit `af992bdd99603332ac91b32c621dfbfec3ae816a`; precise primary-source locations and file hashes are in `sources.json`. The survey's E42A00 region describes the pointer table. The actual first three color records reside at E40000/E40018/E40030, as proved by the ROM's pointers and the field's 24-byte palette-number multiplication.
