import type { Point } from "../types";
import type { Bounds } from "./bounds";

export type PathSegment =
  | { kind: "line"; to: Point }
  | { kind: "cubic"; c1: Point; c2: Point; to: Point };

export interface PathFigure {
  kind: "path";
  start: Point;
  segments: PathSegment[];
  closed: boolean;
}

export interface EllipseFigure {
  kind: "ellipse";
  box: Bounds;
}

export type Figure = PathFigure | EllipseFigure;

const CURVE_SAMPLES = 12;

const KAPPA = 0.5522847498;

export function polygonFigure(points: Point[]): PathFigure {
  const [start, ...rest] = points;
  return { kind: "path", start, segments: rest.map((to) => ({ kind: "line", to })), closed: true };
}

export function polylineFigure(points: Point[]): PathFigure {
  const [start, ...rest] = points;
  return { kind: "path", start, segments: rest.map((to) => ({ kind: "line", to })), closed: false };
}

export function quarterArc(from: Point, to: Point, corner: Point): PathSegment {
  return {
    kind: "cubic",
    c1: { x: from.x + (corner.x - from.x) * KAPPA, y: from.y + (corner.y - from.y) * KAPPA },
    c2: { x: to.x + (corner.x - to.x) * KAPPA, y: to.y + (corner.y - to.y) * KAPPA },
    to,
  };
}

function formatPoint(p: Point): string {
  return `${p.x} ${p.y}`;
}

export function figureToSvgPath(figure: PathFigure): string {
  const parts = [`M ${formatPoint(figure.start)}`];
  for (const segment of figure.segments) {
    if (segment.kind === "line") parts.push(`L ${formatPoint(segment.to)}`);
    else parts.push(`C ${formatPoint(segment.c1)} ${formatPoint(segment.c2)} ${formatPoint(segment.to)}`);
  }
  if (figure.closed) parts.push("Z");
  return parts.join(" ");
}

function cubicPoint(a: Point, c1: Point, c2: Point, b: Point, t: number): Point {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return {
    x: w0 * a.x + w1 * c1.x + w2 * c2.x + w3 * b.x,
    y: w0 * a.y + w1 * c1.y + w2 * c2.y + w3 * b.y,
  };
}

function ellipseToPath({ x, y, width: w, height: h }: Bounds): PathFigure {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return {
    kind: "path",
    start: { x: x + w, y: cy },
    closed: true,
    segments: [
      quarterArc({ x: x + w, y: cy }, { x: cx, y: y + h }, { x: x + w, y: y + h }),
      quarterArc({ x: cx, y: y + h }, { x, y: cy }, { x, y: y + h }),
      quarterArc({ x, y: cy }, { x: cx, y }, { x, y }),
      quarterArc({ x: cx, y }, { x: x + w, y: cy }, { x: x + w, y }),
    ],
  };
}

export function toPathFigure(figure: Figure): PathFigure {
  return figure.kind === "ellipse" ? ellipseToPath(figure.box) : figure;
}

export function sampleFigure(shape: Figure): Point[] {
  const figure = toPathFigure(shape);
  const points = [figure.start];
  let current = figure.start;
  for (const segment of figure.segments) {
    if (segment.kind === "line") {
      points.push(segment.to);
    } else {
      for (let i = 1; i <= CURVE_SAMPLES; i++) {
        points.push(cubicPoint(current, segment.c1, segment.c2, segment.to, i / CURVE_SAMPLES));
      }
    }
    current = segment.to;
  }
  return points;
}

function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

export function rayPolygonDistance(origin: Point, direction: Point, polygon: Point[]): number {
  let farthest = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const edge = { x: b.x - a.x, y: b.y - a.y };
    const denominator = cross(direction, edge);
    if (denominator === 0) continue;
    const toStart = { x: a.x - origin.x, y: a.y - origin.y };
    const t = cross(toStart, edge) / denominator;
    const u = cross(toStart, direction) / denominator;
    if (t >= 0 && u >= 0 && u <= 1) farthest = Math.max(farthest, t);
  }
  return farthest;
}
