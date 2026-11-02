import { nanoid } from "nanoid";
import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Point } from "../../types";
import { getBounds } from "../../geometry/bounds";
import { DEFAULT_STYLE, type RectangleElement } from "../types";

/** Cria um retângulo a partir de dois cantos opostos, em qualquer direção. */
export function createRectangle(start: Point, end: Point): RectangleElement {
  return {
    id: nanoid(),
    type: "rectangle",
    ...getBounds([start, end]),
    rotation: 0,
    style: { ...DEFAULT_STYLE },
    seed: rough.newSeed(),
  };
}

/** Atualiza a geometria mantendo id, estilo e seed. */
export function resizeRectangle(
  rectangle: RectangleElement,
  start: Point,
  end: Point,
): RectangleElement {
  return { ...rectangle, ...getBounds([start, end]) };
}

export function drawRectangle(rectangle: RectangleElement, rc: RoughCanvas) {
  const { x, y, width, height, style, seed } = rectangle;
  rc.rectangle(x, y, width, height, {
    seed,
    stroke: style.strokeColor,
    strokeWidth: style.strokeWidth,
    roughness: style.roughness,
    fill: style.fillColor === "transparent" ? undefined : style.fillColor,
  });
}
