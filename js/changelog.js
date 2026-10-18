/* FarmLife — histórico de versões (mostrado no jogo em "📜 Novidades" e copiado para o CHANGELOG.md).
   Ao publicar: adicione a versão nova no topo e use o mesmo número no version.json. */

export const CHANGELOG = [
  {
    version: '5.0.1', date: '2026-10-18', title: 'Sair de casa',
    items: [
      '🚪 Ficou fácil sair de casa: a porta tem a placa "Sair", dá para clicar ou tocar nela, e também é só andar pelo vão da porta.',
      '🏠 Corrigido: em alguns casos, ao sair de casa o personagem ficava parado no escuro em vez de voltar para a frente da casa.',
    ],
  },
  {
    version: '5.0.0', date: '2026-10-17', title: 'A vila do outro lado do rio',
    items: [
      '🌉 O mapa cresceu para o sul: um rio atravessa a fazenda e, do outro lado da ponte, fica a vila, com casinhas, praça com fonte, capela e feirinha.',
      '🏘️ Seis moradores passeiam pela vila de dia e vão para casa à noite. Converse com eles: a primeira conversa do dia com cada um dá +3 XP, e eles dão dicas e avisam quando é a próxima festa.',
      '🎣 Pesca no rio (até da ponte!), com peixes novos: pacu, truta e o raro dourado. Tilápia e carpa dourada continuam só no lago.',
      '🏠 Dá para entrar em casa: durma na cama, decore com móveis novos (tapete, poltrona, vaso, estante e abajur) e faça a reforma na Loja → Melhorias (casa com cozinha e casa grande, com despensa que aumenta o armazém).',
      '👕 Roupas: escolha a cor da camisa, da calça e do cabelo e o chapéu (palha, boné, gorro, lenço, coroa de flores ou nenhum) em Trocar personagem.',
      '👋 Gestos: acenar, sentar, dançar e comemorar (botão 👋 ao lado do zoom, ou Z, X e V). Parado por um tempo, o personagem senta; ao subir de nível, comemora.',
      '❤️ Animais felizes: faça carinho uma vez por dia e não deixe faltar comida. Felizes, produzem mais rápido e às vezes em dobro; tristes, ficam lentos.',
      '🪴 Estufa (nível 9): canteiros protegidos que crescem bem em qualquer estação, sem precisar regar e sem corvos.',
      '⛺ Barraca de beira de estrada (nível 4): deixe produtos à venda e os moradores compram sozinhos, 15% acima do mercado.',
      '💦 Aspersor (nível 5): rega sozinho os lotes em volta. Ao colocar aspersor e espantalho, aparece até onde eles alcançam.',
      '🥅 Rede de insetos e álbum de coleções (Armazém → Álbum): pegue borboletas, joaninhas e vaga-lumes, colecione culturas, gigantes, mutações e peixes, e ganhe prêmios ao completar cada página.',
      '🎊 Festas da vila no 4º dia de cada estação: Festa das Flores, Festa Junina (bandeirinhas e fogueira), Festa da Colheita e Natal na Fazenda, cada uma com bônus.',
      '🌊 O lago ganhou ondinhas, reflexo do céu, brilhos de dia e lua e estrelas refletidas à noite. À noite as janelas acendem e passa estrela cadente.',
      '🎵 A música muda com a estação (sininhos no inverno), e há sons do ambiente: passarinhos, grilos, coruja, vento e chuva (abafados dentro de casa).',
      '🔔 Aviso de colheita pronta (⚙️ Configurações): com o jogo aberto em outra aba ou minimizado, o navegador avisa quando a colheita ou os animais ficarem prontos.',
      '💾 Backup da fazenda (⚙️ Configurações): baixe um arquivo ou copie um código, e carregue em outro aparelho.',
      '📱 No celular, o topo e a barra de ferramentas voltaram a caber numa linha só. O Guia ganhou o tópico Casa e personagem e foi atualizado com tudo isso.',
    ],
  },
  {
    version: '4.8.0', date: '2026-10-17', title: 'Mudar as coisas de lugar',
    items: [
      '↔ Toda obra (curral, galinheiro, queijaria, fábricas, galpão) e toda compra grande (campos, serraria, Campo de Trigo e pasto) pode mudar de lugar quando você quiser, de graça: botão ↔ Mover na Oficina (Obras) e na Loja (Terras e Ferramentas). Animais, plantações e o que estiver dentro vão junto.',
      '📍 Escolher o lugar ficou mais calmo: o clique só marca o lugar, e você confirma com ✔ Colocar, com Enter ou clicando de novo dentro do retângulo. Clicar em outro ponto marca de novo.',
    ],
  },
  {
    version: '4.7.0', date: '2026-10-17', title: 'Visual pintado: grama e árvores vivas',
    items: [
      '🌾 No visual pintado, a grama livre da fazenda se enche de tufos de capim que balançam com o vento (bem mais forte na ventania). Eles saem do caminho quando você coloca uma obra ou campo.',
      '🌳 As copas das árvores e os arbustos ficaram mais fofos e irregulares, e árvores e pinheiros balançam devagar.',
      '📱 No celular a grama é menos densa, para não pesar. O visual Simples continua igual.',
    ],
  },
  {
    version: '4.6.0', date: '2026-10-17', title: 'Visual pintado (experimental)',
    items: [
      '⚙️ O botão de configurações (no canto de cima) agora tem uma engrenagem e uma opção nova: 🎨 Visual Simples ou Pintado ✨. Fica salva neste aparelho.',
      '✨ No visual pintado: luz em faixas suaves e formas arredondadas, gramado com manchas de cor como pinceladas, nuvens fofas passando com a sombra correndo pelo chão e um acabamento de pintura (cores quentes, vinheta, brilho suave nas luzes e grão de papel).',
      '📱 Ele é um pouco mais pesado: se o celular ficar lento, volte para o visual Simples.',
      '🍂 Corrigido: no outono, as folhas que caíam viravam caixas grandes por um instante quando sumiam no chão.',
    ],
  },
  {
    version: '4.5.0', date: '2026-10-17', title: 'Painéis organizados',
    items: [
      '🗂️ A Loja agora é dividida em categorias: 🌱 Sementes, 🐾 Animais, 🗺️ Terras, 🏭 Produção, 🪓 Ferramentas, 🛠️ Melhorias e 🌻 Decoração. A barra de categorias fica sempre visível no topo.',
      '📦 O Armazém (Itens, Mercado, Números), a Oficina (Carpintaria, Obras, Fábricas) e os Pedidos (Pedidos, Feira, Moradores) também ganharam categorias. Uma bolinha avisa quando há pedido pronto ou é dia de feira.',
      '🌱 Sementes em grade, bem mais compactas; as que ainda não liberaram aparecem numa linha só (Em breve).',
      '🔒 Itens bloqueados e obras prontas ocupam uma linha só, e os textos dos cartões ficaram mais curtos.',
      '📱 No celular, as categorias ficam numa linha que rola para o lado.',
    ],
  },
  {
    version: '4.4.0', date: '2026-10-17', title: 'Fazenda maior e do seu jeito',
    items: [
      '🗺️ O mapa ficou bem maior e mais organizado: a sede (casa, carpintaria, armazém, pedidos e loja) fica em fila na rua principal, e em volta há muito mais espaço, com uma rua entre os campos e uma estrada ao sul.',
      '📍 Você escolhe onde fica cada obra nova (curral, galinheiro, queijaria, fábricas e galpão) e cada compra grande (campos, serraria, Campo de Trigo e pasto): o retângulo fica verde onde cabe. Um caminho de terra liga a porta até a rua mais próxima.',
      '🏬 O Celeiro agora se chama Armazém, que é o que ele é: onde a colheita fica guardada e é vendida.',
      '🌾 Os campos comprados ganharam nomes novos (Campo da Colina, Campo Comprido e Campo do Vale), já que agora eles ficam onde você quiser.',
      '🌲 O bosque foi para o oeste da fazenda e o pomar para trás da sede.',
      '🏡 Quem já jogava: o que você tinha construído ou comprado foi para um lugar padrão no mapa novo, as decorações voltaram para a Loja (seção Decoração) e as máquinas e o cavalo voltaram para casa.',
    ],
  },
  {
    version: '4.3.0', date: '2026-10-17', title: 'Galinheiro e estações mais bonitas',
    items: [
      '🐔 Galinheiro novo, ao lado do lago: uma obra de madeira (12 🟫 tábuas e 3 📏 vigas, nível 2) com casinha, rampa, ninhos, comedouro e um cercado próprio.',
      '🐣 As galinhas, os galos e os pintinhos moram lá (até 12 aves), e não ocupam mais vaga no curral. Para comprar galinhas, construa o galinheiro primeiro.',
      '🥚 Chegue perto da casinha e use a ação: você coleta todos os ovos de uma vez ou alimenta todas as galinhas com fome. Os ovos prontos aparecem na cesta da porta.',
      '🏡 Quem já tinha galinhas no curral: elas se mudam sozinhas assim que o galinheiro fica pronto.',
      '🍂 No outono cada árvore ganha a sua cor (amarelo, laranja ou vermelho) e as folhas caem balançando ao vento perto de você.',
      '🌸 Na primavera as árvores se enchem de florzinhas rosas e brancas.',
      '❄️ Quando neva, a neve vai se acumulando no topo das árvores e nos telhados das casas, e derrete devagar depois que a nevasca passa.',
    ],
  },
  {
    version: '4.2.1', date: '2026-10-17', title: 'Barra de cima fixa',
    items: [
      '📱 No celular e em telas menores, a barra de cima agora tem duas linhas fixas: moedas, nível e hora em cima; Loja, Celeiro, Pedidos, Oficina e os botões redondos embaixo. Os botões não mudam mais de lugar quando as moedas crescem, o dia muda ou um evento aparece.',
    ],
  },
  {
    version: '4.2.0', date: '2026-10-17', title: 'Progressão rebalanceada',
    items: [
      '⭐ A jornada ficou mais longa: agora são 18 níveis, e cada um pede um pouco mais de XP que o anterior. Cada nível novo libera algo.',
      '🌱 Culturas mais caras dão mais lucro por minuto. A XP por minuto também cresce, mas devagar. As que rebrotam (tomate, morango, pimentão, uva, café) rendem bem sem dominar as outras.',
      '🏭 Todas as receitas das fábricas agora lucram: tecido de algodão usa 2 algodões, e geleia, café torrado, açúcar e roupas valem mais.',
      '🐄 Animais, campos, máquinas, funcionários, melhorias e obras foram espalhados pelos níveis, com preços revistos.',
      '🔔 O aviso de nível novo agora mostra tudo o que foi liberado: obras, mudas, colmeias, pasto, máquinas, ferramentas, pet e cavalo.',
      '🏆 Conquista nova: chegar ao nível 10. A de nível máximo agora vai até o nível 18.',
      '🕹️ No celular, o joystick ficou mais preciso: a velocidade sobe aos poucos conforme você empurra, e a máxima é menor (a pé e a cavalo).',
    ],
  },
  {
    version: '4.1.0', date: '2026-10-17', title: 'Mais plantas',
    items: [
      '🌱 11 culturas novas: 🥬 alface, 🥔 batata, 🧅 cebola, 🫑 pimentão (rebrota), 🫘 feijão, ☁️ algodão, 🎋 cana, 🍉 melancia, 🍇 uva (rebrota), ☕ café (rebrota) e 🍍 abacaxi.',
      '🍂 Cada uma tem a sua estação: alface e cebola até no inverno, café no inverno, melancia e abacaxi no verão, batata, cana e uva no outono.',
      '🏭 Receitas novas: açúcar de cana no moinho, tecido de algodão no tear, suco de uva e café torrado na padaria.',
      '🐾 Corrigido: a placa da obra do curral continuava bloqueando o portão depois da construção. Agora ela fica ao lado do portão.',
    ],
  },
  {
    version: '4.0.0', date: '2026-10-17', title: 'A fazenda cresceu',
    items: [
      '🏭 Fábricas de madeira: 🌬️ moinho (farinha), 🥖 padaria (pão, torta, suco, geleia e bolo), 🧶 tear (tecido e roupas) e 🔥 defumadouro (peixe defumado). Escolha as receitas na Oficina.',
      '🌳 Pomar com mudas de macieira, laranjeira e mangueira, e 🐝 colmeias que fazem mel e aceleram as frutas.',
      '🍂 Estações do ano: primavera, verão, outono e inverno, com culturas da estação mais rápidas, clima diferente e cores novas no mapa.',
      '📜 Encomendas especiais da vila, ❤️ amizade com os moradores (presentes e pedidos mais caros) e 🎪 feira com medalhas no fim de cada estação.',
      '🏆 24 conquistas com prêmios, num tópico novo do Guia.',
      '🌻 Decoração: espantalho, baús, flores, bancos, lampiões, fonte, estátua e mais, colocados onde você quiser.',
      '📦 O celeiro agora tem limite de espaço (500 itens); cada baú colocado dá +100.',
      '🐦‍⬛ Corvos que bicam as plantas: espante chegando perto, com o pet ou com espantalhos. O pet também cava e acha coisas todo dia.',
      '🗺️ Mapa da fazenda com viagem rápida (tecla M) e 📷 modo foto para salvar imagens (tecla P).',
    ],
  },
  {
    version: '3.8.0', date: '2026-10-17', title: 'Queijaria',
    items: [
      '🧀 Queijaria (nível 5), construída com madeira no canteiro entre a loja e o galpão: transforma 2 🥛 leites em 1 queijo a cada 1 min e meio, até com o jogo fechado.',
      '💰 O queijo vale 🪙560, bem mais que os dois leites, e aparece nos pedidos da vila.',
      '🥛 Os latões de leite e os queijos prontos aparecem na queijaria conforme ela trabalha.',
    ],
  },
  {
    version: '3.7.0', date: '2026-10-17', title: 'Joystick do seu lado',
    items: [
      '🕹️ No celular, escolha de que lado fica o joystick de andar: agora ele começa à direita.',
      '🎥 O outro lado da tela gira a câmera, e o botão ✋ muda de lado junto para não atrapalhar o polegar.',
      '⚙️ A escolha aparece na criação do personagem e pode ser trocada a qualquer momento no menu 🔊.',
    ],
  },
  {
    version: '3.6.0', date: '2026-10-17', title: 'Famílias no curral e pasto',
    items: [
      '🎨 Os animais agora têm cores diferentes: galinhas brancas, marrons, pretas e carijós, ovelhas cinzas e pretas, vacas malhadas e marrons, porcos malhados e caramelo.',
      '♀♂ Na loja você escolhe fêmea ou macho. Galo, carneiro, touro e cachaço têm visual próprio (rabo, chifres, presas).',
      '🐣 Com macho e fêmea da mesma espécie, cada produção dela tem 3% de chance de nascer um filhote, que cresce e vira adulto em 5 dias de jogo.',
      '🌿 Pasto à venda (nível 5): um campo enorme a leste do Campo de Trigo com 30 vagas só para o gado, que come capim e não precisa de trigo.',
      '🥚 Só as fêmeas adultas produzem e comem; machos e filhotes ganham carinho. Animais antigos viraram fêmeas.',
    ],
  },
  {
    version: '3.5.0', date: '2026-10-17', title: 'Esterco e fertilizante',
    items: [
      '💩 As vacas fazem cocô pelo curral: recolha o esterco com a ação ou tocando nele.',
      '♻️ Composteira ao lado do curral: cada esterco vira um 🧪 fertilizante em 30s, até com o jogo fechado.',
      '🧪 Nova ferramenta Adubar: use o fertilizante numa planta crescendo para ter 60% de chance de ela ficar 💪 gigante.',
      '💪 Plantas gigantes crescem bem maiores e valem o dobro; o bônus soma com as mutações do clima.',
    ],
  },
  {
    version: '3.4.0', date: '2026-10-17', title: 'Música e volumes',
    items: [
      '🎵 Música de fundo tocada na hora pelo próprio jogo: acordes suaves, baixo e uma melodia que vai mudando.',
      '🌙 À noite a música fica mais lenta e calma; de dia volta a ficar animada.',
      '🔊 O botão de som agora abre um menu com volume geral, da música e dos efeitos, além de silenciar tudo. As escolhas ficam salvas.',
    ],
  },
  {
    version: '3.3.0', date: '2026-10-17', title: 'Seu personagem',
    items: [
      '👩‍🌾 No primeiro jogo, escolha entre fazendeiro e fazendeira, com prévia 3D, e diga o seu nome.',
      '🌻 O jogo chama você pelo nome: no tutorial, nas boas-vindas e no topo da tela (Fazenda do/da ...).',
      '🚜 O motorista das máquinas é o seu personagem.',
      '👤 Dá para trocar o personagem e o nome a qualquer momento no ❓ Guia, em Primeiros passos.',
    ],
  },
  {
    version: '3.2.0', date: '2026-10-17', title: 'Cavalo',
    items: [
      '🐴 Cavalo na loja (nível 3, precisa do curral): ele pasta perto do portão do curral.',
      '🏇 Compre a sela e monte no cavalo: ande 1,75× mais rápido e galope com Shift (ou com o joystick na borda).',
      '🐎 Cavalo animado com trote, galope, cauda balançando e pausas para pastar; o fazendeiro monta na sela.',
      '📖 Novo tópico "Cavalo" no Guia e dicas na hora da compra.',
    ],
  },
  {
    version: '3.1.0', date: '2026-10-17', title: 'Câmera giratória e seletor de sementes',
    items: [
      '🎥 Gire a câmera em volta do fazendeiro: no PC, arraste com o botão direito do mouse (ou use Q e R); no celular, arraste na metade direita da tela ou com um segundo dedo.',
      '🕹️ O joystick do celular fica na metade esquerda da tela. Toques rápidos continuam funcionando em qualquer lugar.',
      '🧭 Novo botão (e a tecla C) para voltar a câmera à vista padrão. Andar e dirigir seguem a direção da câmera.',
      '🌱 Todas as sementes agora ficam num único botão da barra, com um seletor para trocar: a barra não estoura mais com muitas culturas.',
      '🔄 Todas as fazendas foram reiniciadas para todo mundo começar do zero com a nova progressão de construções.',
    ],
  },
  {
    version: '3.0.0', date: '2026-10-17', title: 'Construa a sua fazenda',
    items: [
      '🏠 Nova progressão: o jogo começa só com o terreno, a casa e todas as ferramentas (🪓 machado e 🎣 vara inclusos).',
      '🪚 Mesa de carpintaria entre a casa e o celeiro: serre 🪵 troncos em 🟫 tábuas e pregue tábuas em 📏 vigas, na mão (segure a ação ou toque na mesa).',
      '🏗️ O 🛖 Celeiro, o 🐾 Curral e o 🚜 Galpão agora são construídos com madeira: entregue o material no canteiro e veja a obra subir.',
      '🛖 Vender exige o celeiro, 🐾 animais exigem o curral e 🚜 máquinas exigem o galpão. Enquanto isso, os pedidos da vila pagam as contas.',
      '🪚 Nova aba Oficina: escolha a receita da mesa e acompanhe o que falta para cada obra.',
      '🔦 À noite o fazendeiro acende uma lanterna, e as máquinas ligam os faróis quando você dirige.',
      '🎓 Tutorial novo com os passos de cortar, serrar e construir o celeiro. Fazendas antigas mantêm todas as construções.',
      '✉️ Uma cartinha aparece sobre o quadro de Pedidos quando chega pedido novo ou dá para entregar algum, e os pedidos novos ganham o selo "Novo".',
    ],
  },
  {
    version: '2.8.0', date: '2026-10-17', title: 'Lenha e serraria',
    items: [
      '🌲 Bosque com 12 árvores no oeste do mapa, entre o curral e o Campo do Sul.',
      '🪓 Machado e machado de aço na loja: corte as árvores para ganhar 🪵 troncos.',
      '🌳 A árvore balança a cada golpe, cai para longe de você, vira toco e cresce de novo em 5 minutos.',
      '🪚 Serraria na entrada do bosque: transforma cada tronco em 2 tábuas de madeira 🟫, até com o jogo fechado.',
      '🪵 Troncos e tábuas são vendidos no Celeiro e aparecem nos pedidos da vila.',
      '🌈 Correção: o arco-íris agora fica parado no lugar onde aparece, em vez de acompanhar o personagem.',
    ],
  },
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
