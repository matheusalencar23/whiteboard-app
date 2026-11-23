import { useEffect } from "react";
import type { BoardStore } from "../../store/boardStore";
import type { BoardRootRef } from "./boardRoot";
import { isInPortal } from "../../ui/portal";
import { useBoardStoreApi } from "../../store/boardStoreContext";
import { TOOLS } from "./Toolbar/tools";
import { selectTextScope, textSelectors } from "./StyleBar/selectors";
import { exportBoard, importBoard } from "./boardFileActions";
import { toggleColorScheme } from "../useColorScheme";
import { cloneElements } from "../../lib/elements/clone";
import type { Point } from "../../lib/types";
import { canEdit, isToolAllowed } from "../../store/whiteboardConfig";

const DUPLICATE_OFFSET = 20;
const NUDGE_STEP = 1;
const NUDGE_STEP_FAR = 10;

const ORDER_KEYS = new Map([
  ["]", true],
  ["}", true],
  ["[", false],
  ["{", false],
]);

const NUDGE_DIRECTIONS: Record<string, Point> = {
  arrowup: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
};

export function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function duplicateSelection(boardStore: BoardStore) {
  const { elements, selectedIds, editingGroupId, viewport, insertElements } = boardStore.getState();
  const ids = new Set(selectedIds);
  const selected = elements.filter((el) => ids.has(el.id));
  const offset = DUPLICATE_OFFSET / viewport.zoom;
  insertElements(cloneElements(selected, { x: offset, y: offset }, editingGroupId));
}

export function useShortcuts(rootRef: BoardRootRef) {
  const boardStore = useBoardStoreApi();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || isInPortal(e.target)) return;

      const store = boardStore.getState();
      const { config } = store;
      const editable = canEdit(config);
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod) {
        const hasText = editable && selectTextScope(store) !== "";
        if (hasText && key === "b" && !e.shiftKey) {
          store.setTextStyle({ bold: textSelectors.bold(store) !== true });
        } else if (hasText && key === "i" && !e.shiftKey) {
          store.setTextStyle({ italic: textSelectors.italic(store) !== true });
        } else if (hasText && key === "u" && !e.shiftKey) {
          store.setTextStyle({ underline: textSelectors.underline(store) !== true });
        } else if (hasText && e.shiftKey && (e.code === "Period" || e.code === "Comma")) {
          store.stepTextSize(e.code === "Period" ? 1 : -1);
        } else if (editable && ORDER_KEYS.has(key)) {
          const up = ORDER_KEYS.get(key);
          store.reorderSelection(e.shiftKey ? (up ? "front" : "back") : up ? "forward" : "backward");
        } else if (config.zoomControls && (key === "=" || key === "+")) store.stepZoom(1);
        else if (config.zoomControls && (key === "-" || key === "_")) store.stepZoom(-1);
        else if (config.zoomControls && key === "0") store.resetZoom();
        else if (config.saveFile && key === "s" && !e.shiftKey) exportBoard(boardStore);
        else if (config.exportImage && key === "e" && e.shiftKey) store.setExportOpen(true);
        else if (config.openFile && key === "o" && !e.shiftKey) void importBoard(boardStore);
        else if (editable && key === "d" && !e.shiftKey) duplicateSelection(boardStore);
        else if (editable && key === "g") {
          if (e.shiftKey) store.ungroupSelection();
          else store.groupSelection();
        }
        else if (editable && key === "z" && !e.shiftKey) store.undo();
        else if (editable && ((key === "z" && e.shiftKey) || key === "y")) store.redo();
        else if (key === "a") {
          if (isToolAllowed(config, "selection")) {
            store.setTool("selection");
            store.setEditingGroup(null);
            store.setSelection(store.elements.map((el) => el.id));
          }
        } else return;
        e.preventDefault();
        return;
      }

      if (e.altKey) {
        if (!config.themeToggle || !e.shiftKey || e.code !== "KeyD") return;
        toggleColorScheme(boardStore);
        e.preventDefault();
        return;
      }

      if (config.help && e.key === "?") {
        store.setHelpOpen(!store.helpOpen);
        e.preventDefault();
        return;
      }

      const direction = NUDGE_DIRECTIONS[key];
      if (direction) {
        if (!editable || store.selectedIds.length === 0) return;
        const step = e.shiftKey ? NUDGE_STEP_FAR : NUDGE_STEP;
        store.translateElements(store.selectedIds, direction.x * step, direction.y * step, { record: !e.repeat });
      } else if (editable && (key === "delete" || key === "backspace")) {
        store.deleteElements(store.selectedIds);
      } else if (key === "escape") {
        if (!store.exitEditingGroup()) store.setSelection([]);
      } else if (config.library && key === "l" && e.shiftKey) {
        store.setLibraryOpen(!store.libraryOpen);
      } else if (config.grid && key === "g") {
        if (e.shiftKey) store.cycleGridStyle();
        else store.toggleGrid();
      } else {
        const definition = TOOLS.find((t) => t.keys.includes(key) && isToolAllowed(config, t.tool));
        if (!definition) return;
        store.setTool(definition.tool);
      }
      e.preventDefault();
    }

    root.addEventListener("keydown", handleKeyDown);
    return () => root.removeEventListener("keydown", handleKeyDown);
  }, [boardStore, rootRef]);
}
