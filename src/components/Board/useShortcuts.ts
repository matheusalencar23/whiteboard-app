import { useEffect } from "react";
import { useBoardStore } from "../../store/boardStore";
import { TOOLS } from "./Toolbar/tools";

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
        if (key === "z" && !e.shiftKey) store.undo();
        else if ((key === "z" && e.shiftKey) || key === "y") store.redo();
        else if (key === "a") {
          store.setTool("selection");
          store.setSelection(store.elements.map((el) => el.id));
        } else return;
        e.preventDefault();
        return;
      }

      if (e.altKey) return;

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
