#!/usr/bin/env python3
"""Deterministic transform curves for future approved layered rigs, not generated frames."""
import json,math
from pathlib import Path
H=Path(__file__).resolve().parent
m=json.loads((H/'cast-animation-manifest.json').read_text())
signatures={
'SABLE':{'cadence':1.06,'amplitude':.82,'gesture':'eye-line leads hand; civilian and equipped layers remain separate'},
'IONA':{'cadence':.94,'amplitude':.72,'gesture':'open palm, direct eye-line; support gestures point to the recipient'},
'ROOK':{'cadence':.87,'amplitude':.68,'gesture':'small economical wrists; weight settles before precision work'},
'BRASS':{'cadence':.82,'amplitude':.6,'gesture':'grounded stance; chest turns before the hand extends'},
'RIVEN':{'cadence':1.04,'amplitude':1.0,'gesture':'flowing counter-rotation and delayed hand follow-through'},
'MIRA':{'cadence':1.16,'amplitude':.9,'gesture':'quick eye checks, light directional changes; settle after action'},
'VEYR':{'cadence':.98,'amplitude':.64,'gesture':'held silhouette, controlled hand articulation and measured gaze'}}
# Proposed screen-space control rig, stable pivots; no image deformation until anatomical registration.
rig={'coordinates':'normalized 1024x1024 portrait, bottom-center canvas anchor','rotation_unit':'degrees','translation_unit':'fraction_of_canvas','root_anchor':[.5,1], 'controls':{
'root':[.5,.93],'torso':[.5,.65],'head':[.5,.36],'gaze':[.5,.32],'shoulder_L':[.35,.54],'shoulder_R':[.65,.54],'elbow_L':[.28,.68],'elbow_R':[.72,.68],'hand_L':[.3,.81],'hand_R':[.7,.81],'lid_L':[.445,.33],'lid_R':[.555,.33],'mouth':[.5,.42]},'registration_status':'reference control layout only; replace with approved character-specific landmarks; never warp whole illustration to these coordinates'}
shapes={
'idle':{'torso.ty':[0,-.002,0,.002,0],'head.rotate':[0,.5,0,-.5,0]},
'blink':{'lid_L.closed':[0,1,1,.3,0],'lid_R.closed':[0,1,1,.3,0]},
'listen':{'head.rotate':[0,-2,-2,-1,0],'gaze.tx':[0,.008,.008,.004,0]},
'speak':{'head.rotate':[0,1.5,0,-1,0],'hand_R.rotate':[0,-5,-8,-3,0]},
'walk':{'root.ty':[0,-.008,0,-.008,0],'torso.rotate':[-2,0,2,0,-2],'hand_L.rotate':[-12,0,12,0,-12],'hand_R.rotate':[12,0,-12,0,12]},
'run':{'root.ty':[0,-.016,0,-.016,0],'torso.rotate':[-4,1,4,1,-4],'hand_L.rotate':[-24,0,24,0,-24],'hand_R.rotate':[24,0,-24,0,24]},
'turn':{'gaze.tx':[0,.014,.018,.018,.018],'head.rotate':[0,3,8,10,10],'torso.rotate':[0,0,3,7,7]},
'reach':{'torso.rotate':[0,-2,3,2,0],'hand_R.tx':[0,-.01,.065,.07,0],'hand_R.ty':[0,.006,-.035,-.04,0]},
'hand_over':{'hand_R.tx':[0,-.01,.08,.08,0],'hand_R.ty':[0,.005,-.025,-.025,0]},
'inspect':{'head.rotate':[0,4,7,6,0],'hand_R.ty':[0,-.02,-.08,-.08,0],'gaze.ty':[0,.01,.015,.015,0]},
'alarm':{'root.ty':[0,.004,-.008,-.003,0],'head.rotate':[0,-4,-3,-1,0],'hand_L.rotate':[0,-7,-13,-6,0]},
'grief':{'head.rotate':[0,4,7,6,4],'torso.ty':[0,.003,.006,.004,.003]},
'resolve':{'head.rotate':[3,2,0,-1,0],'torso.ty':[.004,.003,0,-.002,0]},
'attack':{'torso.rotate':[0,-7,12,6,0],'hand_R.rotate':[0,-25,45,20,0],'hand_R.tx':[0,-.03,.09,.05,0]},
'cast':{'hand_L.ty':[0,-.03,-.06,-.06,0],'hand_R.ty':[0,-.03,-.06,-.06,0],'torso.ty':[0,-.002,-.005,-.004,0]},
'guard':{'torso.rotate':[0,-3,-5,-4,0],'hand_L.rotate':[0,-18,-25,-25,0]},
'hit':{'root.tx':[0,-.005,-.018,-.01,0],'head.rotate':[0,-5,-8,-3,0]},
'knockdown':{'root.ty':[0,.015,.08,.16,.16],'torso.rotate':[0,-8,-30,-65,-65]},
'recover':{'root.ty':[.16,.15,.08,.02,0],'torso.rotate':[-65,-55,-25,-6,0]},
'celebrate':{'hand_R.rotate':[0,-12,-30,-20,0],'head.rotate':[0,-2,-4,-2,0]}}
clips=[]
for a in m['actors']:
 sig=signatures.get(a['source_label'],{'cadence':1,'amplitude':.65,'gesture':'neutral staging until approved individual acting pass; avoid making role labels identical people'})
 for sid in a['proposed_animation']['state_ids']:
  name=sid.split('.')[-1]
  if name not in shapes:continue
  state=next(s for s in m['actor_state_library']if s['id']==sid)
  duration=state['duration_ms'] if name in ['attack','cast','hit'] else round(state['duration_ms']/sig['cadence'])
  curves=[]
  for control,values in shapes[name].items():
   # Eyelids must close fully regardless of acting amplitude.
   scale=1 if control.endswith('closed') else sig['amplitude']
   curves.append({'control':control,'interpolation':'cubic_in_out','keys':[{'ms':round(duration*i/4),'value':round(v*scale,5)} for i,v in enumerate(values)]})
  clips.append({'id':a['id']+'.'+name,'actor':a['id'],'state':sid,'duration_ms':duration,'loop':state['loop'],'signature':sig,'tracks':curves,'status':'proposed_transform_curves_no_registered_art_or_rendered_frames','safety':{'root_motion':'visual_offset_only','mouth':'neutral; phoneme tracks require timed audio/alignment','foot_lock':'world position and actual foot contacts must be supplied by game rig'},'event_markers':[{'ms':round(duration*.5),'event':'prop_contact_review'}] if name in ['reach','hand_over','inspect'] else []})
# Unique monster articulation profiles; channels deliberately semantic because anatomy unapproved.
monprofiles={
'guard':{'body.roll':[0,-2,0,2,0],'head.pitch':[0,-3,1,-1,0],'armor.open':[0,.04,0,.04,0]},
'scout':{'body.ty':[0,-.012,0,-.012,0],'wing_L.roll':[0,18,-10,18,0],'wing_R.roll':[0,-18,10,-18,0],'head.yaw':[0,8,0,-8,0]},
'mender':{'body.ty':[0,-.005,0,-.005,0],'hand_L.roll':[0,-8,-12,-8,0],'hand_R.roll':[0,8,12,8,0],'emitter.intensity':[.1,.3,.5,.3,.1]},
'predator':{'body.pitch':[0,2,5,2,0],'haunch.compression':[0,.1,.2,.1,0],'head.yaw':[0,-4,0,4,0],'tail.roll':[0,8,0,-8,0]},
'boss':{'body.roll':[0,.5,0,-.5,0],'conduit_L.roll':[0,-4,-7,-4,0],'conduit_R.roll':[0,4,7,4,0],'emitter.intensity':[.1,.3,.6,.3,.1]},
'wyrm':{'segment_0.roll':[0,4,0,-4,0],'segment_1.roll':[-4,0,4,0,-4],'segment_2.roll':[0,-4,0,4,0],'jaw.open':[0,.04,.1,.04,0]}}
for role,channels in monprofiles.items():
 for state in m['monster_state_library']:
  duration=state['duration_ms'];name=state['id'].split('.')[-1];gain=1.8 if name.startswith('intent') else 2.8 if name=='strike' else .7 if name=='hit' else 1
  tracks=[{'control':k,'interpolation':'cubic_in_out','keys':[{'ms':round(duration*i/4),'value':round(v*gain,5)}for i,v in enumerate(vs)]}for k,vs in channels.items()]
  clips.append({'id':'runtime.'+role+'.'+name,'actor':'runtime.'+role,'state':state['id'],'duration_ms':duration,'loop':state['loop'],'tracks':tracks,'status':'proposed_transform_curves_no_registered_art_or_rendered_frames','gameplay_sync':'intent phase from engine; strike peak is visual and never applies damage','interrupt_transition':'monster.interrupt cuts all intent tracks immediately'})
payload={'schema':'ash.transform-clips/1','scope':'Numerical rig-control tracks; these are animation data specifications, not rigged sprites, rendered frames or game integration.','reference_rig':rig,'clip_count':len(clips),'clips':clips}
(H/'motion-clips.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
print(len(clips),'clips')
