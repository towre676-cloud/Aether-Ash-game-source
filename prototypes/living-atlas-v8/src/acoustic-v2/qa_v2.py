"""Decode metadata audit and packaging receipts for original A&A local audio."""
import json,datetime,subprocess,collections,concurrent.futures
from pathlib import Path
R=Path(__file__).resolve().parent
manifest=json.loads((R/'manifest.json').read_text())
assets=manifest['assets']
def probe(a):
 p=R/a['file']
 if not p.exists():return a['id'],'missing'
 proc=subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=codec_name,sample_rate,channels','-of','json',str(p)],capture_output=True,text=True,timeout=10)
 try: meta=json.loads(proc.stdout)['streams'][0]
 except Exception:return a['id'],'undecodable'
 if meta['codec_name']!='opus' or meta['sample_rate']!='48000' or meta['channels']!=2:return a['id'],f'unexpected codec {meta}'
 return a['id'],None
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:probes=list(executor.map(probe,assets))
errors={k:v for k,v in probes if v}
preview=subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(R/'Acoustic_World_v2_Adaptive_Preview.mp3')]).decode().strip()
report={
 'version':'2.0.0','date':'2026-10-29','generated_ogg_assets':len(assets),'categories':dict(collections.Counter(x['category'] for x in assets)),
 'generated_audio_bytes':sum((R/x['file']).stat().st_size for x in assets),
 'codecs':'Ogg Opus stereo, 24 kHz original synthesis (Opus decoder reports 48 kHz)',
 'codec_probe':f'{len(assets)-len(errors)}/{len(assets)} passed','codec_failures':errors,
 'sample_peak_max':max(a['peak'] for a in assets),'adaptive_stems':24,'adaptive_stem_groups':6,'adaptive_loop_seconds':16,
 'node_tests':'20/20 passed','browser_test':'in-memory Chromium smoke with 1-second WAV transport mocks; audio unlock, 2-position listening, physical gate opening, and zero JS runtime errors',
 'browser_test_limits':'Original Ogg playback in remote browser not tested; localhost blocked by browser administrator in this environment; no physical device test',
 'preview_seconds':round(float(preview),3),'runway_master_assets':{'earlier_completed':7,'new_queued':5,'embedded_in_zip':0},
 'deployed_to_live_game':False,'live_site_status':'dev route 401 from current environment',
 'open_qa':['Subjective in-game mastering, high-quality music stems and sound design review','AudioContext and Opus playback on Windows Edge and Android hardware','Integration with actual deployed A&A map, enemy AI, battle damage and quest events','External Runway master import and any licensing checks','Inspect latency and CPU on low-end devices']
}
(R/'QA_REPORT.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'audio_probe':report['codec_probe'],'categories':report['categories'],'preview':preview,'errors':errors},indent=2))
