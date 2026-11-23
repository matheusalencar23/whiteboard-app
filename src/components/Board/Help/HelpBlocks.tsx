import styles from "./Help.module.scss";
import { Keys } from "./Keys";
import { SHORTCUTS, type Shortcut } from "../shortcuts";
import { TOOLS } from "../Toolbar/tools";
import type { Tool } from "../../../store/boardStore";
import { useBoardStore } from "../../../store/boardStoreContext";
import { canEdit, isToolAllowed, type WhiteboardConfig } from "../../../store/whiteboardConfig";

const TOOL_DESCRIPTIONS: Record<Tool, string> = {
  hand: "Arrasta a tela sem mexer nos elementos.",
  selection: "Clique para selecionar, Shift + clique para somar à seleção ou arraste no vazio para selecionar por caixa. O clique num elemento agrupado seleciona o grupo inteiro, e o duplo clique entra nele.",
  rectangle: "Arraste para desenhar. Com Shift, vira um quadrado.",
  diamond: "Arraste para desenhar. Com Shift, fica com os lados iguais.",
  ellipse: "Arraste para desenhar. Com Shift, vira um círculo.",
  arrow: "Arraste de um ponto a outro. Começar ou terminar sobre uma forma liga a seta a ela. Com Shift, anda em ângulos de 45°, também ao arrastar as pontas e os pontos de uma seta pronta.",
  freedraw: "Desenho à mão livre. Continua ativo depois de cada traço.",
  text: "Clique no quadro para escrever um texto solto.",
};

type ConfigCheck = (config: WhiteboardConfig) => boolean;

interface ShortcutRow {
  label: string;
  combos: string[][];
  when?: ConfigCheck;
}

const whenEditable: ConfigCheck = canEdit;

function fromShortcut(shortcut: Shortcut, when?: ConfigCheck): ShortcutRow {
  return { label: shortcut.label, combos: [shortcut.keys], when };
}

function editing(shortcut: Shortcut): ShortcutRow {
  return fromShortcut(shortcut, whenEditable);
}

const SHORTCUT_GROUPS: { title: string; rows: ShortcutRow[] }[] = [
  {
    title: "Ferramentas",
    rows: TOOLS.map(({ tool, label, keys }) => ({
      label,
      combos: keys.map((key) => [key.toUpperCase()]),
      when: (config) => config.tools.includes(tool),
    })),
  },
  {
    title: "Edição",
    rows: [
      SHORTCUTS.undo,
      SHORTCUTS.redo,
      SHORTCUTS.delete,
      SHORTCUTS.deselect,
      SHORTCUTS.duplicate,
      SHORTCUTS.copy,
      SHORTCUTS.cut,
      SHORTCUTS.paste,
      SHORTCUTS.group,
      SHORTCUTS.ungroup,
      SHORTCUTS.bringToFront,
      SHORTCUTS.bringForward,
      SHORTCUTS.sendBackward,
      SHORTCUTS.sendToBack,
      SHORTCUTS.nudge,
      SHORTCUTS.nudgeFar,
    ]
      .map(editing)
      .concat(fromShortcut(SHORTCUTS.selectAll, (config) => isToolAllowed(config, "selection"))),
  },
  {
    title: "Arquivo",
    rows: [
      fromShortcut(SHORTCUTS.saveFile, (config) => config.saveFile),
      fromShortcut(SHORTCUTS.openFile, (config) => config.openFile),
      fromShortcut(SHORTCUTS.exportImage, (config) => config.exportImage),
    ],
  },
  {
    title: "Texto",
    rows: [
      SHORTCUTS.editText,
      SHORTCUTS.bold,
      SHORTCUTS.italic,
      SHORTCUTS.underline,
      SHORTCUTS.textBigger,
      SHORTCUTS.textSmaller,
    ]
      .map(editing)
      .concat({ label: SHORTCUTS.confirmText.label, combos: [SHORTCUTS.confirmText.keys, ["Esc"]], when: whenEditable }),
  },
  {
    title: "Visualização",
    rows: [
      fromShortcut(SHORTCUTS.zoomIn, (config) => config.zoomControls),
      fromShortcut(SHORTCUTS.zoomOut, (config) => config.zoomControls),
      fromShortcut(SHORTCUTS.zoomReset, (config) => config.zoomControls),
      fromShortcut(SHORTCUTS.library, (config) => config.library),
      fromShortcut(SHORTCUTS.toggleGrid, (config) => config.grid),
      fromShortcut(SHORTCUTS.cycleGrid, (config) => config.grid),
      fromShortcut(SHORTCUTS.toggleTheme, (config) => config.themeToggle),
      fromShortcut(SHORTCUTS.help),
    ],
  },
  {
    title: "Com o mouse",
    rows: [
      { label: "Manter a proporção ao desenhar ou redimensionar", combos: [["Shift", "arrastar"]], when: whenEditable },
      { label: "Girar em passos de 15°", combos: [["Shift", "girar"]], when: whenEditable },
      { label: "Seta em ângulos de 45° ao desenhar ou arrastar as pontas e os pontos", combos: [["Shift", "arrastar"]], when: whenEditable },
      { label: "Mover a tela", combos: [["Espaço", "arrastar"], ["botão do meio"], ["roda"]] },
      { label: "Mover a tela na horizontal", combos: [["Shift", "roda"]] },
      { label: "Zoom no cursor", combos: [["Ctrl", "roda"], ["pinça"]] },
      { label: "Escrever um texto, um rótulo ou uma seção da entidade", combos: [["duplo clique"]], when: whenEditable },
      { label: "Inserir uma forma da biblioteca", combos: [["clique"], ["arrastar para o quadro"]], when: (config) => config.library },
      { label: "Entrar no grupo para mexer num elemento dele", combos: [["duplo clique"]], when: whenEditable },
      { label: "Levar o texto da seta ao longo dela (com a seta selecionada)", combos: [["arrastar o texto"]], when: whenEditable },
    ],
  },
];

export function ShortcutTable() {
  const config = useBoardStore((s) => s.config);
  const groups = SHORTCUT_GROUPS.map((group) => ({
    ...group,
    rows: group.rows.filter((row) => !row.when || row.when(config)),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section key={group.title} className={styles.group}>
          <h3 className={styles.groupTitle}>{group.title}</h3>
          <dl className={styles.table}>
            {group.rows.map((row) => (
              <div key={row.label} className={styles.row}>
                <dt>{row.label}</dt>
                <dd>
                  <Keys combos={row.combos} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export function ToolList() {
  const tools = useBoardStore((s) => s.config.tools);
  return (
    <ul className={styles.tools}>
      {TOOLS.filter(({ tool }) => tools.includes(tool)).map(({ tool, label, icon: Icon, keys }) => (
        <li key={tool} className={styles.tool}>
          <span className={styles.toolIcon}>
            <Icon />
          </span>
          <span className={styles.toolText}>
            <span className={styles.toolName}>
              {label} <Keys combos={keys.map((key) => [key.toUpperCase()])} />
            </span>
            <span>{TOOL_DESCRIPTIONS[tool]}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function NavigationHelp() {
  const config = useBoardStore((s) => s.config);
  return (
    <ul className={styles.list}>
      <li>
        A roda do mouse move a tela, e com Shift move na horizontal. Também dá para arrastar com Espaço, com o botão do
        meio ou com a ferramenta mão.
      </li>
      <li>
        <Keys combos={[["Ctrl", "roda"]]} /> ou a pinça no trackpad dão zoom no ponto do cursor.
      </li>
      {config.zoomControls && (
        <li>
          O indicador no canto inferior direito mostra o zoom. Os botões <Keys combos={[["−"], ["+"]]} /> andam por
          níveis fixos, e clicar na porcentagem volta a 100%.
        </li>
      )}
      {config.grid && (
        <li>A grade de fundo pode ser de pontos ou de linhas, nos botões do fim da barra de ferramentas. Ela é só visual.</li>
      )}
      {config.themeToggle && (
        <li>
          O botão do sol (ou da lua), no canto inferior direito, escolhe o tema claro, o escuro ou o do sistema, e{" "}
          <Keys combos={[["Alt", "Shift", "D"]]} /> alterna entre os dois. No tema escuro, as cores dos desenhos são
          adaptadas para continuar legíveis, mas o board guarda as cores originais.
        </li>
      )}
    </ul>
  );
}
