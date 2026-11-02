# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Objetivo do projeto

Um quadro branco que mistura Excalidraw e draw.io: o desenho livre e o visual de esboço do Excalidraw, junto com a criação de diagramas estruturados do draw.io (formas conectadas, fluxogramas). Leve isso em conta ao modelar os elementos, por exemplo pensando em conexões entre formas e não só em formas soltas.

O plano de desenvolvimento fica em [ROADMAP.md](ROADMAP.md). Consulte-o antes de começar uma funcionalidade nova e marque os itens concluídos.

## Comandos

- `npm run dev`: servidor de desenvolvimento do Vite com HMR
- `npm run build`: checagem de tipos (`tsc -b`, com project references) seguida de `vite build`, que gera `dist/`
- `npm run lint`: ESLint (flat config, em `eslint.config.js`)
- `npm run preview`: serve o build de produção

Não há test runner configurado. A checagem de tipos (`npx tsc -b`) é a principal verificação de correção. `noUnusedLocals` e `noUnusedParameters` estão ativos, então parâmetros não usados quebram o build. Prefixe-os com `_` ou remova-os.

## Stack

React 19 + TypeScript + Vite, com `react-router` v8 (data router), SCSS modules (`sass-embedded`), `zustand` para o estado, `roughjs` para o traço de esboço e `nanoid` para os IDs dos elementos. `react-color` e `react-icons` estão instalados, mas ainda não são usados. O projeto foi recomeçado recentemente (veja o histórico do git), então commits antigos descrevem outra arquitetura. Não se baseie neles.

Sobre o TypeScript: `verbatimModuleSyntax` está ativo, então imports só de tipos precisam usar `import type` ou o especificador `type`. Imports podem incluir a extensão `.tsx` (`allowImportingTsExtensions`).

## Arquitetura

É um quadro branco em um único `<canvas>` 2D. As formas são desenhadas com o `roughjs`, e a lógica fica em `src/lib/` (TypeScript puro, sem React). Os componentes só cuidam de interação e estado.

- **Rotas** ([src/main.tsx](src/main.tsx)): `createBrowserRouter` com `App` como layout (`<Outlet />`). `/` renderiza `Home` e `/board` renderiza `Board`.
- **Modelo** ([src/lib/elements/types.ts](src/lib/elements/types.ts)): `BoardElement` é uma união discriminada por `type`. Todo elemento tem `x, y, width, height` (sempre normalizados, com largura e altura positivas), além de `rotation`, `style` e `seed`. O `seed` é obrigatório: o roughjs sorteia o traço a cada desenho, e sem um seed fixo a forma "treme" a cada redesenho.
- **Formas** (`src/lib/elements/shapes/`): um módulo por tipo, com `create<Forma>`, funções de atualização e `draw<Forma>(el, rc: RoughCanvas)`. Para adicionar uma forma: criar o módulo, incluir o tipo na união `BoardElement` e incluir um `case` em `renderElement` ([src/lib/render/renderScene.ts](src/lib/render/renderScene.ts)). O `switch` sem `default` faz o TypeScript avisar se faltar algum.
- **Coordenadas** ([src/lib/viewport.ts](src/lib/viewport.ts)): os elementos vivem em coordenadas de mundo, e os eventos chegam em coordenadas de tela (pixels CSS relativos ao canvas), com `tela = mundo * zoom + offset`. Converta os pontos do ponteiro com `screenToWorld` antes de criar ou alterar elementos. `renderScene` aplica o viewport e o `devicePixelRatio` via `ctx.setTransform`, então as funções `draw*` desenham direto em coordenadas de mundo.
- **Estado** ([src/store/boardStore.ts](src/store/boardStore.ts)): store do zustand com `elements`, `selectedIds`, `tool` e `viewport`. Estado transitório de interação (o rascunho sendo arrastado, o pan em andamento) fica local no `Canvas`, não na store.
- **Canvas** ([src/components/Board/Canvas/Canvas.tsx](src/components/Board/Canvas/Canvas.tsx)): é dono do `<canvas>`, dos eventos de ponteiro, roda e teclado. Redesenha a cena inteira num `useEffect` quando elementos, rascunho, viewport ou tamanho mudam. A roda usa um listener nativo com `passive: false`, porque o `onWheel` do React não permite `preventDefault`.
- Tipos primitivos compartilhados (`Point`) ficam em `src/lib/types.ts`, e `getBounds` em `src/lib/geometry/bounds.ts`.
- **Primitivos de UI** (`src/ui/`): componentes visuais pequenos e reutilizáveis (por exemplo, `Divider`).

Estilos: os componentes usam arquivos `*.module.scss` na mesma pasta. Os estilos globais ficam em `src/index.css` e `src/App.css`.

## Convenções

- Mensagens de commit e alguns identificadores e comentários são escritos em português (pt-BR).
- Componentes usam named exports (`export function Board()`). A exceção é `App`, que é export default.
