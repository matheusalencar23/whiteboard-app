import { createElement } from "../lib/geometry/createElement";
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
    const {
      elements,
      editingBeforeSnapshot,
      endEditingSession,
      deleteElement,
      setSelectedElementIds,
      commitHistory,
    } = useCanvasStore.getState();

    const el = elements.find((e) => e.id === id);
    endEditingSession();
    if (!el || el.type !== "text") return;

    if (text.trim() === "") {
      const previous = editingBeforeSnapshot.find((element) => element.id === id);
      if (!previous) {
        deleteElement(id);
      } else {
        useCanvasStore.getState().updateElement(id, previous);
        setSelectedElementIds([id]);
      }
      return;
    }

    const previous = editingBeforeSnapshot.find((element) => element.id === id);
    if (previous?.type === "text" && previous.text === text) {
      setSelectedElementIds([id]);
      return;
    }

    setSelectedElementIds([id]);
    commitHistory(editingBeforeSnapshot);
  }

  function cancelEditing(id: string) {
    const {
      editingBeforeSnapshot,
      deleteElement,
      endEditingSession,
      setSelectedElementIds,
      updateElement,
    } = useCanvasStore.getState();

    if (!editingBeforeSnapshot.some((element) => element.id === id)) {
      deleteElement(id);
      setSelectedElementIds([]);
    } else {
      const previous = editingBeforeSnapshot.find(
        (element) => element.id === id,
      );
      if (previous) updateElement(id, previous);
    }
    endEditingSession();
  }

  return { startCreating, startEditingExisting, finishEditing, cancelEditing };
}
