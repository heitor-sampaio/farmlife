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
| Andar | `W` `A` `S` `D` ou setas (`Shift` corre) | Tocar no chão |
| Usar ferramenta no lote à frente | `Espaço` ou `E` (segure e ande para repetir) | Botão ✋ |
| Ir até um lote e agir | Clique no lote (arraste para enfileirar vários) | Tocar no lote |
| Escolher ferramenta/semente | `1`–`9` | Barra inferior |
| Zoom | Roda do mouse ou `+` / `-` | Botões ＋ / － |
| Fechar painel | `Esc` | ✕ |

## Mecânicas

- **Lavoura**: are a grama, plante, regue e colha. Sem água, nada cresce.
- **Construções**: Celeiro (vender), Loja (sementes, animais, melhorias), quadro de Pedidos e Casa (dormir à noite).
- **Curral**: os animais andam livres, comem 🌾 trigo e produzem ovos, lã, leite e trufas. O cocho alimenta todos de uma vez.
- **Tempo**: dia de 3 minutos com sol que muda as sombras, noite com lampiões e dias de chuva.
- **Progresso**: níveis desbloqueiam culturas, animais e melhorias; terrenos vizinhos podem ser comprados.
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
