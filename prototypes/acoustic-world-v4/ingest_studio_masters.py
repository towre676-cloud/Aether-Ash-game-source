#!/usr/bin/env python3
"""Idempotently include downloaded, user-owned studio masters as stable local files.
Example:
  python ingest_studio_masters.py --mapping studio_download_map.json
Mapping format: {"voice_archivist_paths":"C:/Users/me/Downloads/archivist.mp3"}
No temporary Runway URL should ever enter this manifest.
"""
from pathlib import Path
import json,subprocess,argparse,hashlib,shutil
ROOT=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--mapping',required=True);args=p.parse_args()
master=json.loads((ROOT/'external_runway/STUDIO_MASTER_REGISTRY.json').read_text())
known={s['id']:s for s in master['masters']}
mapping=json.loads(Path(args.mapping).read_text())
if not mapping or any(key not in known for key in mapping):raise ValueError('Empty or unknown studio asset ids')
output=ROOT/'assets/audio/studio';output.mkdir(exist_ok=True,parents=True)
entries=[]
for id,src in mapping.items():
 source=Path(src).expanduser().resolve()
 if not source.is_file() or source.suffix.lower() not in ('.mp3','.wav','.ogg','.flac'):
  raise ValueError(f'File not found or unsupported codec: {src}')
 ffprobe=subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=codec_name,channels','-show_entries','format=duration','-of','json',str(source)],capture_output=True,text=True)
 try:media=json.loads(ffprobe.stdout);codec=media['streams'][0]['codec_name'];duration=float(media['format']['duration'])
 except Exception as err:raise ValueError(f'Unusable studio audio: {src}') from err
 if duration<.2 or duration>900:raise ValueError('Suspicious length: '+str(source))
 # Decode & normalize to web-friendly constant MP3 and keep the author file unmodified.
 dest=output/(id+'.mp3')
 command=['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y','-i',str(source),'-vn','-ar','48000','-ac','2','-c:a','libmp3lame','-q:a','3',str(dest)]
 done=subprocess.run(command,capture_output=True,text=True)
 if done.returncode:raise RuntimeError(done.stderr[:1000])
 item=known[id];entries.append({'id':id,'file':str(dest.relative_to(ROOT)).replace('\\','/'),'kind':item['kind'],'lineId':item.get('lineId'), 'duration':round(duration,2),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
manifestPath=ROOT/'studio_manifest.json';prior=json.loads(manifestPath.read_text()) if manifestPath.exists() else {'version':1,'assets':[]}
entriesById={entry['id']:entry for entry in prior['assets']};entriesById.update({entry['id']:entry for entry in entries});prior['assets']=sorted(entriesById.values(),key=lambda x:x['id'])
manifestPath.write_text(json.dumps(prior,indent=2));print(f'Imported {len(entries)} studio masters; local registry now {len(entriesById)}.')
print('Host voice registration: for each entry with lineId call director.event("voice:register",{id:lineId,url:"/audio/"+file}) using your actual installed audio base path.')
