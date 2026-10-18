/* FarmLife — criação do personagem (fazendeiro ou fazendeira, e o nome) */
import * as core from './core.js';
import { sfx } from './audio.js';
import { renderJoyPick, bindJoyPick } from './ui.js';
import { LOOKS } from './data.js';

const $ = (sel) => document.querySelector(sel);
let api = null; // { setCharacter(gender), setFocus(on), toast(msg, type) }
const el = {};
let sel = 'm';
let look = null; // roupas escolhidas nesta tela
let backup = null; // escolha anterior (para cancelar quando aberto pelo Guia)

export const isCharacterOpen = () => !!el.root && !el.root.hidden;

export function initCharacter(a) {
  api = a;
  Object.assign(el, {
    root: $('#char'), name: $('#char-name'), label: $('#char-label'), ok: $('#char-ok'),
    cancel: $('#char-cancel'), step: $('#char-step'), look: $('#char-look'),
  });
  el.look.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    look[b.dataset.k] = b.dataset.k === 'hat' ? b.dataset.v : Number(b.dataset.v);
    renderLook();
    api.setCharacter(sel, look);
    sfx('open');
  });
  el.root.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.g)));
  el.ok.addEventListener('click', confirm);
  el.cancel.addEventListener('click', cancel);
  bindJoyPick(el.root);
  el.name.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirm(); }
    e.stopPropagation(); // o personagem não anda enquanto você digita
  });
}

/** Abre a criação. Na primeira vez não dá para cancelar. */
export function openCharacter() {
  const C = core.S.char;
  backup = C.chosen ? { gender: C.gender, name: C.name, look: { ...C.look } } : null;
  look = { ...C.look };
  el.step.textContent = C.chosen ? 'Trocar personagem' : 'Novo jogo';
  el.cancel.hidden = !C.chosen;
  el.name.value = C.chosen ? C.name : '';
  el.root.hidden = false;
  renderJoyPick(el.root);
  api.setFocus(true);
  choose(C.gender, true);
}

function choose(g, silent) {
  sel = g === 'f' ? 'f' : 'm';
  el.root.querySelectorAll('[data-g]').forEach((b) => b.classList.toggle('active', b.dataset.g === sel));
  el.label.textContent = `Como você quer ser ${sel === 'f' ? 'chamada' : 'chamado'}?`;
  el.name.placeholder = core.CHAR_DEFAULT[sel];
  api.setCharacter(sel, look);
  renderLook();
  if (!silent) sfx('open');
}

const SHIRT_DEFAULT = { m: 0, f: 1 }, HAIR_DEFAULT = { m: 0, f: 1 };
/** Linhas de cores (camisa, calça, cabelo) e de chapéus. */
function renderLook() {
  const cur = { shirt: look.shirt >= 0 ? look.shirt : SHIRT_DEFAULT[sel], pants: look.pants, hair: look.hair >= 0 ? look.hair : HAIR_DEFAULT[sel] };
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const row = (k, label) => `<div class="look-row"><span>${label}</span><div>${LOOKS[k].map((c, i) => `<button class="sw${cur[k] === i ? ' on' : ''}" data-k="${k}" data-v="${i}" style="background:${hex(c)}" aria-label="${label} ${i + 1}"></button>`).join('')}</div></div>`;
  el.look.innerHTML = row('shirt', 'Camisa') + row('pants', 'Calça') + row('hair', 'Cabelo')
    + `<div class="look-row"><span>Chapéu</span><div>${LOOKS.hat.map((h) => `<button class="hat${look.hat === h.id ? ' on' : ''}" data-k="hat" data-v="${h.id}" title="${h.name}">${h.icon}</button>`).join('')}</div></div>`;
}

function close() {
  el.root.hidden = true;
  api.setFocus(false);
  el.name.blur();
}

function confirm() {
  const first = !core.S.char.chosen;
  close(); // fecha antes, para o tutorial aparecer logo em seguida
  core.setCharacter(sel, el.name.value, look);
  sfx('level');
  const n = core.playerName();
  api.toast(first
    ? `🌻 ${core.gw('Bem-vindo', 'Bem-vinda')} à fazenda, ${n}!`
    : `👤 Pronto! Agora você é ${core.gw('o fazendeiro', 'a fazendeira')} ${n}.`, 'good');
}

function cancel() {
  if (backup) api.setCharacter(backup.gender, backup.look);
  close();
}
