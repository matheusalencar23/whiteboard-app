import type { Point } from "../../types";
import { centeredArea, isFilled, resizeBox, roughOptions, scaleToBorder, SIDE_MIDPOINTS, type ShapeUtil } from "../shapeUtil";
import type { EllipseElement } from "../types";

function isInsideEllipse(p: Point, center: Point, rx: number, ry: number) {
  if (rx <= 0 || ry <= 0) return false;
  return ((p.x - center.x) / rx) ** 2 + ((p.y - center.y) / ry) ** 2 <= 1;
}

export const ellipseUtil: ShapeUtil<EllipseElement> = {
  draw(el, rc) {
    rc.ellipse(
      el.x + el.width / 2,
      el.y + el.height / 2,
      el.width,
      el.height,
      roughOptions(el.style, el.seed),
    );
  },

  hitTest(el, p, tolerance) {
    const t = tolerance + el.style.strokeWidth / 2;
    const center = { x: el.x + el.width / 2, y: el.y + el.height / 2 };
    const rx = el.width / 2;
    const ry = el.height / 2;

    if (!isInsideEllipse(p, center, rx + t, ry + t)) return false;
    if (isFilled(el.style)) return true;
    // Aproximação da faixa da borda: entre a elipse expandida e a encolhida.
    return !isInsideEllipse(p, center, rx - t, ry - t);
  },

  resize: resizeBox,

  getBorderOffset(el, d) {
    return scaleToBorder(d, Math.hypot(d.x / (el.width / 2), d.y / (el.height / 2)));
  },

  getConnectionPoints: () => [...SIDE_MIDPOINTS],

  // Retângulo inscrito na elipse.
  getLabelArea: (el) => centeredArea(el, Math.SQRT1_2, Math.SQRT1_2),
};
