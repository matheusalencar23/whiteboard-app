import { useEffect, useRef } from "react";
import type { Point } from "../../../lib/types";
import type { BoardElement } from "../../../lib/elements/types";
import { cloneElementsAt } from "../../../lib/elements/clone";
import { parseClipboard, serializeClipboard } from "../../../lib/persistence";
import { useBoardStore } from "../../../store/boardStore";
import { isTypingTarget } from "../useShortcuts";

interface ClipboardOptions {
  getPastePosition: () => Point;
  createPastedText: (text: string, center: Point) => BoardElement;
}

function isBlocked(e: ClipboardEvent): boolean {
  const { helpOpen, exportOpen } = useBoardStore.getState();
  return isTypingTarget(e.target) || helpOpen || exportOpen;
}

function copySelection(e: ClipboardEvent): string[] | null {
  if (isBlocked(e) || !e.clipboardData) return null;
  const { elements, selectedIds } = useBoardStore.getState();
  const ids = new Set(selectedIds);
  const selected = elements.filter((el) => ids.has(el.id));
  if (selected.length === 0) return null;
  e.clipboardData.setData("text/plain", serializeClipboard(selected));
  e.preventDefault();
  return selectedIds;
}

export function useClipboard(options: ClipboardOptions) {
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    function handleCopy(e: ClipboardEvent) {
      copySelection(e);
    }

    function handleCut(e: ClipboardEvent) {
      const copied = copySelection(e);
      if (copied) useBoardStore.getState().deleteElements(copied);
    }

    function handlePaste(e: ClipboardEvent) {
      if (isBlocked(e)) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (text.trim() === "") return;
      e.preventDefault();
      const { getPastePosition, createPastedText } = optionsRef.current;
      const position = getPastePosition();
      const elements = parseClipboard(text);
      const inserted = elements ? cloneElementsAt(elements, position) : [createPastedText(text, position)];
      useBoardStore.getState().insertElements(inserted);
    }

    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
    };
  }, []);
}
