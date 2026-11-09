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

export function getPathMidpoint(points: Point[]): Point {
  return getPointAtLength(points, getPathLength(points) / 2);
}
