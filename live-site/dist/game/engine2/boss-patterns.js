// Guardian choreography. Damage and telegraphs consume the same geometry.
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const PHASES=['First movement','Unbound','Last refrain'];
const profile=(guardian,name,sequence,moves,core,targeting,lesson,windup=2.1)=>({guardian,name,sequence,moves,core,targeting,lesson,windup});
export const BOSS_PROFILES=Object.freeze([
 profile('Sentinel','Broken circuit',['line','burst','ring'],['Relay lance','Glass discharge','Grounding ring'],'volt','rotate','The lane locks when the tell begins. Sidestep, then use the recovery to Break its armor.',2.3),
 profile('Rail Warden','Right of passage',['rails','burst','cleave'],['Twin rail sweep','Brake charge','Coupling cleave'],'earth','farthest','The twin rails leave a clear corridor between them. Step into that gap before striking.',2.4),
 profile('Well Keeper','Against the current',['ring','pair','line'],['Filter undertow','Divided current','Sluice jet'],'tide','cluster','The undertow leaves the center clear. Water can extinguish burn, but wet crew should avoid a later shock.'),
 profile('Ash Herald','The bell answers',['cross','ring','burst'],['Bell tower cross','Ash procession','Falling censer'],'flame','rotate','Diagonal gaps stay open between the cross arms. The full bell toll is followed by a long opening.',2.7),
 profile('Index Shade','An unedited page',['pair','line','cleave'],['Paired redaction','Margin stroke','Closing ledger'],'shade','focus','Two names are marked at once. Move those companions apart and leave the marked circles behind.'),
 profile('Sky Marshal','Unmoored',['cleave','rails','burst'],['Mooring fan','Crossing cables','Falling ballast'],'gale','farthest','Move behind the fan or past its outside edge. Its heading stays fixed once announced.'),
 profile('Cinder Seed','What survives the fire',['burst','ring','cross'],['Cinder germination','Root fire','Branching ember'],'flame','cluster','Leave the seed circle, then move into the calm center of the root ring. Water removes burning.'),
 profile('Hollow Crown','The stolen refrain',['ring','rails','pair'],['Empty coronation','Choir conduits','Borrowed voices'],'shade','rotate','The crown alternates close safety, a clear central lane and separated impact circles. Read each tell.',2.5),
 profile('Wiremother','A cradle of wire',['rails','pair','ring'],['Cradle wires','Split lullaby','Shelter circuit'],'volt','focus','The wires leave an open middle. Grounded surroundings blunt lightning; wet crew face stronger shocks.'),
 profile('Chainmaster','The last coupling',['line','cleave','rails'],['Chain haul','Locking hook','Parallel shackles'],'earth','farthest','The haul is a finite lane. Step beyond either side, then punish the exposed coupling.'),
 profile('Silt Crown','The third tide',['pair','ring','cross'],['Twin tide marks','Silt undertow','Flood channels'],'tide','cluster','The divided tide marks two positions. Leave them before closing into the calm eye.'),
 profile('Redactor','Nothing erased',['cleave','pair','line'],['Closing index','Duplicate deletion','Black underline'],'shade','focus','The closing index points toward its chosen witness. Cross behind it while the other crew attack.'),
 profile('Homekeeper','The room remembers',['cross','burst','ring'],['Doorframe cross','Hearth warning','Empty threshold'],'gravity','rotate','The room leaves diagonal routes open. A gravity hit can pull nearby companions when they are wet or exposed.',2.3),
 profile('Glass Child','An imperfect reflection',['pair','cleave','ring'],['Echoed footsteps','Broken reflection','Hollow embrace'],'frost','rotate','The echo records where two companions stood. The marked places stay dangerous after they leave.',2.3),
 profile('Commander','Orders refused',['rails','cross','cleave'],['Firing files','Checkpoint grid','Officer sweep'],'earth','cluster','Stay between firing files, then cross a diagonal opening. Guard remains a reliable answer when movement is tight.'),
 profile('Mute Giant','More than one voice',['ring','cross','pair'],['Mountain breath','Resonator crossing','Answering stones'],'earth','farthest','The mountain gives a slow warning. Its largest movement also leaves the longest recovery.',2.7),
 profile('Star Reader','An uncaptured sky',['cleave','pair','rails'],['Lens sweep','Double starfall','Charted crossings'],'volt','focus','The lens follows a chosen companion only until the tell begins. Walk behind its fixed sweep.'),
 profile('Tollkeeper','Warmth without a price',['burst','rails','cross'],['Furnace levy','Closed counters','Kiln crossing'],'flame','cluster','The furnace marks a place rather than following it. Move out and return after the heat has passed.'),
 profile('Wind Bailiff','Borrowed wings',['cleave','line','pair'],['Anchorage gale','Seized crossing','Divided downdraft'],'gale','farthest','A fan can be escaped from behind; the crossing lane can be escaped sideways. Neither retargets mid-charge.'),
 profile('False Judge','Unowned testimony',['cross','pair','cleave'],['Divided court','Two witnesses','Closing verdict'],'shade','rotate','The verdict has a visible direction. Move between the arms, then behind the closing fan.'),
 profile('First Form','Clay refuses the mold',['ring','cleave','burst'],['Unfinished vessel','Potter sweep','Falling mold'],'earth','cluster','The vessel has a calm center. Break techniques and finite field tools still work during every phase.',2.4),
 profile('Choir Lung','Shared breath',['cleave','ring','rails'],['Intake breath','Exhalation ring','Vent channels'],'gale','rotate','The intake opens behind the lung. Its exhalation leaves a clear center before the vent lanes appear.',2.6),
 profile('Choir Hand','The city answers',['pair','cross','rails'],['Many hands','Public crossing','Open channels'],'volt','focus','Two marked witnesses can move independently. Avoid carrying wet into the lightning and keep a ready Guard.'),
 profile('The Choir','A song with no last note',['ring','pair','cleave'],['Unfinished chorus','Answering voices','Last open measure'],'gravity','rotate','Each movement leaves a different safe space. Let the last measure finish, then answer during its recovery.',2.7)
].map((p,index)=>Object.freeze({...p,chapter:index+1,sequence:Object.freeze(p.sequence),moves:Object.freeze(p.moves)})));

export function bossBrief(chapter){return BOSS_PROFILES[clamp(Math.floor(Number(chapter)||1)-1,0,23)];}
export function bossPhase(enemy){const healthPhase=enemy.hp/enemy.maxHp>.65?0:enemy.hp/enemy.maxHp>.3?1:2;return Math.max(clamp(Math.floor(Number(enemy.phase)||0),0,2),healthPhase);}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
/** Bosses have legible preferences instead of repeatedly sniping the weakest hero. */
export function bossTarget(enemy,chapter,heroes){
 const alive=heroes.filter(h=>h.hp>0&&!h.withdrawn);if(!alive.length)return null;
 const p=bossBrief(chapter),byId=(a,b)=>String(a.id).localeCompare(String(b.id));
 if(p.targeting==='farthest')return [...alive].sort((a,b)=>distance(enemy,b)-distance(enemy,a)||byId(a,b))[0];
 if(p.targeting==='focus')return [...alive].sort((a,b)=>(b.mp||0)-(a.mp||0)||byId(a,b))[0];
 if(p.targeting==='cluster')return [...alive].sort((a,b)=>alive.filter(h=>distance(h,b)<3).length-alive.filter(h=>distance(h,a)<3).length||byId(a,b))[0];
 return [...alive].sort(byId)[Math.max(0,(enemy.turn||1)-1)%alive.length];
}
const hints={line:'step sideways from the lane',burst:'leave the marked circle',ring:'close into the calm center or move out',cross:'move between the arms',rails:'stand between the parallel lanes',cleave:'move behind the fan or past its edge',pair:'leave both marked circles'};
export function bossIntent(enemy,chapter,target,{heroes=[]}={}){
 const p=bossBrief(chapter),phase=bossPhase(enemy),index=(Math.max(1,enemy.turn||1)-1+phase)%p.sequence.length,shape=p.sequence[index];enemy.phase=phase;
 const center=['ring','cross','cleave'].includes(shape)?enemy:target,dx=target.x-enemy.x,dy=target.y-enemy.y,length=Math.hypot(dx,dy)||1;
 const windup=p.windup+(shape==='rails'||shape==='pair'?.25:0)+(phase===2?.35:0),signature=index===phase;
 const intent={kind:'strike',shape,target:target.id,x:center.x,y:center.y,fromX:enemy.x,fromY:enemy.y,left:windup,total:windup,power:enemy.power*([1.16,1.32,1.48][phase]+(signature?.08:0)),radius:shape==='ring'?4.5:shape==='cleave'?5.1:2.2,inner:shape==='ring'?1.65:.35,width:shape==='line'?.85:.8,reach:4.5,heading:Math.atan2(dy,dx),angle:.62,recovery:1.5+phase*.25+(signature?.35:0),core:p.core,bossChapter:p.chapter,bossPhase:phase,bossMove:index,counterplay:hints[shape],label:p.moves[index]+' · '+PHASES[phase]+' · '+hints[shape]};
 // Conditions belong to one announced movement, not every swing. The ordinary
 // reaction layer still handles steam, grounding, shielding and wet conduction.
 if(phase>0&&signature)intent.status=({flame:'burn',tide:'wet',frost:'slow',volt:'shock',shade:'exposed'})[p.core];
 if(shape==='rails'){intent.width=.55;intent.gap=1.55;intent.endX=target.x+dx/length*3;intent.endY=target.y+dy/length*3;}
 if(shape==='pair'){
  const other=heroes.filter(h=>h.hp>0&&!h.withdrawn&&h.id!==target.id).sort((a,b)=>distance(b,target)-distance(a,target)||String(a.id).localeCompare(String(b.id)))[0];
  intent.points=[{x:target.x,y:target.y},other?{x:other.x,y:other.y}:{x:target.x-dy/length*3.4,y:target.y+dx/length*3.4}];intent.radius=1.7;
 }
 return intent;
}

/** Plain serializable primitives. The renderer never invents a larger area
 * than the hit test, and a restored intent retains its announced geometry. */
export function patternGeometry(i){
 const x=i.x,y=i.y;
 // The Giant's actual broken resonators remove warning geometry as well as
 // hit areas. With both gone only a small, weaker body pulse remains.
 const disabled=i.disabledChannels||[];
 if(disabled.length===2)return [{kind:'circle',x,y,radius:1.1}];
 if(disabled.length&&i.shape==='ring')return [{kind:'sector',x,y,inner:i.inner??1.65,radius:i.radius??4.5,heading:disabled.includes(0)?0:Math.PI,angle:Math.PI/2}];
 if(i.shape==='ring')return [{kind:'ring',x,y,inner:i.inner??1.65,radius:i.radius??4.5}];
 if(i.shape==='cross'){const w=i.width??.8,r=i.reach??4.5;return [{kind:'rect',x:x-r,y:y-w,w:r*2,h:w*2},{kind:'rect',x:x-w,y:y-r,w:w*2,h:r*2}].filter((_,index)=>!disabled.includes(index));}
 if(i.shape==='burst')return [{kind:'circle',x,y,radius:i.radius??2.2}];
 if(i.shape==='pair')return (i.points||[{x,y}]).filter((_,index)=>!disabled.includes(index)).map(p=>({kind:'circle',x:p.x,y:p.y,radius:i.radius??1.7}));
 if(i.shape==='cleave')return [{kind:'sector',x,y,inner:i.inner??.35,radius:i.radius??5.1,heading:i.heading??0,angle:i.angle??.62}];
 if(i.shape==='line'||i.shape==='rails'){
  const dx=i.x-i.fromX,dy=i.y-i.fromY,l=Math.hypot(dx,dy),width=i.width??.85;
  if(l<1e-6)return [{kind:'circle',x:i.fromX,y:i.fromY,radius:width}];
  const ux=dx/l,uy=dy/l,endX=i.endX??i.x+ux*3,endY=i.endY??i.y+uy*3,offsets=i.shape==='rails'?[-(i.gap??1.55),i.gap??1.55]:[0];
  return offsets.map(offset=>({kind:'lane',x:i.fromX-uy*offset,y:i.fromY+ux*offset,endX:endX-uy*offset,endY:endY+ux*offset,width}));
 }
 return null;
}
function primitiveHits(g,h){
 const dx=h.x-g.x,dy=h.y-g.y,d=Math.hypot(dx,dy);
 if(g.kind==='circle')return d<g.radius;
 if(g.kind==='ring')return d>g.inner&&d<g.radius;
 if(g.kind==='rect')return h.x>g.x&&h.x<g.x+g.w&&h.y>g.y&&h.y<g.y+g.h;
 if(g.kind==='sector'){const angle=Math.atan2(Math.sin(Math.atan2(dy,dx)-g.heading),Math.cos(Math.atan2(dy,dx)-g.heading));return d>g.inner&&d<g.radius&&Math.abs(angle)<g.angle;}
 const lx=g.endX-g.x,ly=g.endY-g.y,l=Math.hypot(lx,ly)||1,along=(dx*lx+dy*ly)/l;return along>=0&&along<=l&&Math.abs(dx*ly-dy*lx)/l<g.width;
}
export function patternHits(i,h){const primitives=patternGeometry(i);return primitives?primitives.some(g=>primitiveHits(g,h)):null;}
export function drawPattern(c,i,tile){
 const primitives=patternGeometry(i);if(!primitives)return false;
 for(const g of primitives){
  if(g.kind==='rect'){c.fillRect(g.x*tile,g.y*tile,g.w*tile,g.h*tile);continue;}
  c.beginPath();
  if(g.kind==='circle'){c.arc(g.x*tile,g.y*tile,g.radius*tile,0,TAU);c.fill();}
  else if(g.kind==='ring'){c.arc(g.x*tile,g.y*tile,g.radius*tile,0,TAU);c.arc(g.x*tile,g.y*tile,g.inner*tile,0,TAU,true);c.fill('evenodd');}
  else if(g.kind==='sector'){
   const a=g.heading-g.angle,b=g.heading+g.angle;c.arc(g.x*tile,g.y*tile,g.radius*tile,a,b);c.lineTo((g.x+Math.cos(b)*g.inner)*tile,(g.y+Math.sin(b)*g.inner)*tile);c.arc(g.x*tile,g.y*tile,g.inner*tile,b,a,true);c.closePath();c.fill();
  }else{
   const dx=g.endX-g.x,dy=g.endY-g.y,l=Math.hypot(dx,dy)||1,nx=-dy/l*g.width,ny=dx/l*g.width;
   c.moveTo((g.x+nx)*tile,(g.y+ny)*tile);c.lineTo((g.endX+nx)*tile,(g.endY+ny)*tile);c.lineTo((g.endX-nx)*tile,(g.endY-ny)*tile);c.lineTo((g.x-nx)*tile,(g.y-ny)*tile);c.closePath();c.fill();
  }
  c.stroke();
 }
 return true;
}
export function bossPresentation(enemy,chapter){
 if(!enemy?.boss)return null;const p=bossBrief(chapter),intent=enemy.intent,phase=clamp(intent?.bossPhase??enemy.phase??bossPhase(enemy),0,2),recoveryLeft=intent?0:Math.max(0,enemy.status?.stagger||0);
 return {phaseIndex:phase,phaseName:PHASES[phase],identity:p.guardian,title:p.name,tell:intent?.label||'Preparing the next movement',counterplay:intent?.counterplay||p.lesson,interruptHint:intent?.interruptHint||null,rule:intent?.guardianRule||null,recovering:recoveryLeft>0,recoveryLeft,lesson:p.lesson,sequence:p.moves,core:p.core};
}
