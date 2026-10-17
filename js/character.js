/* FarmLife — criação do personagem (fazendeiro ou fazendeira, e o nome) */
import * as core from './core.js';
import { sfx } from './audio.js';

const $ = (sel) => document.querySelector(sel);
let api = null; // { setCharacter(gender), setFocus(on), toast(msg, type) }
const el = {};
let sel = 'm';
let backup = null; // escolha anterior (para cancelar quando aberto pelo Guia)

export const isCharacterOpen = () => !!el.root && !el.root.hidden;

export function initCharacter(a) {
  api = a;
  Object.assign(el, {
    root: $('#char'), name: $('#char-name'), label: $('#char-label'), ok: $('#char-ok'),
    cancel: $('#char-cancel'), step: $('#char-step'),
  });
  el.root.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.g)));
  el.ok.addEventListener('click', confirm);
  el.cancel.addEventListener('click', cancel);
  el.name.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirm(); }
    e.stopPropagation(); // o personagem não anda enquanto você digita
  });
}

/** Abre a criação. Na primeira vez não dá para cancelar. */
export function openCharacter() {
  const C = core.S.char;
  backup = C.chosen ? { gender: C.gender, name: C.name } : null;
  el.step.textContent = C.chosen ? 'Trocar personagem' : 'Novo jogo';
  el.cancel.hidden = !C.chosen;
  el.name.value = C.chosen ? C.name : '';
  el.root.hidden = false;
  api.setFocus(true);
  choose(C.gender, true);
}

function choose(g, silent) {
  sel = g === 'f' ? 'f' : 'm';
  el.root.querySelectorAll('[data-g]').forEach((b) => b.classList.toggle('active', b.dataset.g === sel));
  el.label.textContent = `Como você quer ser ${sel === 'f' ? 'chamada' : 'chamado'}?`;
  el.name.placeholder = core.CHAR_DEFAULT[sel];
  api.setCharacter(sel);
  if (!silent) sfx('open');
}

function close() {
  el.root.hidden = true;
  api.setFocus(false);
  el.name.blur();
}

function confirm() {
  const first = !core.S.char.chosen;
  close(); // fecha antes, para o tutorial aparecer logo em seguida
  core.setCharacter(sel, el.name.value);
  sfx('level');
  const n = core.playerName();
  api.toast(first
    ? `🌻 ${core.gw('Bem-vindo', 'Bem-vinda')} à fazenda, ${n}!`
    : `👤 Pronto! Agora você é ${core.gw('o fazendeiro', 'a fazendeira')} ${n}.`, 'good');
}

function cancel() {
  if (backup) api.setCharacter(backup.gender);
  close();
}
