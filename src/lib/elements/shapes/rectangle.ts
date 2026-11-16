import { containsPoint, expandBounds } from "../../geometry/bounds";
import { distanceToPolygonEdge, isPointInPolygon } from "../../geometry/distance";
import { roundedRectFigure, sampleFigure } from "../../geometry/figure";
import {
  centeredArea,
  drawFillAndStroke,
  drawPathFigure,
  isFilled,
  resizeBox,
  scaleToBorder,
  SIDE_MIDPOINTS,
  type ShapeUtil,
} from "../shapeUtil";
import { hasRoundCorners } from "../style";
import type { RectangleElement } from "../types";

const CORNER_RADIUS_MAX = 32;
const CORNER_RADIUS_SHARE = 0.25;

function roundedRectangle(el: RectangleElement) {
  return roundedRectFigure(el, Math.min(CORNER_RADIUS_MAX, Math.min(el.width, el.height) * CORNER_RADIUS_SHARE));
}

export function getRoundedRectangleOutline(el: RectangleElement) {
  return sampleFigure(roundedRectangle(el));
}

export const rectangleUtil: ShapeUtil<RectangleElement> = {
  draw(el, rc, ctx) {
    if (hasRoundCorners(el.style)) {
      const figure = roundedRectangle(el);
      drawFillAndStroke(ctx, el.style, el.seed, (options) => drawPathFigure(rc, figure, options));
      return;
    }
    drawFillAndStroke(ctx, el.style, el.seed, (options) =>
      rc.rectangle(el.x, el.y, el.width, el.height, options),
    );
  },

  hitTest(el, p, tolerance) {
    const t = tolerance + el.style.strokeWidth / 2;
    if (!containsPoint(expandBounds(el, t), p)) return false;
    if (hasRoundCorners(el.style)) {
      const outline = getRoundedRectangleOutline(el);
      return distanceToPolygonEdge(p, outline) <= t || (isFilled(el.style) && isPointInPolygon(p, outline));
    }
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
