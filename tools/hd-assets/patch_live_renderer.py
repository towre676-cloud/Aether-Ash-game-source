#!/usr/bin/env python3
"""Fail-closed adaptation of the *current served* CisternRenderer:
 - quality-aware low-cost fragment shader for software GPUs / low devices
 - 2048 first-party albedo compatibility atlas on capable GPUs
 - original shader, material atlas, lighting, save and collision retained as fallbacks

Usage: python patch_live_renderer.py current-cistern-renderer.js patched-cistern-renderer.js
Never writes the currently published Site or mutates gameplay.
"""
from pathlib import Path
import sys, hashlib, json
if len(sys.argv)!=3:raise SystemExit('Usage: patch_live_renderer.py INPUT OUTPUT')
src=Path(sys.argv[1]);out=Path(sys.argv[2])
if src.resolve()==out.resolve():raise SystemExit('Never overwrite source')
s=src.read_text()
def sub(anchor,replacement):
 global s
 count=s.count(anchor)
 if count!=1:raise SystemExit(f'Source layout changed; refusing patch: {anchor[:82]!r} (found {count})')
 s=s.replace(anchor,replacement,1)
if 'uniform float uFastPreview;' in s:raise SystemExit('Already patched')
if "remaining-scenes-" not in s or "class CisternRenderer" not in s:raise SystemExit('Not the current production renderer')
sub('uniform sampler2D uSoilTexture;uniform float uSoilReady;',
    'uniform sampler2D uSoilTexture;uniform float uSoilReady;uniform float uFastPreview;')
sub('if(p.x<.001||p.x>.999||p.y<.001||p.y>.999||p.z<0.0||p.z>1.0)return 1.0;float s=0.0;',
    'if(p.x<.001||p.x>.999||p.y<.001||p.y>.999||p.z<0.0||p.z>1.0)return 1.0;'
    'if(uFastPreview>.5){float depth=unpackDepth(texture2D(uShadow,p.xy));return p.z-.003>depth?.46:1.0;}float s=0.0;')
sub('float grit=noise(vWorld*7.0),grain=noise(vWorld*33.0),rough=.75;',
    'float grit=uFastPreview>.5?.5:noise(vWorld*7.0),grain=uFastPreview>.5?.5:noise(vWorld*33.0),rough=.75;')
sub('vec3 detailX=texture2D(uMaterialAtlas,uv+vec2(.0012,0.)).rgb,detailY=texture2D(uMaterialAtlas,uv+vec2(0.,.0012)).rgb;',
    'vec3 detailX=detail,detailY=detail;'
    'if(uFastPreview<.5){detailX=texture2D(uMaterialAtlas,uv+vec2(.0012,0.)).rgb;'
    'detailY=texture2D(uMaterialAtlas,uv+vec2(0.,.0012)).rgb;}')
sub('detailX=mix(detailX,texture2D(uMaterialAtlas,rockUV+vec2(.0012,0.)).rgb,bankRock);detailY=mix(detailY,texture2D(uMaterialAtlas,rockUV+vec2(0.,.0012)).rgb,bankRock);',
    'if(uFastPreview<.5){detailX=mix(detailX,texture2D(uMaterialAtlas,rockUV+vec2(.0012,0.)).rgb,bankRock);'
    'detailY=mix(detailY,texture2D(uMaterialAtlas,rockUV+vec2(0.,.0012)).rgb,bankRock);}')
sub('for(int i=0;i<8;i++){vec3 delta=',
    'for(int i=0;i<8;i++){if(uFastPreview>.5&&i>=2)break;vec3 delta=')
sub("'uMaterialAtlas','uMaterialReady','uArchitectureAtlas'",
    "'uMaterialAtlas','uMaterialReady','uFastPreview','uArchitectureAtlas'")
sub('g.uniform1f(this.uniforms.uTime, time); g.uniform2f(this.uniforms.uResolution,',
    "g.uniform1f(this.uniforms.uTime, time);g.uniform1f(this.uniforms.uFastPreview,this.effectiveQuality()==='low'||this.lowCostRenderer?1:0); g.uniform2f(this.uniforms.uResolution,")
sub("loadMaterialImage(){\n    if(typeof Image==='undefined')return;",
    """loadMaterialImage(){
    // Hardware detection is done once at image load, never per frame.
    const g=this.gl,debug=g?.getExtension?.('WEBGL_debug_renderer_info');
    const rendererName=g?String(g.getParameter(debug?.UNMASKED_RENDERER_WEBGL||g.RENDERER)||''):'';
    this.lowCostRenderer=/swiftshader|llvmpipe|software|softpipe/i.test(rendererName);
    this.hdMaterialAllowed=!!g&&!this.lowCostRenderer&&this.effectiveQuality()==='high'&&g.getParameter(g.MAX_TEXTURE_SIZE)>=2048;
    if(this.canvas?.dataset)this.canvas.dataset.hdRendererMode=this.lowCostRenderer?'software-lowcost':this.hdMaterialAllowed?'hardware-2048':'compat-legacy';
    if(typeof Image==='undefined')return;""")
sub("theme==='kiln'||theme==='prism'?'./art/cistern/'+theme+'-materials-v109.webp':'./art/cistern/material-atlas-v2.webp'",
    "theme==='kiln'||theme==='prism'?'./art/cistern/'+theme+'-materials-v109.webp':this.hdMaterialAllowed?'./art/hd-materials/hd-material-atlas-compatible.webp':'./art/cistern/material-atlas-v2.webp'")
sub("const tile=document.createElement('canvas');tile.width=tile.height=1024;const c=tile.getContext('2d');if(c){c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(source,0,0,1024,1024);source=tile;}",
    "const tile=document.createElement('canvas');tile.width=tile.height=this.hdMaterialAllowed?2048:1024;const c=tile.getContext('2d');if(c){c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(source,0,0,tile.width,tile.height);source=tile;}")
if not all(x in s for x in ("class CisternRenderer","uFastPreview","hd-material-atlas-compatible.webp","shadowProgram","gl_FragColor")):raise SystemExit('Safety: renderer assets missing')
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(s)
digest=lambda x:hashlib.sha256(x.encode()).hexdigest()
print(json.dumps({'readOnly':True,'sourceSHA256':digest(src.read_text()),'patchedSHA256':digest(s),'materialAtlas':'hd-material-atlas-compatible.webp','softwareFallback':True,'shaderQualityBranch':True},indent=2))
