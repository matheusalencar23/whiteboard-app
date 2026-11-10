import type { IconType } from "react-icons";
import { LuCompass, LuKeyboard, LuMousePointerClick, LuPalette, LuRocket, LuType, LuWorkflow } from "react-icons/lu";
import styles from "./Help.module.scss";
import { Keys } from "./Keys";
import { ShortcutTable, ToolList } from "./HelpBlocks";

export interface HelpSection {
  id: string;
  title: string;
  icon: IconType;
  content: React.ReactNode;
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "start",
    title: "Primeiros passos",
    icon: LuRocket,
    content: (
      <>
        <ol className={styles.steps}>
          <li>Escolha uma ferramenta na barra da esquerda, ou pela tecla dela, e arraste no quadro para desenhar.</li>
          <li>
            Depois de criar uma forma, a ferramenta volta para a seleção, com a forma selecionada. Arraste para mover,
            use as alças dos cantos para redimensionar e a bolinha de cima para girar.
          </li>
          <li>Para ligar duas formas, use a seta: comece o arraste sobre uma forma e solte sobre a outra.</li>
          <li>Dê duplo clique numa forma ou numa seta para escrever dentro dela.</li>
          <li>Mude cores, traços e texto na barra que aparece acima da seleção.</li>
        </ol>
        <p className={styles.note}>
          Tudo é salvo sozinho neste navegador. O nome do board fica no canto superior esquerdo, e um duplo clique
          nele permite renomear. Para levar o board a outro lugar, use{" "}
          <Keys combos={[["Ctrl", "S"]]} /> para salvar um arquivo <code>.whiteboard.json</code> com esse nome e{" "}
          <Keys combos={[["Ctrl", "O"]]} /> (ou arraste o arquivo para o quadro) para abri-lo. Abrir um arquivo troca o
          board atual, e <Keys combos={[["Ctrl", "Z"]]} /> volta ao anterior.
        </p>
      </>
    ),
  },
  {
    id: "tools",
    title: "Ferramentas",
    icon: LuMousePointerClick,
    content: <ToolList />,
  },
  {
    id: "diagrams",
    title: "Diagramas",
    icon: LuWorkflow,
    content: (
      <ul className={styles.list}>
        <li>
          <strong>Setas ligadas.</strong> Com a seta sobre uma forma, ela fica destacada e mostra os pontos de conexão.
          Soltar sobre um ponto prende a ponta nele. Soltar no meio da forma deixa a ponta automática: ela sai pelo
          lado virado para a outra ponta e troca de lado quando as formas se movem.
        </li>
        <li>
          <strong>Acompanham as formas.</strong> Mover, redimensionar ou girar uma forma reposiciona as setas ligadas a
          ela. Para desligar ou trocar de forma, selecione a seta e arraste a ponta.
        </li>
        <li>
          <strong>Tipos de seta.</strong> Reta, curva ou ortogonal, no grupo "Seta" da barra de estilo. Na reta e na
          curva, arraste a bolinha no meio de um trecho para criar uma dobra, e dê duplo clique numa dobra para
          removê-la. Na ortogonal, arraste um trecho para fixá-lo, e dê duplo clique nele para soltá-lo.
        </li>
        <li>
          <strong>Pontas.</strong> No mesmo grupo, escolha a ponta do início e a do fim: setas, triângulos, losangos e
          círculos da UML e a notação pé de galinha dos diagramas entidade-relacionamento.
        </li>
        <li>
          <strong>Laços.</strong> As duas pontas podem se ligar à mesma forma.
        </li>
      </ul>
    ),
  },
  {
    id: "text",
    title: "Texto",
    icon: LuType,
    content: (
      <ul className={styles.list}>
        <li>Duplo clique no vazio cria um texto. Duplo clique num texto edita.</li>
        <li>Duplo clique numa forma ou numa seta escreve um rótulo, que acompanha o elemento.</li>
        <li>
          <Keys combos={[["Enter"]]} /> quebra a linha. <Keys combos={[["Esc"], ["Ctrl", "Enter"]]} /> terminam a
          edição.
        </li>
        <li>
          O grupo "Texto" da barra de estilo muda a fonte (manuscrita, sem serifa ou monoespaçada), o tamanho, o
          negrito, o itálico, a cor e o alinhamento.
        </li>
      </ul>
    ),
  },
  {
    id: "style",
    title: "Estilo",
    icon: LuPalette,
    content: (
      <ul className={styles.list}>
        <li>
          A barra de estilo aparece acima da seleção. Cada botão abre um grupo: contorno, preenchimento, texto e, nas
          setas, o tipo e as pontas.
        </li>
        <li>
          <strong>Contorno:</strong> cor, espessura, traço contínuo, tracejado ou pontilhado, traço limpo ou de esboço
          e opacidade.
        </li>
        <li>
          <strong>Preenchimento:</strong> cor, hachura, hachura cruzada ou sólido, traço limpo ou de esboço e
          opacidade.
        </li>
        <li>
          O último estilo escolhido vale para os próximos elementos. Com uma ferramenta de desenho ativa e nada
          selecionado, a barra aparece no topo para escolher o estilo antes de desenhar.
        </li>
      </ul>
    ),
  },
  {
    id: "navigation",
    title: "Navegação",
    icon: LuCompass,
    content: (
      <ul className={styles.list}>
        <li>
          A roda do mouse move a tela, e com Shift move na horizontal. Também dá para arrastar com Espaço, com o botão
          do meio ou com a ferramenta mão.
        </li>
        <li>
          <Keys combos={[["Ctrl", "roda"]]} /> ou a pinça no trackpad dão zoom no ponto do cursor.
        </li>
        <li>
          O indicador no canto inferior direito mostra o zoom. Os botões <Keys combos={[["−"], ["+"]]} /> andam por
          níveis fixos, e clicar na porcentagem volta a 100%.
        </li>
        <li>
          A grade de fundo pode ser de pontos ou de linhas, nos botões do fim da barra de ferramentas. Ela é só visual.
        </li>
      </ul>
    ),
  },
  {
    id: "shortcuts",
    title: "Atalhos",
    icon: LuKeyboard,
    content: <ShortcutTable />,
  },
];
