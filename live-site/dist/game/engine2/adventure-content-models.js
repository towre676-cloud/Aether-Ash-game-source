/** Tangible models for the campaign's returned voices and carried artifacts.
 * World.objects() is the visibility authority. Rendering never manufactures a
 * source, reward, claim, repair, direction, or saved-state transition.
 */
import {PHYSICAL_LORE} from './physical-lore-content.js';
import {COMBAT_RELICS} from './combat-relics.js?v=5.16.0';

const TAU=Math.PI*2,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const P={stone:[.29,.35,.35],edge:[.51,.57,.52],dark:[.055,.09,.10],metal:[.19,.28,.29],brass:[.65,.49,.26],wood:[.33,.22,.14],paper:[.69,.66,.50],teal:[.26,.67,.61],warm:[.91,.61,.28],green:[.28,.52,.31],clay:[.57,.34,.24]};
const entries=new Map(PHYSICAL_LORE.map(e=>[e.id,e]));
const relics=new Map(COMBAT_RELICS.map(e=>[e.id,e]));
const rgb=(h,f=P.teal)=>/^#[a-f\d]{6}$/i.test(h||'')?[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255):f;
const at=o=>({x:o.xy[0]+.5,z:o.xy[1]+.5});
const isPoint=o=>Array.isArray(o?.xy)&&o.xy.length===2&&o.xy.every(Number.isFinite);
const allowed=(w,o)=>{try{return !w.available||w.available(o);}catch{return false;}};

/** A classifier for the full-content coverage audit. No state normalization. */
export function adventureContentFamily(world,o){
 if(!isPoint(o)||!allowed(world,o))return null;
 if(o.physicalId&&entries.has(o.physicalId))return 'artifact-'+o.physicalRole;
 if(o.type==='network'&&o.networkId)return 'network-'+(o.networkProp||'diverter');
 if(o.type==='combat-relic'&&relics.has(o.battleRelic)&&!world.state.combatRelics?.claimed?.includes(o.battleRelic))return 'rare-relic';
 if(o.type==='secret'&&o.exploreId)return 'revealed-compartment';
 return null;
}
function objectsFor(world,provided){
 const source=Array.isArray(provided)?provided:world.objects(),seen=new Set();
 return source.filter(o=>{if(!adventureContentFamily(world,o))return false;const key=[o.type,o.physicalId,o.physicalRole,o.networkId,o.battleRelic,o.exploreId,o.xy.join(',')].join(':');if(seen.has(key))return false;seen.add(key);return true;});
}
function writer(mesh,point,flat=true){
 const sy=flat?.36:1,x=point.x,z=point.z;
 return {
  box:(a,b,c,w,h,d,col,mat=1,em=0,rot=0)=>mesh.box(x+a,b*sy,z+c,w,h*sy,d,col,mat,em,rot),
  cylinder:(a,b,c,r,h,col,mat=1,n=8,rt=r,em=0)=>mesh.cylinder(x+a,b*sy,z+c,r,h*sy,col,mat,n,rt,em),
  sphere:(a,b,c,r,col,mat=1,em=0,n=7,rows=4,shape=[1,1,1])=>mesh.sphere(x+a,b*sy,z+c,r,col,mat,em,n,rows,[shape[0],shape[1]*sy,shape[2]]),
  tube:(a,b,r0,r1,col,mat=1,n=6,em=0)=>mesh.tube([x+a[0],a[1]*sy,z+a[2]],[x+b[0],b[1]*sy,z+b[2]],r0,r1,col,mat,n,em),
  ring:(a,b,c,inner,outer,col,mat=1,em=0,alpha=1,n=16,progress=1)=>mesh.ring(x+a,b*sy,z+c,inner,outer,col,mat,em,alpha,n,progress),
  quad:(a,b,c,d,col,mat=1,em=0,alpha=1)=>mesh.quad(...[a,b,c,d].map(v=>[x+v[0],v[1]*sy,z+v[2]]),col,mat,em,alpha)
 };
}
const flatAt=(w,o)=>w.scene.floor?.[o.xy[1]]?.[o.xy[0]]==='.';
function frame(g){
 g.box(0,.055,0,.86,.10,.70,P.metal,1);g.box(0,.12,0,.76,.025,.60,P.dark,7);
 for(const side of[-1,1]){g.box(side*.40,.15,0,.045,.10,.69,P.brass,1);g.box(0,.15,side*.31,.84,.10,.045,P.brass,1);}
}
function needle(g,angle,col=P.brass,x=0,z=0,r=.23,y=.34){
 g.tube([x,y,z],[x+Math.sin(angle)*r,y,z-Math.cos(angle)*r],.018,.013,col,1,5);
 g.cylinder(x,y,z,.038,.045,P.edge,1,7);
}
function wheel(g,angle,col=P.brass,x=0,z=0,r=.24,y=.35){
 g.ring(x,y,z,r-.025,r,col,1,0,1,16);
 for(let i=0;i<3;i++){const a=angle+i*TAU/3;g.tube([x,y,z],[x+Math.sin(a)*r,y,z-Math.cos(a)*r],.018,.018,col,1,5);}
 g.cylinder(x,y,z,.045,.06,P.edge,1,7);
}
function gem(g,x,y,z,r,col){
 const top=[x,y+r,z],bottom=[x,y-r*.55,z],ring=Array.from({length:6},(_,i)=>[x+Math.cos(i*TAU/6)*r*.65,y,z+Math.sin(i*TAU/6)*r*.65]);
 for(let i=0;i<6;i++){g.quad(top,ring[i],ring[(i+1)%6],top,col,6,.14);g.quad(bottom,ring[(i+1)%6],ring[i],bottom,col.map(n=>n*.66),6,.08);}
}
/** Each portable artifact retains the silhouette used on its receiver. */
function artifact(g,glyph,col,y=.28,angle=0){
 const c=Math.cos(angle),s=Math.sin(angle),v=(x,z)=>[x*c+z*s,y,-x*s+z*c],line=(a,b,r=.025)=>g.tube(v(...a),v(...b),r,r,col,1,6);
 if(['reed','fork'].includes(glyph)){for(const x of[-.10,.10])line([x,.17],[x,-.20]);line([-.10,.17],[.10,.17]);if(glyph==='fork')line([0,.17],[0,-.28]);for(let i=0;i<3;i++)line([-.07,-.10+i*.08],[.07,-.10+i*.08],.01);}
 else if(glyph==='lantern'){g.box(0,y,0,.27,.29,.27,P.metal,1);g.box(0,y+.02,.145,.18,.15,.01,col,6,.2);for(const x of[-.13,.13])for(const z of[-.13,.13])g.tube([x,y-.16,z],[x,y+.16,z],.013,.013,P.brass,1,5);g.tube([-.08,y+.17,0],[0,y+.25,0],.018,.018,P.brass,1,5);g.tube([0,y+.25,0],[.08,y+.17,0],.018,.018,P.brass,1,5);}
 else if(['graft','pebble'].includes(glyph)){g.tube([0,y-.10,0],[0,y+.24,0],.025,.012,P.wood,2,6);for(let i=0;i<3;i++)g.sphere(i%2?.09:-.09,y+i*.08,0,.09,col,5,0,6,4,[1.3,.35,.65]);if(glyph==='pebble')gem(g,0,y-.10,0,.13,P.edge);}
 else if(['lens','ring','shell'].includes(glyph)){g.ring(0,y,0,.13,.18,col,1,0,1,16);g.ring(0,y+.014,0,.07,.13,P.edge,1,0,1,16);if(glyph!=='ring')g.cylinder(0,y,0,.12,.024,[.27,.59,.65],6,12,.12,.13);if(glyph==='shell')for(let i=0;i<4;i++)line([-.13+i*.08,.13],[0,-.10],.009);}
 else if(['float','ruler'].includes(glyph)){g.box(0,y,0,.105,.055,.47,P.wood,2,0,angle);for(let i=0;i<5;i++)line([-.055,-.17+i*.075],[i%2?.02:.065,-.17+i*.075],.008);if(glyph==='float')g.cylinder(0,y+.05,.10,.12,.10,col,1,10);}
 else if(['spool','spindle'].includes(glyph)){g.cylinder(0,y,0,.13,.18,P.wood,2,10);for(let i=0;i<4;i++)g.ring(0,y-.09+i*.06,0,.095,.15,col,1,0,1,12);line([.12,.04],[.24,.12],.016);}
 else if(glyph==='vane'){line([0,-.25],[0,.25]);g.box(0,y,0,.36,.025,.07,col,1,0,angle);const tip=v(.21,0),a=v(.10,-.09),b=v(.10,.09);g.quad(tip,a,b,tip,col,1);}
 else if(glyph==='crown'){const p=[[-.22,y,.13],[-.23,y,-.12],[-.09,y,-.05],[0,y,-.23],[.05,y,-.02],[.15,y,-.13],[.20,y,.13]];for(let i=1;i<p.length-1;i++)g.quad(p[0],p[i],p[i+1],p[0],col,1);line([-.03,-.09],[-.07,.03],.012);line([-.07,.03],[.04,.10],.012);}
 else if(glyph==='wedge')g.quad([-.19,y,.15],[.19,y,.15],[.16,y+.12,-.16],[-.14,y+.12,-.16],col,1);
 else{g.box(0,y,0,.34,.07,.29,['clay','brick'].includes(glyph)?P.clay:P.edge,6,0,angle);if(glyph==='seal')g.ring(0,y+.04,0,.07,.10,col,1,0,1,14);else if(glyph==='hinge'){line([0,-.16],[0,.16]);for(const x of[-.10,.10])for(const z of[-.08,.08])g.sphere(x,y+.05,z,.022,col,1,0,5,3);}else if(glyph==='tile'){g.sphere(0,y+.05,.02,.06,col,6,0,6,4,[.7,.2,1]);for(let i=0;i<4;i++)g.sphere(-.07+i*.045,y+.05,-.08,.025,col,6,0,5,3,[.6,.2,1.4]);}else for(let i=0;i<3;i++)line([-.12,-.09+i*.09],[.12,-.07+i*.09],.01);}
}
function physicalStatic(g,e,role){
 if(role==='trace'){g.ring(0,.05,0,.18,.20,P.brass,1,0,1,16);return;}
 if(role==='crossing'){for(const side of[-1,1])g.box(side*.36,.075,0,.06,.08,.85,P.brass,1);for(let i=0;i<3;i++){const z=-.25+i*.25;g.tube([-.14,.065,z+.10],[0,.065,z-.04],.017,.017,P.edge,1,5);g.tube([0,.065,z-.04],[.14,.065,z+.10],.017,.017,P.edge,1,5);}return;}
 if(role==='source'||role==='dropped'){g.cylinder(0,.025,0,.27,.035,P.dark,7,12);return;}
 if(role==='reward'){g.box(0,.11,0,.56,.22,.44,P.wood,2);g.box(0,.23,-.19,.59,.045,.08,P.brass,1);for(const x of[-.21,.21])g.box(x,.12,0,.035,.24,.46,P.brass,1);return;}
 frame(g);
 if(e.mode==='turn'){g.ring(0,.24,0,.25,.29,P.brass,1,0,1,20);for(let i=0;i<8;i++){const a=i*TAU/8;g.tube([Math.sin(a)*.30,.25,-Math.cos(a)*.30],[Math.sin(a)*.34,.25,-Math.cos(a)*.34],.012,.012,i===e.orientation*2?P.warm:P.edge,1,5);}}
 else if(e.mode==='pump'){for(const x of[-.25,.25])g.cylinder(x,.23,-.05,.075,.23,P.brass,1,8);g.tube([-.25,.19,-.05],[.25,.19,-.05],.055,.055,P.metal,1,7);for(let i=0;i<3;i++)g.box(-.20+i*.20,.21,.23,.14,.04,.07,P.dark,7);}
 else if(e.mode==='grow'){g.box(0,.24,0,.62,.22,.48,P.clay,6);g.box(0,.36,0,.53,.018,.39,P.dark,7);}
 else if(e.mode==='listen'){for(const x of[-.29,.29])g.tube([x,.18,-.16],[x,.76,-.16],.028,.028,P.brass,1,6);g.tube([-.30,.76,-.16],[.30,.76,-.16],.03,.03,P.brass,1,6);g.ring(0,.24,0,.19,.24,P.edge,1,0,1,18,.76);}
 else{g.box(0,.25,0,.53,.20,.42,P.wood,2);g.box(0,.36,0,.35,.024,.27,P.dark,7);for(const x of[-.22,.22])g.box(x,.39,0,.04,.04,.36,P.brass,1);}
}
function physicalDynamic(g,gl,e,o,p,time,preview){
 const col=rgb(e.color),installed=!!p.installed?.includes(e.id),done=!!p.completed?.includes(e.id),step=p.steps?.[e.id]||0,clock=p.clocks?.[e.id]||0;
 if(['source','dropped'].includes(o.physicalRole)){artifact(g,e.glyph,col,.29);return;}
 if(o.physicalRole==='trace'){artifact(g,e.glyph,P.brass.map(n=>n*.60),.055);return;}
 if(o.physicalRole==='crossing'){for(const x of[-.30,.30])g.sphere(x,.16,-.33,.04,col,4,.24,6,3);return;}
 if(o.physicalRole==='reward'){gem(g,0,.38,0,.16,col);g.box(0,.26,.02,.44,.035,.27,P.paper,6);return;}
 // The empty matching socket remains a clue. Its shape is embedded in the
 // physical face, rather than introducing a floating textual explanation.
 if(!installed){artifact(g,e.glyph,P.metal,.37);return;}
 const progress=preview??0;
 if(e.mode==='turn'){const a=(step+progress)*Math.PI/2;artifact(g,e.glyph,col,.40,a);needle(g,a,col,0,0,.24,.43);}
 else if(e.mode==='pump'){artifact(g,e.glyph,col,.36);const lift=.42+.16*Math.sin(progress*Math.PI);g.tube([.25,.26,-.05],[.25,lift,-.05],.025,.025,P.brass,1,6);g.tube([.25,lift,-.05],[.25,lift,.19],.028,.028,P.wood,2,6);for(let i=0;i<3;i++)g.box(-.20+i*.20,.24,.23,.14,.025,.07,i<step?col:P.dark,i<step?4:7,i<step?.2:0);}
 else if(e.mode==='grow'){const growth=done?1:clamp(clock/4);g.tube([0,.37,0],[0,.44+growth*.70,0],.026,.012,P.wood,2,6);for(let i=0;i<5*growth;i++)g.sphere((i%2?1:-1)*.12,.45+i*.13,0,.12,i%2?P.green:col,5,0,6,4,[1.4,.36,.65]);}
 else if(e.mode==='listen'){const vibration=Math.max(0,1-clock/1.6)*Math.sin(time*16)*.045;g.tube([0,.76,-.16],[vibration,.55,-.16],.016,.016,P.brass,1,5);g.cylinder(vibration,.48,-.16,.16,.20,col,1,10,.065);g.cylinder(vibration,.37,-.16,.19,.035,P.brass,1,10);const silence=clamp(clock/1.6);gl.ring(0,.26,0,.19,.23,silence===1?P.teal:P.warm,9,.25,.24,18,silence);}
 else artifact(g,e.glyph,col,.40);
 if(done)for(const x of[-.31,.31])g.sphere(x,.22,.23,.035,P.teal,4,.3,5,3);
}
function networkStatic(g,o){
 frame(g);
 if(o.networkProp==='reedbank'){g.box(0,.26,0,.58,.25,.44,P.clay,6);g.box(0,.39,0,.49,.018,.35,P.dark,7);for(const x of[-.20,.20])g.tube([x,.38,0],[x,.62,0],.035,.035,P.brass,1,6);}
 else if(o.networkProp==='bell'){for(const x of[-.29,.29])g.tube([x,.17,-.08],[x,.78,-.08],.025,.025,P.brass,1,6);g.tube([-.30,.78,-.08],[.30,.78,-.08],.025,.025,P.brass,1,6);}
 else if(o.networkProp==='window'){g.ring(0,.25,0,.23,.28,P.brass,1,0,1,18);g.cylinder(0,.23,0,.22,.018,P.paper,6,18);for(let i=0;i<5;i++){const a=-Math.PI*.7+i*Math.PI*.35;g.tube([Math.sin(a)*.16,.25,-Math.cos(a)*.16],[Math.sin(a)*.20,.25,-Math.cos(a)*.20],.009,.009,i===2?P.teal:P.metal,1,4);}}
 else if(o.networkProp==='claybench'){g.box(0,.22,0,.65,.06,.49,P.clay,6);for(let i=0;i<3;i++)g.box(0,.26,-.14+i*.14,.52,.015,.07,P.paper,6);for(const x of[-.32,.32])g.tube([x,.27,-.20],[x,.27,.20],.016,.016,P.brass,1,5);}
 else{g.tube([-.35,.26,0],[.35,.26,0],.06,.06,P.metal,1,8);for(const x of[-.28,.28])g.ring(x,.29,0,.07,.10,P.brass,1,0,1,10);g.tube([0,.26,0],[0,.26,-.27],.06,.06,P.metal,1,8);}
}
function networkDynamic(g,gl,world,o,time,preview=0){
 const a=world.state.answeringNetwork||{},works=a.works||[],heard=a.heard||[],done=o.networkStage==='complete';
 const amount=done?1:Math.max(preview,(o.networkStage==='chapel-return'||o.networkStage==='relays-distinct'||o.networkStage==='assembly-return')?.5:0),col=done?P.teal:P.brass;
 if(o.networkId==='root-cradle'){const installed=works.includes('root-installed');for(let i=0;i<(installed?4:1);i++){const x=(i-1.5)*.10;g.tube([x,.39,.14],[x*.8,.48+(installed?.20:0),-.13],.025,.018,installed?P.green:P.wood,2,6);}if(installed)for(const side of[-1,1])g.sphere(side*.16,.63,0,.10,P.green,5,0,6,4,[1.3,.35,.65]);}
 else if(o.networkProp==='bell'){if(o.networkId==='relay-collar'){const free=works.includes('relays-opened');for(let i=0;i<3;i++){const x=(i-1)*.18,y=.58+i*.06;g.tube([x,.76,-.08],[x,y,-.08],.014,.014,P.brass,1,5);g.cylinder(x,y-.06,-.08,.075,.12,P.brass,1,8,.045);g.box(x,.30,.18,.10,.045,.08,heard.includes(['relay-low','relay-high','relay-middle'][i])?P.teal:P.dark,1);}g.box(0,free?.20:.48,.02,.56,.05,.04,P.metal,1);}else{g.cylinder(0,.48,-.08,.16,.24,P.brass,1,10,.07);g.cylinder(0,.35,-.08,.19,.035,P.brass,1,10);const y=works.includes('heat-diverted')?.34:.22;g.box(0,y,.18,.36,.045,.065,works.includes('heat-independent')?P.teal:works.includes('heat-diverted')?P.warm:P.dark,6,.12);}}
 else if(o.networkProp==='window'){const read=heard.includes(o.networkId),open=works.includes('water-opened');needle(g,open?(read?.17:-.13):-.92,read?P.teal:P.brass,0,0,.18,.29);}
 else if(o.networkProp==='claybench'){for(let i=0;i<3;i++){const x=-.20+i*.20;g.tube([x,.28,-.19],[x+amount*.10,.28,.19],.012,.012,works.includes('assembly-posted')?P.brass:P.metal,1,5);}g.box(amount*.24-.12,.32,.22,.12,.035,.06,col,1);}
 else{wheel(g,amount*Math.PI*1.3,col,0,0,.19,.36);const open=done||works.includes(o.networkId==='heat-diverter'?'heat-diverted':o.networkId==='water-bleed'?'water-opened':'chapel-return');g.tube([0,.27,-.27],[0,.27,-.39],.032,.032,open?P.teal:P.metal,1,6,open?.12:0);}
}
function pendingFor(feedback,o){const p=feedback?.pending;if(!p?.object)return null;const a=p.object;if(o.physicalId&&a.physicalId===o.physicalId&&a.physicalRole===o.physicalRole||o.networkId&&a.networkId===o.networkId)return clamp(p.progress);return null;}

export function appendAdventureContentStatic(mesh,{world,objects}={}){
 if(!world?.scene)return {count:0,families:{}};const stats={count:0,families:{}};
 for(const o of objectsFor(world,objects)){
  const family=adventureContentFamily(world,o),g=writer(mesh,at(o),flatAt(world,o));
  if(o.physicalId)physicalStatic(g,entries.get(o.physicalId),o.physicalRole);
  else if(o.type==='network')networkStatic(g,o);
  else if(o.type==='combat-relic'){g.cylinder(0,.05,0,.27,.06,P.metal,1,12);for(let i=0;i<3;i++){const a=i*TAU/3;g.tube([Math.sin(a)*.24,.07,Math.cos(a)*.24],[Math.sin(a)*.11,.30,Math.cos(a)*.11],.018,.018,P.brass,1,6);}}
  else if(o.type==='secret'){g.box(0,.04,0,.68,.025,.50,P.dark,7);for(const x of[-.33,.33])g.box(x,.06,0,.025,.025,.50,P.wood,2);g.box(0,.06,-.24,.68,.025,.025,P.wood,2);}
  stats.count++;stats.families[family]=(stats.families[family]||0)+1;
 }
 return stats;
}
export function appendAdventureContentDynamic(mesh,glow,{world,objects,time=0,feedback,range=22}={}){
 if(!world?.scene)return {count:0,families:{}};const stats={count:0,families:{}},p=world.state.physicalLore||{};
 for(const o of objectsFor(world,objects)){
  const point=at(o);if(Math.hypot(point.x-world.state.x,point.z-world.state.y)>range)continue;
  const family=adventureContentFamily(world,o),flat=flatAt(world,o),g=writer(mesh,point,flat),gl=writer(glow,point,flat);
  if(o.physicalId)physicalDynamic(g,gl,entries.get(o.physicalId),o,p,time,pendingFor(feedback,o));
  else if(o.type==='network')networkDynamic(g,gl,world,o,time,pendingFor(feedback,o)||0);
  else if(o.type==='combat-relic'){const r=relics.get(o.battleRelic),col=rgb(r.color);gem(g,0,.46,0,.24,col);if(['graftroot','dawnspindle'].includes(r.id))for(let i=0;i<3;i++){const a=i*TAU/3;g.tube([Math.sin(a)*.06,.37,Math.cos(a)*.06],[Math.sin(a)*.21,.53,Math.cos(a)*.21],.012,.012,P.brass,1,5);}if(r.id==='stormcoil')wheel(g,.4,P.brass,0,0,.16,.35);}
  else if(o.type==='secret'){const unlocked=!o.lock||world.state.exploration?.solved?.includes(o.lock),lift=unlocked?.13:0;g.box(0,.08+lift,.02,.62,.035,.44,P.wood,2);g.box(.18,.10+lift,.02,.08,.025,.055,P.brass,1);if(unlocked){g.box(0,.065,0,.28,.045,.20,P.paper,6);g.tube([-.15,.10,-.08],[.15,.10,.08],.016,.016,P.brass,1,5);}}
  stats.count++;stats.families[family]=(stats.families[family]||0)+1;
 }
 // A held object is the same artifact seen on the ground and on its receiver.
 const held=entries.get(p.held);if(held){const g=writer(mesh,{x:world.state.x+.38,z:world.state.y+.08},false);artifact(g,held.glyph,rgb(held.color),.91);stats.held=held.id;}
 return stats;
}
