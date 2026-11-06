# Canonical cast and creature animation production specification

This package preserves source speaker labels, exact dialogue evidence and source hashes. It separates canonical identities and gameplay timing from proposed motion, rig layers and visual interpretation. Prototype apprentice/mechanic/ceramic-creature art is not silently renamed as Sable/Rook/a companion. No creature mesh, mouth chart, rig or rendered action is claimed here.

Open `cast-animation-manifest.json` for the full roster, exact source evidence, normalized portrait/ground anchors, layers, wardrobe constraints, action states, windup/strike/recovery windows and interrupt rules. Authored guardian/patrol names are a narrative layer; the actual enhanced runtime currently uses six creature archetypes. Creating 24 guardian specifications does not create 24 models. Existing telegraph and damage timing remain authoritative.

Sable begins as a solo civilian without unearned armor, weapon or Mako. Render variants must follow the saved story flags. Affinity and enemy effect colors are not costume palette claims. Archive recordings and disembodied voices should use audio-driven lighting unless a canonical visible body is verified.

Run `python3 build_cast.py` to reproduce this manifest from the current source and `python3 validate_cast.py` to check source hashes, evidence pointers, identity uniqueness, state references, timing and progression constraints. These are production specifications ready for drawing/rigging, not delivered animation footage.

{
  "speaker_identity_count": 56,
  "named_person_count": 15,
  "runtime_creature_archetypes": 6,
  "authored_guardian_names": 24,
  "authored_patrol_names": 31,
  "actor_states": 22,
  "monster_states": 12,
  "character_state_assignments": 1102,
  "monster_state_assignments": 402,
  "new_rendered_animation_frames": 0
}
