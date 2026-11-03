# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Objetivo do projeto

Um quadro branco que mistura Excalidraw e draw.io: o desenho livre e o visual de esboço do Excalidraw, junto com a criação de diagramas estruturados do draw.io (formas conectadas, fluxogramas). Leve isso em conta ao modelar os elementos, por exemplo pensando em conexões entre formas e não só em formas soltas.

As funcionalidades podem seguir o Excalidraw, mas o visual da interface (toolbar, painéis, cores, seleção e alças) deve ser próprio, sem copiar o Excalidraw. O traço de esboço do `roughjs` nas formas continua.

O plano de desenvolvimento fica em [ROADMAP.md](ROADMAP.md). Consulte-o antes de começar uma funcionalidade nova e marque os itens concluídos.

## Comandos

- `npm run dev`: servidor de desenvolvimento do Vite com HMR
- `npm run build`: checagem de tipos (`tsc -b`, com project references) seguida de `vite build`, que gera `dist/`
- `npm run lint`: ESLint (flat config, em `eslint.config.js`)
- `npm run preview`: serve o build de produção

Não há test runner configurado. A checagem de tipos (`npx tsc -b`) é a principal verificação de correção. `noUnusedLocals` e `noUnusedParameters` estão ativos, então parâmetros não usados quebram o build. Prefixe-os com `_` ou remova-os.

## Stack

React 19 + TypeScript + Vite, com `react-router` v8 (data router), SCSS modules (`sass-embedded`), `zustand` para o estado, `roughjs` para o traço de esboço, `react-icons` (conjunto `lu`, Lucide) e `nanoid` para os IDs dos elementos. `react-color` está instalado, mas ainda não é usado. O projeto foi recomeçado recentemente (veja o histórico do git), então commits antigos descrevem outra arquitetura. Não se baseie neles.

Sobre o TypeScript: `verbatimModuleSyntax` está ativo, então imports só de tipos precisam usar `import type` ou o especificador `type`. Imports podem incluir a extensão `.tsx` (`allowImportingTsExtensions`).

## Arquitetura

É um quadro branco em um único `<canvas>` 2D. As formas são desenhadas com o `roughjs`, e a lógica fica em `src/lib/` (TypeScript puro, sem React). Os componentes só cuidam de interação e estado.

- **Rotas** ([src/main.tsx](src/main.tsx)): `createBrowserRouter` com `App` como layout (`<Outlet />`). `/` renderiza `Home` e `/board` renderiza `Board`.
- **Modelo** ([src/lib/elements/types.ts](src/lib/elements/types.ts)): `BoardElement` é uma união discriminada por `type` (`rectangle`, `ellipse`, `diamond`, `arrow`, `freedraw`, `text`). Todo elemento tem `x, y, width, height` (a caixa delimitadora, sempre normalizada), além de `rotation`, `style` e `seed`. O `seed` é obrigatório: o roughjs sorteia o traço a cada desenho, e sem um seed fixo a forma "treme" a cada redesenho. Seta e lápis guardam `points` **relativos a `x, y`**, então mover qualquer elemento é só mudar `x` e `y`.
- **Formas** (`src/lib/elements/shapes/`): cada módulo exporta um `ShapeUtil` ([shapeUtil.ts](src/lib/elements/shapeUtil.ts)) com `draw`, `hitTest` e `resize`, além das funções de criação e atualização. [registry.ts](src/lib/elements/registry.ts) despacha pelo `type` e cuida do que é comum a todos, como a rotação, a busca do elemento sob o ponteiro e o deslocamento. Para adicionar uma forma: criar o módulo, incluir o tipo na união `BoardElement` e registrar o util em `shapeUtils` (o tipo mapeado faz o TypeScript reclamar se faltar).
- **Setas ligadas** ([src/lib/elements/bindings.ts](src/lib/elements/bindings.ts)): `ArrowElement` tem `startBinding`/`endBinding` (`{ elementId, anchor }`, com `anchor` nulo para a ligação flutuante). As formas que aceitam ligação implementam `getBorderOffset` e `getConnectionPoints` (pontos fixos relativos, que viram o `anchor`) no `ShapeUtil`. A store chama `updateBoundArrows` dentro de `updateElements`, `replaceElement` e `deleteElements`, então qualquer mudança numa forma já reposiciona as setas ligadas a ela. Não recalcule ligações nas interações. A seta tem `routing` (`straight`, `curved` ou `elbow`). Na reta e na curva, os pontos do meio são do usuário (alças do meio em `getArrowHandles`), e a curva é uma Catmull-Rom que passa por eles (`getArrowPath` amostra a curva para clique e caixa). Na ortogonal, os pontos do meio são derivados das pontas pelo `refreshArrow` (rota em [src/lib/geometry/orthogonalRoute.ts](src/lib/geometry/orthogonalRoute.ts)). Os trechos que o usuário arrastou ficam em `fixedSegments`, e o recálculo liga as pontas e os trechos fixos com pedaços de rota automática.
- **Rótulos**: retângulo, elipse e losango têm um `label` opcional (`{ text, fontSize }`), desenhado e testado no clique de forma comum em `registry.ts` (`getLabelLayout`). Cada forma define a área do texto com `getLabelArea`. A quebra de linha (`wrapText` em [src/lib/text.ts](src/lib/text.ts)) imita o `<textarea>` com `pre-wrap`; se mudar uma, mude a outra.
- **Grade de fundo** ([src/lib/render/grid.ts](src/lib/render/grid.ts)): só visual, sem encaixe (o snap foi testado e descartado). `showGrid` e `gridStyle` (`dots` ou `lines`) ficam na store e são salvos. O `renderScene` desenha a grade antes dos elementos.
- **Coordenadas** ([src/lib/viewport.ts](src/lib/viewport.ts)): os elementos vivem em coordenadas de mundo, e os eventos chegam em coordenadas de tela (pixels CSS relativos ao canvas), com `tela = mundo * zoom + offset`. Converta os pontos do ponteiro com `screenToWorld` antes de criar ou alterar elementos. `renderScene` aplica o viewport e o `devicePixelRatio` via `ctx.setTransform`, então os `draw` desenham direto em coordenadas de mundo. Tamanhos que devem ser constantes na tela (alças, folga de clique, linhas da seleção) são definidos em pixels e divididos por `zoom`.
- **Seleção** ([src/lib/selection.ts](src/lib/selection.ts)): o quadro da seleção (`SelectionFrame`, caixa sem rotação mais o ângulo; gira junto quando há um elemento só), as 8 alças, a alça de rotação e a matemática de redimensionar e girar. `getElementBounds` é a caixa alinhada aos eixos, já considerando a rotação; `getElementBox` é a caixa sem rotação. Setas nunca têm `rotation`: girá-las gira os pontos. [renderScene.ts](src/lib/render/renderScene.ts) desenha essa camada por cima dos elementos.
- **Estado e histórico** ([src/store/boardStore.ts](src/store/boardStore.ts)): store do zustand com `elements`, `selectedIds`, `tool`, `viewport` e o histórico (`past`/`future`, snapshots imutáveis de `elements`). Ações discretas (`addElement`, `replaceElement`, `deleteElements`) já registram um passo. Ações contínuas usam `updateElements` sem registrar, e quem chama guarda `elements` no início do arraste e chama `commitHistory(before)` no fim. Sempre crie arrays e objetos novos ao alterar elementos, porque o histórico depende de imutabilidade.
- **Canvas** ([src/components/Board/Canvas/Canvas.tsx](src/components/Board/Canvas/Canvas.tsx)): é dono do `<canvas>` e dos eventos de ponteiro, roda e espaço. Cada arraste é uma `Interaction` (união discriminada em um ref): pan, criação, lápis, mover, redimensionar ou seleção por caixa. Estado transitório (rascunho, caixa de seleção, texto em edição) fica local no Canvas, não na store. Os handlers leem a store com `useBoardStore.getState()` para não depender de closures antigas. A roda usa um listener nativo com `passive: false`, porque o `onWheel` do React não permite `preventDefault`.
- **Texto** ([TextEditor.tsx](src/components/Board/TextEditor/TextEditor.tsx), [src/lib/text.ts](src/lib/text.ts)): a edição usa um `<textarea>` posicionado sobre o canvas, e o elemento em edição é escondido do canvas. A fonte, o `LINE_HEIGHT` e o `measureText` são compartilhados entre o canvas e o textarea para os dois ficarem alinhados.
- **Painel de estilo** ([StylePanel.tsx](src/components/Board/StylePanel/StylePanel.tsx)): fica ao lado da toolbar, no mesmo contêiner (`.dock` em `Board.module.scss`), que posiciona os dois. Mostra opções do que está selecionado ou da ferramenta ativa (por enquanto, o tipo da seta). Os seletores do zustand devolvem valores simples (string, booleano), não arrays novos, para não re-renderizar à toa.
- **Toolbar e atalhos**: [tools.ts](src/components/Board/Toolbar/tools.ts) é a fonte única das ferramentas (ícone, nome e teclas), usada pela toolbar e por [useShortcuts.ts](src/components/Board/useShortcuts.ts). Os atalhos ignoram teclas digitadas em campos de texto (`isTypingTarget`).
- Tipos primitivos compartilhados (`Point`) ficam em `src/lib/types.ts`, e a geometria pura em `src/lib/geometry/` (`bounds.ts`, `distance.ts`, `constrain.ts`).
- **Primitivos de UI** (`src/ui/`): componentes visuais pequenos e reutilizáveis (`IconButton` com tooltip e atalho, `Tooltip`, `Panel`/`PanelSection`, `Divider`). Botões de ícone novos devem usar o `IconButton`.
- **Tema** ([src/lib/theme.ts](src/lib/theme.ts)): fonte única de cores, fontes, raios e sombras. `applyTheme` (chamado em `main.tsx`) vira cada valor em variável CSS (`--color-*`, `--canvas-*`, `--font-*`, `--radius-*`, `--shadow-*`), e o canvas lê `theme` direto. Não escreva cores, fontes ou sombras soltas em SCSS ou no canvas: use as variáveis ou acrescente um token ao tema.

Estilos: os componentes usam arquivos `*.module.scss` na mesma pasta. Os estilos globais ficam em `src/index.css` e `src/App.css`.

## Convenções

- **Não escreva comentários no código**, nem de linha, nem de bloco, nem JSDoc, em `.ts`, `.tsx` e `.scss`. O código deve se explicar pelos nomes. O motivo das decisões fica no [ROADMAP.md](ROADMAP.md) (nos detalhes de implementação de cada item) e nas mensagens de commit. Se um bloco só fazia sentido com um comentário (por exemplo, um `catch` vazio), reescreva o código para não precisar dele.
- Mensagens de commit e alguns identificadores são escritos em português (pt-BR).
- Componentes usam named exports (`export function Board()`). A exceção é `App`, que é export default.
