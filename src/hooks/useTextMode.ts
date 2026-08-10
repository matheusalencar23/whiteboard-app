import { cloneElement, createElement } from "../lib/geometry/createElement";
import { measureText } from "../lib/geometry/shapes/text";
import type { Point } from "../lib/geometry/types";
import { useCanvasStore } from "../store/useCanvasStore";

export function useTextMode() {
  const { elements, addElement, startEditingSession, setTool } =
    useCanvasStore();

  function startCreating(worldPoint: Point) {
    const before = elements;
    const el = createElement("text", { x: worldPoint.x, y: worldPoint.y });
    addElement(el);
    startEditingSession(el.id, before);
    setTool("selection");
  }

  function startEditingExisting(id: string) {
    startEditingSession(id, elements);
  }

  function finishEditing(id: string, text: string) {
    console.trace("[text] finishEditing chamado com text:", JSON.stringify(text));
    const {
      elements,
      editingBeforeSnapshot,
      endEditingSession,
      deleteElement,
      updateElement,
      setSelectedElementIds,
      commitHistory,
    } = useCanvasStore.getState();

    const el = elements.find((e) => e.id === id);
    endEditingSession();
    if (!el || el.type !== "text") return;

    if (text.trim() === "") {
      deleteElement(id);
      commitHistory(editingBeforeSnapshot);
      return;
    }

    const { width, height } = measureText(text, el.fontSize);
    updateElement(id, cloneElement(el, { text, width, height }));
    setSelectedElementIds([id]);
    commitHistory(editingBeforeSnapshot);
  }

  return { startCreating, startEditingExisting, finishEditing };
}
