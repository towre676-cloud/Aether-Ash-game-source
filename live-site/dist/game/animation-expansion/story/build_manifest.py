#!/usr/bin/env python3
"""Extract verbatim source text and propose reversible, noncanonical animation staging."""
import hashlib,json,pathlib,re,subprocess,sys
HERE=pathlib.Path(__file__).resolve().parent
ENGINE=HERE.parents[1]/'engine2'
def sha(b):return hashlib.sha256(b).hexdigest()
def node(js):return json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ENGINE,text=True))
def runtime():return node("import fs from 'node:fs';import{World}from './world.js';const d=JSON.parse(fs.readFileSync('world.json'));const w=new World(d);console.log(JSON.stringify(w.data));")
def literals(text):
 i=0
 while i<len(text):
  if text.startswith('//',i):
   e=text.find('\n',i);i=len(text) if e<0 else e+1;continue
  if text.startswith('/*',i):
   e=text.find('*/',i+2);i=len(text) if e<0 else e+2;continue
  if text[i] not in "'\"`":i+=1;continue
  start=i;q=text[i];i+=1
  while i<len(text):
   if text[i]=='\\':i+=2;continue
   if text[i]==q:i+=1;break
   i+=1
  token=text[start:i]
  if '${' not in token:yield start,i,token

def extract():
 source_names=['world.json','opening.js','exploration-content.js','exploration.js','campaign-content.js']
 sources={name:{'path':'engine2/'+name,'sha256':sha((ENGINE/name).read_bytes())} for name in source_names}
 data=runtime();raw=json.loads((ENGINE/'world.json').read_text());records=[];scenes=[]
 keys={'text','prompt','success','failure','locked','done','stage_text','entry_text','entry_pages','briefing','intro','clear','debrief','clue','memory','objective','discovery','journey_prompt','answer','wrong1','wrong2','options','name','title','landmark','relic','travel_label'}
 def add(value,prov,chapter=None,scene=None,field=None):
  if not value or not isinstance(value,str):return
  rid='line_'+sha((json.dumps(prov,sort_keys=True)+value).encode())[:20]
  records.append({'id':rid,'chapter':chapter,'scene':scene,'field':field,'text_verbatim':value,'text_sha256':sha(value.encode()),'provenance':prov})
  return rid
 def walk(v,ptr,prov,chapter,scene,field=None):
  ids=[]
  if isinstance(v,dict):
   for k,c in v.items():ids+=walk(c,ptr+'/'+k.replace('~','~0').replace('/','~1'),prov,chapter,scene,k)
  elif isinstance(v,list):
   for i,c in enumerate(v):ids+=walk(c,ptr+'/'+str(i),prov,chapter,scene,field)
  elif isinstance(v,str) and field in keys:
   rid=add(v,{**prov,'json_pointer':ptr},chapter,scene,field)
   if rid:ids.append(rid)
  return ids
 for i,s in enumerate(data['scenes']):
  sid=f"chapter_{s.get('chapter',1):02d}_{s['key']}_{s['location']}"
  orig=next((j for j,r in enumerate(raw['scenes']) if r['location']==s['location']),None)
  ids=walk(s,f'/scenes/{i}',{'kind':'runtime_snapshot','producer':'new World(world.json).data','source_dependencies':source_names},s.get('chapter'),sid)
  scenes.append({'id':sid,'chapter':s.get('chapter'), 'location_id':s['location'],'room_key':s['key'],'title_verbatim':s.get('title',s['key']),'source_world_scene_index':orig,'layout':{'width':s['width'],'height':s['height'],'floor_verbatim':s['floor'],'doors_verbatim':s.get('doors',[]),'objects_verbatim':s.get('objects',[])},'dialogue_record_ids':ids,'staging_status':'noncanonical animation direction; does not add dialogue or alter game events'})
 for i,m in enumerate(data['campaign']['missions']):
  for field in ['title','briefing','intro','clear','debrief','objective','discovery','journey_prompt']:
   if isinstance(m.get(field),str):add(m[field],{'kind':'runtime_snapshot','producer':'new World(world.json).data','json_pointer':f'/campaign/missions/{i}/{field}','source_dependencies':source_names},m['id'],None,field)
 # Preserve literal source strings that runtime entry/branch functions do not expose as data.
 text=(ENGINE/'opening.js').read_text();tokens=list(literals(text));decoded=node('const t='+json.dumps([t[2] for t in tokens])+";console.log(JSON.stringify(t.map(v=>Function('return ('+v+')')())));")
 for (a,b,token),value in zip(tokens,decoded):
  if len(value)>=35 and (' ' in value) and (re.search(r'[A-Z]{3,}:',value) or len(value)>=65):
   add(value,{'kind':'js_string_literal','path':'engine2/opening.js','start_character':a,'end_character':b,'line_start':text.count('\n',0,a)+1,'raw_literal':token},None,'opening_source_branch','source_literal')
 # Interpolated template literals remain exact raw source, explicitly not voice-ready.
 templates=[]
 for m in re.finditer(r'`(?:\\.|[^`])*`',text,re.S):
  if '${' in m.group():templates.append({'path':'engine2/opening.js','line_start':text.count('\n',0,m.start())+1,'raw_template_verbatim':m.group(),'status':'requires runtime branch resolution; never read interpolation as dialogue'})
 return sources,data,records,scenes,templates

def build():
 sources,data,records,scenes,templates=extract();chapters=[];shot_total=0
 byid={r['id']:r for r in records}
 for m in data['campaign']['missions']:
  chapter_scenes=[s for s in scenes if s['chapter']==m['id']];shots=[];cursor=0
  for s in chapter_scenes:
   # One establishing motion shot per actual location; dialogue beats use exact source IDs.
   planned=[{'kind':'establish','duration':4,'dialogue_ids':[],'action':'Animate the lead actor entering along the supplied walkable floor; hold all exit positions to layout coordinates.','camera':'Wide, slow horizontal track; no invented room beyond supplied layout.'}]
   for rid in s['dialogue_record_ids']:
    r=byid[rid]
    if r['field'] not in ['text','prompt','entry_text','entry_pages','success','stage_text']:continue
    dur=max(3,min(18,round(len(r['text_verbatim'].split())/2.4+1,2)))
    planned.append({'kind':'source_dialogue','duration':dur,'dialogue_ids':[rid],'action':'Animate speaking mouth shapes, a breathing cycle and a motivated listening reaction; speaker is unresolved unless explicitly named in source.','camera':'Medium or two-shot; preserve geography and avoid changing branch outcome.'})
   planned.append({'kind':'transition','duration':3,'dialogue_ids':[],'action':'Animate the actor departing toward an existing exit only after its game conditions pass.','camera':'Track to the existing exit; cut before any unseen connecting route.'})
   for j,p in enumerate(planned):
    dur=p.pop('duration');shots.append({'id':s['id']+f'_shot_{j+1:03d}','scene':s['id'],'start':round(cursor,2),'end':round(cursor+dur,2),'duration_seconds':dur,'status':'proposed continuous character-motion shot; not rendered animation','canon_status':'noncanonical staging only','asset_binding':'unbound; do not silently map apprentice/mechanic to named canon characters',**p});cursor+=dur
  chapters.append({'id':m['id'],'title_verbatim':m['title'],'story_id':m.get('story_id'),'scene_ids':[s['id'] for s in chapter_scenes],'shots':shots,'proposed_coverage_seconds':round(cursor,2),'timing_note':'Independent coverage inventory, not a linear edit. Mutually exclusive choices and interaction order require game-state-aware assembly.'});shot_total+=len(shots)
 out={'schema':'ash-aether.animation-story/1','status':'verbatim canon extraction plus noncanonical animation staging; no rendered footage','source_files':sources,'compatibility':{'other_session_scene':'workshop_first_sound','other_session_format_version':1,'reserved_other_session_scope':'workshop_first_sound; apprentice, mechanic, ceramic/brass creature concept studies','binding_policy':'No identity equivalence assumed between concept labels and canon characters. Existing proposed dialogue That sound... step away from the bench. is not promoted to canon.','timing_fields':['start','end','camera'],'runtime_integration':'No game flags, scene coordinates, canonical dialogue or runtime behavior changed.'},'counts':{'chapters':len(chapters),'scenes':len(scenes),'verbatim_text_records':len(records),'planned_motion_shots':shot_total,'runtime_template_sources_needing_resolution':len(templates)},'chapters':chapters,'scenes':scenes,'text_records':records,'unresolved_templates':templates}
 (HERE/'story_manifest.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 (HERE/'runtime_snapshot.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
 lines=['# Animation story coverage — exact canon and proposed motion staging','',json.dumps(out['counts']), '', 'All text under `text_verbatim` is extracted without rewriting. Source dependencies are hashed. `runtime_snapshot` records refer to the engine-expanded world, including the earned opening and 24 exploration interiors. `js_string_literal` records retain exact literal offsets and raw spelling. The manifest does not claim every extracted string is spoken dialogue: fields distinguish prompts, labels, notes, rewards and spoken text.','', 'Shot actions, camera directions and timings are NONCANONICAL production staging. They are planning data, not rendered footage, layered character rigs or lip-sync. Choice-specific records are an inventory and must not be concatenated into one linear film. Runtime templates with interpolation remain unresolved until the corresponding branch executes.','', 'The other session’s workshop_first_sound is reserved. Its apprentice/mechanic/creature artwork cannot be relabeled Sable/Rook/a named enemy without identity review. No invented dialogue from that study is added to canonical scripts.','', 'Run `python build_manifest.py` to regenerate and `python validate_manifest.py` to verify source hashes, exact text, layout coordinates, record references and all 24 chapters.','']
 for c in chapters:lines.append(f"Chapter {c['id']:02d}: {c['title_verbatim']} — {len(c['scene_ids'])} locations, {len(c['shots'])} proposed motion shots.")
 lines.extend(['', 'The 702 proposed shots are staging templates, not individually finished animation. Selected game dialogue recordings are available in engine2/voices; subtitle review clips do not claim a finished voice mix. subtitle_review contains independent WebVTT alternatives with source conditions and branch IDs, each beginning at zero. Do not concatenate mutually exclusive outcomes. Run build_subtitles.py after generation; validate_manifest.py checks both text and subtitle alternatives.'])
 (HERE/'README.md').write_text('\n'.join(lines)+'\n');print(json.dumps(out['counts']))
 if (HERE/'build_subtitles.py').exists():subprocess.run([sys.executable,str(HERE/'build_subtitles.py')],check=True)
if __name__=='__main__':build()
