#!/usr/bin/env python3
"""v4 reproducible codec, checksum, source/test and browser acceptance summary."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import collections,hashlib,json,subprocess,re,datetime,sys
ROOT=Path(__file__).resolve().parent
manifest=json.loads((ROOT/'manifest.json').read_text());assets=manifest['assets']
assert manifest['version']=='4.0.0' and len(assets)==512 and len({a['id'] for a in assets})==512

def probe(a):
 f=ROOT/a['file']
 if not f.is_file():return a['id'],'missing'
 try:
  p=subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=codec_name,sample_rate,channels:format=duration','-of','json',str(f)],capture_output=True,text=True,timeout=12,check=True)
  data=json.loads(p.stdout);stream=data['streams'][0];length=float(data['format']['duration'])
  if (stream['codec_name'],str(stream['sample_rate']),stream['channels'])!=('opus','48000',2):return a['id'],'wrong codec/format'
  if abs(length-a['duration'])>.12:return a['id'],f'duration discrepancy {length:.2f} vs {a["duration"]:.2f}'
  if hashlib.sha256(f.read_bytes()).hexdigest()!=a['sha256']:return a['id'],'SHA mismatch'
  if not 0<a['peak']<=.9:return a['id'],'peak metadata invalid'
  return a['id'],None
 except Exception as exc:return a['id'],str(exc)
with ThreadPoolExecutor(max_workers=12) as pool:result=list(pool.map(probe,assets))
errors={name:error for name,error in result if error}
node=subprocess.run(['npm','test'],cwd=ROOT,capture_output=True,text=True,timeout=40)
pass_match=re.search(r'# pass (\d+)',node.stdout);fail_match=re.search(r'# fail (\d+)',node.stdout)
passed=int(pass_match.group(1)) if pass_match else 0;failed=int(fail_match.group(1)) if fail_match else -1
preview=ROOT/'Acoustic_World_v4_Reactive_Experience.mp3'
seconds=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(preview)],text=True).strip())
smoke=json.loads((ROOT/'QA_BROWSER_V4.json').read_text());real=json.loads((ROOT/'QA_BROWSER_REAL_OPUS.json').read_text())
report={'version':'4.0.0','date':'2026-10-29','local_audio_assets':len(assets),'new_v4_audio_assets':128,'categories':dict(collections.Counter(a['category'] for a in assets)),
 'audio_bytes':sum((ROOT/a['file']).stat().st_size for a in assets),'codec_sha_duration_check':{'passed':len(assets)-len(errors),'total':len(assets),'errors':errors},
 'node_tests':{'passed':passed,'failed':failed,'expected':41},'browser_smoke_wav':smoke,'browser_real_opus':real,'preview_seconds':round(seconds,2),
 'studio_masters':{'completed_in_connected_audio_workspace':12,'included_in_zip':0,'reason':'short-lived provider URLs could not be materialized to local build'},
 'live_game_deployed':False,'site_access':'Prior attempt returned 401; no writable live Site connection in this session',
 'remaining_acceptance':['Connect to authorized actual A&A Site and map real event APIs','Profile on physical Windows Edge and Android','Import and master long-form studio audio; re-score into adaptive stems','Tune mix and dynamic-range against actual game video','Run full playthrough and hearing-accessibility QA']}
(ROOT/'QA_REPORT.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'assets':len(assets),'codec_verified':len(assets)-len(errors),'failed_files':errors,'tests_passed':passed,'tests_failed':failed,'headless_real_opus_decoded':real['after']['decoded'],'preview_sec':seconds},indent=2))
if errors or node.returncode or failed or passed!=41 or not (63.8<seconds<64.2) or smoke['js_errors'] or real['js_errors'] or real['after']['decoded']<6:sys.exit(1)
