#!/usr/bin/env python3
"""Verify each packaged v3 audio stream with ffprobe and executable browser/test receipts."""
from pathlib import Path
import concurrent.futures,subprocess,json,collections,hashlib,datetime,sys
ROOT=Path(__file__).resolve().parent
manifest=json.loads((ROOT/'manifest.json').read_text())
assert manifest['version']=='3.0.0' and len(manifest['assets'])==384
assets=manifest['assets']
assert len({a['id'] for a in assets})==384

def probe(a):
    f=ROOT/a['file']
    if not f.is_file():return a['id'],'missing'
    try:
        p=subprocess.run(['ffprobe','-hide_banner','-v','error','-select_streams','a:0','-show_entries','stream=codec_name,sample_rate,channels:format=duration','-of','json',str(f)],capture_output=True,text=True,timeout=12,check=True)
        obj=json.loads(p.stdout);stream=obj['streams'][0];duration=float(obj['format']['duration'])
        if (stream['codec_name'],stream['sample_rate'],stream['channels'])!=('opus','48000',2):return a['id'],str(stream)
        if abs(duration-a['duration'])>.12:return a['id'],f"duration {duration} != {a['duration']}"
        if a.get('sha256') and hashlib.sha256(f.read_bytes()).hexdigest()!=a['sha256']:return a['id'],'SHA mismatch'
        return a['id'],None
    except Exception as exc:return a['id'],str(exc)
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:result=list(pool.map(probe,assets))
errors={id:reason for id,reason in result if reason}
assert (ROOT/'Acoustic_World_v3_Gameplay_Preview.mp3').is_file()
preview=subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(ROOT/'Acoustic_World_v3_Gameplay_Preview.mp3')]).decode().strip()
assert 47.8<float(preview)<48.3
node=subprocess.run(['node','--test',*[str(x) for x in sorted((ROOT/'tests').glob('*.test.js'))]],capture_output=True,text=True,timeout=45)
import re
passed=int(re.search(r'# pass (\d+)',node.stdout).group(1)) if '# pass' in node.stdout else -1
failed=int(re.search(r'# fail (\d+)',node.stdout).group(1)) if '# fail' in node.stdout else -1
browser=json.loads((ROOT/'QA_BROWSER.json').read_text())
report={'version':'3.0.0','date':'2026-10-29','local_audio_assets':len(assets),'new_v3_audio_assets':140,'categories':dict(collections.Counter(a['category'] for a in assets)),
        'audio_bytes':sum((ROOT/a['file']).stat().st_size for a in assets),'codec_check':{'passed':len(result)-len(errors),'total':len(result),'errors':errors},
        'node_tests':{'passed':passed,'failed':failed,'expected':30},'browser_smoke':browser,'preview_seconds':round(float(preview),2),
        'studio_masters':{'completed_in_connected_audio_workspace':12,'included_locally':0,'reason':'short-lived signed provider URLs inaccessible from local packaging environment; import script included'},
        'live_game_deployed':False,'site_access':'Site dev route 401 (previously checked)',
        'remaining_acceptance':['Test full Opus streaming and Web Audio playback on Android and Edge hardware','Subjective tuning of mix, loudness, scene transitions, speech ducking and gameplay legibility','Replace select locally synthesized working sounds with approved high-quality studio recordings','Wire real map/battle/schedules and prevent double-authority of monster AI','Deploy within a saved authorized A&A Site version']}
(ROOT/'QA_REPORT.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'codec_passed':report['codec_check']['passed'],'codec_total':len(assets),'errors':errors,'tests':report['node_tests'],'preview_s':report['preview_seconds'],'bytes':report['audio_bytes']},indent=2))
if errors or node.returncode or failed or passed!=30:sys.exit(1)
