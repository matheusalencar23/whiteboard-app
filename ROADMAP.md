# Roadmap

Um quadro branco que mistura **Excalidraw** (desenho livre, visual de esboço) com **draw.io** (diagramas estruturados, formas conectadas, fluxogramas).

Marque os itens com `[x]` conforme forem concluídos.

## Estado atual

- Rota `/board` com um canvas em tela cheia (resolução ajustada para telas HiDPI).
- Toolbar com as ferramentas mão, seleção, retângulo, losango, elipse, seta, lápis e texto, além de desfazer, refazer e apagar.
- Seleção por clique, Shift + clique e caixa. Mover, redimensionar pelas 8 alças, apagar, e desfazer/refazer.
- Câmera com pan (roda do mouse, Shift + roda, botão do meio ou Espaço + arrastar) e zoom (Ctrl/Cmd + roda ou pinça no trackpad, centrado no cursor).
- Estado em uma store do zustand. `elements`, `viewport` e as preferências da grade são salvos sozinhos no `localStorage` (`src/lib/persistence.ts`, formato versão 2).
- Setas ligadas às formas: acompanham quando a forma é movida ou redimensionada, e as pontas podem ser arrastadas para ligar, desligar ou trocar de forma. As pontas encaixam nos pontos de conexão das formas (meio dos lados ou vértices do losango).
- Texto dentro das formas: duplo clique num retângulo, elipse ou losango edita um rótulo centralizado, que quebra linha na largura da forma.
- Grade de fundo, ligada por padrão, só visual (sem encaixe).
- Dependência instalada mas ainda não usada: `react-color`.

### Atalhos

| Ação | Atalho |
|---|---|
| Ferramentas | `H` mão, `V`/`1` seleção, `R`/`2` retângulo, `D`/`3` losango, `O`/`4` elipse, `A`/`5` seta, `P`/`6` lápis, `T`/`7` texto |
| Desfazer / refazer | `Ctrl+Z` / `Ctrl+Shift+Z` ou `Ctrl+Y` |
| Selecionar tudo | `Ctrl+A` |
| Apagar seleção | `Delete` ou `Backspace` |
| Limpar seleção | `Esc` |
| Mostrar / esconder a grade | `G` |
| Editar texto | Duplo clique no texto. Duplo clique no vazio cria um texto novo. `Esc` ou `Ctrl+Enter` confirmam. |

## Decisões tomadas

- Visual de esboço com `roughjs` é o padrão desde a etapa 1. Cada elemento guarda um `seed` para o traço não mudar a cada redesenho. O traço limpo é `roughness: 0` no estilo do elemento.
- O lápis (desenho livre) não usa o `roughjs`. Ele desenha uma curva suave direto no canvas, porque o roughjs duplicaria e tremeria o traço da mão.
- Formas sem preenchimento só são clicáveis pela borda, como no Excalidraw. Para mover uma forma vazia já selecionada, dá para arrastar pelo meio da caixa de seleção.
- As funcionalidades seguem o Excalidraw e o draw.io, mas o visual da interface é próprio: toolbar, painéis, cores, seleção e alças não devem copiar o Excalidraw. O `roughjs` continua sendo o traço das formas. Veja o item [4.2](#42-identidade-visual-própria).
- Depois de criar uma forma, uma seta ou um texto, a ferramenta volta para a seleção com o elemento novo selecionado. O lápis continua ativo.

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
  - Gravar junto um número de versão (`{ version: 1, elements, viewport }`). A etapa 3 vai mudar o formato da seta, e com a versão dá para converter dados antigos em vez de quebrar o board salvo.
  - Se os dados lidos forem inválidos (JSON corrompido ou versão desconhecida), ignorar e abrir um board vazio, sem travar a página.
  - Deixar a lógica em `src/lib/persistence.ts` (ler, gravar, validar e migrar), sem React, e ligar à store num ponto só.
- **Por quê:** hoje recarregar a página apaga tudo. Os testes manuais da etapa 3 precisam de diagramas com várias formas e setas, e remontar tudo a cada recarga (inclusive a cada mudança de código, quando o HMR recarrega a página) atrapalha. É uma tarefa pequena, porque a store já guarda dados simples e imutáveis, prontos para virar JSON.

### 3. Etapa 3, na ordem descrita na seção dela

- [ ] Os itens 3.1 (setas ligadas), 3.2 (pontos de conexão) e 3.3 (texto dentro das formas) estão feitos. O 3.4 (snap e guias) foi descartado, e só a grade de fundo (4.1) ficou. Seguir a ordem dos itens da [etapa 3](#3-diagramas-a-parte-drawio). Do 3.1 ao 3.6, cada item depende do anterior. O 3.7 (texto nas setas) e o 3.8 (formato das pontas) não dependem dos outros e podem ser adiantados. Só a interface do 3.8 espera o painel de estilo (4.3).

As outras pendências da etapa 2 (Shift, rotação, duplicar e copiar/colar) ficam para quando fizerem falta no uso. Nenhuma bloqueia a etapa 3.

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
- [ ] **Shift não mantém a proporção.** Ao redimensionar, Shift deveria manter a proporção. Ao desenhar, deveria forçar quadrado, círculo ou ângulos de 45° na seta. Ficou fora para a etapa não crescer demais. Mexe só em `resizeBounds` ([src/lib/selection.ts](src/lib/selection.ts)) e no caso `creating` do Canvas.
- [ ] **Não há como girar elementos.** O campo `rotation` existe, e o desenho e o clique já o respeitam. Falta a alça de rotação, a caixa de seleção girando junto e a matemática de redimensionar um elemento girado, que é bem mais trabalhosa. Nunca esteve no plano da etapa 2.
- [ ] **Faltam duplicar (`Ctrl+D`), copiar/colar e mover pelas setas do teclado.** Nunca estiveram no plano. São atalhos novos em [useShortcuts.ts](src/components/Board/useShortcuts.ts) que usam ações que a store já tem. Ao copiar setas ligadas (etapa 3), as ligações precisam apontar para as cópias das formas, não para as originais.

## 3. Diagramas (a parte draw.io)

A parte que diferencia o projeto de um Excalidraw. Os itens estão na ordem de implementação, e cada um usa o que o anterior criou.

### 3.1 Setas ligadas às formas

- [x] **Feito.** A lógica está em `src/lib/elements/bindings.ts`. Detalhes da implementação:
  - Só retângulo, elipse e losango aceitam ligação: são os que têm `getBorderOffset`. A ponta flutuante fica a `BINDING_GAP` (6 unidades de mundo) da borda.
  - A forma alvo é a mais acima cujo interior, com uma folga de 8 px na tela, contém a ponta. Formas sem preenchimento também contam pelo interior. A ponta final não se liga à mesma forma da inicial.
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
  - **Persistência:** a versão do formato salvo sobe para 2, com uma migração que coloca `startBinding: null` e `endBinding: null` nas setas antigas.
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
  - O campo `label` é opcional, então o formato salvo continua na versão 2.
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

- [ ] **O quê:** um modo de seta que só faz linhas horizontais e verticais, com cotovelos de 90°, como as conexões do draw.io.
- **Como:**
  - `ArrowElement` ganha `routing: "straight" | "elbow"`, que pode ser trocado no painel de estilo.
  - **Primeira versão:** a rota é calculada a partir dos pontos de conexão (item 3.2). A seta sai perpendicular ao lado da forma, faz um "L" ou um "Z" até o destino e chega perpendicular. Os pontos da rota são recalculados pelo mesmo `updateBoundArrows` do item 3.1.
  - **Segunda versão (opcional):** contornar outras formas que estejam no caminho, com uma busca de caminho (A*) numa grade.
- **Por quê:** setas ortogonais são o que dá a cara de diagrama técnico ao draw.io. Ficam por último porque dependem das ligações e dos pontos de conexão, e porque o roteamento é a parte mais complexa da etapa.

### 3.6 Setas curvas que contornam a forma

- [ ] **O quê:** hoje a seta ligada é sempre uma reta. Se a ponta está presa no lado de uma forma que fica de costas para a outra ponta (por exemplo, no lado direito de uma forma, com a outra ponta à esquerda), a reta atravessa a própria forma. A ideia é a seta sair perpendicular ao lado em que está presa e fazer uma curva, dando a volta na forma até o destino.
- **Como:**
  - Um terceiro modo de rota: `routing: "straight" | "elbow" | "curved"`, no mesmo campo do item 3.5.
  - **Direção de saída:** cada ponta ligada tem uma direção para fora da forma. Num ponto de conexão, ela é a normal do lado (dá para tirar do próprio `anchor`: `(anchor.x - 0.5, anchor.y - 0.5)` aponta para fora no meio de cada lado e nos vértices do losango). Na ligação flutuante, é a direção do centro para a ponta. A seta ortogonal do item 3.5 usa essa mesma direção, então as duas compartilham a lógica.
  - **Curva:** uma Bézier cúbica entre as pontas, com os pontos de controle afastados ao longo da direção de saída de cada ponta, a uma distância proporcional ao comprimento da seta. Isso já faz a seta sair e chegar perpendicular, e na maioria dos casos ela contorna a forma sozinha.
  - **Contornar de verdade:** quando a direção de saída aponta para longe do destino, só a Bézier pode raspar na forma. Nesse caso, a rota ganha pontos intermediários que dão a volta pela caixa da forma, com uma folga, e uma curva suave passa por eles (Catmull-Rom ou Béziers encadeadas). É a mesma rota do modo ortogonal, só que suavizada.
  - **Desenho e clique:** o roughjs desenha curvas com `rc.path` (caminho SVG com `C`) ou `rc.curve`. Hit test, caixa (`getBounds`) e direção da ponta da seta passam a usar a curva amostrada como polilinha, e a ponta segue a tangente no fim da curva.
  - Os pontos da curva são recalculados pelo `updateBoundArrows` (item 3.1), como as outras rotas.
- **Por quê:** com pontos de conexão em todos os lados, ligar no lado "de trás" de uma forma é comum em fluxogramas (laços, retornos). Uma reta que atravessa a forma fica ilegível. Fica depois do item 3.5 porque reaproveita a direção de saída e a rota que contorna a forma.

### 3.7 Texto nas setas

- [ ] **O quê:** duplo clique numa seta abre a edição de um texto que fica no meio dela, como os rótulos de fluxograma ("sim", "não", "envia pedido"). O texto acompanha a seta quando ela muda, inclusive quando é recalculada por estar ligada a formas.
- **Como:**
  - `ArrowElement` ganha o mesmo campo opcional `label: { text, fontSize }` das formas (item 3.3), reaproveitando `ShapeLabel`, `wrapText` e o `TextEditor` no modo rótulo.
  - **Posição:** o centro do texto fica no ponto do meio do comprimento da seta, medido ao longo do caminho, não no centro da caixa. Assim continua certo com setas de vários pontos, ortogonais (3.5) e curvas (3.6). Uma função `getPointAtLength` em `src/lib/geometry/` serve às três rotas.
  - **Largura:** a seta não tem área própria, então o texto quebra numa largura máxima fixa (por exemplo, 200 unidades de mundo) e fica sem quebra se for curto.
  - **Traço interrompido:** a linha da seta não passa por cima do texto. O jeito mais simples é desenhar um retângulo com a cor de fundo atrás do texto, que muda junto quando o tema e a grade (4.1 e 4.2) existirem. A alternativa mais limpa é recortar a linha com `ctx.clip` na área do texto, sem depender da cor de fundo.
  - **Desenho e clique:** o `getLabelLayout` do `registry.ts` passa a aceitar a seta, com a posição vinda do caminho em vez da `getLabelArea`. O texto entra no hit test e no `getBounds` da seta, para a seleção e a seleção por caixa o incluírem.
  - **Depois, opcional:** arrastar o texto ao longo da seta, guardando a posição como uma fração do comprimento (0 a 1), como no draw.io.
- **Por quê:** em fluxogramas, as setas que saem de uma decisão quase sempre têm texto. Um texto solto ao lado da seta fica para trás quando as formas se movem, que é o mesmo problema que o item 3.3 resolveu nas formas.

### 3.8 Formato das pontas das setas

- [ ] **O quê:** escolher o formato de cada ponta da seta, no início e no fim, de forma independente. Os formatos são nenhum, seta aberta (o atual), triângulo cheio, círculo, losango e barra. Isso permite setas de mão dupla, linhas sem ponta e as notações de diagramas como UML e ER.
- **Como:**
  - `ArrowElement` ganha `startArrowhead` e `endArrowhead`, cada um `"none" | "arrow" | "triangle" | "circle" | "diamond" | "bar"`. O padrão é `"none"` no início e `"arrow"` no fim, como hoje.
  - **Desenho:** cada formato é uma função que recebe a ponta, a direção do último segmento (ou a tangente, nas curvas do 3.6) e o tamanho, e desenha com o roughjs. Os formatos cheios usam `fillStyle: "solid"` na cor do traço. A `getArrowHead` atual vira o caso `"arrow"`.
  - **Recuo da linha:** nos formatos cheios ou fechados (triângulo, círculo e losango), a haste para na base da ponta, para não aparecer dentro dela.
  - **Caixa:** o `getBounds` da seta passa a incluir as duas pontas, de qualquer formato.
  - **Interface:** os seletores das duas pontas ficam no painel de estilo (4.3). Até lá, dá para testar com um atalho temporário que troca o formato da seta selecionada.
  - **Persistência:** a versão do formato salvo sobe para 3, com uma migração que coloca `startArrowhead: "none"` e `endArrowhead: "arrow"` nas setas antigas.
- **Por quê:** com uma ponta só, as setas cobrem os fluxogramas simples, mas não as relações de mão dupla, as ligações sem direção nem a notação de diagramas técnicos, que são parte do lado draw.io do projeto. O modelo e o desenho não dependem de nada pendente. Só a interface depende do painel de estilo.

## 4. Visual

O traço de esboço vem do Excalidraw, mas a interface tem identidade própria (veja as [decisões tomadas](#decisões-tomadas)).

- [x] Traço com cara de esboço usando `roughjs` (adiantado para a etapa 1).
- [x] Usar a fonte Caveat (já carregada no `index.html`) no texto (adiantado para a etapa 2).

### 4.1 Grid de fundo

- [x] **Feito** em `src/lib/render/grid.ts`. A grade é de linhas finas, com uma linha mais forte a cada 5. Quando o espaçamento na tela fica abaixo de 8 px, ela multiplica o espaçamento por 5 em vez de dobrar, para as linhas fortes virarem as normais e o desenho não "pular". O botão fica na toolbar. As cores ainda são constantes no módulo, até os tokens do item 4.2.
- **O quê:** uma grade desenhada no fundo do quadro, que acompanha o pan e o zoom. Ligada por padrão, com um botão e um atalho (`G`) para esconder. Ela é só visual. O encaixe na grade (item 3.4) foi descartado.
- **Como:**
  - `showGrid` e `gridSize` (em unidades de mundo, por exemplo 20) ficam na store. `showGrid` entra no formato salvo da persistência, porque é uma preferência do board. Como é um campo novo e opcional, basta um valor padrão na leitura, sem subir a versão.
  - Uma função `drawGrid(ctx, viewport, size)` em `src/lib/render/`, chamada pelo `renderScene` antes dos elementos. Ela calcula a área visível com `screenToWorld` e desenha só as linhas ou pontos dessa área.
  - Quando o zoom diminui e o espaçamento na tela fica pequeno demais (abaixo de uns 8 px), a grade dobra de tamanho até voltar a ficar legível. Assim ela não vira um borrão nem desenha milhares de linhas.
  - A espessura das linhas é fixa na tela (dividida pelo `zoom`), como as alças. A cor sai dos tokens do item 4.2.
  - A grade não usa o `roughjs`: um traço tremido em centenas de linhas pesaria no desenho e brigaria com as formas. Ela fica discreta, e o esboço continua sendo das formas.
  - Pontos ou linhas é uma decisão de visual do item 4.2.
- **Por quê:** a grade dá referência de escala e posição ao desenhar diagramas.

### 4.2 Identidade visual própria

- [ ] **O quê:** um visual de interface que não seja uma cópia do Excalidraw. As funcionalidades continuam parecidas (ferramentas, atalhos, comportamento), mas a toolbar, os painéis, as cores, a seleção e as alças ganham um design próprio. O `roughjs` continua sendo o traço das formas.
- **Como:**
  - **Primeiro passo, definir a direção:** escolher a paleta, a tipografia da interface, o formato e a posição da toolbar (hoje é uma barra branca e flutuante no topo central, como a do Excalidraw), o estilo dos botões e o tratamento do estado ativo. Vale fazer um protótipo antes de mexer no código.
  - **Tokens de design:** criar variáveis CSS em `src/index.css` (cores de fundo, superfície, texto, destaque, borda, raio, sombra) e um `src/lib/theme.ts` com as cores que o canvas usa (seleção, alças, caixa de seleção, grade, fundo). Hoje essas cores estão soltas no código, por exemplo `SELECTION_COLOR` e o `rgba(79, 124, 255, 0.08)` em `renderScene.ts` e os hexadecimais em `Toolbar.module.scss`. Com tokens, um tema escuro no futuro vira só outro conjunto de valores.
  - **Toolbar e primitivos de UI:** refazer `Toolbar.module.scss` e o `Divider` com os tokens. Componentes novos que se repetem (botão de ícone, tooltip com atalho, painel) vão para `src/ui/`, para o painel de estilo (item 4.3) já nascer com o visual novo.
  - **Camada de seleção no canvas:** cor, formato das alças (hoje quadradas e brancas, como no Excalidraw) e caixa de seleção seguindo a nova identidade.
  - **Ícones:** os do Lucide podem continuar, mas vale avaliar outro peso de traço ou ícones próprios em pontos de destaque.
- **Por quê:** o projeto mistura Excalidraw e draw.io e precisa de uma cara própria, não de uma imitação de nenhum dos dois. Fazer isso antes do painel de estilo evita desenhar o painel duas vezes. Os tokens também tiram as cores espalhadas pelo código.

### 4.3 Painel de estilo

- [ ] Painel de estilo (contorno, preenchimento, espessura) com o `react-color`, já no visual do item 4.2.

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
  - **Persistência:** a versão do formato salvo sobe, com uma migração que monta o `TextStyle` a partir do `fontSize` atual, com a fonte manuscrita, a cor herdada e o alinhamento de hoje (esquerda no texto solto, centro nos rótulos).
- **Por quê:** a fonte manuscrita combina com o esboço, mas diagramas técnicos pedem uma fonte mais sóbria, e destacar títulos ou palavras-chave pede tamanho, peso e cor. Fazer um `TextStyle` único evita três implementações diferentes para texto solto, rótulo de forma e texto de seta. Fica depois do painel de estilo (4.3), que é onde a interface mora. O modelo pode ser adiantado se o item 3.7 for feito antes, para o texto das setas já nascer com o `TextStyle`.

## 5. Persistência

- [x] Salvamento automático no `localStorage` (adiantado: é o passo 2 dos [próximos passos](#próximos-passos-em-ordem)).
- [ ] Exportar e importar JSON.
- [ ] Exportar PNG e SVG.
- [ ] `Home` vira a lista de boards, e a rota passa a ser `/board/:id`.
