import { useCallback, useEffect, useRef } from "react";
import type { BoardElement, ElementStyle } from "../../../lib/elements/types";
import { useBoardStore } from "../../../store/boardStore";

export function useStylePreview() {
  const beforeRef = useRef<BoardElement[] | null>(null);

  const preview = useCallback((patch: Partial<ElementStyle>) => {
    const store = useBoardStore.getState();
    beforeRef.current ??= store.elements;
    store.setStyle(patch, { record: false });
  }, []);

  const commit = useCallback(() => {
    const before = beforeRef.current;
    beforeRef.current = null;
    if (before) useBoardStore.getState().commitHistory(before);
  }, []);

  useEffect(() => commit, [commit]);

  return { preview, commit };
}
