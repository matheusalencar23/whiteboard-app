import type { Point } from "./types";
import { containsPoint, expandBounds, getCenter, unionBounds, type Bounds } from "./geometry/bounds";
import type { ArrowElement, BoardElement } from "./elements/types";
import {
  getElementBounds,
  getElementBox,
  getLabelLayout,
  resizeElement,
  translateElement,
} from "./elements/registry";
import { getArrowPoints, getSegmentMidpoint, setArrowPoints } from "./elements/shapes/arrow";
import type { ArrowEnd } from "./elements/bindings";
import { distance, normalizeAngle, rotatePoint } from "./geometry/distance";

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export const HANDLE_SIZE = 8;
export const SELECTION_PADDING = 4;
export const ENDPOINT_RADIUS = 5;
export const ROTATION_HANDLE_DISTANCE = 22;
export const ROTATION_HANDLE_RADIUS = 5;

export interface SelectionFrame {
  box: Bounds;
  rotation: number;
}

export function getSelectionBounds(elements: BoardElement[]): Bounds | null {
  if (elements.length === 0) return null;
  return unionBounds(elements.map(getElementBounds));
}

export function getElementFrame(element: BoardElement): SelectionFrame {
  if (element.type === "arrow") return { box: getElementBounds(element), rotation: 0 };
  return { box: getElementBox(element), rotation: element.rotation };
}

export function getSelectionFrame(elements: BoardElement[]): SelectionFrame | null {
  if (elements.length === 1 && elements[0].type !== "arrow") return getElementFrame(elements[0]);
  const box = getSelectionBounds(elements);
  return box && { box, rotation: 0 };
}

export function padFrame(box: Bounds, zoom: number): Bounds {
  return expandBounds(box, SELECTION_PADDING / zoom);
}

export function toFrameLocal(frame: SelectionFrame, point: Point): Point {
  return rotatePoint(point, getCenter(frame.box), -frame.rotation);
}

export function toFrameWorld(frame: SelectionFrame, point: Point): Point {
  return rotatePoint(point, getCenter(frame.box), frame.rotation);
}

export function frameContains(frame: SelectionFrame, point: Point, zoom: number): boolean {
  return containsPoint(padFrame(frame.box, zoom), toFrameLocal(frame, point));
}

export function getHandleRects(box: Bounds, zoom: number): Record<Handle, Bounds> {
  const frame = padFrame(box, zoom);
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

export function getHandleAt(point: Point, frame: SelectionFrame, zoom: number): Handle | null {
  const local = toFrameLocal(frame, point);
  const rects = getHandleRects(frame.box, zoom);
  const slack = 2 / zoom;
  return HANDLES.find((h) => containsPoint(expandBounds(rects[h], slack), local)) ?? null;
}

const HANDLE_ANGLES: Record<Handle, number> = {
  e: 0,
  se: 1,
  s: 2,
  sw: 3,
  w: 4,
  nw: 5,
  n: 6,
  ne: 7,
};

const CURSORS_BY_ANGLE = ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"];

export function getHandleCursor(handle: Handle, rotation: number): string {
  const steps = Math.round(normalizeAngle(rotation) / (Math.PI / 4));
  return CURSORS_BY_ANGLE[(HANDLE_ANGLES[handle] + steps) % 4];
}

export function getRotationHandleLocal(box: Bounds, zoom: number): { stem: Point; knob: Point } {
  const frame = padFrame(box, zoom);
  const x = frame.x + frame.width / 2;
  return {
    stem: { x, y: frame.y },
    knob: { x, y: frame.y - ROTATION_HANDLE_DISTANCE / zoom },
  };
}

export function isOnRotationHandle(point: Point, frame: SelectionFrame, zoom: number): boolean {
  const { knob } = getRotationHandleLocal(frame.box, zoom);
  return distance(toFrameLocal(frame, point), knob) <= (ROTATION_HANDLE_RADIUS + 3) / zoom;
}

export const ROTATION_SNAP = Math.PI / 12;

export function rotateElements(
  elements: BoardElement[],
  center: Point,
  angle: number,
): BoardElement[] {
  return elements.map((el) => {
    if (el.type === "arrow") {
      const points = getArrowPoints(el).map((p) => rotatePoint(p, center, angle));
      if (el.routing !== "elbow") return setArrowPoints(el, points);
      const ends = [points[0], points[points.length - 1]];
      return setArrowPoints({ ...el, fixedSegments: undefined }, ends);
    }
    const moved = rotatePoint(getCenter(el), center, angle);
    return {
      ...el,
      x: moved.x - el.width / 2,
      y: moved.y - el.height / 2,
      rotation: normalizeAngle(el.rotation + angle),
    };
  });
}

export function resizeBounds(
  bounds: Bounds,
  handle: Handle,
  dx: number,
  dy: number,
  keepAspect = false,
): Bounds {
  let left = bounds.x;
  let right = bounds.x + bounds.width;
  let top = bounds.y;
  let bottom = bounds.y + bounds.height;

  const horizontal = handle.includes("w") || handle.includes("e");
  const vertical = handle.includes("n") || handle.includes("s");

  if (handle.includes("w")) left += dx;
  if (handle.includes("e")) right += dx;
  if (handle.includes("n")) top += dy;
  if (handle.includes("s")) bottom += dy;

  if (keepAspect && bounds.width > 0 && bounds.height > 0) {
    const scaleX = (right - left) / bounds.width;
    const scaleY = (bottom - top) / bounds.height;

    if (horizontal && vertical) {
      const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
      const width = bounds.width * scale * (scaleX < 0 ? -1 : 1);
      const height = bounds.height * scale * (scaleY < 0 ? -1 : 1);
      if (handle.includes("w")) left = right - width;
      else right = left + width;
      if (handle.includes("n")) top = bottom - height;
      else bottom = top + height;
    } else if (horizontal) {
      const height = bounds.height * Math.abs(scaleX);
      const centerY = bounds.y + bounds.height / 2;
      top = centerY - height / 2;
      bottom = centerY + height / 2;
    } else {
      const width = bounds.width * Math.abs(scaleY);
      const centerX = bounds.x + bounds.width / 2;
      left = centerX - width / 2;
      right = centerX + width / 2;
    }
  }

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

  return elements.map((el) => {
    const cos = Math.cos(el.rotation);
    const sin = Math.sin(el.rotation);
    const localX = Math.hypot(sx * cos, sy * sin);
    const localY = Math.hypot(sx * sin, sy * cos);
    const center = getCenter(el);
    const width = el.width * localX;
    const height = el.height * localY;
    return resizeElement(el, {
      x: to.x + (center.x - from.x) * sx - width / 2,
      y: to.y + (center.y - from.y) * sy - height / 2,
      width,
      height,
    });
  });
}

function fixedPointFor(box: Bounds, handle: Handle): Point {
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  const center = getCenter(box);
  return {
    x: handle.includes("w") ? right : handle.includes("e") ? box.x : center.x,
    y: handle.includes("n") ? bottom : handle.includes("s") ? box.y : center.y,
  };
}

function relativeIn(box: Bounds, p: Point): Point {
  return {
    x: box.width === 0 ? 0.5 : (p.x - box.x) / box.width,
    y: box.height === 0 ? 0.5 : (p.y - box.y) / box.height,
  };
}

export function resizeSingleElement<T extends BoardElement>(
  element: T,
  handle: Handle,
  delta: Point,
  keepAspect: boolean,
): T {
  const box = getElementBox(element);
  const local = rotatePoint(delta, { x: 0, y: 0 }, -element.rotation);
  const next = resizeBounds(box, handle, local.x, local.y, keepAspect);
  const resized = resizeElement(element, next);

  const fixed = fixedPointFor(box, handle);
  const f = relativeIn(next, fixed);
  const after = { x: resized.x + f.x * resized.width, y: resized.y + f.y * resized.height };
  const before = rotatePoint(fixed, getCenter(box), element.rotation);
  const moved = rotatePoint(after, getCenter(resized), element.rotation);
  return translateElement(resized, before.x - moved.x, before.y - moved.y);
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
  const labelBox = getLabelLayout(arrow)?.box;
  const underLabel = (p: Point) => labelBox !== undefined && containsPoint(labelBox, p);
  if (arrow.routing === "elbow") {
    for (let i = 0; i < last; i++) {
      if (distance(points[i], points[i + 1]) * zoom < MIN_SEGMENT_FOR_MIDPOINT) continue;
      if (underLabel(getSegmentMidpoint(arrow, i))) continue;
      const axis = Math.abs(points[i].y - points[i + 1].y) < 1e-6 ? "x" : "y";
      handles.push({ kind: "segment", index: i, axis, position: getSegmentMidpoint(arrow, i) });
    }
    return handles;
  }

  for (let i = 1; i < last; i++) handles.push({ kind: "point", index: i, position: points[i] });
  for (let i = 0; i < last; i++) {
    if (distance(points[i], points[i + 1]) * zoom < MIN_SEGMENT_FOR_MIDPOINT) continue;
    if (underLabel(getSegmentMidpoint(arrow, i))) continue;
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
