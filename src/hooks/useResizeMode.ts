import { useRef } from "react";
import { hitTestRezizeHandle } from "../lib/canvas/handles";
import {
  type Bounds,
  type CanvasElement,
  type HandleType,
  type Point,
} from "../lib/geometry/types";
import { useCanvasStore } from "../store/useCanvasStore";
import { useSelectedElements } from "./useSelectedElements";
import {
  applyBoundsToElement,
  getElementGeometry,
} from "../lib/geometry/elementOperations";
import {
  calculateGroupResize,
  calculateRotatedResize,
} from "../lib/geometry/resize";

export function useResizeMode() {
  const activeHandle = useRef<HandleType | null>(null);
  const startBounds = useRef<Bounds | null>(null);
  const startSnapshot = useRef<CanvasElement[]>([]);

  const { selected, bounds, angle } = useSelectedElements();
  const { camera, setCursor, updateElement } = useCanvasStore();

  function tryStartResizing(worldPoint: Point): boolean {
    if (selected.length === 0 || !bounds) return false;

    const hit = hitTestRezizeHandle(worldPoint, bounds, camera.zoom, angle);
    if (!hit) return false;

    activeHandle.current = hit;
    startBounds.current = bounds;
    startSnapshot.current = [...selected];
    setCursor("grabbing");
    return true;
  }

  function applyResize(worldPoint: Point) {
    const handle = activeHandle.current;
    const groupBounds = startBounds.current;
    const snapshot = startSnapshot.current;

    if (!handle || !groupBounds || snapshot.length === 0) return;

    if (snapshot.length === 1) {
      const el = snapshot[0];
      const oldGeometry = getElementGeometry(el);
      const newBounds = calculateRotatedResize(
        oldGeometry,
        el.angle,
        handle,
        worldPoint,
      );
      updateElement(el.id, applyBoundsToElement(el, oldGeometry, newBounds, handle));
      return;
    }

    const resized = calculateGroupResize(
      snapshot,
      groupBounds,
      handle,
      worldPoint,
      getElementGeometry,
    );
    resized.forEach(({ id, bounds: newBounds }) => {
      const el = snapshot.find((e) => e.id === id)!;
      const oldGeometry = getElementGeometry(el);
      updateElement(id, applyBoundsToElement(el, oldGeometry, newBounds, handle));
    });
  }

  function isResizing() {
    return activeHandle.current !== null;
  }

  function stopResizing() {
    activeHandle.current = null;
    startBounds.current = null;
    startSnapshot.current = [];
  }

  function updateHoverCursor(worldPoint: Point): boolean {
    if (!bounds || isResizing()) return false;

    const hit = hitTestRezizeHandle(worldPoint, bounds, camera.zoom, angle);
    setCursor(hit ? "grab" : "default");
    return !!hit;
  }

  return {
    tryStartResizing,
    applyResize,
    isResizing,
    stopResizing,
    updateHoverCursor,
  };
}
