/* FarmLife — ponto de entrada: liga regras, interface e mundo 3D */
import { MAX_OFFLINE } from './data.js';
import * as core from './core.js';
import * as ui from './ui.js';
import * as world from './world/world.js';
import { sfx } from './audio.js';
import * as tutorial from './tutorial.js';
import * as updates from './updates.js';

core.setHooks({
  toast: ui.toast,
  sfx,
  dirty: ui.markDirty,
  event: (name, data) => {
    tutorial.onEvent(name, data);
    if (name === 'strike') world.onStrike(data);
  },
  fx: (target, text, cls) => {
    const p = world.screenPosOf(target);
    if (p) ui.fxAt(p.x, p.y, text, cls);
  },
});

const away = core.startGame();
const isNewGame = core.S.time === 0;

ui.initUI({
  onReset: () => { core.resetGame(); world.onReset(); tutorial.onReset(); },
  onHelp: () => tutorial.openGuide(),
  onPanel: (tab) => tutorial.onEvent('panel', tab),
  onZoom: (f) => world.zoomBy(f),
  onCamReset: () => world.resetCamera(),
  onActionHeld: (held) => world.setActionHeld(held),
});

await world.initWorld(document.getElementById('scene'));
document.getElementById('loading').remove();

tutorial.initTutorial({
  setGuide: world.setGuide,
  tilePos: world.tilePos,
  playerPos: () => world.debug.player.pos,
  toast: ui.toast,
});

updates.initUpdates({ save: core.save, openGuide: tutorial.openGuide, isNewGame });

if (away) {
  setTimeout(() => ui.toast(`👋 Bem-vindo de volta! Você ficou fora ${core.fmtDuration(away)} e a fazenda continuou crescendo.`, 'good'), 400);
}

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (dt > 1) core.simulate(Math.min(dt, MAX_OFFLINE), true); // aba ficou em segundo plano
  else if (dt > 0) core.update(dt, false);
  for (const [msg, type] of core.takeNotices()) ui.toast(msg, type);
  const step = Math.min(dt, 0.1);
  world.worldFrame(step);
  ui.uiFrame(step);
  tutorial.tutorialFrame(step);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

setInterval(core.save, 10000);
document.addEventListener('visibilitychange', () => { if (document.hidden) core.save(); });
window.addEventListener('pagehide', core.save);

window.farmlife = { core, world, tutorial, updates }; // acesso para depuração no console
