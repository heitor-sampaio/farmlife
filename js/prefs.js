/* FarmLife — preferências deste aparelho (não fazem parte do save da fazenda) */
const KEY = 'farmlife-controls';

// joy: lado da tela onde fica o joystick no celular; o outro lado gira a câmera e o botão ✋ vai para lá
export const prefs = { joy: 'right' };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignora */ }

export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
export const joySide = () => (prefs.joy === 'left' ? 'left' : 'right');
/** "direita"/"esquerda" para os textos (other: o lado oposto). */
export const sideWord = (other = false) => ((joySide() === 'right') !== other ? 'direita' : 'esquerda');

export function applyPrefs() {
  document.body.classList.toggle('joy-right', joySide() === 'right');
}

export function setJoySide(side) {
  prefs.joy = side === 'left' ? 'left' : 'right';
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* ignora */ }
  applyPrefs();
}
