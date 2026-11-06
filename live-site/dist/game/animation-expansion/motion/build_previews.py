from pathlib import Path
import subprocess,json,hashlib
from PIL import Image
P=Path(__file__).resolve().parent
sheets=[('crew-actions-v1.webp',['Iona','Rook','Mira']),('crew-actions-secondary-v1.webp',['Brass','Riven','Veyr']),('monster-actions-v1.webp',['Beetle','Moth','Raven'])]
manifest={'schema':'ash-aether.motion-drafts/1','status':'generated frame animation drafts; not final rigs or cinematic footage','frame_rate':8,'source_columns':6,'source_rows':3,'assets':[],'remaining_quality_gates':['frame-to-frame costume and hand continuity','root/baseline registration','cell-edge clipping on extended attacks','character proportions versus cinematic portraits','branch-selected shot integration','voiced lip-sync and final sound mix']}
for file,names in sheets:
 path=P/file;source_path=P/(path.stem+'-clean.webp');im=Image.open(source_path);w,h=im.size
 frames=[]
 for row,name in enumerate(names):
  cw,ch=w/6,h/3
  frames.append({'actor':name,'row':row,'frames':[{'index':f,'source_rect':[f*cw,row*ch,cw,ch],'phase':['ready','anticipation','windup','action','recovery','reset'][f]}for f in range(6)]})
 # Three independently changing rows, presented horizontally in a short silent animation study.
 flt="[0:v]split=3[a][b][c];"
 for i,k in enumerate('abc'):
  flt+=f"[{k}]crop=w=iw/6:h=ih/3:x='floor(mod(t*8,6))*iw/6':y=ih/3*{i},setsar=1[{k}c];"
 flt+="[ac][bc][cc]hstack=inputs=3,scale=1200:420:force_original_aspect_ratio=decrease,format=rgba[fg];color=c=0x15212b:s=1280x720:r=24:d=6[bg];[bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[out]"
 out=P/(path.stem+'.mp4');temporary=P/(path.stem+'.pending.mp4')
 cmd=['ffmpeg','-v','error','-y','-loop','1','-framerate','24','-i',str(source_path),'-filter_complex',flt,'-map','[out]','-t','6','-c:v','libx264','-preset','fast','-crf','20','-movflags','+frag_keyframe+empty_moov',str(temporary)]
 subprocess.run(cmd,check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(temporary)]));assert float(probe['format']['duration'])>=5.9
 temporary.replace(out)
 manifest['assets'].append({'file':source_path.name,'original_file':'development/publication-originals/motion/'+file,'sha256':hashlib.sha256(source_path.read_bytes()).hexdigest(),'width':w,'height':h,'alpha':im.mode=='RGBA','clip':out.name,'clip_duration_seconds':6,'rows':frames})
p=P/'scenery-chapters-2-5.webp';im=Image.open(p)
manifest['scenery']={'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'width':im.width,'height':im.height,'columns':2,'rows':2,'chapters':[2,3,4,5],'status':'proposed scenery interpretation; not exact gameplay geometry'}
manifest['original_source_directory']='development/publication-originals/motion (source repository; cleaned display atlases remain public)'
(P/'motion-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'sheets':3,'actors':9,'distinct_frame_cells':54,'silent_motion_previews':3}))
