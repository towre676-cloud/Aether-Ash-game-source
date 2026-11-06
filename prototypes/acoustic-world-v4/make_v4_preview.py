#!/usr/bin/env python3
"""Original 64s procedural gameplay audition: quiet, NPC, combat timing, aftermath and NG+."""
from pathlib import Path
import subprocess,json
import numpy as np
ROOT=Path(__file__).resolve().parent;SR=24000;DURATION=64
manifest=json.loads((ROOT/'manifest.json').read_text());assets={a['id']:ROOT/a['file'] for a in manifest['assets']}
N=SR*DURATION;out=np.zeros((N,2),dtype=np.float64)
def read(id):
 p=subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-i',str(assets[id]),'-ar',str(SR),'-ac','2','-f','f32le','pipe:1'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
 return np.frombuffer(p.stdout,dtype='<f4').reshape((-1,2))
def bed(id,start,length,gain,fade=1):
 x=read(id);n=int(length*SR);s=int(start*SR);chunk=np.tile(x,(max(1,1+n//len(x)),1))[:n]
 ramp=min(int(SR*fade),n//3)
 if ramp:chunk[:ramp]*=np.linspace(0,1,ramp)[:,None];chunk[-ramp:]*=np.linspace(1,0,ramp)[:,None]
 out[s:s+n]+=gain*chunk

def hit(id,start,gain=.8):
 x=read(id);s=int(start*SR);n=min(len(x),N-s);out[s:s+n]+=x[:n]*gain
# ACT I: ferryman's crossing / hydrophone
bed('score_marsh_foundation',0,16,.62);bed('score_marsh_motion',0,16,.16)
bed('reed_marsh',0,16,.20);hit('npc_ferryman_work',4,.75);hit('device_hydrophone_pulse',7,.92);hit('memory_water',11,.64)
# ACT II: Clayback's warning timings and paired combat responses
bed('score_marsh_foundation',16,16,.62);bed('score_marsh_peril',16,16,.86)
hit('boss_clayback_warden_stalk',18,.72);hit('boss_clayback_warden_windup',21,.95);hit('boss_clayback_warden_vulnerable',23,.9)
hit('tactic_clay_resonate',25,.72);hit('boss_clayback_warden_enrage',27,.80);hit('tactic_clay_fracture',29,.88)
# ACT III: crossing, device restored, hidden sluice opens
bed('score_archive_foundation',32,16,.73);bed('score_archive_revelation',32,16,.79)
bed('weather_submerged_archive_night',32,16,.13)
hit('device_sluice_activate',33,.8);hit('device_sluice_pulse',36,.80);hit('device_sluice_resolve',38,.84);hit('memory_hydrophone',42,.72)
# ACT IV: timeline selection changes the archive's musical answer
bed('score_rift_foundation',48,16,.72);bed('score_rift_revelation',48,16,.83)
hit('timeline_marsh_fracture',50,.78);hit('timeline_archive_mirror',54,.8);hit('timeline_rift_reconcile',58,.9)
# Smooth the isolated scenes and hard output endpoints
r=int(.1*SR);out[:r]*=np.linspace(0,1,r)[:,None];out[-r:]*=np.linspace(1,0,r)[:,None]
out=np.tanh(out*.9)*.9
assert np.max(np.abs(out))<.94
f=ROOT/'Acoustic_World_v4_Reactive_Experience.mp3'
p=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0','-c:a','libmp3lame','-b:a','160k',str(f)],input=out.astype('<f4').tobytes(),capture_output=True)
if p.returncode:raise RuntimeError(p.stderr.decode())
print('Created',f,'seconds',DURATION)
