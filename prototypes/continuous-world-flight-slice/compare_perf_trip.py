"""Compare two real-WebGL2 route profiles, phase by phase, without FPS claims."""
import json, sys, statistics
from pathlib import Path

if len(sys.argv)<3:raise SystemExit("usage: compare_perf_trip.py baseline.json candidate.json [output.json]")
base=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
cand=json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
assert base['realWebGL2'] and cand['realWebGL2']
assert base['errors']==[] and cand['errors']==[]
assert base['simulation']==cand['simulation']=='fixed 60Hz, no test teleport'
assert base['viewport']==cand['viewport']
assert base['renderer']['renderer']==cand['renderer']['renderer'],(base['renderer'],cand['renderer'])
assert base['state']['stage']==cand['state']['stage']==5
assert base['state']['delivered'] and cand['state']['delivered']
bp={p['phase']:p for p in base['phases']}
cp={p['phase']:p for p in cand['phases']}
assert set(bp)==set(cp)
rows=[]
for name in ['walking','driving','takeoff','flight','landing','arrival']:
 a,b=bp[name],cp[name]
 def pct(key):
  before=a['raf'][key];after=b['raf'][key]
  return None if before in (None,0) or after is None else round((before-after)*100/before,2)
 row={
  'phase':name,'baselineFrames':a['frameCount'],'candidateFrames':b['frameCount'],
  'baselineRafMs':a['raf'],'candidateRafMs':b['raf'],
  'deltaRafP50Pct':pct('p50'),'deltaRafP95Pct':pct('p95'),'deltaRafP99Pct':pct('p99'),
  'baselineJsMs':a['javascript'],'candidateJsMs':b['javascript'],
  'baselineTriangles':a['meanTriangles'],'candidateTriangles':b['meanTriangles'],
  'baselineDrawCalls':a['meanDrawCalls'],'candidateDrawCalls':b['meanDrawCalls'],
  'baselineStalls':a['stalls'],'candidateStalls':b['stalls'],
  'baselineStreamingChanges':a['streamingChanges'],'candidateStreamingChanges':b['streamingChanges'],
  'candidateMeanVisibleCells':b['meanVisibleCells'],
  'candidateMeanVegetationChunks':b['meanVegetationChunks'],
  'baselineHeapBytes':a['heapSamples'],'candidateHeapBytes':b['heapSamples']
 }
 rows.append(row)
 print(f"{name:8} rAF p50 {a['raf']['p50']}->{b['raf']['p50']} ms, "+
       f"p95 {a['raf']['p95']}->{b['raf']['p95']} ms, "+
       f"p99 {a['raf']['p99']}->{b['raf']['p99']} ms, "+
       f"draw {a['meanDrawCalls']}->{b['meanDrawCalls']}, "+
       f"triangles {a['meanTriangles']}->{b['meanTriangles']}",flush=True)
out={'renderer':base['renderer'],'viewport':base['viewport'],'routeComplete':True,
     'measure':'Chromium software-renderer delivered rAF/JS wall time, NOT actual GPU or mobile FPS',
     'baselineUpload':base['uploads'],'candidateUpload':cand['uploads'],'phases':rows}
destination=Path(sys.argv[3] if len(sys.argv)>3 else 'flight-perf-comparison.json')
destination.write_text(json.dumps(out,indent=2),encoding='utf-8')
print('Saved',destination,flush=True)
