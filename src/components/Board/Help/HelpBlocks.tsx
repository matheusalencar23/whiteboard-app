import styles from "./Help.module.scss";
import { Keys } from "./Keys";
import { SHORTCUTS, type Shortcut } from "../shortcuts";
import { TOOLS } from "../Toolbar/tools";
import type { Tool } from "../../../store/boardStore";

const TOOL_DESCRIPTIONS: Record<Tool, string> = {
  hand: "Arrasta a tela sem mexer nos elementos.",
  selection: "Clique para selecionar, Shift + clique para somar à seleção ou arraste no vazio para selecionar por caixa.",
  rectangle: "Arraste para desenhar. Com Shift, vira um quadrado.",
  diamond: "Arraste para desenhar. Com Shift, fica com os lados iguais.",
  ellipse: "Arraste para desenhar. Com Shift, vira um círculo.",
  arrow: "Arraste de um ponto a outro. Começar ou terminar sobre uma forma liga a seta a ela. Com Shift, anda em ângulos de 45°, também ao arrastar as pontas e os pontos de uma seta pronta.",
  freedraw: "Desenho à mão livre. Continua ativo depois de cada traço.",
  text: "Clique no quadro para escrever um texto solto.",
};

interface ShortcutRow {
  label: string;
  combos: string[][];
}

function fromShortcut(shortcut: Shortcut): ShortcutRow {
  return { label: shortcut.label, combos: [shortcut.keys] };
}

const SHORTCUT_GROUPS: { title: string; rows: ShortcutRow[] }[] = [
  {
    title: "Ferramentas",
    rows: TOOLS.map(({ label, keys }) => ({ label, combos: keys.map((key) => [key.toUpperCase()]) })),
  },
  {
    title: "Edição",
    rows: [
      SHORTCUTS.undo,
      SHORTCUTS.redo,
      SHORTCUTS.selectAll,
      SHORTCUTS.delete,
      SHORTCUTS.deselect,
      SHORTCUTS.duplicate,
      SHORTCUTS.copy,
      SHORTCUTS.cut,
      SHORTCUTS.paste,
      SHORTCUTS.nudge,
      SHORTCUTS.nudgeFar,
    ].map(fromShortcut),
  },
  {
    title: "Arquivo",
    rows: [SHORTCUTS.saveFile, SHORTCUTS.openFile, SHORTCUTS.exportImage].map(fromShortcut),
  },
  {
    title: "Texto",
    rows: [
      SHORTCUTS.editText,
      SHORTCUTS.bold,
      SHORTCUTS.italic,
      SHORTCUTS.textBigger,
      SHORTCUTS.textSmaller,
    ].map(fromShortcut).concat({ label: SHORTCUTS.confirmText.label, combos: [SHORTCUTS.confirmText.keys, ["Esc"]] }),
  },
  {
    title: "Visualização",
    rows: [
      SHORTCUTS.zoomIn,
      SHORTCUTS.zoomOut,
      SHORTCUTS.zoomReset,
      SHORTCUTS.toggleGrid,
      SHORTCUTS.cycleGrid,
      SHORTCUTS.help,
    ].map(fromShortcut),
  },
  {
    title: "Com o mouse",
    rows: [
      { label: "Manter a proporção ao desenhar ou redimensionar", combos: [["Shift", "arrastar"]] },
      { label: "Girar em passos de 15°", combos: [["Shift", "girar"]] },
      { label: "Seta em ângulos de 45° ao desenhar ou arrastar as pontas e os pontos", combos: [["Shift", "arrastar"]] },
      { label: "Mover a tela", combos: [["Espaço", "arrastar"], ["botão do meio"], ["roda"]] },
      { label: "Mover a tela na horizontal", combos: [["Shift", "roda"]] },
      { label: "Zoom no cursor", combos: [["Ctrl", "roda"], ["pinça"]] },
      { label: "Escrever um texto ou rótulo", combos: [["duplo clique"]] },
      { label: "Levar o texto da seta ao longo dela (com a seta selecionada)", combos: [["arrastar o texto"]] },
    ],
  },
];

export function ShortcutTable() {
  return (
    <div className={styles.groups}>
      {SHORTCUT_GROUPS.map((group) => (
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
  return (
    <ul className={styles.tools}>
      {TOOLS.map(({ tool, label, icon: Icon, keys }) => (
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
