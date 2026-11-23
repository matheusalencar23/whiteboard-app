import styles from "./Help.module.scss";
import { Keys } from "./Keys";
import { SHORTCUTS, type ShortcutId } from "../shortcuts";
import type { Messages, ShortcutGroupId } from "../../../i18n/messages";
import { RichText } from "./RichText";
import { useMessages } from "../../../i18n/useMessages";
import { TOOLS } from "../Toolbar/tools";
import { useBoardStore } from "../../../store/boardStoreContext";
import { canEdit, hasBoardMenu, isToolAllowed, type WhiteboardConfig } from "../../../store/whiteboardConfig";


type ConfigCheck = (config: WhiteboardConfig) => boolean;

interface ShortcutRow {
  label: (messages: Messages) => string;
  combos: string[][];
  when?: ConfigCheck;
}

const whenEditable: ConfigCheck = canEdit;

function fromShortcut(id: ShortcutId, when?: ConfigCheck): ShortcutRow {
  return { label: (messages) => messages.shortcuts[id], combos: [SHORTCUTS[id].keys], when };
}

function editingRows(ids: ShortcutId[]): ShortcutRow[] {
  return ids.map((id) => fromShortcut(id, whenEditable));
}

const SHORTCUT_GROUPS: { title: ShortcutGroupId; rows: ShortcutRow[] }[] = [
  {
    title: "tools",
    rows: TOOLS.map(({ tool, keys }) => ({
      label: (messages) => messages.tools[tool],
      combos: keys.map((key) => [key.toUpperCase()]),
      when: (config) => config.tools.includes(tool),
    })),
  },
  {
    title: "editing",
    rows: editingRows([
      "undo",
      "redo",
      "delete",
      "deselect",
      "duplicate",
      "copy",
      "cut",
      "paste",
      "group",
      "ungroup",
      "bringToFront",
      "bringForward",
      "sendBackward",
      "sendToBack",
      "nudge",
      "nudgeFar",
    ]).concat(fromShortcut("selectAll", (config) => isToolAllowed(config, "selection"))),
  },
  {
    title: "file",
    rows: [
      fromShortcut("saveFile", (config) => config.saveFile),
      fromShortcut("openFile", (config) => config.openFile),
      fromShortcut("exportImage", (config) => config.exportImage),
    ],
  },
  {
    title: "text",
    rows: editingRows([
      "editText",
      "bold",
      "italic",
      "underline",
      "textBigger",
      "textSmaller",
    ]).concat({ label: (messages) => messages.shortcuts.confirmText, combos: [SHORTCUTS.confirmText.keys, ["Esc"]], when: whenEditable }),
  },
  {
    title: "view",
    rows: [
      fromShortcut("zoomIn", (config) => config.zoomControls),
      fromShortcut("zoomOut", (config) => config.zoomControls),
      fromShortcut("zoomReset", (config) => config.zoomControls),
      fromShortcut("library", (config) => config.library),
      fromShortcut("toggleGrid", (config) => config.grid),
      fromShortcut("cycleGrid", (config) => config.grid),
      fromShortcut("toggleTheme", (config) => config.themeToggle),
      fromShortcut("help"),
    ],
  },
  {
    title: "mouse",
    rows: [
      { label: (messages) => messages.help.mouse.keepRatio, combos: [["Shift", "drag"]], when: whenEditable },
      { label: (messages) => messages.help.mouse.rotateSteps, combos: [["Shift", "rotate"]], when: whenEditable },
      { label: (messages) => messages.help.mouse.arrowAngles, combos: [["Shift", "drag"]], when: whenEditable },
      { label: (messages) => messages.help.mouse.pan, combos: [["Space", "drag"], ["middleButton"], ["wheel"]] },
      { label: (messages) => messages.help.mouse.panHorizontal, combos: [["Shift", "wheel"]] },
      { label: (messages) => messages.help.mouse.zoomAtCursor, combos: [["Ctrl", "wheel"], ["pinch"]] },
      { label: (messages) => messages.help.mouse.writeText, combos: [["doubleClick"]], when: whenEditable },
      { label: (messages) => messages.help.mouse.insertShape, combos: [["click"], ["dragToBoard"]], when: (config) => config.library },
      { label: (messages) => messages.help.mouse.enterGroup, combos: [["doubleClick"]], when: whenEditable },
      { label: (messages) => messages.help.mouse.moveArrowLabel, combos: [["dragText"]], when: whenEditable },
    ],
  },
];

export function ShortcutTable() {
  const config = useBoardStore((s) => s.config);
  const messages = useMessages();
  const groups = SHORTCUT_GROUPS.map((group) => ({
    ...group,
    rows: group.rows.filter((row) => !row.when || row.when(config)),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section key={group.title} className={styles.group}>
          <h3 className={styles.groupTitle}>{messages.help.groups[group.title]}</h3>
          <dl className={styles.table}>
            {group.rows.map((row) => (
              <div key={row.label(messages)} className={styles.row}>
                <dt>{row.label(messages)}</dt>
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
  const messages = useMessages();
  return (
    <ul className={styles.tools}>
      {TOOLS.filter(({ tool }) => tools.includes(tool)).map(({ tool, icon: Icon, keys }) => (
        <li key={tool} className={styles.tool}>
          <span className={styles.toolIcon}>
            <Icon />
          </span>
          <span className={styles.toolText}>
            <span className={styles.toolName}>
              {messages.tools[tool]} <Keys combos={keys.map((key) => [key.toUpperCase()])} />
            </span>
            <span>{messages.help.tools[tool]}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function NavigationHelp() {
  const config = useBoardStore((s) => s.config);
  const { navigation } = useMessages().help;
  const items = [
    navigation.pan,
    navigation.zoom,
    config.zoomControls && navigation.zoomButtons,
    config.grid && navigation.grid,
    config.themeToggle && navigation.theme,
  ].filter((item) => typeof item === "string");
  return <RichList items={items} />;
}

function RichList({ items }: { items: readonly string[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item}>
          <RichText text={item} />
        </li>
      ))}
    </ul>
  );
}

export function StartHelp() {
  const messages = useMessages();
  const config = useBoardStore((s) => s.config);
  const { start } = messages.help;
  const note = [
    start.name,
    config.rename && start.rename,
    hasBoardMenu(config) && start.menu,
    config.saveFile && start.save,
    config.openFile && start.open,
    config.exportImage && start.image,
  ].filter((sentence) => typeof sentence === "string");

  return (
    <>
      <ol className={styles.steps}>
        {start.steps.map((step) => (
          <li key={step}>
            <RichText text={step} />
          </li>
        ))}
      </ol>
      <p className={styles.note}>
        {note.map((sentence, i) => (
          <span key={sentence}>
            {i > 0 && " "}
            <RichText text={sentence} />
          </span>
        ))}
      </p>
    </>
  );
}

export function DiagramsHelp() {
  return <RichList items={useMessages().help.diagrams} />;
}

export function TextHelp() {
  return <RichList items={useMessages().help.text} />;
}

export function StyleHelp() {
  return <RichList items={useMessages().help.style} />;
}
