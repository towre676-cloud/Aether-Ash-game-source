#!/usr/bin/env python3
"""Original, deterministic 16-material atlas for Ash & Aether.
Output: 2048x2048 WebP albedo, normals, roughness, and manifest.
Requires numpy and Pillow. Optional argv[1] selects the output folder.
"""
import sys,json
from pathlib import Path
import numpy as np
from PIL import Image
N=512
MATERIALS=[
 ('timber',[112,79,47],.78),('bark',[75,70,49],.94),('basalt',[99,102,98],.9),('slate',[79,95,103],.82),
 ('plaster',[182,172,146],.89),('brick',[153,91,66],.83),('iron',[88,105,111],.58),('bronze',[162,126,70],.5),
 ('grass',[76,116,66],.96),('soil',[94,76,56],.96),('reeds',[119,135,72],.88),('leaf',[62,117,59],.86),
 ('shallow-water',[42,117,128],.23),('deep-water',[23,73,95],.14),('sand',[190,170,129],.94),('ice',[165,204,214],.29)]
OUT=Path(sys.argv[1] if len(sys.argv)>1 else 'build/hd-materials')
OUT.mkdir(parents=True,exist_ok=True)
def periodic_noise(n,period,seed):
 g=np.random.default_rng(seed).random((period,period),dtype=np.float32)
 g=np.pad(g,((0,1),(0,1)),mode='wrap')
 v=np.arange(n,dtype=np.float32)*period/n;i=v.astype('int32');t=v-i;t=t*t*(3-2*t)
 a=g[i[:,None],i[None,:]];b=g[i[:,None]+1,i[None,:]];c=g[i[:,None],i[None,:]+1];d=g[i[:,None]+1,i[None,:]+1]
 return a*(1-t[:,None])*(1-t[None,:])+b*t[:,None]*(1-t[None,:])+c*(1-t[:,None])*t[None,:]+d*t[:,None]*t[None,:]
x=np.arange(N,dtype=np.float32)[None,:]
y=np.arange(N,dtype=np.float32)[:,None]
base=np.zeros((N*4,N*4,3),dtype=np.uint8);normal=np.zeros_like(base);roughmap=np.zeros_like(base)
manifest=[]
for i,(name,color,roughness) in enumerate(MATERIALS):
 seed=72931+i*9103
 a=periodic_noise(N,4,seed);b=periodic_noise(N,18,seed+1);c=periodic_noise(N,67,seed+2)
 hf=(a-.5)*.46+(b-.5)*.34+(c-.5)*.20;contrast=.58
 if name in ('timber','bark'):
  bands=np.sin((y if name=='timber' else x)*2*np.pi/(13 if name=='timber' else 23)+7*a)
  knots=np.sin(2*np.pi*(x/96+y/287)+b*5)
  hf=hf*.36+bands*.23+knots*.07;contrast=.64
 if name=='brick':
  rows=np.floor(y/64).astype('int32');u=np.mod(x+rows*43,117);v=np.mod(y,64)
  hf=hf*.7+np.where((u<4)|(v<5),-.65,.07);contrast=.7
 if name=='slate':hf=hf*.6+np.sin((x+y*.36)*2*np.pi/49)*.12
 if name in ('iron','bronze'):hf=hf*.3+np.sin(x*2*np.pi/190+a*3)*.10;contrast=.45
 if name in ('grass','leaf','reeds'):
  hf=hf*.6+np.sin((x*1.7+y*.24)*2*np.pi/(8+i%4)+b*2)*.16;contrast=.55
 if name.endswith('water'):
  hf=hf*.18+np.sin((x*.25+y*.42)*2*np.pi/57+4*a)*.25+np.sin((x*.63-y*.16)*2*np.pi/79+2*b)*.10;contrast=.52
 if name=='sand':hf=hf*.42+c*.13
 if name=='ice':hf=hf*.22+np.sin((x-y)*2*np.pi/139+a)*.13
 raw=np.asarray(color,dtype=np.float32)[None,None,:]*(1+hf[...,None]*contrast)
 raw+=((a-.5)*14+(b-.5)*10)[...,None]*np.array([1.,.97,.92])[None,None,:]
 if name in ('iron','bronze'):
  oxid=np.maximum(0,a+b-1.18);raw=raw*(1-oxid[...,None]*.4)+np.array([71,96,69])*oxid[...,None]*.4
 if name.endswith('water'):raw+=np.maximum(0,hf-.15)[...,None]**3*210*np.array([.6,.95,1.])
 gy,gx=np.gradient(hf);gain=4.5 if name in ('basalt','brick','bark','slate') else 1.5 if name.endswith('water') else 2.8
 nx=-gx*gain;ny=-gy*gain;den=np.sqrt(nx*nx+ny*ny+1)
 normals=np.stack([(nx/den*.5+.5)*255,(ny/den*.5+.5)*255,(1/den*.5+.5)*255],axis=-1).clip(0,255).astype('uint8')
 rough=np.repeat(np.clip((roughness+(b-.5)*.12+hf*.09)*255,0,255).astype('uint8')[...,None],3,axis=-1)
 j,k=divmod(i,4);r0=j*N;c0=k*N
 base[r0:r0+N,c0:c0+N]=np.clip(raw,0,255).astype('uint8')
 normal[r0:r0+N,c0:c0+N]=normals;roughmap[r0:r0+N,c0:c0+N]=rough
 manifest.append({'id':name,'tile':[k,j],'uv':[(k+.008)/4,(j+.008)/4,(k+.992)/4,(j+.992)/4],'roughness':roughness})
for filename,data in [('hd-albedo.webp',base),('hd-normal.webp',normal),('hd-roughness.webp',roughmap)]:
 Image.fromarray(data,'RGB').save(OUT/filename,'WEBP',quality=88,method=5)
# Four quadrants retain the native CisternRenderer uMaterialAtlas UV layout.
# Each quadrant repeats a seamless 512-pixel native material swatch at 2x2
# density; shader selection remains unchanged, requiring no extra samplers.
# Order in image-space: soil floor, basalt masonry, iron metal, slate bank rock.
source=Image.fromarray(base,'RGB')
compatible=Image.new('RGB',(2048,2048))
for q,material_id in enumerate(('soil','basalt','iron','slate')):
    ix=next(i for i,item in enumerate(MATERIALS) if item[0]==material_id)
    sy,sx=divmod(ix,4)
    swatch=source.crop((sx*N,sy*N,(sx+1)*N,(sy+1)*N))
    ox=(q%2)*1024;oy=(q//2)*1024
    for dy in (0,N):
        for dx in (0,N):compatible.paste(swatch,(ox+dx,oy+dy))
compatible.save(OUT/'hd-material-atlas-compatible.webp','WEBP',quality=88,method=5)
(OUT/'materials.json').write_text(json.dumps({'version':1,'atlas':2048,'tile':512,'layout':[4,4],'materials':manifest},indent=2))
print('Generated 3 x 2048 WebP maps in',OUT)
