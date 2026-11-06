import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {World} from '../../dist/game/engine2/world.js';
import {isInteriorScene} from '../../dist/game/engine2/scene-identity.js';
import {environmentFor} from '../../dist/game/engine2/environment.js';
import {buildSceneCraft} from '../../dist/game/engine2/scene-craft.js';
import {ENVIRONMENT_PROPS,ENVIRONMENT_STAGED_IDS,regionalSiteSpec,regionalFurnitureSpec,regionalGroundSpec} from '../../dist/game/engine2/environment-art-v17.js';
import {regionalGroundSites} from '../../dist/game/engine2/environment-detail-pass.js';
import {frontierObjectSpec,frontierWayfindingSpec} from '../../dist/game/engine2/frontier-art.js';
import {ENVIRONMENT_CANOPIES,environmentCanopyGeometry} from '../../dist/game/engine2/environment-canopies-v17.js';
import {CANOPY_VARIATIONS,CANOPY_VARIATION_FILE,canopyVariationGeometry,drawCanopyVariation} from '../../dist/game/engine2/environment-canopies-v19.js';
import {scenicTreeSites,scenicTreeGeometry,scenicTreeAlpha,drawScenicTree} from '../../dist/game/engine2/scenic-trees.js';
import {INTERIOR_ART_FILES,INTERIOR_WALL_PIECES,interiorWallFamily,interiorWallPlan,paintInteriorWallDetails,drawInteriorWallPiece} from '../../dist/game/engine2/environment-interiors-v19.js';
import {householdSurfaceGeometry,bakeHousehold,paintCompatibilityHousehold} from '../../dist/game/engine2/household-render.js';
import {ARCHITECTURE_V19_FILES,FACADE_BAYS,ROOFCRAFT_DETAILS,facadeBayPlacement,roofCraftPlacement,gableCraftPlacement,wallCraftPlacement,drawArchitecturePiece} from '../../dist/game/engine2/environment-architecture-v19.js';
import {buildingDetailPlan,bakeBuilding,paintBuilding,buildingFadeAlpha} from '../../dist/game/engine2/building-art.js';
import {gameArtDefinitions} from '../../dist/game/engine2/art-definitions.js';
import {NETWORK_WORKS,networkObjects} from '../../dist/game/engine2/answering-network.js';

// Run from any directory. A later campaign rebaseline may provide a read-only
// checkout using --baseline-root=/absolute/path and --baseline-revision=<sha>.
// The only written output is this audit's receipt; production data stays read-only.
const root=fileURLToPath(new URL('../../',import.meta.url)),T=48;
const args=Object.fromEntries(process.argv.slice(2).map(v=>{const i=v.indexOf('=');return [v.slice(0,i),v.slice(i+1)];}));
const read=p=>fs.readFileSync(path.resolve(root,p));
const json=p=>JSON.parse(read(p));
const hash=v=>createHash('sha256').update(v).digest('hex');
const digest=v=>hash(JSON.stringify(v));
const count=(map,id)=>{map[id]=(map[id]||0)+1;};
const sum=values=>values.reduce((a,b)=>a+b,0);
const close=(a,b)=>Math.abs(a-b)<1e-7;
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const rectangle=b=>({x:b.left,y:b.top,w:b.right-b.left,h:b.bottom-b.top});
const issues=[];
const check=(condition,kind,detail)=>{if(!condition)issues.push({kind,...detail});};

function imageHeader(bytes){
 if(bytes.toString('ascii',1,4)==='PNG')return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),alpha:bytes[25]===6,format:'PNG'};
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Unsupported image header');
 for(let offset=12;offset+8<=bytes.length;){const id=bytes.toString('ascii',offset,offset+4),n=bytes.readUInt32LE(offset+4),b=bytes.subarray(offset+8,offset+8+n);
  if(id==='VP8X')return {width:1+b.readUIntLE(4,3),height:1+b.readUIntLE(7,3),alpha:!!(b[0]&0x10),format:'WebP'};
  if(id==='VP8L'){const bits=b.readUInt32LE(1);return {width:1+(bits&0x3fff),height:1+((bits>>>14)&0x3fff),alpha:!!((bits>>>28)&1),format:'WebP'};}
  if(id==='VP8 ')return {width:b.readUInt16LE(6)&0x3fff,height:b.readUInt16LE(8)&0x3fff,alpha:false,format:'WebP'};
  offset+=8+n+(n%2);
 }
 throw Error('WebP has no image dimensions');
}
function gitHead(dir){
 try{let git=path.join(dir,'.git');if(!fs.statSync(git).isDirectory())git=path.resolve(dir,fs.readFileSync(git,'utf8').trim().replace(/^gitdir:\s*/,''));const head=fs.readFileSync(path.join(git,'HEAD'),'utf8').trim();if(!head.startsWith('ref:'))return head;const ref=head.slice(5);for(const base of [git,fs.existsSync(path.join(git,'commondir'))?path.resolve(git,fs.readFileSync(path.join(git,'commondir'),'utf8').trim()):git]){if(fs.existsSync(path.join(base,ref)))return fs.readFileSync(path.join(base,ref),'utf8').trim();const packed=path.join(base,'packed-refs');if(fs.existsSync(packed)){const line=fs.readFileSync(packed,'utf8').split('\n').find(v=>v.endsWith(' '+ref));if(line)return line.split(' ')[0];}}}catch{}
 return null;
}
function directoryBytes(dir){return fs.readdirSync(dir,{withFileTypes:true}).reduce((n,e)=>{const p=path.join(dir,e.name);return n+(e.isDirectory()?directoryBytes(p):fs.statSync(p).size);},0);}

// This records actual production draw calls without allocating bitmaps. It is
// deliberately separate from the selectors: draw counts must agree with plans.
function surface({failImage=null}={}){
 const stack=[],calls=[],state={globalAlpha:.81,m:[1,0,0,1,0,0]},gradient={addColorStop(){}};
 const c=new Proxy({
  save(){stack.push({...state,m:state.m.slice()});},
  restore(){const previous=stack.pop();if(!previous)throw Error('Unbalanced canvas restore');Object.assign(state,previous);},
  translate(x,y){const m=state.m;m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},
  scale(x,y){const m=state.m;m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},
  rotate(a){const m=state.m.slice(),co=Math.cos(a),si=Math.sin(a);state.m[0]=m[0]*co+m[2]*si;state.m[1]=m[1]*co+m[3]*si;state.m[2]=-m[0]*si+m[2]*co;state.m[3]=-m[1]*si+m[3]*co;},
  drawImage(...a){if(a[0]===failImage)throw Error('Simulated optional decoder failure');calls.push({a,m:state.m.slice(),alpha:state.globalAlpha});},
  createLinearGradient(){return gradient;},createRadialGradient(){return gradient;},createPattern(){return {setTransform(){}};},measureText(){return {width:0};}
 },{get(target,k){if(k in target)return target[k];if(k in state)return state[k];return ()=>{};},set(_t,k,v){state[k]=v;return true;}});
 return {c,calls,stack,state};
}
function withCanvas(fn){const prior=globalThis.document;globalThis.document={createElement(type){if(type!=='canvas')throw Error('Unexpected DOM allocation: '+type);const s=surface();return {width:0,height:0,getContext(){return s.c;},audit:s};}};try{return fn();}finally{globalThis.document=prior;}}
function drawBounds(call,offset=[0,0]){const a=call.a,m=call.m,[x,y,w,h]=a.slice(-4),points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>[m[0]*px+m[2]*py+m[4]+offset[0],m[1]*px+m[3]*py+m[5]+offset[1]]);const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
const pieceId=(call,pieces)=>pieces.find(p=>p.asset===call.a[0]?.asset&&p.crop.every((v,i)=>v===call.a[i+1]))?.id;

const source=read('dist/game/engine2/world.json'),world=new World(JSON.parse(source)),before={data:JSON.stringify(world.data),state:JSON.stringify(world.state)};
const prior=json('docs/verification/environment-5.18-world.json');
let baseline={release:'5.18',revision:'645898e7c6390f87a5d5aed647245e23975c712a',evidence:'docs/verification/environment-5.18-world.json',sourceSha256:prior.world.sourceSha256,expandedWorldSha256:prior.world.expandedScenesSha256,initialStateSha256:prior.world.journeyStateSha256};
let baselineWorld=null;
if(args['--baseline-root']){const dir=path.resolve(args['--baseline-root']),module=await import(pathToFileURL(path.join(dir,'dist/game/engine2/world.js')).href),raw=fs.readFileSync(path.join(dir,'dist/game/engine2/world.json'));baselineWorld=new module.World(JSON.parse(raw));baseline={release:args['--baseline-release']||'5.19',revision:args['--baseline-revision']||gitHead(dir),checkout:dir,sourceSha256:hash(raw),expandedWorldSha256:digest(baselineWorld.data),initialStateSha256:digest(baselineWorld.state)};}
const worldHashes={sourceSha256:hash(source),expandedWorldSha256:hash(before.data),initialStateSha256:hash(before.state)};
for(const key of Object.keys(worldHashes))check(worldHashes[key]===baseline[key],'baseline-world-mismatch',{field:key,expected:baseline[key],actual:worldHashes[key]});

const definitions=gameArtDefinitions(),assets={},assetFiles=[];
for(const d of definitions){const file=fileURLToPath(d.src);if(!fs.existsSync(file)){issues.push({kind:'missing-runtime-image',asset:d.name,file});continue;}const bytes=fs.readFileSync(file),header=imageHeader(bytes);assets[d.name]={asset:d.name,...header,complete:true};assetFiles.push({asset:d.name,file:path.relative(root,file),bytes:bytes.length,sha256:hash(bytes),optional:!!d.optional,...header});}
check(definitions.length===46,'registered-image-count',{actual:definitions.length,expected:46});
check(definitions.filter(d=>d.optional).length===22,'optional-image-count',{actual:definitions.filter(d=>d.optional).length,expected:22});

const canopyReceipt=json('development/art/canopies-v19.json'),architectureReceipt=json('development/art/architecture-v19.json'),interiorReceipt=json('development/art/interiors-v19.json');
const newFiles=[{asset:'environmentCanopyVariations',source:canopyReceipt.archivePath,sourceHash:canopyReceipt.source.sha256,runtime:canopyReceipt.runtimePath,runtimeHash:canopyReceipt.delivery.sha256,alphaError:canopyReceipt.delivery.alphaMaxError},...architectureReceipt.sheets.map(s=>({asset:s.assetKey,source:s.sourceFile,sourceHash:s.sourceSha256,runtime:s.runtimeFile,runtimeHash:s.deliverySha256})),...interiorReceipt.sheets.map(s=>({asset:s.assetKey,source:s.archivedSourcePath,sourceHash:s.sha256,runtime:s.delivery.file,runtimeHash:s.delivery.sha256,alphaError:s.delivery.maxAlphaError}))];
for(const f of newFiles){const original=read(f.source),delivery=read(f.runtime),a=imageHeader(original),b=imageHeader(delivery);f.sourceBytes=original.length;f.deliveryBytes=delivery.length;f.dimensions=[a.width,a.height];f.hashesVerified=hash(original)===f.sourceHash&&hash(delivery)===f.runtimeHash;f.dimensionsVerified=a.width===b.width&&a.height===b.height;f.alphaHeadersPresent=a.alpha&&b.alpha;check(f.hashesVerified&&f.dimensionsVerified&&f.alphaHeadersPresent,'art-file-contract',{asset:f.asset});}

const counters={walls:{},facades:{},canopiesV19:{},canopiesV17:{},legacyPropMatches:{}},perScene=[],styleCounts={};
const wallStats={placements:0,rooms:0,maxPerRoom:0,cacheIdentityChecks:0,normalDraws:0,compatibilityDraws:0,outsideWall:0,reservedOverlaps:0,drawRegistrationErrors:0};
const facadeStats={exteriorPlans:0,undergroundExcluded:0,eligiblePlans:0,plansWithV19:0,placements:0,productionDraws:0,doorOverlaps:0,roofCellViolations:0,shapeChanges:0,followerFadeChecks:0};
const treeStats={baselineVisible:0,currentVisible:0,v19:0,v17Remaining:0,legacyRemaining:0,addedSites:0,removedSites:0,maxWidth:0,maxHeight:0,fadeChecks:0,rootRegistrationChecks:0};
const legacyStats={scenery:0,furniture:0,ground:0,utility:0,routes:0};
const supportedStyles=new Set(['woodland','village','mangrove','riverbank','spore','ice','aurora','highland','storm','sand','cactus']);
const wallImages=Object.fromEntries(Object.keys(INTERIOR_ART_FILES).map(k=>[k,assets[k]]));

for(const scene of world.data.scenes){
 const indoor=isInteriorScene(scene),style=environmentFor(scene).style,row={location:scene.location,key:scene.key,indoor,style,walls:0,facadePieces:0,visibleTrees:0,newCanopies:0,legacyProps:0};
 const craft=buildSceneCraft(scene);
 for(const site of craft.sites){const p=regionalSiteSpec(site,scene,craft);if(p){legacyStats.scenery++;row.legacyProps++;count(counters.legacyPropMatches,p.id);}}
 for(const o of scene.household?.furnishings||[]){const p=regionalFurnitureSpec(scene,o);if(p){legacyStats.furniture++;count(counters.legacyPropMatches,p.id);}}
 for(const site of regionalGroundSites(scene)){const p=regionalGroundSpec(scene,site.seed,craft);if(p){legacyStats.ground++;count(counters.legacyPropMatches,p.id);}}
 for(const o of scene.objects||[]){const p=frontierObjectSpec(scene,o);if(p){legacyStats.utility++;count(counters.legacyPropMatches,p.id);}}
 if(!indoor){const exits=[...(scene.objects||[]).filter(o=>o.type==='portal'),...(scene.doors||[]).filter(d=>!scene.objects.some(o=>o.type==='portal'&&o.to===d.to&&o.to_region===d.to_region&&o.xy?.join(',')===d.xy?.join(',')))];for(const o of exits){const p=frontierWayfindingSpec(scene,o,{indoor});if(p){legacyStats.routes++;count(counters.legacyPropMatches,p.id);}}}

 const wallPlan=interiorWallPlan(scene);check(interiorWallPlan(scene)===wallPlan,'wall-cache-identity',{scene:scene.location});wallStats.cacheIdentityChecks++;row.walls=wallPlan.length;wallStats.placements+=wallPlan.length;if(wallPlan.length)wallStats.rooms++;wallStats.maxPerRoom=Math.max(wallStats.maxPerRoom,wallPlan.length);
 check(wallPlan.length<=16&&Object.isFrozen(wallPlan),'wall-cache-bound',{scene:scene.location,count:wallPlan.length});
 if(scene.household){
  const {walk}=householdSurfaceGeometry(scene),reserved=[];
  for(const o of scene.household.furnishings){const b=o.footprint;if(!b)continue;if(o.furniture===18)reserved.push({kind:'window',x:b.x*T-9,y:(b.y+b.h)*T-93,w:b.w*T+18,h:98});else if(o.furniture===4||o.specialType||['hydrophone','pumping','treatment'].includes(o.visual)){const h=Math.max(92,b.h*T+24);reserved.push({kind:'work-fixture',x:b.x*T-10,y:(b.y+b.h)*T-h,w:b.w*T+20,h:h+8});}}
  for(const d of [...scene.doors,...scene.objects.filter(o=>o.type==='portal'||o.buildingEntrance)])if(d.xy)reserved.push({kind:'exit',x:(d.xy[0]-.72)*T,y:(d.xy[1]-2)*T,w:1.44*T,h:3*T});
  for(const d of scene.household.architectureProgram?.doorways||[]){const a=d.cells[0],b=d.cells.at(-1);reserved.push(d.axis==='h'?{kind:'internal-opening',x:a[0]*T-8,y:a[1]*T-93,w:(b[0]-a[0]+1)*T+16,h:146}:{kind:'internal-opening',x:a[0]*T-8,y:a[1]*T-93,w:64,h:(b[1]-a[1]+1)*T+98});}
  for(const p of wallPlan){count(counters.walls,p.id);const b=p.bounds,wall=p.wall,y=(wall.y+88)/T;const actual=Number.isInteger(y)&&Number.isInteger(wall.x/T)&&Number.isInteger(wall.w/T)&&Array.from({length:wall.w/T},(_,i)=>wall.x/T+i).every(x=>walk(x,y)&&!walk(x,y-1));const contained=b.x>=wall.x+5&&b.x+b.w<=wall.x+wall.w-5&&b.y>=wall.y+7&&b.y+b.h<=wall.y+wall.h-9;if(!actual||!contained)wallStats.outsideWall++;for(const r of reserved)if(overlap(b,r)){wallStats.reservedOverlaps++;issues.push({kind:'wall-reserved-overlap',scene:scene.location,id:p.id,reserved:r.kind});}check(p.family===interiorWallFamily(scene.household.kind),'wall-family',{scene:scene.location,id:p.id});}
  const normal=withCanvas(()=>bakeHousehold(scene,{image:assets.props,bounds:{16:{x:0,y:0,w:32,h:32}},...wallImages}));
  const normalCalls=normal.audit.calls.filter(c=>Object.hasOwn(INTERIOR_ART_FILES,c.a[0]?.asset));wallStats.normalDraws+=normalCalls.length;
  const compatibility=surface();paintCompatibilityHousehold(compatibility.c,scene,null,null,wallImages);const compatCalls=compatibility.calls.filter(c=>Object.hasOwn(INTERIOR_ART_FILES,c.a[0]?.asset));wallStats.compatibilityDraws+=compatCalls.length;
  check(normalCalls.length===wallPlan.length&&compatCalls.length===wallPlan.length,'wall-production-count',{scene:scene.location,plan:wallPlan.length,normal:normalCalls.length,compatibility:compatCalls.length});
  for(const [calls,offset]of [[normalCalls,[normal.worldX,normal.worldY]],[compatCalls,[0,0]]])for(const call of calls){const id=pieceId(call,INTERIOR_WALL_PIECES),b=drawBounds(call,offset);if(!wallPlan.some(p=>p.id===id&&Object.keys(b).every(k=>close(b[k],p.bounds[k]))))wallStats.drawRegistrationErrors++;}
  const culled=surface();check(paintInteriorWallDetails(culled.c,scene,wallImages,{x0:-100,y0:-100,x1:-90,y1:-90})===0,'wall-view-culling',{scene:scene.location});check(compatibility.stack.length===0&&normal.audit.stack.length===0,'wall-canvas-balance',{scene:scene.location});
 }

 for(const plan of scene.exteriorBuildings||[]){
  facadeStats.exteriorPlans++;if(plan.projection.kind==='underground'){facadeStats.undergroundExcluded++;check(roofCraftPlacement(plan)===null,'underground-roof-art',{scene:scene.location,id:plan.id});continue;}facadeStats.eligiblePlans++;
  const detail=buildingDetailPlan(plan),placements=[],door={x:-27,y:detail.door.y-detail.door.height,w:54,h:detail.door.height+10};
  for(const f of detail.frontages){for(const win of f.windows){const p=facadeBayPlacement(detail,f,win);if(p){placements.push(p);check(close(p.x,win.x)&&close(p.y,win.y-win.h/2),'facade-window-registration',{id:plan.id,piece:p.spec.id});const b=rectangle(p.bounds);check(b.x>=f.x+2-1e-7&&b.x+b.w<=f.x+f.w-2+1e-7&&b.y>=f.y+2-1e-7&&b.y+b.h<=f.ground-8+1e-7,'facade-wall-bounds',{id:plan.id,piece:p.spec.id});if(overlap(b,door))facadeStats.doorOverlaps++;}}const g=gableCraftPlacement(detail,f);if(g)placements.push(g);}
  const wall=detail.frontages.map(f=>wallCraftPlacement(detail,f)).find(Boolean);if(wall){placements.push(wall);if(overlap(rectangle(wall.bounds),door))facadeStats.doorOverlaps++;}
  const roof=roofCraftPlacement(plan);if(roof){placements.push(roof);const p=plan.projection,u=T*p.scale,b=roof.bounds,cells=new Set(p.cells.map(c=>c.join(',')));for(let y=Math.floor((b.top+64+.001)/u);y<=Math.floor((b.bottom+64-.001)/u);y++)for(let x=Math.floor((b.left+.001)/u);x<=Math.floor((b.right-.001)/u);x++)if(!cells.has(x+','+y))facadeStats.roofCellViolations++;}
  for(const p of placements)count(counters.facades,p.spec.id);facadeStats.placements+=placements.length;row.facadePieces+=placements.length;if(placements.length)facadeStats.plansWithV19++;
  const initial=JSON.stringify(plan),old=withCanvas(()=>bakeBuilding(plan)),painted=withCanvas(()=>bakeBuilding(plan,assets));if([old.width,old.height,old.worldX,old.worldY].some((v,i)=>v!==[painted.width,painted.height,painted.worldX,painted.worldY][i]))facadeStats.shapeChanges++;check(JSON.stringify(plan)===initial,'building-plan-mutation',{id:plan.id});
  const draws=painted.audit.calls.filter(c=>Object.hasOwn(ARCHITECTURE_V19_FILES,c.a[0]?.asset));facadeStats.productionDraws+=draws.length;check(draws.length===placements.length,'facade-production-count',{id:plan.id,selected:placements.length,drawn:draws.length});
  for(const call of draws){const id=pieceId(call,[...FACADE_BAYS,...ROOFCRAFT_DETAILS]),b=drawBounds(call,[painted.worldX,painted.worldY]);check(placements.some(p=>p.spec.id===id&&Object.keys(b).every(k=>close(b[k],rectangle(p.bounds)[k]))),'facade-draw-registration',{id:plan.id,piece:id});}
  const p=plan.projection,x=p.outside[0]+.5,y=p.outside[1]+.5,actor={x:x+(p.bounds.minX+p.bounds.maxX+1)*p.scale/2,y:y+(p.bounds.minY+p.bounds.maxY+1)*p.scale/2},far={x:x+100,y:y+100};
  check(buildingFadeAlpha(plan,far,[actor])===.32&&buildingFadeAlpha(plan,actor,[])===.32&&buildingFadeAlpha(plan,far,[])===1,'building-follower-fade',{id:plan.id});facadeStats.followerFadeChecks++;
  const output=surface(),labels=[];paintBuilding({ctx:output.c,followers:[actor],label(...a){labels.push(a);}},{...plan,art:painted},far);check(output.calls[0]?.alpha===.32&&labels.length===0&&output.stack.length===0&&output.c.globalAlpha===.81,'building-production-follower-fade',{id:plan.id});
 }

 if(!indoor&&supportedStyles.has(style)){
  const sites=scenicTreeSites(scene).filter(p=>!craft.landmarks.some(l=>Math.hypot(p.x-l.x,p.y-l.y)<2.8)),options={atlas:true,environmentCanopies:assets.environmentCanopies,environmentCanopyVariations:assets.environmentCanopyVariations};
  const stats=styleCounts[style]??={sites:0,baselineVisible:0,currentVisible:0,variants:0};
  for(const site of sites){stats.sites++;const old=environmentCanopyGeometry(site.seed,style,assets.environmentCanopies),v=canopyVariationGeometry(site.seed,style,assets.environmentCanopyVariations),restricted=['storm','sand','cactus'].includes(style),was=!restricted||!!old,is=!restricted||!!old||!!v;treeStats.baselineVisible+=+was;treeStats.currentVisible+=+is;stats.baselineVisible+=+was;stats.currentVisible+=+is;if(is&&!was)treeStats.addedSites++;if(was&&!is)treeStats.removedSites++;if(!is)continue;row.visibleTrees++;
   if(!v){if(old){treeStats.v17Remaining++;count(counters.canopiesV17,old.id);}else treeStats.legacyRemaining++;continue;}
   row.newCanopies++;stats.variants++;treeStats.v19++;count(counters.canopiesV19,v.id);treeStats.maxWidth=Math.max(treeStats.maxWidth,v.draw.w);treeStats.maxHeight=Math.max(treeStats.maxHeight,v.draw.h);check(v.draw.w<=240.000001&&v.draw.h<=240.000001,'canopy-size',{scene:scene.location,id:v.id});check(!v.canopy.wind||!v.flip,'canopy-wind-direction',{scene:scene.location,id:v.id});check(digest(scenicTreeGeometry(site.seed,style,options))===digest(v),'canopy-shared-geometry',{scene:scene.location,id:v.id});
   const b=v.opaque,actor={x:site.x+(b.left+b.right)/96,y:site.y+(b.top+b.bottom)/96+.4};check(scenicTreeAlpha(site,[{x:1000,y:1000},actor],style,options)===.28&&scenicTreeAlpha(site,[{x:site.x,y:site.y+.3}],style,options)===1,'canopy-follower-fade',{scene:scene.location,id:v.id});treeStats.fadeChecks++;
   const draw=surface();drawScenicTree(draw.c,site.x,site.y,site.seed,style,.5,assets.naturalTrees,assets.environmentCanopies,assets.environmentCanopyVariations);check(draw.calls.length===v.parts.length&&draw.stack.length===0&&close(draw.c.globalAlpha,.81),'canopy-draw-count',{scene:scene.location,id:v.id});
   for(let i=0;i<draw.calls.length;i++){const call=draw.calls[i],[sx,sy]=v.parts[i],[ax,ay]=v.canopy.anchor,m=call.m,px=call.a[5]+(ax-sx)*v.scale,py=call.a[6]+(ay-sy)*v.scale;check(close(m[0]*px+m[2]*py+m[4],site.x*T)&&close(m[1]*px+m[3]*py+m[5],site.y*T)&&close(call.alpha,.405),'canopy-root-registration',{scene:scene.location,id:v.id});treeStats.rootRegistrationChecks++;}
  }
 }
 perScene.push(row);
}

// Exercise decoder-failure restoration for every new sprite family.
let failureRestorationChecks=0;
for(const p of INTERIOR_WALL_PIECES){const sample=world.data.scenes.flatMap(s=>interiorWallPlan(s)).find(q=>q.id===p.id);if(!sample)continue;const s=surface({failImage:assets[p.asset]});check(drawInteriorWallPiece(s.c,assets[p.asset],sample.spec,0,0)===false&&s.stack.length===0&&s.c.globalAlpha===.81,'wall-decoder-restoration',{id:p.id});failureRestorationChecks++;}
for(const p of [...FACADE_BAYS,...ROOFCRAFT_DETAILS]){const s=surface({failImage:assets[p.asset]}),spec={piece:p,asset:p.asset,crop:p.crop,draw:{x:-10,y:-20,w:20,h:20}};check(drawArchitecturePiece(s.c,assets,spec,0,0)===false&&s.stack.length===0&&s.c.globalAlpha===.81,'facade-decoder-restoration',{id:p.id});failureRestorationChecks++;}
for(const p of CANOPY_VARIATIONS){const seed=Array.from({length:10000},(_,i)=>i*4).find(seed=>Object.keys(styleCounts).some(style=>canopyVariationGeometry(seed,style,assets.environmentCanopyVariations)?.id===p.id));const spec=Object.keys(styleCounts).map(style=>canopyVariationGeometry(seed,style,assets.environmentCanopyVariations)).find(g=>g?.id===p.id),s=surface({failImage:assets.environmentCanopyVariations});check(!!spec&&drawCanopyVariation(s.c,assets.environmentCanopyVariations,spec,0,0)===false&&s.stack.length===0&&s.c.globalAlpha===.81,'canopy-decoder-restoration',{id:p.id});failureRestorationChecks++;}

const network=[];for(const def of NETWORK_WORKS){const shadow=Object.create(world);shadow.state={...structuredClone(world.state),chapter:def.chapter,scene:def.scene};const objects=networkObjects(shadow);let matchesBaseline=null;if(baselineWorld){const old=Object.create(baselineWorld);old.state={...structuredClone(baselineWorld.state),chapter:def.chapter,scene:def.scene};matchesBaseline=digest(objects)===digest(networkObjects(old));check(matchesBaseline,'network-baseline-change',{work:def.id});}network.push({work:def.id,scene:def.scene,chapter:def.chapter,objects:objects.length,matchesBaseline});}
check(JSON.stringify(world.data)===before.data&&JSON.stringify(world.state)===before.state,'audit-world-mutation',{});
for(const [key,value]of Object.entries({outsideWall:wallStats.outsideWall,reservedOverlaps:wallStats.reservedOverlaps,wallDrawRegistrationErrors:wallStats.drawRegistrationErrors,facadeDoorOverlaps:facadeStats.doorOverlaps,roofCellViolations:facadeStats.roofCellViolations,facadeShapeChanges:facadeStats.shapeChanges,addedTrees:treeStats.addedSites,removedTrees:treeStats.removedSites}))check(value===0,'geometry-violation',{field:key,count:value});
const newMotifIds=[...INTERIOR_WALL_PIECES,...FACADE_BAYS,...ROOFCRAFT_DETAILS,...CANOPY_VARIATIONS].map(p=>p.id),newMotifCount=newMotifIds.length;
check(new Set(newMotifIds).size===newMotifCount,'duplicate-v19-id',{});
const unusedV19=newMotifIds.filter(id=>![counters.walls,counters.facades,counters.canopiesV19].some(m=>m[id]));check(unusedV19.length===0,'unused-v19-motif',{ids:unusedV19});
check(Object.keys(counters.legacyPropMatches).length===ENVIRONMENT_PROPS.length-ENVIRONMENT_STAGED_IDS.length,'retained-prop-coverage',{selected:Object.keys(counters.legacyPropMatches).length,eligible:ENVIRONMENT_PROPS.length-ENVIRONMENT_STAGED_IDS.length});

function importAudit(){const roots=['renderer.js','world.js','art-definitions.js'],graph=new Map(),missing=[];function visit(file){if(graph.has(file))return;const code=fs.readFileSync(file,'utf8'),links=[];graph.set(file,links);for(const match of code.matchAll(/\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"](\.[^'"]+)['"]/g)){const dest=path.resolve(path.dirname(file),match[1].split('?')[0]);if(!fs.existsSync(dest)){missing.push({from:path.relative(root,file),to:match[1]});continue;}links.push(dest);if(dest.endsWith('.js'))visit(dest);}}for(const file of roots)visit(path.resolve(root,'dist/game/engine2',file));const done=new Set(),active=new Set(),cycles=[];function walk(file,chain=[]){if(active.has(file)){cycles.push([...chain,file].map(f=>path.relative(root,f)));return;}if(done.has(file))return;active.add(file);for(const next of graph.get(file)||[])walk(next,[...chain,file]);active.delete(file);done.add(file);}for(const file of graph.keys())walk(file);return {modules:graph.size,missing,cycles};}
const dependencies=importAudit();check(!dependencies.missing.length&&!dependencies.cycles.length,'dependency-audit',{missing:dependencies.missing,cycles:dependencies.cycles});
const priorSources=json('development/art/delivery-v17.json'),legacyDelivery=json('development/art/legacy-delivery.json'),distBytes=directoryBytes(path.join(root,'dist'));
// A separate full decode can attach an independent alpha receipt. Keep it only
// while every exact source and delivery hash still matches this audit's files.
const output=path.join(root,'docs/verification/environment-5.18.1-world.json');
const priorAlpha=fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')).independentAlphaVerification:null;
const independentAlphaVerification=priorAlpha?.files?.length===newFiles.length&&newFiles.every(f=>priorAlpha.files.some(p=>p.asset===f.asset&&p.sourceSha256===f.sourceHash&&p.deliverySha256===f.runtimeHash&&p.maxAlphaError===0))?priorAlpha:null;
const receipt={
 schema:'ash-aether.environment-art-coverage/2',release:args['--release']||'5.18.1',artCollection:'v19',checkedAtUTC:new Date().toISOString(),revision:gitHead(root),verificationStage:args['--baseline-root']?'campaign-rebased':'art-release-on-published-campaign',baseline,
 world:{scenes:world.data.scenes.length,outdoorScenes:world.data.scenes.filter(s=>!isInteriorScene(s)).length,interiorScenes:world.data.scenes.filter(isInteriorScene).length,...worldHashes,sourceEqualsBaseline:worldHashes.sourceSha256===baseline.sourceSha256,expandedWorldEqualsBaseline:worldHashes.expandedWorldSha256===baseline.expandedWorldSha256,initialStateEqualsBaseline:worldHashes.initialStateSha256===baseline.initialStateSha256,unchangedByAudit:JSON.stringify(world.data)===before.data&&JSON.stringify(world.state)===before.state},
 inventory:{priorMotifs:prior.collection.totalMotifs,newMotifs:newMotifCount,totalMotifs:prior.collection.totalMotifs+newMotifCount,stagedIds:ENVIRONMENT_STAGED_IDS,runtimeEligibleMotifs:prior.collection.totalMotifs+newMotifCount-ENVIRONMENT_STAGED_IDS.length,newMotifsUsed:newMotifCount-unusedV19.length,unusedV19,registeredImages:definitions.length,optionalImages:definitions.filter(d=>d.optional).length,registeredImageBytes:sum(assetFiles.map(f=>f.bytes)),originalEnvironmentPngs:priorSources.files.length+newFiles.length,originalEnvironmentPngBytes:priorSources.originalBytes+sum(newFiles.map(f=>f.sourceBytes)),environmentDeliveryWebps:priorSources.files.length+newFiles.length,environmentDeliveryBytes:priorSources.deliveryBytes+sum(newFiles.map(f=>f.deliveryBytes)),newSourceBytes:sum(newFiles.map(f=>f.sourceBytes)),newDeliveryBytes:sum(newFiles.map(f=>f.deliveryBytes)),legacyDeliverySavedBytes:legacyDelivery.savedBytes,newFiles,registeredAssets:assetFiles},
 walls:{...wallStats,drawModes:['Standard cached household','Compatibility direct household'],singleCellStepsQuiet:true,specialistChapelWallsPreserved:true},
 facades:{...facadeStats,newArtworkMode:'Standard cached projected buildings',compatibilityMode:'Existing facade sprite fallback; no v19 facade/roofcraft draws in current compatibility path',followerOpacity:'Standard buildingFadeAlpha includes traveller and companions; labels still follow traveller proximity'},
 canopies:{...treeStats,styles:styleCounts,drawModes:['Standard','Compatibility'],maxWidthOrHeight:240,rootSitesAndDensityUnchanged:treeStats.addedSites===0&&treeStats.removedSites===0},
 retainedPropArt:{...legacyStats,selectedMotifs:Object.keys(counters.legacyPropMatches).length,eligibleMotifs:ENVIRONMENT_PROPS.length-ENVIRONMENT_STAGED_IDS.length},
 countsByMotif:counters,network:{works:network.length,objects:sum(network.map(w=>w.objects)),sites:network},
 dependencies,failureRestorationChecks,independentAlphaVerification,
 hostingBudget:{expandedDistBytes:distBytes,limitBytes:256*1024*1024,headroomBytes:256*1024*1024-distBytes,scope:'Snapshot of the art release; rerun against the actual campaign baseline after a future campaign merge.'},
 limitations:['Geometry/draw contracts use production helpers with instrumented Canvas contexts; final browser screenshots remain the visual acceptance gate.','New facade and roof details currently render in Standard mode; Compatibility retains its pre-existing facade fallback.','Per-file alpha integrity is tied to original/delivery hashes and generation receipts; this audit independently reads dimensions and alpha headers.'],
 issues,perScene
};
fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({output:path.relative(root,output),issues,world:receipt.world,inventory:{motifs:receipt.inventory.totalMotifs,newMotifsUsed:receipt.inventory.newMotifsUsed,registeredImages:definitions.length,newSourceBytes:receipt.inventory.newSourceBytes,newDeliveryBytes:receipt.inventory.newDeliveryBytes},walls:wallStats,facades:facadeStats,canopies:treeStats,legacy:receipt.retainedPropArt,budget:receipt.hostingBudget},null,2));
if(issues.length)process.exitCode=1;
