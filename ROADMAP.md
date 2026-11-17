# Roadmap

O que falta fazer no quadro branco que mistura **Excalidraw** (desenho livre, visual de esboço) com **draw.io** (diagramas estruturados, formas conectadas, fluxogramas).

Os itens concluídos saem deste arquivo: o que o app já faz está no [README.md](README.md), a arquitetura no [CLAUDE.md](CLAUDE.md), e os detalhes de implementação de cada item feito ficam no histórico do git (as versões anteriores deste arquivo e as mensagens de commit).

## Ordem sugerida

1. [Ordem de desenho](#ordem-de-desenho).
2. Biblioteca de formas: [BPMN](#bpmn).
3. A decidir: [IndexedDB](#trocar-o-localstorage-pelo-indexeddb) e [sincronizar abas](#sincronizar-duas-abas-abertas-no-mesmo-board).
4. Depois: [publicar o board como biblioteca npm](#publicar-o-board-como-biblioteca-npm).

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
- As preferências da grade e do tema valem para todos os boards e não vão no arquivo do board.
- Os elementos guardam as cores do tema claro. O tema escuro só muda o desenho (`adaptColor`), e o canvas não é invertido por filtro CSS, porque isso inverteria também a seleção e a grade e faria a cor desenhada não bater com a escolhida.
- O board vai virar uma biblioteca npm (veja [Publicar o board como biblioteca npm](#publicar-o-board-como-biblioteca-npm)). Código novo do board não deve depender das rotas, do `localStorage`, do `document` inteiro ou do tamanho da janela: navegação e persistência entram por funções e callbacks, os eventos de teclado ficam presos ao board e as medidas vêm do contêiner, não de `100vw`/`100vh`. Cada funcionalidade nova deve poder ser desligada pela configuração da biblioteca: botão, atalho e entrada na ajuda saem de um mesmo lugar (como `tools.ts` e `shortcuts.ts`), para serem escondidos juntos.
- O atalho de exportar imagem é `Ctrl+Shift+E`, como no Excalidraw, mesmo abrindo o monitor de rede no Firefox (a página não consegue impedir). Lá, vale o botão.

## Edição

### Ordem de desenho

- [ ] **O quê:** trazer para frente, levar para trás, trazer um passo e levar um passo, sobre a seleção.
- **Como:**
  - **Modelo:** a ordem de desenho já é a ordem do array `elements`, então não há campo novo nem mudança na persistência. Quatro ações na store, cada uma num passo do histórico, que devolvem um array novo com os elementos selecionados reposicionados, mantendo a ordem relativa entre eles.
  - **Grupos:** o agrupamento junta os membros na ordem de desenho, então a ordem trabalha com as unidades da seleção (`getSelectionUnit`): um grupo anda como um bloco e não é partido. Dentro de um grupo (`editingGroupId`), a ordem só muda entre os membros dele, sem sair da faixa do grupo.
  - **Um passo:** pula a próxima unidade que se sobrepõe à seleção (pela caixa, `getElementBounds`), como no Excalidraw. Pular uma unidade que nem encosta na seleção não muda nada na tela e parece que o comando falhou.
  - **Pontos de entrada:** um grupo "Ordem" na barra de estilo, com os quatro botões, e os atalhos do Excalidraw (`Ctrl+Shift+]` e `Ctrl+Shift+[` para a frente e o fundo, `Ctrl+]` e `Ctrl+[` para um passo), no `shortcuts.ts`, no `useShortcuts` e na ajuda. Os atalhos usam o `e.code` (`BracketRight`/`BracketLeft`), porque o caractere dos colchetes muda com o layout do teclado (no ABNT2 fica em outra tecla e com outro `e.key` com Shift).
  - **Lápis e setas:** sem tratamento especial. As setas ligadas não dependem da ordem.
- **Por quê:** os contêineres (raias e grupo com título) costumam ficar atrás das formas. Hoje um contêiner preenchido, ou inserido depois das formas, cobre o que já estava no quadro, e não há como mandá-lo para trás. Vale também para qualquer sobreposição de formas.

## Diagramas

### Biblioteca de formas prontas

O painel, o catálogo, o tipo genérico `shape`, a forma de compartimentos (`compartments`) e os grupos de formas básicas, anotações, contêineres (raias e grupo com título, sem vínculo com o conteúdo), fluxograma, entidade-relacionamento, UML, arquitetura e wireframe já existem (veja o [CLAUDE.md](CLAUDE.md)). Um formato novo entra em `SHAPE_KINDS` e em `SHAPE_KIND_DEFINITIONS`, e o item, em `LIBRARY_ITEMS`. Os pacotes abaixo não precisam seguir o draw.io; ele é só inspiração. Silhuetas simples combinam com o traço de esboço; ícones detalhados (como os da AWS) não.

#### BPMN

- [ ] Tarefa, eventos (início, fim, intermediário), gateways (exclusivo, paralelo, inclusivo) e piscina com raias. Grupo grande. As raias já existem (`laneHorizontal` e `laneVertical`, com o título girado pelo `labelRotation`); a piscina com várias raias pode ser um item composto delas.

#### A avaliar

- Acrescentar e remover seções dos `compartments` pela interface. Hoje o número de seções vem do item da biblioteca: duas na interface, três na classe.
- Ligar a linha de vida do participante ao retângulo. Hoje os dois só estão agrupados, porque a folga das pontas ligadas (`BINDING_GAP`) deixaria a linha descolada da caixa; redimensionar o retângulo dentro do grupo não leva a linha junto.
- Lembrar quais grupos do painel estão recolhidos, quando o catálogo crescer.

## Persistência

### Trocar o `localStorage` pelo IndexedDB

- [ ] **A decidir.** Proposta:
  - **Problema:** o `localStorage` tem uns 5 MB por origem, divididos entre todos os boards, e a escrita é síncrona: cada salvamento faz um `JSON.stringify` do board inteiro e grava travando a tela. Com vários boards grandes, ou com imagens no futuro, o limite chega e aparece o aviso de armazenamento cheio.
  - **Proposta:** guardar o conteúdo dos boards e o índice no IndexedDB, que permite centenas de MB a GB (uma fração do disco), grava objetos sem `JSON.stringify` e é assíncrono. Usar o `idb-keyval` (menos de 1 KB) em vez da API pura, que é verbosa. As preferências da grade, pequenas e lidas na abertura, continuam no `localStorage`.
  - **Impacto no código:** o acesso está concentrado em `src/lib/persistence.ts`. Ler e gravar passam a devolver promessas. Os loaders de `/` e `/board/:id` já aceitam promessas, e o salvamento já é adiado pelo debounce, então quase nada fora desse arquivo muda. O `flushBoardSave` vira assíncrono, e o loader de `/` espera por ele. No `pagehide`, uma gravação assíncrona pode não terminar, e o debounce curto continua sendo a proteção principal.
  - **Complementos:** chamar `navigator.storage.persist()` para o navegador não apagar os dados quando o disco estiver cheio (sem isso, tanto o IndexedDB quanto o `localStorage` podem ser apagados).
  - **Alternativas avaliadas:** OPFS (sistema de arquivos privado da origem), bom para arquivos grandes como imagens, mas mais complexo do que precisamos hoje; File System Access API (salvar direto num arquivo do disco), só em Chrome e Edge, útil como complemento ("salvar no mesmo arquivo"), não como armazenamento principal; servidor (API própria, Supabase, Firebase), a única opção para acessar de outros dispositivos e para colaboração, mas exige backend, login e tratamento de conflitos, e seria uma etapa à parte.
  - **Migração:** pela decisão de não ter migrações durante o desenvolvimento, os boards do `localStorage` não seriam copiados. Para não perder nada, exportar os boards em `.whiteboard.json` antes e reabrir depois.

### Sincronizar duas abas abertas no mesmo board

- [ ] **A decidir.** Proposta:
  - **Problema:** hoje cada aba guarda o board na própria store e grava a versão inteira dela. Com duas abas no mesmo board, vale a última gravação, e as edições da outra aba se perdem sem aviso.
  - **Nível 1, recarregar quando a outra aba salvar (pequeno):** ouvir o evento `storage` do `window`, que o navegador dispara nas outras abas quando uma chave do `localStorage` muda. Se a chave for a do board aberto, recarregar o conteúdo pelo `loadStoredBoard` e zerar o histórico, senão o desfazer voltaria ao estado anterior à edição da outra aba. Não aplicar enquanto a aba estiver no meio de um arraste ou editando texto: guardar e aplicar no fim da interação. Limitação: troca o board inteiro, então edições simultâneas nas duas abas ainda se perdem. Com IndexedDB, o evento `storage` não existe, e o aviso iria por `BroadcastChannel`.
  - **Nível 2, mesclar por elemento ao vivo (médio, recomendado):**
    - Cada elemento ganha um contador `version`, que sobe a cada alteração, e apagar vira a marcação `isDeleted` (os elementos marcados ficam fora da renderização, do clique e da exportação, e podem ser limpos ao salvar depois de um tempo). É o modelo do Excalidraw. Pela decisão de não ter migrações, basta ajustar a validação.
    - As mudanças vão pelo `BroadcastChannel` assim que acontecem, sem esperar o debounce do salvamento, com o `boardId` e só os elementos alterados. Cada aba mescla elemento a elemento, ficando com a `version` maior (empate decidido por um número aleatório guardado no elemento, para as duas abas chegarem ao mesmo resultado). Editar elementos diferentes nas duas abas não perde nada, e o conflito só existe quando as duas mexem no mesmo elemento ao mesmo tempo.
    - Uma aba que abre o board pede o estado atual às outras, para não começar de uma versão salva atrasada.
    - O histórico precisa mudar: em vez de fotos inteiras de `elements`, cada passo guarda as alterações daquele passo (o antes e o depois de cada elemento). O desfazer aplica o inverso sobre o estado atual, e assim desfaz só as alterações da própria aba, sem apagar as que vieram da outra. É a parte mais trabalhosa.
    - As interações em andamento (arraste, texto em edição) não são interrompidas: as mudanças remotas nos elementos que a aba está mexendo esperam o fim da interação.
    - Funciona igual com `localStorage` ou IndexedDB, então não depende da troca pelo IndexedDB.
  - **Nível 3, CRDT (grande):** usar uma estrutura que mescla edições simultâneas sem conflito, como o Yjs, que também traz o desfazer por usuário. Só compensa se houver colaboração em tempo real entre pessoas, com servidor; nesse caso a sincronização entre abas vem junto. Só para abas, é exagero.
  - **Em todos os níveis:** o viewport (zoom e posição), a seleção e a ferramenta ativa continuam separados em cada aba. O nível 1 pode ser um primeiro passo e ser trocado pelo 2 depois, sem retrabalho fora da store.

## Distribuição

### Publicar o board como biblioteca npm

- [ ] **O quê:** separar o board (canvas, toolbar, barra de estilo, menu, exportação) num pacote npm que outros projetos React instalam e usam como um componente, por exemplo `<Whiteboard initialData={...} onChange={...} />`. O app atual (lista de boards e rotas) passa a ser um usuário desse pacote.
- **Problemas de hoje:**
  - **Store global:** `useBoardStore` é um único store criado no módulo. Dois boards na mesma página dividiriam o estado. Trocar por um store criado por instância (`createStore` do zustand) e entregue por contexto (`BoardProvider`), com os componentes e o `useShortcuts` lendo do contexto. Os `useBoardStore.getState()` das interações viram o `getState` do store da instância.
  - **Persistência e rotas:** o `Board` usa `useNavigate` (botão "Todos os boards"), a store salva no `localStorage` sozinha e escuta o `pagehide`, e o `Board` muda o `document.title`. No pacote, o board recebe os dados e avisa das mudanças (`initialData`, `onChange` com os elementos, o viewport e o nome), e quem usa decide onde salvar. O botão de voltar, o título da página e as preferências da grade viram props ou callbacks opcionais. O `persistence.ts` e o `homeRoute`/`boardRoute` ficam no app.
  - **Teclado:** `useShortcuts` e o `Canvas` ouvem o `keydown` do `window`, então capturariam teclas da página inteira. No pacote, ouvir só quando o foco estiver dentro do board (listener no contêiner com `tabIndex`) ou com uma prop para ligar os atalhos globais.
  - **Tamanho:** o `.board` usa `100vw`/`100vh`. Passar a ocupar o contêiner pai (`width/height: 100%`), com o canvas medindo o próprio elemento (`ResizeObserver`).
  - **Tema e estilos:** o `applyTheme` grava as variáveis no `document.documentElement`. Gravar no elemento raiz do board, aceitar um tema por prop (o `renderScene` e o `renderElement` já recebem o tema e o esquema de cores) e prefixar as variáveis (`--wb-*`) para não colidir com as do projeto hospedeiro. Os SCSS modules viram um CSS gerado no build, importado pelo usuário (`import "pacote/style.css"`).
  - **Fontes:** hoje vêm do `<link>` do `index.html`. O pacote pode documentar o `<link>` necessário, trazer as fontes no CSS (`@font-face` com os arquivos no pacote) ou aceitar as famílias por prop. Decidir na hora.
  - **Portais:** `Popover`, `Tooltip`, `Modal` e `Toast` vão para o `document.body`. Funciona, mas os estilos e o tema precisam valer lá também (variáveis no portal, ou portal dentro da raiz do board).
- **Como:**
  - **Estrutura:** monorepo com workspaces do npm: `packages/whiteboard` (o pacote) e `apps/web` (o app atual). Ou uma pasta `src/whiteboard/` com um build de biblioteca à parte, se o monorepo parecer exagero. O `src/lib/` já é TypeScript puro e quase não muda.
  - **Build:** modo biblioteca do Vite (`build.lib`) gerando ESM, com `react`, `react-dom` e `react/jsx-runtime` como `peerDependencies` e externos. Os tipos saem com `vite-plugin-dts` ou com `tsc --emitDeclarationOnly`. `roughjs`, `zustand`, `nanoid`, `react-icons` e `react-color` ficam como dependências comuns.
  - **API pública:** o componente `Whiteboard`, os tipos do modelo (`BoardElement`, `BoardFile`), as funções de arquivo (`serializeBoardFile`/`parseBoardFile`), as de exportar imagem (`renderToCanvas`, `renderToSvg`) e talvez um ref imperativo (`ref.current.exportPng()`, `ref.current.setElements()`). O resto fica interno, para poder mudar sem quebrar quem usa.
  - **Configuração:** quem usa escolhe o que aparece e o que funciona, com uma prop de configuração (por exemplo, `config`) em que tudo é opcional e o padrão é o app completo de hoje.
    - **Funcionalidades:** ligar ou desligar cada parte, como ferramentas (lista das que aparecem, `tools: ["selection", "rectangle", "arrow"]`), barra de estilo, menu do board, abrir e salvar arquivo, exportar imagem, grade, zoom, ajuda e a importação por arrastar arquivo.
    - **Modo somente leitura:** só pan, zoom e exportar, sem selecionar nem editar, para mostrar diagramas prontos.
    - **Valores iniciais e limites:** estilo inicial das formas, paleta oferecida no seletor de cor, grade inicial, níveis de zoom.
    - **Fonte única:** um tipo `WhiteboardConfig` com os padrões e uma função que mescla o que veio por prop (`resolveConfig`), guardado no contexto da instância. A toolbar filtra o `TOOLS`, o menu filtra as entradas (e some se ficar vazio), a ajuda mostra só o que está ligado, e o `useShortcuts` ignora os atalhos de funcionalidades desligadas. Desligar uma parte esconde o botão e também o atalho, para não sobrar caminho escondido.
  - **Formato salvo:** quem usar o pacote guarda os dados, então a decisão de [não ter versão nem migrações](#decisões-tomadas) precisa ser revista antes da primeira versão publicada: o `.whiteboard.json` ganha um campo de versão e as migrações voltam.
  - **Publicação:** versionamento semântico, `CHANGELOG` e um exemplo mínimo de uso no README do pacote. Começar como `0.x` enquanto a API muda.
- **Por quê:** permite usar o quadro branco dentro de outros projetos (documentação, ferramentas internas, apps com diagramas) sem copiar o código, mantendo uma base só.
- **Ordem:** depende pouco dos outros itens, mas fica mais barato se as decisões acima forem seguidas desde já. A troca pelo IndexedDB mexe na persistência, então vale fazê-la já pensando no pacote. O tema ativo hoje sai da store (`themeMode`) e é aplicado no `document.documentElement` pelo `App`; no pacote, passa a ser por instância.
