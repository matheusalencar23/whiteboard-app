# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Objetivo do projeto

Um quadro branco que mistura Excalidraw e draw.io: o desenho livre e o visual de esboço do Excalidraw, junto com a criação de diagramas estruturados do draw.io (formas conectadas, fluxogramas). Leve isso em conta ao modelar os elementos, por exemplo pensando em conexões entre formas e não só em formas soltas.

## Comandos

- `npm run dev`: servidor de desenvolvimento do Vite com HMR
- `npm run build`: checagem de tipos (`tsc -b`, com project references) seguida de `vite build`, que gera `dist/`
- `npm run lint`: ESLint (flat config, em `eslint.config.js`)
- `npm run preview`: serve o build de produção

Não há test runner configurado. A checagem de tipos (`npx tsc -b`) é a principal verificação de correção. `noUnusedLocals` e `noUnusedParameters` estão ativos, então parâmetros não usados quebram o build. Prefixe-os com `_` ou remova-os.

## Stack

React 19 + TypeScript + Vite, com `react-router` v8 (data router), SCSS modules (`sass-embedded`) e `nanoid` para os IDs dos elementos. `zustand`, `react-color` e `react-icons` estão instalados, mas ainda não são usados. O projeto foi recomeçado recentemente (veja o histórico do git), então commits antigos descrevem outra arquitetura. Não se baseie neles.

Sobre o TypeScript: `verbatimModuleSyntax` está ativo, então imports só de tipos precisam usar `import type` ou o especificador `type`. Imports podem incluir a extensão `.tsx` (`allowImportingTsExtensions`).

## Arquitetura

É um quadro branco baseado em canvas, desenhado direto com a API Canvas 2D. Não usa biblioteca de desenho.

- **Rotas** ([src/main.tsx](src/main.tsx)): `createBrowserRouter` com `App` como layout (`<Outlet />`). `/` renderiza `Home` e `/board` renderiza `Board`.
- **Board** (`src/components/Board/`): wrapper da página. Contém `Canvas/Canvas.tsx`, que é dono do elemento `<canvas>`, do tratamento dos eventos de ponteiro e da lista de elementos desenhados (por enquanto em `useState` local). Um `useEffect` redesenha todos os elementos sempre que a lista muda.
- **Geometria** (`src/lib/geometry/shapes/`): um módulo por tipo de forma. Cada um exporta a interface de dados da forma (`id` mais `points: Point[]`) e uma função pura `draw<Forma>(forma, ctx)`. Tipos primitivos compartilhados, como `Point`, ficam em `src/lib/types.ts`. Novas formas devem seguir esse padrão: dados e lógica de desenho em `lib/`, interação no componente Canvas.
- **Primitivos de UI** (`src/ui/`): componentes visuais pequenos e reutilizáveis (por exemplo, `Divider`).

Estilos: os componentes usam arquivos `*.module.scss` na mesma pasta. Os estilos globais ficam em `src/index.css` e `src/App.css`.

## Convenções

- Mensagens de commit e alguns identificadores e comentários são escritos em português (pt-BR).
- Componentes usam named exports (`export function Board()`). A exceção é `App`, que é export default.
