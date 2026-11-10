import { useEffect } from "react";
import { useBoardStore } from "../../store/boardStore";
import { TOOLS } from "./Toolbar/tools";
import { selectTextScope, textSelectors } from "./StyleBar/selectors";
import { exportBoard, importBoard } from "./boardFileActions";

export function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
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
        else if (key === "z" && !e.shiftKey) store.undo();
        else if ((key === "z" && e.shiftKey) || key === "y") store.redo();
        else if (key === "a") {
          store.setTool("selection");
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

      if (key === "delete" || key === "backspace") {
        store.deleteElements(store.selectedIds);
      } else if (key === "escape") {
        store.setSelection([]);
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
