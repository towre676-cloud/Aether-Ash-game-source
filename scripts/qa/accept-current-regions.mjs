/** Read-only acceptance against a pinned authenticated baseline and a separate
 * full candidate dist. No copying, pushing or deploying. Node 22+. */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [baseArg,candidateArg,manifestArg]=process.argv.slice(2);
if(!manifestArg)throw Error('Usage: node scripts/qa/accept-current-regions.mjs <baseline-dist> <candidate-dist> <overlay-manifest>');
const base=resolve(baseArg),candidate=resolve(candidateArg);
assert.notEqual(base,candidate);
const manifest=JSON.parse(readFileSync(manifestArg,'utf8'));
assert.equal(manifest.kind,'review-only');assert.equal(manifest.deployed,false);
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const changed=new Map(manifest.files.map(f=>['game/engine2/'+f.file,f]));
function files(root,prefix=''){return readdirSync(join(root,prefix),{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(root,prefix+d.name+'/'):[prefix+d.name]);}
const originals=files(base),candidates=files(candidate);let unchanged=0;
for(const p of originals){
 const row=changed.get(p),oldHash=hash(join(base,p)),newHash=hash(join(candidate,p));
 if(row){assert.equal(oldHash,row.oldSha256,p+' baseline receipt');assert.equal(newHash,row.newSha256,p+' overlay receipt');}
 else{assert.equal(newHash,oldHash,p+' protected file changed');unchanged++;}
}
for(const p of candidates.filter(p=>!originals.includes(p))){assert.ok(changed.has(p),'unreceipted addition '+p);assert.equal(hash(join(candidate,p)),changed.get(p).newSha256);assert.equal(changed.get(p).oldSha256,null);}
const engine=root=>join(root,'game/engine2');
const load=(root,name)=>import(pathToFileURL(join(engine(root),name)).href);
console.error('file hashes verified; importing modern engines');
const {World:Before}=await load(base,'world.js'),{World:After}=await load(candidate,'world.js');
const source=JSON.parse(readFileSync(join(engine(base),'world.json'),'utf8'));
console.error('constructing baseline world');
let time=performance.now();const before=new Before(source);const baselineMs=performance.now()-time;
console.error('constructing candidate world');
time=performance.now();const after=new After(source);const candidateMs=performance.now()-time;
const {spatialEcologySites}=await load(candidate,'spatial-ecology.mjs');
const {findPath}=await load(candidate,'navigation.js');
const {fieldInteractionTargets}=await load(candidate,'field-journey-director.js');
const {spatialWildlifeActors,appendSpatialWildlifeMotion}=await load(candidate,'spatial-wildlife.mjs');
const {Geometry}=await load(candidate,'cistern-renderer.js');
assert.equal(after.data.campaign.missions.length,24);
const missionSummary=w=>w.data.campaign.missions.map(({rooms,...mission})=>({...mission,rooms:rooms.map(r=>r.location)}));
assert.ok(JSON.stringify(missionSummary(after))===JSON.stringify(missionSummary(before)),'campaign definitions and room order');
console.error('comparing composed scenes');
assert.deepEqual([...after.scenes.keys()],[...before.scenes.keys()],'scene IDs');
function flood(s){const start=s.arrive,q=[start],seen=new Set([start.join(',')]);for(let i=0;i<q.length;i++){const[x,y]=q[i];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(s.floor[b]?.[a]==='.'&&!seen.has(k)){seen.add(k);q.push([a,b]);}}}return seen;}
const regions=[],pathMs=[];let stations=0,shadowed=0,maxWildlifeFloats=0;
for(const old of before.data.scenes){
 console.error('scene',old.location);
 const next=after.scenes.get(old.location);
 assert.deepEqual(next.arrive,old.arrive,old.key+' arrival');assert.deepEqual(next.doors,old.doors,old.key+' doors');
 assert.ok(JSON.stringify(next.objects.slice(0,old.objects.length))===JSON.stringify(old.objects),old.key+' authored objects');
 const a=flood(old),b=flood(next);
 for(let y=0;y<old.height;y++)for(let x=0;x<old.width;x++)if(old.floor[y][x]==='.'){
  assert.equal(next.floor[y][x],'.',old.key+' original floor removed');
  assert.equal(b.has(x+','+y),a.has(x+','+y),old.key+' original sealed component changed');
 }
 if(!next.spatialExpansion)continue;
 const sites=spatialEcologySites(next);assert.equal(sites.length,5,next.key+' stations');stations+=sites.length;
 after.state.scene=next.location;after.state.mode='field';
 let longest=0;
 for(const site of sites){
  console.error('station',next.location,site.spatialRole);
  time=performance.now();const path=findPath(next,next.arrive,site.xy);pathMs.push(performance.now()-time);
  assert.ok(path.length>0,next.key+' station unreachable');longest=Math.max(longest,path.length);
  after.state.x=site.xy[0]+.5;after.state.y=site.xy[1]+.5;
  const choices=fieldInteractionTargets(after).map(t=>({...t,d:Math.hypot(after.state.x-t.approach.xy[0]-.5,after.state.y-t.approach.xy[1]-.5)})).sort((a,b)=>a.d-b.d);
  if(choices[0]?.object.spatialId!==site.spatialId)shadowed++;
 }
 const at=next.spatialExpansion.landmarks[6].xy;after.state.x=at[0]+.5;after.state.y=at[1]+.5;
 const save=after.save(),mesh=new Geometry();appendSpatialWildlifeMotion(mesh,new Geometry(),{world:after,time:3});
 const vertices=mesh.data();assert.ok(vertices.every(Number.isFinite));maxWildlifeFloats=Math.max(maxWildlifeFloats,vertices.length);assert.equal(after.save(),save);
 after.state.mode='battle';assert.deepEqual(spatialWildlifeActors(after,1),[]);after.state.mode='field';
 regions.push({id:next.location,title:next.title||next.key,before:a.size,after:b.size,stations:sites.length,longestStationRoute:longest});
}
assert.equal(shadowed,0,'fieldwork must win the actual nearest-target selection');
// Use unmodified engine saves, including both modern story and legacy fallback.
const saves=[];
console.error('checking save migrations');
for(const [id,story]of[[5,true],[2000,true],[2059,true],[2000,false]]){
 before.state.scene=id;before.state.mode='field';before.state.x=before.scene.arrive[0]+.5;before.state.y=before.scene.arrive[1]+.5;
 const raw=JSON.parse(before.save());if(!story)delete raw.story;
 before.restore(raw);const expected=JSON.parse(before.save());after.restore(raw);const actual=JSON.parse(after.save());
 delete expected.spatialEcology;delete actual.spatialEcology;assert.ok(JSON.stringify(actual)===JSON.stringify(expected),'save state preservation '+id+':'+story);
 const target=after.scene.spatialExpansion.landmarks[7].xy;after.state.x=target[0]+.5;after.state.y=target[1]+.5;
 const far=after.save();after.restore(far);assert.equal(after.state.x,target[0]+.5);assert.equal(after.state.y,target[1]+.5);
 saves.push({id,story,existingStatePreserved:true,farPositionRestored:true});
}
const groups={};for(const r of regions){const k=r.id>=4700?'trials':r.id>=2000?'frontiers':'campaign';const g=groups[k]??={regions:0,before:0,after:0};g.regions++;g.before+=r.before;g.after+=r.after;}
pathMs.sort((a,b)=>a-b);
console.log(JSON.stringify({kind:'automated-source-and-model-acceptance',browserGameplay:false,sourceFiles:originals.length,unchangedFiles:unchanged,overlayFiles:changed.size,groups,stations,shadowed,saves,maxWildlifeFloats,timing:{baselineConstructionMs:baselineMs,candidateConstructionMs:candidateMs,pathMedianMs:pathMs[Math.floor(pathMs.length*.5)],pathP95Ms:pathMs[Math.floor(pathMs.length*.95)],note:'Host CPU diagnostics; not device FPS'},regions},null,2));
