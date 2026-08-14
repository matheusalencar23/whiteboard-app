import {
  getElementGeometry,
  getGroupBounds,
} from "../lib/geometry/elementOperations";
import type { CanvasElement } from "../lib/geometry/types";
import { useCanvasStore } from "../store/useCanvasStore";

export type PropertyValue<T> =
  | { value: T; mixed: false }
  | { value: null; mixed: true };

export function useSelectedElements() {
  const { elements: allElements, selectedElementIds } = useCanvasStore();

  const selected = allElements.filter((el) =>
    selectedElementIds.includes(el.id),
  );

  const bounds =
    selected.length === 1
      ? getElementGeometry(selected[0])
      : getGroupBounds(selected);

  const angle = selected.length === 1 ? selected[0].angle : 0;

  function getSelectedPropertyValue<K extends keyof CanvasElement>(
    key: K,
  ): PropertyValue<CanvasElement[K]> {
    if (selected.length === 0) return { value: null, mixed: true };
    const first = selected[0][key];
    const allSame = selected.every((el) => el[key] === first);
    return allSame
      ? { value: first, mixed: false }
      : { value: null, mixed: true };
  }

  return { selected, bounds, angle, getSelectedPropertyValue };
}
