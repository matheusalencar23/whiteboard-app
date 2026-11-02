# Roadmap

Um quadro branco que mistura **Excalidraw** (desenho livre, visual de esboço) com **draw.io** (diagramas estruturados, formas conectadas, fluxogramas).

Marque os itens com `[x]` conforme forem concluídos.

## Estado atual

- Rota `/board` com um canvas em tela cheia (resolução ajustada para telas HiDPI).
- Toolbar com as ferramentas mão, seleção, retângulo, losango, elipse, seta, lápis e texto, além de desfazer, refazer e apagar.
- Seleção por clique, Shift + clique e caixa. Mover, redimensionar pelas 8 alças, apagar, e desfazer/refazer.
- Câmera com pan (roda do mouse, Shift + roda, botão do meio ou Espaço + arrastar) e zoom (Ctrl/Cmd + roda ou pinça no trackpad, centrado no cursor).
- Estado em uma store do zustand, sem persistência.
- Dependência instalada mas ainda não usada: `react-color`.

### Atalhos

| Ação | Atalho |
|---|---|
| Ferramentas | `H` mão, `V`/`1` seleção, `R`/`2` retângulo, `D`/`3` losango, `O`/`4` elipse, `A`/`5` seta, `P`/`6` lápis, `T`/`7` texto |
| Desfazer / refazer | `Ctrl+Z` / `Ctrl+Shift+Z` ou `Ctrl+Y` |
| Selecionar tudo | `Ctrl+A` |
| Apagar seleção | `Delete` ou `Backspace` |
| Limpar seleção | `Esc` |
| Editar texto | Duplo clique no texto. Duplo clique no vazio cria um texto novo. `Esc` ou `Ctrl+Enter` confirmam. |

## Decisões tomadas

- Visual de esboço com `roughjs` é o padrão desde a etapa 1. Cada elemento guarda um `seed` para o traço não mudar a cada redesenho. O traço limpo é `roughness: 0` no estilo do elemento.
- O lápis (desenho livre) não usa o `roughjs`. Ele desenha uma curva suave direto no canvas, porque o roughjs duplicaria e tremeria o traço da mão.
- Formas sem preenchimento só são clicáveis pela borda, como no Excalidraw. Para mover uma forma vazia já selecionada, dá para arrastar pelo meio da caixa de seleção.
- Depois de criar uma forma, uma seta ou um texto, a ferramenta volta para a seleção com o elemento novo selecionado. O lápis continua ativo.

## 1. Fundação

Fazer antes de qualquer ferramenta nova, porque o resto depende disso.

- [x] **Modelo de elementos:** um tipo único com o campo `type` e uma base comum `id, x, y, width, height, rotation, style, seed` (`src/lib/elements/types.ts`). Por enquanto a união só tem `rectangle`. As outras formas entram na etapa 2.
- [x] **Store no zustand** com elementos, ids selecionados, ferramenta ativa e viewport (`src/store/boardStore.ts`).
- [x] **Viewport com pan e zoom**, convertendo entre coordenadas da tela e do mundo (`src/lib/viewport.ts`).
- [x] **Renderização com roughjs** (`src/lib/render/renderScene.ts`).

## 2. Ferramentas e edição básica

- [x] Toolbar com `react-icons` e o `Divider` (`src/components/Board/Toolbar/`).
- [x] Ferramentas: seleção, retângulo, elipse, losango, seta, lápis (desenho livre) e texto.
- [x] Detecção de clique sobre as formas (hit testing).
- [x] Seleção por clique e por caixa.
- [x] Mover, redimensionar pelas alças e apagar.
- [x] Desfazer/refazer (undo/redo) com pilha de snapshots (limite de 100 passos).

### Pendências da etapa 2

- [ ] A caixa de seleção da seta não inclui a ponta (usa só os pontos da haste).
- [ ] Shift ao redimensionar não mantém a proporção, e Shift ao desenhar não força quadrado, círculo ou ângulos de 45°.
- [ ] Não há como girar elementos. O campo `rotation` já é respeitado no desenho e no clique, mas a caixa de seleção ainda o ignora.
- [ ] Mover elementos com as setas do teclado, duplicar (`Ctrl+D`) e copiar/colar.

## 3. Diagramas (a parte draw.io)

- [ ] Setas ligadas às formas: cada ponta guarda a forma e o ponto de ancoragem, e a seta é recalculada quando a forma se mexe.
- [ ] Pontos de conexão visíveis ao passar o mouse sobre uma forma.
- [ ] Grid com snap e guias de alinhamento.
- [ ] Texto dentro das formas.
- [ ] Setas ortogonais que contornam as formas.

## 4. Visual (a parte Excalidraw)

- [x] Traço com cara de esboço usando `roughjs` (adiantado para a etapa 1).
- [x] Usar a fonte Caveat (já carregada no `index.html`) no texto (adiantado para a etapa 2).
- [ ] Painel de estilo (contorno, preenchimento, espessura) com o `react-color`.

## 5. Persistência

- [ ] Salvamento automático no `localStorage`.
- [ ] Exportar e importar JSON.
- [ ] Exportar PNG e SVG.
- [ ] `Home` vira a lista de boards, e a rota passa a ser `/board/:id`.
