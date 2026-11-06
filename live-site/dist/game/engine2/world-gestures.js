/** World-surface input only. HUD buttons and the movement pad keep their own
 * pointer ownership; two fingers there must never turn into a camera gesture.
 *
 * Touch taps resolve on release, so the first finger of a pinch cannot walk,
 * select a target, or open an interaction. Mouse/pen presses remain immediate.
 * onZoom receives an absolute zoom and a midpoint in canvas CSS pixels.
 * onPinchEnd receives {cancelled, zoom}; zoom is null if nothing was emitted.
 */
export function bindWorldGestures(canvas, {
  active = () => true, getZoom = () => 1, onTap = () => {},
  onPinchStart = () => {}, onZoom = () => {}, onPinchEnd = () => {},
  lifecycleTarget = typeof window === 'undefined' ? null : window,
  minZoom = .5, maxZoom = 3,
} = {}) {
  const contacts = new Map(), captured = new Set();
  const minimum = Number.isFinite(minZoom) && minZoom > 0 ? minZoom : .5;
  const maximum = Number.isFinite(maxZoom) && maxZoom >= minimum ? maxZoom : Math.max(3, minimum);
  const clamp = value => Math.max(minimum, Math.min(maximum, value));
  const validPoint = event => Number.isFinite(event.clientX) && Number.isFinite(event.clientY);
  let pinch = null, quarantined = false, destroyed = false, suppressClickUntil = 0;

  function eatTouch(event) {
    if (event.cancelable !== false) event.preventDefault?.();
    suppressClickUntil = Date.now() + 700;
  }
  function capture(id) {
    if (!canvas.setPointerCapture) return;
    captured.add(id);
    try { canvas.setPointerCapture(id); } catch { captured.delete(id); }
  }
  function releaseCapture(id) {
    if (!captured.delete(id)) return;
    // Delete ownership first: some hosts dispatch lostpointercapture inline.
    try { canvas.releasePointerCapture?.(id); } catch {}
  }
  function readZoom() {
    const value = Number(getZoom());
    return Number.isFinite(value) && value > 0 ? value : 1;
  }
  function pairGeometry(ids) {
    const a = contacts.get(ids[0]), b = contacts.get(ids[1]);
    if (!a || !b) return null;
    const box = canvas.getBoundingClientRect();
    return {distance: Math.hypot(b.x - a.x, b.y - a.y),
      x: (a.x + b.x) / 2 - box.left, y: (a.y + b.y) / 2 - box.top};
  }
  function inside(event) {
    if (!validPoint(event)) return false;
    const box = canvas.getBoundingClientRect();
    const right = Number.isFinite(box.right) ? box.right : box.left + box.width;
    const bottom = Number.isFinite(box.bottom) ? box.bottom : box.top + box.height;
    return event.clientX >= box.left && event.clientX <= right && event.clientY >= box.top && event.clientY <= bottom;
  }
  function updateContact(contact, event) {
    if (!validPoint(event)) { contact.tap = false; return false; }
    contact.x = event.clientX; contact.y = event.clientY;
    if (Math.hypot(contact.x - contact.startX, contact.y - contact.startY) > 12) contact.tap = false;
    return true;
  }
  function endPinch(cancelled) {
    const previous = pinch;
    pinch = null;
    if (previous) onPinchEnd({cancelled, zoom: previous.lastZoom});
  }
  function abort(forget = false) {
    const previous = pinch;
    pinch = null;
    for (const contact of contacts.values()) contact.tap = false;
    quarantined = contacts.size > 0;
    if (forget) { contacts.clear(); quarantined = false; }
    for (const id of [...captured]) releaseCapture(id);
    if (previous) onPinchEnd({cancelled: true, zoom: previous.lastZoom});
  }
  function beginPinch() {
    const ids = [...contacts.keys()].slice(0, 2), geometry = pairGeometry(ids);
    const session = {ids, distance: geometry.distance >= 2 ? geometry.distance : null,
      zoom: readZoom(), lastZoom: null};
    pinch = session;
    quarantined = true;
    for (const contact of contacts.values()) contact.tap = false;
    onPinchStart();
    // A callback may open a menu or synchronously cancel this binding.
    if (pinch === session && !active()) abort();
  }
  function rebasePinch() {
    if (!pinch) return;
    pinch.ids = [...contacts.keys()].slice(0, 2);
    const geometry = pairGeometry(pinch.ids);
    pinch.distance = geometry.distance >= 2 ? geometry.distance : null;
    pinch.zoom = readZoom();
  }
  function down(event) {
    if (destroyed || event.pointerId == null) return;
    if (event.pointerType !== 'touch') {
      if (event.sourceCapabilities?.firesTouchEvents) { eatTouch(event); return; }
      if ((event.button != null && event.button !== 0) || !validPoint(event) || !active()) return;
      suppressClickUntil = 0;
      onTap(event);
      return;
    }
    if (!active()) { if (contacts.size) abort(); return; }
    if (contacts.has(event.pointerId) || !validPoint(event)) return;
    eatTouch(event);
    contacts.set(event.pointerId, {x: event.clientX, y: event.clientY,
      startX: event.clientX, startY: event.clientY, tap: !quarantined});
    capture(event.pointerId);
    if (contacts.size === 2 && !pinch && !quarantined) beginPinch();
    else if (contacts.size > 1) for (const contact of contacts.values()) contact.tap = false;
  }
  function move(event) {
    const contact = contacts.get(event.pointerId);
    if (destroyed || !contact) return;
    eatTouch(event);
    if (!active()) { abort(); return; }
    if (!updateContact(contact, event) || !pinch || pinch.suspended || !pinch.ids.includes(event.pointerId)) return;
    const geometry = pairGeometry(pinch.ids), session = pinch;
    // Coincident fingers need a real span before a distance ratio is defined.
    if (geometry.distance < 2) return;
    if (session.distance == null) { session.distance = geometry.distance; session.zoom = readZoom(); return; }
    if (geometry.distance === session.distance) return;
    const next = clamp(session.zoom * geometry.distance / session.distance);
    // Rebase on every accepted sample. This equals the initial distance ratio
    // away from a limit and lets reversing the fingers leave either limit now.
    session.distance = geometry.distance;
    session.zoom = next;
    if (session.lastZoom === next) return;
    session.lastZoom = next;
    onZoom(next, {x: geometry.x, y: geometry.y});
  }
  function up(event) {
    const contact = contacts.get(event.pointerId);
    if (destroyed || !contact) return;
    eatTouch(event);
    if (!active()) {
      contacts.delete(event.pointerId); releaseCapture(event.pointerId); abort(); return;
    }
    updateContact(contact, event);
    const canTap = contact.tap && !quarantined && !pinch && contacts.size === 1 && active() && inside(event);
    const wasMember = pinch?.ids.includes(event.pointerId);
    contacts.delete(event.pointerId);
    releaseCapture(event.pointerId);
    if (!contacts.size) quarantined = false;
    if (pinch && !contacts.size) endPinch(false);
    else if (pinch && contacts.size < 2) pinch.suspended = true;
    else if (pinch && wasMember && !pinch.suspended) rebasePinch();
    if (canTap) onTap(event);
  }
  function cancelled(event) {
    if (!contacts.has(event.pointerId)) return;
    eatTouch(event);
    contacts.delete(event.pointerId);
    releaseCapture(event.pointerId);
    abort();
  }
  function lostCapture(event) {
    captured.delete(event.pointerId);
    if (contacts.has(event.pointerId)) abort();
  }
  function outsideEnd(event) {
    // A rejected capture or a cancelled gesture can finish beyond the canvas.
    // Such a release cleans up ownership; it can never become a world tap.
    if (contacts.has(event.pointerId)) cancelled(event);
  }
  function click(event) {
    if (event.pointerType === 'touch' || event.sourceCapabilities?.firesTouchEvents ||
        (!event.pointerType && event.detail !== 0 && Date.now() <= suppressClickUntil)) {
      event.preventDefault?.(); event.stopImmediatePropagation?.();
    }
  }
  const blur = () => abort(true);
  const handlers = {pointerdown: down, pointermove: move, pointerup: up,
    pointercancel: cancelled, lostpointercapture: lostCapture};
  for (const [name, handler] of Object.entries(handlers)) canvas.addEventListener(name, handler, {passive: false});
  canvas.addEventListener('click', click, true);
  lifecycleTarget?.addEventListener('blur', blur);
  lifecycleTarget?.addEventListener('pagehide', blur);
  lifecycleTarget?.addEventListener('pointerup', outsideEnd);
  lifecycleTarget?.addEventListener('pointercancel', outsideEnd);
  return {
    get pinching() { return pinch !== null; },
    get touching() { return contacts.size > 0; },
    cancel() { abort(); },
    destroy() {
      if (destroyed) return;
      destroyed = true; abort(true);
      for (const [name, handler] of Object.entries(handlers)) canvas.removeEventListener(name, handler);
      canvas.removeEventListener('click', click, true);
      lifecycleTarget?.removeEventListener('blur', blur);
      lifecycleTarget?.removeEventListener('pagehide', blur);
      lifecycleTarget?.removeEventListener('pointerup', outsideEnd);
      lifecycleTarget?.removeEventListener('pointercancel', outsideEnd);
    },
  };
}
