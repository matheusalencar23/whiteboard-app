import type { Point } from "../../types";
import { distanceToPolygonEdge, isPointInPolygon } from "../../geometry/distance";
import { centeredArea, isFilled, resizeBox, roughOptions, scaleToBorder, type ShapeUtil } from "../shapeUtil";
import type { DiamondElement } from "../types";

export function getDiamondVertices(el: DiamondElement): Point[] {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  return [
    { x: cx, y: el.y },
    { x: el.x + el.width, y: cy },
    { x: cx, y: el.y + el.height },
    { x: el.x, y: cy },
  ];
}

export const diamondUtil: ShapeUtil<DiamondElement> = {
  draw(el, rc) {
    const vertices = getDiamondVertices(el).map((p): [number, number] => [p.x, p.y]);
    rc.polygon(vertices, roughOptions(el.style, el.seed));
  },

  hitTest(el, p, tolerance) {
    const t = tolerance + el.style.strokeWidth / 2;
    const vertices = getDiamondVertices(el);
    if (distanceToPolygonEdge(p, vertices) <= t) return true;
    return isFilled(el.style) && isPointInPolygon(p, vertices);
  },

  resize: resizeBox,

  getBorderOffset(el, d) {
    return scaleToBorder(d, Math.abs(d.x) / (el.width / 2) + Math.abs(d.y) / (el.height / 2));
  },

  getConnectionPoints: () => [
    { x: 0.5, y: 0 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 },
  ],

  getLabelArea: (el) => centeredArea(el, 0.5, 0.5),
};
