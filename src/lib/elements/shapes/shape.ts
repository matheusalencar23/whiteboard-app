import type { Point } from "../../types";
import { getCenter, type Bounds } from "../../geometry/bounds";
import { distanceToPolygonEdge, distanceToPolyline, isPointInPolygon } from "../../geometry/distance";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Options } from "roughjs/bin/core";
import { figureToSvgPath, rayPolygonDistance, sampleFigure, type Figure } from "../../geometry/figure";
import { baseFields, drawFillAndStroke, isFilled, resizeBox, SIDE_MIDPOINTS, strokeOptions, type ShapeUtil } from "../shapeUtil";
import type { ShapeElement, ShapeKind } from "../types";
import { SHAPE_KIND_DEFINITIONS } from "./shapeKinds";

export function createShape(kind: ShapeKind, bounds: Bounds): ShapeElement {
  return { ...baseFields(bounds), type: "shape", kind };
}

export function getShapeOutline(el: ShapeElement): Point[] {
  return sampleFigure(SHAPE_KIND_DEFINITIONS[el.kind].outline(el));
}

export function getShapeBoundary(el: ShapeElement): Point[] {
  if (!SHAPE_KIND_DEFINITIONS[el.kind].bindToBox) return getShapeOutline(el);
  return [
    { x: el.x, y: el.y },
    { x: el.x + el.width, y: el.y },
    { x: el.x + el.width, y: el.y + el.height },
    { x: el.x, y: el.y + el.height },
  ];
}

function getShapeDetails(el: ShapeElement): Point[][] {
  return (SHAPE_KIND_DEFINITIONS[el.kind].details?.(el, el.style.strokeWidth) ?? []).map(sampleFigure);
}

function borderOffset(el: ShapeElement, direction: Point): Point {
  const length = Math.hypot(direction.x, direction.y);
  if (length === 0) return { x: 0, y: 0 };
  const unit = { x: direction.x / length, y: direction.y / length };
  const reach = rayPolygonDistance(getCenter(el), unit, getShapeBoundary(el));
  return { x: unit.x * reach, y: unit.y * reach };
}

function drawFigure(rc: RoughCanvas, figure: Figure, options: Options) {
  if (figure.kind === "ellipse") {
    const { x, y, width, height } = figure.box;
    rc.ellipse(x + width / 2, y + height / 2, width, height, { ...options, curveFitting: 1 });
    return;
  }
  rc.path(figureToSvgPath(figure), { ...options, preserveVertices: true });
}

export const shapeUtil: ShapeUtil<ShapeElement> = {
  draw(el, rc, ctx) {
    const definition = SHAPE_KIND_DEFINITIONS[el.kind];
    const outline = definition.outline(el);
    drawFillAndStroke(ctx, el.style, el.seed, (options) => drawFigure(rc, outline, options));
    for (const detail of definition.details?.(el, el.style.strokeWidth) ?? []) {
      drawFigure(rc, detail, strokeOptions(el.style, el.seed));
    }
  },

  hitTest(el, p, tolerance) {
    const t = tolerance + el.style.strokeWidth / 2;
    const outline = getShapeOutline(el);
    if (distanceToPolygonEdge(p, outline) <= t) return true;
    if (isFilled(el.style) && isPointInPolygon(p, outline)) return true;
    return getShapeDetails(el).some((detail) => distanceToPolyline(p, detail) <= t);
  },

  resize: resizeBox,

  getBorderOffset: borderOffset,

  getConnectionPoints: (el) => [...(SHAPE_KIND_DEFINITIONS[el.kind].connectionPoints ?? SIDE_MIDPOINTS)],

  getLabelArea: (el) => SHAPE_KIND_DEFINITIONS[el.kind].labelArea(el, el.style.strokeWidth),
};
