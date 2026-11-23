import { canEdit } from "../../../store/whiteboardConfig";
import { useEffect, useRef } from "react";
import type { Point } from "../../../lib/types";
import type { BoardElement } from "../../../lib/elements/types";
import { cloneElementsAt } from "../../../lib/elements/clone";
import { parseClipboard, serializeClipboard } from "../../../lib/persistence";
import type { BoardStore } from "../../../store/boardStore";
import { useBoardStoreApi } from "../../../store/boardStoreContext";
import { useBoardRoot } from "../boardRoot";
import { isInPortal } from "../../../ui/portal";
import { isTypingTarget } from "../useShortcuts";

interface ClipboardOptions {
  getPastePosition: () => Point;
  createPastedText: (text: string, center: Point) => BoardElement;
}

const MIDDLE_BUTTON = 1;
const MIDDLE_PASTE_WINDOW = 500;

function isBlocked(boardStore: BoardStore, e: ClipboardEvent): boolean {
  const { helpOpen, exportOpen, config } = boardStore.getState();
  return isTypingTarget(e.target) || isInPortal(e.target) || helpOpen || exportOpen || !canEdit(config);
}

function copySelection(boardStore: BoardStore, e: ClipboardEvent): string[] | null {
  if (isBlocked(boardStore, e) || !e.clipboardData) return null;
  const { elements, selectedIds } = boardStore.getState();
  const ids = new Set(selectedIds);
  const selected = elements.filter((el) => ids.has(el.id));
  if (selected.length === 0) return null;
  e.clipboardData.setData("text/plain", serializeClipboard(selected));
  e.preventDefault();
  return selectedIds;
}

export function useClipboard(options: ClipboardOptions) {
  const boardStore = useBoardStoreApi();
  const rootRef = useBoardRoot();
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let middleButtonDown = false;
    let middleButtonReleasedAt = -Infinity;

    function isMiddleClickPaste(): boolean {
      return middleButtonDown || performance.now() - middleButtonReleasedAt < MIDDLE_PASTE_WINDOW;
    }

    function handleCopy(e: ClipboardEvent) {
      copySelection(boardStore, e);
    }

    function handleCut(e: ClipboardEvent) {
      const copied = copySelection(boardStore, e);
      if (copied) boardStore.getState().deleteElements(copied);
    }

    function handlePointerDown(e: PointerEvent) {
      if (e.button === MIDDLE_BUTTON) middleButtonDown = true;
    }

    function handlePointerUp(e: PointerEvent) {
      if (e.button !== MIDDLE_BUTTON) return;
      middleButtonDown = false;
      middleButtonReleasedAt = performance.now();
    }

    function handlePaste(e: ClipboardEvent) {
      if (isBlocked(boardStore, e)) return;
      if (isMiddleClickPaste()) {
        e.preventDefault();
        return;
      }
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (text.trim() === "") return;
      e.preventDefault();
      const { getPastePosition, createPastedText } = optionsRef.current;
      const position = getPastePosition();
      const elements = parseClipboard(text);
      const inserted = elements ? cloneElementsAt(elements, position) : [createPastedText(text, position)];
      boardStore.getState().insertElements(inserted);
    }

    root.addEventListener("copy", handleCopy);
    root.addEventListener("cut", handleCut);
    root.addEventListener("paste", handlePaste);
    root.addEventListener("pointerdown", handlePointerDown, true);
    root.addEventListener("pointerup", handlePointerUp, true);
    return () => {
      root.removeEventListener("pointerdown", handlePointerDown, true);
      root.removeEventListener("pointerup", handlePointerUp, true);
      root.removeEventListener("copy", handleCopy);
      root.removeEventListener("cut", handleCut);
      root.removeEventListener("paste", handlePaste);
    };
  }, [boardStore, rootRef]);
}
