import { useCallback, useEffect, useRef } from "react";
import type { BoardElement, ElementStyle, TextStyle } from "../../../lib/elements/types";
import { useBoardStore } from "../../../store/boardStore";

export function useStylePreview() {
  const beforeRef = useRef<BoardElement[] | null>(null);

  const remember = useCallback(() => {
    beforeRef.current ??= useBoardStore.getState().elements;
  }, []);

  const preview = useCallback(
    (patch: Partial<ElementStyle>) => {
      remember();
      useBoardStore.getState().setStyle(patch, { record: false });
    },
    [remember],
  );

  const previewText = useCallback(
    (patch: Partial<TextStyle>) => {
      remember();
      useBoardStore.getState().setTextStyle(patch, { record: false });
    },
    [remember],
  );

  const commit = useCallback(() => {
    const before = beforeRef.current;
    beforeRef.current = null;
    if (before) useBoardStore.getState().commitHistory(before);
  }, []);

  useEffect(() => commit, [commit]);

  return { preview, previewText, commit };
}
