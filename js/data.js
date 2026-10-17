/* FarmLife — dados de configuração do jogo */

export const COLS = 8;
export const ROWS = 6;
export const DAY_LEN = 180;            // duração de um dia do jogo, em segundos reais
export const MAX_OFFLINE = 8 * 3600;   // progresso máximo simulado enquanto o jogador está fora
export const SAVE_KEY = 'farmlife-save-v1';
export const SOUND_KEY = 'farmlife-sound';

// seed = preço da semente, sell = preço base de venda, time = segundos para crescer
// regrow = fração do crescimento perdida ao colher (a planta continua no lote)
export const CROPS = {
  trigo:     { name: 'Trigo',     icon: '🌾', seed: 5,   sell: 12,  time: 20,  xp: 2,  level: 1 },
  cenoura:   { name: 'Cenoura',   icon: '🥕', seed: 12,  sell: 30,  time: 40,  xp: 4,  level: 1 },
  tomate:    { name: 'Tomate',    icon: '🍅', seed: 35,  sell: 22,  time: 60,  xp: 3,  level: 2, regrow: 0.6 },
  milho:     { name: 'Milho',     icon: '🌽', seed: 40,  sell: 95,  time: 100, xp: 10, level: 3 },
  morango:   { name: 'Morango',   icon: '🍓', seed: 80,  sell: 45,  time: 120, xp: 5,  level: 4, regrow: 0.5 },
  berinjela: { name: 'Berinjela', icon: '🍆', seed: 90,  sell: 210, time: 180, xp: 20, level: 5 },
  abobora:   { name: 'Abóbora',   icon: '🎃', seed: 130, sell: 320, time: 240, xp: 30, level: 6 },
  girassol:  { name: 'Girassol',  icon: '🌻', seed: 200, sell: 480, time: 300, xp: 45, level: 8 },
};

export const PRODUCTS = {
  ovo:   { name: 'Ovo',   icon: '🥚', sell: 45,  xp: 5 },
  la:    { name: 'Lã',    icon: '🧶', sell: 140, xp: 10 },
  leite: { name: 'Leite', icon: '🥛', sell: 210, xp: 15 },
  trufa: { name: 'Trufa', icon: '🍄', sell: 360, xp: 22 },
};

// Animais comem 1 trigo por ciclo de produção
export const ANIMALS = {
  galinha: { name: 'Galinha', icon: '🐔', cost: 250,  product: 'ovo',   time: 60,  level: 2 },
  ovelha:  { name: 'Ovelha',  icon: '🐑', cost: 700,  product: 'la',    time: 120, level: 4 },
  vaca:    { name: 'Vaca',    icon: '🐄', cost: 1200, product: 'leite', time: 150, level: 5 },
  porco:   { name: 'Porco',   icon: '🐖', cost: 2000, product: 'trufa', time: 200, level: 7 },
};

// Campos de plantio. O principal se expande lote a lote; os outros são comprados inteiros na loja.
export const FIELDS = [
  { id: 'principal', name: 'Campo principal', icon: '🏡', cols: COLS, rows: ROWS, cost: 0, level: 1 },
  { id: 'leste', name: 'Campo do Leste', icon: '🌄', cols: 6, rows: 4, cost: 3000, level: 4 },
  { id: 'sul', name: 'Campo do Sul', icon: '🌾', cols: 8, rows: 4, cost: 7500, level: 6 },
  { id: 'lago', name: 'Campo do Lago', icon: '🦆', cols: 6, rows: 5, cost: 15000, level: 8 },
];
let fieldStart = 0;
for (const f of FIELDS) { f.start = fieldStart; f.count = f.cols * f.rows; fieldStart += f.count; }
export const TOTAL_PLOTS = fieldStart;

/** Campo, linha e coluna de um lote pelo índice global. */
export function fieldOf(i) {
  for (const f of FIELDS) {
    if (i >= f.start && i < f.start + f.count) {
      const k = i - f.start;
      return { field: f, r: Math.floor(k / f.cols), c: k % f.cols };
    }
  }
  return null;
}

// Lavoura mecanizada: um campo enorme só de trigo, trabalhado com máquinas que o jogador dirige
export const BIG_FIELD = {
  name: 'Campo de Trigo', icon: '🌾', cols: 24, rows: 16, cost: 20000, level: 6,
  time: 90, // segundos para o trigo amadurecer (não precisa de rega)
};
export const BIG_CELLS = BIG_FIELD.cols * BIG_FIELD.rows;
export const MACHINES = {
  arado:         { name: 'Trator com arado',       icon: '🚜', cost: 5000,  level: 6, desc: 'Ara 3 faixas de terra por onde passa.' },
  plantadeira:   { name: 'Trator com plantadeira', icon: '🚜', cost: 7000,  level: 6, desc: 'Planta trigo em 4 faixas (usa suas sementes de trigo).' },
  colheitadeira: { name: 'Colheitadeira',          icon: '🌾', cost: 12000, level: 7, desc: 'Colhe 5 faixas de trigo maduro de uma vez.' },
};

// Pescaria no lago. dif = dificuldade do minigame (0 a 1); weight = chance relativa
export const FISH = {
  lambari:  { name: 'Lambari',       icon: '🐟', sell: 15,  xp: 3,  dif: 0.15, weight: 40, color: 0xb0bec5 },
  tilapia:  { name: 'Tilápia',       icon: '🐠', sell: 40,  xp: 5,  dif: 0.3,  weight: 30, color: 0x9aa86b },
  bagre:    { name: 'Bagre',         icon: '🐡', sell: 70,  xp: 8,  dif: 0.45, weight: 12, color: 0x6d5c4b, night: true },
  lagostim: { name: 'Lagostim',      icon: '🦞', sell: 90,  xp: 9,  dif: 0.5,  weight: 6,  color: 0xd84315, rain: true },
  carpa:    { name: 'Carpa dourada', icon: '🎏', sell: 250, xp: 20, dif: 0.75, weight: 3,  color: 0xffb300, rare: true },
  bota:     { name: 'Bota velha',    icon: '👢', sell: 1,   xp: 1,  dif: 0.05, weight: 6,  color: 0x5d4037, junk: true },
};
export const RODS = [
  null,
  { name: 'Vara de bambu', icon: '🎣', cost: 100,  level: 1, zone: 0.26, bite: 1.0, wait: 1.0, desc: 'Permite pescar no lago. Equipe a 🎣 na barra e vá até a beira.' },
  { name: 'Vara de fibra', icon: '🎣', cost: 1500, level: 4, zone: 0.36, bite: 1.35, wait: 0.7, desc: 'Faixa de captura maior, peixes mordem mais rápido e mais chance de peixes raros.' },
];

// Pet: um border collie que acompanha o jogador
export const PET = { breed: 'Border collie', icon: '🐶', cost: 400, level: 2, defaultName: 'Pipoca', xp: 10 };

// Mutações: plantas crescendo durante um evento climático podem ganhar a mutação dele.
// O bônus de cada mutação soma: valor = base × (1 + Σ(mult − 1)).
export const MUTATIONS = {
  molhada:    { name: 'Molhada',    icon: '💧', rarity: 'Comum',    mult: 1.5, color: 0x4fc3f7 },
  ventada:    { name: 'Ventada',    icon: '🍃', rarity: 'Incomum',  mult: 2,   color: 0x9ccc65 },
  congelada:  { name: 'Congelada',  icon: '❄️', rarity: 'Incomum',  mult: 2.5, color: 0xb3e5fc },
  escaldada:  { name: 'Escaldada',  icon: '🔥', rarity: 'Rara',     mult: 3,   color: 0xff7043 },
  eletrizada: { name: 'Eletrizada', icon: '⚡', rarity: 'Épica',    mult: 5,   color: 0xffee58 },
  arcoiris:   { name: 'Arco-íris',  icon: '🌈', rarity: 'Lendária', mult: 10,  color: 0xff4fa3 },
  eclipsada:  { name: 'Eclipsada',  icon: '🌑', rarity: 'Mítica',   mult: 20,  color: 0x7e57c2 },
};
export const RARITY_COLOR = { Comum: '#78909c', Incomum: '#43a047', Rara: '#1e88e5', Épica: '#8e24aa', Lendária: '#f57c00', Mítica: '#d81b60' };

// Eventos climáticos (um por vez). rate = chance por segundo de cada planta crescendo ganhar a mutação
export const WEATHER_EVENTS = {
  chuva:      { name: 'Chuva',               icon: '🌧️', mutation: 'molhada',    dur: [40, 60], weight: 30, rate: 0.02,  waters: true, desc: 'A chuva rega tudo.' },
  ventania:   { name: 'Ventania',            icon: '🌪️', mutation: 'ventada',    dur: [30, 45], weight: 20, rate: 0.012, desc: 'Um vento forte sopra pela fazenda.' },
  neve:       { name: 'Neve',                icon: '❄️', mutation: 'congelada',  dur: [35, 50], weight: 14, rate: 0.012, desc: 'Está nevando!' },
  calor:      { name: 'Sol escaldante',      icon: '🔥', mutation: 'escaldada',  dur: [35, 50], weight: 16, rate: 0.01,  evaporate: 2.5, desc: 'Calorão: a água das plantas evapora rápido.' },
  tempestade: { name: 'Tempestade de raios', icon: '⛈️', mutation: 'eletrizada', dur: [35, 50], weight: 12, strikes: [3, 6], waters: true, desc: 'Raios caem sobre as plantas!' },
  arcoiris:   { name: 'Arco-íris',           icon: '🌈', mutation: 'arcoiris',   dur: [25, 35], weight: 1,  rate: 0.006, after: 0.1, desc: 'Um arco-íris brilha sobre a fazenda.' },
  eclipse:    { name: 'Eclipse',             icon: '🌑', mutation: 'eclipsada',  dur: [35, 45], weight: 2,  rate: 0.004, desc: 'O sol sumiu: tudo escureceu.' },
};
// A cada rodada há uma chance de começar um evento. Depois de um evento, a próxima rodada é pulada.
export const EVENT_ROUND = 60;    // segundos por rodada (1/3 de um dia do jogo)
export const EVENT_CHANCE = 0.2;  // chance de evento em cada rodada
export const EVENT_COOLDOWN = 1;  // rodadas de descanso depois de um evento

export const WATER_TIME = [40, 70, 110, 180];
export const GROW_SPEED = [1, 1.2, 1.45, 1.75];
export const PEN_SIZE = [4, 8, 12];

export const UPGRADES = {
  regador:  { name: 'Regador reforçado', icon: '🚿', costs: [150, 600, 1800], req: [1, 3, 5], effect: (l) => `Água dura ${WATER_TIME[l]}s` },
  adubo:    { name: 'Adubo orgânico',    icon: '🧪', costs: [400, 1200, 3000], req: [2, 4, 6], effect: (l) => `Crescimento +${Math.round((GROW_SPEED[l] - 1) * 100)}%` },
  curral:   { name: 'Curral maior',      icon: '🏡', costs: [900, 2800],       req: [3, 6],    effect: (l) => `${PEN_SIZE[l]} vagas para animais` },
  alimentador: { name: 'Alimentador automático', icon: '⚙️', costs: [1500], req: [3], effect: (l) => (l ? 'Animais comem 🌾 do celeiro sozinhos' : 'Alimentação manual') },
  aspersor: { name: 'Aspersores',        icon: '⛲', costs: [4000],            req: [7],       effect: (l) => (l ? 'Rega tudo automaticamente' : 'Rega manual') },
};

// Funcionários: custo de contratação + salário cobrado no início de cada dia
export const WORKERS = {
  colhedor:  { name: 'Colhedor',  icon: '🧺', hire: 800,  wage: 40, level: 3, desc: 'Colhe sozinho todas as plantas prontas.' },
  plantador: { name: 'Plantador', icon: '🌱', hire: 1000, wage: 50, level: 4, desc: 'Planta nos lotes arados vazios usando a semente selecionada (ou a que você tiver mais).' },
  tratador:  { name: 'Tratador',  icon: '🐾', hire: 1200, wage: 60, level: 5, desc: 'Coleta ovos, lã, leite e trufas dos animais.' },
};
export const WORK_TIME = 2.5; // segundos por tarefa quando o jogo é simulado (aba fechada, sono)

export const CUSTOMERS = [
  '👵 Dona Maria', '👨‍🍳 Chef Paulo', '🧑‍🌾 Seu João', '👧 Aninha',
  '🏪 Mercadinho da Vila', '🥐 Padaria Sol Nascente', '🍲 Restaurante Sabor', '👴 Vô Antônio',
];
