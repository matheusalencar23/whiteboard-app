# Roadmap

O que falta fazer no quadro branco que mistura **Excalidraw** (desenho livre, visual de esboço) com **draw.io** (diagramas estruturados, formas conectadas, fluxogramas).

Os itens concluídos saem deste arquivo: o que o app já faz está no [README.md](README.md), a arquitetura no [CLAUDE.md](CLAUDE.md), e os detalhes de implementação de cada item feito ficam no histórico do git (as versões anteriores deste arquivo e as mensagens de commit).

## Ordem sugerida

1. [Sublinhado](#sublinhado), junto com o atributo chave do ER.
2. Biblioteca de formas: [básicas e anotações](#básicas-e-anotações).
3. Biblioteca de formas: [detalhes preenchidos e cantos arredondados](#detalhes-preenchidos-e-cantos-arredondados), depois [UML estados e atividades](#uml-estados-e-atividades) e [extras do fluxograma](#extras-do-fluxograma).
4. A decidir: [tabelas](#tabelas). Se entrar, pode vir antes do item 3, porque também serve à entidade ER.
5. Biblioteca de formas: [arquitetura](#arquitetura-e-c4) e [wireframe](#wireframe).
6. [Tema escuro](#tema-escuro).
7. Depois: [contêineres com conteúdo vinculado](#contêineres) e [BPMN](#bpmn).
8. A decidir: [IndexedDB](#trocar-o-localstorage-pelo-indexeddb) e [sincronizar abas](#sincronizar-duas-abas-abertas-no-mesmo-board).
9. Depois: [publicar o board como biblioteca npm](#publicar-o-board-como-biblioteca-npm).

## Decisões tomadas

Valem para todo item novo.

- O traço de esboço do `roughjs` é o padrão. Cada elemento guarda um `seed` para o traço não mudar a cada redesenho, e o traço limpo é `roughness: 0`.
- O lápis não usa o `roughjs`: desenha uma curva suave direto no canvas, porque o roughjs duplicaria e tremeria o traço da mão.
- Formas sem preenchimento só são clicáveis pela borda, como no Excalidraw. Para mover uma forma vazia já selecionada, dá para arrastar pelo meio da caixa de seleção.
- As funcionalidades seguem o Excalidraw e o draw.io, mas o visual da interface é próprio ("caderno técnico"): toolbar, painéis, cores, seleção e alças não copiam o Excalidraw. Todos os valores visuais ficam em `src/lib/theme.ts`.
- Depois de criar uma forma, uma seta ou um texto, a ferramenta volta para a seleção com o elemento novo selecionado. O lápis continua ativo.
- A grade de fundo é só visual. O encaixe na grade e as guias de alinhamento foram testados e descartados.
- Enquanto o projeto está em desenvolvimento, o formato salvo (no navegador e no `.whiteboard.json`) não tem número de versão nem migrações, para não poluir o código. Um board num formato antigo não passa na validação e não abre. As versões e migrações voltam quando houver usuários com dados a preservar.
- As preferências da grade valem para todos os boards e não vão no arquivo do board.
- O board vai virar uma biblioteca npm (veja [Publicar o board como biblioteca npm](#publicar-o-board-como-biblioteca-npm)). Código novo do board não deve depender das rotas, do `localStorage`, do `document` inteiro ou do tamanho da janela: navegação e persistência entram por funções e callbacks, os eventos de teclado ficam presos ao board e as medidas vêm do contêiner, não de `100vw`/`100vh`. Cada funcionalidade nova deve poder ser desligada pela configuração da biblioteca: botão, atalho e entrada na ajuda saem de um mesmo lugar (como `tools.ts` e `shortcuts.ts`), para serem escondidos juntos.
- O atalho de exportar imagem é `Ctrl+Shift+E`, como no Excalidraw, mesmo abrindo o monitor de rede no Firefox (a página não consegue impedir). Lá, vale o botão.

## Texto

### Sublinhado

- [ ] **O quê:** sublinhar o texto inteiro de um elemento (texto solto, rótulo, texto da seta e seções da entidade), como o negrito e o itálico: botão no grupo "Texto" da barra de estilo e atalho `Ctrl+U`. No grupo ER, um item novo "Atributo chave": elipse com o nome sublinhado (notação de Chen).
- **Como:**
  - **Modelo:** `underline` no `TextStyle`. Na validação, opcional e falso quando ausente, para os boards salvos continuarem abrindo. Entra no `textSelectors`, no `applyTextStyle` (que já é genérico) e no `DEFAULT_TEXT_STYLE`.
  - **Desenho:** o canvas não sublinha sozinho. Hoje o texto é desenhado em três lugares quase iguais (`textUtil.draw`, `drawLabel` no `registry.ts` e `drawCompartmentsText`); juntar os três num ajudante único que desenha as linhas e, se for o caso, o traço embaixo de cada uma. A largura de cada linha vem do `measureLineWidths`, o início do traço depende do alinhamento, e a espessura e a distância da linha de base são proporcionais ao tamanho da fonte.
  - **SVG:** o traço é um retângulo preenchido, que o `SvgContext` já suporta.
  - **Editor:** `text-decoration: underline` no `<textarea>`, com `text-underline-offset` e `text-decoration-thickness` iguais aos do canvas.
  - **Atalho:** `Ctrl+U` abre o código-fonte no navegador, mas a página consegue impedir (o Google Docs faz isso). Entra no `shortcuts.ts` e no `useShortcuts`, como o negrito.
- **Fora do escopo:** sublinhar só uma palavra ou uma linha. Isso é texto rico (trechos com estilos diferentes) e mudaria o modelo do texto, a quebra de linha, a medição e o editor, que teria de virar `contenteditable`. Na entidade em tabela, a chave continua marcada no texto ("PK"/"FK"), como no draw.io.
- **Por quê:** completa a notação de Chen e é um estilo de texto comum. Custo pequeno (cerca de meio dia).

## Diagramas

### Biblioteca de formas prontas

O painel, o catálogo, o tipo genérico `shape`, a forma de compartimentos (`compartments`) e os grupos do fluxograma, de entidade-relacionamento e de UML já existem (veja o [CLAUDE.md](CLAUDE.md)). Um formato novo entra em `SHAPE_KINDS` e em `SHAPE_KIND_DEFINITIONS`, e o item, em `LIBRARY_ITEMS`. Os pacotes abaixo não precisam seguir o draw.io; ele é só inspiração. Silhuetas simples combinam com o traço de esboço; ícones detalhados (como os da AWS) não.

#### Básicas e anotações

- [ ] **Básicas:** triângulo, hexágono, pentágono, octógono, trapézio, estrela, cruz, seta grossa (simples e dupla) e cubo. Só contorno e detalhes: custo pequeno.
- [ ] **Anotações:** balão de fala, nuvem, nuvem de pensamento, post-it (a nota já com preenchimento amarelo, pelo `style` da parte) e chave `{`. É o uso mais de quadro branco; o balão e a nuvem são os mais pedidos. O rabo do balão fica fora da área do texto, mas dentro da caixa.

#### Detalhes preenchidos e cantos arredondados

- [ ] **Detalhes preenchidos:** hoje os `details` dos formatos só têm contorno. Uma opção para um detalhe ser preenchido com a cor do contorno (o círculo do estado inicial, a barra de bifurcação, os marcadores dos gateways do BPMN). Pequeno.
- [ ] **Cantos arredondados como estilo:** uma opção de estilo no retângulo (e talvez no losango), em vez de um formato "retângulo arredondado", para valer também na ferramenta Retângulo, como no Excalidraw. É a caixa mais usada em diagramas (estado UML, caixas genéricas). O desenho passa para `rc.path` (o caminho com arcos já existe no `roundedRectFigure`) e o clique nos cantos pode ficar aproximado. Pequeno a médio.

#### UML estados e atividades

- [ ] Estado (retângulo arredondado), estado inicial (círculo cheio), estado final (alvo), barra de bifurcação e junção, componente e nó (cubo). Depende dos detalhes preenchidos e dos cantos arredondados.

#### Extras do fluxograma

- [ ] Preparação (hexágono), multidocumento, atraso, entrada manual, conector fora de página e exibição.

#### Arquitetura e C4

- [ ] Servidor, fila (cilindro deitado), dispositivo ou monitor, celular, e a pessoa e o sistema do C4. Silhuetas simples.

#### Wireframe

- [ ] Janela do navegador, botão, campo de texto, checkbox, celular e cartão. Vários são itens compostos (moldura com texto), com o agrupamento que já existe. Médio.

#### Contêineres

- [ ] **Só desenho:** raia horizontal e vertical e grupo com título (faixa de título e área). Pequeno.
- [ ] **Com conteúdo vinculado:** mover o contêiner leva o que está dentro, como no draw.io (ou os frames do Excalidraw). É uma funcionalidade à parte: um vínculo de pai e filhos que mexe na seleção, no movimento, no redimensionamento, no histórico e na ordem de desenho. Grande; avaliar quando os contêineres simples estiverem em uso.

#### BPMN

- [ ] Tarefa, eventos (início, fim, intermediário), gateways (exclusivo, paralelo, inclusivo) e raia. Grupo grande; depende dos detalhes preenchidos e dos contêineres.

#### A avaliar

- Acrescentar e remover seções dos `compartments` pela interface. Hoje o número de seções vem do item da biblioteca: duas na entidade e na interface, três na classe.
- Ligar a linha de vida do participante ao retângulo. Hoje os dois só estão agrupados, porque a folga das pontas ligadas (`BINDING_GAP`) deixaria a linha descolada da caixa; redimensionar o retângulo dentro do grupo não leva a linha junto.
- Lembrar quais grupos do painel estão recolhidos, quando o catálogo crescer.

### Tabelas

- [ ] **A decidir.** Proposta:
  - **O quê:** uma tabela de verdade, com linhas e colunas, para comparações, listas, planilhas pequenas e entidades de banco com colunas (chave, nome, tipo), como a tabela do draw.io. Inserida pela biblioteca (3×3) e criada ao colar dados de uma planilha.
  - **Nome do tipo:** `table`. Os compartimentos, que usavam esse nome, já foram renomeados para `compartments`.
  - **Modelo:** larguras das colunas (`columns: number[]`), células (`cells: { text }[][]`), um `textStyle` para a tabela inteira e `headerRow` (a primeira linha em negrito e com o preenchimento). A altura de cada linha não é guardada: sai do texto mais alto da linha, como as seções da entidade (a última linha fica com a sobra). Largura do elemento é a soma das colunas; redimensionar escala as colunas.
  - **Desenho:** contorno e linhas internas com o roughjs (um traço por borda, com `seed` derivado), texto com o mesmo ajudante do sublinhado. Clique em qualquer ponto da tabela seleciona, como a entidade.
  - **Edição:** duplo clique edita a célula sob o cursor, com o mesmo `<textarea>` dos rótulos. `Tab` e `Shift+Tab` passam para a célula seguinte e a anterior (criando uma linha nova depois da última célula, como em editores de texto); `Ctrl+Enter` e `Esc` terminam.
  - **Estrutura:** com a tabela selecionada, a barra de estilo ganha um grupo "Tabela" (inserir linha acima ou abaixo, coluna à esquerda ou à direita, apagar linha ou coluna), que age sobre a última célula clicada (um cursor de célula guardado no Canvas). Arrastar uma borda interna entre colunas muda a largura (uma `Interaction` nova).
  - **Colar:** texto separado por tabulações (o que planilhas e tabelas HTML colocam na área de transferência) vira uma tabela no `useClipboard`, em vez de um texto solto. Pequeno e muito útil.
  - **Ligações:** de início, as setas ligam nos meios dos lados da tabela. Depois, pontos de conexão por linha (esquerda e direita de cada linha), para ligar chaves estrangeiras no ER; isso esbarra no mesmo problema de pontos que mudam de fração quando as linhas mudam de altura, e talvez peça guardar o índice da linha na ligação.
  - **Fora do escopo:** mesclar células, estilo por célula e fórmulas.
  - **Custo:** médio a grande, em etapas: (1) modelo, desenho, edição com `Tab`, item na biblioteca e colar de planilha; (2) inserir e apagar linhas e colunas e redimensionar colunas; (3) cabeçalho destacado e alinhamento por coluna; (4) pontos de conexão por linha.
  - **Relação com a entidade:** a entidade ER poderia virar uma tabela de duas ou três colunas, e os compartimentos ficariam para a classe UML.

## Visual

### Tema escuro

- [ ] **O quê:** um tema escuro para a interface e o quadro, à escolha do usuário (claro, escuro ou seguir o sistema), com os desenhos continuando legíveis nos dois temas.
- **Como:**
  - **Interface:** um `darkTheme` em `src/lib/theme.ts`, com os mesmos tokens do `notebookTheme` (superfícies, bordas, texto, destaque, sombras, grade, seleção, medidas). O `applyTheme` já transforma os tokens em variáveis CSS, então basta chamá-lo de novo na troca. Nenhuma cor da interface está fora do tema hoje.
  - **Tema ativo no canvas:** o canvas e o `renderScene` leem `theme` direto, como constante. Trocar por uma referência ao tema ativo (uma função `getTheme()` ou o tema passado ao `renderScene`) e redesenhar quando ele mudar.
  - **Preferência:** `themeMode` (`light`, `dark` ou `system`) na store, salvo junto das preferências da grade. No `system`, ouvir o `matchMedia("(prefers-color-scheme: dark)")`. Um botão no canto (perto da ajuda) ou na toolbar alterna o tema, e o atalho entra no `shortcuts.ts` e no `useShortcuts`.
  - **Cores dos elementos:** os elementos guardam cores absolutas (o padrão é `palette.ink`, quase preto), que somem no fundo escuro. O modelo continua guardando a cor do tema claro, e o escuro desenha uma versão adaptada: uma função pura `adaptColor` inverte a luminosidade (HSL) e mantém o matiz e a saturação, de modo que o quase preto vira cinza claro e um preenchimento claro vira escuro. Aplicar no `renderElement`, com uma cópia do estilo adaptada (com cache por elemento, para não criar objetos a cada quadro), cobrindo contorno, preenchimento e a cor do texto (`resolveTextColor`). O `<textarea>` do `TextEditor` e as amostras do seletor de cor mostram a cor adaptada, mas o valor escolhido e salvo continua o claro. Assim o mesmo board abre certo nos dois temas e o `.whiteboard.json` não muda.
  - **Exportação:** PNG e SVG continuam claros por padrão. O diálogo ganha a opção "Fundo escuro", que usa as cores adaptadas e um token `canvas.exportBackground` do tema escuro.
  - **Descartado:** inverter o canvas com um filtro CSS (`invert` + `hue-rotate`, como o Excalidraw). É mais simples, mas inverte também a seleção e a grade, muda o tom das cores e faz a cor desenhada não bater com a escolhida no seletor.
- **Por quê:** quadros brancos são muito usados por muito tempo seguido e em ambientes escuros. O tema já é a fonte única das cores, então o custo fica concentrado na adaptação das cores dos elementos.

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
  - **Tema e estilos:** o `applyTheme` grava as variáveis no `document.documentElement`. Gravar no elemento raiz do board, aceitar um tema por prop (combina com o [tema escuro](#tema-escuro)) e prefixar as variáveis (`--wb-*`) para não colidir com as do projeto hospedeiro. Os SCSS modules viram um CSS gerado no build, importado pelo usuário (`import "pacote/style.css"`).
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
- **Ordem:** depende pouco dos outros itens, mas fica mais barato se as decisões acima forem seguidas desde já. O tema escuro e a troca pelo IndexedDB mexem nas mesmas partes (tema por instância, persistência fora do board), então vale fazê-los já pensando no pacote.
