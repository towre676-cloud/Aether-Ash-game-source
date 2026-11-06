import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldControlLayout,mountFieldHUD} from '../field-hud.js';
import {touchControlLayout,targetGap} from '../touch-layout.js';

test('field actions stay within the visible viewport, clear native movement and use one reachable cluster',()=>{
 for(const [width,height] of [[232,275],[275,232],[320,568],[390,844],[412,915],[568,320],[740,360],[844,390]])for(const preset of ['spaced','large'])for(const safe of [{},{left:24,right:24,bottom:20,top:12}]){
  const native=touchControlLayout(width,height,{preset,safe}),input=structuredClone(native),view={x:0,y:0,width,height};
  const f=fieldControlLayout(view,{confirm:native.buttons.a,secondary:native.buttons.x,joystick:native.joystick,reset:native.reset}),buttons=Object.values(f.buttons);
  for(const b of buttons){assert.ok(b.w>=44&&b.h>=44);assert.ok(b.x>=safe.left||!safe.left);assert.ok(b.y>=0&&b.x+b.w<=width-(safe.right||0)+.01&&b.y+b.h<=height-(safe.bottom||0)+.01);assert.ok(targetGap(b,native.joystick)>=7,'native joystick keeps its clear approach');assert.ok(targetGap(b,native.reset)>=7,'native Reset remains unobscured');}
  for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++)assert.ok(targetGap(buttons[i],buttons[j])>=7,'field actions cannot overlap');
  assert.ok(Math.max(...buttons.map(b=>b.y+b.h))-Math.min(...buttons.map(b=>b.y))<=(width<280?160:136),'Crew is beside Use, within the same thumb area');
  if(height>width)assert.ok(f.reserve<native.reserve,'the hidden high Y footprint no longer lifts the portrait world frame');
  else assert.ok(f.reserve<=native.reserve+2,'short screens also reserve the existing Reset footprint');
  assert.deepEqual(native,input,'field arrangement never overwrites native battle/recovery rectangles');
 }
});

test('field layout preserves visual viewport offsets and native safe anchors',()=>{
 const offset={x:40,y:80,width:390,height:700},native=touchControlLayout(390,700,{safe:{right:32,bottom:18}}),move=b=>({...b,x:b.x+offset.x,y:b.y+offset.y});
 const result=fieldControlLayout(offset,{confirm:move(native.buttons.a),secondary:move(native.buttons.x),joystick:move(native.joystick),reset:move(native.reset)});
 assert.equal(result.buttons.a.x+result.buttons.a.w,move(native.buttons.a).x+native.buttons.a.w);assert.equal(result.buttons.a.y+result.buttons.a.h,move(native.buttons.a).y+native.buttons.a.h);
 assert.ok(Object.values(result.buttons).every(b=>b.x>=offset.x&&b.y>=offset.y));
});

function fixture(){
 const observers=[],listeners={},style=()=>({setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}});
 const node=(extra={})=>({style:style(),children:[],events:{},classList:{add(){},remove(){}},addEventListener(k,cb){this.events[k]=cb;},removeEventListener(k){delete this.events[k];},append(n){n.parentNode?.children.splice(n.parentNode.children.indexOf(n),1);n.parentNode=this;this.children.push(n);},...extra});
 const full=node({onclick(){this.calls=(this.calls||0)+1;}}),actions=node({querySelector:()=>full}),panel=node();actions.append(full);
 const classes=new Set(['touch-on']),native=touchControlLayout(390,844);
 const controls={};for(const[k,b]of Object.entries({...native.buttons,joystick:native.joystick,reset:native.reset})){const n=node();Object.assign(n.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px',height:b.h+'px'});controls[k]=n;}
 const touch=node({dataset:{touchViewport:JSON.stringify({x:0,y:0,width:390,height:844})},querySelector(s){return s==='#joystick'?controls.joystick:s==='.touch-view-reset'?controls.reset:controls[/data-button="(.)"/.exec(s)?.[1]];}});
 const win={innerWidth:390,innerHeight:844,addEventListener(k,v){listeners[k]=v;},removeEventListener(k){delete listeners[k];},MutationObserver:class{constructor(cb){this.cb=cb;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}};
 const doc={defaultView:win,activeElement:null};full.focus=()=>{doc.activeElement=full;};
 const game=node({ownerDocument:doc,clientWidth:390,clientHeight:844,classList:{contains:s=>classes.has(s),add:s=>classes.add(s),remove:s=>classes.delete(s)},querySelector:s=>s==='#touch'?touch:s==='.journey-help'?actions:s==='.journey-help-panel'?panel:null});
 return{game,touch,full,actions,panel,controls,classes,observers};
}

test('mount preserves native callbacks and inline targets, yields to battle and restores assistance ownership',()=>{
 const f=fixture(),before=structuredClone(Object.fromEntries(Object.entries(f.controls).map(([k,n])=>[k,{left:n.style.left,top:n.style.top,width:n.style.width,height:n.style.height}]))),api=mountFieldHUD(f.game);
 assert.equal(f.full.parentNode,f.panel,'the native assistance action belongs in invoked guidance');f.full.onclick();assert.equal(f.full.calls,1);
 assert.ok(api.reserve>0);assert.equal(f.game.style['--field-a-x'],f.controls.a.style.left,'CSS pixel inputs preserve the native safe anchor');
 f.classes.add('battle-on');assert.equal(api.reserve,null,'battle uses its native measured reserve');f.classes.delete('battle-on');
 // Native guidance repaint removes its contents; the held native full-button
 // reference is returned after repaint, retaining its owner callback.
 f.full.focus();f.full.events.click();f.panel.children=[];f.full.parentNode=null;f.game.ownerDocument.activeElement=null;f.observers[0].cb();assert.equal(f.full.parentNode,f.panel);assert.equal(f.game.ownerDocument.activeElement,f.full,'guidance repaint preserves keyboard focus on the native assistance action');
 assert.deepEqual(Object.fromEntries(Object.entries(f.controls).map(([k,n])=>[k,{left:n.style.left,top:n.style.top,width:n.style.width,height:n.style.height}])),before);
 api.destroy();assert.equal(f.full.parentNode,f.actions);assert.equal(f.classes.has('field-hud-ready'),false);assert.equal(f.game.style['--field-a-x'],undefined);assert.ok(f.observers.every(o=>o.disconnected));
 assert.equal(mountFieldHUD(null).reserve,null);
});
