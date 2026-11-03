import { containsPoint, expandBounds } from "../../geometry/bounds";
import { centeredArea, isFilled, resizeBox, roughOptions, scaleToBorder, SIDE_MIDPOINTS, type ShapeUtil } from "../shapeUtil";
import type { RectangleElement } from "../types";

export const rectangleUtil: ShapeUtil<RectangleElement> = {
  draw(el, rc) {
    rc.rectangle(el.x, el.y, el.width, el.height, roughOptions(el.style, el.seed));
  },

  hitTest(el, p, tolerance) {
    const t = tolerance + el.style.strokeWidth / 2;
    if (!containsPoint(expandBounds(el, t), p)) return false;
    if (isFilled(el.style)) return true;

    const inner = expandBounds(el, -t);
    return inner.width <= 0 || inner.height <= 0 || !containsPoint(inner, p);
  },

  resize: resizeBox,

  getBorderOffset(el, d) {
    return scaleToBorder(d, Math.max(Math.abs(d.x) / (el.width / 2), Math.abs(d.y) / (el.height / 2)));
  },

  getConnectionPoints: () => [...SIDE_MIDPOINTS],

  getLabelArea: (el) => centeredArea(el, 1, 1),
};
