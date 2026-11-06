#!/usr/bin/env python3
import json,hashlib
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]/'engine2'
m=json.loads((HERE/'cast-animation-manifest.json').read_text())
for filename,info in m['source_hashes'].items():assert hashlib.sha256((ROOT/filename).read_bytes()).hexdigest()==info['sha256'],filename
world=json.loads((ROOT/'world.json').read_text())
def pointer(root,path):
 for p in path.split('/')[1:]:
  p=p.replace('~1','/').replace('~0','~');root=root[int(p)] if isinstance(root,list) else root[p]
 return root
for a in m['actors']:
 for e in a['evidence']:
  if 'json_pointer'in e:assert pointer(world,e['json_pointer'])==e['verbatim']
  else:assert (ROOT/e['source']).read_text().splitlines()[e['line']-1]==e['verbatim_source_line']
ids=[a['id']for a in m['actors']];assert len(ids)==len(set(ids))
state_ids={s['id']for s in m['actor_state_library']}
for a in m['actors']:
 assert set(a['proposed_animation']['state_ids'])<=state_ids
 assert a['proposed_animation']['anchor']==[.5,1.0]
 assert a['proposed_animation']['costume_palette']is None
monster_ids=[a['id']for a in m['monsters']];assert len(monster_ids)==len(set(monster_ids))
ms={s['id']for s in m['monster_state_library']}
for a in m['monsters']:assert set(a['animation_states'])<=ms;assert a['rendered_frames']==0
for s in m['actor_state_library']+m['monster_state_library']:
 assert s['duration_ms']>0
 if 'phases'in s:
  assert s['phases'][0]['start_ms']==0
  assert s['phases'][-1]['end_ms']==s['duration_ms']
  for a,b in zip(s['phases'],s['phases'][1:]):assert a['end_ms']==b['start_ms']
sable=next(a for a in m['actors']if a['source_label']=='SABLE');assert 'solo civilian'in sable['progression_constraints'][0]
assert m['compatibility']['proposed_art_aliases']['apprentice']['approved']is False
assert m['summary']['authored_guardian_names']==24
assert m['summary']['runtime_creature_archetypes']==6
assert m['summary']['new_rendered_animation_frames']==0
print(f'PASS: source hashes, exact dialogue evidence, {len(ids)} speaker identities, creature references, timing, progression and unapproved prototype aliases.')
clips=json.loads((HERE/'motion-clips.json').read_text());cids=[c['id']for c in clips['clips']];assert len(cids)==len(set(cids))==clips['clip_count']
for clip in clips['clips']:
 assert clip['actor']in set(ids)|set(monster_ids)
 assert clip['duration_ms']>0
 for track in clip['tracks']:
  assert track['keys'][0]['ms']==0 and track['keys'][-1]['ms']==clip['duration_ms']
  assert all(a['ms']<=b['ms']for a,b in zip(track['keys'],track['keys'][1:]))
  assert all(isinstance(k['value'],(int,float))for k in track['keys'])
print(f'PASS: {len(cids)} numerical motion clips, unique IDs, actor references, monotonic timestamps and valid track endpoints.')
