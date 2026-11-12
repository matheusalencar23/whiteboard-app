import type { IconType } from "react-icons";
import { LuGrid3X3, LuGrip, LuGroup, LuRedo2, LuTrash2, LuUndo2, LuUngroup } from "react-icons/lu";
import styles from "./Toolbar.module.scss";
import { TOOLS } from "./tools";
import { Divider } from "../../../ui/Divider/Divider";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { useBoardStore } from "../../../store/boardStore";
import type { GridStyle } from "../../../lib/render/grid";
import { SHORTCUTS, formatShortcut } from "../shortcuts";
import { canGroup, canUngroup } from "../../../lib/elements/groups";

const GRID_OPTIONS: { style: GridStyle; label: string; icon: IconType }[] = [
  { style: "dots", label: "Grade em pontos", icon: LuGrip },
  { style: "lines", label: "Grade em linhas", icon: LuGrid3X3 },
];

function shortcutLabel(keys: string[]) {
  return keys.map((k) => k.toUpperCase()).join(" / ");
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
  const groupAllowed = useBoardStore((s) => canGroup(s.elements, s.selectedIds, s.editingGroupId));
  const ungroupAllowed = useBoardStore((s) => canUngroup(s.elements, s.selectedIds, s.editingGroupId));
  const groupSelection = useBoardStore((s) => s.groupSelection);
  const ungroupSelection = useBoardStore((s) => s.ungroupSelection);
  const showGrid = useBoardStore((s) => s.showGrid);
  const gridStyle = useBoardStore((s) => s.gridStyle);
  const toggleGrid = useBoardStore((s) => s.toggleGrid);
  const setGridStyle = useBoardStore((s) => s.setGridStyle);

  return (
    <nav className={styles.toolbar} aria-label="Ferramentas">
      {TOOLS.map(({ tool: t, label, icon, keys }) => (
        <IconButton
          key={t}
          icon={icon}
          label={label}
          shortcut={shortcutLabel(keys)}
          badge={keys.find((k) => /\d/.test(k))}
          active={tool === t}
          activeMarker
          onClick={() => setTool(t)}
        />
      ))}

      <Divider />

      <IconButton icon={LuUndo2} label="Desfazer" shortcut={formatShortcut(SHORTCUTS.undo.keys)} disabled={!canUndo} onClick={undo} />
      <IconButton icon={LuRedo2} label="Refazer" shortcut={formatShortcut(SHORTCUTS.redo.keys)} disabled={!canRedo} onClick={redo} />
      <IconButton
        icon={LuTrash2}
        label="Apagar seleção"
        shortcut={formatShortcut(SHORTCUTS.delete.keys)}
        disabled={!hasSelection}
        onClick={() => deleteElements(useBoardStore.getState().selectedIds)}
      />
      <IconButton
        icon={LuGroup}
        label={SHORTCUTS.group.label}
        shortcut={formatShortcut(SHORTCUTS.group.keys)}
        disabled={!groupAllowed}
        onClick={groupSelection}
      />
      <IconButton
        icon={LuUngroup}
        label={SHORTCUTS.ungroup.label}
        shortcut={formatShortcut(SHORTCUTS.ungroup.keys)}
        disabled={!ungroupAllowed}
        onClick={ungroupSelection}
      />

      <Divider />

      {GRID_OPTIONS.map(({ style, label, icon }) => {
        const active = showGrid && gridStyle === style;
        return (
          <IconButton
            key={style}
            icon={icon}
            label={label}
            shortcut={formatShortcut((gridStyle === style ? SHORTCUTS.toggleGrid : SHORTCUTS.cycleGrid).keys)}
            active={active}
            activeMarker
            onClick={() => (active ? toggleGrid() : setGridStyle(style))}
          />
        );
      })}

    </nav>
  );
}
