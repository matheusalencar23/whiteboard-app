import type { Point } from "../types";
import { expandBounds, getCenter } from "../geometry/bounds";
import { distance, rotatePoint } from "../geometry/distance";
import { routeOrthogonal, simplifyPath, type RouteEnd } from "../geometry/orthogonalRoute";
import { getBorderPoint, getConnectionAnchors, getElementBounds, isBindable, isInsideShape } from "./registry";
import { getArrowPoints, getFixedSegments, setArrowPoints, setFixedSegments } from "./shapes/arrow";
import type { ArrowBinding, ArrowElement, ArrowRouting, ArrowSegment, BoardElement } from "./types";

export const BINDING_GAP = 6;

export const ELBOW_MARGIN = 30;

export type ArrowEnd = "start" | "end";

export function anchorPoint(shape: BoardElement, anchor: Point): Point {
  const p = { x: shape.x + anchor.x * shape.width, y: shape.y + anchor.y * shape.height };
  return rotatePoint(p, getCenter(shape), shape.rotation);
}

function focusPoint(shape: BoardElement, binding: ArrowBinding): Point {
  return binding.anchor && binding.fixed ? anchorPoint(shape, binding.anchor) : getCenter(shape);
}

function nearestAnchor(shape: BoardElement, point: Point): Point | null {
  let best: Point | null = null;
  let bestDistance = Infinity;
  for (const candidate of getConnectionAnchors(shape)) {
    const d = distance(anchorPoint(shape, candidate), point);
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }
  return best;
}

function resolveBinding(shape: BoardElement, binding: ArrowBinding, towards: Point): ArrowBinding {
  if (!binding.anchor || binding.fixed) return binding;
  const anchor = nearestAnchor(shape, towards);
  if (!anchor || (anchor.x === binding.anchor.x && anchor.y === binding.anchor.y)) return binding;
  return { ...binding, anchor };
}

function resolveBindings(
  arrow: ArrowElement,
  start: BoardElement | null | undefined,
  end: BoardElement | null | undefined,
  startTowards: Point,
  endTowards: Point,
): ArrowElement {
  const startBinding =
    start && arrow.startBinding ? resolveBinding(start, arrow.startBinding, startTowards) : arrow.startBinding;
  const endBinding =
    end && arrow.endBinding ? resolveBinding(end, arrow.endBinding, endTowards) : arrow.endBinding;
  if (startBinding === arrow.startBinding && endBinding === arrow.endBinding) return arrow;
  return { ...arrow, startBinding, endBinding };
}

function bindingPoint(shape: BoardElement, binding: ArrowBinding, from: Point): Point {
  const center = getCenter(shape);

  const border = binding.anchor
    ? anchorPoint(shape, binding.anchor)
    : getBorderPoint(shape, { x: from.x - center.x, y: from.y - center.y });

  const dir = { x: border.x - center.x, y: border.y - center.y };
  const length = Math.hypot(dir.x, dir.y);
  if (length === 0) return border;
  return {
    x: border.x + (dir.x / length) * BINDING_GAP,
    y: border.y + (dir.y / length) * BINDING_GAP,
  };
}

export function refreshArrow(arrow: ArrowElement, byId: Map<string, BoardElement>): ArrowElement {
  if (arrow.routing === "elbow") return refreshElbowArrow(arrow, byId);

  const start = arrow.startBinding && byId.get(arrow.startBinding.elementId);
  const end = arrow.endBinding && byId.get(arrow.endBinding.elementId);
  if (!start && !end) return arrow;

  const points = getArrowPoints(arrow);
  const last = points.length - 1;
  const startFrom =
    last > 1 ? points[1] : end && arrow.endBinding ? focusPoint(end, arrow.endBinding) : points[last];
  const endFrom =
    last > 1
      ? points[last - 1]
      : start && arrow.startBinding
        ? focusPoint(start, arrow.startBinding)
        : points[0];

  arrow = resolveBindings(arrow, start, end, startFrom, endFrom);
  if (start && arrow.startBinding) points[0] = bindingPoint(start, arrow.startBinding, startFrom);
  if (end && arrow.endBinding) points[last] = bindingPoint(end, arrow.endBinding, endFrom);
  return setArrowPoints(arrow, points);
}

function axisDir(v: Point): Point {
  if (Math.abs(v.x) >= Math.abs(v.y)) return { x: v.x < 0 ? -1 : 1, y: 0 };
  return { x: 0, y: v.y < 0 ? -1 : 1 };
}

function elbowBoundEnd(shape: BoardElement, binding: ArrowBinding, towards: Point): RouteEnd {
  let dir: Point;
  let border: Point;
  if (binding.anchor) {
    const offset = rotatePoint(
      { x: binding.anchor.x - 0.5, y: binding.anchor.y - 0.5 },
      { x: 0, y: 0 },
      shape.rotation,
    );
    dir = offset.x === 0 && offset.y === 0 ? axisDir(sub(towards, getCenter(shape))) : axisDir(offset);
    border = anchorPoint(shape, binding.anchor);
  } else {
    const center = getCenter(shape);
    const v = rotatePoint(sub(towards, center), { x: 0, y: 0 }, -shape.rotation);
    const local = axisDir({ x: v.x / Math.max(shape.width, 1), y: v.y / Math.max(shape.height, 1) });
    dir = axisDir(rotatePoint(local, { x: 0, y: 0 }, shape.rotation));
    border = getBorderPoint(shape, dir);
  }
  return {
    point: { x: border.x + dir.x * BINDING_GAP, y: border.y + dir.y * BINDING_GAP },
    dir,
    obstacle: expandBounds(getElementBounds(shape), ELBOW_MARGIN),
  };
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function refreshElbowArrow(arrow: ArrowElement, byId: Map<string, BoardElement>): ArrowElement {
  const points = getArrowPoints(arrow);
  const start = arrow.startBinding && byId.get(arrow.startBinding.elementId);
  const end = arrow.endBinding && byId.get(arrow.endBinding.elementId);
  const first = points[0];
  const last = points[points.length - 1];

  const fixed = getFixedSegments(arrow);
  const startFocus =
    fixed.length > 0
      ? fixed[0].start
      : end && arrow.endBinding
        ? focusPoint(end, arrow.endBinding)
        : last;
  const endFocus =
    fixed.length > 0
      ? fixed[fixed.length - 1].end
      : start && arrow.startBinding
        ? focusPoint(start, arrow.startBinding)
        : first;
  arrow = resolveBindings(arrow, start, end, startFocus, endFocus);
  const startEnd = start && arrow.startBinding ? elbowBoundEnd(start, arrow.startBinding, startFocus) : null;
  const endEnd = end && arrow.endBinding ? elbowBoundEnd(end, arrow.endBinding, endFocus) : null;

  if (fixed.length > 0) {
    let from: RouteEnd = startEnd ?? {
      point: first,
      dir: axisDir(sub(fixed[0].start, first)),
      obstacle: null,
    };
    const route: Point[] = [];
    for (const segment of fixed) {
      const along = axisDir(sub(segment.end, segment.start));
      route.push(...routeOrthogonal(from, { point: segment.start, dir: neg(along), obstacle: null, corner: true }));
      from = { point: segment.end, dir: along, obstacle: null, corner: true };
    }
    route.push(
      ...routeOrthogonal(
        from,
        endEnd ?? { point: last, dir: axisDir(sub(from.point, last)), obstacle: null },
      ),
    );
    return setArrowPoints(arrow, simplifyPath(route));
  }

  const startPoint = startEnd?.point ?? first;
  const endPoint = endEnd?.point ?? last;
  const route = routeOrthogonal(
    startEnd ?? { point: first, dir: axisDir(sub(endPoint, first)), obstacle: null },
    endEnd ?? { point: last, dir: axisDir(sub(startPoint, last)), obstacle: null },
  );
  return setArrowPoints(arrow, route);
}

const EPSILON = 1e-6;

function neg(p: Point): Point {
  return { x: -p.x, y: -p.y };
}

function segmentOverlaps(a: Point, b: Point, s: ArrowSegment): boolean {
  const overlap = (p1: number, p2: number, q1: number, q2: number) =>
    Math.min(Math.max(p1, p2), Math.max(q1, q2)) - Math.max(Math.min(p1, p2), Math.min(q1, q2));
  if (Math.abs(a.y - b.y) < EPSILON) {
    return (
      Math.abs(s.start.y - a.y) < EPSILON &&
      Math.abs(s.end.y - a.y) < EPSILON &&
      overlap(a.x, b.x, s.start.x, s.end.x) > EPSILON
    );
  }
  return (
    Math.abs(s.start.x - a.x) < EPSILON &&
    Math.abs(s.end.x - a.x) < EPSILON &&
    overlap(a.y, b.y, s.start.y, s.end.y) > EPSILON
  );
}

function fixedOnSegment(arrow: ArrowElement, index: number): ArrowSegment[] {
  const points = getArrowPoints(arrow);
  return getFixedSegments(arrow).filter((s) => segmentOverlaps(points[index], points[index + 1], s));
}

function samePoint(p: Point, q: Point): boolean {
  return Math.abs(p.x - q.x) < EPSILON && Math.abs(p.y - q.y) < EPSILON;
}

export function isSegmentFixed(arrow: ArrowElement, index: number): boolean {
  return fixedOnSegment(arrow, index).length > 0;
}

export function moveElbowSegment(arrow: ArrowElement, index: number, to: Point): ArrowElement {
  const points = getArrowPoints(arrow);
  const last = points.length - 1;
  const a = points[index];
  const b = points[index + 1];
  const horizontal = Math.abs(a.y - b.y) < EPSILON;
  const shift = (p: Point): Point => (horizontal ? { ...p, y: to.y } : { ...p, x: to.x });

  const moved: ArrowSegment = {
    start: shift(index === 0 && arrow.startBinding ? stubFrom(a, b) : a),
    end: shift(index + 1 === last && arrow.endBinding ? stubFrom(b, a) : b),
  };
  if (index === 0 && !arrow.startBinding) points[0] = shift(points[0]);
  if (index + 1 === last && !arrow.endBinding) points[last] = shift(points[last]);

  const follow = (s: ArrowSegment, corner: Point): ArrowSegment => ({
    start: samePoint(s.start, corner) ? shift(s.start) : s.start,
    end: samePoint(s.end, corner) ? shift(s.end) : s.end,
  });

  const segments: ArrowSegment[] = [];
  for (let i = 0; i < last; i++) {
    if (i === index) segments.push(moved);
    else if (i === index - 1) segments.push(...fixedOnSegment(arrow, i).map((s) => follow(s, a)));
    else if (i === index + 1) segments.push(...fixedOnSegment(arrow, i).map((s) => follow(s, b)));
    else segments.push(...fixedOnSegment(arrow, i));
  }
  return setFixedSegments(setArrowPoints(arrow, points), segments);
}

export function releaseElbowSegment(
  arrow: ArrowElement,
  index: number,
  byId: Map<string, BoardElement>,
): ArrowElement {
  const released = new Set(fixedOnSegment(arrow, index));
  const world = getFixedSegments(arrow);
  const key = (s: ArrowSegment) => `${s.start.x},${s.start.y},${s.end.x},${s.end.y}`;
  const releasedKeys = new Set([...released].map(key));
  const remaining = world.filter((s) => !releasedKeys.has(key(s)));
  return refreshArrow(setFixedSegments(arrow, remaining), byId);
}

function stubFrom(end: Point, toward: Point): Point {
  const d = distance(end, toward);
  if (d === 0) return end;
  const length = Math.min(ELBOW_MARGIN, d / 2);
  return { x: end.x + ((toward.x - end.x) / d) * length, y: end.y + ((toward.y - end.y) / d) * length };
}

export function removeArrowPoint(
  arrow: ArrowElement,
  index: number,
  byId: Map<string, BoardElement>,
): ArrowElement {
  const points = getArrowPoints(arrow);
  if (index <= 0 || index >= points.length - 1) return arrow;
  points.splice(index, 1);
  return refreshArrow(setArrowPoints(arrow, points), byId);
}

export function setArrowRouting(
  arrow: ArrowElement,
  routing: ArrowRouting,
  byId: Map<string, BoardElement>,
): ArrowElement {
  if (arrow.routing === routing) return arrow;
  if (arrow.routing !== "elbow" && routing !== "elbow") return { ...arrow, routing };
  const points = getArrowPoints(arrow);
  const ends = [points[0], points[points.length - 1]];
  return refreshArrow(setArrowPoints({ ...arrow, routing, fixedSegments: undefined }, ends), byId);
}

export function updateBoundArrows(
  elements: BoardElement[],
  changedIds: Iterable<string>,
): BoardElement[] {
  const changed = new Set(changedIds);
  const byId = new Map(elements.map((el) => [el.id, el]));
  let didChange = false;

  const result = elements.map((el) => {
    if (el.type !== "arrow") return el;
    if (!el.startBinding && !el.endBinding && (el.routing !== "elbow" || !changed.has(el.id))) {
      return el;
    }

    let arrow = el;
    const startId = arrow.startBinding?.elementId;
    const endId = arrow.endBinding?.elementId;
    if (startId && !byId.has(startId)) arrow = { ...arrow, startBinding: null };
    if (endId && !byId.has(endId)) arrow = { ...arrow, endBinding: null };

    const affected =
      changed.has(arrow.id) ||
      (startId !== undefined && changed.has(startId)) ||
      (endId !== undefined && changed.has(endId));
    if (affected) arrow = refreshArrow(arrow, byId);

    if (arrow !== el) didChange = true;
    return arrow;
  });

  return didChange ? result : elements;
}

export function getBindableAt(
  elements: BoardElement[],
  point: Point,
  tolerance: number,
  excludeIds: (string | null | undefined)[] = [],
): BoardElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (!isBindable(el) || excludeIds.includes(el.id)) continue;
    if (isInsideShape(el, point, tolerance)) return el;
  }
  return null;
}

export function findBinding(
  elements: BoardElement[],
  point: Point,
  tolerance: number,
  snapDistance: number,
  excludeIds: (string | null | undefined)[] = [],
  fixed = false,
): ArrowBinding | null {
  const inside = getBindableAt(elements, point, tolerance, excludeIds);
  const target = inside ?? getBindableAt(elements, point, snapDistance, excludeIds);
  if (!target) return null;

  let anchor: Point | null = null;
  let best = snapDistance;
  for (const candidate of getConnectionAnchors(target)) {
    const d = distance(anchorPoint(target, candidate), point);
    if (d <= best) {
      best = d;
      anchor = candidate;
    }
  }
  if (!inside && !anchor) return null;
  return { elementId: target.id, anchor, fixed: anchor !== null && fixed };
}

export function sameBinding(a: ArrowBinding | null, b: ArrowBinding | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.elementId !== b.elementId || a.fixed !== b.fixed) return false;
  if (a.anchor === null || b.anchor === null) return a.anchor === b.anchor;
  return a.anchor.x === b.anchor.x && a.anchor.y === b.anchor.y;
}

export function getBinding(arrow: ArrowElement, end: ArrowEnd): ArrowBinding | null {
  return end === "start" ? arrow.startBinding : arrow.endBinding;
}

export function setBinding(
  arrow: ArrowElement,
  end: ArrowEnd,
  binding: ArrowBinding | null,
): ArrowElement {
  return end === "start" ? { ...arrow, startBinding: binding } : { ...arrow, endBinding: binding };
}

export function releaseBindings(elements: BoardElement[], keepIds: Set<string>): BoardElement[] {
  return elements.map((el) => {
    if (el.type !== "arrow") return el;
    const keepStart = !el.startBinding || keepIds.has(el.startBinding.elementId);
    const keepEnd = !el.endBinding || keepIds.has(el.endBinding.elementId);
    if (keepStart && keepEnd) return el;
    return {
      ...el,
      startBinding: keepStart ? el.startBinding : null,
      endBinding: keepEnd ? el.endBinding : null,
    };
  });
}
