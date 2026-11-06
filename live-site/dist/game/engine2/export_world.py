"""Build the new runtime's scene graph from authored campaign data.
Only collision geometry is decoded; no original scene graphics are exported.
The engine pass does not rewrite the audit session's campaign authoring files.
"""
import json,sys,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT))
from tools.map_props import grid,exits
source=Path(sys.argv[1]).read_bytes();tools=ROOT.parent/'third_party/temporal-redux'
campaign_path=Path(sys.argv[2]) if len(sys.argv)>2 else ROOT/'game/romhack/campaign.json'
campaign=json.loads(campaign_path.read_text());skills=json.loads((ROOT/'game/romhack/skill_tree.json').read_text());scenes=[]
for m in campaign['missions']:
 for room in m['rooms']:
  loc=room['location'];w,h,cells=grid(source,tools,loc);bounds=list(source[0x360000+14*loc+10:0x360000+14*loc+14]);left,top,right,bottom=bounds
  if left&128:left,top,right,bottom=0,0,w-1,h-1
  floor=[''.join('.'if c!='#'and left<=x<=right and top<=y<=bottom else '#'for x,c in enumerate(row))for y,row in enumerate(cells)]
  floor=[list(row)for row in floor]
  def reachable():
   queue=[tuple(room['arrive'])];seen=set(queue)
   while queue:
    x,y=queue.pop()
    for a,b in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
     if 0<=a<w and 0<=b<h and floor[b][a]=='.' and (a,b)not in seen:seen.add((a,b));queue.append((a,b))
   return seen
  for obj in room['objects']:
   xy=obj.get('xy')or(obj.get('enemies')or[[0,None]])[0][1]
   if not xy:continue
   seen=reachable();x,y=xy
   if any((x+dx,y+dy)in seen for dx in [-1,0,1]for dy in [-1,0,1]):continue
   a,b=min(seen,key=lambda v:abs(v[0]-x)+abs(v[1]-y))
   while(a,b)!=(x,y):
    a+=(x>a)-(x<a)if a!=x else 0
    if a==x:b+=(y>b)-(y<b)
    floor[b][a]='.'
  floor=[''.join(row)for row in floor]
  native=exits(source,loc);doors=[]
  for i,ex in enumerate(native):
   route=next((r for r in room.get('exits',[])if r['index']==i),None);target=route.get('to')if route else room.get('default_exit_to','hub')
   doors.append({**(route or {}),'xy':ex['tiles'][len(ex['tiles'])//2],'to':target,'arrive':route.get('arrive')if route else None})
  theme=1 if room['key']in ['town','home','inn','market','guild','clinic','carpenter']else 0 if m['id']<=6 or room['key']=='instrumentworks'else 1 if m['id']in [7,9,15]else 2 if m['id']in [10,11,12,13,14,20,21]else 3
  scenes.append({**room,'chapter':m['id'],'width':w,'height':h,'floor':floor,'doors':doors,'theme':theme,'song':room.get('song',m['field_song'])})
# The resistance's headquarters uses a new broad workshop floor, with distinct facilities.
floor=['#'*24]+['#'+'.'*22+'#'for _ in range(15)]+['#'*24]
scenes.append({'key':'hub','location':226,'chapter':0,'width':24,'height':17,'floor':floor,'theme':0,'arrive':[12,11],'song':6,'doors':[], 'objects':[
 {'type':'guide','xy':[12,7],'sprite':3},{'type':'transport','xy':[17,9],'sprite':2,'title':'CINDERFALL COMMONS','labels':['Visit the festival square','Rest and recover','Stay at the Kiln'],'destinations':['town','rest','stay']},
 {'type':'shop','xy':[6,8],'sprite':4,'prices':[100,250]},{'type':'listen','xy':[19,5],'sprite':2},{'type':'camp','xy':[7,12],'sprite':1}]})
result={'schema':'ash-aether.engine-world/1','campaign':campaign,'scenes':scenes,'skills':skills,'authoring_sha256':hashlib.sha256(campaign_path.read_bytes()).hexdigest()}
Path(__file__).with_name('world.json').write_text(json.dumps(result,separators=(',',':')))
print(len(scenes),'scenes,',len(campaign['missions']),'chapters')
