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
