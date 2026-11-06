#!/usr/bin/env python3
"""Bake original generated RPG prop paintings into offline item portrait assets.
Source art is a generated concept sheet. Crops are decorative; item identity/stats remain in the engine.
"""
from PIL import Image,ImageEnhance,ImageFilter,ImageOps,ImageDraw
from pathlib import Path
P=Path(__file__).resolve().parent
source=Image.open(P/'assets'/'art-source-rpg-generated.png').convert('RGB')
out=P/'assets'/'items';out.mkdir(parents=True,exist_ok=True)
# Exact interior crop coordinates in original generated multi-prop illustration.
# For unsupported or ambiguous item silhouettes, nearest matching class prop is used.
placements={
 'sword':(0,0),'spear':(1,0),'axe':(6,1),'hammer':(5,5),'bow':(3,2),
 'staff':(0,5),'scepter':(4,4),'dagger':(1,4),'shield':(1,3),
 'crown':(6,0),'helm':(3,0),'hood':(2,2),'visor':(0,3),
 'armor':(0,1),'robe':(3,3),'mantle':(5,4),'pauldrons':(4,1),
 'glove':(5,3),'gauntlet':(5,3),'legs':(2,3),'boots':(6,2),
 'amulet':(4,4),'ring':(1,2),'relic':(4,3),'lantern':(3,4),
 'tome':(3,1),'sigil':(6,6)
}
# Generated visual reference has 7 columns, 8 rows, ~56 x 65 tiles.
# Export only classes whose painting depicts an approximately matching object.
usable={'sword','spear','axe','bow','shield','crown','helm','hood','armor','robe','mantle','legs','boots','ring','relic','scepter','sigil'}
placements={k:v for k,v in placements.items() if k in usable}
for stale in out.glob('*.webp'):stale.unlink()
cols=[447,503,560,617,673,730,787]
rows=[166,234,302,370,438,506,574,641]
for name,(col,row) in placements.items():
 x,y=cols[col],rows[row]
 # keep silhouette and textured interior while removing surrounding border + counters
 crop=source.crop((x+5,y+5,x+48,y+41))
 # Square prop plate, matching existing icon frames. Upscale using high-quality resampling.
 tile=Image.new('RGBA',(256,256),(0,0,0,0))
 base=ImageOps.fit(crop,(220,220),method=Image.Resampling.LANCZOS,centering=(.5,.5))
 base=ImageEnhance.Contrast(base).enhance(1.13)
 base=ImageEnhance.Sharpness(base).enhance(1.5)
 base=base.filter(ImageFilter.UnsharpMask(radius=1.4,percent=90,threshold=2))
 # Rounded geometric card mask separates illustration from UI and is GPU inexpensive.
 mask=Image.new('L',(220,220),0)
 md=ImageDraw.Draw(mask);md.rounded_rectangle((0,0,219,219),radius=16,fill=255)
 tile.paste(base,(18,18),mask)
 tile.save(out/f'{name}.webp','WEBP',quality=90,method=6)
print('Wrote',len(placements),'baked equipment artworks,',sum(p.stat().st_size for p in out.glob('*.webp')),'bytes')
# simple QA sample panel
preview=Image.new('RGB',(7*150,4*185),(12,23,28));d=ImageDraw.Draw(preview)
for i,(name) in enumerate(placements):
 im=Image.open(out/f'{name}.webp').convert('RGBA').resize((136,136))
 x=(i%7)*150;y=(i//7)*185
 preview.paste(im,(x+7,y),im);d.text((x+5,y+141),name,fill=(230,209,165))
preview.save(P/'assets'/'v3-art-contact-sheet.png')
