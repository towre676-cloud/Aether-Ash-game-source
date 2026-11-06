import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../world.js';
import {buildSceneCraft} from '../scene-craft.js';
import {environmentFor} from '../environment.js?v=5.17.1';
import {gameArtDefinitions} from '../art-definitions.js';
import {ENVIRONMENT_ART_FILES,ENVIRONMENT_COLLECTIONS,ENVIRONMENT_PROPS,ENVIRONMENT_STAGED_IDS,REGIONAL_ART_POOLS,REGIONAL_WORK_PALETTES,regionalWorkKind,environmentPropSpec,regionalArtStyle,regionalSiteSpec,regionalFurnitureSpec,regionalGroundSpec,drawRegionalProp,regionalPropOcclusion} from '../environment-art-v17.js';

test('every registered motif has a complete source rectangle in its actual PNG',()=>{
 assert.ok(ENVIRONMENT_PROPS.length>=40);assert.equal(new Set(ENVIRONMENT_PROPS.map(p=>p.id)).size,ENVIRONMENT_PROPS.length);
 for(const p of ENVIRONMENT_PROPS){
  const file=ENVIRONMENT_ART_FILES[p.asset];assert.ok(file,p.id);const bytes=fs.readFileSync(new URL('../../../../development/art/source-v17/'+file.replace(/\.webp$/i,'.png'),import.meta.url));
  assert.equal(bytes.toString('ascii',1,4),'PNG');assert.equal(bytes[25],6,'RGBA PNG '+file);
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20),[x,y,cw,ch]=p.crop;
  assert.ok(p.crop.every(Number.isInteger)&&x>=0&&y>=0&&cw>0&&ch>0&&x+cw<=w&&y+ch<=h,p.id+' crop fits actual source');
  assert.ok(ENVIRONMENT_COLLECTIONS.some(c=>c.id===p.collection&&c.asset===p.asset),p.id+' collection identity');
 }
 for(const [style,pool] of Object.entries(REGIONAL_ART_POOLS)){assert.ok(pool.length>0,style);for(const id of pool)assert.ok(ENVIRONMENT_PROPS.some(p=>p.id===id),style+' → '+id);}
});

test('all sixteen v17 runtime WebP atlases preserve source dimensions and cutout alpha',()=>{
 // This audit owns the original source-v17 archive; later collections have
 // separate source archives and their own delivery/provenance regression tests.
 const originalV17Keys=['environmentWoodland','environmentWaterside','environmentIndustryV17','environmentHighlandsV17','environmentDrylandsV17','environmentMinerals','environmentStorm','environmentVillage','environmentArtisans','environmentGround','environmentWayfinding','environmentShelters','environmentSurfaces','environmentWater','environmentCanopies','environmentArchitecture'];
 const definitions=gameArtDefinitions().filter(d=>originalV17Keys.includes(d.name));assert.equal(definitions.length,16);
 assert.deepEqual(definitions.map(d=>d.name).sort(),[...originalV17Keys].sort(),'all original v17 asset keys remain covered exactly once');
 for(const definition of definitions){
  const bytes=fs.readFileSync(definition.src),file=definition.src.pathname.split('/').at(-1);assert.match(file,/\.webp$/);
  const png=fs.readFileSync(new URL('../../../../development/art/source-v17/'+file.replace(/\.webp$/i,'.png'),import.meta.url));
  assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.ok([2,6].includes(png[25]));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(bytes.readUInt32LE(4)+8,bytes.length,'complete WebP container');
  let width=0,height=0,alpha=false,frame=false;
  const dimensions=(w,h)=>{if(width){assert.equal(w,width);assert.equal(h,height);}width=w;height=h;};
  for(let position=12;position+8<=bytes.length;){
   const kind=bytes.toString('ascii',position,position+4),length=bytes.readUInt32LE(position+4),payload=position+8;assert.ok(payload+length<=bytes.length,'complete '+kind+' chunk');
   if(kind==='VP8X'){assert.ok(length>=10);alpha||=!!(bytes[payload]&0x10);dimensions(bytes.readUIntLE(payload+4,3)+1,bytes.readUIntLE(payload+7,3)+1);}
   else if(kind==='ALPH')alpha=true;
   else if(kind==='VP8L'){assert.ok(length>=5);assert.equal(bytes[payload],0x2f);const bits=bytes.readUInt32LE(payload+1);dimensions((bits&0x3fff)+1,((bits>>>14)&0x3fff)+1);alpha||=!!(bits&0x10000000);frame=true;}
   else if(kind==='VP8 '){assert.ok(length>=10);assert.equal(bytes.toString('hex',payload+3,payload+6),'9d012a');dimensions(bytes.readUInt16LE(payload+6)&0x3fff,bytes.readUInt16LE(payload+8)&0x3fff);frame=true;}
   position=payload+length+(length&1);
  }
  assert.ok(frame,definition.name+' contains image data');assert.deepEqual([width,height],[png.readUInt32BE(16),png.readUInt32BE(20)],definition.name+' retains exact crop coordinates');assert.equal(alpha,png[25]===6,definition.name+' alpha presence matches the original source');
 }
});

test('scene art selection is deterministic, diverse and does not mutate the actual expanded world',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url),'utf8')),world=new World(source),before=JSON.stringify(world.data),regions=new Map();
 for(const scene of world.data.scenes){
  const plan=buildSceneCraft(scene),used=new Set();
  for(const site of plan.sites){
   const a=regionalSiteSpec(site,scene,plan),b=regionalSiteSpec(site,scene,plan);assert.deepEqual(a,b);
   if(plan.indoor){assert.equal(a,null);continue;}
   if(a){assert.ok(a.height>0&&a.width>0);assert.ok(a.height*(site.scale||1)<=112.0001);assert.ok(!ENVIRONMENT_STAGED_IDS.includes(a.id));if(a.collection==='highlands'&&a.role!=='work')assert.ok(['ice','aurora'].includes(regionalArtStyle(scene,plan)),'frost stays in cold biomes');if(a.role==='work')assert.ok(REGIONAL_WORK_PALETTES[regionalWorkKind(site.workKind)].includes(a.id),'work art matches the actual anchor job');used.add(a.id);}
  }
  if(scene.biome?.style){const set=regions.get(scene.biome.style)||new Set();for(const id of used)set.add(id);regions.set(scene.biome.style,set);}
  for(const object of scene.objects||[]){regionalFurnitureSpec(scene,object);}
  regionalGroundSpec(scene,scene.location,plan);
 }
 assert.equal(JSON.stringify(world.data),before,'render selection leaves geometry, objects and story data unchanged');
 assert.equal(regions.size,12,'all twelve frontier biomes are present');
 for(const [style,set] of regions)assert.ok(set.size>=2,style+' has multiple actual selected silhouettes');
 assert.ok(regions.get('coral').has('coral-fan'));assert.ok(regions.get('spore').has('violet-fungi'));assert.ok(regions.get('lava').has('ember-basalt'));
});

test('mixed seed variation does not alias a placement rule and story openings retain their material',()=>{
 const scene={key:'town',location:5},selected=new Set();for(let i=0;i<128;i++){const spec=regionalSiteSpec({kind:'fern',seed:i*4,scale:1},scene);selected.add(spec.id);}assert.ok(selected.size>=2&&selected.size<=3,'village banks use one small natural palette');
 assert.equal(regionalArtStyle({key:'origin_rook-regulator_1',originId:'rook-regulator'}),'foundry');
 assert.equal(regionalArtStyle({key:'origin_riven-tide_1',originId:'riven-tide'}),'riverbank');
 assert.equal(regionalArtStyle({key:'origin_veyr-storm_1',originId:'veyr-storm'}),'storm');
 assert.equal(regionalSiteSpec({landmark:true,kind:'mast',seed:1},scene),null);
 assert.equal(regionalSiteSpec({kind:'fern',seed:1},{key:'home',household:{kind:'home'}}),null);
});

test('origin terrain and painted props share the actual river, furnace and storm identities',()=>{
 const world=new World(JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url),'utf8'))),expected={'rook-regulator':'foundry','brass-rail':'foundry','iona-lowbank':'riverbank','riven-tide':'riverbank','veyr-storm':'storm'},seen=new Set();
 for(const scene of world.data.scenes){const style=expected[scene.originId];if(!style)continue;seen.add(scene.originId);assert.equal(environmentFor(scene).style,style,scene.key+' terrain identity');assert.equal(regionalArtStyle(scene,buildSceneCraft(scene)),style,scene.key+' prop identity');}
 assert.deepEqual([...seen].sort(),Object.keys(expected).sort(),'each actual authored origin is covered');
});

test('natural banks never introduce work equipment, even in industrial or coastal regions',()=>{
 const world=new World(JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url),'utf8'))),before=JSON.stringify({data:world.data,state:world.state});
 for(const scene of world.data.scenes){
  if(!scene.width)continue;const style=regionalArtStyle(scene),pool=REGIONAL_ART_POOLS[style]||REGIONAL_ART_POOLS.village;
  assert.ok(pool.length>=2&&pool.length<=3);
  for(let seed=0;seed<24;seed++){
   const site={role:'bank',kind:'forge',seed,scale:.9,propId:'clay-kiln'},spec=regionalSiteSpec(site,scene);
   if(!spec)continue;assert.ok(pool.includes(spec.id),scene.key+' stays within its natural bank palette');assert.ok(spec.height*site.scale>=44&&spec.height*site.scale<=74);
   assert.equal(spec.role,'bank');assert.ok(!['clay-kiln','ore-cart','fishing-skiff','reed-traps','wind-shrine'].includes(spec.id));
  }
 }
 assert.equal(JSON.stringify({data:world.data,state:world.state}),before);
});

test('work groups require a matching local job and cannot substitute unrelated catalogue pieces',()=>{
 const scene={key:'town',location:5};
 for(const [workKind,pool]of Object.entries(REGIONAL_WORK_PALETTES)){
  for(let memberIndex=0;memberIndex<2;memberIndex++){
   const site={role:'work',groupId:'real-anchor',motifSeed:123,memberIndex,workKind,scale:1,propId:'clay-kiln'},spec=regionalSiteSpec(site,scene);
   assert.ok(pool.includes(spec.id),workKind);assert.equal(spec.role,'work');assert.ok(spec.height<=86);assert.deepEqual(spec,regionalSiteSpec(site,scene,{material:'water',sites:[site]}));
  }
 }
 assert.equal(regionalSiteSpec({role:'work',workKind:'unrelated',seed:3},scene).role,'bank');
 assert.equal(regionalSiteSpec({role:'work',workKind:'carpentry',propId:'potters-wheel'},scene).id,'carvers-bench');
 assert.equal(regionalSiteSpec({role:'work',workKind:'mooring',propId:'anchorage-chain'},scene).id,'anchorage-chain');
});

test('group motifs allow natural repetition and are independent of neighbours, plan and draw order',()=>{
 const scene={key:'field',location:2015,biome:{style:'lava'}},sites=[];let seedReads=0;
 for(let i=0;i<240;i++)sites.push(Object.freeze({x:2+(i%24)*2,y:2+Math.floor(i/24)*2,role:'bank',groupId:'bank-'+Math.floor(i/4),motifSeed:Math.floor(i/4),memberIndex:i%4,kind:'stone',scale:1,get seed(){seedReads++;throw Error('group choice must not read the individual decoration seed');}}));
 const first=sites.map(site=>regionalSiteSpec(site,scene));assert.equal(seedReads,0);
 assert.equal(first[0].id,first[3].id,'a repeated stone silhouette is intentional');
 const reverse={scene,material:'forge',sites:[...sites].reverse()};for(let i=sites.length-1;i>=0;i--)assert.deepEqual(regionalSiteSpec(sites[i],scene,reverse),first[i]);
 const unrelated={role:'bank',seed:6,x:sites[0].x,y:sites[0].y};assert.deepEqual(regionalSiteSpec(sites[0],scene,{sites:[unrelated,...sites]}),first[0],'neighbours cannot force a new object type');
 const cold={key:'field',location:2035,biome:{style:'ice'}},group=Array.from({length:9},(_,i)=>regionalSiteSpec({role:'bank',groupId:'frost',motifSeed:51,memberIndex:i,scale:1},cold));assert.equal(new Set(group.map(p=>p.id)).size,3);assert.equal(group[0].id,group[3].id);
});

function surface({throwDraw=false}={}){const calls=[],stack=[],c={globalAlpha:.8,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},translate(...args){calls.push(['translate',...args]);},scale(...args){calls.push(['scale',...args]);},drawImage(...args){if(throwDraw)throw Error('decoder unavailable');calls.push(['drawImage',...args,this.globalAlpha]);}};return {c,calls,stack};}
function renderer(c,prop,options={}){return {ctx:c,assets:{[prop.asset]:{width:1774,height:887}},...options};}

test('painted art keeps its aspect ratio and local pixel anchor in either graphics mode',()=>{
 const p=ENVIRONMENT_PROPS[0],spec=environmentPropSpec(p.id,{height:100,width:110});
 assert.ok(spec.width<=110&&spec.height<=100);assert.ok(Math.abs(spec.width/spec.height-p.crop[2]/p.crop[3])<1e-9);
 for(const compatibility of [false,true]){const {c,calls,stack}=surface(),r=renderer(c,p,{compatibility});assert.equal(drawRegionalProp(r,spec,12,9,{alpha:.6}),true);assert.equal(c.globalAlpha,.8);assert.equal(stack.length,0);const draw=calls[0];assert.equal(draw[0],'drawImage');assert.deepEqual(draw.slice(2,6),p.crop);assert.equal(draw[6],12-spec.width/2);assert.equal(draw[7],9-spec.height);assert.equal(draw.at(-1),.8*.6);}
});

test('failed image draws restore shared context and preserve the established art fallback',()=>{
 const p=ENVIRONMENT_PROPS[0],spec=environmentPropSpec(p.id);const failed=surface({throwDraw:true});assert.equal(drawRegionalProp(renderer(failed.c,p),spec),false);assert.equal(failed.c.globalAlpha,.8);assert.equal(failed.stack.length,0);
 const {c,calls,stack}=surface();assert.equal(drawRegionalProp({ctx:c,assets:{}},spec),false);assert.equal(drawRegionalProp({ctx:c,assets:{[p.asset]:{complete:false,width:1774,height:887}}},spec),false);assert.equal(drawRegionalProp({ctx:c,assets:{[p.asset]:{width:32,height:32}}},spec),false);assert.equal(drawRegionalProp(renderer(c,p),{...spec,width:NaN}),false);assert.equal(drawRegionalProp(renderer(c,p),spec,NaN,0),false);assert.equal(drawRegionalProp(renderer(c,p),{...spec,height:spec.height*2}),false);assert.equal(calls.length,0);assert.equal(stack.length,0);assert.equal(c.globalAlpha,.8);
});

test('occlusion uses the painted width and height, fading only scenery in front of a traveller',()=>{
 const spec=environmentPropSpec('hollow-root',{height:112}),site={x:5,y:7,scale:1};
 assert.equal(regionalPropOcclusion(site,spec,[{x:5,y:6}]),.3);assert.equal(regionalPropOcclusion(site,spec,[{x:5,y:8}]),1);assert.equal(regionalPropOcclusion(site,spec,[{x:8,y:6}]),1);assert.equal(regionalPropOcclusion(site,spec,[{x:NaN,y:6}]),1);
});
