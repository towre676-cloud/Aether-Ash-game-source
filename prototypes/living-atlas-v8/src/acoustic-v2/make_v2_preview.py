"""Produce a short original adaptive-score demonstration from shipped stems."""
from pathlib import Path
import subprocess
import numpy as np
import soundfile as sf
R=Path(__file__).resolve().parent
SR=24000
CACHE={}
def read(group,name):
 key=(group,name)
 if key not in CACHE:
  p=R/'assets'/'audio'/group/(name+'.ogg')
  b=subprocess.check_output(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-i',str(p),'-f','f32le','-ac','2','-ar','24000','-'])
  CACHE[key]=np.frombuffer(b,dtype='<f4').copy().reshape(-1,2)
 return CACHE[key]

def layer(scene,weights,seconds=8):
 n=seconds*SR;x=np.zeros((n,2),np.float64)
 for stem,gain in weights.items():x+=read('score',f'score_{scene}_{stem}')[:n]*gain
 return x

def overlay(section,group,name,sec,gain):
 x=read(group,name);q=int(sec*SR);k=min(len(x),len(section)-q)
 if k>0:section[q:q+k]+=x[:k]*gain

def segment(scene,weights,events):
 out=layer(scene,weights)
 for group,name,sec,gain in events:overlay(out,group,name,sec,gain)
 return out
sections=[
 segment('marsh',{'foundation':.48,'motion':.34},[('ambience','reed_marsh',.0,.23),('footsteps','step_wet_clay_soft',1.3,.37),('clues','clue_water',4.4,.41)]),
 segment('marsh',{'foundation':.35,'peril':.56,'motion':.29},[('creatures','clayback_alert',1,.53),('hazards','warning_water_surge',3.9,.50),('interaction','environmental_shield_form',5.4,.33)]),
 segment('city',{'foundation':.43,'motion':.32,'revelation':.1},[('ambience','clay_forge',0,.22),('interaction','forge_hammer',2.5,.45),('material','material_bronze_scrape',5.2,.42)]),
 segment('archive',{'foundation':.36,'motion':.19,'revelation':.47},[('ambience','submerged_archive',0,.23),('clues','clue_hydrophone',4.3,.4)]),
 segment('rift',{'foundation':.36,'motion':.33,'peril':.42,'revelation':.20},[('hazards','warning_time_slip',1.4,.40),('clues','clue_kakeya_line',4.3,.37)])]
# Crossfade 0.4s sections; leave sense of evolving world instead of abrupt cuts.
fade=int(.40*SR);out=sections[0]
for nxt in sections[1:]:
 w=np.linspace(0,1,fade)[:,None]
 out=np.concatenate([out[:-fade],out[-fade:]*(1-w)+nxt[:fade]*w,nxt[fade:]])
out=np.tanh(out*.82);mx=np.max(np.abs(out));out=out*min(1,.86/max(mx,1e-8))
k=int(.18*SR);out[:k]*=np.linspace(0,1,k)[:,None];out[-k:]*=np.linspace(1,0,k)[:,None]
sf.write(R/'preview_v2.wav',out,SR,subtype='PCM_16')
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(R/'preview_v2.wav'),'-c:a','libmp3lame','-b:a','160k',str(R/'Acoustic_World_v2_Adaptive_Preview.mp3')],check=True)
(R/'preview_v2.wav').unlink()
print(round(len(out)/SR,2),'sec')
