import type { Point } from "./types";

export interface Viewport {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 10;

export const INITIAL_VIEWPORT: Viewport = { offsetX: 0, offsetY: 0, zoom: 1 };

export function screenToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.offsetX) / viewport.zoom,
    y: (point.y - viewport.offsetY) / viewport.zoom,
  };
}

export function worldToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.zoom + viewport.offsetX,
    y: point.y * viewport.zoom + viewport.offsetY,
  };
}

export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return {
    ...viewport,
    offsetX: viewport.offsetX + dx,
    offsetY: viewport.offsetY + dy,
  };
}

export const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8, 10];

const ZOOM_EPSILON = 0.001;

export function nextZoomStep(zoom: number, direction: 1 | -1): number {
  const step =
    direction === 1
      ? ZOOM_STEPS.find((s) => s > zoom + ZOOM_EPSILON)
      : ZOOM_STEPS.findLast((s) => s < zoom - ZOOM_EPSILON);
  return step ?? (direction === 1 ? MAX_ZOOM : MIN_ZOOM);
}

export function zoomTo(viewport: Viewport, screenPoint: Point, zoom: number): Viewport {
  return zoomAt(viewport, screenPoint, zoom / viewport.zoom);
}

export function zoomAt(
  viewport: Viewport,
  screenPoint: Point,
  factor: number,
): Viewport {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor));
  const world = screenToWorld(screenPoint, viewport);
  return {
    zoom,
    offsetX: screenPoint.x - world.x * zoom,
    offsetY: screenPoint.y - world.y * zoom,
  };
}
