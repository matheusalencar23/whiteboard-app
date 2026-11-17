# Roadmap

O que falta fazer no quadro branco que mistura **Excalidraw** (desenho livre, visual de esboço) com **draw.io** (diagramas estruturados, formas conectadas, fluxogramas).

Os itens concluídos saem deste arquivo: o que o app já faz está no [README.md](README.md), a arquitetura no [CLAUDE.md](CLAUDE.md), e os detalhes de implementação de cada item feito ficam no histórico do git (as versões anteriores deste arquivo e as mensagens de commit).

## Ordem sugerida

1. A decidir: [sincronizar abas](#sincronizar-duas-abas-abertas-no-mesmo-board).
2. Depois: [publicar o board como biblioteca npm](#publicar-o-board-como-biblioteca-npm).

## Decisões tomadas

Valem para todo item novo.

- O traço de esboço do `roughjs` é o padrão. Cada elemento guarda um `seed` para o traço não mudar a cada redesenho, e o traço limpo é `roughness: 0`.
- O lápis não usa o `roughjs`: desenha uma curva suave direto no canvas, porque o roughjs duplicaria e tremeria o traço da mão.
- Formas sem preenchimento só são clicáveis pela borda, como no Excalidraw. Para mover uma forma vazia já selecionada, dá para arrastar pelo meio da caixa de seleção.
- As funcionalidades seguem o Excalidraw e o draw.io, mas o visual da interface é próprio ("caderno técnico"): toolbar, painéis, cores, seleção e alças não copiam o Excalidraw. Todos os valores visuais ficam em `src/lib/theme.ts`.
- Depois de criar uma forma, uma seta ou um texto, a ferramenta volta para a seleção com o elemento novo selecionado. O lápis continua ativo.
- A grade de fundo é só visual. O encaixe na grade e as guias de alinhamento foram testados e descartados.
- Enquanto o projeto está em desenvolvimento, o formato salvo (no navegador e no `.whiteboard.json`) não tem número de versão nem migrações, para não poluir o código. Um board num formato antigo não passa na validação e não abre. As versões e migrações voltam quando houver usuários com dados a preservar.
- Os contêineres (raias e grupo com título) não têm vínculo com o conteúdo, como os frames do Excalidraw ou os contêineres do draw.io. Para mover o contêiner junto com o que está dentro, agrupa-se tudo com os grupos que já existem (`Ctrl+G`).
- As preferências da grade, do tema e do painel da biblioteca (aberto e grupos recolhidos) valem para todos os boards e não vão no arquivo do board.
- A persistência continua no `localStorage`. A troca pelo IndexedDB foi avaliada e descartada: o limite de uns 5 MB não incomoda com os boards de hoje, e a persistência vai ficar só neste app (veja a decisão abaixo), então não vale a complexidade de uma API assíncrona.
- A biblioteca npm não persiste nada. Ela recebe os dados e as preferências (board, viewport, nome, grade, tema, grupos recolhidos da biblioteca) e avisa das mudanças por callbacks; guardar é responsabilidade de quem usa. O `persistence.ts`, a lista de boards e o salvamento com debounce ficam só neste app, que passa a ser um usuário da biblioteca. Código novo não deve ler nem gravar o `localStorage` fora do `persistence.ts`, do `appBoardSaving.ts` e do `appPreferences.ts`.
- Os elementos guardam as cores do tema claro. O tema escuro só muda o desenho (`adaptColor`), e o canvas não é invertido por filtro CSS, porque isso inverteria também a seleção e a grade e faria a cor desenhada não bater com a escolhida.
- O board vai virar uma biblioteca npm (veja [Publicar o board como biblioteca npm](#publicar-o-board-como-biblioteca-npm)). Código novo do board não deve depender das rotas, do `localStorage`, do `document` inteiro ou do tamanho da janela: navegação e persistência entram por funções e callbacks, os eventos de teclado ficam presos ao board e as medidas vêm do contêiner, não de `100vw`/`100vh`. Cada funcionalidade nova deve poder ser desligada pela configuração da biblioteca: botão, atalho e entrada na ajuda saem de um mesmo lugar (como `tools.ts` e `shortcuts.ts`), para serem escondidos juntos.
- A biblioteca npm é não controlada com ref imperativo: `initialData`, `onChange(scene, info)` uma vez por passo do histórico e `ref.updateScene(patch, { history: "clear" | "record" })`. O modo controlado (prop `elements`) foi avaliado e adiado: só funciona direito com o histórico por alterações e custaria o dobro sem atender um caso que o `updateScene` não atenda. Ele pode entrar depois como acréscimo, sem quebrar a API. Mudanças vindas de fora nunca são aplicadas no meio de uma interação: esperam o contador de interações da store voltar a zero.
- O atalho de exportar imagem é `Ctrl+Shift+E`, como no Excalidraw, mesmo abrindo o monitor de rede no Firefox (a página não consegue impedir). Lá, vale o botão.

## Diagramas

### Biblioteca de formas prontas

O painel, o catálogo, o tipo genérico `shape`, a forma de compartimentos (`compartments`) e os grupos de formas básicas, anotações, contêineres (raias e grupo com título, sem vínculo com o conteúdo), fluxograma, entidade-relacionamento, UML, BPMN, arquitetura e wireframe já existem (veja o [CLAUDE.md](CLAUDE.md)). Um formato novo entra em `SHAPE_KINDS` e em `SHAPE_KIND_DEFINITIONS`, e o item, em `LIBRARY_ITEMS`. Pacotes novos não precisam seguir o draw.io; ele é só inspiração. Silhuetas simples combinam com o traço de esboço; ícones detalhados (como os da AWS) não.

#### A avaliar

- Acrescentar e remover seções dos `compartments` pela interface. Hoje o número de seções vem do item da biblioteca: duas na interface, três na classe.
- Ligar a linha de vida do participante ao retângulo. Hoje os dois só estão agrupados, porque a folga das pontas ligadas (`BINDING_GAP`) deixaria a linha descolada da caixa; redimensionar o retângulo dentro do grupo não leva a linha junto.
- BPMN: marcadores dentro dos eventos (mensagem, temporizador, erro) e dos tipos de tarefa (usuário, serviço), subprocesso recolhido (com o `+`) e o nome do evento e do gateway fora da forma, embaixo, como na notação. Hoje o rótulo fica dentro, e nas formas pequenas cabe pouco.

## Persistência

### Sincronizar duas abas abertas no mesmo board

- [ ] **A decidir.** Proposta:
  - **Problema:** hoje cada aba guarda o board na própria store e grava a versão inteira dela. Com duas abas no mesmo board, vale a última gravação, e as edições da outra aba se perdem sem aviso.
  - **Nível 1, recarregar quando a outra aba salvar (pequeno):** ouvir o evento `storage` do `window`, que o navegador dispara nas outras abas quando uma chave do `localStorage` muda. Se a chave for a do board aberto, recarregar o conteúdo pelo `updateScene` do `Whiteboard` e zerar o histórico, senão o desfazer voltaria ao estado anterior à edição da outra aba. Não aplicar enquanto a aba estiver no meio de um arraste ou editando texto: guardar e aplicar no fim da interação. Limitação: troca o board inteiro, então edições simultâneas nas duas abas ainda se perdem.
  - **Nível 2, mesclar por elemento ao vivo (médio, recomendado):**
    - Cada elemento tem um contador `version`, que sobe a cada alteração, e a posição na ordem de desenho por índice fracionário (os dois já existem; na mesclagem, a ordem final sai do `index`, não da posição no array de cada aba), e apagar vira a marcação `isDeleted` (os elementos marcados ficam fora da renderização, do clique e da exportação, e podem ser limpos ao salvar depois de um tempo). É o modelo do Excalidraw. Pela decisão de não ter migrações, basta ajustar a validação.
    - As mudanças vão pelo `BroadcastChannel` assim que acontecem, sem esperar o debounce do salvamento, com o `boardId` e só os elementos alterados. Cada aba mescla elemento a elemento, ficando com a `version` maior (empate decidido por um número aleatório guardado no elemento, para as duas abas chegarem ao mesmo resultado). Editar elementos diferentes nas duas abas não perde nada, e o conflito só existe quando as duas mexem no mesmo elemento ao mesmo tempo.
    - Uma aba que abre o board pede o estado atual às outras, para não começar de uma versão salva atrasada.
    - O histórico precisa mudar: em vez de fotos inteiras de `elements`, cada passo guarda as alterações daquele passo (o antes e o depois de cada elemento). O desfazer aplica o inverso sobre o estado atual, e assim desfaz só as alterações da própria aba, sem apagar as que vieram da outra. É a parte mais trabalhosa, e está planejada logo depois da 0.1 da biblioteca npm (veja o item).
    - As interações em andamento (arraste, texto em edição) não são interrompidas: as mudanças remotas nos elementos que a aba está mexendo esperam o fim da interação.
    - O `BroadcastChannel` e a mesclagem ficam no app, junto da persistência. A biblioteca npm só precisa aceitar elementos vindos de fora sem perder o histórico local (o histórico por alterações acima), o que vale para qualquer sincronização que quem usa quiser montar.
  - **Nível 3, CRDT (grande):** usar uma estrutura que mescla edições simultâneas sem conflito, como o Yjs, que também traz o desfazer por usuário. Só compensa se houver colaboração em tempo real entre pessoas, com servidor; nesse caso a sincronização entre abas vem junto. Só para abas, é exagero.
  - **Em todos os níveis:** o viewport (zoom e posição), a seleção e a ferramenta ativa continuam separados em cada aba. O nível 1 pode ser um primeiro passo e ser trocado pelo 2 depois, sem retrabalho fora da store.

## Distribuição

### Publicar o board como biblioteca npm

- [ ] **O quê:** separar o board (canvas, toolbar, barra de estilo, menu, exportação) num pacote npm que outros projetos React instalam e usam como um componente, por exemplo `<Whiteboard initialData={...} onChange={...} />`. O app atual (lista de boards e rotas) passa a ser um usuário desse pacote.
- **Problemas de hoje:**
  - **Tema e estilos:** as variáveis (`--wb-*`) já ficam na raiz do board, e o board ocupa o contêiner pai. Falta aceitar um tema próprio por prop (cores, raios, sombras; o `renderScene` e o `renderElement` já recebem o tema e o esquema de cores), provavelmente junto com o `config`, e os SCSS modules virarem um CSS gerado no build, importado pelo usuário (`import "pacote/style.css"`). Avaliar também se o fundo escurecido do `Modal` deve cobrir só o board quando ele não ocupa a tela toda (hoje cobre a janela).
  - **Fontes:** hoje vêm do `<link>` do `index.html`. O pacote pode documentar o `<link>` necessário, trazer as fontes no CSS (`@font-face` com os arquivos no pacote) ou aceitar as famílias por prop. Decidir na hora.
  - **SSR:** nenhum módulo do board toca no `window` ou no `document` fora de efeitos e handlers (só o `appBoardSaving.ts`, que é do app), e isso precisa continuar assim. Falta o README documentar o uso com `"use client"` ou importação dinâmica.
  - **Idioma da interface:** há perto de 300 textos fixos em português (rótulos, tooltips, menus, ajuda, avisos). Juntar todos num dicionário (`messages`), com o pt-BR como padrão e uma prop `locale`/`messages` para trocar, e trazer pelo menos o inglês. Os nomes de `tools.ts`, `shortcuts.ts` e do catálogo da biblioteca (inclusive as palavras de busca) passam a ser chaves do dicionário.
  - **`react-color`:** está sem manutenção há anos e não declara suporte ao React 19, o que gera aviso de peer dependency em quem instala. É usado só no `ColorPicker`: trocar por um seletor próprio (saturação e matiz) ou pelo `react-colorful`.
  - **Tamanho:** o build de hoje tem uns 736 KB de JS num arquivo só. No pacote, carregar sob demanda o que é ocasional (diálogo de exportação com as fontes do SVG, painel da biblioteca, ajuda) e medir o tamanho na CI (`size-limit`).
- **Como:**
  - **Estrutura:** monorepo com workspaces do npm: `packages/whiteboard` (o pacote) e `apps/web` (o app atual). Ou uma pasta `src/whiteboard/` com um build de biblioteca à parte, se o monorepo parecer exagero. O `src/lib/` já é TypeScript puro e quase não muda.
  - **Build:** modo biblioteca do Vite (`build.lib`) gerando ESM, com `react`, `react-dom` e `react/jsx-runtime` como `peerDependencies` e externos. Os tipos saem com `vite-plugin-dts` ou com `tsc --emitDeclarationOnly`. `roughjs`, `zustand`, `nanoid` e `react-icons` ficam como dependências comuns.
  - **Modelo de dados (decidido):** não controlado com ref imperativo, como o Excalidraw (veja as [decisões](#decisões-tomadas)). Assinaturas da 0.1 (o componente, `initialData`, `initialPreferences`, `onChange`, `onPreferencesChange`, `back`, o `autoFocus`, o `version` e o `lastChange` já existem, assim como o ref; faltam o `onChangeLive` e o `config`):
    ```ts
    interface WhiteboardScene { elements: readonly BoardElement[]; name: string; viewport: Viewport }
    type ChangeReason = "commit" | "undo" | "redo" | "name" | "viewport" | "external";
    interface ChangeInfo { reason: ChangeReason; changedIds: readonly string[] }

    interface WhiteboardProps {
      initialData?: Partial<WhiteboardScene>;
      initialPreferences?: Partial<Preferences>;
      onChange?: (scene: WhiteboardScene, info: ChangeInfo) => void;
      onPreferencesChange?: (preferences: Preferences) => void;
      onChangeLive?: (elements: readonly BoardElement[]) => void;
      back?: { label: string; onClick: () => void };
      autoFocus?: boolean;
      config?: WhiteboardConfig;
    }

    interface WhiteboardApi {
      getScene(): WhiteboardScene;
      updateScene(patch: Partial<WhiteboardScene>, options?: { history?: "clear" | "record" }): void;
      undo(): void;
      redo(): void;
      resetHistory(): void;
      exportPng(options?: Partial<ExportOptions>): Promise<Blob | null>;
    }
    ```
    - **`onChange`:** dois objetos, o que se grava (`scene`) e o porquê (`info`), para o `reason` e o `changedIds` não irem parar no que é salvo. Dispara uma vez por passo do histórico e nas trocas de nome e viewport, nunca a cada `pointermove`. O `onChangeLive` (opcional, um por quadro com `requestAnimationFrame`) é para pré-visualização ao vivo.
    - **`updateScene`:** `"clear"` (padrão) zera o histórico, `"record"` vira um passo (desfazer volta também a mudança de fora; documentar). Corrigir as fotos do histórico por id foi descartado: não há resposta certa para elementos inseridos ou apagados por fora nem para a ordem. Não dispara `onChange` em laço.
    - **`initialData`:** só vale na montagem. Mudar depois não tem efeito; para trocar, usar o `updateScene` ou uma `key` (documentar).
    - **Prop `elements` reservada:** o modo controlado e a opção `history: "preserve"` (aplicar de fora mantendo o histórico local) entram numa versão menor depois do histórico por alterações, sem quebrar a API.
  - **Depois da 0.1, antes da sincronização de abas:** trocar o histórico de fotos por alterações (`{ id, before?, after? }` por passo), como refatoração interna do `boardStore.ts`: os `pushPast` passam a guardar a diferença entre o antes e o depois (por referência, barato), e os chamadores de `commitHistory` não mudam. O desfazer aplica o inverso só onde o elemento ainda tem a `version` do `after`. Testes com Vitest para `diffElements`, `applyDiff` e `invert`, mais um roteiro manual de desfazer e refazer de cada ação. Com isso entram o `"preserve"` e, se houver demanda, a prop `elements`.
  - **API pública:** o componente `Whiteboard` e o `WhiteboardApi` acima, os tipos do modelo (`BoardElement`, `BoardFile`, `WhiteboardScene`), as funções de arquivo (`serializeBoardFile`/`parseBoardFile`) e as de exportar imagem (`renderToCanvas`, `renderToSvg`). O resto fica interno, para poder mudar sem quebrar quem usa.
  - **Configuração:** quem usa escolhe o que aparece e o que funciona, com uma prop de configuração (por exemplo, `config`) em que tudo é opcional e o padrão é o app completo de hoje.
    - **Funcionalidades:** ligar ou desligar cada parte, como ferramentas (lista das que aparecem, `tools: ["selection", "rectangle", "arrow"]`), barra de estilo, menu do board, abrir e salvar arquivo, exportar imagem, grade, zoom, ajuda e a importação por arrastar arquivo.
    - **Modo somente leitura:** só pan, zoom e exportar, sem selecionar nem editar, para mostrar diagramas prontos.
    - **Valores iniciais e limites:** estilo inicial das formas, paleta oferecida no seletor de cor, grade inicial, níveis de zoom.
    - **Fonte única:** um tipo `WhiteboardConfig` com os padrões e uma função que mescla o que veio por prop (`resolveConfig`), guardado no contexto da instância. A toolbar filtra o `TOOLS`, o menu filtra as entradas (e some se ficar vazio), a ajuda mostra só o que está ligado, e o `useShortcuts` ignora os atalhos de funcionalidades desligadas. Desligar uma parte esconde o botão e também o atalho, para não sobrar caminho escondido.
  - **Formato salvo:** quem usar o pacote guarda os dados, então a decisão de [não ter versão nem migrações](#decisões-tomadas) precisa ser revista antes da primeira versão publicada: o `.whiteboard.json` ganha um campo de versão e as migrações voltam. A primeira versão do formato já traz a `version` e o índice fracionário de cada elemento, para não precisar de uma migração logo em seguida.
  - **Testes mínimos:** o projeto não tem test runner. Antes da primeira versão, um `vitest` cobrindo o contrato com os dados de quem usa: `parseBoardFile`/`isValidElement` e as migrações, com um board de exemplo de cada versão do formato. Um erro ali perde boards de terceiros.
  - **Nome:** conferir se o nome está livre no npm, senão publicar com escopo (`@usuario/whiteboard`). O pacote herda a licença MIT do repositório (`license` no `package.json` e o `LICENSE` incluído no tarball).
  - **CI:** o workflow de [ci.yml](.github/workflows/ci.yml) já roda lint, tipos e build em push e PR. Com o pacote, acrescentar `publint` e `@arethetypeswrong/cli` (validam `exports`, `types` e ESM do `package.json`), `npm pack --dry-run` (confere o que vai no tarball), o build do app consumindo só a API pública do pacote (serve de teste de integração), os testes e o `size-limit`.
  - **Publicação:** versionamento semântico, `CHANGELOG` e um exemplo mínimo de uso no README do pacote. Começar como `0.x` enquanto a API muda. O versionamento e o `CHANGELOG` saem do Changesets (`@changesets/cli`: cada PR descreve a mudança, a action abre o PR de release e publica no merge), ou de tags (`v0.1.0`) se parecer exagero para um mantenedor só. Publicar pelo trusted publishing do npm (OIDC no GitHub Actions, com proveniência), sem token guardado nos secrets.
  - **Depois da primeira versão:** acessibilidade do canvas (anunciar seleção e criação por `aria-live`) e o app publicado no GitHub Pages como demonstração.
- **Por quê:** permite usar o quadro branco dentro de outros projetos (documentação, ferramentas internas, apps com diagramas) sem copiar o código, mantendo uma base só.
- **Ordem:** depende pouco dos outros itens, mas fica mais barato se as decisões acima forem seguidas desde já. O tema ativo hoje sai da store (`themeMode`) e é aplicado no `document.documentElement` pelo `App`; no pacote, passa a ser por instância. Sequência sugerida:
  1. Demais separações (fontes e `config` com o modo somente leitura e o tema por prop).
  2. Dicionário de textos, troca do `react-color` e carregamento sob demanda.
  3. Versão no formato salvo, migrações e os testes delas.
  4. Checagens de pacote na CI, Changesets, README com três exemplos (só leitura, salvar numa API, trocar a cena por fora) e publicação da `0.1.0`.
  5. Depois: histórico por alterações e a sincronização de abas (nível 2).
