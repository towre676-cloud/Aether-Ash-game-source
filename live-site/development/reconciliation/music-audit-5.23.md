# A&A music inventory and contextual programming audit · 5.23

Measured 2026-10-29. This pass reads existing delivered recordings and changes only programming and gain metadata. No music, voice or sound-effect asset was recomposed, rewritten, shortened or added.

## Finding and implemented response

The delivered music collection is substantial. The previous main music router sent most unrecognized scenes to the 25.17-second RPG explore arrangement and intercepted `performance:dyletsky_*` with the short RPG pool. A route could therefore sound like one or two repeating themes despite many recordings being present. Byte and decoded-PCM identity checks found **no duplicate recordings among the 101 game/music Ogg files**. Their actual decoded duration totals **52m20.20s**, at **40,839,327 bytes (38.947 MiB)**. Two complete symphonies outside game/music add 9m04.39s and 6,298,285 bytes. Across both locations there are **103 delivered recordings**, **61m24.59s** of decoded music and **47,137,612 bytes**.

The catalog has 81 entries but 75 distinct recording paths. Its six movement aliases reuse the two symphony recordings; they are not six additional recordings. Adding the 28 RPG descriptors gives 109 selectable descriptors backed by 103 recordings. `catalog_receipt.json` still describes the earlier 56-entry catalog and is not a reliable inventory of this delivery. All current catalog and RPG manifest audio hashes match their delivered files.

`music-program.js` now resolves those 109 descriptors and supplies finite, contextual pools for all 167 canonical scenes. Every field pool has at least 4 distinct recordings and at least 3 melodic families. All 14 origin scenes have different first-two pairs, and the seven opening scenes start on seven different recordings. Actual biome identity precedes generic stage names, so a Trailhead does not become a railway and a mangrove Sanctuary retains its wetland program. Night adds longer rests and quieter-context selections; later chapters introduce appropriate alternate existing recordings. Literal performance selections remain finite individual performances. Authored numeric event cues differing from the current scene song use the existing cue map; numeric scene songs request the context pool; numeric 0 remains silence. Active battles take priority over the legacy performance:action_* call convention and receive a chapter-ordered pool with all four matching action cues plus the appropriate battle/boss recordings.

The director owns rotation, recent-recording/family avoidance, rests, transitions and interruption policy. The player owns playback and gain. This module does not mutate campaign state or create audio sources. The new runtime program and complete measurement map together add about 29.6 KB; no music-asset bytes are added to Site delivery.

## Inventory: music only

Native SPC sequence .bin files are not browser recordings and are excluded from these totals. Voice clips, acoustic textures, score stems in the acoustics package, SFX, and embedded cinema soundtracks are outside this requested inventory. The instrumental piece titled The Voices Keep Their Names is a music recording, not a voice pack.

| Collection | Recordings | Bytes | Decoded seconds | Integrated LUFS range |
|---|---:|---:|---:|---:|
| Original game cues | 48 | 15,256,687 | 1328.267 | -17.8 to -10.2 |
| RPG arrangements | 28 | 9,808,270 | 566.304 | -19.4 to -16.8 |
| Longer Dyletsky district pieces | 6 | 4,756,192 | 338.581 | -18.6 to -17.6 |
| Credited reference recordings | 10 | 7,174,806 | 648.646 | -17.9 to -16.4 |
| Action cues | 8 | 3,184,249 | 200.191 | -14.3 to -13.4 |
| Other Dyletsky piece | 1 | 659,123 | 58.210 | -13.8 to -13.8 |
| Complete symphonies outside game | 2 | 6,298,285 | 544.388 | -19.2 to -18.2 |

## Practical pool priorities

Prefer the 45–65-second district pieces for exploration; rotate short authored cues between complete performances and quiet intervals. The six district pieces already have a more restrained recorded level than the older peak-normalized cues. These are contextual candidates based on metadata, measured loudness, score tempo and instrumentation; this audit does not claim a human headphone listening review.

| Context | Existing IDs to lead with | Why |
|---|---|---|
| Homes and refuge | dyletsky_home; rest_by_the_gate; hometown_before_dawn | Longer domestic cue, then low-tempo rest/memory material. |
| Wetlands and rivers | dyletsky_tide; river_road; reunion_of_waters | Water context with different recordings and melodic families. |
| Workshops and rail work | dyletsky_workshop; pressure_valves; station_under_ash | Distinguishes work areas from fields without using combat music. |
| Archives and study | dyletsky_archive; letters_never_sent; glass_memory | Reflective records and memory context. |
| Chapels and listening rooms | dyletsky_chapel; chapel_of_rain; night_flower | Quiet room context with space between performances. |
| Highland and storm routes | dyletsky_sky; silent_orbit; horizon_engine | Skyward context; no boss or pursuit music in random exploration. |
| Combat | action_battle_0..3 or action_boss_0..3, then matching existing combat cues | Short, rhythmically dense material remains confined to encounters. |

The 10 reference recordings retain composer attribution and remain available through explicit listening controls; they are excluded from random exploration. Ending, victory and complete concert works are also excluded from the field pools. Full concert performances remain available explicitly, with their original duration and title. The 28 RPG files remain available, but their short arrangements are finite program entries, not endlessly repeated field loops.

## Measured mix policy and loop limits

All files decoded successfully. `music-mix.js` records measured complete-file integrated LUFS, decoded duration and delivered SHA256. Per-track gain is:

`min(1, 10 ** ((-22 - integratedLUFS) / 20))`

This is an amplitude multiplier toward −22 LUFS before the player's user-volume and dialogue-ducking controls. It never amplifies a quiet track. This is not a limiter and does not promise identical loudness during every short passage. Explicit symphony movement aliases use their complete recording's measurement.

The old original cues vary from −17.8 to −10.2 LUFS, while most RPG loops are near −19 LUFS. Routing them without attenuation could create an almost 9 LU jump. Examples: millennial_morning at −10.2 LUFS gets 0.2570 gain, rest_by_the_gate at −13.2 gets 0.3631, dyletsky_home at −18.5 gets 0.6683, and rpg:explore at −18.6 gets 0.6761. Runtime master volume remains independent.

The 20 RPG manifest loops exactly match decoded loop durations. They are 14.55–30.30 seconds long; explore is 25.1748125 s, town 26.373625 s, and rook 14.54546875 s. Their decoded endpoint jumps are tiny (maximum 0.000406 full scale in this scan), so the complaint is not explained by gross click discontinuities. A continuous sample boundary does not establish a satisfying harmonic or musical loop. The catalog's older orchestral cues have cadences and release tails and are expressly not documented as seamless loops; play them to completion and let the director schedule the next performance/rest.

Container durations can include codec padding. The audit JSON stores both ffprobe container duration and actual decoded-frame duration; runtime duration uses decoded audio and retained authored start/end bounds. Every Ogg file is stereo. Original catalog delivery is largely 48 kHz Opus; RPG and action files are 32 kHz Vorbis. No codec conversion was performed in this pass.

## Provenance that must remain attached

- The 48 original game cues identify their composer as **Hydrophone Symphony Engine** in written/performed JSON. They are corpus-conditioned original score-engine output, not recordings of Debussy, Ravel or the other named corpus composers. Score metadata lists the selected composer palette, source/profile hashes, source window, performance fields and original orchestration. The README states that no other game's melodies were retrieved.
- The 28 RPG pieces are explicitly arrangements and excerpts of the original Hydrophone works, not 28 independently composed works. `rpg/manifest.json` retains source commit `f081829926f11de3f3955c22e00438512b440352`, source work/score SHA, source beats, tempo ratio, orchestration and motif family. Titles in the library are taken directly from the supplied catalog/manifest.
- The six longer district pieces and the other Dyletsky piece retain score/receipt provenance, Gen2 engine IDs, conditioning-source IDs and render hashes. The receipts describe a sampled GeneralUser GS/FluidSynth software orchestra, not a live orchestra or physical hydrophone recording. Scores conditioned on aggregate reference features are not represented as transcriptions.
- The 10 game_reference recordings credit **Juhani Junkala / SubspaceAudio**, identify their source filenames, URLs and original source hashes in `instrument/corpus.json`, and mark **CC0-1.0** in that corpus and the catalog. The delivered files are transcoded copies: their current delivered SHA values match catalog.json but differ from the original-source hashes. Preserve both identities and attribution. Do not present these existing recordings as new A&A compositions.
- Existing RPG documentation specifically notes upstream performance-data notices including **ASAP CC BY-NC-SA** and does not grant blanket commercial clearance. The README refers to companion `PERFORMANCE_DATA.md`, corpus_sources and `LICENSE-GeneralUserGS.txt`; those full companion license files are not present in this Site checkout. This audit records the supplied provenance and does not independently establish additional rights.
- Native sequence files are adaptations for the supplied ROM's sound engine, not additional recorded performances; their separate README/source receipts remain intact.

## Verification

The targeted music-program tests verify every library path and delivered hash, all 103 measurements, 109 descriptors and movement alias identity, finite playback metadata, attenuation math/no amplification, all 167 scenes at day/night and early/late chapters, pool recording/family diversity, all14 origin first-two choices, explicit listening and authored event preservation, genuine silence, biome/room classification, and four-cue combat pools. No other agent's runtime, playback or director code is modified by this module.

## Complete delivered-recording inventory

Every path is relative to the Site root. The machine-readable audit includes full SHA256 and decoded-PCM SHA256 identities, peak and loudness-range measurements, codecs and exact durations.

| Canonical ID | Delivery path | Decoded seconds | LUFS | Gain to −22 LUFS |
|---|---|---:|---:|---:|
| action_battle_0 | game/music/action/battle_0.ogg | 25.946 | -14.3 | 0.412098 |
| action_battle_1 | game/music/action/battle_1.ogg | 24.615 | -13.7 | 0.384592 |
| action_battle_2 | game/music/action/battle_2.ogg | 27.429 | -13.4 | 0.371535 |
| action_battle_3 | game/music/action/battle_3.ogg | 24.000 | -14.0 | 0.398107 |
| action_boss_0 | game/music/action/boss_0.ogg | 25.263 | -14.3 | 0.412098 |
| action_boss_1 | game/music/action/boss_1.ogg | 22.857 | -13.8 | 0.389045 |
| action_boss_2 | game/music/action/boss_2.ogg | 26.667 | -13.4 | 0.371535 |
| action_boss_3 | game/music/action/boss_3.ogg | 23.415 | -14.0 | 0.398107 |
| aerial_colossus | game/music/cues/aerial_colossus.ogg | 27.100 | -16.0 | 0.501187 |
| against_the_ages | game/music/cues/against_the_ages.ogg | 29.105 | -15.7 | 0.484172 |
| ascent_to_daybreak | game/music/cues/ascent_to_daybreak.ogg | 31.028 | -17.2 | 0.575440 |
| beneath_the_well | game/music/cues/beneath_the_well.ogg | 24.401 | -10.7 | 0.272270 |
| black_wind | game/music/cues/black_wind.ogg | 20.991 | -12.8 | 0.346737 |
| cargo_train_run | game/music/cues/cargo_train_run.ogg | 19.765 | -15.5 | 0.473151 |
| chapel_of_rain | game/music/cues/chapel_of_rain.ogg | 30.733 | -12.4 | 0.331131 |
| cinder_return | game/music/cues/cinder_return.ogg | 16.859 | -17.0 | 0.562341 |
| corporate_spire | game/music/cues/corporate_spire.ogg | 25.453 | -13.1 | 0.358922 |
| engines_above_clouds | game/music/cues/engines_above_clouds.ogg | 22.792 | -11.8 | 0.309030 |
| epoch_of_clay | game/music/cues/epoch_of_clay.ogg | 26.870 | -11.0 | 0.281838 |
| escape_from_sector | game/music/cues/escape_from_sector.ogg | 28.033 | -17.8 | 0.616595 |
| falling_platform | game/music/cues/falling_platform.ogg | 19.117 | -12.1 | 0.319890 |
| glass_memory | game/music/cues/glass_memory.ogg | 31.845 | -10.7 | 0.272270 |
| halls_beneath_water | game/music/cues/halls_beneath_water.ogg | 27.146 | -13.3 | 0.367282 |
| hidden_assembly | game/music/cues/hidden_assembly.ogg | 27.727 | -11.0 | 0.281838 |
| hometown_before_dawn | game/music/cues/hometown_before_dawn.ogg | 29.149 | -12.6 | 0.338844 |
| horizon_engine | game/music/cues/horizon_engine.ogg | 24.947 | -14.0 | 0.398107 |
| iron_sentinel | game/music/cues/iron_sentinel.ogg | 26.479 | -16.4 | 0.524807 |
| last_horizon | game/music/cues/last_horizon.ogg | 44.695 | -16.0 | 0.501187 |
| last_reactor | game/music/cues/last_reactor.ogg | 28.380 | -15.3 | 0.462381 |
| letters_never_sent | game/music/cues/letters_never_sent.ogg | 32.413 | -12.0 | 0.316228 |
| light_returns | game/music/cues/light_returns.ogg | 17.304 | -16.2 | 0.512861 |
| millennial_morning | game/music/cues/millennial_morning.ogg | 29.623 | -10.2 | 0.257040 |
| names_in_snow | game/music/cues/names_in_snow.ogg | 23.452 | -15.0 | 0.446684 |
| night_flower | game/music/cues/night_flower.ogg | 27.818 | -13.0 | 0.354813 |
| oath_of_cinders | game/music/cues/oath_of_cinders.ogg | 23.067 | -12.4 | 0.331131 |
| orchard_after_fire | game/music/cues/orchard_after_fire.ogg | 25.965 | -12.1 | 0.319890 |
| pendant_of_embers | game/music/cues/pendant_of_embers.ogg | 31.570 | -12.5 | 0.334965 |
| planet_beneath_us | game/music/cues/planet_beneath_us.ogg | 26.543 | -13.8 | 0.389045 |
| pressure_valves | game/music/cues/pressure_valves.ogg | 22.650 | -12.8 | 0.346737 |
| promise_in_green | game/music/cues/promise_in_green.ogg | 28.450 | -11.8 | 0.309030 |
| reactor_lattice | game/music/cues/reactor_lattice.ogg | 21.985 | -14.1 | 0.402717 |
| rescue_signal | game/music/cues/rescue_signal.ogg | 22.669 | -11.9 | 0.312608 |
| rest_by_the_gate | game/music/cues/rest_by_the_gate.ogg | 35.503 | -13.2 | 0.363078 |
| reunion_of_waters | game/music/cues/reunion_of_waters.ogg | 28.832 | -10.7 | 0.272270 |
| river_road | game/music/cues/river_road.ogg | 37.145 | -15.4 | 0.467735 |
| ruined_sea | game/music/cues/ruined_sea.ogg | 46.678 | -13.8 | 0.389045 |
| signal_before_dawn | game/music/cues/signal_before_dawn.ogg | 32.799 | -15.9 | 0.495450 |
| silent_orbit | game/music/cues/silent_orbit.ogg | 29.956 | -13.4 | 0.371535 |
| sirens_on_bridge | game/music/cues/sirens_on_bridge.ogg | 20.611 | -15.7 | 0.484172 |
| small_courtyard | game/music/cues/small_courtyard.ogg | 26.472 | -11.1 | 0.285102 |
| station_under_ash | game/music/cues/station_under_ash.ogg | 23.084 | -13.7 | 0.384592 |
| steel_procession | game/music/cues/steel_procession.ogg | 27.712 | -17.0 | 0.562341 |
| tomorrow_unwritten | game/music/cues/tomorrow_unwritten.ogg | 36.528 | -15.2 | 0.457088 |
| undercity_lanterns | game/music/cues/undercity_lanterns.ogg | 29.125 | -12.3 | 0.327341 |
| unexpected_friend | game/music/cues/unexpected_friend.ogg | 25.336 | -10.8 | 0.275423 |
| wings_over_slag | game/music/cues/wings_over_slag.ogg | 32.364 | -17.1 | 0.568853 |
| dyletsky_voices | game/music/dyletsky/voices_keep_their_names.ogg | 58.210 | -13.8 | 0.389045 |
| dyletsky_archive | game/music/instrument/dyletsky_archive.ogg | 45.050 | -17.6 | 0.602560 |
| dyletsky_chapel | game/music/instrument/dyletsky_chapel.ogg | 50.900 | -17.8 | 0.616595 |
| dyletsky_home | game/music/instrument/dyletsky_home.ogg | 64.973 | -18.5 | 0.668344 |
| dyletsky_sky | game/music/instrument/dyletsky_sky.ogg | 54.326 | -18.1 | 0.638263 |
| dyletsky_tide | game/music/instrument/dyletsky_tide.ogg | 59.664 | -18.3 | 0.653131 |
| dyletsky_workshop | game/music/instrument/dyletsky_workshop.ogg | 63.668 | -18.6 | 0.676083 |
| game_reference_01 | game/music/instrument/game_reference_01.ogg | 71.489 | -17.7 | 0.609537 |
| game_reference_02 | game/music/instrument/game_reference_02.ogg | 88.615 | -17.3 | 0.582103 |
| game_reference_03 | game/music/instrument/game_reference_03.ogg | 60.000 | -17.8 | 0.616595 |
| game_reference_04 | game/music/instrument/game_reference_04.ogg | 92.903 | -17.9 | 0.623735 |
| game_reference_05 | game/music/instrument/game_reference_05.ogg | 92.000 | -17.6 | 0.602560 |
| game_reference_06 | game/music/instrument/game_reference_06.ogg | 53.333 | -16.4 | 0.524807 |
| game_reference_07 | game/music/instrument/game_reference_07.ogg | 41.143 | -17.7 | 0.609537 |
| game_reference_08 | game/music/instrument/game_reference_08.ogg | 56.104 | -17.9 | 0.623735 |
| game_reference_09 | game/music/instrument/game_reference_09.ogg | 71.724 | -17.7 | 0.609537 |
| game_reference_10 | game/music/instrument/game_reference_10.ogg | 21.333 | -17.8 | 0.616595 |
| rpg:archive | game/music/rpg/archive.ogg | 29.630 | -18.9 | 0.699842 |
| rpg:battle | game/music/rpg/battle.ogg | 16.529 | -18.9 | 0.699842 |
| rpg:battle_late | game/music/rpg/battle_late.ogg | 15.365 | -19.2 | 0.724436 |
| rpg:boss | game/music/rpg/boss.ogg | 17.884 | -19.2 | 0.724436 |
| rpg:chapel | game/music/rpg/chapel.ogg | 30.303 | -18.8 | 0.691831 |
| rpg:cinema_finale | game/music/rpg/cinema_finale.ogg | 29.910 | -18.5 | 0.668344 |
| rpg:cinema_loss | game/music/rpg/cinema_loss.ogg | 22.403 | -18.9 | 0.699842 |
| rpg:cinema_reveal | game/music/rpg/cinema_reveal.ogg | 22.373 | -18.6 | 0.676083 |
| rpg:credits | game/music/rpg/credits.ogg | 31.316 | -18.9 | 0.699842 |
| rpg:danger | game/music/rpg/danger.ogg | 20.202 | -19.0 | 0.707946 |
| rpg:discovery | game/music/rpg/discovery.ogg | 6.887 | -19.4 | 0.741310 |
| rpg:dungeon | game/music/rpg/dungeon.ogg | 24.691 | -19.1 | 0.716143 |
| rpg:explore | game/music/rpg/explore.ogg | 25.175 | -18.6 | 0.676083 |
| rpg:garden | game/music/rpg/garden.ogg | 26.608 | -18.9 | 0.699842 |
| rpg:home | game/music/rpg/home.ogg | 26.667 | -18.9 | 0.699842 |
| rpg:iona | game/music/rpg/iona.ogg | 15.810 | -18.9 | 0.699842 |
| rpg:iona_reunion | game/music/rpg/iona_reunion.ogg | 17.094 | -18.8 | 0.691831 |
| rpg:market | game/music/rpg/market.ogg | 20.202 | -18.6 | 0.676083 |
| rpg:rook | game/music/rpg/rook.ogg | 14.545 | -18.8 | 0.691831 |
| rpg:rook_awakened | game/music/rpg/rook_awakened.ogg | 16.338 | -18.7 | 0.683912 |
| rpg:sable | game/music/rpg/sable.ogg | 25.890 | -18.9 | 0.699842 |
| rpg:sable_resolve | game/music/rpg/sable_resolve.ogg | 17.924 | -18.7 | 0.683912 |
| rpg:stinger | game/music/rpg/stinger.ogg | 4.359 | -17.1 | 0.568853 |
| rpg:town | game/music/rpg/town.ogg | 26.374 | -18.4 | 0.660693 |
| rpg:transition | game/music/rpg/transition.ogg | 4.455 | -16.8 | 0.549541 |
| rpg:victory | game/music/rpg/victory.ogg | 10.142 | -19.3 | 0.732825 |
| rpg:water_cavern | game/music/rpg/water_cavern.ogg | 24.242 | -18.7 | 0.683912 |
| rpg:workshop | game/music/rpg/workshop.ogg | 22.988 | -18.9 | 0.699842 |
| clay_and_water_complete | music/clay_and_water/performance.ogg | 360.406 | -19.2 | 0.724436 |
| the_water_remembers_complete | music/the_water_remembers/performance.ogg | 183.981 | -18.2 | 0.645654 |
