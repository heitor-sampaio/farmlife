/* FarmLife — ponto de entrada: liga regras, interface e mundo 3D */
import { MAX_OFFLINE } from './data.js';
import * as core from './core.js';
import * as ui from './ui.js';
import * as world from './world/world.js';
import { sfx } from './audio.js';

core.setHooks({
  toast: ui.toast,
  sfx,
  dirty: ui.markDirty,
  fx: (target, text, cls) => {
    const p = world.screenPosOf(target);
    if (p) ui.fxAt(p.x, p.y, text, cls);
  },
});

const away = core.startGame();

ui.initUI({
  onReset: () => { core.resetGame(); world.onReset(); },
  onZoom: (f) => world.zoomBy(f),
  onAction: () => world.pressAction(),
});

await world.initWorld(document.getElementById('scene'));
document.getElementById('loading').remove();

if (away) {
  setTimeout(() => ui.toast(`👋 Bem-vindo de volta! Você ficou fora ${core.fmtDuration(away)} e a fazenda continuou crescendo.`, 'good'), 400);
}

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (dt > 1) core.simulate(Math.min(dt, MAX_OFFLINE), true); // aba ficou em segundo plano
  else if (dt > 0) core.update(dt, false);
  const step = Math.min(dt, 0.1);
  world.worldFrame(step);
  ui.uiFrame(step);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

setInterval(core.save, 10000);
document.addEventListener('visibilitychange', () => { if (document.hidden) core.save(); });
window.addEventListener('pagehide', core.save);

window.farmlife = { core, world }; // acesso para depuração no console
