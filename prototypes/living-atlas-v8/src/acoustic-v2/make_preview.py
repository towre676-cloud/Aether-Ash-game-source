import json,subprocess
from pathlib import Path
import numpy as np
import soundfile as sf
R=Path(__file__).resolve().parent;SR=24000
segments=[('ambience/reed_marsh',4.0),('footsteps/step_wet_clay_heavy',.44),('footsteps/step_gravel_heavy',.44),('creatures/mineral_warden_alert',1.2),('interaction/environmental_shield_form',1.5),('interaction/environmental_shield_break',1.2),('clues/clue_water',1.7),('ambience/crystal_aqueduct',4),('interaction/stone_gate',1.7),('clues/clue_past_echo',1.7),('ambience/clay_forge',3),('interaction/forge_hammer',.7),('creatures/glass_moth_alert',1.3),('clues/clue_kakeya_line',1.7),('ambience/final_rift',4)]
all=[]
for p,dur in segments:
 data=subprocess.check_output(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-i',str(R/'assets/audio'/f'{p}.ogg'),'-f','f32le','-ac','2','-ar',str(SR),'-'])
 x=np.frombuffer(data,dtype='<f4').reshape(-1,2);n=min(len(x),int(dur*SR));x=x[:n].copy()
 k=min(int(.06*SR),n//5);f=np.linspace(0,1,k)
 x[:k]*=f[:,None];x[-k:]*=f[::-1,None]
 all.extend([x,np.zeros((int(.17*SR),2),dtype=np.float32)])
a=np.concatenate(all);sf.write(R/'preview.wav',a,SR,subtype='PCM_16')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(R/'preview.wav'),'-c:a','libmp3lame','-b:a','144k',str(R/'Acoustic_World_Preview.mp3')],check=True)
(R/'preview.wav').unlink();print('preview seconds',len(a)/SR)
