#!/usr/bin/env python3
"""Generate 140 original A&A audio cue stems with deterministic, reproducible NumPy synthesis.
The waveforms are studio placeholders, not misrepresented as live instrumental performances.
Run AFTER v2 generation, preserving its 244-file catalog.
"""
from pathlib import Path
import json, math, hashlib, subprocess, tempfile, collections
import numpy as np
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parent
manifest=json.loads((ROOT/'manifest.json').read_text())
assert len(manifest['assets'])==244 and manifest['version']=='2.0.0', 'Requires the unmodified v2 source manifest'
SR=24000
biomes=['reed_marsh','ash_grove','salt_shore','night_grassland','ember_highland','rain_market','wooden_inn','clay_forge','limestone_cavern','sunlit_ruins','crystal_aqueduct','submerged_archive','moss_cathedral','storm_rooftops','frozen_tundra','final_rift']
species=['reed_stalker','clayback','glass_moth','ash_hart','bog_watcher','moss_lurker','cinder_fox','river_serpent','stone_ram','crystal_hawk','burrower','marsh_heron']
materials=['moss','gravel','crystal','clay','bronze','wood','water','ash']
signals=['water','ash','clay','shelter','false_wall','beast_near','future_echo','past_echo','kakeya_line','hydrophone','mako','secret_exit']
# v2 baseline shipped one short/truncated clue in the original worktree;
# deterministically rebuild it on clean regeneration if necessary.
legacy_clue=ROOT/'assets/audio/clues/clue_beast_near.ogg'
try:
    check=subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(legacy_clue)],text=True).strip()
except Exception:check='0'
if float(check)<1.4:
    n=int(1.56*SR);x=np.zeros(n)
    for k,f in enumerate([329.63,349.23,329.63]):
        start=int((.04+k*.37)*SR);ln=min(int(.50*SR),n-start);tt=np.arange(ln)/SR
        x[start:start+ln]+=(.18*np.sin(2*np.pi*f*tt)+.05*np.sin(2*np.pi*f*2.73*tt))*np.exp(-tt*6)*np.minimum(1,tt/.014)
    pcm=np.stack([x,.95*x],axis=1).astype('<f4')
    repaired=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0','-c:a','libopus','-b:a','48k',str(legacy_clue)],input=pcm.tobytes(),capture_output=True)
    if repaired.returncode:raise RuntimeError('Failed repairing truncated original clue')
new=[]
def rng(label):return np.random.default_rng(int(hashlib.sha256(label.encode()).hexdigest()[:16],16))
def lp(x,cutoff=1000):
    # stable, cheap first order one-pole filter in the time domain
    alpha=min(.8,2*np.pi*cutoff/SR)
    # multi-timescale spectral smoothing with running differences
    from scipy.signal import lfilter
    return lfilter([alpha],[1,alpha-1],x)
def smooth(x,period):
    k=max(1,int(period*SR))
    if k<2:return x
    return np.convolve(x,np.ones(k)/k,'same')
def env(t,dur,a=.02,release=.3):
    return np.minimum(1,np.maximum(0,t/a))*np.minimum(1,np.maximum(0,(dur-t)/release))
def stereo(x,pan=0):
    a=np.clip(pan,-.8,.8)
    d=max(2,int(SR*.009)); delay=np.concatenate([np.zeros(d),x[:-d]])
    return np.stack([x*(1-.23*a)+.13*delay,x*(1+.23*a)+.09*np.roll(x,d//2)],axis=1)
def normalize(x):
    peak=np.max(np.abs(x))
    if peak>0:x=x*min(1,.75/peak)
    return np.asarray(x,dtype=np.float32)
def register(id,cat,wav,meta,loop=False):
    d=ROOT/'assets'/'audio'/cat;d.mkdir(parents=True,exist_ok=True)
    file=d/(id+'.ogg');wav=normalize(wav);duration=len(wav)/SR
    new.append((id,file,wav,dict(id=id,file=str(file.relative_to(ROOT)),category=cat,loop=bool(loop),duration=round(duration,3),peak=round(float(np.max(np.abs(wav))),5),**meta)))
# 48 biome/weather beds: actual spatial/weather event channels tied to state, no autoplay
for biome in biomes:
 for weather in ['rain','wind','night']:
    id=f'weather_{biome}_{weather}';r=rng(id);dur=6;n=SR*dur;t=np.arange(n)/SR
    # circular noise tiles to minimize the loop seam
    tile=r.normal(size=n);tile=lp(tile,{'rain':2700,'wind':520,'night':1200}[weather]);tile/=max(1e-8,np.std(tile))
    mod=1+.35*np.sin(2*np.pi*t*(2 if weather=='rain' else .34 if weather=='wind' else .17))
    base={'rain':.16,'wind':.14,'night':.06}[weather]*tile*mod
    f=r.uniform(220,640)*(1 if weather!='night' else 1.5)
    pulses=np.sin(2*np.pi*f*t+.22*np.sin(2*np.pi*t*.25))*((.5+.5*np.sin(2*np.pi*(1+len(biome)%4)*t))**4)
    if weather=='night':base+=.035*pulses
    if weather=='wind':base+=.028*np.sin(2*np.pi*(47+len(biome)*2)*t)*np.sin(2*np.pi*.13*t)**2
    # circular crossfaded seam
    k=SR//8;v=np.linspace(0,1,k);base[-k:]=base[-k:]*(1-v)+base[:k]*v
    register(id,'weather',stereo(base,r.uniform(-.25,.25)),{'biome':biome,'weather':weather,'role':'world_weather_layer','trigger':'weather:changed'},True)
# 48 creature responses; one pattern per authored species and behavioral action
for i,sp in enumerate(species):
 for action in ['graze','patrol','shield_form','withdraw']:
    id=f'behavior_{sp}_{action}';r=rng(id);dur=1.15 if action=='shield_form' else 1.35 if action=='patrol' else .92 if action=='withdraw' else 1.8
    n=int(SR*dur);t=np.arange(n)/SR
    f0=86+(i*67)%900
    sweep={'graze':.10,'patrol':.06,'shield_form':-.20,'withdraw':-.42}[action]
    f=f0*(1+sweep*t/dur+.10*np.sin(2*np.pi*(2+i%4)*t));phase=2*np.pi*np.cumsum(f)/SR
    voice=(np.sin(phase)+.35*np.sin(phase*2.02)+.14*np.sin(phase*3.23))
    texture=lp(r.normal(size=n),min(4000,1200+i*147))*.21
    pattern=env(t,dur,.04,.24)
    if action=='patrol':pattern*=.35+.65*np.sin(2*np.pi*3*t)**2
    if action=='shield_form':voice+=.27*np.sin(phase*1.45)+.28*np.sin(2*np.pi*(130+680*t/dur)*t)
    if action=='withdraw':pattern*=np.exp(-2.4*t/dur)
    wav=(.18*voice+texture)*pattern
    register(id,'behavior',stereo(wav,r.uniform(-.65,.65)),{'species':sp,'behavior':action,'role':'creature_intent_telegraph','trigger':'ecology:behavior'})
# 32 body-material reactions: informative differences for real shield/weapon systems
mat_freq={'moss':220,'gravel':130,'crystal':523.25,'clay':196,'bronze':392,'wood':220,'water':293.66,'ash':329.63}
for j,material in enumerate(materials):
 for action in ['equip','impact','resonate','fracture']:
    id=f'tactic_{material}_{action}';r=rng(id);dur={'equip':.64,'impact':.70,'resonate':1.6,'fracture':1.2}[action];n=int(SR*dur);t=np.arange(n)/SR
    f=mat_freq[material];phase=2*np.pi*f*t
    metal=material in ('crystal','bronze');noise=lp(r.normal(size=n),3000 if metal else 700+j*250)
    if action=='resonate':
        sig=(.18*np.sin(phase)+.08*np.sin(phase*2.48 if metal else phase*2))*np.exp(-1.6*t)
    else:
        sig=.22*(np.sin(phase*(1+.04*t))+(.25 if metal else .08)*np.sin(phase*2.4))*np.exp(-3*t)
        sig+=.17*noise*np.exp(-8*t)
        if action=='fracture':
            for k in range(6):
                start=int((.05+k*.095)*SR);stop=min(n,start+int(.09*SR));
                q=np.arange(stop-start)/SR
                sig[start:stop]+=(.12+.03*k)*np.sin(2*np.pi*(f*(1+k*.2))*q)*np.exp(-20*q)
    wav=sig*env(t,dur,.006,.12)
    register(id,'tactics',stereo(wav,r.uniform(-.45,.45)),{'material':material,'action':action,'frequencyHz':f,'role':'material_state','trigger':'material:state'})
# 12 narrative memory motifs; structurally distinct from first-pass listening clues
for i,signal in enumerate(signals):
    id=f'memory_{signal}';r=rng(id);dur=2.4;n=int(SR*dur);wav=np.zeros(n)
    motif=[0,7,(i*5)%12,12+(i%5)]
    f0=155.56*2**(i/19)
    for k,step in enumerate(motif):
        start=int((.15+k*.49)*SR);nn=min(int(.62*SR),n-start);tt=np.arange(nn)/SR;f=f0*2**(step/12)
        wav[start:start+nn]+=(.15*np.sin(2*np.pi*f*tt)+.06*np.sin(2*np.pi*f*2.76*tt))*np.exp(-3.6*tt)*env(tt,.62,.008,.21)
    wav+=.012*lp(r.normal(size=n),1400)*env(np.arange(n)/SR,dur,.35,.5)
    register(id,'memories',stereo(wav,.15 if i%2 else -.15),{'signal':signal,'role':'timeline_memory','trigger':'timeline:echo'})
assert len(new)==140

def encode(entry):
    id,file,wav,meta=entry
    with tempfile.NamedTemporaryFile(suffix='.f32',delete=True) as tmp:
        wav.tofile(tmp.name)
        p=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y','-f','f32le','-ar',str(SR),'-ac','2','-i',tmp.name,'-c:a','libopus','-b:a','48k',str(file)],capture_output=True,text=True)
        if p.returncode:raise RuntimeError(f'{id}: {p.stderr}')
    meta['sha256']=hashlib.sha256(file.read_bytes()).hexdigest()
    return meta
with ThreadPoolExecutor(max_workers=8) as ex:
    added=list(ex.map(encode,new))
manifest['assets']+=added
manifest['assets'].sort(key=lambda a:(a['category'],a['id']))
assert len(manifest['assets'])==384
manifest['version']='3.0.0'
manifest['categories']=dict(collections.Counter(a['category'] for a in manifest['assets']))
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('A&A v3 generated',len(added),'new audio files; total',len(manifest['assets']),manifest['categories'])
