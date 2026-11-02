# Roadmap

Um quadro branco que mistura **Excalidraw** (desenho livre, visual de esboço) com **draw.io** (diagramas estruturados, formas conectadas, fluxogramas).

Marque os itens com `[x]` conforme forem concluídos.

## Estado atual

- Rota `/board` com um canvas em tela cheia (resolução ajustada para telas HiDPI).
- Ferramenta única: desenhar retângulos arrastando o mouse, com traço de esboço do `roughjs`.
- Câmera com pan (roda do mouse, Shift + roda, botão do meio ou Espaço + arrastar) e zoom (Ctrl/Cmd + roda ou pinça no trackpad, centrado no cursor).
- Estado em uma store do zustand, sem persistência.
- Dependências instaladas mas ainda não usadas: `react-color`, `react-icons`.

## Decisões tomadas

- Visual de esboço com `roughjs` é o padrão desde a etapa 1. Cada elemento guarda um `seed` para o traço não mudar a cada redesenho. O traço limpo é `roughness: 0` no estilo do elemento.

## 1. Fundação

Fazer antes de qualquer ferramenta nova, porque o resto depende disso.

- [x] **Modelo de elementos:** um tipo único com o campo `type` e uma base comum `id, x, y, width, height, rotation, style, seed` (`src/lib/elements/types.ts`). Por enquanto a união só tem `rectangle`. As outras formas entram na etapa 2.
- [x] **Store no zustand** com elementos, ids selecionados, ferramenta ativa e viewport (`src/store/boardStore.ts`).
- [x] **Viewport com pan e zoom**, convertendo entre coordenadas da tela e do mundo (`src/lib/viewport.ts`).
- [x] **Renderização com roughjs** (`src/lib/render/renderScene.ts`).

## 2. Ferramentas e edição básica

- [ ] Toolbar com `react-icons` e o `Divider` (`src/ui/Divider`).
- [ ] Ferramentas: seleção, retângulo, elipse, losango, seta, lápis (desenho livre) e texto.
- [ ] Detecção de clique sobre as formas (hit testing).
- [ ] Seleção por clique e por caixa.
- [ ] Mover, redimensionar pelas alças e apagar.
- [ ] Desfazer/refazer (undo/redo). Começar com uma pilha de snapshots do estado.

## 3. Diagramas (a parte draw.io)

- [ ] Setas ligadas às formas: cada ponta guarda a forma e o ponto de ancoragem, e a seta é recalculada quando a forma se mexe.
- [ ] Pontos de conexão visíveis ao passar o mouse sobre uma forma.
- [ ] Grid com snap e guias de alinhamento.
- [ ] Texto dentro das formas.
- [ ] Setas ortogonais que contornam as formas.

## 4. Visual (a parte Excalidraw)

- [x] Traço com cara de esboço usando `roughjs` (adiantado para a etapa 1).
- [ ] Usar a fonte Caveat (já carregada no `index.html`) no texto.
- [ ] Painel de estilo (contorno, preenchimento, espessura) com o `react-color`.

## 5. Persistência

- [ ] Salvamento automático no `localStorage`.
- [ ] Exportar e importar JSON.
- [ ] Exportar PNG e SVG.
- [ ] `Home` vira a lista de boards, e a rota passa a ser `/board/:id`.
