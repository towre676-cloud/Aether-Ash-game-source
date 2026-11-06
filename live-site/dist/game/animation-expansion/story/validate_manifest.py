#!/usr/bin/env python3
"""Fail closed if canon extraction, source evidence or motion coverage has drifted."""
import hashlib,json,pathlib,sys
from build_manifest import ENGINE,HERE,extract,sha
m=json.loads((HERE/'story_manifest.json').read_text());sources,data,records,scenes,templates=extract()
assert m['source_files']==sources,'Canonical source files changed; regenerate before claiming current coverage.'
assert m['text_records']==records,'Text/provenance mismatch: extracted text was changed or omitted.'
assert m['scenes']==scenes,'Scene layout or source references changed.'
assert json.loads((HERE/'runtime_snapshot.json').read_text())==data,'Runtime snapshot mismatch.'
ids=[r['id'] for r in records];assert len(ids)==len(set(ids)), 'Duplicate record IDs'
byid={r['id']:r for r in records};byscene={s['id']:s for s in scenes}
assert set(c['id'] for c in m['chapters'])==set(range(1,25)),'All 24 chapters must be covered.'
count=0
for c in m['chapters']:
 expected={s['id'] for s in scenes if s['chapter']==c['id']}
 assert set(c['scene_ids'])==expected
 last=0
 for shot in c['shots']:
  assert shot['scene'] in expected
  assert shot['start']==round(last,2)
  assert shot['end']>shot['start'] and abs(shot['end']-shot['start']-shot['duration_seconds'])<.001
  assert shot['canon_status']=='noncanonical staging only'
  assert 'rendered' in shot['status']
  for rid in shot['dialogue_ids']:
   assert rid in byid and byid[rid]['scene']==shot['scene']
   assert byid[rid]['field'] in ['text','prompt','entry_text','entry_pages','success','stage_text']
  last=shot['end'];count+=1
 assert round(last,2)==c['proposed_coverage_seconds']
assert count==m['counts']['planned_motion_shots']
assert len(scenes)==86 and sum(1 for s in scenes if s['room_key'].startswith('secret_'))==24
assert sum(o['type']=='secret' for s in scenes for o in s['layout']['objects_verbatim'])==72
print(json.dumps({'status':'PASS','source_files_verified':len(sources),'chapters':24,'scenes':len(scenes),'verbatim_records_verified':len(records),'motion_shots_checked':count,'hidden_cache_records':72}))
# Each subtitle file is an independent source alternative, never a combined branch playlist.
import html,re
catalogue=json.loads((HERE/'subtitle_review/index.json').read_text());assert catalogue['scene_count']==86
clip_total=0;outcomes=set()
for index in catalogue['scenes']:
 folder=HERE.parents[3]/'development/animation-sources/story/subtitle_review'/index['scene'];sub=json.loads((folder/'index.json').read_text());assert sub['scene'] in byscene
 assert len(sub['clips'])==index['clip_count']
 for clip in sub['clips']:
  original=byid[clip['record_id']];assert clip['text_verbatim']==original['text_verbatim']
  assert clip['text_sha256']==sha(clip['text_verbatim'].encode())
  assert clip['condition']['branch_id']==clip['record_id']
  assert 'do not auto-concatenate' in clip['condition']['assembly_rule']
  vtt=(folder/clip['file']).read_text();assert vtt.startswith('WEBVTT\n') and 'not a final voice-aligned subtitle track' in vtt
  expected_parts=[p for i,p in enumerate(re.split(r'(\n\n+)',original['text_verbatim'])) if i%2==0 and p]
  assert [cue['text_verbatim'] for cue in clip['cues']]==expected_parts
  for cue in clip['cues']:assert html.escape(cue['text_verbatim'],quote=False) in vtt
  outcomes.add(clip['condition']['outcome_class']);clip_total+=1
assert clip_total==978==catalogue['standalone_clip_count']
assert {'successful interaction only','failed interaction only','requirements unmet only','already-completed interaction only','choice UI text; not assumed spoken'}<=outcomes
print(json.dumps({'subtitle_status':'PASS','review_scenes':86,'standalone_vtt_clips':clip_total,'outcome_classes_kept_separate':len(outcomes)}))
