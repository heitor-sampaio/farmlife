/* FarmLife — histórico de versões (mostrado no jogo em "📜 Novidades" e copiado para o CHANGELOG.md).
   Ao publicar: adicione a versão nova no topo e use o mesmo número no version.json. */

export const CHANGELOG = [
  {
    version: '2.6.0', date: '2026-10-17', title: 'Clima e mutações',
    items: [
      '🌩️ Eventos climáticos raros: chuva, ventania, neve, sol escaldante, tempestade de raios, arco-íris e eclipse, cada um com seu visual.',
      '🧬 Mutações: plantas crescendo durante um evento ganham a mutação dele (💧 ❄️ 🍃 🔥 ⚡ 🌈 🌑), acumulam até amadurecer e passam para o item colhido.',
      '💰 Itens mutados valem mais: cada mutação soma seu bônus (de ×1,5 a ×20) e aparecem separados no Celeiro.',
      '⚡ Na tempestade, raios caem em plantas específicas; na neve o chão fica branco; no eclipse o dia vira noite.',
      '✨ Plantas mutadas brilham com a cor da mutação mais rara.',
      '🌧️ A chuva agora é um evento passageiro, não o dia inteiro. No sol escaldante a água evapora mais rápido.',
      '📜 Novidades no Guia e aviso para recarregar quando o jogo for atualizado.',
    ],
  },
  {
    version: '2.5.0', date: '2026-10-17', title: 'Tutorial, pet e fauna',
    items: [
      '🎓 Tutorial interativo de 8 passos para jogos novos, com seta 3D no alvo, ferramenta destacada e recompensas.',
      '💡 Dicas na hora certa ao liberar ou comprar algo novo, e na primeira noite, chuva ou pedido pronto.',
      '📖 Guia da Fazenda (❓) com tópicos e tabelas geradas dos dados do jogo.',
      '🐶 Pet: uma border collie que segue você, senta, corre atrás dos passarinhos e ganha carinho (+10 XP por dia).',
      '🐸 Fauna: sapos, passarinhos, bandos no céu, joaninhas, borboletas, coelhos, patos e vaga-lumes.',
    ],
  },
  {
    version: '2.4.0', date: '2026-10-17', title: 'Pescaria',
    items: [
      '🎣 Varas de bambu e de fibra na loja; pesque no lago com Espaço/✋ ou clicando na água.',
      '🐟 Minigame de puxar: segure a ação para manter o peixe na faixa verde.',
      '🐠 Seis tipos de pesca, com bagres à noite, lagostins na chuva e a rara carpa dourada.',
    ],
  },
  {
    version: '2.3.0', date: '2026-10-17', title: 'Lavoura mecanizada',
    items: [
      '🌾 Campo de Trigo gigante (384 lotes) que cresce sem rega.',
      '🚜 Máquinas que você dirige: trator com arado, trator com plantadeira e colheitadeira, guardadas num galpão.',
      '🛒 Saco com 50 sementes de trigo na loja.',
    ],
  },
  {
    version: '2.2.0', date: '2026-10-16', title: 'Campos novos',
    items: [
      '🗺️ Campos do Leste, do Sul e do Lago, comprados inteiros na loja e marcados com placas no mapa.',
      '🌍 Mapa maior, com caminhos ligando os campos.',
    ],
  },
  {
    version: '2.1.0', date: '2026-10-16', title: 'Ajudantes e celular',
    items: [
      '⚙️ Alimentador automático: os animais comem o trigo do celeiro sozinhos.',
      '👷 Funcionários (colhedor, plantador e tratador) que andam pela fazenda e trabalham até offline, com salário diário.',
      '📱 Joystick virtual no celular e botão ✋ que repete a ação ao ser segurado.',
    ],
  },
  {
    version: '2.0.0', date: '2026-10-16', title: 'FarmLife 3D',
    items: [
      '🧊 O jogo virou 3D, com visão isométrica, sol que move as sombras e noite com lampiões.',
      '🧑‍🌾 Um fazendeiro que você controla com o teclado ou clicando, com rotas automáticas desviando dos obstáculos.',
      '🏡 Celeiro, loja, quadro de pedidos, casa (dormir à noite), curral com animais andando e lago.',
      '🌐 Publicado no GitHub Pages para qualquer pessoa jogar.',
    ],
  },
  {
    version: '1.0.0', date: '2026-10-16', title: 'Primeira versão',
    items: [
      '🌱 Fazenda 2D: arar, plantar, regar e colher oito culturas.',
      '🛖 Celeiro com preços que mudam todo dia, pedidos da vila e loja.',
      '🐔 Animais, melhorias, expansão de terreno, ciclo dia/noite, chuva e salvamento automático.',
    ],
  },
];

export const VERSION = CHANGELOG[0].version;

/** Compara versões "a.b.c": negativo se a < b. */
export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let k = 0; k < 3; k++) {
    const d = (pa[k] || 0) - (pb[k] || 0);
    if (d) return d;
  }
  return 0;
}
