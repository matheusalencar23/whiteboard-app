import type { Point } from "../../types";
import { distanceToPolygonEdge, isPointInPolygon } from "../../geometry/distance";
import { KAPPA, roundedPolygonFigure, sampleFigure } from "../../geometry/figure";
import {
  centeredArea,
  drawFillAndStroke,
  drawPathFigure,
  isFilled,
  resizeBox,
  scaleToBorder,
  type ShapeUtil,
} from "../shapeUtil";
import { hasRoundCorners } from "../style";
import type { DiamondElement } from "../types";

const ROUND_CUT_SHARE = 0.15;

const ROUND_TIP_INSET = (ROUND_CUT_SHARE / 2) * (1 - 0.75 * KAPPA);

const SHARP_CONNECTION_POINTS: readonly Point[] = [
  { x: 0.5, y: 0 },
  { x: 1, y: 0.5 },
  { x: 0.5, y: 1 },
  { x: 0, y: 0.5 },
];

const ROUND_CONNECTION_POINTS: readonly Point[] = [
  { x: 0.5, y: ROUND_TIP_INSET },
  { x: 1 - ROUND_TIP_INSET, y: 0.5 },
  { x: 0.5, y: 1 - ROUND_TIP_INSET },
  { x: ROUND_TIP_INSET, y: 0.5 },
];

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

function roundedDiamond(el: DiamondElement) {
  return roundedPolygonFigure(getDiamondVertices(el), (length) => length * ROUND_CUT_SHARE);
}

export function getDiamondOutline(el: DiamondElement): Point[] {
  return hasRoundCorners(el.style) ? sampleFigure(roundedDiamond(el)) : getDiamondVertices(el);
}

export const diamondUtil: ShapeUtil<DiamondElement> = {
  draw(el, rc, ctx) {
    if (hasRoundCorners(el.style)) {
      const figure = roundedDiamond(el);
      drawFillAndStroke(ctx, el.style, el.seed, (options) => drawPathFigure(rc, figure, options));
      return;
    }
    const vertices = getDiamondVertices(el).map((p): [number, number] => [p.x, p.y]);
    drawFillAndStroke(ctx, el.style, el.seed, (options) => rc.polygon(vertices, options));
  },

  hitTest(el, p, tolerance) {
    const t = tolerance + el.style.strokeWidth / 2;
    const outline = getDiamondOutline(el);
    if (distanceToPolygonEdge(p, outline) <= t) return true;
    return isFilled(el.style) && isPointInPolygon(p, outline);
  },

  resize: resizeBox,

  getBorderOffset(el, d) {
    return scaleToBorder(d, Math.abs(d.x) / (el.width / 2) + Math.abs(d.y) / (el.height / 2));
  },

  getConnectionPoints: (el) => [...(hasRoundCorners(el.style) ? ROUND_CONNECTION_POINTS : SHARP_CONNECTION_POINTS)],

  getLabelArea: (el) => centeredArea(el, 0.5, 0.5),
};
