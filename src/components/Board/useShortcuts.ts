import { useEffect } from "react";
import { useBoardStore } from "../../store/boardStore";
import { TOOLS } from "./Toolbar/tools";
import { selectTextScope, textSelectors } from "./StyleBar/selectors";
import { exportBoard, importBoard } from "./boardFileActions";
import { cloneElements } from "../../lib/elements/clone";
import type { Point } from "../../lib/types";

const DUPLICATE_OFFSET = 20;
const NUDGE_STEP = 1;
const NUDGE_STEP_FAR = 10;

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

function duplicateSelection() {
  const { elements, selectedIds, editingGroupId, viewport, insertElements } = useBoardStore.getState();
  const ids = new Set(selectedIds);
  const selected = elements.filter((el) => ids.has(el.id));
  const offset = DUPLICATE_OFFSET / viewport.zoom;
  insertElements(cloneElements(selected, { x: offset, y: offset }, editingGroupId));
}

export function useShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      const store = useBoardStore.getState();
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod) {
        const hasText = selectTextScope(store) !== "";
        if (hasText && key === "b" && !e.shiftKey) {
          store.setTextStyle({ bold: textSelectors.bold(store) !== true });
        } else if (hasText && key === "i" && !e.shiftKey) {
          store.setTextStyle({ italic: textSelectors.italic(store) !== true });
        } else if (hasText && e.shiftKey && (e.code === "Period" || e.code === "Comma")) {
          store.stepTextSize(e.code === "Period" ? 1 : -1);
        } else if (key === "=" || key === "+") store.stepZoom(1);
        else if (key === "-" || key === "_") store.stepZoom(-1);
        else if (key === "0") store.resetZoom();
        else if (key === "s" && !e.shiftKey) exportBoard();
        else if (key === "e" && e.shiftKey) store.setExportOpen(true);
        else if (key === "o" && !e.shiftKey) void importBoard();
        else if (key === "d" && !e.shiftKey) duplicateSelection();
        else if (key === "g") {
          if (e.shiftKey) store.ungroupSelection();
          else store.groupSelection();
        }
        else if (key === "z" && !e.shiftKey) store.undo();
        else if ((key === "z" && e.shiftKey) || key === "y") store.redo();
        else if (key === "a") {
          store.setTool("selection");
          store.setEditingGroup(null);
          store.setSelection(store.elements.map((el) => el.id));
        } else return;
        e.preventDefault();
        return;
      }

      if (e.altKey) return;

      if (e.key === "?") {
        store.setHelpOpen(!store.helpOpen);
        e.preventDefault();
        return;
      }

      const direction = NUDGE_DIRECTIONS[key];
      if (direction) {
        if (store.selectedIds.length === 0) return;
        const step = e.shiftKey ? NUDGE_STEP_FAR : NUDGE_STEP;
        store.translateElements(store.selectedIds, direction.x * step, direction.y * step, { record: !e.repeat });
      } else if (key === "delete" || key === "backspace") {
        store.deleteElements(store.selectedIds);
      } else if (key === "escape") {
        if (!store.exitEditingGroup()) store.setSelection([]);
      } else if (key === "g") {
        if (e.shiftKey) store.cycleGridStyle();
        else store.toggleGrid();
      } else {
        const definition = TOOLS.find((t) => t.keys.includes(key));
        if (!definition) return;
        store.setTool(definition.tool);
      }
      e.preventDefault();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
