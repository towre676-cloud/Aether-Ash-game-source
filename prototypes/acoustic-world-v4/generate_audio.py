#!/usr/bin/env python3
"""Create deterministic original Ash & Aether audio stems. No external assets."""
from __future__ import annotations
import hashlib, json, math, os, subprocess, tempfile
from pathlib import Path
import numpy as np
from scipy import signal
import soundfile as sf

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'assets'/'audio'; OUT.mkdir(parents=True,exist_ok=True)
SR=24000
MANIFEST=[]

def rng_for(name): return np.random.default_rng(int.from_bytes(hashlib.sha256(name.encode()).digest()[:8],'little'))
def soft(x): return np.tanh(x*1.05)
def lp(x, hz): return signal.sosfilt(signal.butter(2, min(0.95,hz/(SR/2)), 'low', output='sos'),x)
def hp(x, hz): return signal.sosfilt(signal.butter(2, max(.0001,hz/(SR/2)), 'high', output='sos'),x)
def noise(n,r,hz=1000): return lp(r.standard_normal(n),hz)
def adsr(n,attack=.014,release=.18):
    a=max(1,min(n,int(SR*attack))); b=max(1,min(n-a,int(SR*release)))
    e=np.ones(n); e[:a]=np.linspace(0,1,a,endpoint=False)**1.5
    e[-b:]=np.linspace(1,0,b,endpoint=True)**1.4
    return e

def phasor(t,f):
    return np.cumsum(2*np.pi*np.asarray(f)/SR) if not np.isscalar(f) else 2*np.pi*f*t

def tone(n,r,f=220, vibrato=0.005, harmonic=3, decay=1):
    t=np.arange(n)/SR
    freq=f*(1+vibrato*np.sin(2*np.pi*(3.0+r.uniform(0,2))*t))
    ph=phasor(t,freq)
    x=sum((1/(k**1.25))*np.sin(k*ph+r.uniform(-.5,.5)) for k in range(1,harmonic+1))
    return x*np.exp(-decay*t)*adsr(n,.008,.1)

def impulse(n,at,x):
    q=int(at*SR)
    if q>=n:return
    end=min(n,q+len(x)); xlen=end-q
    if q<0: return
    return end,q,xlen

def place(out,clip,at,gain=1,wrap=False):
    q=int(at*SR)
    if wrap:
        q%=len(out)
        idx=(np.arange(len(clip))+q)%len(out)
        np.add.at(out,idx,gain*clip)
    elif q<len(out) and q>=0:
        k=min(len(clip),len(out)-q);out[q:q+k]+=gain*clip[:k]

def stereo(x, pan=.0):
    return np.stack([x*np.sqrt((1-pan)*.5),x*np.sqrt((1+pan)*.5)],axis=1)

def save(name,category,data,metadata=None,loop=False):
    data=np.asarray(data,dtype=np.float64)
    if data.ndim==1:data=stereo(data)
    data=np.nan_to_num(data)
    # soft limiter, consistent safety headroom; gentle overall normalization per asset
    peak=max(1e-6,np.max(np.abs(data)))
    data=soft(data/(peak+1e-6)*.80)
    if loop:
        # blend seam on long ambience (crossfadable as a continuous looping surface)
        k=min(int(.06*SR),len(data)//12)
        seam=.5*(data[0].copy()+data[-1].copy())
        for i in range(k):
            w=i/(k-1)
            data[i]=seam*(1-w)+data[i]*w
            data[-k+i]=data[-k+i]*(1-w)+seam*w
    peak=np.max(np.abs(data));data*=min(1,.89/(peak+1e-9))
    folder=OUT/category;folder.mkdir(exist_ok=True,parents=True)
    path=folder/f'{name}.ogg'
    if path.exists() and path.stat().st_size > 300:
        entry={'id':name,'file':f'assets/audio/{category}/{name}.ogg','category':category,'loop':loop,'duration':round(len(data)/SR,3), 'peak':round(float(np.max(np.abs(data))),4)}
        if metadata:entry.update(metadata)
        MANIFEST.append(entry)
        return
    with tempfile.NamedTemporaryFile(suffix='.wav',delete=False) as f: wav=f.name
    try:
        sf.write(wav,data,SR,subtype='PCM_16')
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',wav,'-c:a','libopus','-b:a','40k','-application','audio',str(path)],check=True)
    finally: os.unlink(wav)
    entry={'id':name,'file':f'assets/audio/{category}/{name}.ogg','category':category,'loop':loop,'duration':round(len(data)/SR,3), 'peak':round(float(np.max(np.abs(data))),4)}
    if metadata:entry.update(metadata)
    MANIFEST.append(entry)

# 16 biomes with independently shaped continuous ambience
biomes=[('reed_marsh','water',.31),('ash_grove','wind',.19),('salt_shore','water',.42),('night_grassland','insects',.22),('ember_highland','wind',.40),('rain_market','rain',.56),('wooden_inn','hearth',.16),('clay_forge','hearth',.45),('limestone_cavern','cave',.27),('sunlit_ruins','wind',.23),('crystal_aqueduct','cave',.41),('submerged_archive','water',.39),('moss_cathedral','insects',.12),('storm_rooftops','rain',.63),('frozen_tundra','wind',.46),('final_rift','rift',.52)]

def ambience(name,kind,level):
    r=rng_for('ambience.'+name);sec=8;n=int(sec*SR);t=np.arange(n)/SR
    # coherent periodic multi-scale motion, no time-series repetition midstream
    base=np.zeros(n)
    for hz,a in [(24,.09),(90,.08),(420,.06),(2400,.018)]:
        z=noise(n,r,hz)
        z=(z-np.mean(z))/max(np.std(z),1e-6)
        fade=np.linspace(0,1,min(n,int(SR*1)))
        k=len(fade);z[:k]=z[:k]*fade+z[-k:]*(1-fade)
        base+=a*z
    movement=.66+.20*np.sin(2*np.pi*t/sec*2+r.random())+.11*np.cos(2*np.pi*t/sec*3+r.random())
    x=base*movement*level
    if kind=='water':
        x+=.16*lp(r.standard_normal(n),1300)*(.5+.5*np.sin(2*np.pi*t/sec*4))
        for j in range(17):
            at=r.uniform(0,sec);d=r.uniform(.035,.2);s=int(d*SR)
            drop=tone(s,r,f=r.uniform(340,850),decay=17)*.16
            place(x,drop,at,wrap=True)
    elif kind=='wind':
        x+=.28*lp(r.standard_normal(n),500)*(.60+.3*np.sin(2*np.pi*t/sec*3))
    elif kind=='insects':
        for j in range(12):
            at=r.uniform(0,sec);d=r.uniform(.2,.8);s=int(d*SR)
            chirp=tone(s,r,f=r.uniform(1300,3200),harmonic=1,decay=1.9)*.035
            place(x,chirp,at,wrap=True)
    elif kind=='rain':
        x+=hp(lp(r.standard_normal(n),6500),1800)*.26
        for j in range(30):
            at=r.uniform(0,sec);s=int(.1*SR)
            place(x,noise(s,r,2000)*adsr(s,.003,.06)*.037,at,wrap=True)
    elif kind=='hearth':
        for j in range(46):
            at=r.uniform(0,sec);d=r.uniform(.01,.05);s=int(d*SR)
            place(x,noise(s,r,2100)*adsr(s,.001,.02)*.15,at,wrap=True)
        x+=.10*np.sin(2*np.pi*58*t+.10*np.sin(t*3))
    elif kind=='cave':
        x+=.20*np.sin(2*np.pi*(39+2*np.sin(t*2*np.pi/sec))*t)
        for j in range(8):
            at=r.uniform(0,sec);s=int(.22*SR)
            place(x,tone(s,r,f=r.uniform(300,540),decay=12)*.15,at,wrap=True)
    elif kind=='rift':
        x+=sum(.065*np.sin(2*np.pi*f*t+3*np.sin(t*.4*i)) for i,f in enumerate([47.3,67.5,95.9,160.8],1))
    return stereo(x,.09*np.sin(r.uniform(-3,3)))
for name,kind,lev in biomes:save(name,'ambience',ambience(name,kind,lev),{'biome':name,'mode':kind},loop=True)

# 30 physical footstep assets (15 material families, soft/heavy) + reuse with playback pitch to avoid repetition
materials={'short_grass':(600,170,.17),'tall_grass':(850,140,.20),'wet_clay':(420,110,.29),'dry_clay':(1000,180,.24),'gravel':(3800,270,.35),'limestone':(2600,380,.32),'polished_stone':(2600,520,.26),'wood_planks':(1000,340,.31),'wood_hollow':(780,200,.36),'sand':(1300,80,.19),'snow':(2300,140,.16),'ash':(540,130,.23),'shallow_water':(3400,120,.34),'wet_moss':(350,120,.14),'metal_grating':(4800,590,.43)}

def step(material,weight):
    cutoff,body,grain=materials[material];r=rng_for(f'step:{material}:{weight}')
    sec=.3 if weight=='soft' else .42;n=int(sec*SR);t=np.arange(n)/SR
    impact=np.sin(2*np.pi*body*t)*np.exp(-t*(19 if weight=='soft' else 13))
    grit=noise(n,r,cutoff)*np.exp(-t*12)*adsr(n,.001,.11)
    x=(.4 if weight=='soft' else .72)*impact+.4*grain*grit
    if material in {'shallow_water','wet_clay','wet_moss'}:
        x+=.22*noise(n,r,900)*np.exp(-t*8)*adsr(n,.015,.14)
    if 'wood' in material or material=='metal_grating':
        x+=.13*np.sin(2*np.pi*(body*1.83)*t)*np.exp(-t*8)
    if material=='gravel':
        for j in range(7):
            q=int(r.uniform(.04,.25)*SR);x[q:]+=r.normal(0,.10)*np.exp(-np.arange(n-q)/SR*34)
    return stereo(x,r.uniform(-.17,.17))
for mat in materials:
    for w in ('soft','heavy'):save('step_'+mat+'_'+w,'footsteps',step(mat,w),{'surface':mat,'weight':w})

# Creature forms and material signatures: each has multiple modes so warning vs attack is audible
species={'reed_stalker':(130,350,'wet'),'clayback':(82,210,'earth'),'glass_moth':(900,2200,'crystal'), 'ash_wolf':(180,470,'breath'), 'cavern_choir':(250,700,'harmonic'), 'mineral_warden':(58,170,'rock'), 'roof_glider':(600,1600,'wing'), 'silt_serpent':(120,570,'wet'), 'ember_beetle':(270,1250,'fire'), 'echo_hare':(510,1420,'harmonic')}

def creature(sp,action):
    f0,f1,typ=species[sp];r=rng_for(sp+action);sec={'idle':.8,'alert':1.1,'attack':.65}[action];n=int(sec*SR)
    t=np.arange(n)/SR;sweep=np.linspace(f0,f1,n)
    if action=='idle':sweep=f0+np.sin(t*7)*f0*.12
    if action=='attack':sweep=sweep[::-1]*1.25
    ph=phasor(t,sweep);x=np.sin(ph)*.37+.16*np.sin(ph*2.01)+.10*np.sin(ph*.5)
    shape=np.maximum(.0,np.sin(np.pi*t/sec))**(1.5 if action=='attack' else .8)
    x*=shape
    x+=noise(n,r,3000)*shape*({'wet':.09,'breath':.19,'earth':.16,'rock':.21,'crystal':.03,'harmonic':.01,'wing':.18,'fire':.16}[typ])
    if typ in ('rock','earth'):x+=.16*np.sin(2*np.pi*61*t)*np.exp(-t*2)
    if typ in ('harmonic','crystal'):x+=.17*np.sin(2*np.pi*(f1*1.39)*t)*(shape**1.5)
    return stereo(x,r.uniform(-.3,.3))
for sp in species:
    for action in ('idle','alert','attack'):save(sp+'_'+action,'creatures',creature(sp,action),{'species':sp,'intent':action})

# 34 meaningful interaction signals: physical + elemental variations, not UI-only bleeps
interactions=[
('open_wood_door','wood',1.1),('close_wood_door','wood',.65),('iron_latch','metal',.55),('stone_gate','rock',1.6),
('ceramic_vessel','clay',.6),('clay_pot_break','clay',.85),('crystal_prism_pickup','glass',1.2),('brass_key_turn','metal',.65),
('water_scoop','water',.88),('dry_brush','grass',.58),('ledger_turn','paper',.66),('bell_tower','bell',2.3),
('shore_splash','water',.8),('kiln_ignite','fire',1.1),('forge_hammer','metal',.65),('sluice_valve','metal',1.3),
('rope_tighten','wood',.75),('wooden_chest_unlock','wood',1.0),('archive_page','paper',.52),('ruin_pressure_plate','rock',1.05),
('environmental_shield_form','rock',1.4),('environmental_shield_break','glass',1.1),('element_mist','water',1.0),('element_ember','fire',.84),
('element_gale','air',.92),('element_silt','earth',.96),('element_resonance','bell',1.5),('perfect_dodge','air',.4),
('parry_bronze','metal',.59),('critical_claystrike','clay',.83),('stamina_empty','air',.7),('item_craft','metal',1.0),
('refuge_repair','wood',1.35),('enemy_patrol_warning','air',1.1)]

def interaction(name,typ,dur):
    r=rng_for('interaction.'+name);n=int(dur*SR);t=np.arange(n)/SR
    env=np.exp(-t*(2 if dur>1 else 4))*adsr(n,.003,min(.18,dur*.25))
    freqs={'wood':(170,380),'metal':(490,1450),'rock':(74,270),'clay':(160,600),'glass':(850,2100),'water':(280,900),'grass':(400,1300),'paper':(1100,2600),'bell':(460,1390),'fire':(90,800),'air':(500,2300),'earth':(100,420)}
    a,b=freqs[typ]
    x=(.38*np.sin(2*np.pi*a*t)+.23*np.sin(2*np.pi*b*t))*env
    x+=noise(n,r,b*1.5)*env*{'metal':.21,'paper':.5,'air':.46,'water':.39,'wood':.23,'grass':.37}.get(typ,.22)
    if typ=='water':x+=.12*np.sin(2*np.pi*(210+100*np.sin(t*15))*t)*env
    if typ=='bell':x+=.23*np.sin(2*np.pi*a*2.76*t)*np.exp(-t*2)
    if name.endswith('break') or name.endswith('form'):
        for k in range(8):
            at=r.uniform(.08,dur*.7);s=int(.1*SR)
            place(x,noise(s,r,2300)*adsr(s,.001,.08)*r.uniform(.03,.14),at)
    if name=='enemy_patrol_warning':
        x=.2*np.sin(2*np.pi*(225+50*t)*t)*(np.sin(2*np.pi*3*t)**2)*env
    return stereo(x,r.uniform(-.24,.24))
for name,typ,dur in interactions:save(name,'interaction',interaction(name,typ,dur),{'material':typ})

# Distinct original leitmotif-based acoustic clues: audible differences carry gameplay state
notes={'D':293.665,'E':329.628,'F':349.228,'G':391.995,'A':440.0,'B':493.883,'C':523.251}
clues=[('clue_water', ['D','A','E']),('clue_ash',['F','E','D']),('clue_clay',['D','G','F']),('clue_shelter',['A','G','E']),('clue_false_wall',['D','F','B']),('clue_beast_near',['E','F','E']),('clue_future_echo',['B','F','A']),('clue_past_echo',['A','E','D']),('clue_kakeya_line',['D','B','F']),('clue_hydrophone',['D','A','D']),('clue_mako',['E','G','A']),('clue_secret_exit',['G','B','D'])]
def earcon(name,sequence):
    r=rng_for('earcon:'+name);dur=1.56;n=int(SR*dur);out=np.zeros(n)
    for i,key in enumerate(sequence):
        f=notes[key]*(.5 if name.endswith('past_echo') else 1)
        z=tone(int(.70*SR),r,f=f,harmonic=5,decay=3.5)
        place(out,z*.30,i*.31)
    # occasional bell-like octave + fifth, recognizably distinct sequence
    return stereo(out,.16)
for name,sequence in clues:save(name,'clues',earcon(name,sequence),{'signal':name,'notes':sequence})

# 10 tactile UI sounds: deliberately short so menu traversal stays slick
uis=[('ui_focus',440,.07),('ui_confirm',587,.12),('ui_cancel',310,.09),('ui_tab',490,.05),('ui_page',250,.08),('ui_quest_new',660,.46),('ui_currency_gain',790,.34),('ui_rare_loot',960,.65),('ui_rest',392,.4),('ui_rewind',196,.5)]
for name,f,d in uis:
    r=rng_for('ui:'+name);n=int(d*SR);t=np.arange(n)/SR
    y=(.32*np.sin(2*np.pi*f*t)+.1*np.sin(2*np.pi*f*1.502*t))*adsr(n,.003,min(d*.65,.30))
    y*=np.exp(-t*6/d*0.2)
    if name in ('ui_rare_loot','ui_quest_new','ui_rewind'):
        y+=.13*np.sin(2*np.pi*(f+np.sin(t*7)*80)*t)*adsr(n,.04,.24)
    save(name,'ui',stereo(y),{'role':name})

MANIFEST.sort(key=lambda x:(x['category'],x['id']))
(ROOT/'manifest.json').write_text(json.dumps({'version':'1.0.0','game':'Ash & Aether: Clay and Water','sampleRate':SR,'assets':MANIFEST},indent=2))
from collections import Counter
print('generated',len(MANIFEST),'files',Counter(x['category'] for x in MANIFEST))
print('total MB',round(sum((ROOT/x['file']).stat().st_size for x in MANIFEST)/1e6,2))
