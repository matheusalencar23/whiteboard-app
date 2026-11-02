import type { Point } from "../../types";
import { getBounds } from "../bounds";

export interface Rectangle {
  id: string;
  points: Point[];
}

/** Monta os 4 cantos do retângulo a partir de dois cantos opostos. */
export function rectanglePoints(start: Point, end: Point): Point[] {
  return [start, { x: end.x, y: start.y }, end, { x: start.x, y: end.y }];
}

export function drawRectangle(
  rectangle: Rectangle,
  ctx: CanvasRenderingContext2D,
) {
  const { x, y, width, height } = getBounds(rectangle.points);
  ctx.strokeRect(x, y, width, height);
}
