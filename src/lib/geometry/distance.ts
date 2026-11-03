import type { Point } from "../types";

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance(p, a);

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

export function distanceToPolyline(p: Point, points: Point[]): number {
  if (points.length === 1) return distance(p, points[0]);

  let min = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    min = Math.min(min, distanceToSegment(p, points[i], points[i + 1]));
  }
  return min;
}

export function distanceToPolygonEdge(p: Point, polygon: Point[]): number {
  return distanceToPolyline(p, [...polygon, polygon[0]]);
}

export function isPointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function rotatePoint(p: Point, center: Point, angle: number): Point {
  if (angle === 0) return p;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}
