# Roadmap

O que falta fazer no quadro branco que mistura **Excalidraw** (desenho livre, visual de esboço) com **draw.io** (diagramas estruturados, formas conectadas, fluxogramas).

Os itens concluídos saem deste arquivo: o que o app já faz está no [README.md](README.md), a arquitetura no [CLAUDE.md](CLAUDE.md), e os detalhes de implementação de cada item feito ficam no histórico do git (as versões anteriores deste arquivo e as mensagens de commit).

## Ordem sugerida

1. [Duplicar, copiar e colar, mover pelo teclado](#duplicar-copiar-e-colar-mover-pelo-teclado) e os [ajustes pequenos](#ajustes-pequenos): atalhos que fazem falta no uso.
2. [Biblioteca de formas prontas](#biblioteca-de-formas-prontas): o maior item que falta, dividido por grupo.
3. [Tema escuro](#tema-escuro).
4. A decidir: [IndexedDB](#trocar-o-localstorage-pelo-indexeddb) e [sincronizar abas](#sincronizar-duas-abas-abertas-no-mesmo-board).

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
- O atalho de exportar imagem é `Ctrl+Shift+E`, como no Excalidraw, mesmo abrindo o monitor de rede no Firefox (a página não consegue impedir). Lá, vale o botão.

## Edição

### Duplicar, copiar e colar, mover pelo teclado

- [ ] **O quê:** duplicar a seleção (`Ctrl+D`), copiar, recortar e colar (`Ctrl+C`, `Ctrl+X`, `Ctrl+V`) e mover a seleção pelas setas do teclado (com Shift, passos maiores).
- **Como:** atalhos novos em `useShortcuts.ts` e `shortcuts.ts`, usando ações que a store já tem. As cópias ganham IDs e `seed` novos e entram deslocadas da original. Ao copiar setas ligadas, as ligações passam a apontar para as cópias das formas quando as duas estão na cópia; uma ponta ligada a uma forma que não foi copiada fica solta. Colar entre boards e entre abas pode usar a área de transferência do sistema com um JSON no mesmo formato do `.whiteboard.json`.
- **Por quê:** montar diagramas repetitivos (várias caixas iguais num fluxograma) hoje exige desenhar e estilizar cada forma de novo.

### Agrupar elementos

- [ ] **O quê:** agrupar a seleção (`Ctrl+G`) para mover, redimensionar e girar como um bloco, e desagrupar (`Ctrl+Shift+G`).
- **Como:** um `groupIds` nos elementos (como no Excalidraw), com o clique num elemento selecionando o grupo inteiro e o duplo clique entrando no grupo. A seleção, o quadro e as alças já tratam vários elementos.
- **Por quê:** os modelos compostos da biblioteca de formas dependem disso, e é comum querer mover um pedaço do diagrama inteiro.

### Ajustes pequenos

- [ ] `Enter` numa forma ou seta selecionada abre a edição do rótulo, como no Excalidraw. Hoje só o duplo clique abre.
- [ ] Arrastar as pontas ou os pontos de uma seta existente com Shift encaixa em ângulos de 45°, como já acontece ao desenhar.
- [ ] Opcional: arrastar o texto de uma seta ao longo do caminho dela, em vez de ficar sempre no meio.

## Diagramas

### Biblioteca de formas prontas

- [ ] **O quê:** um painel com formas prontas agrupadas por tipo de diagrama, como as bibliotecas do draw.io. O usuário arrasta (ou clica) uma forma do painel para o quadro, e ela já vem com o desenho, o tamanho, os pontos de conexão e os campos de texto certos. Grupos iniciais:
  - **Fluxograma:** processo (retângulo), decisão (losango), início/fim (terminal arredondado), entrada/saída (paralelogramo), documento, banco de dados (cilindro), subprocesso, conector (círculo pequeno) e nota.
  - **UML:** classe (nome, atributos e métodos em compartimentos), interface, ator (boneco), caso de uso (elipse), pacote, nota com canto dobrado, e os elementos de sequência (participante com linha de vida e ativação).
  - **Entidade-relacionamento:** entidade (título e lista de atributos, com marcação de chave), entidade fraca, relacionamento (losango) e atributo (elipse). Combina com as pontas pé de galinha que as setas já têm.
  - **Outros (decidir na hora):** formas básicas extras (triângulo, hexágono, estrela, nuvem, seta grossa) e contêineres (raia, grupo com título).
- **Como:**
  - **Formas novas no modelo:** cada desenho novo vira um tipo na união `BoardElement` com o seu `ShapeUtil` (`draw`, `hitTest`, `resize`, `getBorderOffset`, `getConnectionPoints` e `getLabelArea`), como as formas atuais. Para não multiplicar módulos, avaliar um tipo genérico (por exemplo, `shape` com um campo `kind`) cujo contorno vem de uma função de caminho por formato, desenhado com o `roughjs` (`rc.path` ou `rc.polygon`), para manter o traço de esboço e a ligação das setas.
  - **Formas com compartimentos** (classe UML, entidade ER): precisam de mais de um campo de texto. O rótulo atual (`label`) é um só, então o modelo ganha uma lista de seções (`compartments`, cada uma com texto e altura) e o duplo clique edita a seção sob o cursor. A altura de cada seção cresce com o texto.
  - **Modelos compostos:** o que for melhor como um conjunto de elementos simples (por exemplo, uma linha de vida da sequência, ou um ator com o nome embaixo) entra como um modelo que cria vários elementos de uma vez. Depende de agrupar elementos (veja [Agrupar elementos](#agrupar-elementos)); até lá, preferir formas de um elemento só.
  - **Painel:** uma barra lateral recolhível (ou um botão na toolbar que abre um `Popover` grande) com busca e os grupos em seções recolhíveis. Cada item mostra uma prévia desenhada com o mesmo `draw` do canvas num `<canvas>` pequeno, ou um SVG gerado da mesma geometria, como os ícones das pontas das setas. O visual segue a identidade própria da interface.
  - **Inserção:** arrastar do painel e soltar no quadro (convertendo o ponto com `screenToWorld`), ou clicar para inserir no centro da tela. A forma nova usa o `currentStyle` e fica selecionada, como as criadas pelas ferramentas.
  - **Registro:** um catálogo único (`src/lib/elements/library.ts`) com id, nome, grupo, palavras de busca e a função que cria o elemento, para o painel e a busca lerem do mesmo lugar.
- **Por quê:** é a parte do draw.io que mais acelera montar diagramas. Hoje um fluxograma ou um diagrama ER precisa ser montado com retângulos, losangos e elipses soltos, e formas como cilindro, documento, classe UML ou ator não existem.
- **Divisão sugerida:** é grande, então pode entrar por grupo: fluxograma primeiro (formas de um campo de texto só), depois ER e UML (que precisam dos compartimentos).

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
