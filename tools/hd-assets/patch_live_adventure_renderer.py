#!/usr/bin/env python3
"""Patch only current served Adventure3DRenderer's scene-owned material handoff.
The ordinary adventure deliberately overrides CisternRenderer.loadMaterialImage.
That base function must NOT load a dungeon atlas over the scene's authored art.
"""
from pathlib import Path
import hashlib,sys,json
if len(sys.argv)!=3:raise SystemExit('Usage: patch_live_adventure_renderer.py LIVE_JS OUTPUT_JS')
source=Path(sys.argv[1]);output=Path(sys.argv[2])
if source.resolve()==output.resolve():raise SystemExit('Refusing in-place edit')
code=source.read_text()
expected="setMaterialImage(image){if(!image?.width)return;this.materialImage=image;this.forceRender=true;if(this.gl&&!this.lost)this.uploadMaterial();}"
if code.count(expected)!=1 or 'class Adventure3DRenderer extends CisternRenderer' not in code or 'remaining-scenes-' not in code:
 raise SystemExit('Refusing patch: authoritative scene/material interface has changed')
if 'hdDetailSource' in code:raise SystemExit('Already contains high-definition scene material source')
replacement=r"""setMaterialImage(image){
  if(!image?.width)return;
  // Keep the current scene's original painted surface as the source of truth.
  // This hook is called by applySceneMaterial with a revision-safe token.
  this.hdDetailSource=image;
  const g=this.gl;
  if(this.hdCapabilityChecked!==true){
    this.hdCapabilityChecked=true;
    const extension=g?.getExtension?.('WEBGL_debug_renderer_info');
    const model=g?String(g.getParameter(extension?.UNMASKED_RENDERER_WEBGL||g.RENDERER)||''):'';
    this.lowCostRenderer=!!this.software||/swiftshader|llvmpipe|software|softpipe/i.test(model);
    this.hdMaterialAllowed=!!g&&!this.lowCostRenderer&&this.effectiveQuality()==='high'&&g.getParameter(g.MAX_TEXTURE_SIZE)>=2048;
  }
  if(this.canvas?.dataset)this.canvas.dataset.hdRendererMode=this.lowCostRenderer?'software-lowcost':this.hdMaterialAllowed?'hardware-2048':'compat-legacy';
  let selected=image;
  if(this.hdMaterialAllowed&&this.hdDetailTexture?.complete&&this.hdDetailTexture.naturalWidth===2048){
    // Blend native-scale authored surfaces with tiled original high-resolution
    // detail. Never discard scene/biome floor colors, UV domains or gameplay.
    const surface=document.createElement('canvas');surface.width=surface.height=2048;
    const ctx=surface.getContext('2d',{alpha:false});
    if(ctx){
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(image,0,0,2048,2048);
      ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.14;
      ctx.drawImage(this.hdDetailTexture,0,0,2048,2048);
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      selected=surface;
    }
  }else if(this.hdMaterialAllowed&&!this.hdDetailRequested&&typeof Image!=='undefined'){
    this.hdDetailRequested=true;
    const detail=new Image();
    detail.onload=()=>{if(this.destroyed)return;this.hdDetailTexture=detail;
      if(this.hdDetailSource)this.setMaterialImage(this.hdDetailSource);};
    detail.onerror=()=>{this.hdDetailTexture=null;};
    detail.src=new URL('./art/hd-materials/hd-material-atlas-compatible.webp',import.meta.url).href;
  }
  this.materialImage=selected;this.forceRender=true;
  if(g&&!this.lost)this.uploadMaterial();
}"""
updated=code.replace(expected,replacement,1)
if not all(s in updated for s in ['hdMaterialAllowed','hdDetailTexture','hdRendererMode','this.uploadMaterial()','applySceneMaterial','loadMaterialImage(){}']):
 raise SystemExit('Safety: original game renderer not preserved')
output.parent.mkdir(parents=True,exist_ok=True);output.write_text(updated)
def sha(x):return hashlib.sha256(x.encode()).hexdigest()
print(json.dumps({'source_sha256':sha(code),'patched_sha256':sha(updated),'source_paint_preserved':True,'webgl_software_fallback':True,'state_modified':False},indent=2))
