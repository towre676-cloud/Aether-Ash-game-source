#!/usr/bin/env node
/** Offline, actual-renderer visual inventory. No browser, gameplay replacement,
 * generated stand-in art, or alternate geometry is used. The small Canvas DOM
 * adapter supplies only the host APIs required by the native 2D/software path.
 *
 * node scripts/qa-scene-art-541.mjs --output /absolute/scratch/path
 * Optional: --scenes 47,292 --width 388 --height 842 --columns 8 --rows 4
 */
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2),option=(name,fallback)=>{const at=args.indexOf(name);return at>=0?args[at+1]:fallback;};
const output=path.resolve(option('--output','/workspace/scratch/069bdc7b547d/scene-art-541-offline'));
const width=Number(option('--width','388')),height=Number(option('--height','842')),columns=Number(option('--columns','8')),rows=Number(option('--rows','4'));
if(![width,height,columns,rows].every(n=>Number.isInteger(n)&&n>0)||width>2000||height>2500)throw Error('Invalid QA image dimensions');
const subset=option('--scenes',null)?.split(',').map(Number);
const bundle=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const require=createRequire(bundle?path.join(bundle,'qa-scene-art-runtime.cjs'):import.meta.url);
const {createCanvas,loadImage,Image}=require('@napi-rs/canvas');
const noop=()=>{},engine=new URL('../dist/game/engine2/',import.meta.url);
async function fingerprint(){
 const files=[],collect=async(dir,relative='')=>{for(const entry of await readdir(dir,{withFileTypes:true})){const next=path.join(relative,entry.name);if(entry.isDirectory()){if(!['tests','vendor','art','voices','qa'].includes(entry.name))await collect(path.join(dir,entry.name),next);}else if(entry.name.endsWith('.js')||entry.name.endsWith('.mjs'))files.push(next);}};
 await collect(fileURLToPath(engine));const hash=createHash('sha256');for(const f of files.sort()){hash.update(f);hash.update(await readFile(new URL(f.replaceAll(path.sep,'/'),engine)));}return hash.digest('hex');
}
const sourceStart=await fingerprint(),start=performance.now();

function surface(w=300,h=150){
 const canvas=createCanvas(w,h),nativeContext=canvas.getContext.bind(canvas);
 canvas.getContext=(kind,...rest)=>kind==='webgl'||kind==='experimental-webgl'?null:nativeContext(kind,...rest);
 Object.assign(canvas,{dataset:{},style:{},classList:{add:noop,remove:noop,toggle:noop},addEventListener:noop,removeEventListener:noop,setAttribute:noop,removeAttribute:noop,getAttribute:()=>null,remove:noop,focus:noop});
 Object.defineProperties(canvas,{clientWidth:{get:()=>canvas.cssWidth??canvas.width},clientHeight:{get:()=>canvas.cssHeight??canvas.height},ownerDocument:{get:()=>document}});
 canvas.getBoundingClientRect=()=>({left:0,top:0,x:0,y:0,width:canvas.clientWidth,height:canvas.clientHeight,right:canvas.clientWidth,bottom:canvas.clientHeight});return canvas;
}
globalThis.devicePixelRatio=1;globalThis.Image=Image;globalThis.OffscreenCanvas=function(w,h){return surface(w,h);};
globalThis.document={createElement:kind=>{if(kind==='canvas')return surface();throw Error('Offline renderer requested unsupported DOM element: '+kind);},querySelector:()=>null,querySelectorAll:()=>[],addEventListener:noop,removeEventListener:noop,hidden:false};
globalThis.window={addEventListener:noop,removeEventListener:noop,devicePixelRatio:1};globalThis.matchMedia=()=>({matches:false,addEventListener:noop,removeEventListener:noop});

const [{World},{Adventure3DRenderer},{Renderer},{gameArtDefinitions},{originById},{isInteriorScene},{installReconciledGround},{installLivingAtlas},{installTrailLife},{installTownLife},{installRegionalLife},{installEmbodiedOrigins,replacesEmbodiedOriginObject},{installCampaignActuators},{createWorldControls},{touchControlLayout},{fieldControlLayout}]=await Promise.all([
 import(new URL('world.js',engine)),import(new URL('adventure-3d-renderer.js',engine)),import(new URL('renderer.js',engine)),import(new URL('art-definitions.js',engine)),import(new URL('origin-content.js',engine)),import(new URL('scene-identity.js',engine)),import(new URL('reconciled-ground.js',engine)),import(new URL('living-atlas.js',engine)),import(new URL('reconciled-travel.js',engine)),import(new URL('townlife.js',engine)),import(new URL('regional-life.js',engine)),import(new URL('embodied-origins.js',engine)),import(new URL('campaign-actuators.js',engine)),import(new URL('world-controls.js',engine)),import(new URL('touch-layout.js',engine)),import(new URL('field-hud.js',engine))
]);
await mkdir(output,{recursive:true});await mkdir(path.join(output,'scenes'),{recursive:true});
const assets={},assetFailures=[],definitions=gameArtDefinitions();
// Read/decode the real repository assets, with bounded simultaneous decoders.
for(let i=0;i<definitions.length;i+=8)await Promise.all(definitions.slice(i,i+8).map(async d=>{try{assets[d.name]=await loadImage(fileURLToPath(d.src));}catch(e){assetFailures.push({name:d.name,optional:!!d.optional,error:e.message});if(!d.optional)throw e;}}));
console.log(JSON.stringify({event:'assets',loaded:Object.keys(assets).length,optionalFailures:assetFailures.length}));
const actorCanvas=surface(width,height),base=new Renderer(actorCanvas,assets,{compatibility:false});
const art={assets:base.assets,bounds:base.bounds,registrations:base.registrations};
const canvas=surface(width,height);canvas.cssWidth=width;canvas.cssHeight=height;
const renderer=new Adventure3DRenderer(canvas,{art,quality:'low'});
const nativePads=touchControlLayout(width,height,{preset:'spaced'}),field=fieldControlLayout({x:0,y:0,width,height},{confirm:nativePads.buttons.a,secondary:nativePads.buttons.x,joystick:nativePads.joystick,reset:nativePads.reset});
renderer.ui={hudHeight:106,touch:true,touchReserve:field.reserve};
const data=JSON.parse(await readFile(new URL('world.json',engine),'utf8')),world=new World(data);
installReconciledGround(world);installLivingAtlas(world);installTrailLife(world);installTownLife(world);installRegionalLife(world);
const origins=installEmbodiedOrigins(world),campaign=installCampaignActuators(world);world.worldControls=createWorldControls(world,origins,campaign);
const nativeObjects=world.objects.bind(world);world.objects=()=>[...nativeObjects().filter(o=>!replacesEmbodiedOriginObject(world,o)),...world.embodiedOrigins.objects()];
const ids=[...world.scenes.values()].filter(s=>s.width&&s.height&&s.floor&&s.originId!=='veyr-storm'&&(!subset||subset.includes(s.location))).map(s=>s.location).sort((a,b)=>a-b),scenes=[];

function arrival(s){
 const authored=s.authoredOpening?.arrival;if(authored?.length===2&&world.walkable(...authored))return{xy:authored,kind:'authored-opening'};
 if(s.arrive?.length===2&&world.walkable(s.arrive[0]+.5,s.arrive[1]+.5))return{xy:[s.arrive[0]+.5,s.arrive[1]+.5],kind:'native-arrival'};
 for(let z=0;z<s.height;z++)for(let x=0;x<s.width;x++)if(world.walkable(x+.5,z+.5))return{xy:[x+.5,z+.5],kind:'first-walkable-fallback'};
 throw Error('No traversable native arrival');
}
function pixels(context,w,h){
 const a=context.getImageData(0,0,w,h).data;let n=0,sum=0,sum2=0,edge=0,dark=0;const colors=new Set();
 for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){const i=(y*w+x)*4,l=.2126*a[i]+.7152*a[i+1]+.0722*a[i+2];n++;sum+=l;sum2+=l*l;if(l<16)dark++;colors.add((a[i]>>4)*256+(a[i+1]>>4)*16+(a[i+2]>>4));if(x>=4){const j=i-16,prev=.2126*a[j]+.7152*a[j+1]+.0722*a[j+2];if(Math.abs(l-prev)>12)edge++;}}
 return{meanLuma:sum/n,lumaStd:Math.sqrt(Math.max(0,sum2/n-(sum/n)**2)),darkFraction:dark/n,coarseColors:colors.size,edgeFraction:edge/n};
}
function differences(a,b,prefix='',out=[]){
 if(Object.is(a,b))return out;
 if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)])){if(out.length>=40)break;differences(a[k],b[k],prefix+'.'+k,out);}return out;}
 out.push({path:prefix,before:a,after:b});return out;
}

for(const id of ids){
 const elapsed=performance.now();let report={id};
 try{
  const identity=world.scenes.get(id);world.newGame(identity.originId?{originId:identity.originId,quiet:true}:{quiet:true});const s=world.scenes.get(id),originArrival=s.originId&&s.originPart===0?[world.state.x,world.state.y]:null;
  if(s.originId&&s.originPart===1)world.state.chronicle.step=2;
  world.state.scene=id;world.state.chapter=s.chapter||1;world.state.party=[Number.isInteger(s.fieldOrigin)?s.fieldOrigin:s.originId?originById(s.originId)?.hero??0:0];world.state.mode='field';
  const at=originArrival?{xy:originArrival,kind:'native-origin'}:arrival(s);[world.state.x,world.state.y]=at.xy;world.objects();
  // As in the native field, initialise the passive local ecology service
  // before measuring whether art changes it. This allocates its scene record
  // without taking a step, advancing time, discovering or awarding anything.
  world.livingAtlas?.runtime?.();world.embodiedOrigins?.snapshot?.();
  const nativeFloor=JSON.stringify([s.floor,s.household?.floorBase,s.affordanceBlocked,s.household?.partitions]),nativeSave=world.save();
  renderer.scene(world);renderer.forceRender=true;renderer.drawWorld(world,null,1/60,{effects:[],objective:null,feedback:world.embodiedOrigins?.snapshot?.()});
  const meshes=Object.fromEntries(Object.entries(renderer.meshes).map(([name,m])=>[name,{triangles:m.count/3,finite:[...m.data].every(Number.isFinite)}]));
  const image=path.join('scenes',String(id)+'.jpg');await writeFile(path.join(output,image),canvas.toBuffer('image/jpeg',88));
  const afterSave=world.save(),saveDifferences=afterSave===nativeSave?[]:differences(JSON.parse(nativeSave),JSON.parse(afterSave));
  report={id,key:s.key,title:s.title||s.name||s.key,chapter:s.chapter,originId:s.originId||null,originPart:s.originPart??null,biome:s.biome||null,interior:isInteriorScene(s),household:s.household?.kind||null,dimensions:[s.width,s.height],arrival:at,hero:world.state.party[0],image,meshes,sprites:renderer.sprites.length,drawn:{...renderer.stats},sceneArt:renderer.sceneArt541||null,environmentArt:renderer.environmentArt537||null,floorUnchanged:JSON.stringify([s.floor,s.household?.floorBase,s.affordanceBlocked,s.household?.partitions])===nativeFloor,saveUnchanged:afterSave===nativeSave,saveDifferences,pixels:pixels(canvas.getContext('2d'),width,height)};
 }catch(error){report.error=error.stack||error.message;}
 report.elapsedMs=performance.now()-elapsed;scenes.push(report);console.log(JSON.stringify({event:'scene',index:scenes.length,total:ids.length,id,error:report.error?.split('\n')[0],drawn:report.drawn?.triangles}));
 // Persist incremental evidence so a late visual fault never discards the scan.
 await writeFile(path.join(output,'progress.json'),JSON.stringify({scenes},null,2));
}

const thumbWidth=Math.min(194,width),thumbHeight=Math.round(height*thumbWidth/width),pad=8,label=44,cellWidth=thumbWidth+pad*2,cellHeight=thumbHeight+label+pad*2,sheets=[];
for(let offset=0;offset<scenes.length;offset+=columns*rows){
 const chunk=scenes.slice(offset,offset+columns*rows),sheet=surface(columns*cellWidth,Math.ceil(chunk.length/columns)*cellHeight),c=sheet.getContext('2d');c.fillStyle='#111e23';c.fillRect(0,0,sheet.width,sheet.height);c.font='12px sans-serif';c.textBaseline='top';
 for(let j=0;j<chunk.length;j++){const s=chunk[j],x=(j%columns)*cellWidth+pad,y=Math.floor(j/columns)*cellHeight+pad;
  if(s.image){const image=await loadImage(path.join(output,s.image));c.drawImage(image,x,y,thumbWidth,thumbHeight);}else{c.fillStyle='#57252b';c.fillRect(x,y,thumbWidth,thumbHeight);c.fillStyle='#ffe5d7';c.fillText('RENDER ERROR',x+6,y+12);}
  c.fillStyle=s.error?'#ff8073':'#e0d5b9';c.fillText(s.id+' · '+(s.title||s.key||'error').slice(0,24),x,y+thumbHeight+5);c.fillStyle='#92b4b5';c.fillText((s.sceneArt?.material||s.originId||s.biome||s.household||'')+' · '+Math.round(s.drawn?.triangles||0)+' tri',x,y+thumbHeight+21);
 }
 const name='contact-'+String(sheets.length+1).padStart(2,'0')+'.jpg';await writeFile(path.join(output,name),sheet.toBuffer('image/jpeg',90));sheets.push(name);
}
const sourceEnd=await fingerprint(),errors=scenes.filter(s=>s.error),summary={scenes:scenes.length,rendered:scenes.length-errors.length,errors:errors.map(s=>({id:s.id,error:s.error})),nonfinite:scenes.filter(s=>s.meshes&&Object.values(s.meshes).some(m=>!m.finite)).map(s=>s.id),floorMutations:scenes.filter(s=>s.floorUnchanged===false).map(s=>s.id),saveMutations:scenes.filter(s=>s.saveUnchanged===false).map(s=>s.id),missingArt:scenes.filter(s=>!s.sceneArt?.material).map(s=>s.id),sourceDrift:sourceStart!==sourceEnd,sourceStart,sourceEnd,width,height,sheets,assetFailures,elapsedMs:performance.now()-start};
await writeFile(path.join(output,'receipt.json'),JSON.stringify({summary,scenes},null,2));console.log(JSON.stringify({event:'complete',output,...summary}));
if(errors.length||summary.nonfinite.length||summary.floorMutations.length||summary.saveMutations.length||summary.missingArt.length||summary.sourceDrift)process.exitCode=1;
