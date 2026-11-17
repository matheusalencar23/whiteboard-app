import { unionBounds, type Bounds } from "../geometry/bounds";
import { getElementBounds } from "./registry";
import { getSelectableGroupId, isInGroup } from "./groups";
import type { BoardElement } from "./types";

export type OrderDirection = "front" | "back" | "forward" | "backward";

export const ORDER_DIRECTIONS: OrderDirection[] = ["front", "forward", "backward", "back"];

interface Unit {
  elements: BoardElement[];
  selected: boolean;
}

function buildUnits(scope: BoardElement[], selected: Set<string>, editingGroupId: string | null): Unit[] {
  const units = new Map<string, Unit>();
  for (const el of scope) {
    const key = getSelectableGroupId(el, editingGroupId) ?? el.id;
    let unit = units.get(key);
    if (!unit) {
      unit = { elements: [], selected: false };
      units.set(key, unit);
    }
    unit.elements.push(el);
    if (selected.has(el.id)) unit.selected = true;
  }
  return [...units.values()];
}

function unitBounds(unit: Unit): Bounds {
  return unionBounds(unit.elements.map(getElementBounds));
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height;
}

function stepUnits(units: Unit[], forward: boolean): Unit[] {
  const result = [...units];
  const step = forward ? 1 : -1;
  const order = result.map((_, i) => i);
  if (forward) order.reverse();
  for (const start of order) {
    const unit = result[start];
    if (!unit.selected) continue;
    const bounds = unitBounds(unit);
    let target = -1;
    for (let i = start + step; i >= 0 && i < result.length; i += step) {
      if (result[i].selected) break;
      if (overlaps(bounds, unitBounds(result[i]))) {
        target = i;
        break;
      }
    }
    if (target === -1) continue;
    result.splice(start, 1);
    result.splice(target, 0, unit);
  }
  return result;
}

function reorderUnits(units: Unit[], direction: OrderDirection): Unit[] {
  const selected = units.filter((unit) => unit.selected);
  const others = units.filter((unit) => !unit.selected);
  if (direction === "front") return [...others, ...selected];
  if (direction === "back") return [...selected, ...others];
  return stepUnits(units, direction === "forward");
}

export function reorderElements(
  elements: BoardElement[],
  selectedIds: string[],
  editingGroupId: string | null,
  direction: OrderDirection,
): BoardElement[] | null {
  if (selectedIds.length === 0) return null;
  const inScope = (el: BoardElement) => editingGroupId === null || isInGroup(el, editingGroupId);
  const scope = elements.filter(inScope);
  const units = buildUnits(scope, new Set(selectedIds), editingGroupId);
  const reordered = reorderUnits(units, direction).flatMap((unit) => unit.elements);
  if (reordered.every((el, i) => el === scope[i])) return null;
  let next = 0;
  return elements.map((el) => (inScope(el) ? reordered[next++] : el));
}
