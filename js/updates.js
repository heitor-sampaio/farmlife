/* FarmLife — aviso de versão nova (pede para recarregar) e "novidades" depois de atualizar */
import { VERSION, CHANGELOG, compareVersions } from './changelog.js';

const SEEN_KEY = 'farmlife-version-seen';
const CHECK_EVERY = 5 * 60 * 1000; // procura versão nova a cada 5 minutos (e ao voltar para a aba)

const $ = (sel) => document.querySelector(sel);
let api = null;
let latest = null;
let shownFor = null;
const el = {};

/**
 * api: { save(), openGuide(topic, sinceVersion), isNewGame }
 */
export function initUpdates(a) {
  api = a;
  Object.assign(el, { bar: $('#update-bar'), text: $('#update-text'), now: $('#update-now'), later: $('#update-later') });
  el.now.addEventListener('click', applyUpdate);
  el.later.addEventListener('click', () => { el.bar.hidden = true; });

  // Quem já jogava vê o que mudou desde a última versão que abriu
  let seen = null;
  try { seen = localStorage.getItem(SEEN_KEY); } catch (e) { /* ignora */ }
  try { localStorage.setItem(SEEN_KEY, VERSION); } catch (e) { /* ignora */ }
  const since = seen || (api.isNewGame ? VERSION : CHANGELOG[1].version);
  if (compareVersions(since, VERSION) < 0) setTimeout(() => api.openGuide('novidades', since), 900);

  check();
  setInterval(check, CHECK_EVERY);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}

/** Busca o version.json publicado (sem cache) e avisa se houver versão mais nova. */
export async function check() {
  if (location.protocol === 'file:') return;
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const info = await res.json();
    if (compareVersions(info.version, VERSION) > 0 && shownFor !== info.version) {
      shownFor = info.version;
      latest = info;
      showBar(info);
    }
  } catch (e) { /* sem internet: tenta de novo mais tarde */ }
}

function showBar(info) {
  el.text.innerHTML = `🆕 <b>Nova versão do FarmLife (v${info.version})!</b> Atualize para jogar com as novidades. Seu progresso fica salvo.`;
  el.now.disabled = false;
  el.now.textContent = '🔄 Atualizar agora';
  el.bar.hidden = false;
}

/** Salva, baixa de novo todos os arquivos (para não sobrar nada velho no cache) e recarrega. */
async function applyUpdate() {
  el.now.disabled = true;
  el.now.textContent = 'Atualizando…';
  api.save();
  const files = (latest && latest.files) || [];
  await Promise.all(files.map((f) => fetch(f, { cache: 'reload' }).catch(() => {})));
  location.reload();
}

// Usado nos testes pelo console
export const debugShow = (version) => { latest = { version, files: [] }; showBar(latest); };
