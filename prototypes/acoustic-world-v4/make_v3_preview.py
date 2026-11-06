#!/usr/bin/env python3
"""A four-scene 48s audition of original v3 local assets and game-state layers."""
import subprocess, json, math
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parent; SR=24000
manifest=json.loads((ROOT/'manifest.json').read_text());assets={a['id']:ROOT/a['file'] for a in manifest['assets']}
def read(id):
 p=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(assets[id]),'-ar',str(SR),'-ac','2','-f','f32le','pipe:1'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
 return np.frombuffer(p.stdout,dtype='<f4').reshape((-1,2))
L=12*SR;out=np.zeros((L*4,2),dtype=np.float64)
def place(id,s,when,gain=1,loop=False):
 x=read(id);start=int(when*SR);end=min(out.shape[0],start+int(s*SR))
 if start>=end:return
 if loop: chunk=x[np.arange(end-start)%len(x)]
 else:chunk=x[:end-start]
 m=min(len(chunk),end-start);out[start:start+m]+=chunk[:m]*gain
# 1: the marsh is calm, weather changes the world
place('score_marsh_foundation',12,0,.80);place('score_marsh_motion',12,0,.17);place('weather_reed_marsh_rain',12,0,.29,True)
place('behavior_marsh_heron_graze',1.8,4,.65);place('memory_water',2.4,7,.55)
# 2: footsteps spook Clayback and its clay shell is tuned and broken
place('score_marsh_foundation',12,12,.60);place('score_marsh_peril',12,12,1.05)
place('behavior_clayback_patrol',1.3,13,.85);place('behavior_clayback_shield_form',1.2,17,.80)
place('tactic_clay_resonate',1.6,19,.90);place('tactic_clay_fracture',1.2,21,.90)
# 3: alternate world / archive memories
place('score_archive_foundation',12,24,.88);place('score_archive_revelation',12,24,.90)
place('weather_submerged_archive_night',12,24,.18,True);place('memory_hydrophone',2.4,27,.8);place('memory_past_echo',2.4,31,.9)
# 4: next timeline and boss rift
place('score_rift_foundation',12,36,.75);place('score_rift_motion',12,36,.54);place('score_rift_revelation',12,36,.80)
place('memory_future_echo',2.4,39,.95);place('behavior_crystal_hawk_patrol',1.35,44,.74)
# 80ms boundary crossfade envelopes avoid audible cuts, compress to listening level
for k in range(4):
 start=k*L;end=(k+1)*L;rise=min(1500,L//4);v=np.linspace(0,1,rise)
 out[start:start+rise]*=v[:,None];out[end-rise:end]*=v[::-1,None]
out=np.tanh(out*.93)*.88
process=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0','-c:a','libmp3lame','-q:a','3',str(ROOT/'Acoustic_World_v3_Gameplay_Preview.mp3')],input=out.astype('<f4').tobytes(),capture_output=True)
if process.returncode:raise RuntimeError(process.stderr.decode()[:1000])
print('Produced 48s A&A v3 gameplay score and sound-state audition')
