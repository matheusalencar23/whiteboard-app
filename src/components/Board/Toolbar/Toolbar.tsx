import type { IconType } from "react-icons";
import { LuGrid3X3, LuGrip, LuGroup, LuShapes, LuRedo2, LuTrash2, LuUndo2, LuUngroup } from "react-icons/lu";
import styles from "./Toolbar.module.scss";
import { TOOLS } from "./tools";
import { Divider } from "../../../ui/Divider/Divider";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { useBoardStore, useBoardStoreApi } from "../../../store/boardStoreContext";
import type { GridStyle } from "../../../lib/render/grid";
import { SHORTCUTS, formatShortcut } from "../shortcuts";
import { canGroup, canUngroup } from "../../../lib/elements/groups";
import { canEdit } from "../../../store/whiteboardConfig";
import { useMessages } from "../../../i18n/useMessages";

const GRID_OPTIONS: { style: GridStyle; label: "gridDots" | "gridLines"; icon: IconType }[] = [
  { style: "dots", label: "gridDots", icon: LuGrip },
  { style: "lines", label: "gridLines", icon: LuGrid3X3 },
];

function shortcutLabel(keys: string[]) {
  return keys.map((k) => k.toUpperCase()).join(" / ");
}

export function Toolbar() {
  const messages = useMessages();
  const tool = useBoardStore((s) => s.tool);
  const setTool = useBoardStore((s) => s.setTool);
  const showGrid = useBoardStore((s) => s.showGrid);
  const gridStyle = useBoardStore((s) => s.gridStyle);
  const toggleGrid = useBoardStore((s) => s.toggleGrid);
  const setGridStyle = useBoardStore((s) => s.setGridStyle);
  const libraryOpen = useBoardStore((s) => s.libraryOpen);
  const setLibraryOpen = useBoardStore((s) => s.setLibraryOpen);
  const config = useBoardStore((s) => s.config);
  const tools = TOOLS.filter((definition) => config.tools.includes(definition.tool));
  const showTools = tools.length > 0 || config.library;
  const editable = canEdit(config);

  return (
    <nav className={styles.toolbar} aria-label={messages.toolbar.label}>
      {tools.map(({ tool: t, icon, keys }) => (
        <IconButton
          key={t}
          icon={icon}
          label={messages.tools[t]}
          shortcut={shortcutLabel(keys)}
          badge={keys.find((k) => /\d/.test(k))}
          active={tool === t}
          activeMarker
          onClick={() => setTool(t)}
        />
      ))}
      {config.library && (
        <IconButton
          icon={LuShapes}
          label={messages.toolbar.library}
          shortcut={formatShortcut(SHORTCUTS.library.keys)}
          active={libraryOpen}
          activeMarker
          onClick={() => setLibraryOpen(!libraryOpen)}
        />
      )}

      {editable && (
        <>
          {showTools && <Divider />}
          <EditButtons />
        </>
      )}

      {config.grid && (showTools || editable) && <Divider />}

      {config.grid &&
        GRID_OPTIONS.map(({ style, label, icon }) => {
          const active = showGrid && gridStyle === style;
          return (
            <IconButton
              key={style}
              icon={icon}
              label={messages.toolbar[label]}
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

function EditButtons() {
  const messages = useMessages();
  const boardStore = useBoardStoreApi();
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

  return (
    <>
      <IconButton icon={LuUndo2} label={messages.shortcuts.undo} shortcut={formatShortcut(SHORTCUTS.undo.keys)} disabled={!canUndo} onClick={undo} />
      <IconButton icon={LuRedo2} label={messages.shortcuts.redo} shortcut={formatShortcut(SHORTCUTS.redo.keys)} disabled={!canRedo} onClick={redo} />
      <IconButton
        icon={LuTrash2}
        label={messages.shortcuts.delete}
        shortcut={formatShortcut(SHORTCUTS.delete.keys)}
        disabled={!hasSelection}
        onClick={() => deleteElements(boardStore.getState().selectedIds)}
      />
      <IconButton
        icon={LuGroup}
        label={messages.shortcuts.group}
        shortcut={formatShortcut(SHORTCUTS.group.keys)}
        disabled={!groupAllowed}
        onClick={groupSelection}
      />
      <IconButton
        icon={LuUngroup}
        label={messages.shortcuts.ungroup}
        shortcut={formatShortcut(SHORTCUTS.ungroup.keys)}
        disabled={!ungroupAllowed}
        onClick={ungroupSelection}
      />
    </>
  );
}
