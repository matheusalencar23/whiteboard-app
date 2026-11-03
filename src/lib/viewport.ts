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
