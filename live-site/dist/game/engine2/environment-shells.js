/** Local materials, finite encounter budget, and order-dependent shell wear. */
export const MATERIALS={
 clay:{name:'River clay',color:'#c99b7a',hint:'Soak → freeze → strike; heat hardens dry clay'},
 reed:{name:'Woven reeds',color:'#aec483',hint:'Flame chars; Gale strips charred fibres'},
 ash:{name:'Packed ash',color:'#bdada5',hint:'Tide washes away the coat'},
 rime:{name:'Rime crust',color:'#a2dceb',hint:'Flame melts; physical impact chips'},
 mineral:{name:'Mineral plates',color:'#c8bddb',hint:'Volt charges; Earth grounds and fractures'}
};
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export function materialPool(tags=[]){return [...new Set([...(tags.includes('wet')?['clay','reed']:[]),...(tags.includes('living')?['reed']:[]),...(tags.includes('heat')||tags.includes('arid')?['ash','clay']:[]),...(tags.includes('cold')?['rime']:[]),...(tags.includes('conductive')||tags.includes('resonant')?['mineral']:[]),'clay','mineral'])];}
export function shellFor(material){return {version:1,material,integrity:1,soaked:false,fired:false,charred:false,charged:false,brittle:false};}
/** At most half a formation. Solitary creatures wear one every third encounter.
 * Tutorial, friendly rivals, and canonical bosses retain their existing balance. */
export function dressEncounter(enemies,context={},chapter=1){if(chapter<2&&!context.wild||context.friendly||context.tutorial)return;const candidates=enemies.filter(e=>!e.boss&&e.rivalAvatar===undefined);if(!candidates.length)return;
 const serial=context.encounterSerial||0,seed=hash([context.key,context.encounterKey,context.listeningSeed,serial].join(':')),pool=materialPool(context.tags);
 const budget=candidates.length===1?(serial%3===1?1:0):Math.ceil(candidates.length/2);
 const ranked=[...candidates].sort((a,b)=>hash(seed+':'+a.id)-hash(seed+':'+b.id));for(let i=0;i<budget;i++){const e=ranked[i];if(e.shell===undefined)e.shell=shellFor(pool[(seed+i)%pool.length]);}
}
export function shellLabel(e){const s=e.shell,m=MATERIALS[s?.material];if(!m)return '';if(s.integrity<=0)return m.name+' · shed';const state=s.brittle?'brittle':s.charred?'charred':s.charged?'charged':s.fired?'fired':s.soaked?'soaked':'intact';return m.name+' '+Math.ceil(s.integrity*100)+'% · '+state;}
export function resolveShell(b,target,amount,opts={}){const s=target.shell;if(!s||s.integrity<=0||!MATERIALS[s.material]||opts.dot||opts.secondary)return amount;
 const core=opts.tech?.core||opts.core,physical=opts.physical||core==='earth',before=s.integrity;let wear=physical?.23:.12,burst=false,label='';
 switch(s.material){
 case 'clay':
  if(core==='tide'){if(s.fired){wear=.8;burst=true;label='Thermal fracture';}else{s.soaked=true;wear=.25;label='Clay saturated';}}
  if(core==='flame'){if(s.soaked){s.soaked=false;wear=.38;label='Steam loosens clay';}else{s.fired=true;wear=.06;label='Clay fired · soak to fracture';}}
  if(core==='frost'&&s.soaked){s.brittle=true;wear=.22;label='Clay frost-cracked';}
  if(physical&&s.brittle){wear=1;burst=true;label='Clay shattered';}break;
 case 'reed':if(core==='flame'){s.charred=true;wear=.45;label='Reeds charred';}if(core==='gale'){wear=s.charred?1:.35;burst=s.charred;label='Fibres stripped';}break;
 case 'ash':if(core==='tide'){wear=1;burst=true;label='Ash washed away';}if(core==='gale'){wear=.5;label='Ash scattered';}break;
 case 'rime':if(core==='flame'){wear=1;burst=true;label='Rime melted';}if(physical)wear=.35;break;
 case 'mineral':if(core==='volt'){s.charged=true;wear=.16;label='Mineral charged';}if(core==='earth'){wear=s.charged?1:.35;burst=s.charged;s.charged=false;label='Mineral fractured';}break;
 }
 s.integrity=Math.max(0,before-wear);
 // Curved protection, not extra HP. Every ordinary strike makes progress.
 const reduction=.32*before*before*(s.fired?1.15:1),out=amount*(burst?1.2:1-reduction);
 if(!s.integrity){target.status.exposed=Math.max(target.status.exposed||0,3);label=MATERIALS[s.material].name+' shed';}
 if(label)b.event({type:'reaction',reaction:'shatter',label,actor:target,core,material:s.material,shellBefore:before,shellAfter:s.integrity,shellState:s.brittle?'brittle':s.charred?'charred':s.charged?'charged':s.fired?'fired':s.soaked?'soaked':'intact'});return out;
}
/** Surface colour and surviving fragments come from the actual battle condition.
 * The coat stays below the creature's face; it never becomes a generic aura. */
export function shellAppearance(shell){
 const m=MATERIALS[shell?.material];if(!m)return null;
 const integrity=Math.max(0,Math.min(1,Number.isFinite(shell.integrity)?shell.integrity:0));
 const palettes={clay:['#bb8968','#694b3f','#e2bc94'],reed:['#9cae69','#455345','#d3d296'],ash:['#b5aaa0','#625c5c','#ddd2bf'],rime:['#86c4d8','#466d87','#dcf3ed'],mineral:['#b7a9cd','#635c80','#e9d3eb']};
 let [fill,edge,light]=palettes[shell.material];
 if(shell.soaked){fill=shell.material==='clay'?'#796d64':fill;light='#a2c8cb';}
 if(shell.fired){fill='#b96e4e';edge='#653e36';light='#efbc87';}
 if(shell.charred){fill='#514d3e';edge='#302e31';light='#b58659';}
 if(shell.charged)light='#f4dc83';
 return {material:shell.material,integrity,pieces:integrity>0?Math.ceil(integrity*7):0,fill,edge,light,cracked:!!shell.brittle||integrity<.62,soaked:!!shell.soaked,charred:!!shell.charred,charged:!!shell.charged,brittle:!!shell.brittle};
}
const SHELL_PATCHES=[[-14,-23,10,8,.3],[9,-22,12,9,-.25],[-19,-7,8,9,-.2],[17,-6,10,9,.2],[-8,5,11,7,.1],[9,8,10,6,-.3],[0,-6,12,10,.15]];
function plate(c,x,y,w,h,rotation,kind){c.save();c.translate(x,y);c.rotate(rotation);c.beginPath();if(kind==='mineral'||kind==='rime'){c.moveTo(-w*.9,-h*.15);c.lineTo(-w*.35,-h);c.lineTo(w*.55,-h*.8);c.lineTo(w,h*.15);c.lineTo(w*.25,h*.85);c.lineTo(-w*.65,h*.65);c.closePath();}else{c.moveTo(-w,-h*.15);c.quadraticCurveTo(-w*.8,-h,w*.1,-h*.85);c.quadraticCurveTo(w*1.1,-h*.75,w,h*.4);c.quadraticCurveTo(w*.3,h,-w*.7,h*.6);c.closePath();}c.fill();c.stroke();c.restore();}
export function drawShell(c,e,T,options={}){
 const a=shellAppearance(e.shell);if(!a?.pieces)return;
 const x=e.x*T,y=e.y*T-19,time=Number.isFinite(options.time)?options.time:0;
 c.save();c.translate(x,y);c.lineJoin='round';c.lineCap='round';c.lineWidth=1.2;
 for(let n=0;n<a.pieces;n++){
  const [px,py,w,h,rotation]=SHELL_PATCHES[n];c.fillStyle=a.fill;c.strokeStyle=a.edge;c.globalAlpha=.68;
  if(a.material==='reed'){
   c.save();c.translate(px,py);c.rotate(rotation-.35);for(let j=0;j<3;j++){c.strokeStyle=j===1?a.light:a.fill;c.lineWidth=j===1?2:3;c.beginPath();c.moveTo(-w+j*3,h);c.quadraticCurveTo(j*2,-h*.25,w-j*2,-h-3);c.stroke();}c.strokeStyle=a.edge;c.lineWidth=1;c.beginPath();c.moveTo(-w*.55,0);c.lineTo(w*.7,-2);c.stroke();c.restore();
  }else if(a.material==='ash'){
   c.globalAlpha=.35;c.beginPath();c.ellipse(px,py,w,h,rotation,0,Math.PI*2);c.fill();c.globalAlpha=.75;c.fillStyle=n%2?a.light:a.edge;for(let j=0;j<3;j++)c.fillRect(px-w*.5+j*w*.45,py+((j+n)%3-1)*3,2,1.5);
  }else{
   plate(c,px,py,w,h,rotation,a.material);c.strokeStyle=a.light;c.globalAlpha=.7;c.lineWidth=1.1;c.beginPath();c.moveTo(px-w*.6,py-h*.35);c.lineTo(px-w*.15,py-h*.65);c.lineTo(px+w*.5,py-h*.5);c.stroke();
   if(a.material==='rime'||a.material==='mineral'){c.globalAlpha=.33;c.fillStyle=a.light;c.beginPath();c.moveTo(px-w*.2,py-h*.6);c.lineTo(px+w*.5,py-h*.4);c.lineTo(px+w*.1,py+h*.5);c.closePath();c.fill();}
  }
  if(a.cracked&&n%2===0){c.globalAlpha=.9;c.strokeStyle=a.brittle?'#e2f0e8':a.edge;c.lineWidth=a.brittle?1.4:1;c.beginPath();c.moveTo(px-3,py-h*.8);c.lineTo(px+2,py-1);c.lineTo(px-2,py+3);c.lineTo(px+3,py+h*.65);c.stroke();}
 }
 if(a.soaked){c.strokeStyle='#a6d8df';c.globalAlpha=.65;c.lineWidth=1.5;for(let j=0;j<3;j++){const dy=(time*10+j*9)%17;c.beginPath();c.moveTo(-15+j*14,8+dy);c.lineTo(-16+j*14,12+dy);c.stroke();}}
 if(a.charged){c.globalAlpha=.7+.15*Math.sin(time*5);c.strokeStyle=a.light;c.lineWidth=1.7;c.beginPath();c.moveTo(-17,-19);c.lineTo(-10,-8);c.lineTo(-1,-12);c.lineTo(5,2);c.lineTo(17,5);c.stroke();}
 // A small grounded marker communicates remaining coverage without hiding art.
 c.globalAlpha=.8;c.lineWidth=2;c.strokeStyle=a.light;c.beginPath();c.ellipse(0,23,23,7,0,Math.PI*.1,Math.PI*.1+Math.PI*.8*a.integrity);c.stroke();c.restore();
}
