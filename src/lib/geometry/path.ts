import type { Point } from "../types";
import { distance } from "./distance";

export function getPathLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += distance(points[i - 1], points[i]);
  return length;
}

export function getPointAtLength(points: Point[], length: number): Point {
  let remaining = Math.max(0, length);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segment = distance(a, b);
    if (segment > 0 && remaining <= segment) {
      const t = remaining / segment;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= segment;
  }
  return points[points.length - 1];
}

export function getLengthAtClosestPoint(points: Point[], p: Point): number {
  let best = Infinity;
  let bestLength = 0;
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segment = distance(a, b);
    const t =
      segment === 0
        ? 0
        : Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (segment * segment)));
    const closest = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const d = distance(p, closest);
    if (d < best) {
      best = d;
      bestLength = travelled + segment * t;
    }
    travelled += segment;
  }
  return bestLength;
}
