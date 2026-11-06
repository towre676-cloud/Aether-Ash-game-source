import {SNESPlayer} from './emulator/player.js';
import {Soundtrack} from './soundtrack.js?v=5.23.0';
import {readCue} from './chrono/chrono.js';
import {applyChapterPatch, recipeIdentity, setNativeMusic} from './port.js?v=1.1.0';
import {bindTouchControls, bindDigitalJoystick, MenuGamepad} from './input-ui.js?v=5.6.0';
import {checkpointCandidate} from './checkpoints.js';

const $ = selector => document.querySelector(selector);
const screen = $('#screen'), root = new URL('../', import.meta.url);
let player, recipe, recipeHash, romBytes, finalRom, exportRomUrl;
let catalog = {tracks:[]}, cueMap = {}, bootStates = {};
let running = false, paused = false, starting = false, polling = false;
let lastCue = null, cueClock, sramClock, checkpointClock, checkpointBusy = false;
let lastCheckpoint = null, checkpointPending=null, musicMode = 'orchestra';
const CAMPAIGN = 'ash-aether.campaign/1';
const params = new URLSearchParams(location.search);
// Development telemetry: ?perf=1 loads the bounded capture helper; nothing is
// measured or kept otherwise. window.ashPerf.stop() returns the capture.
const perf = params.has('perf') ? await import('./perf/session.js').then(module => module.createSession(params)) : null;
const settings = (() => {try {return JSON.parse(localStorage.getItem('ash-aether.settings')) || {}} catch {return {}}})();
const notice = text => {
  $('#notice').textContent = text;
  $('#notice').style.display = 'block';
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => $('#notice').style.display = 'none', 4500);
};
const setStatus = text => { $('#load-status').textContent = text; };
const audio = new Soundtrack({
  resolve: path => new URL(path, root).href,
  onEnd: () => {if (running && !paused && lastCue?.song && musicMode === 'orchestra') playCue(lastCue);},
  onError: notice,
});
function trackFor(cue) {
  const mapped = cueMap[String(cue.song)] || cueMap['0x' + cue.song.toString(16).padStart(2,'0')];
  const id = typeof mapped === 'string' ? mapped : mapped?.track_id || mapped?.id;
  return catalog.tracks.find(track => track.id === id);
}
function playCue(cue) {
  if (!cue.song) {audio.pause(); return;}
  const track = trackFor(cue);
  if (track) audio.play(track);
}
async function poll() {
  if (!running || paused || polling || musicMode !== 'orchestra') return;
  polling = true;
  const owner = player;
  try {
    const cue = await readCue(owner);
    if (owner !== player || paused || !running) return;
    if (cue && lastCue?.song !== cue.song) {lastCue = cue; playCue(cue);}
  } catch (error) {clearInterval(cueClock); notice('Music cues unavailable: ' + error.message);}
  finally {polling = false;}
}
async function database() {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open('ash-aether-chapter1',1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function stored(key) {
  const db = await database();
  try {return await new Promise((resolve,reject) => {
    const request = db.transaction('saves').objectStore('saves').get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });} finally {db.close();}
}
// Saves from another build (for example the Chapter I release, whose
// completion byte meant "Chapter I finished") are never overwritten: they
// move to a legacy key the first time this build writes the same slot.
async function store(key,value) {
  if (['state','resume','checkpoint'].includes(key)) {
    const previous = await stored(key).catch(() => null);
    if (previous?.patch_sha256 && previous.patch_sha256 !== recipeHash)
      await storeRaw(`legacy:${previous.patch_sha256.slice(0,16)}:${key}`,previous);
  }
  return storeRaw(key,value);
}
async function storeRaw(key,value) {
  const db = await database();
  try {return await new Promise((resolve,reject) => {
    const transaction = db.transaction('saves','readwrite');
    transaction.objectStore('saves').put(value,key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || Error('Save was interrupted.'));
  });} finally {db.close();}
}
async function recentSave() {
  const candidates = await Promise.all(['state','resume','checkpoint'].map(key => stored(key).catch(() => null)));
  return candidates.filter(save => save?.patch_sha256 === recipeHash)
    .sort((a,b) => Date.parse(b.created) - Date.parse(a.created))[0];
}
async function refreshContinue() {
  const save = await recentSave();
  $('#continue').hidden = !save;
  if (save) return;
  const others = await Promise.all(['state','resume','checkpoint'].map(key => stored(key).catch(() => null)));
  if (others.some(other => other?.patch_sha256 && other.patch_sha256 !== recipeHash))
    $('#legacy-note').hidden = false;
}
async function initialize() {
  try {
    let response = await fetch(new URL('romhack/patch.json', import.meta.url),{cache:'no-store'});
    if (!response.ok) throw Error('The game files could not be loaded. Refresh to try again.');
    recipe = await response.json(); recipeHash = await recipeIdentity(recipe);
    response = await fetch(new URL('music/catalog.json', import.meta.url),{cache:'no-store'});
    if (response.ok) catalog = await response.json();
    response = await fetch(new URL('romhack/music_map.json', import.meta.url),{cache:'no-store'});
    if (response.ok) cueMap = await response.json();
    response = await fetch(new URL('config.json', import.meta.url),{cache:'no-store'});
    if (response.ok) {
      const config = await response.json();
      bootStates = config.boot_states || {};
      exportRomUrl = config.export_rom ? new URL(config.export_rom, import.meta.url).href : null;
      if (config.rom) {
        response = await fetch(new URL(config.rom, import.meta.url),{cache:'no-store'});
        if (!response.ok) throw Error('Choose your original ROM to begin.');
        romBytes = new Uint8Array(await response.arrayBuffer());
      }
    }
    // A ROM the player chose earlier stays in this browser profile only, so
    // later launches (and the desktop app) start without asking again.
    if (!romBytes) romBytes = (await stored('original-rom').catch(() => null))?.bytes || null;
    await refreshContinue();
    $('#play').disabled = false;
    setStatus(romBytes ? 'Ready to play.' : 'Choose your original Chrono Trigger USA ROM to begin.');
    $('#play').focus();
  } catch (error) {setStatus(error.message); $('#play').disabled = true;}
}
async function openRom(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return bytes;
  const {unzipSync} = await import('./emulator/vendor/fflate.js');
  const files = unzipSync(bytes);
  const names = Object.keys(files).filter(name => /\.(sfc|smc)$/i.test(name));
  if (names.length !== 1) throw Error('Choose a ZIP containing one original ROM.');
  return files[names[0]];
}
function clearClocks() {clearInterval(cueClock); clearInterval(sramClock); clearInterval(checkpointClock);}
async function start(continueSave = false, selectedSave = null) {
  if (!recipe || starting) return;
  if (!romBytes) {$('#rom-file').click(); return;}
  starting = true; $('#play').disabled = true; $('#continue').disabled = true;
  setStatus('Preparing your game…');
  try {
    const save = selectedSave || (continueSave ? await recentSave() : null);
    if (continueSave && !save) throw Error('No compatible saved game is available.');
    if (save) validateSave(save);
    touch.releaseAll(); player?.destroy(); clearClocks(); audio.pause(); lastCue = null;
    running = false; paused = false; lastCheckpoint = null;checkpointPending=null;
    finalRom = await applyChapterPatch(romBytes,recipe);
    musicMode = save?.music_mode || $('#new-music-mode').value;
    $('#music-mode').value = musicMode;
    setNativeMusic(finalRom,musicMode === 'native');
    if (exportRomUrl) $('#rom-export').href = exportRomUrl;
    else {
      if ($('#rom-export').href?.startsWith('blob:')) URL.revokeObjectURL($('#rom-export').href);
      const portable = new Uint8Array(finalRom); setNativeMusic(portable,true);
      $('#rom-export').href = URL.createObjectURL(new Blob([portable],{type:'application/octet-stream'}));
    }
    if (perf) await perf.begin();
    player = new SNESPlayer(screen,{
      capture: perf?.capture ?? null, mainThread: params.get('engine') === 'main',
      onPauseRequest: () => togglePause(true),
      onStatus: status => {if (status === 'error') {
        running = false; clearClocks(); audio.pause();
        setStatus('The game stopped. Continue from your last save or start again.');
        $('#opening').hidden = false; $('#pause-menu').hidden = true;
        $('#play').disabled = false; $('#continue').disabled = false;
      }},
      onError: error => notice(error.message),
    });
    let sram = await stored(sramKey()).catch(() => null);
    if (sram?.patch_sha256 !== recipeHash) sram = null;
    let state;
    if (save) state = stateBlob(save);
    else if (bootStates[musicMode]) {
      const response = await fetch(new URL(bootStates[musicMode],import.meta.url),{cache:'no-store'});
      if (!response.ok) throw Error('The starting scene could not be loaded.');
      state = await response.blob();
    }
    await player.load(finalRom,{name:'Ash-and-Aether.sfc',...(sram ? {sram:sram.data} : {}),...(state ? {state} : {})});
    player.setVolume(Number($('#effects-volume').value));
    running = true; paused = false;
    $('#opening').hidden = true; $('#pause-menu').hidden = true; $('#menu-button').hidden = false;
    $('#music-mode').disabled = true;
    screen.focus(); cueClock = setInterval(poll,120); sramClock = setInterval(saveSRAM,20000);
    checkpointClock = setInterval(checkpoint,1000);
    poll();
    notice('Arrows move · X confirms · Z cancels/runs · S opens the game menu · Esc pauses');
    return true;
  } catch (error) {
    running = false; player?.destroy(); clearClocks(); audio.pause();
    setStatus(error.message); $('#opening').hidden = false; $('#music-mode').disabled = false;
    return false;
  } finally {starting = false; $('#play').disabled = false; $('#continue').disabled = false;}
}
function togglePause(force) {
  if (!running) return;
  const next = force ?? !paused;
  if (next === paused) return;
  touch.releaseAll(); paused = next;
  if (next) {
    player.pause(); audio.pause(); $('#pause-menu').hidden = false; $('#resume').focus();
    capture().then(save => store('resume',save)).catch(() => {});
  } else {
    $('#pause-menu').hidden = true; player.resume(); screen.focus();
    if (musicMode === 'orchestra' && lastCue?.song) audio.resume();
  }
}
// The emulator thread serialises the machine state; it is kept as text so the
// page never parses or clones the large state tree during play. Saves from
// earlier builds hold the parsed object under "state"; both are accepted.
async function capture() {
  if (!running) throw Error('Start the game first.');
  return {schema:'ash-aether.save/1',campaign:CAMPAIGN,patch_sha256:recipeHash,engine:'snesjs',music_mode:musicMode,
    created:new Date().toISOString(),state_text:await (await player.exportState()).text()};
}
function stateBlob(save) {
  return new Blob([save.state_text ?? JSON.stringify(save.state)],{type:'application/json'});
}
function exportText(save) {
  // Exported files keep the long-standing {"state": {...}} layout without a
  // parse/stringify round trip of the state itself.
  const {state_text, state, ...rest} = save;
  const head = JSON.stringify(rest);
  return head.slice(0,-1) + ',"state":' + (state_text ?? JSON.stringify(state)) + '}';
}
function validateSave(save) {
  if (save?.schema !== 'ash-aether.save/1' || save.engine !== 'snesjs')
    throw Error('This file is not an Ash & Aether save.');
  if (save.patch_sha256 !== recipeHash)
    throw Error(save.campaign ? 'This save belongs to a different game build.'
      : 'This save is from the earlier Chapter I release. It is kept, but this expanded campaign needs a new game.');
  if (save.music_mode && !['native','orchestra'].includes(save.music_mode)) throw Error('The save has an unknown sound mode.');
  if (typeof save.state_text !== 'string' && (!save.state || typeof save.state !== 'object')) throw Error('The save has no game state.');
}
async function importState(save) {
  validateSave(save); touch.releaseAll();
  if ((save.music_mode || 'orchestra') !== musicMode) {
    if (!await start(true,save)) throw Error('The saved game could not be restored.');
    return;
  }
  await player.importState(stateBlob(save));
  audio.pause(); lastCue = null;
}
// In-game battery saves are per build: the Chapter I build's SRAM stays under
// its original key instead of being replaced by this campaign's.
const sramKey = () => 'sram:' + recipeHash;
function download(blob,name) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = name;
  link.click(); setTimeout(() => URL.revokeObjectURL(link.href),10000);
}
async function saveSRAM() {
  if (!running) return;
  try {await store(sramKey(),{patch_sha256:recipeHash,data:await player.exportSRAM()});} catch {}
}
async function checkpoint() {
  if (!running || paused || checkpointBusy) return;
  checkpointBusy = true;
  const owner = player;
  try {
    const [location,flags,fighting,modal] = await Promise.all([owner.readMemory(0x100,2),owner.readMemory(0x101d8,3),owner.readMemory(0x101dc,1),owner.readMemory(0x101f7,1)]);
    if (owner !== player || !running || paused) return;
    const map = location[0] | location[1] << 8;
    const identity = checkpointCandidate(recipe,map,flags,fighting[0],modal[0]);
    if(!identity){checkpointPending=null;return;}
    if(identity===lastCheckpoint)return;
    const pending=identity+':'+map;
    if(checkpointPending!==pending){checkpointPending=pending;return;}
    await store('checkpoint',{...await capture(),mission:flags[0]});
    lastCheckpoint = identity;
  } catch {} finally {checkpointBusy = false;}
}
async function titleScreen() {
  if (!running) return;
  togglePause(true);
  try {await store('resume',await capture());}
  catch (error) {$('#save-status').textContent = 'Could not save your place: ' + error.message; return;}
  await saveSRAM(); touch.releaseAll(); player.destroy(); clearClocks(); audio.pause();
  running = false; paused = false; lastCue = null;
  $('#pause-menu').hidden = true; $('#menu-button').hidden = true; $('#opening').hidden = false;
  $('#music-mode').disabled = false;
  await refreshContinue(); setStatus('Your place is saved. Continue when you are ready.'); $('#continue').focus();
}
$('#play').onclick = () => start(); $('#continue').onclick = () => start(true);
$('#rom-file').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const bytes = await openRom(file);
    await applyChapterPatch(bytes,recipe); // rejects anything but the exact original
    romBytes = bytes; await storeRaw('original-rom',{bytes}).catch(() => {});
    setStatus('Original game selected. Ready to play.'); $('#play').disabled = !recipe;
  }
  catch (error) {setStatus(error.message);}
  event.target.value = '';
};
$('#menu-button').onclick = () => togglePause(true); $('#resume').onclick = () => togglePause(false);
$('#title-screen').onclick = titleScreen;
$('#save').onclick = async () => {
  try {await store('state',await capture()); $('#save-status').textContent = 'Saved in this browser.';}
  catch (error) {$('#save-status').textContent = 'Save failed: ' + error.message;}
};
$('#load').onclick = async () => {
  try {
    const save = await stored('state'); if (!save) throw Error('No manual save in this browser yet.');
    await importState(save); $('#save-status').textContent = 'Saved game restored. Return to game to continue.';
  } catch (error) {$('#save-status').textContent = 'Load failed: ' + error.message;}
};
$('#restore-checkpoint').onclick = async () => {
  try {
    const save = await stored('checkpoint'); if (!save) throw Error('Your first chapter checkpoint is created when the opening scene settles.');
    await importState(save); $('#save-status').textContent = 'Chapter checkpoint restored. Return to game to continue.';
  } catch (error) {$('#save-status').textContent = 'Checkpoint could not be restored: ' + error.message;}
};
$('#export').onclick = async () => {
  try {download(new Blob([exportText(await capture())],{type:'application/json'}),'Ash-and-Aether.ashstate'); $('#save-status').textContent = 'Save exported.';}
  catch (error) {$('#save-status').textContent = error.message;}
};
$('#import').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 32*1024*1024) throw Error('Save exceeds 32 MB.');
    const save = JSON.parse(await file.text()); await importState(save); await store('state',save);
    $('#save-status').textContent = 'Save imported. Return to game to continue.';
  } catch (error) {$('#save-status').textContent = 'Import failed: ' + error.message;}
  event.target.value = '';
};
function saveSettings() {
  const value = {music:$('#new-music-mode').value,musicVolume:Number($('#music-volume').value),
    effectsVolume:Number($('#effects-volume').value),touch:$('#screen-controls').checked};
  try {localStorage.setItem('ash-aether.settings',JSON.stringify(value));} catch {}
}
if (['native','orchestra'].includes(settings.music)) $('#new-music-mode').value = $('#music-mode').value = settings.music;
for (const [key,id] of [['musicVolume','#music-volume'],['effectsVolume','#effects-volume']])
  if (Number.isFinite(settings[key])) $(id).value = Math.max(0,Math.min(1,settings[key]));
$('#new-music-mode').onchange = () => {$('#music-mode').value = $('#new-music-mode').value; saveSettings();};
$('#music-volume').oninput = () => {audio.setVolume(Number($('#music-volume').value)); saveSettings();};
$('#effects-volume').oninput = () => {player?.setVolume(Number($('#effects-volume').value)); saveSettings();};
audio.setVolume(Number($('#music-volume').value));
$('#screen-controls').checked = settings.touch ?? matchMedia('(pointer:coarse)').matches;
function updateTouch() {$('#touch').classList.toggle('enabled',$('#screen-controls').checked);}
$('#screen-controls').onchange = () => {touch.releaseAll(); updateTouch(); saveSettings();}; updateTouch();
$('#fullscreen').onclick = async () => {
  try {if (document.fullscreenElement) await document.exitFullscreen(); else await $('#game').requestFullscreen();}
  catch {notice('Fullscreen is unavailable in this browser.');}
};
const touchButtons=bindTouchControls(document.querySelectorAll('[data-button]'),{player:()=>player,active:()=>running&&!paused});
const movementStick=bindDigitalJoystick($('#joystick'),{player:()=>player,active:()=>running&&!paused});
const touch={releaseAll(){touchButtons.releaseAll();movementStick.releaseAll();}};
function overlay() {return !$('#opening').hidden ? $('#opening') : !$('#pause-menu').hidden ? $('#pause-menu') : null;}
function menuItems() {
  return [...(overlay()?.querySelectorAll('button,a[href],input:not([type=file]),select,summary,.file-label,.button-label') || [])]
    .filter(element => !element.disabled && !element.hidden && element.getClientRects().length && element.tabIndex >= 0);
}
function moveFocus(direction) {
  const items = menuItems(); if (!items.length) return;
  const index = items.indexOf(document.activeElement);
  items[(index < 0 ? 0 : (index+direction+items.length)%items.length)].focus();
}
function selectFocused() {
  const items = menuItems(); const selected = items.includes(document.activeElement) ? document.activeElement : items[0];
  if (selected?.type === 'checkbox') {selected.checked = !selected.checked; selected.dispatchEvent(new Event('change'));}
  else selected?.click();
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && running) {
    event.preventDefault(); event.stopImmediatePropagation(); togglePause(); return;
  }
  if (!overlay() || event.ctrlKey || event.metaKey || event.altKey) return;
  if (['INPUT','SELECT'].includes(event.target?.tagName)) return;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) {
    event.preventDefault(); event.stopImmediatePropagation(); moveFocus(['ArrowUp','ArrowLeft'].includes(event.key) ? -1 : 1);
  } else if (event.key.toLowerCase() === 'x' || event.key === 'Enter') {
    event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) selectFocused();
  } else if (event.key.toLowerCase() === 'z' && paused) {
    event.preventDefault(); event.stopImmediatePropagation(); togglePause(false);
  }
},true);
function adjustFocused(direction) {
  const element = document.activeElement;
  if (element?.type === 'range') {
    element.value = Math.max(Number(element.min),Math.min(Number(element.max),Number(element.value)+direction*.05));
    element.dispatchEvent(new Event('input'));
  } else if (element?.tagName === 'SELECT') {
    element.selectedIndex = Math.max(0,Math.min(element.options.length-1,element.selectedIndex+direction));
    element.dispatchEvent(new Event('change'));
  } else if (element?.type === 'checkbox') {
    element.checked = direction > 0; element.dispatchEvent(new Event('change'));
  } else moveFocus(direction);
}
const menuPad = new MenuGamepad({move:moveFocus,adjust:adjustFocused,select:selectFocused,back:() => {if (paused) togglePause(false);}});
setInterval(() => {
  let pad; try {pad = [...(navigator.getGamepads?.() || [])].find(value => value?.connected !== false && value);} catch {}
  menuPad.update(pad,!!overlay() && !starting);
},80);
window.addEventListener('blur',() => {touch.releaseAll(); if (running && !paused) togglePause(true);});
// Desktop awaits this promise, including the IndexedDB commit, before close.
// pagehide alone cannot keep a renderer alive for an asynchronous save.
window.ashFlushBeforeClose = async () => {
  if (!running) return false;
  touch.releaseAll(); player.pause(); audio.pause(); paused = true;
  clearClocks();
  await store('resume',await capture());
  await saveSRAM();
  return true;
};
window.addEventListener('pagehide',saveSRAM);
document.addEventListener('visibilitychange',() => {if (document.hidden && running && !paused) togglePause(true);});
initialize();
