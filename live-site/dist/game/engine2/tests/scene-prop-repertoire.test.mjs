import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {REPERTOIRE_IMAGE_SHA256,REPERTOIRE_IMAGE_SIZE,REPERTOIRE_PROPS,REPERTOIRE_PROMPT,repertoireSiteSpec,mechanismIdentity,repertoireMechanismSpec,drawRepertoireProp,drawRepertoireMechanism} from '../scene-prop-repertoire.js';

test('the eight original companion props retain the inspected source bytes and complete nonoverlapping crops',()=>{
 const bytes=fs.readFileSync(new URL('../../../../development/art/source-legacy-delivery/scene-props-v11.png',import.meta.url)),w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);assert.equal(bytes.toString('ascii',1,4),'PNG');assert.equal(bytes[25],6);assert.deepEqual([w,h],REPERTOIRE_IMAGE_SIZE);assert.equal(createHash('sha256').update(bytes).digest('hex'),REPERTOIRE_IMAGE_SHA256);assert.equal(REPERTOIRE_PROPS.length,8);assert.equal(new Set(REPERTOIRE_PROPS.map(p=>p.id)).size,8);
 for(const p of REPERTOIRE_PROPS){const[x,y,cw,ch]=p.crop;assert.ok(x>=0&&y>=0&&cw>0&&ch>0&&x+cw<=w&&y+ch<=h,p.id);for(const q of REPERTOIRE_PROPS){if(p===q)continue;const[a,b,c,d]=q.crop;assert.ok(x+cw<=a||a+c<=x||y+ch<=b||b+d<=y,p.id+' and '+q.id);}}
 assert.match(REPERTOIRE_PROMPT,/genuinely fully transparent/);assert.match(REPERTOIRE_PROMPT,/TOP ROW cell 0/);assert.match(REPERTOIRE_PROMPT,/BOTTOM ROW cell 4/);
});
test('site variants add context-specific frost, crystal and stump art while omitting every interior',()=>{
 const stone={kind:'stone',seed:4,scale:1},glass={kind:'glass',seed:2,scale:.9},root={kind:'roots',seed:4,scale:1};
 assert.equal(repertoireSiteSpec(stone,{key:'field',biome:{style:'ice'}}).id,5);assert.equal(repertoireSiteSpec(glass,{key:'field',biome:{style:'crystal'}}).id,4);assert.equal(repertoireSiteSpec(root,{key:'forest'}).id,3);assert.equal(repertoireSiteSpec({...root,seed:5},{key:'forest'}),null);
 for(const scene of[{key:'home',household:{}},{key:'origin_sable-reed_0',originId:'sable-reed',originIndoor:true},{key:'archive',interior:'archive'}])assert.equal(repertoireSiteSpec(root,scene),null);
 assert.equal(repertoireSiteSpec({landmark:true,kind:'mast'},{key:'summit'}).id,7);assert.equal(repertoireSiteSpec({landmark:true,kind:'mast',storyKind:'reed-relay'},{key:'town'}),null);assert.equal(repertoireSiteSpec({landmark:true,kind:'mast'},{key:'field',biome:{style:'sand'}}).id,6);
});
test('actual mechanisms follow the object job, not the traveller origin or biome',()=>{
 for(const [key,label,id]of [['origin_brass-rail_0','Inspect the gate’s signal current',0],['origin_iona-lowbank_0','Inspect the doorstep water gauge',1],['origin_riven-tide_0','Inspect the third tide mark',1],['origin_mira-archive_0','Read the inscriptions under side light',2],['origin_veyr-storm_0','Inspect the mast’s ground conductor',7]]){
  const scene={key},object={type:'puzzle',xy:[4,7],label},before=JSON.stringify([scene,object]);assert.equal(repertoireMechanismSpec(scene,object).id,id);assert.equal(JSON.stringify([scene,object]),before);assert.equal(repertoireMechanismSpec(scene,{...object,label:'Inspect the mechanism'}),null);
  assert.equal(repertoireMechanismSpec(scene,{...object,originStep:2,label:'Find a way past the ember crawler'}),null);
 }
 assert.equal(mechanismIdentity({originStep:2,label:'Inspect the water gauge'}),'');
 const scene={key:'origin_rook-regulator_1',originId:'rook-regulator'},object={type:'puzzle',label:'Read the archive ledger'};assert.equal(repertoireMechanismSpec(scene,object).id,2,'local purpose wins over region');
 const indoor=repertoireMechanismSpec({key:'clinic',household:{}},{type:'puzzle',label:'Inspect water gauge'});assert.equal(indoor.id,1);assert.ok(indoor.height<80);assert.equal(repertoireMechanismSpec({key:'town'},{type:'npc',label:'Water keeper'}),null);
});
function surface(){const stack=[],calls=[],c={globalAlpha:.8,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},translate(...v){calls.push(['translate',...v]);},scale(...v){calls.push(['scale',...v]);},drawImage(...v){calls.push(['drawImage',...v,this.globalAlpha]);}};return {c,stack,calls};}
test('both graphics modes draw measured source crops directly and restore canvas alpha',()=>{
 for(const compatibility of[false,true]){const{c,stack,calls}=surface(),r={ctx:c,compatibility,assets:{scenePropsExtra:{width:1774,height:887}},followers:[]};assert.equal(drawRepertoireProp(r,0,2.5,3.5,{height:100,alpha:.7}),true);const draw=calls.find(v=>v[0]==='drawImage');assert.deepEqual(draw.slice(2,6),REPERTOIRE_PROPS[0].crop);assert.deepEqual(calls[0],['translate',120,168]);assert.equal(draw.at(-1),.8*.7);assert.equal(c.globalAlpha,.8);assert.equal(stack.length,0);}
});
test('occlusion fades a mechanism only when it lies in front of a traveller',()=>{
 const{c,calls}=surface(),r={ctx:c,assets:{scenePropsExtra:{width:1774,height:887}},lastWorld:{state:{x:3,y:3.4}},followers:[]};assert.equal(drawRepertoireMechanism(r,{key:'origin_riven-tide_0'},{type:'puzzle',label:'Inspect the tide mark'},3,4.5),true);assert.equal(calls.find(v=>v[0]==='drawImage').at(-1),.8*.45);r.lastWorld.state.y=5;calls.length=0;drawRepertoireProp(r,1,3,4.5,{height:100,occlusion:true});assert.equal(calls.find(v=>v[0]==='drawImage').at(-1),.8);
});
test('bad or unavailable images and invalid IDs safely preserve the existing renderer fallback',()=>{
 const{c,calls}=surface(),r={ctx:c,assets:{scenePropsExtra:{width:30,height:30}}};assert.equal(drawRepertoireProp(r,0,1,2),false);assert.equal(drawRepertoireProp({...r,assets:{}},0,1,2),false);assert.equal(drawRepertoireProp(r,88,1,2),false);assert.equal(drawRepertoireProp(r,1,NaN,2),false);assert.equal(drawRepertoireMechanism(r,{key:'home'},{type:'npc'},1,2),false);assert.equal(calls.length,0);
});
