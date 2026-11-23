import type { Point } from "../../../lib/types";
import { centeredBounds, createLibraryElements, type LibraryItem } from "../../../lib/elements/library";
import { screenToWorld } from "../../../lib/viewport";
import type { BoardStore } from "../../../store/boardStore";

export const LIBRARY_DRAG_TYPE = "application/x-whiteboard-library-item";

export function insertLibraryItem(boardStore: BoardStore, item: LibraryItem, screenPoint?: Point) {
  const { viewport, viewportSize, currentStyle, currentTextStyle, insertElements, messages } = boardStore.getState();
  const screen = screenPoint ?? { x: viewportSize.width / 2, y: viewportSize.height / 2 };
  const bounds = centeredBounds(item, screenToWorld(screen, viewport));
  insertElements(createLibraryElements(item, bounds, currentStyle, currentTextStyle, messages.content));
}
