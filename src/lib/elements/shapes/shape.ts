import type { Point } from "../../types";
import { getCenter, type Bounds } from "../../geometry/bounds";
import { distanceToPolygonEdge, distanceToPolyline, isPointInPolygon } from "../../geometry/distance";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Options } from "roughjs/bin/core";
import { rayPolygonDistance, sampleFigure, type Figure } from "../../geometry/figure";
import { baseFields, drawFillAndStroke, drawPathFigure, isFilled, resizeBox, SIDE_MIDPOINTS, strokeOptions, type ShapeUtil } from "../shapeUtil";
import type { ElementStyle, ShapeElement, ShapeKind } from "../types";
import { SHAPE_KIND_DEFINITIONS, type ShapeDetail } from "./shapeKinds";

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

function getShapeDetails(el: ShapeElement): ShapeDetail[] {
  return SHAPE_KIND_DEFINITIONS[el.kind].details?.(el, el.style.strokeWidth) ?? [];
}

function isDetailSolid(detail: ShapeDetail, style: ElementStyle): boolean {
  return detail.fill === "stroke" || (detail.fill === "shape" && isFilled(style));
}

function hitsDetail(detail: ShapeDetail, el: ShapeElement, p: Point, tolerance: number): boolean {
  const points = sampleFigure(detail);
  if (isClosedFigure(detail) && isDetailSolid(detail, el.style) && isPointInPolygon(p, points)) return true;
  return isClosedFigure(detail) ? distanceToPolygonEdge(p, points) <= tolerance : distanceToPolyline(p, points) <= tolerance;
}

function solidOptions(el: ShapeElement): Options {
  return { ...strokeOptions(el.style, el.seed), fill: el.style.strokeColor, fillStyle: "solid" };
}

function drawDetail(rc: RoughCanvas, ctx: CanvasRenderingContext2D, el: ShapeElement, detail: ShapeDetail) {
  const stroke = strokeOptions(el.style, el.seed);
  if (detail.fill === "stroke") {
    drawFigure(rc, detail, solidOptions(el));
  } else if (detail.fill === "shape") {
    drawFillAndStroke(ctx, el.style, el.seed, (options) => drawFigure(rc, detail, options));
  } else {
    drawFigure(rc, detail, stroke);
  }
}

function borderOffset(el: ShapeElement, direction: Point): Point {
  const length = Math.hypot(direction.x, direction.y);
  if (length === 0) return { x: 0, y: 0 };
  const unit = { x: direction.x / length, y: direction.y / length };
  const reach = rayPolygonDistance(getCenter(el), unit, getShapeBoundary(el));
  return { x: unit.x * reach, y: unit.y * reach };
}

function isClosedFigure(figure: Figure): boolean {
  return figure.kind === "ellipse" || figure.closed;
}

function drawFigure(rc: RoughCanvas, figure: Figure, options: Options) {
  if (figure.kind === "ellipse") {
    const { x, y, width, height } = figure.box;
    rc.ellipse(x + width / 2, y + height / 2, width, height, { ...options, curveFitting: 1 });
    return;
  }
  drawPathFigure(rc, figure, options);
}

export const shapeUtil: ShapeUtil<ShapeElement> = {
  draw(el, rc, ctx) {
    const definition = SHAPE_KIND_DEFINITIONS[el.kind];
    const outline = definition.outline(el);
    if (definition.solid) drawFigure(rc, outline, solidOptions(el));
    else if (isClosedFigure(outline)) drawFillAndStroke(ctx, el.style, el.seed, (options) => drawFigure(rc, outline, options));
    else drawFigure(rc, outline, strokeOptions(el.style, el.seed));
    for (const detail of getShapeDetails(el)) drawDetail(rc, ctx, el, detail);
  },

  hitTest(el, p, tolerance) {
    const t = tolerance + el.style.strokeWidth / 2;
    const definition = SHAPE_KIND_DEFINITIONS[el.kind];
    const figure = definition.outline(el);
    const outline = sampleFigure(figure);
    if (!isClosedFigure(figure)) {
      if (distanceToPolyline(p, outline) <= t) return true;
    } else {
      if (distanceToPolygonEdge(p, outline) <= t) return true;
      if ((definition.solid || isFilled(el.style)) && isPointInPolygon(p, outline)) return true;
    }
    return getShapeDetails(el).some((detail) => hitsDetail(detail, el, p, t));
  },

  resize: resizeBox,

  getBorderOffset: borderOffset,

  getConnectionPoints: (el) => [...(SHAPE_KIND_DEFINITIONS[el.kind].connectionPoints ?? SIDE_MIDPOINTS)],

  getLabelArea: (el) => SHAPE_KIND_DEFINITIONS[el.kind].labelArea(el, el.style.strokeWidth),

  getLabelRotation: (el) => SHAPE_KIND_DEFINITIONS[el.kind].labelRotation ?? 0,
};
