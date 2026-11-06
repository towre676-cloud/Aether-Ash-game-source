#!/usr/bin/env python3
"""Standalone source-line subtitle reviews; alternatives are NEVER a single playlist."""
import html,json,pathlib,re,shutil
HERE=pathlib.Path(__file__).resolve().parent
FIELDS={'text','prompt','success','failure','locked','done','stage_text','entry_text','entry_pages','options','briefing','intro','clear','debrief','memory','clue'}
FLAGS=['requires','requires_flags','appears_when','disabled_by','bit','flag_address','choice_id','choice_effects','stage_flag','lock','hidden','storyEvent','exploreId']
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d}.{ms%1000:03d}'
def build():
 m=json.loads((HERE/'story_manifest.json').read_text());snapshot=json.loads((HERE/'runtime_snapshot.json').read_text());root=HERE.parents[3]/'development'/'animation-story'/'subtitle_review'
 if root.exists():shutil.rmtree(root)
 root.mkdir(parents=True);indexes=[];clip_count=0
 for scene in m['scenes']:
  target=root/scene['id'];target.mkdir(exist_ok=True);clips=[]
  for r in m['text_records']:
   if r['scene']!=scene['id'] or r['field'] not in FIELDS:continue
   ptr=r['provenance'].get('json_pointer','');match=re.match(r'/scenes/(\d+)/objects/(\d+)(/.*)',ptr);condition={'branch_id':r['id'],'source_field':r['field'],'assembly_rule':'standalone alternative; do not auto-concatenate with other clips'}
   if match:
    o=snapshot['scenes'][int(match[1])]['objects'][int(match[2])];condition['object_pointer']=f'/scenes/{match[1]}/objects/{match[2]}';condition['object_type']=o['type'];condition['source_conditions_verbatim']={k:o[k] for k in FLAGS if k in o};condition['outcome_class']={'success':'successful interaction only','failure':'failed interaction only','locked':'requirements unmet only','done':'already-completed interaction only','options':'choice UI text; not assumed spoken'}.get(r['field'],'source object interaction; runtime ordering required')
    if 'options' in ptr:condition['choice_option_index']=int(ptr.rsplit('/',1)[-1])
   else:condition['outcome_class']='scene entry text; runtime once-only and story conditions apply'
   paragraphs=re.split(r'(\n\n+)',r['text_verbatim']);parts=[p for i,p in enumerate(paragraphs) if i%2==0 and p];duration=max(3,round(len(r['text_verbatim'].split())/2.4+1,3));weights=[max(1,len(p.split())) for p in parts];total=sum(weights)or 1;cursor=0;cues=[];vtt=['WEBVTT','',f'NOTE REVIEW TIMING; not a final voice-aligned subtitle track. Source {r["id"]}; sha256 {r["text_sha256"]}', '']
   for j,(part,weight) in enumerate(zip(parts,weights)):
    end=duration if j==len(parts)-1 else cursor+duration*weight/total;vtt += [str(j+1),f'{stamp(cursor)} --> {stamp(end)}',html.escape(part,quote=False),''];cues.append({'start':round(cursor,3),'end':round(end,3),'text_verbatim':part});cursor=end
   filename=r['id']+'.vtt';(target/filename).write_text('\n'.join(vtt));clips.append({'record_id':r['id'],'file':filename,'text_verbatim':r['text_verbatim'],'text_sha256':r['text_sha256'],'provenance':r['provenance'],'condition':condition,'duration_seconds':duration,'cues':cues,'paragraph_separators_verbatim':[p for i,p in enumerate(paragraphs) if i%2==1]});clip_count+=1
  index={'schema':'ash-aether.subtitle-review/1','scene':scene['id'],'status':'independent review clips; proposed timing; no recorded dialogue; mutually exclusive branches not assembled','clips':clips};(target/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n');indexes.append({'scene':scene['id'],'index':scene['id']+'/index.json','clip_count':len(clips)})
 out={'schema':'ash-aether.subtitle-review-catalogue/1','status':'review-only subtitle timing, not an edit or voice recording','scene_count':len(indexes),'standalone_clip_count':clip_count,'scenes':indexes};(root/'index.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'subtitle_review_scenes':len(indexes),'standalone_vtt_clips':clip_count}))
if __name__=='__main__':build()
