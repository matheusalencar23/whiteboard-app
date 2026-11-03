import type { Point } from "./types";
import { containsPoint, expandBounds, unionBounds, type Bounds } from "./geometry/bounds";
import type { ArrowElement, BoardElement } from "./elements/types";
import { getElementBounds, resizeElement } from "./elements/registry";
import { getArrowPoints, getSegmentMidpoint } from "./elements/shapes/arrow";
import type { ArrowEnd } from "./elements/bindings";
import { distance } from "./geometry/distance";

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export const HANDLE_SIZE = 8;
export const SELECTION_PADDING = 4;
export const ENDPOINT_RADIUS = 5;

export const HANDLE_CURSORS: Record<Handle, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};

export function getSelectionBounds(elements: BoardElement[]): Bounds | null {
  if (elements.length === 0) return null;
  return unionBounds(elements.map(getElementBounds));
}

export function getSelectionFrame(bounds: Bounds, zoom: number): Bounds {
  return expandBounds(bounds, SELECTION_PADDING / zoom);
}

export function getHandleRects(bounds: Bounds, zoom: number): Record<Handle, Bounds> {
  const frame = getSelectionFrame(bounds, zoom);
  const size = HANDLE_SIZE / zoom;
  const left = frame.x;
  const right = frame.x + frame.width;
  const top = frame.y;
  const bottom = frame.y + frame.height;
  const midX = frame.x + frame.width / 2;
  const midY = frame.y + frame.height / 2;

  const centers: Record<Handle, Point> = {
    nw: { x: left, y: top },
    n: { x: midX, y: top },
    ne: { x: right, y: top },
    e: { x: right, y: midY },
    se: { x: right, y: bottom },
    s: { x: midX, y: bottom },
    sw: { x: left, y: bottom },
    w: { x: left, y: midY },
  };

  const rects = {} as Record<Handle, Bounds>;
  for (const handle of HANDLES) {
    const c = centers[handle];
    rects[handle] = { x: c.x - size / 2, y: c.y - size / 2, width: size, height: size };
  }
  return rects;
}

export function getHandleAt(point: Point, bounds: Bounds, zoom: number): Handle | null {
  const rects = getHandleRects(bounds, zoom);
  const slack = 2 / zoom;
  return HANDLES.find((h) => containsPoint(expandBounds(rects[h], slack), point)) ?? null;
}

export function resizeBounds(bounds: Bounds, handle: Handle, dx: number, dy: number): Bounds {
  let left = bounds.x;
  let right = bounds.x + bounds.width;
  let top = bounds.y;
  let bottom = bounds.y + bounds.height;

  if (handle.includes("w")) left += dx;
  if (handle.includes("e")) right += dx;
  if (handle.includes("n")) top += dy;
  if (handle.includes("s")) bottom += dy;

  return {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    width: Math.abs(right - left),
    height: Math.abs(bottom - top),
  };
}

export function resizeElementsToBounds(
  elements: BoardElement[],
  from: Bounds,
  to: Bounds,
): BoardElement[] {
  const sx = from.width === 0 ? 1 : to.width / from.width;
  const sy = from.height === 0 ? 1 : to.height / from.height;

  return elements.map((el) =>
    resizeElement(el, {
      x: to.x + (el.x - from.x) * sx,
      y: to.y + (el.y - from.y) * sy,
      width: el.width * sx,
      height: el.height * sy,
    }),
  );
}

export function getSingleArrow(selected: BoardElement[]): ArrowElement | null {
  return selected.length === 1 && selected[0].type === "arrow" ? selected[0] : null;
}

export type ArrowHandle =
  | { kind: "end"; end: ArrowEnd; position: Point }
  | { kind: "point"; index: number; position: Point }
  | { kind: "midpoint"; index: number; position: Point }
  | { kind: "segment"; index: number; axis: "x" | "y"; position: Point };

const MIN_SEGMENT_FOR_MIDPOINT = ENDPOINT_RADIUS * 6;

export function getArrowHandles(arrow: ArrowElement, zoom: number): ArrowHandle[] {
  const points = getArrowPoints(arrow);
  const last = points.length - 1;
  const handles: ArrowHandle[] = [
    { kind: "end", end: "start", position: points[0] },
    { kind: "end", end: "end", position: points[last] },
  ];
  if (arrow.routing === "elbow") {
    for (let i = 0; i < last; i++) {
      if (distance(points[i], points[i + 1]) * zoom < MIN_SEGMENT_FOR_MIDPOINT) continue;
      const axis = Math.abs(points[i].y - points[i + 1].y) < 1e-6 ? "x" : "y";
      handles.push({ kind: "segment", index: i, axis, position: getSegmentMidpoint(arrow, i) });
    }
    return handles;
  }

  for (let i = 1; i < last; i++) handles.push({ kind: "point", index: i, position: points[i] });
  for (let i = 0; i < last; i++) {
    if (distance(points[i], points[i + 1]) * zoom < MIN_SEGMENT_FOR_MIDPOINT) continue;
    handles.push({ kind: "midpoint", index: i, position: getSegmentMidpoint(arrow, i) });
  }
  return handles;
}

export function getArrowHandleAt(arrow: ArrowElement, point: Point, zoom: number): ArrowHandle | null {
  const reach = (ENDPOINT_RADIUS + 3) / zoom;
  const hits = getArrowHandles(arrow, zoom).filter((h) => distance(h.position, point) <= reach);
  const order = (h: ArrowHandle) =>
    h.kind === "end" ? (h.end === "end" ? 0 : 1) : h.kind === "point" ? 2 : 3;
  return hits.sort((a, b) => order(a) - order(b))[0] ?? null;
}
