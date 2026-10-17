# 🌻 FarmLife 3D

Simulador de fazenda 3D para navegador, com visão isométrica e um fazendeiro que anda pela fazenda.
Feito com JavaScript puro e [Three.js](https://threejs.org/) (carregado de CDN). Todos os modelos são low-poly, montados em código.

**▶️ Jogue online: https://heitor-sampaio.github.io/farmlife/**

## Como jogar

O jogo usa módulos JavaScript, então precisa de um servidor local (abrir o `index.html` direto não funciona):

```bash
node serve.js
```

Depois acesse http://localhost:5173. Na primeira vez, precisa de internet para baixar o Three.js.

## Controles

| Ação | Teclado / mouse | Celular |
|---|---|---|
| Andar | `W` `A` `S` `D` ou setas (`Shift` corre) | Arrastar o dedo no lado do joystick (direita por padrão; troca no menu 🔊) |
| Usar ferramenta no lote à frente | `Espaço` ou `E` (segure e ande para repetir) | Botão ✋ (segure e ande para repetir) |
| Ir até um lote e agir | Clique no lote (arraste para enfileirar vários) | Tocar no lote |
| Escolher ferramenta | `1`–`5` | Barra inferior |
| Escolher semente | `6` (de novo troca de semente) ou a ▲ do botão de sementes | Botão de sementes (toque de novo para ver todas) |
| Zoom | Roda do mouse ou `+` / `-` | Botões ＋ / － |
| Girar a câmera | Botão direito + arrastar, ou `Q` / `R` (`C` ou 🧭 volta ao normal) | Arrastar no outro lado da tela (ou com um 2º dedo); 🧭 volta ao normal |
| Som, música e controles | Botão 🔊: volume geral, música e efeitos | Botão 🔊 (também o lado do joystick) |
| Fechar painel | `Esc` | ✕ |

## Tutorial e Guia

- **Tutorial interativo** (jogos novos): 8 passos (andar, plantar, regar, arar, colher, vender, comprar e pedidos) com seta 3D no alvo, indicador na borda da tela, ferramenta destacada na barra e recompensa em moedas. Os textos se adaptam a teclado/mouse ou toque, e dá para pular.
- **Dicas na hora certa**: ao liberar ou comprar algo novo (animais, pet, vara, campos, máquinas, funcionários) e na primeira noite, chuva ou pedido pronto.
- **Guia da Fazenda (❓)**: 11 tópicos com tabelas geradas dos dados do jogo (preços, tempos, níveis) e o botão para refazer o tutorial.

## Mecânicas

- **Personagem**: na primeira vez, escolha entre fazendeiro e fazendeira (com prévia 3D) e o seu nome. Dá para trocar depois pelo Guia.
- **Lavoura**: are a grama, plante, regue e colha. Sem água, nada cresce.
- **Construções**: o jogo começa só com a Casa (dormir à noite), a Loja, o quadro de Pedidos e todas as ferramentas. O Celeiro (libera a venda), o Curral (libera os animais) e o Galpão (libera as máquinas) são construídos com madeira, entregue aos poucos no canteiro de cada obra.
- **Lenha e carpintaria**: corte as árvores do bosque com o machado para ganhar troncos; na mesa de carpintaria, serre troncos em tábuas e pregue tábuas em vigas, na mão. A Serraria (nível 3) serra tábuas sozinha, até com o jogo fechado.
- **Curral**: os animais andam livres, comem 🌾 trigo e produzem ovos, lã, leite e trufas. O cocho alimenta todos de uma vez, e o Alimentador automático (melhoria da loja) faz isso sozinho usando o trigo do celeiro.
- **Funcionários**: Colhedor, Plantador e Tratador andam pela fazenda e trabalham sozinhos (também enquanto você está fora). Cobram salário no início de cada dia; sem dinheiro, pedem demissão.
- **Tempo**: dia de 3 minutos com sol que muda as sombras, noite com lampiões, lanterna do fazendeiro e faróis nas máquinas, e dias de chuva.
- **Expansão**: no campo principal, compre lotes vizinhos um a um; na loja, compre campos inteiros novos (Leste, Sul e Lago, com 24 a 32 lotes cada), marcados no mapa com placas de venda.
- **Pescaria**: com uma vara (bambu ou fibra) você pesca no lago: lance, espere a mordida (❗) e segure a ação no minigame para manter o peixe na faixa verde. Seis tipos de pesca, com bagres à noite, lagostins na chuva e uma rara carpa dourada.
- **Clima e mutações**: eventos climáticos (chuva, ventania, neve, sol escaldante, tempestade de raios, arco-íris e eclipse) dão mutações às plantas que estão crescendo. As mutações se acumulam até a planta amadurecer, vão para o item colhido e aumentam o preço de venda conforme a raridade (cada uma soma o seu bônus, de ×1,5 a ×20). Vale também para o Campo de Trigo e para os funcionários.
- **Cavalo**: no nível 3, com o curral construído, compre um cavalo que pasta perto do portão do curral. Com a sela, monte e cavalgue 1,75× mais rápido (galope com Shift ou com o joystick na borda); use a ação para descer.
- **Famílias no curral**: cada animal tem uma cor sorteada e você escolhe fêmea ou macho. Só as fêmeas produzem; com um macho adulto da mesma espécie, cada produção tem 3% de chance de nascer um filhote, que vira adulto em 5 dias de jogo.
- **Queijaria**: obra de madeira (nível 5) que transforma o leite das vacas em queijo (2 leites → 1 queijo, que vale bem mais), sozinha, até com o jogo fechado.
- **Fábricas e pomar**: moinho, padaria, tear e defumadouro (obras de madeira) transformam os produtos sozinhos; o pomar dá frutas e as colmeias, mel.
- **Estações do ano**: quatro estações de 7 dias, com culturas da estação mais rápidas, clima e cores próprios.
- **Vila**: encomendas especiais com prazo, amizade com os moradores (presentes e bônus) e feira com medalhas no fim de cada estação.
- **Conquistas**: 24 objetivos com prêmios em moedas.
- **Decoração e celeiro**: decorações colocadas livremente; o celeiro tem limite de espaço e os baús aumentam.
- **Corvos e pet**: corvos bicam as plantas se ninguém espantar; espantalhos protegem e o pet corre atrás deles e cava achados todo dia.
- **Mapa e foto**: mapa com viagem rápida (M) e modo foto (P).
- **Pasto**: campo grande a leste do Campo de Trigo, com 30 vagas só para o gado (vacas, touros e bezerros), que come capim e não precisa de trigo.
- **Esterco e fertilizante**: as vacas fazem cocô no curral; recolha o esterco e leve à composteira, que o transforma em fertilizante. Com a ferramenta Adubar, uma planta crescendo tem 60% de chance de ficar gigante (maior e vale o dobro).
- **Pet**: uma border collie (nível 2) que segue o jogador, senta quando ele para, corre atrás dos passarinhos e ganha carinho (+10 XP por dia). Dá para trocar o nome.
- **Fauna de cenário**: sapos na beira do lago (pulam na água se você chega perto), passarinhos que bicam o chão e voam quando alguém se aproxima, bandos no céu, joaninhas, borboletas de dia, coelhos, patos no lago e vaga-lumes à noite.
- **Lavoura mecanizada**: um Campo de Trigo de 384 lotes trabalhado com máquinas que você dirige (trator com arado de 3 faixas, trator com plantadeira de 4 e colheitadeira de 5), guardadas num galpão. Entre e saia com `Espaço`/`E` ou ✋; dirija com `WASD` ou o joystick.
- **Progresso**: níveis desbloqueiam culturas, animais, melhorias, campos e máquinas.
- **Salvamento**: automático no `localStorage`, com até 8h de progresso enquanto você está fora.

## Versões e atualizações

- O histórico completo está em [CHANGELOG.md](CHANGELOG.md) e, dentro do jogo, no ❓ Guia em **📜 Novidades**.
- O jogo confere o `version.json` do site a cada 5 minutos (e quando o jogador volta para a aba). Se houver uma versão mais nova, aparece uma faixa com **Atualizar agora**: o jogo salva, baixa de novo os arquivos sem cache e recarrega.
- Depois de atualizar, quem já jogava vê as novidades desde a última versão que abriu.

**Para publicar uma versão nova:**

1. Adicione a versão no topo de `js/changelog.js` (número, data, título e itens).
2. Gere o `CHANGELOG.md` e o `version.json`: `node tools/gerar-versao.mjs`
3. Faça o commit e o push. Em cerca de um minuto o GitHub Pages publica, e os jogadores com o jogo aberto recebem o aviso.

## Estrutura

- `index.html`: página, HUD, tutorial e Guia
- `css/style.css`: interface sobre a cena 3D
- `js/data.js`: balanceamento (culturas, animais, melhorias)
- `js/core.js`: regras do jogo e salvamento (sem dependência de renderização)
- `js/ui.js`: HUD, hotbar, painel da loja/celeiro/pedidos e avisos
- `js/audio.js`: efeitos sonoros sintetizados
- `js/world/models.js`: modelos 3D (plantas, fazendeiro, animais, construções, natureza)
- `js/world/nav.js`: grade de colisão e rotas (A*)
- `js/world/world.js`: cena, câmera, luz, personagem, animais e interações
- `js/main.js`: inicialização e loop principal
- `js/tutorial.js`: tutorial, dicas e Guia da Fazenda
- `js/changelog.js`: histórico de versões (fonte do CHANGELOG.md e do version.json)
- `js/updates.js`: aviso de versão nova e novidades
- `js/world/critters.js`: pet e fauna
- `tools/gerar-versao.mjs`: gera CHANGELOG.md e version.json
