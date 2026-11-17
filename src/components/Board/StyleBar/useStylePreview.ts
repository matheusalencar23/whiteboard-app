import { useCallback, useEffect, useRef } from "react";
import type { BoardElement, ElementStyle, TextStyle } from "../../../lib/elements/types";
import { useBoardStoreApi } from "../../../store/boardStoreContext";

export function useStylePreview() {
  const boardStore = useBoardStoreApi();
  const beforeRef = useRef<BoardElement[] | null>(null);

  const remember = useCallback(() => {
    beforeRef.current ??= boardStore.getState().elements;
  }, [boardStore]);

  const preview = useCallback(
    (patch: Partial<ElementStyle>) => {
      remember();
      boardStore.getState().setStyle(patch, { record: false });
    },
    [boardStore, remember],
  );

  const previewText = useCallback(
    (patch: Partial<TextStyle>) => {
      remember();
      boardStore.getState().setTextStyle(patch, { record: false });
    },
    [boardStore, remember],
  );

  const commit = useCallback(() => {
    const before = beforeRef.current;
    beforeRef.current = null;
    if (before) boardStore.getState().commitHistory(before);
  }, [boardStore]);

  useEffect(() => commit, [commit]);

  return { preview, previewText, commit };
}
