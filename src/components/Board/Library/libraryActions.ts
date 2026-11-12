import type { Point } from "../../../lib/types";
import { centeredBounds, createLibraryElements, type LibraryItem } from "../../../lib/elements/library";
import { screenToWorld } from "../../../lib/viewport";
import { useBoardStore } from "../../../store/boardStore";

export const LIBRARY_DRAG_TYPE = "application/x-whiteboard-library-item";

export function insertLibraryItem(item: LibraryItem, screenPoint?: Point) {
  const { viewport, viewportSize, currentStyle, currentTextStyle, insertElements } = useBoardStore.getState();
  const screen = screenPoint ?? { x: viewportSize.width / 2, y: viewportSize.height / 2 };
  const bounds = centeredBounds(item, screenToWorld(screen, viewport));
  insertElements(createLibraryElements(item, bounds, currentStyle, currentTextStyle));
}
