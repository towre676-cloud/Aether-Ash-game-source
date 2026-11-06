# Animation story coverage — exact canon and proposed motion staging

{"chapters": 24, "scenes": 86, "verbatim_text_records": 1500, "planned_motion_shots": 702, "runtime_template_sources_needing_resolution": 0}

All text under `text_verbatim` is extracted without rewriting. Source dependencies are hashed. `runtime_snapshot` records refer to the engine-expanded world, including the earned opening and 24 exploration interiors. `js_string_literal` records retain exact literal offsets and raw spelling. The manifest does not claim every extracted string is spoken dialogue: fields distinguish prompts, labels, notes, rewards and spoken text.

Shot actions, camera directions and timings are NONCANONICAL production staging. They are planning data, not rendered footage, layered character rigs or lip-sync. Choice-specific records are an inventory and must not be concatenated into one linear film. Runtime templates with interpolation remain unresolved until the corresponding branch executes.

The other session’s workshop_first_sound is reserved. Its apprentice/mechanic/creature artwork cannot be relabeled Sable/Rook/a named enemy without identity review. No invented dialogue from that study is added to canonical scripts.

Run `python build_manifest.py` to regenerate and `python validate_manifest.py` to verify source hashes, exact text, layout coordinates, record references and all 24 chapters.

Chapter 01: The Stolen Song — 12 locations, 99 proposed motion shots.
Chapter 02: The Dawn Carriage — 3 locations, 24 proposed motion shots.
Chapter 03: The Undercity Well — 4 locations, 33 proposed motion shots.
Chapter 04: Chapel of Rain — 3 locations, 33 proposed motion shots.
Chapter 05: Names in the Archive — 4 locations, 28 proposed motion shots.
Chapter 06: The Sky Engine — 4 locations, 28 proposed motion shots.
Chapter 07: Orchard After Fire — 4 locations, 29 proposed motion shots.
Chapter 08: The Last Reactor — 3 locations, 28 proposed motion shots.
Chapter 09: The Children of Lowbank — 3 locations, 25 proposed motion shots.
Chapter 10: The Last Prison Train — 3 locations, 25 proposed motion shots.
Chapter 11: What the River Kept — 3 locations, 25 proposed motion shots.
Chapter 12: A Name Without a Number — 3 locations, 25 proposed motion shots.
Chapter 13: Rook and the Unfinished House — 3 locations, 25 proposed motion shots.
Chapter 14: The Daughter in the Glass — 3 locations, 25 proposed motion shots.
Chapter 15: Sable Takes Off the Uniform — 3 locations, 25 proposed motion shots.
Chapter 16: The Mountain Learns a Song — 3 locations, 23 proposed motion shots.
Chapter 17: The Observatory Below the Sky — 3 locations, 27 proposed motion shots.
Chapter 18: The Price of Warm Rooms — 3 locations, 24 proposed motion shots.
Chapter 19: A Sky Full of Borrowed Wings — 3 locations, 23 proposed motion shots.
Chapter 20: The Trial of the Witnesses — 3 locations, 27 proposed motion shots.
Chapter 21: The Clay That Refused the Mold — 3 locations, 23 proposed motion shots.
Chapter 22: Where the Choir Takes Breath — 3 locations, 26 proposed motion shots.
Chapter 23: The City Chooses Its Voices — 3 locations, 24 proposed motion shots.
Chapter 24: A Song With No Last Note — 3 locations, 28 proposed motion shots.

The 702 proposed shots are staging templates, not individually finished animation. Selected game dialogue recordings are available in engine2/voices; subtitle review clips do not claim a finished voice mix. subtitle_review contains independent WebVTT alternatives with source conditions and branch IDs, each beginning at zero. Do not concatenate mutually exclusive outcomes. Run build_subtitles.py after generation; validate_manifest.py checks both text and subtitle alternatives.
