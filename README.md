# Whiteboard

Um quadro branco no navegador que mistura o desenho livre e o traço de esboço do [Excalidraw](https://excalidraw.com) com os diagramas estruturados do [draw.io](https://www.drawio.com): formas ligadas por setas que acompanham quando as formas se movem, pontos de conexão e setas retas, curvas ou ortogonais.

Tudo roda no navegador, sem servidor. Os boards ficam salvos no próprio navegador e podem ser levados para outro lugar como arquivo.

## Funcionalidades

- **Desenho:** retângulo, losango, elipse, seta, lápis e texto, com traço de esboço ([roughjs](https://roughjs.com)) ou limpo. Selecionar por clique ou por caixa, mover (também pelas setas do teclado), redimensionar, girar, apagar, duplicar, copiar, recortar e colar (inclusive entre boards e abas), agrupar e desagrupar (com duplo clique para entrar no grupo), desfazer e refazer.
- **Diagramas:** setas ligadas às formas por pontos de conexão. A ponta presa a um ponto fica nele; a ponta solta no corpo da forma escolhe sozinha o lado virado para a outra ponta. A seta pode ser reta, curva (com pontos ajustáveis) ou ortogonal (rota automática que contorna as formas), e tem 16 formatos de ponta, incluindo UML e pé de galinha. Uma biblioteca de formas prontas (`Shift+L`) traz as formas do fluxograma (início/fim, entrada/saída, documento, banco de dados, subprocesso, nota e outras) do diagrama entidade-relacionamento (entidade com cabeçalho e lista de atributos, entidade fraca, relacionamentos e atributos) e da UML (classe, interface, ator, caso de uso, fronteira do sistema, pacote, nota, participante com linha de vida e ativação), com busca, para arrastar ou clicar e pôr no quadro.
- **Texto:** texto solto, rótulos dentro das formas e texto no meio das setas, com fonte manuscrita, sem serifa ou monoespaçada, tamanho, negrito, itálico, cor e alinhamento.
- **Estilo:** barra flutuante acima da seleção com cor, espessura e tipo do contorno, preenchimento (hachura, hachura cruzada ou sólido), opacidade e intensidade do esboço.
- **Navegação:** pan e zoom pela roda, pelo trackpad ou pelo indicador de zoom, e grade de fundo em pontos ou linhas.
- **Vários boards:** a página inicial lista os boards salvos, com miniatura, e permite criar, renomear, duplicar e apagar. Cada board tem um endereço próprio (`/board/:id`).
- **Arquivos:** salvar e abrir o board como `.whiteboard.json` pelo menu ao lado do nome do board (`Ctrl+S` e `Ctrl+O`, ou arrastando o arquivo para o quadro).
- **Exportar imagem:** PNG ou SVG, do board inteiro ou só da seleção, com fundo branco ou transparente (`Ctrl+Shift+E`). O PNG também pode ser copiado para a área de transferência. O SVG leva as fontes embutidas e abre igual em qualquer lugar.
- **Ajuda:** o botão `?` no canto inferior direito (ou a tecla `?`) explica as ferramentas e lista todos os atalhos.

## Como rodar

É preciso ter o Node.js 20.19 ou 22.12 (ou mais novo), que o Vite 8 exige.

```bash
npm install
npm run dev
```

O endereço aparece no terminal (por padrão, `http://localhost:5173`).

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Checagem de tipos (`tsc -b`) e build de produção em `dist/` |
| `npm run preview` | Serve o build de produção |
| `npm run lint` | ESLint |

Não há testes automatizados. A checagem de tipos é a principal verificação.

## Onde os dados ficam

- Os boards são salvos sozinhos no `localStorage` do navegador, cada um numa chave própria, mais um índice com a lista. São uns 5 MB por site, divididos entre todos os boards.
- Limpar os dados do site no navegador apaga os boards. Para guardar uma cópia, salve em arquivo.
- Durante o desenvolvimento, o formato salvo não tem versão nem migração: se o formato mudar, os boards antigos deixam de abrir. Exporte o que quiser manter antes de atualizar.
- Duas abas abertas no mesmo board não se sincronizam: vale a última gravação.

O arquivo `.whiteboard.json` tem o formato:

```json
{
  "type": "whiteboard",
  "name": "Fluxo de autenticação",
  "elements": [],
  "viewport": { "offsetX": 0, "offsetY": 0, "zoom": 1 }
}
```

## Stack

React 19, TypeScript, Vite, React Router (data router), Zustand para o estado, roughjs para o traço de esboço, SCSS modules e ícones Lucide (`react-icons`). O desenho é feito num único `<canvas>` 2D, e a lógica fica em TypeScript puro, separada dos componentes.

As fontes são a [Caveat](https://fonts.google.com/specimen/Caveat), a [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) e a [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono), todas com a SIL Open Font License, carregadas do Google Fonts.

## Estrutura

```
src/
  lib/          lógica sem React: modelo e formas, geometria, renderização,
                seleção, texto, viewport, persistência, exportação e tema
  store/        store do Zustand (elementos, seleção, histórico, preferências)
  components/   Home (lista de boards) e Board (canvas, toolbar, barra de estilo,
                ajuda, exportação)
  ui/           componentes visuais reutilizáveis (botões, tooltip, popover, modal, aviso)
```

Os detalhes da arquitetura e as convenções do código estão no [CLAUDE.md](CLAUDE.md).

## Roadmap

O que falta fazer e as decisões que orientam o projeto ficam no [ROADMAP.md](ROADMAP.md). Entre os próximos itens estão as formas extras da biblioteca e o tema escuro. A troca do `localStorage` pelo IndexedDB e a sincronização entre abas estão registradas para decidir depois.
