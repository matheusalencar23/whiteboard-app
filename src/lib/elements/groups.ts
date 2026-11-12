import { nanoid } from "nanoid";
import type { BoardElement } from "./types";

export function getGroupIds(element: BoardElement): string[] {
  return element.groupIds ?? [];
}

export function isInGroup(element: BoardElement, groupId: string | null): boolean {
  return groupId !== null && getGroupIds(element).includes(groupId);
}

function withGroupIds<T extends BoardElement>(element: T, groupIds: string[]): T {
  const updated: T = { ...element, groupIds };
  if (groupIds.length === 0) delete updated.groupIds;
  return updated;
}

export function getSelectableGroupId(element: BoardElement, editingGroupId: string | null): string | null {
  const groupIds = getGroupIds(element);
  const index = editingGroupId === null ? -1 : groupIds.indexOf(editingGroupId);
  if (index === -1) return groupIds.at(-1) ?? null;
  return index > 0 ? groupIds[index - 1] : null;
}

export function getGroupMembers(elements: BoardElement[], groupId: string): BoardElement[] {
  return elements.filter((el) => isInGroup(el, groupId));
}

export function getParentGroupId(elements: BoardElement[], groupId: string): string | null {
  const member = elements.find((el) => isInGroup(el, groupId));
  if (!member) return null;
  const groupIds = getGroupIds(member);
  return groupIds[groupIds.indexOf(groupId) + 1] ?? null;
}

export function getSelectionUnit(
  elements: BoardElement[],
  element: BoardElement,
  editingGroupId: string | null,
): string[] {
  const groupId = getSelectableGroupId(element, editingGroupId);
  return groupId ? getGroupMembers(elements, groupId).map((el) => el.id) : [element.id];
}

export function getUnitsInside(
  elements: BoardElement[],
  insideIds: string[],
  editingGroupId: string | null,
): string[] {
  const inside = new Set(insideIds);
  const result = new Set<string>();
  for (const el of elements) {
    if (!inside.has(el.id) || result.has(el.id)) continue;
    const unit = getSelectionUnit(elements, el, editingGroupId);
    if (unit.every((id) => inside.has(id))) unit.forEach((id) => result.add(id));
  }
  return [...result];
}

function getSelectedGroupIds(
  elements: BoardElement[],
  selectedIds: string[],
  editingGroupId: string | null,
): Set<string> {
  const selected = new Set(selectedIds);
  const candidates = new Set<string>();
  for (const el of elements) {
    if (!selected.has(el.id)) continue;
    const groupId = getSelectableGroupId(el, editingGroupId);
    if (groupId) candidates.add(groupId);
  }
  for (const el of elements) {
    if (selected.has(el.id)) continue;
    getGroupIds(el).forEach((id) => candidates.delete(id));
  }
  return candidates;
}

export function canGroup(elements: BoardElement[], selectedIds: string[], editingGroupId: string | null): boolean {
  if (selectedIds.length < 2) return false;
  const selected = new Set(selectedIds);
  const units = new Set(
    elements
      .filter((el) => selected.has(el.id))
      .map((el) => getSelectableGroupId(el, editingGroupId) ?? el.id),
  );
  return units.size > 1;
}

export function canUngroup(elements: BoardElement[], selectedIds: string[], editingGroupId: string | null): boolean {
  return getSelectedGroupIds(elements, selectedIds, editingGroupId).size > 0;
}

function insertGroupId(groupIds: string[], groupId: string, editingGroupId: string | null): string[] {
  const index = editingGroupId === null ? -1 : groupIds.indexOf(editingGroupId);
  if (index === -1) return [...groupIds, groupId];
  return [...groupIds.slice(0, index), groupId, ...groupIds.slice(index)];
}

export function groupElements(
  elements: BoardElement[],
  selectedIds: string[],
  editingGroupId: string | null,
): BoardElement[] | null {
  if (!canGroup(elements, selectedIds, editingGroupId)) return null;
  const selected = new Set(selectedIds);
  const groupId = nanoid();
  const members = elements
    .filter((el) => selected.has(el.id))
    .map((el) => withGroupIds(el, insertGroupId(getGroupIds(el), groupId, editingGroupId)));
  const lastIndex = elements.findLastIndex((el) => selected.has(el.id));
  const result: BoardElement[] = [];
  elements.forEach((el, index) => {
    if (!selected.has(el.id)) result.push(el);
    if (index === lastIndex) result.push(...members);
  });
  return result;
}

export function ungroupElements(
  elements: BoardElement[],
  selectedIds: string[],
  editingGroupId: string | null,
): BoardElement[] | null {
  const removed = getSelectedGroupIds(elements, selectedIds, editingGroupId);
  if (removed.size === 0) return null;
  return elements.map((el) => {
    const groupIds = getGroupIds(el);
    if (!groupIds.some((id) => removed.has(id))) return el;
    return withGroupIds(el, groupIds.filter((id) => !removed.has(id)));
  });
}

export function remapGroupIds(
  elements: BoardElement[],
  keepFrom: string | null,
): BoardElement[] {
  const newIds = new Map<string, string>();
  return elements.map((el) => {
    const groupIds = getGroupIds(el);
    if (groupIds.length === 0) return el;
    const keepIndex = keepFrom === null ? -1 : groupIds.indexOf(keepFrom);
    const end = keepIndex === -1 ? groupIds.length : keepIndex;
    const remapped = groupIds.map((id, index) => {
      if (index >= end) return id;
      const next = newIds.get(id) ?? nanoid();
      newIds.set(id, next);
      return next;
    });
    return withGroupIds(el, remapped);
  });
}

export function keepEditingGroup(editingGroupId: string | null, elements: BoardElement[]): string | null {
  return editingGroupId !== null && elements.some((el) => isInGroup(el, editingGroupId)) ? editingGroupId : null;
}
