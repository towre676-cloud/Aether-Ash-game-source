#!/usr/bin/env python3
"""Bundle A&A environment renderer into one HTML art walkthrough.

Uses remotely hosted public Three.js modules as the only network dependency.
Does not claim to be the published campaign or include its save/combat code.
"""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
TYPES=(
 ('Util','util.mjs',[],['clamp','hash32','pick','deepClone']),
 ('SceneComposer','scene-composer.mjs',['const {hash32}=Util;'],['DEFAULT_ZONE_RULES','authorScene','socialClusters','placementHealth']),
 ('DungeonDirector','dungeon-director.mjs',['const {hash32}=Util;'],['buildDungeonSequence','applyDungeonAction']),
 ('EnvPlan','environment-plan.mjs',['const {hash32}=Util;'],['footprintRadius','distanceFromFootprint','routeAroundArchitecture','landmarkRole','ENVIRONMENT_PALETTES','biomeFamily','pathClearance','planEnvironment','validateEnvironmentPlan']),
 ('DetailKit','environment-detail-kit.mjs',[],['dressHouse','dressTower','dressDungeon']),
 ('Plants','environment-vegetation.mjs',[],['PLANT_TYPES','plantGeometry','vegetationTier','plantNativeField','attachSubtleWind']),
 ('GroundMaterials','ground-materials.mjs',[],['MATERIALS','MATERIAL_BY_ID','MATERIAL_REALMS','getGroundMaterial','analyzeGround']),
 ('GroundSynthesis','ground-synthesis.mjs',['const {getGroundMaterial}=GroundMaterials;'],['generateGroundMaps','createNarrativeWearField']),
 ('EnvRenderer','environment-renderer.mjs',[
  'const {ENVIRONMENT_PALETTES,planEnvironment,biomeFamily}=EnvPlan;',
  'const {dressHouse,dressTower,dressDungeon}=DetailKit;',
  'const {plantNativeField,attachSubtleWind}=Plants;',
  'const {MATERIAL_BY_ID}=GroundMaterials;',
  'const {generateGroundMaps}=GroundSynthesis;'
 ],['batchEnvironmentGeometry','createEnvironmentRenderer','groundMaterialFromWorld']),
)
def build():
 wrappers=[]
 for name,filename,bindings,returns in TYPES:
  content=(ROOT/'src'/filename).read_text()
  content=re.sub(r'^import [^\n]+;\s*$', '',content,flags=re.M)
  content=re.sub(r'\bexport (?=(?:const|function|class)\b)','',content)
  wrappers.append(f'const {name}=(()=>{{\n'+ '\n'.join(bindings)+'\n'+content+'\nreturn {'+','.join(returns)+'};\n})();')
 html=(ROOT/'preview/index.html').read_text()
 html=html.replace('5.36','5.37').replace('ASH & AETHER · WORLD ART STUDY','ASH & AETHER · LIVING WORLD')
 html=html.replace('Weathered masonry, warm windows, carved thresholds.','Streets that lead to doors. Places with histories.')
 html=html.replace('Drag to look · pinch / scroll to keep your zoom · WASD to move · tap terrain to walk',
 'Drag to look · pinch to zoom · tap to walk · WASD · N night · R rain')
 html=html.replace(" const {authorScene}=await import('../src/scene-composer.mjs');",' const {authorScene}=SceneComposer;')
 html=html.replace(" const {createEnvironmentRenderer}=await import('../src/environment-renderer.mjs');",' const {createEnvironmentRenderer}=EnvRenderer;')
 html=html.replace(" const {buildDungeonSequence}=await import('../src/dungeon-director.mjs');",' const {buildDungeonSequence}=DungeonDirector;')
 html=html.replace('<script type="module">\ntry {','<script type="module">\ntry {\n'+'\n'.join(wrappers))
 html=html.replace('controls.minDistance=4;controls.maxDistance=32','controls.minDistance=3;controls.maxDistance=26')
 html=html.replace('camera.position.set(human.position.x+9,9,human.position.z+13)', 'camera.position.set(human.position.x+6.4,5.6,human.position.z+8.4)')
 html=html.replace("let active='ash',time=0,clickMove=null;", "let active='ash',time=0,clickMove=null,lastInterior=null,night=false,rain=false;")
 html=html.replace("function switchScene(k){active=k;clickMove=null;const d=defs[k];", "function switchScene(k){active=k;clickMove=null;lastInterior=null;const d=defs[k];")
 html=html.replace("if(/^Digit[1-5]$/.test(e.code))switchScene", "if(e.code==='KeyN'){night=!night;manager.environmentMood({night:night?1:0,rain:rain?1:0});}if(e.code==='KeyR'){rain=!rain;manager.environmentMood({night:night?1:0,rain:rain?1:0});}if(/^Digit[1-5]$/.test(e.code))switchScene")
 needle='  controls.target.lerp(new T.Vector3(human.position.x,1.4+human.position.y,human.position.z),Math.min(1,dt*5));'
 repl='''  if(active!=='dungeon'){
    const nearest=manager.plan?.placements?.filter(p=>p.role==='dwelling'||p.role==='workshop')
      .find(p=>Math.hypot(p.x-human.position.x,p.z-human.position.z)<2.1);
    const newInterior=nearest?.anchorId||null;
    if(newInterior!==lastInterior){if(lastInterior)manager.revealInterior(lastInterior,false);
      if(newInterior)manager.revealInterior(newInterior,true);lastInterior=newInterior;}
  }
''' +needle
 assert needle in html
 html=html.replace(needle,repl)
 html=html.replace("const out=manager.stats();document.getElementById('quality').textContent", "manager.environmentMood({night:night?1:0,rain:rain?1:0});\n   const out=manager.stats();document.getElementById('quality').textContent")
 out=ROOT/'preview/standalone-environment-5.37.html'
 out.write_text(html)
 print(out, out.stat().st_size)
if __name__=='__main__':build()
