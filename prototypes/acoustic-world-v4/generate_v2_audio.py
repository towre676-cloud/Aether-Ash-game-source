#!/usr/bin/env python3
"""Original reproducible additive, granular and deterministic music/sound for A&A v2.

The v1 generator is called first to guarantee a complete base catalog. Every new
asset has an event role, gameplay routing tag, and an internally synthesized source.
"""
from __future__ import annotations
import json, math
from pathlib import Path
import numpy as np
import generate_audio as a

SR=a.SR
ROOT=Path(__file__).resolve().parent
N=16*SR
BEAT=SR//2 # 120 beats/min, 8 bars of 4 beats, 16 s, all stems are phase aligned
T=np.arange(N)/SR

def env(n, attack=.03, release=.25):
    return a.adsr(n, attack, release)

def note(f,dur,kind='glass',phase=0):
    n=max(2,int(SR*dur)); t=np.arange(n)/SR
    # phase offsets are deterministic; every tone synthesized without sampled IP
    v={
      'wood': lambda: np.sin(2*np.pi*f*t+phase)*.62 + np.sin(2*np.pi*2.01*f*t+phase)*.11 + .04*np.sin(2*np.pi*3.03*f*t),
      'glass':lambda:np.sin(2*np.pi*f*t+phase)*.38+.24*np.sin(2*np.pi*2.76*f*t+phase)+.08*np.sin(2*np.pi*5.41*f*t),
      'string':lambda:sum(np.sin(2*np.pi*(j+1)*f*t+phase*(j+1))/(j+1)**1.35 for j in range(5))*.27,
      'bell':lambda:np.sin(2*np.pi*f*t)*.44+.22*np.sin(2*np.pi*f*2.41*t)+.10*np.sin(2*np.pi*f*3.8*t),
      'bass':lambda:np.sin(2*np.pi*f*t)*.59+.15*np.sin(2*np.pi*2*f*t),
    }[kind]()
    return v*env(n,.035 if kind=='string' else .006,min(.48,dur*.44))*(np.exp(-t*(1.5 if kind=='bell' else .42)))

SCALES={
 'marsh':([50,53,57,60,62,65,69,72],['Dm','Bb','F','C']),
 'grove':([45,48,52,55,57,60,64,67],['Am','F','C','G']),
 'cavern':([47,50,54,57,59,62,66,69],['Bm','G','D','A']),
 'city':([48,52,55,59,60,64,67,71],['C','Em','Am','G']),
 'archive':([50,53,57,60,62,65,69,72],['Dm','F','Bb','Am']),
 'rift':([49,52,56,59,61,64,68,71],['C#m','A','E','B']),
}
CHORDS={'Dm':[50,53,57,62],'Bb':[46,50,53,58],'F':[53,57,60,65],'C':[48,52,55,60],
 'Am':[45,48,52,57],'G':[43,47,50,55],'Bm':[47,50,54,59],'D':[50,54,57,62],
 'A':[45,49,52,57],'Em':[52,55,59,64],'C#m':[49,52,56,61],'E':[52,56,59,64],'B':[47,51,54,59]}

def midi(n):return 440*2**((n-69)/12)

def add(out,clip,position,gain=.1):
    offset=int(position*SR)
    if offset>=len(out):return
    ln=min(len(clip),len(out)-offset)
    out[offset:offset+ln]+=clip[:ln]*gain

def music(scene,stem):
    r=a.rng_for('score:v2:'+scene+':'+stem)
    scale,prog=SCALES[scene]; x=np.zeros(N); pulse=np.zeros(N)
    for bar in range(8):
        chord=CHORDS[prog[bar%4]]
        start=bar*2
        if stem=='foundation':
            for pitch in (chord[0]-12,chord[1],chord[2],chord[3]):
                add(x,note(midi(pitch),2.12,'string',r.uniform(0,3)),start,.075)
            add(x,note(midi(chord[0]-24),1.80,'bass'),start,.19)
        if stem=='motion':
            arp=[chord[0],chord[2],chord[1],chord[3],chord[2],chord[1],chord[3],chord[2]]
            for j,pitch in enumerate(arp):
                add(x,note(midi(pitch+12),.39,'wood',r.random()),start+j*.25,.052)
            for j in range(4):
                q=start+j*.5
                add(pulse,np.sin(np.arange(int(.12*SR))/SR*2*np.pi*(60+r.uniform(-6,6)))*env(int(.12*SR),.001,.10),q,.048)
        if stem=='peril':
            for j in range(4):
                q=start+j*.5
                add(x,note(midi(chord[0]-12),.35,'bass'),q,.16)
                # filtered, nonrepeating breathy scrape, not an intrusive drum loop
                n=int(.12*SR);h=r.normal(0,.05,n);h=a.lp(h,950)*env(n,.001,.11)
                add(x,h,q,.18)
            if bar%2==0: add(x,note(midi(chord[3]),1.3,'bell'),start+1,.095)
        if stem=='revelation':
            melody=[scale[5],scale[4],scale[2],scale[6],scale[7],scale[5],scale[4],scale[0]]
            add(x,note(midi(melody[bar]+12),1.66,'glass'),start+.13,.12)
            if bar%2==0:add(x,note(midi(chord[2]+12),1.3,'bell'),start+.80,.06)
    x+=pulse
    # simple stereo chamber spread; wrapped delay gives a coherent 16s seam
    left=x.copy();right=.93*x.copy()
    for delay,gain in [(int(.12*SR),.13),(int(.24*SR),.09),(int(.36*SR),.045)]:
        left+=np.roll(x,delay)*gain
        right+=np.roll(x,delay+250)*gain
    # Match the waveform endpoints without losing the harmonic envelope
    seam_len=int(.15*SR)
    left[-seam_len:]=left[-seam_len:]*(1-np.linspace(0,1,seam_len))+left[:seam_len]*np.linspace(0,1,seam_len)
    right[-seam_len:]=right[-seam_len:]*(1-np.linspace(0,1,seam_len))+right[:seam_len]*np.linspace(0,1,seam_len)
    return np.stack([left,right],axis=1)

for scene in SCALES:
    for stem in ['foundation','motion','peril','revelation']:
        a.save(f'score_{scene}_{stem}','score',music(scene,stem),{'scoreScene':scene,'stem':stem,'tempoBpm':120,'bars':8,'role':'adaptive_music'},loop=True)

SPOT_BIOMES=['reed_marsh','ash_grove','salt_shore','night_grassland','ember_highland','rain_market','clay_forge','limestone_cavern','crystal_aqueduct','submerged_archive','moss_cathedral','final_rift']
SPOT_TYPES=['wildlife','architecture','weather','danger']
def spot(biome,kind):
    name=f'spot_{biome}_{kind}';r=a.rng_for(name);d=1.0+r.uniform(.30,.85);n=int(SR*d);t=np.arange(n)/SR
    base={'wildlife':r.uniform(350,1400),'architecture':r.uniform(80,410),'weather':r.uniform(90,700),'danger':r.uniform(55,220)}[kind]
    if kind=='wildlife':
        f=base*(1+.11*np.sin(2*np.pi*(3+r.random()*4)*t));x=np.sin(a.phasor(t,f))*.17+a.lp(r.normal(0,.13,n),3600)
        x*=np.maximum(0,np.sin(np.pi*t/d))
    elif kind=='architecture':
        x=a.tone(n,r,base,harmonic=5,decay=4)*.27+a.lp(r.normal(0,.045,n),1500)*a.adsr(n,.004,.5)
    elif kind=='weather':
        x=a.lp(r.normal(0,.17,n),2200)*(np.sin(2*np.pi*2*t)**2)*a.adsr(n,.10,.3)
    else:
        x=np.sin(2*np.pi*base*t+4*np.sin(t*2))*np.exp(-t*1.5)*.23
        x+=a.lp(r.normal(0,.12,n),900)*a.adsr(n,.01,.33)
    return a.stereo(x,a.rng_for(name+'pan').uniform(-.6,.6))
for biome in SPOT_BIOMES:
    for kind in SPOT_TYPES:
        a.save(f'spot_{biome}_{kind}','spots',spot(biome,kind),{'biome':biome,'role':'environment_event','trigger':kind,'frequency':'sparse_not_repeated'},loop=False)

MATERIALS=['moss','gravel','crystal','clay','bronze','wood','water','ash']
ACTS=['gather','scrape','break']
for material in MATERIALS:
    for act in ACTS:
        name=f'material_{material}_{act}';r=a.rng_for(name);n=int((.38 if act=='gather' else .62)*SR);t=np.arange(n)/SR
        m={'moss':.26,'gravel':1.0,'crystal':1.8,'clay':.63,'bronze':2.2,'wood':.72,'water':.43,'ash':.32}[material]
        f=(110+260*m)*(1+.04*np.cos(t*12));ph=a.phasor(t,f)
        x=.34*np.sin(ph)+(.20 if act=='break' else .08)*np.sin(ph*1.98)
        x+=a.lp(r.normal(0,.2,n),min(5000,700*m+500))*a.adsr(n,.004,.25)
        x*=a.adsr(n,.003,.19)*np.exp(-t*(8 if act=='break' else 3))
        a.save(name,'material',a.stereo(x,r.uniform(-.3,.3)),{'material':material,'action':act,'role':'physics_interaction'})

HAZARDS=['water_surge','broken_dam','unstable_crystal','fissure','falling_stone','living_roots','ash_cloud','flame_backdraft','mako_overload','resonance_reversal','ambush_from_reeds','bone_rattle','storm_arc','frozen_crack','false_echo','time_slip']
for kind in HAZARDS:
    r=a.rng_for('hazard:'+kind);n=int((.75+r.uniform(0,.50))*SR);t=np.arange(n)/SR
    f=r.uniform(80,320);x=(.2*np.sin(2*np.pi*f*t*(1+.8*t))+.15*a.lp(r.normal(0,.6,n),2500))
    x*=a.adsr(n,.01,.26)*np.exp(-t*1.5)
    a.save('warning_'+kind,'hazards',a.stereo(x,r.uniform(-.4,.4)),{'role':'telegraph','hazard':kind,'beforeImpact':True})

a.MANIFEST.sort(key=lambda x:(x['category'],x['id']))
import collections
catalog={'version':'2.0.0','game':'Ash & Aether: Clay and Water','sampleRate':SR,'assets':a.MANIFEST,'categories':dict(collections.Counter(x['category'] for x in a.MANIFEST))}
(ROOT/'manifest.json').write_text(json.dumps(catalog,indent=2))
print('v2',len(a.MANIFEST),'assets',catalog['categories'])
