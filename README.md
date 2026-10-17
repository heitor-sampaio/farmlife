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
| Andar | `W` `A` `S` `D` ou setas (`Shift` corre) | Arrastar o dedo (joystick; mais longe = mais rápido) |
| Usar ferramenta no lote à frente | `Espaço` ou `E` (segure e ande para repetir) | Botão ✋ (segure e ande para repetir) |
| Ir até um lote e agir | Clique no lote (arraste para enfileirar vários) | Tocar no lote |
| Escolher ferramenta/semente | `1`–`9` | Barra inferior |
| Zoom | Roda do mouse ou `+` / `-` | Botões ＋ / － |
| Fechar painel | `Esc` | ✕ |

## Mecânicas

- **Lavoura**: are a grama, plante, regue e colha. Sem água, nada cresce.
- **Construções**: Celeiro (vender), Loja (sementes, animais, melhorias), quadro de Pedidos e Casa (dormir à noite).
- **Curral**: os animais andam livres, comem 🌾 trigo e produzem ovos, lã, leite e trufas. O cocho alimenta todos de uma vez, e o Alimentador automático (melhoria da loja) faz isso sozinho usando o trigo do celeiro.
- **Funcionários**: Colhedor, Plantador e Tratador andam pela fazenda e trabalham sozinhos (também enquanto você está fora). Cobram salário no início de cada dia; sem dinheiro, pedem demissão.
- **Tempo**: dia de 3 minutos com sol que muda as sombras, noite com lampiões e dias de chuva.
- **Expansão**: no campo principal, compre lotes vizinhos um a um; na loja, compre campos inteiros novos (Leste, Sul e Lago, com 24 a 32 lotes cada), marcados no mapa com placas de venda.
- **Pescaria**: com uma vara (bambu ou fibra) você pesca no lago: lance, espere a mordida (❗) e segure a ação no minigame para manter o peixe na faixa verde. Seis tipos de pesca, com bagres à noite, lagostins na chuva e uma rara carpa dourada.
- **Lavoura mecanizada**: um Campo de Trigo de 384 lotes trabalhado com máquinas que você dirige (trator com arado de 3 faixas, trator com plantadeira de 4 e colheitadeira de 5), guardadas num galpão. Entre e saia com `Espaço`/`E` ou ✋; dirija com `WASD` ou o joystick.
- **Progresso**: níveis desbloqueiam culturas, animais, melhorias, campos e máquinas.
- **Salvamento**: automático no `localStorage`, com até 8h de progresso enquanto você está fora.

## Estrutura

- `index.html`: página, HUD e modal de ajuda
- `css/style.css`: interface sobre a cena 3D
- `js/data.js`: balanceamento (culturas, animais, melhorias)
- `js/core.js`: regras do jogo e salvamento (sem dependência de renderização)
- `js/ui.js`: HUD, hotbar, painel da loja/celeiro/pedidos e avisos
- `js/audio.js`: efeitos sonoros sintetizados
- `js/world/models.js`: modelos 3D (plantas, fazendeiro, animais, construções, natureza)
- `js/world/nav.js`: grade de colisão e rotas (A*)
- `js/world/world.js`: cena, câmera, luz, personagem, animais e interações
- `js/main.js`: inicialização e loop principal
