import { LuRedo2, LuTrash2, LuUndo2 } from "react-icons/lu";
import styles from "./Toolbar.module.scss";
import { TOOLS } from "./tools";
import { Divider } from "../../../ui/Divider/Divider";
import { useBoardStore } from "../../../store/boardStore";

function shortcutLabel(keys: string[]) {
  return keys.map((k) => k.toUpperCase()).join(" ou ");
}

/**
 * Tira o foco do botão depois do clique. Sem isso, o Espaço (usado para mover
 * a tela) "clicaria" de novo no último botão.
 */
function blurAfter(action: () => void) {
  return (e: React.MouseEvent<HTMLButtonElement>) => {
    action();
    e.currentTarget.blur();
  };
}

export function Toolbar() {
  const tool = useBoardStore((s) => s.tool);
  const setTool = useBoardStore((s) => s.setTool);
  const canUndo = useBoardStore((s) => s.past.length > 0);
  const canRedo = useBoardStore((s) => s.future.length > 0);
  const hasSelection = useBoardStore((s) => s.selectedIds.length > 0);
  const undo = useBoardStore((s) => s.undo);
  const redo = useBoardStore((s) => s.redo);
  const deleteElements = useBoardStore((s) => s.deleteElements);

  return (
    <div className={styles.toolbar}>
      {TOOLS.map(({ tool: t, label, icon: Icon, keys }) => (
        <button
          key={t}
          type="button"
          className={styles.button}
          data-active={tool === t}
          title={`${label} (${shortcutLabel(keys)})`}
          aria-label={label}
          aria-pressed={tool === t}
          onClick={blurAfter(() => setTool(t))}
        >
          <Icon />
          {/* Mostra o atalho numérico, se houver. */}
          {keys.find((k) => /\d/.test(k)) && (
            <span className={styles.shortcut}>{keys.find((k) => /\d/.test(k))}</span>
          )}
        </button>
      ))}

      <Divider />

      <button
        type="button"
        className={styles.button}
        title="Desfazer (Ctrl+Z)"
        aria-label="Desfazer"
        disabled={!canUndo}
        onClick={blurAfter(undo)}
      >
        <LuUndo2 />
      </button>
      <button
        type="button"
        className={styles.button}
        title="Refazer (Ctrl+Shift+Z)"
        aria-label="Refazer"
        disabled={!canRedo}
        onClick={blurAfter(redo)}
      >
        <LuRedo2 />
      </button>
      <button
        type="button"
        className={styles.button}
        title="Apagar seleção (Delete)"
        aria-label="Apagar seleção"
        disabled={!hasSelection}
        onClick={blurAfter(() => deleteElements(useBoardStore.getState().selectedIds))}
      >
        <LuTrash2 />
      </button>
    </div>
  );
}
