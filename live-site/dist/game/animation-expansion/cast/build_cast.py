#!/usr/bin/env python3
"""Extract canonical identity/evidence, keep proposed animation staging separate."""
import json,re,hashlib,subprocess
from pathlib import Path
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]/'engine2'
# OUT = game/animation-expansion/cast; engine2 is its sibling through game.
ROOT=OUT.parents[1]/'engine2'
def load(name):return json.loads((ROOT/name).read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def ptr(v,path=''):
 if isinstance(v,dict):
  for k,x in v.items():yield from ptr(x,path+'/'+str(k).replace('~','~0').replace('/','~1'))
 elif isinstance(v,list):
  for i,x in enumerate(v):yield from ptr(x,path+'/'+str(i))
 elif isinstance(v,str):yield path,v
world=load('world.json')
js={n:(ROOT/n).read_text() for n in ['opening.js','mako.js','battle.js','presentation.js','exploration-content.js']}
node="import{CREW,CORES}from './mako.js';import{ROLE_INFO}from './battle.js';console.log(JSON.stringify({CREW,CORES,ROLE_INFO}));"
runtime=json.loads(subprocess.check_output(['node','--input-type=module','-e',node],cwd=ROOT,text=True))
sources={str(p.relative_to(ROOT)):{'sha256':sha(p),'bytes':p.stat().st_size}for p in [ROOT/'world.json',*[ROOT/n for n in js]]}
evidence={}
nonpeople={'NEXT','FIRST','FIRST PATTERN','HYDROPHONE','DYLETZKY INDEX'}
for path,text in ptr(world):
 for m in re.finditer(r'(?:^|\n)([A-Z][A-Z’\x27 -]{1,28}):',text):
  name=m.group(1)
  if name not in nonpeople:evidence.setdefault(name,[]).append({'source':'world.json','json_pointer':path,'verbatim':text})
for source,text in js.items():
 for lineno,line in enumerate(text.splitlines(),1):
  for m in re.finditer(r"(?:[\x27\"`]|\\n)([A-Z][A-Z’ -]{1,28}):",line):
   name=m.group(1)
   if name not in nonpeople:evidence.setdefault(name,[]).append({'source':source,'line':lineno,'verbatim_source_line':line})
# Duplicate world campaign rooms and flattened scenes are intentionally retained as evidence, not different identities.
proper={'SABLE','IONA','ROOK','BRASS','RIVEN','MIRA','VEYR','MARA','NELL','DARA','HESPER','CORIN','LARK','OREN','TILLY'}
monster_tags={'CHAINMASTER','CHOIR HAND','CHOIR LUNG','COMMANDER','FALSE JUDGE','GLASS CHILD','HOLLOW CROWN','HOMEKEEPER','INDEX SHADE','MUTE GIANT','RAIL WARDEN','REDACTOR','SENTINEL','SILT CROWN','SKY MARSHAL','STAR READER','THE CHOIR','TOLLKEEPER','WIND BAILIFF','WIREMOTHER'}
voices={'CLAY MEMORY','MOTHER','ECHO'}
crew_by={c['name'].upper():(i,c) for i,c in enumerate(runtime['CREW'])}
cores={c['id']:c for c in runtime['CORES']}
base_states=[('idle',2400,True,'breathing, eye focus; hands stay registered'),('blink',180,False,'matched eyelid drawings only'),('listen',1800,True,'eye-line change and restrained head settle'),('speak',1200,True,'phoneme-driven mouth poses when recorded speech exists; otherwise held acting, never random flap'),('walk',720,True,'four contact phases; feet planted at contact'),('run',480,True,'faster contact cycle; preserve gait direction'),('turn',320,False,'head leads shoulders, body, then feet'),('reach',800,False,'anticipation, extend elbow, hand makes exact prop contact'),('hand_over',1000,False,'maintain prop ownership at one transfer frame'),('inspect',1600,False,'reach, hold gaze, return prop without costume drift'),('alarm',600,False,'eye focus before shoulder recoil'),('grief',2400,True,'lower gaze, one breath, no compulsory tears'),('resolve',1200,False,'settle weight and meet partner eye-line'),('attack',450,False,'matches existing basic hero pose window; collision stays engine-owned'),('cast',700,False,'matches existing cast pose window; no added resource or attack effect'),('guard',700,False,'weight shifts behind arm or available tool; no invented shield'),('hit',300,False,'recoil from impact direction; baseline feet retained'),('knockdown',900,False,'controlled fall, then held incapacitated pose; no gore'),('recover',950,False,'supported rise after engine revive only'),('celebrate',1500,False,'character-specific restrained release after confirmed victory')]
profiles=[]
for tag,ev in sorted(evidence.items()):
 kind='named_person' if tag in proper else 'authored_antagonist_speaker' if tag in monster_tags else 'recorded_or_disembodied_voice' if tag in voices else 'role_labeled_speaker'
 rec={'id':'speaker.'+tag.lower().replace(' ','_'),'source_label':tag,'display_name':tag.title(),'identity_status':'source_label_only_no_alias_conflation','kind':kind,'evidence_count':len(ev),'evidence':ev,'proposed_animation':{'status':'production_specification_not_rendered_animation','state_ids':['actor.'+s[0] for s in base_states],'anchor':[0.5,1.0],'coordinate_system':'normalized portrait canvas, bottom center; feet ground contact separate from face pivots','required_layers':['rear_hair','neck','torso','head','front_hair','eyes','upper_eyelids','lower_eyelids','mouth','upper_arm_L','forearm_L','hand_L','upper_arm_R','forearm_R','hand_R','prop_front','prop_back'],'required_landmarks':['crown','chin','eye_L','eye_R','nose_tip','mouth_center','neck_base','shoulder_L','shoulder_R','elbow_L','elbow_R','wrist_L','wrist_R','hip_center','foot_L_contact','foot_R_contact'],'expressions':['neutral','warm','concerned','alarmed','angry','grieving','resolved'],'costume_palette':None,'palette_status':'not extracted; do not mistake affinity effect colors for costume colors'}}
 if tag in crew_by:
  i,c=crew_by[tag];rec['gameplay']={'crew_index':i,**c,'affinity_effect_color':cores[c['affinity']]['color'],'source':'mako.js','costume_color_claim':False}
 if tag=='SABLE':rec['progression_constraints']=['New Game: solo civilian, no armor, no weapon, no Mako, money or unexplained companions.','Do not render the armored/armed phase until state.story.weapon/state.story.armor are actually earned.','First core is Earth/Focus at story.firstCore; use state.story and actual equipped loadout for later variants.','Keep civilian/weapon/armor/conductor layers independently switchable.'];rec['evidence'].append({'source':'opening.js','line':next(i for i,l in enumerate(js['opening.js'].splitlines(),1) if 'export function newStory' in l),'verbatim_source_line':next(l for l in js['opening.js'].splitlines() if 'export function newStory' in l)})
 if tag in voices:rec['proposed_animation']['state_ids']=['voice.waveform','voice.light_response'];rec['proposed_animation']['body_required']=False
 profiles.append(rec)
actor_states=[]
for name,duration,loop,motion in base_states:
 actor_states.append({'id':'actor.'+name,'duration_ms':duration,'loop':loop,'motion':motion,'timing_status':'proposed_except_attack_cast_hit_match_existing_pose_windows','root_motion':'visual_only; world position owned by engine','frames':[{'at_ms':0,'phase':'anticipation'},{'at_ms':round(duration*.25),'phase':'action'},{'at_ms':round(duration*.55),'phase':'settle'},{'at_ms':duration,'phase':'return_or_hold'}]})
actor_states += [{'id':'voice.waveform','duration_ms':1600,'loop':True,'motion':'audio-driven amplitude only; stop when actual cue ends','timing_status':'proposed'},{'id':'voice.light_response','duration_ms':1600,'loop':True,'motion':'light follows audio envelope; no face invented for recorded voice','timing_status':'proposed'}]
# Enemy animation durations explicitly separate telegraph from cosmetic follow-through.
monster_states=[]
for name,ms,loop in [('idle',2200,True),('locomote',700,True),('intent_guard',1200,False),('intent_repair',1200,False),('intent_strike',1200,False),('intent_alarm',2400,False),('intent_boss',1800,False),('strike',650,False),('hit',300,False),('interrupt',400,False),('defeat',1000,False),('reinforce',800,False)]:
 monster_states.append({'id':'monster.'+name,'duration_ms':ms,'loop':loop,'timing_status':'engine_window' if name.startswith('intent') or name in ['strike','hit'] else 'proposed_cosmetic','phases':[{'phase':'windup','start_ms':0,'end_ms':round(ms*.3)},{'phase':'active_or_peak','start_ms':round(ms*.3),'end_ms':round(ms*.55)},{'phase':'recover','start_ms':round(ms*.55),'end_ms':ms}],'gameplay_rule':'Engine intent.left/total determines actual windup and damage moment; visual phases must be stretched to it. Cosmetic recovery never delays or repeats damage.','interrupt_rule':'Cut intent animation at interrupt event; cancel unexecuted hit; recover without a strike.'})
monsters=[]
for role,info in runtime['ROLE_INFO'].items():
 rec={'id':'runtime.'+role,'name':info['name'],'identity_layer':'actual_enhanced_runtime_archetype','source':{'file':'battle.js','line':3,'verbatim_source_line':js['battle.js'].splitlines()[2]},'role':role,'sprite_row':info['sprite'],'effect_color':info['color'],'costume_palette_status':'effect color only; match existing creature atlas before approving paint','animation_states':[s['id'] for s in monster_states],'anchor':[.5,1],'proposed_motion_character':{'guard':'grounded antler/shield brace, heavy forefoot contact','scout':'alert head and wing flare; alarm emission before reinforcement','mender':'porcelain hands cup the repair pulse; no attack on healing target','predator':'low stalk, compressed haunch, lateral pounce','boss':'large anchored conduit structure; active emitter pivots, body stays grounded','wyrm':'segmented traveling body wave, head leads; tail cannot teleport'}[role],'required_layers':['body_core','head','eye_L','eye_R','jaw_or_emitter','forelimb_L','forelimb_R','hindlimb_L','hindlimb_R','tail_or_conduit','armor_shell','damage_overlays'],'articulation_status':'proposed; adapt layers to approved silhouette rather than inventing anatomy','rendered_frames':0}
 monsters.append(rec)
phase0=['Charging conduit','Measuring the weak','Gathering storm','Shield rattle','Distortion pulse','Iron bell','Furnace breath','Choir inhalation'];phase1=['Fracture beam','Predator verdict','Storm crown','Rupture claw','Gravity well','Iron horizon','Ashfall','Choir crescendo'];shapes=['line','burst','line','single','burst','line','burst','line']
for i,m in enumerate(world['campaign']['missions']):
 monsters.append({'id':f'authored.guardian.{m["id"]:02d}','name':m['enemy_name'],'identity_layer':'authored_story_guardian_not_distinct_runtime_mesh','chapter':m['id'],'chapter_title':m['title'],'source':{'file':'world.json','json_pointer':f'/campaign/missions/{i}/enemy_name','verbatim':m['enemy_name']},'intro_verbatim':m['intro'],'intro_source_pointer':f'/campaign/missions/{i}/intro','runtime_binding':{'actual_role':'wyrm' if m['id']%3==0 else 'boss','distinct_named_mesh_exists':False,'note':'Authored guardian names and runtime creature archetypes are different naming layers; do not claim 24 unique implemented models.'},'intent':{'windup_ms':1800,'shape':shapes[(m['id']-1)%8],'first_phase_label':phase0[(m['id']-1)%8],'second_phase_label':phase1[(m['id']-1)%8],'phase_change_condition':'hp < maxHp * .5','source':'battle.js planEnemy'},'animation_states':['monster.idle','monster.intent_boss','monster.strike','monster.hit','monster.interrupt','monster.defeat'],'proposed_design_status':'requires individual silhouette design and narrative review; title alone is not anatomy','rendered_frames':0})
patrol={}
for path,text in ptr(world):
 if '/stats/' in path and path.endswith('/name'):patrol.setdefault(text,[]).append({'file':'world.json','json_pointer':path,'verbatim':text})
for name,ev in sorted(patrol.items()):monsters.append({'id':'authored.patrol.'+re.sub('[^a-z0-9]+','_',name.lower()).strip('_'),'name':name,'identity_layer':'authored_patrol_stat_name','source_evidence':ev,'runtime_binding_status':'runtime encounterEnemies chooses role palette; not a unique mesh guarantee','animation_states':['monster.idle','monster.locomote','monster.intent_strike','monster.strike','monster.hit','monster.defeat'],'rendered_frames':0})
compat={'source_pack':'/workspace/scratch/566336337516/animation_pack','source_manifest_sha256':sha(Path('/workspace/scratch/566336337516/animation_pack/manifest.json')),'portrait_canvas':[1024,1024],'portrait_anchor':[.5,1],'background_canvas':[1920,1080],'proposed_art_aliases':{'apprentice':{'candidate':'speaker.sable','approved':False,'reason':'Other pack explicitly says proposed designs have not been reconciled with canonical cast.'},'mechanic':{'candidate':'speaker.rook','approved':False,'reason':'Same; preserve identity uncertainty instead of asserting canonical match.'},'creature':{'candidate':None,'approved':False,'reason':'Proposed ceramic companion has no verified canonical counterpart.'}},'do_not':['Do not relabel prototype apprentice, mechanic or ceramic creature as canon without reconciliation.','Do not animate whole-face stretching or random speech mouth cycling.','Do not introduce compulsory companions, gear or plot events through a cinematic.'],'remaining_production':['Approve design identity matches','Create layer-separated art and paint occluded surfaces','Register pivots and foot contact','Create matched mouth/eyelid drawings','Rig, render and test actual motion','Review costume/prop continuity at phone size']}
summary={'speaker_identity_count':len(profiles),'named_person_count':sum(p['kind']=='named_person' for p in profiles),'runtime_creature_archetypes':len(runtime['ROLE_INFO']),'authored_guardian_names':24,'authored_patrol_names':len(patrol),'actor_states':len(actor_states),'monster_states':len(monster_states),'character_state_assignments':sum(len(p['proposed_animation']['state_ids']) for p in profiles),'monster_state_assignments':sum(len(p['animation_states']) for p in monsters),'new_rendered_animation_frames':0}
payload={'schema':'ash.animation-cast/1','source_hashes':sources,'scope':'Canonical extraction and proposed animation production specification. Not rendered motion or game integration.','summary':summary,'compatibility':compat,'actors':profiles,'actor_state_library':actor_states,'monsters':monsters,'monster_state_library':monster_states}
(OUT/'cast-animation-manifest.json').write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n')
(OUT/'README.md').write_text('''# Canonical cast and creature animation production specification

This package preserves source speaker labels, exact dialogue evidence and source hashes. It separates canonical identities and gameplay timing from proposed motion, rig layers and visual interpretation. Prototype apprentice/mechanic/ceramic-creature art is not silently renamed as Sable/Rook/a companion. No creature mesh, mouth chart, rig or rendered action is claimed here.

Open `cast-animation-manifest.json` for the full roster, exact source evidence, normalized portrait/ground anchors, layers, wardrobe constraints, action states, windup/strike/recovery windows and interrupt rules. Authored guardian/patrol names are a narrative layer; the actual enhanced runtime currently uses six creature archetypes. Creating 24 guardian specifications does not create 24 models. Existing telegraph and damage timing remain authoritative.

Sable begins as a solo civilian without unearned armor, weapon or Mako. Render variants must follow the saved story flags. Affinity and enemy effect colors are not costume palette claims. Archive recordings and disembodied voices should use audio-driven lighting unless a canonical visible body is verified.

Run `python3 build_cast.py` to reproduce this manifest from the current source and `python3 validate_cast.py` to check source hashes, evidence pointers, identity uniqueness, state references, timing and progression constraints. These are production specifications ready for drawing/rigging, not delivered animation footage.

'''+json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary))
