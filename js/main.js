/* FarmLife — ponto de entrada: liga regras, interface e mundo 3D */
import { MAX_OFFLINE } from './data.js';
import * as core from './core.js';
import * as ui from './ui.js';
import * as world from './world/world.js';
import { sfx, setMusicMood, setAmbience } from './audio.js';
import * as sys from './systems.js';
import * as tutorial from './tutorial.js';
import * as updates from './updates.js';
import * as character from './character.js';
import { applyPrefs, gfxMode, notifyOn } from './prefs.js';

applyPrefs();

core.setHooks({
  toast: ui.toast,
  sfx,
  dirty: ui.markDirty,
  event: (name, data) => {
    tutorial.onEvent(name, data);
    if (name === 'strike') world.onStrike(data);
    if (name === 'level') world.playEmote('cheer');
  },
  fx: (target, text, cls) => {
    const p = world.screenPosOf(target);
    if (p) ui.fxAt(p.x, p.y, text, cls);
  },
});

const away = core.startGame();
const isNewGame = core.S.time === 0;

ui.initUI({
  onReset: () => { core.resetGame(); location.reload(); },
  onHelp: () => tutorial.openGuide(),
  onPanel: (tab) => tutorial.onEvent('panel', tab),
  onZoom: (f) => world.zoomBy(f),
  onCamReset: () => world.resetCamera(),
  onPlaceDecor: (id) => world.startPlacing(id),
  onPlaceLot: (id, move) => world.startPlacingLot(id, move),
  onGfx: (mode) => world.setVisual(mode),
  drawMap: (ctx, w, h) => world.drawMap(ctx, w, h),
  mapPlaces: () => world.mapPlaces(),
  mapBounds: () => world.mapBounds(),
  travelTo: (x, z) => world.travelTo(x, z),
  setPhotoMode: (on, hide) => world.setPhotoMode(on, hide),
  capture: () => world.capture(),
  onActionHeld: (held) => world.setActionHeld(held),
});

await world.initWorld(document.getElementById('scene'));
world.setVisual(gfxMode());
document.getElementById('loading').remove();

character.initCharacter({ setCharacter: world.setCharacter, setFocus: world.setFocus, toast: ui.toast });

tutorial.initTutorial({
  openCharacter: character.openCharacter,
  setGuide: world.setGuide,
  tilePos: world.tilePos,
  playerPos: () => world.debug.player.pos,
  toast: ui.toast,
});

updates.initUpdates({ save: core.save, openGuide: tutorial.openGuide, isNewGame });
if (!core.S.char.chosen) character.openCharacter();

if (away) {
  setTimeout(() => ui.toast(`👋 ${core.gw('Bem-vindo', 'Bem-vinda')} de volta, ${core.playerName()}! Você ficou fora ${core.fmtDuration(away)} e a fazenda continuou crescendo.`, 'good'), 400);
}

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (dt > 1) core.simulate(Math.min(dt, MAX_OFFLINE), true); // aba ficou em segundo plano
  else if (dt > 0) core.update(dt, false);
  for (const [msg, type] of core.takeNotices()) ui.toast(msg, type);
  const season = sys.season().id, night = core.darkness() > 0.55;
  setMusicMood(night ? 'night' : 'day', season);
  setAmbience({ season, night, rain: core.S.weather === 'chuva', indoors: world.isIndoors() });
  const step = Math.min(dt, 0.1);
  world.worldFrame(step);
  ui.uiFrame(step);
  tutorial.tutorialFrame(step);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

setInterval(core.save, 10000);

// Jogo em segundo plano (outra aba ou janela minimizada): o navegador para de desenhar, então um relógio
// avança a fazenda de tempos em tempos e, se você pediu, avisa quando a colheita ou os animais ficarem prontos.
// Com o navegador fechado não dá para avisar (a fazenda só anda de novo quando você volta).
let bgTimer = null, bgSeen = null;
function bgTick() {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  if (dt > 0) core.simulate(Math.min(dt, MAX_OFFLINE), true);
  if (!notifyOn()) return;
  const r = core.readyCounts();
  const msgs = [];
  if (r.crops > 0 && bgSeen.crops === 0) msgs.push(`🌾 ${r.crops} planta${r.crops > 1 ? 's' : ''} pronta${r.crops > 1 ? 's' : ''} para colher`);
  if (r.animals > 0 && bgSeen.animals === 0) msgs.push(`🥚 ${r.animals} animal${r.animals > 1 ? 'is' : ''} com produto para coletar`);
  if (!msgs.length) return;
  bgSeen = { crops: Math.max(bgSeen.crops, r.crops), animals: Math.max(bgSeen.animals, r.animals) };
  try {
    const n = new Notification(`🌻 Fazenda ${core.gw('do', 'da')} ${core.playerName()}`, { body: msgs.join(' · '), tag: 'farmlife-pronto', icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌻</text></svg>' });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (e) { /* alguns celulares só avisam por service worker */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    core.save();
    bgSeen = core.readyCounts();
    clearInterval(bgTimer);
    bgTimer = setInterval(bgTick, 15000);
  } else {
    clearInterval(bgTimer);
    bgTimer = null;
  }
});
window.addEventListener('pagehide', core.save);

window.farmlife = { core, world, tutorial, updates }; // acesso para depuração no console
