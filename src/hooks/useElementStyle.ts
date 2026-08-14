import { useRef } from "react";
import { cloneElement } from "../lib/geometry/createElement";
import type { CanvasElement } from "../lib/geometry/types";
import { useCanvasStore } from "../store/useCanvasStore";
import { useSelectedElements } from "./useSelectedElements";

export function useElementStyle<K extends keyof CanvasElement>(key: K) {
  const { selected, getSelectedPropertyValue } = useSelectedElements();
  const { updateElement, commitHistory } = useCanvasStore();
  const beforeSnapshot = useRef<CanvasElement[] | null>(null);

  const property = getSelectedPropertyValue(key);

  function apply(newValue: CanvasElement[K]) {
    if (beforeSnapshot.current === null) {
      beforeSnapshot.current = useCanvasStore.getState().elements;
    }
    selected.forEach((el) => {
      updateElement(
        el.id,
        cloneElement(el, { [key]: newValue } as Partial<
          Omit<CanvasElement, "id" | "type">
        >),
      );
    });
  }

  function commit() {
    if (beforeSnapshot.current) {
      commitHistory(beforeSnapshot.current);
      beforeSnapshot.current = null;
    }
  }

  return { property, selected, apply, commit };
}
