import rough from "roughjs";
import { nanoid } from "nanoid";
import { getCenter } from "../geometry/bounds";
import { rotatePoint } from "../geometry/distance";
import type { Point } from "../types";
import { getGroupIds, getGroupMembers } from "./groups";
import type { BoardElement, ShapeElement } from "./types";

export interface PoolTarget {
  pool: ShapeElement;
  lanes: ShapeElement[];
  lane: ShapeElement | null;
}

export interface PoolChange {
  elements: BoardElement[];
  changedIds: string[];
  selectedIds: string[];
}

function isShapeOfKind(element: BoardElement, kind: ShapeElement["kind"]): element is ShapeElement {
  return element.type === "shape" && element.kind === kind;
}

function poolGroupId(element: BoardElement): string | null {
  return getGroupIds(element)[0] ?? null;
}

function localY(element: BoardElement, pool: ShapeElement): number {
  return rotatePoint(getCenter(element), getCenter(pool), -pool.rotation).y;
}

function findPool(elements: BoardElement[], groupId: string): ShapeElement | null {
  const pools = getGroupMembers(elements, groupId).filter(
    (el): el is ShapeElement => isShapeOfKind(el, "pool") && poolGroupId(el) === groupId,
  );
  return pools.length === 1 ? pools[0] : null;
}

function getLanes(elements: BoardElement[], pool: ShapeElement): ShapeElement[] {
  const groupId = poolGroupId(pool);
  if (!groupId) return [];
  return getGroupMembers(elements, groupId)
    .filter((el): el is ShapeElement => isShapeOfKind(el, "laneHorizontal") && poolGroupId(el) === groupId)
    .sort((a, b) => localY(a, pool) - localY(b, pool));
}

export function getPoolTarget(elements: BoardElement[], selectedIds: string[]): PoolTarget | null {
  const selected = new Set(selectedIds);
  const groupIds = new Set<string>();
  for (const el of elements) {
    if (!selected.has(el.id)) continue;
    const groupId = poolGroupId(el);
    if (groupId && (isShapeOfKind(el, "pool") || isShapeOfKind(el, "laneHorizontal"))) groupIds.add(groupId);
  }
  if (groupIds.size !== 1) return null;
  const pool = findPool(elements, [...groupIds][0]);
  if (!pool) return null;
  const lanes = getLanes(elements, pool);
  if (lanes.length === 0) return null;
  const selectedLanes = lanes.filter((lane) => selected.has(lane.id));
  const lane = selectedLanes.length === 1 && !selected.has(pool.id) ? selectedLanes[0] : null;
  return { pool, lanes, lane };
}

function shiftDown<T extends BoardElement>(element: T, pool: ShapeElement, dy: number): T {
  const offset = rotatePoint({ x: 0, y: dy }, { x: 0, y: 0 }, pool.rotation);
  return { ...element, x: element.x + offset.x, y: element.y + offset.y };
}

function growDown(pool: ShapeElement, dh: number): ShapeElement {
  const center = getCenter(pool);
  const offset: Point = rotatePoint({ x: 0, y: dh / 2 }, { x: 0, y: 0 }, pool.rotation);
  const height = pool.height + dh;
  return {
    ...pool,
    height,
    x: center.x + offset.x - pool.width / 2,
    y: center.y + offset.y - height / 2,
  };
}

function localBottom(element: BoardElement, pool: ShapeElement): number {
  return localY(element, pool) + element.height / 2;
}

function getContentBelow(elements: BoardElement[], pool: ShapeElement, splitY: number): BoardElement[] {
  const groupId = poolGroupId(pool);
  const center = getCenter(pool);
  return elements.filter((el) => {
    if (groupId !== null && getGroupIds(el).includes(groupId)) return false;
    const local = rotatePoint(getCenter(el), center, -pool.rotation);
    return local.x >= pool.x && local.x <= pool.x + pool.width && local.y > splitY && local.y <= pool.y + pool.height;
  });
}

function applyChanges(elements: BoardElement[], changed: Map<string, BoardElement>, inserted?: { after: string; element: BoardElement }) {
  return elements.flatMap((el) => {
    const current = changed.get(el.id) ?? el;
    return inserted?.after === el.id ? [current, inserted.element] : [current];
  });
}

export function addPoolLane(
  elements: BoardElement[],
  selectedIds: string[],
  laneName: (index: number) => string,
): PoolChange | null {
  const target = getPoolTarget(elements, selectedIds);
  if (!target) return null;
  const { pool, lanes, lane } = target;
  const source = lane ?? lanes[lanes.length - 1];
  const height = source.height;
  const below = [
    ...lanes.slice(lanes.indexOf(source) + 1),
    ...getContentBelow(elements, pool, localBottom(source, pool)),
  ];

  const created: ShapeElement = {
    ...shiftDown(source, pool, height),
    id: nanoid(),
    seed: rough.newSeed(),
    label: source.label && { ...source.label, text: laneName(lanes.length + 1) },
  };
  const changed = new Map<string, BoardElement>([[pool.id, growDown(pool, height)]]);
  for (const el of below) changed.set(el.id, shiftDown(el, pool, height));

  return {
    elements: applyChanges(elements, changed, { after: source.id, element: created }),
    changedIds: [...changed.keys(), created.id],
    selectedIds: lane ? [created.id] : [...selectedIds, created.id],
  };
}

export function removePoolLane(elements: BoardElement[], selectedIds: string[]): PoolChange | null {
  const target = getPoolTarget(elements, selectedIds);
  if (!target || target.lanes.length < 2) return null;
  const { pool, lanes, lane } = target;
  const removed = lane ?? lanes[lanes.length - 1];
  const index = lanes.indexOf(removed);
  const below = [...lanes.slice(index + 1), ...getContentBelow(elements, pool, localBottom(removed, pool))];

  const changed = new Map<string, BoardElement>([[pool.id, growDown(pool, -removed.height)]]);
  for (const el of below) changed.set(el.id, shiftDown(el, pool, -removed.height));

  const neighbor = lanes[index + 1] ?? lanes[index - 1];
  return {
    elements: applyChanges(elements, changed).filter((el) => el.id !== removed.id),
    changedIds: [...changed.keys()],
    selectedIds: lane ? [neighbor.id] : selectedIds.filter((id) => id !== removed.id),
  };
}
