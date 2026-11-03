import type { Point } from "../types";

export function constrainToSquare(origin: Point, point: Point): Point {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: origin.x + size * (dx < 0 ? -1 : 1),
    y: origin.y + size * (dy < 0 ? -1 : 1),
  };
}

export function snapToAngle(origin: Point, point: Point, step = Math.PI / 4): Point {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return point;
  const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  return {
    x: origin.x + length * Math.cos(angle),
    y: origin.y + length * Math.sin(angle),
  };
}
