import type { Point } from "./types";

/**
 * Câmera do board. Converte entre coordenadas de tela (pixels CSS relativos ao
 * canvas) e de mundo (onde os elementos vivem):
 *   tela = mundo * zoom + offset
 */
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

/** Desloca a câmera em pixels de tela. */
export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return {
    ...viewport,
    offsetX: viewport.offsetX + dx,
    offsetY: viewport.offsetY + dy,
  };
}

/** Aplica zoom mantendo fixo o ponto do mundo que está sob `screenPoint`. */
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
