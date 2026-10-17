/* FarmLife — dados de configuração do jogo */

export const COLS = 8;
export const ROWS = 6;
export const DAY_LEN = 180;            // duração de um dia do jogo, em segundos reais
export const MAX_OFFLINE = 8 * 3600;   // progresso máximo simulado enquanto o jogador está fora
// Trocar a chave reinicia a fazenda de todos os jogadores (as chaves antigas são apagadas ao abrir o jogo)
export const SAVE_KEY = 'farmlife-save-v2';
export const OLD_SAVE_KEYS = ['farmlife-save-v1'];
export const SOUND_KEY = 'farmlife-sound';

// seed = preço da semente, sell = preço base de venda, time = segundos para crescer
// regrow = fração do crescimento perdida ao colher (a planta continua no lote)
export const CROPS = {
  trigo:     { name: 'Trigo',     icon: '🌾', seed: 4,   sell: 12,  time: 20,  xp: 2,  level: 1 },
  cenoura:   { name: 'Cenoura',   icon: '🥕', seed: 10,  sell: 26,  time: 40,  xp: 4,  level: 1 },
  tomate:    { name: 'Tomate',    icon: '🍅', seed: 30,  sell: 18,  time: 60,  xp: 2,  level: 2, regrow: 0.35 },
  milho:     { name: 'Milho',     icon: '🌽', seed: 33,  sell: 82,  time: 100, xp: 11, level: 3 },
  morango:   { name: 'Morango',   icon: '🍓', seed: 70,  sell: 45,  time: 120, xp: 4,  level: 4, regrow: 0.4 },
  berinjela: { name: 'Berinjela', icon: '🍆', seed: 104,  sell: 260, time: 180, xp: 26, level: 8 },
  abobora:   { name: 'Abóbora',   icon: '🎃', seed: 187, sell: 467, time: 240, xp: 40, level: 12 },
  girassol:  { name: 'Girassol',  icon: '🌻', seed: 293, sell: 733, time: 300, xp: 57, level: 16 },
  alface:    { name: 'Alface',    icon: '🥬', seed: 7,   sell: 20,  time: 30,  xp: 3,  level: 1 },
  batata:    { name: 'Batata',    icon: '🥔', seed: 18,  sell: 48,  time: 70,  xp: 7,  level: 2 },
  cebola:    { name: 'Cebola',    icon: '🧅', seed: 26,  sell: 65,  time: 80,  xp: 9,  level: 3 },
  pimentao:  { name: 'Pimentão',  icon: '🫑', seed: 60,  sell: 42,  time: 90,  xp: 4,  level: 6, regrow: 0.4 },
  feijao:    { name: 'Feijão',    icon: '🫘', seed: 42,  sell: 104, time: 110, xp: 13, level: 4 },
  algodao:   { name: 'Algodão',   icon: '☁️', seed: 67,  sell: 167, time: 140, xp: 18, level: 6 },
  cana:      { name: 'Cana',      icon: '🎋', seed: 98,  sell: 245, time: 170, xp: 24, level: 8 },
  melancia:  { name: 'Melancia',  icon: '🍉', seed: 149, sell: 373, time: 220, xp: 34, level: 10 },
  uva:       { name: 'Uva',       icon: '🍇', seed: 200, sell: 123,  time: 200, xp: 12,  level: 10, regrow: 0.45 },
  cafe:      { name: 'Café',      icon: '☕', seed: 300, sell: 191, time: 240, xp: 17, level: 14, regrow: 0.45 },
  abacaxi:   { name: 'Abacaxi',   icon: '🍍', seed: 356, sell: 890, time: 330, xp: 67, level: 18 },
};

export const PRODUCTS = {
  ovo:   { name: 'Ovo',   icon: '🥚', sell: 45,  xp: 4 },
  la:    { name: 'Lã',    icon: '🧶', sell: 140, xp: 9 },
  leite: { name: 'Leite', icon: '🥛', sell: 210, xp: 13 },
  trufa: { name: 'Trufa', icon: '🍄', sell: 360, xp: 20 },
};

// Animais comem 1 trigo por ciclo de produção
// f/m/baby: nomes da fêmea, do macho e do filhote; colors: variações de pelagem [feminino, masculino] (o modelo usa o índice)
export const ANIMALS = {
  galinha: { name: 'Galinha', icon: '🐔', cost: 300,  product: 'ovo',   time: 60,  level: 2, f: 'Galinha', m: 'Galo',     baby: 'Pintinho', babyIcon: '🐣', colors: [['Branca', 'Branco'], ['Marrom', 'Marrom'], ['Preta', 'Preto'], ['Carijó', 'Carijó']] },
  ovelha:  { name: 'Ovelha',  icon: '🐑', cost: 900,  product: 'la',    time: 120, level: 5, f: 'Ovelha',  m: 'Carneiro', baby: 'Cordeiro', babyIcon: '🐑', colors: [['Branca', 'Branco'], ['Creme', 'Creme'], ['Preta', 'Preto'], ['Cinza', 'Cinza']] },
  vaca:    { name: 'Vaca',    icon: '🐄', cost: 1800, product: 'leite', time: 150, level: 7, f: 'Vaca',    m: 'Touro',    baby: 'Bezerro',  babyIcon: '🐮', colors: [['Malhada', 'Malhado'], ['Malhada marrom', 'Malhado marrom'], ['Marrom', 'Marrom'], ['Preta', 'Preto']] },
  porco:   { name: 'Porco',   icon: '🐖', cost: 3500, product: 'trufa', time: 200, level: 11, f: 'Porca',   m: 'Cachaço',  baby: 'Leitão',   babyIcon: '🐷', colors: [['Rosa', 'Rosa'], ['Malhada', 'Malhado'], ['Preta', 'Preto'], ['Caramelo', 'Caramelo']] },
};
// Filhotes: só fêmeas produzem; com um macho adulto da mesma espécie, cada produção tem chance de nascer um filhote
// Pasto: campo grande a leste do Campo de Trigo só para o gado (vacas, touros e bezerros), com muito mais vagas.
// No pasto o gado come capim: não precisa de trigo.
// Queijaria: transforma o leite das vacas em queijo (2 🥛 → 1 🧀), sozinha, até com o jogo fechado. É uma obra de madeira.
export const CHEESERY = { name: 'Queijaria', icon: '🧀', level: 8, time: 90, milk: 2, capacity: 10 }; // construída com madeira (BUILDINGS.queijaria)
export const CHEESE = { name: 'Queijo', icon: '🧀', sell: 600, xp: 28 };
export const PASTURE = { name: 'Pasto', icon: '🌿', cost: 25000, level: 9, cols: 24, rows: 16, slots: 30 };
export const BREED = { chance: 0.03, grow: 900 }; // 3% por produção; o filhote vira adulto em 5 dias de jogo

// Campos de plantio. O principal se expande lote a lote; os outros são comprados inteiros na loja.
export const FIELDS = [
  { id: 'principal', name: 'Campo principal', icon: '🏡', cols: COLS, rows: ROWS, cost: 0, level: 1 },
  { id: 'leste', name: 'Campo do Leste', icon: '🌄', cols: 6, rows: 4, cost: 4000, level: 5 },
  { id: 'sul', name: 'Campo do Sul', icon: '🌾', cols: 8, rows: 4, cost: 12000, level: 9 },
  { id: 'lago', name: 'Campo do Lago', icon: '🦆', cols: 6, rows: 5, cost: 25000, level: 13 },
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
  name: 'Campo de Trigo', icon: '🌾', cols: 24, rows: 16, cost: 40000, level: 12,
  time: 90, // segundos para o trigo amadurecer (não precisa de rega)
};
export const BIG_CELLS = BIG_FIELD.cols * BIG_FIELD.rows;
export const MACHINES = {
  arado:         { name: 'Trator com arado',       icon: '🚜', cost: 8000,  level: 12, desc: 'Ara 3 faixas de terra por onde passa.' },
  plantadeira:   { name: 'Trator com plantadeira', icon: '🚜', cost: 12000,  level: 13, desc: 'Planta trigo em 4 faixas (usa suas sementes de trigo).' },
  colheitadeira: { name: 'Colheitadeira',          icon: '🌾', cost: 20000, level: 15, desc: 'Colhe 5 faixas de trigo maduro de uma vez.' },
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
  { name: 'Vara de fibra', icon: '🎣', cost: 3000, level: 7, zone: 0.36, bite: 1.35, wait: 0.7, desc: 'Faixa de captura maior, peixes mordem mais rápido e mais chance de peixes raros.' },
];

// Pet: um border collie que acompanha o jogador
export const PET = { breed: 'Border collie', icon: '🐶', cost: 500, level: 3, defaultName: 'Pipoca', xp: 10 };
// Cavalo: com a sela, o fazendeiro monta e anda bem mais rápido
export const HORSE = { name: 'Cavalo', icon: '🐴', cost: 2500, level: 6, desc: 'Um cavalo manso que pasta perto do portão do curral. Com uma sela, você monta e anda bem mais rápido pela fazenda.' };
export const SADDLE = { name: 'Sela', icon: '🏇', cost: 600, level: 6, desc: 'Sela de couro para montar no cavalo: cavalgue quase duas vezes mais rápido (e galope com Shift).' };
export const RIDE_MULT = 1.75; // velocidade a cavalo em relação a pé

// Esterco das vacas → composteira → fertilizante, que pode deixar a planta gigante (vale o dobro)
export const MANURE = { name: 'Esterco', icon: '💩', sell: 3, xp: 1, every: 70, max: 10 }; // cada vaca faz um a cada 70s
export const COMPOST = { name: 'Composteira', icon: '♻️', time: 30, capacity: 12 };         // 1 esterco vira 1 fertilizante em 30s
export const FERTILIZER = { name: 'Fertilizante', icon: '🧪', sell: 25, xp: 1, chance: 0.6 }; // 60% de chance de planta gigante

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
  // Não vem do clima: é a chance do fertilizante fazer a planta crescer gigante
  gigante:    { name: 'Gigante',    icon: '💪', rarity: 'Rara',     mult: 2,   color: 0xd4a017, fert: true },
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

// Lenha: árvores do bosque que podem ser cortadas com machado e voltam a crescer
export const AXES = [
  null,
  { name: 'Machado', icon: '🪓', cost: 150, level: 1, hits: 4, bonus: 0, desc: 'Corta as árvores do bosque em 4 golpes.' },
  { name: 'Machado de aço', icon: '🪓', cost: 1500, level: 5, hits: 2, bonus: 1, desc: 'Corta em 2 golpes e rende 1 tronco a mais por árvore.' },
];
export const LOG = { name: 'Tronco', icon: '🪵', sell: 18, xp: 1 };
export const WOOD = { logs: [2, 3], xp: 3, regrow: 300 }; // troncos por árvore; segundos para a árvore crescer de novo (5 min)
// Serraria: transforma troncos em tábuas, um tronco por vez
export const SAWMILL = { name: 'Serraria', icon: '🪚', cost: 2000, level: 4, time: 15, perLog: 2, capacity: 20 };
export const PLANK = { name: 'Tábuas de madeira', icon: '🟫', sell: 22, xp: 1 };
// Posições das árvores do bosque (oeste do mapa, entre o curral e o Campo do Sul)
export const CHOP_TREES = [
  [-13.2, 6.0], [-11.0, 5.5], [-8.9, 6.3], [-14.2, 8.9],
  [-12.4, 8.5], [-10.1, 8.9], [-7.9, 8.3],
  [-13.4, 11.1], [-11.2, 11.7], [-8.8, 11.0], [-6.6, 10.4],
  [-12.0, 13.5],
];

// Carpintaria: o jogador transforma troncos à mão em materiais de construção (work = golpes de serrote/martelo)
export const BEAM = { name: 'Viga', icon: '📏', sell: 75, xp: 2 };
export const RECIPES = [
  { id: 'tabuas', name: 'Tábuas', icon: '🟫', verb: 'Serrar tábuas', input: { tronco: 1 }, output: { madeira: 2 }, work: 3, xp: 1, desc: 'Serra um tronco em duas tábuas.' },
  { id: 'viga',   name: 'Viga',   icon: '📏', verb: 'Pregar a viga', input: { madeira: 3 }, output: { viga: 1 }, work: 5, xp: 2, desc: 'Prega três tábuas numa viga reforçada.' },
];
export const CARPENTRY = { name: 'Mesa de carpintaria', icon: '🪚' };
// Construções feitas com madeira (o jogo começa só com a casa). O material é entregue aos poucos no canteiro.
export const BUILDINGS = {
  celeiro: { name: 'Celeiro', icon: '🛖', cost: { madeira: 10, viga: 2 }, desc: 'Libera a venda da colheita, dos produtos e dos peixes.' },
  curral:  { name: 'Curral',  icon: '🐾', cost: { madeira: 14, viga: 4 }, desc: 'Libera a compra de animais e o cocho.' },
  galpao:  { name: 'Galpão das máquinas', icon: '🚜', cost: { madeira: 24, viga: 8 }, level: 12, desc: 'Garagem das máquinas do Campo de Trigo: é preciso para comprá-las.' },
  queijaria: { name: 'Queijaria', icon: '🧀', cost: { madeira: 20, viga: 6 }, level: 8, fem: true, desc: 'Transforma o leite das vacas em queijo, sozinha.' },
};

export const WATER_TIME = [40, 70, 110, 180];
export const GROW_SPEED = [1, 1.2, 1.45, 1.75];
export const PEN_SIZE = [4, 8, 12];

export const UPGRADES = {
  regador:  { name: 'Regador reforçado', icon: '🚿', costs: [150, 800, 2500], req: [1, 4, 8], effect: (l) => `Água dura ${WATER_TIME[l]}s` },
  adubo:    { name: 'Adubo orgânico',    icon: '🧪', costs: [500, 2000, 12000], req: [3, 7, 17], effect: (l) => `Crescimento +${Math.round((GROW_SPEED[l] - 1) * 100)}%` },
  curral:   { name: 'Curral maior',      icon: '🏡', costs: [1000, 4000],       req: [4, 10],    effect: (l) => `${PEN_SIZE[l]} vagas para animais` },
  alimentador: { name: 'Alimentador automático', icon: '⚙️', costs: [2000], req: [6], effect: (l) => (l ? 'Animais comem 🌾 do celeiro sozinhos' : 'Alimentação manual') },
  aspersor: { name: 'Aspersores',        icon: '⛲', costs: [8000],            req: [14],       effect: (l) => (l ? 'Rega tudo automaticamente' : 'Rega manual') },
};

// Funcionários: custo de contratação + salário cobrado no início de cada dia
export const WORKERS = {
  colhedor:  { name: 'Colhedor',  icon: '🧺', hire: 1500,  wage: 60, level: 6, desc: 'Colhe sozinho todas as plantas prontas.' },
  plantador: { name: 'Plantador', icon: '🌱', hire: 2000, wage: 80, level: 8, desc: 'Planta nos lotes arados vazios usando a semente selecionada (ou a que você tiver mais).' },
  tratador:  { name: 'Tratador',  icon: '🐾', hire: 2500, wage: 100, level: 10, desc: 'Coleta ovos, lã, leite e trufas dos animais.' },
};
export const WORK_TIME = 2.5; // segundos por tarefa quando o jogo é simulado (aba fechada, sono)

export const CUSTOMERS = [
  '👵 Dona Maria', '👨‍🍳 Chef Paulo', '🧑‍🌾 Seu João', '👧 Aninha',
  '🏪 Mercadinho da Vila', '🥐 Padaria Sol Nascente', '🍲 Restaurante Sabor', '👴 Vô Antônio',
];

// ================= Cadeias de produção =================
// Produtos novos (frutas, mel e o que sai das fábricas)
export const GOODS = {
  maca:     { name: 'Maçã',            icon: '🍎', sell: 30,  xp: 2 },
  laranja:  { name: 'Laranja',         icon: '🍊', sell: 45,  xp: 3 },
  manga:    { name: 'Manga',           icon: '🥭', sell: 70,  xp: 4 },
  mel:      { name: 'Mel',             icon: '🍯', sell: 120, xp: 6 },
  farinha:  { name: 'Farinha',         icon: '🥣', sell: 50,  xp: 3 },
  pao:      { name: 'Pão',             icon: '🍞', sell: 145, xp: 7 },
  torta:    { name: 'Torta de maçã',   icon: '🥧', sell: 220, xp: 11 },
  suco:     { name: 'Suco de laranja', icon: '🧃', sell: 200, xp: 10 },
  geleia:   { name: 'Geleia de manga', icon: '🫙', sell: 480, xp: 22 },
  bolo:     { name: 'Bolo',            icon: '🎂', sell: 600, xp: 28 },
  tecido:   { name: 'Tecido',          icon: '🧵', sell: 400, xp: 18 },
  roupa:    { name: 'Roupa',           icon: '👕', sell: 1150, xp: 50 },
  defumado: { name: 'Peixe defumado',  icon: '🍢', sell: 120, xp: 8 },
  acucar:   { name: 'Açúcar',          icon: '🍬', sell: 1000, xp: 45 },
  cafezinho:{ name: 'Café torrado',    icon: '🫖', sell: 800, xp: 36 },
  vinho:    { name: 'Suco de uva',     icon: '🍷', sell: 520, xp: 24 },
};
// Fábricas: obras de madeira que transformam produtos sozinhas (até com o jogo fechado).
// recipes[].in: o que gasta ('peixe' = qualquer peixe); out: o que faz; time: segundos por unidade
export const FACTORIES = {
  moinho:      { name: 'Moinho',      icon: '🌬️', level: 3, at: [20.6, 2.6],  size: [3.2, 3.2], cost: { madeira: 16, viga: 4 }, capacity: 12, desc: 'Mói o trigo em farinha e a cana em açúcar.',
    recipes: [
      { id: 'farinha', in: { trigo: 3 }, out: 'farinha', time: 25 },
      { id: 'acucar',  in: { cana: 3 },  out: 'acucar',  time: 70 },
    ] },
  padaria:     { name: 'Padaria',     icon: '🥖', level: 5, at: [20.6, 7.6],  size: [3.4, 2.8], cost: { madeira: 22, viga: 6 }, capacity: 10, fem: true, desc: 'Faz pão, tortas, sucos, geleias, bolos e torra café.',
    recipes: [
      { id: 'pao',    in: { farinha: 2 },                   out: 'pao',    time: 40 },
      { id: 'torta',  in: { farinha: 1, maca: 3 },          out: 'torta',  time: 60 },
      { id: 'suco',   in: { laranja: 3 },                   out: 'suco',   time: 45 },
      { id: 'geleia', in: { manga: 3, mel: 1 },             out: 'geleia', time: 75 },
      { id: 'bolo',   in: { farinha: 2, ovo: 2, leite: 1 }, out: 'bolo',   time: 90 },
      { id: 'vinho',  in: { uva: 3 },                       out: 'vinho',  time: 60 },
      { id: 'cafezinho', in: { cafe: 3 },                   out: 'cafezinho', time: 80 },
    ] },
  tear:        { name: 'Tear',        icon: '🧶', level: 7, at: [20.6, 12.3], size: [3.2, 2.6], cost: { madeira: 20, viga: 6 }, capacity: 8, desc: 'Tece lã ou algodão em tecido e costura roupas.',
    recipes: [
      { id: 'tecido', in: { la: 2 },     out: 'tecido', time: 60 },
      { id: 'tecido2', in: { algodao: 2 }, out: 'tecido', time: 70 },
      { id: 'roupa',  in: { tecido: 2 }, out: 'roupa',  time: 120 },
    ] },
  defumadouro: { name: 'Defumadouro', icon: '🔥', level: 4, at: [4.2, 6.7],   size: [2.4, 2.2], cost: { madeira: 12, viga: 3 }, capacity: 10, desc: 'Defuma os peixes do lago (2 peixes quaisquer → 1 defumado).',
    recipes: [{ id: 'defumado', in: { peixe: 2 }, out: 'defumado', time: 50 }] },
};
// As fábricas também são obras (entram na Oficina e nos canteiros)
for (const [id, f] of Object.entries(FACTORIES)) {
  BUILDINGS[id] = { name: f.name, icon: f.icon, cost: f.cost, level: f.level, fem: f.fem, desc: f.desc };
}

// Pomar: seis covas ao norte do Campo de Trigo. A muda cresce e depois dá frutas de tempos em tempos.
export const ORCHARD = { slots: 6, grow: 360, stock: 3 };
export const FRUIT_TREES = {
  maca:    { name: 'Macieira',   fruit: 'maca',    icon: '🍎', cost: 800,  level: 5, every: 120 },
  laranja: { name: 'Laranjeira', fruit: 'laranja', icon: '🍊', cost: 1200,  level: 7, every: 150 },
  manga:   { name: 'Mangueira',  fruit: 'manga',   icon: '🥭', cost: 2000, level: 11, every: 180 },
};
// Colmeias: fazem mel e as abelhas polinizam o pomar (frutas mais rápido)
export const HIVES = { name: 'Colmeia', icon: '🐝', cost: 1200, level: 6, max: 4, every: 150, stock: 3, boost: 0.3 };

// ================= Estações do ano =================
// Cada estação dura SEASON_DAYS dias de jogo. crops: culturas que crescem mais rápido nela.
// weather: multiplica a chance de cada evento climático; fruit: ritmo do pomar; growOff: culturas fora de época.
export const SEASON_DAYS = 7;
export const SEASONS = [
  { id: 'primavera', name: 'Primavera', icon: '🌸', crops: ['cenoura', 'morango', 'girassol', 'alface', 'cebola', 'feijao'], fruit: 1,   growOff: 1,
    weather: { chuva: 1.6, ventania: 0.8, neve: 0, calor: 0.6, tempestade: 1, arcoiris: 2.5, eclipse: 1 },
    tint: [1, 1, 1], leaf: null, desc: 'Chove mais e o arco-íris aparece com frequência.' },
  { id: 'verao', name: 'Verão', icon: '☀️', crops: ['trigo', 'tomate', 'milho', 'berinjela', 'girassol', 'pimentao', 'algodao', 'melancia', 'abacaxi'], fruit: 1.2, growOff: 1,
    weather: { chuva: 0.8, ventania: 0.7, neve: 0, calor: 3, tempestade: 1.6, arcoiris: 1, eclipse: 1 },
    tint: [1.06, 1.02, 0.82], leaf: null, desc: 'Sol escaldante e tempestades de raios são mais comuns.' },
  { id: 'outono', name: 'Outono', icon: '🍂', crops: ['trigo', 'cenoura', 'abobora', 'batata', 'cana', 'uva'], fruit: 1.3, growOff: 1,
    weather: { chuva: 1.3, ventania: 2.5, neve: 0.2, calor: 0.5, tempestade: 0.8, arcoiris: 0.8, eclipse: 1.5 },
    tint: [1.12, 0.92, 0.62], leaf: [0xd9822b, 0.65], desc: 'Folhas alaranjadas, ventanias e eclipses mais frequentes. O pomar rende mais.' },
  { id: 'inverno', name: 'Inverno', icon: '❄️', crops: ['cenoura', 'alface', 'cebola', 'cafe'], fruit: 0, growOff: 0.7,
    weather: { chuva: 0.6, ventania: 1, neve: 4, calor: 0, tempestade: 0.4, arcoiris: 0.5, eclipse: 1 },
    tint: [1.3, 1.36, 1.45], leaf: [0x8d7b6a, 0.7], desc: 'Neva bastante, o pomar descansa e as culturas fora de época crescem mais devagar.' },
];
export const SEASON_BONUS = 1.3; // culturas da estação crescem 30% mais rápido

// ================= Vila: encomendas especiais, amizade e feira =================
export const QUEST = { due: 540, cooldown: 120, mult: 2.4 };          // prazo de 3 dias; nova após 2/3 de dia
export const FRIEND = { perHeart: 5, hearts: 5, orderBonus: 0.05 };   // +5% nos pedidos por coração
export const FAIR = {
  cats: {
    lavoura: { name: 'Lavoura', icon: '🥕', desc: 'colheitas (gigantes e mutadas valem mais)' },
    animais: { name: 'Animais', icon: '🥚', desc: 'ovos, lã, leite, trufas e queijo' },
    cozinha: { name: 'Cozinha', icon: '🎂', desc: 'tudo o que sai das fábricas e do pomar' },
  },
  prizes: [3, 1.6, 0.8], // 🥇 🥈 🥉 (× nível × 300 moedas)
};

// ================= Decoração e espaço no celeiro =================
// r: raio que ocupa no chão (0 = dá para passar por cima); special: efeito no jogo
export const DECOR = {
  espantalho: { name: 'Espantalho',        icon: '👒', cost: 300,  r: 0.3,  level: 2, desc: 'Espanta os corvos das plantações num raio de 8 m.' },
  bau:        { name: 'Baú',               icon: '🧰', cost: 800,  r: 0.4,  level: 1, desc: '+100 de espaço no celeiro (cada baú colocado).' },
  canteiro:   { name: 'Canteiro de flores', icon: '🌷', cost: 120,  r: 0.45, level: 1, desc: 'Flores coloridas num canteiro de madeira.' },
  banco:      { name: 'Banco',             icon: '🪑', cost: 150,  r: 0.45, level: 1, desc: 'Um banco de praça para descansar.' },
  lampiao:    { name: 'Lampião',           icon: '🏮', cost: 250,  r: 0.2,  level: 2, desc: 'Acende sozinho à noite.' },
  placa:      { name: 'Placa da fazenda',  icon: '🪧', cost: 200,  r: 0.3,  level: 1, desc: 'Com o nome da sua fazenda.' },
  cerca:      { name: 'Cerquinha',         icon: '🚧', cost: 60,   r: 0.35, level: 1, desc: 'Um pedaço de cerca branca.' },
  arvore:     { name: 'Árvore',            icon: '🌳', cost: 200,  r: 0.45, level: 1, desc: 'Uma árvore frondosa.' },
  caminho:    { name: 'Pedras do caminho', icon: '🪨', cost: 40,   r: 0,    level: 1, desc: 'Pedras para fazer trilhas (dá para pisar).' },
  fonte:      { name: 'Fonte',             icon: '⛲', cost: 2500, r: 0.75, level: 4, desc: 'Uma fonte de pedra com água.' },
  estatua:    { name: 'Estátua de galo',   icon: '🐓', cost: 1500, r: 0.4,  level: 3, desc: 'Um galo dourado de enfeite.' },
};
export const STORAGE = { base: 500, chest: 100 }; // itens no celeiro (sem contar sementes)

// ================= Corvos e o faro do pet =================
// A cada round há chance de um corvo pousar numa planta crescendo; se ninguém espantar, ela volta ao começo.
export const CROWS = { every: 45, chance: 0.35, eat: 25, scare: 2.6, scarecrow: 8, level: 2 };
// O pet acha alguma coisa cavando, uma vez por dia
export const PET_FINDS = [
  { id: 'trufa', q: 1, w: 2 }, { id: 'tronco', q: 3, w: 4 }, { id: 'esterco', q: 2, w: 3 }, { id: 'fertilizante', q: 1, w: 2 },
  { coins: 120, w: 4 }, { seeds: 'milho', q: 3, w: 3 }, { id: 'bota', q: 1, w: 1 },
];
