# Native ROM authoring notes

The current release is **The Unfinished Song 1.0.0**, a 24-chapter campaign. See `../README.md` for current behavior. The opening-slice description below is retained as historical implementation context; its three-map, single-boss and linear-tech limits no longer describe the release. Current source is `authoring/saga.py`, `authoring/rooms.py`, `authoring/town.py`, `boss_ai.py`, `balance.py` and `combos.py`; `patch.json` identifies the exact current output.

## Historical opening implementation

This is a native SNES ROM chapter prototype. The browser runs its events, combat, dialogue, names, music sequences and choices inside the emulated game. No webpage text or save-memory edits stand in for those events. It is an original adaptation of the requested reactor-city resistance premise, using Chrono Trigger's existing future-factory maps and recolored cast sprites as temporary art. The character RGB555 palette edits and their primary-source checks are in `palette/`; sprite geometry and animation are retained. No Final Fantasy VII source, disc asset or recovered port is claimed.

New Game keeps the native menu and naming flow, defaults to Sable and enters the Kiln hideout. Iona and Rook join the party. A briefing leads to an in-game departure choice. The service gate enters the factory security map, presents an actual mandatory native battle against a Sentinel, awards 250 native gold units after the battle and opens the power core. The core offers Sever, unlocking Sable's physical area strike, or Shelter, unlocking Iona's healing technique. The choice changes the game's persistent character-tech counts and bits, records a separate discipline flag and returns to a completed hideout. Walkable exits stay inside the three-room graph; revisiting security after victory cannot award another 250.

The first slice changes three complete location event scripts plus the new-game script. All seven default character names are changed to the original cast in `chapter.json`. Three technique names and two MP costs are changed, learning-point tables are tuned, the opening party has 150 HP and 18 MP each, six Tonics are supplied, and the Sentinel has 90 HP. Its underlying Proto II AI and the techniques' underlying Chrono Trigger animations/effects remain reused templates. This is a first chapter with a two-way progression choice, not a complete new world, full skill tree or finished FF7 port.

All 83 original music slots are mapped to silence or the 50 original native adaptations supplied by `game/music/native/native_patch.json`: 48 short cues and two symphonic reductions. The portable ROM's music gain is **not muted**. The native arrangement uses the SNES's existing instrument samples and eight-voice limit; it is not equivalent to the separate full orchestral recordings. A 64-byte observer at `C5:F370` remains available to the browser's optional recorded-orchestra mode. The development allocator reserves that area.

`patch.json` is a sparse recipe against the exact original 4 MB USA v1.0 ROM, SHA-256 `06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9`. Each sorted range contains an offset, replacement hex and before/after SHA-256. The whole output hash and SNES checksum are checked. It includes new event/music bytecode and small table edits; it contains no complete ROM or extracted art/sample archive. Optional 512-byte copier headers are removed before checking the original image.

Apply the published recipe with Python's standard library:

```sh
python game/romhack/apply_patch.py /private/original.sfc /private/ash_and_aether.sfc
```

Recompile the chapter after editing its content using the pinned Temporal Redux development tools. Clone its repository, check out revision `d8d4e38c0bf08b51a29441ef7ea2a489d63da58f`, then run:

```sh
python game/romhack/build_chapter.py /private/original.sfc /private/ash_and_aether.sfc --tools-root /path/to/temporal-redux
```

The compiler verifies the tool files against `sources.json` before importing them. Its local text encoder emits literal native glyphs and control codes for the new dialogue. Its small event assembler checks conditional span sizes. Temporal Redux handles the actual native event compression, relocation and ROM event-pointer tables; every compiled event and referenced message is decoded back from the finished ROM and compared. Unused event IDs `4B`–`4E` avoid changing scripts shared by unmodified locations. The image stays 4 MB HiROM. The compiler's use of the GPL development library is documented by its GPL-3.0-or-later header and the accompanying license.

Run the static recipe tests without a ROM:

```sh
python -m unittest discover -s game/romhack -p 'test_*.py'
```

Set `CT_SOURCE_ROM` to a private original `.sfc` and `CT_TOOLS_ROOT` to the pinned tool checkout to enable real-ROM application, event decoding and instruction-boundary checks. Genuine controller-input gameplay verification is recorded separately. `scope.full_playthrough_verified` remains false for the complete underlying game; the first chapter's controller runs and branches have their own receipts. A correct sparse patch and decoded bytecode alone do not establish successful gameplay or audio.

Persistent chapter state uses `7F:01D8` (phase), `7F:01D9` (discipline 1/2) and `7F:01DA` (completion). These are the chapter's allocated flag bytes; this prototype replaces the selected locations' original events and does not promise compatibility with vanilla saves or other hacks. Use a new game and this build's saves.

## Eight-mission campaign (current build)

The compiler now builds the whole Cinderfall campaign from `campaign.json`: the Kiln hub, eight missions, the core debrief/choice scene, credits and the postgame Kiln with a training ground. Each mission is a set of explorable **rooms** (20 in all) authored in `authoring/rooms.py`, which writes them into `campaign.json`:

* a room is a native location with an arrival tile, routed native exits (`to` another room or the Kiln) and objects;
* objects are `npc` (dialogue, optionally changing after an objective or setting a prerequisite bit), `switch` (an objective, optionally requiring a prerequisite), `cache` (one-time items/credits), `patrol` (a group of enemies fought together once), `boss` (gated by the objective; victory leads to the debrief) and `portal` (an A-press way out where a native exit is unreachable);
* progress lives in one byte per mission at `7F:01E1`–`7F:01E8` (bits: 0 first-room entry text, 1 objective, 2 patrol A, 3 cache A, 4 patrol B, 5 second-room entry, 6 prerequisite, 7 cache B/patrol C), so revisits never repeat rewards, fights or texts;
* fights run in an invisible *director* object (a defeated enemy's own script stops running); enemy objects always follow NPC objects in a room (an NPC loaded after an enemy displaces its sprite and the enemy never joins the battle); `7F:01DC` guards against re-entry; `7F:01EC` (set by the engine when the party falls) decides victory or defeat; defeat restores the crew and returns them to the room's arrival tile; a patrol victory reloads the room with the party where the enemy stood, because battle UI graphics overwrite NPC sprites until a location load;
* the Kiln gains phase-aware residents (`kiln_people`).

Enemy stat rows use the Jets of Time layout: byte 2 level, 9 magic, 11 hit, 12 evade, 13 offense, 14 magic defense, 15 defense (255 means immune to physical attacks, as native Acid/Alkaline are; avoid those templates). Late-game Chrono Trigger event scripts that cannot be reached are reclaimed for space.

Development tools (all read the private ROM and pinned tools, none write game RAM for evidence):

* `../../tools/map_props.py` decodes a location's tile properties (format per GitExl/CTViewer): PCs are blocked by z-plane-0 tiles; byte 2 bit 7 only blocks NPCs. `--json` feeds the walker.
* `../../tools/survey_locations.py` lists a native location's objects and exits; `../../tools/dump_event.py` prints a compiled event.
* `tests/play.mjs` is a step-by-step controller harness (`walk`, `talk`, `touch`, `fight`, `techturn`, `answer`, `mash ... idle`, `shot`) that saves earned snapshots and gridded screenshots. Its walker plans over the decoded map in 8 directions and learns from refused or deflected moves.
* `tests/routes/m1.txt`…`m8.txt` are the controller routes; `tests/campaign.sh ROM DIR 1 8` plays New Game to the ending, saving `kilnN`/`startN`/`clearN` snapshots. `DISCIPLINE=1|2` and `SPECIALIST=1|2|3` choose the answers at the two decisions.


## Wildlands update 0.10.0

The current native build adds six side areas, eight optional equipment encounters, moving renewable enemies, the Kiln outfitter and unlocked-region travel. Read `NATIVE_FIELD_SYSTEM.md` and `REGIONS.md` for the current mechanics; earlier sections describe the original campaign baseline. There are 20 mission rooms, 23 ordinary formations and eight story bosses. Actual controller-run receipts distinguish tested routes from static content validation.
