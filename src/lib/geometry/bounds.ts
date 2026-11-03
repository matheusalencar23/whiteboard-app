import type { Point } from "../types";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getBounds(points: Point[]): Bounds {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

export function unionBounds(list: Bounds[]): Bounds {
  return getBounds(
    list.flatMap((b) => [
      { x: b.x, y: b.y },
      { x: b.x + b.width, y: b.y + b.height },
    ]),
  );
}

export function expandBounds(b: Bounds, amount: number): Bounds {
  return {
    x: b.x - amount,
    y: b.y - amount,
    width: b.width + amount * 2,
    height: b.height + amount * 2,
  };
}

export function containsPoint(b: Bounds, p: Point): boolean {
  return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
}

export function containsBounds(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function getCenter(b: Bounds): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
