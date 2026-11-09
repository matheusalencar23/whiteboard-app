import type { Point } from "../../types";
import { expandBounds, getBounds, unionBounds } from "../../geometry/bounds";
import { distance, distanceToPolyline } from "../../geometry/distance";
import { getPathMidpoint } from "../../geometry/path";
import type { Options } from "roughjs/bin/core";
import type { ArrowEnd } from "../bindings";
import {
  getArrowheadHoles,
  getArrowheadParts,
  getArrowheadPoints,
  type ArrowheadGeometry,
} from "../arrowheads";
import { baseFields, roughOptions, scalePoints, type ShapeUtil } from "../shapeUtil";
import {
  DEFAULT_ARROWHEADS,
  type ArrowElement,
  type ArrowheadPair,
  type ArrowRouting,
  type ArrowSegment,
} from "../types";

const LABEL_AREA_WIDTH = 216;

export function getArrowPoints(el: ArrowElement): Point[] {
  return el.points.map((p) => ({ x: el.x + p.x, y: el.y + p.y }));
}

function geometryFrom(points: Point[]) {
  const bounds = getBounds(points);
  return {
    ...bounds,
    points: points.map((p) => ({ x: p.x - bounds.x, y: p.y - bounds.y })),
  };
}

export function createArrow(
  start: Point,
  end: Point,
  routing: ArrowRouting = "straight",
  arrowheads: ArrowheadPair = DEFAULT_ARROWHEADS,
): ArrowElement {
  const geometry = geometryFrom([start, end]);
  return {
    ...baseFields(geometry),
    type: "arrow",
    points: geometry.points,
    routing,
    startArrowhead: arrowheads.start,
    endArrowhead: arrowheads.end,
    startBinding: null,
    endBinding: null,
  };
}

function shiftSegment(s: ArrowSegment, dx: number, dy: number): ArrowSegment {
  return {
    start: { x: s.start.x + dx, y: s.start.y + dy },
    end: { x: s.end.x + dx, y: s.end.y + dy },
  };
}

export function setArrowPoints(el: ArrowElement, points: Point[]): ArrowElement {
  const geometry = geometryFrom(points);
  if (!el.fixedSegments) return { ...el, ...geometry };
  const dx = el.x - geometry.x;
  const dy = el.y - geometry.y;
  return { ...el, ...geometry, fixedSegments: el.fixedSegments.map((s) => shiftSegment(s, dx, dy)) };
}

export function getFixedSegments(el: ArrowElement): ArrowSegment[] {
  return (el.fixedSegments ?? []).map((s) => shiftSegment(s, el.x, el.y));
}

export function setFixedSegments(el: ArrowElement, segments: ArrowSegment[]): ArrowElement {
  if (segments.length === 0) return { ...el, fixedSegments: undefined };
  return { ...el, fixedSegments: segments.map((s) => shiftSegment(s, -el.x, -el.y)) };
}

const CURVE_RANDOMNESS = 0.5;

const CURVE_SAMPLES = 16;

interface CubicSegment {
  from: Point;
  c1: Point;
  c2: Point;
  to: Point;
}

function curveSegments(points: Point[]): CubicSegment[] {
  const segments: CubicSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    segments.push({
      from: p1,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      to: p2,
    });
  }
  return segments;
}

function cubicAt({ from, c1, c2, to }: CubicSegment, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * from.x + b * c1.x + c * c2.x + d * to.x,
    y: a * from.y + b * c1.y + c * c2.y + d * to.y,
  };
}

function isCurve(el: ArrowElement): boolean {
  return el.routing === "curved" && el.points.length > 2;
}

const ELBOW_CORNER_RADIUS = 12;
const CORNER_SAMPLES = 6;

interface RoundedCorner {
  before: Point;
  corner: Point;
  after: Point;
}

function hasRoundedCorners(el: ArrowElement): boolean {
  return el.routing === "elbow" && el.points.length > 2;
}

function towards(from: Point, to: Point, length: number): Point {
  const d = distance(from, to);
  if (d === 0) return from;
  return { x: from.x + ((to.x - from.x) / d) * length, y: from.y + ((to.y - from.y) / d) * length };
}

function roundedCorners(points: Point[]): RoundedCorner[] {
  const corners: RoundedCorner[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];
    const radius = Math.min(ELBOW_CORNER_RADIUS, distance(prev, corner) / 2, distance(corner, next) / 2);
    corners.push({ before: towards(corner, prev, radius), corner, after: towards(corner, next, radius) });
  }
  return corners;
}

function quadraticAt(from: Point, control: Point, to: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  };
}

const CORNER_RANDOMNESS = 0.3;

function drawRoundedElbow(
  points: Point[],
  rc: Parameters<ShapeUtil<ArrowElement>["draw"]>[1],
  ctx: CanvasRenderingContext2D,
  options: Options,
) {
  ctx.save();
  ctx.lineCap = "round";
  const lineOptions = { ...options, preserveVertices: true };
  const arcOptions = { ...lineOptions, maxRandomnessOffset: CORNER_RANDOMNESS };
  let from = points[0];
  for (const { before, corner, after } of roundedCorners(points)) {
    rc.line(from.x, from.y, before.x, before.y, lineOptions);
    rc.path(`M ${before.x} ${before.y} Q ${corner.x} ${corner.y} ${after.x} ${after.y}`, arcOptions);
    from = after;
  }
  const last = points[points.length - 1];
  rc.line(from.x, from.y, last.x, last.y, lineOptions);
  ctx.restore();
}

export function getArrowPath(el: ArrowElement): Point[] {
  const points = getArrowPoints(el);
  if (isCurve(el)) {
    const path = [points[0]];
    for (const segment of curveSegments(points)) {
      for (let s = 1; s <= CURVE_SAMPLES; s++) path.push(cubicAt(segment, s / CURVE_SAMPLES));
    }
    return path;
  }
  if (hasRoundedCorners(el)) {
    const path = [points[0]];
    for (const { before, corner, after } of roundedCorners(points)) {
      for (let s = 0; s <= CORNER_SAMPLES; s++) {
        path.push(quadraticAt(before, corner, after, s / CORNER_SAMPLES));
      }
    }
    path.push(points[points.length - 1]);
    return path;
  }
  return points;
}

export function getSegmentMidpoint(el: ArrowElement, index: number): Point {
  const points = getArrowPoints(el);
  if (isCurve(el)) return cubicAt(curveSegments(points)[index], 0.5);
  const a = points[index];
  const b = points[index + 1];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function curvePathData(points: Point[]): string {
  const parts = [`M ${points[0].x} ${points[0].y}`];
  for (const { c1, c2, to } of curveSegments(points)) {
    parts.push(`C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`);
  }
  return parts.join(" ");
}

function getArrowheadGeometry(el: ArrowElement, end: ArrowEnd): ArrowheadGeometry | null {
  const arrowhead = end === "start" ? el.startArrowhead : el.endArrowhead;
  if (arrowhead === "none") return null;

  const path = getArrowPath(el);
  const points = getArrowPoints(el);
  const [tip, from] = end === "start" ? [path[0], path[1]] : [path[path.length - 1], path[path.length - 2]];
  const [first, second] =
    end === "start" ? [points[0], points[1]] : [points[points.length - 1], points[points.length - 2]];
  const segment = distance(first, second);
  if (distance(from, tip) === 0 || segment === 0) return null;

  const size = Math.min(16 + el.style.strokeWidth * 2, segment / 2);
  const back = Math.atan2(from.y - tip.y, from.x - tip.x);
  return getArrowheadParts(arrowhead, tip, back, size);
}

function getArrowheads(el: ArrowElement): ArrowheadGeometry[] {
  return [getArrowheadGeometry(el, "start"), getArrowheadGeometry(el, "end")].filter(
    (head): head is ArrowheadGeometry => head !== null,
  );
}

function retreatEnds(points: Point[], startRetreat: number, endRetreat: number): Point[] {
  const result = [...points];
  const last = result.length - 1;
  if (startRetreat > 0) result[0] = towards(result[0], result[1], startRetreat);
  if (endRetreat > 0) result[last] = towards(result[last], result[last - 1], endRetreat);
  return result;
}

function drawArrowhead(
  geometry: ArrowheadGeometry,
  rc: Parameters<ShapeUtil<ArrowElement>["draw"]>[1],
  options: Options,
) {
  const filled = { ...options, fill: options.stroke, fillStyle: "solid" };
  for (const part of geometry.parts) {
    const partOptions = part.kind !== "line" && part.filled ? filled : options;
    if (part.kind === "line") {
      rc.line(part.from.x, part.from.y, part.to.x, part.to.y, options);
    } else if (part.kind === "polygon") {
      rc.polygon(
        part.points.map((p): [number, number] => [p.x, p.y]),
        partOptions,
      );
    } else {
      rc.circle(part.center.x, part.center.y, part.radius * 2, partOptions);
    }
  }
}

const HOLE_CLIP_MARGIN = 50;

function clipArrowheadHoles(el: ArrowElement, heads: ArrowheadGeometry[], ctx: CanvasRenderingContext2D) {
  const holes = heads.flatMap(getArrowheadHoles);
  if (holes.length === 0) return false;
  const outer = expandBounds(getBounds(getArrowPath(el)), HOLE_CLIP_MARGIN);
  ctx.save();
  ctx.beginPath();
  ctx.rect(outer.x, outer.y, outer.width, outer.height);
  for (const { center, radius } of holes) {
    ctx.moveTo(center.x + radius, center.y);
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  }
  ctx.clip("evenodd");
  return true;
}

export const arrowUtil: ShapeUtil<ArrowElement> = {
  draw(el, rc, ctx) {
    const startHead = getArrowheadGeometry(el, "start");
    const endHead = getArrowheadGeometry(el, "end");
    const heads = [startHead, endHead].filter((head): head is ArrowheadGeometry => head !== null);
    const points = retreatEnds(getArrowPoints(el), startHead?.retreat ?? 0, endHead?.retreat ?? 0);
    const options = roughOptions(el.style, el.seed);
    const clipped = clipArrowheadHoles(el, heads, ctx);
    if (isCurve(el)) {
      ctx.save();
      ctx.lineCap = "round";
      rc.path(curvePathData(points), {
        ...options,
        preserveVertices: true,
        maxRandomnessOffset: CURVE_RANDOMNESS,
      });
      ctx.restore();
    } else if (hasRoundedCorners(el)) {
      drawRoundedElbow(points, rc, ctx, options);
    } else {
      rc.linearPath(
        points.map((p): [number, number] => [p.x, p.y]),
        options,
      );
    }

    if (clipped) ctx.restore();
    const headOptions = { ...options, fill: undefined };
    for (const head of heads) drawArrowhead(head, rc, headOptions);
  },

  hitTest(el, p, tolerance) {
    const t = tolerance + el.style.strokeWidth / 2;
    return distanceToPolyline(p, getArrowPath(el)) <= t;
  },

  resize(el, bounds) {
    const resized = { ...el, ...bounds, points: scalePoints(el.points, el, bounds) };
    if (!el.fixedSegments) return resized;
    const fixedSegments = el.fixedSegments.map((s) => {
      const [start, end] = scalePoints([s.start, s.end], el, bounds);
      return { start, end };
    });
    return { ...resized, fixedSegments };
  },

  getBounds(el) {
    const box = isCurve(el)
      ? getBounds(getArrowPath(el))
      : { x: el.x, y: el.y, width: el.width, height: el.height };
    const heads = getArrowheads(el).map((head) => getBounds(getArrowheadPoints(head)));
    return unionBounds([box, ...heads]);
  },

  getLabelArea(el) {
    const center = getPathMidpoint(getArrowPath(el));
    return { x: center.x - LABEL_AREA_WIDTH / 2, y: center.y, width: LABEL_AREA_WIDTH, height: 0 };
  },
};
