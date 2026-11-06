import {latchedJoystick} from './engine2/direction-latch.js?v=5.14.0';
/** Browser controls shared by the title screen, pause menu, and touch pad. */
export function bindTouchControls(buttons, {
  player, active, now = () => performance.now(),
  delay = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id),
  activateOnRelease = new Set(['y','start','select']),
}) {
  const held = new Map();
  let serial = 0;
  function release(key, immediate = false) {
    const press = held.get(key);
    if (!press || press.releasing) return;
    press.releasing = true;
    const finish = () => {
      if (held.get(key) !== press) return;
      held.delete(key);
      if (press.activated) press.owner?.buttonUp(press.button, press.source);
      if (![...held.values()].some(p => p.element === press.element)) press.element.classList.remove('pressed');
    };
    const remaining = immediate ? 0 : Math.max(0, 65 - (now() - press.time));
    if (remaining) press.timer = delay(finish, remaining); else finish();
  }
  const cleanups = [];
  for (const element of buttons) {
    const down = event => {
      event.preventDefault();
      if (!active() || element.disabled) return;
      const previous = held.get(event.pointerId);
      if (previous && !previous.releasing) return;
      if (previous) {cancel(previous.timer); previous.releasing = false; release(event.pointerId, true);}
      const owner = player();
      if (!owner) return;
      const press = {owner, button: element.dataset.button, source: `touch:${++serial}`,
        element, time: now(), releasing: false, activated: false, cancelled: false,
        deferred: activateOnRelease.has(element.dataset.button)};
      held.set(event.pointerId, press);
      element.setPointerCapture?.(event.pointerId);
      element.classList.add('pressed');
      if (!press.deferred) {press.activated = true; owner.buttonDown(press.button, press.source);}
    };
    const inside = event => {
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return true;
      const r=element.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;
    };
    const move = event => {const press=held.get(event.pointerId);if(press?.element===element&&press.deferred&&!inside(event)){press.cancelled=true;element.classList.remove('pressed');}};
    const up = event => {
      event.preventDefault();const press=held.get(event.pointerId);
      if(press?.element!==element)return;
      if(press?.element===element&&press.deferred&&!press.activated&&!press.cancelled&&inside(event)&&active()&&!element.disabled){press.activated=true;press.time=now();press.owner.buttonDown(press.button,press.source);}
      release(event.pointerId);
    };
    const abort = event => {
      event.preventDefault();const press=held.get(event.pointerId);
      if(press?.element!==element)return;
      // Cancellation must release even during the short minimum-press timer.
      cancel(press.timer);press.releasing=false;release(event.pointerId,true);
    };
    // Browsers normally lose capture immediately after pointerup. Preserve the
    // minimum-duration release in that case so the native core sees quick taps.
    const lostCapture = event => {if(!held.get(event.pointerId)?.releasing)abort(event);};
    for (const [name, callback] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',abort],['lostpointercapture',lostCapture]]) {
      element.addEventListener(name, callback);
      cleanups.push(() => element.removeEventListener(name, callback));
    }
  }
  return {
    releaseAll() {
      for (const [key, press] of held) {
        cancel(press.timer);
        press.releasing = false;
        release(key, true);
      }
    },
    destroy() { this.releaseAll(); cleanups.forEach(fn => fn()); },
  };
}

/** Edge-triggered standard-gamepad menu controls; gameplay stays in the core. */
export class MenuGamepad {
  constructor({move, select, back, adjust = move}) { this.actions = {move,select,back,adjust}; this.previous = new Set(); }
  update(pad, enabled) {
    const current = new Set();
    if (pad?.connected !== false && pad) {
      const pressed = n => !!pad.buttons[n]?.pressed;
      if (pressed(12) || pad.axes?.[1] < -.5) current.add('up');
      if (pressed(13) || pad.axes?.[1] > .5) current.add('down');
      if (pressed(14) || pad.axes?.[0] < -.5) current.add('left');
      if (pressed(15) || pad.axes?.[0] > .5) current.add('right');
      if (pressed(0)) current.add('select');
      if (pressed(1)) current.add('back');
    }
    if (enabled) for (const action of current) if (!this.previous.has(action)) {
      if (action === 'up') this.actions.move(-1);
      else if (action === 'down') this.actions.move(1);
      else if (action === 'left') this.actions.adjust(-1);
      else if (action === 'right') this.actions.adjust(1);
      else this.actions[action]();
    }
    this.previous = current;
  }
}

/** Eight-way digital movement, with an inert center and immediate release. */
export function joystickDirections(dx,dy,radius=64){
  if(Math.hypot(dx,dy)<radius*.22)return [];
  const sectors=[['right'],['right','down'],['down'],['down','left'],['left'],['left','up'],['up'],['up','right']];
  return sectors[(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
}
export function bindDigitalJoystick(element,{player,active}){
  let gesture=null,serial=0;
  function releaseAll(){
    const press=gesture;gesture=null;
    element.classList.remove('engaged');element.style.setProperty('--stick-x','0px');element.style.setProperty('--stick-y','0px');
    if(press){const buttons=[...press.buttons];press.buttons.clear();for(const button of buttons)press.owner.buttonUp(button,press.source);}
  }
  function move(event){
    if(!gesture||event.pointerId!==gesture.id)return;
    event.preventDefault();if(!active()){releaseAll();return;}
    const press=gesture,box=element.getBoundingClientRect(),dx=event.clientX-box.left-box.width/2,dy=event.clientY-box.top-box.height/2;
    const latch=latchedJoystick(press.latch,dx,dy,Math.min(box.width,box.height)/2),next=new Set(latch.directions);
    for(const button of [...press.buttons])if(!next.has(button)){press.buttons.delete(button);press.owner.buttonUp(button,press.source);if(gesture!==press)return;}
    for(const button of next)if(!press.buttons.has(button)){press.buttons.add(button);press.owner.buttonDown(button,press.source);if(gesture!==press)return;}
    press.latch=latch;
    const length=Math.hypot(dx,dy),reach=Math.min(1,length/(box.width*.32)),angle=latch.angle;
    element.style.setProperty('--stick-x',next.size?`${Math.cos(angle)*box.width*.28*reach}px`:'0px');
    element.style.setProperty('--stick-y',next.size?`${Math.sin(angle)*box.height*.28*reach}px`:'0px');
  }
  function down(event){event.preventDefault();if(gesture||!active())return;const owner=player();if(!owner)return;gesture={id:event.pointerId,owner,source:`joystick:${++serial}`,buttons:new Set(),latch:null};element.setPointerCapture?.(event.pointerId);element.classList.add('engaged');move(event);}
  function up(event){if(gesture?.id===event.pointerId){event.preventDefault();releaseAll();}}
  const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,lostpointercapture:up};
  for(const[name,fn]of Object.entries(handlers))element.addEventListener(name,fn);
  return {releaseAll,destroy(){releaseAll();for(const[name,fn]of Object.entries(handlers))element.removeEventListener(name,fn);}};
}
