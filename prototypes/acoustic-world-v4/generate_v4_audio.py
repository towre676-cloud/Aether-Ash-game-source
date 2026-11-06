#!/usr/bin/env python3
"""A&A v4: 128 deterministic, game-event-addressable sound motifs, not studio recordings."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,collections,subprocess,tempfile
import numpy as np
from scipy.signal import butter,sosfilt
ROOT=Path(__file__).resolve().parent
manifest=json.loads((ROOT/'manifest.json').read_text())
assert manifest['version']=='3.0.0' and len(manifest['assets'])==384
# Legacy v1/v2 entries did not declare hashes; v4 makes the entire pack verifiable.
for item in manifest['assets']:
 item.setdefault('sha256',hashlib.sha256((ROOT/item['file']).read_bytes()).hexdigest())
SR=24000
BOSSES=['clayback_warden','glass_regent','bog_colossus','ash_stag','rift_serpent','kiln_golem','stone_choir','water_archivist']
NPCS=['smith','boatwright','healer','herder','cartographer','archivist','ferryman','gardener']
DEVICES=['hydrophone','sluice','mako_conduit','resonance_door','clay_drum','wind_chime','echo_well','flood_clock']
ZONES=['marsh','forge','archive','market','grove','cavern','cathedral','rift']
SECTIONS=[('boss',BOSSES,['stalk','windup','vulnerable','enrage']),('npc',NPCS,['work','idle','warn','trade']),('device',DEVICES,['activate','pulse','overload','resolve']),('timeline',ZONES,['origin','fracture','mirror','reconcile'])]
def seed(s):return int(hashlib.sha256(s.encode()).hexdigest()[:16],16)
def synth(group,index,action,id):
 r=np.random.default_rng(seed(id));duration={'boss':1.25,'npc':1.3,'device':1.45,'timeline':2.2}[group]
 n=int(SR*duration);t=np.arange(n)/SR;out=np.zeros(n,dtype='float64')
 f=([100,140,196,270,330,420,580,760][index])*(1+.03*len(action));
 env=np.minimum(1,t/.014)*np.minimum(1,np.maximum(0,(duration-t)/.23))
 noise=r.normal(size=n)
 if group=='boss':
  # distinctly timed attack warning with ascending harmonic scrape; each enemy has unique fundamental.
  for j in range(3 if action=='windup' else 2):
   s=.09+j*(.31 if action=='windup' else .39);a=np.maximum(0,t-s);gate=(t>=s)*np.exp(-a*(8 if action=='windup' else 5))
   out+=.16*gate*(np.sin(2*np.pi*(f*(1+j*.16))*a+40*a*a)+.24*np.sin(2*np.pi*(f*2.1)*a))
  if action=='enrage':out+=.1*np.sin(2*np.pi*(f*.5+30*t)*t)*(0.5+0.5*np.sin(2*np.pi*9*t))
  if action=='vulnerable':out+=.1*np.sin(2*np.pi*(f*2.67)*t)*np.exp(-2.8*t)
  out+=.025*noise*np.exp(-4*t)
 elif group=='npc':
  pulses={'work':3,'idle':1,'warn':2,'trade':4}[action]
  for j in range(pulses):
   s=.10+j*(duration-.3)/max(1,pulses);a=np.maximum(0,t-s);gate=(t>=s)*np.exp(-a*(15 if action=='work' else 9))
   out+=.14*gate*(np.sin(2*np.pi*(f*.6+j*29)*a)+.4*np.sin(2*np.pi*f*1.7*a))
  if action=='warn':out+=.05*np.sin(2*np.pi*(f*1.4+90*t)*t)*env
  out+=.025*noise*env
 elif group=='device':
  a={'activate':.02,'pulse':.09,'overload':.30,'resolve':.05}[action]
  out+=.14*np.sin(2*np.pi*(f+f*a*t)*t)*np.exp(-1.5*t)
  out+=.08*np.sin(2*np.pi*(f*2.33+.4*f*t)*t)*np.exp(-3*t)
  if action=='pulse':out*=.1+.9*np.sin(2*np.pi*3*t)**8
  if action=='overload':out+=.12*noise*np.minimum(1,t/.4)*env
  if action=='resolve':out*=np.exp(-2.5*t)
 else:
  tones=[0,7,12+index%5,19 if action=='reconcile' else 6 if action=='fracture' else 14]
  for j,semitone in enumerate(tones):
   s=.15+j*.48;k=(t>=s);a=np.maximum(0,t-s);note=f*2**(semitone/12)
   out+=.12*k*np.exp(-5*a)*(np.sin(2*np.pi*note*a)+.28*np.sin(2*np.pi*note*2.01*a))
  out+=.012*noise*np.exp(-t)*env
 out*=env;out/=max(1,np.max(np.abs(out)))*1.4
 # stereo decorrelation is restrained to preserve material cues and headphone location.
 l=out+.13*np.roll(out,151);rr=.95*out+.12*np.roll(out,287)
 return np.stack([l,rr],axis=1).astype('<f4')

def make(task):
 group,idBase,action,i=task;id=f'{group}_{idBase}_{action}';audio=synth(group,i,action,id)
 p=ROOT/'assets'/'audio'/('v4_'+group)/(id+'.ogg');p.parent.mkdir(parents=True,exist_ok=True)
 raw=audio.tobytes();proc=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0','-c:a','libopus','-b:a','48k',str(p)],input=raw,capture_output=True,timeout=20)
 if proc.returncode:raise RuntimeError(id+': '+proc.stderr.decode()[:200])
 return {'id':id,'file':str(p.relative_to(ROOT)),'category':'v4_'+group,'loop':False,'duration':round(len(audio)/SR,3),'peak':round(float(np.max(np.abs(audio))),5),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'role':group+'_reactive_cue','trigger':{'boss':'boss:telegraph','npc':'npc:work','device':'world:device','timeline':'timeline:consequence'}[group],'entity':idBase,'action':action}
jobs=[(group,ent,action,i) for group,entities,actions in SECTIONS for i,ent in enumerate(entities) for action in actions]
with ThreadPoolExecutor(max_workers=8) as ex: added=list(ex.map(make,jobs))
assert len(added)==128
manifest['assets'].extend(added);manifest['assets'].sort(key=lambda x:(x['category'],x['id']))
manifest['version']='4.0.0';manifest['categories']=dict(collections.Counter(x['category'] for x in manifest['assets']))
assert len(manifest['assets'])==512
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'added':len(added),'total':len(manifest['assets']),'categories':manifest['categories']},indent=2))
