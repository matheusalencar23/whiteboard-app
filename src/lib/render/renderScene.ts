import type { RoughCanvas } from "roughjs/bin/canvas";
import type { BoardElement } from "../elements/types";
import { drawRectangle } from "../elements/shapes/rectangle";
import type { Viewport } from "../viewport";

export function renderElement(element: BoardElement, rc: RoughCanvas) {
  switch (element.type) {
    case "rectangle":
      return drawRectangle(element, rc);
  }
}

/**
 * Limpa o canvas e desenha os elementos em coordenadas de mundo.
 * `dpr` é o devicePixelRatio usado para dimensionar o canvas.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  elements: BoardElement[],
  viewport: Viewport,
  dpr: number,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const scale = dpr * viewport.zoom;
  ctx.setTransform(
    scale,
    0,
    0,
    scale,
    viewport.offsetX * dpr,
    viewport.offsetY * dpr,
  );

  for (const element of elements) {
    renderElement(element, rc);
  }
}
