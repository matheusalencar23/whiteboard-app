# Roadmap

Um quadro branco que mistura **Excalidraw** (desenho livre, visual de esboço) com **draw.io** (diagramas estruturados, formas conectadas, fluxogramas).

Marque os itens com `[x]` conforme forem concluídos.

## Estado atual

- Rota `/board` com um canvas em tela cheia (resolução ajustada para telas HiDPI).
- Toolbar vertical na lateral esquerda com as ferramentas mão, seleção, retângulo, losango, elipse, seta, lápis e texto, além de desfazer, refazer, apagar e a grade. Cada botão tem um tooltip com o nome e o atalho.
- Seleção por clique, Shift + clique e caixa. Mover, redimensionar pelas 8 alças, apagar, e desfazer/refazer.
- Rotação pela alça acima da seleção, de um elemento ou de vários juntos (Shift prende em 15°).
- Shift mantém a proporção ao redimensionar e, ao desenhar, força quadrado, círculo ou seta em ângulos de 45°.
- Câmera com pan (roda do mouse, Shift + roda, botão do meio ou Espaço + arrastar) e zoom (Ctrl/Cmd + roda ou pinça no trackpad, centrado no cursor).
- Estado em uma store do zustand. `elements`, `viewport` e as preferências da grade são salvos sozinhos no `localStorage` (`src/lib/persistence.ts`). Durante o desenvolvimento, o formato salvo não tem versão nem migração: se mudar, o board antigo é descartado.
- Setas ligadas às formas: acompanham quando a forma é movida ou redimensionada, e as pontas podem ser arrastadas para ligar, desligar ou trocar de forma. Toda ponta ligada sai de um ponto de conexão (meio dos lados ou vértices do losango). Soltar sobre um ponto prende a ponta nele. Soltar no corpo da forma deixa a ponta automática: ela sai pelo ponto virado para a outra ponta e troca de lado quando as formas se movem. As duas pontas podem se ligar à mesma forma, formando um laço.
- Texto dentro das formas: duplo clique num retângulo, elipse ou losango edita um rótulo centralizado, que quebra linha na largura da forma.
- Texto nas setas: duplo clique numa seta edita um texto no meio do caminho dela, que interrompe a linha e acompanha a seta quando ela é recalculada.
- Três tipos de seta, escolhidos no painel lateral: reta, curva e ortogonal. Na reta e na curva, a alça no meio de cada trecho cria um ponto que pode ser arrastado, como no Excalidraw. A ortogonal tem rota automática, que sai perpendicular ao lado da forma e contorna as formas das pontas.
- Pontas das setas escolhidas de forma independente no início e no fim, com 16 formatos inspirados no draw.io: básicas (nenhuma, seta aberta, barra, X), UML (triângulo, losango e círculo, cheios ou vazados) e a notação pé de galinha do diagrama entidade-relacionamento.
- Barra de estilo flutuante acima da seleção (ou no topo, com uma ferramenta de desenho ativa), com submenus para o contorno (cor, espessura, estilo do traço, esboço, opacidade), o preenchimento (cor, hachura ou sólido, esboço, opacidade) e, nas setas, o tipo e as pontas. O estilo escolhido vale para os próximos elementos.
- Grade de fundo em pontos ou linhas, à escolha do usuário. Fica ligada por padrão e é só visual (sem encaixe).
- Identidade visual própria ("caderno técnico"): branco, cinzas e destaque azul suave, com todos os valores em `src/lib/theme.ts`.

### Atalhos

| Ação | Atalho |
|---|---|
| Ferramentas | `H` mão, `V`/`1` seleção, `R`/`2` retângulo, `D`/`3` losango, `O`/`4` elipse, `A`/`5` seta, `P`/`6` lápis, `T`/`7` texto |
| Desfazer / refazer | `Ctrl+Z` / `Ctrl+Shift+Z` ou `Ctrl+Y` |
| Selecionar tudo | `Ctrl+A` |
| Apagar seleção | `Delete` ou `Backspace` |
| Limpar seleção | `Esc` |
| Mostrar / esconder a grade | `G` |
| Alternar a grade entre pontos e linhas | `Shift+G` |
| Manter proporção / quadrado / seta em 45° | Segurar `Shift` ao redimensionar ou desenhar |
| Girar em passos de 15° | Segurar `Shift` ao girar |
| Editar texto | Duplo clique no texto. Duplo clique no vazio cria um texto novo. `Esc` ou `Ctrl+Enter` confirmam. |

## Decisões tomadas

- Visual de esboço com `roughjs` é o padrão desde a etapa 1. Cada elemento guarda um `seed` para o traço não mudar a cada redesenho. O traço limpo é `roughness: 0` no estilo do elemento.
- O lápis (desenho livre) não usa o `roughjs`. Ele desenha uma curva suave direto no canvas, porque o roughjs duplicaria e tremeria o traço da mão.
- Formas sem preenchimento só são clicáveis pela borda, como no Excalidraw. Para mover uma forma vazia já selecionada, dá para arrastar pelo meio da caixa de seleção.
- As funcionalidades seguem o Excalidraw e o draw.io, mas o visual da interface é próprio: toolbar, painéis, cores, seleção e alças não devem copiar o Excalidraw. O `roughjs` continua sendo o traço das formas. Veja o item [4.2](#42-identidade-visual-própria).
- Depois de criar uma forma, uma seta ou um texto, a ferramenta volta para a seleção com o elemento novo selecionado. O lápis continua ativo.
- Enquanto o projeto está em desenvolvimento, o formato salvo no `localStorage` não tem número de versão nem migrações, para não poluir o código. Um board salvo num formato antigo não passa na validação e abre vazio. As versões e migrações voltam quando houver usuários com dados a preservar.

## Próximos passos (em ordem)

Esta é a ordem recomendada de trabalho a partir de agora. Ela não segue a numeração das etapas: um item da etapa 5 foi adiantado porque facilita testar a etapa 3.

### 1. Fazer um commit das etapas 1 e 2

- [x] **Feito** nos commits `23f0fb9`, `b73fe3e` e `38ef69b`.
- **O quê:** registrar no git todo o trabalho das etapas 1 e 2. Hoje está tudo fora do git: as dependências novas (`roughjs`), cerca de 15 arquivos novos e a remoção do `src/components/Canvas/Board.tsx` antigo.
- **Como:** um commit único, ou dois commits separados ("etapa 1: fundação" e "etapa 2: ferramentas e edição"), com a mensagem em português, seguindo o padrão do repositório. Separar por etapa deixa o histórico mais fácil de ler, mas exige escolher arquivo a arquivo o que entra em cada commit, porque as duas etapas mexeram nos mesmos arquivos.
- **Por quê:** a etapa 3 vai mudar o modelo da seta, que é a parte mais delicada do código até aqui. Com um ponto salvo antes, dá para comparar o antes e o depois com `git diff` e voltar atrás se algo der errado.

### 2. Salvamento automático no `localStorage` (adiantado da etapa 5)

- [x] **Feito** em `src/lib/persistence.ts`, ligado ao fim de `src/store/boardStore.ts`. Também grava o pendente no `pagehide`, para não perder os últimos 300 ms ao recarregar.
- **O quê:** o board é salvo sozinho no navegador e reaparece igual depois de recarregar a página. Só `elements` e `viewport` são salvos. Histórico, seleção e ferramenta ativa começam limpos a cada abertura, como no Excalidraw.
- **Como:**
  - Usar `useBoardStore.subscribe` para observar mudanças em `elements` e `viewport`, e gravar com um *debounce* de uns 300 ms. Sem o debounce, cada movimento do mouse durante um arraste faria um `JSON.stringify` do board inteiro.
  - Ao abrir o board, ler o `localStorage` e usar o valor como estado inicial da store.
  - Se os dados lidos forem inválidos (JSON corrompido ou formato antigo), ignorar e abrir um board vazio, sem travar a página. A versão e as migrações foram tiradas (veja as decisões tomadas).
  - Deixar a lógica em `src/lib/persistence.ts` (ler, gravar e validar), sem React, e ligar à store num ponto só.
- **Por quê:** hoje recarregar a página apaga tudo. Os testes manuais da etapa 3 precisam de diagramas com várias formas e setas, e remontar tudo a cada recarga (inclusive a cada mudança de código, quando o HMR recarrega a página) atrapalha. É uma tarefa pequena, porque a store já guarda dados simples e imutáveis, prontos para virar JSON.

### 3. Etapa 3, na ordem descrita na seção dela

- [ ] Os itens 3.1 (setas ligadas), 3.2 (pontos de conexão) 3.3 (texto dentro das formas), 3.5 (setas ortogonais) e 3.6 (setas curvas, com pontos ajustáveis) estão feitos. O 3.4 (snap e guias) foi descartado, e só a grade de fundo (4.1) ficou. Seguir a ordem dos itens da [etapa 3](#3-diagramas-a-parte-drawio). Do 3.1 ao 3.6, cada item depende do anterior. O 3.7 (texto nas setas) e o 3.8 (formato das pontas) não dependem dos outros e podem ser adiantados. Só a interface do 3.8 espera o painel de estilo (4.3). O 3.9 (lado de saída da seta e laços) corrige problemas das setas ligadas e pode entrar antes do 3.7 e do 3.8. O 3.9, o 3.7 e o 3.8 estão feitos, e a etapa 3 está completa.

As outras pendências da etapa 2 (duplicar e copiar/colar) ficam para quando fizerem falta no uso. Nenhuma bloqueia a etapa 3.

## 1. Fundação

Fazer antes de qualquer ferramenta nova, porque o resto depende disso.

- [x] **Modelo de elementos:** um tipo único com o campo `type` e uma base comum `id, x, y, width, height, rotation, style, seed` (`src/lib/elements/types.ts`).
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

- [x] **A caixa de seleção da seta não inclui a ponta.** Corrigido na etapa 3.1 com o `getBounds` da seta. É um defeito: a caixa vem dos pontos da haste, e a ponta é desenhada além do último ponto. Será corrigido junto com o primeiro item da etapa 3, que já vai mudar o modelo da seta.
- [x] **Shift mantém a proporção.** Ao redimensionar, Shift mantém a proporção. Ao desenhar, força quadrado, círculo ou ângulos de 45° na seta. Detalhes da implementação:
  - `resizeBounds` ([src/lib/selection.ts](src/lib/selection.ts)) recebe `keepAspect`. Nas alças de canto, vale a maior das duas escalas, e a forma pode passar para o outro lado da alça oposta. Nas alças dos lados, a outra medida cresce na mesma escala, centrada no eixo.
  - Na criação, `constrainToSquare` e `snapToAngle` ([src/lib/geometry/constrain.ts](src/lib/geometry/constrain.ts)) ajustam o ponto do cursor. Na seta, a ligação é procurada no ponto já ajustado.
  - Apertar ou soltar o Shift no meio do arraste já atualiza a forma, sem precisar mexer o mouse: o Canvas guarda o último ponto e reaplica a interação (`updateInteraction`) no `keydown`/`keyup` do Shift.
  - Arrastar as pontas ou os pontos de uma seta existente ainda não encaixa em 45°.
- [x] **Girar elementos.** Uma alça acima do quadro da seleção (haste e bolinha) gira a seleção, e Shift prende em passos de 15°. Detalhes da implementação:
  - A seleção tem um quadro (`SelectionFrame`, em [src/lib/selection.ts](src/lib/selection.ts)): a caixa sem rotação e o ângulo em volta do centro dela. Com um elemento só, o quadro gira junto com o elemento. Com vários, o quadro fica alinhado aos eixos (a união das caixas giradas), e só durante o giro ele é desenhado girado (`frameOverride` no overlay). As alças, o clique nelas e o "está dentro do quadro" convertem o ponteiro para o sistema local do quadro.
  - `getElementBounds` passa a devolver a caixa alinhada aos eixos do elemento girado. A caixa sem rotação é `getElementBox`. Isso corrige a caixa da seleção, a seleção por caixa e o obstáculo da seta ortogonal para formas giradas.
  - Redimensionar um elemento girado (`resizeSingleElement`) converte o arraste para o sistema local, redimensiona a caixa e depois desloca o elemento para o ponto fixo (a alça oposta) não sair do lugar no mundo. Com vários elementos, cada um é escalado pelo centro, e um elemento girado recebe a escala projetada nos eixos dele (aproximação, como no Excalidraw).
  - Girar vários elementos gira o centro de cada um em volta do centro do quadro e soma o ângulo à `rotation`. Setas não guardam `rotation`: o giro é aplicado nos pontos, porque ligações e rota ortogonal trabalham em coordenadas de mundo. A seta ortogonal perde os trechos fixos e refaz a rota. Uma seta selecionada sozinha não tem alça de rotação.
  - Os cursores das alças de redimensionar giram junto com o elemento (`getHandleCursor`).
  - O editor de texto gira junto: o texto solto gira em volta do canto superior esquerdo, e o rótulo em volta do centro da forma. `setText` mantém o canto superior esquerdo de um texto girado no lugar quando a largura muda.
  - A seta ortogonal ligada a uma forma girada sai pelo eixo mais próximo da direção do lado da forma, porque a rota continua só horizontal e vertical.
- [ ] **Faltam duplicar (`Ctrl+D`), copiar/colar e mover pelas setas do teclado.** Nunca estiveram no plano. São atalhos novos em [useShortcuts.ts](src/components/Board/useShortcuts.ts) que usam ações que a store já tem. Ao copiar setas ligadas (etapa 3), as ligações precisam apontar para as cópias das formas, não para as originais.

## 3. Diagramas (a parte draw.io)

A parte que diferencia o projeto de um Excalidraw. Os itens estão na ordem de implementação, e cada um usa o que o anterior criou.

### 3.1 Setas ligadas às formas

- [x] **Feito.** A lógica está em `src/lib/elements/bindings.ts`. Detalhes da implementação:
  - Só retângulo, elipse e losango aceitam ligação: são os que têm `getBorderOffset`. A ponta flutuante fica a `BINDING_GAP` (6 unidades de mundo) da borda.
  - A forma alvo é a mais acima cujo interior, com uma folga de 8 px na tela, contém a ponta. Formas sem preenchimento também contam pelo interior. A ponta final só se liga à mesma forma da inicial num laço (item 3.9.2).
  - Mover ou redimensionar uma seta sem as formas a que ela está ligada desliga as pontas (`releaseBindings`), como no Excalidraw.
  - Nesta etapa, toda ligação é flutuante (`anchor: null`). O `anchor` já é respeitado no recálculo e passa a ser preenchido no item 3.2.
  - As alças das pontas ficam preenchidas quando a ponta está ligada.
- **O quê:** ao soltar a ponta de uma seta sobre uma forma, a seta fica ligada a ela. Quando a forma é movida ou redimensionada, a seta acompanha. Inclui poder arrastar as pontas de uma seta já existente, para ligar, desligar ou trocar de forma.
- **Como:**
  - **Modelo:** `ArrowElement` ganha `startBinding` e `endBinding`, cada um `{ elementId, anchor } | null`. O `anchor` é a posição relativa na forma (de 0 a 1 em `x` e `y`), para continuar certa quando a forma muda de tamanho. Com `anchor` vazio, a ligação é "flutuante": a seta mira o centro da forma e para na borda, como no Excalidraw.
  - **Recalcular:** uma função pura `updateBoundArrows(elements, changedIds)` em `src/lib/` acha as setas ligadas às formas que mudaram e recalcula as pontas. Ela é chamada dentro da store, em `updateElements`, `replaceElement` e `deleteElements`. Assim, mover, redimensionar, desfazer e qualquer mudança futura atualizam as setas sem cada interação lembrar disso.
  - **Borda da forma:** cada `ShapeUtil` ganha uma função que, dada uma direção, devolve o ponto da borda (retângulo, losango e elipse têm fórmulas diferentes). É isso que faz a seta flutuante parar na borda, em vez de entrar na forma.
  - **Apagar uma forma:** as setas ligadas a ela não são apagadas. A ligação vira `null` e a ponta fica onde estava.
  - **Interação:** a seleção de uma seta mostra alças nas pontas, em vez das 8 alças de caixa. Ao arrastar uma ponta, a forma sob o cursor fica destacada para mostrar onde a seta vai ligar.
  - **Pendência da etapa 2:** a caixa da seta passa a incluir a ponta. O `ShapeUtil` ganha um `getBounds` opcional, e a seta o implementa.
- **Por quê:** é a base do lado draw.io. Pontos de conexão, setas ortogonais e fluxogramas que se reorganizam dependem de a seta saber a que forma está ligada. Fazendo a recalculação dentro da store, o resto do código não precisa saber que ligações existem.

### 3.2 Pontos de conexão

- [x] **Feito.** Detalhes da implementação:
  - `findBinding` em `bindings.ts` escolhe o ponto de conexão a até 12 px de tela do cursor. Longe dos pontos, mas sobre a forma, a ligação é flutuante. Um pouco fora da forma (além da folga de 8 px), só liga se estiver perto de um ponto.
  - A ponta presa a um ponto também fica a `BINDING_GAP` da borda, afastada na direção do centro para o ponto, para combinar com a ligação flutuante.
  - Os pontos aparecem na forma destacada, e o ponto escolhido fica maior e preenchido.
- **O quê:** ao passar o mouse sobre uma forma com a ferramenta de seta, ou ao arrastar a ponta de uma seta, aparecem pontos fixos na forma. Soltar a seta perto de um ponto liga a seta exatamente nele.
- **Como:**
  - Cada `ShapeUtil` ganha `getConnectionPoints(element)`, que devolve os pontos em coordenadas relativas (de 0 a 1). Retângulo e elipse: o meio de cada lado. Losango: os 4 vértices.
  - O ponto escolhido vira o `anchor` da ligação criada no item 3.1. Soltar longe dos pontos, mas sobre a forma, mantém a ligação flutuante.
  - Os pontos são desenhados na camada de seleção do `renderScene`, com tamanho fixo na tela (dividido pelo zoom), igual às alças.
- **Por quê:** no draw.io, as setas saem de lugares previsíveis (topo, lados, base), o que deixa os diagramas organizados. A ligação flutuante do Excalidraw é boa para rascunhos, mas fluxogramas pedem precisão. Ter os dois modos cobre os dois usos.

### 3.3 Texto dentro das formas

- [x] **Feito.** Detalhes da implementação:
  - A área do rótulo vem de `getLabelArea` no `ShapeUtil`: a caixa inteira no retângulo, o retângulo inscrito na elipse (`1/√2` da caixa) e no losango (metade da caixa), menos uma folga de 8 unidades. O desenho, o clique no texto e o layout ficam em `registry.ts` (`getLabelLayout`).
  - `wrapText` em `text.ts` imita o `<textarea>` com `white-space: pre-wrap` e `overflow-wrap: break-word`: quebra nos espaços e, numa palavra maior que a linha, entre letras.
  - O duplo clique acha a forma pela borda, pelo texto do rótulo ou pelo interior (mesmo sem preenchimento). Apagar todo o texto remove o rótulo.
  - Clicar no texto do rótulo seleciona a forma, mesmo sem preenchimento.
  - O rótulo tem fonte fixa (`LABEL_FONT_SIZE`, 20) e não escala ao redimensionar a forma: só quebra as linhas de novo. Texto que não cabe na altura transborda, centralizado.
  - Ainda falta abrir a edição do rótulo com `Enter` numa forma selecionada, como no Excalidraw.
- **O quê:** duplo clique numa forma abre a edição de um texto centralizado dentro dela. O texto quebra linha na largura da forma e se move e redimensiona junto com ela.
- **Como:**
  - As formas de caixa (retângulo, elipse e losango) ganham um campo opcional `label: { text, fontSize }`. A alternativa do Excalidraw, um elemento de texto separado ligado à forma, exigiria sincronizar dois elementos em cada mover, redimensionar, apagar e desfazer.
  - A quebra de linha automática vai para `src/lib/text.ts`, ao lado do `measureText`, para o canvas e o `<textarea>` quebrarem as linhas no mesmo lugar.
  - O `TextEditor` passa a aceitar uma área e um alinhamento, para abrir centralizado sobre a forma.
  - O desenho do rótulo fica num ponto comum do `registry.ts`, não repetido em cada forma.
- **Por quê:** num fluxograma, quase toda forma tem um texto ("Início", "Validar dados?"). Hoje, um texto solto em cima da forma fica para trás quando a forma é movida. O duplo clique numa forma também está sem função agora, então esse é o uso natural dele.

### 3.4 Grid com snap e guias de alinhamento (descartado)

- **Descartado.** Chegou a ser implementado (encaixe na grade ao criar, mover e redimensionar, e guias de alinhamento ao mover), mas não ficou bom no uso e foi removido antes do commit. Ficou só a grade de fundo do item [4.1](#41-grid-de-fundo), que é visual.
- **Se voltar a ser considerado:** começar pelas guias de alinhamento, sem o encaixe na grade, e com um jeito claro de ligar e desligar. O encaixe deve ser mais suave, com uma distância menor e sem puxar o elemento quando o usuário só quer ajustar a posição.

### 3.5 Setas ortogonais

- [x] **Feito.** A rota fica em `src/lib/geometry/orthogonalRoute.ts`, e o recálculo, em `refreshArrow` (`bindings.ts`). Detalhes da implementação:
  - `ArrowElement` tem `routing: "straight" | "curved" | "elbow"`. O tipo é escolhido na barra de estilo (`StyleBar`), que vale para as setas selecionadas e para as próximas.
  - A rota é um menor caminho (Dijkstra) numa grade pequena: as linhas que passam pelas pontas, pelas bordas das formas das pontas (com uma margem de 30 unidades) e pelos corredores entre elas. Cada curva custa o mesmo que 50 unidades de comprimento, então a rota prefere poucas curvas. Ela já contorna as formas das pontas, então a "segunda versão" do plano fica só para outras formas que estejam no caminho.
  - Ponta ligada a um ponto de conexão sai pelo lado desse ponto. Na ligação flutuante, sai do meio do lado virado para a outra ponta. Ponta solta não tem direção obrigatória, então uma seta ortogonal solta vira um "L".
  - **Edição, como no Excalidraw:** cada trecho tem uma alça. Arrastar a alça move o trecho na perpendicular (`moveElbowSegment`), e a seta continua ortogonal. No trecho de uma ponta ligada, a ponta continua presa à forma: entra um trecho curto (até 30 unidades) saindo dela, e o trecho movido vem depois, como um degrau. Numa ponta solta, a própria ponta acompanha o trecho.
  - **Cantos suaves:** cada cotovelo é um arco curto (Bézier quadrática com controle no canto), de raio até 12 unidades e no máximo metade de cada trecho vizinho. Para as emendas não aparecerem, retas e arcos são desenhados separados, com `preserveVertices` (o roughjs não sorteia as pontas), os arcos com pouca aleatoriedade (`maxRandomnessOffset` de 0,3, porque o padrão entorta um arco tão curto) e pontas de traço redondas (escondem o fio do anti-aliasing entre dois traços). Duas tentativas anteriores falharam: um `rc.path` sem `preserveVertices` (emendas abertas) e uma polilinha de pedacinhos (cortes em cunha em cada pedacinho).
  - **Trechos fixos:** cada trecho arrastado entra em `fixedSegments` (relativos a `x, y`, como os `points`). O recálculo monta a rota em pedaços, com a rota automática ligando a ponta inicial ao primeiro trecho fixo, um fixo ao outro e o último à ponta final. Os fixos ficam onde o usuário deixou, e o resto se adapta quando as formas mudam. Ao arrastar um trecho, a ponta do vizinho fixo que encosta nele vai junto. Na ligação automática, a ponta sai pelo lado virado para o trecho fixo mais próximo na rota, e não para a outra ponta. Sem isso, mover a outra forma fazia a seta trocar de lado e voltar até o trecho fixo. Trocar o tipo da seta descarta os trechos fixos.
  - **Soltar um trecho:** duplo clique na alça de um trecho fixo (`releaseElbowSegment`). Só ele volta a ser automático, e os outros fixos continuam, como no Excalidraw. As alças dos trechos fixos ficam mais fortes, para mostrar onde o duplo clique tem efeito.
- **Plano original:** um modo de seta que só faz linhas horizontais e verticais, com cotovelos de 90°, como as conexões do draw.io. A rota sai perpendicular ao lado da forma, faz um "L" ou um "Z" até o destino e chega perpendicular, e é recalculada pelo mesmo `updateBoundArrows` do item 3.1.

### 3.6 Setas curvas e pontos ajustáveis

- [x] **Feito**, no modelo do Excalidraw, em vez do plano original de uma curva automática.
  - **Reta e curva** têm pontos livres. Com uma seta selecionada sozinha, aparece uma alça translúcida no meio de cada trecho. Arrastar essa alça cria um ponto ali, e os pontos do meio também podem ser arrastados (`getArrowHandles` em `selection.ts`).
  - **Na reta**, a linha passa pelos pontos com quinas. **Na curva**, ela passa suave por eles: uma Catmull-Rom convertida em Béziers cúbicas, desenhada com `rc.path` do roughjs, com `preserveVertices`, pouca aleatoriedade nos pontos de controle (0,5) e pontas redondas, como nos cantos da ortogonal. Sem isso, os trechos não se encontravam nos pontos. Com só dois pontos, a curva é uma reta, como no Excalidraw.
  - Clique, caixa de seleção e direção da ponta usam a curva amostrada (`getArrowPath`). A caixa inclui a curva, que pode passar além dos pontos.
  - Trocar entre reta e curva mantém os pontos. Entrar ou sair da ortogonal deixa a seta só com as pontas.
  - Com pontas ligadas, cada ponta mira o ponto vizinho, não o centro da outra forma.
  - **Remover um ponto:** duplo clique num ponto do meio (`removeArrowPoint`). A dobra some, e as pontas ligadas se reajustam. As pontas da seta não podem ser removidas.
  - **Ainda falta:** contornar a forma automaticamente na curva. Hoje, quem contorna é só a ortogonal.
- **Plano original (substituído):** uma curva automática que saía perpendicular à forma e a contornava. Na prática, o controle manual pela alça do meio é o que se espera de um quadro no estilo do Excalidraw.

### 3.7 Texto nas setas

- [x] **Feito.** Detalhes da implementação:
  - `ArrowElement` ganhou o `label` opcional das formas. `LabeledElement` e `isLabeledElement` (`types.ts`) juntam formas de caixa e setas onde o rótulo é tratado, e a persistência valida o `label` da seta.
  - A seta implementa `getLabelArea` como uma faixa de altura zero centrada no meio do caminho (`getPathMidpoint` em `src/lib/geometry/path.ts`, sobre o `getArrowPath`, que já amostra as três rotas). Com isso, `getLabelLayout`, o hit test do texto e o `TextEditor` no modo rótulo funcionam sem caso especial: o texto quebra em 200 unidades (a faixa tem 216, menos a folga de 8 de cada lado) e fica centrado verticalmente no ponto.
  - A linha é interrompida com `ctx.clip("evenodd")` (um retângulo em volta da seta menos a caixa do texto com 4 de folga), em `renderElement`. Foi escolhido em vez do retângulo com a cor de fundo porque este cobriria a grade.
  - `getElementBounds` junta a caixa do texto à da seta, então a seleção e a seleção por caixa incluem o texto. Nas formas de caixa isso não é feito, para um rótulo que transborda não mexer na rota ortogonal nem no quadro da seleção múltipla.
  - Durante a edição, o `TextEditor` avisa cada mudança (`onChange`), e o Canvas desenha a cena com o texto digitado, mas sem desenhá-lo (`hiddenLabelId` no `renderScene`). Assim o recorte da linha acompanha o texto enquanto ele é digitado. Durante a edição, o `getLabelLayout` recebe `keepEmpty` e devolve o layout mesmo com o texto vazio (uma linha de largura zero), para o recorte já existir quando a edição abre e o cursor não sumir atrás de uma seta vertical.
  - Numa seta selecionada, a alça do meio (ou de um trecho ortogonal não fixado) fica embaixo do texto. O duplo clique nela abre a edição do texto em vez de ser engolido pela alça. Arrastar ali continua criando um ponto, como no Excalidraw.
  - Ainda falta o opcional de arrastar o texto ao longo da seta.
- **O quê:** duplo clique numa seta abre a edição de um texto que fica no meio dela, como os rótulos de fluxograma ("sim", "não", "envia pedido"). O texto acompanha a seta quando ela muda, inclusive quando é recalculada por estar ligada a formas.
- **Como:**
  - `ArrowElement` ganha o mesmo campo opcional `label: { text, fontSize }` das formas (item 3.3), reaproveitando `ShapeLabel`, `wrapText` e o `TextEditor` no modo rótulo.
  - **Posição:** o centro do texto fica no ponto do meio do comprimento da seta, medido ao longo do caminho, não no centro da caixa. Assim continua certo com setas de vários pontos, ortogonais (3.5) e curvas (3.6). Uma função `getPointAtLength` em `src/lib/geometry/` serve às três rotas.
  - **Largura:** a seta não tem área própria, então o texto quebra numa largura máxima fixa (por exemplo, 200 unidades de mundo) e fica sem quebra se for curto.
  - **Traço interrompido:** a linha da seta não passa por cima do texto. O jeito mais simples é desenhar um retângulo com a cor de fundo atrás do texto, que muda junto quando o tema e a grade (4.1 e 4.2) existirem. A alternativa mais limpa é recortar a linha com `ctx.clip` na área do texto, sem depender da cor de fundo.
  - **Desenho e clique:** o `getLabelLayout` do `registry.ts` passa a aceitar a seta, com a posição vinda do caminho em vez da `getLabelArea`. O texto entra no hit test e no `getBounds` da seta, para a seleção e a seleção por caixa o incluírem.
  - **Depois, opcional:** arrastar o texto ao longo da seta, guardando a posição como uma fração do comprimento (0 a 1), como no draw.io.
- **Por quê:** em fluxogramas, as setas que saem de uma decisão quase sempre têm texto. Um texto solto ao lado da seta fica para trás quando as formas se movem, que é o mesmo problema que o item 3.3 resolveu nas formas.

### 3.8 Formato das pontas das setas

- [x] **Feito.** Detalhes da implementação:
  - `ArrowElement` tem `startArrowhead` e `endArrowhead` obrigatórios (`ARROWHEADS` em `types.ts`). A store guarda o padrão das setas novas em `arrowheads` (`DEFAULT_ARROWHEADS`: nenhuma no início, seta no fim), e `setArrowhead` muda o padrão e as setas selecionadas num passo do histórico, como o `setArrowRouting`. Como os campos são obrigatórios e não há migração, boards salvos antes disso são descartados ao abrir.
  - Os formatos foram ampliados com base no draw.io, ficando com os que fazem sentido para o projeto: nenhuma, seta, barra, X; triângulo, losango e círculo, cheios ou vazados (herança, composição e agregação do UML); e a notação pé de galinha do ER (um, um e somente um, muitos, um ou muitos, zero ou um, zero ou muitos). Variantes finas, meia seta e outras quase iguais às existentes ficaram de fora.
  - A geometria é pura, em `src/lib/elements/arrowheads.ts`: `getArrowheadParts(formato, ponta, direção, tamanho)` devolve as partes (linhas, polígonos e círculos, cheios ou não) e o recuo da haste. O canvas e os ícones do painel usam a mesma função, então o ícone nunca diverge do desenho.
  - `getArrowheadGeometry` (`arrow.ts`) acha a ponta e a direção pelos dois últimos pontos do caminho amostrado, então segue a tangente nas curvas. O tamanho continua `min(16 + 2 × espessura, metade do último trecho)`.
  - As partes cheias usam `fillStyle: "solid"` na cor do traço. Nos formatos fechados que ficam na ponta, a haste recua até a base (`retreatEnds`), ao longo do último trecho dos pontos, que na curva Catmull-Rom com a ponta repetida é a própria tangente, e na ortogonal mantém o trecho reto. Os círculos vazados do ER ficam no meio da haste, então ela é recortada dentro deles com `ctx.clip("evenodd")` (`getArrowheadHoles`); no ícone, o mesmo recorte é uma máscara SVG.
  - O `getBounds` da seta junta a caixa das duas pontas. O clique continua só na haste.
  - Interface: com 16 formatos, uma fileira de botões por ponta não cabia. A seção "Pontas" do painel é uma prévia da seta: dois botões que se juntam numa seta contínua (os ícones da prévia estendem a haste até a borda do botão, com `bleed` no `ArrowheadIcon`). Cada metade abre um submenu (`Popover` em `src/ui/`, com `side="right"` e o painel como `boundary`) ao lado do painel, alinhado ao botão, sem cobri-lo. O submenu tem os formatos em grade de 6 colunas, agrupados em Básicas, UML e ER. Fecha com Escape, clique fora ou ao escolher. Com seleção mista, o botão mostra reticências. Ao lado da prévia, "Inverter pontas" (`swapArrowheads` na store) troca o início e o fim do padrão e das setas selecionadas.
  - Botões que abrem uma caixa têm um triângulo pequeno no canto inferior direito (`hasPopup` no `IconButton`, que também troca o `aria-pressed` por `aria-haspopup` e `aria-expanded`).
- **O quê:** escolher o formato de cada ponta da seta, no início e no fim, de forma independente. Os formatos são nenhum, seta aberta (o atual), triângulo cheio, círculo, losango e barra. Isso permite setas de mão dupla, linhas sem ponta e as notações de diagramas como UML e ER.
- **Como:**
  - `ArrowElement` ganha `startArrowhead` e `endArrowhead`, cada um `"none" | "arrow" | "triangle" | "circle" | "diamond" | "bar"`. O padrão é `"none"` no início e `"arrow"` no fim, como hoje.
  - **Desenho:** cada formato é uma função que recebe a ponta, a direção do último segmento (ou a tangente, nas curvas do 3.6) e o tamanho, e desenha com o roughjs. Os formatos cheios usam `fillStyle: "solid"` na cor do traço. A `getArrowHead` atual vira o caso `"arrow"`.
  - **Recuo da linha:** nos formatos cheios ou fechados (triângulo, círculo e losango), a haste para na base da ponta, para não aparecer dentro dela.
  - **Caixa:** o `getBounds` da seta passa a incluir as duas pontas, de qualquer formato.
  - **Interface:** os seletores das duas pontas ficam no painel de estilo (4.3). Até lá, dá para testar com um atalho temporário que troca o formato da seta selecionada.
- **Por quê:** com uma ponta só, as setas cobrem os fluxogramas simples, mas não as relações de mão dupla, as ligações sem direção nem a notação de diagramas técnicos, que são parte do lado draw.io do projeto. O modelo e o desenho não dependem de nada pendente. Só a interface depende do painel de estilo.

### 3.9 Revisar a ligação das setas (pendente)

Dois pontos, que podem ser feitos separados. Os dois mexem em `bindings.ts` e na rota ortogonal.

#### 3.9.1 A seta sai pelo lado errado depois de mover a forma

- [x] **Feito.** Detalhes da implementação:
  - `ArrowBinding` ganhou `fixed: boolean`, e o `anchor` passou a ser obrigatório. A ligação flutuante pura (mirar o centro e parar em qualquer lugar da borda) deixou de existir: toda ponta ligada sai de um ponto de conexão.
  - No `refreshArrow` (reta, curva e ortogonal), uma ligação com ponto e sem `fixed` troca o `anchor` pelo ponto de conexão mais próximo da referência da outra ponta (`resolveBindings`). A referência é o ponto vizinho da seta, quando ela tem pontos do meio. Sem pontos do meio, é o centro da outra forma (ou o ponto preso, se a outra ponta estiver presa). O ponto usado é o mais próximo, e não o da direção do centro, porque assim a escolha fica igual à do ímã ao arrastar. Como as duas pontas automáticas miram o centro da outra forma, uma não depende da outra.
  - O `anchor` resolvido fica salvo na ligação. Assim o destaque, o desenho e o arquivo salvo mostram o ponto real de saída.
  - **Presa ou automática, no modelo do draw.io:** soltar a ponta a até 8 px de tela de um ponto de conexão prende a ponta nele (`fixed: true`). Soltar no corpo da forma, longe dos pontos, deixa a ponta automática. A primeira versão prendia com `Alt` ao soltar, mas, nos testes, arrastar uma ponta até um ponto e ver a seta pular para outro ponto pareceu errado, e o momento certo de apertar o `Alt` não era intuitivo. O ímã caiu de 12 para 8 px, para o corpo da forma ficar fácil de alcançar.
  - No destaque, o ponto de uma ponta presa fica maior. O de uma ponta automática fica preenchido, mas do tamanho normal, e só aparece durante o arraste. Ao passar o mouse com a ferramenta de seta, antes de clicar, ainda não há outra ponta para resolver o lado.
  - O destaque ao arrastar mostra o ponto já resolvido pelo `refreshArrow`, e não o mais perto do cursor.
  - A segunda suspeita (ortogonal com trechos fixos) ficou como está. A ponta precisa chegar ao primeiro trecho fixo, então mirar nele é o comportamento certo.
  - **Seta entrando na elipse:** o roughjs soma ao raio da elipse um valor aleatório proporcional ao raio (`rx * (1 - curveFitting)`), então elipses largas eram desenhadas dezenas de pixels além da borda usada pela ligação. A elipse passou a usar `curveFitting: 1`, que mantém o raio exato e só deixa o tremor pequeno de cada ponto, coberto pelo `BINDING_GAP`.
- **Problema relatado:** ao mover uma forma ligada, a seta continua saindo pelo mesmo lado, mesmo quando a outra forma passou a ficar em outra direção. Ela dá a volta na forma em vez de sair pelo lado virado para o destino.
- **Causa provável:** quando a ponta encaixa num ponto de conexão, o ponto vira o `anchor` da ligação e nunca mais muda. O ímã de 12 px faz quase toda ligação cair num ponto, mesmo sem o usuário querer escolher o lado. Só a ligação flutuante (`anchor: null`) escolhe o lado sozinha. Na ortogonal, há uma segunda suspeita: com trechos fixos, a ligação flutuante sai pelo lado virado para o trecho fixo mais próximo, e não para a outra forma. Reproduzir os dois casos para confirmar.
- **Proposta:**
  - Separar "o usuário escolheu este ponto" de "a seta só encaixou no ponto mais próximo". A ligação ganha um campo, por exemplo `fixed: boolean`. Sem ele, o recálculo (`refreshArrow`) escolhe de novo o ponto de conexão virado para a outra ponta (ou para o próximo ponto da seta) sempre que as formas mudam. Com ele, o ponto fica preso, como hoje.
  - Quando o ponto fica preso: segurar uma tecla (por exemplo `Alt`) ao soltar a ponta, ou soltar exatamente sobre o ponto, num raio bem menor que o ímã atual. Decidir na hora qual dos dois funciona melhor.
  - O ponto escolhido continua aparecendo destacado ao arrastar, para o usuário ver de onde a seta vai sair.

#### 3.9.2 Laços: seta ligada duas vezes à mesma forma

- [x] **Feito.** Detalhes da implementação:
  - O Canvas não exclui mais a forma da outra ponta. A regra do laço fica em `bindArrowEnd` (`bindings.ts`), chamada ao criar a seta e ao arrastar uma ponta. Na mesma forma, a ponta só se liga se cair num ponto de conexão diferente do da outra ponta. Fora dos pontos ou no mesmo ponto, ela fica solta. Isso também evita que a seta se ligue à forma de onde acabou de sair, enquanto o cursor ainda está dentro dela.
  - Num laço, a ponta só se liga se for presa (solta sobre um ponto). Uma ponta automática na mesma forma fica solta, senão a seta viraria um laço assim que o cursor passasse pelo corpo da forma de onde ela saiu.
  - Num laço, as pontas não escolhem o lado sozinhas (item 3.9.1), porque "virado para a outra ponta" não faz sentido na mesma forma. As duas cairiam no mesmo ponto.
  - **Reta e curva:** o laço fica como o usuário desenhar, mesmo cruzando a forma. A primeira versão criava sozinha pontos do meio por fora da forma e trocava a seta para curva, mas isso foi descartado: as curvas são adicionadas à mão, com as alças do meio.
  - **Ortogonal:** a rota já contornava a forma das pontas, e funciona com as duas na mesma forma sem mudança no Dijkstra.
  - **Acompanhar a forma:** os pontos do meio que o usuário adicionou a um laço vão junto com a forma. O `updateBoundArrows` recebe os elementos de antes (`previous`, passado pela store em `updateElements` e `replaceElement`). Quando só a forma de um laço muda, os pontos do meio e os trechos fixos passam pela mesma transformação da forma (posição, tamanho e rotação). Se a forma gira, os trechos fixos de uma ortogonal são descartados, porque deixariam de ser horizontais e verticais.
  - Verificado com um script em retângulos (normal e bem achatado), elipse, losango e retângulo girado: nenhum laço ortogonal atravessa a forma.
- **O quê:** permitir que as duas pontas de uma seta se liguem à mesma forma, para fazer laços (por exemplo, "repetir" num fluxograma).
- **Como:**
  - Tirar a regra que exclui a forma da ponta inicial ao procurar a ligação da ponta final (os `excludeIds`, que foram removidos). As duas pontas não podem cair no mesmo ponto de conexão: nesse caso, a ligação fica flutuante ou a ponta fica solta.
  - **Ortogonal:** a rota já contorna as formas das pontas. Com as duas pontas na mesma forma, ela sai por um lado, contorna pela margem (`ELBOW_MARGIN`) e entra pelo outro. Verificar se o Dijkstra encontra esse caminho quando as duas formas são a mesma.
  - **Reta e curva:** uma reta entre dois pontos da mesma forma atravessaria a forma. Ao criar o laço, a seta ganha automaticamente um ponto do meio fora da forma, no lado das pontas, e vira uma curva que dá a volta. Depois o usuário ajusta esse ponto como qualquer outro.
  - **Ligação flutuante nas duas pontas:** as duas mirariam o centro e cairiam no mesmo lugar. Num laço, cada ponta flutuante mira o ponto vizinho da seta (já é o comportamento quando a seta tem pontos do meio), então o ponto do meio criado automaticamente resolve isso.
  - Mover a forma move o laço inteiro junto. Isso já sai do `updateBoundArrows`, mas a seta precisa mover os pontos do meio também, e não só as pontas. Conferir.
- **Por quê:** laços são comuns em fluxogramas (repetições, estados que voltam para si mesmos), e hoje não há como fazer um sem deixar uma ponta solta.

## 4. Visual

O traço de esboço vem do Excalidraw, mas a interface tem identidade própria (veja as [decisões tomadas](#decisões-tomadas)).

- [x] Traço com cara de esboço usando `roughjs` (adiantado para a etapa 1).
- [x] Usar a fonte Caveat (já carregada no `index.html`) no texto (adiantado para a etapa 2).

### 4.1 Grid de fundo

- [x] **Feito** em `src/lib/render/grid.ts`. A grade pode ser de pontos (o padrão desde o item 4.2) ou de linhas, com um ponto maior ou uma linha mais forte a cada 5. Quando o espaçamento na tela fica abaixo de 10 px, ela multiplica o espaçamento por 5 em vez de dobrar, para as linhas fortes virarem as normais e o desenho não "pular". A toolbar tem dois botões, "Grade em pontos" e "Grade em linhas": clicar no inativo liga a grade naquele estilo, e clicar no ativo esconde a grade. `G` mostra ou esconde sem esquecer o estilo, e `Shift+G` alterna o estilo. O `gridStyle` fica na store e é salvo junto do `showGrid`, com `"dots"` como valor padrão na leitura. As cores vêm do tema (item 4.2), com tokens separados para pontos e linhas, porque as linhas precisam de bem menos opacidade.
- **O quê:** uma grade desenhada no fundo do quadro, que acompanha o pan e o zoom. Ligada por padrão, com um botão e um atalho (`G`) para esconder. Ela é só visual. O encaixe na grade (item 3.4) foi descartado.
- **Como:**
  - `showGrid` e `gridSize` (em unidades de mundo, por exemplo 20) ficam na store. `showGrid` entra no formato salvo da persistência, porque é uma preferência do board.
  - Uma função `drawGrid(ctx, viewport, size)` em `src/lib/render/`, chamada pelo `renderScene` antes dos elementos. Ela calcula a área visível com `screenToWorld` e desenha só as linhas ou pontos dessa área.
  - Quando o zoom diminui e o espaçamento na tela fica pequeno demais (abaixo de uns 8 px), a grade dobra de tamanho até voltar a ficar legível. Assim ela não vira um borrão nem desenha milhares de linhas.
  - A espessura das linhas é fixa na tela (dividida pelo `zoom`), como as alças. A cor sai dos tokens do item 4.2.
  - A grade não usa o `roughjs`: um traço tremido em centenas de linhas pesaria no desenho e brigaria com as formas. Ela fica discreta, e o esboço continua sendo das formas.
  - Pontos ou linhas era uma decisão de visual do item 4.2. Os dois ficaram disponíveis, e pontos é o padrão.
- **Por quê:** a grade dá referência de escala e posição ao desenhar diagramas.

### 4.2 Identidade visual própria

- [x] **Feito.** Direção "caderno técnico":
  - **Tema:** `src/lib/theme.ts` é a fonte única dos valores visuais (cores da interface, cores do canvas, fontes, raios e sombras), no objeto `notebookTheme`, que segue a interface `Theme`. O `applyTheme`, chamado em `main.tsx` antes do render, escreve cada valor como variável CSS (`--color-accent`, `--canvas-selection`, `--font-ui`, `--radius-md`, `--shadow-panel`...), e os SCSS só usam essas variáveis. O canvas lê o mesmo objeto direto. Para mudar a identidade, basta editar os valores. Um tema escuro é outro objeto `Theme` passado ao `applyTheme` (e o canvas redesenhado).
  - **Paleta:** fundo quase branco `#f8f9fb`, superfícies brancas, cinzas neutros nas bordas e no texto (`#2a2d33`) e destaque azul suave `#5a82d6`. Bordas finas e sombra suave, em vez da sombra forte de antes. A primeira versão usava creme e terracota, que foram trocados por serem quentes demais.
  - **Tipografia:** IBM Plex Sans na interface e IBM Plex Mono nos atalhos, carregadas no `index.html` junto da Caveat. A Caveat continua sendo a fonte do texto no quadro.
  - **Toolbar:** vertical, na lateral esquerda e centralizada. O estado ativo é um fundo azul claro e uma barra de 3 px na borda (`activeMarker`). O painel de estilo fica ao lado da toolbar, alinhado pelo topo dela: os dois ficam num contêiner flexível (`.dock` em `Board.module.scss`), que cuida da posição, então nenhum dos dois tem posição própria. O painel também foi testado na parte inferior, centralizado, mas não ficou bom. O `Panel` aceita `direction="row"` para seções lado a lado.
  - **Primitivos em `src/ui/`:** `IconButton` (tamanhos `md`/`sm`, estado ativo, número do atalho no canto e tooltip), `Tooltip` (em portal com `position: fixed`, para não ser cortado pelo `overflow` dos painéis), `Panel`/`PanelSection` (superfície e título de seção em caixa alta) e `Divider` (horizontal ou vertical). O `title` nativo saiu, porque duplicaria o tooltip.
  - **Canvas:** seleção em azul com 1,5 px, alças redondas (o clique continua usando o quadrado de `getHandleRects`), caixa de seleção tracejada e grade em pontos.
  - **Ícones:** continuam os do Lucide.
- **O quê:** um visual de interface que não seja uma cópia do Excalidraw. As funcionalidades continuam parecidas (ferramentas, atalhos, comportamento), mas a toolbar, os painéis, as cores, a seleção e as alças ganham um design próprio. O `roughjs` continua sendo o traço das formas.
- **Como:**
  - **Primeiro passo, definir a direção:** escolher a paleta, a tipografia da interface, o formato e a posição da toolbar (hoje é uma barra branca e flutuante no topo central, como a do Excalidraw), o estilo dos botões e o tratamento do estado ativo. Vale fazer um protótipo antes de mexer no código.
  - **Tokens de design:** criar variáveis CSS em `src/index.css` (cores de fundo, superfície, texto, destaque, borda, raio, sombra) e um `src/lib/theme.ts` com as cores que o canvas usa (seleção, alças, caixa de seleção, grade, fundo). Hoje essas cores estão soltas no código, por exemplo `SELECTION_COLOR` e o `rgba(79, 124, 255, 0.08)` em `renderScene.ts` e os hexadecimais em `Toolbar.module.scss`. Com tokens, um tema escuro no futuro vira só outro conjunto de valores.
  - **Toolbar e primitivos de UI:** refazer `Toolbar.module.scss` e o `Divider` com os tokens. Componentes novos que se repetem (botão de ícone, tooltip com atalho, painel) vão para `src/ui/`, para o painel de estilo (item 4.3) já nascer com o visual novo.
  - **Camada de seleção no canvas:** cor, formato das alças (hoje quadradas e brancas, como no Excalidraw) e caixa de seleção seguindo a nova identidade.
  - **Ícones:** os do Lucide podem continuar, mas vale avaliar outro peso de traço ou ícones próprios em pontos de destaque.
- **Por quê:** o projeto mistura Excalidraw e draw.io e precisa de uma cara própria, não de uma imitação de nenhum dos dois. Fazer isso antes do painel de estilo evita desenhar o painel duas vezes. Os tokens também tiram as cores espalhadas pelo código.

### 4.3 Painel de estilo

- [x] **Feito**, como uma barra flutuante sobre a seleção em vez de um painel fixo. Além do contorno, preenchimento e espessura do plano original, entraram o estilo do preenchimento, o estilo do traço, o esboço e a opacidade, com controles separados para o contorno e o preenchimento. Detalhes da implementação:
  - **Modelo:** `ElementStyle` tem dois grupos. Contorno: `strokeColor`, `strokeWidth` (1, 2 ou 4), `strokeStyle` (`solid`, `dashed`, `dotted`), `strokeRoughness` (0 limpo, 1 esboço, 2 esboço forte) e `strokeOpacity` (0 a 100). Preenchimento: `fillColor`, `fillStyle` (`hachure`, `cross-hatch`, `solid`), `fillRoughness` e `fillOpacity`. As linhas da hachura são sempre contínuas: um estilo de traço próprio do preenchimento chegou a existir, mas foi tirado por não acrescentar ao visual. A persistência valida todos, então boards salvos antes são descartados.
  - **O que cada tipo aceita** fica em `src/lib/elements/style.ts` (`supportsStyle`): formas de caixa aceitam tudo; setas, só o contorno; o lápis, cor, espessura e opacidade; o texto, cor e opacidade. `applyStyle` ignora as propriedades que o elemento não aceita, então aplicar a uma seleção mista é seguro.
  - **Desenho em duas etapas:** as formas de caixa chamam `drawFillAndStroke` (`shapeUtil.ts`), que desenha primeiro o preenchimento (`stroke: "none"`, com `fillRoughness` e `globalAlpha` do preenchimento) e depois o contorno (`strokeOptions`), cada um com as próprias opções. O `renderElement` aplica a opacidade do contorno a tudo o mais (setas, lápis, texto e rótulos) e usa `lineCap: "round"`, que transforma o pontilhado em pontos. Os traços tracejados e pontilhados usam `disableMultiStroke`, para o traço duplo do roughjs não borrá-los. As pontas das setas não herdam o tracejado.
  - **Estilo atual:** a store guarda `currentStyle`, o estilo das próximas formas. `setStyle(patch)` atualiza o `currentStyle` e os selecionados num passo do histórico. O Canvas aplica o `currentStyle` ao criar qualquer elemento (`withCurrentStyle`).
  - **Barra flutuante** (`src/components/Board/StyleBar/`): o painel fixo ao lado da toolbar tomava muito espaço do board. A barra tem um botão por grupo ("Contorno", com um anel na cor do traço; "Preenchimento", com a cor; "Seta", com o tipo da seta), e cada um abre um submenu com os controles do grupo. O Canvas a renderiza centralizada acima da caixa da seleção, acima da alça de rotação, e embaixo da seleção quando não cabe em cima. Sem seleção e com uma ferramenta de desenho ativa, ela fica no topo da tela, para escolher o estilo antes de desenhar. Ela some durante qualquer arraste e durante a edição de texto.
  - **Escopo:** com seleção, os tipos selecionados; sem seleção, o tipo da ferramenta ativa. Os seletores (`selectors.ts`) devolvem o valor comum ou `"mixed"` e caem no `currentStyle` quando nada selecionado aceita a propriedade. No preenchimento, o estilo, o esboço e a opacidade só aparecem quando há cor.
  - **Caixas aninhadas:** o `Popover` trata como "dentro" qualquer clique que passe por ele na árvore do React (`onPointerDownCapture`), inclusive em caixas filhas renderizadas em portal. Assim, o seletor de cor e o de pontas abrem dentro de um submenu sem fechá-lo. O `Popover` também não sai da tela: à direita, ele troca de lado; embaixo, sobe.
  - **Cores:** paleta curta no tema (`theme.palette`: tinta, vermelho, verde, azul, âmbar e as versões claras para preenchimento) e um botão de cor livre (com `hasPopup`) que abre um seletor próprio montado com o `CustomPicker`, `Saturation` e `Hue` do `react-color`. O campo hex aplica a cor assim que tiver um hexadecimal válido de 6 caracteres, e marca o campo como inválido antes disso. Os seletores prontos do `react-color` não foram usados, para seguir o visual do projeto.
  - **Mudanças contínuas** (arrastar no seletor de cor, digitar o hex e mexer na opacidade) usam `setStyle(patch, { record: false })` e um único `commitHistory` no fim (`useStylePreview`, que também registra ao ser desmontado), então cada sessão vira um passo de desfazer.

### 4.4 Estilo do texto

- [ ] **O quê:** alterar o tamanho, a fonte, a cor e outras características do texto. Vale para os três lugares onde há texto: o texto solto, o rótulo dentro das formas (3.3) e o texto nas setas (3.7). As características são:
  - **Fonte:** uma lista curta de famílias, por exemplo manuscrita (a Caveat atual), sem serifa e monoespaçada, para código e diagramas técnicos.
  - **Tamanho:** tamanhos prontos (P, M, G, GG) e um campo para valor livre.
  - **Cor:** a do texto, separada da cor do contorno da forma.
  - **Negrito e itálico.**
  - **Alinhamento horizontal:** esquerda, centro ou direita.
  - **Alinhamento vertical nos rótulos de forma:** topo, meio ou base.
- **Como:**
  - **Modelo:** um tipo único `TextStyle` (`fontFamily`, `fontSize`, `color`, `bold`, `italic`, `align`, `verticalAlign`), usado pelo `TextElement` e pelo `label` de formas e setas. Hoje o texto usa `fontSize` solto e pega a cor do `strokeColor`. Isso tudo passa para o `TextStyle`.
  - **Cor herdada:** `color: null` significa usar a cor do contorno do elemento. Assim, trocar a cor de uma forma continua mudando o rótulo, a não ser que o rótulo tenha cor própria.
  - **Fontes:** o elemento guarda uma chave (`"hand" | "sans" | "mono"`), não o nome CSS. Um mapa em `src/lib/text.ts` traduz a chave para a família, e as fontes são carregadas no `index.html` como a Caveat. O redesenho quando a fonte chega (o `fontsLoaded` do Canvas) passa a esperar todas.
  - **Medição única:** `fontString` passa a receber o `TextStyle` inteiro (peso, itálico, família e tamanho). `measureText`, `wrapText`, o desenho no canvas e o `TextEditor` usam todos a mesma função, para continuarem alinhados.
  - **Interface:** uma seção "Texto" no painel de estilo (4.3). Ela aparece quando a seleção tem texto solto, uma forma ou uma seta com texto, e altera todos os selecionados de uma vez. Atalhos para o mais comum: `Ctrl+B`, `Ctrl+I` e `Ctrl+Shift+<`/`>` para diminuir e aumentar o tamanho. Mudar o tamanho de um texto solto recalcula a caixa dele.
- **Por quê:** a fonte manuscrita combina com o esboço, mas diagramas técnicos pedem uma fonte mais sóbria, e destacar títulos ou palavras-chave pede tamanho, peso e cor. Fazer um `TextStyle` único evita três implementações diferentes para texto solto, rótulo de forma e texto de seta. Fica depois do painel de estilo (4.3), que é onde a interface mora. O modelo pode ser adiantado se o item 3.7 for feito antes, para o texto das setas já nascer com o `TextStyle`.

### 4.5 Indicador de zoom

- [ ] **O quê:** um indicador sempre visível com o zoom atual em porcentagem (por exemplo, "125%"), que acompanha o zoom pela roda, pela pinça e por qualquer mudança futura.
- **Como:**
  - Um componente `ZoomIndicator` em `src/components/Board/`, renderizado pelo `Board` por cima do canvas, num canto que não disputa espaço com a toolbar (lateral esquerda, centralizada na vertical) nem com o painel de estilo (ao lado da toolbar). O canto inferior direito é o candidato natural.
  - Ele lê só `viewport.zoom` da store, com um seletor que devolve o número, para não re-renderizar a cada pan. Mostra `Math.round(zoom * 100)`.
  - **Sugestão de extensão** (decidir na hora): botões de diminuir e aumentar ao lado do número, e clique no número para voltar a 100%. Os três usam o `zoomAt` da store centrado no meio da tela, respeitando `MIN_ZOOM` e `MAX_ZOOM`. Atalhos naturais: `Ctrl+-`, `Ctrl+=` e `Ctrl+0`, registrados no `useShortcuts`.
  - O visual segue os tokens do item 4.2. Se for feito antes dele, usa o mesmo estilo de superfície da toolbar, para ser trocado junto.
- **Por quê:** hoje não há como saber o zoom atual nem voltar exatamente a 100%, o que atrapalha alinhar coisas a olho e comparar tamanhos.

### 4.6 Indicadores de ângulo e dimensões

- [ ] **O quê:** durante a rotação, um rótulo com o ângulo em graus. Durante o redimensionamento, um rótulo com a largura e a altura ("240 × 120"). Os dois só aparecem enquanto o arraste acontece e somem ao soltar o mouse.
- **Como:**
  - **Onde desenhar:** na camada de seleção do `renderScene`, como as alças, com tamanho fixo na tela (dividido pelo `zoom`) e numa fonte da interface, não na Caveat. Assim o rótulo acompanha o pan e o zoom sem um componente React a mais. O `SceneOverlay` ganha um campo `measurement` (`{ kind: "angle"; degrees } | { kind: "size"; width; height }` ou `null`).
  - **Quem preenche:** o Canvas, a partir da `Interaction` ativa (`rotating` ou `resizing`), como estado transitório local, igual ao `frameOverride` e à caixa de seleção. Sem interação, o campo é `null`.
  - **Ângulo:** com um elemento, a `rotation` dele em graus, de 0 a 359. Com vários, o quanto o grupo já girou desde o início do arraste. Com Shift, mostra os passos de 15°. Posição: perto da alça de rotação ou do cursor.
  - **Dimensões:** com um elemento, o tamanho da caixa sem rotação (`getElementBox`), que é o tamanho "real" da forma mesmo girada. Com vários, o tamanho do quadro da seleção. Valores em unidades de mundo, arredondados para inteiro, para não mudar com o zoom. Posição: abaixo do quadro, centralizado, girando junto com o quadro de um elemento só ou ficando sempre na horizontal (decidir pela legibilidade).
  - O rótulo tem fundo próprio (uma pílula com a cor de destaque), para continuar legível sobre formas e sobre a grade.
- **Por quê:** girar e redimensionar a olho é impreciso. Com o número na tela, dá para deixar formas do mesmo tamanho ou no ângulo exato, o que importa nos diagramas da etapa 3. Mostrar só durante o arraste evita poluir a tela no resto do tempo.

## 5. Persistência

- [x] Salvamento automático no `localStorage` (adiantado: é o passo 2 dos [próximos passos](#próximos-passos-em-ordem)).
- [ ] Exportar e importar JSON.
- [ ] Exportar PNG e SVG.
- [ ] `Home` vira a lista de boards, e a rota passa a ser `/board/:id`.
